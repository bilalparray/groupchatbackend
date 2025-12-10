// ./swagger/swagger-inspector.js
/**
 * A set of heuristics to inspect a route handler function's source code
 * and extract:
 *  - request body keys (from destructuring)
 *  - response keys used in sendSuccess(res, { ... })
 *  - whether Joi/Yup/express-validator is used (very basic)
 *
 * These are best-effort heuristics and will work well with the coding
 * patterns you provided in sample controllers (req.body.reqData destructuring
 * and sendSuccess(res, {...}) usage).
 */

export function extractRequestKeysFromHandler(fn) {
  if (!fn || typeof fn !== "function") return [];
  const src = fn.toString();

  const keys = new Set();

  // pattern: const { reqData } = req.body;
  // then: const { username, email } = reqData || {};
  const reqDataMatch = src.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.body/i);
  if (reqDataMatch) {
    // scan for next destructuring from reqData
    const after = src.slice(src.indexOf(reqDataMatch[0]) + reqDataMatch[0].length);
    const deeper = after.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*reqData/i);
    if (deeper) {
      deeper[1].split(",").map(s => s.trim()).forEach(k => {
        if (k) keys.add(k.replace(/=.*$/, "").trim());
      });
    }
  }

  // direct destructuring: const { username, password } = req.body;
  const direct = src.match(/const\s*\{\s*([^}]+)\s*\}\s*=\s*req\.body/i);
  if (direct) {
    direct[1].split(",").map(s => s.trim()).forEach(k => {
      if (k) keys.add(k.replace(/=.*$/, "").trim());
    });
  }

  // fallback: find property accesses like req.body.username or req.body.reqData.username
  const propRegex = /req\.body(?:\.[\w$]+)*\.?([a-zA-Z_$][\w$]*)/g;
  let m;
  while ((m = propRegex.exec(src))) {
    if (m[1] && m[1] !== "reqData") keys.add(m[1]);
  }

  // Filter out "reqData" from keys to prevent it from appearing in examples
  const filteredKeys = Array.from(keys).filter(k => k !== "reqData" && k.toLowerCase() !== "reqdata");
  return filteredKeys;
}

export function extractResponseKeysFromHandler(fn) {
  if (!fn || typeof fn !== "function") return [];
  const src = fn.toString();

  // Look for sendSuccess(res, { ... })
  const match = src.match(/sendSuccess\(\s*res\s*,\s*\{([\s\S]*?)\}\s*(?:,|\))/m);
  if (match) {
    const body = match[1];
    // rough parse keys like username: user.username, role, email
    const keyRegex = /([a-zA-Z_$][\w$-]*)\s*:/g;
    const keys = new Set();
    let mm;
    while ((mm = keyRegex.exec(body))) {
      keys.add(mm[1]);
    }
    // also capture lone identifiers like sendSuccess(res, { message })
    const loneRegex = /{[^}]*\b([a-zA-Z_$][\w$]*)\b[^}]*}/;
    const lone = body.match(loneRegex);
    if (lone) keys.add(lone[1]);

    return Array.from(keys);
  }

  // Fallback: look for `return res.json({...})` or `res.json({...})`
  const jsonMatch = src.match(/res\.json\(\s*\{([\s\S]*?)\}\s*\)/m);
  if (jsonMatch) {
    const body = jsonMatch[1];
    const keyRegex = /([a-zA-Z_$][\w$-]*)\s*:/g;
    const keys = new Set();
    let mm;
    while ((mm = keyRegex.exec(body))) {
      keys.add(mm[1]);
    }
    return Array.from(keys);
  }

  return [];
}

export function detectValidatorLibrary(fnOrStack) {
  // Accept either a function or an array of middleware functions (stack)
  const checks = [];

  const scanSrc = (src) => {
    if (!src) return;
    if (src.includes("Joi.") || src.includes("joi.")) checks.push("joi");
    if (src.includes("yup.") || src.includes("Yup.")) checks.push("yup");
    if (src.includes("express-validator") || src.includes("check(") || src.includes("body(")) checks.push("express-validator");
    if (src.includes(".validate(") && (src.includes("Joi") || src.includes("joi"))) checks.push("joi");
  };

  if (Array.isArray(fnOrStack)) {
    for (const fn of fnOrStack) {
      if (typeof fn === "function") scanSrc(fn.toString());
    }
  } else if (typeof fnOrStack === "function") {
    scanSrc(fnOrStack.toString());
  }

  return Array.from(new Set(checks));
}
