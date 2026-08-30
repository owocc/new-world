'use client';

import { useState, useEffect } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  Copy,
  Check,
  RefreshCw,
  Cpu,
  FileText,
  MessageSquare,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { TabList, Tab } from '@astryxdesign/core/TabList';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { radiusVars } from '@astryxdesign/core/theme/tokens.stylex';
import { useAppToast } from '@/lib/toast';
import { triggerCharacterDailyMemoryAction } from '@/server/actions/characters';
import {
  getConversationDebugContext,
  getGroupDebugContext,
  type ConversationDebugContext,
  type GroupDebugContext,
} from '@/server/actions/debug';
const styles = stylex.create({
  fixedLayout: {
    height: stylex.firstThatWorks('80dvh', '80vh'),
    minHeight: stylex.firstThatWorks('80dvh', '80vh'),
    maxHeight: stylex.firstThatWorks('80dvh', '80vh'),
    display: 'flex',
    flexDirection: 'column',
  },
  codeCard: {
    backgroundColor: 'var(--color-background-muted)',
    color: 'var(--color-text-primary)',
    borderRadius: radiusVars['--radius-element'],
    padding: '16px',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowX: 'auto',
    border: '1px solid var(--color-border)',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  metaItem: {
    padding: '12px',
    borderRadius: radiusVars['--radius-element'],
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  },
  metaLabel: {
    fontSize: '11px',
    color: 'var(--color-text-secondary)',
    marginBottom: '4px',
  },
  metaValue: {
    fontSize: '13px',
    fontWeight: 'var(--font-weight-semibold, 600)',
    color: 'var(--color-text-primary)',
    wordBreak: 'break-word',
  },
  msgCard: {
    padding: '14px',
    borderRadius: radiusVars['--radius-element'],
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  msgHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: 'var(--color-text-secondary)',
    gap: '8px',
  },
});

export type InspectorProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: 'dm' | 'group';
  conversationId?: string;
  groupId?: string;
};

