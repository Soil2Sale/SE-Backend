import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import orderRoutes from '../../routes/orderRoutes';
import Order, { OrderStatus } from '../../models/Order';
import CropListing, { QualityGrade, CropListingStatus } from '../../models/CropListing';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/orders', orderRoutes);
app.use(errorHandler);

describe('Order API (Integration)', () => {

    const buyerId = new mongoose.Types.ObjectId();
    const farmerId = new mongoose.Types.ObjectId();
    const listingId = new mongoose.Types.ObjectId().toString();

    const mockBuyerToken = generateAccessToken(buyerId, 'buyer2@test.com', 'Buyer');
    const buyerHeader = `Bearer ${mockBuyerToken}`;

    const mockFarmerToken = generateAccessToken(farmerId, 'farmer2@test.com', 'Farmer');
    const farmerHeader = `Bearer ${mockFarmerToken}`;

    beforeEach(async () => {
        // Seed users
        await User.create([
            {
                id: buyerId.toString(),
                name: 'Test Order Buyer',
                mobile_number: '7777777771',
                role: UserRole.BUYER,
                is_verified: true,
                is_telegram_linked: false,
                aadhaar_verified: true,
                business_verified: true
            },
            {
                id: farmerId.toString(),
                name: 'Test Order Farmer',
                mobile_number: '7777777772',
                role: UserRole.FARMER,
                is_verified: true,
                is_telegram_linked: false,
                aadhaar_verified: true,
                business_verified: true
            }
        ]);

        // Seed a crop listing for the order to belong to
        await CropListing.create({
            id: listingId,
            farmer_profile_id: new mongoose.Types.ObjectId().toString(),
            farmer_user_id: farmerId.toString(),
            crop_name: 'Test Apples',
            quality_grade: QualityGrade.PREMIUM,
            quantity: 1000,
            expected_price: 500,
            status: CropListingStatus.ACTIVE
        });
    });

    it('should successfully create a new order as a buyer with sufficient crop quantity existant', async () => {
        const payload = {
            crop_listing_id: listingId,
            final_price: 450,
            quantity: 200
        };

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', buyerHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.final_price).toBe(450);
        expect(res.body.data.quantity).toBe(200);
        expect(res.body.data.status).toBe(OrderStatus.CREATED);
        expect(res.body.data.payment_status).toBe('PENDING');
        expect(res.body.data.buyer_user_id).toBe(buyerId.toString());

        // Ensure crop listing quantity physically decreased correctly in database
        const updatedListing = await CropListing.findOne({ id: listingId });
        expect(updatedListing!.quantity).toBe(800); // 1000 - 200
    });

    it('should fail to create an order if crop listing lacks sufficient quantity', async () => {
        const payload = {
            crop_listing_id: listingId,
            final_price: 450,
            quantity: 2000 // Listing only has 1000
        };

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', buyerHeader)
            .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Insufficient quantity available');
    });

    it('should prevent standard farmers from creating orders (buyer role only)', async () => {
        const payload = {
            crop_listing_id: listingId,
            final_price: 450,
            quantity: 100
        };

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', farmerHeader) // Authenticate as a farmer trying to behave as buyer
            .send(payload);

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Only users with Buyer role can create orders');
    });

    it('should cancel an order cleanly and restore listing quantiy', async () => {
        // Physically seed the order
        const trackingOrderId = new mongoose.Types.ObjectId().toString();
        await Order.create({
            id: trackingOrderId,
            crop_listing_id: listingId,
            buyer_user_id: buyerId.toString(),
            sender_user_id: farmerId.toString(),
            final_price: 300,
            quantity: 150,
            status: OrderStatus.CREATED,
            payment_status: 'PENDING'
        });

        const cancelReq = await request(app)
            .put(`/api/orders/${trackingOrderId}/cancel`)
            .set('Authorization', buyerHeader);

        expect(cancelReq.status).toBe(200);
        expect(cancelReq.body.success).toBe(true);
        expect(cancelReq.body.data.status).toBe(OrderStatus.CANCELLED);

        // Verify quantity refunded back
        const listingReq = await CropListing.findOne({ id: listingId });
        expect(listingReq!.quantity).toBe(1150); // 1000 + 150 refunded
    });
});
