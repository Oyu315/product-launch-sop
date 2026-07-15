import { env } from "cloudflare:workers";

const MAX_IMAGE_BYTES = 10_000_000;

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
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return json({ error: "请选择图片文件" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return json({ error: "图片超过 10MB" }, { status: 413 });
    }

    const extension = file.type === "image/webp" ? "webp" : file.type.split("/")[1]?.replace("jpeg", "jpg") || "img";
    const key = `sop-images/${crypto.randomUUID()}.${extension}`;
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name.slice(0, 180) },
    });

    const url = new URL("/api/images", request.url);
    url.searchParams.set("id", key);
    return json({ url: url.toString() }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片上传失败";
    return json({ error: message }, { status: 500 });
  }
}
