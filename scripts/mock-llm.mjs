// Minimal OpenAI-compatible mock server for end-to-end testing.
// Supports /v1/chat/completions with stream:true (SSE) and stream:false.
import http from 'node:http';

const PORT = 5055;

function pickText(messages, kind) {
  const sys = messages.find((m) => m.role === 'system')?.content ?? '';
  const user = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const chars = [...sys.matchAll(/名字：(.+?)（/g)].map((m) => m[1]);
  const name = chars[0] ?? 'AI';

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
