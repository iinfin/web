import { headers } from 'next/headers';
import Script from 'next/script';

import ContextMenuDisabler from '@/components/shared/ContextMenuDisabler';
import Cursor from '@/components/shared/Cursor';
import FilmGrain from '@/components/shared/FilmGrain';
import MetadataTemplate from '@/components/shared/Metadata';
import Preload from '@/components/shared/Preload';

import { CursorProvider } from '@/app/context/CursorContext';
import { FilmGrainProvider } from '@/app/context/FilmGrainContext';

import './styles/global.css';

export const metadata = MetadataTemplate;

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
				<Preload />
			</head>
			<body className="bg-white-x1 text-black-x1 dark:bg-black-x2 dark:text-white-x1 min-h-screen uppercase">
				{/* Main Content Area */}
				<main id="main-content" className="relative h-full w-full">
					{children}
				</main>

				{/* Visual Effects */}
				<FilmGrainProvider initialSettings={{ intensity: 0.5, scale: 0.5, speed: 0.15 }}>
					<FilmGrain />
				</FilmGrainProvider>

				{/* Interactive Elements */}
				<CursorProvider>
					<Cursor />
				</CursorProvider>

				{/* Interaction Behaviors */}
				<ContextMenuDisabler />

				{/* Analytics (CSP Protected) */}
				{nonce && <Script src="https://www.googletagmanager.com/gtag/js" strategy="afterInteractive" nonce={nonce} />}
			</body>
		</html>
	);
}
