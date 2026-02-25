# 创建 wengjialin 个人网站 - 部署到 Cloudflare

## Context

当前 `~/startUpWorkspace/website` 是完全空白的 git 仓库。需要创建一个 Astro 个人网站：
- **设计和体验对标 boristane/website**：极简排版、大号年份水印、干净的文章列表、sky-600 链接色
- **技术栈**：Astro 5 + React + Tailwind CSS + Cloudflare Workers（SSR 模式 + 预渲染）
- **初期功能**：博客为主体 + 个人介绍，架构预留项目展示等扩展

### 参考项目源码位置

| 项目 | 本地路径 | 用途 |
|------|---------|------|
| **boristane/website** | `~/startUpWorkspace/learn/boristane/website` | 设计蓝本：页面结构、视觉风格、组件设计、交互体验 |
| **astro-blog-starter-template-brayden** | `~/startUpWorkspace/learn/cloudflare/astro-blog-starter-template-brayden` | 骨架参考：Cloudflare 部署配置（wrangler.json）、RSS、.gitignore、内容集合基础结构 |

## 技术栈选型

| 决策点 | 选型 | 理由 |
|--------|------|------|
| SSR 框架 | Astro 5 | 内容优先、岛屿架构、Cloudflare 一等支持 |
| CSS 框架 | Tailwind CSS | 原子化 CSS 开发效率高，生态最大 |
| 客户端框架 | React | 生态最大，shadcn/ui 等可复用；Astro 岛屿按需加载不影响静态页面性能 |
| 渲染模式 | `output: "server"` + 页面级 prerender | 博客页面静态生成（性能最优），后续加动态功能（OG 图片、API、D1）无需改全局配置 |
| 部署 | Cloudflare Workers + GitHub Actions | Workers Assets 托管静态资源，CI/CD 自动化部署 |
| 内容管理 | Astro Content Collections + MDX | 类型安全的 frontmatter 验证，支持在 Markdown 中嵌入组件 |

## 实现策略

**不从 brayden 博客模板复制改样式**（两者设计差异太大，改比写还累）。改为：
- **骨架配置**从 brayden 模板取（wrangler.json、Cloudflare 适配、RSS、.gitignore）
- **设计和组件**以 boristane 为蓝本用 Tailwind CSS + React 重建
- 组件分工原则：**有交互 → React**（`client:load`），**纯展示 → Astro**（零 JS）

### boristane 设计要素 → 我们的实现映射

| 要素 | boristane 实现 | 我们的实现 |
|------|---------------|-----------|
| 布局 | max-w-3xl 居中 | Tailwind `max-w-3xl mx-auto` |
| 正文字体 | Inter 400-700 | Google Fonts Inter |
| 水印字体 | Neucha（手写体，超大号淡灰色，-z-10） | Google Fonts Neucha + Tailwind |
| 代码字体 | DM Mono | 后续添加 |
| 亮色模式 | 白底、gray-800 文字、sky-600 链接 | Tailwind 原生类 |
| 暗色模式 | 黑底、#bbb 文字、白色链接 | Tailwind `dark:` 前缀 |
| 链接样式 | 底边框、sky-600、hover 不透明度变化 | 自定义 Tailwind 组件类 `prose-link` |
| 文章列表 | Vue `ListPosts.vue`（年份水印分组） | React `ListPosts.tsx`（支持未来加搜索/过滤） |
| 首页 | 大号 "hi !" + 自我介绍 + 最新博文 mini 列表 | 同结构 |
| 导航 | Vue `Header.vue` + VueUse | React `Header.tsx`（`client:load`） |
| 页脚 | Vue `Footer.vue` | Astro `Footer.astro`（纯展示，无需 JS） |
| 博客详情 | 标题 + 元信息 + 正文，桌面端左侧固定 TOC | Astro 页面 + React TOC 组件（`client:load`） |

### UnoCSS → Tailwind 快捷方式映射

boristane 用 UnoCSS shortcuts 定义的复用样式，在 Tailwind 中通过 `@layer components` + `@apply` 等效实现：

| UnoCSS shortcut | Tailwind 等效 |
|-----------------|--------------|
| `bg-main` | `bg-white dark:bg-black` |
| `text-main` | `text-gray-800 dark:text-neutral-400` |
| `text-link` | `text-sky-600 dark:text-white` |
| `text-title` | `text-4xl font-semibold text-gray-800 dark:text-neutral-400` |
| `nav-link` | `text-gray-800 dark:text-neutral-400 hover:text-sky-600 transition duration-200` |
| `prose-link` | `text-sky-600 dark:text-white border-b border-sky-600/30 hover:border-sky-600 dark:border-neutral-500 hover:dark:border-neutral-400 transition-colors duration-200 no-underline` |

