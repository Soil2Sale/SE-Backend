import { Request, Response } from 'express';
import * as transactionController from '../../controllers/transactionController';
import Transaction, { TransactionStatus, TransactionType, ReferenceType } from '../../models/Transaction';
import Wallet from '../../models/Wallet';
import * as auditLogger from '../../utils/auditLogger';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/Transaction');
jest.mock('../../models/Wallet');
jest.mock('../../utils/auditLogger');

describe('TransactionController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createTransaction', () => {
        it('should create a transaction between two wallets', async () => {
            const req = mockRequest({
                body: {
                    sender_wallet_id: 'w1',
                    receiver_wallet_id: 'w2',
                    amount: 100,
                    type: TransactionType.PURCHASE,
                    reference_type: ReferenceType.ORDER,
                    reference_id: 'o1'
                }
            });
            const res = mockResponse();

            const mockSenderWallet = { id: 'w1', user_id: 'u1', balance: 500, save: jest.fn().mockResolvedValue(true) };
            const mockReceiverWallet = { id: 'w2', user_id: 'u2', balance: 200, save: jest.fn().mockResolvedValue(true) };

            (Wallet.findOne as jest.Mock)
                .mockResolvedValueOnce(mockSenderWallet)
                .mockResolvedValueOnce(mockReceiverWallet);
            (Transaction.create as jest.Mock).mockResolvedValue({ id: 't1' });

            await transactionController.createTransaction(req as Request, res as Response, mockNext);

            expect(mockSenderWallet.balance).toBe(400);
            expect(mockReceiverWallet.balance).toBe(300);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should return 400 if sender has insufficient balance', async () => {
            const req = mockRequest({ body: { sender_wallet_id: 'w1', receiver_wallet_id: 'w2', amount: 1000 } });
            const res = mockResponse();

            (Wallet.findOne as jest.Mock)
                .mockResolvedValueOnce({ id: 'w1', balance: 500 })
                .mockResolvedValueOnce({ id: 'w2', balance: 200 });

            await transactionController.createTransaction(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Insufficient balance in sender wallet' }));
        });
    });

    describe('getTransactionsByUser', () => {
        it('should return transactions for the user', async () => {
            const req = mockRequest({ user: { userId: 'u1', role: 'Buyer' }, query: { page: '1' } });
            const res = mockResponse();

            const mockTx = { id: 't1', sender_wallet_id: 'w1', receiver_wallet_id: 'w2', toObject: () => ({ id: 't1' }) };
            (Transaction.find as any).mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([mockTx])
            });
            (Transaction.countDocuments as jest.Mock).mockResolvedValue(1);
            (Wallet.findOne as any).mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'w1', balance: 100 }) });

            await transactionController.getTransactionsByUser(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('processRefund', () => {
        it('should process refund for a successful transaction', async () => {
            const req = mockRequest({ params: { id: 't1' }, user: { userId: 'admin' } });
            const res = mockResponse();

            const mockTx = {
                id: 't1',
                status: TransactionStatus.SUCCESS,
                amount: 50,
                sender_wallet_id: 'w1',
                receiver_wallet_id: 'w2',
                sender_user_id: 'u1',
                receiver_user_id: 'u2',
                save: jest.fn().mockResolvedValue(true)
            };
            const mockReceiverWallet = { id: 'w2', balance: 100, save: jest.fn().mockResolvedValue(true) };
            const mockSenderWallet = { id: 'w1', balance: 0, save: jest.fn().mockResolvedValue(true) };

            (Transaction.findOne as jest.Mock).mockResolvedValue(mockTx);
            (Wallet.findOne as jest.Mock)
                .mockResolvedValueOnce(mockReceiverWallet)
                .mockResolvedValueOnce(mockSenderWallet);
            (Transaction.create as jest.Mock).mockResolvedValue({ id: 't2' });

            await transactionController.processRefund(req as Request, res as Response, mockNext);

            expect(mockReceiverWallet.balance).toBe(50);
            expect(mockSenderWallet.balance).toBe(50);
            expect(mockTx.status).toBe(TransactionStatus.REFUNDED);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
