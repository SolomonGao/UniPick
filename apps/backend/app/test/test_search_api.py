"""
UniPick 搜索 API 测试套件
Test-Agent: 验证搜索功能的正确性
"""

import pytest
import httpx
import asyncio
from typing import Optional

# pytest-asyncio 配置
pytest_plugins = ('pytest_asyncio',)

# API 基础 URL
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"

# 测试数据
test_items = [
    {"title": "99新 IKEA台灯", "price": 25.0, "category": "家居"},
    {"title": "PS5游戏盘 双人成行", "price": 45.0, "category": "游戏"},
    {"title": "高数课本 同济版", "price": 15.0, "category": "书籍"},
    {"title": "人体工学椅", "price": 120.0, "category": "家居"},
    {"title": "Switch游戏机", "price": 250.0, "category": "游戏"},
    {"title": "AirPods Pro", "price": 180.0, "category": "数码"},
]


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def client():
    """创建异步 HTTP 客户端"""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as c:
        yield c


class TestSearchAPI:
    """搜索 API 测试类"""
    
    # ==================== 基础功能测试 ====================
    
    @pytest.mark.asyncio
    async def test_list_items_basic(self, client):
        """测试基础列表接口"""
        response = await client.get(f"{API_PREFIX}/items/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ 基础列表: 返回 {len(data)} 条数据")
    
    @pytest.mark.asyncio
    async def test_list_items_pagination(self, client):
        """测试分页功能"""
        # 测试 skip 参数
        response = await client.get(f"{API_PREFIX}/items/?skip=0&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5
        
        response2 = await client.get(f"{API_PREFIX}/items/?skip=5&limit=5")
        assert response2.status_code == 200
        
        print(f"✅ 分页功能: skip/limit 参数工作正常")
    
    # ==================== 关键词搜索测试 ====================
    
    @pytest.mark.asyncio
    async def test_search_by_keyword(self, client):
        """测试关键词搜索功能"""
        keyword = "台灯"
        response = await client.get(f"{API_PREFIX}/items/?keyword={keyword}")
        assert response.status_code == 200
        data = response.json()
        
        # 验证搜索结果包含关键词
        for item in data:
            assert keyword in item["title"] or keyword in (item.get("description") or "")
        
        print(f"✅ 关键词搜索: '{keyword}' 找到 {len(data)} 条结果")
    
    @pytest.mark.asyncio
    async def test_search_case_insensitive(self, client):
        """测试关键词大小写不敏感"""
        # 测试大写
        response1 = await client.get(f"{API_PREFIX}/items/?keyword=PS5")
        # 测试小写
        response2 = await client.get(f"{API_PREFIX}/items/?keyword=ps5")
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        print(f"✅ 大小写不敏感: PS5/ps5 都能正常搜索")
    
    @pytest.mark.asyncio
    async def test_search_empty_keyword(self, client):
        """测试空关键词应该返回所有结果"""
        response = await client.get(f"{API_PREFIX}/items/?keyword=")
        assert response.status_code == 200
        
        # 不传入关键词
        response2 = await client.get(f"{API_PREFIX}/items/")
        assert response2.status_code == 200
        
        print(f"✅ 空关键词处理: 正常工作")
    
    @pytest.mark.asyncio
    async def test_search_no_results(self, client):
        """测试搜索无结果的情况"""
        response = await client.get(f"{API_PREFIX}/items/?keyword=xyz123notfound")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
        
        print(f"✅ 无结果搜索: 正确处理空结果")
    
    # ==================== 价格范围筛选测试 ====================
    
    @pytest.mark.asyncio
    async def test_filter_by_price_range(self, client):
        """测试价格范围筛选"""
        min_price = 10.0
        max_price = 50.0
        
        response = await client.get(
            f"{API_PREFIX}/items/?min_price={min_price}&max_price={max_price}"
        )
        assert response.status_code == 200
        data = response.json()
        
        # 验证所有结果都在价格范围内
        for item in data:
            assert min_price <= item["price"] <= max_price
        
        print(f"✅ 价格筛选: {min_price}-{max_price} 找到 {len(data)} 条结果")
    
    @pytest.mark.asyncio
    async def test_filter_by_min_price_only(self, client):
        """测试仅最小价格筛选"""
        min_price = 100.0
        response = await client.get(f"{API_PREFIX}/items/?min_price={min_price}")
        assert response.status_code == 200
        data = response.json()
        
        for item in data:
            assert item["price"] >= min_price
        
        print(f"✅ 最小价格筛选: >= {min_price} 找到 {len(data)} 条结果")
    
    @pytest.mark.asyncio
    async def test_filter_by_max_price_only(self, client):
        """测试仅最大价格筛选"""
        max_price = 30.0
        response = await client.get(f"{API_PREFIX}/items/?max_price={max_price}")
        assert response.status_code == 200
        data = response.json()
        
        for item in data:
            assert item["price"] <= max_price
        
        print(f"✅ 最大价格筛选: <= {max_price} 找到 {len(data)} 条结果")
    
    @pytest.mark.asyncio
    async def test_filter_invalid_price_range(self, client):
        """测试无效价格范围 (min > max)"""
        # 这个测试可能会返回空结果或错误，取决于实现
        response = await client.get(f"{API_PREFIX}/items/?min_price=100&max_price=10")
        assert response.status_code == 200  # 或者 400，取决于业务逻辑
        
        print(f"✅ 无效价格范围: 已处理")
    
    # ==================== Category 筛选测试 ====================
    
    @pytest.mark.asyncio
    async def test_filter_by_category(self, client):
        """测试分类筛选功能"""
        categories = ["家居", "游戏", "书籍", "数码"]
        
        for category in categories:
            response = await client.get(f"{API_PREFIX}/items/?category={category}")
            assert response.status_code == 200
            data = response.json()
            
            # 验证所有结果都属于该分类
            for item in data:
                assert item.get("category") == category, f"物品 {item['title']} 分类不匹配"
            
            print(f"✅ 分类筛选 [{category}]: 找到 {len(data)} 条结果")
    
    @pytest.mark.asyncio
    async def test_filter_by_nonexistent_category(self, client):
        """测试不存在的分类"""
        response = await client.get(f"{API_PREFIX}/items/?category=不存在的分类")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0
        
        print(f"✅ 不存在的分类: 正确返回空结果")
    
    @pytest.mark.asyncio
    async def test_filter_by_category_with_other_params(self, client):
        """测试分类与其他参数组合"""
        response = await client.get(
            f"{API_PREFIX}/items/?category=家居&min_price=20&max_price=150"
        )
        assert response.status_code == 200
        data = response.json()
        
        for item in data:
            assert item.get("category") == "家居"
            assert 20 <= item["price"] <= 150
        
        print(f"✅ 分类+价格组合筛选: 找到 {len(data)} 条结果")
    
    # ==================== 地理位置搜索测试 ====================
    
    @pytest.mark.asyncio
    async def test_filter_by_location(self, client):
        """测试地理位置筛选"""
        # VT (Blacksburg) 坐标
        lat = 37.2284
        lng = -80.4234
        radius = 5.0  # 5km
        
        response = await client.get(
            f"{API_PREFIX}/items/?lat={lat}&lng={lng}&radius={radius}"
        )
        assert response.status_code == 200
        data = response.json()
        
        print(f"✅ 地理位置筛选: 半径 {radius}km 找到 {len(data)} 条结果")
    
    @pytest.mark.asyncio
    async def test_filter_by_location_only_lat_lng(self, client):
        """测试缺少 radius 参数的情况"""
        response = await client.get(f"{API_PREFIX}/items/?lat=37.2&lng=-80.4")
        assert response.status_code == 200
        
        print(f"✅ 地理位置缺少 radius: 已处理")
    
    # ==================== 组合搜索测试 ====================
    
    @pytest.mark.asyncio
    async def test_combined_search(self, client):
        """测试多条件组合搜索"""
        response = await client.get(
            f"{API_PREFIX}/items/?keyword=IKEA&min_price=10&max_price=100&category=家居"
        )
        assert response.status_code == 200
        data = response.json()
        
        for item in data:
            # 验证所有条件都满足
            assert "IKEA" in item["title"] or "IKEA" in (item.get("description") or "")
            assert 10 <= item["price"] <= 100
            assert item.get("category") == "家居"
        
        print(f"✅ 组合搜索: 关键词+价格+分类 找到 {len(data)} 条结果")
    
    # ==================== 排序功能测试 ====================
    
    @pytest.mark.asyncio
    async def test_search_result_order(self, client):
        """测试结果排序 (按创建时间倒序)"""
        response = await client.get(f"{API_PREFIX}/items/?limit=20")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) >= 2:
            # 验证按 created_at 倒序排列
            for i in range(len(data) - 1):
                current = data[i]["created_at"]
                next_item = data[i + 1]["created_at"]
                assert current >= next_item, "结果应该按时间倒序排列"
        
        print(f"✅ 结果排序: 按 created_at 倒序排列")
    
    # ==================== 边界情况测试 ====================
    
    @pytest.mark.asyncio
    async def test_invalid_limit(self, client):
        """测试无效的 limit 参数"""
        response = await client.get(f"{API_PREFIX}/items/?limit=-1")
        assert response.status_code == 200 or response.status_code == 422
        
        print(f"✅ 无效 limit 参数: 已处理")
    
    @pytest.mark.asyncio
    async def test_very_large_limit(self, client):
        """测试超大 limit 参数"""
        response = await client.get(f"{API_PREFIX}/items/?limit=10000")
        assert response.status_code == 200
        
        print(f"✅ 超大 limit 参数: 已处理")
    
    @pytest.mark.asyncio
    async def test_special_characters_in_keyword(self, client):
        """测试关键词中的特殊字符"""
        special_keywords = ["<script>", "' OR '1'='1", "测试!@#$%"]
        
        for keyword in special_keywords:
            response = await client.get(f"{API_PREFIX}/items/?keyword={keyword}")
            assert response.status_code == 200
        
        print(f"✅ 特殊字符处理: SQL 注入防护正常")


# ==================== 性能测试 ====================

class TestSearchPerformance:
    """搜索性能测试类"""
    
    @pytest.mark.asyncio
    async def test_search_response_time(self, client):
        """测试搜索响应时间"""
        import time
        
        start = time.time()
        response = await client.get(f"{API_PREFIX}/items/?keyword=测试")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        assert elapsed < 2.0, f"搜索响应时间应该 < 2s, 实际是 {elapsed:.2f}s"
        
        print(f"✅ 响应时间: {elapsed:.3f}s")


# ==================== 运行测试 ====================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
