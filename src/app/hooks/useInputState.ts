'use client';

// Needs access to window and state hooks
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Represents a 2D vector.
 */
type Vector2 = {
	x: number;
	y: number;
};

/**
 * Represents the raw input state from mouse/touch interactions.
 */
export type InputState = {
	/** Current pointer position in pixels (relative to window). */
	pixel: Vector2;
	/** Previous pointer position in pixels. */
	prevPixel: Vector2;
	/** Change in pointer position since the last frame (pixels). */
	deltaPixel: Vector2;
	/** Pointer position in normalized viewport coordinates (-1 to 1). */
	normalized: Vector2;
	/** Previous pointer position in normalized coordinates. */
	prevNormalized: Vector2;
	/** Change in pointer position since the last frame (normalized). */
	deltaNormalized: Vector2;
	/** Pixel position where the pointer was last pressed down. */
	downPixel: Vector2;
	/** Normalized position where the pointer was last pressed down. */
	downNormalized: Vector2;
	/** Whether the pointer is currently pressed down. */
	isDown: boolean;
	/** Whether the pointer was pressed down in the previous frame. */
	wasDown: boolean;
	/** Accumulated wheel delta since the last frame. */
	wheelDelta: number;
	/** Timestamp of the last wheel event. */
	lastWheelTime: number;
	/** Timestamp when the pointer was last pressed down. */
	downTime: number;
};

// Base values
const initialVector: Vector2 = { x: 0, y: 0 };

const initialState: InputState = {
	// Position states - pixel coordinates
	pixel: { ...initialVector },
	prevPixel: { ...initialVector },
	deltaPixel: { ...initialVector },

	// Position states - normalized coordinates
	normalized: { ...initialVector },
	prevNormalized: { ...initialVector },
	deltaNormalized: { ...initialVector },

	// Down states - position tracking
	downPixel: { ...initialVector },
	downNormalized: { ...initialVector },

	// Down states - boolean flags
	isDown: false,
	wasDown: false,

	// Time and wheel states
	wheelDelta: 0,
	lastWheelTime: 0,
	downTime: 0,
};

/**
 * Extracts client coordinates from mouse or touch events.
 */
function getEventClientCoords(event: MouseEvent | TouchEvent): Vector2 {
	if (window.TouchEvent && event instanceof TouchEvent) {
		const touch = event.changedTouches?.[0] ?? event.touches?.[0];
		return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
	}

	const mouseEvent = event as MouseEvent;
	return { x: mouseEvent.clientX, y: mouseEvent.clientY };
}

/**
 * Converts pixel coordinates to normalized viewport coordinates (-1 to 1).
 */
function pixelToNormalized(pixel: Vector2): Vector2 {
	return {
		x: (pixel.x / window.innerWidth) * 2 - 1,
		y: 1 - (pixel.y / window.innerHeight) * 2, // Invert Y
	};
}

/**
 * Hook to track raw mouse, touch, and wheel input state globally.
 * Attaches event listeners to the window and updates state using requestAnimationFrame
 * for performance.
 *
 * @returns {InputState} The current input state, updated each frame.
 */
