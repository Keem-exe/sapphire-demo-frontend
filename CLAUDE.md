# CLAUDE.md

_Last updated: 2026-10-07_

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js on port 3000)
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

No test suite is configured. `npm run build` is the check Vercel runs; `tsc --noEmit` still reports pre-existing errors (see Pending), the build does not fail on them. There is no `.env.local` in the repo — create one locally:

```
GOOGLE_GEMINI_API_KEY=...           # Server-side only; demo-only local fallback routes (app/api/*)
NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY=... # Client-side in LearningEngineService
NEXT_PUBLIC_API_URL=https://sapphire-backend-production.up.railway.app  # Backend origin
```

Backend URL resolution (`lib/api-config.ts` → `API_URL`): `NEXT_PUBLIC_API_URL`, then legacy `NEXT_PUBLIC_BACKEND_URL`, then the Railway URL in production / `http://localhost:5000` in dev. The student client, admin client, backend-status check and the `next.config.mjs` rewrite all use it.

**Vercel env vars:** `NEXT_PUBLIC_API_URL` (Railway URL above), `GOOGLE_GEMINI_API_KEY`, `NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY`. `YOUTUBE_API_KEY` is no longer used and can be removed. **`NEXT_PUBLIC_*` values ship to the browser — never put secrets in them** (the public Gemini key is a known exposure; remove it when LearningEngineService moves server-side).

## Architecture

**Sapphire** is an AI study companion for Caribbean CSEC/CAPE exam students. It's a Next.js 15 app (App Router) with React 19, Tailwind CSS v4, and shadcn/ui.

### Auth & User State

- `contexts/auth-context.tsx` — single `AuthProvider` wrapping the whole app in `app/layout.tsx`
- Auth state persists to `localStorage` (`user`, `authToken`, `selectedLevel`, `learningStyle`)
- Demo login: email `andrew.lee@demo.com` bypasses the backend entirely and loads `DEMO_USER` (no token, so backend-only features such as reels, assignments, ratings and feedback show a "sign in with a Sapphire account" message)
- All other logins hit the backend at `NEXT_PUBLIC_API_URL` via `lib/api-client.ts` (`ApiClient` singleton `apiClient`)
- Backend response shape: `{ success: true, data: { user: {...}, token: "..." } }`
- Error handling in `ApiClient`: 401 → refresh token, and if that fails clear the session and fire `SESSION_EXPIRED_EVENT` (AuthProvider sends the user to `/`; demo user exempt); 429 → "slow down" message; 503 → shows the server's own message (maintenance mode, AI disabled, model failure)
- Admins (`accountType: "admin"`) get an Admin button on the dashboard and profile; the console at `/admin` has its own login and `adminToken` storage (`lib/admin/api.ts`), separate from the student session

### Page Routing Flow

```
/ (login) → /select-level → /dashboard → /workspace/[subjectId]
                                               ├── /quiz
                                               ├── /flashcards
                                               ├── /reels (All / Saved toggle)
                                               ├── /assignment
                                               └── /[unit] (CAPE only)
/profile      learning profile (admin link for admins)
/admin/*      admin console (separate login)
```

`/dashboard` and `/workspace/*` redirect to `/` if `user` is null, and to `/select-level` if `selectedLevel` is not set in localStorage.

Subject IDs are typed in `lib/data/subjects.ts` as `SubjectId` (`csec-math`, `csec-chem`, `csec-eng`, `cape-puremath`, `cape-phys`, `cape-bio`). The workspace page normalizes legacy numeric IDs (e.g. `"1"` → `"csec-math"`) via `normalizeSubjectId`.

### AI Layer

Two separate Gemini integration paths:

1. **Next.js API Routes** (`app/api/*`) — server-side, use `GOOGLE_GEMINI_API_KEY`. **Demo-only local fallbacks**: signed-in users go to the backend's `/api/ai/*` instead:
   - `POST /api/quiz` — generate quiz questions
   - `POST /api/quiz/grade` — grade quiz answers
   - `POST /api/flashcards` — generate flashcards
   - `POST /api/chat` — AI tutor chat
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

## Backend integration (Railway)

Production API: `https://sapphire-backend-production.up.railway.app` (all routes under `/api/*`, envelope `{success, message, data}`). The backend ignores any `user_id` sent and uses the JWT identity.

**Done**
- Repoint to Railway via `NEXT_PUBLIC_API_URL`; 401/503/429 handling
- Assignment page (`POST /api/ai/assignment`, client-side only, not persisted)
- Helpful / partly helpful / not helpful rating (+ report) on chat, quiz, flashcards, assignment (`components/feedback/ai-rating.tsx`, uses `eventId` from AI responses)
- Feedback dialog with feature picker (`POST /api/feedback`)
- Admin console (`/admin`, `components/admin`, `lib/admin`)
- Reels from the backend: `GET /api/subject/<backendSubjectId>/reels` (`topicId`, `limit`, `page`/`hasMore`, `topicFallback`), integer reel `id` for `/view` `/like` `/save`, Saved toggle (`GET /api/reels/saved`). `app/api/shorts` is gone
- On-demand enrollment: `resolveBackendSubject` (`lib/services/backend-subject-map.ts`) calls `POST /api/subject` when the student is not yet enrolled
- `/profile` crash hotfix (learning service now unwraps backend response shapes) and `app/error.tsx` error boundary

**Contracts to remember**
- Enrollment is by NAME and the backend derives the subject code from it (`name.upper().replace(' ','_')`), so names in `lib/data/subjects.ts` must match the backend seed exactly: Mathematics, English A, Chemistry, Physics, Biology, Pure Mathematics. A different spelling creates a separate subject with no topics
- Tutor chat needs `studentAttempt` in the request, otherwise the backend returns the guardrail prompt with no `eventId`
- `POST /api/learning/record-quiz`, `/record-flashcard` and `/feedback` do NOT exist. Learning signals are recorded by quiz submit (`POST /api/quiz/<id>/submit`) and flashcards practice (`POST /api/flashcards/<setId>/practice`), which the workspace pages already use
- `next-content`, `knowledge-gaps` and `mastery` require `subject_id`; `pacing` requires `subject_id` AND `topic_id`; `intervention/<id>` takes a USER id
- Dashboard `mastery_levels[].status` is one of `not_started | learning | reviewing | mastered | needs_review`

## Pending / TODO

- Dashboard tiles in `components/learning/LearningDashboard.tsx` still count `proficient`/`struggling`, which the backend never sends; switch to the real statuses (awaiting approval)
- Adapt `mastery`, `insights` (`days_back`, not `timeframe`), `pacing` and `adjust-difficulty` (`current_difficulty`) in `lib/services/learning-intelligence-service.ts` to the backend's wrapped shapes; retire the dead `record-quiz` / `record-flashcard` / `feedback` calls and the intervention-by-risk-id call; drop `user_id` (awaiting approval)
- Legacy `components/quiz/quiz-runner.tsx` and `app/quiz/page.tsx` still call the dead `record-quiz` route (404)
- Pre-existing `tsc` errors: `components/ui/chart.tsx`, `components/ui/resizable.tsx`, `components/quiz/quiz-runner.tsx`, `app/workspace/[subjectId]/[unit]/page.tsx`, `lib/ai/rag.ts`
- `YOUTUBE_API_KEY` and `NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY` can be removed from Vercel once nothing needs them
- Admin Diagnostics and pre/post progress cards stay empty until a student diagnostic flow exists
