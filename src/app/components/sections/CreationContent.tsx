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
import { logger } from '@/utils/logger';

/**
 * Configuration constants for the Creation content 3D scene.
 * Consolidates constants previously in config.ts and utils.ts.
 */

// --- Aspect Ratios ---
// Define common aspect ratios and their dimensions
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

// --- Scene Layout Configuration ---
export const NUM_COLUMNS = 1; // Kept for context, though not directly used in single-column layout
export const PLANE_HEIGHT = 1; // Base height for scaling calculations
export const VERTICAL_GAP = 1.05; // Set slightly larger than PLANE_HEIGHT for spacing
export const SCROLL_MULTIPLIER = 0.075; // Scroll sensitivity
export const RECYCLE_BUFFER = PLANE_HEIGHT * 2; // Viewport buffer for recycling items

// Edge positioning
export const LEFT_PADDING = 0.0; // Distance from left edge of canvas to content

// --- Debugging/Development --- //
// Flag to disable loading actual image/video assets during development
// for faster iteration and testing of layout/animation logic.
export const DISABLE_MEDIA = false; // process.env.NODE_ENV === 'development';

/**
 * Utility functions previously in utils.ts, merged here for consolidation.
 */

/**
 * Calculate plane dimensions based on aspect ratio, maintaining a constant height.
 * @param aspectRatio - The target aspect ratio.
 * @returns Array containing [width, height].
 */
