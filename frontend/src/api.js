const API_URL = 'http://localhost:5000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')
const ACCESS_KEY = 'medicardAccess'
const TOKEN_KEY = 'token'
const ROLE_KEY = 'role'

// Backend file URLs are returned as relative paths (e.g. /api/files/12/download).
// Protected downloads require the Authorization header, so they must be fetched
// through the API rather than linked directly.
function resolveFileUrl(url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

async function fetchFileObjectUrl(url) {
  const absolute = resolveFileUrl(url)
  const token = getToken()
  const res = await fetch(absolute, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    throw new Error('Could not open the file. It may have been removed.')
  }
  return URL.createObjectURL(await res.blob())
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
}

function getRole() {
  return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY)
}

function setSession(token, role, persist = true) {
  const store = persist ? localStorage : sessionStorage
  store.setItem(TOKEN_KEY, token)
  store.setItem(ROLE_KEY, role)
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(ROLE_KEY)
}

async function request(path, options = {}, accessToken = null) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(accessToken ? { 'x-access-token': accessToken } : {}),
    ...(options.headers || {}),
  }
  return fetch(`${API_URL}${path}`, { ...options, headers }).then((res) => res.json())
}

async function requestFile(path, formData, accessToken = null) {
  const token = getToken()
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(accessToken ? { 'x-access-token': accessToken } : {}),
  }
  return fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData }).then((res) => res.json())
}

function setSavedAccess(obj) {
  sessionStorage.setItem(ACCESS_KEY, JSON.stringify(obj))
}

function getSavedAccess() {
  try {
    const raw = sessionStorage.getItem(ACCESS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearSavedAccess() {
  sessionStorage.removeItem(ACCESS_KEY)
}

// Auth
async function login({ role, loginId, password }) {
  const backendRole = role === 'super-admin' ? 'super_admin' : role
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: loginId, password, role: backendRole }),
  })
}

async function loginUser(email, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

async function forgotPassword(email) {
  return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })
}

async function registerUser(userData) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(userData) })
}

async function logoutUser() {
  return request('/auth/logout', { method: 'POST' })
}

function dashboardForRole(role) {
  switch (role) {
    case 'patient':
      return '/patient/dashboard'
    case 'doctor':
      return '/doctor/dashboard'
    case 'hospital':
      return '/hospital/dashboard'
    case 'admin':
      return '/admin/dashboard'
    case 'super_admin':
      return '/super-admin/dashboard'
    case 'pharmacist':
      return '/pharmacy/dashboard'
    case 'diagnostic_staff':
      return '/lab/dashboard'
    default:
      return '/'
  }
}

async function logout() {
  try {
    await logoutUser()
  } catch {
    // ignore server errors during logout
  }
  clearSession()
  clearSavedAccess()
}

async function getMe() {
  return request('/auth/me')
}

// MediCard
async function getMyMedicard() {
  return request('/medicard/me')
}

async function scanMedicard(qrPayload) {
  return request('/medicard/scan', { method: 'POST', body: JSON.stringify({ qrPayload }) })
}

async function requestMedicardAccess(medicardId) {
  return request('/medicard/access-request', { method: 'POST', body: JSON.stringify({ medicardId }) })
}

async function verifyMedicard(verificationId, otp) {
  return request('/medicard/verify', { method: 'POST', body: JSON.stringify({ verificationId, otp }) })
}

async function searchMedicard(medicardId) {
  return request(`/medicard/${encodeURIComponent(medicardId)}`)
}

// Patient profile & dashboard
async function getMyProfile() {
  return request('/patient/profile')
}

async function updateMyProfile(payload) {
  return request('/patient/profile', { method: 'PATCH', body: JSON.stringify(payload) })
}

async function getDashboard() {
  return request('/patient/dashboard')
}

// Medical records
async function getMyRecords() {
  return request('/medical-records/my')
}

async function getPatientRecords(patientId, accessToken) {
  return request(`/medical-records/patient/${patientId}`, {}, accessToken)
}

async function getRecord(recordId, accessToken) {
  return request(`/medical-records/${recordId}`, {}, accessToken)
}

async function createMedicalRecord(payload, accessToken) {
  return request('/medical-records', { method: 'POST', body: JSON.stringify(payload) }, accessToken)
}

async function updateMedicalRecord(recordId, payload, accessToken) {
  return request(`/medical-records/${recordId}`, { method: 'PATCH', body: JSON.stringify(payload) }, accessToken)
}

// Medications
async function getMyMedications() {
  return request('/medications/my')
}

async function addMedication(payload) {
  return request('/medications', { method: 'POST', body: JSON.stringify(payload) })
}

