import AdminAccessView from '../../views/AdminAccessView'

export const dynamic = 'force-dynamic'

export default function SettingsAdminsPage() {
  return <AdminAccessView canWrite={true} />
}
