import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Button from './Button'

describe('Button Component', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <Button onClick={handleClick}>Click</Button>,
    )

    const button = container.querySelector('button')
    if (button) {
      button.click()
    }

    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('should support different variants', () => {
    const { container } = render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="text">Text</Button>
      </>,
    )

    const buttons = container.querySelectorAll('button')
    expect(buttons).toHaveLength(3)
  })

  it('should support different sizes', () => {
    const { container } = render(
      <>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </>,
    )

    const buttons = container.querySelectorAll('button')
    expect(buttons).toHaveLength(3)
  })

  it('should be disabled when disabled prop is true', () => {
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('should show loading state', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should fill width when fullWidth is true', () => {
    const { container } = render(<Button fullWidth>Full Width</Button>)
    const button = container.querySelector('button')
    expect(button).toHaveClass('full-width')
  })
})
