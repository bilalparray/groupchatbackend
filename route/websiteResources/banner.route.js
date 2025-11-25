import express from "express";
import {
  createBanner,
  getAllBanners,
  getAllBannersByPagination,
  getBannerById,
  getBannersByType,
  updateBanner,
  deleteBanner,
  getTotalBannerCount,
} from "../../controller/website-resources/banner.controller.js";

import { authenticateToken } from "../../middlewares/auth/auth.js";

import {
  upload,                    // same multer instance used for products
  compressUploadedBannerImage // single-image compression
} from "../../Helper/multer.helper.js";

const router = express.Router();

/**
 * ---------------------------------------------------------
 * CREATE BANNER (single image)
 * ---------------------------------------------------------
 */
router.post(
  "/create",
  authenticateToken,
  (req, res, next) => {
    req.uploadFolder = "uploads/banners"; // ensure folder defined
    next();
  },
  upload.single("imagePath"),           // 🔥 SINGLE FILE UPLOAD
  compressUploadedBannerImage,          // 🔥 SINGLE FILE COMPRESSION
  createBanner
);

/**
 * ---------------------------------------------------------
 * GET BANNERS
 * ---------------------------------------------------------
 */
router.get("/count", getTotalBannerCount);
router.get("/getall", getAllBanners);
router.get("/getall/paginated", getAllBannersByPagination);
router.get("/getbyid/:id", getBannerById);
router.get("/getbytype/:type", getBannersByType);

/**
 * ---------------------------------------------------------
 * UPDATE BANNER (single image)
 * ---------------------------------------------------------
 */
router.put(
  "/update/:id",
  authenticateToken,
  (req, res, next) => {
    req.uploadFolder = "uploads/banners";
    next();
  },
  upload.single("imagePath"),           // 🔥 SINGLE FILE
  compressUploadedBannerImage,
  updateBanner
);

/**
 * ---------------------------------------------------------
 * DELETE BANNER
 * ---------------------------------------------------------
 */
router.delete("/delete/:id", authenticateToken, deleteBanner);

export default router;
