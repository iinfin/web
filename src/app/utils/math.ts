/**
 * A collection of mathematical utility functions.
 * Inspired by common creative coding math libraries.
 */

export const PI = Math.PI;
export const PI2 = PI * 2;
export const HALF_PI = PI * 0.5;
export const DEG2RAD = PI / 180.0;
export const RAD2DEG = 180.0 / PI;

/**
 * Returns 0 if val is less than edge, otherwise 1.
 * @param edge - The threshold value.
 * @param val - The value to compare.
 * @returns 0 or 1.
 */
export function step(edge: number, val: number): 0 | 1 {
	return val < edge ? 0 : 1;
}

/**
 * Clamps a value between a minimum and maximum value.
 * @param val - The value to clamp.
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @returns The clamped value.
 */
export function clamp(val: number, min: number, max: number): number {
	return val < min ? min : val > max ? max : val;
}

/**
 * Linearly interpolates between min and max based on ratio.
 * Does not clamp the ratio.
 * @param min - The start value.
 * @param max - The end value.
 * @param ratio - The interpolation factor (0 to 1).
 * @returns The interpolated value.
 */
export function mix(min: number, max: number, ratio: number): number {
	return min + (max - min) * ratio;
}

/**
 * Clamped linear interpolation. Clamps the ratio between 0 and 1.
 * @param min - The start value.
 * @param max - The end value.
 * @param ratio - The interpolation factor, clamped between 0 and 1.
 * @returns The interpolated value.
 */
export function cMix(min: number, max: number, ratio: number): number {
	return min + (max - min) * clamp(ratio, 0, 1);
}

/**
 * Inverse linear interpolation. Calculates the ratio (0-1) of val between min and max.
 * Does not clamp the result.
 * @param min - The start value.
 * @param max - The end value.
 * @param val - The value to find the ratio for.
 * @returns The interpolation factor.
 */
export function unMix(min: number, max: number, val: number): number {
	// Avoid division by zero if min and max are the same
	const range = max - min;
	if (range === 0) return val >= max ? 1 : 0; // Or handle as an error/special case
	return (val - min) / range;
}

/**
 * Clamped inverse linear interpolation. Calculates the ratio (0-1) of val between min and max, clamping the result.
 * @param min - The start value.
 * @param max - The end value.
 * @param val - The value to find the ratio for.
 * @returns The clamped interpolation factor (0 to 1).
 */
export function cUnMix(min: number, max: number, val: number): number {
	return clamp(unMix(min, max, val), 0, 1);
}

/**
 * Clamps a value between 0 and 1.
 * @param val - The value to saturate.
 * @returns The saturated value.
 */
export function saturate(val: number): number {
	return clamp(val, 0, 1);
}

/**
 * Maps a value from one range [min, max] to another range [toMin, toMax].
 * Optionally applies an easing function.
 * @param val - The value to map.
 * @param min - The minimum of the input range.
 * @param max - The maximum of the input range.
 * @param toMin - The minimum of the output range.
 * @param toMax - The maximum of the output range.
 * @param easeFn - Optional easing function to apply to the normalized value.
 * @returns The mapped value.
 */
export function fit(val: number, min: number, max: number, toMin: number, toMax: number, easeFn?: (t: number) => number): number {
	let normalizedVal = cUnMix(min, max, val);
	if (easeFn) {
		normalizedVal = easeFn(normalizedVal);
	}
	return toMin + normalizedVal * (toMax - toMin);
}

/**
 * Loops a value v within the range [min, max).
 * @param v - The value to loop.
 * @param min - The minimum value (inclusive).
 * @param max - The maximum value (exclusive).
 * @returns The looped value.
 */
export function loop(v: number, min: number, max: number): number {
	const range = max - min;
	if (range <= 0) {
		return min; // Or throw an error
	}
	let result = (v - min) % range;
	if (result < 0) {
		result += range;
	}
	return result + min;
}

/**
 * Normalizes a value within a range [min, max] to [0, 1].
 * Same as cUnMix. Kept for compatibility if needed.
 * @param val - The value to normalize.
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @returns The normalized value (0 to 1).
 */
export function normalize(val: number, min: number, max: number): number {
	return cUnMix(min, max, val);
}

/**
 * Performs smooth interpolation between 0 and 1 when edge0 < x < edge1.
 * @param edge0 - The lower edge.
 * @param edge1 - The upper edge.
 * @param val - The value to interpolate.
 * @returns The smoothed value (0 to 1).
 */
export function smoothstep(edge0: number, edge1: number, val: number): number {
	const t = cUnMix(edge0, edge1, val);
	return t * t * (3.0 - 2.0 * t);
}

/**
 * Returns the fractional part of a number.
 * @param val - The input number.
 * @returns The fractional part.
 */
export function fract(val: number): number {
	return val - Math.floor(val);
}

/**
 * Generates a pseudo-random hash value between 0 and 1 for a single input number.
 * @param val - The input number.
 * @returns A pseudo-random number between 0 and 1.
 */
export function hash(val: number): number {
	return fract(Math.sin(val) * 43758.5453123);
}