async function updateMedication(medicationId, payload) {
  return request(`/medications/${medicationId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

async function deleteMedication(medicationId) {
  return request(`/medications/${medicationId}`, { method: 'DELETE' })
}

// Allergies
async function getMyAllergies() {
  return request('/allergies/my')
}

async function addAllergy(payload) {
  return request('/allergies', { method: 'POST', body: JSON.stringify(payload) })
}

async function deleteAllergy(allergyId) {
  return request(`/allergies/${allergyId}`, { method: 'DELETE' })
}

// Emergency contacts
async function getMyContacts() {
  return request('/emergency-contacts/my')
}

async function addContact(payload) {
  return request('/emergency-contacts', { method: 'POST', body: JSON.stringify(payload) })
}

async function deleteContact(contactId) {
  return request(`/emergency-contacts/${contactId}`, { method: 'DELETE' })
}

// Appointments
async function getMyAppointments() {
  return request('/appointments/my')
}

async function createAppointment(payload) {
  return request('/appointments', { method: 'POST', body: JSON.stringify(payload) })
}

async function cancelAppointment(appointmentId) {
  return request(`/appointments/${appointmentId}/cancel`, { method: 'POST' })
}

// Doctors & hospitals
async function getDoctorStats() {
  return request('/doctors/stats')
}

async function listDoctors() {
  return request('/doctors')
}

async function listHospitals() {
  return request('/hospitals')
}

// Prescriptions
async function getMyPrescriptions() {
  return request('/prescriptions/my')
}

// Files
async function uploadMedicalFile(formData) {
  return requestFile('/files/upload', formData)
}

async function uploadPatientFile(patientId, file) {
  const formData = new FormData()
  formData.append('patientId', patientId)
  formData.append('file', file)
  return requestFile('/files/upload', formData)
}

// Doctor portal
async function getDoctorProfile() {
  return request('/doctor-portal/me')
}

async function updateDoctorProfile(payload) {
  return request('/doctor-portal/me', { method: 'PATCH', body: JSON.stringify(payload) })
}

async function getDoctorDashboard(range) {
  const qs = range ? `?range=${encodeURIComponent(range)}` : ''
  return request(`/doctor-portal/dashboard${qs}`)
}

async function getDoctorAnalytics(range) {
  const q = range ? `?range=${encodeURIComponent(range)}` : ''
  return request(`/doctor-portal/analytics${q}`)
}

async function getDoctorPatients() {
  return request('/doctor-portal/patients')
}

async function requestPatientAccess(payload) {
  return request('/doctor-portal/patient-access/request', { method: 'POST', body: JSON.stringify(payload) })
}

async function lookupPatient({ medicardId, qrPayload } = {}) {
  const params = new URLSearchParams()
  if (medicardId) params.set('medicardId', medicardId)
  if (qrPayload) params.set('qrPayload', qrPayload)
  const qs = params.toString()
  return request(`/doctor-portal/patient-access/lookup${qs ? `?${qs}` : ''}`)
}

async function getAccessRequests(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/doctor-portal/patient-access/requests${q}`)
}

async function revokePatientAccess(patientId) {
  return request(`/doctor-portal/patients/${patientId}/revoke`, { method: 'POST' })
}

async function getPatientTimeline(patientId) {
  return request(`/doctor-portal/patients/${patientId}/timeline`)
}

async function getDoctorConsultations(range) {
  const q = range ? `?range=${encodeURIComponent(range)}` : ''
  return request(`/doctor-portal/consultations${q}`)
}

async function createConsultation(patientId, payload) {
  return request(`/doctor-portal/patients/${patientId}/consultations`, { method: 'POST', body: JSON.stringify(payload) })
}

