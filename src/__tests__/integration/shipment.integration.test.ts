import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import shipmentRoutes from '../../routes/shipmentRoutes';
import Shipment, { ShipmentStatus } from '../../models/Shipment';
import Order, { OrderStatus } from '../../models/Order';
import LogisticsProviderProfile from '../../models/LogisticsProviderProfile';
import Vehicle from '../../models/Vehicle';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/shipments', shipmentRoutes);
app.use(errorHandler);

describe('Shipment API (Integration)', () => {

    const logisticsId = new mongoose.Types.ObjectId();
    const mockLogisticsToken = generateAccessToken(logisticsId, 'transporter@test.com', 'Logistics Provider');
    const authHeader = `Bearer ${mockLogisticsToken}`;

    const profileId = new mongoose.Types.ObjectId().toString();

    beforeEach(async () => {
        await User.create({
            id: logisticsId.toString(),
            name: 'Transporter Tom',
            mobile_number: '9111111111',
            role: UserRole.LOGISTICS_PROVIDER,
            is_verified: true,
            is_telegram_linked: false,
            aadhaar_verified: true,
            business_verified: true
        });

        await LogisticsProviderProfile.create({
            id: profileId,
            user_id: logisticsId.toString(),
            company_name: 'Fast Trucks',
            verified: true
        });
    });

    it('should securely create a new shipment mapping to an order', async () => {
        const orderId = new mongoose.Types.ObjectId().toString();
        const vehicleId = new mongoose.Types.ObjectId().toString();

        await Order.create({
            id: orderId,
            crop_listing_id: new mongoose.Types.ObjectId().toString(),
            buyer_user_id: new mongoose.Types.ObjectId().toString(),
            sender_user_id: new mongoose.Types.ObjectId().toString(),
            final_price: 100,
            quantity: 10,
            status: OrderStatus.CONFIRMED,
            payment_status: 'PAID'
        });

        await Vehicle.create({
            id: vehicleId,
            logistics_provider_profile_id: profileId,
            logistics_provider_user_id: logisticsId.toString(),
            vehicle_type: 'TRUCK',
            capacity: 500,
            available: true,
            registration_number: 'KA-01-HH-1234'
        });

        const payload = {
            order_id: orderId,
            logistics_provider_profile_id: profileId,
            vehicle_id: vehicleId,
            origin_latitude: 12.0,
            origin_longitude: 77.0,
            destination_latitude: 13.0,
            destination_longitude: 78.0,
            estimated_cost: 450,
            tracking_code: 'TRK-9999'
        };

        const res = await request(app)
            .post('/api/shipments')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(ShipmentStatus.CREATED);
    });

    it('should track a shipment securely bypassing user check via tracking code', async () => {
        const trackingCode = 'TRK-FAST-123';
        const orderId = new mongoose.Types.ObjectId().toString();
        const vehicleId = new mongoose.Types.ObjectId().toString();

        await Order.create({
            id: orderId,
            crop_listing_id: new mongoose.Types.ObjectId().toString(),
            buyer_user_id: new mongoose.Types.ObjectId().toString(),
            sender_user_id: new mongoose.Types.ObjectId().toString(),
            final_price: 100,
            quantity: 10,
            status: OrderStatus.CONFIRMED,
            payment_status: 'PAID'
        });

        await Vehicle.create({
            id: vehicleId,
            logistics_provider_profile_id: profileId,
            logistics_provider_user_id: logisticsId.toString(),
            vehicle_type: 'TRUCK',
            capacity: 500,
            available: true,
            registration_number: 'KA-01-HH-9999'
        });

        await Shipment.create({
            id: new mongoose.Types.ObjectId().toString(),
            order_id: orderId,
            logistics_provider_profile_id: profileId,
            logistics_provider_user_id: logisticsId.toString(),
            vehicle_id: vehicleId,
            origin_latitude: 12.0,
            origin_longitude: 77.0,
            destination_latitude: 13.0,
            destination_longitude: 78.0,
            estimated_cost: 100,
            tracking_code: trackingCode,
            status: ShipmentStatus.IN_TRANSIT
        });

        const res = await request(app)
            .get(`/api/shipments/track/${trackingCode}`)
            .set('Authorization', authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(ShipmentStatus.IN_TRANSIT);
        expect(res.body.data.order_id.id).toBe(orderId);
    });

    it('should successfully deliver an order and update state', async () => {
        const targetId = new mongoose.Types.ObjectId().toString();
        const vehicleId = new mongoose.Types.ObjectId().toString();

        await Vehicle.create({
            id: vehicleId,
            logistics_provider_profile_id: profileId,
            logistics_provider_user_id: logisticsId.toString(),
            vehicle_type: 'TRUCK',
            capacity: 500,
            available: false,
            registration_number: 'KA-01-HH-5678'
        });

        await Shipment.create({
            id: targetId,
            order_id: new mongoose.Types.ObjectId().toString(),
            logistics_provider_profile_id: profileId,
            logistics_provider_user_id: logisticsId.toString(),
            vehicle_id: vehicleId,
            origin_latitude: 10.0,
            origin_longitude: 70.0,
            destination_latitude: 11.0,
            destination_longitude: 71.0,
            estimated_cost: 100,
            tracking_code: 'TRK-FINISH',
            status: ShipmentStatus.IN_TRANSIT
        });

        const res = await request(app)
            .patch(`/api/shipments/${targetId}/deliver`)
            .set('Authorization', authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe(ShipmentStatus.DELIVERED);
        expect(res.body.data.delivery_confirmed_at).toBeDefined();

        const shipmentDB = await Shipment.findOne({ id: targetId });
        expect(shipmentDB!.status).toBe(ShipmentStatus.DELIVERED);
    });
});
