#!/bin/bash
# UniPick 搜索 API 测试执行脚本
# Test-Agent 使用

echo "=========================================="
echo "🧪 UniPick 搜索 API 测试套件"
echo "=========================================="
echo ""

# 检查后端服务是否运行
echo "📡 检查后端服务状态..."
if curl -s http://localhost:8000/api/v1/items/ > /dev/null; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务未启动，请先运行:"
    echo "   cd apps/backend && uvicorn app.main:app --reload"
    exit 1
fi

echo ""
echo "🚀 开始执行测试..."
echo ""

# 执行测试
cd /Volumes/mac外置硬盘/unipick/apps/backend
python -m pytest app/test/test_search_api.py -v --tb=short

echo ""
echo "=========================================="
echo "✅ 测试执行完毕"
echo "=========================================="
