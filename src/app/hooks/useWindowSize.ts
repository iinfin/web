'use client';

// This hook uses useState and useEffect, must be a client component hook
import { useEffect, useState } from 'react';

type WindowSize = {
	width: number | undefined;
	height: number | undefined;
};

/**
 * Custom hook to track window dimensions.
 * @returns An object containing the current window width and height.
 *          Returns undefined for width/height during server-side rendering
 *          or before the initial client-side mount.
 */
export function useWindowSize(): WindowSize {
	const [windowSize, setWindowSize] = useState<WindowSize>({
		width: undefined,
		height: undefined,
	});

	useEffect(() => {
		// Handler to call on window resize
		function handleResize() {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		}

		// Add event listener
		window.addEventListener('resize', handleResize);

		// Call handler right away so state gets updated with initial window size
		handleResize();

		// Remove event listener on cleanup
		return () => window.removeEventListener('resize', handleResize);
	}, []); // Empty array ensures effect is only run on mount and unmount

	return windowSize;
}