/**
 * Generates a pseudo-random hash value between 0 and 1 for two input numbers.
 * @param val1 - The first input number.
 * @param val2 - The second input number.
 * @returns A pseudo-random number between 0 and 1.
 */
export function hash2(val1: number, val2: number): number {
	// Combine inputs reasonably. Dot product with a constant vector.
	const dotProduct = val1 * 12.9898 + val2 * 4.1414;
	return fract(Math.sin(dotProduct) * 43758.5453);
}

/**
 * Returns the sign of a number.
 * @param val - The input number.
 * @returns -1 if negative, 1 if positive, 0 if zero.
 */
export function sign(val: number): -1 | 0 | 1 {
	// Math.sign includes -0 returning -0, which might differ slightly
	// return Math.sign(val);
	// This version returns 0 for 0.
	if (val === 0) return 0;
	return val < 0 ? -1 : 1;
}

/**
 * Checks if a value is a power of two.
 * @param val - The number to check.
 * @returns True if the value is a power of two, false otherwise.
 */
export function isPowerOfTwo(val: number): boolean {
	if (val <= 0) return false;
	return (val & (val - 1)) === 0;
}

/**
 * Calculates the exponent for the smallest power of two greater than or equal to val.
 * @param val - The input value.
 * @returns The base-2 exponent.
 */
export function powerTwoCeilingBase(val: number): number {
	if (val <= 0) return 0; // Or handle error
	return Math.ceil(Math.log2(val));
}

/**
 * Finds the smallest power of two greater than or equal to val.
 * @param val - The input value.
 * @returns The next power of two.
 */
export function powerTwoCeiling(val: number): number {
	if (val <= 0) return 1; // Smallest power of 2 is 1
	return 1 << powerTwoCeilingBase(val);
}

/**
 * Calculates the exponent for the largest power of two less than or equal to val.
 * @param val - The input value.
 * @returns The base-2 exponent.
 */
export function powerTwoFloorBase(val: number): number {
	if (val <= 0) return 0; // Or handle error
	return Math.floor(Math.log2(val));
}

/**
 * Finds the largest power of two less than or equal to val.
 * @param val - The input value.
 * @returns The previous power of two.
 */
export function powerTwoFloor(val: number): number {
	if (val <= 0) return 1; // Or handle appropriately
	return 1 << powerTwoFloorBase(val);
}

/**
 * Calculates the bearing (angle) between two geographical coordinates.
 * Note: Input angles should be in radians.
 * @param lat1 - Latitude of the first point (radians).
 * @param lng1 - Longitude of the first point (radians).
 * @param lat2 - Latitude of the second point (radians).
 * @param lng2 - Longitude of the second point (radians).
 * @returns The initial bearing in radians.
 */
export function latLngBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const dLng = lng2 - lng1;
	const y = Math.sin(dLng) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
	return Math.atan2(y, x);
}

/**
 * Calculates the Euclidean distance between two points in 2D.
 * @param dX - The difference in x coordinates.
 * @param dY - The difference in y coordinates.
 * @returns The distance.
 */
export function distanceTo(dX: number, dY: number): number {
	return Math.sqrt(dX * dX + dY * dY);
}

/**
 * Calculates the squared Euclidean distance between two points in 2D.
 * Useful for comparisons where the actual distance isn't needed.
 * @param dX - The difference in x coordinates.
 * @param dY - The difference in y coordinates.
 * @returns The squared distance.
 */
export function distanceSqrTo(dX: number, dY: number): number {
	return dX * dX + dY * dY;
}

/**
 * Calculates the Euclidean distance between two points in 3D.
 * @param dX - The difference in x coordinates.
 * @param dY - The difference in y coordinates.
 * @param dZ - The difference in z coordinates.
 * @returns The distance.
 */
export function distanceTo3(dX: number, dY: number, dZ: number): number {
	return Math.sqrt(dX * dX + dY * dY + dZ * dZ);
}

/**
 * Calculates the squared Euclidean distance between two points in 3D.
 * @param dX - The difference in x coordinates.
 * @param dY - The difference in y coordinates.
 * @param dZ - The difference in z coordinates.
 * @returns The squared distance.
 */
export function distanceSqrTo3(dX: number, dY: number, dZ: number): number {
	return dX * dX + dY * dY + dZ * dZ;
}

/**
 * Calculates the Haversine distance between two geographical coordinates.
 * Note: Input angles should be in radians. Uses Earth radius R = 1 for normalized distance.
 * @param lat1 - Latitude of the first point (radians).
 * @param lng1 - Longitude of the first point (radians).
 * @param lat2 - Latitude of the second point (radians).
 * @param lng2 - Longitude of the second point (radians).
 * @returns The great-circle distance in radians (multiply by Earth radius for actual distance).
 */
export function latLngDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const dLat = lat2 - lat1;
	const dLng = lng2 - lng1;
	const sinHalfDLat = Math.sin(dLat / 2);
	const sinHalfDLng = Math.sin(dLng / 2);
	const a = sinHalfDLat * sinHalfDLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfDLng * sinHalfDLng;
	// Clamp the value inside sqrt to avoid floating point issues near 1
	const clampedA = clamp(a, 0, 1);
	return 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
}

