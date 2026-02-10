import { Request, Response, NextFunction } from "express";
import Transaction, {
  ITransaction,
  TransactionType,
  TransactionStatus,
  ReferenceType,
} from "../models/Transaction";
import Wallet from "../models/Wallet";
import { FilterQuery } from "mongoose";

export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      sender_wallet_id,
      receiver_wallet_id,
      amount,
      type,
      reference_type,
      reference_id,
      payment_method,
    } = req.body;

    const senderWallet = await Wallet.findOne({ id: sender_wallet_id });
    if (!senderWallet) {
      res.status(404).json({
        success: false,
        message: "Sender wallet not found",
      });
      return;
    }

    const receiverWallet = await Wallet.findOne({ id: receiver_wallet_id });
    if (!receiverWallet) {
      res.status(404).json({
        success: false,
        message: "Receiver wallet not found",
      });
      return;
    }

    if (senderWallet.balance < amount) {
      res.status(400).json({
        success: false,
        message: "Insufficient balance in sender wallet",
      });
      return;
    }

    senderWallet.balance -= amount;
    receiverWallet.balance += amount;

    await Promise.all([senderWallet.save(), receiverWallet.save()]);

    const transaction = await Transaction.create({
      sender_wallet_id,
      receiver_wallet_id,
      sender_user_id: senderWallet.user_id,
      receiver_user_id: receiverWallet.user_id,
      amount,
      type,
      status: TransactionStatus.SUCCESS,
      reference_type,
      reference_id,
      payment_method,
      completed_at: new Date(),
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOne({ id })
      .populate("sender_wallet_id")
      .populate("receiver_wallet_id");

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionsByUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user_id = req.user?.userId;
    const { type, status, from, to, page = "1", limit = "20" } = req.query;

    if (!user_id) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const filter: FilterQuery<ITransaction> = {
      $or: [{ sender_user_id: user_id }, { receiver_user_id: user_id }],
    };

    if (type) {
      filter.type = type as TransactionType;
    }

    if (status) {
      filter.status = status as TransactionStatus;
    }

    if (from || to) {
      filter.created_at = {};
      if (from) {
        filter.created_at.$gte = new Date(from as string);
      }
      if (to) {
        filter.created_at.$lte = new Date(to as string);
      }
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate("sender_wallet_id", "user_id balance")
        .populate("receiver_wallet_id", "user_id balance")
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionsByWallet = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { walletId } = req.params;
    const { page = "1", limit = "20" } = req.query;

    const wallet = await Wallet.findOne({ id: walletId });
    if (!wallet) {
      res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
      return;
    }

    const filter: FilterQuery<ITransaction> = {
      $or: [{ sender_wallet_id: walletId }, { receiver_wallet_id: walletId }],
    };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionsByOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { orderId } = req.params;

    const transactions = await Transaction.find({
      reference_type: ReferenceType.ORDER,
      reference_id: orderId,
    })
      .populate("sender_wallet_id", "user_id balance")
      .populate("receiver_wallet_id", "user_id balance")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (error) {
    next(error);
  }
};

export const processRefund = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const originalTransaction = await Transaction.findOne({ id });
    if (!originalTransaction) {
      res.status(404).json({
        success: false,
        message: "Original transaction not found",
      });
      return;
    }

    if (originalTransaction.status === TransactionStatus.REFUNDED) {
      res.status(400).json({
        success: false,
        message: "Transaction already refunded",
      });
      return;
    }

    if (originalTransaction.status !== TransactionStatus.SUCCESS) {
      res.status(400).json({
        success: false,
        message: "Can only refund successful transactions",
      });
      return;
    }

    const senderWallet = await Wallet.findOne({
      id: originalTransaction.receiver_wallet_id,
    });
    const receiverWallet = await Wallet.findOne({
      id: originalTransaction.sender_wallet_id,
    });

    if (!senderWallet || !receiverWallet) {
      res.status(404).json({
        success: false,
        message: "Wallet not found for refund",
      });
      return;
    }

    if (senderWallet.balance < originalTransaction.amount) {
      res.status(400).json({
        success: false,
        message: "Insufficient balance for refund",
      });
      return;
    }

    senderWallet.balance -= originalTransaction.amount;
    receiverWallet.balance += originalTransaction.amount;

    await Promise.all([senderWallet.save(), receiverWallet.save()]);

    const refundTransaction = await Transaction.create({
      sender_wallet_id: originalTransaction.receiver_wallet_id,
      receiver_wallet_id: originalTransaction.sender_wallet_id,
      sender_user_id: originalTransaction.receiver_user_id,
      receiver_user_id: originalTransaction.sender_user_id,
      amount: originalTransaction.amount,
      type: TransactionType.REFUND,
      status: TransactionStatus.SUCCESS,
      reference_type: originalTransaction.reference_type,
      reference_id: originalTransaction.reference_id,
      payment_method: originalTransaction.payment_method,
      completed_at: new Date(),
    });

    originalTransaction.status = TransactionStatus.REFUNDED;
    await originalTransaction.save();

    res.status(200).json({
      success: true,
      data: refundTransaction,
    });
  } catch (error) {
    next(error);
  }
};
