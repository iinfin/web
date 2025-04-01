'use client';

import { useEffect, useState } from 'react';

import clsx from 'clsx';
import { motion, type SpringOptions, useSpring } from 'framer-motion';

// Use centralized input hook
import { useCursor } from '@/app/context/CursorContext';
import { useInputState } from '@/app/hooks/useInputState';

// Use cursor context

// Spring options for the central dot (slightly tighter/faster)
const dotSpringOptions: SpringOptions = {
	stiffness: 1200,
	damping: 60,
	mass: 0.1,
};

// Spring options for the lines (slightly different damping for subtle variation)
const lineSpringOptionsX: SpringOptions = {
	stiffness: 1000,
	damping: 55, // Slightly different damping for X
	mass: 0.1,
};
const lineSpringOptionsY: SpringOptions = {
	stiffness: 1000,
	damping: 50, // Original damping for Y
	mass: 0.1,
};

/**
 * Custom cursor component that provides a cross-hair style cursor
 * with smooth animations and visibility/style transitions based on context.
 * Lines have slightly desynchronized easing for a more natural feel.
 */
export default function Cursor(): JSX.Element | null {
	const { pixel } = useInputState(); // Get raw pixel data
	const { cursorType, cursorText } = useCursor(); // Get context data

	// Springs for the central dot
	const smoothX = useSpring(pixel.x, dotSpringOptions);
	const smoothY = useSpring(pixel.y, dotSpringOptions);

	// Separate springs for the lines with slightly different options
	const lineSmoothX = useSpring(pixel.x, lineSpringOptionsX);
	const lineSmoothY = useSpring(pixel.y, lineSpringOptionsY);

	const [isClient, setIsClient] = useState(false);
	const [isTouchDevice, setIsTouchDevice] = useState(false);

	// Detect client-side and touch capabilities
	useEffect(() => {
		setIsClient(true);
		const touchDetected = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		setIsTouchDevice(touchDetected);

		// Only hide system cursor if not on a touch device
		if (!touchDetected) {
			document.body.style.cursor = 'none';
		}

		// Cleanup function to restore cursor on component unmount
		return () => {
			document.body.style.cursor = 'auto';
		};
	}, []);

	// Update ALL spring targets when raw input changes
	useEffect(() => {
		smoothX.set(pixel.x);
		smoothY.set(pixel.y);
		lineSmoothX.set(pixel.x);
		lineSmoothY.set(pixel.y);
	}, [pixel.x, pixel.y, smoothX, smoothY, lineSmoothX, lineSmoothY]); // Include all springs in dependency array

	// Don't render server-side or on touch devices
	if (!isClient || isTouchDevice) {
		return null;
	}

	// Determine cursor states from context
	const isHidden = cursorType === 'hidden';
	const isPointer = cursorType === 'pointer';
	// const isText = cursorType === 'text'; // Can be used for text-specific styling
	const isDefault = cursorType === 'default';

	// Base styles for the container
	const containerClasses = clsx(
		'pointer-events-none fixed inset-0 z-[9999]', // Use high z-index like CustomCursor
		'transition-opacity duration-300 ease-in-out',
		isHidden ? 'opacity-0' : 'opacity-100',
	);

	// Base styles for cross-hair lines
	const lineBaseClasses = 'absolute bg-black/80 dark:bg-white/80 mix-blend-difference';

	// Base styles for the central dot
	const dotBaseClasses = 'absolute rounded-full transition-[transform,width,height,background-color] duration-200 ease-out';

	return (
		<motion.div // Use motion.div for potential future container animations
			className={containerClasses}
			aria-hidden="true" // Hide from screen readers
		>
			{/* Vertical cursor line - Use lineSmoothX */}
			<motion.div
				className={clsx(lineBaseClasses, 'top-0 h-full w-[1px]')}
				style={{ x: lineSmoothX }} // Use X spring for the vertical line
				animate={{ opacity: isDefault ? 0.2 : 0 }} // Fade out lines when not default (adjust opacity as desired)
				transition={{ duration: 0.2, ease: 'easeOut' }}
			/>

			{/* Horizontal cursor line - Use lineSmoothY */}
			<motion.div
				className={clsx(lineBaseClasses, 'left-0 h-[1px] w-full')}
				style={{ y: lineSmoothY }} // Use Y spring for the horizontal line
				animate={{ opacity: isDefault ? 0.2 : 0 }} // Fade out lines when not default (adjust opacity as desired)
				transition={{ duration: 0.2, ease: 'easeOut' }}
			/>

			{/* Cursor dot - Uses original smoothX/smoothY */}
			<motion.div
				className={clsx(
					dotBaseClasses,
					// Conditional styling for the dot
					isPointer ? 'bg-black/20 dark:bg-white/20' : 'bg-black dark:bg-white', // Example: lighter/larger for pointer
				)}
				style={{
					x: smoothX, // Dot uses original springs
					y: smoothY,
					translateX: '-50%', // Center the dot
					translateY: '-50%',
				}}
				// Animate size and potentially other properties
				animate={{
					width: isPointer ? 24 : 6,
					height: isPointer ? 24 : 6,
					// scale: isPointer ? 1.2 : 1, // Optional scaling
				}}
			/>

			{/* Optional: Element to display text */}
			{cursorText && (
				<motion.div
					className="absolute text-sm whitespace-nowrap text-black mix-blend-difference dark:text-white"
					style={{
						x: smoothX, // Position text based on the dot's position
						y: smoothY,
						translateX: '-50%', // Adjust as needed for text positioning
						translateY: '15px', // Position below the dot (adjust offset)
					}}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					{cursorText}
				</motion.div>
			)}
		</motion.div>
	);
}
