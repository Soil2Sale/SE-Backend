import { Request, Response, NextFunction } from "express";
import Wallet, { IWallet } from "../models/Wallet";
import Transaction, {
  TransactionType,
  TransactionStatus,
  ReferenceType,
} from "../models/Transaction";

export const createWallet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user_id, currency = "INR" } = req.body;

    const existingWallet = await Wallet.findOne({ user_id });
    if (existingWallet) {
      res.status(400).json({
        success: false,
        message: "Wallet already exists for this user",
      });
      return;
    }

    const wallet = await Wallet.create({
      user_id,
      balance: 0,
      currency,
    });

    res.status(201).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

export const getWalletByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const wallet = await Wallet.findOne({ user_id }).populate(
      "user_id",
      "name email",
    );

    if (!wallet) {
      res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

export const getWalletById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const wallet = await Wallet.findOne({ id }).populate(
      "user_id",
      "name email",
    );

    if (!wallet) {
      res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

export const addFunds = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { amount, payment_method = "UPI" } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const wallet = await Wallet.findOne({ user_id });
    if (!wallet) {
      res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
      return;
    }

    wallet.balance += amount;
    await wallet.save();

    const transaction = await Transaction.create({
      sender_wallet_id: "EXTERNAL",
      receiver_wallet_id: wallet.id,
      amount,
      type: TransactionType.ADJUSTMENT,
      status: TransactionStatus.SUCCESS,
      reference_type: ReferenceType.DISPUTE,
      reference_id: "ADD_FUNDS",
      payment_method,
      completed_at: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        wallet,
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawFunds = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { amount, payment_method = "BANK_TRANSFER" } = req.body;
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const wallet = await Wallet.findOne({ user_id });
    if (!wallet) {
      res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
      return;
    }

    if (wallet.balance < amount) {
      res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
      return;
    }

    wallet.balance -= amount;
    await wallet.save();

    const transaction = await Transaction.create({
      sender_wallet_id: wallet.id,
      receiver_wallet_id: "EXTERNAL",
      amount,
      type: TransactionType.ADJUSTMENT,
      status: TransactionStatus.SUCCESS,
      reference_type: ReferenceType.DISPUTE,
      reference_id: "WITHDRAW_FUNDS",
      payment_method,
      completed_at: new Date(),
    });

    res.status(200).json({
      success: true,
      data: {
        wallet,
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBalance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const wallet = await Wallet.findOne({ user_id });

    if (!wallet) {
      res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
      },
    });
  } catch (error) {
    next(error);
  }
};
