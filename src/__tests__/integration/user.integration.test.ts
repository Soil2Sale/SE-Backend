import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import userRoutes from '../../routes/userRoutes';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
// Import the actual utility so we get a valid JWT structure
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use(errorHandler);

describe('User API (Integration)', () => {

    const adminId = new mongoose.Types.ObjectId();
    const mockAdminToken = generateAccessToken(adminId, 'admin@test.com', 'Admin');
    const adminHeader = `Bearer ${mockAdminToken}`;

    const buyerId = new mongoose.Types.ObjectId();
    const mockBuyerToken = generateAccessToken(buyerId, 'buyer@test.com', 'Buyer');
    const buyerHeader = `Bearer ${mockBuyerToken}`;

    beforeEach(async () => {
        // Seed users into the in-memory database
        await User.create([
            {
                id: adminId.toString(),
                name: 'Test Admin',
                mobile_number: '9999999991',
                role: UserRole.ADMIN,
                is_verified: true,
                is_telegram_linked: true,
                aadhaar_verified: true,
                business_verified: true
            },
            {
                id: buyerId.toString(),
                name: 'Test Buyer',
                mobile_number: '9999999992',
                role: UserRole.BUYER,
                is_verified: true,
                is_telegram_linked: false,
                aadhaar_verified: false,
                business_verified: false
            }
        ]);
    });

    it('should successfully get the current user profile based on JWT', async () => {
        const res = await request(app)
            .get('/api/users/profile')
            .set('Authorization', buyerHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Test Buyer');
        expect(res.body.data.role).toBe(UserRole.BUYER);
    });

    it('should retrieve any user by ID if authenticated', async () => {
        const res = await request(app)
            .get(`/api/users/${buyerId.toString()}`)
            .set('Authorization', adminHeader); // Admin requesting buyer profile

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(buyerId.toString());
    });

});
