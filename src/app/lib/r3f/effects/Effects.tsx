'use client';

import { useCallback, useEffect, useRef } from 'react';

import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, EffectPass, RenderPass } from 'postprocessing';

import { DitheringEffect } from './DitheringEffect';

/**
 * Component that manages post-processing effects, including Dithering.
 */
export const Effects = () => {
	const composerRef = useRef<EffectComposer | null>(null);
	const { gl, scene, camera, size } = useThree();

	// Memoized resize handler
	const handleResize = useCallback(() => {
		if (composerRef.current) {
			composerRef.current.setSize(size.width, size.height);
		}
	}, [size]);

	// Handle window resize
	useEffect(() => {
		handleResize(); // Initial call
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [handleResize, size]);

	// Configure post-processing effects
	useEffect(() => {
		if (!scene || !camera || !gl) return;

		// Initialize composer if not yet created
		if (!composerRef.current) {
			composerRef.current = new EffectComposer(gl);
			handleResize(); // Initial sizing
		}

		const composer = composerRef.current;
		composer.removeAllPasses();

		// Add required passes in order
		const renderPass = new RenderPass(scene, camera);
		composer.addPass(renderPass);

		// Dithering effect with direct parameters
		const ditheringEffect = new DitheringEffect({ resolution: new THREE.Vector2(size.width, size.height) });
		composer.addPass(new EffectPass(camera, ditheringEffect));

		return () => {
			composer.removeAllPasses();
			// ditheringEffect.dispose?.(); // If DitheringEffect had a dispose method
		};
	}, [scene, camera, gl, size, handleResize]);

	// Handle rendering
	useFrame(() => {
		composerRef.current?.render();
	}, 1); // Render at priority 1 (after main scene render at 0)

	return null; // This component does not render anything itself
};
