import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        // uuid v9+ is pure ESM — redirect to a CJS-compatible shim in tests
        '^uuid$': '<rootDir>/src/__tests__/__mocks__/uuid.ts',
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: {
                types: ['node', 'jest'],
                esModuleInterop: true,
            },
            isolatedModules: true,
        }],
    },
    testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/', '<rootDir>/src/__tests__/integration/'],
    collectCoverage: true,
    collectCoverageFrom: [
        'src/controllers/**/*.ts',
        '!src/**/*.d.ts',
        '!**/node_modules/**',
    ],
    coverageReporters: ['text', 'lcov'],
    testTimeout: 30000,
};

export default config;
