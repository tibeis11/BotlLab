import EnterpriseCodesView from '../../views/EnterpriseCodesView'

export const dynamic = 'force-dynamic'

export default function SettingsEnterprisePage() {
  return <EnterpriseCodesView canWrite={true} />
}