---

## 实施计划

### Phase 1：项目初始化 + 配置

1. **创建项目骨架**
   - 从 brayden 模板复制：`.gitignore`、`tsconfig.json`
   - 手写 `package.json`：
     - dependencies: `astro`, `@astrojs/cloudflare`, `@astrojs/tailwind`, `@astrojs/react`, `@astrojs/mdx`, `@astrojs/rss`, `@astrojs/sitemap`, `react`, `react-dom`, `tailwindcss`
     - devDependencies: `wrangler`, `@types/react`, `@types/react-dom`, `typescript`
   - 手写 `astro.config.mjs`：
     ```js
     export default defineConfig({
       site: "https://wengjialin-website.workers.dev",
       output: "server",
       integrations: [tailwind(), react(), mdx(), sitemap()],
       adapter: cloudflare({ platformProxy: { enabled: true } }),
     });
     ```
   - 手写 `wrangler.json`（name: `wengjialin-website`）
   - 复制 `public/favicon.svg`、`public/.assetsignore`
   - `.gitignore` 追加 `worker-configuration.d.ts`

2. **Tailwind 配置** `tailwind.config.mjs`
   - 扩展字体：`fontFamily: { neucha: ['Neucha'], sans: ['Inter', 'system-ui', 'sans-serif'] }`
   - darkMode: `'media'`（跟随系统，后续可改为 `'class'` 支持手动切换）

3. **全局样式** `src/styles/global.css`
   - Tailwind 指令：`@tailwind base; @tailwind components; @tailwind utilities;`
   - `@layer components` 中定义 `prose-link`、`nav-link` 等复用类

4. **安装依赖** `npm install` + `npm run cf-typegen`

### Phase 2：核心组件（对标 boristane 设计）

5. **站点配置** `src/site-config.ts`
   ```ts
   export default {
     author: 'wengjialin',
     title: 'wengjialin',
     description: '...',
     site: 'https://...',
     headerNavLinks: [{ text: 'blog', href: '/blog' }],
     footerNavLinks: [{ text: 'github', href: 'https://github.com/Stool233' }],
   }
   ```

6. **BaseHead 组件** `src/components/BaseHead.astro`（Astro 组件）
   - SEO 元标签、Open Graph、Twitter Card
   - Google Fonts 引入（Inter + Neucha）
   - Schema.org JSON-LD（Person + Article）
   - 参考：boristane `src/components/BaseHead.astro`

7. **BaseLayout 布局** `src/layouts/BaseLayout.astro`（Astro 组件）
   - `<body class="bg-white dark:bg-black text-gray-800 dark:text-neutral-400 min-h-screen font-sans">`
   - `<main class="max-w-3xl mx-auto py-10 px-6">`
   - 引入 Header（`client:load`）+ Footer + ViewTransitions
   - 参考：boristane `src/layouts/BaseLayout.astro`

8. **Header 组件** `src/components/Header.tsx`（React 组件）
   - 通过 `client:load` 在客户端加载
   - 左侧 logo "wengjialin"，右侧导航链接（从 site-config 读取）
   - 当前页面链接高亮（sky-600），其他链接 opacity-60
   - 移动端响应式菜单（useState 管理展开/收起）
   - RSS 图标链接
   - 参考：boristane `src/components/Header.vue`（Vue → React 改写）

9. **Footer 组件** `src/components/Footer.astro`（Astro 组件，纯展示无交互）
   - 社交链接横排（从 site-config 读取）
   - 参考：boristane `src/components/Footer.vue`

