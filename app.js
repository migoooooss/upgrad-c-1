(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const dayMs = 86400000;
const todayISO = () => {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
};
const addMonths = (iso, months) => {
  const d = new Date(`${iso}T12:00:00`);
  const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
  d.setDate(Math.min(day,last));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const KEYS = {store:"masar_goal_tracker_v1", ext:"masar_enhancements_v1", life:"masar_life_v1", backup:"masar_last_backup"};
const validISO = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00`).getTime()) && new Date(`${v}T12:00:00`).toISOString().slice(0,10) === v;
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / dayMs);
const NUM_KEYS = ["incomeUsd","incomeEgp","savedUsd","expensesEgp","workHours","skillHours","studyHours","tasksDone","tasksPlanned","gymMinutes","englishMin","germanMin","turkishMin"];
const OPT_KEYS = ["studyScore","weightKg","waistCm","energy"];
function normalizeLog(l) {
  if (!l || typeof l !== "object" || !validISO(l.date)) return null;
  const o = {date: l.date};
  NUM_KEYS.forEach(k => { const v = Number(l[k]); o[k] = Number.isFinite(v) && v > 0 ? v : 0; });
  OPT_KEYS.forEach(k => { const v = l[k]; const n = Number(v); o[k] = (v === null || v === undefined || v === "" || !Number.isFinite(n)) ? null : n; });
  o.notes = typeof l.notes === "string" ? l.notes.slice(0, 2000) : "";
  o.workoutDone = !!l.workoutDone;
  return o;
}
function normalizeLogs(arr) {
  const map = new Map();
  (Array.isArray(arr) ? arr : []).forEach(l => { const n = normalizeLog(l); if (n) map.set(n.date, n); });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}
function sanitizeSettings(s) {
  const d = defaultState().settings; s = (s && typeof s === "object") ? s : {};
  const n = (v, def, max = 1e9) => { const x = Number(v); return Number.isFinite(x) ? Math.min(max, Math.max(0, x)) : def; };
  const pick = (v, list, def) => list.includes(v) ? v : def;
  const lv = (s.levels && typeof s.levels === "object") ? s.levels : {};
  const L = ["A0","A1","A2","B1","B2","C1"];
  return {startDate: validISO(s.startDate) ? s.startDate : d.startDate, targetSavings: n(s.targetSavings, d.targetSavings), targetMonthlyIncome: n(s.targetMonthlyIncome, d.targetMonthlyIncome), targetWorkHours: n(s.targetWorkHours, d.targetWorkHours), targetStudyHours: n(s.targetStudyHours, d.targetStudyHours, 168), targetWorkouts: n(s.targetWorkouts, d.targetWorkouts, 14),
    targetEnglish: pick(s.targetEnglish, ["A2","B1","B2","C1"], d.targetEnglish), targetGerman: pick(s.targetGerman, ["A1","A2","B1","B2"], d.targetGerman), targetTurkish: pick(s.targetTurkish, ["A1","A2","B1","B2"], d.targetTurkish),
    levels: {english: pick(lv.english, L, d.levels.english), german: pick(lv.german, L, d.levels.german), turkish: pick(lv.turkish, L, d.levels.turkish)}};
}
const readJsonKey = (key) => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
const defaultState = () => ({
  version: 1,
  settings: { startDate: todayISO(), targetSavings: 12000, targetMonthlyIncome: 2000, targetWorkHours: 160, targetStudyHours: 28, targetWorkouts: 4, targetEnglish: "B2", targetGerman: "A2", targetTurkish: "B1", levels: { english: "A2", german: "A0", turkish: "A0" } },
  logs: []
});
let state = loadState();
let toastTimer;
function loadState() {
  try {
    const raw = localStorage.getItem(KEYS.store);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.settings || !Array.isArray(parsed.logs)) return defaultState();
    return {version: 1, settings: sanitizeSettings(parsed.settings), logs: normalizeLogs(parsed.logs)};
  } catch (e) { return defaultState(); }
}
function persist() {
  try { localStorage.setItem(KEYS.store, JSON.stringify(state)); }
  catch (e) { showToast("تعذر الحفظ. قد تكون مساحة تخزين المتصفح ممتلئة؛ صدّر نسخة احتياطية."); }
}
function showToast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}
function num(id) { const v = $(id).value; return v === "" ? 0 : Math.max(0, Number(v) || 0); }
function optionalNum(id) { const v = $(id).value; return v === "" ? null : Number(v); }
function fmtMoney(value, currency="USD") {
  const symbol = currency === "EGP" ? "ج.م" : "$";
  return `${symbol}${Number(value||0).toLocaleString("en-US",{maximumFractionDigits:2,minimumFractionDigits:0})}`;
}
function fmtDate(iso, options={day:"numeric",month:"short",year:"numeric"}) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("ar-EG", options).format(d);
}
function clampPct(n) { return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0)); }
function pct(current, target) { return target > 0 ? clampPct(current / target * 100) : 0; }
function allLogs() { return [...state.logs].sort((a,b) => a.date.localeCompare(b.date)); }
function within(log, from, to) { return (!from || log.date >= from) && (!to || log.date <= to); }
function sum(logs, key) { return logs.reduce((a,l) => a + (Number(l[key]) || 0), 0); }
function sumLanguage(logs, lang) { return sum(logs, `${lang}Min`); }
function currentMonthLogs() { const t=todayISO(); return state.logs.filter(l=>l.date.slice(0,7)===t.slice(0,7)); }
function getEndDate() { return addMonths(state.settings.startDate, 10); }
function elapsedPct() {
  const start = new Date(`${state.settings.startDate}T00:00:00`).getTime();
  const end = new Date(`${getEndDate()}T00:00:00`).getTime();
  const now = new Date(`${todayISO()}T00:00:00`).getTime();
  if (now <= start) return 0; if (now >= end) return 100;
  return clampPct((now-start)/(end-start)*100);
}
function activeDaysLast(days=7) {
  const now = new Date(`${todayISO()}T12:00:00`);
  const set = new Set(state.logs.filter(l => {
    const diff = Math.floor((now - new Date(`${l.date}T12:00:00`))/dayMs);
    return diff >= 0 && diff < days && hasActivity(l);
  }).map(l=>l.date));
  return set.size;
}
function hasActivity(l) {
  return (l.workHours||0)+(l.skillHours||0)+(l.studyHours||0)+(l.gymMinutes||0)+(l.englishMin||0)+(l.germanMin||0)+(l.turkishMin||0)+(l.incomeUsd||0)+(l.incomeEgp||0)+(l.tasksDone||0) > 0 || l.workoutDone;
}
function getMetrics() {
  const logs = state.logs;
  const monthIncome = sum(currentMonthLogs(),"incomeUsd");
  const savings = sum(logs,"savedUsd");
  const workHours = sum(logs,"workHours") + sum(logs,"skillHours");
  const studyHours = sum(logs,"studyHours");
  const planLogs = logs.filter(l=>l.date>=state.settings.startDate && l.date<=getEndDate());
  const studyProgress = pct(studyHours, Math.max(1, state.settings.targetStudyHours * 4.345 * 10));
  const workouts = planLogs.filter(l=>l.workoutDone).length;
  const workoutProgress = pct(workouts, Math.max(1,state.settings.targetWorkouts*4.345*10));
  const english = sumLanguage(planLogs,"english");
  const german = sumLanguage(planLogs,"german");
  const turkish = sumLanguage(planLogs,"turkish");
  const languageTargets = {A0:0,A1:1000,A2:2500,B1:5000,B2:8500,C1:12000};
  const languageProgress = (lang) => pct(sumLanguage(planLogs,lang), languageTargets[state.settings[`target${lang[0].toUpperCase()+lang.slice(1)}`]] || 1);
  const savingsProgress = pct(savings,state.settings.targetSavings);
  const incomeProgress = pct(monthIncome,state.settings.targetMonthlyIncome);
  const workProgress = pct(workHours,Math.max(1,state.settings.targetWorkHours*10));
  const scores = [savingsProgress, incomeProgress, workProgress, studyProgress, workoutProgress,
    languageProgress("english"),languageProgress("german"),languageProgress("turkish")];
  return {monthIncome,savings,workHours,studyHours,workouts,english,german,turkish,studyProgress,workoutProgress,savingsProgress,incomeProgress,workProgress,overall:scores.reduce((a,b)=>a+b,0)/scores.length};
}
function goalDefinitions() {
  const m=getMetrics(), s=state.settings;
  const languageTargetMinutes={A0:0,A1:1000,A2:2500,B1:5000,B2:8500,C1:12000};
  const lang = (key,name,desc,icon) => {
    const target=s[`target${key[0].toUpperCase()+key.slice(1)}`];
    const current=sumLanguage(state.logs.filter(l=>l.date>=s.startDate&&l.date<=getEndDate()),key);
    return {id:key,name,desc,icon,current,target:languageTargetMinutes[target]||0,unit:"دقيقة ممارسة",progress:languageTargetMinutes[target] ? pct(current,languageTargetMinutes[target]) : (current>0?100:0),displayCurrent:`${Math.round(current).toLocaleString("en-US")} دقيقة`,displayTarget:target};
  };
  return [
    {id:"income",name:"الدخل والعمل",desc:"بناء مصدر دخل قابل للاستمرار ورفع دخل الشهر الحالي.",icon:"↗",current:m.monthIncome,target:s.targetMonthlyIncome,unit:"USD في الشهر",progress:m.incomeProgress,displayCurrent:fmtMoney(m.monthIncome),displayTarget:fmtMoney(s.targetMonthlyIncome)},
    {id:"savings",name:"الادخار",desc:"تجميع مدخرات موثقة خلال فترة الخطة.",icon:"◈",current:m.savings,target:s.targetSavings,unit:"USD خلال الخطة",progress:m.savingsProgress,displayCurrent:fmtMoney(m.savings),displayTarget:fmtMoney(s.targetSavings)},
    {id:"work",name:"العمل وتطوير المهارة",desc:"قياس ساعات التنفيذ والعمل على المشروع، لا الوقت المخطط فقط.",icon:"⌁",current:m.workHours,target:s.targetWorkHours*10,unit:"ساعة خلال الخطة",progress:m.workProgress,displayCurrent:`${m.workHours.toFixed(1)} ساعة`,displayTarget:`${s.targetWorkHours*10} ساعة`},
    {id:"study",name:"الدراسة المدرسية",desc:"الاستمرارية في الدراسة وقياس الدرجات الفعلية عند توفرها.",icon:"▤",current:m.studyHours,target:s.targetStudyHours*4.345*10,unit:"ساعة خلال الخطة",progress:m.studyProgress,displayCurrent:`${m.studyHours.toFixed(1)} ساعة`,displayTarget:`${Math.round(s.targetStudyHours*4.345*10)} ساعة`},
    {id:"fitness",name:"الجسم واللياقة",desc:"عدد جلسات التمرين المسجلة؛ الوزن ومحيط الخصر مؤشرات مساندة.",icon:"↗",current:m.workouts,target:s.targetWorkouts*4.345*10,unit:"جلسة خلال الخطة",progress:m.workoutProgress,displayCurrent:`${m.workouts} جلسة`,displayTarget:`${Math.round(s.targetWorkouts*4.345*10)} جلسة`},
    lang("english","الإنجليزية","ممارسة يومية ثم تقييم المستوى باختبار مناسب.","文"),
    lang("german","الألمانية","لغة الدراسة؛ سجّل الممارسة وحدّث المستوى بعد الاختبار.","A"),
    lang("turkish","التركية","تطوير تدريجي للمستوى المستهدف خلال الخطة.","TR")
  ];
}
function init() {
  $("logDate").value=todayISO();
  $("headerDate").textContent=fmtDate(todayISO(),{weekday:"short",day:"numeric",month:"short"});
  $("todayLabel").textContent=fmtDate(todayISO(),{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  $("planStartDate").value=state.settings.startDate;
  $("analyticsFrom").value=state.settings.startDate; $("analyticsTo").value=todayISO();
  $("reportFrom").value=state.settings.startDate; $("reportTo").value=todayISO();
  populateGoalSettings();
  renderAll();
  bindEvents();
}
function bindEvents() {
  document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.view)));
  document.querySelectorAll("[data-goto]").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.goto)));
  $("quickLogBtn").addEventListener("click",()=>{showView("daily");$("logDate").value=todayISO();loadLogIntoForm(todayISO());});
  $("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
  $("dailyForm").addEventListener("submit",saveLog);
  $("clearFormBtn").addEventListener("click",()=>{ $("dailyForm").reset();$("logDate").value=todayISO();$("formStatus").textContent="الحقول فارغة؛ لم تُحذف السجلات المحفوظة."; });
  $("logDate").addEventListener("change",e=>loadLogIntoForm(e.target.value));
  $("deleteLogBtn").addEventListener("click",deleteCurrentLog);
  $("dashboardChartMode").addEventListener("change",renderDashboardChart);
  $("saveGoalsBtn").addEventListener("click",saveGoalSettings);
  $("planStartDate").addEventListener("change",()=>{$("planEndDate").value=fmtDate(addMonths($("planStartDate").value,10));});
  $("applyAnalytics").addEventListener("click",renderAnalytics);
  $("generateReportBtn").addEventListener("click",renderReport);
  $("printReportBtn").addEventListener("click",()=>{showView("reports");renderReport();window.print();});
  $("exportCsvBtn").addEventListener("click",exportCsv);
  $("exportJsonBtn").addEventListener("click",exportJson);
  $("settingsExport").addEventListener("click",exportJson);
  $("importJsonInput").addEventListener("change",importJson);
  $("resetAppBtn").addEventListener("click",resetApp);
  $("reportFrom").addEventListener("change",renderReport); $("reportTo").addEventListener("change",renderReport); $("reportType").addEventListener("change",renderReport); $("reportCurrency").addEventListener("change",renderReport);
  window.addEventListener("resize",debounce(()=>{renderDashboardChart();renderAnalytics();},120));
}
function showView(view) {
  document.querySelectorAll(".view").forEach(el=>el.classList.toggle("active",el.id===`view-${view}`));
  document.querySelectorAll(".nav-item").forEach(el=>{const on=el.dataset.view===view;el.classList.toggle("active",on);if(on)el.setAttribute("aria-current","page");else el.removeAttribute("aria-current");});
  const titles={dashboard:"نظرة عامة",daily:"السجل اليومي",mygoals:"أهدافي",myhabits:"عاداتي",goals:"مؤشرات الخطة",analytics:"التحليلات والرسوم",reports:"التقارير والتصدير",habits:"الصلاة والشخصية",settings:"الإعدادات والنسخ الاحتياطي"};
  $("pageTitle").textContent=titles[view]||"مسار";
  $("sidebar").classList.remove("open");
  if(view==="analytics")renderAnalytics(); if(view==="reports")renderReport();
  if(view==="goals"){populateGoalSettings();renderGoals();}
  document.body.classList.remove("nav-open");window.scrollTo({top:0});
  document.dispatchEvent(new CustomEvent("masar:view",{detail:{view}}));
}
function renderAll() {
  renderPeriod(); renderDashboard(); renderGoals(); renderLogTable(); renderAnalytics(); renderReport(); renderSettingsInfo();
  document.dispatchEvent(new CustomEvent("masar:render"));
}
function renderPeriod() {
  const end=getEndDate(), p=elapsedPct();
  $("periodLabel").textContent="خطة 10 أشهر"; $("periodDates").textContent=`${fmtDate(state.settings.startDate)} — ${fmtDate(end)}`;
  $("periodTrackFill").style.width=`${p}%`;
  $("planEndDate").value=fmtDate(end);
}
function renderDashboard() {
  const m=getMetrics();
  $("loggedDays").textContent=state.logs.length.toLocaleString("en-US");
  $("streakCaption").textContent=state.logs.length ? `${activeDaysLast(7)} من آخر 7 أيام بها نشاط` : "ابدأ بتسجيل يومك الأول";
  $("overallProgress").textContent=`${Math.round(m.overall)}%`; $("overallBar").style.width=`${m.overall}%`;
  $("overallHint").textContent=`${goalDefinitions().length} مؤشرات موزونة بالتساوي`;
  $("monthIncome").textContent=fmtMoney(m.monthIncome); $("incomeTargetText").textContent=`هدف: ${fmtMoney(state.settings.targetMonthlyIncome)}`;$("incomeBar").style.width=`${m.incomeProgress}%`;
  $("incomeHint").textContent=`${fmtDate(todayISO(),{month:"long",year:"numeric"})}`;
  $("totalSaved").textContent=fmtMoney(m.savings); $("savingsTargetText").textContent=`هدف: ${fmtMoney(state.settings.targetSavings)}`;$("savingsBar").style.width=`${m.savingsProgress}%`;
  $("focusHours").textContent=(m.workHours+m.studyHours).toFixed(1); $("focusBar").style.width=`${pct(m.workHours+m.studyHours,Math.max(1,state.settings.targetWorkHours*10+state.settings.targetStudyHours*4.345*10))}%`;
  const discipline=activeDaysLast(7)/7*100;
  $("disciplineScore").textContent=`${Math.round(discipline)}%`; $("disciplineRing").style.setProperty("--ring",`${discipline}%`);
  $("disciplineText").textContent=discipline>=70?"انتظام جيد في التسجيل خلال الأسبوع الأخير.":discipline>0?"هناك بعض الأيام المسجلة؛ راقب الاتجاه أسبوعًا بعد أسبوع.":"لا توجد أيام نشطة مسجلة في آخر 7 أيام.";
  const sinceWeek=state.logs.filter(l=>{const d=(new Date(`${todayISO()}T12:00:00`)-new Date(`${l.date}T12:00:00`))/dayMs;return d>=0&&d<7;});
  $("weekWork").textContent=`${(sum(sinceWeek,"workHours")+sum(sinceWeek,"skillHours")).toFixed(1)}h`; $("weekStudy").textContent=`${sum(sinceWeek,"studyHours").toFixed(1)}h`; $("weekGym").textContent=sinceWeek.filter(l=>l.workoutDone).length;
  renderGoalSummary(); renderRecent(); renderDashboardChart();
}
function renderGoalSummary() {
  const goals=goalDefinitions().filter(g=>["income","savings","study","fitness","english"].includes(g.id));
  $("goalSummaryList").innerHTML=goals.map(g=>`<div class="goal-summary-item"><div class="goal-summary-top"><span class="goal-name"><i class="goal-dot"></i>${g.name}</span><strong>${Math.round(g.progress)}%</strong></div><div class="progress-track"><span style="width:${g.progress}%"></span></div><div class="goal-summary-bottom"><span>${g.displayCurrent}</span><span>${g.id==="income"?"هدف الشهر":g.displayTarget}</span></div></div>`).join("");
}
function renderRecent() {
  const logs=allLogs().slice(-5).reverse();
  $("recentLogs").innerHTML=logs.length?logs.map(l=>`<div class="recent-item"><span class="recent-date">${fmtDate(l.date,{day:"numeric",month:"short"})}</span><div class="recent-main"><strong>${l.notes?escapeHtml(l.notes.slice(0,45)):"ملخص يومي"}</strong><small>${(l.workHours+l.skillHours).toFixed(1)} ساعة عمل · ${l.studyHours.toFixed(1)} دراسة · ${l.gymMinutes} دقيقة تمرين</small></div><span class="recent-value">${l.incomeUsd?fmtMoney(l.incomeUsd):"—"}</span></div>`).join(""):'<div class="empty-state">لا توجد سجلات بعد. ابدأ من «السجل اليومي».</div>';
}
function renderDashboardChart() {
  const mode=$("dashboardChartMode").value;
  const days=Array.from({length:14},(_,i)=>{const d=new Date(`${todayISO()}T12:00:00`);d.setDate(d.getDate()-(13-i));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;});
  const data=days.map(date=>{const l=state.logs.find(x=>x.date===date)||{};return {label:fmtDate(date,{day:"numeric",month:"numeric"}),value:mode==="income"?(l.incomeUsd||0):mode==="study"?(l.studyHours||0):((l.workHours||0)+(l.skillHours||0)+(l.studyHours||0))};});
  $("dashboardChartEmpty").classList.toggle("show",!data.some(d=>d.value>0));
  drawBarChart($("dashboardChart"),data,{suffix:mode==="income"?"$":"h",color:"#10b981",compact:true});
}
function populateGoalSettings() {
  const s=state.settings;
  $("targetSavings").value=s.targetSavings; $("targetMonthlyIncome").value=s.targetMonthlyIncome; $("targetWorkHours").value=s.targetWorkHours; $("targetStudyHours").value=s.targetStudyHours; $("targetWorkouts").value=s.targetWorkouts;
  $("targetEnglish").value=s.targetEnglish; $("targetGerman").value=s.targetGerman; $("targetTurkish").value=s.targetTurkish;
  $("planStartDate").value=s.startDate; $("planEndDate").value=fmtDate(getEndDate());
  const labels={english:"الإنجليزية",german:"الألمانية",turkish:"التركية"};
  const opts=[["A0","لم أحدد بعد"],["A1","A1"],["A2","A2"],["B1","B1"],["B2","B2"],["C1","C1"]];
  $("languageLevelControls").innerHTML=Object.entries(labels).map(([key,label])=>`<div class="language-level-card"><strong>${label} — المستوى الحالي</strong><select data-level="${key}">${opts.map(([v,t])=>`<option value="${v}" ${s.levels[key]===v?"selected":""}>${t}</option>`).join("")}</select></div>`).join("");
}
function saveGoalSettings() {
  const start=$("planStartDate").value;
  if(!start){showToast("اختر تاريخ بداية صحيحًا.");return;}
  state.settings={...state.settings,startDate:start,targetSavings:num("targetSavings"),targetMonthlyIncome:num("targetMonthlyIncome"),targetWorkHours:num("targetWorkHours"),targetStudyHours:num("targetStudyHours"),targetWorkouts:num("targetWorkouts"),targetEnglish:$("targetEnglish").value,targetGerman:$("targetGerman").value,targetTurkish:$("targetTurkish").value};
  document.querySelectorAll("[data-level]").forEach(el=>state.settings.levels[el.dataset.level]=el.value);
  persist(); renderAll(); showToast("تم حفظ المستهدفات والمستويات.");
}
function renderGoals() {
  const goals=goalDefinitions();
  const descs={income:"الدخل الفعلي بالدولار خلال الشهر الحالي مقارنة بهدف الشهر.",savings:"إجمالي مبالغ الادخار التي أُدخلت في السجلات.",work:"إجمالي ساعات العمل المدفوع وتطوير المهارة ضمن فترة الخطة.",study:"إجمالي ساعات الدراسة المدرسية ضمن فترة الخطة.",fitness:"جلسات التمرين التي تم تأكيد إنجازها خلال فترة الخطة.",english:`المستوى الحالي ${state.settings.levels.english||"A0"} · الهدف ${state.settings.targetEnglish}`,german:`المستوى الحالي ${state.settings.levels.german||"A0"} · الهدف ${state.settings.targetGerman}`,turkish:`المستوى الحالي ${state.settings.levels.turkish||"A0"} · الهدف ${state.settings.targetTurkish}`};
  $("goalCards").innerHTML=goals.map(g=>`<article class="goal-detail-card"><div class="goal-detail-head"><div class="goal-illustration">${g.icon}</div><div><h3>${g.name}</h3><p>${g.unit}</p></div><span class="goal-percent">${Math.round(g.progress)}%</span></div><p class="goal-detail-desc">${descs[g.id]||g.desc}</p><div class="progress-track"><span style="width:${g.progress}%"></span></div><div class="goal-detail-foot"><span>الحالي: ${g.displayCurrent}</span><span>المستهدف: ${g.displayTarget}</span></div></article>`).join("");
}
const fields = {
  incomeUsd:"incomeUsd",incomeEgp:"incomeEgp",savedUsd:"savedUsd",expensesEgp:"expensesEgp",
  workHours:"workHours",skillHours:"skillHours",studyHours:"studyHours",studyScore:"studyScore",tasksDone:"tasksDone",tasksPlanned:"tasksPlanned",
  gymMinutes:"gymMinutes",weightKg:"weightKg",waistCm:"waistCm",englishMin:"englishMin",germanMin:"germanMin",turkishMin:"turkishMin",energy:"energy",notes:"notes"
};
function saveLog(e) {
  e.preventDefault(); const date=$("logDate").value;
  if(!date){showToast("اختر تاريخ السجل.");return;}
  const log={date};
  Object.entries(fields).forEach(([id,key])=>{
    if(id==="notes")log[key]=$(id).value.trim();
    else if(id==="energy")log[key]=$(id).value===""?null:Number($(id).value);
    else if(["studyScore","weightKg","waistCm"].includes(id))log[key]=optionalNum(id);
    else log[key]=num(id);
  });
  log.workoutDone=$("workoutDone").checked;
  const idx=state.logs.findIndex(l=>l.date===date);
  if(idx>=0)state.logs[idx]=log;else state.logs.push(log);
  state.logs.sort((a,b)=>a.date.localeCompare(b.date));
  persist(); renderAll(); $("formStatus").textContent=`تم حفظ سجل ${fmtDate(date)} محليًا.`; showToast(idx>=0?"تم تحديث سجل هذا التاريخ.":"تم حفظ سجل اليوم.");
}
function loadLogIntoForm(date) {
  const log=state.logs.find(l=>l.date===date);
  Object.entries(fields).forEach(([id,key])=>{$(id).value=log&&log[key]!==null&&log[key]!==undefined?log[key]:"";});
  $("workoutDone").checked=!!(log&&log.workoutDone);
  $("formStatus").textContent=log?"تم تحميل سجل محفوظ للتعديل.":"لا يوجد سجل محفوظ لهذا التاريخ؛ احفظ لإضافته.";
}
function deleteCurrentLog() {
  const date=$("logDate").value; const idx=state.logs.findIndex(l=>l.date===date);
  if(idx<0){showToast("لا يوجد سجل لهذا التاريخ.");return;}
  if(!confirm(`هل تريد حذف سجل ${fmtDate(date)} نهائيًا من هذا المتصفح؟`))return;
  state.logs.splice(idx,1);persist();renderAll();$("dailyForm").reset();$("logDate").value=date;$("formStatus").textContent="تم حذف السجل.";showToast("تم حذف السجل.");
}
function renderLogTable() {
  const logs=allLogs().reverse(); $("logCount").textContent=`${logs.length} سجل`;
  $("logsTableBody").innerHTML=logs.length?logs.map(l=>`<tr><td>${fmtDate(l.date)}</td><td>${fmtMoney(l.incomeUsd)}</td><td>${l.workHours+l.skillHours} س</td><td>${l.studyHours} س</td><td>${l.workoutDone?"نعم":"—"}</td><td>${l.englishMin+l.germanMin+l.turkishMin} د</td><td>${l.studyScore===null||l.studyScore===undefined?"—":`${l.studyScore}%`}</td><td><button class="table-action" data-edit-date="${l.date}">تعديل</button></td></tr>`).join(""):'<tr><td colspan="8" class="empty-state">لا توجد سجلات حتى الآن.</td></tr>';
  document.querySelectorAll("[data-edit-date]").forEach(btn=>btn.addEventListener("click",()=>{showView("daily");$("logDate").value=btn.dataset.editDate;loadLogIntoForm(btn.dataset.editDate);window.scrollTo({top:0,behavior:"smooth"});}));
}
function selectedAnalyticsLogs() { return state.logs.filter(l=>within(l,$("analyticsFrom").value,$("analyticsTo").value)); }
function renderAnalytics() {
  if(!$("analyticsFrom"))return;
  const logs=selectedAnalyticsLogs();
  const timeData=[{label:"العمل المدفوع",value:sum(logs,"workHours")},{label:"تطوير المهارة",value:sum(logs,"skillHours")},{label:"الدراسة",value:sum(logs,"studyHours")},{label:"التمرين",value:sum(logs,"gymMinutes")/60},{label:"الإنجليزية",value:sumLanguage(logs,"english")/60},{label:"الألمانية",value:sumLanguage(logs,"german")/60},{label:"التركية",value:sumLanguage(logs,"turkish")/60}];
  $("timeBreakdownEmpty").classList.toggle("show",!timeData.some(d=>d.value>0));
  drawBarChart($("timeBreakdownChart"),timeData,{suffix:"h",color:"#059669",compact:false,horizontal:true});
  const langData=[{label:"الإنجليزية",value:sumLanguage(logs,"english")},{label:"الألمانية",value:sumLanguage(logs,"german")},{label:"التركية",value:sumLanguage(logs,"turkish")}];
  $("languageChartEmpty").classList.toggle("show",!langData.some(d=>d.value>0));
  drawBarChart($("languageChart"),langData,{suffix:"د",color:"#10b981",compact:false,horizontal:true});
  const moneyLogs=logs.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const moneyData=[];let income=0,saved=0;
  moneyLogs.forEach(l=>{income+=l.incomeUsd||0;saved+=l.savedUsd||0;moneyData.push({label:fmtDate(l.date,{day:"numeric",month:"numeric"}),value:income,secondary:saved});});
  $("moneyChartEmpty").classList.toggle("show",!moneyData.some(d=>d.value>0||d.secondary>0));
  drawLineChart($("moneyChart"),moneyData,{suffix:"$",firstLabel:"الدخل التراكمي",secondLabel:"المدخرات التراكمية"});
  const weeks=weeklyBuckets(logs);
  const studyGym=weeks.map(w=>({label:w.label,value:w.study,secondary:w.workouts}));
  $("studyGymEmpty").classList.toggle("show",!studyGym.some(d=>d.value>0||d.secondary>0));
  drawLineChart($("studyGymChart"),studyGym,{suffix:"h",firstLabel:"ساعات الدراسة",secondLabel:"جلسات التمرين"});
  const dayCount=Math.max(1,new Set(logs.map(l=>l.date)).size);
  $("avgStudy").textContent=(sum(logs,"studyHours")/dayCount).toFixed(1);
  $("totalGym").textContent=Math.round(sum(logs,"gymMinutes")).toLocaleString("en-US");
  const done=sum(logs,"tasksDone"),planned=sum(logs,"tasksPlanned");$("taskRate").textContent=planned?`${Math.round(pct(done,planned))}%`:"—";
  const energy=logs.filter(l=>l.energy!==null&&l.energy!==undefined&&l.energy>0);$("avgEnergy").textContent=energy.length?(energy.reduce((a,l)=>a+l.energy,0)/energy.length).toFixed(1):"—";
  document.dispatchEvent(new CustomEvent("masar:analytics",{detail:{from:$("analyticsFrom").value,to:$("analyticsTo").value}}));
}
function weeklyBuckets(logs) {
  const map=new Map();
  logs.forEach(l=>{
    const d=new Date(`${l.date}T12:00:00`); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if(!map.has(key))map.set(key,{key,label:fmtDate(key,{day:"numeric",month:"short"}),study:0,workouts:0});
    const v=map.get(key);v.study+=l.studyHours||0;v.workouts+=l.workoutDone?1:0;
  });
  return [...map.values()].sort((a,b)=>a.key.localeCompare(b.key)).slice(-12);
}
function renderReport() {
  if(!$("reportOutput"))return;
  const from=$("reportFrom").value,to=$("reportTo").value,currency=$("reportCurrency").value;
  const logs=state.logs.filter(l=>within(l,from,to)).sort((a,b)=>a.date.localeCompare(b.date));
  const days=new Set(logs.map(l=>l.date)).size;
  const work=sum(logs,"workHours")+sum(logs,"skillHours"),study=sum(logs,"studyHours"),gym=sum(logs,"gymMinutes"),income=sum(logs,currency==="EGP"?"incomeEgp":"incomeUsd"),saved=sum(logs,"savedUsd");
  const done=sum(logs,"tasksDone"),planned=sum(logs,"tasksPlanned");
  const goalRows=goalDefinitions().map(g=>`<div class="report-goal-row"><span>${g.name}</span><div class="progress-track"><span style="width:${g.progress}%"></span></div><strong>${Math.round(g.progress)}%</strong></div>`).join("");
  let detailed="";
  if($("reportType").value==="detailed"){
    detailed=`<section class="report-section"><h3>التفاصيل اليومية</h3><div class="table-scroll"><table><thead><tr><th>التاريخ</th><th>دخل ${currency}</th><th>عمل وتطوير</th><th>دراسة</th><th>تمرين (د)</th><th>اللغات (د)</th><th>ملاحظات</th></tr></thead><tbody>${logs.map(l=>`<tr><td>${fmtDate(l.date)}</td><td>${currency==="EGP"?fmtMoney(l.incomeEgp,"EGP"):fmtMoney(l.incomeUsd)}</td><td>${(l.workHours+l.skillHours).toFixed(1)} س</td><td>${l.studyHours} س</td><td>${l.gymMinutes}</td><td>${l.englishMin+l.germanMin+l.turkishMin}</td><td>${escapeHtml(l.notes||"—")}</td></tr>`).join("")||'<tr><td colspan="7">لا توجد بيانات للفترة.</td></tr>'}</tbody></table></div></section>`;
  }
  $("reportOutput").innerHTML=`<section class="report-hero"><span class="eyebrow">تقرير مسار</span><h2>تقرير التقدم الشخصي</h2><p>الفترة: ${fmtDate(from)} — ${fmtDate(to)} · تاريخ الإنشاء: ${fmtDate(todayISO())}</p><div class="report-stat-grid"><div class="report-stat"><small>أيام مسجلة</small><strong>${days}</strong></div><div class="report-stat"><small>دخل الفترة (${currency})</small><strong>${fmtMoney(income,currency)}</strong></div><div class="report-stat"><small>مدخرات USD</small><strong>${fmtMoney(saved)}</strong></div><div class="report-stat"><small>عمل + تطوير</small><strong>${work.toFixed(1)} س</strong></div><div class="report-stat"><small>الدراسة</small><strong>${study.toFixed(1)} س</strong></div><div class="report-stat"><small>التمرين</small><strong>${Math.round(gym)} د</strong></div><div class="report-stat"><small>ممارسة اللغات</small><strong>${Math.round(sumLanguage(logs,"english")+sumLanguage(logs,"german")+sumLanguage(logs,"turkish"))} د</strong></div><div class="report-stat"><small>إنجاز المهام</small><strong>${planned?Math.round(pct(done,planned))+"%":"—"}</strong></div></div></section><section class="report-section"><h3>مؤشرات الأهداف خلال خطة العشرة أشهر</h3>${goalRows}<p class="report-note">نسب التقدم تُحسب مقابل المستهدفات المحفوظة حاليًا، وقد تتضمن بيانات من خارج فترة التقرير. ملخص أرقام الفترة أعلاه يعتمد فقط على التاريخين المحددين.</p></section><section class="report-section"><h3>قراءة سريعة للفترة المحددة</h3><p class="report-note">متوسط العمل وتطوير المهارة في اليوم المسجل: ${days?(work/days).toFixed(2):"0"} ساعة. متوسط الدراسة في اليوم المسجل: ${days?(study/days).toFixed(2):"0"} ساعة. عدد جلسات التمرين: ${logs.filter(l=>l.workoutDone).length}. أيام النشاط: ${logs.filter(hasActivity).length}.</p></section>${detailed}`;
  document.dispatchEvent(new CustomEvent("masar:report",{detail:{from,to,currency}}));
}
function renderSettingsInfo() {
  $("settingsStart").textContent=fmtDate(state.settings.startDate);$("settingsEnd").textContent=fmtDate(getEndDate());$("settingsElapsed").textContent=`${Math.round(elapsedPct())}%`;
}
function exportJson() {
  const payload={app:"Masar",schema:2,version:1,exportedAt:new Date().toISOString(),settings:state.settings,logs:state.logs,enhancements:readJsonKey(KEYS.ext),life:readJsonKey(KEYS.life)};
  downloadBlob(JSON.stringify(payload,null,2),`masar-backup-${todayISO()}.json`,"application/json;charset=utf-8");
  try{localStorage.setItem(KEYS.backup,new Date().toISOString());}catch(e){}
  document.dispatchEvent(new CustomEvent("masar:changed"));
  showToast("تم إنشاء النسخة الاحتياطية JSON.");
}
function exportCsv() {
  const headers=["date","incomeUsd","incomeEgp","savedUsd","expensesEgp","workHours","skillHours","studyHours","studyScore","tasksDone","tasksPlanned","gymMinutes","workoutDone","weightKg","waistCm","englishMin","germanMin","turkishMin","energy","notes"];
  const quote=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const rows=[headers.join(","),...allLogs().map(l=>headers.map(k=>quote(l[k])).join(","))];
  downloadBlob("\uFEFF"+rows.join("\r\n"),`masar-daily-logs-${todayISO()}.csv`,"text/csv;charset=utf-8");
  showToast("تم تصدير السجل بصيغة CSV.");
}
function downloadBlob(content,name,type) {
  const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function importJson(e) {
  const input=e.target; const file=input.files&&input.files[0]; if(!file)return;
  const status=$("backupStatus"); status.textContent="جارٍ قراءة الملف…";
  if(file.size>25*1024*1024){status.textContent="الملف كبير جدًا (الحد 25 ميغابايت).";showToast("الملف كبير جدًا.");input.value="";return;}
  const reader=new FileReader();
  reader.onload=()=>{
    try {
      let incoming; try{incoming=JSON.parse(reader.result);}catch(err){throw new Error("الملف ليس JSON صالحًا.");}
      if(!incoming||typeof incoming!=="object"||Array.isArray(incoming)||!incoming.settings||typeof incoming.settings!=="object"||!Array.isArray(incoming.logs))throw new Error("لا يحتوي الملف على بيانات مسار (الإعدادات أو السجلات مفقودة).");
      const M=window.MasarModules||{};
      let ext=null,life=null;
      if(incoming.enhancements!=null){ext=M.ext?M.ext.sanitize(incoming.enhancements):null;if(!ext)throw new Error("قسم العادات في الملف غير صالح.");}
      if(incoming.life!=null){life=M.life?M.life.sanitize(incoming.life):null;if(!life)throw new Error("قسم الأهداف المخصصة في الملف غير صالح.");}
      const logs=normalizeLogs(incoming.logs); const dropped=incoming.logs.length-logs.length;
      const goals=life?life.goals.length:0, habits=life?life.habits.length:0;
      let msg=`سيتم استبدال البيانات الحالية بـ ${logs.length} سجل يومي`+(life?` و${goals} هدف و${habits} عادة`:"")+".";
      if(dropped>0)msg+=`\nسيُتجاهل ${dropped} سجل غير صالح أو مكرر.`;
      if(incoming.life==null)msg+="\nالنسخة لا تتضمن أهدافًا وعادات مخصصة، لذلك ستبقى الحالية كما هي.";
      msg+="\nهل تريد المتابعة؟";
      if(!confirm(msg)){status.textContent="أُلغي الاستيراد.";input.value="";return;}
      const prev={store:localStorage.getItem(KEYS.store),ext:localStorage.getItem(KEYS.ext),life:localStorage.getItem(KEYS.life)};
      const next={version:1,settings:sanitizeSettings(incoming.settings),logs};
      try{
        localStorage.setItem(KEYS.store,JSON.stringify(next));
        if(ext)localStorage.setItem(KEYS.ext,JSON.stringify(ext));
        if(life)localStorage.setItem(KEYS.life,JSON.stringify(life));
      }catch(werr){
        ["store","ext","life"].forEach(k=>{try{if(prev[k]===null)localStorage.removeItem(KEYS[k]);else localStorage.setItem(KEYS[k],prev[k]);}catch(x){}});
        throw new Error("تعذّر الحفظ في المتصفح؛ لم تتغير بياناتك.");
      }
      state=next; populateGoalSettings(); renderAll();
      document.dispatchEvent(new CustomEvent("masar:reload"));
      status.textContent=`تم استيراد ${state.logs.length} سجل`+(life?`، ${goals} هدف، ${habits} عادة`:"")+".";
      showToast("تمت استعادة النسخة الاحتياطية.");
    } catch(err) {status.textContent=err.message||"ملف النسخة غير صالح.";showToast(err.message||"ملف النسخة غير صالح.");}
    input.value="";
  };
  reader.onerror=()=>{status.textContent="تعذرت قراءة الملف.";showToast("تعذرت قراءة الملف.");input.value="";};
  reader.readAsText(file);
}
function resetApp() {
  if(!confirm("تحذير: سيُحذف كل سجل وهدف وعادة من هذا المتصفح. هل صدّرت نسخة احتياطية؟"))return;
  if(!confirm("تأكيد أخير: هل تريد حذف كل البيانات الآن؟"))return;
  state=defaultState();persist();
  [KEYS.ext,KEYS.life,KEYS.backup].forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
  populateGoalSettings();renderAll();document.dispatchEvent(new CustomEvent("masar:reload"));showToast("تمت إعادة ضبط التطبيق.");
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function debounce(fn,wait){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait);};}
function canvasSetup(canvas) {
  if(!canvas)return null;
  const rect=canvas.getBoundingClientRect();if(rect.width<10||rect.height<10)return null;
  const dpr=window.devicePixelRatio||1;canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);
  return {ctx,w:rect.width,h:rect.height};
}
function chartColors() {
  const cs=getComputedStyle(document.body), g=(n,d)=>cs.getPropertyValue(n).trim()||d;
  return {grid:g("--chart-grid","#edf2ee"),text:g("--chart-text","#84958b"),label:g("--chart-label","#63776b"),track:g("--chart-track","#edf6f0"),value:g("--chart-value","#4b6255"),main:g("--chart-main","#10b981"),second:g("--chart-second","#9bd9b7"),line:g("--chart-line","#059669")};
}
function drawBarChart(canvas,data,opts={}) {
  const setup=canvasSetup(canvas);if(!setup)return;const {ctx,w,h}=setup;ctx.clearRect(0,0,w,h);
  const C=chartColors();const font=getComputedStyle(document.body).fontFamily;ctx.font=`10px ${font}`;ctx.fillStyle=C.text;ctx.strokeStyle=C.grid;ctx.lineWidth=1;
  if(opts.horizontal) {
    const left=Math.min(118,w*.38),right=40,top=10,bottom=14;const chartW=Math.max(10,w-left-right),rowH=(h-top-bottom)/Math.max(1,data.length),max=Math.max(1,...data.map(d=>d.value));
    for(let i=0;i<=4;i++){const x=left+chartW*i/4;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,h-bottom);ctx.stroke();ctx.fillStyle=C.text;ctx.textAlign="center";ctx.fillText((max*i/4).toFixed(max<10?1:0),x,h-2);}
    data.forEach((d,i)=>{const y=top+i*rowH+rowH*.22,bh=Math.max(5,rowH*.48),bw=chartW*d.value/max;ctx.fillStyle=C.track;roundRect(ctx,left,y,chartW,bh,4,true);ctx.fillStyle=opts.color||C.main;roundRect(ctx,left,y,bw,bh,4,true);ctx.fillStyle=C.label;ctx.textAlign="right";ctx.fillText(d.label,left-10,y+bh*.78);ctx.textAlign="left";ctx.fillStyle=C.value;ctx.fillText(`${Number(d.value.toFixed(1)).toLocaleString("en-US")}${opts.suffix||""}`,Math.min(w-34,left+bw+6),y+bh*.78);});
  } else {
    const left=36,right=8,top=14,bottom=36,chartW=w-left-right,chartH=h-top-bottom,max=Math.max(1,...data.map(d=>d.value));
    for(let i=0;i<=4;i++){const y=top+chartH*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();ctx.fillStyle=C.text;ctx.textAlign="right";ctx.fillText((max*(1-i/4)).toFixed(max<10?1:0),left-7,y+3);}
    const gap=chartW/Math.max(1,data.length),bw=Math.min(opts.compact?16:38,gap*.55);
    const every=Math.max(1,Math.ceil(data.length/(opts.compact?7:12)));
    data.forEach((d,i)=>{const x=left+i*gap+(gap-bw)/2,bh=chartH*d.value/max,y=top+chartH-bh;ctx.fillStyle=opts.color||C.main;roundRect(ctx,x,y,bw,Math.max(1,bh),5,true);if(i%every===0){ctx.fillStyle=C.text;ctx.textAlign="center";ctx.fillText(d.label,x+bw/2,h-14);}});
  }
}
function drawLineChart(canvas,data,opts={}) {
  const setup=canvasSetup(canvas);if(!setup)return;const {ctx,w,h}=setup;ctx.clearRect(0,0,w,h);
  if(!data.length)return;const C=chartColors();
  const left=38,right=12,top=18,bottom=32,cw=w-left-right,ch=h-top-bottom;
  const max=Math.max(1,...data.map(d=>Math.max(d.value||0,d.secondary||0)));
  ctx.font=`10px ${getComputedStyle(document.body).fontFamily}`;ctx.strokeStyle=C.grid;ctx.fillStyle=C.text;ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=top+ch*i/4;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();ctx.textAlign="right";ctx.fillText((max*(1-i/4)).toFixed(max<10?1:0),left-7,y+3);}
  const xAt=i=>data.length===1?left+cw/2:left+i*cw/(data.length-1), yAt=v=>top+ch-(v/max)*ch;
  const drawSeries=(key,color)=>{ctx.beginPath();data.forEach((d,i)=>{const x=xAt(i),y=yAt(d[key]||0);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=2.3;ctx.stroke();data.forEach((d,i)=>{ctx.beginPath();ctx.arc(xAt(i),yAt(d[key]||0),2.7,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();});};
  drawSeries("value",C.line);
  if(data.some(d=>(d.secondary||0)>0))drawSeries("secondary",C.second);
  const step=Math.max(1,Math.ceil(data.length/6));data.forEach((d,i)=>{if(i%step===0||i===data.length-1){ctx.textAlign="center";ctx.fillStyle=C.text;ctx.fillText(d.label,xAt(i),h-8);}});
  ctx.textAlign="left";ctx.fillStyle=C.line;ctx.fillRect(left,4,7,7);ctx.fillStyle=C.label;ctx.fillText(opts.firstLabel||"القيمة",left+11,11);
  if(data.some(d=>(d.secondary||0)>0)){const off=left+22+ctx.measureText(opts.firstLabel||"القيمة").width+14;ctx.fillStyle=C.second;ctx.fillRect(off,4,7,7);ctx.fillStyle=C.label;ctx.fillText(opts.secondLabel||"القيمة الثانية",off+11,11);}
}
function roundRect(ctx,x,y,w,h,r,fill) {
  if(w<=0||h<=0)return;const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);if(fill)ctx.fill();
}
window.Masar={KEYS,$,todayISO,addDays,daysBetween,validISO,fmtDate,fmtMoney,escapeHtml,showToast,showView,readJsonKey,
  state:()=>state,drawBarChart,drawLineChart,
  emitChanged:()=>document.dispatchEvent(new CustomEvent("masar:changed"))};
document.addEventListener("masar:theme",()=>{renderDashboardChart();renderAnalytics();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("sidebar").classList.remove("open");});
document.addEventListener("click",e=>{const sb=$("sidebar");if(sb.classList.contains("open")&&!sb.contains(e.target)&&!$("mobileMenu").contains(e.target))sb.classList.remove("open");});
init();
})();