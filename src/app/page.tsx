import clsx from 'clsx';

import Creation from '@/components/sections/Creation';
import Foundation from '@/components/sections/Foundation';

/**
 * Home page component that displays the main sections of the site.
 * Uses a responsive grid layout that adapts for different screen sizes and orientations:
 * - Mobile Portrait: Creation (full height), Foundation (overlay)
 * - Tablet Portrait: Creation (full height), Foundation (full height)
 * - Desktop (lg): Creation (left 40%), Foundation (right 60%)
 * - Wider Desktop (xl): Creation (left 50%), Foundation (right 50%)
 * - Extra Wide Desktop (2xl): Creation (left 70%), Foundation (right 30%)
 *
 * @returns {JSX.Element} The rendered home page
 */
export default function Home(): JSX.Element {
	return (
		<>
			{/* Responsive Grid Container */}
			<div className="grid h-full min-h-screen grid-rows-10 lg:grid-cols-10 lg:grid-rows-1" aria-label="Main page layout">
				{/* Creation Section */}
				<div
					className={clsx(
						// Base layout
						'relative h-full',

						// Mobile layout (default)
						'col-span-1 col-start-1 row-span-10 row-start-1',

						// Tablet layout
						'md:row-span-10 md:row-start-1',

						// Desktop layout
						'lg:row-span-1 lg:row-start-1',
						'lg:col-span-4 lg:col-start-1',
						'xl:col-span-5 xl:col-start-1',
						'2xl:col-span-7 2xl:col-start-1',
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

						// Mobile overlay effect
						'bg-gradient-to-b from-white via-white/90 to-white/0',
						'col-span-1 col-start-1 row-span-10 row-start-1',

						// Tablet layout
						'md:row-span-10 md:row-start-1',

						// Desktop layout
						'lg:bg-none',
						'lg:row-span-1 lg:row-start-1',
						'lg:col-span-6 lg:col-start-5',
						'xl:col-span-5 xl:col-start-6',
						'2xl:col-span-3 2xl:col-start-8',
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
