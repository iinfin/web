/**
 * Database model types and provider interfaces
 * Contains type definitions for gallery items and database providers
 */

/**
 * Media type enum for gallery items
 * Defines the supported media formats that can be displayed in the gallery
 */
export type MediaType = 'image' | 'video';

/**
 * Gallery Item (for works/portfolio section)
 * Represents a single item in the gallery/portfolio display
 */
export interface GalleryItem {
	id: string; // Notion page ID
	title: string; // From Notion 'Name' property
	description?: string; // From Notion 'Description' property
	tags?: string[]; // From Notion 'Tags' property
	url?: string; // From Notion 'URL' property
	mediaType?: MediaType; // Determined from URL extension
	// Removed: imageUrl, videoUrl, gifUrl, category, date, dimensions
}

/**
 * Database Provider Interface
 * Defines the contract that any database provider implementation must fulfill
 * to provide gallery data to the application
 */
export interface DatabaseProvider {
	/**
	 * Retrieves a collection of gallery items
	 * @param options - Optional configuration for retrieving items
	 * @param options.shuffle - Whether to randomize the order of returned items
	 * @returns Promise resolving to an array of gallery items
	 */
	getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]>;

	/**
	 * Retrieves a single gallery item by its ID
	 * @param id - The unique identifier of the gallery item
	 * @returns Promise resolving to the gallery item or null if not found
	 */
	getGalleryItem(id: string): Promise<GalleryItem | null>;

	/**
	 * Optional method to search gallery items by a query string
	 * @param query - The search term to filter gallery items
	 * @returns Promise resolving to an array of matching gallery items
	 */
	searchGallery?(query: string): Promise<GalleryItem[]>;
}

// Removed unused interfaces: DatabaseConfig, MockGalleryOptions