export function calculateDimensions(aspectRatio: AspectRatio): [number, number] {
	const ratio = aspectRatio.width / aspectRatio.height;
	// Always use the fixed PLANE_HEIGHT
	const height = PLANE_HEIGHT;
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
		u_grainIntensity: 0.05, // Default grain intensity (0-1)
		u_grainScale: 500.0, // Default grain scale - higher = finer grain
		u_grainSpeed: 0.5, // Default grain animation speed
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

/**
 * Props interface for the AnimatedMaterial component.
 * Extends the uniforms and adds specific required props.
 */
interface AnimatedMaterialProps extends Partial<AnimatedMaterialUniforms> {
	texture: THREE.Texture;
	planeY: number;
	viewportHeight: number;
	initialAnimProgress: number; // Ensure this is passed
	aspect: number;
	grainIntensity?: number; // Optional override for grain intensity
	grainScale?: number; // Optional override for grain scale
	grainSpeed?: number; // Optional override for grain speed
}

/**
 * React component wrapper for the `animatedShaderMaterial`.
 * Manages updating shader uniforms via `useFrame` and handles texture updates.
 * Provides default values for optional grain parameters.
 */
const AnimatedMaterial: React.FC<AnimatedMaterialProps> = ({
	texture,
	planeY,
	viewportHeight,
	initialAnimProgress,
	aspect,
	u_visibilityFade = 0.5, // Provide default
	grainIntensity = 0.05, // Default film grain intensity
	grainScale = 500.0, // Default grain scale
	grainSpeed = 0.5, // Default grain animation speed
	...props // Pass any other standard material props like 'side', 'transparent'
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

/**
 * Props for the internal media content components (ImagePlaneContent/VideoPlaneContent).
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
 * Internal component: Loads and renders an image texture using AnimatedMaterial.
 * Memoized for performance.
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
 * Configures video properties (muted, loop, etc.) via useVideoTexture.
 * Memoized for performance.
 */
const VideoPlaneContent: FC<PlaneContentProps> = React.memo(({ url, planeY, viewportHeight, initialAnimProgress, aspect, fallbackMaterial, grainIntensity, grainScale, grainSpeed }) => {
	const texture = useVideoTexture(url, {
		// Loads video texture with specific settings
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

/**
 * Props for the PlaneWrapper component.
 */
interface PlaneWrapperProps {
	/** The gallery item data object */
	item: GalleryItem;
	/** Target position vector for the plane group (calculated by ScrollingPlanes) */
	position: THREE.Vector3;
	/** Flag indicating if media loading/rendering is disabled */
	disableMedia: boolean;
	/** Callback invoked when the pointer hovers over or leaves the plane */
	onHoverChange: (name: string | null) => void;
	/** Calculated height of the viewport in world space (passed from parent) */
	viewportHeight: number;
	/** Optional: Film grain intensity (0-1) */
	grainIntensity?: number;
	/** Optional: Film grain scale */
	grainScale?: number;
	/** Optional: Film grain animation speed */
	grainSpeed?: number;
}

/** Duration for the initial fade-in animation in seconds */
const INITIAL_ANIM_DURATION = 1.8; // seconds - slower, smoother fade in

/**
 * R3F component wrapping a single gallery item (image or video) plane.
 *
 * Responsibilities:
 * - Handles aspect ratio detection for media.
 * - Calculates plane dimensions based on aspect ratio and fixed height.
 * - Manages pointer hover events to display item titles.
 * - Renders the appropriate media type (Image or Video) via internal components.
 * - Provides a fallback material and uses Suspense for loading.
 * - Implements a simple initial fade-in animation controlled by `useFrame`.
 * - Passes necessary uniforms (grain, animation progress) to `AnimatedMaterial`.
 *
 * @param {PlaneWrapperProps} props - Component props.
 * @returns {JSX.Element} The rendered plane group.
 */
const PlaneWrapper: FC<PlaneWrapperProps> = React.memo(
	({
		item,
		position,
		disableMedia,
		onHoverChange,
		viewportHeight,
		grainIntensity = 0.05, // Use default from AnimatedMaterial
		grainScale = 500.0, // Use default from AnimatedMaterial
		grainSpeed = 0.5, // Use default from AnimatedMaterial
	}) => {
		const groupRef = useRef<THREE.Group>(null!);
		const [dimensions, setDimensions] = useState<[number, number]>([PLANE_HEIGHT, PLANE_HEIGHT]); // Use constant PLANE_HEIGHT for default
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
						setDimensions(calculateDimensions(closest)); // Use calculateDimensions from this file
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
				// Update position smoothly (can add lerping later if needed)
				groupRef.current.position.copy(position);

				// Run the initial entrance animation (scale/fade-in via shader)
				// controlled by initialAnimProgress uniform.
				if (isMounted && initialAnimProgress < 1) {
					if (startTimeRef.current === null) {
						startTimeRef.current = state.clock.elapsedTime;
					}
					const elapsed = state.clock.elapsedTime - startTimeRef.current;
					let progress = Math.min(elapsed / INITIAL_ANIM_DURATION, 1);
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
				grainIntensity: grainIntensity, // Pass down optional props
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
PlaneWrapper.displayName = 'PlaneWrapper'; // Helps in React DevTools

// Define props interface for the main component
interface CreationContentProps {
	galleryItems: GalleryItem[];
}

// Define state structure for individual planes, managed by ScrollingPlanes.
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

/** Speed for automatic scrolling on touch devices, mimicking pixels per second */
const AUTO_SCROLL_SPEED = 15;

// Props for the ScrollingPlanes component
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

// --- Scrolling Content Manager Component ---

/**
 * Renders the scrollable/recyclable gallery planes within the Canvas.
 * Handles the primary animation loop, position updates, and recycling logic.
 */
const ScrollingPlanes: FC<ScrollingPlanesProps> = ({ galleryItems, disableMedia, isTouchDevice, onHoverChange }) => {
	// R3F hooks to access scene properties
	const { camera, size } = useThree();
	// State and Refs
	/** Spring physics for smooth scrolling animation */
	const scrollSpring = useSpring(0, {
		stiffness: 150,
		damping: 25, // Adjusted damping for a slightly less bouncy feel
		mass: 1,
	});
	/** Array holding the current state (position, index) of each plane */
	const [planeStates, setPlaneStates] = useState<PlaneState[]>([]);
	/** Flag to ensure initial positions are calculated only once */
	const initialPositionsSet = useRef(false);
	/** Ref storing the calculated world-space X position for the left edge, adapting to viewport */
	const leftPositionRef = useRef<number>(0);
	/** Ref storing the calculated world-space height of the viewport */
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

		// Calculate left edge position in world units (considering LEFT_PADDING)
		const leftEdgePosition = -visibleWidth / 2 + LEFT_PADDING;
		leftPositionRef.current = leftEdgePosition;

		logger.info('Calculated viewport/edge positions', {
			leftEdgePosition,
			visibleWidth, // Log width for debugging
			visibleHeight,
			aspectRatio,
		});
	}, [camera, size.width, size.height]); // Recalculate if camera properties or viewport size change

	// Calculate the total height the content would occupy if laid out end-to-end.
	// This is crucial for determining the jump distance during recycling.
	const totalContentHeight = useMemo(() => {
		if (galleryItems.length === 0) return 0;
		return galleryItems.length * VERTICAL_GAP;
	}, [galleryItems.length]);

	// Initialize the state (position, ID) for each plane based on the gallery items.
	// Runs only once after galleryItems are available.
	useEffect(() => {
		if (galleryItems.length === 0 || initialPositionsSet.current) return;

		logger.info('Initializing plane states', { count: galleryItems.length, totalContentHeight });
		const initialStates: PlaneState[] = [];
		// Calculate offset to center the initial block of items vertically in the view
		// (places the middle item near y=0 initially).
		const startYOffset = totalContentHeight / 2 - VERTICAL_GAP / 2;

		for (let i = 0; i < galleryItems.length; i++) {
			// Calculate the base Y position for this item directly using index
			const baseY = startYOffset - i * VERTICAL_GAP;
			// Use the fixed Z position.
			const z = 0;
			// X position will be updated in useFrame based on the dynamic left edge.
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
			// Update the scroll spring target directly based on wheel delta.
			// The spring handles the smooth animation towards the target.
			scrollSpring.set(scrollSpring.get() - event.deltaY * SCROLL_MULTIPLIER);

			// Use passive: true for performance when preventDefault is not called for better scroll performance.
			window.addEventListener('wheel', handleWheel, { passive: true });
			return () => window.removeEventListener('wheel', handleWheel);
		};

		// Re-attach if scrollSpring instance or touch status changes
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, [scrollSpring, isTouchDevice]);

	// Main R3F frame loop: Updates plane positions, handles recycling, and manages auto-scroll.
	useFrame((_state, delta) => {
		if (planeStates.length === 0 || totalContentHeight === 0) return; // Skip if no items or layout defined

		// Handle Auto-scroll for touch devices by incrementing scroll based on frame time
		if (isTouchDevice) {
			scrollSpring.set(scrollSpring.get() + AUTO_SCROLL_SPEED * delta);
		}

		// Get the current raw scroll position from the physics spring
		const currentScroll = scrollSpring.get();

		// Recalculate left edge position based on current viewport size (handles resize)
		const aspectRatio = size.width / size.height;
		const newVisibleWidth = viewportHeightRef.current * aspectRatio;
		const newLeftEdgePosition = -newVisibleWidth / 2 + LEFT_PADDING;

		// Update the stored left position ref if it has changed significantly
		if (Math.abs(newLeftEdgePosition - leftPositionRef.current) > 0.001) {
			leftPositionRef.current = newLeftEdgePosition;
		}

		// Update plane states based on scroll position, viewport changes, and recycling logic
		setPlaneStates((prevStates) =>
			prevStates.map((state) => {
				let newInitialY = state.initialY;
				// Calculate the plane's current Y position *if scroll were 0*.
				const currentRelativeY = state.initialY - currentScroll;
				let hasRecycled = false; // Flag to track if recycling occurred this frame

				// --- Recycling Logic ---
				// This ensures seamless infinite scrolling by repositioning planes
				// that move too far out of the view bounds (+ buffer).

				// If plane is too far above the top bound, recycle it to the bottom.
				if (currentRelativeY > viewportHeightRef.current / 2 + RECYCLE_BUFFER) {
					// Jump down by the total height of all content.
					newInitialY = state.initialY - totalContentHeight;
					hasRecycled = true;
				}
				// If plane is too far below the bottom bound, recycle it to the top.
				else if (currentRelativeY < -viewportHeightRef.current / 2 - RECYCLE_BUFFER) {
					// Jump up by the total height of all content.
					newInitialY = state.initialY + totalContentHeight;
					hasRecycled = true;
				}

				// Always update the X position to match the potentially resized viewport's left edge.
				const newX = leftPositionRef.current;
				// Calculate the final Y position for rendering, applying the current scroll offset.
				const finalCurrentY = newInitialY - currentScroll;

				// Determine if the state needs updating (recycled, Y changed, or X changed due to resize).
				// This optimizes state updates by avoiding changes if nothing moved.
				const needsUpdate = hasRecycled || finalCurrentY !== state.currentY || newX !== state.x;

				if (needsUpdate) {
					// Return a *new* state object only if necessary to trigger re-render.
					return { ...state, initialY: newInitialY, currentY: finalCurrentY, x: newX };
				} else {
					// Otherwise, return the *existing* state object to prevent unnecessary updates.
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
						onHoverChange={onHoverChange} // Pass down the callback
						// Pass down required props for animation
						viewportHeight={viewportHeightRef.current}
					/>
				);
			})}
		</group>
	);
};

/**
 * Main component for the "Creation" section showcase.
 * Sets up the R3F Canvas, manages device feature detection (touch, DPR),
 * handles hover state for displaying item names, prepares gallery data,
 * and renders the ScrollingPlanes component which contains the core 3D logic.
 */
const CreationContent: FC<CreationContentProps> = ({ galleryItems }) => {
	const [dprValue, setDprValue] = useState(1);
	const [isTouchDevice, setIsTouchDevice] = useState(false);
	const [hoveredName, setHoveredName] = useState<string | null>(null);
	const inputState = useInputState();

	const disableMedia = useMemo(() => DISABLE_MEDIA, []); // Memoize the constant value

	const handleHoverChange = useCallback(
		(name: string | null) => {
			setHoveredName(name);
			const touchDetected = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
			setIsTouchDevice(touchDetected);
			setDprValue(Math.min(window.devicePixelRatio, 2)); // Cap DPR at 2 for performance

			// Log if media loading is disabled (useful for debugging)
			if (disableMedia) {
				logger.warn('Gallery media loading is DISABLED');
			}
		},
		[disableMedia],
	);

	const items: GalleryItem[] = useMemo(() => {
		if (galleryItems.length > 0) {
			const processedItems = galleryItems.map((item: GalleryItem) => ({
				// Ensure required fields have defaults if missing from input data
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
	}, [galleryItems]); // Dependency: recalculate if input items change

	if (disableMedia) {
		logger.info('Rendering CreationContent with media disabled');
	}

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
					{/* Suspense for async asset loading (textures) */}
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
