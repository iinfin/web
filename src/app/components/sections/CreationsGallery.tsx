'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { Image, useVideoTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

// Import Image and VideoTexture

// import { Stats } from '@react-three/drei'; // Uncomment if you add the Stats component

import type { GalleryItem, MediaType } from '@/app/lib/db/types';
import { logger } from '@/utils/logger';

// Define props interface for the component
interface CreationsGalleryProps {
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
const SCROLL_SPEED = 0.007;
const RECYCLE_BUFFER = PLANE_HEIGHT * 2; // How far above/below viewport items go before recycling

// --- Video Material Sub-component ---
// Handles loading and aspect ratio correction for video textures
const VideoMaterial: FC<{ src: string }> = ({ src }) => {
	const texture = useVideoTexture(src, {
		muted: true,
		loop: true,
		playsInline: true,
		crossOrigin: 'anonymous',
		start: true,
	});

	// Adjust texture UVs to fit video aspect ratio onto square plane geometry
	useEffect(() => {
		const videoElement = texture.source.data as HTMLVideoElement;
		if (videoElement?.videoWidth && videoElement?.videoHeight) {
			const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
			const planeAspect = 1; // Video plane geometry is square
			const aspectFactor = videoAspect / planeAspect;
			texture.repeat.x = aspectFactor > 1 ? 1 / aspectFactor : 1;
			texture.repeat.y = aspectFactor < 1 ? aspectFactor : 1;
			texture.offset.x = (1 - texture.repeat.x) / 2;
			texture.offset.y = (1 - texture.repeat.y) / 2;
			texture.needsUpdate = true;
		}
	}, [texture]);

	return <meshStandardMaterial side={THREE.DoubleSide} map={texture} toneMapped={false} />;
};

// --- Single Item Wrapper Component ---
// Handles positioning and rendering the correct content (Image or Video)
interface PlaneWrapperProps {
	item: GalleryItem;
	position: THREE.Vector3;
	planeHeight: number;
}

const PlaneWrapper: FC<PlaneWrapperProps> = React.memo(({ item, position, planeHeight }) => {
	const groupRef = useRef<THREE.Group>(null!); // Typed ref

	// Update group position directly each frame
	useFrame(() => {
		if (groupRef.current) {
			groupRef.current.position.copy(position);
		}
	});

	// Memoized fallback material for Suspense
	const fallbackMaterial = useMemo(() => <meshStandardMaterial color="#ccc" side={THREE.DoubleSide} />, []);
	// Base scale for Drei's Image component (maintains aspect ratio internally)
	const imageScale = planeHeight;

	return (
		<group ref={groupRef} userData={{ itemId: item.id }}>
			<Suspense fallback={fallbackMaterial}>
				{item.mediaType === 'image' && item.url ? (
					<Image url={item.url} scale={imageScale} transparent opacity={1} side={THREE.DoubleSide} toneMapped={false} />
				) : item.mediaType === 'video' && item.url ? (
					// Video uses explicit geometry + VideoMaterial for texture
					<mesh>
						<planeGeometry args={[planeHeight, planeHeight]} />
						<VideoMaterial src={item.url} />
					</mesh>
				) : (
					// Fallback for items without URL or unknown type
					<mesh>
						<planeGeometry args={[planeHeight, planeHeight]} />
						<meshStandardMaterial color="#555" side={THREE.DoubleSide} />
					</mesh>
				)}
			</Suspense>
		</group>
	);
});
PlaneWrapper.displayName = 'PlaneWrapper';

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

const ScrollingPlanes: FC<{ galleryItems: GalleryItem[] }> = ({ galleryItems }) => {
	// R3F hooks
	const { camera } = useThree();
	// State and Refs
	const scrollY = useRef(0);
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
			scrollY.current += event.deltaY * SCROLL_SPEED;
		};
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, []);

	// Main frame loop for updating positions and handling recycling
	useFrame(() => {
		if (planeStates.length === 0 || totalContentHeight === 0) return;

		const currentScroll = scrollY.current;
		// Define boundaries for recycling check (viewport height + buffer)
		const topBound = visibleHeight / 2 + RECYCLE_BUFFER;
		const bottomBound = -visibleHeight / 2 - RECYCLE_BUFFER;

		// Update plane states based on scroll position
		setPlaneStates((prevStates) =>
			prevStates.map((state) => {
				let newInitialY = state.initialY;
				// Calculate current Y relative to the center of the viewport (0)
				const currentRelativeY = state.initialY - currentScroll;
				// Keep track of potential changes
				let positionChanged = false;
				let newX = state.x;
				let newZ = state.z;

				// --- Recycling Logic --- //
				// If plane is too far above the top bound, recycle it to the bottom
				if (currentRelativeY > topBound) {
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
				else if (currentRelativeY < bottomBound) {
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

				// Calculate the final Y position for rendering in this frame
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
					/>
				);
			})}
		</group>
	);
};

// --- Debug Helper (Optional) ---
const DebugHelper = () => {
	return (
		<>
			<axesHelper args={[5]} />
		</>
	);
};

// Main component
const CreationsGallery: FC<CreationsGalleryProps> = ({ galleryItems }) => {
	const [dprValue, setDprValue] = useState(1);

	useEffect(() => {
		setDprValue(window.devicePixelRatio);
	}, []);

	// Use real items or generate test ones
	const items: GalleryItem[] = useMemo(() => {
		if (galleryItems.length > 0) {
			// Ensure required fields have defaults if missing in fetched data
			const processedItems = galleryItems.map((item) => ({
				description: '', // Default empty string if undefined
				tags: [], // Default empty array if undefined
				...item, // Spread item afterwards to keep original values if they exist
				url: item.url || 'https://picsum.photos/300', // Default URL
				// Provide a default mediaType if it's missing/undefined
				mediaType: item.mediaType || 'image',
			}));
			logger.info(`Using ${processedItems.length} real gallery items`);
			// Cast to GalleryItem[] should be safe now if defaults cover required fields
			return processedItems as GalleryItem[];
		}

		// Create test items, ensuring all potentially optional fields are present
		const testItems: GalleryItem[] = Array.from({ length: 100 }, (_, i): GalleryItem => {
			const type = (i % 5 === 0 ? 'video' : 'image') as MediaType;
			return {
				id: `test-${i}`,
				title: `Test Item ${i}`,
				mediaType: type, // Correctly typed now
				url: type === 'video' ? '/videos/test-video.mp4' : `https://picsum.photos/seed/${i}/300/300`,
				description: `Description for test item ${i}`, // Provide a default string
				tags: [`test`, `item-${i}`], // Provide a default array
			};
		});

		logger.info(`Using ${testItems.length} test gallery items (no real data provided)`);
		return testItems;
	}, [galleryItems]);

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

					<DebugHelper />

					<ScrollingPlanes galleryItems={items} />
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

export default CreationsGallery;
