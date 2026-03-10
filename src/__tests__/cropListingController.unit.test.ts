/**
 * CropListing Controller — Pure Unit Tests
 */

import { Request, Response, NextFunction } from 'express';

jest.mock('../models/CropListing');
jest.mock('../models/FarmerProfile');
jest.mock('../utils/auditLogger', () => ({ createAuditLog: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../config/telegram', () => ({}));
jest.mock('../config/database', () => ({ connectDB: jest.fn() }));

import {
    createCropListing,
    getCropListingById,
    updateCropListingStatus,
    deleteCropListing,
} from '../controllers/cropListingController';
import CropListing from '../models/CropListing';
import FarmerProfile from '../models/FarmerProfile';

const mockReq = (body = {}, params = {}, query = {}, user = {}): Partial<Request> =>
    ({ body, params: params as any, query: query as any, user: user as any });
const mockRes = (): Partial<Response> => {
    const r: any = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
};
const mockNext: NextFunction = jest.fn();

const mockListing = {
    id: 'listing-uuid-001',
    farmer_profile_id: 'fp-uuid-001',
    farmer_user_id: 'user-uuid-001',
    crop_name: 'Maize',
    quality_grade: 'PREMIUM',
    quantity: 1500,
    expected_price: 22000,
    status: 'ACTIVE',
};

// ── createCropListing ─────────────────────────────────────────────────────────
describe('cropListingController.createCropListing (unit)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('creates a listing and returns 201 when farmer profile exists', async () => {
        (FarmerProfile.findOne as jest.Mock).mockResolvedValue({ id: 'fp-uuid-001', user_id: 'user-uuid-001' });
        (CropListing.create as jest.Mock).mockResolvedValue(mockListing);

        const req = mockReq({ farmer_profile_id: 'fp-uuid-001', crop_name: 'Maize', quantity: 1500, expected_price: 22000 });
        const res = mockRes();
        await createCropListing(req as Request, res as Response, mockNext);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 404 when farmer profile is not found', async () => {
        (FarmerProfile.findOne as jest.Mock).mockResolvedValue(null);
        const req = mockReq({ farmer_profile_id: 'nonexistent' });
        const res = mockRes();
        await createCropListing(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('calls next(error) on unexpected error', async () => {
        (FarmerProfile.findOne as jest.Mock).mockRejectedValue(new Error('DB crash'));
        const req = mockReq({ farmer_profile_id: 'fp-uuid-001' });
        const res = mockRes();
        await createCropListing(req as Request, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ── getCropListingById ────────────────────────────────────────────────────────
describe('cropListingController.getCropListingById (unit)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 200 with listing data when found', async () => {
        (CropListing.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(mockListing) });
        (FarmerProfile.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'fp-uuid-001' }) });

        const req = mockReq({}, { id: 'listing-uuid-001' });
        const res = mockRes();
        await getCropListingById(req as Request, res as Response, mockNext);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns 404 when listing is not found', async () => {
        (CropListing.findOne as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
        const req = mockReq({}, { id: 'bad-id' });
        const res = mockRes();
        await getCropListingById(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

// ── updateCropListingStatus ───────────────────────────────────────────────────
describe('cropListingController.updateCropListingStatus (unit)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 200 with updated listing when status is valid', async () => {
        (CropListing.findOneAndUpdate as jest.Mock).mockResolvedValue({ ...mockListing, status: 'SOLD' });
        const req = mockReq({ status: 'SOLD' }, { id: 'listing-uuid-001' }, {}, { userId: 'user-uuid-001' });
        const res = mockRes();
        await updateCropListingStatus(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 400 when status is invalid', async () => {
        const req = mockReq({ status: 'INVALID_STATUS' }, { id: 'listing-uuid-001' });
        const res = mockRes();
        await updateCropListingStatus(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when listing does not exist', async () => {
        (CropListing.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
        const req = mockReq({ status: 'ACTIVE' }, { id: 'nonexistent' });
        const res = mockRes();
        await updateCropListingStatus(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

// ── deleteCropListing ─────────────────────────────────────────────────────────
describe('cropListingController.deleteCropListing (unit)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 200 on successful deletion', async () => {
        (CropListing.findOneAndDelete as jest.Mock).mockResolvedValue(mockListing);
        const req = mockReq({}, { id: 'listing-uuid-001' });
        const res = mockRes();
        await deleteCropListing(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when listing to delete is not found', async () => {
        (CropListing.findOneAndDelete as jest.Mock).mockResolvedValue(null);
        const req = mockReq({}, { id: 'bad-id' });
        const res = mockRes();
        await deleteCropListing(req as Request, res as Response, mockNext);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('calls next(error) on DB failure', async () => {
        (CropListing.findOneAndDelete as jest.Mock).mockRejectedValue(new Error('DB error'));
        const req = mockReq({}, { id: 'listing-uuid-001' });
        const res = mockRes();
        await deleteCropListing(req as Request, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
});
