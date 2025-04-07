'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Film grain settings configuration interface.
 */
interface FilmGrainSettings {
	intensity: number;
	scale: number;
	speed: number;
}

/**
 * Film grain context interface with state and control methods.
 */
interface FilmGrainContextType {
	/** Whether the film grain effect is enabled. */
	enabled: boolean;
	/** The intensity of the film grain effect (0-1). */
	intensity: number;
	/** The scale factor for the film grain pattern. */
	scale: number;
	/** The animation speed of the film grain. */
	speed: number;
	/** Function to toggle the enabled state. */
	toggleEnabled: () => void;
	/** Function to update individual settings. */
	updateSettings: (settings: Partial<FilmGrainSettings>) => void;
}

/**
 * Default film grain settings.
 */
const defaultSettings: FilmGrainSettings = {
	intensity: 0.4,
	scale: 2.5,
	speed: 0.2,
};

/**
 * Create context with default values.
 */
const FilmGrainContext = createContext<FilmGrainContextType>({
	enabled: true,
	...defaultSettings,
	toggleEnabled: () => {},
	updateSettings: () => {},
});

/**
 * Props for the FilmGrainProvider component.
 */
interface FilmGrainProviderProps {
	/** React child elements. */
	children: React.ReactNode;
	/** Optional initial enabled state. Defaults to true. */
	initialEnabled?: boolean;
	/** Optional initial settings overrides. */
	initialSettings?: Partial<FilmGrainSettings>;
}

/**
 * Provider component for film grain effect state management.
 * Manages global state for grain effect settings and visibility.
 */
export function FilmGrainProvider({ children, initialEnabled = true, initialSettings = {} }: FilmGrainProviderProps) {
	// State management
	const [enabled, setEnabled] = useState(initialEnabled);
	const [settings, setSettings] = useState<FilmGrainSettings>({
		...defaultSettings,
		...initialSettings,
	});

	// Toggle handler for enabled state
	const toggleEnabled = useCallback(() => {
		setEnabled((prev) => !prev);
	}, []);

	// Settings update handler
	const updateSettings = useCallback((newSettings: Partial<FilmGrainSettings>) => {
		setSettings((prev) => ({
			...prev,
			...newSettings,
		}));
	}, []);

	// Memoized context value
	const contextValue = useMemo(
		() => ({
			enabled,
			...settings,
			toggleEnabled,
			updateSettings,
		}),
		[enabled, settings, toggleEnabled, updateSettings],
	);

	return <FilmGrainContext.Provider value={contextValue}>{children}</FilmGrainContext.Provider>;
}

/**
 * Custom hook for accessing the film grain context.
 * Must be used within a FilmGrainProvider.
 *
 * @returns The film grain context value.
 * @throws Error if used outside a FilmGrainProvider.
 */
export function useFilmGrain() {
	const context = useContext(FilmGrainContext);

	if (context === undefined) {
		throw new Error('useFilmGrain must be used within a FilmGrainProvider');
	}

	return context;
}

export default FilmGrainContext;
