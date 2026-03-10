import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import logisticsProviderRoutes from '../../routes/logisticsProviderRoutes';
import LogisticsProviderProfile from '../../models/LogisticsProviderProfile';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/logistics-providers', logisticsProviderRoutes);
app.use(errorHandler);

describe('Logistics Provider API (Integration)', () => {

    const logisticsId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const mockLogisticsToken = generateAccessToken(logisticsId, 'logisticUser@test.com', 'Logistics Provider');
    const logisticsHeader = `Bearer ${mockLogisticsToken}`;

    const mockAdminToken = generateAccessToken(adminId, 'adminLogs@test.com', 'Admin');
    const adminHeader = `Bearer ${mockAdminToken}`;

    beforeEach(async () => {
        await User.create([
            { id: logisticsId.toString(), name: 'Trucker Dave', mobile_number: '9777777771', role: UserRole.LOGISTICS_PROVIDER, is_verified: true, is_telegram_linked: false, aadhaar_verified: true, business_verified: true },
            { id: adminId.toString(), name: 'Trucker Admin', mobile_number: '9777777772', role: UserRole.ADMIN, is_verified: true, is_telegram_linked: false, aadhaar_verified: true, business_verified: true }
        ]);
    });

    it('should automatically create a logistics provider profile properly', async () => {
        const payload = {
            company_name: 'Speedy Trucks'
        };

        const res = await request(app)
            .post('/api/logistics-providers')
            .set('Authorization', logisticsHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.company_name).toBe('Speedy Trucks');

        const dbProfile = await LogisticsProviderProfile.findOne({ user_id: logisticsId.toString() });
        expect(dbProfile).not.toBeNull();
    });

    it('should securely fetch my logistics profile', async () => {
        await LogisticsProviderProfile.create({
            id: new mongoose.Types.ObjectId().toString(),
            user_id: logisticsId.toString(),
            company_name: 'Speedy Trucks',
            verified: false
        });

        const res = await request(app)
            .get('/api/logistics-providers/me')
            .set('Authorization', logisticsHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.company_name).toBe('Speedy Trucks');
    });

    it('should correctly allow an admin to verify a logistics provider', async () => {
        const profileId = new mongoose.Types.ObjectId().toString();
        await LogisticsProviderProfile.create({
            id: profileId,
            user_id: logisticsId.toString(),
            company_name: 'Speedy Trucks',
            verified: false
        });

        const res = await request(app)
            .patch(`/api/logistics-providers/${profileId}/verify`)
            .set('Authorization', adminHeader)
            .send({ verified: true });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const checkDb = await LogisticsProviderProfile.findOne({ id: profileId });
        expect(checkDb!.verified).toBe(true);
    });
});
