import type { NextConfig } from 'next';

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

export default nextConfig;
