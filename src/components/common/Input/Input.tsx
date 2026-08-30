import React, { useId } from 'react'
import './Input.css'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
  helperText?: string
}

export default function Input({
  label,
  error,
  required,
  helperText,
  id,
  ...props
}: InputProps): JSX.Element {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="required"> (필수)</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`input ${error ? 'input-error' : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="input-error-text">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="input-helper-text">{helperText}</p>
      )}
    </div>
  )
}
