import express from "express";
import {
  createLicense,
  getAllLicenses,
  getLicenseById,
  updateLicense,
  deleteLicense,
} from "../../controller/License-controller/licenseController.js";
import { authenticateToken } from "../../middlewares/auth/auth.js";

const router = express.Router();

router.post("/", authenticateToken, createLicense);
router.get("/", getAllLicenses);
router.get("/:id", getLicenseById);
router.put("/:id", authenticateToken, updateLicense);
router.delete("/:id", authenticateToken, deleteLicense);

export default router;
