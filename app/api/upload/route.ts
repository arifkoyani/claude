import { NextRequest, NextResponse } from "next/server";

function getClaudeConfig() {
  const baseUrl = process.env.CLAUDE_BASE_URL || "https://claude.toolznex.com";
  const ajs = process.env.AJS_ANONYMOUS_ID || "claudeai.v1.ef3f5178-15ac-4e04-b49c-23d7f32674a7";
  const amember = process.env.AMEMBER_NR || "a52ade708c86928c3b100fdd2a1555aa";
  const artifact = process.env.ARTIFACT_APP_VIEWER || "1";
  const colorScheme = process.env.CH_PREFERS_COLOR_SCHEME || "dark";
  const org = process.env.LAST_ACTIVE_ORG || "51fb24b0-6628-4bc2-b624-468455e6420b";
  const phpsessid = process.env.PHPSESSID || "b125e83c9cbeb16b7128e5b73e3a04c2";
  const sessionToken = process.env.SESSION_TOKEN || "MTc5MzczMTM5OC40OTcyODE2";
  const sidebar = process.env.USER_SIDEBAR_VISIBLE_ON_LOAD || "false";

  const cookie = `ajs_anonymous_id=${ajs}; amember_nr=${amember}; artifact-app-viewer=${artifact}; CH-prefers-color-scheme=${colorScheme}; lastActiveOrg=${org}; PHPSESSID=${phpsessid}; session_token=${sessionToken}; user-sidebar-visible-on-load=${sidebar}`;

  return {
    baseUrl,
    orgId: org,
    headers: {
      Accept: "application/json",
      Referer: `${baseUrl}/`,
      Origin: baseUrl,
      "anthropic-client-platform": "web_claude_ai",
      "anthropic-client-version": "1.0.0",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Cookie: cookie,
    },
  };
}

export async function POST(request: NextRequest) {
  const { baseUrl, orgId, headers } = getClaudeConfig();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forward file to Claude ToolzNex upload endpoint
    const uploadUrl = `${baseUrl}/api/organizations/${orgId}/upload`;
    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name);

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        ...headers,
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

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to upload file to Claude" },
      { status: 500 }
    );
  }
}

