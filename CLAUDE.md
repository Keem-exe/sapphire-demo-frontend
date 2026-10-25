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
- Auth state persists to `localStorage` (`user`, `authToken`, `selectedLevel`, `learningStyle`), but for real accounts the level, learning style, time zone and "finished the Sapphy guide" flag live on the backend account (`GET/PATCH /api/users/me`) and are restored at login, so onboarding never repeats on another device or after logout
- `normalizeUser` gives one user shape (`first_name`, `level`, `learning_style`, `onboardingCompletedAt`) whatever casing the backend used; `isDemo` is true for the demo account, `isSynced` once the session matches the backend (onboarding prompts wait for it)
- On app load with a token, `meService.checkIn()` records today's visit (the log-on half of the streak) and the browser's time zone
- Demo login: email `andrew.lee@demo.com` bypasses the backend entirely and loads `DEMO_USER` (no token, so backend-only features such as reels, assignments, ratings and feedback show a "sign in with a Sapphire account" message)
- All other logins hit the backend at `NEXT_PUBLIC_API_URL` via `lib/api-client.ts` (`ApiClient` singleton `apiClient`)
- Backend response shape: `{ success: true, data: { user: {...}, token: "..." } }`
- Error handling in `ApiClient`: 401 → refresh token, and if that fails clear the session and fire `SESSION_EXPIRED_EVENT` (AuthProvider sends the user to `/`; demo user exempt); 429 → "slow down" message; 503 → shows the server's own message (maintenance mode, AI disabled, model failure)
- Admins (`accountType: "admin"`) get an Admin button on the dashboard and profile; the console at `/admin` has its own login and `adminToken` storage (`lib/admin/api.ts`), separate from the student session

### Page Routing Flow

```
/ (login) → /select-level (+ learning-style quiz pop-up) → /dashboard (+ Sapphy guide, once) → /workspace/[subjectId]
                                               ├── /quiz
                                               ├── /flashcards
                                               ├── /reels (All / Saved toggle)
                                               ├── /assignment
                                               ├── /resources (past paper scores, saved papers, exam date)
                                               └── /[unit] → redirects to the subject (CAPE subjects are single-unit)
/learning-quiz → redirects to /dashboard (the quiz is now a dialog)
/profile      learning profile (admin link for admins)
/admin/*      admin console (separate login)
```

Onboarding: a student with no `level` on the account goes to `/select-level`; picking one saves it (`PATCH /api/users/me`) and opens `components/onboarding/learning-style-dialog.tsx` (saved with `POST /api/learning-style`). `/select-level?change=1` (dashboard level switch) skips the quiz. The dashboard re-opens the quiz if the account has no learning style, then shows `components/onboarding/sapphy-guide.tsx` until `onboardingCompletedAt` is set ("Replay the guide" in the account menu clears it). The guide points at elements with `data-tour` attributes (`tasks`, `streak`, `week`, `subjects`, `sapphy-fab`).

`/dashboard` and `/workspace/*` redirect to `/` if `user` is null, and to `/select-level` if neither the account nor localStorage has a level.

Subject IDs are typed in `lib/data/subjects.ts` as `SubjectId`: `csec-math`, `csec-eng`, `cape-caribbean-studies`, `cape-communication-studies` (the launch catalog; Chemistry, Physics, Biology and Pure Mathematics are retired). `normalizeSubjectId` maps old short ids; `subjectIdForName` maps a backend subject name to a frontend id.

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