async function updateConsultation(consultationId, payload) {
  return request(`/doctor-portal/consultations/${consultationId}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

async function deleteConsultation(consultationId) {
  return request(`/doctor-portal/consultations/${consultationId}`, { method: 'DELETE' })
}

async function getDoctorPrescriptions() {
  return request('/doctor-portal/prescriptions')
}

async function createDoctorPrescription(patientId, payload) {
  return request(`/doctor-portal/patients/${patientId}/prescriptions`, { method: 'POST', body: JSON.stringify(payload) })
}

async function getDoctorLabRequests() {
  return request('/doctor-portal/lab-requests')
}

async function createLabRequest(patientId, payload) {
  return request(`/doctor-portal/patients/${patientId}/lab-requests`, { method: 'POST', body: JSON.stringify(payload) })
}

async function updateLabRequestStatus(labRequestId, status) {
  return request(`/doctor-portal/lab-requests/${labRequestId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

async function getDoctorLabReports() {
  return request('/doctor-portal/lab-reports')
}

async function createLabReport(patientId, payload) {
  return request(`/doctor-portal/patients/${patientId}/lab-reports`, { method: 'POST', body: JSON.stringify(payload) })
}

async function getDoctorDocuments(patientId) {
  const q = patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''
  return request(`/doctor-portal/documents${q}`)
}

async function createDocument(patientId, payload) {
  return request(`/doctor-portal/patients/${patientId}/documents`, { method: 'POST', body: JSON.stringify(payload) })
}

async function deleteDocument(documentId) {
  return request(`/doctor-portal/documents/${documentId}`, { method: 'DELETE' })
}

async function getDoctorFollowUps(opts = {}) {
  const params = new URLSearchParams()
  if (opts.status) params.set('status', opts.status)
  if (opts.dueOnly) params.set('dueOnly', 'true')
  const qs = params.toString()
  return request(`/doctor-portal/follow-ups${qs ? `?${qs}` : ''}`)
}

async function createFollowUp(patientId, payload) {
  return request(`/doctor-portal/patients/${patientId}/follow-ups`, { method: 'POST', body: JSON.stringify(payload) })
}

async function updateFollowUpStatus(followUpId, status) {
  return request(`/doctor-portal/follow-ups/${followUpId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

async function getDoctorAppointments() {
  return request('/doctor-portal/appointments')
}

async function updateDoctorAppointmentStatus(appointmentId, status) {
  return request(`/doctor-portal/appointments/${appointmentId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

async function getDoctorHospital() {
  return request('/doctor-portal/hospital')
}

async function getDoctorNotifications(unreadOnly) {
  const q = unreadOnly ? '?unreadOnly=true' : ''
  return request(`/doctor-portal/notifications${q}`)
}

async function markDoctorNotificationRead(notificationId) {
  return request(`/doctor-portal/notifications/${notificationId}/read`, { method: 'POST' })
}

async function markAllDoctorNotificationsRead() {
  return request('/doctor-portal/notifications/read-all', { method: 'POST' })
}

async function getDoctorAudit() {
  return request('/doctor-portal/audit')
}

// Patient — doctor access requests
async function getMyDoctorAccess(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/patient/access${q}`)
}

async function decideDoctorAccess(accessId, decision) {
  return request(`/patient/access/${accessId}/decide`, { method: 'POST', body: JSON.stringify({ decision }) })
}

// Pharmacy portal
async function getPharmacyDashboard() {
  return request('/pharmacy/dashboard')
}

async function getPharmacyPrescriptions(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/pharmacy/prescriptions${q}`)
}

async function getPharmacyPrescription(prescriptionId) {
  return request(`/pharmacy/prescriptions/${prescriptionId}`)
}

async function dispensePrescription(prescriptionId) {
  return request(`/pharmacy/prescriptions/${prescriptionId}/dispense`, { method: 'POST' })
}

// Diagnostic lab portal
async function getLabDashboard() {
  return request('/lab-portal/dashboard')
}

async function getLabQueue(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/lab-portal/requests${q}`)
}

async function updateLabQueueStatus(labRequestId, status) {
  return request(`/lab-portal/requests/${labRequestId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

async function createLabReportForRequest(labRequestId, payload) {
  return request(`/lab-portal/requests/${labRequestId}/report`, { method: 'POST', body: JSON.stringify(payload) })
}

async function getLabPortalReports() {
  return request('/lab-portal/reports')
}

// Patient portal
async function getPatientPortalDashboard() {
  return request('/patient-portal/dashboard')
}

async function getPatientPortalMedicard() {
  return request('/patient-portal/medicard')
}

async function getPatientPortalDoctors(search) {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  return request(`/patient-portal/doctors${q}`)
}

async function getPatientPortalDoctor(doctorId) {
  return request(`/patient-portal/doctors/${doctorId}`)
}

async function getPatientPortalTimeline(types) {
  const q = types ? `?types=${encodeURIComponent(types)}` : ''
  return request(`/patient-portal/timeline${q}`)
}

async function getPatientPortalRecords() {
  return request('/patient-portal/records')
}

async function getPatientPortalDocuments() {
  return request('/patient-portal/documents')
}

async function getPatientPortalLabReports() {
  return request('/patient-portal/lab-reports')
}

async function getPatientPortalScans() {
  return request('/patient-portal/scans')
}

async function getPatientPortalPharmacy() {
  return request('/patient-portal/pharmacy')
}

async function getPatientPortalFollowUps() {
  return request('/patient-portal/follow-ups')
}

async function getPatientPortalNotifications(unreadOnly) {
  const q = unreadOnly ? '?unread=true' : ''
  return request(`/patient-portal/notifications${q}`)
}

async function markPatientPortalNotificationRead(notificationId) {
  return request(`/patient-portal/notifications/${notificationId}/read`, { method: 'POST' })
}

async function markAllPatientPortalNotificationsRead() {
  return request('/patient-portal/notifications/read-all', { method: 'POST' })
}

async function searchPatientPortal(query) {
  return request(`/patient-portal/search?q=${encodeURIComponent(query)}`)
}

async function getPatientPortalAccessHistory(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/patient-portal/access-history${q}`)
}

// Admin & hospital portal
async function getAdminDashboard() {
  return request('/admin/dashboard')
}

async function getAdminUsers(opts = {}) {
  const params = new URLSearchParams()
  if (opts.role) params.set('role', opts.role)
  if (opts.q) params.set('q', opts.q)
  const qs = params.toString()
  return request(`/admin/users${qs ? `?${qs}` : ''}`)
}

async function setAdminUserStatus(userId, isActive) {
  return request(`/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) })
}

async function getAdminHospitals() {
  return request('/admin/hospitals')
}

async function createAdminHospital(payload) {
  return request('/admin/hospitals', { method: 'POST', body: JSON.stringify(payload) })
}

async function getAdminActivity() {
  return request('/admin/activity')
}

// Super Admin portal
async function getSuperAdminDashboard() {
  return request('/super-admin/dashboard')
}

async function getSuperAdminUsers(opts = {}) {
  const params = new URLSearchParams()
  if (opts.role) params.set('role', opts.role)
  if (opts.q) params.set('q', opts.q)
  const qs = params.toString()
  return request(`/super-admin/users${qs ? `?${qs}` : ''}`)
}

async function setSuperAdminUserStatus(userId, isActive) {
  return request(`/super-admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) })
}

async function getSuperAdminProfile() {
  return request('/super-admin/profile')
}

async function updateSuperAdminProfile(payload) {
  return request('/super-admin/profile', { method: 'PATCH', body: JSON.stringify(payload) })
}

export {
  login,
  loginUser,
  forgotPassword,
  registerUser,
  logoutUser,
  logout,
  dashboardForRole,
  getMe,
  getMyMedicard,
  scanMedicard,
  requestMedicardAccess,
  verifyMedicard,
  searchMedicard,
  getMyProfile,
  updateMyProfile,
  getDashboard,
  getMyRecords,
  getPatientRecords,
  getRecord,
  createMedicalRecord,
  updateMedicalRecord,
  getMyMedications,
  addMedication,
  updateMedication,
  deleteMedication,
  getMyAllergies,
  addAllergy,
  deleteAllergy,
  getMyContacts,
  addContact,
  deleteContact,
  getMyAppointments,
  createAppointment,
  cancelAppointment,
  getDoctorStats,
  listDoctors,
  listHospitals,
  getMyPrescriptions,
  uploadMedicalFile,
  uploadPatientFile,
  resolveFileUrl,
  fetchFileObjectUrl,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorDashboard,
  getDoctorAnalytics,
  getDoctorPatients,
  requestPatientAccess,
  lookupPatient,
  getAccessRequests,
  revokePatientAccess,
  getPatientTimeline,
  getDoctorConsultations,
  createConsultation,
  updateConsultation,
  deleteConsultation,
  getDoctorPrescriptions,
  createDoctorPrescription,
  getDoctorLabRequests,
  createLabRequest,
  updateLabRequestStatus,
  getDoctorLabReports,
  createLabReport,
  getDoctorDocuments,
  createDocument,
  deleteDocument,
  getDoctorFollowUps,
  createFollowUp,
  updateFollowUpStatus,
  getDoctorAppointments,
  updateDoctorAppointmentStatus,
  getDoctorHospital,
  getDoctorNotifications,
  markDoctorNotificationRead,
  markAllDoctorNotificationsRead,
  getDoctorAudit,
  getMyDoctorAccess,
  decideDoctorAccess,
  getPharmacyDashboard,
  getPharmacyPrescriptions,
  getPharmacyPrescription,
  dispensePrescription,
  getLabDashboard,
  getLabQueue,
  updateLabQueueStatus,
  createLabReportForRequest,
  getLabPortalReports,
  getAdminDashboard,
  getAdminUsers,
  setAdminUserStatus,
  getAdminHospitals,
  createAdminHospital,
  getAdminActivity,
  getSuperAdminDashboard,
  getSuperAdminUsers,
  setSuperAdminUserStatus,
  getSuperAdminProfile,
  updateSuperAdminProfile,
  getPatientPortalDashboard,
  getPatientPortalMedicard,
  getPatientPortalDoctors,
  getPatientPortalDoctor,
  getPatientPortalTimeline,
  getPatientPortalRecords,
  getPatientPortalDocuments,
  getPatientPortalLabReports,
  getPatientPortalScans,
  getPatientPortalPharmacy,
  getPatientPortalFollowUps,
  getPatientPortalNotifications,
  markPatientPortalNotificationRead,
  markAllPatientPortalNotificationsRead,
  searchPatientPortal,
  getPatientPortalAccessHistory,
  getToken,
  getRole,
  setSession,
  clearSession,
  setSavedAccess,
  getSavedAccess,
  clearSavedAccess,
}
