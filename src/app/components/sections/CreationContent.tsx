'use client';

import React, { forwardRef, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { shaderMaterial, useTexture, useVideoTexture } from '@react-three/drei';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { type ThreeEvent } from '@react-three/fiber';
import { useSpring } from 'framer-motion';

import type { GalleryItem } from '@/lib/db/types';
import { Effects } from '@/lib/r3f/effects/Effects';
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
	u_scrollVelocity: number; // <-- New uniform for motion blur
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
		u_scrollVelocity: 0.0, // <-- Initialize new uniform
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
		uniform float u_scrollVelocity; // <-- Get velocity uniform

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
		uniform float u_scrollVelocity; // <-- Get velocity uniform
		uniform int u_layoutMode;       // <-- Get layout mode uniform

		// Constants for Motion Blur
		const int NUM_SAMPLES = 5; // Number of samples for blur (adjust for quality/performance)
		const float MAX_BLUR_DISTANCE = 0.2; // Max UV offset for blur (adjust intensity)
		const float VELOCITY_SCALE = 0.01; // Scale raw velocity to UV offset (adjust sensitivity)

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
			vec3 finalColor = vec3(0.0);
			float totalWeight = 0.0;

			// Determine blur direction based on layout mode
			vec2 blurDirection = (u_layoutMode == 0) ? vec2(0.0, 1.0) : vec2(1.0, 0.0); // Vertical or Horizontal

			// Calculate blur amount based on velocity, scale, and clamp
			float blurAmount = clamp(abs(u_scrollVelocity) * VELOCITY_SCALE, 0.0, MAX_BLUR_DISTANCE);

			// --- Motion Blur Sampling ---
			// Only apply blur if velocity is significant
			if (blurAmount > 0.0001) {
				for (int i = 0; i < NUM_SAMPLES; ++i) {
					// Distribute samples linearly along the blur direction
					float offset = (float(i) / float(NUM_SAMPLES - 1) - 0.5) * blurAmount;
					vec2 sampleUv = correctedUv + blurDirection * offset;

					// Basic weight (can be adjusted, e.g., Gaussian)
					float weight = 1.0; // Linear box blur

					// Sample texture and accumulate weighted color
					vec4 sampleColor = texture2D(map, sampleUv);
					finalColor += sampleColor.rgb * weight;
					totalWeight += weight;
				}
				// Normalize the final color
				if (totalWeight > 0.0) {
					finalColor /= totalWeight;
				} else {
					// Fallback if totalWeight is zero (shouldn't happen with weight=1.0)
					finalColor = texture2D(map, correctedUv).rgb;
				}
			} else {
				// No blur, just sample the center
				finalColor = texture2D(map, correctedUv).rgb;
			}
			// --- End Motion Blur ---

			// Calculate base alpha using original texture alpha (before blurring)
			float baseAlpha = texture2D(map, correctedUv).a;
			float alpha = baseAlpha * v_initialAnimProgress * v_visibility * v_assetLoaded;

			// Discard transparent pixels early to save computation
			if (alpha < 0.01) discard;

			// --- Film Grain ---
			float grain = filmGrain(correctedUv, u_time);
			// Apply grain primarily to mid-tones using a luminance mask
			// This prevents grain from being too strong in pure blacks or whites.
			float luminance = dot(finalColor.rgb, vec3(0.299, 0.587, 0.114)); // Use blurred color for luminance
			float grainMask = 4.0 * luminance * (1.0 - luminance); // Parabolic mask peaking at luminance 0.5
			float scaledGrain = (grain * 2.0 - 1.0) * u_grainIntensity * grainMask; // Scale grain to -intensity..+intensity

			// Apply grain to color
			vec3 grainedColor = finalColor.rgb + scaledGrain;
			// --- End Film Grain ---

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
	scrollVelocity: number; // <-- Add prop
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
	scrollVelocity: number; // <-- Add prop
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
	scrollVelocity: number; // <-- Add prop
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
	scrollVelocity: number; // <-- Add prop
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
	scrollVelocity: number; // <-- Add prop
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
	scrollVelocity, // <-- Pass initial value
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
			// @ts-expect-error - ShaderMaterial uniforms not properly typed
			materialRef.current.uniforms.u_scrollVelocity.value = scrollVelocity; // <-- Update uniform
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
			u_scrollVelocity={scrollVelocity} // <-- Pass initial value
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
		scrollVelocity, // <-- Get prop
	}) => {
		const [assetLoaded, setAssetLoaded] = useState(0);
		const startTimeRef = useRef<number | null>(null);
		const loadSuccessRef = useRef<boolean>(false);

		// Load the texture and set up success and error handling
		const texture = useTexture(url);

		// Set up texture loading success handling
		useEffect(() => {
			if (texture) {
				// logger.info(`Image loaded successfully: ${url}`);
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
				scrollVelocity={scrollVelocity} // <-- Pass prop
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
		scrollVelocity, // <-- Get prop
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
				// logger.info(`Video element state for ${url}:`, {
				// 	readyState: videoElement.readyState,
				// 	paused: videoElement.paused,
				// 	error: videoElement.error,
				// 	networkState: videoElement.networkState,
				// });

				const handleCanPlay = () => {
					// logger.info(`Video can play: ${url}`);
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
						// logger.info(`Attempting to play video: ${url}`);
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
				scrollVelocity={scrollVelocity} // <-- Pass prop
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
 * Handles hover events and media rendering using pre-calculated dimensions/aspect ratio.
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
		dimensions, // Use pre-calculated dimensions
		aspect, // Use pre-calculated aspect ratio
		grainIntensity = MATERIAL.grain.intensity,
		grainScale = MATERIAL.grain.scale,
		grainSpeed = MATERIAL.grain.speed,
		scrollVelocity, // <-- Get prop
	}) => {
		const groupRef = useRef<THREE.Group>(null!); // Use THREE.Group type
		const [initialAnimProgress, setInitialAnimProgress] = useState(0); // 0 to 1
		const [isMounted, setIsMounted] = useState(false);
		const startTimeRef = useRef<number | null>(null);

		// Add a handler for asset loading events
		const handleAssetLoaded = useCallback(() => {
			// logger.info(`Asset loaded: ${item.title ?? 'unnamed'} (${item.mediaType})`);
		}, []);

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
				aspect: aspect, // Pass pre-calculated aspect
				fallbackMaterial: fallbackMaterial,
				grainIntensity: grainIntensity,
				grainScale: grainScale,
				grainSpeed: grainSpeed,
				onAssetLoaded: handleAssetLoaded,
				scrollVelocity: scrollVelocity, // <-- Pass prop
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
					// Scale uses pre-calculated dimensions
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
	// Custom comparison function - remains mostly the same
	(prevProps, nextProps) => {
		return (
			prevProps.item.id === nextProps.item.id &&
			prevProps.position.equals(nextProps.position) &&
			prevProps.layoutMode === nextProps.layoutMode &&
			prevProps.disableMedia === nextProps.disableMedia &&
			prevProps.viewportScrollAxisLength === nextProps.viewportScrollAxisLength &&
			prevProps.viewportFixedAxisLength === nextProps.viewportFixedAxisLength &&
			prevProps.dimensions[0] === nextProps.dimensions[0] &&
			prevProps.dimensions[1] === nextProps.dimensions[1] &&
			prevProps.aspect === nextProps.aspect &&
			prevProps.scrollVelocity === nextProps.scrollVelocity // <-- Compare velocity
		);
	},
);
PlaneWrapper.displayName = 'PlaneWrapper';

// =============================================
// SCROLLING SYSTEM
// =============================================

const ScrollingPlanes = forwardRef<ScrollingPlanesHandle, ScrollingPlanesProps>(({ galleryItems, layoutMode, disableMedia, isTouchDevice: _isTouchDevice, onHoverChange }, ref) => {
	const { camera, size, raycaster, mouse, scene } = useThree();

	const scrollSpring = useSpring(0, {
		stiffness: 100,
		damping: 50,
		mass: 1,
	});

	const [planeStates, setPlaneStates] = useState<PlaneState[]>([]);
	const [isInitialized, setIsInitialized] = useState(false); // Keep this flag
	const viewportScrollAxisLengthRef = useRef<number>(0);
	const viewportFixedAxisLengthRef = useRef<number>(0);
	const fixedAxisPositionRef = useRef<number>(0);
	const totalContentLengthRef = useRef<number>(0);
	const currentScrollVelocityRef = useRef(0); // Ref to store latest velocity
	const previousScrollRef = useRef<number>(0); // Track scroll position for detecting changes

	// Calculate viewport dimensions AND initialize plane states whenever items, size, or layoutMode changes
	useEffect(() => {
		logger.info('Recalculating viewport and initializing/updating plane states...');
		// Calculate viewport dimensions (same as before)
		const cameraZ = camera.position.z;
		const vFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
		const visibleHeight = 2 * Math.tan(vFov / 2) * cameraZ;
		const aspectRatio = size.width / size.height;
		const visibleWidth = visibleHeight * aspectRatio;

		// --- START NEW INITIALIZATION LOGIC ---
		if (galleryItems.length === 0 || size.width === 0 || size.height === 0) {
			setPlaneStates([]); // Clear states if no items or size
			setIsInitialized(false);
			return;
		}

		// Update viewport refs based on layout mode
		if (layoutMode === 'vertical') {
			viewportScrollAxisLengthRef.current = visibleHeight;
			viewportFixedAxisLengthRef.current = visibleWidth;
			fixedAxisPositionRef.current = -visibleWidth / 2 + SCENE.leftPadding;
		} else {
			viewportScrollAxisLengthRef.current = visibleWidth;
			viewportFixedAxisLengthRef.current = visibleHeight;
			fixedAxisPositionRef.current = -visibleHeight / 2 + SCENE.horizontalOffset;
		}

		logger.info('Viewport/edge positions updated', {
			fixedAxisPosition: fixedAxisPositionRef.current,
			viewportScrollAxisLength: viewportScrollAxisLengthRef.current,
			viewportFixedAxisLength: viewportFixedAxisLengthRef.current,
			layoutMode,
		});

		// Calculate scaled dimensions and initial positions directly from galleryItems
		let calculatedTotalLength = 0;
		const newPlaneStates: PlaneState[] = [];
		const fixedPos = fixedAxisPositionRef.current;
		const z = 0;

		// Helper to calculate scaled dimensions based on mode and item aspect ratio
		const calculateScaledDimensions = (itemAspectRatio: number): [number, number] => {
			const ratio = itemAspectRatio;
			if (layoutMode === 'vertical') {
				const height = SCENE.planeHeight;
				const width = height * ratio;
				return [width, height];
			} else {
				// Horizontal
				// NOTE: Using the same fixed height logic as before for horizontal
				const height = viewportFixedAxisLengthRef.current * 0.2; // 20% of viewport height
				const width = height * ratio;
				return [width, height];
			}
		};

		// Iterate through galleryItems to calculate dimensions and total length
		const itemsWithDimensions = galleryItems.map((item) => {
			const itemAspect = item.aspectRatio ?? (item.width && item.height ? item.width / item.height : 1); // Fallback aspect ratio
			if (!item.aspectRatio && !(item.width && item.height)) {
				logger.warn(`Missing dimensions/aspectRatio for item ${item.id ?? item.title}, defaulting to square.`);
			}
			const dims = calculateScaledDimensions(itemAspect);
			const gap = SCENE.verticalGap - SCENE.planeHeight; // Gap is defined relative to plane height
			const itemLength = layoutMode === 'vertical' ? dims[1] : dims[0]; // Define itemLength based on layout mode
			const itemLengthWithGap = itemLength + gap;
			return { item, dims, aspect: itemAspect, itemLengthWithGap };
		});

		calculatedTotalLength = itemsWithDimensions.reduce((sum, data) => sum + Math.max(0, data.itemLengthWithGap), 0);
		totalContentLengthRef.current = calculatedTotalLength;
		logger.info('Total content length calculated from item data', { calculatedTotalLength });

		const startOffset = calculatedTotalLength / 2;
		let accumulatedOffset = 0;

		// Create the plane states
		for (let i = 0; i < itemsWithDimensions.length; i++) {
			const { item, dims, aspect, itemLengthWithGap } = itemsWithDimensions[i]!;
			const itemCenterOffset = (layoutMode === 'vertical' ? dims[1] : dims[0]) / 2;
			const baseScrollAxisPos = startOffset - accumulatedOffset - itemCenterOffset;
			accumulatedOffset += Math.max(0, itemLengthWithGap);

			newPlaneStates.push({
				id: `plane-${item.id ?? i}-${layoutMode}`,
				itemIndex: i,
				initialScrollAxisPos: baseScrollAxisPos,
				fixedAxisPos: fixedPos,
				z: z,
				currentScrollAxisPos: baseScrollAxisPos, // Initial position before scroll
				dimensions: dims,
				aspect: aspect,
				scrollVelocity: 0.0, // <-- Initialize new uniform
			});
		}

		setPlaneStates(newPlaneStates);
		setIsInitialized(true);
		scrollSpring.set(0, false); // Reset scroll on re-initialization
		logger.info(`Initialization/update complete. ${newPlaneStates.length} planes configured.`);
		// --- END NEW INITIALIZATION LOGIC ---
	}, [galleryItems, layoutMode, size.width, size.height, camera, scrollSpring]); // Dependencies updated

	// Expose scroll control method via ref (same as before)
	useImperativeHandle(ref, () => ({
		addScroll: (delta: number) => {
			scrollSpring.set(scrollSpring.get() + delta);
		},
	}));

	// Setup wheel scroll listener (same as before)
	useEffect(() => {
		const handleWheel = (event: WheelEvent) => {
			scrollSpring.set(scrollSpring.get() - event.deltaY * SCENE.scrollMultiplier);
		};
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, [scrollSpring]);

	// Main R3F frame loop - update to include raycasting
	useFrame((_state) => {
		if (!isInitialized || planeStates.length === 0 || totalContentLengthRef.current <= 0) return;

		const currentScroll = scrollSpring.get();
		currentScrollVelocityRef.current = scrollSpring.getVelocity();
		const halfViewportScroll = viewportScrollAxisLengthRef.current / 2;
		const actualTotalLength = totalContentLengthRef.current;
		const currentFixedPos = fixedAxisPositionRef.current;

		// Check if scroll position has changed significantly enough to warrant a raycasting check
		const SCROLL_THRESHOLD = 0.01; // Adjust as needed
		const hasScrolled = Math.abs(currentScroll - previousScrollRef.current) > SCROLL_THRESHOLD;
		previousScrollRef.current = currentScroll;

		// If scrolled, perform raycasting to detect what's under the cursor
		if (hasScrolled) {
			// Cast ray from current mouse position
			raycaster.setFromCamera(mouse, camera);
			const intersects = raycaster.intersectObjects(scene.children, true);

			// Find the first intersection with an object that has userData.itemId
			for (let i = 0; i < intersects.length; i++) {
				// Traverse up the object hierarchy to find a parent with itemId
				let obj: THREE.Object3D | null = intersects[i]?.object || null;
				while (obj && !obj.userData['itemId']) {
					obj = obj.parent;
				}

				if (obj && obj.userData['itemId']) {
					// Find the corresponding gallery item
					const item = galleryItems.find((item) => item.id === obj?.userData['itemId']);
					if (item && item.title) {
						onHoverChange(item.title);
						break;
					}
				} else if (i === intersects.length - 1) {
					// If we reached the end without finding an item, clear hover state
					onHoverChange(null);
				}
			}

			// If no intersections at all, clear hover state
			if (intersects.length === 0) {
				onHoverChange(null);
			}
		}

		// Update loop (same recycling logic as before)
		setPlaneStates((prevStates) =>
			prevStates.map((state) => {
				let newInitialScrollAxisPos = state.initialScrollAxisPos;
				const currentRelativeScrollPos = state.initialScrollAxisPos - currentScroll;

				const planeLengthOnScrollAxis = layoutMode === 'vertical' ? state.dimensions[1] : state.dimensions[0];
				// Using fixed buffer value now, adjust if needed
				const recycleBuffer = SCENE.recycleBuffer * SCENE.planeHeight; // Use base planeHeight for buffer

				// --- Recycling Logic --- (same as before)
				if (currentRelativeScrollPos - planeLengthOnScrollAxis / 2 > halfViewportScroll + recycleBuffer) {
					newInitialScrollAxisPos = state.initialScrollAxisPos - actualTotalLength;
				} else if (currentRelativeScrollPos + planeLengthOnScrollAxis / 2 < -halfViewportScroll - recycleBuffer) {
					newInitialScrollAxisPos = state.initialScrollAxisPos + actualTotalLength;
				}

				const finalCurrentScrollAxisPos = newInitialScrollAxisPos - currentScroll;

				// Update state only if position or fixed position changes (same as before)
				return {
					...state,
					initialScrollAxisPos: newInitialScrollAxisPos, // Update even if same, recycling logic depends on it
					currentScrollAxisPos: finalCurrentScrollAxisPos,
					fixedAxisPos: currentFixedPos,
					scrollVelocity: currentScrollVelocityRef.current, // <-- Always pass current velocity
				};
			}),
		);
	});

	// Render the PlaneWrappers (same as before)
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
						scrollVelocity={state.scrollVelocity} // <-- Pass prop
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
	const scrollPlanesRef = useRef<ScrollingPlanesHandle>(null);

	// Refs for touch handling
	const touchStartRef = useRef<{ x: number; y: number } | null>(null);
	const lastTouchMoveRef = useRef<{ x: number; y: number } | null>(null);
	const touchScrollMultiplier = 0.7;

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
				...item, // Assume width/height/aspectRatio are present
				url: item.url || '',
				mediaType: item.mediaType || 'image',
			}));
			logger.info(`Using ${processedItems.length} gallery items with pre-fetched dimensions`);
			return processedItems as GalleryItem[];
		} else {
			logger.info('No gallery items provided.');
			return [];
		}
	}, [galleryItems]);

	// Touch Handlers
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
							scrollVelocity={0.0} // <-- Pass initial value
						/>
						<Effects />
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
