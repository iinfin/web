'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { Image, useVideoTexture, VideoTexture } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

// Import Image and VideoTexture

// import { Stats } from '@react-three/drei'; // Uncomment if you add the Stats component

import type { GalleryItem } from '@/app/lib/db/types';
import { logger } from '@/utils/logger';

// Define props interface for the component
interface CreationsGalleryProps {
	galleryItems: GalleryItem[];
}

// --- Configuration ---
const NUM_COLUMNS = 3; // Number of conceptual columns for positioning
const PLANE_SIZE = 1.5; // Size of each plane
const HORIZONTAL_SPREAD = 5; // Max width planes can be spread across
const VERTICAL_GAP = 2.5; // Vertical distance between planes in a column
const SCROLL_SPEED = 0.007;
const RECYCLE_BUFFER = PLANE_SIZE * 2; // Extra buffer distance before recycling
const POOL_MULTIPLIER = 2; // How many screens worth of planes to keep in the pool

// --- Video Material Sub-component ---
const VideoMaterial: FC<{ src: string }> = ({ src }) => {
	// Use the hook to manage video texture loading
	const texture = useVideoTexture(src, {
		muted: true,
		loop: true,
		playsInline: true, // Important for mobile iOS
		crossOrigin: 'anonymous', // Ensure CORS compatibility
		// Start playing automatically - may require user interaction in some browsers
		// but `muted` often allows autoplay.
		start: true,
	});

	return <meshStandardMaterial side={THREE.DoubleSide} map={texture} toneMapped={false} />;
};

// --- Component: Single Plane with Texture/Video ---
interface PlaneProps {
	item: GalleryItem;
	position: THREE.Vector3; // Current position from state
	planeSize: number;
}

const Plane: FC<PlaneProps> = React.memo(({ item, position, planeSize }) => {
	const meshRef = useRef<THREE.Mesh>(null!);

	// Update position directly - more efficient than state for rapid updates
	useFrame(() => {
		if (meshRef.current) {
			meshRef.current.position.copy(position);
		}
	});

	// Simple fallback material
	const fallbackMaterial = useMemo(() => <meshStandardMaterial color="#ccc" side={THREE.DoubleSide} />, []);

	return (
		<mesh ref={meshRef} userData={{ itemId: item.id }}>
			{/* Provide geometry here since VideoTexture needs a mesh to apply to */}
			<planeGeometry args={[planeSize, planeSize]} />
			<Suspense fallback={fallbackMaterial}>
				{item.mediaType === 'image' && item.url ? (
					// Use Drei's Image for images
					<Image url={item.url} scale={planeSize} transparent opacity={1} side={THREE.DoubleSide} toneMapped={false} />
				) : item.mediaType === 'video' && item.url ? (
					// Use the dedicated VideoMaterial component
					<VideoMaterial src={item.url} />
				) : (
					// Fallback material if no URL or unknown type
					<meshStandardMaterial color="#555" side={THREE.DoubleSide} />
				)}
			</Suspense>
		</mesh>
	);
});
Plane.displayName = 'Plane'; // Add display name for React DevTools

// --- Component: Scrolling Grid Manager ---
interface PlaneState {
	id: string; // Unique identifier for the plane instance (based on item index)
	itemIndex: number; // Index of the galleryItem it represents
	initialY: number; // The absolute Y position it would have at scrollY = 0
	x: number; // Current random X position
	z: number; // Current random Z position
	currentY: number; // Current calculated Y position (for rendering)
}

