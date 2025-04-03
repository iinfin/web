import { COLUMN_WIDTH, COMMON_ASPECT_RATIOS, HORIZONTAL_JITTER, NUM_COLUMNS, PLANE_HEIGHT, Z_JITTER, Z_OFFSET_STEP } from './config';
import type { AspectRatio } from './config';

/**
 * Utility functions for the Creation content 3D scene.
 */

/**
 * Calculate plane dimensions based on aspect ratio, maintaining visual presence.
 * @param aspectRatio - The target aspect ratio.
 * @returns Array containing [width, height].
 */
export function calculateDimensions(aspectRatio: AspectRatio): [number, number] {
	const ratio = aspectRatio.width / aspectRatio.height;

	// For portrait (taller than wide), scale based on height
	if (ratio < 1) {
		const height = PLANE_HEIGHT;
		const width = height * ratio;
		return [width, height];
	}

	// For landscape (wider than tall), scale based on height but maintain area
	const height = PLANE_HEIGHT / Math.sqrt(ratio);
	const width = height * ratio;
	return [width, height];
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

/**
 * Calculates the X and Z position for a plane based on its column.
 * Adds horizontal jitter within the column and Z jitter around a base Z offset.
 * @param col - The column index (0 to NUM_COLUMNS - 1).
 * @returns Object containing { x, z } coordinates.
 */
export const calculatePosition = (col: number): { x: number; z: number } => {
	// Determine the horizontal center of the assigned column
	const columnCenterX = (col - (NUM_COLUMNS - 1) / 2) * COLUMN_WIDTH;
	// Add random horizontal jitter within the column's bounds
	const x = columnCenterX + (Math.random() - 0.5) * HORIZONTAL_JITTER * 2;
	// Determine a base Z depth based on the column to create layers
	const baseZ = (col - (NUM_COLUMNS - 1) / 2) * Z_OFFSET_STEP;
	// Add a smaller random jitter to the base Z depth
	const z = baseZ + (Math.random() - 0.5) * Z_JITTER * 2;
	return { x, z };
};
