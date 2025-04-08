import clsx from 'clsx';

import Creation from '@/components/sections/Creation';
import Foundation from '@/components/sections/Foundation';

/**
 * Home page component that displays the main sections of the site.
 *
 * @returns {JSX.Element} The rendered home page
 */
export default function Home(): JSX.Element {
	return (
		<>
			{/* Responsive Grid Container */}
			<div className="grid h-full min-h-screen grid-cols-10 grid-rows-10" aria-label="Main page layout">
				{/* Creation Section */}
				<div
					className={clsx(
						// Base layout
						'relative h-full',

						// Mobile layout
						'col-span-full col-start-1 row-span-5 row-start-6',

						// Desktop layout
						'lg:col-span-5 lg:col-start-1 lg:row-span-full lg:row-start-1',
					)}
				>
					<div className="absolute inset-0 h-full w-full">
						<Creation />
					</div>
				</div>

				{/* Foundation Section */}
				<div
					className={clsx(
						// Base layout
						'relative h-full',
						'col-span-full col-start-1 row-span-full row-start-1',

						// Mobile overlay effect
						'bg-gradient-to-b from-white via-white/90 to-white/0',

						// Tablet layout
						'sm:row-span-full sm:row-start-1',

						// Desktop layout
						'lg:bg-none',

						'lg:col-span-6 lg:col-start-5',
						'xl:col-span-5 xl:col-start-5',
						'2xl:col-span-3 2xl:col-start-5',
					)}
				>
					<div className="absolute inset-0 h-full w-full">
						<Foundation />
					</div>
				</div>
			</div>
		</>
	);
}
