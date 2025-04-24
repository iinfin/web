export default {
	'**/*.{js,jsx,ts,tsx}': ['npm run util:lint:fix', 'npm run util:format'],
	'**/*.{json,css,scss,md,html,yml,yaml}': 'npm run util:format',
};
