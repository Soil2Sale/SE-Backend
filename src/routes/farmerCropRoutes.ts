import { Router } from 'express';
import {
  getAllFarmerCrops,
  getFarmerCropById,
  getFarmerCropsByFarmerId,
  getFarmerCropsByCropName,
  createFarmerCrop,
  updateFarmerCrop,
  deleteFarmerCrop
} from '../controllers/farmerCropController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAllFarmerCrops);
router.get('/:id', getFarmerCropById);
router.get('/farmer/:farmerId', getFarmerCropsByFarmerId);
router.get('/crop/:cropName', getFarmerCropsByCropName);
router.post('/', createFarmerCrop);
router.put('/:id', updateFarmerCrop);
router.delete('/:id', deleteFarmerCrop);

export default router;
