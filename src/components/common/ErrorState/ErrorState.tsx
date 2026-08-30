import Button from '../Button/Button'
import './ErrorState.css'

interface ErrorStateProps {
  error?: string | Error
  onRetry?: () => void
  title?: string
}

export default function ErrorState({
  error,
  onRetry,
  title = '오류가 발생했습니다',
}: ErrorStateProps): JSX.Element {
  const errorMessage = error instanceof Error ? error.message : String(error || '알 수 없는 오류')

  return (
    <div className="error-state">
      <div className="error-state-icon">⚠️</div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-message">{errorMessage}</p>
      {onRetry && (
        <Button variant="primary" size="md" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}
