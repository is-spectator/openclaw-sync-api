#!/usr/bin/env python3
"""
OpenClaw Sync API 测试脚本
测试 API 服务的各种功能
"""

import requests
import json
import time
from typing import Optional

API_BASE = "http://localhost:18790"

def test_health():
    """测试健康检查端点"""
    print("=" * 50)
    print("🏥 测试健康检查...")
    print("=" * 50)
    
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        print(f"状态码：{response.status_code}")
        print(f"响应：{json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ 错误：{e}")
        return False

def test_chat(message: str, timeout: int = 60000, thinking: str = "medium"):
    """测试聊天端点"""
    print("\n" + "=" * 50)
    print(f"💬 发送消息：{message[:50]}...")
    print("=" * 50)
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{API_BASE}/chat",
            json={
                "message": message,
                "timeout": timeout,
                "thinking": thinking
            },
            timeout=timeout + 10
        )
        
        elapsed = time.time() - start_time
        
        print(f"\n⏱️  耗时：{elapsed:.2f} 秒")
        print(f"📊 状态码：{response.status_code}")
        
        result = response.json()
        
        if result.get("success"):
            print("\n✅ 成功！")
            data = result.get("data", {})
            
            # 提取回复内容
            payloads = data.get("payloads", [])
            if payloads:
                for i, payload in enumerate(payloads):
                    text = payload.get("text", "")
                    if text:
                        print(f"\n🤖 AI 回复：\n{text}")
            
            # 显示元数据
            meta = data.get("meta", {})
            if meta:
                print(f"\n📈 元数据：")
                print(f"   - 处理时间：{meta.get('durationMs', 0) / 1000:.2f} 秒")
                print(f"   - 模型：{meta.get('agentMeta', {}).get('model', 'N/A')}")
                
                usage = meta.get('agentMeta', {}).get('usage', {})
                if usage:
                    print(f"   - Token 使用：输入={usage.get('input', 0)}, 输出={usage.get('output', 0)}, 总计={usage.get('total', 0)}")
            
            return True
        else:
            print("\n❌ 失败！")
            print(f"错误：{result.get('error', 'Unknown')}")
            if result.get('details'):
                print(f"详情：{result.get('details')[:200]}...")
            return False
            
    except requests.exceptions.Timeout:
        print(f"\n❌ 超时！(>{timeout + 10} 秒)")
        return False
    except Exception as e:
        print(f"\n❌ 错误：{e}")
        return False

def test_error_handling():
    """测试错误处理"""
    print("\n" + "=" * 50)
    print("🧪 测试错误处理...")
    print("=" * 50)
    
    # 测试空消息
    print("\n📝 测试空消息...")
    try:
        response = requests.post(
            f"{API_BASE}/chat",
            json={"message": ""},
            timeout=10
        )
        print(f"状态码：{response.status_code}")
        print(f"响应：{response.json()}")
    except Exception as e:
        print(f"错误：{e}")
    
    # 测试缺失 message 字段
    print("\n📝 测试缺失 message 字段...")
    try:
        response = requests.post(
            f"{API_BASE}/chat",
            json={"timeout": 5000},
            timeout=10
        )
        print(f"状态码：{response.status_code}")
        print(f"响应：{response.json()}")
    except Exception as e:
        print(f"错误：{e}")

def test_concurrent_requests():
    """测试并发请求"""
    print("\n" + "=" * 50)
    print("🚀 测试并发请求 (3 个同时)...")
    print("=" * 50)
    
    messages = [
        "1+1 等于几？",
        "中国首都是哪里？",
        "用英文说 hello"
    ]
    
    start_time = time.time()
    
    import concurrent.futures
    
    def send_message(msg):
        return test_chat(msg, timeout=30000, thinking="minimal")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(send_message, msg) for msg in messages]
        results = [f.result() for f in futures]
    
    elapsed = time.time() - start_time
    print(f"\n⏱️  总耗时：{elapsed:.2f} 秒")
    print(f"✅ 成功：{sum(results)}/{len(results)}")

def main():
    """主测试函数"""
    print("\n")
    print("╔" + "═" * 48 + "╗")
    print("║" + " " * 10 + "OpenClaw Sync API 测试" + " " * 14 + "║")
    print("╚" + "═" * 48 + "╝")
    
    # 1. 健康检查
    if not test_health():
        print("\n❌ 服务未运行，请先启动 API 服务：")
        print("   cd ~/.openclaw/workspace")
        print("   node api-server.js")
        return
    
    # 2. 简单对话
    test_chat("你好，请用一句话介绍你自己")
    
    # 3. 数学问题
    test_chat("计算 23 * 45 + 67 / 8")
    
    # 4. 代码生成
    test_chat("用 Python 写一个快速排序", thinking="high")
    
    # 5. 错误处理
    test_error_handling()
    
    # 6. 并发测试（可选，取消注释启用）
    # test_concurrent_requests()
    
    print("\n" + "=" * 50)
    print("✅ 测试完成！")
    print("=" * 50)

if __name__ == "__main__":
    main()
