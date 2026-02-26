# 前端样式优化方案：从"模板博客"到"有灵魂的个人站"

## Context

当前网站是一个 Astro + React + Tailwind CSS 的个人博客，部署在 Cloudflare Workers。视觉上是典型的极简技术博客模板——白底黑字、sky-600 蓝色链接、Neucha 装饰字体做的灰色大字"hi!"。**最大的问题不是丑，而是没有辨识度**。100个开发者博客有90个长这样。

本次优化目标：在保持轻量、快速的前提下，通过 **3个标志性设计特性** + 全面的样式精修，让网站一眼就能被记住。

**主色调选择**：琥珀暖金 Amber 系 — 温暖独特，在一堆冷色调技术博客中降维打击式的辨识度。

---

## 三个标志性设计特性（核心亮点）

### 特性 1：鼠标追光效果（Cursor Spotlight）

**灵感来源**：[Brittany Chiang](https://brittanychiang.com) 的个人网站
**效果**：鼠标移动时，页面上出现一个柔和的径向渐变光晕跟随光标，营造"手电筒探索"的感觉。在深色模式下尤其惊艳。

**实现方式**（零依赖，约15行代码）：
- 一个 `position: fixed; inset: 0; pointer-events: none;` 的覆盖层
- `radial-gradient` 从光标位置向外扩散，从半透明到全透明
- CSS custom properties `--cursor-x` `--cursor-y` 由 `pointermove` 事件更新
- 使用 `requestAnimationFrame` 保证性能

**涉及文件**：
- `src/layouts/BaseLayout.astro` — 添加 spotlight overlay div + script

### 特性 2：首页 Bento Grid 布局

**灵感来源**：Apple 产品页 / [bentogrids.com](https://bentogrids.com)
**效果**：首页不再是线性的 hero + 博客列表，而是一个 Bento 网格，把"自我介绍"、"最新文章"、"技术栈"、"社交链接"等信息组织成大小不一的卡片，像精心排列的便当盒。

**布局草图**：
```
┌─────────────────────┬──────────────┐
│                     │              │
│   Hi, I'm           │   GitHub     │
│   wengjialin         │   Social     │
│   (大卡片, 2col)     │   Links      │
│                     │   (小卡片)    │
├──────────┬──────────┼──────────────┤
│          │          │              │
│ Recent   │ Recent   │  Tech Stack  │
│ Post 1   │ Post 2   │  或 About Me │
│ (卡片)    │ (卡片)    │  (中卡片)    │
│          │          │              │
├──────────┴──────────┼──────────────┤
│                     │              │
│ Recent Post 3       │  RSS / More  │
│ (横向卡片)           │  (小卡片)    │
│                     │              │
└─────────────────────┴──────────────┘
```

**实现方式**：CSS Grid + Tailwind `grid-cols` + `col-span`/`row-span`，移动端自动降级为单列。

**涉及文件**：
- `src/pages/index.astro` — 完全重写首页布局

### 特性 3：渐变动态文字 + 微交互系统

**效果**：
- Hero 标题使用 CSS 动画渐变色文字（amber → orange 缓慢流动）
- 博客卡片 hover 时出现微妙的边框光晕 + 上浮阴影
- 页面内容在滚动进入视口时淡入上移（Intersection Observer，零依赖）
- 导航 active 状态使用 pill 背景而非仅变色

**实现方式**：纯 CSS 动画 + Intersection Observer API（< 20 行 JS）

**涉及文件**：
- `tailwind.config.mjs` — 添加 keyframes/animation 定义
- `src/styles/global.css` — 添加渐变动画类
- `src/components/ListPosts.tsx` — 卡片 hover 效果

---

## 全面样式精修

### Step 1: 更新 Tailwind 配置（色彩 + 字体 + 动画）
**文件**: `tailwind.config.mjs`

- **色彩系统**：从 `sky-600` 换为 `amber` 琥珀暖金系
  - 主色 `#f59e0b` (amber-500)，hover `#fbbf24` (amber-400)，深色 `#d97706` (amber-600)，浅底 `#fffbeb` (amber-50)
  - 浅色模式下链接/文字使用 `amber-600` (#d97706) 保证对比度
  - 深色模式下使用 `amber-400` (#fbbf24) 在深色背景上更醒目
- **暗色背景**：从纯黑 `#000` 换为深蓝灰 `#0f172a`（slate-900），减少视觉疲劳
- **暗色文字**：从 `neutral-400` 换为 `slate-200`，对比度从 4.1:1 提升到 12.3:1
- **新增字体**：JetBrains Mono 用于代码块（提升技术博客质感）
- **新增动画**：fade-in-up、gradient-shift 等 keyframes
- **darkMode**: 从 `"media"` 改为 `"class"`（支持手动切换）

### Step 2: 重写全局样式
**文件**: `src/styles/global.css`

- 更新 `.nav-link`、`.prose-link`、`.text-main`、`.text-link`、`.text-title` 使用新色彩系统
- body 背景改为新的暗色方案
- 添加 `.animate-fade-in-up` 和 `.gradient-text` 等工具类

### Step 3: 导航栏升级
**文件**: `src/components/Header.tsx`

- **Sticky + 毛玻璃**：`sticky top-0 backdrop-blur-md bg-white/80 dark:bg-slate-900/80`
- **Active 链接**：pill 背景样式 `bg-amber-50 dark:bg-amber-500/10 text-amber-600`
- **添加深色模式切换按钮**：太阳/月亮图标，localStorage 持久化
- **固定高度**：`h-16` 替代不稳定的 `h-auto sm:h-18`
- **底部分割线**：`border-b border-gray-200/50 dark:border-slate-700/50`

### Step 4: 首页重设计
**文件**: `src/pages/index.astro`

- 移除旧的 Neucha 灰色装饰字"hi!"和"blog"
- 改为 Bento Grid 布局（见上方特性 2）
- Hero 区域使用渐变动态文字
- 添加社交链接卡片、技术栈卡片
- "最新文章"以卡片形式展示

### Step 5: 博客列表卡片化
**文件**: `src/components/ListPosts.tsx`

- **完整模式**：卡片设计，hover 时 `border + shadow-sm + -translate-y-0.5`
- **Mini 模式**：行级 hover 背景变色
- **Tags**：从 `#tag` 纯文字改为 pill badge（`rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400`）
- **年份分割器**：保留 Neucha 但用 opacity 控制而非硬编码颜色

### Step 6: 博客详情页优化
**文件**: `src/pages/blog/[slug].astro`

- 添加"← Back to blog"返回链接
- Header 底部加分割线，明确 meta 与正文边界
- Tag 样式与列表页统一
- scroll-mt 确保锚点跳转不被 sticky header 遮挡

### Step 7: Markdown 样式升级
**文件**: `src/styles/markdown.css`

- h2 添加底部分割线 `border-b`，视觉层级更强
- 引用块升级为"卡片式"：加背景色 + 右侧圆角，去掉斜体
- 行内代码用品牌色着色（`bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400`）
- 代码块加边框 + 更大圆角 `rounded-xl`
- 移除 `whitespace-nowrap`（中文博客会导致链接不换行）

### Step 8: 目录组件优化
**文件**: `src/components/TableOfContents.tsx`

- 半透明背景 + backdrop-blur
- 标题改为 "Contents"，`uppercase tracking-wider`
- h2 级别缩进 `pl-6`
- 使用新品牌色系

### Step 9: Footer 增强
**文件**: `src/components/Footer.astro`

- 添加顶部分割线
- 左右布局：链接在左，`© 2026 wengjialin` 在右
- 增加 RSS 链接
- 统一使用 `ink-tertiary` 色调

### Step 10: BaseLayout 微调
**文件**: `src/layouts/BaseLayout.astro`

- body 添加新的暗色背景 class
- `py-10` → `py-16`，给内容更多呼吸空间
- 添加 Spotlight overlay div

### Step 11: 添加字体
**文件**: `src/components/BaseHead.astro`

- Google Fonts URL 添加 JetBrains Mono

### Step 12: 深色模式初始化脚本
**文件**: `src/layouts/BaseLayout.astro`

- 在 `<head>` 中添加内联脚本，读取 localStorage 初始化 dark class
- 防止页面加载时的闪烁（FOUC）

---

## 不动的部分

- 整体 Astro + React 架构不变
- 内容结构（Content Collections）不变
- 部署方式（Cloudflare Workers）不变
- SEO 配置（Schema、OpenGraph）不变
- TOC 的定位逻辑不变
- RSS 功能不变

---

## 验证方式

1. `npm run dev` 启动开发服务器
2. 浏览器中检查以下页面：
   - 首页：Bento 布局是否正确渲染，鼠标追光是否流畅
   - 博客列表页：卡片 hover 效果
   - 博客详情页：Markdown 样式、返回链接、TOC
   - About 页面
3. 切换深色/浅色模式，确认所有页面显示正常
4. 移动端（< 640px）检查响应式
5. `npm run build` 确认构建无报错
