#!/usr/bin/env node
/**
 * OpenClaw Sync API - FAST Version (DashScope Direct)
 * 
 * 直接调用 DashScope API，绕过 OpenClaw CLI 开销
 * 响应时间：1-5 秒（原版 5-15 秒）
 * 
 * 内置 API Key，无需额外配置
 */

const http = require('http');
const https = require('https');

// ============ 配置 ============
const PORT = process.env.API_PORT || 18791;
const TIMEOUT_MS = parseInt(process.env.API_TIMEOUT || '30000');

// DashScope 配置（从 OpenClaw 配置提取）
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || 'sk-d997add3f630491ab11b0dd7d151130b';
const DASHSCOPE_MODEL = process.env.DASHSCOPE_MODEL || 'qwen-turbo'; // turbo 更快更便宜

// 精简系统提示
const SYSTEM_PROMPT = '你是 OpenClaw AI 助手。直接、简洁地回答问题，避免冗余。';

// ============ HTTP 请求封装 ============
function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ============ DashScope API ============
async function callDashScope(messages, model = DASHSCOPE_MODEL) {
  const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
    }
  };

  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ],
    temperature: 0.7,
    max_tokens: 2048,
    stream: false
  };

  const start = Date.now();
  const result = await httpsRequest(url, options, body);
  const duration = Date.now() - start;

  if (result.status !== 200) {
    throw new Error(`DashScope API error (${result.status}): ${JSON.stringify(result.data)}`);
  }

  return {
    text: result.data.choices[0].message.content,
    usage: result.data.usage,
    duration
  };
}

// ============ 会话管理 ============
const sessions = new Map();
const MAX_SESSIONS = 100;
const MAX_MESSAGES = 20;

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    // 清理旧会话
    if (sessions.size >= MAX_SESSIONS) {
      const firstKey = sessions.keys().next().value;
      sessions.delete(firstKey);
    }
    sessions.set(sessionId, []);
  }
  return sessions.get(sessionId);
}

function addToSession(sessionId, role, content) {
  const messages = getSession(sessionId);
  messages.push({ role, content });
  
  // 保留最近 N 轮对话
  while (messages.length > MAX_MESSAGES) {
    messages.shift();
  }
}

// ============ HTTP Server ============
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: 'fast-1.0.0',
      model: DASHSCOPE_MODEL,
      activeSessions: sessions.size
    }));
    return;
  }

  // Chat endpoint
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const startTime = Date.now();
      
      try {
        const { message, timeout = TIMEOUT_MS, sessionKey = null } = JSON.parse(body);

        if (!message || typeof message !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing or invalid "message" field' }));
          return;
        }

        const sessionId = sessionKey || `fast-${Date.now()}`;
        const messages = getSession(sessionId);
        
        addToSession(sessionId, 'user', message);

        const result = await callDashScope(messages);
        
        addToSession(sessionId, 'assistant', result.text);

        const totalDuration = Date.now() - startTime;

        console.log(`[FAST] ${totalDuration}ms (API: ${result.duration}ms) | "${message.substring(0, 30)}..."`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            payloads: [{ text: result.text, mediaUrl: null }],
            meta: {
              durationMs: totalDuration,
              apiDurationMs: result.duration,
              model: DASHSCOPE_MODEL,
              usage: result.usage,
              sessionId,
              version: 'fast'
            }
          }
        }));

      } catch (e) {
        console.error('[FAST] Error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: e.message
        }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     OpenClaw Sync API - FAST (DashScope)          ║
╠═══════════════════════════════════════════════════╣
║  Port: http://localhost:${PORT}                      ║
║  Model: ${DASHSCOPE_MODEL}
║  Expected latency: 1-5 seconds
║                                                   ║
║  ✅ API Key configured                            ║
║  ✅ Session management enabled                    ║
║  ✅ Auto cleanup old sessions                     ║
╚═══════════════════════════════════════════════════╝
  `);
});
