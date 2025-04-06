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
 * Props for the internal media content components (Image/Video).
 */
interface PlaneContentProps {
	/** URL of the image or video source */
	url: string;
	/** Current Y position of the plane in world space */
	planeY: number;
	/** Calculated height of the viewport in world space */
	viewportHeight: number;
	/** Progress of the initial entrance animation (0 to 1) */
	initialAnimProgress: number;
	/** Calculated aspect ratio of the media */
	aspect: number;
	/** Fallback material to display during loading or if media is disabled */
	fallbackMaterial: JSX.Element;
	/** Film grain intensity uniform value (0-1) */
	grainIntensity: number;
	/** Film grain scale uniform value */
	grainScale: number;
	/** Film grain animation speed uniform value */
	grainSpeed: number;
}

/**
 * Internal component: Loads and renders an image texture using AnimatedMaterial.
 * Memoized for performance.
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
 * Internal component: Loads and renders a video texture using AnimatedMaterial.
 * Configures video properties (muted, loop, etc.) via useVideoTexture.
 * Memoized for performance.
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
	/** The gallery item data object */
	item: GalleryItem;
	/** Target position vector for the plane group */
	position: THREE.Vector3;
	/** Base height for the plane geometry */
	planeHeight: number;
	/** Flag indicating if media loading/rendering is disabled */
	disableMedia: boolean;
	/** Callback invoked when the pointer hovers over or leaves the plane */
	onHoverChange: (name: string | null) => void;
	/** Calculated height of the viewport in world space (passed from parent) */
	viewportHeight: number;
	/** Initial Y position used for staggering calculations (passed from parent) - currently unused here */
	initialY: number;
	/** Optional: Film grain intensity (0-1), defaults to 0.2 */
	grainIntensity?: number;
	/** Optional: Film grain scale, defaults to 100.0 */
	grainScale?: number;
	/** Optional: Film grain animation speed, defaults to 0.4 */
	grainSpeed?: number;
}

/** Duration for the initial fade-in animation in seconds */
const INITIAL_ANIM_DURATION = 1.8; // seconds - slower, smoother fade in

/**
 * R3F component wrapping a single gallery item (image or video) plane.
 *
 * Responsibilities:
 * - Handles aspect ratio detection for media.
 * - Calculates plane dimensions based on aspect ratio and fixed height.
 * - Manages pointer hover events to display item titles.
 * - Renders the appropriate media type (Image or Video) via internal components.
 * - Provides a fallback material and uses Suspense for loading.
 * - Implements a simple initial fade-in animation controlled by `useFrame`.
 * - Passes necessary uniforms (grain, animation progress) to `AnimatedMaterial`.
 *
 * @param {PlaneWrapperProps} props - Component props.
 * @returns {JSX.Element} The rendered plane group.
 */
export const PlaneWrapper: FC<PlaneWrapperProps> = React.memo(
	({
		item,
		position,
		planeHeight,
		disableMedia,
		onHoverChange,
		viewportHeight,
		grainIntensity = 0.2, // Default grain intensity
		grainScale = 100.0, // Default grain scale
		grainSpeed = 0.4, // Default grain animation speed
	}) => {
		const groupRef = useRef<THREE.Group>(null!); // Use non-null assertion if confident it will be populated
		const [dimensions, setDimensions] = useState<[number, number]>([planeHeight, planeHeight]);
		const [aspect, setAspect] = useState<number>(1);
		const [initialAnimProgress, setInitialAnimProgress] = useState(0); // 0 to 1
		const [isMounted, setIsMounted] = useState(false);
		const startTimeRef = useRef<number | null>(null);

		// --- Event Handlers ---
		const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
			event.stopPropagation(); // Prevent event from bubbling up if needed
			onHoverChange(item.title ?? null);
		};

		const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
			event.stopPropagation();
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
			// Simply set mounted state to true to start animation
			setIsMounted(true);
		}, []);

		// Update group position and animation progress each frame
		useFrame((state, _delta) => {
			if (groupRef.current) {
				// Update position
				groupRef.current.position.copy(position);

				// Simple fade-in animation with no stagger
				if (isMounted && initialAnimProgress < 1) {
					// Initialize start time if not set
					if (startTimeRef.current === null) {
						startTimeRef.current = state.clock.elapsedTime;
					}

					// Calculate progress based on elapsed time
					const elapsed = state.clock.elapsedTime - startTimeRef.current;
					let progress = Math.min(elapsed / INITIAL_ANIM_DURATION, 1);

					// Apply simple ease-out curve
					progress = 1 - Math.pow(1 - progress, 3); // Cubic ease out

					// Update animation progress
					setInitialAnimProgress(progress);
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
