// 12-module catalog and metadata. The Modules grid screen iterates this.

import {
  MessageSquare,
  Mic,
  Bot,
  Brain,
  Briefcase,
  Code2,
  Wand2,
  FileText,
  Mail,
  Calendar,
  Settings as SettingsIcon,
  User,
  type LucideIcon,
} from "lucide-react-native";

export type ModuleDef = {
  id: string;
  label: string;
  blurb: string;
  href: string;
  Icon: LucideIcon;
};

export const MODULES: ModuleDef[] = [
  { id: "chat", label: "AI Chat", blurb: "Text & voice chat with your assistant.", href: "/(tabs)/chat", Icon: MessageSquare },
  { id: "voice", label: "Voice Assistant", blurb: "Tap-to-talk, full-screen voice mode.", href: "/modules/voice-assistant", Icon: Mic },
  { id: "automation", label: "Automation Center", blurb: "WhatsApp, SMS, Gmail & more.", href: "/modules/automation", Icon: Bot },
  { id: "memory", label: "Memory Center", blurb: "Search, edit & organize memories.", href: "/(tabs)/memory", Icon: Brain },
  { id: "jobs", label: "Job Assistant", blurb: "Track apps, analyze resumes.", href: "/modules/jobs", Icon: Briefcase },
  { id: "coding", label: "Coding Assistant", blurb: "Generate, explain, fix code.", href: "/modules/coding", Icon: Code2 },
  { id: "prompts", label: "Prompt Studio", blurb: "Craft & save expert prompts.", href: "/modules/prompts", Icon: Wand2 },
  { id: "documents", label: "Document Generator", blurb: "Reports, resumes, notes.", href: "/modules/documents", Icon: FileText },
  { id: "email", label: "Email Assistant", blurb: "Draft, summarize, reply.", href: "/modules/email", Icon: Mail },
  { id: "calendar", label: "Calendar & Tasks", blurb: "Events, reminders, to-dos.", href: "/modules/calendar", Icon: Calendar },
  { id: "settings", label: "Settings", blurb: "Theme, model, voice, security.", href: "/(tabs)/settings", Icon: SettingsIcon },
  { id: "profile", label: "Profile", blurb: "Your account & AI identity.", href: "/(tabs)/profile", Icon: User },
];

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "ta", label: "தமிழ் (Tamil)" },
  { id: "hi", label: "हिन्दी (Hindi)" },
  { id: "te", label: "తెలుగు (Telugu)" },
  { id: "ml", label: "മലയാളം (Malayalam)" },
  { id: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { id: "bn", label: "বাংলা (Bengali)" },
  { id: "ar", label: "العربية (Arabic)" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "es", label: "Español" },
];

export const VOICES = [
  { id: "alloy", label: "Alloy", description: "Balanced, neutral" },
  { id: "nova", label: "Nova", description: "Bright, female-toned" },
  { id: "shimmer", label: "Shimmer", description: "Warm, female-toned" },
  { id: "echo", label: "Echo", description: "Crisp, male-toned" },
  { id: "onyx", label: "Onyx", description: "Deep, male-toned" },
  { id: "fable", label: "Fable", description: "Storyteller" },
];

export const MODELS = [
  { provider: "openai", model: "gpt-5.4", label: "GPT-5.4 (OpenAI)" },
  { provider: "openai", model: "gpt-5.4-mini", label: "GPT-5.4 Mini (OpenAI)" },
  { provider: "openai", model: "gpt-4o", label: "GPT-4o (OpenAI)" },
  { provider: "anthropic", model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { provider: "anthropic", model: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { provider: "gemini", model: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro" },
  { provider: "gemini", model: "gemini-3-flash-preview", label: "Gemini 3 Flash" },
];

export const AI_NAME_SUGGESTIONS = ["Afifa", "Nova", "Luna", "Zara", "Milo", "Jarvis"];

export const AUTOMATION_APPS = [
  { id: "whatsapp", label: "WhatsApp", scheme: "whatsapp://send" },
  { id: "sms", label: "SMS", scheme: "sms:" },
  { id: "telegram", label: "Telegram", scheme: "tg://" },
  { id: "gmail", label: "Gmail", scheme: "mailto:" },
  { id: "instagram", label: "Instagram", scheme: "instagram://" },
  { id: "snapchat", label: "Snapchat", scheme: "snapchat://" },
  { id: "facebook", label: "Facebook", scheme: "fb://" },
  { id: "linkedin", label: "LinkedIn", scheme: "linkedin://" },
  { id: "chrome", label: "Chrome", scheme: "googlechrome://" },
];

export const AUTOMATION_ACTIONS = [
  { id: "open_app", label: "Open App" },
  { id: "send_message", label: "Send Message" },
  { id: "draft_reply", label: "Draft Reply" },
  { id: "schedule_message", label: "Schedule Message" },
  { id: "fill_form", label: "Fill Form" },
  { id: "search", label: "Search Content" },
  { id: "open_profile", label: "Open Profile" },
  { id: "workflow", label: "Custom Workflow" },
];
