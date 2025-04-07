'use client';

import { useEffect } from 'react';

import ReactDOM from 'react-dom';

/**
 * CDN URL for asset loading.
 */
const CDN_URL = 'https://storage.u29dc.com';

/**
 * Font files to preload.
 */
const FONT_FILES = [
	{ path: '/assets/fonts/PPNeueMontreal/PPNeueMontreal-Medium.woff2', type: 'font/woff2' },
	{ path: '/assets/fonts/PPNeueMontreal/PPNeueMontreal-Medium.woff', type: 'font/woff' },
	{ path: '/assets/fonts/PPNeueMontreal/PPNeueMontreal-Medium.otf', type: 'font/otf' },
] as const;

/**
 * Critical images to preload.
 */
const CRITICAL_IMAGES = [
	// No critical images currently listed for preload
] as const;

/**
 * Preloads critical assets like fonts and key images using React DOM APIs.
 * Hints the browser to preconnect to the CDN and prefetch DNS.
 *
 * @returns null - This component doesn't render any visible UI.
 */
export default function Preload(): null {
	// Setup asset preloading effect
	useEffect(() => {
		// Establish early connections to the CDN
		ReactDOM.prefetchDNS(CDN_URL);
		ReactDOM.preconnect(CDN_URL, { crossOrigin: 'anonymous' });

		// Preload font files
		FONT_FILES.forEach(({ path, type }) => {
			ReactDOM.preload(path, { as: 'font', type });
		});

		// Preload critical images
		CRITICAL_IMAGES.forEach((path) => {
			ReactDOM.preload(path, { as: 'image' });
		});
	}, []); // Run only once on mount

	// This component doesn't render anything
	return null;
}
