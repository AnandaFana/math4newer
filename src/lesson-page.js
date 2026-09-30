/* ==========================================================================
   lesson-page.js — 把 lessons-data.js 的内容渲染成一节完整的课程页

   支持两种课程格式：
   • 入门格式（课程 1～9）：story / concept / experiment / compare / insight
   • 教材格式（课程 10+）：sections[]（含 blocks）+ examples[] + experiments[]
   两者都会被归一化成同一套 section/block 结构再渲染。
   ========================================================================== */
(() => {
  'use strict';
  const K = window.StatKit;
  const $ = id => document.getElementById(id);

  /* ---------------------------------------------------------------- 区块渲染 */
  function renderBlock(b) {
    if (!b) return '';
    switch (b.t) {
      case 'p':       return `<p>${b.x}</p>`;
      case 'demo':    return b.x;
      case 'formula': return `<div class="formula-box">${b.x}</div>`;
      case 'note':    return `<p class="muted">${b.x}</p>`;
      case 'math':    return `<div class="math-display">${b.x}</div>`;
      case 'key':     return `<div class="key-idea"><span class="key-icon">◆</span><div>${b.x}</div></div>`;
      case 'list':    return `<ul class="block-list">${b.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
      case 'table':   return renderTable(b);
      case 'derive':  return renderDerive(b);
      case 'pitfall': return renderPitfall(b);
      case 'history': return `<div class="history-note"><span class="hist-label">${b.label || '历史'}</span><p>${b.x}</p></div>`;
      default:        return '';
    }
  }

  function renderTable(b) {
    return `<div class="table-wrap"><table class="data-table">
      <thead><tr>${b.head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  function renderDerive(b) {
    return `<details class="derive">
      <summary><span class="derive-icon">∑</span>${b.title}</summary>
      <div class="derive-body">
        ${b.steps.map((s, i) => `<div class="derive-step">
          <span class="step-no">${i + 1}</span><div>${s}</div></div>`).join('')}
        ${b.conclusion ? `<div class="derive-conclusion">${b.conclusion}</div>` : ''}
      </div>
    </details>`;
  }

  function renderPitfall(b) {
    return `<div class="pitfall-card">
      <div class="pitfall-head"><span class="pitfall-icon">⚠</span><strong>${b.title}</strong></div>
      <ul>${b.items.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>`;
  }

  /* --------------------------------------------------- 入门格式 → 统一 sections */
  function normalize(L) {
    if (Array.isArray(L.sections) && L.sections.length) return L.sections;

    const out = [];
    if (L.story) {
      const blocks = L.story.body.map(x => ({ t: 'p', x }));
      if (L.story.after) blocks.push({ t: 'p', x: L.story.after });
      out.push({
        label: L.story.label, h2: L.story.h2,
        numbers: L.story.numbers, unit: L.story.unit,
        callout: L.story.callout, blocks
      });
    }
    if (L.concept) {
      const blocks = L.concept.body.map(x => ({ t: 'p', x }));
      if (L.concept.demo) blocks.push({ t: 'demo', x: L.concept.demo });
      if (L.concept.formula) blocks.push({ t: 'formula', x: L.concept.formula });
      if (L.concept.note) blocks.push({ t: 'note', x: L.concept.note });
      out.push({ label: L.concept.label, h2: L.concept.h2, blocks });
    }
    return out;
  }

  /* ------------------------------------------------------------ 单个 section */
  function renderSection(s, i) {
    const label = s.label || `${String(i + 1).padStart(2, '0')} · 第 ${i + 1} 节`;
    return `<article class="concept-card">
      <div class="chapter-label">${label}</div>
      <h2>${s.h2}</h2>
      ${s.intro ? `<p class="section-intro">${s.intro}</p>` : ''}
      ${s.numbers ? `<div class="number-row">${s.numbers.map(n => `<span>${n}</span>`).join('')}<b>${s.unit || ''}</b></div>` : ''}
      ${(s.blocks || []).map(renderBlock).join('')}
      ${s.callout ? `<div class="callout"><span class="callout-icon">✦</span><div><strong>${s.callout.title}</strong><br>${s.callout.text}</div></div>` : ''}
    </article>`;
  }

  /* ---------------------------------------------------------------- 实验区块 */
  function renderExperiment(e, i) {
    return `<article class="experiment-card" id="experiment${i || ''}">
      <div class="chapter-label">${e.label || '动手试一试'}</div>
      <div class="card-heading">
        <div><h2>${e.h2}</h2><p>${e.sub || ''}</p></div>
        <span class="lab-badge">交互实验</span>
      </div>
      <div id="labMount${i || ''}"></div>
      <div class="experiment-footer">
        <span>${e.footer || ''}</span>
        <button class="reset-btn" data-reset="${i || 0}">↺ 恢复示例</button>
      </div>
    </article>`;
  }

  /* ---------------------------------------------------------------- 例题区块 */
  function renderExamples(list, startNo) {
    if (!list || !list.length) return '';
    return `<article class="examples-card">
      <div class="chapter-label">例题精讲</div>
      <h2>动手算一算</h2>
      <p class="muted">先自己想一想，再展开看解答。三道题的难度依次递增。</p>
      ${list.map((ex, i) => `
        <div class="example-item">
          <div class="example-head">
            <span class="example-no">例 ${startNo + i}</span>
            <span class="example-level lv-${i}">${ex.level || '练习'}</span>
          </div>
          <p class="example-q">${ex.q}</p>
          ${ex.hint ? `<p class="example-hint">提示：${ex.hint}</p>` : ''}
          <details class="example-solution">
            <summary>展开解答</summary>
            <div class="solution-body">
              ${ex.steps.map((s, j) => `<div class="solution-step">
                <span class="step-no">${j + 1}</span><div>${s}</div></div>`).join('')}
              <div class="solution-answer"><strong>答案：</strong>${ex.answer}</div>
            </div>
          </details>
        </div>`).join('')}
    </article>`;
  }

  /* ------------------------------------------------------------ 对比 / 总结 */
  function renderCompare(c) {
    if (!c) return '';
    const n = c.items.length;
    return `<article class="compare-card">
      <div class="chapter-label">${c.label}</div>
      <h2>${c.h2}</h2>
      ${c.intro ? `<p class="muted">${c.intro}</p>` : ''}
      <div class="compare-grid${n === 3 ? ' triple' : ''}">
        ${c.items.map(it => `
          <div class="compare-item">
            <span class="compare-icon">${it.icon}</span>
            <h3>${it.h3}</h3>
            <p>${it.p}</p>
            <ul>${it.li.map(x => `<li>${x}</li>`).join('')}</ul>
          </div>`).join('')}
      </div>
    </article>`;
  }

  /* ================================================================== 主渲染 */
  function renderLesson() {
    const id = K.currentId();
    const L = window.LESSONS?.[id];
    if (!L || !K.FLAT.some(l => l.id === id)) return;

    const current = K.FLAT.find(l => l.id === id);
    const idx = K.FLAT.findIndex(l => l.id === id) + 1;
    const sections = normalize(L);
    const experiments = L.experiments || (L.experiment ? [L.experiment] : []);
    const route = L.route || sections.map(s => s.h2);
    const total = K.FLAT.length;

    document.title = (current.title || L.title).replace(/<[^>]+>/g, '') + ' · 小小统计学';

    document.body.innerHTML = `
<a class="skip" href="#main">跳到主要内容</a>
<div class="app-shell">
  <aside class="sidebar">
    <div class="brand"><span class="brand-mark">σ</span><div><strong>小小统计学</strong><small>FAMILY LEARNING LAB</small></div></div>
    <div class="progress-card">
      <div class="progress-top"><span>学习进度</span><strong id="progressText">${idx} / ${total}</strong></div>
      <div class="progress-track"><i id="progressBar" style="width:${idx / total * 100}%"></i></div>
      <p>${L.progressNote || ''}</p>
    </div>
    <nav aria-label="课程导航" id="lessonNav"></nav>
    ${L.sidebarNote ? `<div class="sidebar-note">${L.sidebarNote}</div>` : ''}
  </aside>
  <main id="main">
    <header class="topbar">
      <div class="breadcrumbs">${L.category || '统计学入门'} <span>/</span> 第 ${String(idx).padStart(2, '0')} 课</div>
      <div class="top-actions">
        <button id="themeToggle" class="icon-btn" aria-label="切换阅读模式">◐</button>
        <button id="printBtn" class="icon-btn" aria-label="打印本课">⌁</button>
      </div>
    </header>

    <section class="hero">
      <div class="eyebrow">${L.eyebrow}</div>
      <h1>${L.title}</h1>
      <p class="hero-lede">${L.lede}</p>
      <div class="hero-meta">${(L.meta || []).map(m => `<span>${m}</span>`).join('')}</div>
    </section>

    <section class="lesson-grid">
      <div class="lesson-main">
        ${sections.map(renderSection).join('')}
        ${experiments.map(renderExperiment).join('')}
        ${renderExamples(L.examples, 1)}
        ${renderCompare(L.compare)}

        ${L.insight ? `<article class="insight-card">
          <span class="insight-icon">☀</span>
          <div><h3>${L.insight.h3}</h3><p>${L.insight.text}</p></div>
        </article>` : ''}

        <nav class="lesson-nav-footer">
          ${idx > 1 ? `<a href="${K.FLAT[idx - 2].file}">← 上一课：${K.FLAT[idx - 2].short}</a>` : '<span></span>'}
          ${idx < total ? `<a class="next" href="${K.FLAT[idx].file}">下一课：${K.FLAT[idx].short} →</a>`
                        : '<a class="next" href="index.html">回到课程地图 →</a>'}
        </nav>
      </div>

      <aside class="lesson-aside">
        <div class="aside-card">
          <div class="aside-title"><span>本课路线</span><span class="dots">•••</span></div>
          <ol id="routeList">
            ${route.map((r, i) => `<li class="${i === 0 ? 'active' : ''}"><span>${i + 1}</span>${r}</li>`).join('')}
          </ol>
        </div>
        ${L.question ? `<div class="question-card">
          <span class="question-mark">?</span>
          <h3>想一想</h3>
          <p>${L.question.q}</p>
          <button id="revealAnswer" aria-expanded="false">看看提示 <span>→</span></button>
          <p class="answer" id="answer">${L.question.a}</p>
        </div>` : ''}
        ${L.next ? `<div class="source-note"><span>接下来</span><p>${L.next}</p></div>` : ''}
      </aside>
    </section>

    <footer class="footer">
      <span>小小统计学 · 可复用学习模块</span>
      <span>内容版本 0.4 · 离线可用</span>
    </footer>
  </main>
</div>`;

    K.renderNav($('lessonNav'), id);
    K.wireChrome();

    experiments.forEach((e, i) => {
      const mount = $(`labMount${i || ''}`);
      const btn = document.querySelector(`[data-reset="${i || 0}"]`);
      const fn = window.Experiments?.[e.kind];
      if (mount && fn) fn(mount, btn);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderLesson);
  else renderLesson();
})();
