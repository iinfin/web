import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { Image } from '@react-three/drei';
import { type ThreeEvent, useFrame } from '@react-three/fiber';

import type { GalleryItem } from '@/app/lib/db/types';
import { logger } from '@/utils/logger';

// Import the extracted component
import { calculateDimensions, findClosestAspectRatio } from './utils';
import VideoMaterial from './VideoMaterial';

// Import utils

/**
 * Props for the PlaneWrapper component.
 */
interface PlaneWrapperProps {
	item: GalleryItem;
	position: THREE.Vector3;
	planeHeight: number;
	disableMedia: boolean;
}

/**
 * R3F component that wraps a single gallery item (image or video).
 * Handles aspect ratio detection, dimension calculation, rendering logic, and fallback/suspense.
 */
export const PlaneWrapper: FC<PlaneWrapperProps> = React.memo(({ item, position, planeHeight, disableMedia }) => {
	const groupRef = useRef<THREE.Group>(null!); // Use non-null assertion if confident it will be populated
	const [dimensions, setDimensions] = useState<[number, number]>([planeHeight, planeHeight]);

	// --- Event Handlers ---
	const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation(); // Prevent event from bubbling up if needed
		logger.info('Hovering over item:', { id: item.id, title: item.title, url: item.url });
		// Optional: Add visual feedback, e.g., slightly scale up
		// groupRef.current.scale.setScalar(1.05);
	};

	const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		// logger.info('Hover stopped for item:', { id: item.id });
		// Optional: Reset visual feedback
		// groupRef.current.scale.setScalar(1);
	};

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
		<group ref={groupRef} userData={{ itemId: item.id }} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
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

export default PlaneWrapper;
