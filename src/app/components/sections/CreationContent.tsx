'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { shaderMaterial, useTexture, useVideoTexture } from '@react-three/drei';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { type ThreeEvent } from '@react-three/fiber';
import { useSpring } from 'framer-motion';

import { useInputState } from '@/app/hooks/useInputState';
import type { GalleryItem } from '@/app/lib/db/types';
import { logger } from '@/app/lib/utils/logger';

// =============================================
// CONFIGURATION AND CONSTANTS
// =============================================

/**
 * Aspect ratio types and configuration.
 */
export type AspectRatioType = 'square' | '16:9' | '9:16' | '4:5' | '5:4';

export interface AspectRatio {
	readonly width: number;
	readonly height: number;
	readonly name: AspectRatioType;
}

export const COMMON_ASPECT_RATIOS = {
	SQUARE: { width: 1, height: 1, name: 'square' } as AspectRatio,
	LANDSCAPE_16_9: { width: 16, height: 9, name: '16:9' } as AspectRatio,
	PORTRAIT_9_16: { width: 9, height: 16, name: '9:16' } as AspectRatio,
	PORTRAIT_4_5: { width: 4, height: 5, name: '4:5' } as AspectRatio,
	LANDSCAPE_5_4: { width: 5, height: 4, name: '5:4' } as AspectRatio,
} as const;

/**
 * Scene layout configuration.
 */
const SCENE = {
	columns: 1, // Columns in layout (kept for context)
	planeHeight: 1, // Base height for scaling calculations
	verticalGap: 1.05, // Spacing between items (larger than planeHeight)
	scrollMultiplier: 0.1, // Scroll sensitivity factor
	recycleBuffer: 2, // Viewport buffer (multiple of planeHeight) for recycling items
	leftPadding: 0.0, // Distance from left edge of canvas
	autoScrollSpeed: 15, // Speed for automatic scrolling on touch devices
	initialAnimDuration: 1.8, // Duration for the initial fade-in animation
};

/**
 * Default material properties.
 */
const MATERIAL = {
	grain: {
		intensity: 0.05, // Default film grain intensity (0-1)
		scale: 500.0, // Default grain scale - higher = finer grain
		speed: 0.5, // Default grain animation speed
	},
	visibility: {
		fade: 0.5, // Controls edge fade distance
	},
};

/**
 * Feature flags.
 */
