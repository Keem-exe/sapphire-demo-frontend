# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js on port 3000)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

No test suite is configured. There is no `.env.local` in the repo — create one locally:

```
GOOGLE_GEMINI_API_KEY=...           # Used server-side in API routes (app/api/*)
NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY=... # Used client-side in LearningEngineService
NEXT_PUBLIC_BACKEND_URL=https://sapphire-2x9z.onrender.com  # Defaults to http://localhost:8000
```

## Architecture

**Sapphire** is an AI study companion for Caribbean CSEC/CAPE exam students. It's a Next.js 15 app (App Router) with React 19, Tailwind CSS v4, and shadcn/ui.

### Auth & User State

- `contexts/auth-context.tsx` — single `AuthProvider` wrapping the whole app in `app/layout.tsx`
- Auth state persists to `localStorage` (`user`, `authToken`, `selectedLevel`, `learningStyle`)
- Demo login: email `andrew.lee@demo.com` bypasses the backend entirely and loads `DEMO_USER`
- All other logins hit the backend at `NEXT_PUBLIC_BACKEND_URL` via `lib/api-client.ts` (`ApiClient` singleton `apiClient`)
- Backend response shape: `{ success: true, data: { user: {...}, token: "..." } }`

### Page Routing Flow

```
/ (login) → /select-level → /dashboard → /workspace/[subjectId]
                                               ├── /quiz
                                               ├── /flashcards
                                               ├── /reels
                                               └── /[unit] (CAPE only)
```

`/dashboard` and `/workspace/*` redirect to `/` if `user` is null, and to `/select-level` if `selectedLevel` is not set in localStorage.

Subject IDs are typed in `lib/data/subjects.ts` as `SubjectId` (`csec-math`, `csec-chem`, `csec-eng`, `cape-puremath`, `cape-phys`, `cape-bio`). The workspace page normalizes legacy numeric IDs (e.g. `"1"` → `"csec-math"`) via `normalizeSubjectId`.

### AI Layer

Two separate Gemini integration paths:

1. **Next.js API Routes** (`app/api/*`) — server-side, use `GOOGLE_GEMINI_API_KEY`:
   - `POST /api/quiz` — generate quiz questions
   - `POST /api/quiz/grade` — grade quiz answers
   - `POST /api/flashcards` — generate flashcards
   - `POST /api/chat` — AI tutor chat
   - `POST /api/shorts` — fetch YouTube study shorts
   - `GET /api/health` — health check

2. **LearningEngineService** (`lib/services/learning-engine.ts`) — client-side singleton, uses `NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY`. Maintains a `LearnerModel` in `localStorage` (`sapphire_learner_model`). Exposes: `initializeLearnerModel`, `updateLearnerModel`, `generatePersonalizedQuiz`, `generatePersonalizedFlashcards`, `generateFeedback`.

Model selection lives in `lib/ai/models.ts`. All purposes currently map to `gemini-2.5-flash-lite`. The `lib/ai/gemini.ts` singleton (`getTextModel`) is the shared client for API routes. Embeddings use `text-embedding-004`.

### Data Persistence

All user data (subjects, notes, quiz history, learner model) is stored in `localStorage` only — there is no database on the frontend. Subject lists are initialized from hardcoded constants in `app/dashboard/page.tsx` and persisted under keys `csecSubjects` / `capeSubjects`. Notes are keyed by `sapphire_notes_${subjectId}`.

### Workspace Layout

`app/workspace/[subjectId]/page.tsx` renders a three-panel desktop layout (Notebook sidebar | Note editor | Tools+AI Coach) with a bottom tab bar on mobile. The right panel tabs are Tools (`components/workspace/tools-panel.tsx`), AI Coach (`components/workspace/ai-chat-panel.tsx`), and Syllabus.

### Component Structure

- `components/ui/` — shadcn/ui primitives (do not edit these manually; regenerate via shadcn CLI)
- `components/workspace/` — workspace-specific panels
- `components/quiz/` — quiz setup and runner
- `components/learning/` — `LearningDashboard` using the learning engine
- `components/learning-engine-demo.tsx` — demo page for the AI engine (`/engine-demo`)
- `lib/store.ts` — any shared non-auth state
- `lib/types/` — TypeScript interfaces for `LearnerModel`, analytics, etc.
