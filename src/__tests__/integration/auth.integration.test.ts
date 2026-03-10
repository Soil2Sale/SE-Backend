import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from '../../routes/authRoutes';
import User from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateOTP } from '../../middlewares/otp/otpService';

const app: Application = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('Auth API (Integration)', () => {

    it('should register a new user successfully and save to database', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Integration Test User',
                security_pin: '123456',
                role: 'Buyer',
                mobile_number: '9876543210'
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user).toBeDefined();
        expect(res.body.data.user.name).toBe('Integration Test User');

        // Verify that the user physically exists in the database
        const userInDb = await User.findOne({ mobile_number: '9876543210' });
        expect(userInDb).not.toBeNull();
        expect(userInDb!.name).toBe('Integration Test User');
    });

    it('should login an existing verified user successfully and generate a real JWT', async () => {
        // 1. Create the user
        await request(app).post('/api/auth/register').send({
            name: 'Login Test', security_pin: '123456', role: 'Buyer', mobile_number: '9999999999'
        });

        // 2. We must manually verify and link telegram to allow login based on the controller checks
        const dbUser = await User.findOne({ mobile_number: '9999999999' });
        dbUser!.is_verified = true;
        dbUser!.is_telegram_linked = true;
        await dbUser!.save();

        // 3. Request OTP
        const otpReq = await request(app)
            .post('/api/auth/login')
            .send({ mobile_number: '9999999999', security_pin: '123456' }); // Logging in with mobile number and pin

        expect(otpReq.status).toBe(200);
        const userId = otpReq.body.data.userId;

        // 4. Generate correct OTP from DB secret (Testing pure end-to-end OTP validation)
        const updatedDbUser = await User.findOne({ id: userId });
        const validOtp = generateOTP(updatedDbUser!.otp_secret);

        // 5. Verify OTP and get JWT
        const verifyReq = await request(app)
            .post('/api/auth/verify-otp')
            .send({ userId, otp: validOtp });

        expect(verifyReq.status).toBe(200);
        expect(verifyReq.body.success).toBe(true);
        expect(verifyReq.body.data.accessToken).toBeDefined();
    });
});
