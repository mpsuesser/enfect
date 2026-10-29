import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		setupFiles: [`${import.meta.dirname}/test/setup.ts`],
		include: ['test/**/*.test.ts'],
		testTimeout: 30_000,
		pool: 'forks',
		isolate: false
	}
});
