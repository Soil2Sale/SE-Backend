import { Request, Response } from 'express';
import * as shipmentController from '../../controllers/shipmentController';
import Shipment, { ShipmentStatus } from '../../models/Shipment';
import Order, { OrderStatus } from '../../models/Order';
import LogisticsProviderProfile from '../../models/LogisticsProviderProfile';
import Vehicle from '../../models/Vehicle';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/Shipment', () => {
    const actual = jest.requireActual('../../models/Shipment');
    return {
        ...actual,
        __esModule: true,
        default: {
            create: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            countDocuments: jest.fn()
        }
    };
});

jest.mock('../../models/Order', () => {
    const actual = jest.requireActual('../../models/Order');
    return {
        ...actual,
        __esModule: true,
        default: {
            findOne: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn()
        }
    };
});

jest.mock('../../models/LogisticsProviderProfile');
jest.mock('../../models/Vehicle');
jest.mock('../../utils/auditLogger');

describe('ShipmentController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createShipment', () => {
        it('should create a shipment successfully', async () => {
            const req = mockRequest({
                user: { userId: 'lp_user1' },
                body: {
                    order_id: 'order1',
                    vehicle_id: 'v1',
                    origin_latitude: 10,
                    origin_longitude: 20,
                    destination_latitude: 30,
                    destination_longitude: 40,
                    estimated_cost: 500
                }
            });
            const res = mockResponse();

            (LogisticsProviderProfile.findOne as jest.Mock).mockResolvedValue({ id: 'lpp1', user_id: 'lp_user1' });
            (Order.findOne as jest.Mock).mockResolvedValue({ id: 'order1' });
            const mockVehicle = { id: 'v1', logistics_provider_profile_id: 'lpp1', available: true, save: jest.fn() };
            (Vehicle.findOne as jest.Mock).mockResolvedValue(mockVehicle);
            (Shipment.create as jest.Mock).mockResolvedValue({ id: 'sh1' });

            await shipmentController.createShipment(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(Shipment.create).toHaveBeenCalled();
        });
    });

    describe('updateShipmentStatus', () => {
        it('should update status and complete order if delivered', async () => {
            const req = mockRequest({
                user: { userId: 'lp_user1' },
                params: { id: 'sh1' },
                body: { status: ShipmentStatus.DELIVERED }
            });
            const res = mockResponse();

            (LogisticsProviderProfile.findOne as jest.Mock).mockResolvedValue({ id: 'lpp1' });
            const mockShipment = { id: 'sh1', logistics_provider_profile_id: 'lpp1', order_id: 'o1', vehicle_id: 'v1', status: 'ANY', save: jest.fn() };
            (Shipment.findOne as jest.Mock).mockResolvedValue(mockShipment);
            const mockOrder = { id: 'o1', status: 'PENDING', save: jest.fn() };
            (Order.findOne as jest.Mock).mockResolvedValue(mockOrder);
            const mockVehicle = { id: 'v1', available: false, save: jest.fn() };
            (Vehicle.findOne as jest.Mock).mockResolvedValue(mockVehicle);

            await shipmentController.updateShipmentStatus(req as Request, res as Response, mockNext);

            expect(mockShipment.status).toBe(ShipmentStatus.DELIVERED);
            expect(mockOrder.status).toBe(OrderStatus.COMPLETED);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
