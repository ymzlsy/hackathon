# Hackathon · Karaithy

个人 Hackathon 记录站 —— 追踪各平台/公司的黑客松赛事、收藏有意思的作品、沉淀自己的想法并把它们做出来。

- 线上地址：https://hackathon.karaithy.com
- 技术栈：纯静态（HTML + CSS + 原生 JS），无构建步骤，数据驱动
- 部署：原生项目，`git push` → Cloudflare Pages 自动部署

## 目录结构

```
hackathon/
├── index.html          # 单页应用外壳（概览/日历/赛事库/作品/想法）
├── assets/
│   ├── style.css       # 全站样式（浅色 + 品牌暖橙）
│   └── app.js          # 数据加载、路由、各视图渲染、日历、弹窗
└── data/               # ⭐️ 日常只改这里
    ├── events.json     # 赛事
    ├── works.json      # 作品（我的 + 收藏）
    └── ideas.json      # 想法
```

## 怎么用（日常维护）

**加一个赛事** → 往 `data/events.json` 加一个对象：

```json
{
  "id": "唯一英文ID",
  "name": "赛事名称",
  "platform": "Devpost",
  "url": "https://...",
  "start": "2026-07-01",
  "end": "2026-07-15",
  "location": "Online",
  "tags": ["AI", "Web"],
  "prize": "$10,000",
  "interest": "want",
  "notes": "为什么有意思 / 我的想法"
}
```

- `start`/`end`：`YYYY-MM-DD`。**状态（未开始/进行中/已结束）由日期自动计算**，无需手填。
- `interest`（我的关注度，可选）：`watch` 关注 / `want` 想参加 / `registered` 已报名 / `joined` 参赛中 / `done` 已完赛 / `skip` 跳过。

**加一个作品** → `data/works.json`：`type` 为 `mine`（我的）或 `inspiration`（收藏的好作品）；`cover` 可选（图片路径，放 `assets/` 下）。

**加一个想法** → `data/ideas.json`：`status` 为 `spark` 灵感 / `building` 在做 / `shipped` 已发布；`body` 支持 `\n` 换行。

> 删掉 `data/*.json` 里所有 `sample-*` 开头的示例条目，就是干净的起点。

## 本地预览

```bash
cd hackathon
python3 -m http.server 8080
# 打开 http://localhost:8080
```

（必须用 http server，直接双击打开 `index.html` 会因 `fetch` 跨协议限制读不到 JSON。）

## 发布

```bash
git add -A && git commit -m "update: <描述>" && git push
```

push 后 Cloudflare Pages 自动构建上线，约 1 分钟。
