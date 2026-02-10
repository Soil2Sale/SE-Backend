import { Router } from 'express';
import {
  getAllCropListings,
  getCropListingById,
  getActiveCropListings,
  createCropListing,
  updateCropListing,
  updateCropListingStatus,
  deleteCropListing
} from '../controllers/cropListingController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllCropListings);
router.get('/active', getActiveCropListings);
router.get('/:id', getCropListingById);
router.post('/', createCropListing);
router.put('/:id', updateCropListing);
router.patch('/:id/status', updateCropListingStatus);
router.delete('/:id', deleteCropListing);

export default router;
