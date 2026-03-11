import { Request, Response } from 'express';
import * as shipmentRequestController from '../../controllers/shipmentRequestController';
import ShipmentRequest, { ShipmentRequestStatus, NegotiationRole, NegotiationAction } from '../../models/ShipmentRequest';
import Shipment from '../../models/Shipment';
import Order from '../../models/Order';
import LogisticsProviderProfile from '../../models/LogisticsProviderProfile';
import Vehicle from '../../models/Vehicle';
import * as auditLogger from '../../utils/auditLogger';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/ShipmentRequest');
jest.mock('../../models/Shipment');
jest.mock('../../models/Order');
jest.mock('../../models/LogisticsProviderProfile');
jest.mock('../../models/Vehicle');
jest.mock('../../utils/auditLogger');

describe('ShipmentRequestController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createShipmentRequest', () => {
        it('should create a request successfully', async () => {
            const req = mockRequest({
                user: { userId: 'farmer1' },
                body: {
                    order_id: 'order1',
                    logistics_provider_profile_id: 'lp1',
                    origin_latitude: 10,
                    origin_longitude: 20,
                    destination_latitude: 30,
                    destination_longitude: 40,
                    proposed_cost: 500,
                    proposed_duration_days: 2
                }
            });
            const res = mockResponse();

            (Order.findOne as jest.Mock).mockResolvedValue({ id: 'order1', sender_user_id: 'farmer1', buyer_user_id: 'buyer1' });
            (LogisticsProviderProfile.findOne as jest.Mock).mockResolvedValue({ id: 'lp1', user_id: 'lp_user1' });
            (ShipmentRequest.findOne as jest.Mock).mockResolvedValue(null);
            (ShipmentRequest.create as jest.Mock).mockResolvedValue({ id: 'sr1' });

            await shipmentRequestController.createShipmentRequest(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(auditLogger.createAuditLog).toHaveBeenCalled();
        });

        it('should return 400 if fields are missing', async () => {
            const req = mockRequest({ user: { userId: 'f1' }, body: { order_id: 'o1' } });
            const res = mockResponse();

            await shipmentRequestController.createShipmentRequest(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getShipmentRequests', () => {
        it('should return list of requests for involved user', async () => {
            const req = mockRequest({ user: { userId: 'user1' }, query: { page: '1', limit: '10' } });
            const res = mockResponse();

            (ShipmentRequest.find as any).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ id: 'sr1' }])
            });
            (ShipmentRequest.countDocuments as jest.Mock).mockResolvedValue(1);

            await shipmentRequestController.getShipmentRequests(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1 }));
        });
    });

    describe('respondToShipmentRequest', () => {
        it('should allow logistics provider to accept a request', async () => {
            const req = mockRequest({
                user: { userId: 'lp_user1' },
                params: { id: 'sr1' },
                body: { action: 'accept', vehicle_id: 'v1' }
            });
            const res = mockResponse();

            const mockSR = {
                id: 'sr1',
                logistics_provider_user_id: 'lp_user1',
                logistics_provider_profile_id: 'lpp1',
                status: ShipmentRequestStatus.PENDING,
                negotiations: [],
                save: jest.fn()
            };
            (ShipmentRequest.findOne as jest.Mock).mockResolvedValue(mockSR);
            (Vehicle.findOne as jest.Mock).mockResolvedValue({ id: 'v1', logistics_provider_profile_id: 'lpp1', available: true, save: jest.fn() });
            (LogisticsProviderProfile.findOne as jest.Mock).mockResolvedValue({ id: 'lpp1' });
            (Shipment.create as jest.Mock).mockResolvedValue({ id: 'sh1' });

            await shipmentRequestController.respondToShipmentRequest(req as Request, res as Response, mockNext);

            expect(mockSR.status).toBe(ShipmentRequestStatus.ACCEPTED);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should allow logistics provider to counter a request', async () => {
            const req = mockRequest({
                user: { userId: 'lp_user1' },
                params: { id: 'sr1' },
                body: { action: 'counter', proposed_cost: 600, proposed_duration_days: 3 }
            });
            const res = mockResponse();

            const mockSR = {
                id: 'sr1',
                logistics_provider_user_id: 'lp_user1',
                status: ShipmentRequestStatus.PENDING,
                negotiations: [],
                save: jest.fn()
            };
            (ShipmentRequest.findOne as jest.Mock).mockResolvedValue(mockSR);

            await shipmentRequestController.respondToShipmentRequest(req as Request, res as Response, mockNext);

            expect(mockSR.status).toBe(ShipmentRequestStatus.COUNTERED_BY_LOGISTICS);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('buyerConfirmShipmentRequest', () => {
        it('should allow buyer to confirm an accepted request', async () => {
            const req = mockRequest({ user: { userId: 'buyer1' }, params: { id: 'sr1' } });
            const res = mockResponse();

            const mockSR = {
                id: 'sr1',
                buyer_user_id: 'buyer1',
                status: ShipmentRequestStatus.ACCEPTED,
                vehicle_id: 'v1',
                logistics_provider_profile_id: 'lpp1',
                logistics_provider_user_id: 'lpu1',
                save: jest.fn()
            };
            (ShipmentRequest.findOne as jest.Mock).mockResolvedValue(mockSR);

            await shipmentRequestController.buyerConfirmShipmentRequest(req as Request, res as Response, mockNext);

            expect(mockSR.status).toBe(ShipmentRequestStatus.CONFIRMED);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
