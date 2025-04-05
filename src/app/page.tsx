import clsx from 'clsx';

import Creation from '@/app/components/sections/Creation';
import Foundation from '@/app/components/sections/Foundation';

/**
 * Home page component that displays the main sections of the site
 * Uses a responsive grid layout that adapts for different screen sizes and orientations.
 * - Mobile Portrait (Smallest): Foundation (Top 2/3), Creation (Bottom 1/3)
 * - Tablet Portrait (Medium): Foundation (Top 1/3), Creation (Bottom 2/3)
 * - Desktop (lg): Creation (Left 40%), Foundation (Right 60%)
 * - Wider Desktop (xl): Creation (Left 50%), Foundation (Right 50%)
 * - Extra Wide Desktop (2xl): Creation (Left 70%), Foundation (Right 30%)
 * @returns {JSX.Element} The rendered home page
 */
export default function Home(): JSX.Element {
	return (
		<>
			{/* Grid Container: Adjusts columns based on breakpoints */}
			{/* Default: Rows, md: Rows, lg+: 10 cols */}
			<div className="grid h-full min-h-screen grid-rows-3 lg:grid-cols-10 lg:grid-rows-1" aria-label="Main page layout">
				{/* Foundation Section Wrapper */}
				<div
					className={clsx(
						// Static classes applied always
						'relative h-full',
						// Mobile: Top 2/3 (rows 1-2)
						'row-span-2 row-start-1',
						// Tablet (md): Top 1/3 (row 1)
						'md:row-span-1 md:row-start-1',
						// Desktop (lg+): Reset row
						'lg:row-span-1 lg:row-start-1',
						// Desktop (lg): Right 6/10 (60%)
						'lg:col-span-6 lg:col-start-5',
						// Wider Desktop (xl): Right 5/10 (50%)
						'xl:col-span-5 xl:col-start-6',
						// Extra Wide Desktop (2xl): Right 3/10 (30%)
						'2xl:col-span-3 2xl:col-start-8',
					)}
				>
					<div className="absolute inset-0 h-full w-full">
						<Foundation />
					</div>
				</div>

				{/* Creation Section Wrapper */}
				<div
					className={clsx(
						// Static classes applied always
						'relative h-full',
						// Mobile: Bottom 1/3 (row 3)
						'row-span-1 row-start-3',
						// Tablet (md): Bottom 2/3 (rows 2-3)
						'md:row-span-2 md:row-start-2',
						// Desktop (lg+): Reset row
						'lg:row-span-1 lg:row-start-1',
						// Desktop (lg): Left 4/10 (40%)
						'lg:col-span-4 lg:col-start-1',
						// Wider Desktop (xl): Left 5/10 (50%)
						'xl:col-span-5 xl:col-start-1',
						// Extra Wide Desktop (2xl): Left 7/10 (70%)
						'2xl:col-span-7 2xl:col-start-1',
					)}
				>
					<div className="absolute inset-0 h-full w-full">
						<Creation />
					</div>
				</div>
			</div>
		</>
	);
}