Every number a signed-in student sees comes from the backend (`lib/services/me-service.ts`, hooks in `lib/hooks/use-me.ts`, which reload when the tab regains focus):
- Dashboard: `GET /api/me/overview` (streak, Sapphy's 3 daily tasks, week strip, enrolled subjects with real mastery, nearest exam)
- Subject workspace: `GET /api/me/subjects/<backendId>/overview` (study minutes, mastery per topic, cards due, last quiz, saved reels, papers, this week's tasks, streak)
- Profile: `GET /api/me/stats`
- Resources: `/api/past-papers`, `/api/resources/saved`, exam date via `PATCH /api/subject/<backendId>`
- Focus mode: `POST/PATCH /api/focus-sessions`; note saving: `POST /api/learning/interactions {type: "notebook"}` (note text stays in the browser)

Topics come from the backend (`useSubjectTopics` in `lib/services/subject-topics.ts`); the offline lists in `lib/data/subjects.ts` are only for the demo account. Notes are still browser-only, keyed by `sapphire_notes_${subjectId}`. The old `csecSubjects`/`capeSubjects` keys are deleted on dashboard load.

**Demo account** (no token): every screen keeps the design's SAMPLE numbers (marked `SAMPLE`/`DEMO_` in code). Never show sample numbers to a signed-in student; `hasAuthToken()` is the switch.

### Workspace Layout

`app/workspace/[subjectId]/page.tsx` renders `components/workspace/workspace-shell.tsx` (overview with real stats, notebook, syllabus by module, customisable left/right columns, Sapphy chat on the right, focus mode with a real 25-minute session).

### Component Structure

- `components/ui/` — shadcn/ui primitives (do not edit these manually; regenerate via shadcn CLI)
- `components/workspace/` — workspace-specific panels
- `components/quiz/` — quiz setup and runner
- `components/onboarding/` — learning-style dialog and the first-login Sapphy guide
- `components/sapphy-fab.tsx` — Sapphy's floating panel; pass real results via `content`. Copy for signed-in students is `LIVE_FAB_CONTENT` (quotes no numbers it doesn't know); `FAB_CONTENT` is the demo's sample copy
- `components/learning/` — `LearningDashboard` (no longer used by `/profile`)
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
- Dashboard tiles use the real mastery statuses
- Learning service adapted to backend contracts (mastery/insights/pacing/adjust-difficulty/intervention); dead `record-quiz`/`record-flashcard`/`feedback` calls and their hooks removed; `user_id` no longer sent; legacy `components/quiz/quiz-runner.tsx` no longer calls the dead route

**Contracts to remember**
- Enrollment is by NAME and the backend derives the subject code from it (`name.upper().replace(' ','_')`), so names in `lib/data/subjects.ts` must match the backend catalog exactly: Mathematics, English A, Caribbean Studies, Communication Studies. The backend now refuses (404) any subject that isn't active in its catalog
- Streak = the student logged on AND finished at least one of Sapphy's 3 daily tasks that day (their own time zone). Tasks complete automatically from quiz submit, flashcard practice, reel view and Sapphy chat; the frontend never marks them done itself
- Tutor chat needs `studentAttempt` in the request, otherwise the backend returns the guardrail prompt with no `eventId`
- `POST /api/learning/record-quiz`, `/record-flashcard` and `/feedback` do NOT exist. Learning signals are recorded by quiz submit (`POST /api/quiz/<id>/submit`) and flashcards practice (`POST /api/flashcards/<setId>/practice`), which the workspace pages already use
- `next-content`, `knowledge-gaps` and `mastery` require `subject_id`; `pacing` requires `subject_id` AND `topic_id`; `intervention/<id>` takes a USER id
- Dashboard `mastery_levels[].status` is one of `not_started | learning | reviewing | mastered | needs_review`

## Pending / TODO

- Pre-existing `tsc` errors: `components/ui/chart.tsx`, `components/ui/resizable.tsx`, `lib/ai/rag.ts`, `lib/services/intelligence-engine.ts`
- The redesign's chat panel doesn't send `studentAttempt` or `history` yet (main has this), so the tutor mostly answers with its "try it yourself" guardrail. Chat still counts as activity for the "Ask Sapphy" daily task
- Past paper files and revision guides aren't connected; the Resources list is a reading list the student records scores against
- `YOUTUBE_API_KEY` and `NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY` can be removed from Vercel once nothing needs them
- Admin Diagnostics and pre/post progress cards stay empty until a student diagnostic flow exists
