'use client';

import React, { useEffect, useRef } from 'react';

import { useFilmGrain } from '@/app/context/FilmGrainContext';
import { logger } from '@/app/utils/logger';

interface FilmGrainProps {
	intensity?: number; // Override context intensity
	scale?: number; // Override context scale
	speed?: number; // Override context speed
	className?: string; // For additional styling/positioning
}

/**
 * A high-performance film grain overlay component that covers the entire viewport.
 * Uses WebGL for efficient rendering with minimal impact on performance.
 * Reads from FilmGrainContext but can be overridden with props.
 */
export default function FilmGrain({ intensity: intensityProp, scale: scaleProp, speed: speedProp, className = '' }: FilmGrainProps): JSX.Element | null {
	const { enabled, intensity: contextIntensity, scale: contextScale, speed: contextSpeed } = useFilmGrain();

	// Use prop values if provided, otherwise use context values
	const intensity = intensityProp ?? contextIntensity;
	const scale = scaleProp ?? contextScale;
	const speed = speedProp ?? contextSpeed;

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const requestRef = useRef<number>(0);
	const shaderProgramRef = useRef<WebGLProgram | null>(null);
	const timeRef = useRef<number>(0);

	// WebGL setup and rendering
	useEffect(() => {
		// Skip effect if disabled
		if (!enabled) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		// Get WebGL context
		const gl = canvas.getContext('webgl', {
			antialias: false,
			alpha: true,
			premultipliedAlpha: false,
			depth: false,
			stencil: false,
			preserveDrawingBuffer: false,
		});

		if (!gl) {
			return;
		}

		// Make sure canvas matches viewport size
		const updateCanvasSize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			gl.viewport(0, 0, canvas.width, canvas.height);
		};

		updateCanvasSize();
		window.addEventListener('resize', updateCanvasSize);

		// Vertex shader - simple pass-through
		const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

		// Fragment shader - efficient film grain implementation
		const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_texCoord;

      uniform float u_time;
      uniform float u_intensity;
      uniform float u_scale;
      uniform float u_speed;
      uniform vec2 u_resolution;

      // Fast hash function - no trig or complex math
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float filmGrain(vec2 uv, float time) {
        // Apply scale to UVs
        vec2 uvScaled = uv * u_scale * (u_resolution.y * 0.05);
        float t = time * u_speed;

        // Multiple noise layers with slightly different frequencies and orientations
        float noise1 = hash(uvScaled + t);
        float noise2 = hash(uvScaled * 1.4 + t * 1.2);
        float noise3 = hash(uvScaled * 0.8 - t * 0.7);

        // Mix the layers for a more organic look
        float grainLayer = mix(noise1, noise2, 0.4);
        grainLayer = mix(grainLayer, noise3, 0.3);

        // Curve the distribution for a more film-like appearance
        return pow(grainLayer, 1.5);
      }

      void main() {
        // Generate film grain
        float grain = filmGrain(v_texCoord, u_time);

        // Remap from [0,1] to [-1,1] and scale by intensity
        float grainValue = (grain * 2.0 - 1.0) * u_intensity;

        // For stronger visual effect, use black and white for grain
        // This creates more visible grain than a gray midpoint
        vec3 grainColor = vec3(step(0.5, grain + 0.5 * (grainValue * 0.1)));

        // Higher alpha for more visibility - adjust based on intensity
        float alpha = min(0.2 + u_intensity * 0.5, 0.9);

        gl_FragColor = vec4(grainColor, alpha);
      }
    `;

		// Create and compile shaders
		const vertexShader = gl.createShader(gl.VERTEX_SHADER);
		if (!vertexShader) return;
		gl.shaderSource(vertexShader, vertexShaderSource);
		gl.compileShader(vertexShader);

		const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		if (!fragmentShader) return;
		gl.shaderSource(fragmentShader, fragmentShaderSource);
		gl.compileShader(fragmentShader);

		// Create shader program
		const shaderProgram = gl.createProgram();
		if (!shaderProgram) return;
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);
		shaderProgramRef.current = shaderProgram;

		// Check for compilation/linking errors
		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			logger.error('Shader program failed to link:', gl.getProgramInfoLog(shaderProgram));
			return;
		}

		// Set up vertex buffer
		const positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		const positions = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		// Set up texture coordinate buffer
		const texCoordBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
		const texCoords = [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		// Get attribute and uniform locations
		const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
		const texCoordAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_texCoord');
		const timeUniformLocation = gl.getUniformLocation(shaderProgram, 'u_time');
		const intensityUniformLocation = gl.getUniformLocation(shaderProgram, 'u_intensity');
		const scaleUniformLocation = gl.getUniformLocation(shaderProgram, 'u_scale');
		const speedUniformLocation = gl.getUniformLocation(shaderProgram, 'u_speed');
		const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, 'u_resolution');

		// Setup transparency blending
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		// Animation frame callback
		const animate = (time: number) => {
			timeRef.current = time * 0.001; // Convert to seconds

			gl.useProgram(shaderProgram);

			// Bind position buffer
			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			gl.enableVertexAttribArray(positionAttributeLocation);
			gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

			// Bind texCoord buffer
			gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
			gl.enableVertexAttribArray(texCoordAttributeLocation);
			gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

			// Set uniforms
			gl.uniform1f(timeUniformLocation, timeRef.current);
			gl.uniform1f(intensityUniformLocation, intensity);
			gl.uniform1f(scaleUniformLocation, scale);
			gl.uniform1f(speedUniformLocation, speed);
			gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

			// Draw the quad
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

			requestRef.current = requestAnimationFrame(animate);
		};

		requestRef.current = requestAnimationFrame(animate);

		// Cleanup
		return () => {
			if (requestRef.current) {
				cancelAnimationFrame(requestRef.current);
			}
			window.removeEventListener('resize', updateCanvasSize);

			if (gl && shaderProgramRef.current) {
				gl.deleteProgram(shaderProgramRef.current);
			}
		};
	}, [intensity, scale, speed, enabled]);

	// If disabled, don't render the component at all
	if (!enabled) return null;

	return <canvas ref={canvasRef} className={`pointer-events-none fixed inset-0 z-50 mix-blend-difference ${className}`} aria-hidden="true" />;
}
