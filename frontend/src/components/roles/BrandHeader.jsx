function BrandMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 6.5v11M6.5 12h11"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function BrandHeader({ tagline = 'Digital Healthcare, Simplified', align = 'center' }) {
  return (
    <div className={`authx-header${align === 'left' ? ' is-left' : ''}`}>
      <span className="authx-brand">
        <span className="authx-mark">
          <BrandMark />
        </span>
        <span className="authx-wordmark">MediCard</span>
      </span>
      {tagline && <p className="authx-tagline">{tagline}</p>}
    </div>
  )
}

export { BrandMark }
export default BrandHeader