export function useInputState(): InputState {
	// Internal refs for high-frequency updates
	const stateRef = useRef<InputState>(initialState);
	const rafRef = useRef<number | null>(null);
	const updateRef = useRef(false);

	// Rendered state that triggers component updates
	const [renderState, setRenderState] = useState<InputState>(initialState);

	// --- Event Handlers ---

	const handlePointerDown = useCallback((event: MouseEvent | TouchEvent) => {
		const pixel = getEventClientCoords(event);
		const normalized = pixelToNormalized(pixel);
		const now = Date.now();

		stateRef.current = {
			...stateRef.current,
			// Current position
			pixel: { ...pixel },
			prevPixel: { ...pixel },
			deltaPixel: { ...initialVector },

			// Normalized position
			normalized: { ...normalized },
			prevNormalized: { ...normalized },
			deltaNormalized: { ...initialVector },

			// Down state
			downPixel: { ...pixel },
			downNormalized: { ...normalized },
			isDown: true,
			wasDown: stateRef.current.isDown,
			downTime: now,
		};
		updateRef.current = true;
	}, []);

	const handlePointerMove = useCallback((event: MouseEvent | TouchEvent) => {
		const pixel = getEventClientCoords(event);
		const normalized = pixelToNormalized(pixel);

		// Calculate deltas
		const deltaPixel = {
			x: pixel.x - stateRef.current.pixel.x,
			y: pixel.y - stateRef.current.pixel.y,
		};

		const deltaNormalized = {
			x: normalized.x - stateRef.current.normalized.x,
			y: normalized.y - stateRef.current.normalized.y,
		};

		stateRef.current = {
			...stateRef.current,
			// Previous positions
			prevPixel: { ...stateRef.current.pixel },
			prevNormalized: { ...stateRef.current.normalized },

			// Current positions
			pixel: { ...pixel },
			normalized: { ...normalized },

			// Deltas
			deltaPixel,
			deltaNormalized,
		};
		updateRef.current = true;
	}, []);

	const handlePointerUp = useCallback((event: MouseEvent | TouchEvent) => {
		const pixel = getEventClientCoords(event);
		const normalized = pixelToNormalized(pixel);

		const deltaPixel = {
			x: pixel.x - stateRef.current.pixel.x,
			y: pixel.y - stateRef.current.pixel.y,
		};

		const deltaNormalized = {
			x: normalized.x - stateRef.current.normalized.x,
			y: normalized.y - stateRef.current.normalized.y,
		};

		stateRef.current = {
			...stateRef.current,
			// Previous positions
			prevPixel: { ...stateRef.current.pixel },
			prevNormalized: { ...stateRef.current.normalized },

			// Current positions
			pixel: { ...pixel },
			normalized: { ...normalized },

			// Deltas
			deltaPixel,
			deltaNormalized,

			// Down state
			isDown: false,
			wasDown: stateRef.current.isDown,
		};
		updateRef.current = true;
	}, []);

	const handleWheel = useCallback((event: WheelEvent) => {
		// Normalize wheel delta based on mode
		let deltaY = event.deltaY;

		if (event.deltaMode === 1) {
			// LINE mode
			deltaY *= 16; // Approximate pixels per line
		} else if (event.deltaMode === 2) {
			// PAGE mode
			deltaY *= window.innerHeight * 0.8; // Approximate pixels per page
		}

		// Update wheel state
		stateRef.current.wheelDelta += deltaY;
		stateRef.current.lastWheelTime = Date.now();
		updateRef.current = true;
	}, []);

	// --- Setup and Cleanup ---

	useEffect(() => {
		const eventOptions = { passive: true };

		// Mouse events
		window.addEventListener('mousedown', handlePointerDown, eventOptions);
		window.addEventListener('mousemove', handlePointerMove, eventOptions);
		window.addEventListener('mouseup', handlePointerUp, eventOptions);

		// Touch events
		window.addEventListener('touchstart', handlePointerDown, eventOptions);
		window.addEventListener('touchmove', handlePointerMove, eventOptions);
		window.addEventListener('touchend', handlePointerUp, eventOptions);
		window.addEventListener('touchcancel', handlePointerUp, eventOptions);

		// Wheel events
		window.addEventListener('wheel', handleWheel, { passive: false });

		// Animation frame update loop
		const updateLoop = () => {
			if (updateRef.current) {
				const newState = { ...stateRef.current };
				stateRef.current.wheelDelta = 0;
				setRenderState(newState);
				updateRef.current = false;
			}
			rafRef.current = requestAnimationFrame(updateLoop);
		};

		rafRef.current = requestAnimationFrame(updateLoop);

		// Cleanup function
		return () => {
			// Remove mouse events
			window.removeEventListener('mousedown', handlePointerDown);
			window.removeEventListener('mousemove', handlePointerMove);
			window.removeEventListener('mouseup', handlePointerUp);

			// Remove touch events
			window.removeEventListener('touchstart', handlePointerDown);
			window.removeEventListener('touchmove', handlePointerMove);
			window.removeEventListener('touchend', handlePointerUp);
			window.removeEventListener('touchcancel', handlePointerUp);

			// Remove wheel events
			window.removeEventListener('wheel', handleWheel);

			// Cancel animation frame
			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [handlePointerDown, handlePointerMove, handlePointerUp, handleWheel]);

	// Update wasDown state after render
	useEffect(() => {
		stateRef.current.wasDown = stateRef.current.isDown;
	}, [renderState.isDown]);

	return renderState;
}
