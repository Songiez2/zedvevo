import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  padding?: boolean
}

export default function PageSection({ children, className = '', padding = true }: Props) {
  return (
    <section className={`${padding ? 'py-10 px-4 sm:px-6 lg:px-8' : ''} max-w-7xl mx-auto w-full ${className}`}>
      {children}
    </section>
  )
}
