import express from "express";
import {
  getAllReviews,
  getReviewById,
  createReviewForProduct,
  getPaginatedReviewsForProduct,
  getAverageRatingForProduct,getReviewCount
} from "../../controller/product/review.controller.js";

const router = express.Router();

// Public
router.get("/getall/paginated", getAllReviews); // paginated
router.get("/count", getReviewCount); // total count of reviews
router.get("/:id", getReviewById);
router.get("/GetAllPaginatedProductReviewsByProductId/:productId", getPaginatedReviewsForProduct);

router.get("/product/average-rating/:productId", getAverageRatingForProduct);
router.post("/CreateProductReviewByProductId/:productId", createReviewForProduct);

export default router;