const FEATURES = {
	disableMedia: false, // Flag to disable loading media assets
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Calculate plane dimensions based on aspect ratio, maintaining a constant height.
 * @param aspectRatio - The target aspect ratio.
 * @returns Array containing [width, height].
 */
export function calculateDimensions(aspectRatio: AspectRatio): [number, number] {
	const ratio = aspectRatio.width / aspectRatio.height;
	// Always use the fixed SCENE.planeHeight
	const height = SCENE.planeHeight;
	// Calculate width based on the fixed height and aspect ratio
	const width = height * ratio;
	return [width, height];
}

/**
 * Finds the closest predefined aspect ratio from COMMON_ASPECT_RATIOS to a given numeric ratio.
 * @param ratio - The numeric aspect ratio (width / height).
 * @returns The closest predefined AspectRatio object.
 */
export function findClosestAspectRatio(ratio: number): AspectRatio {
	const defaultRatio = COMMON_ASPECT_RATIOS.SQUARE;
	let closestRatio = defaultRatio;
	let smallestDiff = Infinity;

	Object.values(COMMON_ASPECT_RATIOS).forEach((ar: AspectRatio) => {
		const arRatio = ar.width / ar.height;
		const diff = Math.abs(arRatio - ratio);
		if (diff < smallestDiff) {
			smallestDiff = diff;
			closestRatio = ar;
		}
	});

	return closestRatio;
}

// =============================================
// SHADER DEFINITIONS
// =============================================

// Define uniforms for the custom shader material
interface AnimatedMaterialUniforms {
	map: THREE.Texture | null;
	u_time: number;
	u_planeY: number;
	u_viewportHeight: number;
	u_initialAnimProgress: number; // 0.0 to 1.0 for initial load animation
	u_visibilityFade: number; // Controls how quickly items fade at edges (0.1 = sharp, 1.0 = gradual)
	u_aspect: number; // Aspect ratio of the plane (width / height)
	u_grainIntensity: number; // Controls the intensity of the film grain
	u_grainScale: number; // Controls the scale/size of grain particles
	u_grainSpeed: number;
}

// Extend shaderMaterial
const AnimatedShaderMaterial = shaderMaterial(
	// Uniforms
	{
		map: null,
		u_time: 0,
		u_planeY: 0,
		u_viewportHeight: 1, // Avoid division by zero
		u_initialAnimProgress: 0,
		u_visibilityFade: 0.1, // Default fade distance factor
		u_aspect: 1,
		u_grainIntensity: MATERIAL.grain.intensity,
		u_grainScale: MATERIAL.grain.scale,
		u_grainSpeed: MATERIAL.grain.speed,
	},
	// Vertex Shader
	/*glsl*/ `
		varying vec2 vUv;
		varying float v_visibility; // Pass visibility to fragment shader
		varying float v_initialAnimProgress; // Pass progress to fragment shader

		uniform float u_planeY;
		uniform float u_viewportHeight;
		uniform float u_initialAnimProgress;
		uniform float u_visibilityFade; // Smaller = sharper fade edge

		const float FADE_DISTANCE_FACTOR = 0.2; // Portion of viewport height used for fade edge

		void main() {
		vUv = uv;
		v_initialAnimProgress = u_initialAnimProgress;

		// Calculate visibility based on plane's Y position relative to viewport edges
		float halfViewport = u_viewportHeight / 2.0;
		float topEdge = halfViewport;
		float bottomEdge = -halfViewport;

		// Distance from edge where fade starts/ends
		float fadeDistance = u_viewportHeight * FADE_DISTANCE_FACTOR * u_visibilityFade;

		// Simple fade-in/out at viewport edges
		float visibilityBottom = smoothstep(bottomEdge - fadeDistance, bottomEdge + fadeDistance, u_planeY);
		float visibilityTop = smoothstep(topEdge + fadeDistance, topEdge - fadeDistance, u_planeY);
		v_visibility = visibilityBottom * visibilityTop;

		// Simple initial scale animation - no other transformations
		float initialScale = mix(0.95, 1.0, smoothstep(0.0, 1.0, u_initialAnimProgress));

		// Apply the scaling
		vec3 scaledPosition = position * initialScale;

		gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);
		}
	`,
	// Fragment Shader
	/*glsl*/ `
		varying vec2 vUv;
		varying float v_visibility;
		varying float v_initialAnimProgress;

		uniform sampler2D map;
		uniform float u_aspect; // Use aspect ratio to correct UVs if needed
		uniform float u_time;
		uniform float u_grainIntensity;
		uniform float u_grainScale;
		uniform float u_grainSpeed;

		// High-quality noise function based on Inigo Quilez's implementation
		// Returns a pseudo-random value in the 0.0 to 1.0 range for a given 2D coordinate.
		float hash(vec2 p) {
		p = fract(p * vec2(123.34, 456.21));
		p += dot(p, p + 45.32);
		return fract(p.x * p.y);
		}

		/**
		 * Generates a procedural film grain effect.
		 * Uses multiple layers of hash noise with different scales and speeds,
		 * combined and adjusted with a power curve for a more natural appearance.
		 * @param uv The texture coordinate.
		 * @param time The current time, used for animating the grain.
		 * @returns A float value representing the grain intensity at this point.
		 */
		float filmGrain(vec2 uv, float time) {
		// Scale UVs for finer grain control
		vec2 uvScaled = uv * u_grainScale;
		float t = time * u_grainSpeed;

		// Sample noise at different scales and temporal offsets
		float noise1 = hash(uvScaled + t);
		float noise2 = hash(uvScaled * 1.4 + t * 1.2);
		float noise3 = hash(uvScaled * 0.8 - t * 0.7);

		// Blend the noise layers
		float grainLayer = mix(noise1, noise2, 0.4);
		grainLayer = mix(grainLayer, noise3, 0.3);

		// Apply a power curve to adjust the grain distribution (makes it less uniform)
		grainLayer = pow(grainLayer, 1.5);

		return grainLayer;
		}

		void main() {
			vec2 correctedUv = vUv;
			vec4 textureColor = texture2D(map, correctedUv);

			// Combine visibility factors: base alpha * initial animation progress * edge fade visibility.
			// Uses varyings passed from vertex shader.
			float alpha = textureColor.a * v_initialAnimProgress * v_visibility;

			// Discard transparent pixels early to save computation
			if (alpha < 0.01) discard;

			// Generate film grain value for this pixel
			float grain = filmGrain(correctedUv, u_time);

			// Apply grain primarily to mid-tones using a luminance mask
			// This prevents grain from being too strong in pure blacks or whites.
			float luminance = dot(textureColor.rgb, vec3(0.299, 0.587, 0.114));
			float grainMask = 4.0 * luminance * (1.0 - luminance); // Parabolic mask peaking at luminance 0.5
			float scaledGrain = (grain * 2.0 - 1.0) * u_grainIntensity * grainMask; // Scale grain to -intensity..+intensity

			// Apply grain to color
			vec3 grainedColor = textureColor.rgb + scaledGrain;

			gl_FragColor = vec4(grainedColor, alpha);
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
		}
	`,
);

extend({ AnimatedShaderMaterial });

// =============================================
// COMPONENT INTERFACES
// =============================================

/**
 * Props for the AnimatedMaterial component.
 */
interface AnimatedMaterialProps extends Partial<AnimatedMaterialUniforms> {
	texture: THREE.Texture;
	planeY: number;
	viewportHeight: number;
	initialAnimProgress: number;
	aspect: number;
	grainIntensity?: number;
	grainScale?: number;
	grainSpeed?: number;
}

/**
 * Props for the internal media content components.
 */
interface PlaneContentProps {
	/** URL of the image or video source */
	url: string;
	/** Current Y position of the plane in world space */
	planeY: number;
	/** Calculated height of the viewport in world space */
	viewportHeight: number;
	/** Progress of the initial entrance animation (0 to 1) */
	initialAnimProgress: number;
	/** Calculated aspect ratio of the media */
	aspect: number;
	/** Fallback material to display during loading or if media is disabled */
	fallbackMaterial: JSX.Element;
	/** Film grain intensity uniform value (0-1) */
	grainIntensity: number;
	/** Film grain scale uniform value */
	grainScale: number;
	/** Film grain animation speed uniform value */
	grainSpeed: number;
}

/**
 * Props for the PlaneWrapper component.
 */
interface PlaneWrapperProps {
	/** The gallery item data object */
	item: GalleryItem;
	/** Target position vector for the plane group */
	position: THREE.Vector3;
	/** Flag indicating if media loading/rendering is disabled */
	disableMedia: boolean;
	/** Callback invoked when the pointer hovers over or leaves the plane */
	onHoverChange: (name: string | null) => void;
	/** Calculated height of the viewport in world space */
	viewportHeight: number;
	/** Optional: Film grain intensity (0-1) */
	grainIntensity?: number;
	/** Optional: Film grain scale */
	grainScale?: number;
	/** Optional: Film grain animation speed */
	grainSpeed?: number;
}

/**
 * Props for the main component.
 */
interface CreationContentProps {
	galleryItems: GalleryItem[];
}

/**
 * State structure for individual planes, managed by ScrollingPlanes.
 */
interface PlaneState {
	/** Stable unique key for React reconciliation */
	id: string;
	/** Index into the original galleryItems array for data lookup */
	itemIndex: number;
	/** Base Y position at scrollY=0, used for relative calculations */
	initialY: number;
	/** Current calculated X position based on viewport */
	x: number;
	/** Current calculated Z position (currently static) */
	z: number;
	/** Final calculated Y position for rendering this frame, incorporating scroll offset */
	currentY: number;
}

/**
 * Props for the ScrollingPlanes component.
 */
interface ScrollingPlanesProps {
	/** The array of gallery items to display */
	galleryItems: GalleryItem[];
	/** Flag to prevent loading/displaying media assets */
	disableMedia: boolean;
	/** Flag indicating if the device is touch-capable (affects scroll behavior) */
	isTouchDevice: boolean;
	/** Callback function invoked when a plane's hover state changes */
	onHoverChange: (name: string | null) => void;
}

// =============================================
// MATERIAL COMPONENTS
// =============================================

/**
 * React component wrapper for the `animatedShaderMaterial`.
 * Manages updating shader uniforms via `useFrame` and handles texture updates.
 */
const AnimatedMaterial: React.FC<AnimatedMaterialProps> = ({
	texture,
	planeY,
	viewportHeight,
	initialAnimProgress,
	aspect,
	u_visibilityFade = MATERIAL.visibility.fade,
	grainIntensity = MATERIAL.grain.intensity,
	grainScale = MATERIAL.grain.scale,
	grainSpeed = MATERIAL.grain.speed,
	...props // Pass any other standard material props
}) => {
	const materialRef = useRef<THREE.ShaderMaterial>(null!); // Use THREE.ShaderMaterial type

	// Update uniforms efficiently
	useFrame((_, delta) => {
		if (materialRef.current) {
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.u_time.value += delta;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.u_planeY.value = planeY;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.u_viewportHeight.value = viewportHeight;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.u_initialAnimProgress.value = initialAnimProgress;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.u_aspect.value = aspect;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.u_visibilityFade.value = u_visibilityFade;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.u_grainIntensity.value = grainIntensity;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.u_grainScale.value = grainScale;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.u_grainSpeed.value = grainSpeed;
		}
	});

	useEffect(() => {
		if (materialRef.current) {
			// @ts-expect-error - ShaderMaterial uniforms not properly typed in drei extension
			materialRef.current.uniforms.map.value = texture;
		}
	}, [texture]);

	return (
		// @ts-expect-error - Custom extended shader material not correctly typed by `extend`
		<animatedShaderMaterial
			ref={materialRef}
			key={AnimatedShaderMaterial.key}
			attach="material"
			map={texture} // Initial map uniform set
			u_planeY={planeY}
			u_viewportHeight={viewportHeight}
			u_initialAnimProgress={initialAnimProgress}
			u_aspect={aspect}
			u_visibilityFade={u_visibilityFade}
			u_grainIntensity={grainIntensity}
			u_grainScale={grainScale}
			u_grainSpeed={grainSpeed}
			transparent // MUST be true for alpha blending
			side={THREE.DoubleSide} // Assuming double sided planes
			toneMapped={false} // Match original Video/Image materials
			{...props}
		/>
	);
};

// =============================================
// MEDIA COMPONENTS
// =============================================

/**
 * Internal component: Loads and renders an image texture using AnimatedMaterial.
 */
const ImagePlaneContent: FC<PlaneContentProps> = React.memo(({ url, planeY, viewportHeight, initialAnimProgress, aspect, fallbackMaterial, grainIntensity, grainScale, grainSpeed }) => {
	const texture = useTexture(url); // Loads image texture

	return texture ? (
		<AnimatedMaterial
			texture={texture}
			planeY={planeY}
			viewportHeight={viewportHeight}
			initialAnimProgress={initialAnimProgress}
			aspect={aspect}
			grainIntensity={grainIntensity}
			grainScale={grainScale}
			grainSpeed={grainSpeed}
		/>
	) : (
		fallbackMaterial
	);
});
ImagePlaneContent.displayName = 'ImagePlaneContent';

/**
 * Internal component: Loads and renders a video texture using AnimatedMaterial.
 */
const VideoPlaneContent: FC<PlaneContentProps> = React.memo(({ url, planeY, viewportHeight, initialAnimProgress, aspect, fallbackMaterial, grainIntensity, grainScale, grainSpeed }) => {
	const texture = useVideoTexture(url, {
		muted: true,
		loop: true,
		playsInline: true,
		crossOrigin: 'anonymous',
		start: true,
	});

	return texture ? (
		<AnimatedMaterial
			texture={texture}
			planeY={planeY}
			viewportHeight={viewportHeight}
			initialAnimProgress={initialAnimProgress}
			aspect={aspect}
			grainIntensity={grainIntensity}
			grainScale={grainScale}
			grainSpeed={grainSpeed}
		/>
	) : (
		fallbackMaterial
	);
});
VideoPlaneContent.displayName = 'VideoPlaneContent';

// =============================================
// PLANE COMPONENTS
// =============================================

/**
 * Wraps a single gallery item (image or video) plane in the 3D scene.
 * Handles aspect ratio detection, dimensions, hover events, and media rendering.
 */
const PlaneWrapper: FC<PlaneWrapperProps> = React.memo(
	({ item, position, disableMedia, onHoverChange, viewportHeight, grainIntensity = MATERIAL.grain.intensity, grainScale = MATERIAL.grain.scale, grainSpeed = MATERIAL.grain.speed }) => {
		const groupRef = useRef<THREE.Group>(null!);
		const [dimensions, setDimensions] = useState<[number, number]>([SCENE.planeHeight, SCENE.planeHeight]);
		const [aspect, setAspect] = useState<number>(1);
		const [initialAnimProgress, setInitialAnimProgress] = useState(0); // 0 to 1
		const [isMounted, setIsMounted] = useState(false);
		const startTimeRef = useRef<number | null>(null);

		// --- Event Handlers ---
		const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
			event.stopPropagation();
			onHoverChange(item.title ?? null);
		};

		const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
			event.stopPropagation();
			onHoverChange(null);
		};

		// Detect aspect ratio and set dimensions - ONLY IF MEDIA IS ENABLED
		useEffect(() => {
			if (disableMedia || !item.url) return;

			const detectAspectRatio = async () => {
				if (!item.url) return;

				try {
					let ratio = 1;
					if (item.mediaType === 'video') {
						const video = document.createElement('video');
						video.src = item.url;
						await new Promise<void>((resolve, reject) => {
							video.onloadedmetadata = () => resolve();
							video.onerror = (e) => reject(e); // Pass error object
						});
						ratio = video.videoWidth / video.videoHeight;
					} else if (item.mediaType === 'image') {
						const img = document.createElement('img');
						img.src = item.url;
						await new Promise<void>((resolve, reject) => {
							img.onload = () => resolve();
							img.onerror = (e) => reject(e); // Pass error object
						});
						ratio = img.width / img.height;
					}
					const closest = findClosestAspectRatio(ratio);
					if (closest) {
						setDimensions(calculateDimensions(closest));
						setAspect(closest.width / closest.height);
					}
				} catch (error) {
					logger.error('Error detecting aspect ratio, defaulting to square:', { url: item.url, error });
					// Fallback to default square aspect on error
					setDimensions(calculateDimensions(COMMON_ASPECT_RATIOS.SQUARE));
					setAspect(1);
				}
			};

			detectAspectRatio();
		}, [item.url, item.mediaType, disableMedia]);

		// Start initial animation on mount
		useEffect(() => {
			setIsMounted(true);
		}, []);

		// Update group position and animation progress each frame
		useFrame((state, _delta) => {
			if (groupRef.current) {
				// Update position smoothly
				groupRef.current.position.copy(position);

				// Run the initial entrance animation (scale/fade-in via shader)
				if (isMounted && initialAnimProgress < 1) {
					if (startTimeRef.current === null) {
						startTimeRef.current = state.clock.elapsedTime;
					}
					const elapsed = state.clock.elapsedTime - startTimeRef.current;
					let progress = Math.min(elapsed / SCENE.initialAnimDuration, 1);
					progress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
					setInitialAnimProgress(progress);
				}
			}
		});

		const fallbackMaterial = useMemo(() => <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.0} />, []);

		const renderContent = () => {
			if (disableMedia || !item.url) {
				return fallbackMaterial;
			}

			const contentProps = {
				url: item.url,
				planeY: position.y,
				viewportHeight: viewportHeight,
				initialAnimProgress: initialAnimProgress,
				aspect: aspect,
				fallbackMaterial: fallbackMaterial,
				grainIntensity: grainIntensity,
				grainScale: grainScale,
				grainSpeed: grainSpeed,
			};

			if (item.mediaType === 'video') {
				return <VideoPlaneContent {...contentProps} />;
			} else if (item.mediaType === 'image') {
				return <ImagePlaneContent {...contentProps} />;
			}

			return fallbackMaterial;
		};

		return (
			<group ref={groupRef} userData={{ itemId: item.id }} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
				{/* Center the mesh origin: offset position by half width */}
				<mesh scale={[dimensions[0], dimensions[1], 1]} position={[dimensions[0] / 2, 0, 0]}>
					<planeGeometry />
					<Suspense fallback={fallbackMaterial}>{renderContent()}</Suspense>
				</mesh>
			</group>
		);
	},
);
PlaneWrapper.displayName = 'PlaneWrapper';

