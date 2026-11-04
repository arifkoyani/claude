"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageContent {
  type: string;
  text?: string;
}

export interface AttachedFile {
  file_uuid?: string;
  file_name: string;
  size_bytes?: number;
  previewUrl?: string;
  file_kind?: string;
  file_type?: string;
  extracted_content?: string;
  uploading?: boolean;
}

interface Message {
  uuid?: string;
  sender: "human" | "assistant";
  text?: string;
  content?: MessageContent[];
  created_at?: string;
  files?: AttachedFile[];
}

interface ConversationItem {
  uuid: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", tag: "Default" },
  { id: "claude-opus-5", label: "Claude Opus 5", tag: "Opus" },
  { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet", tag: "v3.7" },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", tag: "v3.5" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", tag: "Fast" },
];

// Interactive Syntax-styled Code Block with Copy to Clipboard
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-slate-700/80 bg-[#090d13] overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#141a23] border-b border-slate-700/80 text-[11px] text-slate-300 select-none">
        <span className="font-mono text-emerald-400 font-semibold tracking-wide uppercase text-[10px]">
          {language || "CODE"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60 transition cursor-pointer font-sans text-[11px]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <svg
                className="w-3.5 h-3.5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-[12px] sm:text-[13px] font-mono leading-relaxed text-slate-200">
        <pre className="!bg-transparent !p-0 !m-0 font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

// Markdown Message Renderer with full typography and syntax styling
function MarkdownMessage({
  content,
  isHuman,
}: {
  content: string;
  isHuman: boolean;
}) {
  if (isHuman) {
    return <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  }

  return (
    <div className="markdown-body leading-relaxed text-slate-100 text-xs sm:text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-700/60">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-bold text-emerald-300 mt-3 mb-1.5 pb-0.5 border-b border-slate-800/60">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-emerald-400 mt-2.5 mb-1">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-slate-200 mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-emerald-200">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-300">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-4 space-y-1 mb-2.5 text-slate-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-4 space-y-1 mb-2.5 text-slate-200">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-emerald-500/80 pl-3 py-1.5 my-2.5 bg-slate-800/40 rounded-r text-slate-300 italic text-xs">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-slate-700/80 rounded-lg">
              <table className="min-w-full divide-y divide-slate-700/80 text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 bg-slate-800/80 text-left font-semibold text-slate-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-1.5 border-t border-slate-800 text-slate-300">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition"
            >
              {children}
            </a>
          ),
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isCodeBlock = match || String(children).includes("\n");

            if (isCodeBlock) {
              const codeString = String(children).replace(/\n$/, "");
              return (
                <CodeBlock language={match ? match[1] : ""} code={codeString} />
              );
            }

            return (
              <code
                className="bg-slate-800/90 text-emerald-300 px-1.5 py-0.5 rounded font-mono text-[11px] sm:text-[12px] border border-slate-700/60"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function Chat() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedModel, setSelectedModel] =
    useState<string>("claude-sonnet-5-5");
  const [activeConversationId, setActiveConversationId] = useState<string>(
    "179735f2-87af-448e-8956-4723fc61c443",
  );
  const [conversationTitle, setConversationTitle] =
    useState<string>("Claude Chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // File Upload states
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, attachedFiles]);

  // Auto-persist messages to localStorage
  useEffect(() => {
    if (activeConversationId && messages.length > 0) {
      try {
        localStorage.setItem(
          `claude_msgs_${activeConversationId}`,
          JSON.stringify(messages),
        );
      } catch {}
    }
  }, [messages, activeConversationId]);

  // Auto-resize textarea dynamically based on content height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 44), 220)}px`;
    }
  }, [inputPrompt]);

  // Load conversations list and active conversation
  useEffect(() => {
    fetchConversationList();
    loadConversation(activeConversationId);
  }, []);

  const fetchConversationList = async () => {
    let localList: ConversationItem[] = [];
    try {
      const saved = localStorage.getItem("claude_conversations");
      if (saved) localList = JSON.parse(saved);
    } catch {}

    try {
      const res = await fetch("/api/chat?list=true");
      if (res.ok) {
        const data = await res.json();
        const apiList: ConversationItem[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

        const map = new Map<string, ConversationItem>();
        for (const item of [...localList, ...apiList]) {
          if (item?.uuid) map.set(item.uuid, item);
        }
        const merged = Array.from(map.values());
        setConversations(merged);
        try {
          localStorage.setItem("claude_conversations", JSON.stringify(merged));
        } catch {}
        return;
      }
    } catch (e) {
      console.warn("Could not load conversations list:", e);
    }

    if (localList.length > 0) {
      setConversations(localList);
    } else {
      setConversations([
        {
          uuid: "179735f2-87af-448e-8956-4723fc61c443",
          name: "Claude Session (Active)",
        },
      ]);
    }
  };

  const loadConversation = async (convId: string) => {
    if (!convId) return;
    setIsLoading(true);
    setErrorMsg(null);

    // Instant local cache restore
    try {
      const local = localStorage.getItem(`claude_msgs_${convId}`);
      if (local) {
        setMessages(JSON.parse(local));
      } else {
        setMessages([]);
      }
    } catch {}

    try {
      const res = await fetch(`/api/chat?conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveConversationId(data.uuid || convId);
        if (data.name) setConversationTitle(data.name);
        if (
          Array.isArray(data.chat_messages) &&
          data.chat_messages.length > 0
        ) {
          setMessages(data.chat_messages);
        }
      }
    } catch (err: any) {
      console.warn("Upstream conversation fetch note:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    loadConversation(convId);
  };

  const handleNewChat = () => {
    const newId = crypto.randomUUID();
    setActiveConversationId(newId);
    setConversationTitle("New Chat Session");
    setMessages([]);
    setAttachedFiles([]);
    setErrorMsg(null);

    const newConv: ConversationItem = {
      uuid: newId,
      name: "New Chat Session",
      created_at: new Date().toISOString(),
    };

    setConversations((prev) => {
      const updated = [newConv, ...prev.filter((c) => c.uuid !== newId)];
      try {
        localStorage.setItem("claude_conversations", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to extract text from message content array or string
  const getMessageText = (msg: Message): string => {
    if (msg.text && msg.text.trim()) return msg.text;
    if (Array.isArray(msg.content)) {
      return msg.content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n");
    }
    return "";
  };

  // Helper to resize/compress oversized images to Anthropic Claude vision bounds (max 1568px)
  const resizeImageIfNeeded = async (
    file: File,
    maxDim = 1568,
  ): Promise<File> => {
    if (!file.type.startsWith("image/")) return file;
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size < 800 * 1024) {
          return resolve(file);
        }
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const resized = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, ".jpg"),
              {
                type: "image/jpeg",
              },
            );
            resolve(resized);
          },
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  // Handle file upload to Claude ToolzNex API
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg(null);
    setIsUploading(true);

    for (const rawFile of Array.from(files)) {
      const file = await resizeImageIfNeeded(rawFile);
      const isImg = file.type.startsWith("image/");
      const localPreview = isImg ? URL.createObjectURL(file) : undefined;

      const tempFile: AttachedFile = {
        file_name: file.name,
        size_bytes: file.size,
        previewUrl: localPreview,
        file_kind: isImg ? "image" : "document",
        uploading: true,
      };

      setAttachedFiles((prev) => [...prev, tempFile]);

      const formData = new FormData();
      formData.append("file", file);
      if (activeConversationId) {
        formData.append("conversationId", activeConversationId);
      }

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error || `Upload failed: ${res.statusText}`);
        }

        const data = await res.json();
        const uploadedUuid = data.file_uuid || data.uuid || data.id;

        setAttachedFiles((prev) =>
          prev.map((f) =>
            f.file_name === file.name
              ? {
                  ...f,
                  file_uuid: uploadedUuid,
                  file_type: data.file_type || file.type,
                  extracted_content: data.extracted_content,
                  size_bytes: data.file_size || file.size,
                  uploading: false,
                }
              : f,
          ),
        );
      } catch (err: any) {
        setErrorMsg(`Failed to upload ${file.name}: ${err.message}`);
        // Remove failed file
        setAttachedFiles((prev) =>
          prev.filter((f) => f.file_name !== file.name),
        );
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachedFile = (fileName: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.file_name !== fileName));
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputPrompt.trim();
    if ((!prompt && attachedFiles.length === 0) || isSending || isUploading)
      return;

    const currentFiles = [...attachedFiles];
    setInputPrompt("");
    setAttachedFiles([]);
    setErrorMsg(null);

    // Append human message immediately with attached files
    const userMessage: Message = {
      uuid: `client-msg-${Date.now()}`,
      sender: "human",
      text: prompt,
      files: currentFiles,
      created_at: new Date().toISOString(),
    };

    // Placeholder assistant message for streaming
    const assistantMessage: Message = {
      uuid: `client-reply-${Date.now()}`,
      sender: "assistant",
      text: "",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsSending(true);

    // Build prompt with attached document contents (.txt, .py, .json, .csv, .md, etc.)
    const docFiles = currentFiles.filter(
      (f) => f.file_kind === "document" && f.extracted_content,
    );
    let finalPrompt = prompt;
    if (docFiles.length > 0) {
      const docsContext = docFiles
        .map(
          (f) =>
            `--- File: ${f.file_name} ---\n${f.extracted_content}\n--- End of ${f.file_name} ---`,
        )
        .join("\n\n");
      finalPrompt = finalPrompt
        ? `${docsContext}\n\n${finalPrompt}`
        : docsContext;
    } else if (!finalPrompt && currentFiles.length > 0) {
      finalPrompt = "Please see attached file(s).";
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          conversationId: activeConversationId || undefined,
          model: selectedModel,
          files: currentFiles
            .filter((f) => f.file_uuid)
            .map((f) => f.file_uuid),
          attachments: currentFiles
            .filter(
              (f) =>
                !f.file_uuid && f.extracted_content && f.file_kind === "image",
            )
            .map((f) => {
              const isImg =
                f.file_kind === "image" || f.file_type?.startsWith("image/");
              let content = f.extracted_content || "";
              const mime = f.file_type || "image/jpeg";
              if (isImg && !content.startsWith("data:")) {
                content = `data:${mime};base64,${content}`;
              }
              return {
                file_name: f.file_name,
                file_type: mime,
                file_size: f.size_bytes || content.length,
                extracted_content: content,
              };
            }),
        }),
      });

      if (!res.ok) {
        const errorJson = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(
          errorJson.error || "Failed to get response from Claude",
        );
      }

      if (!res.body) throw new Error("No response body received from server");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === "init" && parsed.conversationId) {
              setActiveConversationId(parsed.conversationId);
            } else if (parsed.type === "delta" && parsed.text) {
              streamedText += parsed.text;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.sender === "assistant") {
                  last.text = streamedText;
                }
                return next;
              });
            }
          } catch {
            streamedText += trimmed;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.sender === "assistant") {
                last.text = streamedText;
              }
              return next;
            });
          }
        }
      }

      if (!activeConversationId) {
        fetchConversationList();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while streaming response.");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.sender === "assistant" && !last.text) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsSending(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0d1117] text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-72" : "w-0"
        } transition-all duration-300 flex flex-col bg-[#161b22] border-r border-slate-800 shrink-0 overflow-hidden select-none`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-sm text-slate-100 tracking-wide">
            <img
              src="/Claude-logo.png"
              alt="claudex logo"
              className="w-8 h-8 object-contain rounded"
            />
          </div>
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95 cursor-pointer text-xs font-semibold flex items-center gap-1 shadow"
            title="Start New Chat"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Conversations
          </div>
          {conversations.length === 0 ? (
            <div className="px-3 py-2 text-slate-500 text-xs italic">
              {isLoading ? "Loading chats..." : "No past conversations"}
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.uuid === activeConversationId;
              return (
                <button
                  key={c.uuid}
                  onClick={() => handleSelectConversation(c.uuid)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition truncate cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                  title={c.name || c.uuid}
                >
                  <svg
                    className="w-3.5 h-3.5 shrink-0 opacity-70"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                  <span className="truncate">{c.name || "Untitled Chat"}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Connection status footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#12161f] text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Endpoint:</span>
            <span className="font-mono text-emerald-400 text-[10px]">
              claude.arifkoyani.com
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Org ID:</span>
            <span className="font-mono text-slate-400 text-[10px] truncate max-w-[120px]">
              51fb24b0...
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Model:</span>
            <span className="font-mono text-emerald-400 text-[10px] truncate max-w-[120px]">
              {selectedModel}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full bg-[#0d1117] min-w-0">
        {/* Header Bar */}
        <header className="h-14 border-b border-slate-800/80 bg-[#161b22]/70 backdrop-blur px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
              title="Toggle sidebar"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-slate-100 truncate">
                {conversationTitle}
              </h1>
              <p className="text-[10px] text-slate-400 truncate font-mono">
                ID: {activeConversationId || "New Conversation"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Model Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Model:
              </span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-xs text-emerald-400 font-medium outline-none cursor-pointer"
                title="Select Claude Model"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    className="bg-[#161b22] text-slate-200"
                  >
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => loadConversation(activeConversationId)}
              disabled={isLoading || isSending}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Refresh conversation from Claude API"
            >
              <svg
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Proxy Active
            </div>
          </div>
        </header>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-400 hover:text-red-200 ml-2 font-bold cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-3">
                <svg
                  className="w-8 h-8 animate-spin text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <p className="text-xs">
                  Connecting to Claude and fetching conversation...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
                  C
                </div>
                <h3 className="text-sm font-medium text-slate-200">
                  Start a new conversation
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Send a message, upload images or files to communicate with
                  Claude using your authenticated session.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isHuman = msg.sender === "human";
                const text = getMessageText(msg);
                const msgId = msg.uuid || `msg-${idx}`;

                return (
                  <div
                    key={msgId}
                    className={`flex gap-3 ${isHuman ? "justify-end" : "justify-start"}`}
                  >
                    {!isHuman && (
                      <div className="w-8 h-8 rounded-lg bg-emerald-700/40 border border-emerald-600/30 flex items-center justify-center text-emerald-300 font-bold text-xs shrink-0 select-none shadow-sm">
                        AI
                      </div>
                    )}

                    <div
                      className={`relative max-w-[85%] rounded-2xl px-4 py-3 shadow-md ${
                        isHuman
                          ? "bg-emerald-600 text-white rounded-br-xs"
                          : "bg-[#1c2128] border border-slate-800 text-slate-100 rounded-bl-xs"
                      }`}
                    >
                      {/* Attached files preview in message bubble */}
                      {Array.isArray(msg.files) && msg.files.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {msg.files.map((file, fIdx) => (
                            <div
                              key={fIdx}
                              className="flex items-center gap-2 p-1.5 rounded-lg bg-black/30 border border-white/10 text-xs"
                            >
                              {file.previewUrl ? (
                                <img
                                  src={file.previewUrl}
                                  alt={file.file_name}
                                  className="w-10 h-10 object-cover rounded"
                                />
                              ) : (
                                <span className="text-sm">📄</span>
                              )}
                              <span className="truncate max-w-[150px] font-mono text-[11px]">
                                {file.file_name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Header bar inside message bubble */}
                      <div className="text-[11px] font-semibold opacity-75 mb-2 flex items-center justify-between gap-3 border-b border-white/5 pb-1 select-none">
                        <div className="flex items-center gap-1.5">
                          <span>{isHuman ? "You" : "Claude"}</span>
                          {!isHuman && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                              {selectedModel}
                            </span>
                          )}
                        </div>
                        {text && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(msgId, text)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 transition cursor-pointer text-[11px] font-sans text-slate-300 hover:text-white"
                            title="Copy full message text"
                          >
                            {copiedId === msgId ? (
                              <>
                                <svg
                                  className="w-3.5 h-3.5 text-emerald-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                <span className="text-emerald-400 font-medium">
                                  Copied!
                                </span>
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-3.5 h-3.5 text-slate-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                                <span>Copy message</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Content with Markdown, Code Mode & Syntax Highlighting */}
                      <div className="leading-relaxed break-words">
                        {text ? (
                          <MarkdownMessage content={text} isHuman={isHuman} />
                        ) : (
                          <span className="italic text-slate-400 inline-flex items-center gap-1.5 py-1">
                            <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full"></span>
                            Generating response...
                          </span>
                        )}
                      </div>
                    </div>

                    {isHuman && (
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200 font-medium text-xs shrink-0 select-none">
                        U
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar Area */}
        <div className="p-4 shrink-0">
          <form
            onSubmit={handleSend}
            className="w-full max-w-[60%] mx-auto rounded-xl bg-[#1c2128] border border-slate-700 focus-within:border-emerald-500 shadow-lg transition-all duration-150 relative"
            style={{
              resize: "both",
              overflow: "hidden",
              minWidth: "280px",
              maxWidth: "60%",
              minHeight: "56px",
            }}
          >
            {/* Attached files preview bar */}
            {attachedFiles.length > 0 && (
              <div className="p-2.5 border-b border-slate-800 flex flex-wrap gap-2">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-xs text-slate-200"
                  >
                    {file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt={file.file_name}
                        className="w-5 h-5 object-cover rounded"
                      />
                    ) : (
                      <span>📄</span>
                    )}
                    <span className="truncate max-w-[140px] text-[11px]">
                      {file.file_name}
                    </span>
                    {file.uploading ? (
                      <span className="animate-spin text-emerald-400 text-xs">
                        &#8635;
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachedFile(file.file_name)}
                        className="text-slate-400 hover:text-red-400 transition cursor-pointer font-bold text-xs"
                        title="Remove file"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-end">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
              />

              {/* Attach File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSending}
                className="p-2.5 ml-2 mb-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 transition cursor-pointer disabled:opacity-50 shrink-0"
                title="Attach image or file"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>

              {/* Textarea with dynamic auto-height */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Claude anything or attach an image/file... (Enter to send, Shift + Enter for new line)"
                className="flex-1 bg-transparent px-3 py-2.5 pr-16 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none resize-none overflow-y-auto leading-relaxed transition-[height] duration-75"
                style={{ minHeight: "44px", maxHeight: "260px" }}
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={
                  (!inputPrompt.trim() && attachedFiles.length === 0) ||
                  isSending ||
                  isUploading
                }
                className="absolute right-5 bottom-2 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition active:scale-95 disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed shadow shrink-0"
                title={isSending ? "Waiting for response..." : "Send message"}
              >
                {isSending ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                )}
              </button>

              {/* Manual resize corner handle indicator */}
              <div
                className="absolute right-1 bottom-1 text-slate-600 pointer-events-none select-none opacity-50"
                title="Drag to resize length and height"
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M9 1L1 9M9 5L5 9M9 9L9 9"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </form>

          <p className="text-center text-[10px] text-slate-500 mt-2">
            Connected to Claude proxy &bull; Click 📎 to attach files/images
            &bull; Enter to send
          </p>
        </div>
      </main>
    </div>
  );
}
