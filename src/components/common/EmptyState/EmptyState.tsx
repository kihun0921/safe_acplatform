import React from 'react'
import Button from '../Button/Button'
import './EmptyState.css'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  message: string
  ctaLabel?: string
  onCta?: () => void
}

export default function EmptyState({
  icon = '📭',
  title,
  message,
  ctaLabel,
  onCta,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {ctaLabel && onCta && (
        <Button variant="primary" size="md" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}
