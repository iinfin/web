import type { FC } from 'react';

import FoundationContent from '@/app/components/sections/FoundationContent';

/**
 * Foundation section component placeholder.
 * @returns {JSX.Element} The rendered foundation section.
 */
const Foundation: FC = (): JSX.Element => {
	return (
		<section id="foundation" className="relative h-full w-full overflow-hidden">
			<FoundationContent />
		</section>
	);
};

export default Foundation;
