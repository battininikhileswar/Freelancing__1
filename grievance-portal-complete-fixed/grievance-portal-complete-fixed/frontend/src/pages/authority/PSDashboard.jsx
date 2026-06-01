import AuthorityDashboard from './AuthorityDashboard';

export default function PSDashboard() {
  return (
    <AuthorityDashboard
      authorityType="ps"
      title="Police Station Dashboard"
      icon="🚔"
      color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    />
  );
}
