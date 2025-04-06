'use client';

import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import clsx from 'clsx';
import { motion, type Variants } from 'framer-motion';

import AnimatedTextFadeIn from '@/app/components/animations/AnimatedTextFadeIn';
import AnimatedTextSlideUp from '@/app/components/animations/AnimatedTextSlideUp';

/**
 * Configuration, static data, and animation variants
 * for the Foundation content section.
 * Note: This section consolidates constants and data that were previously
 * in separate files (config.ts, ContactLink.tsx, DescriptionSection.tsx)
 * for easier cleanup and optimization.
 */

// --- Animation Constants ---
// Durations and stagger delays for Framer Motion animations
const durationPrimary = 1.0; // Duration for main description and titles
const durationSecondary = 0.5; // Duration for list items and links
const staggerFast = 0.1; // Stagger delay for items within lists
const staggerMedium = 0.2; // Stagger delay for lists within columns or link groups
const staggerSlow = 0.5; // Stagger delay for main columns/sections

// --- Animation Variants ---
// Shared Framer Motion variants used throughout the component

// Stagger Variants for the top details section container (animates columns)
const detailsContainerVariants: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: staggerSlow,
		},
	},
};

// Variants for individual columns within the details section (fades in, staggers items)
const columnVariants: Variants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: {
			staggerChildren: staggerSlow,
		},
	},
};

