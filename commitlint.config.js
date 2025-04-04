export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// Ensure the type is one of the allowed types
		'type-enum': [
			2,
			'always',
			[
				'build', // Changes that affect the build system or external dependencies
				'chore', // Other changes that don't modify src or test files
				'ci', // Changes to CI configuration files and scripts
				'docs', // Documentation only changes
				'feat', // A new feature
				'fix', // A bug fix
				'perf', // A code change that improves performance
				'refactor', // A code change that neither fixes a bug nor adds a feature
				'revert', // Reverts a previous commit
				'style', // Changes that do not affect the meaning of the code
				'test', // Adding missing tests or correcting existing tests
				'animation', // Changes related to animations and motion
				'content', // Content updates like text or images
				'layout', // Layout and design changes
				'a11y', // Accessibility improvements
			],
		],
		// Scope is optional
		'scope-empty': [0, 'never'],
		// Scope can be any of these specific values related to our project areas
		'scope-enum': [
			1,
			'always',
			[
				'components',
				'pages',
				'api',
				'hooks',
				'lib',
				'utils',
				'styles',
				'config',
				'assets',
				'r3f', // React Three Fiber related changes
				'motion', // Framer Motion related changes
				'types',
				'content',
				'deps', // Dependencies
				'tests',
				'3d', // 3D models and assets
				'release', // Scope for semantic-release commits
			],
		],
		// Subject must not be empty and must be lowercase
		'subject-empty': [2, 'never'],
		'subject-case': [2, 'always', ['lower-case', 'sentence-case']],
		// Limit the header length (type(scope): subject)
		'header-max-length': [2, 'always', 100],
		// No full stop in the subject
		'subject-full-stop': [2, 'never', '.'],
		// Disable line length check for body
		'body-max-line-length': [0, 'always', Infinity],
	},
	// Help URL for issues
	helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
};
