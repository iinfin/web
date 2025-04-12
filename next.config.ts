import type { NextConfig } from 'next';

import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
	enabled: process.env['ANALYZE'] === 'true',
});

const nextConfig: NextConfig = {
	reactStrictMode: true,
	compress: true,
	poweredByHeader: false,
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'storage.u29dc.com',
				port: '',
				pathname: '/**',
			},
		],
		formats: ['image/avif', 'image/webp'],
		minimumCacheTTL: 60 * 60 * 24 * 7,
	},
	staticPageGenerationTimeout: 120,
	experimental: {
		optimizeCss: {
			beasties: {
				preload: 'swap',
				inlineFonts: false,
				preloadFonts: true,
				pruneSource: true,
			},
		},
		optimizePackageImports: ['framer-motion', '@react-three/drei', '@react-three/fiber', 'three'],
	},
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=3600, must-revalidate',
					},
				],
			},
			{
				source: '/assets/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
			{
				source: '/_next/static/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'public, max-age=31536000, immutable',
					},
				],
			},
		];
	},
};

export default bundleAnalyzer(nextConfig);
