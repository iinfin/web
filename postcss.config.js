const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default {
	plugins: {
		'@tailwindcss/postcss': {},
		'autoprefixer': {},
		...(IS_PRODUCTION ? { cssnano: {} } : {}),
	},
};
