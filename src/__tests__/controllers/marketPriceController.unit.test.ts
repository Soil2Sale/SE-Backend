import { Request, Response } from 'express';
import * as marketPriceController from '../../controllers/marketPriceController';
import MarketPrice, { PriceType, MarketType } from '../../models/MarketPrice';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/MarketPrice', () => {
    const actual = jest.requireActual('../../models/MarketPrice');
    return {
        ...actual,
        __esModule: true,
        default: {
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findOneAndDelete: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn()
        },
        PriceType: actual.PriceType,
        MarketType: actual.MarketType
    };
});

describe('MarketPriceController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createMarketPrice', () => {
        it('should create market prices from an array', async () => {
            const req = mockRequest({
                body: [{
                    crop_name: 'Wheat',
                    market_location: 'City X',
                    price: 200,
                    recorded_date: '2023-01-01',
                    price_type: PriceType.WHOLESALE,
                    market_type: MarketType.CROP,
                    state: 'State Y'
                }]
            });
            const res = mockResponse();

            (MarketPrice.create as jest.Mock).mockResolvedValue([{ id: 'p1' }]);

            await marketPriceController.createMarketPrice(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(MarketPrice.create).toHaveBeenCalled();
        });
    });

    // ... other tests ...
    describe('getLatestPrices', () => {
        it('should return latest prices using aggregate', async () => {
            const req = mockRequest({ query: { crop_name: 'Wheat' } });
            const res = mockResponse();

            const mockLatest = [{ id: 'p1', crop_name: 'Wheat', price: 200 }];
            (MarketPrice.aggregate as jest.Mock).mockResolvedValue(mockLatest);

            await marketPriceController.getLatestPrices(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockLatest }));
        });
    });
});
