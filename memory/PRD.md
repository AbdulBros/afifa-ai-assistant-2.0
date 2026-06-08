# AFIFA — Product Requirements (V1)

## Vision
AFIFA is a JARVIS-inspired personal AI assistant on mobile. Tagline: **Your Voice. Your Command. Your World.**
The app brand is always **AFIFA**, but the user's AI is renamable (e.g., "Hi Nova"). The selected assistant name automatically becomes the wake word.

## Brand visual
The hero across every voice surface is a **horizontal sound-wave visualizer** — vertical bars that follow a bell-curve envelope (taller in the center, tapering to the sides) with a row of small dots underneath. It glows in the active theme color and animates organically per state (idle / listening / thinking / speaking / completed). It is implemented as `src/components/HorizontalWaveform.tsx` and is reused on Splash, Login, Onboarding, Home Dashboard, Voice Assistant, Voice Clone, and Profile.

## Stack
- **Frontend**: Expo SDK 54, expo-router, react-native-reanimated, react-native-keyboard-controller, expo-audio, lucide-react-native, react-native-svg.
- **Backend**: FastAPI + MongoDB (motor), `emergentintegrations` for multi-provider LLM (OpenAI / Anthropic / Gemini), direct OpenAI APIs for Whisper STT + TTS, Emergent-managed Google OAuth.
- **Storage**: Mongo collections — users, user_sessions, profiles, conversations, messages, memory, jobs, prompts, documents, events, automation_rules, automation_runs.

## Modules (12)
1. **AI Chat** — text chat, conversation history, model switcher (GPT/Claude/Gemini), per-user memory.
2. **Voice Assistant** — tap-to-talk; Whisper STT → LLM → OpenAI TTS. (Wake-word listening requires native APK; V1 ships tap-to-talk.)
3. **Automation Center** — rule builder, deep-link launchers (WhatsApp / SMS / Gmail / Telegram / Instagram / Snapchat / Facebook / LinkedIn / Chrome). Confirmation modal before every run. Accessibility-driven automation activates after APK build.
4. **Memory Center** — search/filter/CRUD memory items (chats, notes, projects, tasks, preferences).
5. **Job Assistant** — application tracker + resume / JD analysis + cover letter generator.
6. **Coding Assistant** — generate / explain / fix / refactor across Python, JS, TS, Java, Kotlin, Dart, SQL.
7. **Prompt Studio** — AI-powered prompt generator + saved library by category.
8. **Document Generator** — resumes, reports, notes, letters, summaries, proposals (markdown output, persisted).
9. **Email Assistant** — draft + summarize + suggest replies.
10. **Calendar & Tasks** — events / tasks CRUD + checkbox toggling.
11. **Settings** — theme picker (6 presets), AI name & wake word, model preferences, language (11 langs), security PIN + biometric toggle.
12. **Profile** — user identity, wake word display, sign-out, links to all settings.

## Onboarding
6 steps: Welcome → User Name → AI Name (with suggestions) → Voice selection (preview) → Permissions overview → Setup Complete.

## Theming
6 presets — Blue Neon (default), White Glow, Purple Cyber, Green Matrix, Red Tech, Gold Premium. Instant switch, persisted to AsyncStorage.

## Auth
- Emergent Google OAuth (Continue with Google).
- Guest mode (no auth) for instant access.
- All endpoints use `Authorization: Bearer <session_token>`.

## Voice
- Whisper-1 transcription via OpenAI proxy (Emergent key).
- OpenAI TTS-1 with 6 voices (alloy / nova / shimmer / echo / onyx / fable).
- Native mic recording via `expo-audio` (web preview uses text-only).

## Modular Architecture
Each module = one APIRouter prefix + one route file in `app/modules/`. Adding a new module is one file each side.

## V1 Caveats
- Wake-word detection and OS-level automation (Accessibility Services) require a real APK build — they cannot run in Expo Go.
- Voice recording on web preview is not supported by expo-audio; use the mobile build to test voice end-to-end.
