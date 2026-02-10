import { Request, Response, NextFunction } from "express";
import BNPLLoan, { IBNPLLoan } from "../models/BNPLLoan";
import { FilterQuery } from "mongoose";

export const createBNPLLoan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { amount, due_date } = req.body;
    const farmer_user_id = req.user?.userId;

    if (!farmer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const loan = await BNPLLoan.create({
      farmer_user_id,
      amount,
      repayment_status: "PENDING",
      due_date: new Date(due_date),
    });

    res.status(201).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    next(error);
  }
};

export const getBNPLLoansByFarmer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const farmer_user_id = req.user?.userId;
    const { repayment_status, page = "1", limit = "20" } = req.query;

    if (!farmer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<IBNPLLoan> = { farmer_user_id };
    if (repayment_status) {
      filter.repayment_status = repayment_status as string;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [loans, total] = await Promise.all([
      BNPLLoan.find(filter).sort({ created_at: -1 }).skip(skip).limit(limitNum),
      BNPLLoan.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: loans,
      count: loans.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getBNPLLoanById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const loan = await BNPLLoan.findOne({ id }).populate(
      "farmer_user_id",
      "name email",
    );

    if (!loan) {
      res.status(404).json({
        success: false,
        message: "BNPL loan not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRepaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { repayment_status } = req.body;
    const farmer_user_id = req.user?.userId;

    if (!farmer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const loan = await BNPLLoan.findOne({ id });
    if (!loan) {
      res.status(404).json({
        success: false,
        message: "BNPL loan not found",
      });
      return;
    }

    if (loan.farmer_user_id !== farmer_user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this loan",
      });
      return;
    }

    loan.repayment_status = repayment_status;
    await loan.save();

    res.status(200).json({
      success: true,
      data: loan,
    });
  } catch (error) {
    next(error);
  }
};

export const makePayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const farmer_user_id = req.user?.userId;

    if (!farmer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const loan = await BNPLLoan.findOne({ id });
    if (!loan) {
      res.status(404).json({
        success: false,
        message: "BNPL loan not found",
      });
      return;
    }

    if (loan.farmer_user_id !== farmer_user_id) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to make payment for this loan",
      });
      return;
    }

    if (loan.repayment_status === "PAID") {
      res.status(400).json({
        success: false,
        message: "Loan is already fully paid",
      });
      return;
    }

    if (amount >= loan.amount) {
      loan.repayment_status = "PAID";
    } else {
      loan.repayment_status = "PARTIAL";
    }
    await loan.save();

    res.status(200).json({
      success: true,
      data: loan,
      message: `Payment of ${amount} processed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

export const getLoansDueSoon = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { days = "7" } = req.query;
    const farmer_user_id = req.user?.userId;

    if (!farmer_user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const daysAhead = Number(days);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const loans = await BNPLLoan.find({
      farmer_user_id,
      due_date: { $lte: futureDate },
      repayment_status: { $nin: ["PAID"] },
    }).sort({ due_date: 1 });

    res.status(200).json({
      success: true,
      data: loans,
      count: loans.length,
    });
  } catch (error) {
    next(error);
  }
};
