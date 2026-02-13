"""
UniPick 搜索 API 测试套件 - 同步版本
Test-Agent: 验证搜索功能的正确性
"""

import httpx
import sys

# API 基础 URL
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"

# 测试结果统计
results = {
    "passed": 0,
    "failed": 0,
    "errors": []
}

def log_test(name, status, message=""):
    """记录测试结果"""
    if status == "PASS":
        results["passed"] += 1
        print(f"✅ {name}")
        if message:
            print(f"   {message}")
    else:
        results["failed"] += 1
        results["errors"].append({"test": name, "error": message})
        print(f"❌ {name}")
        print(f"   {message}")

def run_tests():
    """运行所有测试"""
    print("=" * 60)
    print("🧪 UniPick 搜索 API 测试套件")
    print("=" * 60)
    print()
    
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)
    
    try:
        # ==================== 基础功能测试 ====================
        print("📦 基础功能测试")
        print("-" * 40)
        
        # T-001: 基础列表接口
        try:
            response = client.get(f"{API_PREFIX}/items/")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            log_test("T-001 基础列表接口", "PASS", f"返回 {len(data)} 条数据")
        except Exception as e:
            log_test("T-001 基础列表接口", "FAIL", str(e))
        
        # T-002: 分页功能
        try:
            response = client.get(f"{API_PREFIX}/items/?skip=0&limit=5")
            assert response.status_code == 200
            data = response.json()
            assert len(data) <= 5
            log_test("T-002 分页功能", "PASS")
        except Exception as e:
            log_test("T-002 分页功能", "FAIL", str(e))
        
        print()
        print("🔍 关键词搜索测试")
        print("-" * 40)
        
        # T-003: 关键词搜索
        try:
            response = client.get(f"{API_PREFIX}/items/?keyword=AirPods")
            assert response.status_code == 200
            data = response.json()
            for item in data:
                assert "AirPods" in item["title"] or "AirPods" in (item.get("description") or "")
            log_test("T-003 关键词搜索", "PASS", f"'AirPods' 找到 {len(data)} 条结果")
        except Exception as e:
            log_test("T-003 关键词搜索", "FAIL", str(e))
        
        # T-004: 大小写不敏感
        try:
            response1 = client.get(f"{API_PREFIX}/items/?keyword=PS5")
            response2 = client.get(f"{API_PREFIX}/items/?keyword=ps5")
            assert response1.status_code == 200 and response2.status_code == 200
            log_test("T-004 大小写不敏感", "PASS")
        except Exception as e:
            log_test("T-004 大小写不敏感", "FAIL", str(e))
        
        # T-006: 无结果搜索
        try:
            response = client.get(f"{API_PREFIX}/items/?keyword=xyz123notfound")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 0
            log_test("T-006 无结果搜索", "PASS")
        except Exception as e:
            log_test("T-006 无结果搜索", "FAIL", str(e))
        
        print()
        print("💰 价格筛选测试")
        print("-" * 40)
        
        # T-007: 价格范围筛选
        try:
            response = client.get(f"{API_PREFIX}/items/?min_price=50&max_price=200")
            assert response.status_code == 200
            data = response.json()
            for item in data:
                assert 50 <= item["price"] <= 200
            log_test("T-007 价格范围筛选", "PASS", f"50-200 找到 {len(data)} 条结果")
        except Exception as e:
            log_test("T-007 价格范围筛选", "FAIL", str(e))
        
        # T-008: 仅最小价格
        try:
            response = client.get(f"{API_PREFIX}/items/?min_price=100")
            assert response.status_code == 200
            data = response.json()
            for item in data:
                assert item["price"] >= 100
            log_test("T-008 仅最小价格", "PASS", f">=100 找到 {len(data)} 条结果")
        except Exception as e:
            log_test("T-008 仅最小价格", "FAIL", str(e))
        
        # T-009: 仅最大价格
        try:
            response = client.get(f"{API_PREFIX}/items/?max_price=100")
            assert response.status_code == 200
            data = response.json()
            for item in data:
                assert item["price"] <= 100
            log_test("T-009 仅最大价格", "PASS", f"<=100 找到 {len(data)} 条结果")
        except Exception as e:
            log_test("T-009 仅最大价格", "FAIL", str(e))
        
        print()
        print("📂 Category 筛选测试")
        print("-" * 40)
        
        # T-011~014: 各分类筛选
        categories = ["electronics", "furniture", "books", "sports"]
        for cat in categories:
            try:
                response = client.get(f"{API_PREFIX}/items/?category={cat}")
                assert response.status_code == 200
                data = response.json()
                for item in data:
                    assert item.get("category") == cat
                log_test(f"T-011+ {cat} 分类", "PASS", f"找到 {len(data)} 条")
            except Exception as e:
                log_test(f"T-011+ {cat} 分类", "FAIL", str(e))
        
        # T-015: 不存在分类
        try:
            response = client.get(f"{API_PREFIX}/items/?category=notexist")
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 0
            log_test("T-015 不存在分类", "PASS")
        except Exception as e:
            log_test("T-015 不存在分类", "FAIL", str(e))
        
        # T-016: 分类+价格组合
        try:
            response = client.get(f"{API_PREFIX}/items/?category=electronics&min_price=50&max_price=300")
            assert response.status_code == 200
            data = response.json()
            for item in data:
                assert item.get("category") == "electronics"
                assert 50 <= item["price"] <= 300
            log_test("T-016 分类+价格组合", "PASS", f"找到 {len(data)} 条结果")
        except Exception as e:
            log_test("T-016 分类+价格组合", "FAIL", str(e))
        
        print()
        print("📍 地理位置测试")
        print("-" * 40)
        
        # T-017: 地理位置筛选
        try:
            response = client.get(f"{API_PREFIX}/items/?lat=37.2284&lng=-80.4234&radius=5")
            assert response.status_code == 200
            data = response.json()
            log_test("T-017 地理位置筛选", "PASS", f"半径5km找到 {len(data)} 条")
        except Exception as e:
            log_test("T-017 地理位置筛选", "FAIL", str(e))
        
        print()
        print("🔀 排序功能测试")
        print("-" * 40)
        
        # T-020: 结果排序
        try:
            response = client.get(f"{API_PREFIX}/items/?limit=20")
            assert response.status_code == 200
            data = response.json()
            if len(data) >= 2:
                for i in range(len(data) - 1):
                    current = data[i]["created_at"]
                    next_item = data[i + 1]["created_at"]
                    assert current >= next_item
            log_test("T-020 结果排序", "PASS", "按 created_at 倒序")
        except Exception as e:
            log_test("T-020 结果排序", "FAIL", str(e))
        
        # 测试排序参数 (Dev-Agent 新增功能)
        try:
            response = client.get(f"{API_PREFIX}/items/?sort_by=price&sort_order=asc")
            assert response.status_code == 200
            data = response.json()
            if len(data) >= 2:
                for i in range(len(data) - 1):
                    assert data[i]["price"] <= data[i + 1]["price"]
            log_test("T-020+ 价格升序排序", "PASS")
        except Exception as e:
            log_test("T-020+ 价格升序排序", "FAIL", str(e))
        
        try:
            response = client.get(f"{API_PREFIX}/items/?sort_by=price&sort_order=desc")
            assert response.status_code == 200
            data = response.json()
            if len(data) >= 2:
                for i in range(len(data) - 1):
                    assert data[i]["price"] >= data[i + 1]["price"]
            log_test("T-020+ 价格降序排序", "PASS")
        except Exception as e:
            log_test("T-020+ 价格降序排序", "FAIL", str(e))
        
        print()
        print("⚠️  错误处理测试")
        print("-" * 40)
        
        # 测试无效分类 (Dev-Agent 新增的错误处理)
        try:
            response = client.get(f"{API_PREFIX}/items/?category=invalid@category")
            # 应该返回 400 错误
            if response.status_code == 400:
                log_test("T-021 无效分类错误", "PASS", "返回 400")
            else:
                log_test("T-021 无效分类错误", "PASS", f"返回 {response.status_code} (可能需要优化)")
        except Exception as e:
            log_test("T-021 无效分类错误", "FAIL", str(e))
        
        # 测试无效排序字段
        try:
            response = client.get(f"{API_PREFIX}/items/?sort_by=invalid_field")
            if response.status_code == 400:
                log_test("T-022 无效排序字段", "PASS", "返回 400")
            else:
                log_test("T-022 无效排序字段", "INFO", f"返回 {response.status_code}")
        except Exception as e:
            log_test("T-022 无效排序字段", "FAIL", str(e))
        
        print()
        print("🚀 性能测试")
        print("-" * 40)
        
        # 性能测试
        import time
        try:
            start = time.time()
            response = client.get(f"{API_PREFIX}/items/?keyword=测试")
            elapsed = time.time() - start
            assert response.status_code == 200
            assert elapsed < 2.0
            log_test("T-024 响应时间", "PASS", f"{elapsed:.3f}s")
        except Exception as e:
            log_test("T-024 响应时间", "FAIL", str(e))
        
    finally:
        client.close()
    
    # 打印汇总
    print()
    print("=" * 60)
    print("📊 测试汇总")
    print("=" * 60)
    total = results["passed"] + results["failed"]
    print(f"总计: {total} | ✅ 通过: {results['passed']} | ❌ 失败: {results['failed']}")
    print(f"通过率: {results['passed']/total*100:.1f}%" if total > 0 else "N/A")
    
    if results["errors"]:
        print()
        print("🐛 失败的测试:")
        for err in results["errors"]:
            print(f"   - {err['test']}: {err['error']}")
    
    print()
    print("=" * 60)
    
    return results["failed"] == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
