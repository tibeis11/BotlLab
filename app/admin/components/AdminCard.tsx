'use client'

import { ReactNode } from 'react'

interface AdminCardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}

export default function AdminCard({ title, subtitle, action, children, className = '', noPadding }: AdminCardProps) {
  return (
    <section
      className={`bg-(--surface) border border-(--border) rounded-xl hover:border-(--border-hover) transition-colors ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div>
            {title && <h3 className="text-sm font-semibold text-(--text-primary)">{title}</h3>}
            {subtitle && <p className="text-xs text-(--text-muted) mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>
    </section>
  )
}
