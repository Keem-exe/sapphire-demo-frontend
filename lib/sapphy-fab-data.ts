// Sapphy's floating panel copy.
// - FAB_CONTENT: the design's SAMPLE copy (made-up scores and topics). Only the demo account sees it.
// - LIVE_FAB_CONTENT: what signed-in students see. It never quotes a number or topic it doesn't know;
//   screens pass the student's real results in through <SapphyFab content={...}>.
// "to" is a workspace route segment (quiz, reels, flashcards, resources), or empty when the step has no page yet;
// "href" (optional) is a full path and wins over "to". {name} is replaced with the student's first name.

export type FabActivity =
  | "dashboard"
  | "quiz-setup"
  | "quiz-active"
  | "quiz-results"
  | "flashcards"
  | "reels"
  | "assignment"
  | "resources"

export interface FabContent {
  kicker: string
  ended: boolean
  happy?: boolean
  feedbackLabel: string
  teaser?: string
  score?: string
  verdict?: string
  verdictTone?: "ok" | "warn" | "neutral"
  summary: string
  good: string[]
  work: string[]
  steps: { t: string; why: string; to: "quiz" | "reels" | "flashcards" | "resources" | ""; href?: string }[]
  askIntro: string
  asks: { q: string; a: string }[]
}

const CONTENT: Record<Exclude<FabActivity, "dashboard">, FabContent> = {
  "quiz-setup": {
    "kicker": "Before you start",
    "ended": false,
    "feedbackLabel": "My pick",
    "teaser": "Not sure what to pick? I can choose for you.",
    "summary": "Factorising is your weakest topic this week (48%). I'd start with 5 medium questions on Algebra.",
    "good": [],
    "work": [],
    "steps": [
      {
        "t": "Use my pick: Algebra, 5 questions, medium",
        "why": "Builds on the note you wrote today",
        "to": "quiz"
      },
      {
        "t": "Warm up with a 48-second reel",
        "why": "Factorising quadratics",
        "to": "reels"
      }
    ],
    "askIntro": "Ask me anything before you start.",
    "asks": [
      {
        "q": "How hard should I go?",
        "a": "Medium. You scored 66% on your last algebra quiz, so medium will stretch you without being discouraging."
      },
      {
        "q": "How many questions?",
        "a": "Five takes about 5 minutes and still counts towards your streak."
      }
    ]
  },
  "quiz-active": {
    "kicker": "Question 3 of 4",
    "ended": false,
    "feedbackLabel": "Tips",
    "teaser": "Stuck on a question? Tap me for a hint.",
    "summary": "I won't give answers away during a quiz, but I can nudge you in the right direction.",
    "good": [],
    "work": [],
    "steps": [
      {
        "t": "Keep going: 2 questions left",
        "why": "Your full feedback appears when you submit",
        "to": ""
      }
    ],
    "askIntro": "Which question is tricky? Pick one and I'll give you a hint.",
    "asks": [
      {
        "q": "Hint for question 3",
        "a": "Look at both terms, 3x² and 12x. They share more than just the number 3. What else do they both contain?"
      },
      {
        "q": "What does 'factorise completely' mean?",
        "a": "Take out every common factor, so nothing more can be factored out of the bracket."
      }
    ]
  },
  "quiz-results": {
    "kicker": "Your quiz feedback",
    "ended": true,
    "happy": true,
    "feedbackLabel": "Feedback",
    "score": "80%",
    "verdict": "Passed",
    "verdictTone": "ok",
    "summary": "Nice work, {name}: 4 of 5 correct in 4m 12s. One slip on factorising cost you full marks.",
    "good": [
      "Solving quadratics by taking square roots",
      "Working out the mean and median"
    ],
    "work": [
      "Factorising: take out every common factor (3x, not just 3)"
    ],
    "steps": [
      {
        "t": "10 flashcards on factorising",
        "why": "About 4 minutes, locks in the fix",
        "to": "flashcards"
      },
      {
        "t": "Watch “Factorising quadratics”",
        "why": "48-second reel",
        "to": "reels"
      },
      {
        "t": "Retry 3 factorising questions on Friday",
        "why": "Spacing practice out helps it stick",
        "to": "quiz"
      }
    ],
    "askIntro": "Ask me about any question from this quiz.",
    "asks": [
      {
        "q": "Why was my answer to Q3 wrong?",
        "a": "3(x² − 4x) still has x in both terms of the bracket, so it isn't fully factorised. Take out 3x to get 3x(x − 4)."
      },
      {
        "q": "Give me one more like Q3",
        "a": "Try this: factorise completely 5x² − 20x. (Answer: 5x(x − 4).)"
      }
    ]
  },
  "flashcards": {
    "kicker": "Flashcard session complete",
    "ended": true,
    "feedbackLabel": "Feedback",
    "score": "65%",
    "verdict": "Keep practising",
    "verdictTone": "warn",
    "summary": "13 of 20 cards mastered in 9m 40s. Most of the 7 you saved for later are about the discriminant and completing the square.",
    "good": [
      "Laws of indices: every card mastered"
    ],
    "work": [
      "Discriminant cases",
      "Completing the square"
    ],
    "steps": [
      {
        "t": "Review the 7 cards again now",
        "why": "About 3 minutes",
        "to": "flashcards"
      },
      {
        "t": "I'll bring them back on Friday",
        "why": "Spaced review, added to your plan",
        "to": ""
      },
      {
        "t": "Then try a 5-question algebra quiz",
        "why": "Check it has stuck",
        "to": "quiz"
      }
    ],
    "askIntro": "Want me to explain any card you found hard?",
    "asks": [
      {
        "q": "Explain completing the square simply",
        "a": "Halve the number in front of x, square it, add and subtract it. x² + 6x becomes (x + 3)² − 9."
      },
      {
        "q": "Make me 5 new cards on the discriminant",
        "a": "Done. I've added 5 cards to your Algebra set. They'll show up at the start of your next session."
      }
    ]
  },
  "reels": {
    "kicker": "You finished a reel",
    "ended": true,
    "feedbackLabel": "Next up",
    "teaser": "Reel finished! Two quick questions?",
    "summary": "You watched “The discriminant in 60 seconds”. A quick check now will help it stick.",
    "good": [],
    "work": [],
    "steps": [
      {
        "t": "Quick check: 2 questions",
        "why": "Under a minute",
        "to": "quiz"
      },
      {
        "t": "Make 3 flashcards from this reel",
        "why": "Added to your Algebra set",
        "to": "flashcards"
      },
      {
        "t": "Up next: Completing the square, fast",
        "why": "1:12",
        "to": ""
      }
    ],
    "askIntro": "Ask me about anything in this reel.",
    "asks": [
      {
        "q": "Summarise this reel in 3 points",
        "a": "1. Work out b² − 4ac. 2. Positive means two real roots, zero means one. 3. Negative means no real roots."
      },
      {
        "q": "Is this on Paper 2?",
        "a": "Yes. The discriminant often appears in Paper 2 algebra questions. I can find past examples in Resources."
      }
    ]
  },
  "assignment": {
    "kicker": "Mark scheme revealed",
    "ended": true,
    "feedbackLabel": "Feedback",
    "score": "14 / 20",
    "verdict": "Self-marked",
    "verdictTone": "neutral",
    "summary": "Good method throughout. Most lost marks were final-answer slips, not misunderstandings.",
    "good": [
      "Questions 1 and 3: full marks",
      "Clear working shown in every question"
    ],
    "work": [
      "Q2: check the sign when you complete the square",
      "Q4: reject the negative width and say why"
    ],
    "steps": [
      {
        "t": "Redo Q4 with me step by step",
        "why": "Word problems carry 4+ marks on Paper 2",
        "to": ""
      },
      {
        "t": "Practise 3 completing-the-square questions",
        "why": "Targets your Q2 slip",
        "to": "quiz"
      },
      {
        "t": "Try a past Paper 2 question on quadratics",
        "why": "From Resources",
        "to": "resources"
      }
    ],
    "askIntro": "Tell me which marks you dropped and I'll explain.",
    "asks": [
      {
        "q": "Why do I reject x = −8 in Q4?",
        "a": "x is a width, and a length can't be negative, so only x = 5 makes sense. Examiners give a mark for saying this."
      },
      {
        "q": "How do I get method marks?",
        "a": "Write each step on its own line, even simple ones. Method marks are awarded even when the final answer is wrong."
      }
    ]
  },
  "resources": {
    "kicker": "Past paper plan",
    "ended": false,
    "feedbackLabel": "My plan",
    "teaser": "Which paper next? I have a plan.",
    "summary": "You've tried 3 of 8 papers, averaging 68%. Vectors questions in Paper 2 cost you the most marks.",
    "good": [],
    "work": [],
    "steps": [
      {
        "t": "Do January 2024, Paper 2 next",
        "why": "It has two vectors questions",
        "to": "quiz"
      },
      {
        "t": "Set your exam date",
        "why": "I'll plan one paper a week",
        "to": ""
      }
    ],
    "askIntro": "Ask me about any paper or mark scheme.",
    "asks": [
      {
        "q": "Which topics come up most?",
        "a": "Across the papers you have, algebra and measurement appear in every sitting. I'd keep those warm."
      },
      {
        "q": "Explain a mark scheme to me",
        "a": "Open any paper's mark scheme and tap a line. I'll explain what the examiner wants to see."
      }
    ]
  }
}

