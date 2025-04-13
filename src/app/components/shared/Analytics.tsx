'use client';

import type { ReactElement } from 'react';

import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/next';

/**
 * Vercel Analytics and Speed Insights component
 * Tracks user analytics and performance metrics without affecting UX
 *
 * @returns {ReactElement} Client component embedding Vercel tracking tools
 */
export default function Analytics(): ReactElement {
	return (
		<>
			<VercelAnalytics />
			<VercelSpeedInsights />
		</>
	);
}