10. **ListPosts 组件** `src/components/ListPosts.tsx`（React 组件）
    - 支持 `mini` / `full` 两种模式
    - **完整模式**：年份大水印分组（Neucha 字体 + text-[#eaeaea] dark:text-[#474747]） + 文章标题(text-2xl) + 描述 + 日期 + 标签
    - **Mini 模式**：`日期 · 标题`（首页用）
    - 后续可轻松扩展搜索/过滤功能
    - 参考：boristane `src/components/ListPosts.vue`（Vue → React 改写）

11. **Markdown 样式** `src/styles/markdown.css`
    - `.prose` 内容区排版样式（blockquote、table、code block、img）
    - 暗色模式适配
    - 参考：boristane `src/styles/markdown.css`

### Phase 3：内容集合 + 页面

12. **内容集合配置** `src/content.config.ts`
    - blog collection schema：title、description、date、tags、draft、image
    - 使用 Astro 5 的 glob loader
    - 参考：boristane `src/content/config.ts`（简化版，仅 blog）

13. **工具函数** `src/utils/posts.ts`
    - `getPosts(type, tag?)` - 获取文章列表，按日期倒序，生产环境过滤 draft
    - `sortPostsByDate()` - 排序函数
    - 参考：boristane `src/utils/posts.ts`（简化版）

14. **首页** `src/pages/index.astro`（`export const prerender = true`）
    - 大号水印 "hi !"（font-neucha、xl:text-9xl、text-[#eaeaea]、-z-10）
    - 自我介绍段落（待用户填写）
    - 最新博文 mini 列表（`<ListPosts list={posts} mini={true} client:load />`）
    - 参考：boristane `src/pages/index.astro`

15. **博客列表页** `src/pages/blog.astro`（`export const prerender = true`）
    - 完整模式的 ListPosts
    - 参考：boristane `src/pages/blog.astro`

16. **博客详情页** `src/pages/blog/[slug].astro`（`export const prerender = true`）
    - 标题（text-4xl font-semibold）+ 元信息（日期、标签）
    - Markdown/MDX 内容渲染（`.prose` 样式）
    - 桌面端左侧固定 TOC（`TableOfContents.astro` + vanilla JS 滚动跟踪）
    - 参考：boristane `src/pages/blog/[slug].astro`

17. **TableOfContents 组件** `src/components/TableOfContents.tsx`（React 组件）
    - 接收 headings 数据，通过 `client:load` 加载
    - `useEffect` 监听滚动事件，`useState` 管理当前活跃标题
    - 点击平滑滚动到对应标题
    - 宽屏（>1100px）左侧固定定位，窄屏折叠到内容上方
    - 参考：boristane `src/components/TableOfContents.astro` + `blog/[slug].astro` 中的 script

18. **About 页面** `src/pages/about.astro`（`export const prerender = true`）
    - 简洁的个人介绍页框架（待用户填写具体内容）

19. **RSS** `src/pages/rss.xml.js`（`export const prerender = true`）
    - 参考 brayden 模板的实现

20. **博客内容**
    - 创建 `src/content/blog/hello-world.md` 开篇文章
    - 从 brayden 模板保留 `markdown-style-guide.md` 作语法参考

### Phase 4：GitHub 仓库 + 推送

21. **创建 GitHub 仓库并推送**
    ```bash
    gh repo create Stool233/website --public --source=. \
      --description "wengjialin's personal website"
    git add .
    git commit -m "feat: init personal website with astro + react + cloudflare"
    git push -u origin main
    ```

### Phase 5：GitHub Actions CI/CD

22. **创建部署工作流** `.github/workflows/deploy.yml`
    - `main` 分支 push → 生产部署（`wrangler deploy`）
    - 非 main 分支 push → Preview 部署（`wrangler deploy --name wengjialin-website-preview`），访问 `wengjialin-website-preview.<subdomain>.workers.dev`
    - Pull Request → Preview 部署，并在 PR 评论中输出 preview URL
    ```yaml
    name: Deploy
    on:
      push:
        branches: ['**']
      pull_request:
        branches: [main]
      workflow_dispatch:

    jobs:
      deploy:
        runs-on: ubuntu-latest
        permissions:
          contents: read
          deployments: write
          pull-requests: write
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with:
              node-version: 22
              cache: 'npm'
          - run: npm ci
          - run: npm run build

          # 生产部署：main 分支 push
          - name: Deploy to Production
            if: github.ref == 'refs/heads/main' && github.event_name == 'push'
            uses: cloudflare/wrangler-action@v3
            with:
              apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
              accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
              command: deploy

          # Preview 部署：非 main 分支或 PR
          - name: Deploy Preview
            if: github.ref != 'refs/heads/main' || github.event_name == 'pull_request'
            uses: cloudflare/wrangler-action@v3
            id: preview
            with:
              apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
              accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
              command: deploy --name wengjialin-website-preview

          # 在 PR 评论中输出 preview URL
          - name: Comment Preview URL
            if: github.event_name == 'pull_request'
            uses: marocchino/sticky-pull-request-comment@v2
            with:
              message: |
                🔗 Preview deployed: https://wengjialin-website-preview.<your-subdomain>.workers.dev
    ```

23. **提交并推送 workflow 文件**

24. **用户自行配置 GitHub Secrets**
    - `CLOUDFLARE_API_TOKEN`：Cloudflare Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" 模板
    - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare Dashboard → Workers & Pages → 右侧栏 Account ID

---

## 关键参考文件对照表

| 用途 | boristane 原文件 | 新项目文件 |
|------|-----------------|-----------|
| 站点配置 | `src/site-config.ts` | `src/site-config.ts` |
| 布局 | `src/layouts/BaseLayout.astro` | `src/layouts/BaseLayout.astro` |
| 头部 SEO | `src/components/BaseHead.astro` | `src/components/BaseHead.astro` |
| 导航栏 | `src/components/Header.vue` | `src/components/Header.tsx` |
| 页脚 | `src/components/Footer.vue` | `src/components/Footer.astro` |
| 文章列表 | `src/components/ListPosts.vue` | `src/components/ListPosts.tsx` |
| 目录 | `src/components/TableOfContents.astro` | `src/components/TableOfContents.tsx` |
| 首页 | `src/pages/index.astro` | `src/pages/index.astro` |
| 博客详情 | `src/pages/blog/[slug].astro` | `src/pages/blog/[slug].astro` |
| Markdown 样式 | `src/styles/markdown.css` | `src/styles/markdown.css` |
| 内容集合 | `src/content/config.ts` | `src/content.config.ts` |
| 工具函数 | `src/utils/posts.ts` | `src/utils/posts.ts` |
| CSS 配置 | `uno.config.ts` | `tailwind.config.mjs` |
| 部署配置 | `wrangler.toml` | `wrangler.json` |

## 最终项目结构

```
website/
├── .github/workflows/deploy.yml    # CI/CD
├── .gitignore
├── astro.config.mjs                # Astro 配置（server + react + tailwind）
├── package.json
├── tailwind.config.mjs             # Tailwind 配置（Inter + Neucha 字体）
├── tsconfig.json
├── wrangler.json                   # Cloudflare Workers 部署配置
├── public/
│   ├── favicon.svg
│   └── .assetsignore
└── src/
    ├── site-config.ts              # 站点全局配置
    ├── env.d.ts                    # Cloudflare Runtime 类型
    ├── components/
    │   ├── BaseHead.astro          # <head> SEO 元数据（Astro）
    │   ├── Header.tsx              # 导航栏（React, client:load）
    │   ├── Footer.astro            # 页脚（Astro，纯展示）
    │   ├── ListPosts.tsx           # 文章列表（React, mini/full 模式）
    │   └── TableOfContents.tsx     # 目录（React, 滚动跟踪 + 高亮）
    ├── layouts/
    │   └── BaseLayout.astro        # 全局布局
    ├── pages/
    │   ├── index.astro             # 首页（介绍 + 最新博文）
    │   ├── about.astro             # 关于页
    │   ├── blog.astro              # 博客列表页
    │   ├── blog/
    │   │   └── [slug].astro        # 博客详情页
    │   └── rss.xml.js              # RSS 订阅
    ├── content/
    │   └── blog/
    │       ├── hello-world.md      # 开篇文章
    │       └── markdown-style-guide.md
    ├── content.config.ts           # 内容集合 schema
    ├── utils/
    │   └── posts.ts                # 文章查询工具函数
    └── styles/
        ├── global.css              # Tailwind 指令 + 复用组件类
        └── markdown.css            # Markdown 内容排版样式
```

## 后续可扩展方向（本次不实现）

本次技术栈选型已为以下功能预留扩展空间：

- **主题切换按钮**：改 darkMode 为 `'class'` 模式 + React ThemeToggle 组件
- **动态 OG 图片**：新建 `blog/[slug]/og.png.ts`，用 satori + resvg-wasm（已有 SSR 模式支持）
- **D1 数据库**：drizzle-orm + wrangler D1 binding，用于页面浏览量、评论等
- **项目展示页**：新增 projects content collection + `/projects` 路由
- **标签过滤页**：新建 `tags/[slug].astro`，基于已预留的 tags schema 字段
- **评论系统**：giscus（React 版本直接可用）
- **搜索功能**：基于 ListPosts React 组件扩展客户端搜索/过滤
- **代码块增强**：expressive-code + 行号插件 + catppuccin 主题

## 验证步骤

1. `npm run dev` → http://localhost:4321 确认首页、博客列表、博客详情、About 页面正常
2. 验证暗色模式（系统偏好切换后样式正确）
3. 验证移动端响应式布局（导航菜单折叠/展开）
4. `npm run build` → 构建成功无报错
5. `git push origin main` → 触发 GitHub Actions → 确认 Cloudflare Workers 部署成功
