// SAMPLE: placeholder feedback copy from the design. Nothing here comes from the backend yet.
// "to" is a workspace route segment (quiz, reels, flashcards, resources), or empty when the step has no page yet.
// {name} is replaced with the student's first name.

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
  steps: { t: string; why: string; to: "quiz" | "reels" | "flashcards" | "resources" | "" }[]
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
