import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters } from '@/db/schema';
import { requireUserId } from '@/lib/session';
import { getGroupDetails, getGroupMessages } from '@/server/groups';
import { GroupChatWindow } from '@/components/groups/group-chat-window';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const details = await getGroupDetails(userId, id);
  return {
    title: details?.group.name ? `群聊 · ${details.group.name}` : '群聊',
  };
}

export default async function MessageGroupRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();

  const [details, initialMessages, allCharacters] = await Promise.all([
    getGroupDetails(userId, id),
    getGroupMessages(userId, id, 100),
    db
      .select()
      .from(aiCharacters)
      .where(and(eq(aiCharacters.userId, userId), eq(aiCharacters.status, 'active'))),
  ]);

  if (!details) {
    notFound();
  }

  return (
    <GroupChatWindow
      group={details.group}
      members={details.members}
      allCharacters={allCharacters}
      initialMessages={initialMessages}
    />
  );
}
