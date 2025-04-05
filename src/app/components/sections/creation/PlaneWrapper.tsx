import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { useTexture, useVideoTexture } from '@react-three/drei';
import { type ThreeEvent, useFrame } from '@react-three/fiber';

import type { GalleryItem } from '@/app/lib/db/types';
import { logger } from '@/utils/logger';

import AnimatedMaterial from './AnimatedMaterial';
import { calculateDimensions, findClosestAspectRatio } from './utils';

/**
 * Props for the internal content components.
 */
interface PlaneContentProps {
	url: string;
	planeY: number;
	viewportHeight: number;
	initialAnimProgress: number;
	aspect: number;
	fallbackMaterial: JSX.Element;
	grainIntensity: number;
	grainScale: number;
	grainSpeed: number;
}

/**
 * Internal component to handle image texture loading and rendering.
 */
const ImagePlaneContent: FC<PlaneContentProps> = React.memo(({ url, planeY, viewportHeight, initialAnimProgress, aspect, fallbackMaterial, grainIntensity, grainScale, grainSpeed }) => {
	const texture = useTexture(url);

	return texture ? (
		<AnimatedMaterial
			texture={texture}
			planeY={planeY}
			viewportHeight={viewportHeight}
			initialAnimProgress={initialAnimProgress}
			aspect={aspect}
			grainIntensity={grainIntensity}
			grainScale={grainScale}
			grainSpeed={grainSpeed}
		/>
	) : (
		fallbackMaterial
	);
});
ImagePlaneContent.displayName = 'ImagePlaneContent';

/**
 * Internal component to handle video texture loading and rendering.
 */
const VideoPlaneContent: FC<PlaneContentProps> = React.memo(({ url, planeY, viewportHeight, initialAnimProgress, aspect, fallbackMaterial, grainIntensity, grainScale, grainSpeed }) => {
	const texture = useVideoTexture(url, {
		muted: true,
		loop: true,
		playsInline: true,
		crossOrigin: 'anonymous',
		start: true,
	});

	return texture ? (
		<AnimatedMaterial
			texture={texture}
			planeY={planeY}
			viewportHeight={viewportHeight}
			initialAnimProgress={initialAnimProgress}
			aspect={aspect}
			grainIntensity={grainIntensity}
			grainScale={grainScale}
			grainSpeed={grainSpeed}
		/>
	) : (
		fallbackMaterial
	);
});
VideoPlaneContent.displayName = 'VideoPlaneContent';

/**
 * Props for the PlaneWrapper component.
 */
interface PlaneWrapperProps {
	item: GalleryItem;
	position: THREE.Vector3;
	planeHeight: number;
	disableMedia: boolean;
	onHoverChange: (name: string | null) => void;
	viewportHeight: number; // Pass viewport height down
	initialY: number; // Pass initial Y for stagger calculation
	grainIntensity?: number; // Film grain intensity (0-1)
	grainScale?: number; // Film grain scale
	grainSpeed?: number; // Film grain animation speed
}

// Animation constants
const INITIAL_ANIM_DURATION = 0.5; // seconds
const INITIAL_ANIM_STAGGER_FACTOR = 0.2; // seconds per unit of distance from center

/**
 * R3F component that wraps a single gallery item (image or video).
 * Handles aspect ratio detection, dimension calculation, rendering logic, and fallback/suspense.
 * Uses AnimatedMaterial for visibility and entrance effects.
 */
