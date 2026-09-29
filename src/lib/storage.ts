import "server-only";
import { createHash, createHmac } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type StorageProvider = "local" | "s3";

// STORAGE_PROVIDER selects the driver. Local writes under STORAGE_LOCAL_DIR;
// s3 talks to any S3-compatible endpoint with a signed fetch request.
export function currentStorageProvider(): StorageProvider {
  return process.env.STORAGE_PROVIDER?.trim().toLowerCase() === "s3"
    ? "s3"
    : "local";
}

function storageBucket() {
  return process.env.STORAGE_BUCKET?.trim() || "reaksan";
}

function assertSafeKey(key: string) {
  if (
    !key ||
    key.includes("\0") ||
    key.includes("..") ||
    key.startsWith("/") ||
    key.startsWith("\\") ||
    path.isAbsolute(key)
  ) {
    throw new Error("Storage key is not allowed.");
  }
}

function localRoot() {
  // Local storage is a development driver; production uses S3-compatible
  // object storage. The path is runtime-configured, so opt out of build-time
  // filesystem tracing instead of bundling the whole project.
  return path.resolve(
    /*turbopackIgnore: true*/
    process.env.STORAGE_LOCAL_DIR?.trim() ||
      path.join(process.cwd(), ".data", "uploads"),
  );
}

function localPath(key: string) {
  assertSafeKey(key);
  const root = localRoot();
  const target = path.resolve(root, key);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error("Storage key is not allowed.");
  }
  return target;
}

export async function putObject(
  key: string,
  bytes: Uint8Array,
  contentType: string,
) {
  if (currentStorageProvider() === "s3") {
    const response = await s3Request("PUT", key, bytes, contentType);
    if (!response.ok)
      throw new Error(
        `Object storage upload failed with status ${response.status}.`,
      );
    return;
  }
  const target = localPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

export async function getObject(key: string): Promise<Uint8Array | null> {
  if (currentStorageProvider() === "s3") {
    const response = await s3Request("GET", key);
    if (response.status === 404) return null;
    if (!response.ok)
      throw new Error(
        `Object storage read failed with status ${response.status}.`,
      );
    return new Uint8Array(await response.arrayBuffer());
  }
  try {
    const file = await readFile(/*turbopackIgnore: true*/ localPath(key));
    return new Uint8Array(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteObject(key: string) {
  if (currentStorageProvider() === "s3") {
    const response = await s3Request("DELETE", key);
    if (response.status === 404) return;
    if (!response.ok)
      throw new Error(
        `Object storage delete failed with status ${response.status}.`,
      );
    return;
  }
  try {
    await unlink(localPath(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

type S3Config = {
  host: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

function s3Config(): S3Config {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const missing = [
    ["S3_ENDPOINT", endpoint],
    ["S3_ACCESS_KEY_ID", accessKeyId],
    ["S3_SECRET_ACCESS_KEY", secretAccessKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `S3 storage is selected but these variables are missing: ${missing.join(", ")}.`,
    );
  }
  return {
    host: endpoint!.replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
    region: process.env.S3_REGION?.trim() || "us-east-1",
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket: storageBucket(),
  };
}

function sha256Hex(data: string | Uint8Array) {
  return createHash("sha256").update(data).digest("hex");
}

function sign(key: string | Uint8Array, data: string) {
  return createHmac("sha256", key).update(data).digest();
}

function awsEncode(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

// Minimal AWS Signature V4 signer for path-style S3 requests. Credentials are
// only used to compute the Authorization header and are never logged.
async function s3Request(
  method: "GET" | "PUT" | "DELETE",
  key: string,
  body?: Uint8Array,
  contentType?: string,
) {
  assertSafeKey(key);
  const config = s3Config();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body ?? new Uint8Array());
  const canonicalUri = `/${awsEncode(config.bucket)}/${key
    .split("/")
    .map(awsEncode)
    .join("/")}`;
  const canonicalHeaders = [
    `host:${config.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = sign(
    sign(
      sign(sign(`AWS4${config.secretAccessKey}`, dateStamp), config.region),
      "s3",
    ),
    "aws4_request",
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");
  const headers: Record<string, string> = {
    host: config.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
  if (contentType) headers["content-type"] = contentType;
  return fetch(`https://${config.host}${canonicalUri}`, {
    method,
    headers,
    body: body as unknown as BodyInit | undefined,
  });
}
