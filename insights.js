/* مسار — التقارير الموسّعة، مقارنة الفترات، وأنماط التحسين (من بياناتك الفعلية فقط) */
(() => {
  'use strict';
  const M = window.Masar;
  const { $, todayISO, addDays, daysBetween, validISO, fmtDate, fmtMoney } = M;
  const esc = M.escapeHtml;
  const EXT = () => window.MasarModules.ext;
  const LIFE = () => window.MasarModules.life;
  const datesIn = (from, to) => { const a = []; if (!validISO(from) || !validISO(to) || from > to) return a; for (let d = from; d <= to && a.length < 4000; d = addDays(d, 1)) a.push(d); return a; };
  const pct = (n) => (n === null || n === undefined ? '—' : `${Math.round(n)}%`);
  const avg = (arr) => (arr.length ? arr.reduce((n, v) => n + v, 0) / arr.length : null);

  /* مؤشرات فترة */
  function periodStats(from, to) {
    const X = EXT(), D = X.get(), st = M.state(), dates = datesIn(from, to);
    const logs = st.logs.filter((l) => l.date >= from && l.date <= to);
    const pc = X.prayerCounts(dates);
    const sc = dates.map((d) => D.screen[d]).filter(Boolean);
    const ch = dates.map((d) => D.challenges[d]).filter(Boolean);
    const wl = dates.map((d) => D.waterLog[d]).filter((v) => v !== undefined);
    const sum = (k) => logs.reduce((n, l) => n + (l[k] || 0), 0);
    const habits = LIFE().activeHabits().map((h) => ({ h, rate: habitRate(h, from, to) })).filter((x) => x.rate !== null);
    return {
      days: dates.length, logDays: logs.length, work: sum('workHours') + sum('skillHours'), study: sum('studyHours'), gym: sum('gymMinutes'), income: sum('incomeUsd'),
      prayRate: pc.recorded ? pc.prayed / pc.recorded * 100 : null, pc,
      screenAvgW: avg(sc.map(X.weightedOf)), screenAvgT: avg(sc.map(X.totalOf)), screenN: sc.length,
      screenOver: dates.filter((d) => D.screen[d] && (X.weightedOf(D.screen[d]) > D.screenGoal.weighted || X.totalOf(D.screen[d]) > D.screenGoal.minutes)).length,
      chDone: ch.filter((c) => c.done).length, chSkip: ch.filter((c) => c.skipped).length,
      waterAvg: avg(wl), waterMet: wl.filter((v) => v >= D.waterGoal).length, waterN: wl.length,
      habitRate: avg(habits.map((x) => x.rate)), habits
    };
  }
  function habitRate(h, from, to) {
    const start = h.created > from ? h.created : from; const len = daysBetween(start, to) + 1; if (len < 1) return null;
    let c = 0; datesIn(start, to).forEach((d) => { if (h.done[d]) c++; });
    return Math.max(0, Math.min(1, h.freq === 'daily' ? c / len : c / (h.target * len / 7))) * 100;
  }
  const hasData = (s) => s.logDays > 0 || s.pc.recorded > 0 || s.screenN > 0 || s.chDone > 0 || s.habits.length > 0 || s.waterN > 0;

  /* ---------------- التقرير ---------------- */
  function delta(cur, prev, lowerBetter, fmt) {
    if (cur === null || prev === null || cur === undefined || prev === undefined) return '<td>—</td>';
    const d = cur - prev; if (Math.abs(d) < 0.05) return '<td class="dl">بلا تغيّر</td>';
    const good = lowerBetter ? d < 0 : d > 0;
    return `<td class="dl ${good ? 'good' : 'bad'}">${d > 0 ? '▲' : '▼'} ${esc(fmt(Math.abs(d)))}</td>`;
  }
  function renderReportExtras(from, to) {
    const out = $('reportOutput'); if (!out || !EXT() || !LIFE() || !validISO(from) || !validISO(to) || from > to) return;
    out.querySelectorAll('.report-extra').forEach((n) => n.remove());
    const cur = periodStats(from, to), len = cur.days, pTo = addDays(from, -1), pFrom = addDays(pTo, -(len - 1)), prev = periodStats(pFrom, pTo);
    const D = EXT().get();
    const card = (l, v, s) => `<div class="rx-card"><small>${l}</small><strong>${v}</strong><span>${s}</span></div>`;
    const sec1 = `<section class="report-section report-extra"><h3>العبادات ووقت الشاشة والانضباط</h3><div class="rx-grid">` +
      card('الالتزام بالصلاة (من المسجّل)', pct(cur.prayRate), `${cur.pc.mosque} في المسجد · ${cur.pc.home} في البيت · ${cur.pc.missed} لم تُصلَّ · غير مسجّل ${cur.pc.none}`) +
      card('وقت الشاشة (متوسط اليوم المسجّل)', cur.screenN ? `${Math.round(cur.screenAvgT)} د` : '—', cur.screenN ? `${Math.round(cur.screenAvgW)} نقطة موزونة · ${cur.screenOver} أيام فوق الحد (من ${cur.screenN})` : 'لا تسجيل في الفترة') +
      card('التحديات الشخصية', `${cur.chDone}`, `${cur.chSkip} متروك · من ${cur.days} يومًا`) +
      card('الماء', cur.waterN ? `${cur.waterAvg.toFixed(1)} كوب` : '—', cur.waterN ? `بلغت هدفك (${D.waterGoal}) في ${cur.waterMet} من ${cur.waterN} يوم مسجّل` : 'لا تسجيل في الفترة') + `</div>` +
      (cur.habits.length ? `<div class="table-scroll"><table><thead><tr><th>العادة</th><th>الالتزام في الفترة</th><th>السلسلة الحالية</th></tr></thead><tbody>${cur.habits.map(({ h, rate }) => `<tr><td>${esc(h.name)}</td><td>${pct(rate)}</td><td>${LIFE().streakOf(h)} ${h.freq === 'daily' ? 'يوم' : 'أسبوع'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="report-note">لا توجد عادات مخصصة نشطة في هذه الفترة.</p>') +
      `<p class="report-note">الصلوات غير المسجّلة لا تُحسب «تركًا»؛ تُعرض منفصلة. المقارنات والنسب مبنية على ما سجّلته فقط.</p></section>`;
    let sec2;
    if (!hasData(prev)) sec2 = `<section class="report-section report-extra"><h3>مقارنة بالفترة السابقة</h3><p class="report-note">لا توجد بيانات كافية في الفترة السابقة (${fmtDate(pFrom)} — ${fmtDate(pTo)}) للمقارنة.</p></section>`;
    else {
      const same = (fn) => [fn, fn];
      const rows = [
        ['عمل + تطوير مهارة (ساعة)', cur.work, prev.work, false, ...same((v) => v.toFixed(1))], ['الدراسة (ساعة)', cur.study, prev.study, false, ...same((v) => v.toFixed(1))], ['التمرين (دقيقة)', cur.gym, prev.gym, false, ...same((v) => Math.round(v))],
        ['الدخل (USD)', cur.income, prev.income, false, ...same((v) => fmtMoney(v))], ['الالتزام بالصلاة', cur.prayRate, prev.prayRate, false, (v) => Math.round(v) + '%', (v) => Math.round(v) + ' نقطة'], ['وقت الشاشة الموزون (متوسط)', cur.screenAvgW, prev.screenAvgW, true, ...same((v) => Math.round(v))],
        ['التحديات المكتملة', cur.chDone, prev.chDone, false, ...same((v) => v)], ['التزام العادات', cur.habitRate, prev.habitRate, false, (v) => Math.round(v) + '%', (v) => Math.round(v) + ' نقطة']
      ];
      const f = (v, k) => (v === null || v === undefined ? '—' : k);
      sec2 = `<section class="report-section report-extra"><h3>مقارنة بالفترة السابقة</h3><p class="report-note">الفترة الحالية ${fmtDate(from)} — ${fmtDate(to)} مقابل ${fmtDate(pFrom)} — ${fmtDate(pTo)} (المدة نفسها).</p><div class="table-scroll"><table><thead><tr><th>المؤشر</th><th>الحالية</th><th>السابقة</th><th>التغيّر</th></tr></thead><tbody>${rows.map(([l, c, p, lb, vf, df]) => `<tr><td>${l}</td><td>${f(c, vf(c ?? 0))}</td><td>${f(p, vf(p ?? 0))}</td>${delta(c, p, lb, df)}</tr>`).join('')}</tbody></table></div></section>`;
    }
    const goals = LIFE().get().goals.filter((g) => g.status === 'active'), od = LIFE().overdueTasks().length;
    const sec3 = `<section class="report-section report-extra"><h3>أهدافي المخصصة (لقطة حالية)</h3>${goals.length ? goals.map((g) => { const p = LIFE().goalProgress(g); return `<div class="report-goal-row"><span>${esc(g.title)}</span><div class="progress-track"><span style="width:${p.actual}%"></span></div><strong>${Math.round(p.actual)}%</strong></div>`; }).join('') : '<p class="report-note">لا توجد أهداف مخصصة نشطة.</p>'}<p class="report-note">مهام متأخرة الآن: ${od}. أهداف منجزة إجمالًا: ${LIFE().get().goals.filter((g) => g.status === 'done').length}.</p></section>`;
    out.insertAdjacentHTML('beforeend', sec1 + sec2 + sec3);
  }

  /* ---------------- أنماط التحسين ---------------- */
  function buildPatterns(from, to) {
    const X = EXT(), D = X.get(), st = M.state(), L = LIFE(), P = [];
    const logs = st.logs.filter((l) => (!from || l.date >= from) && (!to || l.date <= to));
    const focus = (l) => l.workHours + l.skillHours + l.studyHours;
    const withE = logs.filter((l) => l.energy);
    const hi = withE.filter((l) => l.energy >= 4), lo = withE.filter((l) => l.energy <= 2);
    if (withE.length >= 8 && hi.length >= 3 && lo.length >= 3) P.push({ t: `في أيام الطاقة المرتفعة (4–5) كان متوسط العمل والدراسة ${avg(hi.map(focus)).toFixed(1)} ساعة، مقابل ${avg(lo.map(focus)).toFixed(1)} ساعة في أيام الطاقة المنخفضة (1–2). هذه علاقة ارتباط وليست سببًا مؤكدًا.` });
    if (logs.length >= 21) {
      const byDay = {}; logs.forEach((l) => { const w = new Date(`${l.date}T12:00:00`).getDay(); (byDay[w] = byDay[w] || []).push(focus(l)); });
      const rows = Object.entries(byDay).filter(([, v]) => v.length >= 2).map(([w, v]) => ({ w: Number(w), a: avg(v) }));
      if (rows.length >= 5) { rows.sort((a, b) => b.a - a.a); const names = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; const b = rows[0], w = rows[rows.length - 1];
        if (b.a - w.a >= 1) P.push({ t: `أعلى متوسط تركيز لديك يوم ${names[b.w]} (${b.a.toFixed(1)} ساعة) وأقله يوم ${names[w.w]} (${w.a.toFixed(1)} ساعة). فكّر في نقل المهام الصعبة إلى يومك الأقوى.` }); }
    }
    const end = to && to < todayISO() ? to : todayISO();
    const wOf = (a, b) => datesIn(a, b).map((d) => D.screen[d]).filter(Boolean).map(X.weightedOf);
    const w1 = wOf(addDays(end, -6), end), w0 = wOf(addDays(end, -13), addDays(end, -7));
    if (w1.length >= 3 && w0.length >= 3) { const a1 = avg(w1), a0 = avg(w0), d = a1 - a0; if (Math.abs(d) >= 20) P.push({ t: `متوسط وقت الشاشة الموزون ${d < 0 ? 'انخفض' : 'ارتفع'} من ${Math.round(a0)} إلى ${Math.round(a1)} نقطة مقارنة بالأسبوع السابق.`, bad: d > 0 }); }
    const last30 = datesIn(addDays(end, -29), end);
    const prRates = X.PRAYERS.map(([id, name]) => { let p = 0, r = 0; last30.forEach((d) => { const v = (D.prayers[d] || {})[id]; if (v) { r++; if (v !== 'missed') p++; } }); return { name, r, rate: r ? p / r * 100 : null }; }).filter((x) => x.r >= 10);
    if (prRates.length >= 3) { prRates.sort((a, b) => a.rate - b.rate); const lo2 = prRates[0], hi2 = prRates[prRates.length - 1]; if (hi2.rate - lo2.rate >= 15) P.push({ t: `أضعف التزام مسجّل في آخر 30 يومًا كان في صلاة ${lo2.name} (${Math.round(lo2.rate)}٪) مقابل ${hi2.name} (${Math.round(hi2.rate)}٪). ما الذي يتغير في وقتها؟` }); }
    const hr = L.activeHabits().filter((h) => daysBetween(h.created, end) >= 14).map((h) => ({ h, r: L.rateOf(h, 30) })).filter((x) => x.r !== null).sort((a, b) => a.r - b.r);
    if (hr.length && hr[0].r < 60) P.push({ t: `أقل عاداتك التزامًا في آخر 30 يومًا: «${hr[0].h.name}» (${hr[0].r}٪). جرّب تصغيرها أو ربطها بوقت ثابت.`, bad: true });
    if (hr.length > 1 && hr[hr.length - 1].r >= 80) P.push({ t: `أقوى عاداتك: «${hr[hr.length - 1].h.name}» (${hr[hr.length - 1].r}٪ في آخر 30 يومًا).` });
    const planned = logs.reduce((n, l) => n + l.tasksPlanned, 0), done = logs.reduce((n, l) => n + l.tasksDone, 0);
    if (planned >= 20 && done / planned < 0.6) P.push({ t: `أنجزت ${Math.round(done / planned * 100)}٪ فقط من المهام المخطط لها. قد يفيد تخطيط عدد أقل من المهام الأهم.`, bad: true });
    return P;
  }
  function renderAnalyticsExtras(from, to) {
    const host = $('patternsPanel'); if (!host || !EXT() || !LIFE()) return;
    const P = buildPatterns(from, to), st = M.state();
    host.innerHTML = P.length ? `<ul class="pattern-list">${P.map((p) => `<li class="${p.bad ? 'warn' : ''}">${esc(p.t)}</li>`).join('')}</ul>` :
      `<div class="empty-state">لا توجد أنماط واضحة بعد. تظهر الأنماط عند توفر بيانات كافية (مثلًا أسبوعين من التسجيل المنتظم، وطاقة مسجّلة في 8 أيام على الأقل). لديك حاليًا ${st.logs.length} سجلًا يوميًا.</div>`;
    const X = EXT(), D = X.get(), end = to && to < todayISO() ? to : todayISO(), days = datesIn(addDays(end, -29), end);
    const sc = days.map((d) => ({ label: fmtDate(d, { day: 'numeric', month: 'numeric' }), value: D.screen[d] ? X.weightedOf(D.screen[d]) : 0 }));
    $('screenChartEmpty').classList.toggle('show', !days.some((d) => D.screen[d]));
    M.drawBarChart($('screenChart'), sc, { suffix: '', compact: true, color: '#d97706' });
    const pr = days.map((d) => ({ label: fmtDate(d, { day: 'numeric', month: 'numeric' }), value: X.prayedOf(d) }));
    $('prayerChartEmpty').classList.toggle('show', !days.some((d) => Object.keys(D.prayers[d] || {}).length));
    M.drawBarChart($('prayerChart'), pr, { suffix: '', compact: true });
  }

  /* ---------------- ضبط الفترات السريعة ---------------- */
  function bindPresets() {
    $('reportPresets').addEventListener('click', (e) => {
      const b = e.target.closest('[data-preset]'); if (!b) return;
      const t = todayISO(), st = M.state(); let from = t;
      const p = b.dataset.preset;
      if (p === '7') from = addDays(t, -6); else if (p === '30') from = addDays(t, -29); else if (p === 'month') from = `${t.slice(0, 7)}-01`; else if (p === 'plan') from = st.settings.startDate > t ? t : st.settings.startDate;
      $('reportFrom').value = from; $('reportTo').value = t;
      $('reportFrom').dispatchEvent(new Event('change'));
    });
  }
  document.addEventListener('masar:report', (e) => renderReportExtras(e.detail.from, e.detail.to));
  document.addEventListener('masar:analytics', (e) => renderAnalyticsExtras(e.detail.from, e.detail.to));
  document.addEventListener('masar:changed', () => { if ($('view-reports').classList.contains('active')) $('generateReportBtn').click(); if ($('view-analytics').classList.contains('active')) $('applyAnalytics').click(); });
  bindPresets();
  // الرسم الأول بعد تحميل كل الوحدات
  if ($('view-reports')) { $('generateReportBtn').click(); }
})();
