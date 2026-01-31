#!/usr/bin/env node
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const ITERATIONS = 600000;

// Read and parse data.js
const raw = readFileSync("data.js", "utf-8");
const jsonStr = raw.replace(/^const\s+DATA\s*=\s*/, "").replace(/;\s*$/, "");
try {
  JSON.parse(jsonStr);
} catch (e) {
  console.error("Failed to parse DATA from data.js:", e.message);
  process.exit(1);
}

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

// Generate random salt and IV
const salt = randomBytes(16);
const iv = randomBytes(12);

// Derive key via PBKDF2
const key = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");

// Encrypt with AES-256-GCM
const cipher = createCipheriv("aes-256-gcm", key, iv);
const encrypted = Buffer.concat([cipher.update(jsonStr, "utf-8"), cipher.final()]);
const tag = cipher.getAuthTag();
const payload = Buffer.concat([encrypted, tag]);

// Write encrypted output
const output = `const ENCRYPTED_DATA = ${JSON.stringify({
  salt: salt.toString("base64"),
  iv: iv.toString("base64"),
  iterations: ITERATIONS,
  data: payload.toString("base64")
}, null, 2)};
`;
writeFileSync("encrypted-data.js", output);
console.log(`Encrypted ${jsonStr.length} bytes -> encrypted-data.js (${payload.length} bytes payload)`);
