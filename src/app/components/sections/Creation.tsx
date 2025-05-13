import type { FC } from 'react';

// import CreationContentReel from '@/components/sections/CreationContentReel';
// import CreationContentFull from '@/components/sections/CreationContentFull';
import CreationContent from '@/components/sections/CreationContent';

import { getGalleryItems } from '@/lib/db';
import type { GalleryItem } from '@/lib/db/types';

/**
 * Creation section component.
 * Loads the client component for the interactive 3D gallery display.
 * This server component handles data fetching and content preparation.
 * @returns {Promise<JSX.Element>} The rendered creation section.
 */
const Creation: FC = async (): Promise<JSX.Element> => {
	// Fetch gallery items from the database
	// Use shuffle: true for variety on each page load
	const galleryItems: GalleryItem[] = await getGalleryItems({ shuffle: true });

	return (
		<section id="creation" className="relative h-full w-full overflow-hidden">
			<CreationContent galleryItems={galleryItems} />
			{/* <CreationContentFull galleryItems={galleryItems} /> */}
			{/* <CreationContentReel /> */}
		</section>
	);
};

export default Creation;
