import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getAllOrders,
  getOrderById
} from "../../controller/Order/order.controller.js";

const router = Router();

router.post("/", createOrder);
router.post("/verify", verifyPayment);
router.get("/", getAllOrders);
router.get("/:id", getOrderById);

export default router;
