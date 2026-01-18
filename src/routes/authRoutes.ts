import { Router } from 'express';
import { register, login, logout, refreshAccessToken, forgotPassword, resetPassword } from '../controllers/authController';
import { validateAuth } from '../middlewares/validation';

const router = Router();

router.post('/register', validateAuth, register);
router.post('/login', validateAuth, login);
router.post('/logout', logout);
router.post('/refresh', refreshAccessToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
