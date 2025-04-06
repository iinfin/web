'use client';

import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import clsx from 'clsx';
import { motion, type Variants } from 'framer-motion';

import AnimatedTextFadeIn from '@/app/components/shared/AnimatedTextFadeIn';
import AnimatedTextSlideUp from '@/app/components/shared/AnimatedTextSlideUp';

// --- Merged from foundation/config.ts ---

/**
 * Configuration, static data, and animation variants
 * for the Foundation content section.
 */

// ==================================
// SECTION: Animation Configuration
// ==================================

// --- Animation Constants ---
const durationPrimary = 1.0; // Duration for main description and titles
const durationSecondary = 0.5; // Duration for list items and links
const staggerFast = 0.1; // Stagger for items within lists
const staggerMedium = 0.2; // Stagger for lists within columns or link groups
const staggerSlow = 0.5; // Stagger for main columns
// -------------------------

// --- Animation Variants ---

// Stagger Variants for the top details section container
const detailsContainerVariants: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: staggerSlow, // Stagger the columns
		},
	},
};

// Variants for individual columns within the details section
const columnVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: staggerSlow, // Stagger items within columns
		},
	},
};

// Variants for individual items (text, links) within columns
const itemVariants: Variants = {
	hidden: { opacity: 0, y: 10 }, // Start invisible and slightly down
	visible: {
		opacity: 1,
		y: 0, // Animate to original position
		transition: {
			duration: durationSecondary, // Use secondary duration for items
			ease: [0.22, 1, 0.36, 1], // easeOutCirc
		},
	},
};

// Variants for staggering lists (like services or contact links)
const listStaggerVariants: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: staggerMedium } },
};

// Variants for staggering items within a list (faster than list staggering)
const listItemStaggerVariants: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: staggerFast } },
};

// ==================================
// SECTION: Static Content Data
// ==================================

// --- Description Text ---

// Array of alternative paragraphs for random selection in DescriptionSection
const paragraphs = [
	'In the fertile void between disciplines, Incomplete Infinity cultivates living frameworks rather than final artifacts.',
	'We exist in the deliberate pause between completion and becoming. Incomplete Infinity navigates the territories where technology becomes language, where sustainability becomes conversation, and where creativity transmutes the abstract into the experiential. Our work inhabits the fertile tensions between disorder and pattern, between revelation and concealment, between finite expression and infinite interpretation.',
	'We dwell in the territory of incompleteness—where unfinished becomes invitation rather than flaw.',
	'At the intersection of imperfection, mystery, and openness, Incomplete Infinity crafts experiences that resist finite closure. We navigate liminal spaces where technology functions as collaborative language rather than mere tool, where sustainability manifests as regenerative dialogue with natural systems, and where creativity transforms abstract potential into tangible yet unresolved encounters. Our work exists not as static artifact but as living ecosystem—adapting, evolving, and completing itself anew with each engagement.',
	'Incomplete Infinity occupies the tension between definition and possibility.',
	'We architect the unfinished—creating systems and experiences that evolve beyond their origins through engagement.',
	'Between conception and completion lies a fertile territory of possibility. We transform apparent limitations into portals of potential, crafting experiences that gain strength through vulnerability and resonance through ambiguity. Each project exists as structured emergence: deliberately unresolved systems that invite completion without dictating conclusion.',
];

// Function to select two unique paragraphs for dynamic content in DescriptionSection
const selectRandomParagraphs = (sourceArray: string[]): [string | undefined, string | undefined] => {
	let paragraph1: string | undefined;
	let paragraph2: string | undefined;

	if (sourceArray.length >= 2) {
		const index1 = Math.floor(Math.random() * sourceArray.length);
		paragraph1 = sourceArray[index1];

		let index2 = Math.floor(Math.random() * sourceArray.length);
		// Ensure the second index is different from the first
		while (index2 === index1) {
			index2 = Math.floor(Math.random() * sourceArray.length);
		}
		paragraph2 = sourceArray[index2];
	} else if (sourceArray.length === 1) {
		// If only one paragraph available, use it for the first slot
		paragraph1 = sourceArray[0];
	}
	// If fewer than 2 paragraphs, the second slot will remain undefined
	return [paragraph1, paragraph2];
};

// --- Lists Data ---

// Array for client list items displayed in the third column (desktop)
const clientList = [
	{ text: '1', bold: false },
	{ text: 'Porsche' },
	{ text: 'Lotus Cars' },
	{ text: '2', bold: false },
	{ text: 'Coca-Cola' },
	{ text: 'Calvin-Klein' },
	{ text: 'Meta' },
	{ text: 'Nohlab' },
	{ text: 'Salon Architects' },
	{ text: '3', bold: false },
	{ text: 'Taiwan Nat. Museum of Fine Arts' },
	{ text: 'Outernet London' },
	{ text: 'Saasfee Pavillon' },
	{ text: 'Atelier Des Lumieres' },
	{ text: 'Sonar Istanbul' },
	{ text: 'Eglise De La Madeleine' },
];

// Arrays for services list displayed in the services column
const servicesList1 = ['Creative Strategy', 'Direction', 'Production'];
// Second part of the services list
const servicesList2 = ['& Art Exhibitions'];

