import { Request, Response } from 'express';
import * as aiInsightController from '../../controllers/aiInsightController';
import AIInsight, { InsightType } from '../../models/AIInsight';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/AIInsight', () => {
    const actual = jest.requireActual('../../models/AIInsight');
    return {
        ...actual,
        __esModule: true,
        default: {
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findOneAndDelete: jest.fn(),
            countDocuments: jest.fn()
        }
    };
});

describe('AIInsightController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (mockNext as jest.Mock).mockClear();
    });

    describe('createInsight', () => {
        it('should create insights successfully', async () => {
            const req = mockRequest({
                user: { userId: 'u1', role: 'User' },
                body: {
                    insight_type: InsightType.PRICE_PREDICTION,
                    content: 'Price will go up',
                    language_code: 'en',
                    crop_name: 'Wheat',
                    region: 'North',
                    confidence_score: 0.8,
                    validity_window_start: '2023-01-01',
                    validity_window_end: '2023-01-31'
                }
            });
            const res = mockResponse();

            (AIInsight.create as jest.Mock).mockResolvedValue([{ id: 'i1' }]);

            await aiInsightController.createInsight(req as Request, res as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(AIInsight.create).toHaveBeenCalled();
        });
    });
});
