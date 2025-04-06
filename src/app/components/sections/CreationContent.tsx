'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useSpring } from 'framer-motion';

import { useInputState } from '@/app/hooks/useInputState';
// import { Stats } from '@react-three/drei'; // Uncomment if you add the Stats component

import type { GalleryItem } from '@/app/lib/db/types';
import { logger } from '@/utils/logger';

// Import extracted components, config, and utils
import { DISABLE_MEDIA, LEFT_PADDING, PLANE_HEIGHT, RECYCLE_BUFFER, SCROLL_MULTIPLIER, VERTICAL_GAP } from './creation/config';
import PlaneWrapper from './creation/PlaneWrapper';

// Define props interface for the component
interface CreationContentProps {
	galleryItems: GalleryItem[];
}

// --- Scrolling Content Manager ---
// Manages the state and recycling logic for all gallery items within the R3F Canvas.
// This component handles the core animation loop and positioning.
interface PlaneState {
	/** Stable unique key for React reconciliation */
	id: string;
	/** Index into the original galleryItems array for data lookup */
	itemIndex: number;
	/** Base Y position at scrollY=0, used for relative calculations */
	initialY: number;
	/** Current calculated X position based on viewport */
	x: number;
	/** Current calculated Z position (currently static) */
	z: number;
	/** Final calculated Y position for rendering this frame, incorporating scroll offset */
	currentY: number;
}

/** Speed for automatic scrolling on touch devices, mimicking pixels per second */
const AUTO_SCROLL_SPEED = 15;

// Props for the ScrollingPlanes component
interface ScrollingPlanesProps {
	/** The array of gallery items to display */
	galleryItems: GalleryItem[];
	/** Flag to prevent loading/displaying media assets */
	disableMedia: boolean;
	/** Flag indicating if the device is touch-capable (affects scroll behavior) */
	isTouchDevice: boolean;
	/** Callback function invoked when a plane's hover state changes */
	onHoverChange: (name: string | null) => void;
}

/**
 * Renders the scrollable/recyclable gallery planes within the Canvas.
 * Handles the primary animation loop, position updates, and recycling logic.
 */
