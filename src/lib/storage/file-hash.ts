function toHexHash(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function computeBufferHash(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API is not available for file hashing.");
  }

  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return toHexHash(digest);
}

export async function computeFileHash(file: Blob): Promise<string> {
  return computeBufferHash(await file.arrayBuffer());
}
