import AuthorityDashboard from './AuthorityDashboard';

export default function MunicipalDashboard() {
  return (
    <AuthorityDashboard
      authorityType="municipal"
      title="Municipal Authority Dashboard"
      icon="🏛️"
      color="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
    />
  );
}
