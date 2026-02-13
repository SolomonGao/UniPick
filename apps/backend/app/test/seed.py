import sys
import os

# ✅ 核心修复：把当前脚本所在的目录添加到系统路径中
# 这样 Python 就能百分百找到同级目录下的 'app' 文件夹了
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
workspace_dir = os.path.dirname(parent_dir)
sys.path.append(workspace_dir)

import asyncio
import random
from sqlalchemy import text
from faker import Faker
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.item import Item

# 初始化 Faker
fake = Faker()

# VT (Blacksburg) 的大致坐标范围
VT_LAT = 37.2284
VT_LON = -80.4234

# 商品关键词，让标题看起来更像学生闲置
ADJECTIVES = ["99新", "全新", "急出", "白菜价", "毕业出的", "仅拆封", "成色好"]
NOUNS = ["IKEA台灯", "PS5游戏盘", "高数课本", "人体工学椅", "显示器", "Switch", "AirPods", "电饭煲", "滑板", "吉他"]

# 商品分类，与前端搜索组件保持一致
CATEGORIES = {
    "electronics": ["PS5游戏盘", "显示器", "Switch", "AirPods", "电饭煲", "IKEA台灯"],
    "furniture": ["人体工学椅", "书桌", "床垫", "衣柜"],
    "books": ["高数课本", "英语教材", "考研资料", "专业书"],
    "sports": ["滑板", "瑜伽垫", "哑铃", "篮球"],
    "music": ["吉他", "耳机", "音响", "电子琴"],
    "others": ["其他闲置物品"]
}

def get_category_for_item(title: str) -> str:
    """根据商品标题自动推断分类"""
    for category, keywords in CATEGORIES.items():
        for keyword in keywords:
            if keyword in title:
                return category
    return "others"  # 默认分类

async def seed_data():
    print("🌱 开始生成 20 条测试数据...")
    
    async with AsyncSessionLocal() as db:

        result = await db.execute(text("SELECT id FROM auth.users LIMIT 1"))
        user_row = result.first()
        if not user_row:
            print("❌ 错误：数据库中没有用户！请先注册一个用户，然后再运行这个脚本。")
            return
        
        user_id = user_row[0]  # 获取第一个用户的 ID

        new_items = []
        
        for _ in range(20):
            # 1. 生成随机标题
            noun = random.choice(NOUNS)
            title = f"{random.choice(ADJECTIVES)} {noun}"
            
            # 2. 自动推断分类
            category = get_category_for_item(noun)
            
            # 3. 生成 VT 附近的随机坐标 (偏移量 0.05 度以内)
            lat = VT_LAT + random.uniform(-0.02, 0.02)
            lon = VT_LON + random.uniform(-0.02, 0.02)
            
            # PostGIS 格式: POINT(经度 纬度)
            geo_point = f"POINT({lon} {lat})"
            
            # 4. 生成随机图片 (使用 picsum.photos)
            image_id = random.randint(1, 1000)
            image_url = f"https://picsum.photos/id/{image_id}/400/300"

            item = Item(
                user_id=user_id, # 随机生成一个 User ID
                title=title,
                description=fake.text(max_nb_chars=100),
                price=round(random.uniform(5.0, 500.0), 2),
                images=[image_url],
                location_name=f"VT Campus Area (Fake)",
                location=geo_point,
                category=category  # 添加分类
            )
            new_items.append(item)

        db.add_all(new_items)
        await db.commit()
        
    print("✅ 成功插入 20 条数据！快去前端刷新页面看看吧。")

if __name__ == "__main__":
    asyncio.run(seed_data())