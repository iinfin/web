import type { FC } from 'react';

import CreationsGallery from '@/app/components/sections/CreationsGAllery';
import { getGalleryItems } from '@/app/lib/db';
import type { GalleryItem } from '@/app/lib/db/types';

/**
 * Creations section component.
 * Fetches gallery items and passes them to the client component.
 * @returns {Promise<JSX.Element>} The rendered creations section.
 */
const Creations: FC = async (): Promise<JSX.Element> => {
	// Fetch gallery items from the database
	// Use shuffle: true for variety on each load
	const galleryItems: GalleryItem[] = await getGalleryItems({ shuffle: true });

	return (
		<section id="creations" className="relative h-full w-full overflow-hidden p-4 uppercase">
			{/* Pass the fetched items to the client component */}
			<CreationsGallery galleryItems={galleryItems} />
		</section>
	);
};

export default Creations;
