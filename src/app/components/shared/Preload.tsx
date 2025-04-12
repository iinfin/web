'use client';

import { useEffect } from 'react';

import ReactDOM from 'react-dom';

/**
 * CDN URL for asset loading.
 */
// const CDN_URL = 'https://storage.u29dc.com';

/**
 * Font files to preload.
 */
const FONT_FILES = [{ path: '/assets/fonts/PPNeueMontreal/PPNeueMontreal-Medium.woff2', type: 'font/woff2' }] as const;

/**
 * Critical images to preload.
 * Add any LCP (Largest Contentful Paint) images here to improve performance.
 */
const CRITICAL_IMAGES = [
	// Add your critical LCP images here
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
		// Handled in layout.tsx head directly
		// ReactDOM.prefetchDNS(CDN_URL);
		// ReactDOM.preconnect(CDN_URL, { crossOrigin: 'anonymous' });

		// Preload high-priority font files (only WOFF2 for modern browsers)
		FONT_FILES.forEach(({ path, type }) => {
			ReactDOM.preload(path, {
				as: 'font',
				type,
				fetchPriority: 'high',
			});
		});

		// Preload critical images with high priority
		CRITICAL_IMAGES.forEach((path) => {
			ReactDOM.preload(path, {
				as: 'image',
				fetchPriority: 'high',
			});
		});
	}, []); // Run only once on mount

	// This component doesn't render anything
	return null;
}
