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

    const float FADE_DISTANCE_FACTOR = 0.1; // Portion of viewport height used for fade edge

    void main() {
      vUv = uv;
      v_initialAnimProgress = u_initialAnimProgress;

      // Calculate visibility based on plane's Y position relative to viewport edges
      float halfViewport = u_viewportHeight / 2.0;
      float topEdge = halfViewport;
      float bottomEdge = -halfViewport;
      // Distance from edge where fade starts/ends (can be adjusted)
      float fadeDistance = u_viewportHeight * FADE_DISTANCE_FACTOR * u_visibilityFade;

      // Smooth fade-in from bottom and fade-out to top
      float visibilityBottom = smoothstep(bottomEdge - fadeDistance, bottomEdge + fadeDistance, u_planeY);
      float visibilityTop = smoothstep(topEdge + fadeDistance, topEdge - fadeDistance, u_planeY);
      v_visibility = visibilityBottom * visibilityTop;

      // Initial animation: scale and slight vertical offset
      // Scale from 0.95 to 1.0
      float initialScale = mix(0.95, 1.0, smoothstep(0.0, 1.0, u_initialAnimProgress));
      // Move slightly up from below
      float initialOffsetY = mix(-0.1, 0.0, smoothstep(0.0, 1.0, u_initialAnimProgress));

      // Subtle ongoing visibility scale effect (smaller when near edges)
      float visibilityScale = mix(0.98, 1.0, v_visibility);

      vec3 scaledPosition = position * initialScale * visibilityScale;
      scaledPosition.y += initialOffsetY;

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

    void main() {
        vec2 correctedUv = vUv;
        // Simple aspect correction example if texture doesn't fit plane perfectly
        // float textureAspect = textureSize(map, 0).x / textureSize(map, 0).y;
        // if (u_aspect > textureAspect) {
        //     correctedUv.x = correctedUv.x * textureAspect / u_aspect + 0.5 - textureAspect / u_aspect / 2.0;
        // } else {
        //     correctedUv.y = correctedUv.y * u_aspect / textureAspect + 0.5 - u_aspect / textureAspect / 2.0;
        // }

        vec4 textureColor = texture2D(map, correctedUv);

      // Combine initial animation alpha and continuous visibility alpha
      float initialAlpha = smoothstep(0.0, 0.5, v_initialAnimProgress); // Fade in faster initially
      float visibilityAlpha = smoothstep(0.0, 1.0, v_visibility); // Use full visibility range for continuous fade

      float finalAlpha = textureColor.a * initialAlpha * visibilityAlpha;

      // Discard transparent pixels if texture has alpha
      if (finalAlpha < 0.01) discard;

      gl_FragColor = vec4(textureColor.rgb, finalAlpha);
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
}

export const AnimatedMaterial: React.FC<AnimatedMaterialProps> = ({
	texture,
	planeY,
	viewportHeight,
	initialAnimProgress,
	aspect,
	u_visibilityFade = 0.5, // Provide default
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
			transparent // MUST be true for alpha blending
			side={THREE.DoubleSide} // Assuming double sided planes
			toneMapped={false} // Match original Video/Image materials
			{...props}
		/>
	);
};

export default AnimatedMaterial;
