import { BlockObjectResponse, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import { logger } from '@/utils/logger';

import { NotionProvider } from './notion';
import type { DatabaseProvider, GalleryItem } from './types';

export { GalleryItem };

// Global singleton provider instance
let notionProvider: NotionProvider | null = null;

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
		return this.provider.getGalleryItems(options);
	}

	/**
	 * Get a specific gallery item by ID
	 */
	async getGalleryItem(id: string): Promise<GalleryItem | null> {
		return this.provider.getGalleryItem(id);
	}

	/**
	 * Search gallery items using the provider's search method
	 */
	async searchGallery(query: string): Promise<GalleryItem[]> {
		if (this.provider.searchGallery) {
			return this.provider.searchGallery(query);
		}

		// Fallback: Case-insensitive search on title and description.
		logger.warn('Provider does not implement searchGallery, using fallback.');
		const items = await this.provider.getGalleryItems();
		const lowerQuery = query.toLowerCase();
		return items.filter((item) => item.title.toLowerCase().includes(lowerQuery) || (item.description?.toLowerCase().includes(lowerQuery) ?? false));
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
		// Replace console.error with logger.error
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
		// Replace console.error with logger.error
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
		// Replace console.error with logger.error
		logger.error(`Error retrieving block children for block ${blockId}:`, { error });
		return [];
	}
}
