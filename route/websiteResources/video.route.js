import express from "express";
import {
  createVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
  getVideoCount,
  getPaginatedVideos, // 👈 new
} from "../../controller/website-resources/video.controller.js";
import authenticate from "../../middlewares/auth/auth.js";

const router = express.Router();

// Public
router.get("/", getAllVideos);                // all videos
router.get("/getall/paginated", getPaginatedVideos); // paginated
router.get("/count", getVideoCount);          // count
router.get("/getbyid/:id", getVideoById);

// Admin / CRUD
router.post("/create",authenticate, createVideo);
router.put("/update/:id",authenticate, updateVideo);
router.delete("/delete/:id",authenticate, deleteVideo);

export default router;
