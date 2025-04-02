import type { FC } from 'react';

import CreationContent from '@/app/components/sections/CreationContent';
import { getGalleryItems } from '@/app/lib/db';
import type { GalleryItem } from '@/app/lib/db/types';

/**
 * Creation section component.
 * Fetches gallery items and passes them to the client component.
 * @returns {Promise<JSX.Element>} The rendered creations section.
 */
const Creation: FC = async (): Promise<JSX.Element> => {
	// Fetch gallery items from the database
	// Use shuffle: true for variety on each load
	const galleryItems: GalleryItem[] = await getGalleryItems({ shuffle: true });

	return (
		<section id="creation" className="relative h-full w-full overflow-hidden">
			<CreationContent galleryItems={galleryItems} />
		</section>
	);
};

export default Creation;
