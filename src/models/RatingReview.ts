import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IRatingReview extends Document {
  id: string;
  created_at: Date;
  reviewer_user_id: string;
  reviewed_user_id: string;
  rating: number;
  review_text?: string;
}

const ratingReviewSchema = new Schema<IRatingReview>(
  {
    id: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true
    },
    reviewer_user_id: {
      type: String,
      required: true,
      ref: 'User'
    },
    reviewed_user_id: {
      type: String,
      required: true,
      ref: 'User'
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    review_text: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review text cannot exceed 1000 characters']
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

ratingReviewSchema.index({ reviewer_user_id: 1 });
ratingReviewSchema.index({ reviewed_user_id: 1 });
ratingReviewSchema.index({ reviewed_user_id: 1, rating: 1 });
ratingReviewSchema.index({ id: 1 });
ratingReviewSchema.index({ created_at: -1 });

ratingReviewSchema.index(
  { reviewer_user_id: 1, reviewed_user_id: 1 },
  { unique: true }
);

const RatingReview = mongoose.model<IRatingReview>('RatingReview', ratingReviewSchema);

export default RatingReview;