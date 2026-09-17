import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import Login from './components/Login'
import Register from './components/Register'
import RoleSelection from './components/roles/RoleSelection'
import RoleLogin from './components/roles/RoleLogin'
import ForgotPassword from './components/roles/ForgotPassword'
import RolePortal from './components/roles/RolePortal'
import PatientMediCard from './pages/PatientMediCard'
import Scanner from './pages/Scanner'
import PatientDashboard from './pages/PatientDashboard'
import PatientMedicalHistory from './pages/PatientMedicalHistory'
import PatientMedications from './pages/PatientMedications'
import PatientAppointments from './pages/PatientAppointments'
import PatientProfile from './pages/PatientProfile'
import DoctorPortal from './pages/DoctorPortal'
import DoctorPatientRecords from './pages/DoctorPatientRecords'
import ConsultationForm from './pages/ConsultationForm'
import { getRole, logout, dashboardForRole } from './api'
import { LogoutIcon } from './components/roles/roleIcons'
import './App.css'

const HC_ROLES = ['doctor', 'pharmacist', 'diagnostic_staff', 'hospital']
const PORTAL_ROLES = ['hospital', 'admin', 'super_admin']

function App() {
  const navigate = useNavigate()
  const role = getRole()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="medicard-page">
      {role && (
        <nav className="auth-nav">
          {role === 'patient' && <NavLink to="/patient/dashboard">Dashboard</NavLink>}
          {role === 'patient' && <NavLink to="/medicard">My MediCard</NavLink>}
          {role === 'patient' && <NavLink to="/patient/medical-history">Medical History</NavLink>}
          {role === 'patient' && <NavLink to="/patient/medications">Medications</NavLink>}
          {role === 'patient' && <NavLink to="/patient/appointments">Appointments</NavLink>}
          {role === 'patient' && <NavLink to="/patient/profile">Profile</NavLink>}
          {role === 'doctor' && <NavLink to="/doctor/dashboard">Doctor Portal</NavLink>}
          {HC_ROLES.includes(role) && <NavLink to="/scan">Scan QR</NavLink>}
          {PORTAL_ROLES.includes(role) && <NavLink to={dashboardForRole(role)}>Portal</NavLink>}
          <button type="button" className="nav-logout" onClick={handleLogout}>
            <LogoutIcon size={16} /> Logout
          </button>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<RoleSelection />} />
        <Route path="/login/:role" element={<RoleLogin />} />
        <Route path="/login/classic" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/medicard" element={<PatientMediCard />} />
        <Route path="/scan" element={<Scanner />} />
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient/medical-history" element={<PatientMedicalHistory />} />
        <Route path="/patient/medications" element={<PatientMedications />} />
        <Route path="/patient/appointments" element={<PatientAppointments />} />
        <Route path="/patient/profile" element={<PatientProfile />} />
        <Route path="/doctor" element={<DoctorPortal />} />
        <Route path="/doctor/dashboard" element={<DoctorPortal />} />
        <Route path="/doctor/patient/:patientId/records" element={<DoctorPatientRecords />} />
        <Route path="/doctor/consultation/new" element={<ConsultationForm />} />
        <Route path="/portal" element={<RolePortal />} />
        <Route path="/hospital/dashboard" element={<RolePortal />} />
        <Route path="/admin/dashboard" element={<RolePortal />} />
        <Route path="/super-admin/dashboard" element={<RolePortal />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App