import type { NextConfig } from 'next';

import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
	enabled: process.env['ANALYZE'] === 'true',
});

const nextConfig: NextConfig = {
	reactStrictMode: true,
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'storage.u29dc.com',
				port: '',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: 'u29dc.b-cdn.net',
				port: '',
				pathname: '/**',
			},
		],
	},
};

export default bundleAnalyzer(nextConfig);
