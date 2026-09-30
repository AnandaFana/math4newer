/* ==========================================================================
   lesson-kit.js — 小小统计学 · 全站共享引擎
   提供：课程导航、阅读模式、路线进度、答案揭示、统计工具函数
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------- 课程注册表：全站唯一来源 ---------------- */
  const CURRICULUM = [
    { stage: '第一阶段 · 看懂一堆数', lessons: [
      { id:'mean',        file:'mean.html',        short:'平均数',     title:'平均数，真的代表大家吗？',      ready:true },
      { id:'median',      file:'median.html',      short:'中位数',     title:'中位数：站在队伍正中间',        ready:true },
      { id:'mode',        file:'mode.html',        short:'众数',       title:'众数：最常见的选择',            ready:true },
      { id:'spread',      file:'spread.html',      short:'波动有多大', title:'波动：平均数之外的真相',        ready:true }
    ]},
    { stage: '第二阶段 · 与随机做朋友', lessons: [
      { id:'probability', file:'probability.html', short:'概率与猜测', title:'概率：把可能性说清楚',          ready:true },
      { id:'expectation', file:'expectation.html', short:'期望值',     title:'期望值：长期来看值不值？',      ready:true },
      { id:'normal',      file:'normal.html',      short:'正态分布',   title:'正态分布：钟形曲线的秘密',      ready:true }
    ]},
    { stage: '第三阶段 · 用样本猜整体', lessons: [
      { id:'sampling',    file:'sampling.html',    short:'抽样与估计', title:'抽样：一小勺尝出一锅汤',        ready:true },
      { id:'randomwalk',  file:'randomwalk.html',  short:'随机游走',   title:'随机游走：醉汉的脚步',          ready:true }
    ]},
    { stage: '第四阶段 · 概率论深化', lessons: [
      { id:'conditional', file:'conditional.html', short:'条件概率',   title:'条件概率与独立性',              ready:true },
      { id:'distributions',file:'distributions.html',short:'离散分布',title:'离散分布家族',                  ready:true },
      { id:'continuous',  file:'continuous.html',  short:'连续分布',   title:'连续分布与密度函数',            ready:true },
      { id:'multivar',    file:'multivar.html',    short:'协方差相关', title:'协方差与相关系数',              ready:true }
    ]},
    { stage: '第五阶段 · 数理统计', lessons: [
      { id:'estimation',  file:'estimation.html',  short:'参数估计',   title:'参数估计与置信区间',            ready:true },
      { id:'hypothesis',  file:'hypothesis.html',  short:'假设检验',   title:'假设检验与 p 值',               ready:true },
      { id:'regression',  file:'regression.html',  short:'线性回归',   title:'线性回归',                      ready:true }
    ]},
    { stage: '第六阶段 · 随机过程', lessons: [
      { id:'markov',      file:'markov.html',      short:'马尔可夫链', title:'马尔可夫链',                    ready:true },
      { id:'poissonProcess', file:'poisson-process.html', short:'泊松过程', title:'泊松过程',                 ready:true }
    ]}
  ];

  const FLAT = CURRICULUM.flatMap(s => s.lessons);

  /* ---------------- 统计工具 ---------------- */
  const sum   = a => a.reduce((s, x) => s + x, 0);
  const mean  = a => sum(a) / a.length;
  const median = a => {
    const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const mode = a => {
    const c = {}; a.forEach(x => c[x] = (c[x] || 0) + 1);
    const top = Math.max(...Object.values(c));
    return top === 1 ? [] : Object.keys(c).filter(k => c[k] === top).map(Number);
  };
  const sd = a => { const m = mean(a); return Math.sqrt(sum(a.map(x => (x - m) ** 2)) / a.length); };
  const range = a => Math.max(...a) - Math.min(...a);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const fmt = (v, d = 1) => Number(v).toFixed(d);

  /* ---------------- 页面通用装配 ---------------- */
  function currentId() {
    // 只看文件名，避免上层目录名意外包含关键词
    const file = (location.pathname || '').toLowerCase().split('/').pop().split('\\').pop();
    const hit = FLAT.find(l => file === l.file.toLowerCase());
    if (hit) return hit.id;
    const loose = FLAT.find(l => file.includes(l.id));
    return loose ? loose.id : 'mean';
  }
  function renderNav(container, current) {
    if (!container) return;
    let n = 0;
    container.innerHTML = CURRICULUM.map(g => `
      <div class="nav-stage">${g.stage}</div>
      ${g.lessons.map(l => {
        n += 1;
        const on = l.id === current;
        return `<a class="${on ? 'active' : ''}" href="${l.file}" ${on ? 'aria-current="page"' : ''}>
          <span>${String(n).padStart(2, '0')}</span>${l.short}<small>${on ? '当前' : '→'}</small></a>`;
      }).join('')}`).join('');
  }

  function setProgress(index, total) {
    const t = document.getElementById('progressText');
    const b = document.getElementById('progressBar');
    if (t) t.textContent = `${index} / ${total}`;
    if (b) b.style.width = `${(index / total) * 100}%`;
  }

  function wireChrome() {
    document.getElementById('themeToggle')?.addEventListener('click', () =>
      document.body.classList.toggle('dark'));
    document.getElementById('printBtn')?.addEventListener('click', () => window.print());

    // 侧栏路线：点击高亮 + 更新进度条
    const items = [...document.querySelectorAll('#routeList li')];
    items.forEach((li, i) => li.addEventListener('click', () => {
      items.forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      setProgress(i + 1, items.length);
    }));

    // 想一想：揭示答案
    const btn = document.getElementById('revealAnswer');
    btn?.addEventListener('click', () => {
      const a = document.getElementById('answer');
      if (!a) return;
      const open = a.classList.toggle('show');
      btn.setAttribute('aria-expanded', String(open));
      const label = btn.firstChild;
      if (label && label.nodeType === Node.TEXT_NODE) {
        label.textContent = open ? '收起提示 ' : '看看提示 ';
      }
    });
  }

  /* ---------------- 暴露到全局 ---------------- */
  window.StatKit = {
    CURRICULUM, FLAT, renderNav, setProgress, wireChrome, currentId,
    sum, mean, median, mode, sd, range, clamp, fmt
  };
})();
