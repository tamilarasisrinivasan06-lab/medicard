import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import Login from './components/Login'
import RoleSelection from './components/roles/RoleSelection'
import RoleLogin from './components/roles/RoleLogin'
import RoleRegister from './components/roles/RoleRegister'
import ForgotPassword from './components/roles/ForgotPassword'
import Scanner from './pages/Scanner'
import DoctorPatientRecords from './pages/DoctorPatientRecords'
import ConsultationForm from './pages/ConsultationForm'
import DoctorLayout from './components/doctor/DoctorLayout'
import PortalLayout from './components/portal/PortalLayout'
import PatientLayout from './components/patient/PatientLayout'
import PatientDashboard from './pages/patient/Dashboard'
import PatientMediCard from './pages/patient/MyMediCard'
import PatientDoctors from './pages/patient/Doctors'
import PatientDoctorDetail from './pages/patient/DoctorDetail'
import PatientPrescriptions from './pages/patient/Prescriptions'
import PatientPharmacy from './pages/patient/Pharmacy'
import PatientBloodTests from './pages/patient/BloodTests'
import PatientScans from './pages/patient/Scans'
import PatientRecords from './pages/patient/MedicalRecords'
import PatientHistory from './pages/patient/MedicalHistory'
import PatientAppointments from './pages/patient/Appointments'
import PatientFollowUps from './pages/patient/FollowUps'
import PatientNotifications from './pages/patient/Notifications'
import PatientProfile from './pages/patient/Profile'
import PatientSettings from './pages/patient/Settings'
import PatientDoctorAccess from './pages/patient/DoctorAccess'
import PatientSearch from './pages/patient/Search'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import DoctorPatients from './pages/doctor/DoctorPatients'
import DoctorPatientDetail from './pages/doctor/DoctorPatientDetail'
import DoctorScan from './pages/doctor/DoctorScan'
import DoctorAccessRequests from './pages/doctor/DoctorAccessRequests'
import DoctorAppointments from './pages/doctor/DoctorAppointments'
import DoctorConsultations from './pages/doctor/DoctorConsultations'
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions'
import DoctorLabRequests from './pages/doctor/DoctorLabRequests'
import DoctorLabReports from './pages/doctor/DoctorLabReports'
import DoctorDocuments from './pages/doctor/DoctorDocuments'
import DoctorFollowUps from './pages/doctor/DoctorFollowUps'
import DoctorAnalytics from './pages/doctor/DoctorAnalytics'
import DoctorHospital from './pages/doctor/DoctorHospital'
import DoctorProfile from './pages/doctor/DoctorProfile'
import DoctorNotifications from './pages/doctor/DoctorNotifications'
import DoctorAudit from './pages/doctor/DoctorAudit'
import DoctorSettings from './pages/doctor/DoctorSettings'
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard'
import PharmacyPrescriptions from './pages/pharmacy/PharmacyPrescriptions'
import LabDashboard from './pages/lab/LabDashboard'
import LabQueue from './pages/lab/LabQueue'
import LabReports from './pages/lab/LabReports'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminHospitals from './pages/admin/AdminHospitals'
import AdminActivity from './pages/admin/AdminActivity'
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard'
import SuperAdminDoctors from './pages/super-admin/SuperAdminDoctors'
import SuperAdminPatients from './pages/super-admin/SuperAdminPatients'
import SuperAdminPharmacies from './pages/super-admin/SuperAdminPharmacies'
import SuperAdminLabTechnicians from './pages/super-admin/SuperAdminLabTechnicians'
import SuperAdminUsers from './pages/super-admin/SuperAdminUsers'
import SuperAdminProfile from './pages/super-admin/SuperAdminProfile'
import { getRole, logout, dashboardForRole } from './api'
import { LogoutIcon } from './components/roles/roleIcons'
import './App.css'

const PORTAL_ROLES = ['patient', 'doctor', 'pharmacist', 'diagnostic_staff', 'hospital', 'admin', 'super_admin']

