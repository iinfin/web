'use client';

import { type ElementType } from 'react';

import { clsx } from 'clsx';
import { motion, type Variants } from 'framer-motion';

/**
 * Props for the AnimatedTextFadeIn component.
 */
type AnimatedTextFadeInProps = {
	/** The text content to animate. Can be a single string or an array of strings for multiple lines. */
	text: string | string[];
	/** The HTML element type to use for the container (e.g., 'h1', 'p', 'div'). Defaults to 'div'. */
	el?: ElementType;
	/** Optional additional CSS class names to apply to the container element. */
	className?: string;
	/** Stagger delay between line animations in seconds. Defaults to 0.05. */
	staggerChildren?: number;
	/** Animation duration for each line reveal in seconds. Defaults to 0.6. */
	duration?: number;
	/** Easing function for the animation. Defaults to 'easeInOut'. */
	ease?: string | number[];
};

/**
 * A reusable component to animate text lines into view with a simple fade-in effect.
 * Each line fades in sequentially.
 *
 * @example
 * <AnimatedTextFadeIn text="Hello World" el="h1" className="text-4xl font-bold" />
 * <AnimatedTextFadeIn text={["Multiple", "Lines", "Example"]} el="p" />
 */
export const AnimatedTextFadeIn: React.FC<AnimatedTextFadeInProps> = ({
	text,
	el: Wrapper = 'div', // Default to 'div' if el is not provided
	className,
	staggerChildren = 0.05,
	duration = 0.6,
	ease = 'easeInOut',
}) => {
	const lines = Array.isArray(text) ? text : [text];

	const containerVariants: Variants = {
		hidden: {},
		visible: {
			transition: {
				staggerChildren: staggerChildren,
			},
		},
	};

	const lineVariants: Variants = {
		hidden: {
			opacity: 0,
		},
		visible: {
			opacity: 1,
			transition: {
				duration: duration,
				ease: ease,
			},
		},
	};

	// Ensure Wrapper is a motion component - handle string tags vs components
	// Cast motion to any to bypass complex type inference issues with dynamic tag names
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const MotionWrapper = typeof Wrapper === 'string' ? (motion as any)[Wrapper] : motion(Wrapper);

	return (
		<MotionWrapper
			className={clsx('font-inherit', className)} // Combine default and provided classes
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			aria-label={Array.isArray(text) ? text.join(' ') : text} // Accessibility
		>
			{lines.map((line, index) => (
				// Each line is a motion span that fades in
				<motion.span
					key={index}
					className="block" // Ensure block display for proper line separation
					variants={lineVariants}
					aria-hidden // Hide decorative spans from screen readers
				>
					{/* Use non-breaking space for empty lines to maintain height */}
					{line.trim() === '' ? '\u00A0' : line}
				</motion.span>
			))}
		</MotionWrapper>
	);
};

export default AnimatedTextFadeIn;
