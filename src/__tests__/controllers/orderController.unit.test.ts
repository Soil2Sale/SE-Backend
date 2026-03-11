import { Request, Response } from 'express';
import * as orderController from '../../controllers/orderController';
import Order, { OrderStatus } from '../../models/Order';
import CropListing from '../../models/CropListing';
import User, { UserRole } from '../../models/User';
import * as auditLogger from '../../utils/auditLogger';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/Order');
jest.mock('../../models/CropListing');
jest.mock('../../models/User');
jest.mock('../../utils/auditLogger');

describe('OrderController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createOrder', () => {
        it('should create an order successfully', async () => {
            const req = mockRequest({
                user: { userId: 'buyer1' },
                body: { crop_listing_id: 'listing1', final_price: 1500, quantity: 10 }
            });
            const res = mockResponse();

            (User.findOne as jest.Mock).mockResolvedValue({ id: 'buyer1', role: UserRole.BUYER });
            (CropListing.findOne as jest.Mock).mockResolvedValue({ id: 'listing1', status: 'ACTIVE', quantity: 100, farmer_user_id: 'farmer1', save: jest.fn() });
            (Order.create as jest.Mock).mockResolvedValue({ id: 'order1' });

            await orderController.createOrder(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(Order.create).toHaveBeenCalled();
        });

        it('should return 400 if quantity is insufficient', async () => {
            const req = mockRequest({
                user: { userId: 'buyer1' },
                body: { crop_listing_id: 'listing1', quantity: 200 }
            });
            const res = mockResponse();

            (User.findOne as jest.Mock).mockResolvedValue({ id: 'buyer1', role: UserRole.BUYER });
            (CropListing.findOne as jest.Mock).mockResolvedValue({ id: 'listing1', status: 'ACTIVE', quantity: 100 });

            await orderController.createOrder(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Insufficient quantity available' }));
        });
    });

    describe('getOrdersByBuyer', () => {
        it('should return orders for the buyer', async () => {
            const req = mockRequest({ user: { userId: 'buyer1' }, query: { page: '1', limit: '10' } });
            const res = mockResponse();

            (Order.find as any).mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ id: 'order1' }])
            });
            (Order.countDocuments as jest.Mock).mockResolvedValue(1);

            await orderController.getOrdersByBuyer(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('updateOrderStatus', () => {
        it('should allow authorized user to update status', async () => {
            const req = mockRequest({
                user: { userId: 'buyer1' },
                params: { id: 'order1' },
                body: { status: OrderStatus.COMPLETED }
            });
            const res = mockResponse();

            const mockOrder = {
                id: 'order1',
                buyer_user_id: 'buyer1',
                status: OrderStatus.CONFIRMED,
                save: jest.fn()
            };
            (Order.findOne as jest.Mock).mockResolvedValue(mockOrder);

            await orderController.updateOrderStatus(req as Request, res as Response, mockNext);

            expect(mockOrder.status).toBe(OrderStatus.COMPLETED);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 403 if user is not authorized', async () => {
            const req = mockRequest({ user: { userId: 'stranger' }, params: { id: 'order1' }, body: { status: 'ANY' } });
            const res = mockResponse();

            (Order.findOne as jest.Mock).mockResolvedValue({ buyer_user_id: 'buyer1', sender_user_id: 'farmer1' });

            await orderController.updateOrderStatus(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('cancelOrder', () => {
        it('should cancel order and restore listing quantity', async () => {
            const req = mockRequest({ user: { userId: 'buyer1' }, params: { id: 'order1' } });
            const res = mockResponse();

            const mockOrder = {
                id: 'order1',
                buyer_user_id: 'buyer1',
                status: OrderStatus.CREATED,
                quantity: 10,
                crop_listing_id: 'listing1',
                save: jest.fn()
            };
            const mockListing = { id: 'listing1', quantity: 90, save: jest.fn() };

            (Order.findOne as jest.Mock).mockResolvedValue(mockOrder);
            (CropListing.findOne as jest.Mock).mockResolvedValue(mockListing);

            await orderController.cancelOrder(req as Request, res as Response, mockNext);

            expect(mockOrder.status).toBe(OrderStatus.CANCELLED);
            expect(mockListing.quantity).toBe(100);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
