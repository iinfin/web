import * as THREE from 'three';
import { Effect } from 'postprocessing';

/**
 * Dithering shader implementation
 * Applies a dithering effect to the rendered scene
 *
 * Credits:
 * Original dithering pattern: https://www.shadertoy.com/view/ltSSzW
 */

const ditheringShader = /*glsl*/ `
// Input uniforms
uniform float ditheringEnabled; // Not used in this version, kept for compatibility
uniform vec2 resolution;
uniform float gridSize;
uniform float pixelSizeRatio;
uniform float invertColor;
uniform float grayscaleOnly;

// New control uniforms
uniform float u_brightness; // Additive brightness adjustment (-1.0 to 1.0, default 0.0)
uniform float u_contrast; // Multiplicative contrast adjustment (>0.0, default 1.0)
uniform float u_threshold_scale; // Scale factor for dither thresholds ( > 0.0, default 1.0)

// Standard Rec. 709 luminance weights
const vec3 LUMA_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);

/**
 * Ordered dithering matrix lookup (4x4 Bayer)
 * Compares adjusted luminance to scaled matrix thresholds.
 * @param adjLum Adjusted luminance value (after brightness/contrast).
 * @param pos Screen fragment coordinates.
 * @return boolean - True if the pixel should be BLACK, false if WHITE (or base color if not grayscale).
 */
bool bayerDither(float adjLum, vec2 pos) {
  // Scale the internal thresholds [0..16]/17 by u_threshold_scale
  // We compare adjLum directly to these scaled thresholds.
  // Note: The original thresholds were inverted (true=white). We flip the logic (true=black).
  float scaledThreshold;

  // Calculate position in 4x4 dither matrix
  vec2 pixel = floor(mod(pos.xy / gridSize, 4.0));
  int x = int(pixel.x);
  int y = int(pixel.y);

  // 4x4 Bayer matrix pattern (values 0-15)
  // We compare adjLum < (matrixValue + 1) / 17 * scale
  // Which simplifies to adjLum * 17 / scale < matrixValue + 1
  float comparisonValue = adjLum * 17.0 / u_threshold_scale;

  if (x == 0) {
    if (y == 0) return comparisonValue < 1.0;  // Matrix value 0
    if (y == 1) return comparisonValue < 9.0;  // Matrix value 8
    if (y == 2) return comparisonValue < 3.0;  // Matrix value 2
    return comparisonValue < 11.0; // y == 3, Matrix value 10
  }
  else if (x == 1) {
    if (y == 0) return comparisonValue < 13.0; // Matrix value 12
    if (y == 1) return comparisonValue < 5.0;  // Matrix value 4
    if (y == 2) return comparisonValue < 15.0; // Matrix value 14
    return comparisonValue < 7.0;  // y == 3, Matrix value 6
  }
  else if (x == 2) {
    if (y == 0) return comparisonValue < 4.0;  // Matrix value 3
    if (y == 1) return comparisonValue < 12.0; // Matrix value 11
    if (y == 2) return comparisonValue < 2.0;  // Matrix value 1
    return comparisonValue < 10.0; // y == 3, Matrix value 9
  }
  else { // x == 3
    if (y == 0) return comparisonValue < 16.0; // Matrix value 15
    if (y == 1) return comparisonValue < 8.0;  // Matrix value 7
    if (y == 2) return comparisonValue < 14.0; // Matrix value 13
    return comparisonValue < 6.0;  // y == 3, Matrix value 5
  }
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 fragCoord = uv * resolution;
  vec3 sampledColor;

  // Apply pixelation effect based on grid size and ratio
  float pixelSize = gridSize * pixelSizeRatio;
  vec2 pixelatedUV = floor(fragCoord / pixelSize) * pixelSize / resolution;
  sampledColor = texture2D(inputBuffer, pixelatedUV).rgb;

  // Calculate standard luminance
  float luminance = dot(sampledColor, LUMA_WEIGHTS);

  // Apply brightness (additive) and contrast (multiplicative)
  // Contrast pivots around 0.5 gray
  float adjustedLuminance = (luminance - 0.5) * u_contrast + 0.5 + u_brightness;
  adjustedLuminance = clamp(adjustedLuminance, 0.0, 1.0); // Clamp to valid range

  // Determine dither result (true = black, false = white/color)
  bool ditherResult = bayerDither(adjustedLuminance, fragCoord);

  vec3 finalColor;
  if (grayscaleOnly > 0.5) {
      // Grayscale: Output black or white based on dither result
      finalColor = ditherResult ? vec3(0.0) : vec3(1.0);
  } else {
      // Color: Output black or the original sampled color
      finalColor = ditherResult ? vec3(0.0) : sampledColor;
  }

  // Invert color if requested
  if (invertColor > 0.5) {
    finalColor = 1.0 - finalColor;
  }

  // Output final color preserving alpha
  outputColor = vec4(finalColor, inputColor.a);
}`;

