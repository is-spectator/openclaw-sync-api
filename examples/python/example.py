#!/usr/bin/env python3
"""
OpenClaw Sync API - Python 示例

展示如何使用 Python 调用 OpenClaw Sync API
"""

import requests
from typing import Optional

class OpenClawAPI:
    """OpenClaw API 客户端"""
    
    def __init__(self, base_url: str = "http://localhost:18790"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def health_check(self) -> bool:
        """检查服务是否运行"""
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def chat(self, 
             message: str, 
             timeout: int = 60000, 
             thinking: str = "medium",
             session_key: Optional[str] = None) -> dict:
        """
        发送消息给 AI
        
        Args:
            message: 消息内容
            timeout: 超时时间（毫秒）
            thinking: 思考级别 (off/minimal/low/medium/high)
            session_key: 会话 ID（可选，复用会话保持上下文）
        
        Returns:
            AI 回复的完整响应
        """
        payload = {
            "message": message,
            "timeout": timeout,
            "thinking": thinking
        }
        
        if session_key:
            payload["sessionKey"] = session_key
        
        response = self.session.post(
            f"{self.base_url}/chat",
            json=payload,
            timeout=timeout + 10
        )
        
        return response.json()
    
    def ask(self, message: str, **kwargs) -> str:
        """
        简单提问，只返回 AI 回复的文本
        
        Args:
            message: 问题
            **kwargs: 其他参数传递给 chat()
        
        Returns:
            AI 回复的文本
        """
        result = self.chat(message, **kwargs)
        
        if result.get("success"):
            payloads = result.get("data", {}).get("payloads", [])
            if payloads:
                return payloads[0].get("text", "")
        
        raise Exception(result.get("error", "Unknown error"))


# ============ 使用示例 ============

if __name__ == "__main__":
    # 创建客户端
    api = OpenClawAPI()
    
    # 检查服务
    print("🔍 检查服务状态...")
    if not api.health_check():
        print("❌ 服务未运行！请先启动：node src/api-server.js")
        exit(1)
    print("✅ 服务正常运行\n")
    
    # 示例 1: 简单对话
    print("=" * 50)
    print("示例 1: 简单对话")
    print("=" * 50)
    answer = api.ask("你好，请用一句话介绍你自己")
    print(f"🤖 {answer}\n")
    
    # 示例 2: 数学计算
    print("=" * 50)
    print("示例 2: 数学计算")
    print("=" * 50)
    answer = api.ask("计算 123 * 456 + 789 / 3")
    print(f"🤖 {answer}\n")
    
    # 示例 3: 代码生成（高思考级别）
    print("=" * 50)
    print("示例 3: 代码生成")
    print("=" * 50)
    answer = api.ask(
        "用 Python 写一个装饰器示例",
        thinking="high",
        timeout=90000
    )
    print(f"🤖 {answer}\n")
    
    # 示例 4: 保持会话上下文
    print("=" * 50)
    print("示例 4: 多轮对话（保持上下文）")
    print("=" * 50)
    
    session_key = None
    
    # 第一轮
    result = api.chat("我叫小明，记住我的名字", thinking="minimal")
    if result.get("success"):
        session_key = result.get("data", {}).get("meta", {}).get("agentMeta", {}).get("sessionId")
        print(f"🤖 {result['data']['payloads'][0]['text']}")
        print(f"📝 会话 ID: {session_key}\n")
    
    # 第二轮（复用会话）
    if session_key:
        result = api.chat("我叫什么名字？", session_key=session_key, thinking="minimal")
        if result.get("success"):
            print(f"🤖 {result['data']['payloads'][0]['text']}\n")
    
    print("✅ 示例完成！")
