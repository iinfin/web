import { headers } from 'next/headers';
import Script from 'next/script';

import Cursor from '@/components/shared/Cursor';
import MetadataTemplate from '@/components/shared/Metadata';
import Preload from '@/components/shared/Preload';

import { CursorProvider } from '@/app/context/CursorContext';

import './styles/global.css';

export const metadata = MetadataTemplate;

/**
 * Root layout component for the application.
 * Sets up HTML structure, global styles, providers, and essential scripts.
 *
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - Page content to render within the layout.
 * @returns {JSX.Element} The root layout structure.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }): Promise<JSX.Element> {
	// Get nonce for CSP from headers injected by middleware
	const nonce = (await headers()).get('x-nonce');

	return (
		<html lang="en" className="scroll-smooth">
			<head>
				<Preload />
			</head>
			<body className="bg-white-x1 text-black-x1 dark:bg-black-x2 dark:text-white-x1 min-h-screen uppercase">
				<main id="main-content" className="relative h-full w-full">
					{children}
				</main>

				{/* <div id="noise-overlay" className="pointer-events-none fixed inset-0 z-10 h-[200%] w-[200%] overflow-hidden opacity-10" /> */}

				<CursorProvider>
					<Cursor />
				</CursorProvider>

				{/* Analytics script with nonce for CSP compliance */}
				{nonce && <Script src="https://www.googletagmanager.com/gtag/js" strategy="afterInteractive" nonce={nonce} />}
			</body>
		</html>
	);
}
