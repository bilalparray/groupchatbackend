import express from "express";
import {
  createModule,
  getAllModules,
  getModuleById,
  updateModule,
  deleteModule,
    getModulesByLicenseId,
} from "../../controller/License-controller/module.controller.js";

import { authenticateToken } from "../../middlewares/auth/auth.js";

const router = express.Router();

// CREATE
router.post("/", authenticateToken, createModule);

// GET ALL with pagination
router.get("/", getAllModules);

// GET BY ID
router.get("/:id", getModuleById);

// UPDATE
router.put("/:id",authenticateToken, updateModule);

// DELETE
router.delete("/:id",authenticateToken, deleteModule);
// GET Modules by License ID
 router.get("/by-license/:licenseId", authenticateToken, getModulesByLicenseId);

export default router;
