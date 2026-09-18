import DirectoryPage from './DirectoryPage'
import { StoreIcon } from '../../components/doctor/icons'

function SuperAdminPharmacies() {
  return (
    <DirectoryPage
      role="pharmacist"
      title="Pharmacies"
      subtitle="Manage registered pharmacy accounts and their status."
      icon={<StoreIcon size={26} />}
    />
  )
}

export default SuperAdminPharmacies