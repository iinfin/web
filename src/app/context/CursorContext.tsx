'use client';

import { createContext, type Dispatch, type ElementType, type ReactNode, type SetStateAction, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Defines the possible visual types or states the custom cursor can be in.
 * 'default': Standard arrow or dot.
 * 'pointer': Indicates an interactive element (like a link).
 * 'text': Indicates text input or selection is possible.
 * 'hidden': Makes the cursor invisible.
 * Can be extended with custom string identifiers for specific interaction states.
 */
export type CursorType = 'default' | 'pointer' | 'text' | 'hidden' | string;

/**
 * Interface for cursor context data and methods.
 */
type CursorContextType = {
	/** Current cursor visual type. */
	cursorType: CursorType;
	/** Function to set the cursor type. */
	setCursorType: Dispatch<SetStateAction<CursorType>>;
	/** Text to display alongside the cursor (if applicable). */
	cursorText: string;
	/** Function to set the cursor text. */
	setCursorText: Dispatch<SetStateAction<string>>;
};

/**
 * Create context with undefined initial value.
 * This forces consumers to use the context within a provider.
 */
const CursorContext = createContext<CursorContextType | undefined>(undefined);

/**
 * Props for the CursorProvider component.
 */
type CursorProviderProps = {
	/** React child elements. */
	children: ReactNode;
};

/**
 * Provides the cursor context to its children.
 * Manages the global state for the desired cursor type and optional text content.
 */
export function CursorProvider({ children }: CursorProviderProps) {
	// State management
	const [type, setType] = useState<CursorType>('default');
	const [text, setText] = useState<string>('');

	// Type update handler with side effects
	const setTypeHandler = useCallback<Dispatch<SetStateAction<CursorType>>>((newTypeOrFn) => {
		setType((prevType) => {
			const newType = typeof newTypeOrFn === 'function' ? newTypeOrFn(prevType) : newTypeOrFn;

			// Clear text automatically when not a text-related type
			if (newType !== 'text' && !newType.startsWith('customText')) {
				setText('');
			}

			return newType;
		});
	}, []);

	// Text update handler
	const setTextHandler = useCallback<Dispatch<SetStateAction<string>>>((newTextOrFn) => {
		setText(newTextOrFn);
		// Optional: Automatically switch to text type when text is set
		// setType('text');
	}, []);

	// Memoized context value
	const contextValue = useMemo(
		() => ({
			cursorType: type,
			setCursorType: setTypeHandler,
			cursorText: text,
			setCursorText: setTextHandler,
		}),
		[type, setTypeHandler, text, setTextHandler],
	);

	return <CursorContext.Provider value={contextValue}>{children}</CursorContext.Provider>;
}

/**
 * Hook to access the cursor context.
 * Provides the current cursor type and functions to update it.
 * Must be used within a `CursorProvider`.
 *
 * @returns The cursor context value.
 * @throws Error if used outside of a `CursorProvider`.
 */
export function useCursor() {
	const context = useContext(CursorContext);

	if (context === undefined) {
		throw new Error('useCursor must be used within a CursorProvider');
	}

	return context;
}

/**
 * Props for the CursorHoverArea component.
 */
type CursorHoverAreaProps = {
	/** React child elements. */
	children: ReactNode;
	/** The cursor type to apply when hovering over this area. Defaults to 'pointer'. */
	hoverType?: CursorType;
	/** Optional text to display in the cursor when hovering. */
	hoverText?: string;
	/** Allows passing additional class names to the wrapper element. */
	className?: string;
	/** The HTML tag or React component to use for the wrapper element. Defaults to 'div'. */
	as?: ElementType;
	/** Function to call on mouse enter. */
	onMouseEnter?: (event: React.MouseEvent) => void;
	/** Function to call on mouse leave. */
	onMouseLeave?: (event: React.MouseEvent) => void;
	/** Allow any other props to be passed through. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[key: string]: any;
};

/**
 * A convenience component that wraps its children in a specified HTML tag (`div` by default).
 * On mouse enter, it sets the cursor type (and optional text) defined in props.
 * On mouse leave, it resets the cursor type to 'default'.
 */
export function CursorHoverArea({
	children,
	hoverType = 'pointer',
	hoverText = '',
	className,
	as: Tag = 'div',
	onMouseEnter: externalMouseEnter,
	onMouseLeave: externalMouseLeave,
	...rest
}: CursorHoverAreaProps) {
	// Access cursor context
	const { setCursorType, setCursorText } = useCursor();

	// Mouse enter handler with cursor type change
	const handleMouseEnter = useCallback(
		(event: React.MouseEvent) => {
			setCursorType(hoverType);

			if (hoverText) {
				setCursorText(hoverText);
			}

			externalMouseEnter?.(event);
		},
		[setCursorType, setCursorText, hoverType, hoverText, externalMouseEnter],
	);

	// Mouse leave handler with cursor reset
	const handleMouseLeave = useCallback(
		(event: React.MouseEvent) => {
			setCursorType('default');
			setCursorText('');

			externalMouseLeave?.(event);
		},
		[setCursorType, setCursorText, externalMouseLeave],
	);

	// Work around TypeScript's limitations with polymorphic components
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary for generic component tag prop inference
	const AnyTag = Tag as any;

	return (
		<AnyTag onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className={className} {...rest}>
			{children}
		</AnyTag>
	);
}
