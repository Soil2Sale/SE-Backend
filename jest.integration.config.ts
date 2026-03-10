import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup.ts'],
    testMatch: ['<rootDir>/src/__tests__/integration/**/*.integration.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
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
    testPathIgnorePatterns: [
        '<rootDir>/dist/',
        '<rootDir>/node_modules/'
    ],
    // 90s timeout: accounts for mongodb-memory-server binary download on first local run
    testTimeout: 90000,
    verbose: true,
};

export default config;
