import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  getUserByRole,
  createUser,
  updateUser,
  deactivateUser,
  activateUser
} from '../controllers/userController';
import { validateUser } from '../middlewares/validation';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllUsers);
router.get('/role', getUserByRole);
router.get('/:id', getUserById);
router.post('/', validateUser, createUser);
router.put('/:id', validateUser, updateUser);
router.patch('/:id/deactivate', deactivateUser);
router.patch('/:id/activate', activateUser);

export default router;
