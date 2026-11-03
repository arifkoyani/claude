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
    cookie,
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

// GET: Fetch conversations list or a single conversation by conversationId
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  const list = searchParams.get("list");
  const { baseUrl, orgId, headers } = getClaudeConfig();

  try {
    if (list === "true") {
      const url = `${baseUrl}/api/organizations/${orgId}/chat_conversations`;
      const res = await fetch(url, { headers, cache: "no-store" });
      const text = await res.text();
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        return NextResponse.json(
          { error: "Session on claude.toolznex.com has expired! Please update SESSION_TOKEN and PHPSESSID in .env." },
          { status: 401 }
        );
      }
      if (!res.ok) {
        return NextResponse.json(
          { error: `Claude API returned status ${res.status}: ${text}` },
          { status: res.status }
        );
      }
      const data = JSON.parse(text);
      return NextResponse.json(data);
    }

    const targetConvId = conversationId || "6bc976c1-1f23-4537-93eb-3126794e4715";
    const url = `${baseUrl}/api/organizations/${orgId}/chat_conversations/${targetConvId}?tree=True&rendering_mode=messages&render_all_tools=true&include_inline_comparison=true&renders_source_card=true&consistency=eventual`;

    const res = await fetch(url, { headers, cache: "no-store" });
    const text = await res.text();

    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      return NextResponse.json(
        {
          error:
            "Your session on claude.toolznex.com has expired! Please update SESSION_TOKEN and PHPSESSID in caulde/.env.",
        },
        { status: 401 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Claude API error ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch from Claude API" },
      { status: 500 }
    );
  }
}

// POST: Send a message to a conversation and stream the response
export async function POST(request: NextRequest) {
  const { baseUrl, orgId, headers } = getClaudeConfig();

  try {
    const {
      prompt,
      conversationId: requestedId,
      model = "claude-sonnet-5-5",
      files = [],
    } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing or invalid prompt" }, { status: 400 });
    }

    let conversationId = requestedId;

    // If no conversationId provided, create a new conversation first
    if (!conversationId) {
      const newUuid = crypto.randomUUID();
      const createRes = await fetch(`${baseUrl}/api/organizations/${orgId}/chat_conversations`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uuid: newUuid, name: "" }),
      });

      const createText = await createRes.text();
      if (createText.trim().startsWith("<!DOCTYPE") || createText.trim().startsWith("<html")) {
        return NextResponse.json(
          {
            error:
              "Your session on claude.toolznex.com has expired! Please update SESSION_TOKEN and PHPSESSID in caulde/.env.",
          },
          { status: 401 }
        );
      }

      if (!createRes.ok) {
        return NextResponse.json(
          { error: `Failed to create conversation: ${createText}` },
          { status: createRes.status }
        );
      }

      try {
        const newConv = JSON.parse(createText);
        conversationId = newConv.uuid || newUuid;
      } catch {
        conversationId = newUuid;
      }
    }

    // Clean up file UUIDs for Claude API
    const formattedFiles = Array.isArray(files)
      ? files
          .map((f: any) => (typeof f === "string" ? f : f?.file_uuid || f?.uuid || f?.id))
          .filter(Boolean)
      : [];

    // Call completion endpoint with streaming
    const completionUrl = `${baseUrl}/api/organizations/${orgId}/chat_conversations/${conversationId}/completion`;
    const completionRes = await fetch(completionUrl, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      body: JSON.stringify({
        prompt,
        timezone: "UTC",
        model: model || "claude-sonnet-5-5",
        attachments: [],
        files: formattedFiles,
      }),
    });

    if (!completionRes.ok || completionRes.headers.get("content-type")?.includes("text/html")) {
      const errorText = await completionRes.text();
      const isHtml = errorText.trim().startsWith("<!DOCTYPE") || errorText.trim().startsWith("<html");
      return NextResponse.json(
        {
          error: isHtml
            ? "Your session on claude.toolznex.com has expired! Please update SESSION_TOKEN and PHPSESSID in caulde/.env."
            : `Completion failed with ${completionRes.status}: ${errorText}`,
        },
        { status: isHtml ? 401 : completionRes.status }
      );
    }

    if (!completionRes.body) {
      return NextResponse.json({ error: "No response body from Claude" }, { status: 500 });
    }

    // Stream SSE data and parse text deltas directly to client
    const upstreamReader = completionRes.body.getReader();
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial metadata chunk with conversationId
        controller.enqueue(
          textEncoder.encode(JSON.stringify({ type: "init", conversationId }) + "\n")
        );

        let buffer = "";
        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;

            buffer += textDecoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data:")) {
                const jsonStr = trimmed.slice(5).trim();
                if (!jsonStr) continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  if (
                    parsed.type === "content_block_delta" &&
                    parsed.delta?.type === "text_delta" &&
                    parsed.delta?.text
                  ) {
                    controller.enqueue(
                      textEncoder.encode(
                        JSON.stringify({ type: "delta", text: parsed.delta.text }) + "\n"
                      )
                    );
                  } else if (parsed.type === "message_stop") {
                    controller.enqueue(
                      textEncoder.encode(JSON.stringify({ type: "done" }) + "\n")
                    );
                  }
                } catch {
                  // Ignore JSON parse errors for non-json SSE lines
                }
              }
            }
          }
          controller.close();
        } catch (err: any) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process chat request" },
      { status: 500 }
    );
  }
}

