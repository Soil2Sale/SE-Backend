import { Request, Response, NextFunction } from "express";
import RatingReview, { IRatingReview } from "../models/RatingReview";
import { FilterQuery } from "mongoose";

export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];
    const current_user_id = req.user?.userId;
    const isAdmin = req.user?.role === "Admin";

    if (!current_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // Validate all entries
    for (let i = 0; i < payload.length; i += 1) {
      const { reviewed_user_id, rating, review_text, reviewer_user_id } =
        payload[i];

      if (!reviewed_user_id || rating === undefined) {
        res.status(400).json({
          success: false,
          message: `Missing required fields in entry ${i + 1}`,
        });
        return;
      }

      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          message: `Invalid rating in entry ${i + 1}. Must be between 1 and 5`,
        });
        return;
      }

      const effective_reviewer_id =
        isAdmin && reviewer_user_id ? reviewer_user_id : current_user_id;

      if (effective_reviewer_id === reviewed_user_id) {
        res.status(400).json({
          success: false,
          message: `Cannot review yourself in entry ${i + 1}`,
        });
        return;
      }

      const existingReview = await RatingReview.findOne({
        reviewer_user_id: effective_reviewer_id,
        reviewed_user_id,
      });

      if (existingReview) {
        res.status(409).json({
          success: false,
          message: `Duplicate review in entry ${i + 1}. Reviewer has already reviewed this user`,
        });
        return;
      }
    }

    const createdReviews = await RatingReview.create(
      payload.map(
        ({ reviewed_user_id, rating, review_text, reviewer_user_id }) => {
          const effective_reviewer_id =
            isAdmin && reviewer_user_id ? reviewer_user_id : current_user_id;

          return {
            reviewer_user_id: effective_reviewer_id,
            reviewed_user_id,
            rating,
            review_text,
          };
        },
      ),
    );

    res.status(201).json({
      success: true,
      data: Array.isArray(req.body) ? createdReviews : createdReviews[0],
      count: createdReviews.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewsForUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { min_rating, page = "1", limit = "20" } = req.query;

    const filter: FilterQuery<IRatingReview> = { reviewed_user_id: userId };
    if (min_rating) {
      filter.rating = { $gte: Number(min_rating) };
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      RatingReview.find(filter)
        .populate("reviewer_user_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      RatingReview.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      count: reviews.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { page = "1", limit = "20" } = req.query;

    const filter: FilterQuery<IRatingReview> = { reviewer_user_id: userId };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      RatingReview.find(filter)
        .populate("reviewed_user_id", "name email")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      RatingReview.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      count: reviews.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const review = await RatingReview.findOne({ id })
      .populate("reviewer_user_id", "name email")
      .populate("reviewed_user_id", "name email");

    if (!review) {
      res.status(404).json({
        success: false,
        message: "Review not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserRatingStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.params;

    const stats = await RatingReview.aggregate([
      { $match: { reviewed_user_id: userId } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        },
      },
    ]);

    const result =
      stats.length > 0
        ? {
            averageRating: stats[0].averageRating,
            totalReviews: stats[0].totalReviews,
            ratingDistribution: {
              1: stats[0].rating1,
              2: stats[0].rating2,
              3: stats[0].rating3,
              4: stats[0].rating4,
              5: stats[0].rating5,
            },
          }
        : {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, review_text } = req.body;
    const reviewer_user_id = req.user?.userId;

    if (!reviewer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const review = await RatingReview.findOne({ id });
    if (!review) {
      res.status(404).json({
        success: false,
        message: "Review not found",
      });
      return;
    }

    if (review.reviewer_user_id !== reviewer_user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this review",
      });
      return;
    }

    const updateData: Partial<IRatingReview> = {};
    if (rating !== undefined) updateData.rating = rating;
    if (review_text !== undefined) updateData.review_text = review_text;

    const updatedReview = await RatingReview.findOneAndUpdate(
      { id },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      data: updatedReview,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const reviewer_user_id = req.user?.userId;

    if (!reviewer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const review = await RatingReview.findOne({ id });
    if (!review) {
      res.status(404).json({
        success: false,
        message: "Review not found",
      });
      return;
    }

    if (review.reviewer_user_id !== reviewer_user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this review",
      });
      return;
    }

    await RatingReview.findOneAndDelete({ id });

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
