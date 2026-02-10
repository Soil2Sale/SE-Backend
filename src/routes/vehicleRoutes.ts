import { Router } from "express";
import {
  createVehicle,
  getVehiclesByProvider,
  getVehiclesByUser,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} from "../controllers/vehicleController";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.use(authenticate);

router.get("/", getVehiclesByUser);
router.get("/provider/:providerId", getVehiclesByProvider);
router.get("/:id", getVehicleById);
router.post("/", createVehicle);
router.put("/:id", updateVehicle);
router.delete("/:id", deleteVehicle);

export default router;
