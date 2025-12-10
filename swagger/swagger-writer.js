// ./swagger/swagger-writer.js
import fs from "fs";
import path from "path";

export function writeSwaggerJson(swaggerObj) {
  const outDir = path.resolve(process.cwd(), "docs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, "swagger.json");
  fs.writeFileSync(filePath, JSON.stringify(swaggerObj, null, 2), "utf8");
  console.log(`📄 swagger.json written to ${filePath}`);
}
