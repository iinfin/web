import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Represents a Content Security Policy directive with a name and allowed values
 */
type CspDirective = {
	name: string;
	values: string[];
};

/**
 * Generates a Content Security Policy string and nonce for the application
 * @returns {object} Object containing CSP header string and the generated nonce
 */
export function generateCsp(): { cspHeader: string; nonce: string } {
	// Generate a cryptographically secure nonce
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

	const cspDirectives: CspDirective[] = [
		{ name: 'base-uri', values: ["'self'"] },
		{
			name: 'connect-src',
			values: ["'self'", 'https://*.vercel.app', 'https://storage.u29dc.com', ...(process.env.NODE_ENV === 'development' ? ['ws://*', 'wss://*'] : []), 'https://*'].flat().filter(Boolean),
		},
		{ name: 'default-src', values: ["'self'"] },
		{ name: 'font-src', values: ["'self'", 'https:', 'data:'] },
		{ name: 'form-action', values: ["'self'"] },
		{ name: 'frame-ancestors', values: ["'none'"] },
		{ name: 'frame-src', values: ["'self'"] },
		{ name: 'img-src', values: ["'self'", 'data:', 'blob:', 'https:', 'cdn.u29dc.com', 'storage.u29dc.com'] },
		{ name: 'manifest-src', values: ["'self'"] },
		{ name: 'media-src', values: ["'self'", 'https:', 'cdn.u29dc.com', 'storage.u29dc.com'] },
		{ name: 'object-src', values: ["'none'"] },
		{ name: 'report-to', values: ['csp-endpoint'] },
		{ name: 'report-uri', values: ['https://csp-reporting.cloudflare.com/cdn-cgi/script_monitor/report'] },
		{
			name: 'script-src',
			values: ["'self'", `'nonce-${nonce}'`, ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'", "'unsafe-inline'"] : []), 'https:'],
		},
		{
			name: 'style-src',
			values: ["'self'", "'unsafe-inline'", `'nonce-${nonce}'`],
		},
		{ name: 'worker-src', values: ["'self'", 'blob:'] },
	];

	const cspHeader = cspDirectives
		.map((directive) => `${directive.name} ${directive.values.join(' ')}`)
		.join('; ')
		.concat('; upgrade-insecure-requests')
		.trim();

	return { cspHeader, nonce };
}

/**
 * Middleware function for Next.js requests
 * Adds security headers including CSP to all non-API routes
 * @param {NextRequest} request - The incoming request object
 * @returns {NextResponse} The modified response with security headers
 */
export function middleware(request: NextRequest) {
	const { cspHeader, nonce } = generateCsp();

	const mwRequestHeaders = new Headers(request.headers);
	mwRequestHeaders.set('content-security-policy', cspHeader);
	mwRequestHeaders.set('x-nonce', nonce);

	const mwResponse = NextResponse.next({ request: { headers: mwRequestHeaders } });
	const path = request.nextUrl.pathname;

	mwResponse.headers.set('content-security-policy', cspHeader);

	if (!path.startsWith('/api')) {
		mwResponse.headers.set('x-xss-protection', '1; mode=block');
		mwResponse.headers.set('x-frame-options', 'deny');
		mwResponse.headers.set('permissions-policy', ['autoplay=()', 'fullscreen=()', 'picture-in-picture=()'].join(', '));
	}

	mwResponse.headers.set('strict-transport-security', 'max-age=31557600; includeSubDomains; preload');
	mwResponse.headers.set('x-content-type-options', 'nosniff');
	mwResponse.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	mwResponse.headers.set('vary', 'Accept-Encoding');

	return mwResponse;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for:
		 * - API routes: (/api)
		 * - Static assets: (_next/static, _next/image)
		 * - Favicons: (favicon.ico)
		 */
		'/((?!api|_next/static|_next/image|favicon.ico).*)',
	],
};
