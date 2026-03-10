import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import transactionRoutes from '../../routes/transactionRoutes';
import Transaction, { TransactionType, TransactionStatus, ReferenceType } from '../../models/Transaction';
import Wallet from '../../models/Wallet';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/transactions', transactionRoutes);
app.use(errorHandler);

describe('Transaction API (Integration)', () => {

    const buyerId = new mongoose.Types.ObjectId();
    const farmerId = new mongoose.Types.ObjectId();

    const mockBuyerToken = generateAccessToken(buyerId, 'buyerT@test.com', 'Buyer');
    const authHeader = `Bearer ${mockBuyerToken}`;

    const buyerWalletId = new mongoose.Types.ObjectId().toString();
    const farmerWalletId = new mongoose.Types.ObjectId().toString();

    beforeEach(async () => {
        // Seed users
        await User.create([
            { id: buyerId.toString(), name: 'T Buyer', mobile_number: '9555555551', role: UserRole.BUYER, is_verified: true, is_telegram_linked: false, aadhaar_verified: true, business_verified: true },
            { id: farmerId.toString(), name: 'T Farmer', mobile_number: '9555555552', role: UserRole.FARMER, is_verified: true, is_telegram_linked: false, aadhaar_verified: true, business_verified: true }
        ]);

        // Seed wallet definitions
        await Wallet.create([
            { id: buyerWalletId, user_id: buyerId.toString(), balance: 5000, currency: 'INR' },
            { id: farmerWalletId, user_id: farmerId.toString(), balance: 200, currency: 'INR' }
        ]);
    });

    it('should create a successful transaction correctly routing money between wallets', async () => {
        const payload = {
            sender_wallet_id: buyerWalletId,
            receiver_wallet_id: farmerWalletId,
            sender_user_id: buyerId.toString(),
            receiver_user_id: farmerId.toString(),
            amount: 1500,
            type: TransactionType.CROP_SALE,
            reference_type: ReferenceType.ORDER,
            reference_id: 'ORDER-12345',
            payment_method: 'WALLET'
        };

        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(TransactionStatus.SUCCESS);
        expect(res.body.data.amount).toBe(1500);

        // Verify that wallet balances strictly mutated
        const finalBuyerWallet = await Wallet.findOne({ id: buyerWalletId });
        const finalFarmerWallet = await Wallet.findOne({ id: farmerWalletId });

        expect(finalBuyerWallet!.balance).toBe(3500); // 5000 - 1500
        expect(finalFarmerWallet!.balance).toBe(1700); // 200 + 1500
    });

    it('should correctly safely fail a transaction if sender has insufficient funds', async () => {
        const payload = {
            sender_wallet_id: buyerWalletId,
            receiver_wallet_id: farmerWalletId,
            sender_user_id: buyerId.toString(),
            receiver_user_id: farmerId.toString(),
            amount: 9000, // Try to drain 9000, but they only have 5000
            type: TransactionType.CROP_SALE,
            reference_type: ReferenceType.ORDER,
            reference_id: 'ORDER-999',
            payment_method: 'WALLET'
        };

        const res = await request(app)
            .post('/api/transactions')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);

        // Assert Wallets remained entirely untouched during a failure
        const finalBuyerWallet = await Wallet.findOne({ id: buyerWalletId });
        expect(finalBuyerWallet!.balance).toBe(5000); // Intact
    });

    it('should fetch transactions performed securely by the caller token', async () => {
        // Seed physical transaction
        await Transaction.create({
            id: new mongoose.Types.ObjectId().toString(),
            sender_wallet_id: buyerWalletId,
            receiver_wallet_id: farmerWalletId,
            sender_user_id: buyerId.toString(),
            receiver_user_id: farmerId.toString(),
            amount: 50,
            type: TransactionType.CROP_SALE,
            status: TransactionStatus.SUCCESS,
            reference_type: ReferenceType.ORDER,
            reference_id: 'ORD-987',
            payment_method: 'WALLET',
            initiated_at: new Date()
        });

        const res = await request(app)
            .get('/api/transactions') // defaults to current User
            .set('Authorization', authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(1);
    });
});
