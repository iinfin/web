import { logger } from '@/lib/utils/logger';

import { NotionProvider } from './notion';
import type { DatabaseProvider, GalleryItem } from './types';

export { GalleryItem };

// Global singleton provider instance
let notionProvider: NotionProvider | null = null;

/**
 * Database Service
 * Provides a unified interface for data access with provider abstraction
 */
class DatabaseService {
	private provider: DatabaseProvider;

	/**
	 * Creates service instance with configured data provider
	 */
	constructor() {
		this.provider = this.getNotionProvider();
	}

	/**
	 * Retrieves or initializes Notion provider singleton
	 * @returns Configured database provider
	 * @throws Error if provider initialization fails
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
	 * Fetches all gallery items
	 * @param options - Retrieval options
	 * @param options.shuffle - Whether to randomize results
	 * @returns Promise of gallery items array
	 */
	async getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]> {
		return this.provider.getGalleryItems(options);
	}

	/**
	 * Fetches single gallery item by ID
	 * @param id - Unique item identifier
	 * @returns Promise of gallery item or null if not found
	 */
	async getGalleryItem(id: string): Promise<GalleryItem | null> {
		return this.provider.getGalleryItem(id);
	}

	/**
	 * Searches gallery items by text
	 * @param query - Search term
	 * @returns Promise of matching gallery items array
	 */
	async searchGallery(query: string): Promise<GalleryItem[]> {
		// Use provider's native search if available
		if (this.provider.searchGallery) {
			return this.provider.searchGallery(query);
		}

		// Fallback: Client-side filtering
		logger.warn('Provider does not implement searchGallery, using fallback.');
		const items = await this.provider.getGalleryItems();
		const lowerQuery = query.toLowerCase();

		return items.filter((item) => item.title.toLowerCase().includes(lowerQuery) || (item.description?.toLowerCase().includes(lowerQuery) ?? false));
	}
}

/** Singleton database service instance */
export const db = new DatabaseService();

/**
 * Fetches all gallery items
 * @param options - Retrieval options
 * @param options.shuffle - Whether to randomize results
 * @returns Promise of gallery items array
 */
export async function getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]> {
	return db.getGalleryItems(options);
}

/**
 * Fetches single gallery item by ID
 * @param id - Unique item identifier
 * @returns Promise of gallery item or null if not found
 */
export async function getGalleryItem(id: string): Promise<GalleryItem | null> {
	return db.getGalleryItem(id);
}

/**
 * Searches gallery items by text
 * @param query - Search term
 * @returns Promise of matching gallery items array
 */
export async function searchGallery(query: string): Promise<GalleryItem[]> {
	return db.searchGallery(query);
}
