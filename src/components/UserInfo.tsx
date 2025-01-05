import { useAuth } from '@/hooks/useAuth';

export const UserInfo = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">User Information</h2>
      <div className="space-y-2">
        <p><span className="font-semibold">User ID:</span> {user.id}</p>
        <p><span className="font-semibold">Email:</span> {user.email}</p>
        <p><span className="font-semibold">Last Sign In:</span> {new Date(user.last_sign_in_at || '').toLocaleString()}</p>
      </div>
    </div>
  );
};