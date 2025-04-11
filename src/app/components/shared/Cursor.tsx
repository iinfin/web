'use client';

import { useEffect, useState } from 'react';

import clsx from 'clsx';
import { motion, type SpringOptions, useSpring } from 'framer-motion';

// Use centralized input hook
import { useCursor } from '@/hooks/useCursor';
import { useInputState } from '@/hooks/useInputState';

/**
 * Animation spring options for the cursor dot.
 * Slightly tighter and faster than the line settings.
 */
const dotSpringOptions: SpringOptions = {
	stiffness: 1200,
	damping: 60,
	mass: 0.1,
};

/**
 * Animation spring options for the horizontal line.
 * Uses different damping from vertical for subtle desynchronization.
 */
const lineSpringOptionsX: SpringOptions = {
	stiffness: 1000,
	damping: 55,
	mass: 0.1,
};

/**
 * Animation spring options for the vertical line.
 * Uses different damping from horizontal for subtle desynchronization.
 */
const lineSpringOptionsY: SpringOptions = {
	stiffness: 1000,
	damping: 50,
	mass: 0.1,
};

/**
 * Custom cursor component that provides a cross-hair style cursor
 * with smooth animations and visibility/style transitions based on context.
 * Lines have slightly desynchronized easing for a more natural feel.
 *
 * @returns {JSX.Element | null} The custom cursor or null if on touch device or server.
 */
export default function Cursor(): JSX.Element | null {
	// Raw input state
	const { pixel } = useInputState();

	// Cursor configuration from context
	const { cursorType, cursorText } = useCursor();

	// Spring animations for smooth cursor movement
	const smoothX = useSpring(pixel.x, dotSpringOptions);
	const smoothY = useSpring(pixel.y, dotSpringOptions);
	const lineSmoothX = useSpring(pixel.x, lineSpringOptionsX);
	const lineSmoothY = useSpring(pixel.y, lineSpringOptionsY);

	// Feature detection and state
	const [isClient, setIsClient] = useState(false);
	const [isTouchDevice, setIsTouchDevice] = useState(false);
	const [isMouseInWindow, setIsMouseInWindow] = useState(true);

	// Client detection and event setup
	useEffect(() => {
		// Update client-side state
		setIsClient(true);

		// Detect touch capability
		const touchDetected = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		setIsTouchDevice(touchDetected);

		// Optional: Hide system cursor
		// if (!touchDetected) {
		//   document.body.style.cursor = 'none';
		// }

		// Setup mouse presence detection
		const handleMouseEnter = () => setIsMouseInWindow(true);
		const handleMouseLeave = () => setIsMouseInWindow(false);

		// Add event listeners
		document.documentElement.addEventListener('mouseenter', handleMouseEnter);
		document.documentElement.addEventListener('mouseleave', handleMouseLeave);

		// Cleanup function
		return () => {
			// Restore default cursor
			document.body.style.cursor = 'auto';

			// Remove event listeners
			document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
			document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
		};
	}, []);

	// Update spring animations when position changes
	useEffect(() => {
		// Update all spring targets
		smoothX.set(pixel.x);
		smoothY.set(pixel.y);
		lineSmoothX.set(pixel.x);
		lineSmoothY.set(pixel.y);
	}, [pixel.x, pixel.y, smoothX, smoothY, lineSmoothX, lineSmoothY]);

	// Don't render on server or touch devices
	if (!isClient || isTouchDevice) {
		return null;
	}

	// Cursor state derivation
	const isHidden = cursorType === 'hidden';
	const isPointer = cursorType === 'pointer';
	const isDefault = cursorType === 'default';

	// Style classes
	const containerClasses = clsx('pointer-events-none fixed inset-0 z-[9999]', 'transition-opacity duration-300 ease-in-out', !isHidden && isMouseInWindow ? 'opacity-100' : 'opacity-0');
	const lineBaseClasses = 'absolute bg-black/80 dark:bg-white/80 mix-blend-difference';
	const dotBaseClasses = 'absolute w-[6px] h-[6px] transition-[transform,background-color] duration-200 ease-out';

	return (
		<motion.div className={containerClasses} aria-hidden="true">
			{/* Vertical cursor line */}
			<motion.div
				className={clsx(lineBaseClasses, 'top-0 h-full w-[1px]')}
				style={{ x: lineSmoothX }}
				animate={{ opacity: isDefault ? 0.2 : 0 }}
				transition={{ duration: 0.2, ease: 'easeOut' }}
			/>

			{/* Horizontal cursor line */}
			<motion.div
				className={clsx(lineBaseClasses, 'left-0 h-[1px] w-full')}
				style={{ y: lineSmoothY }}
				animate={{ opacity: isDefault ? 0.2 : 0 }}
				transition={{ duration: 0.2, ease: 'easeOut' }}
			/>

			{/* Cursor dot */}
			<motion.div
				className={clsx(dotBaseClasses, isPointer ? 'bg-black/20 dark:bg-white/20' : 'bg-black dark:bg-white')}
				style={{
					x: smoothX,
					y: smoothY,
					translateX: '-50%',
					translateY: '-50%',
				}}
				animate={{
					scale: isPointer ? 4 : 1,
				}}
			/>

			{/* Optional text display */}
			{cursorText && (
				<motion.div
					className="absolute text-sm whitespace-nowrap text-black mix-blend-difference dark:text-white"
					style={{
						x: smoothX,
						y: smoothY,
						translateX: '-50%',
						translateY: '15px',
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
