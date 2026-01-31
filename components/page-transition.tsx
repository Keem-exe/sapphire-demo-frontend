import React from 'react'

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in-50 duration-300">
      {children}
    </div>
  )
}
