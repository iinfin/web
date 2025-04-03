import { BlockObjectResponse, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import { logger } from '@/utils/logger';

import { NotionProvider } from './notion';
import type { DatabaseProvider, GalleryItem } from './types';

export { GalleryItem };

// CDN host replacement configuration
const CDN_CONFIG = {
	// Set to true to enable URL replacement, false to use original URLs
	REPLACE_HOST: true,
	// Original host to replace
	ORIGINAL_HOST: 'storage.u29dc.com',
	// New CDN host
	NEW_HOST: 'u29dc.b-cdn.net',
	// Optional path prefix to add after the host (e.g., '/placeholder/')
	PATH_PREFIX: '/placeholder/',
};

// Global singleton provider instance
let notionProvider: NotionProvider | null = null;

/**
 * Utility function to replace the CDN host in media URLs
 * Converts original host URLs to new host URLs based on configuration
 */
export function replaceMediaHost(originalUrl?: string): string | undefined {
	// Return early if replacement is disabled or URL is undefined
	if (!CDN_CONFIG.REPLACE_HOST || !originalUrl) return originalUrl;

	// Check if it's a URL with the original host
	if (originalUrl.includes(CDN_CONFIG.ORIGINAL_HOST)) {
		// Extract the filename (everything after the last slash)
		const filename = originalUrl.split('/').pop();
		if (!filename) return originalUrl; // Safety check

		// Return the new CDN URL with the same filename
		return `https://${CDN_CONFIG.NEW_HOST}${CDN_CONFIG.PATH_PREFIX}${filename}`;
	}

	// Return the original URL if it doesn't match the pattern
	return originalUrl;
}

/**
 * Database Service - The main entry point for accessing data
 */
class DatabaseService {
	private provider: DatabaseProvider;

	constructor() {
		this.provider = this.getNotionProvider();
	}

	/**
	 * Get or create the Notion provider instance.
	 * Lazily initializes the provider on first access.
	 */
	private getNotionProvider(): DatabaseProvider {
		if (!notionProvider) {
			try {
				notionProvider = new NotionProvider();
			} catch (error) {
				logger.error('Failed to initialize Notion provider:', error);
				throw new Error('Failed to initialize database provider');
			}
		}
		return notionProvider;
	}

	/**
	 * Get all gallery items from Notion
	 */
	async getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]> {
		const items = await this.provider.getGalleryItems(options);

		// Process items to replace URLs with CDN URLs if enabled
		if (!CDN_CONFIG.REPLACE_HOST) return items;

		return items.map((item) => {
			const updatedItem = { ...item };
			if (updatedItem.url) {
				const newUrl = replaceMediaHost(updatedItem.url);
				if (newUrl) {
					updatedItem.url = newUrl;
				}
			}
			return updatedItem;
		});
	}

	/**
	 * Get a specific gallery item by ID
	 */
	async getGalleryItem(id: string): Promise<GalleryItem | null> {
		const item = await this.provider.getGalleryItem(id);

		// Return original item if replacement is disabled or item not found
		if (!CDN_CONFIG.REPLACE_HOST || !item) return item;

		// Process item to replace URL with CDN URL if item exists
		const updatedItem = { ...item };
		if (updatedItem.url) {
			const newUrl = replaceMediaHost(updatedItem.url);
			if (newUrl) {
				updatedItem.url = newUrl;
			}
		}
		return updatedItem;
	}

	/**
	 * Search gallery items using the provider's search method
	 */
	async searchGallery(query: string): Promise<GalleryItem[]> {
		let items: GalleryItem[];

		if (this.provider.searchGallery) {
			items = await this.provider.searchGallery(query);
		} else {
			// Fallback: Case-insensitive search on title and description.
			logger.warn('Provider does not implement searchGallery, using fallback.');
			items = await this.provider.getGalleryItems();
			const lowerQuery = query.toLowerCase();
			items = items.filter((item) => item.title.toLowerCase().includes(lowerQuery) || (item.description?.toLowerCase().includes(lowerQuery) ?? false));
		}

		// Return original items if replacement is disabled
		if (!CDN_CONFIG.REPLACE_HOST) return items;

		// Process items to replace URLs with CDN URLs
		return items.map((item) => {
			const updatedItem = { ...item };
			if (updatedItem.url) {
				const newUrl = replaceMediaHost(updatedItem.url);
				if (newUrl) {
					updatedItem.url = newUrl;
				}
			}
			return updatedItem;
		});
	}
}

// Export a singleton instance by default
export const db = new DatabaseService();

// Get gallery items (convenience function)
export async function getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]> {
	return db.getGalleryItems(options);
}

// Get a specific gallery item (convenience function)
export async function getGalleryItem(id: string): Promise<GalleryItem | null> {
	return db.getGalleryItem(id);
}

// Search gallery items (convenience function)
export async function searchGallery(query: string): Promise<GalleryItem[]> {
	return db.searchGallery(query);
}

// Function to query a specific database (example usage)
export async function queryDatabase(databaseId: string): Promise<PageObjectResponse[]> {
	try {
		// Implementation would go here
		return [];
	} catch (error) {
		logger.error(`Error querying database ${databaseId}:`, { error });
		return [];
	}
}

// Function to retrieve a specific page (example usage)
export async function retrievePage(pageId: string): Promise<PageObjectResponse | null> {
	try {
		// Implementation would go here
		return null;
	} catch (error) {
		logger.error(`Error retrieving page ${pageId}:`, { error });
		return null;
	}
}

// Function to retrieve block children (example usage)
export async function retrieveBlockChildren(blockId: string): Promise<BlockObjectResponse[]> {
	try {
		// Implementation would go here
		return [];
	} catch (error) {
		logger.error(`Error retrieving block children for block ${blockId}:`, { error });
		return [];
	}
}
