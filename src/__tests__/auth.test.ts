/**
 * Auth Routes — Integration Tests
 *
 * This backend uses OTP-based auth via Telegram (no email/password).
 * Routes tested:
 *   POST /api/auth/register       — takes: name, mobile_number, role
 *   POST /api/auth/login          — takes: identifier (mobile or email)
 *   POST /api/auth/logout
 */

import request from 'supertest';
import app from '../app';

// ── Mock User model ───────────────────────────────────────────────────────────
jest.mock('../models/User', () => ({
    __esModule: true,
    UserRole: { FARMER: 'Farmer', BUYER: 'Buyer', COOPERATIVE: 'Cooperative' },
    default: {
        findOne: jest.fn(),
        create: jest.fn(),
    },
}));

// ── Mock RefreshToken model ───────────────────────────────────────────────────
jest.mock('../models/RefreshToken', () => ({
    __esModule: true,
    default: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        deleteOne: jest.fn().mockResolvedValue({}),
        updateOne: jest.fn().mockResolvedValue({}),
        verifyToken: jest.fn().mockResolvedValue(null),
    },
}));

// ── Mock OTP service ──────────────────────────────────────────────────────────
jest.mock('../middlewares/otp/otpService', () => ({
    generateOTP: jest.fn().mockReturnValue('123456'),
    validateOTP: jest.fn().mockReturnValue(true),
}));

// ── Mock mailer ───────────────────────────────────────────────────────────────
jest.mock('../middlewares/mail/mailer', () => ({
    sendOTPEmail: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));

import User from '../models/User';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should register a new user and return 201', async () => {
        (User.create as jest.Mock).mockResolvedValue({
            id: 'user-uuid-001',
            name: 'Kanha Singh',
            mobile_number: '9876543210',
            role: 'Farmer',
            toObject: () => ({ id: 'user-uuid-001', name: 'Kanha Singh', role: 'Farmer' }),
        });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Kanha Singh', mobile_number: '9876543210', role: 'Farmer' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });

    it('should return 400 if required fields are missing', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ name: 'Kanha Singh' }); // missing mobile_number and role

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('POST /api/auth/login', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return 400 for invalid identifier format', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: 'not-a-valid-identifier' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should return 404 when user is not found by mobile', async () => {
        (User.findOne as jest.Mock).mockResolvedValue(null);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '9000000000' }); // valid mobile format

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });

    it('should return 400 when account is not verified', async () => {
        (User.findOne as jest.Mock).mockResolvedValue({
            id: 'user-uuid-002',
            mobile_number: '9000000001',
            role: 'Farmer',
            is_verified: false,
            is_telegram_linked: false,
        });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ identifier: '9000000001' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('POST /api/auth/logout', () => {
    it('should clear the refresh token cookie and return 200', async () => {
        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', 'Bearer some-token');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
