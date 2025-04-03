'use client';

import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';

import clsx from 'clsx';
import { motion } from 'framer-motion';

import AnimatedTextFadeIn from '@/app/components/shared/AnimatedTextFadeIn';

import { paragraphs, selectRandomParagraphs } from './data';

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
		setSelectedParagraphs(selectRandomParagraphs(paragraphs));
	}, []); // Empty dependency array ensures this runs only once after mount

	// Function to regenerate paragraphs, wrapped in useCallback
	const regenerateParagraphs = useCallback(() => {
		setSelectedParagraphs(selectRandomParagraphs(paragraphs));
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
				<motion.div className="mt-12 flex w-full justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: durationPrimary }}>
					<Image src="/assets/meta/u29dc.webp" alt="Incomplete Infinity Logo" width={50} height={25} />
				</motion.div>
			</div>
		</div>
	);
};

export default DescriptionSection;
