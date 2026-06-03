import AuthorityDashboard from './AuthorityDashboard';

export default function FireDashboard() {
  return (
    <AuthorityDashboard
      authorityType="fire"
      title="Fire Department Authority Dashboard"
      icon="🔥"
      color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    />
  );
}
