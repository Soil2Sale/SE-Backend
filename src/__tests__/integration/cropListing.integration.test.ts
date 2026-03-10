import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import cropListingRoutes from '../../routes/cropListingRoutes';
import CropListing, { QualityGrade, CropListingStatus } from '../../models/CropListing';
import { errorHandler } from '../../middlewares/errorHandler';
import FarmerProfile from '../../models/FarmerProfile';
import User, { UserRole } from '../../models/User';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/crop-listings', cropListingRoutes);
app.use(errorHandler);

describe('CropListing API (Integration)', () => {

    const farmerId = new mongoose.Types.ObjectId();
    const mockToken = generateAccessToken(farmerId, 'farmer@test.com', 'Farmer');
    const authHeader = `Bearer ${mockToken}`;

    const profileId = new mongoose.Types.ObjectId().toString();

    beforeEach(async () => {
        // Seed user
        await User.create({
            id: farmerId.toString(),
            name: 'Crop Tester',
            mobile_number: '9999999993',
            role: UserRole.FARMER,
            is_verified: true,
            is_telegram_linked: true,
            aadhaar_verified: true,
            business_verified: true
        });

        // Seed farmer profile
        await FarmerProfile.create({
            id: profileId,
            user_id: farmerId.toString(),
            land_size: 10,
            location_latitude: 15.0,
            location_longitude: 70.0,
            manual_location_correction: false
        });
    });

    it('should create a new crop listing successfully', async () => {
        const payload = {
            farmer_profile_id: profileId,
            crop_name: 'Premium Wheat',
            quality_grade: QualityGrade.PREMIUM,
            quantity: 500,
            expected_price: 2500,
        };

        const res = await request(app)
            .post('/api/crop-listings')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.crop_name).toBe('Premium Wheat');
        expect(res.body.data.status).toBe(CropListingStatus.ACTIVE);
        expect(res.body.data.farmer_user_id).toBe(farmerId.toString());

        // Verify physically exists in in-memory mongo
        const listingInDb = await CropListing.findOne({ crop_name: 'Premium Wheat' });
        expect(listingInDb).not.toBeNull();
        expect(listingInDb!.quantity).toBe(500);
    });

    it('should fetch all crop listings for a user', async () => {
        // Build another one to ensure it's picked up
        await CropListing.create({
            farmer_profile_id: profileId,
            farmer_user_id: farmerId.toString(),
            crop_name: 'Standard Corn',
            quality_grade: QualityGrade.STANDARD,
            quantity: 100,
            expected_price: 1000,
            status: CropListingStatus.ACTIVE
        });

        const res = await request(app)
            .get('/api/crop-listings')
            .set('Authorization', authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);

        // Ensure standard corn we just created is returned
        const cornListing = res.body.data.find((c: any) => c.crop_name === 'Standard Corn');
        expect(cornListing).toBeDefined();
        expect(cornListing.status).toBe(CropListingStatus.ACTIVE);
    });
});
