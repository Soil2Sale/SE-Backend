import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import ratingReviewRoutes from '../../routes/ratingReviewRoutes';
import RatingReview from '../../models/RatingReview';
import User, { UserRole } from '../../models/User';
import { errorHandler } from '../../middlewares/errorHandler';
import { generateAccessToken } from '../../utils/jwt';

const app: Application = express();
app.use(express.json());
app.use('/api/ratings-reviews', ratingReviewRoutes);
app.use(errorHandler);

describe('Rating and Review API (Integration)', () => {

    const reviewerId = new mongoose.Types.ObjectId();
    const reviewedUserId = new mongoose.Types.ObjectId();

    const mockReviewerToken = generateAccessToken(reviewerId, 'reviewer@test.com', 'Buyer');
    const authHeader = `Bearer ${mockReviewerToken}`;

    beforeEach(async () => {
        // Seed users
        await User.create([
            { id: reviewerId.toString(), name: 'T Reviewer', mobile_number: '9444444441', role: UserRole.BUYER, is_verified: true, is_telegram_linked: false, aadhaar_verified: true, business_verified: true },
            { id: reviewedUserId.toString(), name: 'T Farmer reviewed', mobile_number: '9444444442', role: UserRole.FARMER, is_verified: true, is_telegram_linked: false, aadhaar_verified: true, business_verified: true }
        ]);
    });

    it('should securely add a review for another user', async () => {
        const payload = {
            reviewed_user_id: reviewedUserId.toString(),
            rating: 5,
            review_text: 'Excellent quality and quick delivery!'
        };

        const res = await request(app)
            .post('/api/ratings-reviews')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.rating).toBe(5);

        const reviewInDb = await RatingReview.findOne({
            reviewer_user_id: reviewerId.toString(),
            reviewed_user_id: reviewedUserId.toString()
        });
        expect(reviewInDb).not.toBeNull();
    });

    it('should strictly prevent adding duplicate reviews between the same user pair', async () => {
        await RatingReview.create({
            reviewer_user_id: reviewerId.toString(),
            reviewed_user_id: reviewedUserId.toString(),
            rating: 4,
            review_text: 'Good'
        });

        const payload = {
            reviewed_user_id: reviewedUserId.toString(),
            rating: 3,
            review_text: 'Changed my mind'
        };

        const res = await request(app)
            .post('/api/ratings-reviews')
            .set('Authorization', authHeader)
            .send(payload);

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it('should calculate review stats for a given user', async () => {
        // Assume seed multiple reviews for reviewedUserId
        await RatingReview.create([
            { reviewer_user_id: reviewerId.toString(), reviewed_user_id: reviewedUserId.toString(), rating: 5 },
            { reviewer_user_id: new mongoose.Types.ObjectId().toString(), reviewed_user_id: reviewedUserId.toString(), rating: 3 }
        ]);

        const res = await request(app)
            .get(`/api/ratings-reviews/stats/${reviewedUserId.toString()}`)
            .set('Authorization', authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.averageRating).toBeCloseTo(4);
        expect(res.body.data.totalReviews).toBe(2);
    });
});
