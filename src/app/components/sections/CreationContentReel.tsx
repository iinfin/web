'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { shaderMaterial, useVideoTexture } from '@react-three/drei';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';

import { Effects } from '@/lib/r3f/effects/Effects';
import { logger } from '@/lib/utils/logger';

import { useWindowSize } from '@/hooks/useWindowSize';

// =============================================
// CONFIGURATION AND CONSTANTS
// =============================================

const REEL_URL = 'https://storage.u29dc.com/reel.webm';

const MATERIAL_DEFAULTS = {
	grain: {
		intensity: 0.05,
		scale: 500.0,
		speed: 0.5,
	},
	visibility: {
		fade: 0.0, // No fade for fullscreen
	},
	initialAnimDuration: 1.8,
};

// =============================================
// SHADER DEFINITIONS
// =============================================

interface ReelMaterialUniforms {
	map: THREE.Texture | null;
	u_time: number;
	u_aspect: number; // Aspect ratio of the video texture
	u_viewportAspect: number; // Aspect ratio of the viewport/plane
	u_initialAnimProgress: number;
	u_assetLoaded: number;
	u_grainIntensity: number;
	u_grainScale: number;
	u_grainSpeed: number;
	// Uniforms no longer needed for single fullscreen plane:
	// u_planeScrollAxisPos, u_viewportScrollAxisLength, u_planeFixedAxisPos, u_viewportFixedAxisLength
	// u_layoutMode, u_visibilityFade, u_scrollVelocity
}

// Helper type for uniforms record
type ReelMaterialUniformsRecord = Record<keyof ReelMaterialUniforms, THREE.IUniform<ReelMaterialUniforms[keyof ReelMaterialUniforms]>>;

const ReelShaderMaterial = shaderMaterial(
	// Uniforms
	{
		map: null,
		u_time: 0,
		u_aspect: 1.0, // video aspect
		u_viewportAspect: 1.0, // viewport aspect
		u_initialAnimProgress: 0,
		u_assetLoaded: 0,
		u_grainIntensity: MATERIAL_DEFAULTS.grain.intensity,
		u_grainScale: MATERIAL_DEFAULTS.grain.scale,
		u_grainSpeed: MATERIAL_DEFAULTS.grain.speed,
	},
	// Vertex Shader (simplified for fullscreen)
	/*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
	// Fragment Shader (adapted for cover effect and simplified visibility)
	/*glsl*/ `
    varying vec2 vUv;
    uniform sampler2D map; // Uncommented
    uniform float u_time; // Uncommented
    uniform float u_aspect; // Video aspect // Uncommented
    uniform float u_viewportAspect; // Viewport aspect // Uncommented
    uniform float u_initialAnimProgress; // Uncommented
    uniform float u_assetLoaded; // Uncommented
    uniform float u_grainIntensity; // Uncommented
    uniform float u_grainScale; // Uncommented
    uniform float u_grainSpeed; // Uncommented

		// High-quality noise function (copied from CreationContentFull)
		float hash(vec2 p) {
		  p = fract(p * vec2(123.34, 456.21));
		  p += dot(p, p + 45.32);
		  return fract(p.x * p.y);
		}

		// Film grain function (copied from CreationContentFull)
		float filmGrain(vec2 uv, float time) {
		  vec2 uvScaled = uv * u_grainScale;
		  float t = time * u_grainSpeed;
		  float noise1 = hash(uvScaled + t);
		  float noise2 = hash(uvScaled * 1.4 + t * 1.2);
		  float noise3 = hash(uvScaled * 0.8 - t * 0.7);
		  float grainLayer = mix(noise1, noise2, 0.4);
		  grainLayer = mix(grainLayer, noise3, 0.3);
		  grainLayer = pow(grainLayer, 1.5);
		  return grainLayer;
		}

    void main() {
			// Constants for cinecrop adjustment
			const float CINECROP_ZOOM_Y = 1.3333; // Zoom needed to hide bars (1080 / (1080 - 2*135))
			const float INV_CINECROP_ZOOM_Y = 1.0 / CINECROP_ZOOM_Y; // Inverse zoom (portion of height visible)
			const float CINECROP_OFFSET_Y = (1.0 - INV_CINECROP_ZOOM_Y) / 2.0; // Offset from top/bottom edge

			// 1. Calculate the effective aspect ratio of the *visible* content
			float effectiveAspect = u_aspect * CINECROP_ZOOM_Y;

			// 2. Perform cover calculation using the *effective* aspect ratio
			vec2 coverUv; // These UVs map to the *effective* content area (0-1 range)
			float effectiveRatio = effectiveAspect / u_viewportAspect;

			if (effectiveRatio > 1.0) { // Effective content wider than viewport
				// Fit height, scale/center X based on effective aspect
				coverUv.y = vUv.y;
				coverUv.x = vUv.x * (u_viewportAspect / effectiveAspect) + (1.0 - u_viewportAspect / effectiveAspect) / 2.0;
			} else { // Effective content taller/same aspect as viewport
				// Fit width, scale/center Y based on effective aspect
				coverUv.x = vUv.x;
				coverUv.y = vUv.y * (effectiveAspect / u_viewportAspect) + (1.0 - effectiveAspect / u_viewportAspect) / 2.0;
			}

			// 3. Map the cover UVs back to the original texture coordinates,
			//    sampling the vertically centered, non-cinecrop region.
			vec2 finalUv;
			finalUv.x = coverUv.x; // X is already correct from cover calculation
			finalUv.y = coverUv.y * INV_CINECROP_ZOOM_Y + CINECROP_OFFSET_Y;

			// 4. Clamp final UVs (Safety check)
			finalUv = clamp(finalUv, 0.0, 1.0);

			// 5. Sample the texture
			vec4 texColor = texture2D(map, finalUv);

			// --- Apply Initial Animation & Asset Loaded Alpha ---
			float alpha = texColor.a * u_initialAnimProgress * u_assetLoaded;

			// Discard transparent pixels early
			if (alpha < 0.01) discard;

			// --- Film Grain ---
			vec3 finalColor = texColor.rgb;
			float grain = filmGrain(vUv, u_time); // Use original vUv for consistent grain pattern
			float luminance = dot(finalColor, vec3(0.299, 0.587, 0.114));
			float grainMask = 4.0 * luminance * (1.0 - luminance);
			float scaledGrain = (grain * 2.0 - 1.0) * u_grainIntensity * grainMask;
			vec3 grainedColor = finalColor + scaledGrain;

			gl_FragColor = vec4(grainedColor, alpha);
			#include <tonemapping_fragment>
			#include <colorspace_fragment>
		}
  `,
);

