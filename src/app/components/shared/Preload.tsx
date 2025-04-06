'use client';

import { useEffect } from 'react';

import ReactDOM from 'react-dom';

const CDN_URL = 'https://cdn.u29dc.com';

const FONT_FILES = [
	{ path: '/assets/fonts/PPNeueMontreal/PPNeueMontreal-Medium.woff2', type: 'font/woff2' },
	{ path: '/assets/fonts/PPNeueMontreal/PPNeueMontreal-Medium.woff', type: 'font/woff' },
	{ path: '/assets/fonts/PPNeueMontreal/PPNeueMontreal-Medium.otf', type: 'font/otf' },
] as const;

const CRITICAL_IMAGES = [
	// No critical images currently listed for preload
] as const;

/**
 * Preloads critical assets like fonts and key images using React DOM APIs.
 * Also hints the browser to preconnect to the CDN.
 * Renders null as it only performs side effects on mount.
 */
export default function Preload() {
	useEffect(() => {
		// Hint the browser to establish early connections to the CDN.
		ReactDOM.prefetchDNS(CDN_URL);
		ReactDOM.preconnect(CDN_URL, { crossOrigin: 'anonymous' });

		// Preload font files.
		FONT_FILES.forEach(({ path, type }) => {
			ReactDOM.preload(path, { as: 'font', type });
		});

		// Preload critical images (e.g., above-the-fold, favicons).
		CRITICAL_IMAGES.forEach((path) => {
			ReactDOM.preload(path, { as: 'image' });
		});
	}, []); // Run only once on mount

	return null; // This component doesn't render anything itself
}
