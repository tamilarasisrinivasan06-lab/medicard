import './auth.css'

function PageContainer({ children, narrow = false }) {
  return (
    <div className="authx-page">
      <div className="authx-bg" aria-hidden="true">
        <span className="authx-blob authx-blob-1" />
        <span className="authx-blob authx-blob-2" />
        <span className="authx-blob authx-blob-3" />
        <span className="authx-dots" />
      </div>
      <main className={`authx-container${narrow ? ' is-narrow' : ''}`}>{children}</main>
    </div>
  )
}

export default PageContainer
