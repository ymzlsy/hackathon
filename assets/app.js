/* Hackathon · Karaithy — 纯静态数据驱动 SPA */

const DB = { events: [], works: [], ideas: [] };

const INTEREST_LABEL = {
  watch: "关注", want: "想参加", registered: "已报名",
  joined: "参赛中", done: "已完赛", skip: "跳过"
};
const IDEA_STATUS = { spark: "灵感", building: "在做", shipped: "已发布" };

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtDate = (d) => { const x = new Date(d + "T00:00:00"); return isNaN(x) ? d : `${x.getMonth() + 1}月${x.getDate()}日`; };
const fmtRange = (s, e) => s === e ? fmtDate(s) : `${fmtDate(s)} – ${fmtDate(e)}`;
function today0() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
function parseD(s) { return new Date(s + "T00:00:00"); }
function isoOf(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function todayISO() { return isoOf(new Date()); }
function daySpan(e) { return (parseD(e.end) - parseD(e.start)) / 86400000; }

/* 每个赛事一种稳定颜色（按 id 哈希），日历同色横条 + 时间线圆点共用 */
const EV_COLORS = [
  { bg: "#e7eefc", fg: "#1e40af", bd: "#c2d4f5" },
  { bg: "#e3f3e9", fg: "#15803d", bd: "#bfe3cd" },
  { bg: "#fdf2e2", fg: "#b45309", bd: "#f4d6a6" },
  { bg: "#f3e8fd", fg: "#7c3aed", bd: "#e0c9f7" },
  { bg: "#fde8ee", fg: "#be123c", bd: "#f7c7d6" },
  { bg: "#dff3f2", fg: "#0f766e", bd: "#b6e1de" },
  { bg: "#e8eaf6", fg: "#3730a3", bd: "#ccd1ec" },
  { bg: "#fce7d6", fg: "#c2410c", bd: "#f5ccae" },
  { bg: "#eaf4dc", fg: "#4d7c0f", bd: "#d4e7ba" },
  { bg: "#fbe9f4", fg: "#a21caf", bd: "#f2c8e6" }
];
function evColor(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return EV_COLORS[h % EV_COLORS.length]; }

function statusOf(ev) {
  const t = today0(), s = parseD(ev.start), e = parseD(ev.end);
  if (t < s) return "upcoming";
  if (t > e) return "ended";
  return "ongoing";
}
const STATUS_LABEL = { upcoming: "未开始", ongoing: "进行中", ended: "已结束" };

/* ---------- load ---------- */
async function load() {
  const get = async (f) => { try { const r = await fetch(`data/${f}.json?t=${Date.now()}`); return r.ok ? await r.json() : []; } catch { return []; } };
  [DB.events, DB.works, DB.ideas] = await Promise.all([get("events"), get("works"), get("ideas")]);
  DB.events.sort((a, b) => a.start.localeCompare(b.start));
  DB.works.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  DB.ideas.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  renderAll();
}

/* ---------- router ---------- */
function route() {
  const hash = location.hash.replace("#/", "") || "home";
  const view = ["home", "calendar", "events", "works", "ideas"].includes(hash) ? hash : "home";
  $$(".view").forEach(v => v.classList.toggle("active", v.id === `view-${view}`));
  $$("#tabs a").forEach(a => a.classList.toggle("active", a.dataset.view === view));
  window.scrollTo({ top: 0 });
  if (view === "calendar" && DB.events.length) renderCalendar(); // 视图可见后重渲染，轨道横向定位才准确
}

/* ---------- HOME ---------- */
function renderHome() {
  const upcoming = DB.events.filter(e => statusOf(e) !== "ended");
  const ongoing = DB.events.filter(e => statusOf(e) === "ongoing");
  $("#home-stats").innerHTML = [
    [DB.events.length, "记录的赛事", false],
    [upcoming.length, "未结束", false],
    [DB.works.filter(w => w.type === "mine").length, "我的作品", true],
    [DB.ideas.length, "想法", false],
  ].map(([n, l, acc]) => `<div class="stat"><div class="num ${acc ? "accent" : ""}">${n}</div><div class="lbl">${l}</div></div>`).join("");

  renderTimeline();

  $("#home-ideas").innerHTML = DB.ideas.slice(0, 3).map(i =>
    `<a class="row" href="#/ideas"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${IDEA_STATUS[i.status] || ""}</span></a>`
  ).join("") || emptyMini("还没有想法");

  $("#home-works").innerHTML = DB.works.slice(0, 3).map(w =>
    `<a class="row" href="#/works"><span class="row-title">${esc(w.title)}</span><span class="row-sub">${w.type === "mine" ? "我的" : "收藏"}</span></a>`
  ).join("") || emptyMini("还没有作品");
}
const emptyMini = (t) => `<div style="color:var(--text-faint);font-size:.88rem;padding:8px 0">${t}</div>`;

/* 概览竖向时间线：未来赛事在上、最近的过往在下，中间插入「现在」标记 */
function nowNode() {
  return `<div class="tl-item tl-now"><span class="tl-dot"></span><span class="tl-now-label">现在 · ${fmtDate(todayISO())}</span></div>`;
}
function renderTimeline() {
  const all = [...DB.events].sort((a, b) => b.start.localeCompare(a.start));
  const up = all.filter(e => statusOf(e) !== "ended");
  const past = all.filter(e => statusOf(e) === "ended").slice(0, 12);
  const show = [...up, ...past];
  const t = todayISO();
  let html = "", nowDone = false;
  for (const e of show) {
    if (!nowDone && e.start <= t) { html += nowNode(); nowDone = true; }
    const col = evColor(e.id), st = statusOf(e), deep = (e.history && e.history.length) || (e.featured && e.featured.length);
    html += `<div class="tl-item ${st === "ended" ? "ended" : ""}">
      <span class="tl-dot" style="background:${col.bg};box-shadow:0 0 0 1.5px ${col.fg}"></span>
      <span class="tl-date">${fmtDate(e.start)}·${e.start.slice(0, 4)}</span>
      <span class="tl-main"><a class="tl-name" onclick="openEvent('${e.id}')">${esc(e.name)}</a>${deep ? ' <span class="deep-dot" title="含深度调研资料">📚</span>' : ""}<span class="tl-plat">${esc(e.platform)}${e.location ? " · " + esc(e.location) : ""}</span></span>
      <span class="badge ${st}">${STATUS_LABEL[st]}</span>
    </div>`;
  }
  if (!nowDone) html += nowNode();
  $("#home-timeline").innerHTML = html || emptyMini("还没有赛事");
}

/* ---------- EVENTS ---------- */
const evFilter = { q: "", status: "all", platform: "all" };
function renderEventsFilters() {
  const platforms = [...new Set(DB.events.map(e => e.platform))];
  $("#events-status-filter").innerHTML =
    [["all", "全部状态"], ["upcoming", "未开始"], ["ongoing", "进行中"], ["ended", "已结束"]]
      .map(([k, l]) => `<button class="chip ${evFilter.status === k ? "active" : ""}" data-st="${k}">${l}</button>`).join("");
  $("#events-platform-filter").innerHTML =
    `<button class="chip ${evFilter.platform === "all" ? "active" : ""}" data-pf="all">全部平台</button>` +
    platforms.map(p => `<button class="chip ${evFilter.platform === p ? "active" : ""}" data-pf="${esc(p)}">${esc(p)}</button>`).join("");
  $$("#events-status-filter .chip").forEach(c => c.onclick = () => { evFilter.status = c.dataset.st; renderEvents(); });
  $$("#events-platform-filter .chip").forEach(c => c.onclick = () => { evFilter.platform = c.dataset.pf; renderEvents(); });
}
function renderEvents() {
  renderEventsFilters();
  const q = evFilter.q.toLowerCase();
  const list = DB.events.filter(e => {
    if (evFilter.status !== "all" && statusOf(e) !== evFilter.status) return false;
    if (evFilter.platform !== "all" && e.platform !== evFilter.platform) return false;
    if (q && !(`${e.name} ${e.platform} ${(e.tags || []).join(" ")} ${e.location}`.toLowerCase().includes(q))) return false;
    return true;
  });
  $("#events-count").textContent = `${list.length} / ${DB.events.length}`;
  $("#events-cards").innerHTML = list.length ? list.map(eventCard).join("") : emptyBlock("没有匹配的赛事");
  $$("#events-cards .card").forEach(c => c.onclick = () => openEvent(c.dataset.id));
}
function eventCard(e) {
  const st = statusOf(e);
  return `<div class="card" data-id="${e.id}" style="cursor:pointer">
    <div class="title-row">
      <h3>${esc(e.name)}</h3>
      <span class="badge ${st} dot">${STATUS_LABEL[st]}</span>
    </div>
    <div class="platform">${esc(e.platform)}</div>
    <div class="meta">
      <span><span class="ico">🗓</span> ${fmtRange(e.start, e.end)}</span>
      ${e.location ? `<span><span class="ico">📍</span> ${esc(e.location)}</span>` : ""}
      ${e.prize ? `<span><span class="ico">🏆</span> ${esc(e.prize)}</span>` : ""}
    </div>
    ${e.interest ? `<span class="badge interest">${INTEREST_LABEL[e.interest] || e.interest}</span>` : ""}
    ${((e.history && e.history.length) || (e.featured && e.featured.length)) ? `<span class="badge deep">📚 深调研</span>` : ""}
    ${e.notes ? `<div class="notes">${esc(e.notes)}</div>` : ""}
    <div class="tags">${(e.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
  </div>`;
}
function openEvent(id) {
  const e = DB.events.find(x => x.id === id); if (!e) return;
  const st = statusOf(e);
  showModal(`
    <span class="modal-close" onclick="closeModal()">×</span>
    <span class="badge ${st} dot">${STATUS_LABEL[st]}</span>
    <h3 style="margin-top:10px">${esc(e.name)}</h3>
    <div class="platform" style="color:var(--accent);font-weight:600">${esc(e.platform)}</div>
    <div class="modal-meta">
      <div><span class="k">时间</span><br>${fmtRange(e.start, e.end)}</div>
      ${e.location ? `<div><span class="k">地点</span><br>${esc(e.location)}</div>` : ""}
      ${e.prize ? `<div><span class="k">奖项</span><br>${esc(e.prize)}</div>` : ""}
      ${e.interest ? `<div><span class="k">我的状态</span><br>${INTEREST_LABEL[e.interest] || e.interest}</div>` : ""}
      ${e.notes ? `<div><span class="k">笔记</span><br>${esc(e.notes)}</div>` : ""}
    </div>
    <div class="tags" style="margin-bottom:16px">${(e.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    ${e.url ? `<a class="btn primary" href="${esc(e.url)}" target="_blank" rel="noopener">前往官网 →</a>` : ""}
    ${(e.links && e.links.length) ? `<div class="modal-sec"><div class="sec-k">相关链接</div><div class="link-btns">${e.links.map(l => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div></div>` : ""}
    ${(e.history && e.history.length) ? `<div class="modal-sec"><div class="sec-k">历届主题 / 赛道</div>${e.history.map(h => `<div class="hist"><b>${esc(h.year)}</b> ${esc(h.theme)}${h.format ? `<div class="hist-sub">赛制：${esc(h.format)}</div>` : ""}${h.scale ? `<div class="hist-sub">规模：${esc(h.scale)}</div>` : ""}</div>`).join("")}</div>` : ""}
    ${(e.featured && e.featured.length) ? `<div class="modal-sec"><div class="sec-k">精选往届作品（可点开）</div>${e.featured.map(f => `<a class="feat" href="${esc(f.url)}" target="_blank" rel="noopener"><b>${esc(f.title)}</b>${f.year ? `<span class="feat-y">${esc(f.year)}</span>` : ""}${f.award ? `<span class="feat-a">${esc(f.award)}</span>` : ""}${f.note ? `<div class="feat-n">${esc(f.note)}</div>` : ""}</a>`).join("")}</div>` : ""}
    ${e.research ? `<div class="modal-sec"><div class="sec-k">调研笔记</div><div class="research">${esc(e.research)}</div></div>` : ""}
  `);
}

/* ---------- CALENDAR ---------- */
let calY, calM;            // 月历：年 / 月(0-11)
let calMode = "track";     // track | month
let trackDensity = 32;     // 轨道视图每天像素宽
function initCal() { const t = new Date(); calY = t.getFullYear(); calM = t.getMonth(); }

function renderCalendar() {
  if (calY === undefined) initCal();
  const month = calMode === "month";
  $("#cal-track").style.display = month ? "none" : "block";
  $("#cal-grid").style.display = month ? "block" : "none";
  $("#cal-ctrl-month").style.display = month ? "flex" : "none";
  $("#cal-density").style.display = month ? "none" : "flex";
  $$("#cal-mode button").forEach(b => b.classList.toggle("active", b.dataset.mode === calMode));
  $("#cal-legend").innerHTML = month
    ? `<span style="color:var(--text-dim)">同色横条 = 同一赛事，跨越其举办日期</span><span style="color:var(--text-faint)">浅色 = 已结束 · 点击查看详情 · 滚轮翻月</span>`
    : `<span style="color:var(--text-dim)">每条 = 一个赛事，长度对应天数</span><span style="color:var(--text-faint)">竖线 = 今天 · 浅色 = 已结束 · 点击查看详情</span><span style="color:var(--text-faint)">滚轮 / 触控板左右滑动 · 紧凑·标准·宽松调密度</span>`;
  if (month) renderMonth(); else renderTrack();
}

/* 滚轮翻月 */
let _wheelAt = 0;
function monthWheel(ev) {
  ev.preventDefault();
  const now = ev.timeStamp || performance.now();
  if (now - _wheelAt < 320) return;
  _wheelAt = now;
  if (ev.deltaY > 0) { calM++; if (calM > 11) { calM = 0; calY++; } }
  else { calM--; if (calM < 0) { calM = 11; calY--; } }
  renderMonth();
}

function renderMonth() {
  if (calY === undefined) initCal();
  $("#cal-label").textContent = `${calY} 年 ${calM + 1} 月`;
  const tISO = todayISO();
  const startDow = new Date(calY, calM, 1).getDay();
  const daysInMonth = new Date(calY, calM + 1, 0).getDate();
  const weekCount = Math.ceil((startDow + daysInMonth) / 7);

  // 构建周（每周 7 个日期），日期从本月 1 日所在周的周日开始
  const weeks = [];
  const cur = new Date(calY, calM, 1 - startDow);
  for (let w = 0; w < weekCount; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push({ ds: isoOf(cur), day: cur.getDate(), inMonth: cur.getMonth() === calM, isToday: isoOf(cur) === tISO });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const dows = ["日", "一", "二", "三", "四", "五", "六"];
  let html = `<div class="cal2-dow">${dows.map(d => `<div>${d}</div>`).join("")}</div>`;

  for (const week of weeks) {
    const ws = week[0].ds, we = week[6].ds;
    // 落在本周的赛事，按开始升序、时长降序排，做车道打包（同赛事一条连续横条）
    const evs = DB.events.filter(e => e.end >= ws && e.start <= we)
      .sort((a, b) => a.start.localeCompare(b.start) || daySpan(b) - daySpan(a));
    const lanes = []; // lanes[i] = 已占用区间数组
    const segs = [];
    for (const e of evs) {
      const c0 = e.start < ws ? 0 : week.findIndex(c => c.ds === e.start);
      const c1 = e.end > we ? 6 : week.findIndex(c => c.ds === e.end);
      let lane = 0;
      while ((lanes[lane] || []).some(p => !(c1 < p.c0 || c0 > p.c1))) lane++;
      (lanes[lane] || (lanes[lane] = [])).push({ c0, c1 });
      segs.push({ e, c0, c1, lane, roundL: e.start >= ws, roundR: e.end <= we });
    }
    const laneCount = lanes.length;
    const minH = Math.max(82, 30 + laneCount * 23);
    const bars = segs.map(s => {
      const col = evColor(s.e.id), ended = statusOf(s.e) === "ended";
      return `<span class="cal2-bar ${s.roundL ? "rl" : ""} ${s.roundR ? "rr" : ""}"
        style="grid-row:${s.lane + 1};grid-column:${s.c0 + 1}/${s.c1 + 2};background:${col.bg};border-color:${col.bd};color:${col.fg};${ended ? "opacity:.6;" : ""}"
        onclick="openEvent('${s.e.id}')" title="${esc(s.e.name)} · ${fmtRange(s.e.start, s.e.end)}">${s.roundL ? "" : "‹ "}${esc(s.e.name)}</span>`;
    }).join("");
    html += `<div class="cal2-week">
      <div class="cal2-days">${week.map(c => `<div class="cal2-day ${c.inMonth ? "" : "other"} ${c.isToday ? "today" : ""}" style="min-height:${minH}px"><span class="cal2-daynum">${c.day}</span></div>`).join("")}</div>
      <div class="cal2-lanes">${bars}</div>
    </div>`;
  }
  const grid = $("#cal-grid");
  grid.innerHTML = `<div class="cal2">${html}</div>`;
  grid.onwheel = monthWheel;
}

/* ---------- 轨道视图（横向时间轴 / Gantt）---------- */
function renderTrack() {
  const wrap = $("#cal-track");
  const evs = [...DB.events].sort((a, b) => a.start.localeCompare(b.start));
  if (!evs.length) { wrap.innerHTML = emptyBlock("还没有赛事"); return; }
  let minISO = evs[0].start, maxISO = evs[0].end;
  for (const e of evs) { if (e.start < minISO) minISO = e.start; if (e.end > maxISO) maxISO = e.end; }
  const sD = parseD(minISO); sD.setDate(1);                                   // 从最早赛事所在月 1 号起
  const eD = parseD(maxISO); eD.setMonth(eD.getMonth() + 1); eD.setDate(0);   // 到最晚赛事所在月末
  const DAY = trackDensity, HEAD = 40, ROWH = 27, PAD = 10;
  const dayIdx = (iso) => Math.round((parseD(iso) - sD) / 86400000);
  const total = Math.round((eD - sD) / 86400000) + 1;
  const W = total * DAY;

  // 车道打包：同赛事一条，互不重叠
  const lanes = [], segs = [];
  for (const e of evs) {
    const a = dayIdx(e.start), b = dayIdx(e.end);
    let l = 0;
    while ((lanes[l] || []).some(p => !(b < p.a || a > p.b))) l++;
    (lanes[l] || (lanes[l] = [])).push({ a, b });
    segs.push({ e, a, b, l });
  }
  const H = HEAD + lanes.length * ROWH + PAD;

  // 月份网格线 + 标签
  let ticks = "";
  const cur = new Date(sD);
  while (cur <= eD) {
    const x = Math.round((cur - sD) / 86400000) * DAY;
    ticks += `<div class="trk-mtick" style="left:${x}px"></div><div class="trk-mlabel" style="left:${x + 5}px">${cur.getFullYear()}.${String(cur.getMonth() + 1).padStart(2, "0")}</div>`;
    cur.setMonth(cur.getMonth() + 1);
  }
  // 今天竖线
  const tISO = todayISO();
  let todayLine = "";
  if (tISO >= isoOf(sD) && tISO <= isoOf(eD)) {
    const tx = dayIdx(tISO) * DAY + DAY / 2;
    todayLine = `<div class="trk-today" style="left:${tx}px"><span>今天</span></div>`;
  }
  // 赛事横条
  const bars = segs.map(s => {
    const col = evColor(s.e.id), ended = statusOf(s.e) === "ended";
    const left = s.a * DAY + 1, w = Math.max(DAY - 2, (s.b - s.a + 1) * DAY - 2), top = HEAD + s.l * ROWH;
    return `<div class="trk-bar" style="left:${left}px;width:${w}px;top:${top}px;background:${col.bg};border-color:${col.bd};color:${col.fg};${ended ? "opacity:.6;" : ""}" onclick="openEvent('${s.e.id}')" title="${esc(s.e.name)} · ${fmtRange(s.e.start, s.e.end)}">${esc(s.e.name)}</div>`;
  }).join("");

  wrap.innerHTML = `<div class="trk-scroll"><div class="trk-inner" style="width:${W}px;height:${H}px">${ticks}${todayLine}${bars}</div></div>`;
  const sc = wrap.querySelector(".trk-scroll");
  // 默认锚定到最近的未来赛事（没有则锚到最近一场），让首屏就有内容、对准最该关注的近期赛事
  const up = evs.filter(e => e.start > tISO).sort((a, b) => a.start.localeCompare(b.start));
  const anchorISO = up.length ? up[0].start : (tISO > isoOf(eD) ? isoOf(eD) : (tISO < isoOf(sD) ? isoOf(sD) : tISO));
  sc.scrollLeft = Math.max(0, dayIdx(anchorISO) * DAY - sc.clientWidth * 0.5);
  // 竖向滚轮 → 横向滚动（触控板天然支持横滑）
  sc.onwheel = (ev) => { if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) { sc.scrollLeft += ev.deltaY; ev.preventDefault(); } };
}

/* ---------- WORKS ---------- */
let workFilter = "all";
function renderWorks() {
  const list = DB.works.filter(w => workFilter === "all" || w.type === workFilter);
  $("#works-count").textContent = `${list.length}`;
  $("#works-cards").innerHTML = list.length ? list.map(workCard).join("") : emptyBlock("还没有作品，去 data/works.json 添加");
}
function workCard(w) {
  return `<div class="card">
    <div class="work-cover">${w.cover ? `<img src="${esc(w.cover)}" alt="">` : (w.type === "mine" ? "🏆" : "💡")}</div>
    <div class="title-row"><h3>${esc(w.title)}</h3>
      <span class="badge ${w.type === "mine" ? "interest" : "upcoming"}">${w.type === "mine" ? "我的" : "收藏"}</span></div>
    <div class="meta">
      ${w.event ? `<span><span class="ico">⚡</span> ${esc(w.event)}</span>` : ""}
      ${w.author && w.type !== "mine" ? `<span><span class="ico">👤</span> ${esc(w.author)}</span>` : ""}
      ${w.date ? `<span><span class="ico">🗓</span> ${fmtDate(w.date)}</span>` : ""}
    </div>
    ${w.summary ? `<div class="notes">${esc(w.summary)}</div>` : ""}
    <div class="tags">${(w.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    <div style="margin-top:12px;display:flex;gap:8px">
      ${w.url ? `<a class="btn" href="${esc(w.url)}" target="_blank" rel="noopener">查看 →</a>` : ""}
      ${w.repo ? `<a class="btn" href="${esc(w.repo)}" target="_blank" rel="noopener">代码</a>` : ""}
    </div>
  </div>`;
}

/* ---------- IDEAS ---------- */
let ideaFilter = "all";
function renderIdeas() {
  const list = DB.ideas.filter(i => ideaFilter === "all" || i.status === ideaFilter);
  $("#ideas-count").textContent = `${list.length}`;
  $("#ideas-list").innerHTML = list.length ? list.map(ideaCard).join("") : emptyBlock("还没有想法，去 data/ideas.json 添加");
}
function ideaCard(i) {
  const badge = { spark: "upcoming", building: "ongoing", shipped: "interest" }[i.status] || "ended";
  return `<div class="idea">
    <div class="idea-head">
      <h3>${esc(i.title)}</h3>
      <span class="badge ${badge}">${IDEA_STATUS[i.status] || i.status}</span>
    </div>
    <div class="idea-date">${i.date ? fmtDate(i.date) : ""}${i.relatedEvent ? " · ⚡ " + esc(i.relatedEvent) : ""}</div>
    <div class="idea-body" style="margin-top:10px">${esc(i.body)}</div>
    <div class="tags" style="margin-top:12px">${(i.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>
  </div>`;
}

/* ---------- modal ---------- */
function showModal(html) { $("#modal").innerHTML = html; $("#modal-bg").classList.add("open"); }
function closeModal() { $("#modal-bg").classList.remove("open"); }
const emptyBlock = (t) => `<div class="empty"><div class="big">🗂</div>${t}</div>`;

/* ---------- render all ---------- */
function renderAll() { renderHome(); renderEvents(); renderCalendar(); renderWorks(); renderIdeas(); }

/* ---------- wire ---------- */
window.addEventListener("hashchange", route);
document.addEventListener("DOMContentLoaded", () => {
  route();
  $("#events-search").oninput = (e) => { evFilter.q = e.target.value; renderEvents(); };
  $$("#works-filter .chip").forEach(c => c.onclick = () => {
    workFilter = c.dataset.type; $$("#works-filter .chip").forEach(x => x.classList.toggle("active", x === c)); renderWorks();
  });
  $$("#ideas-filter .chip").forEach(c => c.onclick = () => {
    ideaFilter = c.dataset.status; $$("#ideas-filter .chip").forEach(x => x.classList.toggle("active", x === c)); renderIdeas();
  });
  $("#cal-prev").onclick = () => { calM--; if (calM < 0) { calM = 11; calY--; } renderMonth(); };
  $("#cal-next").onclick = () => { calM++; if (calM > 11) { calM = 0; calY++; } renderMonth(); };
  $("#cal-today").onclick = () => { initCal(); renderMonth(); };
  $$("#cal-mode button").forEach(b => b.onclick = () => { calMode = b.dataset.mode; renderCalendar(); });
  $$("#cal-density button").forEach(b => b.onclick = () => {
    trackDensity = +b.dataset.d; $$("#cal-density button").forEach(x => x.classList.toggle("active", x === b)); renderTrack();
  });
  $("#modal-bg").onclick = (e) => { if (e.target.id === "modal-bg") closeModal(); };
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  load();
});
