process.env.BREVO_API_KEY = "test-api-key";
process.env.DEFAULT_FROM_EMAIL = "test@example.com";
process.env.JWT_SECRET = "test-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_ACCESS_EXPIRY = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    // Set necessary env variables for JWT and other config
    process.env.JWT_SECRET = 'integration_test_secret_key';
    process.env.JWT_EXPIRE = '1h';

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
});

// Mock external services to not interfere with real emails and telegram messages
jest.mock('../../config/telegram', () => ({}));
jest.mock('../../middlewares/otp/otpSender', () => ({
    sendMSGViaTelegram: jest.fn().mockResolvedValue(undefined),
    sendOTPViaTelegram: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../middlewares/mail/mailer', () => ({
    sendOTPEmail: jest.fn().mockResolvedValue(undefined),
    sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));
