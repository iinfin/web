'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

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
