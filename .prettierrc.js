export default {
	arrowParens: 'always',
	bracketSpacing: true,
	endOfLine: 'lf',
	printWidth: 200,
	quoteProps: 'consistent',
	semi: true,
	singleQuote: true,
	tabWidth: 4,
	trailingComma: 'all',
	useTabs: true,
	overrides: [
		{
			files: '*.{yml,yaml}',
			options: {
				tabWidth: 2,
				useTabs: false,
			},
		},
	],
	plugins: [
		'@trivago/prettier-plugin-sort-imports',
		'prettier-plugin-css-order',
		'prettier-plugin-tailwindcss', // Must be last to work properly with other plugins
	],
	// Import sorting configuration
	importOrder: [
		'^(react/(.*)$)|^(react$)', // React imports first
		'^(next/(.*)$)|^(next$)', // Next.js imports
		'<THIRD_PARTY_MODULES>', // All other third-party imports
		'^@/components/(.*)$', // Internal components
		'^@/lib/(.*)$', // Internal lib files
		'^@/styles/(.*)$', // Styles
		'^@/(.*)$', // Other internal imports
		'^[./]', // Relative imports
	],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,
	importOrderGroupNamespaceSpecifiers: true,
	importOrderCaseInsensitive: true,
};
