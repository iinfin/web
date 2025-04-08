'use client';

// This hook uses useState and useEffect, must be a client component hook
import { useEffect, useState } from 'react';

/**
 * Represents the dimensions of the browser window.
 */
type WindowSize = {
	width: number | undefined;
	height: number | undefined;
};

/**
 * Initial window size state with undefined dimensions.
 * Used before client-side measurement is available.
 */
const initialSize: WindowSize = {
	width: undefined,
	height: undefined,
};

/**
 * Custom hook to track window dimensions.
 * @returns An object containing the current window width and height.
 *          Returns undefined for width/height during server-side rendering
 *          or before the initial client-side mount.
 */
export function useWindowSize(): WindowSize {
	// State to store window dimensions
	const [windowSize, setWindowSize] = useState<WindowSize>(initialSize);

	// Effect to measure and track window size
	useEffect(() => {
		// Update window size in state
		function handleResize() {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		}

		// Register resize event listener
		window.addEventListener('resize', handleResize);

		// Initialize with current window size
		handleResize();

		// Cleanup function
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return windowSize;
}
