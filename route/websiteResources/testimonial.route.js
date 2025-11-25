import express from "express";
import {
  createTestimonial,
  getAllTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial,
  getTestimonialCount,
} from "../../controller/website-resources/testimonial.controller.js";
const router = express.Router();

// Public
router.get("/getAll/paginated", getAllTestimonials);
router.get("/count", getTestimonialCount);
router.get("/getbyid/:id", getTestimonialById);
// Create / Manage
router.post("/create", createTestimonial);
router.put("/update/:id", updateTestimonial);
router.delete("/delete/:id", deleteTestimonial);

export default router;
