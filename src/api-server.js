#!/usr/bin/env node
/**
 * OpenClaw Sync API Server
 * 
 * 传统请求 - 响应式 API
 * POST /chat → 等待 AI 处理完成 → 返回结果
 * 
 * 启动：node api-server.js
 * 端口：18790 (可设 API_PORT 环境变量)
 */

const http = require('http');
const { execSync } = require('child_process');

const PORT = process.env.API_PORT || 18790;
const TIMEOUT_MS = parseInt(process.env.API_TIMEOUT || '120000'); // 默认 120 秒超时

/**
 * 执行 OpenClaw CLI 命令
 */
function runOpenClaw(args, timeout = TIMEOUT_MS) {
  try {
    const result = execSync(`openclaw ${args}`, {
      encoding: 'utf-8',
      timeout: timeout,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe']
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
 * 处理聊天请求
 * 使用 openclaw agent --local --json 实现同步请求 - 响应
 */
function handleChat(message, options = {}) {
  const { 
    timeout = TIMEOUT_MS,
    sessionKey = null,
    thinking = 'medium'
  } = options;

  const timeoutSec = Math.floor(timeout / 1000);
  
  // 构建命令
  // 每次 API 调用使用唯一会话 ID，避免锁冲突
  const uniqueSessionId = sessionKey || `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  let cmd = `agent --local --json --session-id "${uniqueSessionId}" --message "${escapeShell(message)}" --timeout ${timeoutSec} --thinking ${thinking}`;

  console.log(`[API] Running: openclaw ${cmd}`);
  
  const result = runOpenClaw(cmd, timeout + 10000);

  if (!result.success) {
    // 尝试从输出中提取 JSON
    const jsonOutput = extractJsonFromOutput(result.output + result.stderr);
    if (jsonOutput) {
      return {
        success: true,
        data: jsonOutput
      };
    }

    return {
      success: false,
      error: result.error || 'Agent execution failed',
      details: result.stderr || result.output
    };
  }

  // 解析 JSON 输出
  try {
    const jsonData = JSON.parse(result.output);
    return {
      success: true,
      data: jsonData
    };
  } catch (e) {
    // 输出可能包含日志，尝试提取 JSON
    const jsonOutput = extractJsonFromOutput(result.output);
    if (jsonOutput) {
      return {
        success: true,
        data: jsonOutput
      };
    }
    
    return {
      success: false,
      error: 'Failed to parse agent response',
      details: result.output.substring(0, 500)
    };
  }
}

/**
 * 从输出中提取 JSON
 */
function extractJsonFromOutput(output) {
  try {
    // 尝试找到第一个 { 和最后一个 }
    const start = output.indexOf('{');
    const end = output.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const jsonStr = output.substring(start, end + 1);
      return JSON.parse(jsonStr);
    }
  } catch (e) {
    // 忽略解析错误
  }
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
  // CORS
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
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Chat endpoint
  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { message, timeout, sessionKey, thinking } = JSON.parse(body);

        if (!message || typeof message !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing or invalid "message" field' }));
          return;
        }

        console.log(`[API] Received chat request: "${message.substring(0, 50)}..."`);

        const result = handleChat(message, { timeout, sessionKey, thinking });

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
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', endpoints: ['GET /health', 'POST /chat'] }));
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     OpenClaw Sync API Server                      ║
╠═══════════════════════════════════════════════════╣
║  Running on: http://localhost:${PORT}                ║
║  Endpoints:                                       ║
║    GET  /health  - Health check                   ║
║    POST /chat    - Chat (request-response)        ║
║                                                   ║
║  Example:                                         ║
║    curl -X POST http://localhost:${PORT}/chat \\      ║
║      -H "Content-Type: application/json" \\        ║
║      -d '{"message": "Hello!"}'                   ║
╚═══════════════════════════════════════════════════╝
  `);
});