// Variants for individual items (text, links) within columns (fades/slides up)
const itemVariants: Variants = {
	hidden: { opacity: 0, y: 10 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: durationSecondary,
			ease: [0.22, 1, 0.36, 1], // easeOutCirc equivalent
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

// --- Description Text ---

// Array of alternative paragraphs for random selection in DescriptionSection.
// Provides dynamic content variation on click/interaction.
const paragraphs = [
	'In the fertile void between disciplines, Incomplete Infinity cultivates living frameworks rather than final artifacts.',
	'We exist in the deliberate pause between completion and becoming. Incomplete Infinity navigates the territories where technology becomes language, where sustainability becomes conversation, and where creativity transmutes the abstract into the experiential. Our work inhabits the fertile tensions between disorder and pattern, between revelation and concealment, between finite expression and infinite interpretation.',
	'We dwell in the territory of incompleteness—where unfinished becomes invitation rather than flaw.',
	'At the intersection of imperfection, mystery, and openness, Incomplete Infinity crafts experiences that resist finite closure. We navigate liminal spaces where technology functions as collaborative language rather than mere tool, where sustainability manifests as regenerative dialogue with natural systems, and where creativity transforms abstract potential into tangible yet unresolved encounters. Our work exists not as static artifact but as living ecosystem—adapting, evolving, and completing itself anew with each engagement.',
	'Incomplete Infinity occupies the tension between definition and possibility.',
	'We architect the unfinished—creating systems and experiences that evolve beyond their origins through engagement.',
	'Between conception and completion lies a fertile territory of possibility. We transform apparent limitations into portals of potential, crafting experiences that gain strength through vulnerability and resonance through ambiguity. Each project exists as structured emergence: deliberately unresolved systems that invite completion without dictating conclusion.',
];

/**
 * Selects two unique random paragraphs from the source array.
 * Designed to run client-side after mount to ensure different content
 * for different users or sessions, enhancing the dynamic feel.
 * @param sourceArray - The array of strings to select from.
 * @returns A tuple containing two distinct paragraphs, or potentially undefined
 *          if the source array has fewer than two elements.
 */
const selectRandomParagraphs = (sourceArray: string[]): [string | undefined, string | undefined] => {
	let paragraph1: string | undefined;
	let paragraph2: string | undefined;

	if (sourceArray.length >= 2) {
		const index1 = Math.floor(Math.random() * sourceArray.length);
		paragraph1 = sourceArray[index1];

		let index2 = Math.floor(Math.random() * sourceArray.length);
		while (index2 === index1) {
			index2 = Math.floor(Math.random() * sourceArray.length);
		}
		paragraph2 = sourceArray[index2];
	} else if (sourceArray.length === 1) {
		paragraph1 = sourceArray[0];
	}
	return [paragraph1, paragraph2];
};

// --- Lists Data ---

// Data for the client list displayed in the third column (desktop only).
const clientList = [
	{ text: 'Porsche' },
	{ text: 'Lotus Cars' },
	{ text: 'Coca-Cola' },
	{ text: 'Calvin-Klein' },
	{ text: 'Meta' },
	{ text: 'Nohlab' },
	{ text: 'Salon Architects' },
	{ text: 'Taiwan Nat. Museum of Fine Arts' },
	{ text: 'Outernet London' },
	{ text: 'Saasfee Pavillon' },
	{ text: 'Atelier Des Lumieres' },
	{ text: 'Sonar Istanbul' },
	{ text: 'Eglise De La Madeleine' },
];

// Data for the services list displayed in the services column.
const servicesList1 = ['Creative Strategy', 'Reseach', 'Direction', '', 'Production', '', '& Art Exhibitions'];

// Data for contact links displayed in the contact column.
const contactLinks = [
	{ href: 'mailto:hey@u29dc.com', text: 'hey@u29dc.com' },
	{ href: 'https://cal.com/u29dc', text: 'cal.com/u29dc' },
	{ href: 'https://instagram.com/u29dc/', text: 'Instagram@u29dc' },
	{ href: 'https://linkedin.com/in/u29dc/', text: 'LinkedIn@u29dc' },
];

/**
 * Props for the ContactLink component.
 */
interface ContactLinkProps {
	href: string;
	children: ReactNode;
}

/**
 * Reusable styled link component for contact details.
 * Applies hover effect and accessibility attributes.
 */
const ContactLink: FC<ContactLinkProps> = ({ href, children }): JSX.Element => (
	<Link href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gray-400">
		{children}
	</Link>
);

/**
 * Props for the DescriptionSection component.
 */
interface DescriptionSectionProps {
	/** Duration for primary animations (e.g., main text fade). */
	durationPrimary: number;
	/** Stagger delay between items in the description paragraph animation. */
	staggerMedium: number;
}

/**
 * Renders the main description section with dynamic paragraph shuffling.
 * Isolated into its own component logic (though defined inline here)
 * primarily to manage its state for paragraph randomization independently,
 * preventing unnecessary re-animations of other FoundationContent parts
 * when only the text changes.
 */
const DescriptionSection: FC<DescriptionSectionProps> = ({ durationPrimary, staggerMedium }): JSX.Element => {
	// State holds the two currently selected random paragraphs.
	// Initialized client-side in useEffect to ensure dynamic content.
	const [selectedParagraphs, setSelectedParagraphs] = useState<[string | undefined, string | undefined]>([undefined, undefined]);

	// Effect to set initial random paragraphs only on the client after mount.
	useEffect(() => {
		setSelectedParagraphs(selectRandomParagraphs(paragraphs));
	}, []); // Empty dependency array ensures this runs only once after mount.

	// Function to regenerate paragraphs on click, wrapped in useCallback for performance.
	const regenerateParagraphs = useCallback(() => {
		setSelectedParagraphs(selectRandomParagraphs(paragraphs));
	}, []);

	const [paragraph1, paragraph2] = selectedParagraphs;

	// Combine description text for AnimatedTextFadeIn component.
	// Includes the fixed introductory paragraph and the two dynamic ones.
	// Blank strings are added to maintain spacing equivalent to paragraph margins.
	const descriptionText = [
		'Incomplete Infinity is an evolving, multifaceted creative practice working with companies and institutions in pursuit of a better future. Embracing an enigmatic style, we create work that is completed by the viewer and lives on in their minds.',
		'', // Spacer
		paragraph1 || '', // Use selected random paragraph 1
		'', // Spacer
		paragraph2 || '', // Use selected random paragraph 2
	];

	return (
		<div
			className={clsx(
				'row-start-2', // Position in the parent grid
				'grid grid-cols-1 gap-4 md:grid-cols-3', // Grid for description alignment
			)}
		>
			<div
				className={clsx(
					'font-caption-01 h-fit space-y-0 text-sm md:text-base',
					'col-span-1 md:col-span-2 md:col-start-2', // Column spanning for layout
					'cursor-pointer', // Indicate interactivity for paragraph regeneration
				)}
				onClick={regenerateParagraphs} // Regenerate paragraphs on click
			>
				{/* Animated text block */}
				<AnimatedTextFadeIn text={descriptionText} el="div" className="space-y-0" duration={durationPrimary} staggerChildren={staggerMedium} />

				{/* Logo displayed below the text */}
				<motion.div className="mt-12 flex w-full justify-start mix-blend-multiply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: durationPrimary }}>
					<Image src="/assets/meta/u29dc.webp" alt="Incomplete Infinity Logo" width={50} height={25} />
				</motion.div>
			</div>
		</div>
	);
};

/**
 * Main component for the Foundation section content.
 * Orchestrates the layout and animation of the different content columns
 * (Services, Contact, Brands/Clients) and the main Description section.
 * Uses Framer Motion for staggered entrance animations.
 */
const FoundationContent: FC = (): JSX.Element => {
	return (
		// Outer container with padding
		<div className={clsx('h-full w-full p-4')}>
			{/* Inner grid structure for overall content layout */}
			<div
				className={clsx(
					'grid h-full w-full grid-rows-[auto_1fr_auto]', // Defines rows for details, description, implicit spacer?
					'gap-20 md:gap-12 lg:gap-16', // Responsive vertical spacing
				)}
			>
				{/* Top Details Section: Services, Contact, Brands */}
				<motion.div
					className={clsx(
						'row-start-1 self-end', // Position at the top, aligned to bottom of its row space
						'text-xs md:text-sm', // Typography
						'grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-4', // Responsive grid layout
					)}
					variants={detailsContainerVariants}
					initial="hidden"
					animate="visible"
				>
					{/* Column: Services */}
					{/* Responsive Order: 3rd on mobile, 2nd on desktop. */}
					<motion.div
						className={clsx(
							'col-span-1 flex flex-col justify-between space-y-4',
							'order-3 md:order-2', // CSS order for responsiveness
						)}
						variants={columnVariants}
					>
						{/* Services Title */}
						<motion.div className="flex flex-col" variants={itemVariants}>
							<AnimatedTextSlideUp text="Services" el="span" duration={durationPrimary} />
						</motion.div>
						{/* Services List Part 1 */}
						<motion.div className="flex flex-col" variants={listStaggerVariants}>
							{servicesList1.map((service, index) => (
								<motion.span key={index} variants={itemVariants}>
									<AnimatedTextSlideUp text={service} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
								</motion.span>
							))}
						</motion.div>
					</motion.div>

					{/* Column: Contact */}
					{/* Responsive Order: 2nd on mobile, 1st on desktop. */}
					<motion.div
						className={clsx(
							'col-span-1 flex flex-col justify-between space-y-4',
							'order-2 md:order-1', // CSS order for responsiveness
						)}
						variants={columnVariants}
					>
						{/* Contact Links List */}
						<motion.div className="flex flex-col" variants={listStaggerVariants}>
							{contactLinks.map((link) => (
								<motion.div key={link.href} variants={itemVariants}>
									<ContactLink href={link.href}>
										<AnimatedTextSlideUp text={link.text} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
									</ContactLink>
								</motion.div>
							))}
							{/* Link Arrow */}
							<motion.span className="mt-1" variants={itemVariants}>
								<AnimatedTextSlideUp text="→" el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
							</motion.span>
						</motion.div>
						{/* Contact Title */}
						<motion.div className="flex flex-col" variants={itemVariants}>
							<AnimatedTextSlideUp text="Contact" el="span" duration={durationPrimary} />
						</motion.div>
					</motion.div>

					{/* Column: Brands, Studios & Exhibitions (Desktop Only) */}
					{/* Contains a list of clients/partners. Hidden on mobile. */}
					<motion.div
						id="about-details-content-brands" // Consider if ID is strictly needed
						className={clsx(
							'col-span-1 flex flex-col justify-between space-y-4',
							'hidden md:order-3 md:flex', // Hide on mobile, show as 3rd item on desktop
						)}
						variants={columnVariants}
					>
						{/* Titles */}
						<motion.div className="flex flex-col" variants={itemVariants}>
							<AnimatedTextSlideUp text={['Brands, Studios', '& Exhibitions']} el="div" staggerChildren={staggerFast} duration={durationPrimary} />
						</motion.div>
						{/* Client List */}
						<motion.div
							className={clsx(
								'grid grid-cols-1 gap-x-4 gap-y-1', // Single column layout for list items
							)}
							variants={listItemStaggerVariants}
						>
							{clientList.map((item, index) => (
								<motion.span key={index} variants={itemVariants}>
									<AnimatedTextSlideUp text={item.text} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerFast} />
								</motion.span>
							))}
						</motion.div>
					</motion.div>
				</motion.div>

				{/* Main Description Section Component */}
				<DescriptionSection durationPrimary={durationPrimary} staggerMedium={staggerMedium} />
			</div>
		</div>
	);
};

export default FoundationContent;
