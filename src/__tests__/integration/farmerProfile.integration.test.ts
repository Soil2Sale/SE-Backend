import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import farmerProfileRoutes from '../../routes/farmerProfileRoutes';
import FarmerProfile from '../../models/FarmerProfile';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/farmer-profiles', farmerProfileRoutes);
app.use(errorHandler);

describe('Farmer Profile API (Integration)', () => {

    const farmerId = new mongoose.Types.ObjectId();
    const mockToken = generateAccessToken(farmerId, 'farmer1@test.com', 'Farmer');
    const authHeader = `Bearer ${mockToken}`;

    beforeEach(async () => {
        // Seed user
        await User.create({
            id: farmerId.toString(),
            name: 'Test Farmer',
            mobile_number: '8888888881',
            role: UserRole.FARMER,
            is_verified: true,
            is_telegram_linked: false,
            aadhaar_verified: true,
            business_verified: true
        });
    });

    it('should create a new farmer profile successfully', async () => {
        const payload = {
            user_id: farmerId.toString(),
            land_size: 25,
            location_latitude: 22.5,
            location_longitude: 78.0,
            manual_location_correction: false
        };

        const res = await request(app)
            .post('/api/farmer-profiles')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.land_size).toBe(25);
        expect(res.body.data.location_latitude).toBe(22.5);

        const profileInDb = await FarmerProfile.findOne({ user_id: farmerId.toString() });
        expect(profileInDb).not.toBeNull();
        expect(profileInDb!.land_size).toBe(25);
    });

    it('should prevent creating a second farmer profile for the same user', async () => {
        // Seed an existing profile
        await FarmerProfile.create({
            id: new mongoose.Types.ObjectId().toString(),
            user_id: farmerId.toString(),
            land_size: 10,
            location_latitude: 10.0,
            location_longitude: 10.0,
            manual_location_correction: true
        });

        const payload = {
            user_id: farmerId.toString(),
            land_size: 50,
            location_latitude: 22.0,
            location_longitude: 75.0,
            manual_location_correction: false
        };

        const res = await request(app)
            .post('/api/farmer-profiles')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Farmer profile already exists for this user');
    });

    it('should retrieve a farmer profile by its user ID', async () => {
        await FarmerProfile.create({
            id: new mongoose.Types.ObjectId().toString(),
            user_id: farmerId.toString(),
            land_size: 40,
            location_latitude: 28.6,
            location_longitude: 77.2,
            manual_location_correction: false
        });

        const res = await request(app)
            .get(`/api/farmer-profiles/user/${farmerId.toString()}`)
            .set('Authorization', authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.land_size).toBe(40);
        expect(res.body.data.user_id).toBe(farmerId.toString());
    });
});