// =============================================
// SCROLLING SYSTEM
// =============================================

/**
 * Renders the scrollable/recyclable gallery planes within the Canvas.
 * Handles the primary animation loop, position updates, and recycling logic.
 */
const ScrollingPlanes: FC<ScrollingPlanesProps> = ({ galleryItems, disableMedia, isTouchDevice, onHoverChange }) => {
	// R3F hooks to access scene properties
	const { camera, size } = useThree();

	// State and Refs
	const scrollSpring = useSpring(0, {
		stiffness: 100,
		damping: 50, // Adjusted damping for a slightly less bouncy feel
		mass: 1,
	});

	const [planeStates, setPlaneStates] = useState<PlaneState[]>([]);
	const initialPositionsSet = useRef(false);
	const leftPositionRef = useRef<number>(0);
	const viewportHeightRef = useRef<number>(0);

	// Calculate visible height and initial left edge position in world units at Z=0
	useEffect(() => {
		const cameraZ = camera.position.z;
		const vFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
		const visibleHeight = 2 * Math.tan(vFov / 2) * cameraZ;
		viewportHeightRef.current = visibleHeight;

		// Calculate the visible width in world units
		const aspectRatio = size.width / size.height;
		const visibleWidth = visibleHeight * aspectRatio;

		// Calculate left edge position in world units (considering SCENE.leftPadding)
		const leftEdgePosition = -visibleWidth / 2 + SCENE.leftPadding;
		leftPositionRef.current = leftEdgePosition;

		logger.info('Calculated viewport/edge positions', {
			leftEdgePosition,
			visibleWidth, // Log width for debugging
			visibleHeight,
			aspectRatio,
		});
	}, [camera, size.width, size.height]); // Recalculate if camera properties or viewport size change

	// Calculate the total height the content would occupy if laid out end-to-end
	const totalContentHeight = useMemo(() => {
		if (galleryItems.length === 0) return 0;
		return galleryItems.length * SCENE.verticalGap;
	}, [galleryItems.length]);

	// Initialize the state for each plane based on the gallery items
	useEffect(() => {
		if (galleryItems.length === 0 || initialPositionsSet.current) return;

		logger.info('Initializing plane states', { count: galleryItems.length, totalContentHeight });
		const initialStates: PlaneState[] = [];

		// Calculate offset to center the initial block of items vertically in the view
		const startYOffset = totalContentHeight / 2 - SCENE.verticalGap / 2;

		for (let i = 0; i < galleryItems.length; i++) {
			// Calculate the base Y position for this item
			const baseY = startYOffset - i * SCENE.verticalGap;
			// Use fixed Z position
			const z = 0;
			// X position from the dynamic left edge
			const x = leftPositionRef.current;

			initialStates.push({
				id: `plane-${galleryItems[i]?.id ?? i}`, // Use item ID if available, otherwise index
				itemIndex: i,
				initialY: baseY, // Store the initial Y (no jitter)
				x: x,
				z: z,
				currentY: baseY, // Start rendering at the initial calculated Y
			});
		}
		setPlaneStates(initialStates);
		initialPositionsSet.current = true;
	}, [galleryItems, totalContentHeight]);

	// Setup scroll listener for non-touch devices
	useEffect(() => {
		// Only attach wheel listener if NOT a touch device to avoid conflicts
		if (isTouchDevice) return;

		const handleWheel = (event: WheelEvent) => {
			// Update the scroll spring target based on wheel delta
			scrollSpring.set(scrollSpring.get() - event.deltaY * SCENE.scrollMultiplier);
		};

		// Use passive: true for performance when preventDefault is not called
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, [scrollSpring, isTouchDevice]);

	// Main R3F frame loop: Updates plane positions, handles recycling, and manages auto-scroll
	useFrame((_state, delta) => {
		if (planeStates.length === 0 || totalContentHeight === 0) return; // Skip if no items or layout defined

		// Handle Auto-scroll for touch devices
		if (isTouchDevice) {
			scrollSpring.set(scrollSpring.get() + SCENE.autoScrollSpeed * delta);
		}

		// Get current scroll position from the physics spring
		const currentScroll = scrollSpring.get();

		// Recalculate left edge position based on current viewport size (handles resize)
		const aspectRatio = size.width / size.height;
		const newVisibleWidth = viewportHeightRef.current * aspectRatio;
		const newLeftEdgePosition = -newVisibleWidth / 2 + SCENE.leftPadding;

		// Update the stored left position ref if it has changed significantly
		if (Math.abs(newLeftEdgePosition - leftPositionRef.current) > 0.001) {
			leftPositionRef.current = newLeftEdgePosition;
		}

		// Update plane states based on scroll position, viewport changes, and recycling logic
		setPlaneStates((prevStates) =>
			prevStates.map((state) => {
				let newInitialY = state.initialY;
				// Calculate the plane's current Y position *if scroll were 0*
				const currentRelativeY = state.initialY - currentScroll;
				let hasRecycled = false; // Flag to track if recycling occurred this frame

				// --- Recycling Logic ---
				// If plane is too far above the top bound, recycle it to the bottom
				if (currentRelativeY > viewportHeightRef.current / 2 + SCENE.recycleBuffer) {
					// Jump down by the total height of all content
					newInitialY = state.initialY - totalContentHeight;
					hasRecycled = true;
				}
				// If plane is too far below the bottom bound, recycle it to the top
				else if (currentRelativeY < -viewportHeightRef.current / 2 - SCENE.recycleBuffer) {
					// Jump up by the total height of all content
					newInitialY = state.initialY + totalContentHeight;
					hasRecycled = true;
				}

				// Update X position to match the potentially resized viewport's left edge
				const newX = leftPositionRef.current;
				// Calculate the final Y position for rendering, applying current scroll offset
				const finalCurrentY = newInitialY - currentScroll;

				// Only update state if necessary to prevent unnecessary renders
				const needsUpdate = hasRecycled || finalCurrentY !== state.currentY || newX !== state.x;

				if (needsUpdate) {
					return { ...state, initialY: newInitialY, currentY: finalCurrentY, x: newX };
				} else {
					return state;
				}
			}),
		);
	});

	// Render the PlaneWrappers based on the current calculated state
	return (
		<group>
			{planeStates.map((state) => {
				const item = galleryItems[state.itemIndex];
				if (!item) return null;

				// Current position vector for the wrapper component
				const position = new THREE.Vector3(state.x, state.currentY, state.z);

				return (
					<PlaneWrapper
						key={state.id} // Use stable ID as key
						item={item}
						position={position}
						disableMedia={disableMedia}
						onHoverChange={onHoverChange}
						viewportHeight={viewportHeightRef.current}
					/>
				);
			})}
		</group>
	);
};

// =============================================
// MAIN COMPONENT
// =============================================

/**
 * Main component for the "Creation" section showcase.
 * Sets up the R3F Canvas, manages device detection, and renders the scrollable gallery.
 */
const CreationContent: FC<CreationContentProps> = ({ galleryItems }) => {
	const [dprValue, setDprValue] = useState(1);
	const [isTouchDevice, setIsTouchDevice] = useState(false);
	const [hoveredName, setHoveredName] = useState<string | null>(null);
	const inputState = useInputState();
	const disableMedia = useMemo(() => FEATURES.disableMedia, []);

	// Initialize device detection
	useEffect(() => {
		const touchDetected = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		setIsTouchDevice(touchDetected);
		setDprValue(Math.min(window.devicePixelRatio, 2)); // Cap DPR at 2 for performance

		if (disableMedia) {
			logger.warn('Gallery media loading is DISABLED');
		}
	}, [disableMedia]);

	// Handle hover state changes for item names
	const handleHoverChange = useCallback((name: string | null) => {
		setHoveredName(name);
	}, []);

	// Process gallery items for consistency
	const items: GalleryItem[] = useMemo(() => {
		if (galleryItems.length > 0) {
			const processedItems = galleryItems.map((item: GalleryItem) => ({
				// Ensure required fields have defaults if missing
				description: '', // Default empty description
				tags: [], // Default empty tags array
				...item,
				url: item.url || '', // Default empty string URL
				mediaType: item.mediaType || 'image', // Default to image
			}));

			logger.info(`Using ${processedItems.length} real gallery items`);
			return processedItems as GalleryItem[];
		} else {
			logger.info('No gallery items provided.');
			return [];
		}
	}, [galleryItems]); // Recalculate if input items change

	return (
		<div className="relative h-screen w-full touch-none">
			<Canvas
				shadows
				camera={{
					position: [0, 0, 8],
					fov: 50,
					near: 0.1,
					far: 1000,
				}}
				dpr={dprValue}
				frameloop="always"
				onCreated={({ gl }) => {
					gl.setClearColor('#ffffff');
					logger.info('Canvas created', {});
				}}
			>
				<Suspense fallback={null}>
					<ambientLight intensity={0.8} />
					<directionalLight position={[5, 15, 10]} intensity={1.2} />
					<ScrollingPlanes galleryItems={items} disableMedia={disableMedia} isTouchDevice={isTouchDevice} onHoverChange={handleHoverChange} />
				</Suspense>
			</Canvas>

			{hoveredName && (
				<span
					className="pointer-events-none absolute z-100 whitespace-nowrap text-white opacity-100 mix-blend-difference transition-opacity duration-200 ease-out select-none"
					style={{
						left: `${inputState.pixel.x + 3}px`,
						top: `${inputState.pixel.y - 14}px`,
					}}
				>
					{hoveredName}
				</span>
			)}
		</div>
	);
};

export default CreationContent;
