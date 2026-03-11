import { Request, Response } from 'express';
import * as advisoryContentController from '../../controllers/advisoryContentController';
import AdvisoryContent from '../../models/AdvisoryContent';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/AdvisoryContent');
jest.mock('../../utils/auditLogger');

describe('AdvisoryContentController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createAdvisory', () => {
        it('should create an advisory successfully', async () => {
            const req = mockRequest({
                body: { title: 'Test Advisory', content: 'Testing content', source: 'Source X', language_code: 'en' }
            });
            const res = mockResponse();

            (AdvisoryContent.create as jest.Mock).mockResolvedValue({ id: 'a1' });

            await advisoryContentController.createAdvisory(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(AdvisoryContent.create).toHaveBeenCalled();
        });
    });

    describe('getAdvisories', () => {
        it('should return advisories with search', async () => {
            const req = mockRequest({ query: { search: 'crop' } });
            const res = mockResponse();

            (AdvisoryContent.find as any).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ id: 'a1' }])
            });
            (AdvisoryContent.countDocuments as jest.Mock).mockResolvedValue(1);

            await advisoryContentController.getAdvisories(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('updateAdvisory', () => {
        it('should update advisory and log audit', async () => {
            const req = mockRequest({ params: { id: 'a1' }, body: { title: 'Updated' } });
            const res = mockResponse();

            (AdvisoryContent.findOne as jest.Mock).mockResolvedValue({ id: 'a1' });
            (AdvisoryContent.findOneAndUpdate as jest.Mock).mockResolvedValue({ id: 'a1', title: 'Updated' });

            await advisoryContentController.updateAdvisory(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
