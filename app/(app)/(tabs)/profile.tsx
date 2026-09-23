import { Redirect } from 'expo-router';

import { useSession } from '@/features/auth/session';
import { PublicProfileScreen } from '@/features/players/public-profile-screen';

export default function ProfileTab() {
  const { user } = useSession();
  if (!user) return <Redirect href='/login' />;
  return <PublicProfileScreen userId={user.id} />;
}
