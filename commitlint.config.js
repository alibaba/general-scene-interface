export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'subject-case': [0, 'never', ['pascal-case', 'start-case']],
	},
}
