// Minimal OpenAI-compatible mock server for end-to-end testing.
// Supports /v1/chat/completions with stream:true (SSE) and stream:false.
import http from 'node:http';

const PORT = 5055;

function pickText(messages, kind) {
  const sys = messages.find((m) => m.role === 'system')?.content ?? '';
  const user = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const chars = [...sys.matchAll(/名字：(.+?)（/g)].map((m) => m[1]);
  const name = chars[0] ?? 'AI';

  // vision interpreter
  if (sys.includes('Vision Interpreter') || sys.includes('图片感知') || user.includes('分析此图片')) {
    return JSON.stringify({
      summary: '这是一张室内照片。画面中有一只橘猫趴在白色窗台上，窗外正在下雨。桌面上放着一杯咖啡和一本打开的书。',
      mainContent: '趴在窗台上的橘猫与桌上的咖啡和书',
      scene: '室内窗边，雨天，光线温馨',
      objects: ['橘猫', '白色窗台', '咖啡杯', '书'],
      details: ['橘猫闭眼休息', '窗玻璃上有雨滴'],
      ocrText: null,
      imageType: '真实照片',
      mood: '温馨宁静',
    });
  }

  // group decision
  if (user.includes('行为决策') || sys.includes('群聊') || user.includes('【群聊信息】')) {
    return JSON.stringify({
      action: 'reply',
      reasoning: `看到大家在聊，${name}决定参与回复`,
      replyContent: `（${name}）这个我赞同，大家接着聊！`,
      shouldFormMemory: true,
      memoryFact: '群里讨论了近期计划',
      memoryImportance: 0.7,
    });
  }
  // decision calls ask for JSON with act/comment
  if (user.includes('决定是否评论') || user.includes('回复这条评论')) {
    const act = Math.random() < 0.85;
    return JSON.stringify({
      act,
      comment: act ? `（${name}的测试评论）这条说出了我的心声，赞！` : '',
    });
  }
  // 聊天回合（异步 turn）：按固定钱包协议模拟决策——领红包、收转账、回转账
  const redPacketIdMatch = sys.match(/红包还没领：id=([0-9a-f-]+)/);
  const pendingTransferMatch = sys.match(/转账还没收款：id=([0-9a-f-]+)/);
  if ((redPacketIdMatch || pendingTransferMatch) && !user.includes('内部决策')) {
    const result = { messages: ['好嘞，钱的事这就处理！'], claim_red_packet_ids: [], accept_transfer_ids: [] };
    if (pendingTransferMatch) result.accept_transfer_ids = [pendingTransferMatch[1]];
    if (redPacketIdMatch) result.claim_red_packet_ids = [redPacketIdMatch[1]];
    // 用户提到「转回」「转给你」时模拟发一笔转账
    if (user.includes('转回') || user.includes('转给你')) {
      result.messages = ['行，那我转回给你，你查收一下～'];
      result.transfer_out = { to: 'user', amount: 8.88, note: '测试转账回传' };
    }
    return JSON.stringify(result);
  }
  // 内部生图决策
  if (user.includes('【内部决策，不要回复用户】') && user.includes('是否适合随消息发一张图片')) {
    return JSON.stringify({ act: false, prompt: '' });
  }
  // memory extraction
  if (sys.includes('长期记忆') || sys.includes('值得长期记忆')) {
    return JSON.stringify({ memories: [] });
  }
  if (user.includes('发一条动态')) {
    return `（${name}的测试动态）周末去江边走了走，风很舒服。`;
  }
  if (user.includes('私聊')) {
    return `嘿，好久没聊了，最近怎么样？`;
  }
  if (sys.includes('摘要器')) {
    return '测试摘要：用户与 AI 进行了日常交谈。';
  }
  return `（${name}的测试回复）收到！${user.slice(0, 40)}`;
}

function usage() {
  return { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 };
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    try {
      const payload = JSON.parse(body || '{}');
      const messages = payload.messages ?? [];
      const isStream = payload.stream === true || payload.stream === undefined ? payload.stream === true : false;
      const text = pickText(messages);

      if (payload.response_format?.type === 'json_schema' || payload.response_format?.type === 'json_object') {
        // non-stream structured output
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'mock', object: 'chat.completion', created: Date.now() / 1000, model: payload.model ?? 'mock', choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: usage() }));
        return;
      }

      if (isStream) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
        const chunks = text.match(/.{1,12}/gs) ?? [text];
        for (const c of chunks) {
          res.write(`data: ${JSON.stringify({ id: 'mock', object: 'chat.completion.chunk', created: Date.now() / 1000, model: payload.model ?? 'mock', choices: [{ index: 0, delta: { content: c }, finish_reason: null }] })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ id: 'mock', object: 'chat.completion.chunk', created: Date.now() / 1000, model: payload.model ?? 'mock', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: usage() })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'mock', object: 'chat.completion', created: Date.now() / 1000, model: payload.model ?? 'mock', choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: usage() }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: String(err) } }));
    }
  });
});

server.listen(PORT, () => console.log(`mock LLM on :${PORT}`));
