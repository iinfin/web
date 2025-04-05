/**
 * Configuration constants for the Creation content 3D scene.
 */

// Define common aspect ratios and their dimensions
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

// --- Scene Layout Configuration ---
export const NUM_COLUMNS = 1;
export const PLANE_HEIGHT = 1; // Base height for scaling calculations
export const VERTICAL_GAP = 1.05; // Set to PLANE_HEIGHT (1.5) + desired gap (0.2)
export const SCROLL_MULTIPLIER = 0.075; // Scroll sensitivity
export const RECYCLE_BUFFER = PLANE_HEIGHT * 2; // Viewport buffer for recycling items

// Edge positioning
export const LEFT_PADDING = 0.0; // Distance from left edge of canvas to content (smaller values = closer to edge)

// --- Debugging/Development --- //
// Disable media loading in development for faster iteration
export const DISABLE_MEDIA = false; // process.env.NODE_ENV === 'development';
