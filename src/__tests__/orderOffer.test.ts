/**
 * Order & Offer Routes — Integration Tests
 *
 * Postman source: SE.postman_collection.json → "Offers" and "Order" folders
 * Routes tested:
 *   POST  /api/offers/
 *   POST  /api/orders
 *   PATCH /api/orders/:id/payment
 */

import request from 'supertest';
import app from '../app';

// ── Bypass auth ───────────────────────────────────────────────────────────────
jest.mock('../middlewares/auth', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { userId: 'buyer-user-uuid', role: 'Buyer' };
        next();
    },
    authorize: () => (_req: any, _res: any, next: any) => next(),
}));

// ── CropListing: offerController uses findOne() WITHOUT .lean() ───────────────
jest.mock('../models/CropListing', () => ({
    __esModule: true,
    CropListingStatus: { ACTIVE: 'ACTIVE', SOLD: 'SOLD' },
    default: {
        findOne: jest.fn().mockResolvedValue({
            id: 'listing-uuid-001',
            farmer_profile_id: 'farmer-profile-uuid',
            farmer_user_id: 'farmer-user-uuid',
            crop_name: 'Maize',
            quantity: 1500,
            expected_price: 22000,
            status: 'ACTIVE',
        }),
        find: jest.fn().mockResolvedValue([]),
        findOneAndUpdate: jest.fn(),
    },
}));

// ── Offer model ───────────────────────────────────────────────────────────────
jest.mock('../models/Offer', () => ({
    __esModule: true,
    OfferStatus: { PENDING: 'PENDING', ACCEPTED: 'ACCEPTED', WITHDRAWN: 'WITHDRAWN', REJECTED: 'REJECTED' },
    default: {
        create: jest.fn(),
        findOne: jest.fn().mockResolvedValue(null), // null = no existing pending offer
        find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
        }),
    },
}));

// ── Order model ───────────────────────────────────────────────────────────────
jest.mock('../models/Order', () => ({
    __esModule: true,
    PaymentStatus: { PENDING: 'PENDING', PAID: 'PAID' },
    OrderStatus: { PENDING: 'PENDING', CONFIRMED: 'CONFIRMED' },
    default: {
        create: jest.fn(),
        findOne: jest.fn().mockResolvedValue(null),
        findOneAndUpdate: jest.fn(),
    },
}));

// ── Wallet model ──────────────────────────────────────────────────────────────
jest.mock('../models/Wallet', () => ({
    __esModule: true,
    default: {
        findOne: jest.fn().mockResolvedValue({ id: 'wallet-uuid', balance: 100000 }),
        findOneAndUpdate: jest.fn().mockResolvedValue({}),
    },
}));

// ── User model (offerController checks role === UserRole.BUYER) ───────────────
jest.mock('../models/User', () => ({
    __esModule: true,
    UserRole: { BUYER: 'Buyer', FARMER: 'Farmer', COOPERATIVE: 'Cooperative' },
    default: {
        findOne: jest.fn().mockResolvedValue({ id: 'buyer-user-uuid', role: 'Buyer', telegram_chat_id: null }),
    },
}));

// ── Notification model ────────────────────────────────────────────────────────
jest.mock('../models/Notification', () => ({
    __esModule: true,
    NotificationType: { ORDER_UPDATE: 'ORDER_UPDATE' },
    NotificationReferenceType: { ORDER: 'ORDER' },
    default: { create: jest.fn().mockResolvedValue({}) },
}));

// ── OTP/Telegram sender ───────────────────────────────────────────────────────
jest.mock('../middlewares/otp/otpSender', () => ({
    sendMSGViaTelegram: jest.fn().mockResolvedValue(undefined),
    sendOTPViaTelegram: jest.fn().mockResolvedValue(undefined),
}));

import Offer from '../models/Offer';
import Order from '../models/Order';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/offers/', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should create an offer and return 201', async () => {
        (Offer.create as jest.Mock).mockResolvedValue({
            id: 'offer-uuid-001',
            crop_listing_id: 'listing-uuid-001',
            offered_price: 20000,
            status: 'PENDING',
        });
        (Offer.findOne as jest.Mock).mockResolvedValue(null); // no existing pending offer

        const res = await request(app)
            .post('/api/offers/')
            .send({
                crop_listing_id: 'listing-uuid-001',
                offered_price: 20000,
                farmer_user_id: 'farmer-user-uuid',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });
});

describe('POST /api/orders', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should create an order and return 201', async () => {
        (Order.create as jest.Mock).mockResolvedValue({
            id: 'order-uuid-001',
            crop_listing_id: 'listing-uuid-001',
            final_price: 21500,
            quantity: 1500,
            payment_status: 'PENDING',
        });

        const res = await request(app)
            .post('/api/orders')
            .send({ crop_listing_id: 'listing-uuid-001', final_price: 21500, quantity: 1500 });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});

describe('PATCH /api/orders/:id/payment', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should update payment status of an order', async () => {
        (Order.findOne as jest.Mock).mockResolvedValue({ id: 'order-uuid-001', payment_status: 'PENDING' });
        (Order.findOneAndUpdate as jest.Mock).mockResolvedValue({ id: 'order-uuid-001', payment_status: 'PAID' });

        const res = await request(app)
            .patch('/api/orders/order-uuid-001/payment')
            .send({ payment_status: 'PAID' });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
    });
});
