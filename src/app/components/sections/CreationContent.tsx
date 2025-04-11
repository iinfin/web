'use client';

import React, { forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { shaderMaterial, useTexture, useVideoTexture } from '@react-three/drei';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { type ThreeEvent } from '@react-three/fiber';
import { useSpring } from 'framer-motion';

import type { GalleryItem } from '@/lib/db/types';
import { logger } from '@/lib/utils/logger';

import { useInputState } from '@/hooks/useInputState';
import { useWindowSize } from '@/hooks/useWindowSize';

// =============================================
// CONFIGURATION AND CONSTANTS
// =============================================

/**
 * Layout modes.
 */
export type LayoutMode = 'vertical' | 'horizontal';

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
	horizontalOffset: 3.5, // Vertical offset for horizontal layout - INCREASED SIGNIFICANTLY
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
 * @param layoutMode - The current layout mode.
 * @param viewportFixedAxisLength - The length of the viewport on the fixed axis.
 * @returns Array containing [width, height].
 */
export function calculateDimensions(aspectRatio: AspectRatio, layoutMode: LayoutMode, viewportFixedAxisLength: number): [number, number] {
	const ratio = aspectRatio.width / aspectRatio.height;

	// Vertical Mode: Fixed height (SCENE.planeHeight), variable width
	if (layoutMode === 'vertical') {
		const height = SCENE.planeHeight;
		const width = height * ratio;
		return [width, height];
	}

	// Horizontal Mode: Fit height to viewport (with padding), calculate width
	else {
		// DRASTICALLY REDUCE SIZE - 20% of viewport height
		const height = viewportFixedAxisLength * 0.2;
		const width = height * ratio;
		logger.info('Mobile dimensions calculated:', { width, height, viewportFixedAxisLength });
		return [width, height];
	}
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
	u_planeScrollAxisPos: number; // Replaces u_planeY
	u_viewportScrollAxisLength: number; // Replaces u_viewportHeight
	u_planeFixedAxisPos: number; // New: position on the non-scrolling axis
	u_viewportFixedAxisLength: number; // New: length of the non-scrolling axis
	u_layoutMode: number; // 0 for vertical, 1 for horizontal
	u_initialAnimProgress: number; // 0.0 to 1.0 for initial load animation
	u_visibilityFade: number; // Controls how quickly items fade at edges (0.1 = sharp, 1.0 = gradual)
	u_aspect: number; // Aspect ratio of the plane (width / height)
	u_grainIntensity: number; // Controls the intensity of the film grain
	u_grainScale: number; // Controls the scale/size of grain particles
	u_grainSpeed: number;
	u_assetLoaded: number; // 0.0 to 1.0 for asset loaded animation
}

// Extend shaderMaterial
const AnimatedShaderMaterial = shaderMaterial(
	// Uniforms
	{
		map: null,
		u_time: 0,
		u_planeScrollAxisPos: 0,
		u_viewportScrollAxisLength: 1,
		u_planeFixedAxisPos: 0,
		u_viewportFixedAxisLength: 1,
		u_layoutMode: 0, // Default to vertical
		u_initialAnimProgress: 0,
		u_visibilityFade: 0.1, // Default fade distance factor
		u_aspect: 1,
		u_grainIntensity: MATERIAL.grain.intensity,
		u_grainScale: MATERIAL.grain.scale,
		u_grainSpeed: MATERIAL.grain.speed,
		u_assetLoaded: 0, // Default to not loaded
	},
	// Vertex Shader
	/*glsl*/ `
		varying vec2 vUv;
		varying float v_visibility; // Pass visibility to fragment shader
		varying float v_initialAnimProgress; // Pass progress to fragment shader
		varying float v_assetLoaded; // Pass asset loaded progress to fragment shader

		uniform float u_planeScrollAxisPos;
		uniform float u_viewportScrollAxisLength;
		uniform float u_planeFixedAxisPos; // Not directly used for visibility, but passed for potential future use
		uniform float u_viewportFixedAxisLength; // Not directly used for visibility
		uniform int u_layoutMode; // 0: vertical, 1: horizontal
		uniform float u_initialAnimProgress;
		uniform float u_visibilityFade; // Smaller = sharper fade edge
		uniform float u_assetLoaded; // Asset loaded animation progress

		const float FADE_DISTANCE_FACTOR = 0.2; // Portion of viewport length used for fade edge

		void main() {
			vUv = uv;
			v_initialAnimProgress = u_initialAnimProgress;
			v_assetLoaded = u_assetLoaded;

			// Calculate visibility based on plane's position relative to viewport edges along the scroll axis
			float halfViewportScroll = u_viewportScrollAxisLength / 2.0;
			float positiveEdge = halfViewportScroll;
			float negativeEdge = -halfViewportScroll;

			// Distance from edge where fade starts/ends
			float fadeDistance = u_viewportScrollAxisLength * FADE_DISTANCE_FACTOR * u_visibilityFade;

			// Fade-in/out at viewport edges along the scroll axis
			// smoothstep(edge1, edge2, x): 0 if x <= edge1, 1 if x >= edge2, smooth interpolation in between
			float visibilityNegativeEdge = smoothstep(negativeEdge - fadeDistance, negativeEdge + fadeDistance, u_planeScrollAxisPos);
			float visibilityPositiveEdge = smoothstep(positiveEdge + fadeDistance, positiveEdge - fadeDistance, u_planeScrollAxisPos);
			v_visibility = visibilityNegativeEdge * visibilityPositiveEdge;

			// Simple initial scale animation - no other transformations
			float initialScale = mix(0.95, 1.0, smoothstep(0.0, 1.0, u_initialAnimProgress));

			// Apply additional scale when asset is loaded
			float assetLoadedScale = mix(0.95, 1.0, smoothstep(0.0, 1.0, u_assetLoaded));

			// Combine scale factors
			float finalScale = initialScale * assetLoadedScale;

			// Apply the scaling
			vec3 scaledPosition = position * finalScale;

			gl_Position = projectionMatrix * modelViewMatrix * vec4(scaledPosition, 1.0);
		}
	`,
	// Fragment Shader
	/*glsl*/ `
		varying vec2 vUv;
		varying float v_visibility;
		varying float v_initialAnimProgress;
		varying float v_assetLoaded;

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

			// Combine visibility factors: base alpha * initial animation progress * edge fade visibility * asset loaded progress
			// Uses varyings passed from vertex shader.
			float alpha = textureColor.a * v_initialAnimProgress * v_visibility * v_assetLoaded;

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
	planeScrollAxisPos: number;
	viewportScrollAxisLength: number;
	planeFixedAxisPos: number;
	viewportFixedAxisLength: number;
	layoutMode: number;
	initialAnimProgress: number;
	assetLoaded: number; // New prop for asset loaded animation
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
	/** Current position of the plane along the scroll axis (Y for vertical, X for horizontal) */
	planeScrollAxisPos: number;
	/** Calculated length of the viewport along the scroll axis */
	viewportScrollAxisLength: number;
	/** Current position of the plane along the fixed axis (X for vertical, Y for horizontal) */
	planeFixedAxisPos: number;
	/** Calculated length of the viewport along the fixed axis */
	viewportFixedAxisLength: number;
	/** Layout mode (0: vertical, 1: horizontal) */
	layoutMode: number;
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
	/** Callback when the asset has loaded */
	onAssetLoaded: () => void;
}

/**
 * Props for the PlaneWrapper component.
 */
interface PlaneWrapperProps {
	/** The gallery item data object */
	item: GalleryItem;
	/** Target position vector for the plane group */
	position: THREE.Vector3;
	/** Layout mode */
	layoutMode: LayoutMode;
	/** Flag indicating if media loading/rendering is disabled */
	disableMedia: boolean;
	/** Callback invoked when the pointer hovers over or leaves the plane */
	onHoverChange: (name: string | null) => void;
	/** Calculated length of the viewport along the scroll axis */
	viewportScrollAxisLength: number;
	/** Calculated length of the viewport along the fixed axis */
	viewportFixedAxisLength: number;
	/** Dimensions of the plane */
	dimensions: [number, number];
	/** Calculated aspect ratio of the plane content */
	aspect: number;
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
	/** Base position along the scroll axis at scroll=0 */
	initialScrollAxisPos: number;
	/** Current calculated position along the fixed axis (X for vertical, Y for horizontal) */
	fixedAxisPos: number;
	/** Current calculated Z position (currently static) */
	z: number;
	/** Final calculated position along the scroll axis for rendering this frame */
	currentScrollAxisPos: number;
	/** Calculated dimensions [width, height] of the plane */
	dimensions: [number, number];
	/** Calculated aspect ratio of the plane content */
	aspect: number;
}

/**
 * Props for the ScrollingPlanes component.
 */
interface ScrollingPlanesProps {
	/** The array of gallery items to display */
	galleryItems: GalleryItem[];
	/** Current layout mode */
	layoutMode: LayoutMode;
	/** Flag to prevent loading/displaying media assets */
	disableMedia: boolean;
	/** Flag indicating if the device is touch-capable (affects scroll behavior) */
	isTouchDevice: boolean;
	/** Callback function invoked when a plane's hover state changes */
	onHoverChange: (name: string | null) => void;
}

/**
 * Ref handle type for ScrollingPlanes, exposing scroll control.
 */
export interface ScrollingPlanesHandle {
	addScroll: (delta: number) => void;
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
	planeScrollAxisPos,
	viewportScrollAxisLength,
	planeFixedAxisPos,
	viewportFixedAxisLength,
	layoutMode,
	initialAnimProgress,
	assetLoaded,
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
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_time.value += delta;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_planeScrollAxisPos.value = planeScrollAxisPos;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_viewportScrollAxisLength.value = viewportScrollAxisLength;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_planeFixedAxisPos.value = planeFixedAxisPos;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_viewportFixedAxisLength.value = viewportFixedAxisLength;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_layoutMode.value = layoutMode;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_initialAnimProgress.value = initialAnimProgress;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_assetLoaded.value = assetLoaded;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_aspect.value = aspect;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_visibilityFade.value = u_visibilityFade;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_grainIntensity.value = grainIntensity;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_grainScale.value = grainScale;
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_grainSpeed.value = grainSpeed;
		}
	});

	useEffect(() => {
		if (materialRef.current) {
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
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
			u_planeScrollAxisPos={planeScrollAxisPos}
			u_viewportScrollAxisLength={viewportScrollAxisLength}
			u_planeFixedAxisPos={planeFixedAxisPos}
			u_viewportFixedAxisLength={viewportFixedAxisLength}
			u_layoutMode={layoutMode}
			u_initialAnimProgress={initialAnimProgress}
			u_assetLoaded={assetLoaded}
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
const ImagePlaneContent: FC<PlaneContentProps> = React.memo(
	({
		url,
		planeScrollAxisPos,
		viewportScrollAxisLength,
		planeFixedAxisPos,
		viewportFixedAxisLength,
		layoutMode,
		initialAnimProgress,
		aspect,
		fallbackMaterial,
		grainIntensity,
		grainScale,
		grainSpeed,
		onAssetLoaded,
	}) => {
		const [assetLoaded, setAssetLoaded] = useState(0);
		const startTimeRef = useRef<number | null>(null);
		const loadSuccessRef = useRef<boolean>(false);

		// Load the texture and set up success and error handling
		const texture = useTexture(url);

		// Set up texture loading success handling
		useEffect(() => {
			if (texture) {
				logger.info(`Image loaded successfully: ${url}`);
				loadSuccessRef.current = true;
				startTimeRef.current = 0;
				onAssetLoaded();
			}
		}, [texture, url, onAssetLoaded]);

		// Safety check: Force animate after a timeout to prevent permanent invisibility
		useEffect(() => {
			const safetyTimeout = setTimeout(() => {
				if (!loadSuccessRef.current) {
					logger.warn(`Image load safety timeout triggered: ${url}`);
					loadSuccessRef.current = true;
					startTimeRef.current = 0;
					onAssetLoaded();
				}
			}, 5000); // 5 second timeout

			return () => clearTimeout(safetyTimeout);
		}, [url, onAssetLoaded]);

		// Animate the asset loaded state
		useFrame((state) => {
			if (startTimeRef.current !== null && assetLoaded < 1) {
				if (startTimeRef.current === 0) {
					startTimeRef.current = state.clock.elapsedTime;
				}
				const elapsed = state.clock.elapsedTime - startTimeRef.current;
				const ASSET_FADE_DURATION = 1.0; // 1 second fade-in
				let progress = Math.min(elapsed / ASSET_FADE_DURATION, 1);
				progress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
				setAssetLoaded(progress);
			}
		});

		return texture ? (
			<AnimatedMaterial
				texture={texture}
				planeScrollAxisPos={planeScrollAxisPos}
				viewportScrollAxisLength={viewportScrollAxisLength}
				planeFixedAxisPos={planeFixedAxisPos}
				viewportFixedAxisLength={viewportFixedAxisLength}
				layoutMode={layoutMode}
				initialAnimProgress={initialAnimProgress}
				assetLoaded={assetLoaded}
				aspect={aspect}
				grainIntensity={grainIntensity}
				grainScale={grainScale}
				grainSpeed={grainSpeed}
			/>
		) : (
			fallbackMaterial
		);
	},
);
ImagePlaneContent.displayName = 'ImagePlaneContent';

/**
 * Internal component: Loads and renders a video texture using AnimatedMaterial.
 */
const VideoPlaneContent: FC<PlaneContentProps> = React.memo(
	({
		url,
		planeScrollAxisPos,
		viewportScrollAxisLength,
		planeFixedAxisPos,
		viewportFixedAxisLength,
		layoutMode,
		initialAnimProgress,
		aspect,
		fallbackMaterial,
		grainIntensity,
		grainScale,
		grainSpeed,
		onAssetLoaded,
	}) => {
		const [assetLoaded, setAssetLoaded] = useState(0);
		const startTimeRef = useRef<number | null>(null);
		const canPlayRef = useRef(false);
		const loadAttemptedRef = useRef(false);

		// Create the texture with improved error handling
		const texture = useVideoTexture(url, {
			muted: true,
			loop: true,
			playsInline: true,
			crossOrigin: 'anonymous',
			start: true,
			autoplay: true,
			unsuspend: 'canplay',
			preload: 'auto',
			onerror: (event: Event | string) => {
				const errorMessage = typeof event === 'string' ? event : 'Video loading error';
				logger.error(`Video texture loading failed: ${errorMessage}`, { url });

				// Even on error, we should trigger animation to prevent invisible items
				if (!canPlayRef.current) {
					canPlayRef.current = true;
					startTimeRef.current = 0;
					onAssetLoaded();
				}
			},
		});

		// More robust video readiness detection
		useEffect(() => {
			// Mark this load attempt even if we don't have texture yet
			loadAttemptedRef.current = true;

			if (texture && texture.source && texture.source.data) {
				const videoElement = texture.source.data as HTMLVideoElement;

				// Debug log the video element state
				logger.info(`Video element state for ${url}:`, {
					readyState: videoElement.readyState,
					paused: videoElement.paused,
					error: videoElement.error,
					networkState: videoElement.networkState,
				});

				const handleCanPlay = () => {
					logger.info(`Video can play: ${url}`);
					canPlayRef.current = true;
					startTimeRef.current = 0;
					onAssetLoaded();
				};

				// Video already has enough data
				if (videoElement.readyState >= 3) {
					// HAVE_FUTURE_DATA or higher
					handleCanPlay();
				} else {
					// Add both 'canplay' and 'loadeddata' events for better coverage
					videoElement.addEventListener('canplay', handleCanPlay);
					videoElement.addEventListener('loadeddata', handleCanPlay);

					// Also handle errors at this level
					const handleError = () => {
						logger.error(`Video element error: ${url}`, {
							errorCode: videoElement.error?.code,
							errorMessage: videoElement.error?.message,
						});

						// Trigger animation even on error
						if (!canPlayRef.current) {
							canPlayRef.current = true;
							startTimeRef.current = 0;
							onAssetLoaded();
						}
					};

					videoElement.addEventListener('error', handleError);

					return () => {
						videoElement.removeEventListener('canplay', handleCanPlay);
						videoElement.removeEventListener('loadeddata', handleCanPlay);
						videoElement.removeEventListener('error', handleError);
					};
				}
			}

			// Return empty cleanup function for paths where no event listeners were added
			return () => {};
		}, [texture, url, onAssetLoaded]);

		// Safety timeout: force animate after a delay to prevent permanent invisibility
		useEffect(() => {
			const safetyTimeout = setTimeout(() => {
				if (loadAttemptedRef.current && !canPlayRef.current) {
					logger.warn(`Video load safety timeout triggered: ${url}`);
					canPlayRef.current = true;
					startTimeRef.current = 0;
					onAssetLoaded();
				}
			}, 5000); // 5 second timeout

			return () => clearTimeout(safetyTimeout);
		}, [url, onAssetLoaded]);

		// Animate the asset loaded state
		useFrame((state) => {
			if (startTimeRef.current !== null && assetLoaded < 1) {
				if (startTimeRef.current === 0) {
					startTimeRef.current = state.clock.elapsedTime;
				}
				const elapsed = state.clock.elapsedTime - startTimeRef.current;
				const ASSET_FADE_DURATION = 1.0; // 1 second fade-in
				let progress = Math.min(elapsed / ASSET_FADE_DURATION, 1);
				progress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
				setAssetLoaded(progress);
			}
		});

		// Try to ensure video playback
		useEffect(() => {
			if (texture && texture.source && texture.source.data) {
				const videoElement = texture.source.data as HTMLVideoElement;

				// Function to retry playback
				const tryPlay = () => {
					if (videoElement.paused) {
						logger.info(`Attempting to play video: ${url}`);
						const playPromise = videoElement.play();
						if (playPromise !== undefined) {
							playPromise.catch((error) => {
								logger.warn(`Video playback prevented: ${error.message}`, { url });
							});
						}
					}
				};

				// Try to play immediately
				tryPlay();

				// And retry after a short delay in case of temporary blocking
				const playbackRetryTimeout = setTimeout(tryPlay, 1000);

				return () => clearTimeout(playbackRetryTimeout);
			}

			// Return empty cleanup function for paths where no event listeners were added
			return () => {};
		}, [texture, url]);

		return texture ? (
			<AnimatedMaterial
				texture={texture}
				planeScrollAxisPos={planeScrollAxisPos}
				viewportScrollAxisLength={viewportScrollAxisLength}
				planeFixedAxisPos={planeFixedAxisPos}
				viewportFixedAxisLength={viewportFixedAxisLength}
				layoutMode={layoutMode}
				initialAnimProgress={initialAnimProgress}
				assetLoaded={assetLoaded}
				aspect={aspect}
				grainIntensity={grainIntensity}
				grainScale={grainScale}
				grainSpeed={grainSpeed}
			/>
		) : (
			fallbackMaterial
		);
	},
);
VideoPlaneContent.displayName = 'VideoPlaneContent';

// =============================================
// PLANE COMPONENTS
// =============================================

/**
 * Internal component: Wraps a single gallery item (image or video) plane in the 3D scene.
 * Handles aspect ratio detection, dimensions, hover events, and media rendering.
 */
const PlaneWrapper: FC<PlaneWrapperProps> = React.memo(
	({
		item,
		position,
		layoutMode,
		disableMedia,
		onHoverChange,
		viewportScrollAxisLength,
		viewportFixedAxisLength,
		dimensions,
		aspect,
		grainIntensity = MATERIAL.grain.intensity,
		grainScale = MATERIAL.grain.scale,
		grainSpeed = MATERIAL.grain.speed,
	}) => {
		const groupRef = useRef<THREE.Group>(null!);
		const [initialAnimProgress, setInitialAnimProgress] = useState(0); // 0 to 1
		const [isMounted, setIsMounted] = useState(false);
		const startTimeRef = useRef<number | null>(null);

		// Add a handler for asset loading events
		const handleAssetLoaded = useCallback(() => {
			logger.info(`Asset loaded: ${item.title ?? 'unnamed'} (${item.mediaType})`);
		}, [item.title, item.mediaType]);

		// --- Event Handlers ---
		const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
			event.stopPropagation();
			onHoverChange(item.title ?? null);
		};

		const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
			event.stopPropagation();
			onHoverChange(null);
		};

		// Start initial animation on mount
		useEffect(() => {
			setIsMounted(true);
		}, []);

		// Update group position and animation progress each frame
		useFrame((state, _delta) => {
			if (groupRef.current) {
				// Update position smoothly (assuming parent passes updated position)
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
				planeScrollAxisPos: layoutMode === 'vertical' ? position.y : position.x,
				viewportScrollAxisLength: viewportScrollAxisLength,
				planeFixedAxisPos: layoutMode === 'vertical' ? position.x : position.y,
				viewportFixedAxisLength: viewportFixedAxisLength,
				layoutMode: layoutMode === 'vertical' ? 0 : 1,
				initialAnimProgress: initialAnimProgress,
				aspect: aspect,
				fallbackMaterial: fallbackMaterial,
				grainIntensity: grainIntensity,
				grainScale: grainScale,
				grainSpeed: grainSpeed,
				onAssetLoaded: handleAssetLoaded,
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
				<mesh
					scale={[dimensions[0], dimensions[1], 1]}
					// Adjust position calculation to properly center planes based on layout mode
					position={[layoutMode === 'vertical' ? dimensions[0] / 2 : 0, layoutMode === 'vertical' ? 0 : dimensions[1] / 2, 0]}
				>
					<planeGeometry />
					<Suspense fallback={fallbackMaterial}>{renderContent()}</Suspense>
				</mesh>
			</group>
		);
	},
	// Custom comparison function for React.memo to prevent unnecessary re-renders
	(prevProps, nextProps) => {
		return (
			prevProps.item.id === nextProps.item.id &&
			prevProps.position.equals(nextProps.position) && // Use Vector3.equals for comparison
			prevProps.layoutMode === nextProps.layoutMode &&
			prevProps.disableMedia === nextProps.disableMedia &&
			prevProps.viewportScrollAxisLength === nextProps.viewportScrollAxisLength &&
			prevProps.viewportFixedAxisLength === nextProps.viewportFixedAxisLength &&
			prevProps.dimensions[0] === nextProps.dimensions[0] &&
			prevProps.dimensions[1] === nextProps.dimensions[1] &&
			prevProps.aspect === nextProps.aspect
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
 * Now uses forwardRef to expose scroll control.
 */
const ScrollingPlanes = forwardRef<ScrollingPlanesHandle, ScrollingPlanesProps>(({ galleryItems, layoutMode, disableMedia, isTouchDevice: _isTouchDevice, onHoverChange }, ref) => {
	const { camera, size } = useThree();

	const scrollSpring = useSpring(0, {
		stiffness: 100,
		damping: 50,
		mass: 1,
	});

	const [planeStates, setPlaneStates] = useState<PlaneState[]>([]);
	const [isInitialized, setIsInitialized] = useState(false);
	const viewportScrollAxisLengthRef = useRef<number>(0);
	const viewportFixedAxisLengthRef = useRef<number>(0);
	const fixedAxisPositionRef = useRef<number>(0);
	const totalContentLengthRef = useRef<number>(0);
	const planeDataCache = useRef<Map<string, { dims: [number, number]; aspect: number }>>(new Map());

	// Calculate viewport dimensions and fixed axis position whenever size or layoutMode changes
	useEffect(() => {
		const cameraZ = camera.position.z;
		const vFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
		const visibleHeight = 2 * Math.tan(vFov / 2) * cameraZ;
		const aspectRatio = size.width / size.height;
		const visibleWidth = visibleHeight * aspectRatio;

		if (layoutMode === 'vertical') {
			viewportScrollAxisLengthRef.current = visibleHeight;
			viewportFixedAxisLengthRef.current = visibleWidth;
			fixedAxisPositionRef.current = -visibleWidth / 2 + SCENE.leftPadding;
		} else {
			viewportScrollAxisLengthRef.current = visibleWidth;
			viewportFixedAxisLengthRef.current = visibleHeight;

			// DRASTIC CHANGE - Move items significantly upward in the viewport
			// Position items 2 units above the bottom, which should place them well in view
			fixedAxisPositionRef.current = -visibleHeight / 2 + SCENE.horizontalOffset;

			logger.info('HORIZONTAL LAYOUT POSITION:', {
				visibleHeight,
				visibleWidth,
				bottomOfViewport: -visibleHeight / 2,
				fixedAxisPosition: fixedAxisPositionRef.current,
				offset: SCENE.horizontalOffset,
			});
		}

		logger.info('Recalculated viewport/edge positions', {
			fixedAxisPosition: fixedAxisPositionRef.current,
			viewportScrollAxisLength: viewportScrollAxisLengthRef.current,
			viewportFixedAxisLength: viewportFixedAxisLengthRef.current,
			layoutMode,
		});

		// Trigger re-initialization if dimensions are ready
		setIsInitialized(false);
	}, [camera, size.width, size.height, layoutMode]);

	// Fetch dimensions and initialize plane states when items, mode, or viewport changes
	useEffect(() => {
		if (galleryItems.length === 0 || isInitialized || viewportFixedAxisLengthRef.current === 0) return;

		const fetchAndInitialize = async () => {
			logger.info(`Initializing plane states for ${layoutMode} mode...`);
			const newPlaneStates: PlaneState[] = [];
			let calculatedTotalLength = 0;

			const dimensionPromises = galleryItems.map(async (item) => {
				const cacheKey = `${item.id}-${layoutMode}`;
				if (planeDataCache.current.has(cacheKey)) {
					return planeDataCache.current.get(cacheKey)!;
				}

				if (disableMedia || !item.url) {
					const defaultAspect = COMMON_ASPECT_RATIOS.SQUARE;
					const dims = calculateDimensions(defaultAspect, layoutMode, viewportFixedAxisLengthRef.current);
					const data = { dims, aspect: 1 };
					planeDataCache.current.set(cacheKey, data);
					return data;
				}

				try {
					let ratio = 1;
					if (item.mediaType === 'video') {
						const video = document.createElement('video');
						video.src = item.url;
						await new Promise<void>((resolve, reject) => {
							video.onloadedmetadata = () => resolve();
							video.onerror = (e) => reject(new Error(`Video load error: ${e?.toString()}`));
						});
						ratio = video.videoWidth / video.videoHeight;
					} else if (item.mediaType === 'image') {
						const img = document.createElement('img');
						img.src = item.url;
						await new Promise<void>((resolve, reject) => {
							img.onload = () => resolve();
							img.onerror = (e) => reject(new Error(`Image load error: ${e?.toString()}`));
						});
						ratio = img.width / img.height;
					}
					const closest = findClosestAspectRatio(ratio);
					const dims = calculateDimensions(closest, layoutMode, viewportFixedAxisLengthRef.current);
					const aspect = closest.width / closest.height;
					const data = { dims, aspect };
					planeDataCache.current.set(cacheKey, data);
					return data;
				} catch (error) {
					logger.error('Error detecting aspect ratio during init, defaulting to square:', { url: item.url, error });
					const defaultAspect = COMMON_ASPECT_RATIOS.SQUARE;
					const dims = calculateDimensions(defaultAspect, layoutMode, viewportFixedAxisLengthRef.current);
					const data = { dims, aspect: 1 };
					planeDataCache.current.set(cacheKey, data);
					return data;
				}
			});

			const planeDataResults = await Promise.all(dimensionPromises);

			// Calculate actual total length based on fetched dimensions
			calculatedTotalLength = planeDataResults.reduce((sum, data) => {
				const gap = layoutMode === 'vertical' ? SCENE.verticalGap - SCENE.planeHeight : SCENE.verticalGap - SCENE.planeHeight;
				const itemLength = layoutMode === 'vertical' ? data.dims[1] + gap : data.dims[0] + gap;
				return sum + Math.max(0, itemLength); // Ensure non-negative length
			}, 0);
			totalContentLengthRef.current = calculatedTotalLength;
			logger.info('Actual total content length calculated', { calculatedTotalLength });

			const startOffset = calculatedTotalLength / 2;
			let accumulatedOffset = 0;
			const fixedPos = fixedAxisPositionRef.current;
			const z = 0;

			for (let i = 0; i < galleryItems.length; i++) {
				const item = galleryItems[i]!;
				const data = planeDataResults[i]!;
				const dims = data.dims;
				const gap = layoutMode === 'vertical' ? SCENE.verticalGap - SCENE.planeHeight : SCENE.verticalGap - SCENE.planeHeight;
				const itemLengthWithGap = layoutMode === 'vertical' ? dims[1] + gap : dims[0] + gap;
				const itemCenterOffset = (layoutMode === 'vertical' ? dims[1] : dims[0]) / 2;

				// Position along the scroll axis: Start from center, subtract accumulated length, subtract half of *current* item's length
				const baseScrollAxisPos = startOffset - accumulatedOffset - itemCenterOffset;
				accumulatedOffset += Math.max(0, itemLengthWithGap);

				newPlaneStates.push({
					id: `plane-${item.id ?? i}-${layoutMode}`, // Unique key per item and mode
					itemIndex: i,
					initialScrollAxisPos: baseScrollAxisPos,
					fixedAxisPos: fixedPos,
					z: z,
					currentScrollAxisPos: baseScrollAxisPos,
					dimensions: dims,
					aspect: data.aspect,
				});
			}

			setPlaneStates(newPlaneStates);
			setIsInitialized(true);
			scrollSpring.set(0, false); // Reset scroll on initialization
			logger.info(`Initialization complete. ${newPlaneStates.length} planes created.`);
		};

		fetchAndInitialize();
	}, [galleryItems, layoutMode, isInitialized, disableMedia, scrollSpring]);

	// Expose scroll control method via ref
	useImperativeHandle(ref, () => ({
		addScroll: (delta: number) => {
			scrollSpring.set(scrollSpring.get() + delta);
		},
	}));

	// Setup wheel scroll listener - ALWAYS attach
	useEffect(() => {
		const handleWheel = (event: WheelEvent) => {
			scrollSpring.set(scrollSpring.get() - event.deltaY * SCENE.scrollMultiplier);
		};
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, [scrollSpring]); // Removed isTouchDevice dependency

	// Main R3F frame loop
	useFrame((_state) => {
		if (!isInitialized || planeStates.length === 0 || totalContentLengthRef.current <= 0) return;

		const currentScroll = scrollSpring.get();
		const halfViewportScroll = viewportScrollAxisLengthRef.current / 2;
		const actualTotalLength = totalContentLengthRef.current;
		const currentFixedPos = fixedAxisPositionRef.current; // Use the ref directly as it's updated by the other useEffect

		// Debug logging for horizontal layout
		if (layoutMode === 'horizontal' && planeStates.length > 0) {
			const firstItem = planeStates[0];
			if (firstItem) {
				logger.info('HORIZONTAL PLANE POSITION:', {
					currentScroll,
					itemFixedPos: firstItem.fixedAxisPos,
					itemScrollPos: firstItem.currentScrollAxisPos,
					halfViewportScroll,
					viewportFixedAxisLength: viewportFixedAxisLengthRef.current,
				});
			}
		}

		setPlaneStates((prevStates) =>
			prevStates.map((state) => {
				let newInitialScrollAxisPos = state.initialScrollAxisPos;
				const currentRelativeScrollPos = state.initialScrollAxisPos - currentScroll;
				let hasRecycled = false;

				// Use plane dimensions for more accurate recycling buffer
				const planeLengthOnScrollAxis = layoutMode === 'vertical' ? state.dimensions[1] : state.dimensions[0];
				const recycleBuffer = SCENE.recycleBuffer * planeLengthOnScrollAxis; // Buffer based on item size

				// --- Recycling Logic ---
				// Plane moving beyond positive edge (+halfViewport + buffer)? Move to negative side.
				if (currentRelativeScrollPos - planeLengthOnScrollAxis / 2 > halfViewportScroll + recycleBuffer) {
					newInitialScrollAxisPos = state.initialScrollAxisPos - actualTotalLength;
					hasRecycled = true;
				}
				// Plane moving beyond negative edge (-halfViewport - buffer)? Move to positive side.
				else if (currentRelativeScrollPos + planeLengthOnScrollAxis / 2 < -halfViewportScroll - recycleBuffer) {
					newInitialScrollAxisPos = state.initialScrollAxisPos + actualTotalLength;
					hasRecycled = true;
				}

				const finalCurrentScrollAxisPos = newInitialScrollAxisPos - currentScroll;

				// Update state only if position or fixed position changes
				if (hasRecycled || finalCurrentScrollAxisPos !== state.currentScrollAxisPos || currentFixedPos !== state.fixedAxisPos) {
					return {
						...state,
						initialScrollAxisPos: newInitialScrollAxisPos,
						currentScrollAxisPos: finalCurrentScrollAxisPos,
						fixedAxisPos: currentFixedPos, // Update fixed position due to potential resize
					};
				} else {
					return state;
				}
			}),
		);
	});

	// Render the PlaneWrappers
	return (
		<group>
			{planeStates.map((state) => {
				const item = galleryItems[state.itemIndex];
				if (!item) return null;

				const position =
					layoutMode === 'vertical' ? new THREE.Vector3(state.fixedAxisPos, state.currentScrollAxisPos, state.z) : new THREE.Vector3(state.currentScrollAxisPos, state.fixedAxisPos, state.z);

				return (
					<PlaneWrapper
						key={state.id}
						item={item}
						position={position}
						layoutMode={layoutMode}
						disableMedia={disableMedia}
						onHoverChange={onHoverChange}
						viewportScrollAxisLength={viewportScrollAxisLengthRef.current}
						viewportFixedAxisLength={viewportFixedAxisLengthRef.current}
						dimensions={state.dimensions}
						aspect={state.aspect}
					/>
				);
			})}
		</group>
	);
});

ScrollingPlanes.displayName = 'ScrollingPlanes';

// =============================================
// MAIN COMPONENT
// =============================================

const CreationContent: FC<CreationContentProps> = ({ galleryItems }) => {
	const [dprValue, setDprValue] = useState(1);
	const [isTouchDevice, setIsTouchDevice] = useState(false);
	const [hoveredName, setHoveredName] = useState<string | null>(null);
	const [layoutMode, setLayoutMode] = useState<LayoutMode>('vertical');
	const inputState = useInputState();
	const windowSize = useWindowSize();
	const disableMedia = useMemo(() => FEATURES.disableMedia, []);
	const scrollPlanesRef = useRef<ScrollingPlanesHandle>(null); // Ref for ScrollingPlanes handle

	// Refs for touch handling
	const touchStartRef = useRef<{ x: number; y: number } | null>(null);
	const lastTouchMoveRef = useRef<{ x: number; y: number } | null>(null);
	const touchScrollMultiplier = 0.7; // Adjust sensitivity for touch

	useEffect(() => {
		const touchDetected = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		setIsTouchDevice(touchDetected);
		setDprValue(Math.min(window.devicePixelRatio, 2));

		if (disableMedia) {
			logger.warn('Gallery media loading is DISABLED');
		}
	}, [disableMedia]);

	// Determine layout mode based on window width
	useEffect(() => {
		if (windowSize.width !== undefined) {
			const newMode = windowSize.width >= 1024 ? 'vertical' : 'horizontal';
			if (newMode !== layoutMode) {
				logger.info(`Layout mode changed to: ${newMode} (window width: ${windowSize.width}px)`);
				setLayoutMode(newMode);
			}
		}
	}, [windowSize.width, layoutMode]);

	const handleHoverChange = useCallback((name: string | null) => {
		setHoveredName(name);
	}, []);

	const items: GalleryItem[] = useMemo(() => {
		if (galleryItems.length > 0) {
			const processedItems = galleryItems.map((item: GalleryItem) => ({
				description: '',
				tags: [],
				...item,
				url: item.url || '',
				mediaType: item.mediaType || 'image',
			}));
			logger.info(`Using ${processedItems.length} real gallery items`);
			return processedItems as GalleryItem[];
		} else {
			logger.info('No gallery items provided.');
			return [];
		}
	}, [galleryItems]);

	// --- Touch Event Handlers ---
	const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
		if (event.touches.length > 0) {
			const touch = event.touches[0]!;
			touchStartRef.current = { x: touch.clientX, y: touch.clientY };
			lastTouchMoveRef.current = { x: touch.clientX, y: touch.clientY }; // Initialize last move
		}
	}, []);

	const handleTouchMove = useCallback(
		(event: React.TouchEvent<HTMLDivElement>) => {
			if (event.touches.length > 0 && lastTouchMoveRef.current && scrollPlanesRef.current) {
				const touch = event.touches[0]!;
				const currentX = touch.clientX;
				const currentY = touch.clientY;
				const lastX = lastTouchMoveRef.current.x;
				const lastY = lastTouchMoveRef.current.y;

				const deltaX = currentX - lastX;
				const deltaY = currentY - lastY;

				// Determine scroll delta based on layout mode
				const scrollDelta = layoutMode === 'vertical' ? -deltaY : -deltaX;

				// Apply scroll using the exposed ref method
				scrollPlanesRef.current.addScroll(scrollDelta * touchScrollMultiplier);

				// Update last touch position for the next move calculation
				lastTouchMoveRef.current = { x: currentX, y: currentY };
			}
		},
		[layoutMode, touchScrollMultiplier], // Dependency includes layoutMode
	);

	const handleTouchEnd = useCallback(() => {
		touchStartRef.current = null;
		lastTouchMoveRef.current = null;
	}, []);

	return (
		<div
			className="relative h-screen w-full touch-none overflow-hidden"
			// Attach touch handlers unconditionally
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			onTouchCancel={handleTouchEnd}
		>
			{windowSize.width !== undefined && windowSize.height !== undefined && (
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
						logger.info('Canvas created');
					}}
					style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
				>
					<Suspense fallback={null}>
						<ambientLight intensity={0.8} />
						<directionalLight position={[5, 15, 10]} intensity={1.2} />
						<ScrollingPlanes
							ref={scrollPlanesRef} // Assign ref
							galleryItems={items}
							layoutMode={layoutMode}
							disableMedia={disableMedia}
							isTouchDevice={isTouchDevice}
							onHoverChange={handleHoverChange}
						/>
					</Suspense>
				</Canvas>
			)}

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
