export default {
	'**/*.{js,jsx,ts,tsx}': ['bun run util:lint:fix', 'bun run util:format'],
	'**/*.{json,css,scss,md,html,yml,yaml}': 'bun run util:format',
};
