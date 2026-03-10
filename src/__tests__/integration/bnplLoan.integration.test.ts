import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import bnplLoanRoutes from '../../routes/bnplLoanRoutes';
import BNPLLoan from '../../models/BNPLLoan';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/bnpl-loans', bnplLoanRoutes);
app.use(errorHandler);

describe('BNPL Loan API (Integration)', () => {

    const farmerId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    const mockFarmerToken = generateAccessToken(farmerId, 'farmerBNPL@test.com', 'Farmer');
    const farmerHeader = `Bearer ${mockFarmerToken}`;

    const mockAdminToken = generateAccessToken(adminId, 'adminBNPL@test.com', 'Admin');
    const adminHeader = `Bearer ${mockAdminToken}`;

    beforeEach(async () => {
        await User.create([
            { id: farmerId.toString(), name: 'B Farmer', mobile_number: '9222222221', role: UserRole.FARMER, is_verified: true, is_telegram_linked: false, aadhaar_verified: true, business_verified: true },
            { id: adminId.toString(), name: 'B Admin', mobile_number: '9222222222', role: UserRole.ADMIN, is_verified: true, is_telegram_linked: false, aadhaar_verified: true, business_verified: true }
        ]);
    });

    it('should securely allow an admin to issue a loan to a farmer', async () => {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);

        const payload = {
            farmer_user_id: farmerId.toString(),
            amount: 50000,
            repayment_status: 'ACTIVE',
            due_date: dueDate.toISOString()
        };

        const res = await request(app)
            .post('/api/bnpl-loans')
            .set('Authorization', adminHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.amount).toBe(50000);
        expect(res.body.data.farmer_user_id).toBe(farmerId.toString());

        const inDb = await BNPLLoan.findOne({ farmer_user_id: farmerId.toString() });
        expect(inDb).not.toBeNull();
    });

    it('should securely request a BNPL loan for themselves', async () => {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);

        const payload = {
            farmer_user_id: farmerId.toString(),
            amount: 100000,
            repayment_status: 'ACTIVE',
            due_date: dueDate.toISOString()
        };

        const res = await request(app)
            .post('/api/bnpl-loans')
            .set('Authorization', farmerHeader)
            .send(payload);

        expect(res.status).toBe(201);
    });

    it('should correctly allow a farmer to see their own loans', async () => {
        await BNPLLoan.create({
            id: new mongoose.Types.ObjectId().toString(),
            farmer_user_id: farmerId.toString(),
            amount: 12000,
            repayment_status: 'ACTIVE',
            due_date: new Date()
        });

        const res = await request(app)
            .get('/api/bnpl-loans')
            .set('Authorization', farmerHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].amount).toBe(12000);
    });
});
