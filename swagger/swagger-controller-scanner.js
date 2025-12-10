// ./swagger/swagger-controller-scanner.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Scans the controller directory and builds a mapping from function names to controller names
 * @returns {Object} Map of functionName -> controllerName (e.g., "registerController" -> "User Controller")
 */
export async function scanControllers() {
  const controllerDir = path.resolve(__dirname, "../controller");
  const functionToControllerMap = {};
  const controllerFiles = [];

  // Recursively scan controller directory
  function scanDirectory(dir, relativePath = "") {
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  Controller directory not found: ${dir}`);
      return;
    }

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relativeFilePath = path.join(relativePath, item.name).replace(/\\/g, "/");

      if (item.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath, relativeFilePath);
      } else if (item.isFile() && item.name.endsWith("Controller.js")) {
        // Found a controller file
        controllerFiles.push({ fullPath, relativeFilePath, name: item.name });
      }
    }
  }

  scanDirectory(controllerDir);

  // Process each controller file
  for (const file of controllerFiles) {
    try {
      const fileContent = fs.readFileSync(file.fullPath, "utf8");
      
      // Extract controller name from filename
      // e.g., "userController.js" -> "User Controller"
      const fileName = file.name.replace(/Controller\.js$/i, "");
      const controllerName = formatControllerName(fileName);

      // Extract exported function names from the file
      // Look for patterns like: 
      // - export const registerController = async (req, res) => { ... }
      // - export async function loginController(req, res) { ... }
      // - export { registerController, loginController }
      
      const foundFunctions = new Set();

      // Pattern 1: export const functionNameController = ... (most common in this codebase)
      const constExportPattern = /export\s+const\s+(\w+Controller)\s*=/g;
      let match;
      while ((match = constExportPattern.exec(fileContent)) !== null) {
        foundFunctions.add(match[1]);
      }

      // Pattern 2: export async const functionNameController = ...
      const asyncConstPattern = /export\s+async\s+const\s+(\w+Controller)\s*=/g;
      while ((match = asyncConstPattern.exec(fileContent)) !== null) {
        foundFunctions.add(match[1]);
      }

      // Pattern 3: export async function functionNameController(...)
      const asyncFunctionPattern = /export\s+async\s+function\s+(\w+Controller)\s*\(/g;
      while ((match = asyncFunctionPattern.exec(fileContent)) !== null) {
        foundFunctions.add(match[1]);
      }

      // Pattern 4: export function functionNameController(...)
      const functionPattern = /export\s+function\s+(\w+Controller)\s*\(/g;
      while ((match = functionPattern.exec(fileContent)) !== null) {
        foundFunctions.add(match[1]);
      }

      // Pattern 5: Named exports (e.g., export { registerController, loginController })
      const namedExportPattern = /export\s*{\s*([^}]+)\s*}/g;
      while ((match = namedExportPattern.exec(fileContent)) !== null) {
        const exports = match[1]
          .split(",")
          .map((e) => e.trim())
          .filter((e) => e && e.includes("Controller"));
        exports.forEach((exp) => {
          // Handle aliases: registerController as register
          const funcName = exp.split(/\s+as\s+/)[0].trim();
          if (funcName) {
            foundFunctions.add(funcName);
          }
        });
      }

      // Pattern 6: Fallback - any function declaration ending with Controller
      // This catches any edge cases
      const fallbackPattern = /(?:export\s+)?(?:const|async\s+const|function|async\s+function)\s+(\w+Controller)\s*[=(]/g;
      while ((match = fallbackPattern.exec(fileContent)) !== null) {
        foundFunctions.add(match[1]);
      }

      // Map each function to the controller name
      foundFunctions.forEach((funcName) => {
        functionToControllerMap[funcName] = controllerName;
      });

      if (foundFunctions.size > 0) {
        console.log(`✅ Found ${foundFunctions.size} functions in ${file.name} -> ${controllerName}`);
      }
    } catch (error) {
      console.warn(`⚠️  Error scanning controller file ${file.name}:`, error.message);
    }
  }

  return functionToControllerMap;
}

/**
 * Formats a controller filename to a readable controller name
 * e.g., "userController" -> "User Controller"
 *       "productController" -> "Product Controller"
 */
function formatControllerName(fileName) {
  // Remove "Controller" suffix if present
  let name = fileName.replace(/Controller$/i, "");
  
  // Convert camelCase to Title Case
  // e.g., "userController" -> "User Controller"
  //       "productCategoryController" -> "Product Category Controller"
  name = name.replace(/([A-Z])/g, " $1").trim();
  
  // Capitalize first letter of each word
  name = name
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return `${name} Controller`;
}

