import express from "express";
import {
createCategory,
updateCategory,
deleteCategory,
getAllCategories,
getCategoryById,
getAllCategoriesPaginated,
getCategoryCount,
} from "../../controller/product/category.controller.js";
import authenticate from "../../middlewares/auth/auth.js";
import {
uploadCategory,
compressUploadedImage,
} from "../../Helper/multer.helper.js";

const router = express.Router();

// Public Routes
router.get("/categories/paginated", getAllCategoriesPaginated);
router.get("/categories", getAllCategories);
router.get("/categories/count", getCategoryCount);
router.get("/categoryById/:id", getCategoryById);

// Admin — Create Category
router.post(
"/admin/createcategory",
authenticate,
(req, res, next) => {
req.uploadFolder = "uploads/category-icons";
next();
},
uploadCategory.single("category_icon"),
compressUploadedImage,
createCategory
);

// Admin — Update Category
router.put(
"/admin/updatecategoryById/:id",
authenticate,
(req, res, next) => {
req.uploadFolder = "uploads/category-icons";
next();
},
uploadCategory.single("category_icon"),
compressUploadedImage,
updateCategory
);

router.delete("/admin/deletecategoryById/:id", authenticate, deleteCategory);

export default router;