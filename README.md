# OpenClaw Sync API

将 OpenClaw AI 助手暴露为传统的 HTTP REST API，支持同步请求 - 响应模式。

## ✨ 特性

- 🔄 **同步请求 - 响应** - 传统 HTTP API 风格
- 🚀 **快速版** - 直连 DashScope API，1-5 秒响应
- ⚡ **优化版** - 队列 + 会话复用，5-15 秒响应
- 📦 **开箱即用** - 内置 API Key，无需额外配置
- 🐍 **多语言支持** - Python、Node.js 客户端

## 🚀 快速开始

### 选择版本

| 版本 | 响应时间 | 说明 | 启动命令 |
|------|----------|------|----------|
| **快速版** | 1-5 秒 ⚡️ | 直连 DashScope API，推荐 | `node src/api-server-fast.js` |
| **优化版** | 5-15 秒 ⚡ | OpenClaw CLI 优化版 | `node src/api-server.js` |

### 启动服务

```bash
cd ~/.openclaw/workspace/openclaw-api

# 推荐：快速版（1-5 秒响应）
node src/api-server-fast.js

# 或：优化版（使用 OpenClaw 完整功能）
node src/api-server.js
```

### 测试

```bash
# 健康检查
curl http://localhost:18791/health

# 发送消息
curl -X POST http://localhost:18791/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'
```

## 📖 API 文档

### POST /chat

**请求：**
```json
{
  "message": "你的问题",
  "timeout": 30000,
  "sessionKey": "可选 - 会话 ID"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "payloads": [{"text": "AI 回复内容"}],
    "meta": {
      "durationMs": 1234,
      "model": "qwen-turbo",
      "usage": {"input": 100, "output": 50}
    }
  }
}
```

## 💻 使用示例

### Python

```python
import requests

def ask_ai(question):
    response = requests.post(
        'http://localhost:18791/chat',
        json={'message': question}
    )
    result = response.json()
    return result['data']['payloads'][0]['text']

# 使用
answer = ask_ai("你好")
print(answer)
```

### Node.js

```javascript
const res = await fetch('http://localhost:18791/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: '你好' })
});
const data = await res.json();
console.log(data.data.payloads[0].text);
```

## 🔧 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `API_PORT` | 18791 (fast) / 18790 (optimized) | 端口 |
| `API_TIMEOUT` | 30000 | 超时时间 (ms) |
| `DASHSCOPE_API_KEY` | 内置 | DashScope API Key |
| `DASHSCOPE_MODEL` | qwen-turbo | 模型 (turbo/plus/max) |

### 模型选择

| 模型 | 速度 | 质量 | 成本 | 推荐场景 |
|------|------|------|------|----------|
| `qwen-turbo` | ⚡️⚡️⚡️ | ⭐⭐⭐ | ¥ | 快速问答 |
| `qwen-plus` | ⚡️⚡️ | ⭐⭐⭐⭐ | ¥¥ | 通用场景 |
| `qwen-max` | ⚡️ | ⭐⭐⭐⭐⭐ | ¥¥¥ | 复杂任务 |

```bash
# 使用更强大的模型
export DASHSCOPE_MODEL=qwen-plus
node src/api-server-fast.js
```

## 📁 项目结构

```
openclaw-sync-api/
├── src/
│   ├── api-server.js          # 优化版（OpenClaw CLI）
│   └── api-server-fast.js     # 快速版（DashScope 直连）⭐
├── examples/
│   ├── python/example.py
│   └── nodejs/example.js
├── tests/
│   ├── test_api.py            # 完整测试
│   └── speed_test.py          # 速度对比
├── package.json
└── README.md
```

## 🧪 运行测试

```bash
# 完整测试
python3 tests/test_api.py

# 速度对比（需同时启动两个版本）
python3 tests/speed_test.py
```

## 📊 性能对比

| 场景 | 原版 | 优化版 | 快速版 |
|------|------|--------|--------|
| 简单问答 | 10-20s | 5-10s | **1-3s** |
| 代码生成 | 20-30s | 10-15s | **2-5s** |
| 复杂推理 | 30-60s | 15-30s | **5-10s** |

## 🔑 API Key

快速版已内置 DashScope API Key。如需更换：

```bash
export DASHSCOPE_API_KEY=sk-your-key-here
node src/api-server-fast.js
```

获取 Key: https://dashscope.console.aliyun.com/apiKey

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 PR！

---

**GitHub**: https://github.com/is-spectator/openclaw-sync-api
