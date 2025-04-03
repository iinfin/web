'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { Image, useVideoTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useSpring } from 'framer-motion';

// Import Image and VideoTexture

// import { Stats } from '@react-three/drei'; // Uncomment if you add the Stats component

import type { GalleryItem } from '@/app/lib/db/types';
import { logger } from '@/utils/logger';

// Define props interface for the component
interface CreationContentProps {
	galleryItems: GalleryItem[];
}

// --- Configuration ---
const NUM_COLUMNS = 3;
const PLANE_HEIGHT = 1.5;
const HORIZONTAL_SPREAD = 5;
const COLUMN_WIDTH = HORIZONTAL_SPREAD / NUM_COLUMNS;
const HORIZONTAL_JITTER = 0.4;
const Z_OFFSET_STEP = 0.15; // Base Z separation between columns
const Z_JITTER = 0.05; // Smaller random Z offset within the column layer
const VERTICAL_JITTER = 0.5;
const VERTICAL_GAP = 2.8;
const SCROLL_MULTIPLIER = 0.02; // Reduced sensitivity
const RECYCLE_BUFFER = PLANE_HEIGHT * 2; // How far above/below viewport items go before recycling

const DISABLE_MEDIA = process.env.NODE_ENV === 'development';

// Define common aspect ratios and their dimensions
type AspectRatioType = 'square' | '16:9' | '9:16' | '4:5' | '5:4';

interface AspectRatio {
	readonly width: number;
	readonly height: number;
	readonly name: AspectRatioType;
}

const COMMON_ASPECT_RATIOS = {
	SQUARE: { width: 1, height: 1, name: 'square' } as AspectRatio,
	LANDSCAPE_16_9: { width: 16, height: 9, name: '16:9' } as AspectRatio,
	PORTRAIT_9_16: { width: 9, height: 16, name: '9:16' } as AspectRatio,
	PORTRAIT_4_5: { width: 4, height: 5, name: '4:5' } as AspectRatio,
	LANDSCAPE_5_4: { width: 5, height: 4, name: '5:4' } as AspectRatio,
} as const;

// Base height for scaling calculations
const BASE_HEIGHT = PLANE_HEIGHT;

// Calculate dimensions while maintaining aspect ratio and consistent visual presence
function calculateDimensions(aspectRatio: AspectRatio): [number, number] {
	const ratio = aspectRatio.width / aspectRatio.height;

	// For portrait (taller than wide), scale based on height
	if (ratio < 1) {
		const height = BASE_HEIGHT;
		const width = height * ratio;
		return [width, height];
	}

	// For landscape (wider than tall), scale based on height but maintain area
	const height = BASE_HEIGHT / Math.sqrt(ratio);
	const width = height * ratio;
	return [width, height];
}

// --- Video Material Sub-component ---
const VideoMaterial: FC<{ src: string }> = ({ src }) => {
	const texture = useVideoTexture(src, {
		muted: true,
		loop: true,
		playsInline: true,
		crossOrigin: 'anonymous',
		start: true,
	});

	// Adjust texture UVs to fit video aspect ratio
	useEffect(() => {
		const videoElement = texture.source.data as HTMLVideoElement;
		if (videoElement?.videoWidth && videoElement?.videoHeight) {
			texture.repeat.set(1, 1);
			texture.offset.set(0, 0);
			texture.needsUpdate = true;
		}
	}, [texture]);

	return <meshStandardMaterial side={THREE.DoubleSide} map={texture} toneMapped={false} />;
};

// --- Single Item Wrapper Component ---
interface PlaneWrapperProps {
	item: GalleryItem;
	position: THREE.Vector3;
	planeHeight: number;
	disableMedia: boolean;
}

