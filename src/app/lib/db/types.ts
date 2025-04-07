/**
 * Database Model Types and Provider Interfaces
 * Core type definitions for the database abstraction layer
 */

/**
 * Media type supported by gallery items
 * Defines content formats displayable in the gallery
 */
export type MediaType = 'image' | 'video';

/**
 * Gallery Item Model
 * Represents a single portfolio/gallery entry
 */
export interface GalleryItem {
	id: string; // Unique identifier
	title: string; // Display title
	description?: string; // Optional descriptive text
	tags?: string[]; // Optional categorization tags
	url?: string; // Optional media resource URL
	mediaType?: MediaType; // Type of media (derived from URL)
}

/**
 * Database Provider Interface
 * Contract for data access implementations
 */
export interface DatabaseProvider {
	/**
	 * Retrieves multiple gallery items
	 * @param options - Configuration options
	 * @param options.shuffle - Whether to randomize item order
	 * @returns Promise of gallery items array
	 */
	getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]>;

	/**
	 * Retrieves a single gallery item
	 * @param id - Unique item identifier
	 * @returns Promise of gallery item or null if not found
	 */
	getGalleryItem(id: string): Promise<GalleryItem | null>;

	/**
	 * Searches gallery items by text
	 * @param query - Search term
	 * @returns Promise of matching gallery items array
	 */
	searchGallery?(query: string): Promise<GalleryItem[]>;
}

// Removed unused interfaces: DatabaseConfig, MockGalleryOptions
