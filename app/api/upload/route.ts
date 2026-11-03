import { NextRequest, NextResponse } from "next/server";

function getClaudeConfig() {
  const baseUrl = process.env.CLAUDE_BASE_URL || "https://claude.toolznex.com";
  const ajs = process.env.AJS_ANONYMOUS_ID || "claudeai.v1.8342af65-7d95-470d-82f1-f43ba12b973b";
  const amember = process.env.AMEMBER_NR || "7900304f2d2ef9747281c443e93049bb";
  const artifact = process.env.ARTIFACT_APP_VIEWER || "1";
  const colorScheme = process.env.CH_PREFERS_COLOR_SCHEME || "dark";
  const org = process.env.LAST_ACTIVE_ORG || "51fb24b0-6628-4bc2-b624-468455e6420b";
  const phpsessid = process.env.PHPSESSID || "b125e83c9cbeb16b7128e5b73e3a04c2";
  const sessionToken = process.env.SESSION_TOKEN || "MTc5Mzc0NTg5OS4wMTkyMDg=";
  const sidebar = process.env.USER_SIDEBAR_VISIBLE_ON_LOAD || "false";

  const cookie = `PHPSESSID=${phpsessid}; amember_nr=${amember}; session_token=${sessionToken}; ajs_anonymous_id=${ajs}; CH-prefers-color-scheme=${colorScheme}; lastActiveOrg=${org}; artifact-app-viewer=${artifact}; user-sidebar-visible-on-load=${sidebar}`;

  return {
    baseUrl,
    orgId: org,
    cookie,
  };
}

export async function POST(request: NextRequest) {
  const { baseUrl, orgId, cookie } = getClaudeConfig();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationId = (formData.get("conversationId") as string) || crypto.randomUUID();

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forward file to the verified ToolzNex upload endpoint
    const uploadUrl = `${baseUrl}/api/organizations/${orgId}/conversations/${conversationId}/wiggle/upload-file`;
    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name);
    upstreamFormData.append("client_upload_id", crypto.randomUUID());
    upstreamFormData.append("reuse_first_upload", "true");

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Cookie: cookie,
        Accept: "*/*",
        Origin: baseUrl,
        Referer: `${baseUrl}/`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: upstreamFormData,
    });

    const responseText = await res.text();

    if (
      res.headers.get("content-type")?.includes("text/html") ||
      responseText.trim().startsWith("<!DOCTYPE") ||
      responseText.trim().startsWith("<html")
    ) {
      return NextResponse.json(
        {
          error:
            "Your session on claude.toolznex.com has expired! Please update SESSION_TOKEN and PHPSESSID in .env.",
        },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upload failed with status ${res.status}: ${responseText}` },
        { status: res.status }
      );
    }

    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    // Also prepare base64/dataURI for client preview and fallback
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const isImage = file.type.startsWith("image/");
    const mime = file.type || (isImage ? "image/jpeg" : "text/plain");

    return NextResponse.json({
      ...data,
      file_uuid: data.file_uuid || data.uuid,
      file_name: data.file_name || file.name,
      file_size: data.size_bytes || file.size,
      file_type: mime,
      file_kind: isImage ? "image" : "document",
      extracted_content: isImage
        ? `data:${mime};base64,${buffer.toString("base64")}`
        : buffer.toString("utf-8"),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process attached file" },
      { status: 500 }
    );
  }
}
