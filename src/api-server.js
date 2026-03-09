#!/usr/bin/env node
/**
 * OpenClaw Sync API Server - Optimized Version
 * 
 * 优化点：
 * 1. 降低默认超时到 30 秒
 * 2. 使用 minimal thinking 级别（更快）
 * 3. 复用会话减少上下文加载
 * 4. 添加请求队列，避免并发锁冲突
 * 
 * 启动：node api-server.js
 * 端口：18790
 */

const http = require('http');
const { execSync, spawn } = require('child_process');

const PORT = process.env.API_PORT || 18790;
const TIMEOUT_MS = parseInt(process.env.API_TIMEOUT || '30000'); // 优化：30 秒默认超时

// 请求队列，避免并发锁冲突
const requestQueue = [];
let isProcessing = false;

/**
 * 执行 OpenClaw CLI 命令（优化版）
 */
function runOpenClaw(args, timeout = TIMEOUT_MS) {
  try {
    const result = execSync(`openclaw ${args}`, {
      encoding: 'utf-8',
      timeout: timeout,
      env: { 
        ...process.env, 
        FORCE_COLOR: '0',
        // 减少日志输出
        OPENCLAW_LOG_LEVEL: 'warn'
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    return { success: true, output: result, stderr: '' };
  } catch (e) {
    return { 
      success: false, 
      error: e.message,
      output: e.stdout?.toString() || '',
      stderr: e.stderr?.toString() || ''
    };
  }
}

/**
 * 处理单个聊天请求
 */
function handleChatSingle(message, options = {}) {
  const { 
    timeout = TIMEOUT_MS,
    sessionKey = null,
    thinking = 'minimal' // 优化：使用 minimal 思考级别
  } = options;

  const timeoutSec = Math.floor(timeout / 1000);
  
  // 优化：使用稳定的会话 ID，复用上下文
  const uniqueSessionId = sessionKey || `api-session`;
  let cmd = `agent --local --json --session-id "${uniqueSessionId}" --message "${escapeShell(message)}" --timeout ${timeoutSec} --thinking ${thinking}`;

  const result = runOpenClaw(cmd, timeout + 5000);

  if (!result.success) {
    const jsonOutput = extractJsonFromOutput(result.output + result.stderr);
    if (jsonOutput) {
      return { success: true, data: jsonOutput };
    }
    return {
      success: false,
      error: result.error || 'Agent execution failed',
      details: result.stderr || result.output
    };
  }

  try {
    const jsonData = JSON.parse(result.output);
    return { success: true, data: jsonData };
  } catch (e) {
    const jsonOutput = extractJsonFromOutput(result.output);
    if (jsonOutput) {
      return { success: true, data: jsonOutput };
    }
    return {
      success: false,
      error: 'Failed to parse agent response',
      details: result.output.substring(0, 500)
    };
  }
}

/**
 * 队列处理器
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;
  
  isProcessing = true;
  
  while (requestQueue.length > 0) {
    const { message, options, callback } = requestQueue.shift();
    try {
      const result = handleChatSingle(message, options);
      callback(null, result);
    } catch (e) {
      callback(e, null);
    }
    // 小延迟避免锁冲突
    await new Promise(r => setTimeout(r, 100));
  }
  
  isProcessing = false;
}

/**
 * 处理聊天请求（队列版）
 */
function handleChat(message, options = {}, callback) {
  requestQueue.push({ message, options, callback });
  processQueue();
}

// Promise 版本
function handleChatPromise(message, options = {}) {
  return new Promise((resolve, reject) => {
    handleChat(message, options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * 从输出中提取 JSON
 */
function extractJsonFromOutput(output) {
  try {
    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const jsonStr = output.substring(start, end + 1);
      return JSON.parse(jsonStr);
    }
  } catch (e) {}
  return null;
}

/**
 * 转义 shell 参数
 */
function escapeShell(str) {
  return str.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
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
      version: 'optimized-1.0.0',
      queueLength: requestQueue.length
    }));
    return;
  }

  // Chat endpoint
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message, timeout = TIMEOUT_MS, sessionKey, thinking = 'minimal' } = JSON.parse(body);

        if (!message || typeof message !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing or invalid "message" field' }));
          return;
        }

        console.log(`[API] Request: "${message.substring(0, 50)}..." (queue: ${requestQueue.length})`);

        const result = await handleChatPromise(message, { timeout, sessionKey, thinking });

        if (result.success) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            data: result.data
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: result.error,
            details: result.details?.substring(0, 1000)
          }));
        }

      } catch (e) {
        console.error('[API] Error:', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', endpoints: ['GET /health', 'POST /chat'] }));
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     OpenClaw Sync API - OPTIMIZED                 ║
╠═══════════════════════════════════════════════════╣
║  Port: http://localhost:${PORT}                      ║
║  Timeout: ${TIMEOUT_MS / 1000}s | Thinking: minimal  ║
║  Features: Queue + Session Reuse                  ║
║                                                   ║
║  Expected: 5-15 seconds (vs 10-30s original)      ║
╚═══════════════════════════════════════════════════╝
  `);
});
