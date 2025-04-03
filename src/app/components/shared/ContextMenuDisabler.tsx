'use client';

import { useEffect } from 'react';

/**
 * Client component that disables the right-click context menu globally.
 */
const ContextMenuDisabler: React.FC = () => {
	useEffect(() => {
		const handleContextMenu = (event: MouseEvent) => {
			event.preventDefault();
		};

		document.addEventListener('contextmenu', handleContextMenu);

		// Cleanup function to remove the event listener when the component unmounts
		return () => {
			document.removeEventListener('contextmenu', handleContextMenu);
		};
	}, []); // Empty dependency array ensures this effect runs only once on mount

	// This component doesn't render anything itself
	return null;
};

export default ContextMenuDisabler;