const PlaneWrapper: FC<PlaneWrapperProps> = React.memo(({ item, position, planeHeight, disableMedia }) => {
	const groupRef = useRef<THREE.Group>(null!);
	const [dimensions, setDimensions] = useState<[number, number]>([planeHeight, planeHeight]);

	// Detect aspect ratio and set dimensions - ONLY IF MEDIA IS ENABLED
	useEffect(() => {
		if (disableMedia || !item.url) return; // Skip if media disabled or no URL

		const detectAspectRatio = async () => {
			if (!item.url) return;

			try {
				if (item.mediaType === 'video') {
					const video = document.createElement('video');
					video.src = item.url;
					await new Promise<void>((resolve, reject) => {
						video.onloadedmetadata = () => resolve();
						video.onerror = reject;
					});
					const ratio = video.videoWidth / video.videoHeight;
					const closest = findClosestAspectRatio(ratio);
					if (closest) {
						setDimensions(calculateDimensions(closest));
					}
				} else if (item.mediaType === 'image') {
					const img = document.createElement('img');
					img.src = item.url;
					await new Promise<void>((resolve, reject) => {
						img.onload = () => resolve();
						img.onerror = reject;
					});
					const ratio = img.width / img.height;
					const closest = findClosestAspectRatio(ratio);
					if (closest) {
						setDimensions(calculateDimensions(closest));
					}
				}
			} catch (error) {
				logger.error('Error detecting aspect ratio:', { url: item.url, error });
			}
		};

		detectAspectRatio();
	}, [item.url, item.mediaType, disableMedia]); // Added disableMedia dependency

	// Update group position each frame
	useFrame(() => {
		if (groupRef.current) {
			groupRef.current.position.copy(position);
		}
	});

	const fallbackMaterial = useMemo(() => <meshStandardMaterial color="#ccc" side={THREE.DoubleSide} />, []);

	// Always render fallback if media is disabled or no URL
	if (disableMedia || !item.url) {
		return (
			<group ref={groupRef} userData={{ itemId: item.id }}>
				<mesh scale={[dimensions[0], dimensions[1], 1]}>
					<planeGeometry />
					{fallbackMaterial}
				</mesh>
			</group>
		);
	}

	return (
		<group ref={groupRef} userData={{ itemId: item.id }}>
			<Suspense
				fallback={
					<mesh scale={[dimensions[0], dimensions[1], 1]}>
						<planeGeometry />
						{fallbackMaterial}
					</mesh>
				}
			>
				{item.mediaType === 'image' ? (
					<Image url={item.url} scale={dimensions} transparent opacity={1} side={THREE.DoubleSide} toneMapped={false} />
				) : item.mediaType === 'video' ? (
					<mesh scale={[dimensions[0], dimensions[1], 1]}>
						<planeGeometry />
						<VideoMaterial src={item.url} />
					</mesh>
				) : (
					<mesh scale={[dimensions[0], dimensions[1], 1]}>
						<planeGeometry />
						<meshStandardMaterial color="#555" side={THREE.DoubleSide} />
					</mesh>
				)}
			</Suspense>
		</group>
	);
});

PlaneWrapper.displayName = 'PlaneWrapper';

// Helper function to find the closest predefined aspect ratio
function findClosestAspectRatio(ratio: number): AspectRatio {
	const defaultRatio = COMMON_ASPECT_RATIOS.SQUARE;
	let closestRatio = defaultRatio;
	let smallestDiff = Infinity;

	Object.values(COMMON_ASPECT_RATIOS).forEach((ar: AspectRatio) => {
		const arRatio = ar.width / ar.height;
		const diff = Math.abs(arRatio - ratio);
		if (diff < smallestDiff) {
			smallestDiff = diff;
			closestRatio = ar;
		}
	});

	return closestRatio;
}

// --- Scrolling Content Manager ---
// Manages the state and recycling logic for all gallery items
interface PlaneState {
	id: string; // Stable unique key for React
	itemIndex: number; // Index into the galleryItems array
	initialY: number; // Base Y position (includes vertical jitter) at scrollY = 0
	col: number; // Column assignment (0 to NUM_COLUMNS - 1)
	x: number; // Current calculated X position
	z: number; // Current calculated Z position
	currentY: number; // Final calculated Y position for rendering this frame
}

// Calculates the X and Z position for a plane based on its column
// Adds horizontal jitter within the column and Z jitter around a base Z offset
const calculatePosition = (col: number): { x: number; z: number } => {
	// Determine the horizontal center of the assigned column
	const columnCenterX = (col - (NUM_COLUMNS - 1) / 2) * COLUMN_WIDTH;
	// Add random horizontal jitter within the column's bounds
	const x = columnCenterX + (Math.random() - 0.5) * HORIZONTAL_JITTER * 2;
	// Determine a base Z depth based on the column to create layers
	const baseZ = (col - (NUM_COLUMNS - 1) / 2) * Z_OFFSET_STEP;
	// Add a smaller random jitter to the base Z depth
	const z = baseZ + (Math.random() - 0.5) * Z_JITTER * 2;
	return { x, z };
};

