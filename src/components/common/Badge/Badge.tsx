import React from 'react'
import './Badge.css'

export type BadgeStatus = 'default' | 'success' | 'warn' | 'danger' | 'info'

interface BadgeProps {
  status?: BadgeStatus
  label: string
  icon?: React.ReactNode
}

export default function Badge({ status = 'default', label, icon }: BadgeProps): JSX.Element {
  return (
    <span className={`badge badge-${status}`}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-label">{label}</span>
    </span>
  )
}
