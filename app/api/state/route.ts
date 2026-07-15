import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { sharedState } from "../../../db/schema";

const STATE_ID = "main";
const MAX_STATE_BYTES = 4_000_000;

type RuntimeEnv = {
  SOP_EDITOR_KEY?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Editor-Key",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Cache-Control": "no-store",
};

function hasEditorAccess(request: Request) {
  const configuredKey = (env as RuntimeEnv).SOP_EDITOR_KEY;
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
  try {
    const db = getDb();
    const [row] = await db.select().from(sharedState).where(eq(sharedState.id, STATE_ID)).limit(1);

    return json({
      state: row ? JSON.parse(row.payload) : null,
      updatedAt: row?.updatedAt ?? null,
      canEdit: hasEditorAccess(request),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取共享数据失败";
    return json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!hasEditorAccess(request)) {
    return json({ error: "编辑密钥无效" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { state?: unknown };
    if (!body.state || typeof body.state !== "object" || Array.isArray(body.state)) {
      return json({ error: "共享数据格式无效" }, { status: 400 });
    }

    const payload = JSON.stringify(body.state);
    if (new TextEncoder().encode(payload).byteLength > MAX_STATE_BYTES) {
      return json({ error: "共享数据过大，请删除内嵌的大图片后重试" }, { status: 413 });
    }

    const updatedAt = new Date().toISOString();
    const db = getDb();
    await db
      .insert(sharedState)
      .values({ id: STATE_ID, payload, updatedAt })
      .onConflictDoUpdate({
        target: sharedState.id,
        set: { payload, updatedAt },
      });

    return json({ ok: true, updatedAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存共享数据失败";
    return json({ error: message }, { status: 500 });
  }
}
