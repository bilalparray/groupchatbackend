import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";

/**
 * Configure multer storage (dynamic folder creation inside uploads/)
*/
const BASE_UPLOAD_DIR = "/var/www/";
const storage = multer.diskStorage({
  // destination: (req, file, cb) => {
  //   const folder = req.uploadFolder || "uploads/others";
  //   const fullFolder = folder.startsWith("uploads") ? folder : path.join("uploads", folder);
  //   const uploadDir = path.join(process.cwd(), fullFolder);
  //   if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  //   cb(null, uploadDir);
  // },

destination: (req, file, cb) => {
    const folder = req.uploadFolder || "others";

    // Every module gets its own folder inside permanent path
    const uploadDir = path.join(BASE_UPLOAD_DIR, folder);

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    cb(null, uploadDir);
},
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const fileName = `${file.fieldname}_${Date.now()}_${baseName}${ext}`;
    cb(null, fileName);
  },
});

/**
 * Common file filter for all uploaders (images only)
 */
const fileFilter = (req, file, cb) => {
  const allowedExt = [
    ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".tif", ".svg",
    ".heic", ".heif", ".avif"
  ];

  const allowedMime = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
    "image/heic",
    "image/heif",
    "image/avif"
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!allowedExt.includes(ext) && !allowedMime.includes(mime)) {
    return cb(new Error(`Unsupported file type: ${ext} / ${mime}`));
  }

  cb(null, true);
};


/**
 * Internal utility to iteratively compress an image to <= maxKB as WebP.
 *
 * Strategy: try decreasing quality and width until size threshold is met.
 *
 * This mirrors community-recommended approach for size-constrained output.
 */
const compressToWebpUnderKB = async (
  inputPath,
  {
    maxKB = 100,
    startQuality = 80,
    minQuality = 10,
    qualityStep = 15,
    startWidth = 1200,
    minWidth = 500,
    widthStep = 200,
    effort = 6,
  } = {}
) => {
  const ext = path.extname(inputPath).toLowerCase();
  const base = inputPath.slice(0, -ext.length);
  let quality = startQuality;
  let width = startWidth;
  let finalOutput = "";
  let lastAttemptPath = "";

  while (quality >= minQuality) {
    const attemptPath = `${base}_q${quality}.webp`;

    await sharp(inputPath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort })
      .toFile(attemptPath);

    const sizeKB = Math.round(fs.statSync(attemptPath).size / 1024);
    if (sizeKB <= maxKB) {
      finalOutput = attemptPath;
      break;
    }
    lastAttemptPath = attemptPath;
    quality -= qualityStep;
    width = Math.max(minWidth, width - widthStep);
  }

  if (!finalOutput) finalOutput = lastAttemptPath;

  // Remove the original file
  if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

  // Cleanup temp attempts except final
  const dir = path.dirname(base);
  const baseName = path.basename(base);
  fs.readdirSync(dir)
    .filter((f) => f.startsWith(baseName) && f.endsWith(".webp") && path.join(dir, f) !== finalOutput)
    .forEach((f) => fs.unlinkSync(path.join(dir, f)));

  return finalOutput;
};

/**
 * General compress/convert for products and categories
 */
export const compressAndConvertImage = async (filePath) => {
  try {
    // Always convert to .webp if not already, and ensure <= 100KB
    return await compressToWebpUnderKB(filePath, {
      maxKB: 100,
      startQuality: 80,
      minQuality: 10,
      qualityStep: 15,
      startWidth: 1200,
      minWidth: 500,
      widthStep: 200,
      effort: 6,
    });
  } catch (err) {
    console.error("Compression failed:", err);
    return filePath;
  }
};

/**
 * Separate compress/convert for banners (isolated for future tuning)
 *
 * Currently uses same thresholds (<= 100KB) but you can raise widths or quality later if banners need higher fidelity.
 */
export const compressAndConvertBannerImage = async (filePath) => {
  try {
    return await compressToWebpUnderKB(filePath, {
      maxKB: 100,
      startQuality: 85,
      minQuality: 10,
      qualityStep: 15,
      startWidth: 1600,
      minWidth: 600,
      widthStep: 200,
      effort: 6,
    });
  } catch (err) {
    console.error("Banner compression failed:", err);
    return filePath;
  }
};

/**
 * Multer uploaders
 */
export const uploadBanner = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 },
  fileFilter,
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 },
  fileFilter,
});

export const uploadCategory = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, fieldSize: 50 * 1024 * 1024 },
  fileFilter,
});

/**
 * Middleware to compress uploaded image (single)
 */
export const compressUploadedImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const originalPath = req.file.path;
    const compressedPath = await compressAndConvertImage(originalPath);

    req.file.path = compressedPath;
    req.file.filename = path.basename(compressedPath);
    req.body.imagePath = compressedPath;

    next();
  } catch (err) {
    console.error("Image compression error:", err);
    next();
  }
};

/**
 * Middleware to compress uploaded banner image (single, separate params)
 */
export const compressUploadedBannerImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const originalPath = req.file.path;
    const compressedPath = await compressAndConvertBannerImage(originalPath);

    req.file.path = compressedPath;
    req.file.filename = path.basename(compressedPath);
    req.body.imagePath = compressedPath;

    next();
  } catch (err) {
    console.error("Banner image compression error:", err);
    next();
  }
};

/**
 * Middleware to compress multiple images
 */
export const compressMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return next();

    for (const file of req.files) {
      const compressedPath = await compressAndConvertImage(file.path);
      file.path = compressedPath;
      file.filename = path.basename(compressedPath);
    }
    next();
  } catch (err) {
    console.error("Error compressing multiple images:", err);
    next();
  }
};

/**
 * Convert image path to base64
 */
/* -------------------------------------------------------------------------- */
/*                  UPDATED: convertImageToBase64 (LOCAL + VPS)               */
/* -------------------------------------------------------------------------- */
const LOCAL_ROOT = "D:/var/www/";   
const VPS_ROOT = "/var/www/";

export const convertImageToBase64 = (filePath) => {
  try {
    if (!filePath) return null;

    // Extract relative path after /var/www/
    let relativePath = filePath.replace("/var/www/", "").replace("\\var\\www\\", "");

    let finalPath = "";

    if (process.platform === "win32") {
      finalPath = path.join(LOCAL_ROOT, relativePath);
    } else {
      finalPath = path.join(VPS_ROOT, relativePath);
    }

    if (!fs.existsSync(finalPath)) {
      console.log("❌ Image not found:", finalPath);
      return null;
    }

    const buffer = fs.readFileSync(finalPath);
    let ext = path.extname(finalPath).substring(1).toLowerCase();
    if (ext === "jpg") ext = "jpeg";

    return `data:image/${ext};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.error("Base64 convert error:", err);
    return null;
  }
};


/**
 * Delete file safely
 */
export const deleteFileSafe = (filePath) => {
  try {
    if (!filePath) return;
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  } catch (err) {
    console.error("Error deleting file:", err);
  }
};

export { storage, fileFilter };