export const PlaneWrapper: FC<PlaneWrapperProps> = React.memo(
	({
		item,
		position,
		planeHeight,
		disableMedia,
		onHoverChange,
		viewportHeight,
		initialY, // Get initial Y for stagger
		grainIntensity = 0.2, // Default grain intensity
		grainScale = 100.0, // Default grain scale
		grainSpeed = 0.4, // Default grain animation speed
	}) => {
		const groupRef = useRef<THREE.Group>(null!); // Use non-null assertion if confident it will be populated
		const [dimensions, setDimensions] = useState<[number, number]>([planeHeight, planeHeight]);
		const [aspect, setAspect] = useState<number>(1);
		const [initialAnimProgress, setInitialAnimProgress] = useState(0); // 0 to 1
		const [isMounted, setIsMounted] = useState(false);

		// --- Event Handlers ---
		const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
			event.stopPropagation(); // Prevent event from bubbling up if needed
			// logger.info('Hovering over item:', { id: item.id, title: item.title, url: item.url });
			// Call the callback with the item's title
			onHoverChange(item.title ?? null);
		};

		const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
			event.stopPropagation();
			// logger.info('Hover stopped for item:', { id: item.id });
			// Call the callback with null
			onHoverChange(null);
		};

		// Detect aspect ratio and set dimensions - ONLY IF MEDIA IS ENABLED
		useEffect(() => {
			if (disableMedia || !item.url) return; // Skip if media disabled or no URL

			const detectAspectRatio = async () => {
				if (!item.url) return;

				try {
					let ratio = 1;
					if (item.mediaType === 'video') {
						const video = document.createElement('video');
						video.src = item.url;
						await new Promise<void>((resolve, reject) => {
							video.onloadedmetadata = () => resolve();
							video.onerror = reject;
						});
						ratio = video.videoWidth / video.videoHeight;
					} else if (item.mediaType === 'image') {
						// For images, we need to load them briefly to get dimensions
						const img = document.createElement('img');
						img.src = item.url;
						await new Promise<void>((resolve, reject) => {
							img.onload = () => resolve();
							img.onerror = reject;
						});
						ratio = img.width / img.height;
					}
					const closest = findClosestAspectRatio(ratio);
					if (closest) {
						setDimensions(calculateDimensions(closest));
						setAspect(closest.width / closest.height);
					}
				} catch (error) {
					logger.error('Error detecting aspect ratio:', { url: item.url, error });
				}
			};

			detectAspectRatio();
		}, [item.url, item.mediaType, disableMedia, planeHeight]);

		// Start initial animation on mount
		useEffect(() => {
			setIsMounted(true);
		}, []);

		// Update group position and initial animation progress each frame
		useFrame((state, _delta) => {
			if (groupRef.current) {
				groupRef.current.position.copy(position);
			}

			// Animate initial progress if mounted and not yet complete
			if (isMounted && initialAnimProgress < 1) {
				// Calculate delay based on initial distance from viewport center (absolute value)
				// Scale factor reduces delay for items closer to the center
				const distanceFromCenter = Math.abs(initialY);
				const delay = distanceFromCenter * INITIAL_ANIM_STAGGER_FACTOR;

				// Start timer after delay
				if (state.clock.elapsedTime > delay) {
					// Calculate progress based on time elapsed since delay ended
					const elapsedSinceDelay = state.clock.elapsedTime - delay;
					let progress = elapsedSinceDelay / INITIAL_ANIM_DURATION;

					// Apply ease-out cubic function: progress * progress * progress
					// progress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
					// Apply ease-out quint: 1 - pow(1 - x, 5)
					progress = 1 - Math.pow(1 - progress, 5);

					setInitialAnimProgress(Math.min(progress, 1)); // Clamp progress to 1
				}
			}
		});

		const fallbackMaterial = useMemo(() => <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.0} />, []);

		// Conditionally render internal component based on media type
		const renderContent = () => {
			if (disableMedia || !item.url) {
				return fallbackMaterial;
			}

			const contentProps = {
				url: item.url,
				planeY: position.y,
				viewportHeight: viewportHeight,
				initialAnimProgress: initialAnimProgress,
				aspect: aspect,
				fallbackMaterial: fallbackMaterial,
				grainIntensity: grainIntensity,
				grainScale: grainScale,
				grainSpeed: grainSpeed,
			};

			if (item.mediaType === 'video') {
				return <VideoPlaneContent {...contentProps} />;
			} else if (item.mediaType === 'image') {
				return <ImagePlaneContent {...contentProps} />;
			}

			return fallbackMaterial; // Fallback if unknown type
		};

		return (
			<group ref={groupRef} userData={{ itemId: item.id }} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
				<mesh scale={[dimensions[0], dimensions[1], 1]} position={[dimensions[0] / 2, 0, 0]}>
					<planeGeometry />
					<Suspense fallback={fallbackMaterial}>{renderContent()}</Suspense>
				</mesh>
			</group>
		);
	},
);

PlaneWrapper.displayName = 'PlaneWrapper';

export default PlaneWrapper;
