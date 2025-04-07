'use client';

import { useEffect } from 'react';

/**
 * Client component that disables the native browser right-click context menu globally.
 * Uses a side-effect to prevent the default context menu behavior.
 * Returns null as it doesn't render any visible UI elements.
 */
export default function ContextMenuDisabler(): null {
	// Setup effect to manage context menu event
	useEffect(() => {
		// Event handler to prevent default context menu
		const handleContextMenu = (event: MouseEvent) => {
			event.preventDefault();
		};

		// Register context menu event listener
		document.addEventListener('contextmenu', handleContextMenu);

		// Cleanup function
		return () => {
			document.removeEventListener('contextmenu', handleContextMenu);
		};
	}, []); // Empty dependency array ensures this effect runs only once on mount

	// This component doesn't render anything
	return null;
}
