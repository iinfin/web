'use client';

// Mark as Client Component to use motion and hooks
import type { FC } from 'react';

import Link from 'next/link';

import clsx from 'clsx';
import { motion, type Variants } from 'framer-motion';

import AnimatedTextFadeIn from '@/app/components/shared/AnimatedTextFadeIn';
import AnimatedTextSlideUp from '@/app/components/shared/AnimatedTextSlideUp';

// Move constants and variants inside the component
const FoundationContent: FC = (): JSX.Element => {
	// --- Animation Constants ---
	const durationPrimary = 1.0; // Duration for main description and titles
	const durationSecondary = 0.5; // Duration for list items and links
	const staggerFast = 0.1; // Stagger for items within lists
	const staggerMedium = 0.2; // Stagger for lists within columns or link groups
	const staggerSlow = 0.5; // Stagger for main columns
	// -------------------------

	// Stagger Variants for details section
	const detailsContainerVariants: Variants = {
		hidden: {},
		visible: {
			transition: {
				staggerChildren: staggerSlow, // Stagger the columns
			},
		},
	};

	const columnVariants: Variants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: staggerSlow, // Stagger items within columns
			},
		},
	};

	const itemVariants: Variants = {
		hidden: { opacity: 0, y: 10 }, // Add slight upward animation
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: durationSecondary, // Use secondary duration for items
				ease: [0.22, 1, 0.36, 1], // easeOutCirc
			},
		},
	};

	const listStaggerVariants: Variants = {
		hidden: {},
		visible: { transition: { staggerChildren: staggerMedium } },
	};

	const listItemStaggerVariants: Variants = {
		hidden: {},
		visible: { transition: { staggerChildren: staggerFast } },
	};

	// Reusable link component for contact details
	const ContactLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
		<Link href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gray-400">
			{children}
		</Link>
	);

	// Combine description text for AnimatedText
	const descriptionText = [
		'Incomplete Infinity is an evolving, multifaceted creative practice working with companies and institutions in pursuit of a better future. Embracing an enigmatic style, we create work that is completed by the viewer and lives on in their minds.',
		'', // Add a blank line for spacing equivalent to the original <p> margin
		'At the intersection of imperfection, mystery, and openness, Incomplete Infinity crafts experiences that resist finite closure. We navigate liminal spaces where technology functions as collaborative language rather than mere tool, where sustainability manifests as regenerative dialogue with natural systems, and where creativity transforms abstract potential into tangible yet unresolved encounters. Our work exists not as static artifact but as living ecosystem—adapting, evolving, and completing itself anew with each engagement.',
		'', // Add a blank line for spacing
		'We exist in the deliberate pause between completion and becoming. Incomplete Infinity navigates the territories where technology becomes language, where sustainability becomes conversation, and where creativity transmutes the abstract into the experiential. Our work inhabits the fertile tensions between disorder and pattern, between revelation and concealment, between finite expression and infinite interpretation.',
	];

	// Array for client list items to easily map over
	const clientList = [
		{ text: '1', bold: true },
		{ text: 'Porsche' },
		{ text: 'Lotus Cars' },
		{ text: '2', bold: true },
		{ text: 'Coca-Cola' },
		{ text: 'Calvin-Klein' },
		{ text: 'Meta' },
		{ text: 'Nohlab' },
		{ text: 'Salon Architects' },
		{ text: '3', bold: true },
		{ text: 'Taiwan Nat. Museum of Fine Arts' },
		{ text: 'Outernet London' },
		{ text: 'Saasfee Pavillon' },
		{ text: 'Atelier Des Lumieres' },
		{ text: 'Sonar Istanbul' },
		{ text: 'Eglise De La Madeleine' },
	];

	// Arrays for services list
	const servicesList1 = ['Creative Strategy', 'Direction', 'Production'];
	const servicesList2 = ['& Art Exhibitions']; // Keep & static with Art Exhibitions

	// Array for contact links
	const contactLinks = [
		{ href: 'mailto:hey@u29dc.com', text: 'hey@u29dc.com' },
		{ href: 'https://cal.com/u29dc', text: 'cal.com/u29dc' },
		{ href: 'https://instagram.com/u29dc/', text: 'Instagram@u29dc' },
		{ href: 'https://linkedin.com/in/u29dc/', text: 'LinkedIn@u29dc' },
	];

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
					{/* Column: Services  */}
					<motion.div
						className={clsx(
							// Column positioning and flex layout
							'col-span-1 flex flex-col justify-between space-y-4',
							// Mobile Order: 3rd position | Desktop Order: 1st position
							'order-3 md:order-1',
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

					{/* Column: Contact */}
					<motion.div
						className={clsx(
							// Column positioning and flex layout
							'col-span-1 flex flex-col justify-between space-y-4',
							// Mobile Order: 2nd position | Desktop Order: 3rd position
							'order-2 md:order-3',
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

					{/* Column: Brands, Studios & Exhibitions */}
					<motion.div
						id="about-details-content-brands"
						className={clsx(
							// Column positioning and flex layout
							'col-span-1 flex flex-col justify-between space-y-4',
							// Mobile: Hidden | Desktop Order: 2nd position, Display: flex
							'hidden md:order-2 md:flex',
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

				{/* Description Section */}
				<div
					className={clsx(
						// Positioning within the parent grid
						'row-start-2',
						// Grid setup for description alignment
						'grid grid-cols-1 gap-4 md:grid-cols-3',
					)}
				>
					<div
						className={clsx(
							// Typography and spacing
							'font-caption-01 h-fit space-y-0 text-sm md:text-base',
							// Column spanning and positioning for responsiveness
							'col-span-1 md:col-span-2 md:col-start-2',
						)}
					>
						{/* Use AnimatedTextFadeIn for the description block */}
						<AnimatedTextFadeIn text={descriptionText} el="div" className="space-y-0" duration={durationPrimary} staggerChildren={staggerMedium} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default FoundationContent;