const ScrollingPlanes: FC<{ galleryItems: GalleryItem[] }> = ({ galleryItems }) => {
	const { camera, viewport } = useThree();
	const scrollY = useRef(0);
	// Use state to manage the array of plane data, triggering re-renders
	const [planeStates, setPlaneStates] = useState<PlaneState[]>([]);
	const initialPositionsSet = useRef(false);

	// Calculate viewport dimensions at Z=0
	const cameraZ = camera.position.z;
	const vFov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
	const visibleHeight = 2 * Math.tan(vFov / 2) * cameraZ;

	// Total vertical height occupied by all items if laid out end-to-end
	const totalContentHeight = useMemo(() => {
		if (galleryItems.length === 0 || NUM_COLUMNS === 0) return 0;
		return Math.ceil(galleryItems.length / NUM_COLUMNS) * VERTICAL_GAP;
	}, [galleryItems.length]);

	// Initialize plane states
	useEffect(() => {
		if (galleryItems.length === 0 || initialPositionsSet.current) return;

		logger.info('Initializing plane states', { count: galleryItems.length, totalContentHeight });
		const initialStates: PlaneState[] = [];
		const startYOffset = totalContentHeight / 2 - VERTICAL_GAP / 2; // Center the content

		for (let i = 0; i < galleryItems.length; i++) {
			const row = Math.floor(i / NUM_COLUMNS);
			const initialY = startYOffset - row * VERTICAL_GAP;
			initialStates.push({
				id: `plane-${i}`,
				itemIndex: i,
				initialY: initialY,
				x: (Math.random() - 0.5) * HORIZONTAL_SPREAD,
				z: (Math.random() - 0.5) * 1,
				currentY: initialY, // Start at initialY
			});
		}
		setPlaneStates(initialStates);
		initialPositionsSet.current = true;
	}, [galleryItems, totalContentHeight]);

	// Handle scroll
	useEffect(() => {
		const handleWheel = (event: WheelEvent) => {
			scrollY.current += event.deltaY * SCROLL_SPEED;
		};
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => window.removeEventListener('wheel', handleWheel);
	}, []);

	// Frame loop for updating positions and recycling states
	useFrame(() => {
		if (planeStates.length === 0 || totalContentHeight === 0) return;

		const currentScroll = scrollY.current;
		const topBound = visibleHeight / 2 + RECYCLE_BUFFER;
		const bottomBound = -visibleHeight / 2 - RECYCLE_BUFFER;

		setPlaneStates((prevStates) =>
			prevStates.map((state) => {
				let newInitialY = state.initialY;
				const currentRelativeY = state.initialY - currentScroll;
				let newX = state.x;
				let newZ = state.z;

				// Recycle check: ABOVE top boundary -> move initialY down
				if (currentRelativeY > topBound) {
					newInitialY -= totalContentHeight;
					newX = (Math.random() - 0.5) * HORIZONTAL_SPREAD;
					newZ = (Math.random() - 0.5) * 1;
				}
				// Recycle check: BELOW bottom boundary -> move initialY up
				else if (currentRelativeY < bottomBound) {
					newInitialY += totalContentHeight;
					newX = (Math.random() - 0.5) * HORIZONTAL_SPREAD;
					newZ = (Math.random() - 0.5) * 1;
				}

				// Calculate the final currentY for rendering this frame
				const finalCurrentY = newInitialY - currentScroll;

				// Only return a new object if something changed to avoid unnecessary re-renders
				if (newInitialY !== state.initialY || finalCurrentY !== state.currentY || newX !== state.x || newZ !== state.z) {
					return { ...state, initialY: newInitialY, currentY: finalCurrentY, x: newX, z: newZ };
				} else {
					return state;
				}
			}),
		);
	});

	// Render the planes based on their current state
	return (
		<group>
			{planeStates.map((state) => {
				const item = galleryItems[state.itemIndex];
				if (!item) return null; // Should not happen if indices are correct
				// Construct position vector for the Plane component
				const position = new THREE.Vector3(state.x, state.currentY, state.z);
				return (
					<Plane
						key={state.id} // Use stable key
						item={item}
						position={position}
						planeSize={PLANE_SIZE}
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
	// State for DPR, initialized client-side
	const [dprValue, setDprValue] = useState(1); // Default DPR

	useEffect(() => {
		// Set the DPR value only on the client after mount
		setDprValue(window.devicePixelRatio);
	}, []);

	// Use real items or generate test ones
	const items = useMemo(() => {
		if (galleryItems.length > 0) {
			// Ensure real items have a URL for testing, replace with actual logic if needed
			const itemsWithUrls = galleryItems.map((item) => ({ ...item, url: item.url || 'https://picsum.photos/300' }));
			logger.info(`Using ${itemsWithUrls.length} real gallery items`);
			return itemsWithUrls;
		}

		// Create test items if no real data, ensuring they have URLs
		const testItems = Array.from({ length: 100 }, (_, i) => ({
			id: `test-${i}`,
			title: `Test Item ${i}`,
			// Alternate image/video for testing
			mediaType: i % 5 === 0 ? 'video' : ('image' as const),
			url: i % 5 === 0 ? '/videos/test-video.mp4' : `https://picsum.photos/seed/${i}/300/300`,
		}));

		logger.info(`Using ${testItems.length} test gallery items (no real data provided)`);
		return testItems;
	}, [galleryItems]);

	return (
		<div className="relative h-screen w-full">
			<Canvas
				shadows
				camera={{
					position: [0, 0, 8], // Camera closer for larger planes
					fov: 50, // Slightly wider FOV
					near: 0.1,
					far: 1000,
				}}
				dpr={dprValue} // Use state variable for DPR
				frameloop="always"
				onCreated={({ gl }) => {
					gl.setClearColor('#ffffff');
					logger.info('Canvas created', {});
				}}
			>
				<Suspense fallback={null}>
					<ambientLight intensity={0.8} />
					<directionalLight position={[5, 15, 10]} intensity={1.2} />

					{/* Debug helper */}
					<DebugHelper />

					{/* Scrolling planes manager */}
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
