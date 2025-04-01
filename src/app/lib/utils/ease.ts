/**
 * A collection of easing functions.
 * Based on common easing equations (Robert Penner's Easing Functions).
 * Input 't' is expected to be in the range [0, 1].
 * Output is typically in the range [0, 1].
 *
 * @see https://easings.net/
 */

export type EasingFunction = (t: number) => number;

export const linear: EasingFunction = (t) => t;

// --- Quadratic ---
export const quadIn: EasingFunction = (t) => {
	return t * t;
};
export const quadOut: EasingFunction = (t) => {
	return t * (2 - t);
};
export const quadInOut: EasingFunction = (t) => {
	t *= 2;
	if (t < 1) return 0.5 * t * t;
	t--;
	return -0.5 * (t * (t - 2) - 1);
};

// --- Cubic ---
export const cubicIn: EasingFunction = (t) => {
	return t * t * t;
};
export const cubicOut: EasingFunction = (t) => {
	t--;
	return t * t * t + 1;
};
export const cubicInOut: EasingFunction = (t) => {
	t *= 2;
	if (t < 1) return 0.5 * t * t * t;
	t -= 2;
	return 0.5 * (t * t * t + 2);
};

// --- Quartic ---
export const quartIn: EasingFunction = (t) => {
	return t * t * t * t;
};
export const quartOut: EasingFunction = (t) => {
	t--;
	return 1 - t * t * t * t;
};
export const quartInOut: EasingFunction = (t) => {
	t *= 2;
	if (t < 1) return 0.5 * t * t * t * t;
	t -= 2;
	return -0.5 * (t * t * t * t - 2);
};

// --- Quintic ---
export const quintIn: EasingFunction = (t) => {
	return t * t * t * t * t;
};
export const quintOut: EasingFunction = (t) => {
	t--;
	return t * t * t * t * t + 1;
};
export const quintInOut: EasingFunction = (t) => {
	t *= 2;
	if (t < 1) return 0.5 * t * t * t * t * t;
	t -= 2;
	return 0.5 * (t * t * t * t * t + 2);
};

// --- Sinusoidal ---
export const sineIn: EasingFunction = (t) => {
	if (t === 0) return 0;
	if (t === 1) return 1;
	return 1 - Math.cos((t * Math.PI) / 2);
};
export const sineOut: EasingFunction = (t) => {
	if (t === 0) return 0;
	if (t === 1) return 1;
	return Math.sin((t * Math.PI) / 2);
};
export const sineInOut: EasingFunction = (t) => {
	if (t === 0) return 0;
	if (t === 1) return 1;
	return 0.5 * (1 - Math.cos(Math.PI * t));
};

// --- Exponential ---
export const expoIn: EasingFunction = (t) => {
	return t === 0 ? 0 : Math.pow(1024, t - 1);
	// Alternative: Math.pow(2, 10 * (t - 1))
};
export const expoOut: EasingFunction = (t) => {
	return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};
export const expoInOut: EasingFunction = (t) => {
	if (t === 0) return 0;
	if (t === 1) return 1;
	t *= 2;
	if (t < 1) return 0.5 * Math.pow(1024, t - 1);
	// Alternative: 0.5 * Math.pow(2, 10 * (t - 1))
	t--;
	return 0.5 * (-Math.pow(2, -10 * t) + 2);
};

// --- Circular ---
export const circIn: EasingFunction = (t) => {
	return 1 - Math.sqrt(1 - t * t);
};
export const circOut: EasingFunction = (t) => {
	t--;
	return Math.sqrt(1 - t * t);
};
export const circInOut: EasingFunction = (t) => {
	t *= 2;
	if (t < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1);
	t -= 2;
	return 0.5 * (Math.sqrt(1 - t * t) + 1);
};

// --- Elastic ---
// Note: These elastic functions use fixed amplitude and period parameters.
// The original implementation had configurable n (amplitude) and r (period),
// but fixed values are common for standard easing libraries.
const elasticPeriod = 0.4;
const elasticAmplitude = 1; // Adjusted for typical behavior

export const elasticIn: EasingFunction = (t) => {
	if (t === 0) return 0;
	if (t === 1) return 1;

	const s = (elasticPeriod / (2 * Math.PI)) * Math.asin(1 / elasticAmplitude);
	t -= 1;
	return -(elasticAmplitude * Math.pow(2, 10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / elasticPeriod));
};

export const elasticOut: EasingFunction = (t) => {
	if (t === 0) return 0;
	if (t === 1) return 1;

	const s = (elasticPeriod / (2 * Math.PI)) * Math.asin(1 / elasticAmplitude);
	return elasticAmplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / elasticPeriod) + 1;
};

export const elasticInOut: EasingFunction = (t) => {
	if (t === 0) return 0;
	if (t === 1) return 1;

	const s = (elasticPeriod / (2 * Math.PI)) * Math.asin(1 / elasticAmplitude);
	t = t * 2 - 1;
	if (t < 0) {
		return -0.5 * (elasticAmplitude * Math.pow(2, 10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / elasticPeriod));
	}

	return elasticAmplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / elasticPeriod) * 0.5 + 1;
};

// --- Back ---
const backOvershoot = 1.70158;
const backOvershootInOut = backOvershoot * 1.525;

export const backIn: EasingFunction = (t) => {
	return t * t * ((backOvershoot + 1) * t - backOvershoot);
};
export const backOut: EasingFunction = (t) => {
	t--;
	return t * t * ((backOvershoot + 1) * t + backOvershoot) + 1;
};
export const backInOut: EasingFunction = (t) => {
	t *= 2;
	if (t < 1) {
		return 0.5 * (t * t * ((backOvershootInOut + 1) * t - backOvershootInOut));
	}

	t -= 2;
	return 0.5 * (t * t * ((backOvershootInOut + 1) * t + backOvershootInOut) + 2);
};

