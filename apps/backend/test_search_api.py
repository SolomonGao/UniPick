"""
搜索API功能测试脚本
用于验证以下功能:
1. category 筛选
2. 排序功能 (价格/时间)
3. API 错误处理

使用方法:
1. 确保后端服务运行在 localhost:8000
2. 运行: python test_search_api.py
"""

import requests
import sys

BASE_URL = "http://localhost:8000/api/v1/items"

def test_category_filter():
    """测试分类筛选功能"""
    print("\n📋 测试 1: Category 筛选")
    print("-" * 50)
    
    categories = ["electronics", "furniture", "books", "sports", "music", "others"]
    
    for category in categories:
        response = requests.get(f"{BASE_URL}/?category={category}&limit=5")
        if response.status_code == 200:
            items = response.json()
            print(f"  ✅ {category}: 找到 {len(items)} 个商品")
            # 验证返回的商品确实属于该分类
            for item in items:
                if item.get('category') != category:
                    print(f"  ❌ 错误: 商品 {item['id']} 分类不匹配!")
                    return False
        else:
            print(f"  ❌ {category}: 请求失败 ({response.status_code})")
            print(f"     错误: {response.json()}")
            return False
    
    # 测试无效分类
    response = requests.get(f"{BASE_URL}/?category=invalid_category")
    if response.status_code == 400:
        print(f"  ✅ 无效分类返回 400 错误")
        error = response.json()
        if 'detail' in error and 'valid_categories' in error['detail'].get('details', {}):
            print(f"  ✅ 错误响应包含有效分类列表")
    else:
        print(f"  ❌ 无效分类应该返回 400, 实际返回 {response.status_code}")
        return False
    
    return True

def test_sorting():
    """测试排序功能"""
    print("\n📋 测试 2: 排序功能")
    print("-" * 50)
    
    # 测试按价格升序
    response = requests.get(f"{BASE_URL}/?sort_by=price&sort_order=asc&limit=10")
    if response.status_code == 200:
        items = response.json()
        prices = [item['price'] for item in items]
        if prices == sorted(prices):
            print(f"  ✅ 价格升序排序正确")
        else:
            print(f"  ❌ 价格升序排序错误: {prices}")
            return False
    else:
        print(f"  ❌ 价格升序请求失败: {response.status_code}")
        return False
    
    # 测试按价格降序
    response = requests.get(f"{BASE_URL}/?sort_by=price&sort_order=desc&limit=10")
    if response.status_code == 200:
        items = response.json()
        prices = [item['price'] for item in items]
        if prices == sorted(prices, reverse=True):
            print(f"  ✅ 价格降序排序正确")
        else:
            print(f"  ❌ 价格降序排序错误: {prices}")
            return False
    else:
        print(f"  ❌ 价格降序请求失败: {response.status_code}")
        return False
    
    # 测试按时间排序
    response = requests.get(f"{BASE_URL}/?sort_by=created_at&sort_order=desc&limit=10")
    if response.status_code == 200:
        items = response.json()
        print(f"  ✅ 时间排序请求成功 (返回 {len(items)} 条)")
    else:
        print(f"  ❌ 时间排序请求失败: {response.status_code}")
        return False
    
    # 测试无效排序字段
    response = requests.get(f"{BASE_URL}/?sort_by=invalid_field")
    if response.status_code == 400:
        print(f"  ✅ 无效排序字段返回 400 错误")
    else:
        print(f"  ❌ 无效排序字段应该返回 400, 实际返回 {response.status_code}")
        return False
    
    # 测试无效排序方向
    response = requests.get(f"{BASE_URL}/?sort_order=invalid")
    if response.status_code == 400:
        print(f"  ✅ 无效排序方向返回 400 错误")
    else:
        print(f"  ❌ 无效排序方向应该返回 400, 实际返回 {response.status_code}")
        return False
    
    return True

