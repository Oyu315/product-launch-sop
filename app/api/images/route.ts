import { env } from "cloudflare:workers";

const MAX_IMAGE_BYTES = 10_000_000;
const MAX_REDIRECTS = 3;

type RuntimeEnv = {
  SOP_EDITOR_KEY?: string;
  UPLOADS?: R2Bucket;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Editor-Key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function runtimeEnv() {
  return env as RuntimeEnv;
}

function hasEditorAccess(request: Request) {
  const configuredKey = runtimeEnv().SOP_EDITOR_KEY;
  const suppliedKey = request.headers.get("X-Editor-Key") ?? "";
  return Boolean(configuredKey && suppliedKey && suppliedKey === configuredKey);
}

function json(payload: unknown, init: ResponseInit = {}) {
  return Response.json(payload, {
    ...init,
    headers: { ...corsHeaders, ...init.headers },
  });
}

function imageExtension(contentType: string) {
  const extensions: Record<string, string> = {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  return extensions[contentType.toLowerCase()] ?? "img";
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;

  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
}

function validateRemoteImageUrl(rawUrl: string, base?: string) {
  const url = new URL(rawUrl, base);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || isPrivateHostname(url.hostname)) {
    throw new Error("不支持导入该图片地址");
  }
  return url;
}

async function readLimitedBody(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_IMAGE_BYTES) throw new Error("图片超过 10MB");
  if (!response.body) throw new Error("图片内容为空");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("图片超过 10MB");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function fetchRemoteImage(rawUrl: string) {
  let url = validateRemoteImageUrl(rawUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(url, { redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new Error("图片地址重定向过多");
      url = validateRemoteImageUrl(location, url.toString());
      continue;
    }
    if (!response.ok) throw new Error("无法读取复制的网页图片");
    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (!contentType.startsWith("image/")) throw new Error("复制的内容不是图片");
    return { bytes: await readLimitedBody(response), contentType, sourceUrl: url.toString() };
  }
  throw new Error("无法读取复制的网页图片");
}

function uploadedImageUrl(request: Request, key: string) {
  const url = new URL("/api/images", request.url);
  url.searchParams.set("id", key);
  return url.toString();
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("id");
  const bucket = runtimeEnv().UPLOADS;
  if (!key || !bucket) return json({ error: "图片不存在" }, { status: 404 });

  const object = await bucket.get(key);
  if (!object) return json({ error: "图片不存在" }, { status: 404 });

  const headers = new Headers(corsHeaders);
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

export async function POST(request: Request) {
  if (!hasEditorAccess(request)) {
    return json({ error: "编辑密钥无效" }, { status: 401 });
  }

  const bucket = runtimeEnv().UPLOADS;
  if (!bucket) return json({ error: "图片存储尚未配置" }, { status: 503 });

  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = (await request.json()) as { imageUrl?: unknown };
      if (typeof body.imageUrl !== "string" || !body.imageUrl.trim()) {
        return json({ error: "图片地址无效" }, { status: 400 });
      }

      const remoteImage = await fetchRemoteImage(body.imageUrl.trim());
      const key = `sop-images/${crypto.randomUUID()}.${imageExtension(remoteImage.contentType)}`;
      await bucket.put(key, remoteImage.bytes, {
        httpMetadata: { contentType: remoteImage.contentType },
        customMetadata: { sourceUrl: remoteImage.sourceUrl.slice(0, 1000) },
      });
      return json({ url: uploadedImageUrl(request, key) }, { status: 201 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return json({ error: "请选择图片文件" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return json({ error: "图片超过 10MB" }, { status: 413 });
    }

    const extension = imageExtension(file.type);
    const key = `sop-images/${crypto.randomUUID()}.${extension}`;
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name.slice(0, 180) },
    });

    return json({ url: uploadedImageUrl(request, key) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片上传失败";
    return json({ error: message }, { status: 500 });
  }
}
