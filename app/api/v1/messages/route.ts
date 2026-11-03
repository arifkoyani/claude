import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";


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
      Accept: "text/event-stream, application/json",
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

// In-memory active conversation ID map for persistent session
let activeClaudeSessionId: string | null = null;

export async function POST(request: NextRequest) {
  const { baseUrl, orgId, headers } = getClaudeConfig();

  try {
    const body = await request.json();
    const { messages = [], model = "claude-sonnet-5-5", system } = body;

    // Extract the latest prompt from the messages array
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    let promptText = "";

    if (lastUserMsg) {
      if (typeof lastUserMsg.content === "string") {
        promptText = lastUserMsg.content;
      } else if (Array.isArray(lastUserMsg.content)) {
        promptText = lastUserMsg.content
          .filter((c: any) => c.type === "text" && c.text)
          .map((c: any) => c.text)
          .join("\n");
      }
    }

    if (!promptText) {
      promptText = "Hello";
    }

    // Prepend system prompt if provided
    if (system && typeof system === "string" && !activeClaudeSessionId) {
      promptText = `[System Instructions: ${system}]\n\n${promptText}`;
    }

    // Ensure we have an active conversation on the mirror
    if (!activeClaudeSessionId) {
      const newUuid = crypto.randomUUID();
      const createRes = await fetch(`${baseUrl}/api/organizations/${orgId}/chat_conversations`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uuid: newUuid, name: "Claude Code CLI Session" }),
      });

      const responseText = await createRes.text();

      // Check if session expired and returned HTML login page
      if (
        createRes.headers.get("content-type")?.includes("text/html") ||
        responseText.trim().startsWith("<!DOCTYPE") ||
        responseText.trim().startsWith("<html")
      ) {
        return NextResponse.json(
          {
            type: "error",
            error: {
              type: "authentication_error",
              message:
                "Your session on claude.toolznex.com has expired! Please log into claude.toolznex.com in your browser, copy the new SESSION_TOKEN and PHPSESSID into your caulde/.env file.",
            },
          },
          { status: 401 }
        );
      }

      if (!createRes.ok) {
        return NextResponse.json(
          {
            type: "error",
            error: {
              type: "api_error",
              message: `Failed to create conversation: ${responseText}`,
            },
          },
          { status: createRes.status }
        );
      }

      try {
        const newConv = JSON.parse(responseText);
        activeClaudeSessionId = newConv.uuid || newUuid;
      } catch {
        activeClaudeSessionId = newUuid;
      }
    }

    // Send completion request with session cookies to claude.toolznex.com
    const completionUrl = `${baseUrl}/api/organizations/${orgId}/chat_conversations/${activeClaudeSessionId}/completion`;
    const completionRes = await fetch(completionUrl, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: promptText,
        timezone: "UTC",
        model: model || "claude-sonnet-5-5",
        attachments: [],
        files: [],
      }),
    });

    if (!completionRes.ok || completionRes.headers.get("content-type")?.includes("text/html")) {
      const errText = await completionRes.text();
      const isHtml = errText.trim().startsWith("<!DOCTYPE") || errText.trim().startsWith("<html");
      return NextResponse.json(
        {
          type: "error",
          error: {
            type: "authentication_error",
            message: isHtml
              ? "Your session on claude.toolznex.com has expired! Please update SESSION_TOKEN and PHPSESSID in .env."
              : `Claude mirror returned ${completionRes.status}: ${errText}`,
          },
        },
        { status: isHtml ? 401 : completionRes.status }
      );
    }

    if (!completionRes.body) {
      return NextResponse.json(
        { type: "error", error: { message: "No response body received" } },
        { status: 500 }
      );
    }

    // Pipe the SSE stream directly back to Claude Code
    return new Response(completionRes.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        type: "error",
        error: {
          type: "api_error",
          message: err.message || "Failed to proxy message to Claude mirror",
        },
      },
      { status: 500 }
    );
  }
}

