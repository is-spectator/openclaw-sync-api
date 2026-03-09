# OpenClaw Sync API

将 OpenClaw AI 助手暴露为传统的 HTTP REST API，支持同步请求 - 响应模式。

## ✨ 特性

- 🔄 **同步请求 - 响应** - 传统 HTTP API 风格，发送请求后等待 AI 回复
- 🚀 **快速部署** - 单文件 Node.js 服务，零配置启动
- 📦 **会话隔离** - 每次 API 调用使用独立会话，避免锁冲突
- 🔧 **灵活配置** - 支持超时、思考级别、模型等参数
- 🐍 **多语言支持** - 提供 Python、Node.js 示例

## 📦 安装

### 前置要求

- Node.js 16+
- OpenClaw 已安装并配置
- OpenClaw 模型 Provider API Keys（如 DashScope）

### 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/openclaw-sync-api.git
cd openclaw-sync-api
```

### 安装依赖

```bash
npm install
```

## 🚀 快速开始

### 启动 API 服务

```bash
# 默认端口 18790
node src/api-server.js

# 自定义端口
API_PORT=3000 node src/api-server.js

# 后台运行
nohup node src/api-server.js > api.log 2>&1 &
```

### 测试服务

```bash
# 健康检查
curl http://localhost:18790/health

# 发送消息
curl -X POST http://localhost:18790/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'
```

## 📖 API 文档

### POST /chat

发送消息给 AI 并等待回复。

**请求体：**

```json
{
  "message": "你的问题",
  "timeout": 60000,
  "thinking": "medium",
  "sessionKey": "optional-session-id"
}
```

**参数说明：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `message` | string | 必填 | 要发送给 AI 的消息 |
| `timeout` | number | 120000 | 超时时间（毫秒） |
| `thinking` | string | "medium" | 思考级别：off/minimal/low/medium/high |
| `sessionKey` | string | 自动生成 | 会话 ID（复用会话可保持上下文） |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "payloads": [
      {
        "text": "我是 OpenClaw，一个 AI 助手...",
        "mediaUrl": null
      }
    ],
    "meta": {
      "durationMs": 11254,
      "agentMeta": {
        "model": "qwen3.5-plus",
        "usage": {
          "input": 17023,
          "output": 153,
          "total": 17176
        }
      }
    }
  }
}
```

### GET /health

健康检查端点。

**响应示例：**

```json
{
  "status": "ok",
  "timestamp": "2026-03-09T01:24:55.706Z"
}
```

## 💻 使用示例

### Python

```python
import requests

def ask_ai(question, timeout=60000):
    response = requests.post(
        'http://localhost:18790/chat',
        json={
            'message': question,
            'timeout': timeout,
            'thinking': 'medium'
        }
    )
    result = response.json()
    if result['success']:
        return result['data']['payloads'][0]['text']
    else:
        raise Exception(result['error'])

# 使用示例
answer = ask_ai("用 Python 写个快速排序")
print(answer)
```

### Node.js

```javascript
async function askAI(question, timeout = 60000) {
  const response = await fetch('http://localhost:18790/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: question,
      timeout: timeout,
      thinking: 'medium'
    })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data.payloads[0].text;
  } else {
    throw new Error(result.error);
  }
}

// 使用示例
const answer = await askAI("你好");
console.log(answer);
```

### cURL

```bash
# 简单对话
curl -X POST http://localhost:18790/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好"}'

# 代码生成（高思考级别）
curl -X POST http://localhost:18790/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "用 Python 写个 Web 爬虫",
    "thinking": "high",
    "timeout": 120000
  }'
```

## 🔧 配置选项

通过环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `API_PORT` | 18790 | API 服务端口 |
| `API_TIMEOUT` | 120000 | 默认超时时间（毫秒） |
| `API_MODEL` | qwen3.5-plus | 默认模型 |

## 📁 项目结构

```
openclaw-sync-api/
├── src/
│   └── api-server.js      # 主 API 服务
├── examples/
│   ├── python/
│   │   └── example.py     # Python 示例
│   └── nodejs/
│       └── example.js     # Node.js 示例
├── tests/
│   └── test_api.py        # 测试脚本
├── package.json           # Node.js 依赖
├── README.md              # 本文件
└── LICENSE                # 许可证
```

## 🧪 运行测试

```bash
# Python 测试
python3 tests/test_api.py

# 或手动测试
curl http://localhost:18790/health
```

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

- OpenClaw 文档：https://docs.openclaw.ai
- 项目 Issues：https://github.com/YOUR_USERNAME/openclaw-sync-api/issues

---

**注意：** 本项目需要本地运行 OpenClaw Gateway。确保已正确配置模型 Provider（如 DashScope、OpenAI 等）。
