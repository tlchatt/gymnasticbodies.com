import UserDetailClient from './UserDetailClient';
export const metadata = { title: 'User | Admin' };
export default function UserDetailPage({ params }) {
  return <UserDetailClient params={params} />;
}