// Array for contact links displayed in the contact column
const contactLinks = [
	{ href: 'mailto:hey@u29dc.com', text: 'hey@u29dc.com' },
	{ href: 'https://cal.com/u29dc', text: 'cal.com/u29dc' },
	{ href: 'https://instagram.com/u29dc/', text: 'Instagram@u29dc' },
	{ href: 'https://linkedin.com/in/u29dc/', text: 'LinkedIn@u29dc' },
];

// --- Merged from foundation/ContactLink.tsx ---

/**
 * Props for the ContactLink component.
 */
interface ContactLinkProps {
	href: string;
	children: ReactNode;
}

/**
 * Reusable styled link component for contact details.
 */
const ContactLink: FC<ContactLinkProps> = ({ href, children }): JSX.Element => (
	<Link href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gray-400">
		{children}
	</Link>
);
// Removed export default ContactLink;

// --- Merged from foundation/DescriptionSection.tsx ---

interface DescriptionSectionProps {
	durationPrimary: number;
	staggerMedium: number;
}

/**
 * Description section component with dynamic paragraph shuffling.
 * Isolated to prevent unnecessary re-animations of other components.
 */
const DescriptionSection: FC<DescriptionSectionProps> = ({ durationPrimary, staggerMedium }): JSX.Element => {
	// State to hold the currently displayed paragraphs
	// Initialize with undefined, random selection happens after mount
	const [selectedParagraphs, setSelectedParagraphs] = useState<[string | undefined, string | undefined]>([undefined, undefined]);

	// Effect to set initial random paragraphs only on the client after mount
	useEffect(() => {
		setSelectedParagraphs(selectRandomParagraphs(paragraphs)); // Use locally defined paragraphs and selectRandomParagraphs
	}, []); // Empty dependency array ensures this runs only once after mount

	// Function to regenerate paragraphs, wrapped in useCallback
	const regenerateParagraphs = useCallback(() => {
		setSelectedParagraphs(selectRandomParagraphs(paragraphs)); // Use locally defined paragraphs and selectRandomParagraphs
	}, []); // Dependency array remains empty

	// Destructure state for rendering
	const [paragraph1, paragraph2] = selectedParagraphs;

	// Combine description text for AnimatedText - first paragraph is fixed, but the others are dynamic
	const descriptionText = [
		'Incomplete Infinity is an evolving, multifaceted creative practice working with companies and institutions in pursuit of a better future. Embracing an enigmatic style, we create work that is completed by the viewer and lives on in their minds.',
		'', // Add a blank line for spacing equivalent to the original <p> margin
		paragraph1 || '',
		'', // Add a blank line for spacing
		paragraph2 || '',
	];

	return (
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
					// Add cursor pointer for click interaction
					'cursor-pointer',
				)}
				onClick={regenerateParagraphs}
			>
				{/* Use AnimatedTextFadeIn for the description block */}
				<AnimatedTextFadeIn text={descriptionText} el="div" className="space-y-0" duration={durationPrimary} staggerChildren={staggerMedium} />

				{/* Add Logo */}
				<motion.div className="mt-12 flex w-full justify-start mix-blend-multiply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: durationPrimary }}>
					<Image src="/assets/meta/u29dc.webp" alt="Incomplete Infinity Logo" width={50} height={25} />
				</motion.div>
			</div>
		</div>
	);
};
// Removed export default DescriptionSection;

// --- Updated Main FoundationContent Component ---

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
					variants={detailsContainerVariants} // Use local variant
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
						variants={columnVariants} // Use local variant
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
							variants={listStaggerVariants} // Use local variant
						>
							{servicesList1.map(
								(
									service,
									index, // Use local data
								) => (
									<motion.span key={index} variants={itemVariants}>
										{/* Use AnimatedTextSlideUp for list items */}
										<AnimatedTextSlideUp text={service} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
									</motion.span>
								),
							)}
						</motion.div>
						<motion.div
							className={clsx(
								// Base flex layout
								'flex flex-col',
							)}
							variants={listStaggerVariants} // Use local variant
						>
							{servicesList2.map(
								(
									service,
									index, // Use local data
								) => (
									<motion.span key={index} variants={itemVariants}>
										{/* Use AnimatedTextSlideUp for list items */}
										<AnimatedTextSlideUp text={service} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
									</motion.span>
								),
							)}
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
						variants={columnVariants} // Use local variant
					>
						{/* Links */}
						<motion.div
							className={clsx(
								// Base flex layout
								'flex flex-col',
							)}
							variants={listStaggerVariants} // Use local variant
						>
							{contactLinks.map(
								(
									link, // Use local data
								) => (
									<motion.div key={link.href} variants={itemVariants}>
										<ContactLink href={link.href}>
											{/* Use AnimatedTextSlideUp inside the link */}
											<AnimatedTextSlideUp text={link.text} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
										</ContactLink>
									</motion.div>
								),
							)}
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
						variants={columnVariants} // Use local variant
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
							variants={listItemStaggerVariants} // Use local variant
						>
							{clientList.map(
								(
									item,
									index, // Use local data
								) => (
									<motion.span key={index} variants={itemVariants} className={item.bold ? 'font-bold' : ''}>
										{/* Use AnimatedTextSlideUp for list items */}
										<AnimatedTextSlideUp text={item.text} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
									</motion.span>
								),
							)}
						</motion.div>
					</motion.div>
				</motion.div>
				{/* Description Section - Now defined locally */}
				<DescriptionSection durationPrimary={durationPrimary} staggerMedium={staggerMedium} />
			</div>
		</div>
	);
};

export default FoundationContent;
