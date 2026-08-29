import { notFound } from 'next/navigation';
import { ChatWindow } from '@/components/chat-window';
import { requireUserId } from '@/lib/session';
import { getConversation, getConversationMessages } from '@/server/chat';

export const dynamic = 'force-dynamic';

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const conv = await getConversation(userId, id);
  if (!conv) notFound();

  const msgs = await getConversationMessages(id, 100);

  return (
    <ChatWindow
      conversationId={id}
      character={conv.character}
      initialMessages={msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }))}
    />
  );
}
