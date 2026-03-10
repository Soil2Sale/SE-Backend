/**
 * Integration Test Setup
 *
 * - In CI: connects to the MongoDB service container via MONGO_URI env var
 * - Locally: spins up an in-memory MongoDB instance automatically
 *
 * All env vars required by the app are set here before any imports.
 */

// ── Set env vars BEFORE any module imports ────────────────────────────────────
process.env.JWT_SECRET = 'integration_test_secret_key';
process.env.JWT_ACCESS_SECRET = 'integration_test_access_secret';
process.env.JWT_REFRESH_SECRET = 'integration_test_refresh_secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.JWT_EXPIRE = '1h';
process.env.BREVO_API_KEY = 'test-api-key';
process.env.DEFAULT_FROM_EMAIL = 'test@example.com';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
    // If running in CI a MONGO_URI is provided via GitHub Actions service container.
    // Otherwise, boot an in-memory server for local development.
    const mongoUri = process.env.MONGO_URI;

    if (mongoUri) {
        // CI mode: connect to the provided MongoDB service
        await mongoose.connect(mongoUri, { dbName: 'integration_test' });
    } else {
        // Local mode: spin up an in-memory MongoDB instance
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    }
}, 60000); // 60s timeout for binary download on first local run

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

afterEach(async () => {
    // Clean all collections between tests to ensure isolation
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// ── Mock external services (email, telegram) ──────────────────────────────────
jest.mock('../../config/telegram', () => ({}));

jest.mock('../../middlewares/otp/otpSender', () => ({
    sendMSGViaTelegram: jest.fn().mockResolvedValue(undefined),
    sendOTPViaTelegram: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../middlewares/mail/mailer', () => ({
    sendOTPEmail: jest.fn().mockResolvedValue(undefined),
    sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../utils/auditLogger', () => ({
    createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

// Silence noisy console output during test runs
beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
});

afterAll(() => {
    (console.error as jest.Mock).mockRestore?.();
});
