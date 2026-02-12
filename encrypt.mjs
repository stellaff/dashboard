#!/usr/bin/env node
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";

const ITERATIONS = 600000;

// --- Helpers ---

function encrypt(jsonStr, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(jsonStr, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([encrypted, tag]);
  return { salt, iv, payload };
}

function decrypt(encObj, password) {
  const saltBytes = Buffer.from(encObj.salt, "base64");
  const ivBytes = Buffer.from(encObj.iv, "base64");
  const dataBytes = Buffer.from(encObj.data, "base64");
  const iterations = encObj.iterations || ITERATIONS;

  const key = pbkdf2Sync(password, saltBytes, iterations, 32, "sha256");

  // AES-GCM auth tag is the last 16 bytes
  const authTag = dataBytes.subarray(dataBytes.length - 16);
  const ciphertext = dataBytes.subarray(0, dataBytes.length - 16);

  const decipher = createDecipheriv("aes-256-gcm", key, ivBytes);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString("utf-8"));
}

function extractJson(filePath, prefix, suffix) {
  const raw = readFileSync(filePath, "utf-8");
  const jsonStr = raw.replace(prefix, "").replace(suffix, "");
  return JSON.parse(jsonStr);
}

// --- Main ---

// Prompt for password
const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await new Promise((resolve) => {
  rl.question("Enter encryption password: ", (answer) => {
    rl.close();
    resolve(answer);
  });
});

if (!password) {
  console.error("Password cannot be empty.");
  process.exit(1);
}

// 1. Decrypt existing encrypted-data.js to get yearly records
let yearlyData;
if (existsSync("encrypted-data.js")) {
  console.log("Decrypting existing encrypted-data.js...");
  const encRaw = readFileSync("encrypted-data.js", "utf-8");
  const encMatch = encRaw.match(/const\s+ENCRYPTED_DATA\s*=\s*(\{[\s\S]+\});?\s*$/);
  if (!encMatch) {
    console.error("Could not parse ENCRYPTED_DATA from encrypted-data.js");
    process.exit(1);
  }
  const encObj = JSON.parse(encMatch[1]);
  try {
    yearlyData = decrypt(encObj, password);
    console.log(`  Decrypted yearly data: ${yearlyData.records?.length || 0} records`);
  } catch (e) {
    console.error("Failed to decrypt encrypted-data.js. Wrong password?", e.message);
    process.exit(1);
  }
} else if (existsSync("data.js")) {
  console.log("Reading data.js...");
  yearlyData = extractJson("data.js", /^const\s+DATA\s*=\s*/, /;\s*$/);
  console.log(`  Parsed yearly data: ${yearlyData.records?.length || 0} records`);
} else {
  console.error("No data source found (need encrypted-data.js or data.js)");
  process.exit(1);
}

// 2. Read monthly data
let monthlyData = { actual: [], forecast: [] };
if (existsSync("monthly-data.js")) {
  console.log("Reading monthly-data.js...");
  monthlyData = extractJson("monthly-data.js", /^window\.MONTHLY_DATA\s*=\s*/, /;\s*$/);
  console.log(`  Parsed monthly data: ${monthlyData.actual?.length || 0} actual, ${monthlyData.forecast?.length || 0} forecast`);
} else {
  console.log("  monthly-data.js not found, using empty monthly data");
}

// 3. Read customer map
let customerMap = { map: {} };
if (existsSync("customer-map.js")) {
  console.log("Reading customer-map.js...");
  customerMap = extractJson("customer-map.js", /^window\.CUSTOMER_MAP\s*=\s*/, /;\s*$/);
  console.log(`  Parsed customer map: ${Object.keys(customerMap.map || {}).length} entries`);
} else {
  console.log("  customer-map.js not found, using empty customer map");
}

// 4. Combine into one payload
const combined = {
  records: yearlyData.records || [],
  monthlyData,
  customerMap
};
const combinedJson = JSON.stringify(combined);
console.log(`\nCombined payload: ${combinedJson.length} bytes`);

// 5. Encrypt
console.log("Encrypting with AES-256-GCM (PBKDF2 600K iterations)...");
const { salt, iv, payload } = encrypt(combinedJson, password);

// 6. Write
const output = `const ENCRYPTED_DATA = ${JSON.stringify({
  salt: salt.toString("base64"),
  iv: iv.toString("base64"),
  iterations: ITERATIONS,
  data: payload.toString("base64")
}, null, 2)};
`;
writeFileSync("encrypted-data.js", output);
console.log(`Wrote encrypted-data.js (${payload.length} bytes payload)`);
