import { Request, Response } from 'express';
import * as cropListingController from '../../controllers/cropListingController';
import CropListing, { CropListingStatus } from '../../models/CropListing';
import FarmerProfile from '../../models/FarmerProfile';
import * as auditLogger from '../../utils/auditLogger';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/CropListing');
jest.mock('../../models/FarmerProfile');
jest.mock('../../utils/auditLogger');

describe('CropListingController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllCropListings', () => {
        it('should return all crop listings with filters', async () => {
            const req = mockRequest({
                query: {
                    status: 'ACTIVE',
                    min_price: '10',
                    max_price: '100',
                    search: 'Wheat'
                }
            });
            const res = mockResponse();

            const mockListings = [{ id: 'l1', farmer_profile_id: 'fp1', crop_name: 'Wheat' }];
            (CropListing.find as any).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue(mockListings)
            });
            (CropListing.countDocuments as jest.Mock).mockResolvedValue(1);
            (FarmerProfile.find as any).mockReturnValue({
                lean: jest.fn().mockResolvedValue([{ id: 'fp1', name: 'Farmer One' }])
            });

            await cropListingController.getAllCropListings(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, total: 1 }));
        });
    });

    describe('getCropListingById', () => {
        it('should return a crop listing by ID', async () => {
            const req = mockRequest({ params: { id: 'l1' } });
            const res = mockResponse();

            (CropListing.findOne as any).mockReturnValue({
                lean: jest.fn().mockResolvedValue({ id: 'l1', farmer_profile_id: 'fp1' })
            });
            (FarmerProfile.findOne as any).mockReturnValue({
                lean: jest.fn().mockResolvedValue({ id: 'fp1', name: 'Farmer One' })
            });

            await cropListingController.getCropListingById(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ id: 'l1' }) }));
        });

        it('should return 404 if listing not found', async () => {
            const req = mockRequest({ params: { id: 'invalid' } });
            const res = mockResponse();

            (CropListing.findOne as any).mockReturnValue({
                lean: jest.fn().mockResolvedValue(null)
            });

            await cropListingController.getCropListingById(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('createCropListing', () => {
        it('should create a new crop listing', async () => {
            const req = mockRequest({
                body: { farmer_profile_id: 'fp1', crop_name: 'Rice', quantity: 50, expected_price: 30 }
            });
            const res = mockResponse();

            (FarmerProfile.findOne as jest.Mock).mockResolvedValue({ id: 'fp1', user_id: 'u1' });
            (CropListing.create as jest.Mock).mockResolvedValue({ id: 'l2', ...req.body });

            await cropListingController.createCropListing(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(auditLogger.createAuditLog).toHaveBeenCalled();
        });
    });

    describe('updateCropListingStatus', () => {
        it('should update listing status', async () => {
            const req = mockRequest({
                user: { userId: 'u1' },
                params: { id: 'l1' },
                body: { status: CropListingStatus.SOLD }
            });
            const res = mockResponse();

            (CropListing.findOneAndUpdate as jest.Mock).mockResolvedValue({ id: 'l1', status: CropListingStatus.SOLD });

            await cropListingController.updateCropListingStatus(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(auditLogger.createAuditLog).toHaveBeenCalled();
        });
    });
});
