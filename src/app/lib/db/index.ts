import { logger } from '@/utils/logger';

import { NotionProvider } from './notion';
import type { DatabaseProvider, GalleryItem } from './types';

export { GalleryItem };

// Global singleton provider instance
let notionProvider: NotionProvider | null = null;

/**
 * Database Service - Provides a consistent interface for accessing data,
 * abstracting the underlying data source (currently Notion).
 * Manages a singleton instance of the data provider.
 */
class DatabaseService {
	private provider: DatabaseProvider;

	/**
	 * Initializes the service by getting the Notion provider instance.
	 */
	constructor() {
		this.provider = this.getNotionProvider();
	}

	/**
	 * Retrieves or lazily initializes the singleton Notion provider instance.
	 * Throws an error if initialization fails (e.g., missing env vars).
	 * @returns {DatabaseProvider} The initialized Notion provider.
	 * @throws {Error} If provider initialization fails.
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
	 * Retrieves all gallery items, optionally shuffled.
	 * Delegates to the underlying provider.
	 * @param {object} [options] - Options for retrieval.
	 * @param {boolean} [options.shuffle] - Whether to shuffle the results.
	 * @returns {Promise<GalleryItem[]>} A promise resolving to an array of gallery items.
	 */
	async getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]> {
		const items = await this.provider.getGalleryItems(options);
		return items; // Return items directly
	}

	/**
	 * Retrieves a single gallery item by its ID.
	 * Delegates to the underlying provider.
	 * @param {string} id - The ID of the gallery item.
	 * @returns {Promise<GalleryItem | null>} A promise resolving to the item or null if not found.
	 */
	async getGalleryItem(id: string): Promise<GalleryItem | null> {
		const item = await this.provider.getGalleryItem(id);

		// Return null if item not found by provider
		if (!item) return null;

		return item; // Return item directly
	}

	/**
	 * Searches gallery items based on a query string.
	 * Delegates to the provider's search method if available, otherwise performs a fallback client-side search.
	 * @param {string} query - The search query.
	 * @returns {Promise<GalleryItem[]>} A promise resolving to an array of matching gallery items.
	 */
	async searchGallery(query: string): Promise<GalleryItem[]> {
		let items: GalleryItem[];

		if (this.provider.searchGallery) {
			// Use provider's implementation if it exists
			items = await this.provider.searchGallery(query);
		} else {
			// Fallback: Case-insensitive client-side search on title and description.
			logger.warn('Provider does not implement searchGallery, using fallback.');
			items = await this.provider.getGalleryItems();
			const lowerQuery = query.toLowerCase();
			items = items.filter((item) => item.title.toLowerCase().includes(lowerQuery) || (item.description?.toLowerCase().includes(lowerQuery) ?? false));
		}

		return items; // Return items directly
	}
}

/** Export a singleton instance of the DatabaseService. */
export const db = new DatabaseService();

/**
 * Convenience function to get all gallery items.
 * @param {object} [options] - Options for retrieval.
 * @param {boolean} [options.shuffle] - Whether to shuffle the results.
 * @returns {Promise<GalleryItem[]>} A promise resolving to an array of gallery items.
 */
export async function getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]> {
	return db.getGalleryItems(options);
}

/**
 * Convenience function to get a specific gallery item by ID.
 * @param {string} id - The ID of the gallery item.
 * @returns {Promise<GalleryItem | null>} A promise resolving to the item or null if not found.
 */
export async function getGalleryItem(id: string): Promise<GalleryItem | null> {
	return db.getGalleryItem(id);
}

/**
 * Convenience function to search gallery items.
 * @param {string} query - The search query.
 * @returns {Promise<GalleryItem[]>} A promise resolving to an array of matching gallery items.
 */
export async function searchGallery(query: string): Promise<GalleryItem[]> {
	return db.searchGallery(query);
}
