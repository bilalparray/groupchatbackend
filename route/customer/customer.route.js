import { Router } from "express";
import {
  createCustomer,
  getCustomerById,
  getAllCustomersPaginated,
  updateCustomer,
  deleteCustomer,
} from "../../controller/customer-controller/customer.controller.js";

const router = Router();
router.post("/create", createCustomer);
router.get("/getall/paginated", getAllCustomersPaginated);
router.get("/getbyid/:id", getCustomerById);
router.put("/update/:id", updateCustomer);
router.delete("/delete/:id", deleteCustomer);

export default router;
