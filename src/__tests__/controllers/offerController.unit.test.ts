import { Request, Response } from 'express';
import * as offerController from '../../controllers/offerController';
import Offer, { OfferStatus } from '../../models/Offer';
import CropListing from '../../models/CropListing';
import Order, { OrderStatus } from '../../models/Order';
import User, { UserRole } from '../../models/User';
import Notification from '../../models/Notification';
import * as auditLogger from '../../utils/auditLogger';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/Offer');
jest.mock('../../models/CropListing');
jest.mock('../../models/Order');
jest.mock('../../models/User');
jest.mock('../../models/Notification');
jest.mock('../../utils/auditLogger');
jest.mock('../../middlewares/otp/otpSender');

describe('OfferController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createOffer', () => {
        it('should create an offer successfully', async () => {
            const req = mockRequest({
                user: { userId: 'buyer1' },
                body: { crop_listing_id: 'listing1', offered_price: 1000, farmer_user_id: 'farmer1' }
            });
            const res = mockResponse();

            (User.findOne as jest.Mock).mockResolvedValue({ id: 'buyer1', role: UserRole.BUYER });
            (CropListing.findOne as jest.Mock).mockResolvedValue({ id: 'listing1', status: 'ACTIVE' });
            (Offer.findOne as jest.Mock).mockResolvedValue(null);
            (Offer.create as jest.Mock).mockResolvedValue({ id: 'offer1', offered_price: 1000 });

            await offerController.createOffer(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(Offer.create).toHaveBeenCalled();
        });
    });

    describe('updateOfferStatus', () => {
        it('should allow farmer to accept offer', async () => {
            const req = mockRequest({
                user: { userId: 'farmer1' },
                params: { id: 'offer1' },
                body: { status: OfferStatus.ACCEPTED }
            });
            const res = mockResponse();

            const mockOffer = {
                id: 'offer1',
                farmer_user_id: 'farmer1',
                buyer_user_id: 'buyer1',
                status: OfferStatus.PENDING,
                offered_price: 1000,
                crop_listing_id: { id: 'listing1', farmer_user_id: 'farmer1', quantity: 10 },
                save: jest.fn().mockResolvedValue(true)
            };

            // Mock the populate chain
            const mockQuery: any = {
                populate: jest.fn().mockResolvedValue(mockOffer)
            };
            (Offer.findOne as jest.Mock).mockReturnValue(mockQuery);
            
            (Order.create as jest.Mock).mockResolvedValue({ id: 'order1' });
            (User.findOne as jest.Mock).mockResolvedValue({ id: 'buyer1', telegram_chat_id: 'chat1' });
            (Notification.create as jest.Mock).mockResolvedValue({});

            await offerController.updateOfferStatus(req as Request, res as Response, mockNext);

            expect(mockOffer.status).toBe(OfferStatus.ACCEPTED);
            expect(Order.create).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should allow farmer to reject offer', async () => {
            const req = mockRequest({
                user: { userId: 'farmer1' },
                params: { id: 'offer1' },
                body: { status: OfferStatus.REJECTED }
            });
            const res = mockResponse();

            const mockOffer = {
                id: 'offer1',
                farmer_user_id: 'farmer1',
                buyer_user_id: 'buyer1',
                status: OfferStatus.PENDING,
                crop_listing_id: { id: 'listing1', farmer_user_id: 'farmer1' },
                save: jest.fn().mockResolvedValue(true)
            };

            (Offer.findOne as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockOffer)
            });
            (User.findOne as jest.Mock).mockResolvedValue({ id: 'buyer1' });

            await offerController.updateOfferStatus(req as Request, res as Response, mockNext);

            expect(mockOffer.status).toBe(OfferStatus.REJECTED);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
