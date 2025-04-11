'use client';

import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import clsx from 'clsx';

// =============================================
// CONFIGURATION AND CONSTANTS
// =============================================

/**
 * Content data for foundation section.
 */
const CONTENT = {
	// Fixed introduction paragraph
	introduction:
		'Incomplete Infinity is an evolving, multifaceted creative practice working with companies and institutions in pursuit of a better future. Embracing an enigmatic style, we create work that is completed by the viewer and lives on in their minds.',

	// Description paragraphs
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
 * Main content description section.
 */
const DescriptionSection: FC = (): JSX.Element => {
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

	// Construct description text with selected paragraphs
	const descriptionText = [CONTENT.introduction, paragraph1 || '', paragraph2 || ''];

	return (
		<div
			className={clsx(
				'row-start-2', // Position in grid
				'grid grid-cols-1 gap-4 md:grid-cols-3', // Layout grid
			)}
		>
			<div
				className={clsx(
					'font-caption-01 h-fit space-y-4 text-sm md:text-base', // Paragraph spacing
					'col-span-1 md:col-span-2 md:col-start-2', // Column positioning
					'cursor-pointer', // Show interactivity
				)}
				onClick={regenerateParagraphs}
			>
				<div className="space-y-4">
					{descriptionText.map((paragraph, index) => (
						<p key={index}>{paragraph.trim() === '' ? '\u00A0' : paragraph}</p>
					))}
				</div>

				{/* Logo display */}
				<div className="mt-12 flex w-full justify-start mix-blend-multiply">
					<Image src="/assets/meta/u29dc.webp" alt="Incomplete Infinity Logo" width={50} height={25} />
				</div>
			</div>
		</div>
	);
};

/**
 * Top details section with services, contact and clients information.
 */
const DetailsSection: FC = (): JSX.Element => {
	return (
		<div
			className={clsx(
				'row-start-1 self-end', // Position in grid
				'text-xs md:text-sm', // Typography
				'grid grid-cols-2 gap-8 md:grid-cols-3 md:gap-4', // Layout grid
			)}
		>
			{/* Services Column */}
			<div
				className={clsx(
					'col-span-1 flex flex-col justify-between space-y-4',
					'order-3 md:order-2', // Responsive order
				)}
			>
				{/* Services Title */}
				<div className="flex flex-col">
					<span>Services</span>
				</div>

				{/* Services List */}
				<div className="flex flex-col">
					{CONTENT.lists.services.map((service, index) => (
						<span key={index}>{service.trim() === '' ? '\u00A0' : service}</span>
					))}
				</div>
			</div>

			{/* Contact Column */}
			<div
				className={clsx(
					'col-span-1 flex flex-col justify-between space-y-4',
					'order-2 md:order-1', // Responsive order
				)}
			>
				{/* Contact Links */}
				<div className="flex flex-col">
					{CONTENT.lists.contacts.map((link, index) => (
						<div key={index}>
							{link.href ? <ContactLink href={link.href}>{link.text.trim() === '' ? '\u00A0' : link.text}</ContactLink> : <span>{link.text.trim() === '' ? '\u00A0' : link.text}</span>}
						</div>
					))}
					{/* Link Arrow */}
					<span className="mt-1">→</span>
				</div>

				{/* Contact Title */}
				<div className="flex flex-col">
					<span>Contact</span>
				</div>
			</div>

			{/* Clients Column (Desktop Only) */}
			<div
				className={clsx(
					'col-span-1 flex flex-col justify-between space-y-4',
					'hidden md:order-3 md:flex', // Hidden on mobile
				)}
			>
				{/* Clients Title */}
				<div className="flex flex-col">
					<div>
						<span>Brands, Studios</span>
						<br />
						<span>& Exhibitions</span>
					</div>
				</div>

				{/* Clients List */}
				<div
					className={clsx(
						'grid grid-cols-1 gap-x-4 gap-y-1', // List layout
					)}
				>
					{CONTENT.lists.clients.map((item, index) => (
						<span key={index}>{item.text.trim() === '' ? '\u00A0' : item.text}</span>
					))}
				</div>
			</div>
		</div>
	);
};

// =============================================
// MAIN COMPONENT
// =============================================

/**
 * Main component for Foundation section content with responsive layout.
 * Orchestrates the layout of different content sections.
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
				<DetailsSection />

				{/* Main Description Section */}
				<DescriptionSection />
			</div>
		</div>
	);
};

export default FoundationContent;
