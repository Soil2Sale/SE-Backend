import { Request, Response } from 'express';
import * as logisticsProviderController from '../../controllers/logisticsProviderController';
import LogisticsProviderProfile from '../../models/LogisticsProviderProfile';
import Vehicle from '../../models/Vehicle';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/LogisticsProviderProfile');
jest.mock('../../models/Vehicle');

describe('LogisticsProviderController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createLogisticsProfile', () => {
        it('should create a logistics profile successfully', async () => {
            const req = mockRequest({
                user: { userId: 'u1' },
                body: { company_name: 'Logistics Co' }
            });
            const res = mockResponse();

            (LogisticsProviderProfile.findOne as jest.Mock).mockResolvedValue(null);
            (LogisticsProviderProfile.create as jest.Mock).mockResolvedValue({ id: 'lpp1', company_name: 'Logistics Co' });

            await logisticsProviderController.createLogisticsProfile(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(LogisticsProviderProfile.create).toHaveBeenCalled();
        });

        it('should return 400 if profile already exists', async () => {
            const req = mockRequest({ user: { userId: 'u1' }, body: { company_name: 'Logistics Co' } });
            const res = mockResponse();

            (LogisticsProviderProfile.findOne as jest.Mock).mockResolvedValue({ id: 'lpp1' });

            await logisticsProviderController.createLogisticsProfile(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getAvailableLogisticsProviders', () => {
        it('should return providers with available vehicles', async () => {
            const req = mockRequest({ query: { page: '1' } });
            const res = mockResponse();

            (Vehicle.distinct as jest.Mock).mockResolvedValue(['lpp1']);
            const mockProfile = { id: 'lpp1', toObject: () => ({ id: 'lpp1' }) };
            (LogisticsProviderProfile.find as any).mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([mockProfile])
            });
            (LogisticsProviderProfile.countDocuments as jest.Mock).mockResolvedValue(1);
            (Vehicle.find as jest.Mock).mockResolvedValue([{ id: 'v1', logistics_provider_profile_id: 'lpp1', available: true }]);

            await logisticsProviderController.getAvailableLogisticsProviders(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
        });
    });
});
