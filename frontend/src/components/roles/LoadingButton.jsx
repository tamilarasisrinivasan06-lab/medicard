function LoadingButton({ type = 'submit', loading = false, disabled = false, children, loadingText }) {
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading}>
      {loading ? loadingText || 'Loading…' : children}
    </button>
  )
}

export default LoadingButton