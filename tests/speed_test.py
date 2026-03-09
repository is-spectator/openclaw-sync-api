#!/usr/bin/env python3
"""
对比测试：原版 vs 快速版 API
"""

import requests
import time

def test_api(base_url, name, message="你好，请用一句话回答"):
    """测试 API 响应时间"""
    print(f"\n{'='*60}")
    print(f"🧪 测试 {name}")
    print(f"{'='*60}")
    
    start = time.time()
    try:
        response = requests.post(
            f"{base_url}/chat",
            json={"message": message, "timeout": 30000},
            timeout=35
        )
        elapsed = time.time() - start
        
        result = response.json()
        
        if result.get("success"):
            data = result.get("data", {})
            meta = data.get("meta", {})
            
            print(f"✅ 成功！")
            print(f"⏱️  总耗时：{elapsed:.2f} 秒")
            print(f"📊 API 耗时：{meta.get('apiDurationMs', meta.get('durationMs', 'N/A'))}ms")
            print(f"🤖 回复：{data.get('payloads', [{}])[0].get('text', '')[:100]}...")
            return elapsed
        else:
            print(f"❌ 失败：{result.get('error', 'Unknown')}")
            return None
            
    except Exception as e:
        elapsed = time.time() - start
        print(f"❌ 错误：{e}")
        print(f"⏱️  耗时：{elapsed:.2f} 秒")
        return None

def main():
    print("\n" + "╔" + "═"*58 + "╗")
    print("║" + " "*20 + "API 速度对比测试" + " "*20 + "║")
    print("╚" + "═"*58 + "╝")
    
    # 测试快速版
    fast_time = test_api("http://localhost:18791", "快速版 (Fast)", "1+1 等于几？直接回答数字")
    
    # 测试原版
    original_time = test_api("http://localhost:18790", "原版 (Original)", "1+1 等于几？直接回答数字")
    
    if fast_time and original_time:
        speedup = original_time / fast_time
        print(f"\n{'='*60}")
        print(f"📈 性能对比")
        print(f"{'='*60}")
        print(f"原版耗时：{original_time:.2f} 秒")
        print(f"快速版耗时：{fast_time:.2f} 秒")
        print(f"🚀 加速比：{speedup:.1f}x")
        print(f"💾 节省时间：{original_time - fast_time:.2f} 秒 ({(1 - fast_time/original_time)*100:.0f}%)")

if __name__ == "__main__":
    main()
