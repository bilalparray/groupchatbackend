import express from "express";
import { updateReview, deleteReview,approveOrRejectReview } from "../../controller/product/review.controller.js";
import authenticate from "../../middlewares/auth/auth.js";

const router = express.Router();

// Admin only
router.put("/ByReviewId/:id", authenticate, updateReview);
router.delete("/ByReviewId/:id", authenticate, deleteReview);
// ✅ Approve or Reject Review (Admin Only)
router.put("/approve/:id", authenticate, approveOrRejectReview);

export default router;
