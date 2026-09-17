const API_URL = 'http://localhost:5000/api'
const ACCESS_KEY = 'medicardAccess'
const TOKEN_KEY = 'token'
const ROLE_KEY = 'role'

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
    case 'diagnostic_staff':
      return '/scan'
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
  getToken,
  getRole,
  setSession,
  clearSession,
  setSavedAccess,
  getSavedAccess,
  clearSavedAccess,
}