export const FAB_CONTENT: Record<FabActivity, FabContent> = { ...CONTENT, dashboard: CONTENT["quiz-setup"] }

const LIVE: Record<Exclude<FabActivity, "dashboard">, FabContent> = {
  "quiz-setup": {
    kicker: "Before you start",
    ended: false,
    feedbackLabel: "My pick",
    teaser: "Not sure what to pick? Ask me.",
    summary: "Pick one or two topics you want to get better at. Five medium questions takes about five minutes.",
    good: [],
    work: [],
    steps: [
      { t: "Start with five medium questions", why: "Enough to show where you stand", to: "quiz" },
      { t: "Warm up with a short reel first", why: "Handy if the topic is new", to: "reels" },
    ],
    askIntro: "Ask me anything before you start.",
    asks: [
      { q: "How hard should I go?", a: "Start on medium. If you score above 80%, try hard next time; below 50%, drop to easy." },
      { q: "How many questions?", a: "Five is a good sprint, and finishing any quiz counts towards your daily tasks." },
    ],
  },
  "quiz-active": {
    kicker: "Quiz in progress",
    ended: false,
    feedbackLabel: "Tips",
    teaser: "Stuck? Tap me for a nudge.",
    summary: "I won't give answers away during a quiz, but I can nudge you in the right direction.",
    good: [],
    work: [],
    steps: [{ t: "Answer what you can, then submit", why: "Your full feedback appears when you submit", to: "" }],
    askIntro: "Tell me which question is tricky and what you've tried.",
    asks: [
      { q: "How do I check my working?", a: "Put your answer back into the question. If it fits every condition, you're probably right." },
      { q: "What if I don't know an answer?", a: "Make your best attempt. A wrong answer still shows me what to help you with next." },
    ],
  },
  "quiz-results": {
    kicker: "Your quiz feedback",
    ended: true,
    feedbackLabel: "Feedback",
    summary: "Here's how that quiz went.",
    good: [],
    work: [],
    steps: [
      { t: "Drill the ones you missed with flashcards", why: "Locks in the fixes", to: "flashcards" },
      { t: "Try another quiz", why: "Spacing practice out helps it stick", to: "quiz" },
    ],
    askIntro: "Ask me about any question from this quiz.",
    asks: [
      { q: "How do I improve my score?", a: "Review each wrong answer, redo it without looking, then try a few similar questions tomorrow." },
    ],
  },
  flashcards: {
    kicker: "Flashcard session complete",
    ended: true,
    feedbackLabel: "Feedback",
    summary: "Nice session. Cards you marked hard will come back sooner.",
    good: [],
    work: [],
    steps: [
      { t: "Review the hard cards again", why: "A second pass now makes them stick", to: "flashcards" },
      { t: "Then try a short quiz", why: "Check it has stuck", to: "quiz" },
    ],
    askIntro: "Want me to explain any card you found hard?",
    asks: [{ q: "How often should I review?", a: "Little and often: a few minutes a day beats one long session a week." }],
  },
  reels: {
    kicker: "Study reels",
    ended: false,
    feedbackLabel: "Next up",
    teaser: "Finished a reel? Lock it in.",
    summary: "Watching a reel counts towards your daily tasks. A quick check afterwards helps it stick.",
    good: [],
    work: [],
    steps: [
      { t: "Quick check with a short quiz", why: "Under five minutes", to: "quiz" },
      { t: "Make flashcards on the same topic", why: "Review it again tomorrow", to: "flashcards" },
    ],
    askIntro: "Ask me about anything in a reel.",
    asks: [{ q: "Summarise what I just watched", a: "Open Sapphy in your subject workspace and tell me the reel's topic. I'll give you the key points." }],
  },
  assignment: {
    kicker: "Mark scheme revealed",
    ended: true,
    feedbackLabel: "Feedback",
    summary: "Compare your answers with the mark scheme line by line, and note where marks slipped.",
    good: [],
    work: [],
    steps: [
      { t: "Practise the topics you lost marks on", why: "A short quiz targets them", to: "quiz" },
      { t: "Try a past paper question", why: "From Resources", to: "resources" },
    ],
    askIntro: "Tell me which marks you dropped and I'll explain.",
    asks: [
      { q: "How do I get method marks?", a: "Write each step on its own line, even simple ones. Method marks are awarded even when the final answer is wrong." },
    ],
  },
  resources: {
    kicker: "Past paper practice",
    ended: false,
    feedbackLabel: "My plan",
    teaser: "Record your past paper scores and I'll track them.",
    summary: "After you do a past paper, record your score here. I'll track your average and which papers you've done.",
    good: [],
    work: [],
    steps: [
      { t: "Set your exam date", why: "Your dashboard counts down to it", to: "" },
      { t: "Practise timed questions", why: "Exam conditions", to: "quiz" },
    ],
    askIntro: "Ask me about any paper or mark scheme.",
    asks: [{ q: "How should I use past papers?", a: "Do one under timed conditions, mark it with the mark scheme, then record your score so we can see your progress." }],
  },
}

export const LIVE_FAB_CONTENT: Record<FabActivity, FabContent> = {
  ...LIVE,
  dashboard: {
    kicker: "Today with Sapphy",
    ended: false,
    feedbackLabel: "Today",
    teaser: "Your tasks for today are ready.",
    summary: "Finish at least one of today's tasks to keep your streak going.",
    good: [],
    work: [],
    steps: [],
    askIntro: "Ask me anything about your studies.",
    asks: [
      { q: "How does my streak work?", a: "Log on and finish at least one of my three daily tasks. Do that every day and your streak grows. Finish all three for a perfect day." },
      { q: "Where do my tasks come from?", a: "I pick them from your own results: the topics you find hardest, cards due for review, and what's next in your syllabus." },
    ],
  },
}
