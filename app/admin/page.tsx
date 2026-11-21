import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import AdminApp from '@/components/admin/AdminApp';

export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login');
  const s = await getSettings();
  return <AdminApp name={s.name} />;
}
