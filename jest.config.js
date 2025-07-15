module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/projects/wm-core'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'projects/wm-core/src/**/*.ts',
    '!projects/wm-core/src/**/*.spec.ts',
    '!projects/wm-core/src/**/*.d.ts',
    '!projects/wm-core/src/public-api.ts',
  ],
  coverageDirectory: 'coverage/wm-core',
  coverageReporters: ['html', 'text-summary'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/projects/wm-core/src/$1',
    '^@wm-core/(.*)$': '<rootDir>/projects/wm-core/src/$1',
    '^localforage$': '<rootDir>/projects/wm-core/src/__mocks__/localforage.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|ol|ol-ext|localforage)'
  ],
  modulePathIgnorePatterns: ['<rootDir>/projects/wm-core/package.json'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/']
};
