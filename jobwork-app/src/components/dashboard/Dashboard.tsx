import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import AdminDashboard from './AdminDashboard';
import HodDashboard from './HodDashboard';
import UserDashboard from './UserDashboard';

export default function Dashboard() {
  const { currentUser } = useSelector((s: RootState) => s.auth);
  if (!currentUser) return null;

  switch (currentUser.role) {
    case 'admin': return <AdminDashboard />;
    case 'hod': return <HodDashboard />;
    case 'user': return <UserDashboard />;
  }
}