export function ChatContextInspector({
  isOpen,
  onClose,
  mode,
  conversationId,
  groupId,
}: InspectorProps) {
  const toast = useAppToast();
  const [activeTab, setActiveTab] = useState('prompt');
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const [dmContext, setDmContext] = useState<ConversationDebugContext | null>(null);
  const [groupContext, setGroupContext] = useState<GroupDebugContext | null>(null);

  const targetCharacterId = mode === 'dm' ? dmContext?.character.id : groupContext?.selectedCharacter.id;
  const targetCharacterName = mode === 'dm' ? dmContext?.character.name : groupContext?.selectedCharacter.name;

  const handleSummarizeMemory = async () => {
    if (!targetCharacterId) return;
    setSummarizing(true);
    try {
      const res = await fetch(`/api/characters/${targetCharacterId}/memories/summarize`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok && data.result) {
        const { dmCount, groupCount, memoryCount } = data.result;
        toast.success(`已完成「${targetCharacterName || 'AI'}」今日记忆总结 (读取: ${dmCount + groupCount}条, 已覆写长期记忆: ${memoryCount}条)`);
        await loadContext();
      } else {
        toast.error(data.error || '记忆总结失败');
      }
    } catch (err) {
      console.error('Trigger memory distillation failed:', err);
      toast.error('网络异常，记忆总结失败');
    } finally {
      setSummarizing(false);
    }
  };
  const loadContext = async () => {
    setLoading(true);
    if (mode === 'dm' && conversationId) {
      const res = await getConversationDebugContext(conversationId);
      if (res.ok) {
        setDmContext(res.context);
      } else {
        toast.error(res.error);
      }
    } else if (mode === 'group' && groupId) {
      const res = await getGroupDebugContext(groupId);
      if (res.ok) {
        setGroupContext(res.context);
      } else {
        toast.error(res.error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadContext();
    }
  }, [isOpen, mode, conversationId, groupId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const rawJsonString = mode === 'dm'
    ? JSON.stringify(dmContext, null, 2)
    : JSON.stringify(groupContext, null, 2);

  const tabs = [
    { value: 'prompt', label: '系统提示词 (System Prompt)', icon: <FileText size={14} /> },
    {
      value: 'messages',
      label: mode === 'dm'
        ? `携带消息序列 (${dmContext?.contextMessages.length ?? 0})`
        : '携带消息序列 (爬楼)',
      icon: <MessageSquare size={14} />,
    },
    ...(mode === 'dm'
      ? [
          {
            value: 'memories',
            label: `长期记忆 (${dmContext?.activeMemories.length ?? 0})`,
            icon: <Sparkles size={14} />,
          },
        ]
      : []),
    { value: 'runtime', label: '模型与运行时', icon: <Cpu size={14} /> },
    { value: 'raw', label: '原始 Payload (JSON)', icon: <Layers size={14} /> },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      width={940}
    >
      <Layout
        height="fill"
        xstyle={styles.fixedLayout}
        header={
          <DialogHeader
            title="开发者工具 · AI 上下文检查器"
            onOpenChange={() => onClose()}
          />
        }
        content={
          <LayoutContent isScrollable>
            <VStack gap={4}>
              {/* Top status bar with Badge & Refresh */}
              <HStack hAlign="between" vAlign="center" width="100%">
                <Badge
                  label={
                    mode === 'dm'
                      ? `私聊 · @${dmContext?.character.username || 'ai'}`
                      : `群聊 · ${groupContext?.selectedCharacter.name || 'AI'}`
                  }
                  variant="blue"
                />
                <HStack gap={2} vAlign="center">
                  {targetCharacterId && (
                    <Button
                      label={summarizing ? '正在总结记忆...' : '触发今日记忆总结'}
                      variant="secondary"
                      size="sm"
                      icon={<Sparkles size={13} />}
                      isDisabled={summarizing || loading}
                      isLoading={summarizing}
                      onClick={handleSummarizeMemory}
                    />
                  )}
                  <Button
                    label={loading ? '刷新中…' : '刷新上下文'}
                    variant="ghost"
                    size="sm"
                    icon={<RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
                    onClick={loadContext}
                  />
                </HStack>
              </HStack>

              {/* Tab Navigation */}
              <TabList
                value={activeTab}
                onChange={setActiveTab}
                size="sm"
                hasDivider
                overflow="scroll"
              >
                {tabs.map((t) => (
                  <Tab key={t.value} value={t.value} label={t.label} icon={t.icon} />
                ))}
              </TabList>

              {/* Tab Content */}
              {loading ? (
                <div {...stylex.props(styles.emptyState)}>
                  <RefreshCw size={24} className="animate-spin" />
                  <span>正在装配当前实时上下文...</span>
                </div>
              ) : (
                <>
                  {/* TAB 1: System Prompt */}
                  {activeTab === 'prompt' && (
                    <VStack gap={3}>
                      <HStack hAlign="between" vAlign="center" width="100%">
                        <Text size="sm" as="span" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          最终生成的完整 System Prompt（传给大模型 system 字段）：
                        </Text>
                        <HStack gap={2} vAlign="center">
                          <Text type="supporting" size="sm" as="span">
                            字数：{mode === 'dm' ? dmContext?.systemPrompt.length : groupContext?.systemPrompt.length} 字
                          </Text>
                          <Button
                            label={copiedKey === 'systemPrompt' ? '已复制' : '复制 Prompt'}
                            variant="secondary"
                            size="sm"
                            icon={copiedKey === 'systemPrompt' ? <Check size={13} /> : <Copy size={13} />}
                            onClick={() =>
                              copyToClipboard(
                                (mode === 'dm' ? dmContext?.systemPrompt : groupContext?.systemPrompt) || '',
                                'systemPrompt',
                              )
                            }
                          />
                        </HStack>
                      </HStack>

                      <div {...stylex.props(styles.codeCard)}>
                        {mode === 'dm' ? dmContext?.systemPrompt : groupContext?.systemPrompt}
                      </div>

                      {mode === 'dm' && dmContext?.systemPromptComponents && (
                        <VStack gap={2} style={{ marginTop: 8 }}>
                          <Text size="sm" as="span" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            Prompt 组成拆解：
                          </Text>
                          <div {...stylex.props(styles.metaItem)}>
                            <div {...stylex.props(styles.metaLabel)}>1. 基础人设与社交规则 (Base Persona)</div>
                            <div style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                              {dmContext.systemPromptComponents.basePersonaPrompt}
                            </div>
                          </div>
                          {dmContext.systemPromptComponents.memoryBlock && (
                            <div {...stylex.props(styles.metaItem)}>
                              <div {...stylex.props(styles.metaLabel)}>2. 注入记忆块 (Memory Block)</div>
                              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                {dmContext.systemPromptComponents.memoryBlock}
                              </div>
                            </div>
                          )}
                          {dmContext.systemPromptComponents.rollingSummary && (
                            <div {...stylex.props(styles.metaItem)}>
                              <div {...stylex.props(styles.metaLabel)}>3. 对话历史滚动摘要 (Rolling Summary)</div>
                              <div style={{ fontSize: 13, color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                {dmContext.systemPromptComponents.rollingSummary}
                              </div>
                            </div>
                          )}
                        </VStack>
                      )}
                    </VStack>
                  )}

                  {/* TAB 2: Context Messages */}
                  {activeTab === 'messages' && (
                    <VStack gap={3}>
                      {mode === 'dm' ? (
                        <>
                          <HStack hAlign="between" vAlign="center" width="100%">
                            <Text size="sm" as="span" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              传递给大模型的 Messages 数组序列（按时间顺序）：
                            </Text>
                            <Text type="supporting" size="sm" as="span">
                              共 {dmContext?.contextMessages.length} 条消息
                            </Text>
                          </HStack>

                          {dmContext?.contextMessages.map((msg) => (
                            <div key={msg.id} {...stylex.props(styles.msgCard)}>
                              <div {...stylex.props(styles.msgHeader)}>
                                <HStack gap={1.5} vAlign="center">
                                  <Badge
                                    label={`#${msg.index} ${msg.role}`}
                                    variant={msg.role === 'user' ? 'blue' : 'green'}
                                  />
                                  <Text type="supporting" size="sm" as="span">
                                    {new Date(msg.createdAt).toLocaleTimeString()}
                                  </Text>
                                </HStack>
                                <Text type="supporting" size="sm" as="span">
                                  {msg.charCount} 字符 (约 {msg.estimatedTokens} Tokens)
                                </Text>
                              </div>

                              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>
                                {msg.content}
                              </div>

                              {/* Image Perception Attachment info */}
                              {msg.attachments.length > 0 && (
                                <VStack gap={1} style={{ borderTop: '1px dashed var(--color-border)', paddingTop: 8 }}>
                                  <Text size="sm" as="span" style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 11 }}>
                                    📸 关联图片与 Vision 感知数据：
                                  </Text>
                                  {msg.attachments.map((att, i) => (
                                    <Badge
                                      key={att.id}
                                      variant="purple"
                                      icon={<ImageIcon size={12} />}
                                      label={`图${i + 1}${att.imageType ? ` · ${att.imageType}` : ''}${att.profile ? ` · ${att.profile}` : ''}: ${att.perceptionSummary || '（正在解析中或未生成感知）'}`}
                                    />
                                  ))}
                                </VStack>
                              )}
                            </div>
                          ))}
                        </>
                      ) : (
                        <VStack gap={3}>
                          <Text size="sm" as="span" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            群聊爬楼与上下文装配详情：
                          </Text>
                          <div {...stylex.props(styles.metaGrid)}>
                            <div {...stylex.props(styles.metaItem)}>
                              <div {...stylex.props(styles.metaLabel)}>未读消息数</div>
                              <div {...stylex.props(styles.metaValue)}>{groupContext?.unreadCount} 条</div>
                            </div>
                            <div {...stylex.props(styles.metaItem)}>
                              <div {...stylex.props(styles.metaLabel)}>上次看群时间</div>
                              <div {...stylex.props(styles.metaValue)}>{groupContext?.lastReadAt}</div>
                            </div>
                            <div {...stylex.props(styles.metaItem)}>
                              <div {...stylex.props(styles.metaLabel)}>前序上下文条数</div>
                              <div {...stylex.props(styles.metaValue)}>{groupContext?.precedingCount} 条</div>
                            </div>
                          </div>

                          <HStack hAlign="between" vAlign="center" width="100%" style={{ marginTop: 8 }}>
                            <Text size="sm" as="span" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                              装配给大模型的完整群聊上下文 Block (user prompt)：
                            </Text>
                            <Button
                              label={copiedKey === 'groupPayload' ? '已复制' : '复制 Payload'}
                              variant="secondary"
                              size="sm"
                              icon={copiedKey === 'groupPayload' ? <Check size={13} /> : <Copy size={13} />}
                              onClick={() => copyToClipboard(groupContext?.fullPromptPayload || '', 'groupPayload')}
                            />
                          </HStack>
                          <div {...stylex.props(styles.codeCard)}>
                            {groupContext?.fullPromptPayload}
                          </div>
                        </VStack>
                      )}
                    </VStack>
                  )}

                  {/* TAB 3: Memories */}
                  {activeTab === 'memories' && mode === 'dm' && (
                    <VStack gap={3}>
                      <HStack hAlign="between" vAlign="center" width="100%">
                        <Text size="sm" as="span" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          属于「{dmContext?.character.name}」的已固化长期记忆：
                        </Text>
                        <Text type="supporting" size="sm" as="span">
                          共 {dmContext?.activeMemories.length} 条记忆
                        </Text>
                      </HStack>

                      {dmContext?.activeMemories.length === 0 ? (
                        <div {...stylex.props(styles.emptyState)}>
                          <Sparkles size={20} />
                          <span>暂未提取到长期记忆</span>
                        </div>
                      ) : (
                        <VStack gap={1.5}>
                          {dmContext?.activeMemories.map((mem) => (
                            <div key={mem.id} {...stylex.props(styles.metaItem)}>
                              <HStack hAlign="between" vAlign="center" style={{ marginBottom: 4 }}>
                                <HStack gap={1.5} vAlign="center">
                                  <Badge
                                    label={`${mem.kind} · 重要度: ${Math.round(mem.importance * 100)}%`}
                                    variant={mem.kind === 'grudge' ? 'red' : mem.isFuzzy ? 'neutral' : 'blue'}
                                  />
                                  {mem.strength !== undefined && (
                                    <Badge
                                      label={`强度: ${Math.round(mem.strength * 100)}%`}
                                      variant="neutral"
                                    />
                                  )}
                                  {mem.isFuzzy && (
                                    <Badge
                                      label="模糊记忆 (低置信度)"
                                      variant="neutral"
                                    />
                                  )}
                                  {mem.reinforcementCount && mem.reinforcementCount > 1 && (
                                    <Badge
                                      label={`强化×${mem.reinforcementCount}`}
                                      variant="green"
                                    />
                                  )}
                                </HStack>
                                <Text type="supporting" size="sm" as="span">
                                  {new Date(mem.createdAt).toLocaleDateString()}
                                </Text>
                              </HStack>
                              <div style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{mem.content}</div>
                            </div>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                  )}

                  {/* TAB 4: Model & Runtime */}
                  {activeTab === 'runtime' && (
                    <VStack gap={3}>
                      <Text size="sm" as="span" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        模型路由与运行时配置详情：
                      </Text>

                      <div {...stylex.props(styles.metaGrid)}>
                        <div {...stylex.props(styles.metaItem)}>
                          <div {...stylex.props(styles.metaLabel)}>AI 服务商 (Provider)</div>
                          <div {...stylex.props(styles.metaValue)}>
                            {mode === 'dm' ? dmContext?.model.providerName : groupContext?.model.providerName} (
                            {mode === 'dm' ? dmContext?.model.providerType : groupContext?.model.providerType})
                          </div>
                        </div>

                        <div {...stylex.props(styles.metaItem)}>
                          <div {...stylex.props(styles.metaLabel)}>聊天模型 (Model ID)</div>
                          <div {...stylex.props(styles.metaValue)}>
                            {mode === 'dm' ? dmContext?.model.modelId : groupContext?.model.modelId}
                          </div>
                        </div>

                        <div {...stylex.props(styles.metaItem)}>
                          <div {...stylex.props(styles.metaLabel)}>模型原生视觉能力</div>
                          <div {...stylex.props(styles.metaValue)}>
                            {(mode === 'dm' ? dmContext?.model.supportsVision : groupContext?.model.supportsVision) ? '支持 Vision' : '纯文本模型 (依赖统一感知)'}
                          </div>
                        </div>

                        <div {...stylex.props(styles.metaItem)}>
                          <div {...stylex.props(styles.metaLabel)}>图片理解配置 (Vision Interpreter)</div>
                          <div {...stylex.props(styles.metaValue)}>
                            {dmContext?.vision.enabled
                              ? `已启用 (${dmContext.vision.modelId || '默认模型'})`
                              : '未启用'}
                          </div>
                        </div>

                        <div {...stylex.props(styles.metaItem)}>
                          <div {...stylex.props(styles.metaLabel)}>Temperature</div>
                          <div {...stylex.props(styles.metaValue)}>
                            {(mode === 'dm' ? dmContext?.model.temperature : groupContext?.model.temperature) ?? '默认'}
                          </div>
                        </div>

                        <div {...stylex.props(styles.metaItem)}>
                          <div {...stylex.props(styles.metaLabel)}>Max Output Tokens</div>
                          <div {...stylex.props(styles.metaValue)}>
                            {mode === 'dm' ? dmContext?.model.maxTokens ?? 800 : 800}
                          </div>
                        </div>
                      </div>
                    </VStack>
                  )}

                  {/* TAB 5: Raw JSON */}
                  {activeTab === 'raw' && (
                    <VStack gap={2}>
                      <HStack hAlign="between" vAlign="center" width="100%">
                        <Text size="sm" as="span" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          完整结构化 JSON Payload：
                        </Text>
                        <Button
                          label={copiedKey === 'rawJson' ? '已复制 JSON' : '复制全部 JSON'}
                          variant="secondary"
                          size="sm"
                          icon={copiedKey === 'rawJson' ? <Check size={13} /> : <Copy size={13} />}
                          onClick={() => copyToClipboard(rawJsonString, 'rawJson')}
                        />
                      </HStack>
                      <div {...stylex.props(styles.codeCard)}>
                        {rawJsonString}
                      </div>
                    </VStack>
                  )}
                </>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="between" vAlign="center" width="100%" paddingInline={4} paddingBlock={2}>
              <Text type="supporting" size="sm">
                {mode === 'dm'
                  ? `共 ${dmContext?.totalMessagesInConversation ?? 0} 条历史记录 · 预估上下文 ${dmContext?.estimatedTotalTokens ?? 0} Tokens`
                  : `预估单次决策消耗 ${groupContext?.estimatedTokens ?? 0} Tokens`}
              </Text>
              <HStack gap={2}>
                <Button
                  label={copiedKey === 'fullCopy' ? '已复制全部' : '复制完整 Payload'}
                  variant="secondary"
                  size="sm"
                  icon={copiedKey === 'fullCopy' ? <Check size={13} /> : <Copy size={13} />}
                  onClick={() => copyToClipboard(rawJsonString, 'fullCopy')}
                />
                <Button label="关闭" variant="primary" size="sm" onClick={onClose} />
              </HStack>
            </HStack>
          </LayoutFooter>
        }
        />
    </Dialog>
  );
}
