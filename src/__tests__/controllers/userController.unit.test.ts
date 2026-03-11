import { Request, Response } from 'express';
import * as userController from '../../controllers/userController';
import User from '../../models/User';
import { mockRequest, mockResponse, mockNext } from '../testUtils';

jest.mock('../../models/User');

describe('UserController Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getProfile', () => {
        it('should return user profile when authenticated', async () => {
            const req = mockRequest({ user: { userId: 'user123' } });
            const res = mockResponse();
            const mockUser = { id: 'user123', name: 'Test User' };
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            await userController.getProfile(req as Request, res as Response, mockNext);

            expect(User.findOne).toHaveBeenCalledWith({ id: 'user123' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockUser
            });
        });

        it('should return 401 if user is not authenticated', async () => {
            const req = mockRequest({ user: null });
            const res = mockResponse();

            await userController.getProfile(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not authenticated'
            });
        });

        it('should return 404 if user is not found', async () => {
            const req = mockRequest({ user: { userId: 'nonexistent' } });
            const res = mockResponse();
            (User.findOne as jest.Mock).mockResolvedValue(null);

            await userController.getProfile(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found'
            });
        });

        it('should call next with error on database failure', async () => {
            const req = mockRequest({ user: { userId: 'user123' } });
            const res = mockResponse();
            const error = new Error('DB Error');
            (User.findOne as jest.Mock).mockRejectedValue(error);

            await userController.getProfile(req as Request, res as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getAllUsers', () => {
        it('should return all users', async () => {
            const req = mockRequest();
            const res = mockResponse();
            const mockUsers = [{ name: 'User 1' }, { name: 'User 2' }];
            (User.find as jest.Mock).mockResolvedValue(mockUsers);

            await userController.getAllUsers(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                count: 2,
                data: mockUsers
            });
        });
    });

    describe('getUserById', () => {
        it('should return user by id', async () => {
            const req = mockRequest({ params: { id: 'user123' } });
            const res = mockResponse();
            const mockUser = { id: 'user123', name: 'Test User' };
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            await userController.getUserById(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockUser
            });
        });

        it('should return 404 if user not found', async () => {
            const req = mockRequest({ params: { id: 'invalid' } });
            const res = mockResponse();
            (User.findOne as jest.Mock).mockResolvedValue(null);

            await userController.getUserById(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('createUser', () => {
        it('should create a new user', async () => {
            const req = mockRequest({
                body: { name: 'New User', mobile_number: '1234567890', role: 'Farmer' }
            });
            const res = mockResponse();
            (User.findOne as jest.Mock).mockResolvedValue(null);
            (User.create as jest.Mock).mockResolvedValue({ id: 'new123', ...req.body });

            await userController.createUser(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 400 if user with mobile number exists', async () => {
            const req = mockRequest({ body: { mobile_number: '1234567890' } });
            const res = mockResponse();
            (User.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });

            await userController.createUser(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateUser', () => {
        it('should update user information', async () => {
            const req = mockRequest({
                params: { id: 'user123' },
                body: { name: 'Updated Name' }
            });
            const res = mockResponse();
            (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ id: 'user123', name: 'Updated Name' });

            await userController.updateUser(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should return 404 if user to update is not found', async () => {
            const req = mockRequest({ params: { id: 'invalid' }, body: { name: 'Name' } });
            const res = mockResponse();
            (User.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

            await userController.updateUser(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('deactivateUser / activateUser', () => {
        it('should deactivate user', async () => {
            const req = mockRequest({ params: { id: 'user123' } });
            const res = mockResponse();
            (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ id: 'user123', is_active: false });

            await userController.deactivateUser(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User deactivated successfully' }));
        });

        it('should activate user', async () => {
            const req = mockRequest({ params: { id: 'user123' } });
            const res = mockResponse();
            (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ id: 'user123', is_active: true });

            await userController.activateUser(req as Request, res as Response, mockNext);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User activated successfully' }));
        });
    });
});
