import { redirect } from 'next/navigation';

export default async function GroupRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/messages/group/${id}`);
}
