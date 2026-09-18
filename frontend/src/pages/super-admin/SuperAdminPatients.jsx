import DirectoryPage from './DirectoryPage'
import { PatientsIcon } from '../../components/doctor/icons'

function SuperAdminPatients() {
  return (
    <DirectoryPage
      role="patient"
      title="Patients"
      subtitle="Manage registered patients and their account status."
      icon={<PatientsIcon size={26} />}
    />
  )
}

export default SuperAdminPatients