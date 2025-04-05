import React, { useEffect, useRef } from 'react';

import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';

// Define uniforms for the shader
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
	u_grainSpeed: number; // Controls the animation speed of the grain
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
    // Returns a value in the 0.0-1.0 range
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    // Improved film grain using multiple noise layers with distribution control
    float filmGrain(vec2 uv, float time) {
      // Complex pattern with multiple layers of noise
      vec2 uvScaled = uv * u_grainScale;
      float t = time * u_grainSpeed;

      // Multiple layers of varying frequency and orientation
      float noise1 = hash(uvScaled + t);
      float noise2 = hash(uvScaled * 1.4 + t * 1.2);
      float noise3 = hash(uvScaled * 0.8 - t * 0.7);

      // Blend layers with different weights for more natural distribution
      float grainLayer = mix(noise1, noise2, 0.4);
      grainLayer = mix(grainLayer, noise3, 0.3);

      // Apply power curve for more film-like distribution
      grainLayer = pow(grainLayer, 1.5);

      return grainLayer;
    }

    void main() {
        vec2 correctedUv = vUv;
        vec4 textureColor = texture2D(map, correctedUv);

        // Combine initial animation and edge visibility
        // Simple multiplication ensures both factors are considered
        // Using v_initialAnimProgress (varying) instead of u_initialAnimProgress (uniform)
        float alpha = textureColor.a * v_initialAnimProgress * v_visibility;

        // Discard transparent pixels
        if (alpha < 0.01) discard;

        // Generate film grain
        float grain = filmGrain(correctedUv, u_time);

        // Apply grain based on luminance
        float luminance = dot(textureColor.rgb, vec3(0.299, 0.587, 0.114));
        float grainMask = 4.0 * luminance * (1.0 - luminance);
        float scaledGrain = (grain * 2.0 - 1.0) * u_grainIntensity * grainMask;

        // Apply grain to color
        vec3 grainedColor = textureColor.rgb + scaledGrain;

        gl_FragColor = vec4(grainedColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
  `,
);

extend({ AnimatedShaderMaterial });

interface AnimatedMaterialProps extends Partial<AnimatedMaterialUniforms> {
	texture: THREE.Texture;
	planeY: number;
	viewportHeight: number;
	initialAnimProgress: number; // Ensure this is passed
	aspect: number;
	grainIntensity?: number; // Optional grain intensity
	grainScale?: number; // Optional grain scale
	grainSpeed?: number; // Optional grain speed
}

export const AnimatedMaterial: React.FC<AnimatedMaterialProps> = ({
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
	const materialRef = useRef<typeof AnimatedShaderMaterial>(null!);

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
		// @ts-expect-error - Custom extended shader material not correctly typed
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

export default AnimatedMaterial;
