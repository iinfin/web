import { Client } from '@notionhq/client';
import type {
	FormulaPropertyItemObjectResponse,
	MultiSelectPropertyItemObjectResponse,
	PageObjectResponse,
	QueryDatabaseParameters,
	RichTextItemResponse,
	SelectPropertyItemObjectResponse,
	TitlePropertyItemObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { logger } from '@/lib/utils/logger';

import { DatabaseProvider, GalleryItem, MediaType } from './types';

/**
 * Random number generator with seed for deterministic results
 */
class SeededRandom {
	private seed: number;

	constructor(seed: number) {
		this.seed = seed;
	}

	/**
	 * Generates next random value in sequence
	 * @returns Random number between 0-1
	 */
	next(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}
}

/**
 * Fisher-Yates shuffle with deterministic seed
 * @param array - Array to shuffle
 * @param seed - Random seed for deterministic output
 * @returns New shuffled array
 */
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

/**
 * Expected Notion properties structure for gallery items
 */
interface NotionGalleryProperties {
	Name: TitlePropertyItemObjectResponse;
	Description?: { rich_text: RichTextItemResponse[] };
	Tags?: MultiSelectPropertyItemObjectResponse;
	URL?: FormulaPropertyItemObjectResponse;
	Status?: SelectPropertyItemObjectResponse;
}

/**
 * Notion data extraction utilities
 */
const NotionExtractors = {
	/**
	 * Extracts plain text from title property
	 * @param title - Title property value
	 * @returns Extracted text or undefined
	 */
	title(title: unknown): string | undefined {
		try {
			if (Array.isArray(title) && title.length > 0 && title[0]?.plain_text) {
				return title[0].plain_text;
			}
			return undefined;
		} catch (_) {
			return undefined;
		}
	},

	/**
	 * Extracts plain text from rich text property
	 * @param richText - Rich text property value
	 * @returns Extracted text or undefined
	 */
	richText(richText: unknown): string | undefined {
		try {
			if (Array.isArray(richText) && richText.length > 0 && richText[0]?.plain_text) {
				return richText[0].plain_text;
			}
			return undefined;
		} catch (_) {
			return undefined;
		}
	},

	/**
	 * Extracts string value from formula property
	 * @param formulaProperty - Formula property value
	 * @returns Extracted string or undefined
	 */
	formula(formulaProperty: unknown): string | undefined {
		try {
			const formulaProp = formulaProperty as FormulaPropertyItemObjectResponse | undefined;
			if (formulaProp?.type === 'formula' && formulaProp.formula.type === 'string') {
				return formulaProp.formula.string ?? undefined;
			}
			logger.warn('Formula property did not contain a string result', { formulaProperty });
			return undefined;
		} catch (error) {
			logger.warn('Error extracting string from Formula property', { error, formulaProperty });
			return undefined;
		}
	},

	/**
	 * Determines media type from URL
	 * @param url - Media URL
	 * @returns Media type or undefined
	 */
	mediaType(url: string | undefined): MediaType | undefined {
		if (!url) {
			return undefined;
		}

		const pathPart = url.split('?')[0];
		if (!pathPart) return undefined;

		const parts = pathPart.split('.');
		const extension = parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;

		if (['png', 'jpg', 'jpeg', 'webp'].includes(extension ?? '')) {
			return 'image';
		} else if (['mp4', 'webm'].includes(extension ?? '')) {
			return 'video';
		} else {
			if (extension) {
				logger.warn(`Unknown media type for URL extension: ${extension} in URL: ${url}`);
			}
			return undefined;
		}
	},
};

/**
 * Notion Database Provider
 * Implements DatabaseProvider interface for Notion as data source
 */
export class NotionProvider implements DatabaseProvider {
	private notion: Client;
	private galleryDbId: string;

	/**
	 * Creates Notion provider with API client
	 * @throws Error if required environment variables are missing
	 */
	constructor() {
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
	 * Executes query against Notion database
	 * @param databaseId - Target database ID
	 * @param filter - Optional filter criteria
	 * @param sorts - Optional sort criteria
	 * @returns Array of page objects
	 */
	private async queryDatabase(databaseId: string, filter?: QueryDatabaseParameters['filter'], sorts?: QueryDatabaseParameters['sorts']): Promise<PageObjectResponse[]> {
		try {
			const response = await this.notion.databases.query({
				database_id: databaseId,
				...(filter && { filter }),
				...(sorts && { sorts }),
			});

			const isPageObjectResponse = (obj: unknown): obj is PageObjectResponse => {
				return obj !== null && typeof obj === 'object' && 'properties' in obj;
			};

			return response.results.filter(isPageObjectResponse);
		} catch (error) {
			logger.error(`Error querying database ${databaseId}:`, { error: error });
			return [];
		}
	}

	/**
	 * Converts Notion page to gallery item model
	 * @param page - Notion page object
	 * @returns Formatted gallery item
	 */
	private mapPageToGalleryItem(page: PageObjectResponse): GalleryItem {
		const properties = page.properties as unknown as NotionGalleryProperties;

		const title = NotionExtractors.title(properties.Name?.title) ?? 'Untitled';
		const description = NotionExtractors.richText(properties.Description?.rich_text);
		const tags = properties.Tags?.multi_select?.map((tag) => tag.name) ?? [];
		const url = NotionExtractors.formula(properties.URL);
		const mediaType = NotionExtractors.mediaType(url);

		const item: GalleryItem = {
			id: page.id,
			title,
		};

		if (description) item.description = description;
		if (tags.length > 0) item.tags = tags;
		if (url) item.url = url;
		if (mediaType) item.mediaType = mediaType;

		return item;
	}

	/**
	 * Fetches all published gallery items
	 * @param options - Retrieval options
	 * @param options.shuffle - Whether to randomize results
	 * @returns Promise of gallery items array
	 */
	async getGalleryItems(options?: { shuffle?: boolean }): Promise<GalleryItem[]> {
		const filter: QueryDatabaseParameters['filter'] = {
			property: 'Status',
			select: {
				equals: 'Published',
			},
		};

		const pages = await this.queryDatabase(this.galleryDbId, filter);
		const items = pages.map(this.mapPageToGalleryItem);

		if (options?.shuffle) {
			const seed = Math.floor(Math.random() * 10000);
			return shuffleArrayWithSeed(items, seed);
		}

		return items;
	}

	/**
	 * Searches gallery items by text
	 * @param query - Search term
	 * @returns Promise of matching gallery items array
	 */
	async searchGallery(query: string): Promise<GalleryItem[]> {
		const allItems = await this.getGalleryItems();
		const lowerQuery = query.toLowerCase();

		return allItems.filter((item) => item.title.toLowerCase().includes(lowerQuery) || (item.description?.toLowerCase().includes(lowerQuery) ?? false));
	}

	/**
	 * Fetches single gallery item by ID
	 * @param id - Unique item identifier
	 * @returns Promise of gallery item or null if not found
	 */
	async getGalleryItem(id: string): Promise<GalleryItem | null> {
		try {
			const page = await this.notion.pages.retrieve({ page_id: id });

			if ('properties' in page) {
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