/**
 * Interface for dithering effect options
 */
export interface DitheringEffectOptions {
	time?: number;
	resolution?: THREE.Vector2;
	gridSize?: number;
	invertColor?: boolean;
	pixelSizeRatio?: number;
	grayscaleOnly?: boolean;
	brightness?: number;
	contrast?: number;
	thresholdScale?: number;
}

/**
 * Implementation of the dithering effect
 * Applies a dithering pattern to the rendered scene
 */
export class DitheringEffect extends Effect {
	/**
	 * Map of uniforms used by the shader
	 */
	override uniforms: Map<string, THREE.Uniform<number | THREE.Vector2>>;

	/**
	 * Creates a new dithering effect instance
	 * @param options - Configuration options for the effect
	 */
	constructor({
		time = 0,
		resolution = new THREE.Vector2(1, 1),
		gridSize = 1.0,
		invertColor = false,
		pixelSizeRatio = 1,
		grayscaleOnly = true,
		brightness = 0.0,
		contrast = 1.0,
		thresholdScale = 1.0,
	}: DitheringEffectOptions = {}) {
		// Initialize uniforms with default values
		const uniforms = new Map<string, THREE.Uniform<number | THREE.Vector2>>([
			['time', new THREE.Uniform(time)],
			['resolution', new THREE.Uniform(resolution)],
			['gridSize', new THREE.Uniform(gridSize)],
			['invertColor', new THREE.Uniform(invertColor ? 1 : 0)],
			['pixelSizeRatio', new THREE.Uniform(pixelSizeRatio)],
			['grayscaleOnly', new THREE.Uniform(grayscaleOnly ? 1 : 0)],
			['u_brightness', new THREE.Uniform(brightness)],
			['u_contrast', new THREE.Uniform(contrast)],
			['u_threshold_scale', new THREE.Uniform(thresholdScale)],
		]);

		super('DitheringEffect', ditheringShader, { uniforms });
		this.uniforms = uniforms;
	}

	/**
	 * Updates the effect parameters on each frame
	 * @param renderer - The WebGL renderer
	 * @param inputBuffer - The input render target
	 * @param deltaTime - Time elapsed since the last frame
	 */
	override update(_renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime: number): void {
		// Update time uniform
		const timeUniform = this.uniforms.get('time');
		if (timeUniform !== undefined && typeof timeUniform.value === 'number') {
			timeUniform.value += deltaTime;
		}

		// Update resolution uniform to match current render target
		const resolutionUniform = this.uniforms.get('resolution');
		if (resolutionUniform !== undefined && resolutionUniform.value instanceof THREE.Vector2) {
			// Check if dimensions actually changed to avoid unnecessary updates
			if (resolutionUniform.value.x !== inputBuffer.width || resolutionUniform.value.y !== inputBuffer.height) {
				resolutionUniform.value.set(inputBuffer.width, inputBuffer.height);
			}
		}
	}
}
