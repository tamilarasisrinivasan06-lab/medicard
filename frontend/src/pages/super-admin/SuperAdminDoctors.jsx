import DirectoryPage from './DirectoryPage'
import { StethoscopeIcon } from '../../components/doctor/icons'

function SuperAdminDoctors() {
  return (
    <DirectoryPage
      role="doctor"
      title="Doctors"
      subtitle="Manage registered doctors and their account status."
      icon={<StethoscopeIcon size={26} />}
    />
  )
}

export default SuperAdminDoctors