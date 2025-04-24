// @ts-check -- enable TS checks for this file if desired
import { FlatCompat } from '@eslint/eslintrc';
import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactCompiler from 'eslint-plugin-react-compiler';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Helper function to filter globals with whitespace issues
const filterGlobals = (globalSet) => {
	const filtered = {};
	for (const key in globalSet) {
		if (key.trim() === key) {
			filtered[key] = globalSet[key];
		} else {
			console.warn(`ESLint Config: Filtering out global '${key}' due to leading/trailing whitespace.`);
		}
	}
	return filtered;
};

// Create a compatibility layer for traditional config format
const compat = new FlatCompat({
	baseDirectory: import.meta.dirname,
});

// Import XO config parts - This might need adjustment based on how xo exports its flat config
// For simplicity here, we'll manually set some common XO-like rules.
// A more robust solution might involve directly importing from 'eslint-config-xo' if it supports flat config.

export default tseslint.config(
	// Global ignores
	{
		ignores: [
			'node_modules/',
			'.next/',
			'out/',
			'build/',
			'dist/',
			'docs/',
			// Ignore common JS config files (CommonJS format).
			// Be aware this also ignores any future `.js` files in `src/` unless overridden.
			'**/*.js',
			'postcss.config.js',
			'.prettierrc.js',
		],
	},

	// Base JavaScript/ESLint recommended rules
	eslint.configs.recommended,

	// TypeScript configuration
	...tseslint.configs.recommended, // Use recommended TypeScript rules
	// If you were using stricter XO rules, consider tseslint.configs.strict instead or add specific rules

	// Load Next.js config using FlatCompat
	// Note: `eslint-config-next` needs to be installed
	...compat.extends('next/core-web-vitals'), // Use FlatCompat to extend

	{
		languageOptions: {
			parserOptions: {
				project: true, // Automatically find tsconfig.json
				tsconfigRootDir: import.meta.dirname, // Set root for tsconfig lookup
			},
			globals: {
				...filterGlobals(globals.browser), // Add filtered browser globals
				...filterGlobals(globals.node), // Add filtered Node.js globals
				// React: 'readonly', // Usually not needed anymore
			},
		},
	},

	// React configuration
	{
		files: ['**/*.{ts,tsx}'], // Apply React rules only to TS/TSX files
		...reactRecommended, // Apply React recommended rules
		settings: {
			react: {
				version: 'detect', // Detect React version
			},
		},
		languageOptions: {
			parserOptions: {
				ecmaFeatures: {
					jsx: true, // Enable JSX parsing
				},
			},
		},
		plugins: {
			'react-hooks': reactHooks, // Add React Hooks plugin
			'react-compiler': reactCompiler, // Add React Compiler plugin
		},
		rules: {
			...reactHooks.configs.recommended.rules, // Enable recommended React Hooks rules
			'react/prop-types': 'off', // Disable prop-types rule (handled by TypeScript)
			'react/react-in-jsx-scope': 'off', // Disable old React scope rule (not needed)
			'react-compiler/react-compiler': 'error', // Enable React Compiler rule
		},
	},

	// Next.js Plugin Configuration - REMOVED MANUAL CONFIGURATION
	// (Handled by `compat.extends` above)

	// Explicit Next.js rule override (if necessary, `compat.extends` might cover this)
	{
		// Apply overrides specifically to TS/TSX files where Next.js rules are relevant
		files: ['**/*.{ts,tsx}'],
		rules: {
			'@next/next/google-font-display': 'warn', // Correct severity
		},
	},

	// Custom Rules / Overrides (Mimicking some XO and Prettier preferences)
	{
		files: ['**/*.{ts,tsx}'],
		rules: {
			// General Formatting/Style (ensure consistency with Prettier)
			'semi': ['error', 'always'],
			'quotes': 'off',
			'comma-dangle': ['error', 'always-multiline'],
			'object-curly-spacing': ['error', 'always'], // Common preference override
			'indent': 'off', // Let Prettier handle indentation

			// TypeScript specific overrides (adjust based on XO needs)
			'@typescript-eslint/explicit-function-return-type': 'off', // Often off unless strict library code
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'no-unused-vars': 'off', // Disable base ESLint rule (redundant with TS rule)
			'@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error for `any` initially

			// Other potential XO-like rules (add as needed)
			'capitalized-comments': 'off', // Style preference
			'no-console': 'warn', // Warn about console logs
			// Add more specific XO rules here if desired
		},
	},

	{
		files: ['src/app/lib/utils/logger.ts'],
		rules: {
			'no-console': 'off', // Allow console in logger utility
		},
	},
);
