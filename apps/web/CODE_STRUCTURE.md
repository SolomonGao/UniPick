# UniPick 前端代码结构

## 组件文件 (components/)

### 核心组件
| 文件 | 用途 | 导出 |
|------|------|------|
| `AuthGuard.tsx` | 认证上下文和 Provider | `AuthProvider`, `useAuth`, `GuestGuard` |
| `Providers.tsx` | React Query + AuthProvider 组合 | `Providers` |
| `ProtectedRoute.tsx` | 需要登录的路由守卫 | `ProtectedRoute` |

### 页面级组件
| 文件 | 用途 | 说明 |
|------|------|------|
| `Marketplace.tsx` | 首页市场 | 内部包裹 Providers，包含 SearchableFeed |
| `SellPage.tsx` | 发布商品页面包装 | Providers + ProtectedRoute + SellItemForm |
| `MyListingsPage.tsx` | 我的发布页面包装 | Providers + ProtectedRoute + MyListingsItem |
| `UserMenuWrapper.tsx` | 顶部菜单包装 | Providers + UserMenu |

### 功能组件
| 文件 | 用途 |
|------|------|
| `SearchableFeed.tsx` | 商品列表 + 搜索 + 无限滚动 |
| `SearchBar.tsx` | 搜索过滤组件 |
| `SellItemForm.tsx` | 发布商品表单 |
| `MyListingsItem.tsx` | 我的发布列表 |
| `ItemDetail.tsx` | 商品详情（独立 QueryClient） |
| `LocationPicker.tsx` | 地图位置选择 |
| `UserMenu.tsx` | 顶部用户菜单 |

### 认证表单
| 文件 | 用途 |
|------|------|
| `LoginForm.tsx` | 登录表单 |
| `RegisterForm.tsx` | 注册表单 |
| `ForgotPasswordForm.tsx` | 忘记密码 |
| `UpdatePasswordForm.tsx` | 更新密码 |

## 页面文件 (pages/)

| 文件 | 使用组件 | 说明 |
|------|----------|------|
| `index.astro` | `<Marketplace />` | 首页 |
| `sell.astro` | `<SellPage />` | 发布商品（需登录） |
| `my-listings.astro` | `<MyListingsPage />` | 我的发布（需登录） |
| `items/[id].astro` | `<ItemDetail />` | 商品详情 |
| `login.astro` | `<LoginForm />` | 登录 |
| `register.astro` | `<RegisterForm />` | 注册 |
| `forgot-password.astro` | `<ForgotPasswordForm />` | 忘记密码 |
| `update-password.astro` | `<UpdatePasswordForm />` | 更新密码 |

## 布局文件 (layouts/)

| 文件 | 使用组件 |
|------|----------|
| `Layout.astro` | `<UserMenuWrapper />` |

## 已删除的文件

- `ManageItemsplace.tsx` - 未使用
- `Welcome.astro` - 未使用

## 关键原则

1. **Context 必须在 .tsx 内部包裹** - 不在 .astro 中使用 React Context Provider
2. **每个页面级组件自带 Providers** - Marketplace, SellPage, MyListingsPage, UserMenuWrapper
3. **ProtectedRoute 用于需登录的页面** - SellPage, MyListingsPage
4. **ItemDetail 独立管理状态** - 自己创建 QueryClient，不依赖 Providers
