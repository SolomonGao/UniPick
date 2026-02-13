#!/bin/bash
# UniPick 测试环境检查脚本

echo "=========================================="
echo "🔍 UniPick 测试环境检查"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 通过${NC}"
        return 0
    else
        echo -e "${RED}❌ 失败${NC}"
        return 1
    fi
}

# 1. 检查 Python
echo "🐍 检查 Python 环境..."
python --version 2>/dev/null || python3 --version
check_status

# 2. 检查 pip
echo "📦 检查 pip..."
pip --version 2>/dev/null || pip3 --version
check_status

# 3. 检查 pytest
echo "🧪 检查 pytest..."
python -c "import pytest; print(f'pytest {pytest.__version__}')" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  pytest 未安装，正在安装...${NC}"
    pip install pytest pytest-asyncio httpx
fi
check_status

# 4. 检查 httpx
echo "🌐 检查 httpx..."
python -c "import httpx; print(f'httpx {httpx.__version__}')" 2>/dev/null
check_status

# 5. 检查后端服务
echo "🖥️  检查后端服务..."
if curl -s http://localhost:8000/api/v1/items/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务运行正常${NC}"
else
    echo -e "${RED}❌ 后端服务未启动${NC}"
    echo "   请运行: cd apps/backend && uvicorn app.main:app --reload"
fi

# 6. 检查数据库连接
echo "🗄️  检查测试数据..."
ITEM_COUNT=$(curl -s http://localhost:8000/api/v1/items/ 2>/dev/null | python -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
if [ -n "$ITEM_COUNT" ] && [ "$ITEM_COUNT" -gt 0 ] 2>/dev/null; then
    echo -e "${GREEN}✅ 数据库中有 ${ITEM_COUNT} 条测试数据${NC}"
else
    echo -e "${YELLOW}⚠️  数据库中数据较少，建议运行: python app/test/seed.py${NC}"
fi

echo ""
echo "=========================================="
echo "📝 环境检查完成"
echo "=========================================="
