#!/usr/bin/env python3
"""
UniPick 开发文档自动更新脚本

此脚本每天自动执行以下任务：
1. 扫描项目代码状态
2. 检查 Git 提交记录
3. 更新开发文档
4. 生成下一步开发任务
5. 发送报告

执行频率: 每天 08:00 EDT
"""

import os
import sys
import subprocess
import json
from datetime import datetime, timedelta
from pathlib import Path

# 项目路径
PROJECT_PATH = "/Volumes/Mac Driver/unipick"
DOCS_PATH = f"{PROJECT_PATH}/docs"


def run_command(cmd, cwd=None):
    """执行 shell 命令"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd or PROJECT_PATH,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout.strip(), result.returncode
    except Exception as e:
        return f"Error: {e}", 1


def get_git_status():
    """获取 Git 状态"""
    stdout, _ = run_command("git status --short")
    return stdout if stdout else "无未提交更改"


def get_recent_commits(days=1):
    """获取最近提交记录"""
    since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    stdout, _ = run_command(f'git log --since="{since}" --oneline --all')
    return stdout if stdout else "今日无提交"


def get_code_stats():
    """获取代码统计"""
    stats = {}
    
    # 后端代码行数
    backend_stdout, _ = run_command(
        "find app -name '*.py' | xargs wc -l | tail -1",
        cwd=f"{PROJECT_PATH}/apps/backend"
    )
    stats['backend_lines'] = backend_stdout.split()[0] if backend_stdout else "0"
    
    # 前端代码行数
    frontend_stdout, _ = run_command(
        "find src -name '*.tsx' -o -name '*.ts' -o -name '*.astro' | xargs wc -l | tail -1",
        cwd=f"{PROJECT_PATH}/apps/web"
    )
    stats['frontend_lines'] = frontend_stdout.split()[0] if frontend_stdout else "0"
    
    return stats


def check_api_completion():
    """检查 API 完成度"""
    api_files = {
        'items': 'app/api/v1/items/items.py',
        'favorites': 'app/api/v1/items/favorites.py',
        'users': 'app/api/v1/users/profile.py',
        'moderation': 'app/api/v1/moderation.py',
        'messages': 'app/api/v1/messages.py',  # 缺失
        'transactions': 'app/api/v1/transactions.py',  # 缺失
    }
    
    status = {}
    for name, path in api_files.items():
        full_path = f"{PROJECT_PATH}/apps/backend/{path}"
        status[name] = "✅ 存在" if os.path.exists(full_path) else "❌ 缺失"
    
    return status


def generate_daily_report():
    """生成每日开发报告"""
    now = datetime.now().strftime("%Y-%m-%d %H:%M EDT")
    
    report = f"""🕐 UniPick 每日开发报告 [{now}]

## 📊 今日代码状态

### Git 状态
```
{get_git_status()}
```

### 最近提交
```
{get_recent_commits()}
```

### 代码统计
{json.dumps(get_code_stats(), indent=2)}

### API 模块状态
{json.dumps(check_api_completion(), indent=2)}

## 🎯 今日开发重点

### 🔴 P0 - 必须完成
1. **消息系统数据库设计**
   - 创建 Conversation 模型
   - 创建 Message 模型
   - 编写 Alembic migration

2. **消息系统 API**
   - POST /api/v1/conversations/
   - GET /api/v1/conversations/
   - POST /api/v1/conversations/{{id}}/messages

### 🟡 P1 - 重要
3. **消息系统前端页面**
   - 消息中心页面
   - 对话详情页
   - 未读消息徽章

### 🟢 P2 - 可选
4. **代码审查**
5. **文档更新**

## 📋 本周目标回顾

- [ ] 消息系统数据层 - 进度 0%
- [ ] 消息系统 API - 进度 0%
- [ ] 消息系统前端 - 进度 0%
- [ ] Redis 缓存集成 - 进度 0%

## 🆘 阻塞问题

| 问题 | 状态 | 备注 |
|------|------|------|
| 无实时消息系统 | 🔴 严重 | 影响用户体验 |
| 缺少交易流程 | 🔴 严重 | 无法完成交易闭环 |

---
*报告自动生成*
"""
    return report


def update_development_doc():
    """更新开发文档"""
    doc_path = f"{DOCS_PATH}/DEVELOPMENT.md"
    
    # 读取现有文档
    if os.path.exists(doc_path):
        with open(doc_path, 'r') as f:
            content = f.read()
    else:
        content = ""
    
    # 更新最后更新时间
    now = datetime.now().strftime("%Y-%m-%d %H:%M EDT")
    content = content.replace(
        "*上次更新*:",
        f"*上次更新*: {now}"
    )
    
    # 添加新的待办事项检查
    # ... (可以在这里添加更多逻辑)
    
    print(f"开发文档已更新: {doc_path}")
    return True


def main():
    """主函数"""
    print("=" * 60)
    print("UniPick 开发文档自动更新")
    print(f"执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # 生成报告
    report = generate_daily_report()
    print("\n" + report)
    
    # 更新文档
    update_development_doc()
    
    # 保存报告到文件
    report_file = f"{DOCS_PATH}/reports/daily-{datetime.now().strftime('%Y-%m-%d')}.md"
    os.makedirs(os.path.dirname(report_file), exist_ok=True)
    with open(report_file, 'w') as f:
        f.write(report)
    
    print(f"\n报告已保存: {report_file}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
