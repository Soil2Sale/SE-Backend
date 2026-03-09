/**
 * Auth Controller — Pure Unit Tests (no HTTP layer)
 *
 * Auth uses OTP/Telegram. Tests cover: register, login (identifier-based), logout.
 */

import { Request, Response, NextFunction } from 'express';

jest.mock('../models/User');
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
jest.mock('../utils/jwt', () => ({
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
    verifyRefreshToken: jest.fn().mockReturnValue({ userId: 'u-1' }),
    getRefreshTokenExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 86400000)),
}));
jest.mock('../middlewares/otp/otpService', () => ({
    generateOTP: jest.fn().mockReturnValue('123456'),
    validateOTP: jest.fn().mockReturnValue(true),
}));
jest.mock('../middlewares/otp/otpSender', () => ({
    sendOTPViaTelegram: jest.fn().mockResolvedValue(undefined),
    sendMSGViaTelegram: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../middlewares/mail/mailer', () => ({
    sendOTPEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../utils/auditLogger', () => ({
    createAuditLog: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../config/telegram', () => ({}));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));

import { register, login, logout } from '../controllers/authController';
import User from '../models/User';

const mockReq = (body = {}, cookies = {}): Partial<Request> => ({ body, cookies } as any);
const mockRes = (): Partial<Response> => {
    const r: any = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    r.cookie = jest.fn().mockReturnValue(r);
    r.clearCookie = jest.fn().mockReturnValue(r);
    return r;
};
const mockNext: NextFunction = jest.fn();

// ── register ──────────────────────────────────────────────────────────────────
describe('authController.register (unit)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 201 on successful registration', async () => {
        (User.create as jest.Mock).mockResolvedValue({
            id: 'u-1',
            name: 'Kanha',
            mobile_number: '9876543210',
            role: 'Farmer',
            toObject: () => ({ id: 'u-1', name: 'Kanha', role: 'Farmer' }),
        });

        const req = mockReq({ name: 'Kanha', mobile_number: '9876543210', role: 'Farmer' });
        const res = mockRes();
        await register(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when required fields are missing', async () => {
        const req = mockReq({ name: 'Kanha' }); // missing mobile_number and role
        const res = mockRes();
        await register(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('calls next(error) on DB failure', async () => {
        (User.create as jest.Mock).mockRejectedValue(new Error('DB down'));
        const req = mockReq({ name: 'Kanha', mobile_number: '9876543210', role: 'Farmer' });
        const res = mockRes();
        await register(req as Request, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ── login ─────────────────────────────────────────────────────────────────────
describe('authController.login (unit)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 for invalid identifier format', async () => {
        const req = mockReq({ identifier: 'not-valid' });
        const res = mockRes();
        await login(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when user is not found', async () => {
        (User.findOne as jest.Mock).mockResolvedValue(null);
        const req = mockReq({ identifier: '9000000000' });
        const res = mockRes();
        await login(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

// ── logout ────────────────────────────────────────────────────────────────────
describe('authController.logout (unit)', () => {
    it('clears cookie and returns 200', async () => {
        const req = mockReq({}, { refreshToken: 'old-token' });
        const res = mockRes();
        await logout(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
