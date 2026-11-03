import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function readEnvFile(): Record<string, string> {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const parsed: Record<string, string> = {};
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          parsed[match[1]] = match[2]?.trim().replace(/^['"]|['"]$/g, "") || "";
        }
      }
      return parsed;
    }
  } catch {}
  return {};
}

function getClaudeConfig() {
  const env = readEnvFile();
  const baseUrl = env.CLAUDE_BASE_URL || process.env.CLAUDE_BASE_URL || "https://claude.toolznex.com";
  const ajs = env.AJS_ANONYMOUS_ID || process.env.AJS_ANONYMOUS_ID || "claudeai.v1.13b1ef19-44dd-4573-8d3d-296457ea93dc";
  const amember = env.AMEMBER_NR || process.env.AMEMBER_NR || "7900304f2d2ef9747281c443e93049bb";
  const artifact = env.ARTIFACT_APP_VIEWER || process.env.ARTIFACT_APP_VIEWER || "1";
  const colorScheme = env.CH_PREFERS_COLOR_SCHEME || process.env.CH_PREFERS_COLOR_SCHEME || "dark";
  const org = env.LAST_ACTIVE_ORG || process.env.LAST_ACTIVE_ORG || "51fb24b0-6628-4bc2-b624-468455e6420b";
  const phpsessid = env.PHPSESSID || process.env.PHPSESSID || "b125e83c9cbeb16b7128e5b73e3a04c2";
  const sessionToken = env.SESSION_TOKEN || process.env.SESSION_TOKEN || "MTc5Mzc0NTg5OS4wMTkyMDg=";
  const sidebar = env.USER_SIDEBAR_VISIBLE_ON_LOAD || process.env.USER_SIDEBAR_VISIBLE_ON_LOAD || "false";

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
    const conversationId = (formData.get("conversationId") as string) || "179735f2-87af-448e-8956-4723fc61c443";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isImage = file.type.startsWith("image/");
    const isTextDoc =
      !isImage ||
      /\.(txt|py|json|csv|md|js|ts|tsx|jsx|html|css|yaml|yml|sql|sh|env|log)$/i.test(
        file.name
      );

    // If it's a text/code document, extract directly as UTF-8
    // This allows instant, reliable file processing without upstream upload limits/session drops
    if (isTextDoc && !isImage) {
      const text = await file.text();
      return NextResponse.json({
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "text/plain",
        file_kind: "document",
        extracted_content: text,
      });
    }

    // For images, forward to ToolzNex upload endpoint if possible, and also return local base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = file.type || "image/jpeg";
    const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;

    let uploadedData: any = {};
    try {
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
      if (res.ok && !responseText.trim().startsWith("<!DOCTYPE")) {
        uploadedData = JSON.parse(responseText);
      }
    } catch {}

    return NextResponse.json({
      ...uploadedData,
      file_name: file.name,
      file_size: file.size,
      file_type: mime,
      file_kind: "image",
      extracted_content: dataUri,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process attached file" },
      { status: 500 }
    );
  }
}
