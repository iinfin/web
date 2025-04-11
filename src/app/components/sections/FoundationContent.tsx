'use client';

import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import clsx from 'clsx';
import { motion, type Variants } from 'framer-motion';

import AnimatedTextFadeIn from '@/components/animations/AnimatedTextFadeIn';
import AnimatedTextSlideUp from '@/components/animations/AnimatedTextSlideUp';

// =============================================
// CONFIGURATION AND CONSTANTS
// =============================================

/**
 * Animation timing constants for consistent motion patterns.
 */
const ANIMATION = {
	duration: {
		primary: 1.0, // Duration for main description and titles
		secondary: 0.5, // Duration for list items and links
	},
	stagger: {
		fast: 0.1, // Stagger delay for items within lists
		middle: 0.2, // Stagger delay for lists within columns or link groups
		slow: 0.5, // Stagger delay for main columns/sections
	},
	ease: {
		outCirc: [0.22, 1, 0.36, 1], // easeOutCirc equivalent
	},
};

/**
 * Animation variants for component motion patterns.
 */
const VARIANTS = {
	// Stagger variants for the details section container
	detailsContainer: {
		hidden: {},
		visible: {
			transition: {
				staggerChildren: ANIMATION.stagger.slow,
			},
		},
	} as Variants,

	// Variants for individual columns within sections
	column: {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: ANIMATION.stagger.slow,
			},
		},
	} as Variants,

	// Variants for individual items within columns
	item: {
		hidden: { opacity: 0, y: 10 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: ANIMATION.duration.secondary,
				ease: ANIMATION.ease.outCirc,
			},
		},
	} as Variants,

	// Variants for staggering lists
	listStagger: {
		hidden: {},
		visible: {
			transition: {
				staggerChildren: ANIMATION.stagger.middle,
			},
		},
	} as Variants,

	// Variants for staggering items within a list
	listItemStagger: {
		hidden: {},
		visible: {
			transition: {
				staggerChildren: ANIMATION.stagger.fast,
			},
		},
	} as Variants,
};

/**
 * Content data for foundation section.
 */
