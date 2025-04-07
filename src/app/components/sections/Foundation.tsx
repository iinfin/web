import type { FC } from 'react';

import FoundationContent from '@/components/sections/FoundationContent';

/**
 * Foundation section component.
 * Loads the client component for the foundation information display.
 * This server component handles rendering the interactive content area.
 * @returns {Promise<JSX.Element>} The rendered foundation section.
 */
const Foundation: FC = async (): Promise<JSX.Element> => {
	return (
		<section id="foundation" className="relative h-full w-full overflow-hidden">
			<FoundationContent />
		</section>
	);
};

export default Foundation;
