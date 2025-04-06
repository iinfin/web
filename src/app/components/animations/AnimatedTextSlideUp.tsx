'use client';

import { type ElementType } from 'react';

import { clsx } from 'clsx';
import { motion, type Variants } from 'framer-motion';

/**
 * Props for the AnimatedTextSlideUp component.
 */
type AnimatedTextSlideUpProps = {
	/** The text content to animate. Can be a single string or an array of strings for multiple lines. */
	text: string | string[];
	/** The HTML element type to use for the container (e.g., 'h1', 'p', 'div'). Defaults to 'div'. */
	el?: ElementType;
	/** Optional additional CSS class names to apply to the container element. */
	className?: string;
	/** Animation delay for each line reveal in seconds. Defaults to 0.04. */
	delay?: number;
	/** Stagger delay between line animations in seconds. Defaults to 0.05. */
	staggerChildren?: number;
	/** Animation duration for each line reveal in seconds. Defaults to 0.5. */
	duration?: number;
	/** Easing function for the animation. Defaults to [0.22, 1, 0.36, 1] (easeOutCirc). */
	ease?: number[];
};

/**
 * A reusable component to animate text lines into view with a masked slide-up effect.
 * Each line slides up from the bottom within an overflow-hidden container.
 *
 * @example
 * <AnimatedTextSlideUp text="Hello World" el="h1" className="text-4xl font-bold" />
 * <AnimatedTextSlideUp text={["Multiple", "Lines", "Example"]} el="p" />
 */
export const AnimatedTextSlideUp: React.FC<AnimatedTextSlideUpProps> = ({
	text,
	el: Wrapper = 'div', // Default to 'div' if el is not provided
	className,
	delay = 0.04,
	staggerChildren = 0.05,
	duration = 0.5,
	ease = [0.22, 1, 0.36, 1], // Default easeOutCirc easing
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
			y: '110%', // Start below the mask
			opacity: 0,
		},
		visible: {
			y: '0%', // Animate to original position
			opacity: 1,
			transition: {
				duration: duration,
				ease: ease, // Use the provided or default ease
				delay: delay, // Apply initial delay per line if needed
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
				// Outer span for masking (overflow hidden)
				<motion.span
					key={index}
					className="block overflow-hidden" // Use Tailwind for masking
					aria-hidden // Hide decorative spans from screen readers
				>
					{/* Inner span for animation */}
					<motion.span
						className="block" // Ensure it takes block display
						variants={lineVariants}
					>
						{/* Use non-breaking space for empty lines to maintain height */}
						{line.trim() === '' ? '\u00A0' : line}
					</motion.span>
				</motion.span>
			))}
		</MotionWrapper>
	);
};

export default AnimatedTextSlideUp;
