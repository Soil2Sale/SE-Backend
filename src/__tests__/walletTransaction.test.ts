/**
 * Wallet & Transaction Routes — Integration Tests
 *
 * Postman source: SE.postman_collection.json → "Wallet" and "Transactions" folders
 * Routes tested:
 *   POST /api/wallets/
 *   POST /api/wallets/add-funds
 *   POST /api/transactions
 */

import request from 'supertest';
import app from '../app';

// ── Bypass auth middleware ────────────────────────────────────────────────────
jest.mock('../middlewares/auth', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { userId: 'user-uuid-001', role: 'Farmer' };
        next();
    },
}));

// ── Mock Wallet model ─────────────────────────────────────────────────────────
jest.mock('../models/Wallet', () => ({
    __esModule: true,
    default: {
        create: jest.fn(),
        findOne: jest.fn(),
        findOneAndUpdate: jest.fn(),
    },
}));

// ── Mock Transaction model ────────────────────────────────────────────────────
jest.mock('../models/Transaction', () => ({
    __esModule: true,
    TransactionType: { ADJUSTMENT: 'ADJUSTMENT', PAYMENT: 'PAYMENT', CROP_SALE: 'CROP_SALE' },
    TransactionStatus: { SUCCESS: 'SUCCESS', PENDING: 'PENDING' },
    ReferenceType: { DISPUTE: 'DISPUTE', ORDER: 'ORDER' },
    default: {
        create: jest.fn(),
        find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
        }),
    },
}));

// ── Mock User model used inside wallet controller ────────────────────────────
jest.mock('../models/User', () => ({
    __esModule: true,
    UserRole: { FARMER: 'Farmer', BUYER: 'Buyer', ADMIN: 'Admin' },
    default: {
        findOne: jest.fn().mockResolvedValue({ id: 'user-uuid-001', role: 'Farmer' }),
    },
}));

import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';

const mockWallet = {
    id: 'wallet-uuid-001',
    user_id: 'user-uuid-001',
    balance: 0,
    currency: 'INR',
    save: jest.fn().mockResolvedValue(undefined),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/wallets/', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should create a wallet and return 201', async () => {
        (Wallet.findOne as jest.Mock).mockResolvedValueOnce(null); // no existing wallet
        (Wallet.create as jest.Mock).mockResolvedValue(mockWallet);

        const res = await request(app)
            .post('/api/wallets/')
            .send({ user_id: 'user-uuid-001', currency: 'INR' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });
});

describe('POST /api/wallets/add-funds', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should add funds to wallet and return 200', async () => {
        const walletWithSave = { ...mockWallet, balance: 0, save: jest.fn().mockResolvedValue(undefined) };
        (Wallet.findOne as jest.Mock).mockResolvedValue(walletWithSave);
        (Transaction.create as jest.Mock).mockResolvedValue({ id: 'txn-1', amount: 75000 });

        const res = await request(app)
            .post('/api/wallets/add-funds')
            .send({ user_id: 'user-uuid-001', amount: 75000, payment_method: 'UPI' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe('POST /api/transactions', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should create a transaction and return 201', async () => {
        (Transaction.create as jest.Mock).mockResolvedValue({
            id: 'txn-uuid-001',
            sender_wallet_id: 'wallet-sender',
            receiver_wallet_id: 'wallet-receiver',
            amount: 21500,
            type: 'CROP_SALE',
        });
        (Wallet.findOne as jest.Mock)
            .mockResolvedValueOnce({ ...mockWallet, id: 'wallet-sender', balance: 50000, save: jest.fn() })
            .mockResolvedValueOnce({ ...mockWallet, id: 'wallet-receiver', balance: 5000, save: jest.fn() });
        (Wallet.findOneAndUpdate as jest.Mock).mockResolvedValue({});

        const res = await request(app)
            .post('/api/transactions')
            .send({
                sender_wallet_id: 'wallet-sender',
                receiver_wallet_id: 'wallet-receiver',
                amount: 21500,
                type: 'CROP_SALE',
                reference_type: 'ORDER',
                reference_id: 'order-uuid-001',
                payment_method: 'WALLET',
            });

        expect([200, 201]).toContain(res.status);
        expect(res.body.success).toBe(true);
    });
});
