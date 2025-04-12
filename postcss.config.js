const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default {
	plugins: {
		'@tailwindcss/postcss': {},
		'autoprefixer': {},
		...(IS_PRODUCTION
			? {
					cssnano: {
						preset: [
							'default',
							{
								discardComments: { removeAll: true },
								colormin: true,
								mergeRules: true,
								minifyFontValues: true,
								normalizeWhitespace: true,
								zindex: false, // Don't rebase z-index
							},
						],
					},
				}
			: {}),
	},
};