const CONTENT = {
	// Fixed introduction paragraph
	introduction:
		'Incomplete Infinity is an evolving, multifaceted creative practice working with companies and institutions in pursuit of a better future. Embracing an enigmatic style, we create work that is completed by the viewer and lives on in their minds.',

	// Description paragraphs for random selection
	description: [
		'In the fertile void between disciplines, Incomplete Infinity cultivates living frameworks rather than final artifacts.',
		'We exist in the deliberate pause between completion and becoming. Incomplete Infinity navigates the territories where technology becomes language, where sustainability becomes conversation, and where creativity transmutes the abstract into the experiential. Our work inhabits the fertile tensions between disorder and pattern, between revelation and concealment, between finite expression and infinite interpretation.',
		'We dwell in the territory of incompleteness—where unfinished becomes invitation rather than flaw.',
		'At the intersection of imperfection, mystery, and openness, Incomplete Infinity crafts experiences that resist finite closure. We navigate liminal spaces where technology functions as collaborative language rather than mere tool, where sustainability manifests as regenerative dialogue with natural systems, and where creativity transforms abstract potential into tangible yet unresolved encounters. Our work exists not as static artifact but as living ecosystem—adapting, evolving, and completing itself anew with each engagement.',
		'Incomplete Infinity occupies the tension between definition and possibility.',
		'We architect the unfinished—creating systems and experiences that evolve beyond their origins through engagement.',
		'Between conception and completion lies a fertile territory of possibility. We transform apparent limitations into portals of potential, crafting experiences that gain strength through vulnerability and resonance through ambiguity. Each project exists as structured emergence: deliberately unresolved systems that invite completion without dictating conclusion.',
		"At Incomplete Infinity, we navigate the threshold between order and chaos, embracing imperfection as the fertile ground where true innovation emerges. We craft experiences that resist immediate comprehension, preferring instead to dwell in the mysterious territories where meaning remains partially concealed, inviting deeper contemplation. Our work deliberately preserves spaces of emptiness—incomplete by design—creating frameworks that await your participation to fulfill their purpose, ensuring each encounter becomes uniquely yours. We find resonance in Carl Jung's insight that within apparent disorder lies hidden pattern, in Khalil Gibran's journey toward the arcane, and in Degas' understanding that true art manifests in the space between creator and observer.",
	],

	// Lists for section content
	lists: {
		// Services list for services column
		services: ['Creative Strategy', '', 'Reseach', 'Direction', '', 'Production'],

		// Clients list for clients column
		clients: [
			{ text: 'Porsche' },
			{ text: 'Lotus Cars' },
			{ text: 'Coca-Cola' },
			{ text: 'Calvin-Klein' },
			{ text: 'Meta' },
			{ text: '' },
			{ text: 'Nohlab' },
			{ text: 'Salon Architects' },
			{ text: 'Outernet London' },
			{ text: '' },
			{ text: 'Taiwan Nat. Museum of Fine Arts' },
			{ text: 'Saasfee Pavillon' },
			{ text: 'Atelier Des Lumieres' },
			{ text: 'Sonar Istanbul' },
			{ text: 'Eglise De La Madeleine' },
		],

		// Contact links for contact column
		contacts: [
			{ href: 'mailto:hey@u29dc.com', text: 'hey@u29dc.com' },
			{ href: '', text: '' },
			{ href: 'https://cal.com/u29dc', text: 'cal.com/u29dc' },
			{ href: 'https://instagram.com/u29dc/', text: 'Instagram@u29dc' },
			{ href: 'https://linkedin.com/in/u29dc/', text: 'LinkedIn@u29dc' },
			{ href: '', text: '' },
		],
	},
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Selects two unique random paragraphs from the source array.
 * @param sourceArray - Array of paragraph strings to select from.
 * @returns A tuple of two distinct paragraphs, or undefined values if array is too small.
 */
const selectRandomParagraphs = (sourceArray: string[]): [string | undefined, string | undefined] => {
	// Handle empty array case
	if (sourceArray.length === 0) return [undefined, undefined];

	// Handle single-item array case
	if (sourceArray.length === 1) return [sourceArray[0], undefined];

	// Select first random paragraph
	const index1 = Math.floor(Math.random() * sourceArray.length);
	const paragraph1 = sourceArray[index1];

	// Select second random paragraph (ensuring it's different from the first)
	let index2 = Math.floor(Math.random() * sourceArray.length);
	while (index2 === index1) {
		index2 = Math.floor(Math.random() * sourceArray.length);
	}
	const paragraph2 = sourceArray[index2];

	return [paragraph1, paragraph2];
};

// =============================================
// SUB-COMPONENTS
// =============================================

/**
 * Props for ContactLink component.
 */
interface ContactLinkProps {
	href: string;
	children: ReactNode;
}

/**
 * Styled link component for contact details with hover effect.
 */
const ContactLink: FC<ContactLinkProps> = ({ href, children }): JSX.Element => (
	<Link href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-gray-400">
		{children}
	</Link>
);

/**
 * Props for DescriptionSection component.
 */
interface DescriptionSectionProps {
	durationPrimary: number;
	staggerSecondary: number;
}

/**
 * Main content description section with interactive paragraph shuffling.
 */
const DescriptionSection: FC<DescriptionSectionProps> = ({ durationPrimary, staggerSecondary }): JSX.Element => {
	// State for randomly selected paragraphs
	const [selectedParagraphs, setSelectedParagraphs] = useState<[string | undefined, string | undefined]>([undefined, undefined]);

	// Initialize paragraphs after component mount
	useEffect(() => {
		setSelectedParagraphs(selectRandomParagraphs(CONTENT.description));
	}, []);

	// Handler to regenerate paragraphs on click
	const regenerateParagraphs = useCallback(() => {
		setSelectedParagraphs(selectRandomParagraphs(CONTENT.description));
	}, []);

	const [paragraph1, paragraph2] = selectedParagraphs;

	// Construct full description text array with spacers
	const descriptionText = [
		CONTENT.introduction,
		'', // Spacer
		paragraph1 || '', // First random paragraph
		'', // Spacer
		paragraph2 || '', // Second random paragraph
	];

	return (
		<div
			className={clsx(
				'row-start-2', // Position in grid
				'grid grid-cols-1 gap-4 md:grid-cols-3', // Layout grid
			)}
		>
			<div
				className={clsx(
					'font-caption-01 h-fit space-y-0 text-sm md:text-base',
					'col-span-1 md:col-span-2 md:col-start-2', // Column positioning
					'cursor-pointer', // Show interactivity
				)}
				onClick={regenerateParagraphs}
			>
				{/* Animated text content */}
				<AnimatedTextFadeIn text={descriptionText} el="div" className="space-y-0" duration={durationPrimary} staggerChildren={staggerSecondary} />

				{/* Logo display */}
				<motion.div className="mt-12 flex w-full justify-start mix-blend-multiply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: durationPrimary }}>
					<Image src="/assets/meta/u29dc.webp" alt="Incomplete Infinity Logo" width={50} height={25} />
				</motion.div>
			</div>
		</div>
	);
};

/**
 * Props for DetailsSection component.
 */
interface DetailsSectionProps {
	durationPrimary: number;
	durationSecondary: number;
	staggerPrimary: number;
}

/**
 * Top details section with services, contact and clients information.
 */
const DetailsSection: FC<DetailsSectionProps> = ({ durationPrimary, durationSecondary, staggerPrimary }): JSX.Element => {
	return (
		<motion.div
			className={clsx(
				'row-start-1 self-end', // Position in grid
				'text-xs md:text-sm', // Typography
				'grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-4', // Layout grid
			)}
			variants={VARIANTS.detailsContainer}
			initial="hidden"
			animate="visible"
		>
			{/* Services Column */}
			<motion.div
				className={clsx(
					'col-span-1 flex flex-col justify-between space-y-4',
					'order-3 md:order-2', // Responsive order
				)}
				variants={VARIANTS.column}
			>
				{/* Services Title */}
				<motion.div className="flex flex-col" variants={VARIANTS.item}>
					<AnimatedTextSlideUp text="Services" el="span" duration={durationPrimary} />
				</motion.div>

				{/* Services List */}
				<motion.div className="flex flex-col" variants={VARIANTS.listStagger}>
					{CONTENT.lists.services.map((service, index) => (
						<motion.span key={index} variants={VARIANTS.item}>
							<AnimatedTextSlideUp text={service} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerPrimary} />
						</motion.span>
					))}
				</motion.div>
			</motion.div>

			{/* Contact Column */}
			<motion.div
				className={clsx(
					'col-span-1 flex flex-col justify-between space-y-4',
					'order-2 md:order-1', // Responsive order
				)}
				variants={VARIANTS.column}
			>
				{/* Contact Links */}
				<motion.div className="flex flex-col" variants={VARIANTS.listStagger}>
					{CONTENT.lists.contacts.map((link, index) => (
						<motion.div key={index} variants={VARIANTS.item}>
							<ContactLink href={link.href}>
								<AnimatedTextSlideUp text={link.text} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerPrimary} />
							</ContactLink>
						</motion.div>
					))}
					{/* Link Arrow */}
					<motion.span className="mt-1" variants={VARIANTS.item}>
						<AnimatedTextSlideUp text="→" el="span" duration={durationSecondary} delay={0} staggerChildren={staggerPrimary} />
					</motion.span>
				</motion.div>

				{/* Contact Title */}
				<motion.div className="flex flex-col" variants={VARIANTS.item}>
					<AnimatedTextSlideUp text="Contact" el="span" duration={durationPrimary} />
				</motion.div>
			</motion.div>

			{/* Clients Column (Desktop Only) */}
			<motion.div
				className={clsx(
					'col-span-1 flex flex-col justify-between space-y-4',
					'hidden md:order-3 md:flex', // Hidden on mobile
				)}
				variants={VARIANTS.column}
			>
				{/* Clients Title */}
				<motion.div className="flex flex-col" variants={VARIANTS.item}>
					<AnimatedTextSlideUp text={['Brands, Studios', '& Exhibitions']} el="div" staggerChildren={staggerPrimary} duration={durationPrimary} />
				</motion.div>

				{/* Clients List */}
				<motion.div
					className={clsx(
						'grid grid-cols-1 gap-x-4 gap-y-1', // List layout
					)}
					variants={VARIANTS.listItemStagger}
				>
					{CONTENT.lists.clients.map((item, index) => (
						<motion.span key={index} variants={VARIANTS.item}>
							<AnimatedTextSlideUp text={item.text} el="span" duration={durationSecondary} delay={0} staggerChildren={staggerPrimary} />
						</motion.span>
					))}
				</motion.div>
			</motion.div>
		</motion.div>
	);
};

// =============================================
// MAIN COMPONENT
// =============================================

/**
 * Main component for Foundation section content with responsive layout.
 * Orchestrates the layout and animation of different content sections.
 */
const FoundationContent: FC = (): JSX.Element => {
	return (
		<div className={clsx('h-full w-full p-4')}>
			<div
				className={clsx(
					'grid h-full w-full grid-rows-[auto_1fr_auto_auto]', // Grid layout
					'gap-20 md:gap-12 lg:gap-16', // Responsive spacing
				)}
			>
				{/* Top Details Section */}
				<DetailsSection durationPrimary={ANIMATION.duration.primary} durationSecondary={ANIMATION.duration.secondary} staggerPrimary={ANIMATION.stagger.fast} />

				{/* Main Description Section */}
				<DescriptionSection durationPrimary={ANIMATION.duration.primary} staggerSecondary={ANIMATION.stagger.middle} />
			</div>
		</div>
	);
};

export default FoundationContent;
