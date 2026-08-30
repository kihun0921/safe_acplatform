import './Spinner.css'

export default function Spinner(): JSX.Element {
  return (
    <div className="spinner-container">
      <div className="spinner" aria-busy="true" aria-label="로드중">
        <div className="spinner-ring"></div>
      </div>
      <p className="spinner-text">로드중...</p>
    </div>
  )
}
