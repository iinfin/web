'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import clsx from 'clsx';

/**
 * Linear interpolation function for smooth transitions
 * @param start - Starting value
 * @param end - Target value
 * @param amount - Amount to interpolate (0-1)
 * @returns Interpolated value
 */
const lerp = (start: number, end: number, amount: number): number => {
	return (1 - amount) * start + amount * end;
};

// Easing factor for cursor movement (lower = smoother but more lag)
const EASING_FACTOR = 0.15;

/**
 * Vector2 type for cursor positions
 */
interface Vector2 {
	x: number;
	y: number;
}

/**
 * Custom cursor component that provides a cross-hair style cursor
 * with smooth animations and visibility transitions
 */
export default function Cursor(): JSX.Element {
	// State for the animated position used for rendering
	const [animatedPosition, setAnimatedPosition] = useState<Vector2>({ x: 0, y: 0 });

	// Ref to store the actual instantaneous mouse position
	const mousePositionRef = useRef<Vector2>({ x: 0, y: 0 });

	// Ref to store the requestAnimationFrame ID for cleanup
	const animationFrameRef = useRef<number | null>(null);

	// State to track mouse visibility
	const [isVisible, setIsVisible] = useState<boolean>(true);

	// Memoized animation function to prevent recreating it on each render
	const animate = useCallback(() => {
		setAnimatedPosition((currentPosition) => {
			// Calculate the next position using lerp
			const nextX = lerp(currentPosition.x, mousePositionRef.current.x, EASING_FACTOR);
			const nextY = lerp(currentPosition.y, mousePositionRef.current.y, EASING_FACTOR);

			// If position is very close, snap to avoid infinite lerping
			const dx = Math.abs(nextX - mousePositionRef.current.x);
			const dy = Math.abs(nextY - mousePositionRef.current.y);
			if (dx < 0.1 && dy < 0.1) {
				return { ...mousePositionRef.current };
			}

			return { x: nextX, y: nextY };
		});

		// Request the next frame
		animationFrameRef.current = requestAnimationFrame(animate);
	}, []);

	useEffect(() => {
		// Initial position setting in the center of the screen
		setAnimatedPosition({
			x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
			y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
		});

		// Mouse move handler
		const updateMousePosition = (e: MouseEvent): void => {
			mousePositionRef.current = { x: e.clientX, y: e.clientY };
		};

		// Mouse enter/leave handlers
		const handleMouseEnter = (): void => {
			setIsVisible(true);
		};

		const handleMouseLeave = (): void => {
			setIsVisible(false);
		};

		// Add event listeners
		document.documentElement.addEventListener('mouseenter', handleMouseEnter);
		document.documentElement.addEventListener('mouseleave', handleMouseLeave);
		window.addEventListener('mousemove', updateMousePosition);

		// Start the animation loop
		animationFrameRef.current = requestAnimationFrame(animate);

		// Cleanup function
		return () => {
			window.removeEventListener('mousemove', updateMousePosition);
			document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
			document.documentElement.removeEventListener('mouseleave', handleMouseLeave);

			// Cancel the animation frame on unmount
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [animate]); // Add animate to dependencies

	return (
		<div
			className={clsx('pointer-events-none fixed inset-0 z-50 transition-opacity duration-300 ease-in-out', isVisible ? 'opacity-100' : 'opacity-0')}
			aria-hidden="true" // Hide from screen readers as this is purely decorative
		>
			{/* Vertical cursor line */}
			<div className="absolute top-0 h-full w-[1px] bg-black/10 mix-blend-exclusion" style={{ left: `${animatedPosition.x}px` }} />

			{/* Horizontal cursor line */}
			<div className="absolute left-0 h-[1px] w-full bg-black/10 mix-blend-exclusion" style={{ top: `${animatedPosition.y}px` }} />

			{/* Cursor dot */}
			<div
				className="absolute h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
				style={{
					left: `${animatedPosition.x}px`,
					top: `${animatedPosition.y}px`,
				}}
			/>
		</div>
	);
}
