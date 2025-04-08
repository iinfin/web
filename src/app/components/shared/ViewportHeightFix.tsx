'use client';

import { useEffect } from 'react';

/**
 * Client component that fixes the 100vh issue on mobile browsers like Safari
 * by setting a CSS custom property (--vh) to the actual viewport height.
 *
 * @returns null - This component doesn't render anything visible
 */
export default function ViewportHeightFix(): null {
	useEffect(() => {
		// Set the --vh CSS variable to the true viewport height
		function setVhVariable() {
			const vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty('--vh', `${vh}px`);
		}

		// Set on initial load
		setVhVariable();

		// Update on resize or orientation change
		window.addEventListener('resize', setVhVariable);
		window.addEventListener('orientationchange', setVhVariable);

		// Clean up event listeners on unmount
		return () => {
			window.removeEventListener('resize', setVhVariable);
			window.removeEventListener('orientationchange', setVhVariable);
		};
	}, []);

	return null;
}