function App() {
  const navigate = useNavigate()
  const role = getRole()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="medicard-page">
      {role && !PORTAL_ROLES.includes(role) && (
        <nav className="auth-nav">
          {role === 'patient' && <NavLink to="/patient/dashboard">Dashboard</NavLink>}
          {role === 'patient' && <NavLink to="/medicard">My MediCard</NavLink>}
          {role === 'patient' && <NavLink to="/patient/medical-history">Medical History</NavLink>}
          {role === 'patient' && <NavLink to="/patient/medications">Medications</NavLink>}
          {role === 'patient' && <NavLink to="/patient/appointments">Appointments</NavLink>}
          {role === 'patient' && <NavLink to="/patient/access">Doctor Access</NavLink>}
          {role === 'patient' && <NavLink to="/patient/profile">Profile</NavLink>}
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
        <Route path="/register" element={<Navigate to="/register/patient" replace />} />
        <Route path="/register/:role" element={<RoleRegister />} />
        <Route path="/medicard" element={<Navigate to="/patient/medi-card" replace />} />
        <Route path="/scan" element={<Scanner />} />
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="medi-card" element={<PatientMediCard />} />
          <Route path="doctors" element={<PatientDoctors />} />
          <Route path="doctors/:doctorId" element={<PatientDoctorDetail />} />
          <Route path="prescriptions" element={<PatientPrescriptions />} />
          <Route path="pharmacy" element={<PatientPharmacy />} />
          <Route path="blood-tests" element={<PatientBloodTests />} />
          <Route path="scans" element={<PatientScans />} />
          <Route path="records" element={<PatientRecords />} />
          <Route path="history" element={<PatientHistory />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="follow-ups" element={<PatientFollowUps />} />
          <Route path="doctor-access" element={<PatientDoctorAccess />} />
          <Route path="notifications" element={<PatientNotifications />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="settings" element={<PatientSettings />} />
          <Route path="search" element={<PatientSearch />} />
        </Route>
        <Route path="/patient/medical-history" element={<Navigate to="/patient/history" replace />} />
        <Route path="/patient/medications" element={<Navigate to="/patient/profile" replace />} />
        <Route path="/patient/access" element={<Navigate to="/patient/doctor-access" replace />} />
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<Navigate to="/doctor/dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="patients/:patientId" element={<DoctorPatientDetail />} />
          <Route path="scan" element={<DoctorScan />} />
          <Route path="access-requests" element={<DoctorAccessRequests />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="consultations" element={<DoctorConsultations />} />
          <Route path="prescriptions" element={<DoctorPrescriptions />} />
          <Route path="lab-requests" element={<DoctorLabRequests />} />
          <Route path="lab-reports" element={<DoctorLabReports />} />
          <Route path="documents" element={<DoctorDocuments />} />
          <Route path="follow-ups" element={<DoctorFollowUps />} />
          <Route path="analytics" element={<DoctorAnalytics />} />
          <Route path="hospital" element={<DoctorHospital />} />
          <Route path="profile" element={<DoctorProfile />} />
          <Route path="notifications" element={<DoctorNotifications />} />
          <Route path="audit" element={<DoctorAudit />} />
          <Route path="settings" element={<DoctorSettings />} />
        </Route>
        <Route path="/doctor/patient/:patientId/records" element={<DoctorPatientRecords />} />
        <Route path="/doctor/consultation/new" element={<ConsultationForm />} />

        <Route path="/pharmacy" element={<PortalLayout portalKey="pharmacy" />}>
          <Route index element={<Navigate to="/pharmacy/dashboard" replace />} />
          <Route path="dashboard" element={<PharmacyDashboard />} />
          <Route path="queue" element={<PharmacyPrescriptions />} />
          <Route path="dispensed" element={<PharmacyPrescriptions defaultStatus="dispensed" />} />
        </Route>

        <Route path="/lab" element={<PortalLayout portalKey="lab" />}>
          <Route index element={<Navigate to="/lab/dashboard" replace />} />
          <Route path="dashboard" element={<LabDashboard />} />
          <Route path="queue" element={<LabQueue />} />
          <Route path="reports" element={<LabReports />} />
        </Route>

        <Route path="/hospital" element={<PortalLayout portalKey="hospital" />}>
          <Route index element={<Navigate to="/hospital/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="hospitals" element={<AdminHospitals />} />
          <Route path="activity" element={<AdminActivity />} />
        </Route>

        <Route path="/admin/*" element={<Navigate to="/login" replace />} />

        <Route path="/super-admin" element={<PortalLayout portalKey="super_admin" />}>
          <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="doctors" element={<SuperAdminDoctors />} />
          <Route path="patients" element={<SuperAdminPatients />} />
          <Route path="pharmacies" element={<SuperAdminPharmacies />} />
          <Route path="lab-technicians" element={<SuperAdminLabTechnicians />} />
          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="profile" element={<SuperAdminProfile />} />
          <Route path="activity" element={<AdminActivity />} />
        </Route>

        <Route path="/portal" element={<Navigate to={dashboardForRole(role)} replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App