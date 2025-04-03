import React, { useEffect } from 'react';
import type { FC } from 'react';

import * as THREE from 'three';
import { useVideoTexture } from '@react-three/drei';

/**
 * Props for the VideoMaterial component.
 */
interface VideoMaterialProps {
	src: string;
}

/**
 * R3F component that creates a material using a video texture.
 * Handles texture setup and UV adjustments.
 */
export const VideoMaterial: FC<VideoMaterialProps> = ({ src }) => {
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

export default VideoMaterial;
