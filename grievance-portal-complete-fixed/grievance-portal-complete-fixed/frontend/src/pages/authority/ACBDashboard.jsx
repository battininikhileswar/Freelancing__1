import AuthorityDashboard from './AuthorityDashboard';

export function ACBDashboard() {
  return (
    <AuthorityDashboard
      authorityType="acb"
      title="Anti-Corruption Bureau Dashboard"
      icon="⚖️"
      color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
    />
  );
}

export function MunicipalDashboard() {
  return (
    <AuthorityDashboard
      authorityType="municipal"
      title="Municipal Authority Dashboard"
      icon="🏛️"
      color="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
    />
  );
}

export default ACBDashboard;
