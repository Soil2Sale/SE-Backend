import { Router } from 'express';
import { register, login, verifyOtp, logout, refreshAccessToken, forgotPassword } from '../controllers/authController';
import { validateAuth } from '../middlewares/validation';

const router = Router();

router.post('/register', validateAuth, register);
router.post('/login', validateAuth, login);
router.post('/verify-otp', verifyOtp);
router.post('/logout', logout);
router.post('/refresh', refreshAccessToken);
router.post('/forgot-password', forgotPassword);

export default router;
