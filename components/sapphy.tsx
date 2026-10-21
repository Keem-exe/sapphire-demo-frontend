import { cn } from "@/lib/utils"

interface SapphyProps {
  className?: string
  /** Rosy cheeks and a second sparkle, used on the hopping CSEC mascot */
  blush?: boolean
}

/** Sapphy, the gem mascot. Motion classes come from sapphire.css and respect reduced motion. */
export function Sapphy({ className, blush = false }: SapphyProps) {
  return (
    <svg className={cn("sapphy", className)} viewBox="0 0 64 64" aria-hidden="true">
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
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <g className="sp-eyes">
          <path
            d="M25.2 31.5q2.3-3 4.6 0M34.2 31.5q2.3-3 4.6 0"
            fill="none"
            stroke="#0B1B3A"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </g>
        {blush && (
          <>
            <ellipse cx="25" cy="35.5" rx="2.1" ry="1.2" fill="#FF9DB0" opacity="0.8" />
            <ellipse cx="39" cy="35.5" rx="2.1" ry="1.2" fill="#FF9DB0" opacity="0.8" />
          </>
        )}
        <path d="M28.5 35.6q3.5 5.2 7 0z" fill="#0B1B3A" />
      </g>
      <path className="sp-spark" d="M54 3l1.1 3.4 3.4 1.1-3.4 1.1L54 12l-1.1-3.4-3.4-1.1 3.4-1.1z" fill="#FFD43B" />
      {blush && (
        <path
          className="sp-spark sp-spark2"
          d="M9 6l.8 2.4 2.4.8-2.4.8L9 12.4l-.8-2.4-2.4-.8 2.4-.8z"
          fill="#FFD43B"
        />
      )}
    </svg>
  )
}
