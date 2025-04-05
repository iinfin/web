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

// --- Scrolling Content Manager --- (Keep this core logic here)
// Manages the state and recycling logic for all gallery items
interface PlaneState {
	id: string; // Stable unique key for React
	itemIndex: number; // Index into the galleryItems array
	initialY: number; // Base Y position (includes vertical jitter) at scrollY = 0
	x: number; // Current calculated X position
	z: number; // Current calculated Z position
	currentY: number; // Final calculated Y position for rendering this frame
}

const AUTO_SCROLL_SPEED = 15; // Adjust speed as needed (pixels per second equivalent)

// Update ScrollingPlanes Props
interface ScrollingPlanesProps {
	galleryItems: GalleryItem[];
	disableMedia: boolean;
	isTouchDevice: boolean;
	onHoverChange: (name: string | null) => void; // Add hover callback prop
}

const ScrollingPlanes: FC<ScrollingPlanesProps> = ({ galleryItems, disableMedia, isTouchDevice, onHoverChange }) => {
	// R3F hooks
	const { camera, size } = useThree();
	// State and Refs
	const scrollSpring = useSpring(0, {
		stiffness: 150,
		damping: 25, // Slightly adjusted damping
		mass: 1,
	});
	const [planeStates, setPlaneStates] = useState<PlaneState[]>([]);
	const initialPositionsSet = useRef(false);
	// Store computed left position that adapts to viewport changes
	const leftPositionRef = useRef<number>(0);
	// Store viewport height
	const viewportHeightRef = useRef<number>(0);

	// Calculate visible height in world units at Z=0
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
	}, [camera, size.width, size.height]); // Re-run if camera or size changes

	// Calculate the total height the content would occupy if laid out end-to-end
	// Used for calculating recycling jumps
	const totalContentHeight = useMemo(() => {
		if (galleryItems.length === 0) return 0;
		return galleryItems.length * VERTICAL_GAP;
	}, [galleryItems.length]);

	// Initialize the state for each plane once
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

	// Setup scroll listener
	useEffect(() => {
		// Only attach wheel listener if NOT a touch device
		if (isTouchDevice) return;

		const handleWheel = (event: WheelEvent) => {
			// Update the spring target directly based on scroll delta
			scrollSpring.set(scrollSpring.get() - event.deltaY * SCROLL_MULTIPLIER);

			// Prevent default behavior to avoid browser scrolling
			// event.preventDefault(); // Keep this commented unless needed
		};

		// Use passive: false to allow preventDefault() if uncommented
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, [scrollSpring, isTouchDevice]); // Added isTouchDevice dependency

	// Main frame loop for updating positions and handling recycling
	useFrame((_, delta) => {
		if (planeStates.length === 0 || totalContentHeight === 0) return;

		// Handle Auto-scroll for touch devices
		if (isTouchDevice) {
			// Increment scroll position based on delta time
			scrollSpring.set(scrollSpring.get() + AUTO_SCROLL_SPEED * delta);
		}

		// Get the current scroll position from the spring
		const currentScroll = scrollSpring.get();

		// Update left position if viewport changes
		const aspectRatio = size.width / size.height;
		const newVisibleWidth = viewportHeightRef.current * aspectRatio;
		const newLeftEdgePosition = -newVisibleWidth / 2 + LEFT_PADDING;

		// If left position has changed due to window resize, update it
		if (Math.abs(newLeftEdgePosition - leftPositionRef.current) > 0.001) {
			leftPositionRef.current = newLeftEdgePosition;
		}

		// Update plane states based on scroll position and current viewport
		setPlaneStates((prevStates) =>
			prevStates.map((state) => {
				let newInitialY = state.initialY;
				// Calculate current Y relative to the center of the viewport (0) using spring value
				const currentRelativeY = state.initialY - currentScroll;
				// Keep track of potential changes
				let positionChanged = false;
				// Always update X position to match current viewport
				const newX = leftPositionRef.current;

				// --- Recycling Logic --- //
				// If plane is too far above the top bound, recycle it to the bottom
				if (currentRelativeY > viewportHeightRef.current / 2 + RECYCLE_BUFFER) {
					// Calculate the base Y position after jumping down by the total content height
					const baseY = state.initialY - totalContentHeight;
					// Removed vertical jitter calculation
					newInitialY = baseY;
					positionChanged = true;
				}
				// If plane is too far below the bottom bound, recycle it to the top
				else if (currentRelativeY < -viewportHeightRef.current / 2 - RECYCLE_BUFFER) {
					// Calculate the base Y position after jumping up by the total content height
					const baseY = state.initialY + totalContentHeight;
					// Removed vertical jitter calculation
					newInitialY = baseY;
					positionChanged = true;
				}

				// Calculate the final Y position for rendering in this frame using spring value
				const finalCurrentY = newInitialY - currentScroll;

				// Determine if the state needs updating (position or viewport changed)
				const needsUpdate = positionChanged || finalCurrentY !== state.currentY || newX !== state.x;

				if (needsUpdate) {
					// Return a new state object only if necessary
					return { ...state, initialY: newInitialY, currentY: finalCurrentY, x: newX };
				} else {
					// Otherwise, return the existing state object to prevent unnecessary re-renders
					return state;
				}
			}),
		);
	});

	// Render the PlaneWrappers based on the current state
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

// Main component
const CreationContent: FC<CreationContentProps> = ({ galleryItems }) => {
	const [dprValue, setDprValue] = useState(1);
	const [isTouchDevice, setIsTouchDevice] = useState(false);
	const [hoveredName, setHoveredName] = useState<string | null>(null); // State for hovered item name
	const inputState = useInputState(); // Get input state

	// Read environment variable to disable media loading in dev
	const disableMedia = useMemo(() => DISABLE_MEDIA, []);

	// Callback to update hovered name
	const handleHoverChange = useCallback((name: string | null) => {
		setHoveredName(name);
	}, []);

	useEffect(() => {
		// Check for touch support on the client
		const touchDetected = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		setIsTouchDevice(touchDetected);

		setDprValue(window.devicePixelRatio);
		if (disableMedia) {
			logger.warn('Gallery media loading is DISABLED');
		}
	}, [disableMedia]);

	// Use real items or generate test ones
	const items: GalleryItem[] = useMemo(() => {
		if (galleryItems.length > 0) {
			// Ensure required fields have defaults if missing in fetched data
			const processedItems = galleryItems.map((item) => ({
				description: '', // Default empty string if undefined
				tags: [], // Default empty array if undefined
				...item, // Spread item afterwards to keep original values if they exist
				url: item.url || '', // Use empty string if URL is missing
				// Provide a default mediaType if it's missing/undefined
				mediaType: item.mediaType || 'image',
			}));
			logger.info(`Using ${processedItems.length} real gallery items`);
			// Cast to GalleryItem[] should be safe now if defaults cover required fields
			return processedItems as GalleryItem[];
		} else {
			logger.info('No gallery items provided.');
			return []; // Return empty array if no items are passed
		}
	}, [galleryItems]);

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
