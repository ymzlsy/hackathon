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

  const next = upcoming.slice(0, 5);
  $("#home-upcoming").innerHTML = next.length ? next.map(e => {
    const st = statusOf(e);
    return `<a class="row" href="#/events" onclick="setTimeout(()=>openEvent('${e.id}'),60)">
      <span class="when">${fmtDate(e.start)}</span>
      <span class="row-title">${esc(e.name)}</span>
      <span class="badge ${st} dot">${STATUS_LABEL[st]}</span>
    </a>`;
  }).join("") : emptyMini("暂无赛事，去赛事库添加");

  $("#home-ideas").innerHTML = DB.ideas.slice(0, 3).map(i =>
    `<a class="row" href="#/ideas"><span class="row-title">${esc(i.title)}</span><span class="row-sub">${IDEA_STATUS[i.status] || ""}</span></a>`
  ).join("") || emptyMini("还没有想法");

  $("#home-works").innerHTML = DB.works.slice(0, 3).map(w =>
    `<a class="row" href="#/works"><span class="row-title">${esc(w.title)}</span><span class="row-sub">${w.type === "mine" ? "我的" : "收藏"}</span></a>`
  ).join("") || emptyMini("还没有作品");
}
const emptyMini = (t) => `<div style="color:var(--text-faint);font-size:.88rem;padding:8px 0">${t}</div>`;

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
  `);
}

/* ---------- CALENDAR ---------- */
let calY, calM; // year, month(0-11)
function initCal() { const t = new Date(); calY = t.getFullYear(); calM = t.getMonth(); }
function renderCalendar() {
  if (calY === undefined) initCal();
  $("#cal-label").textContent = `${calY} 年 ${calM + 1} 月`;
  const first = new Date(calY, calM, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(calY, calM + 1, 0).getDate();
  const prevDays = new Date(calY, calM, 0).getDate();
  const tStr = new Date(); const todayStr = `${tStr.getFullYear()}-${String(tStr.getMonth() + 1).padStart(2, "0")}-${String(tStr.getDate()).padStart(2, "0")}`;

  const dows = ["日", "一", "二", "三", "四", "五", "六"];
  let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join("");

  const cells = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push({ d: prevDays - i, other: true, m: calM - 1 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, other: false, m: calM });
  while (cells.length % 7 !== 0) cells.push({ d: cells.length - daysInMonth - startDow + 1, other: true, m: calM + 1 });

  for (const c of cells) {
    const y = c.m < 0 ? calY - 1 : c.m > 11 ? calY + 1 : calY;
    const mm = ((c.m % 12) + 12) % 12;
    const ds = `${y}-${String(mm + 1).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
    const evs = DB.events.filter(e => ds >= e.start && ds <= e.end);
    const isToday = ds === todayStr;
    html += `<div class="cal-cell ${c.other ? "other" : ""} ${isToday ? "today" : ""}">
      <div class="daynum">${c.d}</div>
      ${evs.slice(0, 3).map(e => `<span class="cal-ev ${statusOf(e)}" onclick="openEvent('${e.id}')" title="${esc(e.name)}">${esc(e.name)}</span>`).join("")}
      ${evs.length > 3 ? `<span class="cal-ev" style="background:var(--panel);color:var(--text-dim)">+${evs.length - 3}</span>` : ""}
    </div>`;
  }
  $("#cal-grid").innerHTML = html;
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
  $("#cal-prev").onclick = () => { calM--; if (calM < 0) { calM = 11; calY--; } renderCalendar(); };
  $("#cal-next").onclick = () => { calM++; if (calM > 11) { calM = 0; calY++; } renderCalendar(); };
  $("#cal-today").onclick = () => { initCal(); renderCalendar(); };
  $("#modal-bg").onclick = (e) => { if (e.target.id === "modal-bg") closeModal(); };
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  load();
});
