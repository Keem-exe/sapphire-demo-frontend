import type React from "react"
import Image from "next/image"

interface AuthShellProps {
  tagline: string
  children: React.ReactNode
}

/** Split layout shared by log in and create account: blue brand panel left, cream form side right. */
export function AuthShell({ tagline, children }: AuthShellProps) {
  return (
    <div className="split min-h-screen">
      <section className="split-l">
        <div className="doodles" style={{ "--dx": "-40px", "--dy": "-60px" } as React.CSSProperties} aria-hidden="true" />
        <div className="flex flex-1 flex-col justify-center gap-5">
          <h1 className="split-h">
            Study smarter.
            <br />
            Ace CXC.
          </h1>
          <p className="split-p">{tagline}</p>
        </div>
      </section>
      <section className="split-r">
        <Image src="/sapphire-logo.png" alt="Sapphire OS" width={178} height={60} priority className="h-[60px] w-auto" />
        {children}
        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </section>
    </div>
  )
}
