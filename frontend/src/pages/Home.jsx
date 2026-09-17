import { getRole } from '../api'

function Home() {
  const role = getRole()

  return (
    <div className="home-content">
      <div className="medicard-logo" aria-hidden="true">M</div>
      <h1>MediCard</h1>
      <p className="medicard-description">Digital Healthcare Record Management Platform</p>
      <p className="medicard-status">MediCard frontend is running.</p>
      {role && <p className="medicard-status">Logged in as: {role}</p>}
    </div>
  )
}

export default Home