// --- Bounce ---
export const bounceOut: EasingFunction = (t) => {
	const n1 = 7.5625;
	const d1 = 2.75;

	if (t < 1 / d1) {
		return n1 * t * t;
	}
	if (t < 2 / d1) {
		t -= 1.5 / d1;
		return n1 * t * t + 0.75;
	}
	if (t < 2.5 / d1) {
		t -= 2.25 / d1;
		return n1 * t * t + 0.9375;
	}

	t -= 2.625 / d1;
	return n1 * t * t + 0.984375;
};

export const bounceIn: EasingFunction = (t) => {
	return 1 - bounceOut(1 - t);
};

export const bounceInOut: EasingFunction = (t) => {
	if (t < 0.5) {
		return bounceIn(t * 2) * 0.5;
	}
	return bounceOut(t * 2 - 1) * 0.5 + 0.5;
};

/**
 * Cubic Bézier easing function.
 * Equivalent to CSS transition timing functions (e.g., 'ease', 'ease-in-out').
 * Provides a way to use bezier curves directly if needed, although
 * Framer Motion and CSS transitions often handle this internally.
 *
 * @param t - The progress ratio (0 to 1).
 * @param x1 - The x coordinate of the first control point.
 * @param y1 - The y coordinate of the first control point.
 * @param x2 - The x coordinate of the second control point.
 * @param y2 - The y coordinate of the second control point.
 * @returns The eased value (0 to 1).
 */
export function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number): number {
	// Based on https://github.com/gre/bezier-easing/blob/master/src/index.js
	// Which is derived from WebKit's implementation
	if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
		// Control points must be in [0, 1] range for standard bezier easing
		// You might adjust this check based on specific needs
		// eslint-disable-next-line no-console -- Allow warning for invalid dev input
		console.warn('Cubic bezier control point X coordinates must be between 0 and 1.');
		x1 = Math.max(0, Math.min(1, x1));
		x2 = Math.max(0, Math.min(1, x2));
	}
	if (x1 === y1 && x2 === y2) return t; // Linear

	// Helper functions for polynomial calculation
	const Cx = 3 * x1;
	const Bx = 3 * (x2 - x1) - Cx;
	const Ax = 1 - Cx - Bx;

	const Cy = 3 * y1;
	const By = 3 * (y2 - y1) - Cy;
	const Ay = 1 - Cy - By;

	const sampleCurveX = (tParam: number): number => ((Ax * tParam + Bx) * tParam + Cx) * tParam;
	const sampleCurveY = (tParam: number): number => ((Ay * tParam + By) * tParam + Cy) * tParam;
	const sampleCurveDerivativeX = (tParam: number): number => (3 * Ax * tParam + 2 * Bx) * tParam + Cx;

	// Find t for a given x using Newton's method
	const solveCurveX = (x: number, epsilon: number): number => {
		let t0: number;
		let t1: number;
		let t2: number = x;
		let x2: number;
		let d2: number;
		let i: number;

		// First try a few iterations of Newton's method -- normally very fast.
		for (i = 0; i < 8; i++) {
			x2 = sampleCurveX(t2) - x;
			if (Math.abs(x2) < epsilon) return t2;
			d2 = sampleCurveDerivativeX(t2);
			if (Math.abs(d2) < 1e-6) break;
			t2 = t2 - x2 / d2;
		}

		// Fallback to bisection method for reliability.
		t0 = 0.0;
		t1 = 1.0;
		t2 = x;

		if (t2 < t0) return t0;
		if (t2 > t1) return t1;

		while (t0 < t1) {
			x2 = sampleCurveX(t2);
			if (Math.abs(x2 - x) < epsilon) return t2;
			if (x > x2) t0 = t2;
			else t1 = t2;
			t2 = (t1 - t0) * 0.5 + t0;
		}

		return t2; // Failure
	};

	// Use a reasonable epsilon value
	const epsilon = 1e-6;
	const tSolved = solveCurveX(t, epsilon);

	return sampleCurveY(tSolved);
}

// --- Predefined Bezier Curves (like CSS) ---
export const ease: EasingFunction = (t) => cubicBezier(t, 0.25, 0.1, 0.25, 1.0);
export const easeIn: EasingFunction = (t) => cubicBezier(t, 0.42, 0.0, 1.0, 1.0);
export const easeOut: EasingFunction = (t) => cubicBezier(t, 0.0, 0.0, 0.58, 1.0);
export const easeInOut: EasingFunction = (t) => cubicBezier(t, 0.42, 0.0, 0.58, 1.0);

// Export all functions as a single object if preferred
export const Easing = {
	linear,
	quadIn,
	quadOut,
	quadInOut,
	cubicIn,
	cubicOut,
	cubicInOut,
	quartIn,
	quartOut,
	quartInOut,
	quintIn,
	quintOut,
	quintInOut,
	sineIn,
	sineOut,
	sineInOut,
	expoIn,
	expoOut,
	expoInOut,
	circIn,
	circOut,
	circInOut,
	elasticIn,
	elasticOut,
	elasticInOut,
	backIn,
	backOut,
	backInOut,
	bounceIn,
	bounceOut,
	bounceInOut,
	cubicBezier,
	ease, // CSS default 'ease'
	easeIn, // CSS 'ease-in'
	easeOut, // CSS 'ease-out'
	easeInOut, // CSS 'ease-in-out'
};
