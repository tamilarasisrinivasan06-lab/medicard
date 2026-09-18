import DirectoryPage from './DirectoryPage'
import { UserCheckIcon } from '../../components/doctor/icons'

function SuperAdminUsers() {
  return (
    <DirectoryPage
      title="Users"
      subtitle="All MediCard accounts across every role."
      icon={<UserCheckIcon size={26} />}
      showRole
    />
  )
}

export default SuperAdminUsers