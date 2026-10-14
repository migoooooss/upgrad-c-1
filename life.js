/* مسار — الأهداف المخصصة، العادات، ولوحة «اليوم» والتنبيهات */
(() => {
  'use strict';
  const M = window.Masar;
  const { $, todayISO, addDays, daysBetween, validISO, fmtDate } = M;
  const esc = M.escapeHtml;
  const KEY = M.KEYS.life;
  const CATS = [['income', 'الدخل والعمل'], ['money', 'المال والادخار'], ['study', 'الدراسة'], ['language', 'اللغات'], ['health', 'الصحة واللياقة'], ['faith', 'العبادات'], ['social', 'الشخصية والتواصل'], ['skill', 'المهارات'], ['other', 'أخرى']];
  const catName = (id) => (CATS.find((c) => c[0] === id) || CATS[8])[1];
  const PRI = { high: 'عالية', mid: 'متوسطة', low: 'منخفضة' };
  const PRI_W = { high: 0, mid: 1, low: 2 };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const numOrNull = (v) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
  const mondayOf = (iso) => { const d = new Date(`${iso}T12:00:00`); return addDays(iso, -((d.getDay() + 6) % 7)); };

  /* ---------------- البيانات والتحقق ---------------- */
  const blank = () => ({ v: 1, goals: [], habits: [], ui: { goalFilter: 'active', goalCat: 'all', goalSort: 'priority' } });
  function sanitizeGoal(g) {
    if (!isObj(g)) return null;
    const title = str(g.title, 120); if (!title) return null;
    const today = todayISO();
    const created = validISO(g.createdAt) ? g.createdAt : today;
    const out = { id: str(g.id, 20) || uid(), title, category: CATS.some((c) => c[0] === g.category) ? g.category : 'other', priority: PRI[g.priority] ? g.priority : 'mid',
      start: validISO(g.start) ? g.start : created, deadline: validISO(g.deadline) ? g.deadline : '', notes: str(g.notes, 1000),
      status: ['active', 'done', 'archived'].includes(g.status) ? g.status : 'active', createdAt: created, completedAt: validISO(g.completedAt) ? g.completedAt : '', metric: null, milestones: [], log: [] };
    if (isObj(g.metric) && str(g.metric.name, 60)) {
      out.metric = { name: str(g.metric.name, 60), unit: str(g.metric.unit, 20), start: numOrNull(g.metric.start), current: numOrNull(g.metric.current), target: numOrNull(g.metric.target) };
      if (out.metric.start === null) out.metric.start = 0; if (out.metric.current === null) out.metric.current = out.metric.start;
    }
    if (Array.isArray(g.milestones)) out.milestones = g.milestones.slice(0, 50).filter(isObj).map((m) => ({ id: str(m.id, 20) || uid(), title: str(m.title, 120) || 'مرحلة', done: !!m.done,
      tasks: Array.isArray(m.tasks) ? m.tasks.slice(0, 100).filter(isObj).map((t) => ({ id: str(t.id, 20) || uid(), title: str(t.title, 160) || 'مهمة', done: !!t.done, due: validISO(t.due) ? t.due : '' })) : [] }));
    if (Array.isArray(g.log)) out.log = g.log.slice(0, 60).filter((x) => isObj(x) && validISO(x.date) && str(x.text, 160)).map((x) => ({ date: x.date, text: str(x.text, 160) }));
    return out;
  }
  function sanitizeHabit(h) {
    if (!isObj(h)) return null;
    const name = str(h.name, 80); if (!name) return null;
    const done = {};
    if (isObj(h.done)) Object.keys(h.done).slice(0, 6000).forEach((k) => { if (validISO(k) && h.done[k]) done[k] = 1; });
    return { id: str(h.id, 20) || uid(), name, kind: h.kind === 'avoid' ? 'avoid' : 'build', freq: h.freq === 'weekly' ? 'weekly' : 'daily', target: Math.round(clamp(Number(h.target) || 3, 1, 7)),
      archived: !!h.archived, created: validISO(h.created) ? h.created : todayISO(), done };
  }
  function sanitize(raw) {
    if (!isObj(raw)) return null;
    if ((raw.goals !== undefined && !Array.isArray(raw.goals)) || (raw.habits !== undefined && !Array.isArray(raw.habits))) return null;
    const out = blank();
    if (Array.isArray(raw.goals)) out.goals = raw.goals.slice(0, 300).map(sanitizeGoal).filter(Boolean);
    if (Array.isArray(raw.habits)) out.habits = raw.habits.slice(0, 100).map(sanitizeHabit).filter(Boolean);
    if (isObj(raw.ui)) {
      if (['active', 'done', 'archived', 'all'].includes(raw.ui.goalFilter)) out.ui.goalFilter = raw.ui.goalFilter;
      if (raw.ui.goalCat === 'all' || CATS.some((c) => c[0] === raw.ui.goalCat)) out.ui.goalCat = raw.ui.goalCat;
      if (['priority', 'deadline', 'progress', 'created'].includes(raw.ui.goalSort)) out.ui.goalSort = raw.ui.goalSort;
    }
    return out;
  }
  function load() { try { return sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')) || blank(); } catch (e) { return blank(); } }
  let data = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { M.showToast('تعذر الحفظ في المتصفح؛ صدّر نسخة احتياطية.'); return false; } M.emitChanged(); return true; }
  const toast = (m) => M.showToast(m);
  const ext = () => (window.MasarModules && window.MasarModules.ext) || null;

  /* ---------------- حساب تقدم الهدف ---------------- */
  function goalProgress(g) {
    let total = 0, done = 0;
    g.milestones.forEach((m) => { if (m.tasks.length) { total += m.tasks.length; done += m.tasks.filter((t) => t.done).length; } else { total += 1; done += m.done ? 1 : 0; } });
    const tp = total ? done / total * 100 : null;
    let mp = null;
    const m = g.metric;
    if (m && m.target !== null && m.start !== null && m.current !== null && m.target !== m.start) mp = clamp((m.current - m.start) / (m.target - m.start) * 100, 0, 100);
    const actual = g.status === 'done' ? 100 : (tp !== null && mp !== null) ? (tp + mp) / 2 : tp !== null ? tp : mp !== null ? mp : 0;
    let planned = null;
    if (g.deadline && g.start && g.deadline > g.start) planned = clamp(daysBetween(g.start, todayISO()) / daysBetween(g.start, g.deadline) * 100, 0, 100);
    return { actual, tp, mp, total, done, planned };
  }
  function paceOf(g, p) {
    const t = todayISO();
    if (g.status === 'done') return { cls: 'ok', text: 'تم الإنجاز' };
    if (g.status === 'archived') return { cls: '', text: 'مؤرشف' };
    if (!g.deadline) return { cls: '', text: 'بلا موعد نهائي' };
    if (g.deadline < t && p.actual < 100) return { cls: 'bad', text: `تجاوز الموعد منذ ${daysBetween(g.deadline, t)} يومًا` };
    const diff = p.actual - (p.planned || 0);
    if (diff >= 10) return { cls: 'ok', text: 'متقدم عن المخطط' };
    if (diff >= -8) return { cls: 'ok', text: 'على المسار' };
    return { cls: 'warn', text: `متأخر عن المخطط بـ ${Math.round(-diff)} نقطة` };
  }
  const daysLeftText = (g) => {
    if (!g.deadline) return 'بلا موعد نهائي';
    const n = daysBetween(todayISO(), g.deadline);
    return n > 1 ? `باقٍ ${n} يومًا · ${fmtDate(g.deadline)}` : n === 1 ? `غدًا · ${fmtDate(g.deadline)}` : n === 0 ? `ينتهي اليوم · ${fmtDate(g.deadline)}` : `انتهى منذ ${-n} يومًا · ${fmtDate(g.deadline)}`;
  };
  function overdueTasks() {
    const t = todayISO(), out = [];
    data.goals.filter((g) => g.status === 'active').forEach((g) => g.milestones.forEach((m) => m.tasks.forEach((k) => { if (!k.done && k.due && k.due < t) out.push({ g, m, k, days: daysBetween(k.due, t) }); })));
    return out.sort((a, b) => b.days - a.days);
  }
  function logEvent(g, text) { g.log.unshift({ date: todayISO(), text: text.slice(0, 160) }); g.log = g.log.slice(0, 60); }

  /* ---------------- حوارات ---------------- */
  const openDialog = (d) => { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); };
  const closeDialog = (d) => { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); };
  const fmtNum = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }));

  /* ---------------- الأهداف: العرض ---------------- */
  function goalCard(g) {
    const p = goalProgress(g), pace = paceOf(g, p), t = todayISO();
    const metric = g.metric ? `<div class="g-metric"><div><strong>${esc(g.metric.name)}</strong><small>من ${fmtNum(g.metric.start)} إلى ${fmtNum(g.metric.target)} ${esc(g.metric.unit)} · الحالي <b>${fmtNum(g.metric.current)}</b></small></div>${g.status === 'active' ? `<form class="inline-form" data-form="metric" data-gid="${g.id}"><input type="number" step="any" required aria-label="القيمة الحالية" placeholder="القيمة الجديدة" value=""><button class="button button-secondary" type="submit">تحديث</button></form>` : ''}</div>` : '';
    const ms = g.milestones.map((m) => {
      const n = m.tasks.length, d = m.tasks.filter((k) => k.done).length;
      const head = n ? `<span class="ms-count">${d}/${n}</span>` : `<label class="ms-check"><input type="checkbox" data-act="toggle-ms" data-gid="${g.id}" data-mid="${m.id}" ${m.done ? 'checked' : ''} ${g.status !== 'active' ? 'disabled' : ''}><span></span></label>`;
      const tasks = m.tasks.map((k) => { const od = !k.done && k.due && k.due < t;
        return `<li class="task ${k.done ? 'done' : ''} ${od ? 'overdue' : ''}"><label><input type="checkbox" data-act="toggle-task" data-gid="${g.id}" data-mid="${m.id}" data-tid="${k.id}" ${k.done ? 'checked' : ''} ${g.status !== 'active' ? 'disabled' : ''}><span>${esc(k.title)}</span></label>${k.due ? `<small class="due ${od ? 'bad' : ''}">${od ? 'متأخرة · ' : ''}${fmtDate(k.due, { day: 'numeric', month: 'short' })}</small>` : ''}<button type="button" class="x-btn" data-act="del-task" data-gid="${g.id}" data-mid="${m.id}" data-tid="${k.id}" aria-label="حذف المهمة">×</button></li>`; }).join('');
      const addTask = g.status === 'active' ? `<form class="inline-form add-task" data-form="add-task" data-gid="${g.id}" data-mid="${m.id}"><input type="text" maxlength="160" required placeholder="مهمة جديدة" aria-label="مهمة جديدة"><input type="date" aria-label="موعد المهمة"><button class="button button-ghost" type="submit">＋</button></form>` : '';
      return `<div class="milestone ${(n ? d === n : m.done) ? 'complete' : ''}"><div class="ms-head">${head}<strong>${esc(m.title)}</strong><button type="button" class="x-btn" data-act="del-ms" data-gid="${g.id}" data-mid="${m.id}" aria-label="حذف المرحلة">×</button></div>${n ? `<ul class="task-list">${tasks}</ul>` : ''}${addTask}</div>`;
    }).join('');
    const addMs = g.status === 'active' ? `<form class="inline-form" data-form="add-ms" data-gid="${g.id}"><input type="text" maxlength="120" required placeholder="أضف مرحلة (مثال: إنهاء الأساسيات)" aria-label="مرحلة جديدة"><button class="button button-secondary" type="submit">＋ مرحلة</button></form>` : '';
    const actions = g.status === 'active'
      ? `<button class="button button-primary" data-act="done" data-gid="${g.id}">تم الإنجاز ✓</button><button class="button button-secondary" data-act="edit" data-gid="${g.id}">تعديل</button><button class="button button-ghost" data-act="archive" data-gid="${g.id}">أرشفة</button><button class="button button-danger" data-act="delete" data-gid="${g.id}">حذف</button>`
      : g.status === 'done' ? `<button class="button button-secondary" data-act="reopen" data-gid="${g.id}">إعادة فتح</button><button class="button button-ghost" data-act="archive" data-gid="${g.id}">أرشفة</button><button class="button button-danger" data-act="delete" data-gid="${g.id}">حذف</button>`
      : `<button class="button button-secondary" data-act="unarchive" data-gid="${g.id}">استعادة</button><button class="button button-danger" data-act="delete" data-gid="${g.id}">حذف</button>`;
    const breakdown = [p.tp !== null ? `المهام ${p.done}/${p.total}` : '', p.mp !== null ? `المؤشر ${Math.round(p.mp)}%` : ''].filter(Boolean).join(' · ');
    const last = g.log.slice(0, 2).map((e) => `<li>${fmtDate(e.date, { day: 'numeric', month: 'short' })} — ${esc(e.text)}</li>`).join('');
    return `<article class="goal-card pri-${g.priority} st-${g.status}" data-gid="${g.id}">
      <header><div class="chips"><span class="chip">${esc(catName(g.category))}</span><span class="chip pri-chip pri-${g.priority}">أولوية ${PRI[g.priority]}</span></div><h3>${esc(g.title)}</h3><small class="g-deadline">${esc(daysLeftText(g))}</small></header>
      <div class="g-progress"><div class="g-pct"><strong>${Math.round(p.actual)}%</strong><span class="pace ${pace.cls}">${esc(pace.text)}</span></div>
      <div class="progress-track plan-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(p.actual)}" aria-label="تقدم الهدف"><span style="width:${p.actual}%"></span>${p.planned !== null && g.status === 'active' ? `<i class="plan-mark" style="right:${p.planned}%" title="الوقت المنقضي ${Math.round(p.planned)}%"></i>` : ''}</div>
      <small class="g-sub">${breakdown || 'أضف مراحل أو مؤشرًا لقياس التقدم'}${p.planned !== null && g.status === 'active' ? ` · العلامة = الوقت المنقضي ${Math.round(p.planned)}%` : ''}</small></div>
      ${metric}${g.notes ? `<p class="g-notes">${esc(g.notes)}</p>` : ''}
      <div class="milestones">${ms || '<div class="empty-state small">لا توجد مراحل بعد. قسّم الهدف إلى مراحل ومهام صغيرة.</div>'}</div>${addMs}
      ${last ? `<ul class="g-log">${last}</ul>` : ''}<div class="g-actions">${actions}</div></article>`;
  }
  function renderGoals() {
    $('goalFilter').value = data.ui.goalFilter; $('goalCatFilter').value = data.ui.goalCat; $('goalSort').value = data.ui.goalSort;
    let list = data.goals.filter((g) => (data.ui.goalFilter === 'all' || g.status === data.ui.goalFilter) && (data.ui.goalCat === 'all' || g.category === data.ui.goalCat));
    const sorters = { priority: (a, b) => PRI_W[a.priority] - PRI_W[b.priority] || (a.deadline || '9999').localeCompare(b.deadline || '9999'), deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'), progress: (a, b) => goalProgress(b).actual - goalProgress(a).actual, created: (a, b) => b.createdAt.localeCompare(a.createdAt) };
    list = list.slice().sort(sorters[data.ui.goalSort]);
    $('goalsBoard').innerHTML = list.length ? list.map(goalCard).join('') : `<div class="panel empty-state big">${data.goals.length ? 'لا توجد أهداف تطابق التصفية الحالية.' : 'لم تضف أي هدف بعد. أنشئ هدفك الأول، وقسّمه إلى مراحل ومهام صغيرة قابلة للقياس.'}<br><button class="button button-primary" data-act="new-goal-empty" type="button">＋ هدف جديد</button></div>`;
    const done = data.goals.filter((g) => g.status === 'done').sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    $('achievementLog').innerHTML = done.length ? done.map((g) => `<div class="hist-item"><span class="hist-date">${fmtDate(g.completedAt || g.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</span><div><strong>${esc(g.title)}</strong><small>${esc(catName(g.category))}${g.completedAt ? ` · خلال ${Math.max(0, daysBetween(g.start, g.completedAt))} يومًا` : ''}</small></div><span class="badge-soft">منجز</span></div>`).join('') : '<div class="empty-state">لا توجد إنجازات مسجلة بعد. عند إتمام هدف سيظهر هنا.</div>';
    $('goalCountPill').textContent = `${data.goals.filter((g) => g.status === 'active').length} نشط`;
  }

  /* ---------------- الأهداف: الحوار والإجراءات ---------------- */
  function openGoalDialog(id) {
    const g = id ? data.goals.find((x) => x.id === id) : null, f = $('goalForm');
    $('goalDialogTitle').textContent = g ? 'تعديل الهدف' : 'هدف جديد';
    $('gCat').innerHTML = CATS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
    f.dataset.id = g ? g.id : '';
    $('gTitle').value = g ? g.title : ''; $('gCat').value = g ? g.category : 'other'; $('gPri').value = g ? g.priority : 'mid';
    $('gStart').value = g ? g.start : todayISO(); $('gDeadline').value = g ? g.deadline : '';
    $('gMetricName').value = g && g.metric ? g.metric.name : ''; $('gMetricUnit').value = g && g.metric ? g.metric.unit : '';
    $('gMetricStart').value = g && g.metric && g.metric.start !== null ? g.metric.start : ''; $('gMetricCur').value = g && g.metric && g.metric.current !== null ? g.metric.current : '';
    $('gMetricTarget').value = g && g.metric && g.metric.target !== null ? g.metric.target : ''; $('gNotes').value = g ? g.notes : '';
    $('gError').textContent = ''; openDialog($('goalDialog')); $('gTitle').focus();
  }
  function submitGoal(e) {
    e.preventDefault();
    const id = $('goalForm').dataset.id, title = $('gTitle').value.trim(), start = $('gStart').value, deadline = $('gDeadline').value;
    const err = (m) => { $('gError').textContent = m; };
    if (!title) return err('اكتب عنوان الهدف.');
    if (!validISO(start)) return err('اختر تاريخ بداية صحيحًا.');
    if (deadline && deadline < start) return err('الموعد النهائي يجب أن يكون بعد تاريخ البداية.');
    const mName = $('gMetricName').value.trim(), mS = numOrNull($('gMetricStart').value), mC = numOrNull($('gMetricCur').value), mT = numOrNull($('gMetricTarget').value);
    if (mName && mT === null) return err('حدّد القيمة المستهدفة للمؤشر، أو اترك اسم المؤشر فارغًا.');
    if (mName && mS !== null && mT === mS) return err('القيمة المستهدفة يجب أن تختلف عن قيمة البداية.');
    const metric = mName ? { name: mName.slice(0, 60), unit: $('gMetricUnit').value.trim().slice(0, 20), start: mS === null ? 0 : mS, current: mC === null ? (mS === null ? 0 : mS) : mC, target: mT } : null;
    if (id) {
      const g = data.goals.find((x) => x.id === id); if (!g) return closeDialog($('goalDialog'));
      Object.assign(g, { title: title.slice(0, 120), category: $('gCat').value, priority: $('gPri').value, start, deadline, notes: $('gNotes').value.trim().slice(0, 1000), metric });
      logEvent(g, 'تم تعديل الهدف');
    } else {
      data.goals.unshift({ id: uid(), title: title.slice(0, 120), category: $('gCat').value, priority: $('gPri').value, start, deadline, notes: $('gNotes').value.trim().slice(0, 1000), status: 'active', createdAt: todayISO(), completedAt: '', metric, milestones: [], log: [{ date: todayISO(), text: 'تم إنشاء الهدف' }] });
    }
    if (save()) { closeDialog($('goalDialog')); renderGoals(); toast(id ? 'تم تحديث الهدف.' : 'تمت إضافة الهدف.'); }
  }
  const findG = (id) => data.goals.find((g) => g.id === id);
  function goalAction(act, el) {
    const g = findG(el.dataset.gid); if (!g) return;
    if (act === 'edit') return openGoalDialog(g.id);
    if (act === 'toggle-task') { const k = g.milestones.find((m) => m.id === el.dataset.mid)?.tasks.find((t) => t.id === el.dataset.tid); if (!k) return; k.done = el.checked; logEvent(g, `${k.done ? 'أُنجزت' : 'أُعيد فتح'} المهمة: ${k.title}`); }
    else if (act === 'toggle-ms') { const m = g.milestones.find((x) => x.id === el.dataset.mid); if (!m) return; m.done = el.checked; logEvent(g, `${m.done ? 'اكتملت' : 'أُعيد فتح'} المرحلة: ${m.title}`); }
    else if (act === 'del-task') { const m = g.milestones.find((x) => x.id === el.dataset.mid); if (!m) return; m.tasks = m.tasks.filter((t) => t.id !== el.dataset.tid); }
    else if (act === 'del-ms') { const m = g.milestones.find((x) => x.id === el.dataset.mid); if (!m || !confirm(`حذف المرحلة «${m.title}» ومهامها؟`)) return; g.milestones = g.milestones.filter((x) => x.id !== m.id); }
    else if (act === 'done') { g.status = 'done'; g.completedAt = todayISO(); logEvent(g, 'تم إنجاز الهدف'); toast('مبارك! سُجّل الهدف في سجل الإنجازات.'); }
    else if (act === 'reopen' || act === 'unarchive') { g.status = 'active'; g.completedAt = ''; logEvent(g, act === 'reopen' ? 'أُعيد فتح الهدف' : 'استُعيد الهدف من الأرشيف'); }
    else if (act === 'archive') { g.status = 'archived'; logEvent(g, 'تمت أرشفة الهدف'); toast('تمت الأرشفة. يمكنك استعادته من تصفية «المؤرشفة».'); }
    else if (act === 'delete') { if (!confirm(`حذف الهدف «${g.title}» نهائيًا؟ يُفضّل الأرشفة إن أردت الاحتفاظ بسجله.`)) return; data.goals = data.goals.filter((x) => x.id !== g.id); }
    if (save()) renderGoals();
  }
  function goalForm(e) {
    const f = e.target.closest('form[data-form]'); if (!f) return;
    e.preventDefault();
    const g = findG(f.dataset.gid); if (!g) return;
    const first = f.querySelector('input'); const v = first.value.trim();
    if (f.dataset.form === 'add-ms') { if (!v) return; g.milestones.push({ id: uid(), title: v.slice(0, 120), done: false, tasks: [] }); }
    else if (f.dataset.form === 'add-task') { const m = g.milestones.find((x) => x.id === f.dataset.mid); if (!m || !v) return; const due = f.querySelector('input[type=date]').value; m.tasks.push({ id: uid(), title: v.slice(0, 160), done: false, due: validISO(due) ? due : '' }); }
    else if (f.dataset.form === 'metric') { const n = numOrNull(first.value); if (n === null || !g.metric) { toast('أدخل رقمًا صحيحًا.'); return; } logEvent(g, `تحديث ${g.metric.name}: ${fmtNum(g.metric.current)} ← ${fmtNum(n)}`); g.metric.current = n; }
    if (save()) { renderGoals(); const p = goalProgress(g); if (p.actual >= 100 && g.status === 'active') toast('اكتمل تقدم هذا الهدف. اضغط «تم الإنجاز» لتسجيله.'); }
  }

  /* ---------------- العادات: الحساب ---------------- */
  const weekDates = (d) => { const s = mondayOf(d); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); };
  const weekCount = (h, d) => weekDates(d).filter((x) => h.done[x]).length;
  function streakOf(h) {
    const t = todayISO(); let n = 0;
    if (h.freq === 'daily') { let d = t; if (!h.done[d]) d = addDays(d, -1); while (h.done[d] && n < 6000) { n++; d = addDays(d, -1); } return n; }
    let w = mondayOf(t); if (weekCount(h, w) < h.target) w = addDays(w, -7);
    while (weekCount(h, w) >= h.target && n < 900) { n++; w = addDays(w, -7); }
    return n;
  }
  function bestStreakOf(h) {
    const dates = Object.keys(h.done).sort(); if (!dates.length) return 0; let best = 0;
    if (h.freq === 'daily') { let run = 0, prev = ''; dates.forEach((d) => { run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1; prev = d; if (run > best) best = run; }); return best; }
    const weeks = {}; dates.forEach((d) => { const w = mondayOf(d); weeks[w] = (weeks[w] || 0) + 1; });
    const ok = Object.keys(weeks).filter((w) => weeks[w] >= h.target).sort(); let run = 0, prev = '';
    ok.forEach((w) => { run = prev && daysBetween(prev, w) === 7 ? run + 1 : 1; prev = w; if (run > best) best = run; }); return best;
  }
  function breakDaysOf(h) {
    const t = todayISO(), from = h.created;
    if (h.freq === 'daily') { let n = 0; for (let d = from; d < t; d = addDays(d, 1)) if (!h.done[d]) n++; return n; }
    let n = 0; for (let w = mondayOf(from); addDays(w, 6) < t; w = addDays(w, 7)) if (weekCount(h, w) < h.target) n++; return n;
  }
  function rateOf(h, n) {
    const t = todayISO(); let start = addDays(t, -(n - 1)); if (h.created > start) start = h.created;
    const len = daysBetween(start, t) + 1; if (len < 1) return null;
    let c = 0; for (let d = start; d <= t; d = addDays(d, 1)) if (h.done[d]) c++;
    return Math.round(clamp(h.freq === 'daily' ? c / len : c / (h.target * len / 7), 0, 1) * 100);
  }
  const activeHabits = () => data.habits.filter((h) => !h.archived);
  const dueHabits = (date) => activeHabits().filter((h) => h.created <= date && (h.freq === 'daily' || h.done[date] || weekCount(h, date) < h.target));
  const kindDone = (h) => (h.kind === 'avoid' ? 'امتنعت اليوم ✓' : 'أنجزتها اليوم ✓');
  const kindTodo = (h) => (h.kind === 'avoid' ? 'امتنعت اليوم' : 'سجّل الإنجاز');

  /* ---------------- العادات: العرض ---------------- */
  function renderHabits() {
    const t = todayISO(), act = activeHabits();
    $('habitsToday').innerHTML = act.length ? act.map((h) => {
      const done = !!h.done[t], st = streakOf(h);
      return `<div class="habit-item ${done ? 'done' : ''}"><div class="hi-main"><strong>${esc(h.name)}</strong><small>${h.kind === 'avoid' ? 'عادة تقليل' : 'عادة إيجابية'} · ${h.freq === 'daily' ? 'يومية' : `أسبوعية (${weekCount(h, t)}/${h.target} هذا الأسبوع)`} · سلسلة ${st} ${h.freq === 'daily' ? 'يوم' : 'أسبوع'}</small></div><button type="button" class="button ${done ? 'button-primary' : 'button-secondary'}" data-hact="toggle-today" data-hid="${h.id}" aria-pressed="${done}">${done ? kindDone(h) : kindTodo(h)}</button></div>`;
    }).join('') : '<div class="empty-state">لا توجد عادات بعد. أضف عادة يومية أو أسبوعية، أو عادة تريد تقليلها.</div>';
    const days = Array.from({ length: 7 }, (_, i) => addDays(t, -(6 - i)));
    $('habitsMatrix').innerHTML = act.length ? `<div class="hm-row hm-head"><span></span>${days.map((d) => `<span>${fmtDate(d, { weekday: 'narrow' })}<small>${new Date(d + 'T12:00:00').getDate()}</small></span>`).join('')}</div>` +
      act.map((h) => `<div class="hm-row"><span class="hm-name">${esc(h.name)}</span>${days.map((d) => `<button type="button" class="hm-cell ${h.done[d] ? 'on' : ''}" data-hact="toggle" data-hid="${h.id}" data-date="${d}" aria-pressed="${!!h.done[d]}" aria-label="${esc(h.name)} — ${fmtDate(d)}"></button>`).join('')}</div>`).join('') : '';
    $('habitsStats').innerHTML = act.map((h) => {
      const r7 = rateOf(h, 7), r30 = rateOf(h, 30), unit = h.freq === 'daily' ? 'يوم' : 'أسبوع';
      return `<article class="panel habit-stat"><div class="panel-heading"><div><h3>${esc(h.name)}</h3><p>${h.kind === 'avoid' ? 'تقليل' : 'بناء'} · ${h.freq === 'daily' ? 'يوميًا' : `${h.target} مرات أسبوعيًا`} · منذ ${fmtDate(h.created, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><div class="hs-actions"><button class="table-action" data-hact="edit" data-hid="${h.id}">تعديل</button><button class="table-action" data-hact="archive" data-hid="${h.id}">أرشفة</button></div></div>
        <div class="hs-grid"><div><strong>${streakOf(h)}</strong><small>السلسلة الحالية (${unit})</small></div><div><strong>${bestStreakOf(h)}</strong><small>أفضل سلسلة (${unit})</small></div><div><strong>${breakDaysOf(h)}</strong><small>${h.freq === 'daily' ? 'أيام الانقطاع' : 'أسابيع لم يُحقَّق هدفها'}</small></div><div><strong>${Object.keys(h.done).length}</strong><small>مرات التسجيل</small></div></div>
        <div class="rate-line"><span>7 أيام</span><div class="progress-track"><span style="width:${r7 || 0}%"></span></div><b>${r7 === null ? '—' : r7 + '%'}</b></div><div class="rate-line"><span>30 يومًا</span><div class="progress-track"><span style="width:${r30 || 0}%"></span></div><b>${r30 === null ? '—' : r30 + '%'}</b></div></article>`;
    }).join('');
    const arch = data.habits.filter((h) => h.archived);
    $('habitsArchived').innerHTML = arch.length ? arch.map((h) => `<div class="hist-item"><div><strong>${esc(h.name)}</strong><small>${Object.keys(h.done).length} تسجيل محفوظ · أفضل سلسلة ${bestStreakOf(h)}</small></div><span><button class="table-action" data-hact="restore" data-hid="${h.id}">استعادة</button> <button class="table-action danger" data-hact="delete" data-hid="${h.id}">حذف</button></span></div>`).join('') : '<div class="empty-state">لا توجد عادات مؤرشفة.</div>';
    $('habitsArchivedWrap').hidden = !arch.length;
  }
  function openHabitDialog(id) {
    const h = id ? data.habits.find((x) => x.id === id) : null;
    $('habitDialogTitle').textContent = h ? 'تعديل العادة' : 'عادة جديدة'; $('habitForm').dataset.id = h ? h.id : '';
    $('hbName').value = h ? h.name : ''; $('hbKind').value = h ? h.kind : 'build'; $('hbFreq').value = h ? h.freq : 'daily'; $('hbTarget').value = h ? h.target : 3;
    $('hbTargetWrap').hidden = $('hbFreq').value !== 'weekly'; $('hbError').textContent = ''; openDialog($('habitDialog')); $('hbName').focus();
  }
  function submitHabit(e) {
    e.preventDefault();
    const id = $('habitForm').dataset.id, name = $('hbName').value.trim();
    if (!name) { $('hbError').textContent = 'اكتب اسم العادة.'; return; }
    const target = Math.round(clamp(Number($('hbTarget').value) || 3, 1, 7));
    if (id) { const h = data.habits.find((x) => x.id === id); if (!h) return closeDialog($('habitDialog')); Object.assign(h, { name: name.slice(0, 80), kind: $('hbKind').value, freq: $('hbFreq').value, target }); }
    else { if (data.habits.length >= 100) { $('hbError').textContent = 'وصلت إلى الحد الأقصى (100 عادة).'; return; } data.habits.push({ id: uid(), name: name.slice(0, 80), kind: $('hbKind').value, freq: $('hbFreq').value, target, archived: false, created: todayISO(), done: {} }); }
    if (save()) { closeDialog($('habitDialog')); renderHabits(); toast(id ? 'تم تحديث العادة. سجلاتها السابقة محفوظة.' : 'تمت إضافة العادة.'); }
  }
  function habitAction(e) {
    const b = e.target.closest('[data-hact]'); if (!b) return;
    const h = data.habits.find((x) => x.id === b.dataset.hid); const a = b.dataset.hact; if (!h) return;
    if (a === 'edit') return openHabitDialog(h.id);
    if (a === 'toggle-today' || a === 'toggle') { const d = a === 'toggle' ? b.dataset.date : todayISO(); if (!validISO(d) || d > todayISO()) return; if (h.done[d]) delete h.done[d]; else h.done[d] = 1; }
    else if (a === 'archive') { h.archived = true; toast('تمت الأرشفة وبقيت سجلاتها.'); }
    else if (a === 'restore') h.archived = false;
    else if (a === 'delete') { if (!confirm(`حذف العادة «${h.name}» وكل سجلها نهائيًا؟`)) return; data.habits = data.habits.filter((x) => x.id !== h.id); }
    if (save()) renderHabits();
  }

  /* ---------------- لوحة «اليوم» ---------------- */
  function dayScore(date) {
    const X = ext(), st = M.state(), comps = [];
    comps.push({ id: 'log', label: 'السجل اليومي', v: st.logs.some((l) => l.date === date) ? 1 : 0, text: st.logs.some((l) => l.date === date) ? 'تم التسجيل' : 'لم يُسجَّل بعد', go: 'daily' });
    if (X) {
      const n = X.prayedOf(date); comps.push({ id: 'prayer', label: 'الصلوات', v: n / 5, text: `${n} من 5`, go: 'habits' });
      const ch = X.get().challenges[date]; comps.push({ id: 'challenge', label: 'تحدي الشخصية', v: ch && ch.done ? 1 : 0, text: ch && ch.done ? 'أُنجز' : ch && ch.skipped ? 'متروك' : 'لم يُنجز', go: 'habits' });
      const sc = X.get().screen[date];
      if (sc) { const w = X.weightedOf(sc), lim = X.get().screenGoal; const ok = w <= lim.weighted && X.totalOf(sc) <= lim.minutes; comps.push({ id: 'screen', label: 'وقت الشاشة', v: ok ? 1 : 0, text: `${w} نقطة موزونة${ok ? '' : ' (فوق الحد)'}`, go: 'habits' }); }
    }
    const due = dueHabits(date);
    if (due.length) { const d = due.filter((h) => h.done[date]).length; comps.push({ id: 'habits', label: 'العادات', v: d / due.length, text: `${d} من ${due.length}`, go: 'myhabits' }); }
    return { comps, pct: comps.length ? Math.round(comps.reduce((n, c) => n + c.v, 0) / comps.length * 100) : 0 };
  }
  function buildAlerts() {
    const t = todayISO(), A = [], st = M.state(), X = ext();
    overdueTasks().slice(0, 4).forEach((o) => A.push({ lvl: 'bad', text: `مهمة متأخرة ${o.days} يومًا: ${o.k.title} — ${o.g.title}`, go: 'mygoals' }));
    const od = overdueTasks().length; if (od > 4) A.push({ lvl: 'bad', text: `و${od - 4} مهام متأخرة أخرى.`, go: 'mygoals' });
    data.goals.filter((g) => g.status === 'active').forEach((g) => {
      const p = goalProgress(g);
      if (g.deadline && g.deadline < t && p.actual < 100) A.push({ lvl: 'bad', text: `تجاوز الهدف موعده: ${g.title}`, go: 'mygoals' });
      else if (g.deadline && daysBetween(t, g.deadline) <= 7 && p.actual < 100) A.push({ lvl: 'warn', text: `ينتهي موعد «${g.title}» خلال ${Math.max(0, daysBetween(t, g.deadline))} أيام (التقدم ${Math.round(p.actual)}%).`, go: 'mygoals' });
      else if (p.planned !== null && p.planned - p.actual > 20 && p.planned > 15) A.push({ lvl: 'warn', text: `«${g.title}» متأخر عن المخطط (التقدم ${Math.round(p.actual)}% والوقت المنقضي ${Math.round(p.planned)}%).`, go: 'mygoals' });
    });
    const pend = dueHabits(t).filter((h) => !h.done[t]).length; if (pend) A.push({ lvl: 'info', text: `${pend} ${pend === 1 ? 'عادة' : 'عادات'} لم تُسجَّل اليوم.`, go: 'myhabits' });
    if (!st.logs.some((l) => l.date === t)) A.push({ lvl: 'info', text: 'لم تسجّل يومك بعد.', go: 'daily' });
    if (X) { const sc = X.get().screen[t]; if (sc) { const lim = X.get().screenGoal; if (X.weightedOf(sc) > lim.weighted || X.totalOf(sc) > lim.minutes) A.push({ lvl: 'warn', text: 'تجاوزت حد وقت الشاشة الذي حددته اليوم.', go: 'habits' }); } }
    let last = null; try { last = localStorage.getItem(M.KEYS.backup); } catch (e) { /* تجاهل */ }
    if (st.logs.length || data.goals.length || data.habits.length) { if (!last) A.push({ lvl: 'info', text: 'لم تنزّل نسخة احتياطية بعد. بياناتك على هذا المتصفح فقط.', go: 'settings' }); else { const n = daysBetween(last.slice(0, 10), t); if (n >= 14) A.push({ lvl: 'warn', text: `آخر نسخة احتياطية قبل ${n} يومًا.`, go: 'settings' }); } }
    return A;
  }
  const ring = (pct, label) => `<div class="mini-ring" style="--ring:${pct}%"><div><strong>${pct}%</strong><small>${label}</small></div></div>`;
  function renderOverview() {
    const host = $('todayOverview'); if (!host) return;
    const t = todayISO(), s = dayScore(t), week = Array.from({ length: 7 }, (_, i) => dayScore(addDays(t, -i)).pct), wk = Math.round(week.reduce((n, v) => n + v, 0) / 7);
    const X = ext(), cups = X ? (X.get().waterLog[t] || 0) : 0, goalCups = X ? X.get().waterGoal : 8;
    const alerts = buildAlerts();
    const active = data.goals.filter((g) => g.status === 'active').sort((a, b) => PRI_W[a.priority] - PRI_W[b.priority] || (a.deadline || '9999').localeCompare(b.deadline || '9999')).slice(0, 4);
    host.innerHTML = `<div class="today-grid">
      <article class="panel today-hero"><div class="th-top"><div><span class="eyebrow">اليوم</span><h3>${fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long' })}</h3></div><div class="th-rings">${ring(s.pct, 'اليوم')}${ring(wk, 'آخر 7 أيام')}</div></div>
        <ul class="th-comps">${s.comps.map((c) => `<li><button type="button" data-go="${c.go}" class="${c.v >= 1 ? 'ok' : c.v > 0 ? 'part' : ''}"><i></i><span>${esc(c.label)}</span><b>${esc(c.text)}</b></button></li>`).join('')}<li><button type="button" data-go="habits" class="info"><i></i><span>الماء</span><b>${cups} / ${goalCups} كوب</b></button></li></ul>
        <p class="th-note">التقدم اليومي = متوسط العناصر أعلاه (الصلوات غير المسجلة تُحسب صفرًا، ووقت الشاشة يُحسب فقط عند تسجيله). ليس مقياسًا لقيمتك، بل لمحة عن يومك.</p>
        <div class="quick-actions"><button class="button button-primary" data-go="daily" type="button">＋ سجّل يومك</button><button class="button button-secondary" data-go="habits" type="button">الصلوات والتحدي</button><button class="button button-secondary" data-go="myhabits" type="button">عاداتي</button><button class="button button-secondary" data-quick="cup" type="button">＋ كوب ماء</button><button class="button button-secondary" data-quick="goal" type="button">＋ هدف جديد</button></div></article>
      <div class="today-side"><article class="panel alerts-panel"><div class="panel-heading"><div><h3>تنبيهات ومتأخرات</h3><p>ما يحتاج انتباهك الآن</p></div><span class="badge-soft ${alerts.some((a) => a.lvl === 'bad') ? 'badge-bad' : ''}">${alerts.length}</span></div>
        ${alerts.length ? `<ul class="alert-list">${alerts.slice(0, 7).map((a) => `<li class="${a.lvl}"><button type="button" data-go="${a.go}">${esc(a.text)}</button></li>`).join('')}</ul>` : '<div class="empty-state ok-state">لا توجد متأخرات الآن. استمر.</div>'}</article>
        <article class="panel"><div class="panel-heading"><div><h3>أهدافي النشطة</h3><p>الأعلى أولوية أولًا</p></div><button class="text-button" data-go="mygoals" type="button">عرض الكل ←</button></div>
        ${active.length ? active.map((g) => { const p = goalProgress(g); return `<div class="goal-summary-item"><div class="goal-summary-top"><span class="goal-name"><i class="goal-dot"></i>${esc(g.title)}</span><strong>${Math.round(p.actual)}%</strong></div><div class="progress-track"><span style="width:${p.actual}%"></span></div><div class="goal-summary-bottom"><span>${esc(catName(g.category))}</span><span>${esc(g.deadline ? daysLeftText(g).split(' · ')[0] : 'بلا موعد')}</span></div></div>`; }).join('') : '<div class="empty-state">لا توجد أهداف نشطة. أضف هدفك الأول.</div>'}</article></div></div>`;
  }

  /* ---------------- الربط والأحداث ---------------- */
  function renderAll() { renderOverview(); renderGoals(); renderHabits(); }
  function bind() {
    $('addGoalBtn').addEventListener('click', () => openGoalDialog());
    $('goalForm').addEventListener('submit', submitGoal);
    $('gCancel').addEventListener('click', () => closeDialog($('goalDialog')));
    $('goalFilter').addEventListener('change', (e) => { data.ui.goalFilter = e.target.value; save(); renderGoals(); });
    $('goalCatFilter').innerHTML = '<option value="all">كل المجالات</option>' + CATS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
    $('goalCatFilter').addEventListener('change', (e) => { data.ui.goalCat = e.target.value; save(); renderGoals(); });
    $('goalSort').addEventListener('change', (e) => { data.ui.goalSort = e.target.value; save(); renderGoals(); });
    $('goalsBoard').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT') return; if (b.dataset.act === 'new-goal-empty') return openGoalDialog(); goalAction(b.dataset.act, b); });
    $('goalsBoard').addEventListener('change', (e) => { const el = e.target; if (el.matches('input[data-act]')) goalAction(el.dataset.act, el); });
    $('goalsBoard').addEventListener('submit', goalForm);
    $('addHabitBtn').addEventListener('click', () => openHabitDialog());
    $('habitForm').addEventListener('submit', submitHabit);
    $('hbCancel').addEventListener('click', () => closeDialog($('habitDialog')));
    $('hbFreq').addEventListener('change', () => { $('hbTargetWrap').hidden = $('hbFreq').value !== 'weekly'; });
    $('view-myhabits').addEventListener('click', habitAction);
    $('todayOverview').addEventListener('click', (e) => {
      const q = e.target.closest('[data-quick]'); if (q) { if (q.dataset.quick === 'cup') { const X = ext(); if (X) { X.addCup(1); toast('تمت إضافة كوب ماء.'); } } else { M.showView('mygoals'); openGoalDialog(); } return; }
      const g = e.target.closest('[data-go]'); if (g) M.showView(g.dataset.go);
    });
    document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) closeDialog(d); }));
    document.addEventListener('masar:changed', renderOverview);
    document.addEventListener('masar:render', renderOverview);
    document.addEventListener('masar:reload', () => { data = load(); renderAll(); });
    document.addEventListener('masar:view', (e) => { if (e.detail.view === 'mygoals') renderGoals(); if (e.detail.view === 'myhabits') renderHabits(); if (e.detail.view === 'dashboard') renderOverview(); });
    let day = todayISO();
    setInterval(() => { if (todayISO() !== day) { day = todayISO(); renderAll(); } }, 60000);
  }
  window.MasarModules = window.MasarModules || {};
  window.MasarModules.life = { sanitize, get: () => data, goalProgress, overdueTasks, activeHabits, rateOf, dayScore, streakOf, catName, PRI };
  bind(); renderAll();
})();