const ScrollingPlanes: FC<ScrollingPlanesProps> = ({ galleryItems, disableMedia, isTouchDevice, onHoverChange }) => {
	// R3F hooks to access scene properties
	const { camera, size } = useThree();
	// State and Refs
	/** Spring physics for smooth scrolling animation */
	const scrollSpring = useSpring(0, {
		stiffness: 150,
		damping: 25, // Adjusted damping for a slightly less bouncy feel
		mass: 1,
	});
	/** Array holding the current state (position, index) of each plane */
	const [planeStates, setPlaneStates] = useState<PlaneState[]>([]);
	/** Flag to ensure initial positions are calculated only once */
	const initialPositionsSet = useRef(false);
	/** Ref storing the calculated world-space X position for the left edge, adapting to viewport */
	const leftPositionRef = useRef<number>(0);
	/** Ref storing the calculated world-space height of the viewport */
	const viewportHeightRef = useRef<number>(0);

	// Calculate visible height and initial left edge position in world units at Z=0
	useEffect(() => {
		const cameraZ = camera.position.z;
		const vFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
		const visibleHeight = 2 * Math.tan(vFov / 2) * cameraZ;
		viewportHeightRef.current = visibleHeight;
		// Calculate the visible width in world units
		const aspectRatio = size.width / size.height;
		const visibleWidth = visibleHeight * aspectRatio;

		// Calculate left edge position in world units (considering LEFT_PADDING)

		// Calculate the left edge position in world units
		// -visibleWidth/2 represents the left edge of the visible area
		const leftEdgePosition = -visibleWidth / 2 + LEFT_PADDING;
		leftPositionRef.current = leftEdgePosition;

		logger.info('Calculated viewport/edge positions', {
			leftEdgePosition,
			visibleWidth,
			visibleHeight,
			aspectRatio,
		});
	}, [camera, size.width, size.height]); // Recalculate if camera properties or viewport size change

	// Calculate the total height the content would occupy if laid out end-to-end.
	// This is crucial for determining the jump distance during recycling.
	const totalContentHeight = useMemo(() => {
		if (galleryItems.length === 0) return 0;
		return galleryItems.length * VERTICAL_GAP;
	}, [galleryItems.length]);

	// Initialize the state (position, ID) for each plane based on the gallery items.
	// Runs only once after galleryItems are available.
	useEffect(() => {
		if (galleryItems.length === 0 || initialPositionsSet.current) return;

		logger.info('Initializing plane states', { count: galleryItems.length, totalContentHeight });
		const initialStates: PlaneState[] = [];
		// Calculate offset to center the initial block of items vertically in the view
		const startYOffset = totalContentHeight / 2 - VERTICAL_GAP / 2;

		for (let i = 0; i < galleryItems.length; i++) {
			// Calculate the base Y position for this item directly using index
			const baseY = startYOffset - i * VERTICAL_GAP;
			// Removed vertical jitter calculation
			const initialY = baseY;
			// Get the fixed Z position (no longer depends on column) - X will be calculated in useFrame
			const z = 0;
			// Use the calculated left position, x will be updated in useFrame
			const x = leftPositionRef.current;

			initialStates.push({
				id: `plane-${i}`, // Stable key based on item index
				itemIndex: i,
				initialY: initialY, // Store the initial Y (no jitter)
				x: x,
				z: z,
				currentY: initialY, // Start rendering at the initial calculated Y
			});
		}
		setPlaneStates(initialStates);
		initialPositionsSet.current = true;
	}, [galleryItems, totalContentHeight]);

	// Setup scroll listener for non-touch devices
	useEffect(() => {
		// Only attach wheel listener if NOT a touch device to avoid conflicts
		if (isTouchDevice) return;

		const handleWheel = (event: WheelEvent) => {
			// Update the scroll spring target directly based on wheel delta.
			// The spring handles the smooth animation towards the target.
			scrollSpring.set(scrollSpring.get() - event.deltaY * SCROLL_MULTIPLIER);

			// Prevent default browser scroll behavior if necessary (currently disabled).
			// Use passive: true for performance when preventDefault is not needed.
			// event.preventDefault();
		};

		// Use passive: true when preventDefault() is not called for better scroll performance.
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, [scrollSpring, isTouchDevice]); // Re-attach if scrollSpring instance or touch status changes

	// Main R3F frame loop: Updates plane positions, handles recycling, and manages auto-scroll.
	useFrame((_, delta) => {
		if (planeStates.length === 0 || totalContentHeight === 0) return; // Skip if no items or layout defined

		// Handle Auto-scroll for touch devices by incrementing scroll based on frame time
		if (isTouchDevice) {
			scrollSpring.set(scrollSpring.get() + AUTO_SCROLL_SPEED * delta);
		}

		// Get the current raw scroll position from the physics spring
		const currentScroll = scrollSpring.get();

		// Recalculate left edge position based on current viewport size (handles resize)
		const aspectRatio = size.width / size.height;
		const newVisibleWidth = viewportHeightRef.current * aspectRatio;
		const newLeftEdgePosition = -newVisibleWidth / 2 + LEFT_PADDING;

		// Update the stored left position ref if it has changed significantly
		if (Math.abs(newLeftEdgePosition - leftPositionRef.current) > 0.001) {
			leftPositionRef.current = newLeftEdgePosition;
		}

		// Update plane states based on scroll position, viewport changes, and recycling logic
		setPlaneStates((prevStates) =>
			prevStates.map((state) => {
				let newInitialY = state.initialY;
				// Calculate the plane's current Y position relative to the viewport center (0)
				const currentRelativeY = state.initialY - currentScroll;
				let positionChanged = false; // Flag to track if recycling occurred

				// --- Recycling Logic ---
				// This ensures seamless infinite scrolling by repositioning planes
				// that move too far out of the view bounds (+ buffer).

				// If plane is too far above the top bound, recycle it to the bottom.
				if (currentRelativeY > viewportHeightRef.current / 2 + RECYCLE_BUFFER) {
					// Jump down by the total height of all content.
					newInitialY = state.initialY - totalContentHeight;
					positionChanged = true;
				}
				// If plane is too far below the bottom bound, recycle it to the top.
				else if (currentRelativeY < -viewportHeightRef.current / 2 - RECYCLE_BUFFER) {
					// Jump up by the total height of all content.
					newInitialY = state.initialY + totalContentHeight;
					positionChanged = true;
				}

				// Always update the X position to match the potentially resized viewport's left edge.
				const newX = leftPositionRef.current;
				// Calculate the final Y position for rendering, applying the current scroll offset.
				const finalCurrentY = newInitialY - currentScroll;

				// Determine if the state needs updating (recycled, Y changed, or X changed due to resize).
				// This optimizes state updates by avoiding changes if nothing moved.
				const needsUpdate = positionChanged || finalCurrentY !== state.currentY || newX !== state.x;

				if (needsUpdate) {
					// Return a new state object only if necessary to trigger re-render.
					return { ...state, initialY: newInitialY, currentY: finalCurrentY, x: newX };
				} else {
					// Otherwise, return the existing state object to prevent unnecessary updates.
					return state;
				}
			}),
		);
	});

	// Render the PlaneWrappers based on the current calculated state
	return (
		<group>
			{planeStates.map((state) => {
				const item = galleryItems[state.itemIndex];
				if (!item) return null;
				// Current position vector for the wrapper component
				const position = new THREE.Vector3(state.x, state.currentY, state.z);
				return (
					<PlaneWrapper
						key={state.id} // Use stable ID as key
						item={item}
						position={position}
						planeHeight={PLANE_HEIGHT}
						disableMedia={disableMedia}
						onHoverChange={onHoverChange} // Pass down the callback
						// Pass down required props for animation
						viewportHeight={viewportHeightRef.current}
						initialY={state.initialY}
					/>
				);
			})}
		</group>
	);
};

/**
 * Main component for the "Creation" section.
 * Sets up the R3F Canvas, manages device features (touch, DPR),
 * handles hover state for displaying item names, and renders the ScrollingPlanes.
 */
const CreationContent: FC<CreationContentProps> = ({ galleryItems }) => {
	const [dprValue, setDprValue] = useState(1);
	const [isTouchDevice, setIsTouchDevice] = useState(false);
	/** State storing the name of the currently hovered gallery item, or null */
	const [hoveredName, setHoveredName] = useState<string | null>(null);
	const inputState = useInputState(); // Hook to get mouse/touch input coordinates

	// Determine if media loading should be disabled based on environment variable
	const disableMedia = useMemo(() => DISABLE_MEDIA, []);

	// Callback passed to PlaneWrapper to update the hovered item's name
	const handleHoverChange = useCallback((name: string | null) => {
		setHoveredName(name);
	}, []);

	// Detect device capabilities (touch, pixel ratio) on component mount
	useEffect(() => {
		// Check for touch support on the client-side window object
		const touchDetected = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		setIsTouchDevice(touchDetected);

		setDprValue(window.devicePixelRatio);
		if (disableMedia) {
			logger.warn('Gallery media loading is DISABLED');
		}
	}, [disableMedia]);

	// Process gallery items: ensure defaults for missing optional fields.
	const items: GalleryItem[] = useMemo(() => {
		if (galleryItems.length > 0) {
			// Map over fetched items to provide default values for potentially missing fields,
			// ensuring type safety before passing to child components.
			const processedItems = galleryItems.map((item) => ({
				description: '', // Default empty string if undefined
				tags: [], // Default empty array if undefined
				...item, // Spread original item to preserve existing values
				url: item.url || '', // Default to empty string if URL is missing
				// Provide a default mediaType ('image') if it's missing/undefined
				mediaType: item.mediaType || 'image',
			}));
			logger.info(`Using ${processedItems.length} real gallery items`);
			// Cast should be safe now as defaults cover required fields in GalleryItem
			return processedItems as GalleryItem[];
		} else {
			logger.info('No gallery items provided.');
			return []; // Return empty array if no items are fetched/passed
		}
	}, [galleryItems]); // Recalculate only if the input galleryItems array changes

	if (disableMedia) {
		logger.info('Rendering CreationContent with media disabled');
	}

	return (
		<div className="relative h-screen w-full touch-none">
			<Canvas
				shadows
				camera={{
					position: [0, 0, 8],
					fov: 50,
					near: 0.1,
					far: 1000,
				}}
				dpr={dprValue}
				frameloop="always"
				onCreated={({ gl }) => {
					gl.setClearColor('#ffffff');
					logger.info('Canvas created', {});
				}}
			>
				<Suspense fallback={null}>
					<ambientLight intensity={0.8} />
					<directionalLight position={[5, 15, 10]} intensity={1.2} />

					<ScrollingPlanes galleryItems={items} disableMedia={disableMedia} isTouchDevice={isTouchDevice} onHoverChange={handleHoverChange} />
				</Suspense>
			</Canvas>

			{hoveredName && (
				<span
					className="pointer-events-none absolute z-100 whitespace-nowrap text-white opacity-100 mix-blend-difference transition-opacity duration-200 ease-out select-none"
					style={{
						left: `${inputState.pixel.x + 3}px`,
						top: `${inputState.pixel.y - 14}px`,
					}}
				>
					{hoveredName}
				</span>
			)}
		</div>
	);
};

export default CreationContent;
