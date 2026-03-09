/**
 * OpenClaw Sync API - Node.js 示例
 * 
 * 展示如何使用 Node.js 调用 OpenClaw Sync API
 */

const API_BASE = process.env.API_BASE || 'http://localhost:18790';

class OpenClawAPI {
  constructor(baseURL = API_BASE) {
    this.baseURL = baseURL;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const res = await fetch(`${this.baseURL}/health`);
      return res.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * 发送消息
   * 
   * @param {string} message - 消息内容
   * @param {object} options - 选项
   * @param {number} options.timeout - 超时时间（毫秒）
   * @param {string} options.thinking - 思考级别
   * @param {string} options.sessionKey - 会话 ID
   * @returns {Promise<object>} API 响应
   */
  async chat(message, options = {}) {
    const {
      timeout = 60000,
      thinking = 'medium',
      sessionKey = null
    } = options;

    const payload = {
      message,
      timeout,
      thinking
    };

    if (sessionKey) {
      payload.sessionKey = sessionKey;
    }

    const res = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.json();
  }

  /**
   * 简单提问，只返回文本
   */
  async ask(message, options = {}) {
    const result = await this.chat(message, options);

    if (result.success) {
      return result.data?.payloads?.[0]?.text || '';
    }

    throw new Error(result.error || 'Unknown error');
  }
}

// ============ 使用示例 ============

async function main() {
  const api = new OpenClawAPI();

  // 检查服务
  console.log('🔍 检查服务状态...');
  if (!(await api.healthCheck())) {
    console.log('❌ 服务未运行！请先启动：node src/api-server.js');
    process.exit(1);
  }
  console.log('✅ 服务正常运行\n');

  // 示例 1: 简单对话
  console.log('='.repeat(50));
  console.log('示例 1: 简单对话');
  console.log('='.repeat(50));
  const answer1 = await api.ask('你好，请用一句话介绍你自己');
  console.log(`🤖 ${answer1}\n`);

  // 示例 2: 数学计算
  console.log('='.repeat(50));
  console.log('示例 2: 数学计算');
  console.log('='.repeat(50));
  const answer2 = await api.ask('计算 123 * 456 + 789 / 3');
  console.log(`🤖 ${answer2}\n`);

  // 示例 3: 代码生成
  console.log('='.repeat(50));
  console.log('示例 3: 代码生成');
  console.log('='.repeat(50));
  const answer3 = await api.ask('用 JavaScript 写一个防抖函数', {
    thinking: 'high',
    timeout: 90000
  });
  console.log(`🤖 ${answer3}\n`);

  // 示例 4: 保持会话上下文
  console.log('='.repeat(50));
  console.log('示例 4: 多轮对话（保持上下文）');
  console.log('='.repeat(50));

  let sessionKey = null;

  // 第一轮
  const result1 = await api.chat('我叫小明，记住我的名字', { thinking: 'minimal' });
  if (result1.success) {
    sessionKey = result1.data?.meta?.agentMeta?.sessionId;
    console.log(`🤖 ${result1.data.payloads[0].text}`);
    console.log(`📝 会话 ID: ${sessionKey}\n`);
  }

  // 第二轮（复用会话）
  if (sessionKey) {
    const result2 = await api.chat('我叫什么名字？', { sessionKey, thinking: 'minimal' });
    if (result2.success) {
      console.log(`🤖 ${result2.data.payloads[0].text}\n`);
    }
  }

  console.log('✅ 示例完成！');
}

main().catch(console.error);
