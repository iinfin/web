import { type Viewport } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';

import ContextMenuDisabler from '@/components/shared/ContextMenuDisabler';
import Cursor from '@/components/shared/Cursor';
// import FilmGrain from '@/components/shared/FilmGrain';
import MetadataTemplate from '@/components/shared/Metadata';
import Preload from '@/components/shared/Preload';
import ViewportHeightFix from '@/components/shared/ViewportHeightFix';

import Analytics from '@/app/components/shared/Analytics';
import { CursorProvider } from '@/hooks/useCursor';

// import { FilmGrainProvider } from '@/hooks/useFilmGrain';

import './styles/global.css';

export const metadata = MetadataTemplate;

// Tell browsers to preconnect to essential domains
export function generateViewport(): Viewport {
	return {
		themeColor: '#ffffff',
		width: 'device-width',
		initialScale: 1,
		viewportFit: 'cover',
	};
}

/**
 * Root layout component for the application.
 * Configures HTML structure, global styles, context providers, and essential elements.
 * Wraps all pages with consistent visual elements and interaction behaviors.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Page content to render within the layout
 * @returns {Promise<JSX.Element>} The configured root layout
 */
export default async function RootLayout({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
	// Get nonce for Content Security Policy from headers injected by middleware
	const nonce = (await headers()).get('x-nonce');

	return (
		<html lang="en" className="scroll-smooth">
			<head>
				<link rel="dns-prefetch" href="https://storage.u29dc.com" />
				<link rel="preconnect" href="https://storage.u29dc.com" crossOrigin="anonymous" />
				<Preload />
			</head>
			<body className="bg-white-x1 text-black-x1 dark:bg-black-x2 dark:text-white-x1 min-h-real-screen uppercase">
				{/* Mobile Viewport Height Fix */}
				<ViewportHeightFix />

				{/* Main Content Area */}
				<main id="main-content" className="relative h-full w-full">
					{children}
				</main>

				{/* Visual Effects */}
				{/* <FilmGrainProvider initialSettings={{ intensity: 0.5, scale: 0.5, speed: 0.15 }}>
					<FilmGrain />
				</FilmGrainProvider> */}

				{/* Interactive Elements */}
				<CursorProvider>
					<Cursor />
				</CursorProvider>

				{/* Interaction Behaviors */}
				<ContextMenuDisabler />

				{/* Analytics and Performance Tracking */}
				<Analytics />

				{/* Dummy Script to get CSP nonce working - use afterInteractive to avoid blocking */}
				{nonce && <Script src="/assets/scripts/empty.js" strategy="afterInteractive" nonce={nonce} />}
			</body>
		</html>
	);
}
