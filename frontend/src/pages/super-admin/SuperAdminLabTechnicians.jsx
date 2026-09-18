import DirectoryPage from './DirectoryPage'
import { FlaskIcon } from '../../components/doctor/icons'

function SuperAdminLabTechnicians() {
  return (
    <DirectoryPage
      role="diagnostic_staff"
      title="Lab Technicians"
      subtitle="Manage registered lab technician accounts and their status."
      icon={<FlaskIcon size={26} />}
    />
  )
}

export default SuperAdminLabTechnicians