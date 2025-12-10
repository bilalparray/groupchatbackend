// ./swagger/swagger-autosetup.js
import swaggerUi from "swagger-ui-express";
import { generateSequelizeSchemas } from "./swagger-model-generator.js";
import { extractRequestKeysFromHandler, extractResponseKeysFromHandler, detectValidatorLibrary } from "./swagger-inspector.js";
import { exampleFromKeys } from "./swagger-example-generator.js";
import { writeSwaggerJson } from "./swagger-writer.js";
import { scanControllers } from "./swagger-controller-scanner.js";

export async function setupSwagger(app) {
  const baseUrl = process.env.BASE_URL || "";

  const paths = {};
  const schemas = await generateSequelizeSchemas();

  // 🔍 Automatically scan controllers and build function-to-controller mapping
  console.log("🔍 Scanning controllers...");
  const controllerMap = await scanControllers();
  console.log(`✅ Found ${Object.keys(controllerMap).length} controller functions mapped to ${new Set(Object.values(controllerMap)).size} controllers`);

  const stack = app._router && app._router.stack ? app._router.stack : [];

  // Helper to extract controller name from handler function and route path
  const getControllerTag = (handler, routePath = "") => {
    // Priority 1: Try to extract from handler function name (most reliable)
    if (handler && typeof handler === 'function') {
      const functionName = handler.name || "";
      
      // Check if this function is in our controller map
      if (functionName && controllerMap[functionName]) {
        return controllerMap[functionName];
      }
      
      // Also try without "Controller" suffix (for cases where function name might be different)
      // e.g., if function is "register" but map has "registerController"
      const functionNameWithSuffix = functionName + "Controller";
      if (controllerMap[functionNameWithSuffix]) {
        return controllerMap[functionNameWithSuffix];
      }
    }

    // Priority 2: Try to infer from route path structure
    // e.g., "/auth/register" -> "Auth Controller"
    // Skip common base paths like "api"
    if (routePath) {
      const pathSegments = routePath.split("/").filter(seg => seg && !seg.startsWith(":"));
      // Filter out common base paths
      const skipPaths = ['api', 'v1', 'v2'];
      const meaningfulSegments = pathSegments.filter(seg => !skipPaths.includes(seg.toLowerCase()));
      
      if (meaningfulSegments.length > 0) {
        const firstSegment = meaningfulSegments[0];
        // Convert to Title Case: "auth" -> "Auth"
        const controllerName = firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
        return `${controllerName} Controller`;
      } else if (pathSegments.length > 0) {
        // If only base paths, use the first one
        const firstSegment = pathSegments[0];
        const controllerName = firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1);
        return `${controllerName} Controller`;
      }
    }

    // Priority 3: Fallback to function name if available
    if (handler && typeof handler === 'function') {
      const functionName = handler.name || "";
      if (functionName) {
        // Remove "Controller" suffix and format
        const controllerName = functionName.replace(/Controller$/i, "");
        if (controllerName) {
          // Convert camelCase to Title Case
          const formatted = controllerName
            .replace(/([A-Z])/g, " $1")
            .trim()
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
          return `${formatted} Controller`;
        }
      }
    }
    
    return "api";
  };

  // Helper to get the FULL path including nested router prefixes
  const getFullPath = (layer, routePath) => {
    // Start with the route path
    let fullPath = routePath;
    
    // If this is a nested router, need to get parent route's path
    // Express stores this in layer.regexp or we need to track parent paths
    // For simplicity, we'll just use the routePath as-is since 
    // registerRoutes already applied BASE_URL
    
    return fullPath;
  };

  for (const layer of stack) {
    // case: a route layer
    if (layer.route && layer.route.path) {
      const routePath = layer.route.path;
      
      // ⚠️ CRITICAL FIX: Use the route path AS-IS, don't add BASE_URL
      // The routes are already prefixed with BASE_URL in registerRoutes
      const fp = routePath;
      
      const methods = Object.keys(layer.route.methods || {});
      const stackArr = layer.route.stack || [];

      paths[fp] = paths[fp] || {};

      // pick first handler (main controller) for request/response analysis
      const handler = stackArr.length ? stackArr[stackArr.length - 1].handle : null;

      const reqKeys = extractRequestKeysFromHandler(handler);
      const respKeys = extractResponseKeysFromHandler(handler);
      const validators = detectValidatorLibrary(stackArr);

      // Filter out "reqData" from keys to prevent it from appearing in schema/examples
      // "reqData" is the wrapper property, not a field inside it
      const filteredReqKeys = reqKeys.filter(k => k !== "reqData" && k.toLowerCase() !== "reqdata");

      // build requestBody schema
      const requestSchema = filteredReqKeys.length ? {
        type: "object",
        properties: {
          reqData: {
            type: "object",
            properties: filteredReqKeys.reduce((acc, k) => (acc[k] = { type: "string" }, acc), {})
          }
        }
      } : { 
        type: "object",
        properties: {
          reqData: {
            type: "object"
          }
        }
      };

      // build response schema
      let responseSchema = null;
      if (respKeys.length) {
        responseSchema = {
          type: "object",
          properties: respKeys.reduce((acc, k) => (acc[k] = { type: "string" }, acc), {})
        };
      } else {
        const routeLower = routePath.toLowerCase();
        const schemaNames = Object.keys(schemas || {});
        const found = schemaNames.find(n => routeLower.includes(n.toLowerCase().replace(/model$/,'').replace(/s$/,'')));
        if (found) responseSchema = schemas[found];
      }

      // create examples - use filtered keys to avoid including "reqData" in the inner object
      const reqExample = filteredReqKeys.length ? exampleFromKeys(filteredReqKeys) : {};
      const respExample = responseSchema ? exampleFromKeys(Object.keys(responseSchema.properties || {})) : {};

      for (const m of methods) {
        const method = m.toLowerCase();
        const tag = getControllerTag(handler, fp);

        paths[fp][method] = {
          tags: [tag],
          summary: `${method.toUpperCase()} ${fp}`,
          security: [{ BearerAuth: [] }],
          ...(reqKeys.length ? {
            requestBody: {
              required: false,
              content: {
                "application/json": {
                  schema: requestSchema,
                  example: { reqData: reqExample }
                }
              }
            }
          } : {}),
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: responseSchema || { type: "object" },
                  example: respExample
                }
              }
            }
          }
        };

        if (validators && validators.length) {
          paths[fp][method].x_validators = validators;
        }
      }
    }

    // case: router with nested stack (mounted routers)
    if (layer.name === "router" && layer.handle && layer.handle.stack) {
      // Get the parent route path if this router is mounted
      const parentPath = layer.path || "/";
      
      for (const sub of layer.handle.stack) {
        if (!sub.route) continue;
        const routePath = sub.route.path;
        
        // ⚠️ CRITICAL FIX: Combine parentPath and routePath, but don't add BASE_URL
        // parentPath might already contain BASE_URL from registerRoutes
        const fp = `${parentPath}${parentPath.endsWith("/") || routePath.startsWith("/") ? "" : "/"}${routePath}`.replace(/\/{2,}/g, "/");
        
        const methods = Object.keys(sub.route.methods || {});
        const stackArr = sub.route.stack || [];

        paths[fp] = paths[fp] || {};

        const handler = stackArr.length ? stackArr[stackArr.length - 1].handle : null;

        const reqKeys = extractRequestKeysFromHandler(handler);
        const respKeys = extractResponseKeysFromHandler(handler);
        const validators = detectValidatorLibrary(stackArr);

        // Filter out "reqData" from keys to prevent it from appearing in schema/examples
        // "reqData" is the wrapper property, not a field inside it
        const filteredReqKeys = reqKeys.filter(k => k !== "reqData" && k.toLowerCase() !== "reqdata");

        // build requestBody schema
        const requestSchema = filteredReqKeys.length ? {
          type: "object",
          properties: {
            reqData: {
              type: "object",
              properties: filteredReqKeys.reduce((acc, k) => (acc[k] = { type: "string" }, acc), {})
            }
          }
        } : { 
          type: "object",
          properties: {
            reqData: {
              type: "object"
            }
          }
        };

        let responseSchema = null;
        if (respKeys.length) {
          responseSchema = {
            type: "object",
            properties: respKeys.reduce((acc, k) => (acc[k] = { type: "string" }, acc), {})
          };
        } else {
          const routeLower = routePath.toLowerCase();
          const schemaNames = Object.keys(schemas || {});
          const found = schemaNames.find(n => routeLower.includes(n.toLowerCase().replace(/model$/,'').replace(/s$/,'')));
          if (found) responseSchema = schemas[found];
        }

        // create examples - use filtered keys to avoid including "reqData" in the inner object
        const reqExample = filteredReqKeys.length ? exampleFromKeys(filteredReqKeys) : {};
        const respExample = responseSchema ? exampleFromKeys(Object.keys(responseSchema.properties || {})) : {};

        for (const m of methods) {
          const method = m.toLowerCase();
          const tag = getControllerTag(handler, fp);

          paths[fp][method] = {
            tags: [tag],
            summary: `${method.toUpperCase()} ${fp}`,
            security: [{ BearerAuth: [] }],
            ...(reqKeys.length ? {
              requestBody: {
                required: false,
                content: {
                  "application/json": {
                    schema: requestSchema,
                    example: { reqData: reqExample }
                  }
                }
              }
            } : {}),
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: responseSchema || { type: "object" },
                    example: respExample
                  }
                }
              }
            }
          };

          if (validators && validators.length) {
            paths[fp][method].x_validators = validators;
          }
        }
      }
    }
  }

  // Collect all unique tags for proper tag definitions
  const allTags = new Set();
  Object.values(paths).forEach((pathMethods) => {
    Object.values(pathMethods).forEach((methodDef) => {
      if (methodDef.tags && Array.isArray(methodDef.tags)) {
        methodDef.tags.forEach((tag) => allTags.add(tag));
      }
    });
  });

  // Convert tags set to array with descriptions
  const tags = Array.from(allTags)
    .sort()
    .map((tag) => ({
      name: tag,
      description: `Endpoints for ${tag}`
    }));

  const swaggerDoc = {
    openapi: "3.0.0",
    info: {
      title: "GroupChatBackend API",
      version: "1.0.0",
      description: "Auto-generated OpenAPI 3 docs (best-effort)."
    },
    servers: [{ url: baseUrl || "/" }],
    tags,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
      schemas
    },
    paths
  };

  try {
    writeSwaggerJson(swaggerDoc);
  } catch (e) {
    console.warn("Could not write swagger.json:", e.message);
  }

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  console.log("📘 Swagger UI available at: /docs");
}