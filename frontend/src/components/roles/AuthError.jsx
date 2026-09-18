function AuthError({ message }) {
  if (!message) return null
  return (
    <p className="authx-alert" role="alert">
      {message}
    </p>
  )
}

export default AuthError