import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import walletRoutes from '../../routes/walletRoutes';
import Wallet from '../../models/Wallet';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/wallets', walletRoutes);
app.use(errorHandler);

describe('Wallet API (Integration)', () => {

    const user1Id = new mongoose.Types.ObjectId();
    const mockUser1Token = generateAccessToken(user1Id, 'user1@test.com', 'Buyer');
    const authHeader = `Bearer ${mockUser1Token}`;

    beforeEach(async () => {
        // Seed user
        await User.create({
            id: user1Id.toString(),
            name: 'Test Wallet User',
            mobile_number: '9666666661',
            role: UserRole.BUYER,
            is_verified: true,
            is_telegram_linked: false,
            aadhaar_verified: true,
            business_verified: true
        });
    });

    it('should securely auto-create and get a wallet when a user requests /me', async () => {
        const createRes = await request(app)
            .post('/api/wallets')
            .set('Authorization', authHeader)
            .send({ user_id: user1Id.toString() });

        expect(createRes.status).toBe(201);
        expect(createRes.body.success).toBe(true);
        expect(createRes.body.data.balance).toBe(0);

        // Fetch it
        const getRes = await request(app)
            .get('/api/wallets/me')
            .set('Authorization', authHeader);

        expect(getRes.status).toBe(200);
        expect(getRes.body.success).toBe(true);
        expect(getRes.body.data.user_id).toBe(user1Id.toString());
    });

    it('should add funds to a wallet properly', async () => {
        // Seed wallet
        await Wallet.create({
            id: new mongoose.Types.ObjectId().toString(),
            user_id: user1Id.toString(),
            balance: 500,
            currency: 'INR'
        });

        const res = await request(app)
            .post('/api/wallets/add-funds')
            .set('Authorization', authHeader)
            .send({ amount: 1500 });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.wallet.balance).toBe(2000);

        // Verify physically
        const dbWallet = await Wallet.findOne({ user_id: user1Id.toString() });
        expect(dbWallet!.balance).toBe(2000);
    });

    it('should securely withdraw funds from a wallet', async () => {
        await Wallet.create({
            id: new mongoose.Types.ObjectId().toString(),
            user_id: user1Id.toString(),
            balance: 1000,
            currency: 'INR'
        });

        const res = await request(app)
            .post('/api/wallets/withdraw')
            .set('Authorization', authHeader)
            .send({ amount: 400 });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.wallet.balance).toBe(600); // 1000 - 400
    });

    it('should securely block withdrawing more funds than the wallet holds', async () => {
        await Wallet.create({
            id: new mongoose.Types.ObjectId().toString(),
            user_id: user1Id.toString(),
            balance: 100,
            currency: 'INR'
        });

        const res = await request(app)
            .post('/api/wallets/withdraw')
            .set('Authorization', authHeader)
            .send({ amount: 500 });

        expect(res.status).toBe(400); // Insufficient funds
        expect(res.body.success).toBe(false);
    });
});