/**
 * Calculates a point on a cubic Bézier curve defined by four points.
 * @param p0 - Start point value.
 * @param p1 - First control point value.
 * @param p2 - Second control point value.
 * @param p3 - End point value.
 * @param t - Parameter value (0 to 1).
 * @returns The value on the curve at parameter t.
 */
export function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
	const t_ = 1 - t;
	const t_2 = t_ * t_;
	const t_3 = t_2 * t_;
	const t2 = t * t;
	const t3 = t2 * t;
	return p0 * t_3 + 3 * p1 * t_2 * t + 3 * p2 * t_ * t2 + p3 * t3;
}

/**
 * Creates a function that calculates a point on a cubic Bézier curve.
 * @param p0 - Start point value.
 * @param p1 - First control point value.
 * @param p2 - Second control point value.
 * @param p3 - End point value.
 * @returns A function that takes t (0 to 1) and returns the value on the curve.
 */
export function cubicBezierFn(p0: number, p1: number, p2: number, p3: number): (t: number) => number {
	// Pre-calculate coefficients
	const c = 3 * (p1 - p0);
	const b = 3 * (p2 - p1) - c;
	const a = p3 - p0 - c - b;
	return (t: number): number => {
		const t2 = t * t;
		const t3 = t2 * t;
		return a * t3 + b * t2 + c * t + p0;
	};
}

/**
 * Normalizes an angle to the range [-PI, PI].
 * @param angle - The angle in radians.
 * @returns The normalized angle.
 */
export function normalizeAngle(angle: number): number {
	// Use modulo for efficiency, handle negative results
	let normalized = angle % PI2;
	if (normalized > PI) {
		normalized -= PI2;
	} else if (normalized <= -PI) {
		normalized += PI2;
	}
	return normalized;

	// Alternative implementation from original code (slightly different logic but should yield same range):
	// angle += PI;
	// angle = angle < 0 ? PI2 - (Math.abs(angle) % PI2) : angle % PI2;
	// angle -= PI;
	// return angle;
}

/**
 * Finds the shortest angle difference to rotate from 'from' angle to 'to' angle.
 * @param from - The starting angle in radians.
 * @param to - The target angle in radians.
 * @returns The angle 'to' adjusted to be the closest representation to 'from'.
 */
export function closestAngleTo(from: number, to: number): number {
	return from + normalizeAngle(to - from);
}

/**
 * Linearly interpolates between a and b by t.
 * Same as mix(a, b, t). Kept for compatibility/common naming.
 * @param a - Start value.
 * @param b - End value.
 * @param t - Interpolation factor (0 to 1).
 * @returns The interpolated value.
 */
export function lerp(a: number, b: number, t: number): number {
	return a * (1 - t) + b * t;
}

/**
 * Creates a "center-biased" ratio. Returns 1 when num is 0.5, falling off to 0 at 0 and 1.
 * Useful for effects that should peak in the middle.
 * @param num - Input value, expected range [0, 1].
 * @returns A value between 0 and 1, peaking at 1 when num is 0.5.
 */
export function centerRatio(num: number): number {
	return saturate(1 - fit(Math.abs(num - 0.5), 0, 0.5, 0, 1));
}

/**
 * Generates a cryptographically secure random number between 0 (inclusive) and 1 (exclusive), if available.
 * Falls back to Math.random().
 * @returns A random float between 0 and 1.
 */
export function random(): number {
	if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
		// Generate a random 32-bit unsigned integer
		const array = new Uint32Array(1);
		window.crypto.getRandomValues(array);
		const randomUint32 = array[0]; // Get the value

		// Ensure the value is defined (though it should always be for Uint32Array(1))
		if (randomUint32 !== undefined) {
			// Scale it to the range [0, 1)
			return randomUint32 / 2 ** 32;
		}
	}

	// Fallback for environments without crypto API or if the value was somehow undefined

	return Math.random();
}

/**
 * Generates a random float within a specified range.
 * @param min - The minimum value (inclusive).
 * @param max - The maximum value (exclusive).
 * @returns A random float between min and max.
 */
export function randomRange(min: number, max: number): number {
	return min + random() * (max - min);
}

/**
 * Generates a random integer within a specified range.
 * Includes min, excludes max.
 * @param min - The minimum integer value (inclusive).
 * @param max - The maximum integer value (exclusive).
 * @returns A random integer between min and max - 1.
 */
export function randomRangeInt(min: number, max: number): number {
	// Ensure min and max are integers for clarity, though floor handles it
	const intMin = Math.ceil(min);
	const intMax = Math.floor(max);
	return Math.floor(random() * (intMax - intMin) + intMin);
}

/**
 * Pads a number with leading zeros to reach a specific size.
 * @param num - The number to pad (assumed non-negative).
 * @param size - The desired total length of the string.
 * @returns The zero-padded string representation of the number.
 */
export function padZero(num: number, size: number): string {
	let numString = String(Math.floor(Math.abs(num))); // Ensure integer and handle potential negative sign implicitly
	while (numString.length < size) {
		numString = '0' + numString;
	}
	return numString;
}
