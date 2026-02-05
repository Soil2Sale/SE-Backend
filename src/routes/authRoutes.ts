import { Router } from 'express';
import { register, login, verifyOtp, logout, refreshAccessToken } from '../controllers/authController';
import { validateAuth } from '../middlewares/validation';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/logout', logout);
router.post('/refresh', refreshAccessToken);

export default router;
