import AuthorityDashboard from './AuthorityDashboard';

export default function HospitalDashboard() {
  return (
    <AuthorityDashboard
      authorityType="hospital"
      title="Healthcare & Hospital Authority Dashboard"
      icon="🏥"
      color="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
    />
  );
}
