/**
 * Crop Listing Routes — Integration Tests
 *
 * Postman source: SE.postman_collection.json → "Crop Listing" folder
 * Routes tested:
 *   POST   /api/crop-listings/
 *   GET    /api/crop-listings/
 *   GET    /api/crop-listings/:id
 *   PATCH  /api/crop-listings/:id/status
 *   DELETE /api/crop-listings/:id
 */

import request from 'supertest';
import app from '../app';

// ── Bypass auth middleware ────────────────────────────────────────────────────
jest.mock('../middlewares/auth', () => ({
    authenticate: (req: any, _res: any, next: any) => {
        req.user = { userId: 'farmer-user-uuid', role: 'Farmer' };
        next();
    },
}));

// ── Mock CropListing model ────────────────────────────────────────────────────
const mockListing = {
    id: 'listing-uuid-001',
    farmer_profile_id: 'farmer-profile-uuid',
    farmer_user_id: 'farmer-user-uuid',
    crop_name: 'Maize',
    quality_grade: 'PREMIUM',
    quantity: 1500,
    expected_price: 22000,
    status: 'ACTIVE',
};

jest.mock('../models/CropListing', () => {
    const CropListingStatus = { ACTIVE: 'ACTIVE', SOLD: 'SOLD', INACTIVE: 'INACTIVE' };
    const QualityGrade = { PREMIUM: 'PREMIUM', STANDARD: 'STANDARD', LOW: 'LOW' };
    return {
        __esModule: true,
        CropListingStatus,
        QualityGrade,
        default: {
            find: jest.fn().mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    skip: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                            lean: jest.fn().mockResolvedValue([]),
                        }),
                    }),
                }),
            }),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findOneAndDelete: jest.fn(),
            create: jest.fn(),
            countDocuments: jest.fn().mockResolvedValue(0),
        },
    };
});

// ── Mock FarmerProfile ────────────────────────────────────────────────────────
jest.mock('../models/FarmerProfile', () => ({
    __esModule: true,
    default: {
        findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'farmer-profile-uuid', user_id: 'farmer-user-uuid' }) }),
        find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    },
}));

import CropListing from '../models/CropListing';
import FarmerProfile from '../models/FarmerProfile';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/crop-listings/', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should create a crop listing and return 201', async () => {
        (FarmerProfile.findOne as jest.Mock).mockReturnValue({
            lean: jest.fn().mockResolvedValue({ id: 'farmer-profile-uuid', user_id: 'farmer-user-uuid' }),
        });
        (CropListing.create as jest.Mock).mockResolvedValue(mockListing);

        const res = await request(app)
            .post('/api/crop-listings/')
            .send({ farmer_profile_id: 'farmer-profile-uuid', crop_name: 'Maize', quality_grade: 'PREMIUM', quantity: 1500, expected_price: 22000 });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });

    it('should return 404 when farmer profile does not exist', async () => {
        (FarmerProfile.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

        const res = await request(app)
            .post('/api/crop-listings/')
            .send({ farmer_profile_id: 'nonexistent', crop_name: 'Wheat', quantity: 500, expected_price: 10000 });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });
});

describe('GET /api/crop-listings/', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return 200 with a list of crop listings', async () => {
        (CropListing.countDocuments as jest.Mock).mockResolvedValue(1);
        (CropListing.find as jest.Mock).mockReturnValue({
            sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([mockListing]) }),
                }),
            }),
        });
        (FarmerProfile.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

        const res = await request(app).get('/api/crop-listings/');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe('GET /api/crop-listings/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should return 200 with the requested listing', async () => {
        (CropListing.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(mockListing) });
        (FarmerProfile.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'farmer-profile-uuid' }) });

        const res = await request(app).get('/api/crop-listings/listing-uuid-001');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should return 404 when listing is not found', async () => {
        (CropListing.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

        const res = await request(app).get('/api/crop-listings/nonexistent');

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
});

describe('PATCH /api/crop-listings/:id/status', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should update listing status and return 200', async () => {
        (CropListing.findOneAndUpdate as jest.Mock).mockResolvedValue({ ...mockListing, status: 'SOLD' });

        const res = await request(app)
            .patch('/api/crop-listings/listing-uuid-001/status')
            .send({ status: 'SOLD' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should return 400 for invalid status value', async () => {
        const res = await request(app)
            .patch('/api/crop-listings/listing-uuid-001/status')
            .send({ status: 'INVALID_STATUS' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('DELETE /api/crop-listings/:id', () => {
    beforeEach(() => jest.clearAllMocks());

    it('should delete a listing and return 200', async () => {
        (CropListing.findOneAndDelete as jest.Mock).mockResolvedValue(mockListing);

        const res = await request(app).delete('/api/crop-listings/listing-uuid-001');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should return 404 when listing to delete does not exist', async () => {
        (CropListing.findOneAndDelete as jest.Mock).mockResolvedValue(null);

        const res = await request(app).delete('/api/crop-listings/nonexistent');

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
});
