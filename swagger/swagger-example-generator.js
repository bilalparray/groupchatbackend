// ./swagger/swagger-example-generator.js

export function exampleFromKeys(keys) {
  const example = {};
  for (const k of keys) {
    // Skip "reqData" - it's a wrapper property, not a field
    if (k === "reqData" || k.toLowerCase() === "reqdata") {
      continue;
    }
    
    if (/id$/i.test(k)) example[k] = 1;
    else if (/count|age|price|amount|total/i.test(k)) example[k] = 123;
    else if (/email/i.test(k)) example[k] = "user@example.com";
    else if (/token|access|refresh/i.test(k)) example[k] = "eyJhbGciOi...";
    // More specific date pattern to avoid matching "reqData" (which contains "at")
    else if (/(?:^|\b)(date|createdAt|updatedAt|deletedAt|lastLoginAt|expiresAt|tokenExpiry|resetTokenExpiry)(?:\b|$)/i.test(k)) {
      example[k] = new Date().toISOString();
    }
    else if (/is|has|enabled|active/i.test(k)) example[k] = true;
    else example[k] = `string_${k}`;
  }
  return example;
}
