'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface FilmGrainContextType {
	enabled: boolean;
	intensity: number;
	scale: number;
	speed: number;
	toggleEnabled: () => void;
	updateSettings: (settings: Partial<FilmGrainSettings>) => void;
}

interface FilmGrainSettings {
	intensity: number;
	scale: number;
	speed: number;
}

// Default values
const defaultSettings: FilmGrainSettings = {
	intensity: 0.4,
	scale: 2.5,
	speed: 0.2,
};

// Create context with default values
const FilmGrainContext = createContext<FilmGrainContextType>({
	enabled: true,
	...defaultSettings,
	toggleEnabled: () => {},
	updateSettings: () => {},
});

interface FilmGrainProviderProps {
	children: React.ReactNode;
	initialEnabled?: boolean;
	initialSettings?: Partial<FilmGrainSettings>;
}

export function FilmGrainProvider({ children, initialEnabled = true, initialSettings = {} }: FilmGrainProviderProps) {
	// Initialize state with defaults and any passed overrides
	const [enabled, setEnabled] = useState(initialEnabled);
	const [settings, setSettings] = useState<FilmGrainSettings>({
		...defaultSettings,
		...initialSettings,
	});

	// Check device performance on mount to auto-disable for lower-end devices
	useEffect(() => {
		// Simple performance check - could be expanded with more sophisticated detection
		const checkPerformance = () => {
			// Check if device is low-powered (mobile, tablet, etc.)
			const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

			// If user has requested reduced motion, disable animations
			const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

			// Auto-disable for low-powered devices or if reduced motion is preferred
			if (prefersReducedMotion || (isMobile && navigator.hardwareConcurrency <= 4)) {
				setEnabled(false);
			}
		};

		checkPerformance();
	}, []);

	// Toggle enabled state
	const toggleEnabled = useCallback(() => {
		setEnabled((prev) => !prev);
	}, []);

	// Update settings
	const updateSettings = useCallback((newSettings: Partial<FilmGrainSettings>) => {
		setSettings((prev) => ({
			...prev,
			...newSettings,
		}));
	}, []);

	// Memoize context value to prevent unnecessary re-renders
	const value = useMemo(
		() => ({
			enabled,
			...settings,
			toggleEnabled,
			updateSettings,
		}),
		[enabled, settings, toggleEnabled, updateSettings],
	);

	return <FilmGrainContext.Provider value={value}>{children}</FilmGrainContext.Provider>;
}

// Custom hook for using the context
export function useFilmGrain() {
	const context = useContext(FilmGrainContext);
	if (context === undefined) {
		throw new Error('useFilmGrain must be used within a FilmGrainProvider');
	}
	return context;
}

export default FilmGrainContext;
