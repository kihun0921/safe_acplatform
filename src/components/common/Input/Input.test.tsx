import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Input from './Input'

describe('Input Component', () => {
  it('should render with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('should show required mark when required is true', () => {
    render(<Input label="Name" required />)
    const label = screen.getByText(/name/i)
    expect(label.textContent).toContain('(필수)')
  })

  it('should accept input changes', () => {
    const handleChange = vi.fn()
    render(<Input value="" onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    input.value = 'test@example.com'
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(handleChange).toHaveBeenCalled()
  })

  it('should show error message when error prop is provided', () => {
    render(<Input label="Email" error="Invalid email" />)
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })

  it('should show helper text when provided', () => {
    render(<Input label="Password" helperText="Min 8 characters" />)
    expect(screen.getByText(/min 8 characters/i)).toBeInTheDocument()
  })

  it('should support different input types', () => {
    const { container } = render(<Input type="email" />)
    const input = container.querySelector('input')
    expect(input).toHaveAttribute('type', 'email')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('should apply error styling when error is present', () => {
    const { container } = render(<Input error="Error message" />)
    const inputWrapper = container.querySelector('.input-field')
    expect(inputWrapper).toHaveClass('error')
  })
})
