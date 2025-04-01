import { Client } from '@notionhq/client';
import type {
	MultiSelectPropertyItemObjectResponse,
	PageObjectResponse,
	QueryDatabaseParameters,
	RichTextItemResponse,
	TitlePropertyItemObjectResponse,
	UrlPropertyItemObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { logger } from '@/utils/logger';

import { DatabaseProvider, GalleryItem, MediaType } from './types';

// Seeded random number generator for deterministic grid pattern generation
class SeededRandom {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	// Generate a random number based on current seed value, then update seed
	next(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}
}

// Fisher-Yates shuffle with seed for deterministic shuffling
function shuffleArrayWithSeed<T>(array: T[], seed: number): T[] {
	const rng = new SeededRandom(seed);
	const shuffledArray = [...array];
	let currentIndex = shuffledArray.length;

	while (currentIndex !== 0) {
		const randomIndex = Math.floor(rng.next() * currentIndex);
		currentIndex--;

		[shuffledArray[currentIndex], shuffledArray[randomIndex]] = [shuffledArray[randomIndex]!, shuffledArray[currentIndex]!];
	}

	return shuffledArray;
}

// Define structure for expected properties in a Notion Gallery database item
interface NotionGalleryProperties {
	Name: TitlePropertyItemObjectResponse;
	Description?: { rich_text: RichTextItemResponse[] }; // Optional Description property
	Tags?: MultiSelectPropertyItemObjectResponse; // Optional Tags property (multi-select)
	URL?: UrlPropertyItemObjectResponse; // Optional URL property
}

// Safely extract title text content
function extractTextFromTitle(title: unknown): string | undefined {
	try {
		if (Array.isArray(title) && title.length > 0 && title[0]?.plain_text) {
			return title[0].plain_text;
		}
		return undefined;
	} catch (_) {
		return undefined;
	}
}

// Safely extract rich text content
function extractTextFromRichText(richText: unknown): string | undefined {
	try {
		if (Array.isArray(richText) && richText.length > 0 && richText[0]?.plain_text) {
			return richText[0].plain_text;
		}
		return undefined;
	} catch (_) {
		return undefined;
	}
}

// Safely extract URL string from a Notion URL property
function extractUrlFromUrlProperty(urlProperty: unknown): string | undefined {
	try {
		// Check if it's the expected UrlPropertyItemObjectResponse structure
		const urlProp = urlProperty as UrlPropertyItemObjectResponse | undefined;
		if (urlProp?.type === 'url' && urlProp.url) {
			return urlProp.url;
		}
		return undefined;
	} catch (error) {
		logger.warn('Error extracting URL from URL property', { error, urlProperty });
		return undefined;
	}
}

// Helper function to determine MediaType from URL
function determineMediaType(url: string | undefined): MediaType | undefined {
	if (!url) {
		return undefined;
	}

	// Safely extract the file extension
	const pathPart = url.split('?')[0];
	// Extra safety check, although url.split should always return string[0]
	if (!pathPart) return undefined;

	const parts = pathPart.split('.');
	// Get the last part, only if there's more than one part (i.e., a dot exists)
	const extension = parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;

	if (['png', 'jpg', 'jpeg', 'webp'].includes(extension ?? '')) {
		return 'image';
	} else if (['mp4', 'webm'].includes(extension ?? '')) {
		return 'video';
	} else {
		// Log only if there was something that looked like an extension but wasn't recognized
		if (extension) {
			logger.warn(`Unknown media type for URL extension: ${extension} in URL: ${url}`);
		}
		return undefined; // Or default to 'image' if preferred
	}
}

/**
 * Notion-specific database provider implementation.
 * Fetches gallery data from a configured Notion database.
 */
export class NotionProvider implements DatabaseProvider {
	private notion: Client;
	private galleryDbId: string;

	constructor() {
		// Validate environment variables only when the provider is actually created
		if (!process.env['NOTION_API_KEY']) {
			throw new Error('Missing NOTION_API_KEY environment variable');
		}
		if (!process.env['NOTION_DB_ID_GALLERY']) {
			throw new Error('Missing NOTION_DB_ID_GALLERY environment variable');
		}

		try {
			this.notion = new Client({ auth: process.env['NOTION_API_KEY']! });
			this.galleryDbId = process.env['NOTION_DB_ID_GALLERY']!;
		} catch (error) {
			logger.error('Failed to initialize Notion client', { error: error });
			throw new Error('Failed to initialize Notion client');
		}
	}

	/**
	 * Generic function to query a Notion database.
	 */
	private async queryDatabase(databaseId: string, filter?: QueryDatabaseParameters['filter'], sorts?: QueryDatabaseParameters['sorts']): Promise<PageObjectResponse[]> {
		try {
			const response = await this.notion.databases.query({
				database_id: databaseId,
				...(filter && { filter }),
				...(sorts && { sorts }),
			});
			// logger.debug('Raw Notion API Response:', { response: response });

			// Type guard to ensure we only process full PageObjectResponses
			const isPageObjectResponse = (obj: unknown): obj is PageObjectResponse => {
				return obj !== null && typeof obj === 'object' && 'properties' in obj;
			};

			// Filter out any partial responses if necessary, though ListResponse should contain full pages
			const pages = response.results.filter(isPageObjectResponse);

			// logger.debug(`Filtered ${pages.length} valid page objects.`);
			return pages;
		} catch (error) {
			logger.error(`Error querying database ${databaseId}:`, { error: error });
			return []; // Return empty array on error
		}
	}

	/**
	 * Maps a Notion PageObjectResponse to a GalleryItem.
	 */
	private mapPageToGalleryItem(page: PageObjectResponse): GalleryItem {
		const properties = page.properties as unknown as NotionGalleryProperties;

		// Safely extract and structure data from Notion properties
		const title = extractTextFromTitle(properties.Name?.title) ?? 'Untitled';
		const description = extractTextFromRichText(properties.Description?.rich_text);
		const tags = properties.Tags?.multi_select?.map((tag) => tag.name) ?? [];
		const url = extractUrlFromUrlProperty(properties.URL);
		const mediaType = determineMediaType(url); // Determine type from URL

		// Construct the simplified GalleryItem
		const item: GalleryItem = {
			id: page.id,
			title,
		};

		// Conditionally add optional properties if they exist
		if (description) item.description = description;
		if (tags.length > 0) item.tags = tags;
		if (url) item.url = url;
		if (mediaType) item.mediaType = mediaType;

		return item;
	}

	/**
	 * Get all gallery items from the configured Notion database.
	 */
	async getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]> {
		const pages = await this.queryDatabase(this.galleryDbId);
		// Map Notion page objects using the dedicated mapper function.
		const items = pages.map(this.mapPageToGalleryItem);

		// If shuffle is enabled, shuffle the items with a deterministic seed
		if (options?.shuffle) {
			const seed = Math.floor(Math.random() * 10000);
			return shuffleArrayWithSeed(items, seed);
		}

		return items;
	}

	/**
	 * Search gallery items based on title or description.
	 * Note: This performs a client-side filter on all items.
	 * Consider implementing Notion API filtering for better performance with large databases.
	 */
	async searchGallery(query: string): Promise<GalleryItem[]> {
		// Fetch all items first
		const allItems = await this.getGalleryItems();
		const lowerQuery = query.toLowerCase();

		// Filter based on title and description (case-insensitive)
		return allItems.filter((item) => item.title.toLowerCase().includes(lowerQuery) || (item.description?.toLowerCase().includes(lowerQuery) ?? false));
	}

	/**
	 * Get a specific gallery item by ID.
	 */
	async getGalleryItem(id: string): Promise<GalleryItem | null> {
		try {
			// Fetch the page by ID from Notion
			const page = await this.notion.pages.retrieve({ page_id: id });

			// Type guard to ensure we have a full PageObjectResponse
			if ('properties' in page) {
				// Map the page to a GalleryItem
				return this.mapPageToGalleryItem(page as PageObjectResponse);
			}

			logger.warn(`Retrieved page ${id} does not have the expected structure`, { page });
			return null;
		} catch (error) {
			logger.error(`Error retrieving gallery item with ID ${id}:`, { error });
			return null;
		}
	}
}
