import type { Metadata, Viewport } from 'next';

// Define specific image types to replace 'any'
type OpenGraphImage = {
	url: string;
	alt?: string;
	width?: number;
	height?: number;
	type?: string;
};

type TwitterImage = {
	url: string;
	alt?: string;
	width?: number;
	height?: number;
	type?: string;
};

/**
 * Site metadata constants
 */
const SITE = {
	title: 'Incomplete Infinity (@U29DC)',
	name: 'U29DC',
	description: 'Incomplete Infinity is an evolving, multifaceted creative practice working with companies and institutions in pursuit of a better future.',
	url: 'https://u29dc.com',
	locale: 'en_GB',
	type: 'website',
	themeColor: '#000000',
	keywords: ['Incomplete Infinity', 'U29DC', 'Creative Practice', 'Design', 'Technology'] as string[],
	creator: '@U29DC',
} as const;

/**
 * Shared image metadata used across OG and Twitter
 */
const sharedImages = [
	{
		url: `${SITE.url}/assets/meta/cover.png`,
		alt: SITE.name,
		width: 1200,
		height: 630,
		type: 'image/png',
	},
] as const;

/**
 * Viewport configuration
 */
export const viewport: Viewport = {
	themeColor: SITE.themeColor,
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	colorScheme: 'dark light',
};

/**
 * Primary metadata configuration for Next.js
 */
const MetadataTemplate: Metadata = {
	metadataBase: new URL(SITE.url),

	// Basic metadata
	title: {
		default: SITE.title,
		template: `%s | ${SITE.title}`,
	},
	description: SITE.description,
	applicationName: SITE.name,
	authors: [{ name: SITE.name, url: SITE.url }],
	keywords: SITE.keywords as unknown as string[],
	referrer: 'origin-when-cross-origin',
	creator: SITE.name,
	publisher: SITE.name,
	category: 'creative',
	classification: 'Business',

	// Open Graph metadata
	openGraph: {
		title: SITE.title,
		description: SITE.description,
		url: SITE.url,
		siteName: SITE.name,
		images: sharedImages as unknown as OpenGraphImage[],
		locale: SITE.locale,
		type: SITE.type,
	},

	// Twitter metadata
	twitter: {
		title: SITE.title,
		card: 'summary_large_image',
		description: SITE.description,
		creator: SITE.creator,
		images: sharedImages as unknown as TwitterImage[],
	},

	// Icons metadata
	icons: {
		shortcut: '/assets/meta/favicon.ico',
		apple: [
			{
				url: '/assets/meta/apple-touch-icon.png',
				sizes: '180x180',
				type: 'image/png',
			},
		],
		icon: [
			{
				url: '/assets/meta/favicon-16x16.png',
				sizes: '16x16',
				type: 'image/png',
			},
			{
				url: '/assets/meta/favicon-32x32.png',
				sizes: '32x32',
				type: 'image/png',
			},
			{
				url: '/assets/meta/favicon-192x192.png',
				sizes: '192x192',
				type: 'image/png',
			},
			{
				url: '/assets/meta/favicon-512x512.png',
				sizes: '512x512',
				type: 'image/png',
			},
		],
		other: [
			{
				rel: 'mask-icon',
				url: '/assets/meta/safari-pinned-tab.svg',
				color: SITE.themeColor,
			},
		],
	},

	// Web manifest
	manifest: '/assets/meta/site.webmanifest',

	// Apple-specific metadata
	appleWebApp: {
		title: SITE.title,
		statusBarStyle: 'black-translucent',
		startupImage: [
			{
				url: '/assets/meta/apple-splash-2048-2732.png',
				media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
			},
			{
				url: '/assets/meta/apple-splash-1668-2388.png',
				media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)',
			},
			{
				url: '/assets/meta/apple-splash-1536-2048.png',
				media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)',
			},
			{
				url: '/assets/meta/apple-splash-1125-2436.png',
				media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
			},
		],
	},

	// Device detection handling
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},

	// Search engine directives
	robots: {
		index: true,
		follow: true,
		nocache: false,
		googleBot: {
			'index': true,
			'follow': true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},

	// Site verification
	verification: {
		google: '',
		other: {},
	},

	// Alternative references
	alternates: {
		canonical: SITE.url,
	},
};

export default MetadataTemplate;
