import { cn } from "@/lib/utils"

export type SapphyMood = "idle" | "thinking" | "happy"

interface SapphyProps {
  className?: string
  /** idle: round eyes and a smile (default). thinking: eyes glance around. happy: closed-eye smile and a hop. */
  mood?: SapphyMood
  /** Rosy cheeks and a second sparkle on the happy face, used on the hopping CSEC mascot */
  blush?: boolean
}

/** Sapphy, the gem mascot. Motion comes from sapphire.css and stops for people who ask for reduced motion. */
export function Sapphy({ className, mood = "idle", blush = false }: SapphyProps) {
  return (
    <svg
      className={cn("sapphy", mood === "thinking" && "is-thinking", mood === "happy" && "is-happy", className)}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <g className="sp-body">
        <polygon points="24,10 40,10 44,22 20,22" fill="#CDEFFE" />
        <polygon points="14,22 24,10 20,22" fill="#72D7FA" />
        <polygon points="40,10 50,22 44,22" fill="#1F6FD6" />
        <polygon points="14,22 20,22 32,56" fill="#2E86E2" />
        <polygon points="20,22 44,22 32,56" fill="#4FB4F2" />
        <polygon points="44,22 50,22 32,56" fill="#1058C9" />
        <path
          d="M14 22 24 10h16l10 12-18 34z"
          fill="none"
          stroke="#0A3D8F"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {mood === "happy" ? (
          <>
            <path
              d="M25.2 31.5q2.3-3 4.6 0M34.2 31.5q2.3-3 4.6 0"
              fill="none"
              stroke="#0B1B3A"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {blush && (
              <>
                <ellipse cx="25" cy="35.5" rx="2.1" ry="1.2" fill="#FF9DB0" opacity="0.8" />
                <ellipse cx="39" cy="35.5" rx="2.1" ry="1.2" fill="#FF9DB0" opacity="0.8" />
              </>
            )}
            <path d="M28.5 35.6q3.5 5.2 7 0z" fill="#0B1B3A" />
          </>
        ) : (
          <>
            <g className="sp-eyes">
              <ellipse cx="27.5" cy="30.5" rx="2.3" ry="3" fill="#0B1B3A" />
              <ellipse cx="36.5" cy="30.5" rx="2.3" ry="3" fill="#0B1B3A" />
              <circle cx="28.3" cy="29.4" r="0.85" fill="#ffffff" />
              <circle cx="37.3" cy="29.4" r="0.85" fill="#ffffff" />
            </g>
            {mood === "thinking" ? (
              <circle cx="32" cy="37.6" r="1.5" fill="#0B1B3A" />
            ) : (
              <>
                <ellipse cx="25" cy="35.5" rx="1.9" ry="1.1" fill="#FF9DB0" opacity="0.65" />
                <ellipse cx="39" cy="35.5" rx="1.9" ry="1.1" fill="#FF9DB0" opacity="0.65" />
                <path d="M29 36.5q3 2.8 6 0" fill="none" stroke="#0B1B3A" strokeWidth="1.6" strokeLinecap="round" />
              </>
            )}
          </>
        )}
      </g>
      <path className="sp-spark" d="M54 3l1.1 3.4 3.4 1.1-3.4 1.1L54 12l-1.1-3.4-3.4-1.1 3.4-1.1z" fill="#FFD43B" />
      {(blush || mood === "thinking") && (
        <path
          className="sp-spark sp-spark2"
          d={mood === "thinking" ? "M9 42l.8 2.4 2.4.8-2.4.8L9 48.4l-.8-2.4-2.4-.8 2.4-.8z" : "M9 6l.8 2.4 2.4.8-2.4.8L9 12.4l-.8-2.4-2.4-.8 2.4-.8z"}
          fill="#FFD43B"
        />
      )}
    </svg>
  )
}
