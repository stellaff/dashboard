function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function decryptData(password) {
  const { salt, iv, iterations, data } = ENCRYPTED_DATA;

  const saltBytes = base64ToBytes(salt);
  const ivBytes = base64ToBytes(iv);
  const encryptedBytes = base64ToBytes(data);

  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    "raw", passwordBytes, "PBKDF2", false, ["deriveKey"]
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes },
      aesKey,
      encryptedBytes
    );
    const jsonStr = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error("Incorrect password");
  }
}
