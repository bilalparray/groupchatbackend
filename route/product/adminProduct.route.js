import express from "express";
import {
createProduct,
updateProduct,
deleteProduct,
getRecentBestSellingProducts,
updateBestSellingState,
} from "../../controller/product/product.controller.js";
import authenticate from "../../middlewares/auth/auth.js";
import {
upload,
compressMultipleImages,
} from "../../Helper/multer.helper.js";

const router = express.Router();

// Create Product
router.post(
"/createproduct",
authenticate,
(req, res, next) => {
req.uploadFolder = "uploads/products";
next();
},
upload.array("images", 10),
compressMultipleImages,
createProduct
);

// Update Product
router.put(
"/updateproductById/:id",
authenticate,
(req, res, next) => {
req.uploadFolder = "uploads/products";
next();
},
upload.array("images", 10),
compressMultipleImages,
updateProduct
);

router.delete("/deleteproductById/:id", authenticate, deleteProduct);

router.get("/bestselling/recent", getRecentBestSellingProducts);
router.put("/bestselling/state/:id", authenticate, updateBestSellingState);

export default router;