const ScrollingPlanes: FC<{ galleryItems: GalleryItem[]; disableMedia: boolean }> = ({ galleryItems, disableMedia }) => {
	// R3F hooks
	const { camera } = useThree();
	// State and Refs
	const scrollSpring = useSpring(0, {
		stiffness: 150,
		damping: 25, // Slightly adjusted damping
		mass: 1,
	});
	const [planeStates, setPlaneStates] = useState<PlaneState[]>([]);
	const initialPositionsSet = useRef(false);

	// Calculate visible height in world units at Z=0
	const cameraZ = camera.position.z;
	const vFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
	const visibleHeight = 2 * Math.tan(vFov / 2) * cameraZ;

	// Calculate the total height the content would occupy if laid out end-to-end
	// Used for calculating recycling jumps
	const totalContentHeight = useMemo(() => {
		if (galleryItems.length === 0) return 0;
		return Math.ceil(galleryItems.length / NUM_COLUMNS) * VERTICAL_GAP;
	}, [galleryItems.length]);

	// Initialize the state for each plane once
	useEffect(() => {
		if (galleryItems.length === 0 || initialPositionsSet.current) return;

		logger.info('Initializing plane states', { count: galleryItems.length, totalContentHeight });
		const initialStates: PlaneState[] = [];
		// Calculate offset to center the initial block of items vertically in the view
		const startYOffset = totalContentHeight / 2 - VERTICAL_GAP / 2;

		for (let i = 0; i < galleryItems.length; i++) {
			const row = Math.floor(i / NUM_COLUMNS);
			const col = i % NUM_COLUMNS;
			// Calculate the base Y position for this item's row
			const baseY = startYOffset - row * VERTICAL_GAP;
			// Add random vertical jitter to the base Y
			const initialY = baseY + (Math.random() - 0.5) * VERTICAL_JITTER * 2;
			// Get the initial X and Z position based on the column
			const { x, z } = calculatePosition(col);

			initialStates.push({
				id: `plane-${i}`, // Stable key based on item index
				itemIndex: i,
				initialY: initialY, // Store the initial Y (including jitter)
				col: col,
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
		const handleWheel = (event: WheelEvent) => {
			// Update the spring target directly based on scroll delta
			scrollSpring.set(scrollSpring.get() - event.deltaY * SCROLL_MULTIPLIER);

			// Prevent default behavior to avoid browser scrolling
			// event.preventDefault(); // Keep this commented unless needed
		};

		// Use passive: false to allow preventDefault() if uncommented
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, [scrollSpring]); // Added scrollSpring dependency

	// Main frame loop for updating positions and handling recycling
	useFrame(() => {
		if (planeStates.length === 0 || totalContentHeight === 0) return;

		// Get the current scroll position from the spring
		const currentScroll = scrollSpring.get();

		// Update plane states based on scroll position
		setPlaneStates((prevStates) =>
			prevStates.map((state) => {
				let newInitialY = state.initialY;
				// Calculate current Y relative to the center of the viewport (0) using spring value
				const currentRelativeY = state.initialY - currentScroll;
				// Keep track of potential changes
				let positionChanged = false;
				let newX = state.x;
				let newZ = state.z;

				// --- Recycling Logic --- //
				// If plane is too far above the top bound, recycle it to the bottom
				if (currentRelativeY > visibleHeight / 2 + RECYCLE_BUFFER) {
					// Calculate the base Y position after jumping down by the total content height
					const baseY = state.initialY - totalContentHeight;
					// Add new random vertical jitter
					newInitialY = baseY + (Math.random() - 0.5) * VERTICAL_JITTER * 2;
					// Get new X and Z positions based on the plane's column
					const pos = calculatePosition(state.col);
					newX = pos.x;
					newZ = pos.z;
					positionChanged = true;
				}
				// If plane is too far below the bottom bound, recycle it to the top
				else if (currentRelativeY < -visibleHeight / 2 - RECYCLE_BUFFER) {
					// Calculate the base Y position after jumping up by the total content height
					const baseY = state.initialY + totalContentHeight;
					// Add new random vertical jitter
					newInitialY = baseY + (Math.random() - 0.5) * VERTICAL_JITTER * 2;
					// Get new X and Z positions based on the plane's column
					const pos = calculatePosition(state.col);
					newX = pos.x;
					newZ = pos.z;
					positionChanged = true;
				}

				// Calculate the final Y position for rendering in this frame using spring value
				const finalCurrentY = newInitialY - currentScroll;

				// Determine if the state needs updating
				const needsUpdate = positionChanged || finalCurrentY !== state.currentY;

				if (needsUpdate) {
					// Return a new state object only if necessary
					return { ...state, initialY: newInitialY, currentY: finalCurrentY, x: newX, z: newZ };
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
					/>
				);
			})}
		</group>
	);
};

// --- Debug Helper (Optional) ---
// const DebugHelper = () => {
// 	return (
// 		<>
// 			<axesHelper args={[5]} />
// 		</>
// 	);
// };

// Main component
const CreationContent: FC<CreationContentProps> = ({ galleryItems }) => {
	const [dprValue, setDprValue] = useState(1);

	// Read environment variable to disable media loading in dev
	const disableMedia = useMemo(() => DISABLE_MEDIA, []);

	useEffect(() => {
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
		<div className="relative h-screen w-full">
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

					{/* <DebugHelper /> */}

					<ScrollingPlanes galleryItems={items} disableMedia={disableMedia} />
				</Suspense>
			</Canvas>
		</div>
	);
};

// Helper component to invalidate frame loop when scroll changes (if using frameloop="demand")
/*
const FrameInvalidator = () => {
	const { invalidate } = useThree();
	useEffect(() => {
		const handleWheel = () => invalidate();
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, [invalidate]);
	return null;
};
*/

export default CreationContent;
