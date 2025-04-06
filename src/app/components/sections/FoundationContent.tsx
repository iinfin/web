'use client';

// Mark as Client Component to use motion and hooks
import type { FC } from 'react';

import clsx from 'clsx';
import { motion } from 'framer-motion';

import AnimatedTextSlideUp from '@/app/components/shared/AnimatedTextSlideUp';

// Update imports to use the consolidated config file
import {
	clientList,
	columnVariants,
	contactLinks,
	detailsContainerVariants,
	durationPrimary,
	durationSecondary,
	itemVariants,
	listItemStaggerVariants,
	listStaggerVariants,
	servicesList1,
	servicesList2,
	staggerFast,
	staggerMedium,
} from './foundation/config';
// <- Updated path
import ContactLink from './foundation/ContactLink';
// Remove old data import
// import { clientList, contactLinks, servicesList1, servicesList2 } from './foundation/data';
import DescriptionSection from './foundation/DescriptionSection';

// Main component for the Foundation content
const FoundationContent: FC = (): JSX.Element => {
	return (
		// Outer container with padding, matching the structure in Foundation.tsx
		<div
			className={clsx(
				// Base styles
				'h-full w-full p-4',
			)}
		>
			{/* Inner grid structure for content */}
			<div
				className={clsx(
					// Base grid setup
					'grid h-full w-full grid-rows-[auto_1fr_auto]',
					// Gap adjustments for responsiveness
					'gap-20 md:gap-12 lg:gap-16',
				)}
			>
				{/* Details Section - Responsive Grid with motion */}
				<motion.div
					className={clsx(
						// Positioning within the parent grid
						'row-start-1 self-end',
						// Typography
						'text-xs md:text-sm',
						// Grid setup and gap for responsiveness
						// Mobile: 2 columns | Desktop: 3 columns
						'grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-4',
					)}
					variants={detailsContainerVariants}
					initial="hidden"
					animate="visible"
				>
					{/* Column: Services - Contains two lists of services. */}
					{/* Responsive Order: Displays 3rd on mobile, 2nd on desktop. */}
					<motion.div
						className={clsx(
							// Column positioning and flex layout
							'col-span-1 flex flex-col justify-between space-y-4',
							// Mobile Order: 3rd position | Desktop Order: 2nd position
							'order-3 md:order-2',
						)}
						variants={columnVariants}
					>
						<motion.div className="flex flex-col" variants={itemVariants}>
							{/* Use AnimatedTextSlideUp for the title */}
							<AnimatedTextSlideUp text="Services" el="span" duration={durationPrimary} />
						</motion.div>
						<motion.div
							className={clsx(
								// Base flex layout
								'flex flex-col',
							)}
							variants={listStaggerVariants} // Use specific stagger variant
						>
							{servicesList1.map((service, index) => (
								<motion.span key={index} variants={itemVariants}>
									{/* Use AnimatedTextSlideUp for list items */}
									<AnimatedTextSlideUp text={service} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
								</motion.span>
							))}
						</motion.div>
						<motion.div
							className={clsx(
								// Base flex layout
								'flex flex-col',
							)}
							variants={listStaggerVariants} // Use specific stagger variant
						>
							{servicesList2.map((service, index) => (
								<motion.span key={index} variants={itemVariants}>
									{/* Use AnimatedTextSlideUp for list items */}
									<AnimatedTextSlideUp text={service} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
								</motion.span>
							))}
						</motion.div>
					</motion.div>

					{/* Column: Contact - Contains social/contact links. */}
					{/* Responsive Order: Displays 2nd on mobile, 1st on desktop. */}
					<motion.div
						className={clsx(
							// Column positioning and flex layout
							'col-span-1 flex flex-col justify-between space-y-4',
							// Mobile Order: 2nd position | Desktop Order: 1st position
							'order-2 md:order-1',
						)}
						variants={columnVariants}
					>
						{/* Links */}
						<motion.div
							className={clsx(
								// Base flex layout
								'flex flex-col',
							)}
							variants={listStaggerVariants} // Use specific stagger variant
						>
							{contactLinks.map((link) => (
								<motion.div key={link.href} variants={itemVariants}>
									<ContactLink href={link.href}>
										{/* Use AnimatedTextSlideUp inside the link */}
										<AnimatedTextSlideUp text={link.text} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
									</ContactLink>
								</motion.div>
							))}
							<motion.span className="mt-1" variants={itemVariants}>
								{/* Use AnimatedTextSlideUp for the arrow */}
								<AnimatedTextSlideUp text="→" el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
							</motion.span>
						</motion.div>
						{/* Title */}
						<motion.div className="flex flex-col" variants={itemVariants}>
							{/* Use AnimatedTextSlideUp for the title */}
							<AnimatedTextSlideUp text="Contact" el="span" duration={durationPrimary} />
						</motion.div>
					</motion.div>

					{/* Column: Brands, Studios & Exhibitions - Contains a list of clients/partners. */}
					{/* Responsive Behavior: Hidden on mobile, displays 3rd on desktop. */}
					<motion.div
						id="about-details-content-brands"
						className={clsx(
							// Column positioning and flex layout
							'col-span-1 flex flex-col justify-between space-y-4',
							// Mobile: Hidden | Desktop Order: 3rd position, Display: flex
							'hidden md:order-3 md:flex',
						)}
						variants={columnVariants}
					>
						{/* Group 1: Titles */}
						<motion.div className="flex flex-col" variants={itemVariants}>
							{/* Use AnimatedTextSlideUp for the title */}
							<AnimatedTextSlideUp text={['Brands, Studios', '& Exhibitions']} el="div" staggerChildren={staggerFast} duration={durationPrimary} />
						</motion.div>
						{/* Group 2: Client List - Responsive Columns */}
						<motion.div
							className={clsx(
								// Responsive grid layout for client list
								'grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-1 md:grid-cols-1',
							)}
							variants={listItemStaggerVariants} // Use specific stagger variant
						>
							{clientList.map((item, index) => (
								<motion.span key={index} variants={itemVariants} className={item.bold ? 'font-bold' : ''}>
									{/* Use AnimatedTextSlideUp for list items */}
									<AnimatedTextSlideUp text={item.text} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
								</motion.span>
							))}
						</motion.div>
					</motion.div>
				</motion.div>

				{/* Description Section - Extracted to separate component to prevent unnecessary animations */}
				<DescriptionSection durationPrimary={durationPrimary} staggerMedium={staggerMedium} />
			</div>
		</div>
	);
};

export default FoundationContent;
