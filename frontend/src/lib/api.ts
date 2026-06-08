// Lightweight API client. Reads session token from secure storage.
// All endpoints prefixed with /api per ingress rules.

import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";

const TOKEN_KEY = "afifa.session_token";

async function getToken(): Promise<string | null> {
  return await storage.secureGet<string>(TOKEN_KEY, "");
}

export async function setToken(token: string | null) {
  if (!token) {
    await storage.secureRemove(TOKEN_KEY);
    return;
  }
  await storage.secureSet(TOKEN_KEY, token);
}

type RequestOpts = {
  method?: string;
  body?: any;
  formData?: FormData;
  signal?: AbortSignal;
  isJson?: boolean;
};

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T = any>(path: string, opts: RequestOpts = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: any = undefined;
  if (opts.formData) {
    body = opts.formData;
    // do NOT set content-type so RN sets the multipart boundary
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, {
    method: opts.method || (body ? "POST" : "GET"),
    headers,
    body,
    signal: opts.signal,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new ApiError(json?.detail || `HTTP ${res.status}`, res.status, json);
  }
  return json as T;
}

// Convenience helpers grouped by module
export const Auth = {
  google: (session_id: string) => api("/auth/google", { body: { session_id } }),
  guest: (name = "Guest") => api("/auth/guest", { body: { name } }),
  me: () => api("/auth/me"),
  logout: () => api("/auth/logout", { method: "POST" }),
};

export const Profile = {
  get: () => api("/profile"),
  update: (patch: any) => api("/profile", { method: "PUT", body: patch }),
};

export const Chat = {
  models: () => api("/chat/models"),
  list: () => api("/chat/conversations"),
  create: (body: any = {}) => api("/chat/conversations", { body }),
  getMessages: (cid: string) => api(`/chat/conversations/${cid}/messages`),
  send: (cid: string, text: string, provider?: string, model?: string) =>
    api(`/chat/conversations/${cid}/messages`, { body: { text, provider, model } }),
  delete: (cid: string) => api(`/chat/conversations/${cid}`, { method: "DELETE" }),
};

export const Memory = {
  list: (category?: string, q?: string) => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (q) qs.set("q", q);
    return api(`/memory${qs.toString() ? `?${qs}` : ""}`);
  },
  create: (body: any) => api("/memory", { body }),
  update: (mid: string, patch: any) => api(`/memory/${mid}`, { method: "PUT", body: patch }),
  delete: (mid: string) => api(`/memory/${mid}`, { method: "DELETE" }),
};

export const Voice = {
  transcribe: async (uri: string, mime = "audio/m4a") => {
    const fd = new FormData();
    fd.append("audio", { uri, name: "audio.m4a", type: mime } as any);
    return api<{ text: string }>("/voice/transcribe", { formData: fd });
  },
  tts: (text: string, voice = "alloy") =>
    api<{ audio_base64: string; format: string }>("/voice/tts", {
      body: { text, voice },
    }),
};

export const Jobs = {
  list: () => api("/jobs/applications"),
  create: (body: any) => api("/jobs/applications", { body }),
  update: (jid: string, body: any) => api(`/jobs/applications/${jid}`, { method: "PUT", body }),
  delete: (jid: string) => api(`/jobs/applications/${jid}`, { method: "DELETE" }),
  analyze: (resume_text: string, job_description: string) =>
    api("/jobs/analyze-resume", { body: { resume_text, job_description } }),
  cover: (resume_text: string, job_description: string, tone = "professional") =>
    api("/jobs/cover-letter", { body: { resume_text, job_description, tone } }),
};

export const Code = {
  run: (body: any) => api("/code/run", { body }),
};

export const Prompts = {
  list: () => api("/prompts"),
  save: (body: any) => api("/prompts", { body }),
  delete: (pid: string) => api(`/prompts/${pid}`, { method: "DELETE" }),
  generate: (body: any) => api("/prompts/generate", { body }),
};

export const Documents = {
  list: () => api("/documents"),
  generate: (body: any) => api("/documents/generate", { body }),
  delete: (did: string) => api(`/documents/${did}`, { method: "DELETE" }),
};

export const Email = {
  draft: (body: any) => api("/email/draft", { body }),
  summarize: (body: any) => api("/email/summarize", { body }),
};

export const Calendar = {
  list: () => api("/calendar/events"),
  create: (body: any) => api("/calendar/events", { body }),
  update: (eid: string, body: any) => api(`/calendar/events/${eid}`, { method: "PUT", body }),
  delete: (eid: string) => api(`/calendar/events/${eid}`, { method: "DELETE" }),
};

export const Automation = {
  list: () => api("/automation/rules"),
  create: (body: any) => api("/automation/rules", { body }),
  update: (rid: string, body: any) => api(`/automation/rules/${rid}`, { method: "PUT", body }),
  delete: (rid: string) => api(`/automation/rules/${rid}`, { method: "DELETE" }),
  queue: (rid: string) => api(`/automation/rules/${rid}/queue`, { method: "POST" }),
};

export const Vision = {
  analyze: (image_base64: string, prompt: string) =>
    api("/vision/analyze", { body: { image_base64, prompt } }),
};
