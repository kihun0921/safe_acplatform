import React, { useState, useId } from 'react'
import './Textarea.css'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  required?: boolean
  maxLength?: number
  showCount?: boolean
}

export default function Textarea({
  label,
  error,
  required,
  maxLength,
  showCount = true,
  id,
  value,
  onChange,
  ...props
}: TextareaProps): JSX.Element {
  const [count, setCount] = useState((value as string)?.length || 0)
  const generatedId = useId()
  const textareaId = id || generatedId

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCount(e.target.value.length)
    onChange?.(e)
  }

  return (
    <div className="textarea-wrapper">
      {label && (
        <label htmlFor={textareaId} className="textarea-label">
          {label}
          {required && <span className="required"> (필수)</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`textarea ${error ? 'textarea-error' : ''}`}
        maxLength={maxLength}
        value={value}
        onChange={handleChange}
        aria-invalid={Boolean(error)}
        {...props}
      />
      <div className="textarea-footer">
        {error && <p className="textarea-error-text">{error}</p>}
        {showCount && maxLength && (
          <p className="textarea-count">
            {count} / {maxLength}
          </p>
        )}
      </div>
    </div>
  )
}
