'use client';

import type { FC, ReactNode } from 'react';

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
	introduction: [
		'Incomplete Infinity is an evolving, multifaceted creative practice working with companies and institutions in pursuit of a better future. Embracing an enigmatic style, creates work that is completed by the viewer and lives on in their minds.',

		'It operates in the deliberate pause, dwells in the charged moment.',

		'It rejects the obvious intersections, searches for the unmapped territories.',

		'It inhabit the shadows between what is seen and what is felt.',

		'It finds in the unresolved not deficiency, but authenticity.',

		'It expresses itself... in incomplete form.',

		"After all, isn't true infinity always incomplete?",
	],
	// Lists for section content
	lists: {
		// Services list for services column
		services: ['Creative Strategy', '', 'Research', 'Direction', '', 'Production'],

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
	const descriptionText = CONTENT.introduction;

	return (
		<div
			className={clsx(
				'row-start-2', // Position in grid
				'grid grid-cols-1 gap-4 md:grid-cols-3', // Layout grid
			)}
		>
			<div
				className={clsx(
					'h-fit',
					'col-span-1 md:col-span-2 md:col-start-2', // Column positioning
					'grid grid-rows-[auto_1fr] gap-12', // Explicit grid for logo and text
				)}
			>
				{/* Logo display - explicit row 1 */}
				<div className="row-start-1 mix-blend-multiply">
					<Image src="/assets/meta/u29dc.webp" alt="Incomplete Infinity Logo" width={50} height={25} priority />
				</div>

				{/* Text content - explicit row 2 */}
				<div className="row-start-2 space-y-4">
					{descriptionText.map((paragraph, index) => (
						<p key={`p-${index}`}>{paragraph.trim() === '' ? '\u00A0' : paragraph}</p>
					))}
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
					'order-3 md:order-3', // Responsive order
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
					'order-2 md:order-2', // Responsive order
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
					'hidden md:order-1 md:flex', // Hidden on mobile
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
		<div
			className={clsx(
				'p-4',
				'grid h-full w-full grid-rows-[auto_1fr_auto_auto]', // Grid layout
				'gap-20 md:gap-12 lg:gap-16', // Responsive spacing
			)}
		>
			{/* Top Details Section */}
			<DetailsSection />

			{/* Main Description Section */}
			<DescriptionSection />
		</div>
	);
};

export default FoundationContent;
