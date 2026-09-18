import { useState } from 'react'
import { fetchFileObjectUrl } from '../api'

function FileLink({ url, children = 'View attachment', className }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!url) return null

  async function handleOpen(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const objectUrl = await fetchFileObjectUrl(url)
      window.open(objectUrl, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
    } catch (err) {
      setError(err.message || 'Could not open the file')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <a href="#" className={className} onClick={handleOpen} role="button">
        {busy ? 'Opening…' : children}
      </a>
      {error && <span className="auth-error"> {error}</span>}
    </>
  )
}

export default FileLink
