import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import marketPriceRoutes from '../../routes/marketPriceRoutes';
import MarketPrice, { MarketType, PriceType } from '../../models/MarketPrice';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/market-prices', marketPriceRoutes);
app.use(errorHandler);

describe('Market Price API (Integration)', () => {

    const agentId = new mongoose.Types.ObjectId();
    const mockAgentToken = generateAccessToken(agentId, 'agent@test.com', 'Admin');
    const authHeader = `Bearer ${mockAgentToken}`;

    beforeEach(async () => {
        // Seed user (Admin typically injects prices or verified systems do)
        await User.create({
            id: agentId.toString(),
            name: 'Test Price Agent',
            mobile_number: '7777777770',
            role: UserRole.ADMIN,
            is_verified: true,
            is_telegram_linked: false,
            aadhaar_verified: true,
            business_verified: true
        });

        // Seed initial market prices
        await MarketPrice.create([
            {
                id: new mongoose.Types.ObjectId().toString(),
                crop_name: 'Rice',
                market_location: 'Central Mandi',
                price: 50,
                recorded_date: new Date('2026-03-01T00:00:00.000Z'),
                price_type: PriceType.WHOLESALE,
                market_type: MarketType.MANDI,
                state: 'Punjab'
            },
            {
                id: new mongoose.Types.ObjectId().toString(),
                crop_name: 'Rice',
                market_location: 'Central Mandi',
                price: 52,
                recorded_date: new Date('2026-03-05T00:00:00.000Z'),
                price_type: PriceType.WHOLESALE,
                market_type: MarketType.MANDI,
                state: 'Punjab'
            }
        ]);
    });

    it('should create new market price entry successfully', async () => {
        const payload = {
            crop_name: 'Wheat',
            market_location: 'Local Mandi',
            price: 35,
            recorded_date: new Date().toISOString(),
            price_type: PriceType.RETAIL,
            market_type: MarketType.BUYER,
            state: 'Haryana'
        };

        const res = await request(app)
            .post('/api/market-prices')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.crop_name).toBe('Wheat');
        expect(res.body.data.price).toBe(35);
        expect(res.body.data.state).toBe('Haryana');

        // Physical check
        const dbPrice = await MarketPrice.findOne({ crop_name: 'Wheat' });
        expect(dbPrice).not.toBeNull();
        expect(dbPrice!.price).toBe(35);
    });

    it('should bulk create an array of market prices at once', async () => {
        const payload = [
            {
                crop_name: 'Potato',
                market_location: 'Local Mandi',
                price: 20,
                recorded_date: new Date().toISOString(),
                price_type: PriceType.WHOLESALE,
                market_type: MarketType.MANDI,
                state: 'UP'
            },
            {
                crop_name: 'Onion',
                market_location: 'Local Mandi',
                price: 30,
                recorded_date: new Date().toISOString(),
                price_type: PriceType.WHOLESALE,
                market_type: MarketType.MANDI,
                state: 'UP'
            }
        ];

        const res = await request(app)
            .post('/api/market-prices')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBe(2);

        const potatoes = await MarketPrice.find({ market_location: 'Local Mandi' });
        expect(potatoes.length).toBe(2);
    });

    it('should fetch trends showing the progression of prices', async () => {
        const res = await request(app)
            .get('/api/market-prices/trends?crop_name=Rice')
            .set('Authorization', authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(2); // The two Rice seeds above

        // Verify ordering/trend format
        expect(res.body.data[0]._id).toBe('2026-03-01');
        expect(res.body.data[1]._id).toBe('2026-03-05');
        expect(res.body.data[0].avgPrice).toBe(50);
        expect(res.body.data[1].avgPrice).toBe(52);
    });
});
