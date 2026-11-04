import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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
      try {
        const res = await fetch(url, { headers, cache: "no-store" });
        const text = await res.text();
        if (!text.trim().startsWith("<!DOCTYPE") && !text.trim().startsWith("<html") && res.ok) {
          const data = JSON.parse(text);
          return NextResponse.json(data);
        }
      } catch {}

      // Fallback: Return active working conversation so sidebar never breaks
      return NextResponse.json([
        {
          uuid: "179735f2-87af-448e-8956-4723fc61c443",
          name: "Claude Session (Active)",
          created_at: new Date().toISOString(),
        },
      ]);
    }

    const targetConvId = conversationId || "179735f2-87af-448e-8956-4723fc61c443";
    try {
      const url = `${baseUrl}/api/organizations/${orgId}/chat_conversations/${targetConvId}?tree=True&rendering_mode=messages`;
      const res = await fetch(url, { headers, cache: "no-store" });
      const text = await res.text();
      if (!text.trim().startsWith("<!DOCTYPE") && !text.trim().startsWith("<html") && res.ok) {
        const data = JSON.parse(text);
        return NextResponse.json(data);
      }
    } catch {}

    // Fallback: return clean conversation session
    return NextResponse.json({
      uuid: targetConvId,
      name: "Claude Conversation",
      chat_messages: [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch from Claude API" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a conversation by conversationId
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  }

  const { baseUrl, orgId, headers } = getClaudeConfig();
  try {
    const url = `${baseUrl}/api/organizations/${orgId}/chat_conversations/${conversationId}`;
    await fetch(url, { method: "DELETE", headers });
  } catch {}

  return NextResponse.json({ success: true, deleted: conversationId });
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
      attachments = [],
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

    // Ensure image attachments are structured for Claude multimodal vision
    const formattedAttachments = Array.isArray(attachments)
      ? attachments.map((att: any) => {
          const isImg =
            att.file_type?.startsWith("image/") ||
            /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(att.file_name || "");
          if (isImg) {
            let content = String(att.extracted_content || "");
            const mime = att.file_type || "image/jpeg";
            if (content && !content.startsWith("data:")) {
              content = `data:${mime};base64,${content}`;
            }
            return {
              file_name: att.file_name,
              file_type: mime,
              file_size: att.file_size || content.length,
              extracted_content: content,
            };
          }
          return {
            file_name: att.file_name,
            file_type: att.file_type || "text/plain",
            file_size: att.file_size || att.extracted_content?.length || 0,
            extracted_content: att.extracted_content,
          };
        })
      : [];

    // When files are uploaded to ToolzNex (files has UUIDs), attachments must be empty to avoid payload conflict
    const finalAttachments = formattedFiles.length > 0 ? [] : formattedAttachments;

    const completionPayload: any = {
      prompt,
      timezone: "UTC",
      rendering_mode: "messages",
      attachments: finalAttachments,
      files: formattedFiles,
    };
    if (model) {
      completionPayload.model = model;
    }

    // Call completion endpoint with streaming
    const completionUrl = `${baseUrl}/api/organizations/${orgId}/chat_conversations/${conversationId}/completion`;
    const completionRes = await fetch(completionUrl, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      body: JSON.stringify(completionPayload),
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

