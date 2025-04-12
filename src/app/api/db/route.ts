// src/app/api/db/route.ts // Renamed from gallery
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

import { fetchPublishedGalleryItemsFromNotion } from '@/lib/db/notion';
import type { GalleryItem } from '@/lib/db/types';
import { logger } from '@/lib/utils/logger';

// Define a cache key generator function - Adjusted for generic db endpoint
const getDbCacheKey = () => ['notion', 'db', 'gallery', 'published'];

// Create a cached version of the fetch function
const getCachedGalleryItems = unstable_cache(
	async (): Promise<GalleryItem[]> => {
		logger.info('Cache miss: Fetching published gallery items from Notion for /api/db...');
		try {
			const items = await fetchPublishedGalleryItemsFromNotion();
			logger.info(`Fetched ${items.length} items from Notion for /api/db caching.`);
			return items;
		} catch (error) {
			logger.error('Failed to fetch gallery items from Notion in /api/db cached function:', { error });
			// Return empty array on error to prevent breaking the cache layer,
			// but log the error for investigation.
			return [];
		}
	},
	getDbCacheKey(), // Use the new key generator
	{
		revalidate: 3600, // Revalidate cache every 1 hour
		tags: ['notion', 'db', 'gallery'], // Adjusted tags for potential on-demand revalidation
	},
);

/**
 * GET handler for the db API route (fetching gallery items).
 * Fetches published gallery items, utilizing caching.
 */
export async function GET(): Promise<NextResponse> {
	try {
		logger.info('API route /api/db called (fetching gallery)');
		const items = await getCachedGalleryItems();
		logger.info(`Returning ${items.length} items from API route /api/db`);
		return NextResponse.json(items);
	} catch (error) {
		logger.error('Error in /api/db GET handler:', { error });
		// Return a generic server error response
		return NextResponse.json({ error: 'Failed to fetch gallery items' }, { status: 500 });
	}
}

// Optional: Force dynamic rendering for this route if needed,
// although unstable_cache should handle staleness.
// export const dynamic = 'force-dynamic';
