# 博客分类与排序

文章仍保存在 `src/content/blog/`，通过文件顶部的 frontmatter 管理。

## 分类

分类与主题标签沿用 `tags` 字段。通常保留一个主分类，再按文章的核心内容补充一到两个主题，最多三个；不使用过于宽泛的 `AI` 标签，也不为每个提及的工具单独创建标签。

| 值 | 显示名称 | 适合的内容 |
| --- | --- | --- |
| `agent-engineering` | Agent Engineering | Harness、上下文管理、工具调用、Agent 性能实践 |
| `ai-infrastructure` | AI Infrastructure | Sandbox、可观测性、网关及基础设施 |
| `software-engineering` | Software Engineering | 代码质量、形式化方法、CI/CD 和工程案例 |
| `ai-coding` | AI Coding | AI 辅助编程、代码审查、排障与工程验证 |
| `formal-methods` | Formal Methods | 形式化规格、模型检查与系统正确性 |

```yaml
tags: ["agent-engineering"]
```

跨主题示例：代码审查文章使用 `["software-engineering", "ai-coding"]`；形式化方法文章使用 `["software-engineering", "ai-coding", "formal-methods"]`。标签应反映文章的主要议题，而不只是是否提到了 AI。

分类配置集中在 `src/blog-config.ts`。如确实需要增加一个长期主题，先更新这里的 ID、名称和描述，再给文章使用。构建会校验分类值、数量和重复值。

点击首页、博客列表或文章详情中的分类，会进入对应分类页。这些页面预先生成，没有 JavaScript 时也能浏览。搜索在浏览器中匹配标题、摘要、文章 slug 和分类名称，不搜索正文；搜索词保存在 URL 的 `q` 参数中，支持刷新和分享。切换分类会保留搜索词。

## 排序

默认按日期倒序排列。需要让某篇文章排在前面时，在 frontmatter 中添加正整数 `order`：

```yaml
order: 1
```

- 带 `order` 的文章排在最前，数字越小越靠前；`order` 相同时按日期倒序。
- 首页先展示带 `order` 的文章，再用最新文章补足四篇。
- 博客及分类页把匹配的 `order` 文章放在顶部的 Featured 区域，普通列表不会重复展示。
- 这些文章也遵守分类和搜索条件，不会出现在无关结果中。
- 删除 `order` 即恢复按日期排序。
- RSS 保持日期倒序，`order` 不改变订阅顺序；生产构建仍排除草稿。

当前排序：

1. `cloud-agents-api-architecture.md`（Durable State, Disposable Compute）
2. `agent-harness-performance-takehome.md`（Building a Lab for the Model）

## 验证

```sh
npm test
npm run build
```
