# CLAUDE.md — Hackathon · Karaithy

## 项目定位

Mike 的个人 Hackathon 记录站（`hackathon.karaithy.com`）。记录各平台/公司举办的黑客松赛事、收藏有意思的作品、沉淀自己的想法并实现/发布。核心功能：赛事日历 + 赛事库 + 作品集 + 想法笔记。

## 技术栈与原则

- 纯静态：HTML + CSS + 原生 JS，**无构建步骤、无框架、无依赖**。保持这样，别引入构建工具。
- 数据驱动：所有内容在 `data/*.json`，页面通过 `fetch` 渲染。加内容 = 改 JSON，不动 HTML/JS。
- 浅色主题 + 品牌暖橙 `#d97706`（符合 karaithy 视觉规范）。字标写法 `Hack` + `ai`(橙) + `thon`。
- 赛事状态（未开始/进行中/已结束）由日期**自动计算**，不要手存状态字段。

## 改动约定

- **日常加赛事/作品/想法** → 只改 `data/` 下对应 JSON，字段见 README。
- 改样式 → `assets/style.css`（用 `:root` 里的 CSS 变量，别硬编码颜色）。
- 改逻辑/视图 → `assets/app.js`。视图是 hash 路由（`#/home` `#/calendar` `#/events` `#/works` `#/ideas`）。
- `sample-*` 开头的是占位示例数据，Mike 填真实内容时应替换/删除。

## 发布

原生项目，`git push` 即 Cloudflare Pages 自动部署。Pages 项目名 `hackathon`，GitHub `ymzlsy/hackathon`。映射见 `~/Desktop/karaithy/SITE-REGISTRY.md`。

## 禁忌

- 不要把它复杂化成 SPA 框架项目。简单静态是刻意选择。
- 不要在 JSON 里编造不存在的真实赛事日期冒充真数据——拿不准就标 `（示例·待替换）`。
- 不要加 emoji 到代码注释/文档正文（除 UI 内必要图标）。
