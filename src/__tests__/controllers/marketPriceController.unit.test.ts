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
                    market_type: MarketType.MANDI,
                    state: 'State Y'
                }]
            });
            const res = mockResponse();

            (MarketPrice.create as jest.Mock).mockResolvedValue([{ id: 'p1' }]);

            await marketPriceController.createMarketPrice(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(MarketPrice.create).toHaveBeenCalled();
        });

        it('should return 400 for missing fields', async () => {
            const req = mockRequest({ body: { crop_name: 'Wheat' } });
            const res = mockResponse();

            await marketPriceController.createMarketPrice(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getMarketPrices', () => {
        it('should return filtered market prices', async () => {
            const req = mockRequest({ query: { crop_name: 'Wheat', page: '1', limit: '10' } });
            const res = mockResponse();

            (MarketPrice.find as any).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ id: 'p1' }])
            });
            (MarketPrice.countDocuments as jest.Mock).mockResolvedValue(1);

            await marketPriceController.getMarketPrices(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

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

    describe('getPriceTrends', () => {
        it('should return price trends', async () => {
            const req = mockRequest({ query: { crop_name: 'Wheat' } });
            const res = mockResponse();

            (MarketPrice.aggregate as jest.Mock).mockResolvedValue([{ _id: '2023-01-01', avgPrice: 200 }]);

            await marketPriceController.getPriceTrends(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 if crop_name is missing', async () => {
            const req = mockRequest({ query: {} });
            const res = mockResponse();

            await marketPriceController.getPriceTrends(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateMarketPrice', () => {
        it('should update market price successfully', async () => {
            const req = mockRequest({ params: { id: 'p1' }, body: { price: 250 } });
            const res = mockResponse();

            (MarketPrice.findOne as jest.Mock).mockResolvedValue({ id: 'p1' });
            (MarketPrice.findOneAndUpdate as jest.Mock).mockResolvedValue({ id: 'p1', price: 250 });

            await marketPriceController.updateMarketPrice(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 404 if price not found', async () => {
            const req = mockRequest({ params: { id: 'invalid' }, body: { price: 250 } });
            const res = mockResponse();

            (MarketPrice.findOne as jest.Mock).mockResolvedValue(null);

            await marketPriceController.updateMarketPrice(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
