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

const initialVector: Vector2 = { x: 0, y: 0 };

const initialState: InputState = {
	pixel: { ...initialVector },
	prevPixel: { ...initialVector },
	deltaPixel: { ...initialVector },
	normalized: { ...initialVector },
	prevNormalized: { ...initialVector },
	deltaNormalized: { ...initialVector },
	downPixel: { ...initialVector },
	downNormalized: { ...initialVector },
	isDown: false,
	wasDown: false,
	wheelDelta: 0,
	lastWheelTime: 0,
	downTime: 0,
};

// Helper to get clientX/Y from mouse or touch events
function getEventClientCoords(event: MouseEvent | TouchEvent): Vector2 {
	if (window.TouchEvent && event instanceof TouchEvent) {
		// Use the first changed touch for up/down, or first touch for move
		const touch = event.changedTouches?.[0] ?? event.touches?.[0];
		return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
	}
	// MouseEvent
	const mouseEvent = event as MouseEvent;
	return { x: mouseEvent.clientX, y: mouseEvent.clientY };
}

/**
 * Hook to track raw mouse, touch, and wheel input state globally.
 * Attaches event listeners to the window.
 * @returns The current input state.
 */
export function useInputState(): InputState {
	// Using refs for state that updates frequently within event listeners
	// to avoid triggering re-renders on every pixel change.
	// The final state update happens in an animation frame.
	const stateRef = useRef<InputState>(initialState);
	const rafRef = useRef<number | null>(null);
	const hasPendingUpdate = useRef(false);

	// State that *does* trigger re-render when changed, managed by RAF.
	const [renderState, setRenderState] = useState<InputState>(initialState);

	// --- Event Handlers ---

	const handlePointerDown = useCallback((event: MouseEvent | TouchEvent) => {
		const coords = getEventClientCoords(event);
		const now = Date.now();
		const normalizedCoords = {
			x: (coords.x / window.innerWidth) * 2 - 1,
			y: 1 - (coords.y / window.innerHeight) * 2, // Invert Y
		};

		stateRef.current = {
			...stateRef.current,
			pixel: { ...coords },
			prevPixel: { ...coords }, // Reset prev on down
			deltaPixel: { ...initialVector },
			normalized: { ...normalizedCoords },
			prevNormalized: { ...normalizedCoords }, // Reset prev on down
			deltaNormalized: { ...initialVector },
			downPixel: { ...coords },
			downNormalized: { ...normalizedCoords },
			isDown: true,
			wasDown: stateRef.current.isDown, // Capture previous state before update
			downTime: now,
		};
		hasPendingUpdate.current = true;
	}, []);

	const handlePointerMove = useCallback((event: MouseEvent | TouchEvent) => {
		const coords = getEventClientCoords(event);
		const normalizedCoords = {
			x: (coords.x / window.innerWidth) * 2 - 1,
			y: 1 - (coords.y / window.innerHeight) * 2, // Invert Y
		};

		// Calculate deltas based on the *previous* state in the ref
		const deltaPixel = {
			x: coords.x - stateRef.current.pixel.x,
			y: coords.y - stateRef.current.pixel.y,
		};
		const deltaNormalized = {
			x: normalizedCoords.x - stateRef.current.normalized.x,
			y: normalizedCoords.y - stateRef.current.normalized.y,
		};

		stateRef.current = {
			...stateRef.current,
			// Update previous state before setting current
			prevPixel: { ...stateRef.current.pixel },
			prevNormalized: { ...stateRef.current.normalized },
			// Set current state
			pixel: { ...coords },
			normalized: { ...normalizedCoords },
			deltaPixel,
			deltaNormalized,
		};
		hasPendingUpdate.current = true;
	}, []);

	const handlePointerUp = useCallback((event: MouseEvent | TouchEvent) => {
		// Update final position before setting isDown to false
		const coords = getEventClientCoords(event);
		const normalizedCoords = {
			x: (coords.x / window.innerWidth) * 2 - 1,
			y: 1 - (coords.y / window.innerHeight) * 2, // Invert Y
		};
		const deltaPixel = {
			x: coords.x - stateRef.current.pixel.x,
			y: coords.y - stateRef.current.pixel.y,
		};
		const deltaNormalized = {
			x: normalizedCoords.x - stateRef.current.normalized.x,
			y: normalizedCoords.y - stateRef.current.normalized.y,
		};

		stateRef.current = {
			...stateRef.current,
			prevPixel: { ...stateRef.current.pixel },
			prevNormalized: { ...stateRef.current.normalized },
			pixel: { ...coords },
			normalized: { ...normalizedCoords },
			deltaPixel,
			deltaNormalized,
			isDown: false,
			wasDown: stateRef.current.isDown, // Capture previous state
			// Reset deltas related to 'down' state? Optional, depends on need.
			// deltaDownPixel: { ...initialVector },
			// deltaDownNormalized: { ...initialVector },
		};
		hasPendingUpdate.current = true;
	}, []);

	const handleWheel = useCallback((event: WheelEvent) => {
		// Normalize wheel event data (simplified version)
		let deltaY = event.deltaY;
		// Adjust based on deltaMode if necessary (e.g., line vs pixel scrolling)
		if (event.deltaMode === 1) {
			// LINE mode
			deltaY *= 16; // Approximate pixels per line
		} else if (event.deltaMode === 2) {
			// PAGE mode
			deltaY *= window.innerHeight * 0.8; // Approximate pixels per page
		}

		// Accumulate delta for the frame
		stateRef.current.wheelDelta += deltaY;
		stateRef.current.lastWheelTime = Date.now();
		hasPendingUpdate.current = true;
		// Note: We don't preventDefault here, allow native scroll unless needed
	}, []);

	// --- Effect for Event Listeners and RAF ---

	useEffect(() => {
		const opts = { passive: true }; // Use passive where possible

		// Mouse events
		window.addEventListener('mousedown', handlePointerDown, opts);
		window.addEventListener('mousemove', handlePointerMove, opts);
		window.addEventListener('mouseup', handlePointerUp, opts);

		// Touch events
		window.addEventListener('touchstart', handlePointerDown, opts);
		window.addEventListener('touchmove', handlePointerMove, opts);
		window.addEventListener('touchend', handlePointerUp, opts);
		window.addEventListener('touchcancel', handlePointerUp, opts); // Treat cancel like up

		// Wheel events
		window.addEventListener('wheel', handleWheel, { passive: false }); // Often need non-passive for preventDefault if used

		// Animation frame loop to update render state
		const updateLoop = () => {
			if (hasPendingUpdate.current) {
				// Capture the current ref state
				const newState = { ...stateRef.current };
				// Reset frame-specific deltas (wheelDelta) before setting state
				stateRef.current.wheelDelta = 0;
				// Update the state that triggers re-renders
				setRenderState(newState);
				hasPendingUpdate.current = false;
			}
			rafRef.current = requestAnimationFrame(updateLoop);
		};

		rafRef.current = requestAnimationFrame(updateLoop);

		// Cleanup
		return () => {
			window.removeEventListener('mousedown', handlePointerDown);
			window.removeEventListener('mousemove', handlePointerMove);
			window.removeEventListener('mouseup', handlePointerUp);
			window.removeEventListener('touchstart', handlePointerDown);
			window.removeEventListener('touchmove', handlePointerMove);
			window.removeEventListener('touchend', handlePointerUp);
			window.removeEventListener('touchcancel', handlePointerUp);
			window.removeEventListener('wheel', handleWheel);

			if (rafRef.current) {
				cancelAnimationFrame(rafRef.current);
			}
		};
	}, [handlePointerDown, handlePointerMove, handlePointerUp, handleWheel]);

	// Update wasDown state *after* the main state update but before next render cycle
	useEffect(() => {
		stateRef.current.wasDown = stateRef.current.isDown;
	}, [renderState.isDown]); // Update wasDown based on the rendered isDown state

	return renderState;
}
