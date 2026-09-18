import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './roleIcons'

function PasswordInput({ id, name, value, onChange, onBlur, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="authx-password">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete || 'current-password'}
      />
      <button
        type="button"
        className="authx-password-toggle"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  )
}

export default PasswordInput