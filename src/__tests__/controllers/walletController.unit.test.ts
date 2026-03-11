import { Request, Response } from 'express';
import * as walletController from '../../controllers/walletController';
import Wallet from '../../models/Wallet';
import User, { UserRole } from '../../models/User';
import Transaction from '../../models/Transaction';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/Wallet');
jest.mock('../../models/User');
jest.mock('../../models/Transaction');

describe('WalletController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createWallet', () => {
        it('should create a wallet if it does not exist', async () => {
            const req = mockRequest({ body: { user_id: 'user123' } });
            const res = mockResponse();
            (Wallet.findOne as jest.Mock).mockResolvedValue(null);
            (Wallet.create as jest.Mock).mockResolvedValue({ user_id: 'user123', balance: 0 });

            await walletController.createWallet(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 if wallet already exists', async () => {
            const req = mockRequest({ body: { user_id: 'user123' } });
            const res = mockResponse();
            (Wallet.findOne as jest.Mock).mockResolvedValue({ id: 'w1' });

            await walletController.createWallet(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        });
    });

    describe('getWalletByUser', () => {
        it('should return wallet for authenticated user', async () => {
            const req = mockRequest({ user: { userId: 'user123' } });
            const res = mockResponse();
            (Wallet.findOne as jest.Mock).mockResolvedValue({ id: 'w1', user_id: 'user123' });

            await walletController.getWalletByUser(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 404 if wallet not found', async () => {
            const req = mockRequest({ user: { userId: 'user123' } });
            const res = mockResponse();
            (Wallet.findOne as jest.Mock).mockResolvedValue(null);

            await walletController.getWalletByUser(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('addFunds', () => {
        it('should add funds for regular user', async () => {
            const req = mockRequest({ 
                user: { userId: 'user123' },
                body: { amount: 100 }
            });
            const res = mockResponse();
            const mockWallet = { id: 'w1', balance: 50, save: jest.fn() };
            
            (User.findOne as jest.Mock).mockResolvedValue({ id: 'user123', role: UserRole.FARMER });
            (Wallet.findOne as jest.Mock).mockResolvedValue(mockWallet);
            (Transaction.create as jest.Mock).mockResolvedValue({ id: 't1' });

            await walletController.addFunds(req as Request, res as Response, mockNext);

            expect(mockWallet.balance).toBe(150);
            expect(mockWallet.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should allow admin to add funds for another user', async () => {
            const req = mockRequest({ 
                user: { userId: 'admin123' },
                body: { user_id: 'user456', amount: 200 }
            });
            const res = mockResponse();
            const mockWallet = { id: 'w2', balance: 0, save: jest.fn() };

            (User.findOne as jest.Mock).mockResolvedValue({ id: 'admin123', role: UserRole.ADMIN });
            (Wallet.findOne as jest.Mock).mockResolvedValue(mockWallet);

            await walletController.addFunds(req as Request, res as Response, mockNext);

            expect(Wallet.findOne).toHaveBeenCalledWith({ user_id: 'user456' });
            expect(mockWallet.balance).toBe(200);
        });
    });

    describe('withdrawFunds', () => {
        it('should withdraw funds if balance is sufficient', async () => {
            const req = mockRequest({ 
                user: { userId: 'user123' },
                body: { amount: 30 }
            });
            const res = mockResponse();
            const mockWallet = { id: 'w1', balance: 50, save: jest.fn() };

            (Wallet.findOne as jest.Mock).mockResolvedValue(mockWallet);

            await walletController.withdrawFunds(req as Request, res as Response, mockNext);

            expect(mockWallet.balance).toBe(20);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 if balance is insufficient', async () => {
            const req = mockRequest({ 
                user: { userId: 'user123' },
                body: { amount: 100 }
            });
            const res = mockResponse();
            const mockWallet = { id: 'w1', balance: 50 };

            (Wallet.findOne as jest.Mock).mockResolvedValue(mockWallet);

            await walletController.withdrawFunds(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Insufficient balance' }));
        });
    });

    describe('getBalance', () => {
        it('should return current balance', async () => {
            const req = mockRequest({ user: { userId: 'user123' } });
            const res = mockResponse();
            (Wallet.findOne as jest.Mock).mockResolvedValue({ balance: 75, currency: 'INR' });

            await walletController.getBalance(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: { balance: 75, currency: 'INR' }
            });
        });
    });
});