def test_error_handling():
    """测试API错误处理"""
    print("\n📋 测试 3: API 错误处理")
    print("-" * 50)
    
    # 测试无效价格范围
    response = requests.get(f"{BASE_URL}/?min_price=100&max_price=50")
    if response.status_code == 400:
        error = response.json()
        if 'detail' in error and error['detail'].get('error') == 'InvalidPriceRange':
            print(f"  ✅ 无效价格范围返回正确的错误格式")
        else:
            print(f"  ⚠️  无效价格范围返回 400, 但错误格式不正确")
    else:
        print(f"  ❌ 无效价格范围应该返回 400, 实际返回 {response.status_code}")
        return False
    
    # 测试不完整地理位置参数
    response = requests.get(f"{BASE_URL}/?lat=37.2&lng=-80.4")  # 缺少 radius
    if response.status_code == 400:
        error = response.json()
        if error.get('detail', {}).get('error') == 'IncompleteGeoParams':
            print(f"  ✅ 不完整地理位置参数返回正确的错误格式")
        else:
            print(f"  ⚠️  不完整地理位置参数返回 400, 但错误格式不正确")
    else:
        print(f"  ❌ 不完整地理位置参数应该返回 400, 实际返回 {response.status_code}")
        return False
    
    # 测试无效商品ID
    response = requests.get(f"{BASE_URL}/999999")
    if response.status_code == 404:
        error = response.json()
        if error.get('detail', {}).get('error') == 'ItemNotFound':
            print(f"  ✅ 无效商品ID返回 404 和正确的错误格式")
        else:
            print(f"  ⚠️  无效商品ID返回 404, 但错误格式不正确")
    else:
        print(f"  ❌ 无效商品ID应该返回 404, 实际返回 {response.status_code}")
        return False
    
    # 测试分页参数验证
    response = requests.get(f"{BASE_URL}/?skip=-1")
    if response.status_code == 422:  # FastAPI 自动验证错误
        print(f"  ✅ 负值 skip 参数被正确拒绝")
    else:
        print(f"  ⚠️  负值 skip 参数返回 {response.status_code} (预期 422)")
    
    response = requests.get(f"{BASE_URL}/?limit=200")
    if response.status_code == 422:  # 超过最大值 100
        print(f"  ✅ 超过最大 limit 被正确拒绝")
    else:
        print(f"  ⚠️  超过最大 limit 返回 {response.status_code} (预期 422)")
    
    return True

def test_combined_filters():
    """测试组合筛选"""
    print("\n📋 测试 4: 组合筛选")
    print("-" * 50)
    
    # 组合: 分类 + 价格范围 + 排序
    response = requests.get(
        f"{BASE_URL}/?category=electronics&min_price=10&max_price=200&sort_by=price&sort_order=asc&limit=5"
    )
    if response.status_code == 200:
        items = response.json()
        print(f"  ✅ 组合筛选成功 (返回 {len(items)} 条)")
        
        # 验证所有返回的商品都符合条件
        for item in items:
            if item.get('category') != 'electronics':
                print(f"  ❌ 商品 {item['id']} 分类不匹配!")
                return False
            if not (10 <= item['price'] <= 200):
                print(f"  ❌ 商品 {item['id']} 价格不在范围内!")
                return False
        print(f"  ✅ 所有返回商品都符合筛选条件")
    else:
        print(f"  ❌ 组合筛选请求失败: {response.status_code}")
        print(f"     错误: {response.json()}")
        return False
    
    return True

def main():
    print("=" * 60)
    print("🧪 UniPick 搜索 API 功能测试")
    print("=" * 60)
    
    # 检查服务是否可用
    try:
        response = requests.get(f"{BASE_URL}/?limit=1", timeout=5)
        print(f"\n✅ 后端服务连接成功")
    except requests.exceptions.ConnectionError:
        print(f"\n❌ 无法连接到后端服务 (localhost:8000)")
        print(f"   请确保后端服务已启动: cd apps/backend && uvicorn app.main:app --reload")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 连接错误: {e}")
        sys.exit(1)
    
    # 运行所有测试
    results = []
    
    results.append(("Category 筛选", test_category_filter()))
    results.append(("排序功能", test_sorting()))
    results.append(("错误处理", test_error_handling()))
    results.append(("组合筛选", test_combined_filters()))
    
    # 打印结果汇总
    print("\n" + "=" * 60)
    print("📊 测试结果汇总")
    print("=" * 60)
    
    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"  {name}: {status}")
    
    all_passed = all(passed for _, passed in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 所有测试通过!")
    else:
        print("⚠️  部分测试失败，请检查实现")
    print("=" * 60)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
