import type { FC } from 'react';

import CreationContent from '@/components/sections/CreationContent';

// Import the shuffling function
import { shuffleArrayWithSeed } from '@/lib/db/notion';
import type { GalleryItem } from '@/lib/db/types';
import { logger } from '@/lib/utils/logger';

// Helper function to fetch data from the API route
async function fetchGalleryData(): Promise<GalleryItem[]> {
	try {
		// Use the absolute URL for server-side fetch. Check if running in dev with HTTPS.
		const protocol = process.env.NODE_ENV === 'development' ? 'https' : 'http';
		const host = process.env['HOST'] || 'localhost:3000'; // Use HOST if set, else default
		let baseUrl = `${protocol}://${host}`;

		// Override with NEXT_PUBLIC_BASE_URL if it's explicitly set (useful for production/preview)
		if (process.env['NEXT_PUBLIC_BASE_URL']) {
			baseUrl = process.env['NEXT_PUBLIC_BASE_URL'];
		}

		// Update the API path to /api/db
		const apiUrl = `${baseUrl}/api/db`;
		logger.info(`Fetching gallery data from: ${apiUrl}`);

		// Allow default Next.js fetch caching
		const response = await fetch(apiUrl /* { cache: 'no-store' } */);

		if (!response.ok) {
			logger.error(`API request failed with status ${response.status}: ${response.statusText}`, {
				apiUrl,
				responseBody: await response.text(),
			});
			throw new Error(`Failed to fetch gallery data: ${response.statusText}`);
		}

		const items = (await response.json()) as GalleryItem[];
		logger.info(`Successfully fetched ${items.length} items from API.`);
		return items;
	} catch (error) {
		logger.error('Error fetching gallery data from API route:', { error });
		return []; // Return empty array on error to prevent breaking the page
	}
}

/**
 * Creation section component.
 * Loads the client component for the interactive 3D gallery display.
 * Fetches data from the /api/db endpoint and shuffles it.
 * @returns {Promise<JSX.Element>} The rendered creation section.
 */
const Creation: FC = async (): Promise<JSX.Element> => {
	// Fetch gallery items from the API endpoint
	const fetchedItems: GalleryItem[] = await fetchGalleryData();

	// Shuffle the fetched items for variety on each page load
	const seed = Math.floor(Math.random() * 10000);
	const galleryItems: GalleryItem[] = shuffleArrayWithSeed(fetchedItems, seed);

	return (
		<section id="creation" className="relative h-full w-full overflow-hidden">
			<CreationContent galleryItems={galleryItems} />
		</section>
	);
};

export default Creation;