extend({ ReelShaderMaterial });

// =============================================
// REEL PLAYER COMPONENT
// =============================================

const ReelPlane: FC = () => {
	const { size, viewport } = useThree();
	const materialRef = useRef<THREE.ShaderMaterial>(null!);
	const [assetLoaded, setAssetLoaded] = useState(0);
	const [initialAnimProgress, setInitialAnimProgress] = useState(0);
	const startTimeRef = useRef<number | null>(null);

	const videoTextureOptions = useMemo(
		() => ({
			muted: true,
			loop: true,
			playsInline: true,
			crossOrigin: 'anonymous' as const,
			start: true,
			autoplay: true,
			unsuspend: 'canplay' as const,
		}),
		[],
	);

	const videoTexture = useVideoTexture(REEL_URL, videoTextureOptions);

	const videoAspect = useMemo(() => {
		if (videoTexture.source.data instanceof HTMLVideoElement) {
			const video = videoTexture.source.data as HTMLVideoElement;
			return video.videoWidth / video.videoHeight;
		}
		return 16 / 9; // Default aspect ratio if video data not available yet
	}, [videoTexture]);

	// Asset loaded animation
	useEffect(() => {
		if (videoTexture.source.data instanceof HTMLVideoElement) {
			const video = videoTexture.source.data as HTMLVideoElement;
			const onCanPlay = () => {
				logger.info('[ReelPlane] Video can play through. Setting assetLoaded = 1.');
				setAssetLoaded(1); // Trigger loaded animation
			};
			logger.info(`[ReelPlane] Video element found. readyState: ${video.readyState}, muted: ${video.muted}, autoplay: ${video.autoplay}, paused: ${video.paused}`);
			if (video.readyState >= 4) {
				// HAVE_ENOUGH_DATA
				logger.info('[ReelPlane] Video already has enough data. Calling onCanPlay.');
				onCanPlay();
			} else {
				logger.info('[ReelPlane] Adding canplaythrough event listener.');
				video.addEventListener('canplaythrough', onCanPlay);
				return () => {
					logger.info('[ReelPlane] Cleaning up: removing canplaythrough listener.');
					video.removeEventListener('canplaythrough', onCanPlay);
				};
			}
		} else {
			logger.warn('[ReelPlane] videoTexture.source.data is not an HTMLVideoElement yet or videoTexture is not fully initialized.', videoTexture);
		}
		// Ensure a cleanup function is always returned from useEffect if event listeners might be added
		return () => {};
	}, [videoTexture]);

	// Initial entrance animation
	useEffect(() => {
		logger.info('[ReelPlane] Initial entrance animation useEffect triggered.');
		startTimeRef.current = null; // Reset for animation
		setInitialAnimProgress(0); // Initialize to 0
		// Ensure startTimeRef is set *after* current frame, so elapsedTime calculation in useFrame is not negative or zero immediately.
		const animationFrameId = requestAnimationFrame(() => {
			startTimeRef.current = Date.now() / 1000; // Seconds
			logger.info(`[ReelPlane] startTimeRef.current set to: ${startTimeRef.current?.toFixed(3)}`);
		});
		return () => {
			logger.info('[ReelPlane] Initial entrance animation useEffect cleanup.');
			cancelAnimationFrame(animationFrameId); // Clean up the requestAnimationFrame
		};
	}, []); // Empty dependency array, runs once on mount

	useFrame((_state, delta) => {
		if (materialRef.current) {
			const uniforms = materialRef.current.uniforms as ReelMaterialUniformsRecord; // Use helper type
			if (uniforms.u_time.value !== null && typeof uniforms.u_time.value === 'number') {
				uniforms.u_time.value += delta;
			}
			uniforms.u_aspect.value = videoAspect;
			uniforms.u_viewportAspect.value = size.width / size.height;
			uniforms.u_assetLoaded.value = assetLoaded;

			if (startTimeRef.current !== null && initialAnimProgress < 1) {
				const elapsed = Date.now() / 1000 - startTimeRef.current;
				let progress = Math.min(elapsed / MATERIAL_DEFAULTS.initialAnimDuration, 1);
				progress = 1 - (1 - progress) ** 3; // Cubic ease out
				setInitialAnimProgress(progress);
				uniforms.u_initialAnimProgress.value = progress;
				if (progress > 0.01 && progress < 0.99 && Math.random() < 0.1) {
					// Log sparsely
					logger.info(`[ReelPlane] initialAnimProgress: ${progress.toFixed(3)}, elapsed: ${elapsed.toFixed(3)}s`);
				}
			} else if (initialAnimProgress >= 1) {
				uniforms.u_initialAnimProgress.value = 1;
			}
		}
	});

	return (
		<mesh scale={[viewport.width, viewport.height, 1]}>
			<planeGeometry args={[1, 1]} />
			{/* @ts-expect-error ReelShaderMaterial is extended */}
			<reelShaderMaterial ref={materialRef} map={videoTexture} transparent side={THREE.DoubleSide} toneMapped={false} />
		</mesh>
	);
};

// =============================================
// MAIN COMPONENT
// =============================================

const CreationContentReel: FC = () => {
	const [dprValue, setDprValue] = useState(1);
	const windowSize = useWindowSize();

	useEffect(() => {
		setDprValue(Math.min(window.devicePixelRatio, 2));
	}, []);

	// No gallery items or complex layout modes needed anymore

	return (
		<div className="relative h-screen w-full touch-none overflow-hidden">
			{windowSize.width !== undefined && windowSize.height !== undefined && (
				<Canvas
					camera={{
						position: [0, 0, 8], // Moved camera back
						fov: 50, // Adjust fov if needed
						near: 0.1,
						far: 100,
					}}
					dpr={dprValue}
					frameloop="always"
					onCreated={({ gl }) => {
						gl.setClearColor('#222222'); // Dark gray background for testing
						logger.info('Reel Canvas created');
					}}
					style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
				>
					<Suspense fallback={null}>
						<ReelPlane />
						<Effects />
					</Suspense>
				</Canvas>
			)}
			{/* Removed hoveredName display as there are no multiple items to hover */}
		</div>
	);
};

export default CreationContentReel;
