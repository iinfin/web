import { COMMON_ASPECT_RATIOS, PLANE_HEIGHT } from './config';
import type { AspectRatio } from './config';

/**
 * Utility functions for the Creation content 3D scene.
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

	// // For portrait (taller than wide), scale based on height
	// if (ratio < 1) {
	// 	const height = PLANE_HEIGHT;
	// 	const width = height * ratio;
	// 	return [width, height];
	// }

	// // For landscape (wider than tall), scale based on height but maintain area
	// const height = PLANE_HEIGHT / Math.sqrt(ratio);
	// const width = height * ratio;
	// return [width, height];
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

// The calculatePosition function has been removed as positioning is now handled
// directly in the ScrollingPlanes component using viewport calculations
