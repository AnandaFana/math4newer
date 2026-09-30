/* ==========================================================================
   experiments.js — 每节课的互动实验（拖一拖、抛一抛、看一看）
   每个实验签名： (mount, resetBtn) => void
   ========================================================================== */
(() => {
  'use strict';
  const K = window.StatKit;
  const { mean, median, sd, range, clamp, fmt } = K;

  const svg = (w, h, inner) =>
    `<svg viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;

  /* 通用：滑块控件组 */
  function controlsHTML(items) {
    return `<div class="lab-controls">${items.map((it, i) => `
      <label class="lab-slider">
        <span>${it.label}</span>
        <input type="range" data-i="${i}" min="${it.min}" max="${it.max}"
               step="${it.step || 1}" value="${it.value}"
               ${it.suffix ? `data-suffix="${it.suffix}"` : ''} aria-label="${it.label}">
        <output>${it.format ? it.format(it.value) : it.value}${it.suffix || ''}</output>
      </label>`).join('')}</div>`;
  }

  function readSliders(mount, values, onChange) {
    mount.querySelectorAll('input[type=range]').forEach(inp => {
      inp.addEventListener('input', e => {
        const i = +e.target.dataset.i;
        const cfg = e.target.closest('.lab-controls').__cfg;
        values[i] = +e.target.value;
        const out = e.target.parentElement.querySelector('output');
        const item = cfg[i];
        out.textContent = (item.format ? item.format(values[i]) : values[i]) + (item.suffix || '');
        onChange();
      });
    });
  }

  /* 把配置挂在容器上，方便读取 format/suffix */
  function setupControls(mount, items) {
    mount.innerHTML = controlsHTML(items);
    mount.querySelector('.lab-controls').__cfg = items;
  }

  /* ======================================================== 平均数 */
  function meanLab(mount, resetBtn) {
    const names = ['爸爸', '妈妈', '小明', '小红'];
    const base = [6, 4, 2, 4];
    const SCALE = 10;
    let v = [...base];

    mount.innerHTML = `<div id="mc"></div>
      <div class="lab-bars" id="mb"></div>
      <div class="lab-readout" id="mr" aria-live="polite"></div>`;

    const cfg = names.map((n, i) => ({ label: n, min: 0, max: SCALE, step: 1, value: base[i] }));
    setupControls(mount.querySelector('#mc'), cfg);

    function draw() {
      const m = mean(v);
      const top = Math.max(...v, 1);
      mount.querySelector('#mb').innerHTML = v.map((x, i) => `
        <div class="lab-col">
          <b class="lab-val">${x}</b>
          <div class="lab-track"><i style="height:${Math.max(2, x / SCALE * 100)}%"></i></div>
          <small>${names[i]}</small>
        </div>`).join('');

      const total = K.sum(v);
      const maxName = names[v.indexOf(Math.max(...v))];
      mount.querySelector('#mr').innerHTML = `
        总共 ${total} 杯，分给 ${v.length} 个人 → 平均数 <strong>${(total / v.length).toFixed(2)} 杯</strong><br>
        <small>目前喝得最多的是<strong>${maxName}</strong>（${Math.max(...v)} 杯）。${
          Math.max(...v) - Math.min(...v) > 5
            ? '大家差别很大，这个平均数其实谁都不像。'
            : '大家比较接近，平均数还挺有代表性。'}</small>`;
    }

    draw();
    readSliders(mount.querySelector('#mc'), v, draw);
    resetBtn?.addEventListener('click', () => {
      base.forEach((_, i) => v[i] = base[i]);
      setupControls(mount.querySelector('#mc'), base.map((x, i) => ({ ...cfg[i], value: x })));
      readSliders(mount.querySelector('#mc'), v, draw);
      draw();
    });
  }

  /* ======================================================== 中位数 */
  function medianLab(mount, resetBtn) {
    const names = ['小红', '小明', '小丽', '小强', '小华'];
    const base = [2, 3, 4, 5, 10];
    const SCALE = 20;
    let v = [...base];

    mount.innerHTML = `<div id="mc"></div>
      <div class="lab-bars" id="mb"></div>
      <div class="lab-readout" id="mr" aria-live="polite"></div>`;

    const cfg = names.map((n, i) => ({ label: n, min: 0, max: SCALE, step: 0.5, value: base[i] }));
    setupControls(mount.querySelector('#mc'), cfg);

    function draw() {
      const m = mean(v), md = median(v);
      const sorted = [...v].sort((a, b) => a - b);
      const midIdx = Math.floor(v.length / 2);
      mount.querySelector('#mb').innerHTML = v.map((x, i) => `
        <div class="lab-col">
          <b class="lab-val">${x}</b>
          <div class="lab-track"><i style="height:${Math.max(2, x / SCALE * 100)}%"></i></div>
          <small>${names[i]}</small>
        </div>`).join('');

      const gap = Math.abs(m - md);
      mount.querySelector('#mr').innerHTML = `
        从小到大排队：${sorted.map((x, i) =>
          i === midIdx ? `<strong class="mid-hit">${x}</strong>` : x).join(' &lt; ')}
        <br>
        平均数 <strong>${fmt(m)}</strong> · 中位数 <strong>${fmt(md)}</strong> · 两者相差 <strong>${fmt(gap)}</strong><br>
        <small>${gap < 0.6
          ? '两个数很接近 —— 说明数据比较均匀，没有明显的极端值。'
          : '差距这么大，是因为有个别数值离大家很远，把平均数拉走了；中位数仍然稳稳站在中间。'}</small>`;
    }

    draw();
    readSliders(mount.querySelector('#mc'), v, draw);
    resetBtn?.addEventListener('click', () => {
      base.forEach((_, i) => v[i] = base[i]);
      setupControls(mount.querySelector('#mc'), base.map((x, i) => ({ ...cfg[i], value: x })));
      readSliders(mount.querySelector('#mc'), v, draw);
      draw();
    });
  }

  /* ======================================================== 众数 */
  function modeLab(mount, resetBtn) {
    const cats = ['原味', '草莓', '巧克力', '抹茶', '香草'];
    const base = [2, 5, 3, 5, 1];
    let v = [...base];

    mount.innerHTML = `<div id="oc"></div>
      <div class="lab-bars" id="ob"></div>
      <div class="lab-readout" id="or" aria-live="polite"></div>`;

    const cfg = cats.map((c, i) => ({ label: c, min: 0, max: 10, value: base[i], suffix: ' 票' }));
    setupControls(mount.querySelector('#oc'), cfg);

    function draw() {
      const top = Math.max(...v, 1);
      const best = Math.max(...v);
      // 众数 = 得票最高的口味（可能并列）；全为 0 或全部并列则无众数
      const winners = best > 0 ? cats.filter((_, i) => v[i] === best) : [];
      const allTied = winners.length === cats.length;

      mount.querySelector('#ob').innerHTML = v.map((x, i) => `
        <div class="lab-col">
          <b class="lab-val">${x}</b>
          <div class="lab-track"><i class="${x === best && best > 0 && !allTied ? 'win' : ''}" style="height:${x / top * 100}%"></i></div>
          <small>${cats[i]}</small>
        </div>`).join('');

      const total = K.sum(v);
      let msg;
      if (total === 0) msg = '还没有人投票 —— 没有众数。';
      else if (allTied) msg = `每个口味都是 ${best} 票，谁都不比别人多 —— 这种情况<strong>没有众数</strong>。`;
      else if (winners.length === 1) msg = `<strong>众数是「${winners[0]}」</strong>，得到最多的 ${best} 票（共 ${total} 票）。`;
      else msg = `<strong>并列众数</strong>：「${winners.join('」「')}」都得到 ${best} 票，它们<strong>同时都是众数</strong>。`;
      mount.querySelector('#or').innerHTML = msg +
        `<br><small>众数关心的是"哪一类最多"，所以它能用在口味、颜色这种不能相加的类别上。</small>`;
    }

    draw();
    readSliders(mount.querySelector('#oc'), v, draw);
    resetBtn?.addEventListener('click', () => {
      base.forEach((_, i) => v[i] = base[i]);
      setupControls(mount.querySelector('#oc'), base.map((x, i) => ({ ...cfg[i], value: x })));
      readSliders(mount.querySelector('#oc'), v, draw);
      draw();
    });
  }

  /* ======================================================== 波动 */
  function spreadLab(mount, resetBtn) {
    const SCALE = 100;
    const A = [80, 80, 80, 80, 80];
    const B = [60, 70, 100, 90, 80];
    const a0 = [...A], b0 = [...B];

    const cfg = [
      ...A.map((x, i) => ({ label: `A${i + 1}`, min: 0, max: 100, value: x })),
      ...B.map((x, i) => ({ label: `B${i + 1}`, min: 0, max: 100, value: x }))
    ];

    mount.innerHTML = `<div id="sc"></div>
      <div class="lab-dots">
        <div class="lab-dot-block">
          <h4><i class="tag-a"></i>A 组</h4>
          <div class="dot-stage" id="sa"></div>
        </div>
        <div class="lab-dot-block">
          <h4><i class="tag-b"></i>B 组</h4>
          <div class="dot-stage" id="sb"></div>
        </div>
      </div>
      <div class="stat-pair" id="sr" aria-live="polite"></div>`;

    setupControls(mount.querySelector('#sc'), cfg);

    function stage(el, arr, cls, m) {
      // 横轴 = 分数，纵向做少量错位避免重叠；竖线 = 该组平均数
      el.innerHTML = arr.map((x, i) => `
        <div class="dot ${cls}" title="${x} 分"
             style="left:${clamp(x / SCALE * 100, 0, 100)}%;bottom:${18 + (i % 4) * 20}%"></div>`).join('')
        + `<div class="dot-mean ${cls === 'dot-group-b' ? 'b' : ''}" style="left:${clamp(m / SCALE * 100, 0, 100)}%"></div>`
        + `<span class="axis-min">0 分</span><span class="axis-max">100 分</span>`;
    }

    function draw() {
      const ma = mean(A), mb = mean(B);
      stage(mount.querySelector('#sa'), A, '', ma);
      stage(mount.querySelector('#sb'), B, 'dot-group-b', mb);
      mount.querySelector('#sr').innerHTML = `
        <div class="stat-box"><h4>A 组 · 很稳定</h4><b>${fmt(ma)}</b>
          <small>平均分 ${fmt(ma)} · 标准差 ${fmt(sd(A), 1)} · 极差 ${fmt(range(A), 0)}</small></div>
        <div class="stat-box"><h4>B 组 · 起伏大</h4><b>${fmt(mb)}</b>
          <small>平均分 ${fmt(mb)} · 标准差 ${fmt(sd(B), 1)} · 极差 ${fmt(range(B), 0)}</small></div>`;
    }

    function syncFromInputs() {
      const vals = [...mount.querySelectorAll('#sc input')].map(i => +i.value);
      vals.forEach((x, i) => { if (i < 5) A[i] = x; else B[i - 5] = x; });
      draw();
    }

    draw();
    mount.querySelectorAll('#sc input').forEach(inp => {
      inp.addEventListener('input', e => {
        e.target.parentElement.querySelector('output').textContent = e.target.value;
        syncFromInputs();
      });
    });

    resetBtn?.addEventListener('click', () => {
      a0.forEach((x, i) => A[i] = x);
      b0.forEach((x, i) => B[i] = x);
      mount.querySelectorAll('#sc input').forEach((inp, i) => {
        inp.value = i < 5 ? a0[i] : b0[i - 5];
        inp.parentElement.querySelector('output').textContent = inp.value;
      });
      draw();
    });
  }

  /* ======================================================== 概率 · 抛硬币 */
  function probabilityLab(mount, resetBtn) {
    let heads = 0, tails = 0, history = [], busy = false;

    mount.innerHTML = `
      <div class="sim-controls">
        <button class="sim-btn primary" data-n="1">抛 1 次</button>
        <button class="sim-btn" data-n="10">抛 10 次</button>
        <button class="sim-btn" data-n="100">抛 100 次</button>
        <button class="sim-btn again" data-n="0">↺ 重新开始</button>
      </div>
      <div class="coin-stage">
        <div class="coin" id="coinEl">正</div>
        <div class="tally">
          <div>正面次数<b id="hc">0</b></div>
          <div>反面次数<b id="tc">0</b></div>
          <div>正面比例<b id="pc">—</b></div>
        </div>
      </div>
      <div class="spark">
        <div id="sparkSvg"></div>
        <p class="spark-cap">横轴：抛掷次数 · 纵轴：正面所占比例 · 虚线：理论值 50%</p>
      </div>
      <div class="law-note" id="lawNote">先抛几次试试。抛的次数很少时，比例会很跳。</div>`;

    const coinEl = mount.querySelector('#coinEl');

    function chart() {
      const W = 600, H = 150, pad = 14;
      if (history.length < 2) { mount.querySelector('#sparkSvg').innerHTML = ''; return; }
      const step = (W - pad * 2) / Math.max(history.length - 1, 1);
      const y = p => H - pad - p * (H - pad * 2);
      const pts = history.map((p, i) => `${(pad + i * step).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
      mount.querySelector('#sparkSvg').innerHTML = svg(W, H, `
        <line x1="${pad}" y1="${y(.5)}" x2="${W - pad}" y2="${y(.5)}" stroke="#e58768" stroke-width="2" stroke-dasharray="7 6"/>
        <text x="${W - pad}" y="${y(.5) - 7}" text-anchor="end" font-size="12" fill="#b8543a">50%</text>
        <polyline points="${pts}" fill="none" stroke="#197b72" stroke-width="2.5" stroke-linejoin="round"/>
        <text x="${pad}" y="${y(1) - 4}" font-size="12" fill="#6c7f7d">100%</text>
        <text x="${pad}" y="${y(0) + 12}" font-size="12" fill="#6c7f7d">0%</text>`);
    }

    function upd() {
      const tot = heads + tails;
      mount.querySelector('#hc').textContent = heads;
      mount.querySelector('#tc').textContent = tails;
      const p = tot ? heads / tot : 0.5;
      mount.querySelector('#pc').textContent = tot ? `${(p * 100).toFixed(1)}%` : '—';
      const note = mount.querySelector('#lawNote');
      if (!tot) note.innerHTML = '先抛几次试试。抛的次数很少时，比例会很跳。';
      else if (tot < 30) note.innerHTML = `只抛了 ${tot} 次，比例 ${(p * 100).toFixed(0)}% 离 50% 还很远 —— 这很正常，<strong>样本太小</strong>。`;
      else if (tot < 200) note.innerHTML = `已经 ${tot} 次，比例 ${(p * 100).toFixed(1)}%，开始向 50% 靠拢了。`;
      else note.innerHTML = `抛了 ${tot} 次，比例是 ${(p * 100).toFixed(1)}%，非常接近理论值 50%。这就是<strong>大数定律</strong>。`;
      chart();
    }

    function flip(n) {
      if (busy) return;
      busy = true;
      let i = 0;
      const tick = () => {
        const isHead = Math.random() < 0.5;
        isHead ? heads++ : tails++;
        history.push(heads / (heads + tails));
        coinEl.textContent = isHead ? '正' : '反';
        coinEl.classList.remove('flip');
        void coinEl.offsetWidth;
        coinEl.classList.add('flip');
        upd();
        if (++i < n) setTimeout(tick, n > 30 ? 8 : 220);
        else busy = false;
      };
      tick();
    }

    mount.querySelectorAll('.sim-btn').forEach(b => b.addEventListener('click', () => {
      const n = +b.dataset.n;
      if (n === 0) { heads = tails = 0; history = []; coinEl.textContent = '正'; upd(); return; }
      flip(n);
    }));

    mount.querySelector('.again')?.addEventListener('click', () => {
      heads = tails = 0; history = []; coinEl.textContent = '正'; upd();
    });

    resetBtn?.addEventListener('click', () => {
      heads = tails = 0; history = []; coinEl.textContent = '正'; upd();
    });

    upd();
  }

  /* ======================================================== 期望值 */
  function expectationLab(mount, resetBtn) {
    const D = { price: 10, prize: 500, pct: 1 };
    const S = { ...D };

    mount.innerHTML = `<div id="ec"></div>
      <div class="expect-calc" id="er" aria-live="polite"></div>
      <div class="sim-controls">
        <button class="sim-btn primary" id="play500">模拟抽 500 次</button>
        <button class="sim-btn" id="playAgain">↺ 清空</button>
      </div>
      <div class="lab-readout" id="esim"></div>`;

    const cfg = [
      { label: '票价', min: 1, max: 50, value: D.price, suffix: ' 元' },
      { label: '中奖奖金', min: 10, max: 1000, step: 10, value: D.prize, suffix: ' 元' },
      { label: '中奖概率', min: 0.1, max: 20, step: 0.1, value: D.pct, suffix: ' %', format: v => (+v).toFixed(1) }
    ];
    setupControls(mount.querySelector('#ec'), cfg);

    function ev() {
      const p = S.pct / 100;
      const win = S.prize - S.price, lose = -S.price;
      return { p, win, lose, value: win * p + lose * (1 - p) };
    }

    function draw() {
      const { p, win, lose, value } = ev();
      mount.querySelector('#er').innerHTML = `
        <div class="ec-row"><span>中奖</span><b>${win >= 0 ? '+' : ''}${win} 元</b><i>× ${(p * 100).toFixed(1)}%</i><strong>= ${(win * p).toFixed(2)}</strong></div>
        <div class="ec-row"><span>没中</span><b>${lose} 元</b><i>× ${((1 - p) * 100).toFixed(1)}%</i><strong>= ${(lose * (1 - p)).toFixed(2)}</strong></div>
        <div class="ec-total"><span>期望值</span><strong class="${value >= 0 ? 'pos' : 'neg'}">${value >= 0 ? '+' : ''}${value.toFixed(2)} 元 / 每次</strong></div>`;
      const box = mount.querySelector('#esim');
      box.innerHTML = value >= 0
        ? `这个游戏的期望值是<strong>正的</strong>：长期玩每次平均赚 ${value.toFixed(2)} 元。`
        : `这个游戏的期望值是<strong>负的</strong>：长期玩每次平均亏 ${Math.abs(value).toFixed(2)} 元。庄家就是靠这个赚钱的。`;
    }

    function simulate() {
      const { p } = ev();
      let total = 0, wins = 0;
      for (let i = 0; i < 500; i++) {
        if (Math.random() < p) { total += S.prize - S.price; wins++; }
        else total -= S.price;
      }
      mount.querySelector('#esim').innerHTML = `
        抽了 500 次：中奖 <b>${wins}</b> 次，总收支 <b class="${total >= 0 ? 'pos' : 'neg'}">${total >= 0 ? '+' : ''}${total} 元</b>，
        平均每次 <b class="${total >= 0 ? 'pos' : 'neg'}">${(total / 500).toFixed(2)} 元</b>。<br>
        <small>多按几次，平均值会稳定靠近上面的期望值。</small>`;
    }

    mount.querySelector('#play500').addEventListener('click', simulate);
    mount.querySelector('#playAgain').addEventListener('click', draw);

    readSliders(mount.querySelector('#ec'), [S.price, S.prize, S.pct], () => {
      const inp = mount.querySelectorAll('#ec input');
      S.price = +inp[0].value; S.prize = +inp[1].value; S.pct = +inp[2].value;
      draw();
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      const inp = mount.querySelectorAll('#ec input');
      [S.price, S.prize, S.pct].forEach((v, i) => {
        inp[i].value = v;
        const c = cfg[i];
        inp[i].parentElement.querySelector('output').textContent =
          (c.format ? c.format(v) : v) + (c.suffix || '');
      });
      draw();
    });

    draw();
  }

  /* ======================================================== 正态分布 */
  function normalLab(mount, resetBtn) {
    const D = { mu: 170, sigma: 8 };
    const S = { ...D };

    mount.innerHTML = `<div id="nc"></div>
      <div class="nd-chart" id="nchart"></div>
      <div class="stat-pair" id="nr" aria-live="polite"></div>`;

    const cfg = [
      { label: '平均数（中心位置）', min: 120, max: 220, value: D.mu, suffix: ' cm' },
      { label: '标准差（曲线胖瘦）', min: 1, max: 30, value: D.sigma, suffix: ' cm' }
    ];
    setupControls(mount.querySelector('#nc'), cfg);

    const pdf = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));

    function draw() {
      const { mu, sigma } = S;
      const W = 620, H = 260, padX = 16, base = H - 34;
      const lo = mu - 4 * sigma, hi = mu + 4 * sigma;
      const peak = pdf(mu, mu, sigma);
      const X = x => padX + (x - lo) / (hi - lo) * (W - padX * 2);
      const Y = y => base - (y / peak) * (base - 20);

      let curve = '', area = '';
      for (let i = 0; i <= 160; i++) {
        const x = lo + (hi - lo) * i / 160;
        curve += `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(pdf(x, mu, sigma)).toFixed(2)}`;
      }
      for (let i = 0; i <= 80; i++) {
        const x = (mu - sigma) + (2 * sigma) * i / 80;
        area += `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(pdf(x, mu, sigma)).toFixed(2)}`;
      }
      area += `L${X(mu + sigma)},${base}L${X(mu - sigma)},${base}Z`;

      const ticks = [mu - 3 * sigma, mu - 2 * sigma, mu - sigma, mu, mu + sigma, mu + 2 * sigma, mu + 3 * sigma];
      mount.querySelector('#nchart').innerHTML = svg(W, H, `
        <path d="${area}" fill="#197b7222"/>
        <path d="${curve}" fill="none" stroke="#197b72" stroke-width="3"/>
        <line x1="${padX}" y1="${base}" x2="${W - padX}" y2="${base}" stroke="#dbe7e1" stroke-width="2"/>
        <line x1="${X(mu)}" y1="14" x2="${X(mu)}" y2="${base}" stroke="#125d59" stroke-width="1.5" stroke-dasharray="4 5" opacity=".55"/>
        ${ticks.map(t => `
          <line x1="${X(t)}" y1="${base}" x2="${X(t)}" y2="${base + 6}" stroke="#9fb3ad" stroke-width="1.5"/>
          <text x="${X(t)}" y="${base + 21}" text-anchor="middle" font-size="11" fill="#6c7f7d">${Math.round(t)}</text>`).join('')}
        <text x="${X(mu)}" y="11" text-anchor="middle" font-size="12" fill="#125d59" font-weight="700">平均数 ${mu}</text>
        <text x="${(X(mu - sigma) + X(mu + sigma)) / 2}" y="32" text-anchor="middle" font-size="12" fill="#125d59">±1σ ≈ 68%</text>`);

      const s = S.sigma;
      mount.querySelector('#nr').innerHTML = `
        <div class="stat-box"><h4>约 68% 的人落在</h4><b>${mu - s} ～ ${mu + s}</b><small>平均数 ±1 个标准差</small></div>
        <div class="stat-box"><h4>约 95% 的人落在</h4><b>${mu - 2 * s} ～ ${mu + 2 * s}</b><small>平均数 ±2 个标准差</small></div>`;
    }

    readSliders(mount.querySelector('#nc'), [S.mu, S.sigma], () => {
      const inp = mount.querySelectorAll('#nc input');
      S.mu = +inp[0].value; S.sigma = +inp[1].value;
      draw();
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      const inp = mount.querySelectorAll('#nc input');
      [S.mu, S.sigma].forEach((v, i) => {
        inp[i].value = v;
        inp[i].parentElement.querySelector('output').textContent = v + cfg[i].suffix;
      });
      draw();
    });

    draw();
  }

  /* ======================================================== 抽样 */
  function samplingLab(mount, resetBtn) {
    const TRUE_MU = 170, TRUE_SD = 12, POP = 6000;
    const population = Array.from({ length: POP }, () => {
      // Box-Muller 生成正态总体
      const u = Math.random() || 1e-9, v = Math.random();
      return TRUE_MU + TRUE_SD * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    });
    const realMu = mean(population);

    let n = 30, samples = [];

    mount.innerHTML = `<div id="pc"></div>
      <div class="sim-controls">
        <button class="sim-btn primary" id="one">抽 1 次</button>
        <button class="sim-btn" id="many">抽 200 次</button>
        <button class="sim-btn" id="clear">↺ 清空</button>
      </div>
      <div class="lab-dots"><div class="lab-dot-block">
        <h4>每次抽样的"样本平均数"</h4>
        <div class="dot-stage wide" id="stage"></div>
      </div></div>
      <div class="stat-pair" id="sr" aria-live="polite"></div>`;

    const cfg = [{ label: '每次抽多少人（样本量）', min: 5, max: 300, step: 5, value: n, suffix: ' 人' }];
    setupControls(mount.querySelector('#pc'), cfg);

    function drawSample() {
      let s = 0;
      for (let i = 0; i < n; i++) s += population[(Math.random() * POP) | 0];
      // 纵向位置一次生成后固定，避免每次重绘都乱跳
      samples.push({ m: s / n, jitter: 22 + Math.random() * 56 });
      if (samples.length > 400) samples.shift();
    }

    function draw() {
      const lo = realMu - 30, hi = realMu + 30;
      const se = TRUE_SD / Math.sqrt(n);
      mount.querySelector('#stage').innerHTML =
        samples.map(s => `<div class="dot ${Math.abs(s.m - realMu) > 2 * se ? 'dot-far' : ''}"
            title="${fmt(s.m, 2)} cm"
            style="left:${clamp((s.m - lo) / (hi - lo) * 100, 0, 100)}%;bottom:${s.jitter}%"></div>`).join('')
        + `<div class="dot-mean" style="left:${clamp((realMu - lo) / (hi - lo) * 100, 0, 100)}%"></div>`
        + `<span class="axis-min">${fmt(lo, 0)} cm</span><span class="axis-max">${fmt(hi, 0)} cm</span>`;

      const sm = samples.length ? mean(samples.map(s => s.m)) : null;
      mount.querySelector('#sr').innerHTML = `
        <div class="stat-box"><h4>总体真相（竖线位置）</h4><b>${fmt(realMu)} cm</b><small>样本量 ${n} · 理论标准误 ${fmt(se, 2)} cm</small></div>
        <div class="stat-box"><h4>${samples.length} 次抽样的平均</h4><b>${sm === null ? '—' : fmt(sm)} cm</b>
          <small>${sm === null ? '还没抽样' : `与真相相差 ${fmt(Math.abs(sm - realMu), 2)} cm`}</small></div>`;
    }

    mount.querySelector('#one').addEventListener('click', () => { drawSample(); draw(); });
    mount.querySelector('#many').addEventListener('click', () => {
      for (let i = 0; i < 200; i++) drawSample();
      draw();
    });
    mount.querySelector('#clear').addEventListener('click', () => { samples = []; draw(); });

    readSliders(mount.querySelector('#pc'), [n], () => {
      n = +mount.querySelector('#pc input').value;
      samples = [];
      draw();
    });

    resetBtn?.addEventListener('click', () => {
      n = 30; samples = [];
      const inp = mount.querySelector('#pc input');
      inp.value = 30; inp.parentElement.querySelector('output').textContent = '30 人';
      draw();
    });

    for (let i = 0; i < 40; i++) drawSample();
    draw();
  }

  /* ======================================================== 随机游走 */
  function randomwalkLab(mount, resetBtn) {
    const D = { paths: 12, steps: 100 };
    const S = { ...D };

    mount.innerHTML = `<div id="rc"></div>
      <div class="rw-chart" id="rwchart"></div>
      <div class="rw-chart small" id="rwhist"></div>
      <div class="lab-readout" id="rr" aria-live="polite"></div>`;

    const cfg = [
      { label: '路径条数', min: 1, max: 60, value: D.paths },
      { label: '每条走多少步', min: 10, max: 500, step: 10, value: D.steps }
    ];
    setupControls(mount.querySelector('#rc'), cfg);

    function walk(steps) {
      const pos = [0];
      let x = 0;
      for (let i = 0; i < steps; i++) { x += Math.random() < 0.5 ? 1 : -1; pos.push(x); }
      return pos;
    }

    function draw() {
      const { paths, steps } = S;
      const all = Array.from({ length: paths }, () => walk(steps));
      const finals = all.map(p => p[p.length - 1]);
      const span = Math.max(6, Math.max(...all.flat().map(Math.abs)));

      const W = 620, H = 250, pad = 18;
      const X = i => pad + i / steps * (W - pad * 2);
      const Y = v => H / 2 - v / span * (H / 2 - pad);

      const lines = all.map((p, pi) => `<polyline points="${p.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"
        fill="none" stroke="hsl(${(pi * 47 + 165) % 360} 52% 50%)" stroke-width="1.6" opacity=".72"/>`).join('');

      mount.querySelector('#rwchart').innerHTML = svg(W, H, `
        <line x1="${pad}" y1="${H / 2}" x2="${W - pad}" y2="${H / 2}" stroke="#dbe7e1" stroke-width="2"/>
        ${lines}
        <text x="${pad}" y="${H / 2 - 8}" font-size="11" fill="#9fb3ad">起点 0</text>
        <text x="${W - pad}" y="${H / 2 - 8}" text-anchor="end" font-size="11" fill="#9fb3ad">共 ${steps} 步</text>`);

      // 终点分布直方图
      const bins = 15;
      const lo = Math.min(...finals, -1), hi = Math.max(...finals, 1);
      const bw = Math.max(1, (hi - lo) / bins);
      const counts = new Array(bins).fill(0);
      finals.forEach(f => counts[clamp(Math.floor((f - lo) / bw), 0, bins - 1)]++);
      const top = Math.max(...counts, 1);
      const HW = 620, HH = 150, hp = 26;
      mount.querySelector('#rwhist').innerHTML = svg(HW, HH, `
        ${counts.map((c, i) => {
          const x = hp + i * (HW - hp * 2) / bins;
          const w = (HW - hp * 2) / bins - 3;
          const h = c / top * (HH - 46);
          return `<rect x="${x.toFixed(1)}" y="${(HH - 26 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="#58a992"/>`;
        }).join('')}
        <line x1="${hp}" y1="${HH - 26}" x2="${HW - hp}" y2="${HH - 26}" stroke="#dbe7e1" stroke-width="2"/>
        <text x="${hp}" y="${HH - 8}" font-size="11" fill="#6c7f7d">终点位置分布（越靠中间越多）</text>`);

      const avgDist = mean(finals.map(Math.abs));
      const theory = Math.sqrt(2 * steps / Math.PI);
      mount.querySelector('#rr').innerHTML = `
        ${paths} 条路径的平均终点离起点 <strong>${fmt(avgDist, 1)} 步</strong>，
        理论值约 <strong>${fmt(theory, 1)} 步</strong>（≈ √(2n/π)）。<br>
        <small>注意：距离不是随步数线性增长，而是随步数的<strong>平方根</strong>增长。步数变 4 倍，距离只变 2 倍。</small>`;
    }

    readSliders(mount.querySelector('#rc'), [S.paths, S.steps], () => {
      const inp = mount.querySelectorAll('#rc input');
      S.paths = +inp[0].value; S.steps = +inp[1].value;
      draw();
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      const inp = mount.querySelectorAll('#rc input');
      [S.paths, S.steps].forEach((v, i) => {
        inp[i].value = v;
        inp[i].parentElement.querySelector('output').textContent = v;
      });
      draw();
    });

    draw();
  }

  /* ======================================================== 贝叶斯医学检测 */
  function bayesTestLab(mount, resetBtn) {
    const D = { prev: 0.1, sens: 99, fpr: 5 }; // 患病率%、灵敏度%、假阳性率%
    const S = { ...D };

    mount.innerHTML = `<div id="bc"></div>
      <div class="bayes-visual" id="bv"></div>
      <div class="stat-pair" id="br" aria-live="polite"></div>`;

    const cfg = [
      { label: '患病率（先验概率）', min: 0.01, max: 50, step: 0.01, value: D.prev, suffix: ' %', format: v => v.toFixed(2) },
      { label: '真阳性率（灵敏度）', min: 50, max: 100, step: 0.5, value: D.sens, suffix: ' %', format: v => v.toFixed(1) },
      { label: '假阳性率', min: 0.1, max: 50, step: 0.1, value: D.fpr, suffix: ' %', format: v => v.toFixed(1) }
    ];
    setupControls(mount.querySelector('#bc'), cfg);

    function draw() {
      const p = S.prev / 100, sens = S.sens / 100, fpr = S.fpr / 100;
      const pPos = sens * p + fpr * (1 - p);
      const pDGivenPos = (sens * p) / pPos;

      // 可视化：1000 人的方块图
      const total = 1000;
      const sick = Math.round(total * p);
      const healthy = total - sick;
      const truePos = Math.round(sick * sens);
      const falsePos = Math.round(healthy * fpr);
      const totalPos = truePos + falsePos;

      mount.querySelector('#bv').innerHTML = `
        <div class="pop-grid">
          <div class="pop-bar sick" style="width:${p * 100}%">
            <span>${sick} 人生病</span>
            <div class="bar-part tp" style="height:${sens * 100}%">${truePos} 真阳性</div>
            <div class="bar-part fn" style="height:${(1 - sens) * 100}%">${sick - truePos} 假阴性</div>
          </div>
          <div class="pop-bar healthy" style="width:${(1 - p) * 100}%">
            <span>${healthy} 人健康</span>
            <div class="bar-part fp" style="height:${fpr * 100}%">${falsePos} 假阳性</div>
            <div class="bar-part tn" style="height:${(1 - fpr) * 100}%">${healthy - falsePos} 真阴性</div>
          </div>
        </div>
        <div class="pop-summary">
          总共 ${totalPos} 人检测阳性，其中 ${truePos} 人真的生病，${falsePos} 人是误报。
        </div>`;

      mount.querySelector('#br').innerHTML = `
        <div class="stat-box"><h4>检测阳性的总概率</h4><b>${(pPos * 100).toFixed(2)}%</b>
          <small>P(阳性) = ${sens.toFixed(2)}×${p.toFixed(4)} + ${fpr.toFixed(2)}×${(1 - p).toFixed(4)}</small></div>
        <div class="stat-box ${pDGivenPos > 0.5 ? 'warning' : ''}"><h4>阳性时真的生病概率</h4><b>${(pDGivenPos * 100).toFixed(2)}%</b>
          <small>P(生病|阳性) = ${(sens * p).toFixed(4)} / ${pPos.toFixed(4)}</small></div>`;
    }

    draw();
    mount.querySelectorAll('#bc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        [S.prev, S.sens, S.fpr] = [...mount.querySelectorAll('#bc input')].map((el, j) => +el.value);
        inp.parentElement.querySelector('output').textContent = cfg[i].format(+inp.value) + cfg[i].suffix;
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#bc input').forEach((inp, i) => {
        inp.value = [D.prev, D.sens, D.fpr][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format(+inp.value) + cfg[i].suffix;
      });
      draw();
    });
  }

  /* ======================================================== 韦恩图条件概率 */
  function vennConditionalLab(mount, resetBtn) {
    const D = { pA: 40, pB: 50, pAB: 20 };
    const S = { ...D };

    mount.innerHTML = `<div id="vc"></div>
      <div class="venn-stage" id="vs">
        <svg viewBox="0 0 300 200" id="vennSvg"></svg>
      </div>
      <div class="stat-pair" id="vr" aria-live="polite"></div>`;

    const cfg = [
      { label: 'P(A) 事件 A 的概率', min: 10, max: 90, value: D.pA, suffix: ' %' },
      { label: 'P(B) 事件 B 的概率', min: 10, max: 90, value: D.pB, suffix: ' %' },
      { label: 'P(A∩B) 同时发生的概率', min: 0, max: 50, value: D.pAB, suffix: ' %' }
    ];
    setupControls(mount.querySelector('#vc'), cfg);

    function draw() {
      const pA = S.pA / 100, pB = S.pB / 100, pAB = Math.min(S.pAB / 100, pA, pB);
      const pAGivenB = pAB / pB, pBGivenA = pAB / pA;

      // 简化韦恩图（用矩形近似）
      mount.querySelector('#vennSvg').innerHTML = `
        <rect x="20" y="20" width="${pA * 220}" height="160" fill="#197b7244" stroke="#197b72" stroke-width="2" rx="8"/>
        <text x="30" y="40" font-size="14" fill="#125d59" font-weight="700">A</text>
        <rect x="${280 - pB * 220}" y="20" width="${pB * 220}" height="160" fill="#e5876844" stroke="#e58768" stroke-width="2" rx="8"/>
        <text x="${270 - pB * 220}" y="40" font-size="14" fill="#b8543a" font-weight="700">B</text>
        <rect x="${150 - pAB * 110}" y="70" width="${pAB * 220}" height="60" fill="#f6d99199" stroke="#c7911c" stroke-width="3" rx="6"/>
        <text x="${150 - pAB * 110 + 10}" y="107" font-size="13" fill="#77643e" font-weight="700">A∩B</text>`;

      mount.querySelector('#vr').innerHTML = `
        <div class="stat-box"><h4>P(A|B) 已知 B 时 A 的概率</h4><b>${(pAGivenB * 100).toFixed(1)}%</b>
          <small>= P(A∩B) / P(B) = ${(pAB * 100).toFixed(0)}% / ${(pB * 100).toFixed(0)}%</small></div>
        <div class="stat-box"><h4>P(B|A) 已知 A 时 B 的概率</h4><b>${(pBGivenA * 100).toFixed(1)}%</b>
          <small>= P(A∩B) / P(A) = ${(pAB * 100).toFixed(0)}% / ${(pA * 100).toFixed(0)}%</small></div>`;
    }

    draw();
    mount.querySelectorAll('#vc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        [S.pA, S.pB, S.pAB] = [...mount.querySelectorAll('#vc input')].map(el => +el.value);
        S.pAB = Math.min(S.pAB, S.pA, S.pB); // 交集不能大于任一集合
        inp.parentElement.querySelector('output').textContent = +inp.value + cfg[i].suffix;
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#vc input').forEach((inp, i) => {
        inp.value = [D.pA, D.pB, D.pAB][i];
        inp.parentElement.querySelector('output').textContent = inp.value + cfg[i].suffix;
      });
      draw();
    });
  }

  /* ======================================================== 独立性检验 */
  function independenceCheckLab(mount, resetBtn) {
    const scenarios = [
      { name: '抛硬币两次', pA: 50, pB: 50, pAB: 25, indep: true },
      { name: '不放回抽牌', pA: 25, pB: 23.5, pAB: 5.88, indep: false },
      { name: '有放回抽牌', pA: 25, pB: 25, pAB: 6.25, indep: true }
    ];
    let current = 0;

    mount.innerHTML = `
      <div class="scenario-picker">
        ${scenarios.map((s, i) => `<button class="scenario-btn${i === 0 ? ' active' : ''}" data-i="${i}">${s.name}</button>`).join('')}
      </div>
      <div class="indep-check" id="ic"></div>`;

    function draw() {
      const s = scenarios[current];
      const pA = s.pA / 100, pB = s.pB / 100, pAB = s.pAB / 100;
      const product = pA * pB;
      const diff = Math.abs(pAB - product);
      const isIndep = diff < 0.001;

      mount.querySelector('#ic').innerHTML = `
        <div class="check-row">
          <div class="check-item"><h4>P(A)</h4><b>${s.pA}%</b></div>
          <div class="check-op">×</div>
          <div class="check-item"><h4>P(B)</h4><b>${s.pB}%</b></div>
          <div class="check-op">=</div>
          <div class="check-item"><h4>P(A)·P(B)</h4><b>${(product * 100).toFixed(2)}%</b></div>
        </div>
        <div class="check-row">
          <div class="check-item solo"><h4>P(A∩B) 实际值</h4><b>${s.pAB}%</b></div>
        </div>
        <div class="check-result ${isIndep ? 'indep' : 'dep'}">
          <span class="check-icon">${isIndep ? '✓' : '✗'}</span>
          <div>
            <strong>${isIndep ? 'A 和 B 独立' : 'A 和 B 不独立'}</strong>
            <p>${isIndep
              ? 'P(A∩B) = P(A)·P(B)，说明 B 的发生不改变 A 的概率。'
              : `P(A∩B) ≠ P(A)·P(B)（差 ${(diff * 100).toFixed(2)}%），说明 B 的发生会影响 A 的概率。`}</p>
          </div>
        </div>
        <p class="scenario-explain">${s.name === '抛硬币两次'
          ? '每次抛硬币都是独立的，第一次的结果不影响第二次。'
          : s.name === '不放回抽牌'
          ? '第一张抽走后，剩余 51 张牌的构成变了，第二张的概率受影响。'
          : '每次抽完放回，牌的构成不变，两次抽取独立。'}</p>`;
    }

    draw();
    mount.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        current = +btn.dataset.i;
        mount.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => {
      current = 0;
      mount.querySelectorAll('.scenario-btn').forEach((b, i) => {
        b.classList.toggle('active', i === 0);
      });
      draw();
    });
  }

  /* ======================================================== 二项分布 */
  function binomialDistLab(mount, resetBtn) {
    const D = { n: 10, p: 0.5 };
    const S = { ...D };

    mount.innerHTML = `<div id="bdc"></div>
      <div class="dist-chart" id="bdChart"></div>
      <div class="stat-pair" id="bdStats" aria-live="polite"></div>`;

    const cfg = [
      { label: 'n（试验次数）', min: 1, max: 50, step: 1, value: D.n },
      { label: 'p（成功概率）', min: 0.01, max: 0.99, step: 0.01, value: D.p, format: v => v.toFixed(2) }
    ];
    setupControls(mount.querySelector('#bdc'), cfg);

    // 组合数 C(n,k)
    function comb(n, k) {
      if (k > n || k < 0) return 0;
      if (k === 0 || k === n) return 1;
      k = Math.min(k, n - k);
      let c = 1;
      for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1);
      return c;
    }

    function binomialPMF(n, p, k) {
      return comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }

    function draw() {
      const n = Math.round(S.n), p = S.p;
      const probs = [];
      let maxP = 0;
      for (let k = 0; k <= n; k++) {
        const pk = binomialPMF(n, p, k);
        probs.push({ k, p: pk });
        maxP = Math.max(maxP, pk);
      }

      const W = 600, H = 200, padX = 40, padY = 30;
      const barW = Math.min(30, (W - padX * 2) / (n + 1));
      const yScale = (H - padY * 2) / maxP;

      const bars = probs.map(d => {
        const x = padX + d.k * barW;
        const h = d.p * yScale;
        return `<rect x="${x}" y="${H - padY - h}" width="${barW * 0.8}" height="${h}" 
          fill="${d.k === Math.round(n * p) ? '#197b72' : '#a8cec2'}" rx="2"/>
          <text x="${x + barW * 0.4}" y="${H - padY + 16}" text-anchor="middle" font-size="10" fill="#6c7f7d">${d.k}</text>`;
      }).join('');

      mount.querySelector('#bdChart').innerHTML = svg(W, H, `
        <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#dbe7e1" stroke-width="2"/>
        <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#6c7f7d">成功次数 k</text>
        <text x="10" y="20" font-size="11" fill="#6c7f7d">概率</text>
        ${bars}`);

      const exp = n * p, variance = n * p * (1 - p), sd = Math.sqrt(variance);
      mount.querySelector('#bdStats').innerHTML = `
        <div class="stat-box"><h4>期望值 E(X)</h4><b>${exp.toFixed(2)}</b>
          <small>= n·p = ${n}×${p.toFixed(2)}</small></div>
        <div class="stat-box"><h4>标准差 σ</h4><b>${sd.toFixed(2)}</b>
          <small>= √(n·p·(1-p)) = √${variance.toFixed(2)}</small></div>`;
    }

    draw();
    mount.querySelectorAll('#bdc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        S.n = +mount.querySelectorAll('#bdc input')[0].value;
        S.p = +mount.querySelectorAll('#bdc input')[1].value;
        const val = +inp.value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(val) : val;
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#bdc input').forEach((inp, i) => {
        inp.value = [D.n, D.p][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(inp.value) : inp.value;
      });
      draw();
    });
  }

  /* ======================================================== 泊松分布 */
  function poissonDistLab(mount, resetBtn) {
    const D = { lambda: 3 };
    const S = { ...D };

    mount.innerHTML = `<div id="pdc"></div>
      <div class="dist-chart" id="pdChart"></div>
      <div class="stat-pair" id="pdStats" aria-live="polite"></div>`;

    const cfg = [
      { label: 'λ（平均发生率）', min: 0.1, max: 20, step: 0.1, value: D.lambda, format: v => v.toFixed(1) }
    ];
    setupControls(mount.querySelector('#pdc'), cfg);

    function factorial(n) {
      if (n <= 1) return 1;
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    }

    function poissonPMF(lambda, k) {
      return Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k);
    }

    function draw() {
      const lambda = S.lambda;
      const maxK = Math.min(50, Math.ceil(lambda + 4 * Math.sqrt(lambda)));
      const probs = [];
      let maxP = 0;
      for (let k = 0; k <= maxK; k++) {
        const pk = poissonPMF(lambda, k);
        probs.push({ k, p: pk });
        maxP = Math.max(maxP, pk);
      }

      const W = 600, H = 200, padX = 40, padY = 30;
      const barW = Math.min(20, (W - padX * 2) / (maxK + 1));
      const yScale = (H - padY * 2) / maxP;

      const bars = probs.filter(d => d.p > 0.001).map(d => {
        const x = padX + d.k * barW;
        const h = d.p * yScale;
        return `<rect x="${x}" y="${H - padY - h}" width="${barW * 0.8}" height="${h}" 
          fill="${Math.abs(d.k - lambda) < 0.5 ? '#e58768' : '#f0c4b4'}" rx="2"/>
          ${d.k % Math.max(1, Math.floor(maxK / 15)) === 0 
            ? `<text x="${x + barW * 0.4}" y="${H - padY + 16}" text-anchor="middle" font-size="10" fill="#6c7f7d">${d.k}</text>` 
            : ''}`;
      }).join('');

      mount.querySelector('#pdChart').innerHTML = svg(W, H, `
        <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#dbe7e1" stroke-width="2"/>
        <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#6c7f7d">事件发生次数 k</text>
        ${bars}`);

      mount.querySelector('#pdStats').innerHTML = `
        <div class="stat-box"><h4>期望值 E(X)</h4><b>${lambda.toFixed(2)}</b>
          <small>泊松分布的期望 = λ</small></div>
        <div class="stat-box"><h4>标准差 σ</h4><b>${Math.sqrt(lambda).toFixed(2)}</b>
          <small>= √λ（期望 = 方差 = λ）</small></div>`;
    }

    draw();
    mount.querySelector('#pdc input').addEventListener('input', (e) => {
      S.lambda = +e.target.value;
      e.target.parentElement.querySelector('output').textContent = cfg[0].format(S.lambda);
      draw();
    });

    resetBtn?.addEventListener('click', () => {
      S.lambda = D.lambda;
      const inp = mount.querySelector('#pdc input');
      inp.value = D.lambda;
      inp.parentElement.querySelector('output').textContent = cfg[0].format(D.lambda);
      draw();
    });
  }

  /* ======================================================== 几何分布 */
  function geometricDistLab(mount, resetBtn) {
    const D = { p: 0.3 };
    const S = { ...D };

    mount.innerHTML = `<div id="gdc"></div>
      <div class="dist-chart" id="gdChart"></div>
      <div class="stat-pair" id="gdStats" aria-live="polite"></div>`;

    const cfg = [
      { label: 'p（单次成功概率）', min: 0.01, max: 0.99, step: 0.01, value: D.p, format: v => v.toFixed(2) }
    ];
    setupControls(mount.querySelector('#gdc'), cfg);

    function geometricPMF(p, k) {
      return Math.pow(1 - p, k - 1) * p;
    }

    function draw() {
      const p = S.p;
      const maxK = Math.min(50, Math.ceil(10 / p));
      const probs = [];
      let maxP = 0;
      for (let k = 1; k <= maxK; k++) {
        const pk = geometricPMF(p, k);
        probs.push({ k, p: pk });
        maxP = Math.max(maxP, pk);
      }

      const W = 600, H = 200, padX = 40, padY = 30;
      const barW = Math.min(25, (W - padX * 2) / maxK);
      const yScale = (H - padY * 2) / maxP;

      const exp = 1 / p;
      const bars = probs.map(d => {
        const x = padX + (d.k - 1) * barW;
        const h = d.p * yScale;
        return `<rect x="${x}" y="${H - padY - h}" width="${barW * 0.8}" height="${h}" 
          fill="${Math.abs(d.k - exp) < 1 ? '#f6d991' : '#f0dfb1'}" rx="2"/>
          ${d.k % Math.max(1, Math.floor(maxK / 12)) === 0 || d.k === 1
            ? `<text x="${x + barW * 0.4}" y="${H - padY + 16}" text-anchor="middle" font-size="10" fill="#6c7f7d">${d.k}</text>` 
            : ''}`;
      }).join('');

      mount.querySelector('#gdChart').innerHTML = svg(W, H, `
        <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#dbe7e1" stroke-width="2"/>
        <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#6c7f7d">第 k 次试验才成功</text>
        ${bars}`);

      const variance = (1 - p) / (p * p), sd = Math.sqrt(variance);
      mount.querySelector('#gdStats').innerHTML = `
        <div class="stat-box"><h4>期望等待次数</h4><b>${exp.toFixed(2)}</b>
          <small>= 1/p = 1/${p.toFixed(2)}</small></div>
        <div class="stat-box"><h4>标准差 σ</h4><b>${sd.toFixed(2)}</b>
          <small>= √((1-p)/p²) = √${variance.toFixed(2)}</small></div>`;
    }

    draw();
    mount.querySelector('#gdc input').addEventListener('input', (e) => {
      S.p = +e.target.value;
      e.target.parentElement.querySelector('output').textContent = cfg[0].format(S.p);
      draw();
    });

    resetBtn?.addEventListener('click', () => {
      S.p = D.p;
      const inp = mount.querySelector('#gdc input');
      inp.value = D.p;
      inp.parentElement.querySelector('output').textContent = cfg[0].format(D.p);
      draw();
    });
  }

  /* ======================================================== 分布对比 */
  function distCompareLab(mount, resetBtn) {
    const D = { n: 10, p: 0.5, lambda: 5, pGeom: 0.2 };
    const S = { ...D };

    mount.innerHTML = `<div id="dcc"></div>
      <div class="compare-dist-grid">
        <div class="compare-dist-item">
          <h4>二项分布 Binomial(n, p)</h4>
          <div class="mini-chart" id="cmpBinom"></div>
          <p class="mini-stat">期望：<strong id="expBinom"></strong></p>
        </div>
        <div class="compare-dist-item">
          <h4>泊松分布 Poisson(λ)</h4>
          <div class="mini-chart" id="cmpPoisson"></div>
          <p class="mini-stat">期望：<strong id="expPoisson"></strong></p>
        </div>
        <div class="compare-dist-item">
          <h4>几何分布 Geometric(p)</h4>
          <div class="mini-chart" id="cmpGeom"></div>
          <p class="mini-stat">期望：<strong id="expGeom"></strong></p>
        </div>
      </div>`;

    const cfg = [
      { label: '二项：n', min: 1, max: 30, value: D.n },
      { label: '二项：p', min: 0.01, max: 0.99, step: 0.01, value: D.p, format: v => v.toFixed(2) },
      { label: '泊松：λ', min: 0.5, max: 15, step: 0.5, value: D.lambda, format: v => v.toFixed(1) },
      { label: '几何：p', min: 0.05, max: 0.95, step: 0.01, value: D.pGeom, format: v => v.toFixed(2) }
    ];
    setupControls(mount.querySelector('#dcc'), cfg);

    function comb(n, k) {
      if (k > n || k < 0) return 0;
      if (k === 0 || k === n) return 1;
      k = Math.min(k, n - k);
      let c = 1;
      for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1);
      return c;
    }

    function factorial(n) {
      if (n <= 1) return 1;
      let f = 1;
      for (let i = 2; i <= n; i++) f *= i;
      return f;
    }

    function miniChart(container, probs, color) {
      const W = 180, H = 100, pad = 10;
      const maxP = Math.max(...probs.map(d => d.p), 0.01);
      const barW = Math.max(2, (W - pad * 2) / probs.length);
      const yScale = (H - pad * 2) / maxP;

      const bars = probs.map((d, i) => {
        const x = pad + i * barW;
        const h = d.p * yScale;
        return `<rect x="${x}" y="${H - pad - h}" width="${barW * 0.9}" height="${h}" fill="${color}" rx="1"/>`;
      }).join('');

      container.innerHTML = svg(W, H, `
        <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#e0e0e0" stroke-width="1"/>
        ${bars}`);
    }

    function draw() {
      const n = Math.round(S.n), p = S.p, lambda = S.lambda, pGeom = S.pGeom;

      // 二项分布
      const binomProbs = [];
      for (let k = 0; k <= n; k++) {
        binomProbs.push({ k, p: comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k) });
      }
      miniChart(mount.querySelector('#cmpBinom'), binomProbs, '#197b72');
      mount.querySelector('#expBinom').textContent = (n * p).toFixed(2);

      // 泊松分布
      const maxKP = Math.min(30, Math.ceil(lambda + 4 * Math.sqrt(lambda)));
      const poissonProbs = [];
      for (let k = 0; k <= maxKP; k++) {
        poissonProbs.push({ k, p: Math.pow(lambda, k) * Math.exp(-lambda) / factorial(k) });
      }
      miniChart(mount.querySelector('#cmpPoisson'), poissonProbs, '#e58768');
      mount.querySelector('#expPoisson').textContent = lambda.toFixed(2);

      // 几何分布
      const maxKG = Math.min(30, Math.ceil(10 / pGeom));
      const geomProbs = [];
      for (let k = 1; k <= maxKG; k++) {
        geomProbs.push({ k, p: Math.pow(1 - pGeom, k - 1) * pGeom });
      }
      miniChart(mount.querySelector('#cmpGeom'), geomProbs, '#f6d991');
      mount.querySelector('#expGeom').textContent = (1 / pGeom).toFixed(2);
    }

    draw();
    mount.querySelectorAll('#dcc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        [S.n, S.p, S.lambda, S.pGeom] = [...mount.querySelectorAll('#dcc input')].map(el => +el.value);
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(+inp.value) : inp.value;
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#dcc input').forEach((inp, i) => {
        inp.value = [D.n, D.p, D.lambda, D.pGeom][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(inp.value) : inp.value;
      });
      draw();
    });
  }

  /* ======================================================== PDF 与面积 */
  function pdfAreaLab(mount, resetBtn) {
    const D = { a: 2, b: 4 }; // 区间 [a, b]
    const S = { ...D };

    mount.innerHTML = `<div id="pac"></div>
      <div class="pdf-viz" id="pav"></div>
      <div class="stat-pair" id="paStats" aria-live="polite"></div>`;

    const cfg = [
      { label: '区间左端点 a', min: 0, max: 5, step: 0.1, value: D.a, format: v => v.toFixed(1) },
      { label: '区间右端点 b', min: 0, max: 6, step: 0.1, value: D.b, format: v => v.toFixed(1) }
    ];
    setupControls(mount.querySelector('#pac'), cfg);

    // 标准正态密度（μ=3, σ=1）
    function pdf(x) {
      const mu = 3, sigma = 1;
      return Math.exp(-Math.pow(x - mu, 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
    }

    function draw() {
      let a = Math.min(S.a, S.b), b = Math.max(S.a, S.b);
      const W = 600, H = 200, padX = 40, padY = 30;
      const xMin = 0, xMax = 6;
      const X = x => padX + ((x - xMin) / (xMax - xMin)) * (W - padX * 2);
      const Y = y => H - padY - y * (H - padY * 2) / 0.45;

      // 曲线路径
      const points = [];
      for (let x = xMin; x <= xMax; x += 0.05) points.push(`${X(x)},${Y(pdf(x))}`);
      const curvePath = `M${points.join(' L')}`;

      // 阴影面积
      const shadePts = [];
      for (let x = a; x <= b; x += 0.02) shadePts.push([X(x), Y(pdf(x))]);
      const shadePath = shadePts.length > 0
        ? `M${X(a)},${H - padY} L${shadePts.map(p => p.join(',')).join(' L')} L${X(b)},${H - padY} Z`
        : '';

      mount.querySelector('#pav').innerHTML = svg(W, H, `
        <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#dbe7e1" stroke-width="2"/>
        <path d="${shadePath}" fill="#197b7233" stroke="none"/>
        <path d="${curvePath}" fill="none" stroke="#197b72" stroke-width="2.5"/>
        <line x1="${X(a)}" y1="${padY}" x2="${X(a)}" y2="${H - padY}" stroke="#e58768" stroke-width="2" stroke-dasharray="5 3"/>
        <line x1="${X(b)}" y1="${padY}" x2="${X(b)}" y2="${H - padY}" stroke="#e58768" stroke-width="2" stroke-dasharray="5 3"/>
        <text x="${X(a)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#b8543a">${a.toFixed(1)}</text>
        <text x="${X(b)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#b8543a">${b.toFixed(1)}</text>
        <text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="#125d59" font-weight="600">正态分布 N(3, 1)</text>`);

      // 数值积分估计面积
      let area = 0, n = 200;
      for (let i = 0; i < n; i++) {
        const x = a + (b - a) * i / n;
        area += pdf(x) * (b - a) / n;
      }

      const width = b - a;
      mount.querySelector('#paStats').innerHTML = `
        <div class="stat-box"><h4>区间宽度</h4><b>${width.toFixed(2)}</b>
          <small>从 ${a.toFixed(1)} 到 ${b.toFixed(1)}</small></div>
        <div class="stat-box"><h4>P(a ≤ X ≤ b)</h4><b>${(area * 100).toFixed(1)}%</b>
          <small>曲线下方的阴影面积</small></div>`;
    }

    draw();
    mount.querySelectorAll('#pac input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        S.a = +mount.querySelectorAll('#pac input')[0].value;
        S.b = +mount.querySelectorAll('#pac input')[1].value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format(+inp.value);
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#pac input').forEach((inp, i) => {
        inp.value = [D.a, D.b][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format(inp.value);
      });
      draw();
    });
  }

  /* ======================================================== PDF 与 CDF 对应 */
  function pdfCdfLab(mount, resetBtn) {
    const D = { x: 3 };
    const S = { ...D };

    mount.innerHTML = `<div id="pcc"></div>
      <div class="dual-chart">
        <div class="chart-row">
          <h4>概率密度函数 PDF</h4>
          <div class="pdf-viz" id="pcPdf"></div>
        </div>
        <div class="chart-row">
          <h4>累积分布函数 CDF</h4>
          <div class="pdf-viz" id="pcCdf"></div>
        </div>
      </div>`;

    const cfg = [{ label: '观察位置 x', min: 0, max: 6, step: 0.1, value: D.x, format: v => v.toFixed(1) }];
    setupControls(mount.querySelector('#pcc'), cfg);

    function pdf(x) {
      const mu = 3, sigma = 1;
      return Math.exp(-Math.pow(x - mu, 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
    }

    function cdf(x) {
      // 数值积分
      let sum = 0, n = 100;
      for (let i = 0; i < n; i++) {
        const t = i / n * x;
        sum += pdf(t) * x / n;
      }
      return clamp(sum, 0, 1);
    }

    function draw() {
      const x = S.x;
      const W = 580, H = 140, padX = 40, padY = 20;
      const xMin = 0, xMax = 6;
      const X = v => padX + ((v - xMin) / (xMax - xMin)) * (W - padX * 2);
      const Ypdf = y => H - padY - y * (H - padY * 2) / 0.45;
      const Ycdf = y => H - padY - y * (H - padY * 2);

      // PDF
      const pdfPts = [];
      for (let v = xMin; v <= xMax; v += 0.05) pdfPts.push(`${X(v)},${Ypdf(pdf(v))}`);
      const shadePts = [];
      for (let v = xMin; v <= x; v += 0.02) shadePts.push([X(v), Ypdf(pdf(v))]);
      const shadePath = shadePts.length > 0
        ? `M${X(xMin)},${H - padY} L${shadePts.map(p => p.join(',')).join(' L')} L${X(x)},${H - padY} Z`
        : '';

      mount.querySelector('#pcPdf').innerHTML = svg(W, H, `
        <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#dbe7e1" stroke-width="2"/>
        <path d="${shadePath}" fill="#197b7233"/>
        <path d="M${pdfPts.join(' L')}" fill="none" stroke="#197b72" stroke-width="2"/>
        <line x1="${X(x)}" y1="${padY}" x2="${X(x)}" y2="${H - padY}" stroke="#e58768" stroke-width="2" stroke-dasharray="4 3"/>
        <text x="${X(x)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#b8543a">x=${x.toFixed(1)}</text>`);

      // CDF
      const cdfPts = [];
      for (let v = xMin; v <= xMax; v += 0.05) cdfPts.push(`${X(v)},${Ycdf(cdf(v))}`);

      mount.querySelector('#pcCdf').innerHTML = svg(W, H, `
        <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#dbe7e1" stroke-width="2"/>
        <line x1="${padX}" y1="${Ycdf(1)}" x2="${W - padX}" y2="${Ycdf(1)}" stroke="#dbe7e1" stroke-width="1" stroke-dasharray="3 3"/>
        <path d="M${cdfPts.join(' L')}" fill="none" stroke="#197b72" stroke-width="2.5"/>
        <line x1="${X(x)}" y1="${padY}" x2="${X(x)}" y2="${H - padY}" stroke="#e58768" stroke-width="2" stroke-dasharray="4 3"/>
        <circle cx="${X(x)}" cy="${Ycdf(cdf(x))}" r="5" fill="#e58768"/>
        <text x="${X(x)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#b8543a">F(${x.toFixed(1)})=${(cdf(x) * 100).toFixed(0)}%</text>
        <text x="${padX - 8}" y="${Ycdf(1) + 4}" text-anchor="end" font-size="10" fill="#6c7f7d">1.0</text>`);
    }

    draw();
    mount.querySelector('#pcc input').addEventListener('input', (e) => {
      S.x = +e.target.value;
      e.target.parentElement.querySelector('output').textContent = cfg[0].format(S.x);
      draw();
    });

    resetBtn?.addEventListener('click', () => {
      S.x = D.x;
      const inp = mount.querySelector('#pcc input');
      inp.value = D.x;
      inp.parentElement.querySelector('output').textContent = cfg[0].format(D.x);
      draw();
    });
  }

  /* ======================================================== 连续分布对比 */
  function contCompareLab(mount, resetBtn) {
    const types = ['uniform', 'exponential', 'normal'];
    let current = 0;
    const params = { uniform: { a: 1, b: 5 }, exponential: { lambda: 1 }, normal: { mu: 3, sigma: 1 } };

    mount.innerHTML = `
      <div class="dist-picker">
        <button class="dist-btn active" data-i="0">均匀分布</button>
        <button class="dist-btn" data-i="1">指数分布</button>
        <button class="dist-btn" data-i="2">正态分布</button>
      </div>
      <div id="ccc"></div>
      <div class="pdf-viz" id="ccChart"></div>
      <div class="stat-pair" id="ccStats" aria-live="polite"></div>`;

    function updateControls() {
      const type = types[current];
      let cfg = [];
      if (type === 'uniform') {
        cfg = [
          { label: '左端点 a', min: 0, max: 4, step: 0.5, value: params.uniform.a, format: v => v.toFixed(1) },
          { label: '右端点 b', min: 1, max: 6, step: 0.5, value: params.uniform.b, format: v => v.toFixed(1) }
        ];
      } else if (type === 'exponential') {
        cfg = [{ label: '速率 λ', min: 0.2, max: 3, step: 0.1, value: params.exponential.lambda, format: v => v.toFixed(1) }];
      } else {
        cfg = [
          { label: '均值 μ', min: 0, max: 6, step: 0.5, value: params.normal.mu, format: v => v.toFixed(1) },
          { label: '标准差 σ', min: 0.5, max: 2, step: 0.1, value: params.normal.sigma, format: v => v.toFixed(1) }
        ];
      }
      setupControls(mount.querySelector('#ccc'), cfg);
      mount.querySelectorAll('#ccc input').forEach((inp, i) => {
        inp.addEventListener('input', () => {
          if (type === 'uniform') {
            params.uniform.a = +mount.querySelectorAll('#ccc input')[0].value;
            params.uniform.b = +mount.querySelectorAll('#ccc input')[1].value;
          } else if (type === 'exponential') {
            params.exponential.lambda = +inp.value;
          } else {
            params.normal.mu = +mount.querySelectorAll('#ccc input')[0].value;
            params.normal.sigma = +mount.querySelectorAll('#ccc input')[1].value;
          }
          inp.parentElement.querySelector('output').textContent = cfg[i].format(+inp.value);
          draw();
        });
      });
    }

    function draw() {
      const type = types[current];
      const W = 600, H = 180, padX = 40, padY = 30;
      let xMin = 0, xMax = 6, yMax = 1;
      let pdf, exp, variance;

      if (type === 'uniform') {
        const { a, b } = params.uniform;
        const h = 1 / (b - a);
        pdf = x => (x >= a && x <= b) ? h : 0;
        exp = (a + b) / 2;
        variance = Math.pow(b - a, 2) / 12;
        yMax = Math.max(h * 1.2, 0.8);
      } else if (type === 'exponential') {
        const { lambda } = params.exponential;
        pdf = x => (x >= 0) ? lambda * Math.exp(-lambda * x) : 0;
        exp = 1 / lambda;
        variance = 1 / (lambda * lambda);
        yMax = lambda * 1.2;
      } else {
        const { mu, sigma } = params.normal;
        pdf = x => Math.exp(-Math.pow(x - mu, 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
        exp = mu;
        variance = sigma * sigma;
        yMax = pdf(mu) * 1.2;
      }

      const X = x => padX + ((x - xMin) / (xMax - xMin)) * (W - padX * 2);
      const Y = y => H - padY - (y / yMax) * (H - padY * 2);

      const pts = [];
      for (let x = xMin; x <= xMax; x += 0.05) pts.push(`${X(x)},${Y(pdf(x))}`);

      mount.querySelector('#ccChart').innerHTML = svg(W, H, `
        <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#dbe7e1" stroke-width="2"/>
        <path d="M${pts.join(' L')}" fill="none" stroke="#197b72" stroke-width="3"/>
        <line x1="${X(exp)}" y1="${padY}" x2="${X(exp)}" y2="${H - padY}" stroke="#e58768" stroke-width="2" stroke-dasharray="5 4"/>
        <text x="${X(exp)}" y="${padY - 6}" text-anchor="middle" font-size="11" fill="#b8543a">E(X)=${exp.toFixed(2)}</text>`);

      mount.querySelector('#ccStats').innerHTML = `
        <div class="stat-box"><h4>期望 E(X)</h4><b>${exp.toFixed(2)}</b></div>
        <div class="stat-box"><h4>方差 Var(X)</h4><b>${variance.toFixed(2)}</b>
          <small>标准差 σ = ${Math.sqrt(variance).toFixed(2)}</small></div>`;
    }

    updateControls();
    draw();

    mount.querySelectorAll('.dist-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        current = +btn.dataset.i;
        mount.querySelectorAll('.dist-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateControls();
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => {
      params.uniform = { a: 1, b: 5 };
      params.exponential = { lambda: 1 };
      params.normal = { mu: 3, sigma: 1 };
      updateControls();
      draw();
    });
  }

  /* ======================================================== 指数分布无记忆性 */
  function memorylessLab(mount, resetBtn) {
    const D = { waited: 0, lambda: 0.5 };
    const S = { ...D };

    mount.innerHTML = `<div id="mlc"></div>
      <div class="pdf-viz" id="mlChart"></div>
      <div class="memoryless-note" id="mlNote"></div>`;

    const cfg = [
      { label: '已等待时间 s', min: 0, max: 10, step: 0.5, value: D.waited, format: v => v.toFixed(1) },
      { label: '速率 λ', min: 0.2, max: 2, step: 0.1, value: D.lambda, format: v => v.toFixed(1) }
    ];
    setupControls(mount.querySelector('#mlc'), cfg);

    function draw() {
      const { waited, lambda } = S;
      const W = 600, H = 180, padX = 40, padY = 30;
      const xMax = 15;
      const X = x => padX + (x / xMax) * (W - padX * 2);
      const Y = y => H - padY - y * (H - padY * 2) / (lambda * 1.2);

      // 原始分布（从 0 开始）
      const origPts = [];
      for (let x = 0; x <= xMax; x += 0.1) origPts.push(`${X(x)},${Y(lambda * Math.exp(-lambda * x))}`);

      // 条件分布（从 waited 开始，形状相同）
      const condPts = [];
      for (let x = 0; x <= xMax - waited; x += 0.1) {
        condPts.push(`${X(waited + x)},${Y(lambda * Math.exp(-lambda * x))}`);
      }

      mount.querySelector('#mlChart').innerHTML = svg(W, H, `
        <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#dbe7e1" stroke-width="2"/>
        <path d="M${origPts.join(' L')}" fill="none" stroke="#a8cec2" stroke-width="2" stroke-dasharray="4 4"/>
        <path d="M${condPts.join(' L')}" fill="none" stroke="#197b72" stroke-width="3"/>
        <line x1="${X(waited)}" y1="${padY}" x2="${X(waited)}" y2="${H - padY}" stroke="#e58768" stroke-width="2" stroke-dasharray="5 3"/>
        <text x="${X(waited)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#b8543a">已等 ${waited.toFixed(1)}</text>
        <text x="${X(0)}" y="22" font-size="11" fill="#a8cec2">原始分布（虚线）</text>
        <text x="${X(waited + 2)}" y="22" font-size="11" fill="#125d59" font-weight="600">剩余等待时间分布（实线）</text>`);

      mount.querySelector('#mlNote').innerHTML = `
        <p><strong>无记忆性：</strong>已经等了 ${waited.toFixed(1)} 个单位时间，但剩余等待时间的分布（实线）与从头开始（虚线）<strong>形状完全相同</strong>。</p>
        <p class="muted">这意味着"已经等了多久"这个信息<strong>完全没用</strong>——过去不影响未来。只有指数分布有这个性质。</p>`;
    }

    draw();
    mount.querySelectorAll('#mlc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        S.waited = +mount.querySelectorAll('#mlc input')[0].value;
        S.lambda = +mount.querySelectorAll('#mlc input')[1].value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format(+inp.value);
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#mlc input').forEach((inp, i) => {
        inp.value = [D.waited, D.lambda][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format(inp.value);
      });
      draw();
    });
  }

  /* --------- 共享：相关性工具（第 13 课） --------- */
  // Box-Muller 标准正态
  function gauss() {
    const u = Math.random() || 1e-9, v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  // 生成目标相关系数为 rho 的点集
  function makeCorrelated(n, rho) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const z1 = gauss(), z2 = gauss();
      pts.push({ x: z1, y: rho * z1 + Math.sqrt(Math.max(0, 1 - rho * rho)) * z2 });
    }
    return pts;
  }
  function pearson(pts) {
    const n = pts.length;
    if (n < 2) return 0;
    const mx = pts.reduce((s, p) => s + p.x, 0) / n;
    const my = pts.reduce((s, p) => s + p.y, 0) / n;
    let cov = 0, vx = 0, vy = 0;
    pts.forEach(p => {
      const dx = p.x - mx, dy = p.y - my;
      cov += dx * dy; vx += dx * dx; vy += dy * dy;
    });
    if (vx === 0 || vy === 0) return 0;
    return cov / Math.sqrt(vx * vy);
  }
  // 把点集画成散点图，返回 svg 字符串
  function scatterSVG(pts, opts) {
    const o = opts || {};
    const W = o.W || 560, H = o.H || 260, pad = 34;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const xLo = o.xLo !== undefined ? o.xLo : Math.min(...xs, -1) - .4;
    const xHi = o.xHi !== undefined ? o.xHi : Math.max(...xs, 1) + .4;
    const yLo = o.yLo !== undefined ? o.yLo : Math.min(...ys, -1) - .4;
    const yHi = o.yHi !== undefined ? o.yHi : Math.max(...ys, 1) + .4;
    const X = v => pad + (v - xLo) / (xHi - xLo) * (W - pad * 2);
    const Y = v => H - pad - (v - yLo) / (yHi - yLo) * (H - pad * 2);

    const mx = xs.reduce((s, v) => s + v, 0) / pts.length;
    const my = ys.reduce((s, v) => s + v, 0) / pts.length;

    const dots = pts.map(p => {
      const cls = o.colorBy ? o.colorBy(p, mx, my) : '#197b72';
      const r = o.radiusBy ? o.radiusBy(p) : 4;
      return `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${r}" fill="${cls}" opacity=".78"/>`;
    }).join('');

    // 回归线（最小二乘）
    let fit = '';
    if (o.showFit) {
      let sxy = 0, sxx = 0;
      pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; });
      if (sxx > 0) {
        const b = sxy / sxx, a = my - b * mx;
        const x1 = xLo, x2 = xHi;
        fit = `<line x1="${X(x1)}" y1="${Y(a + b * x1)}" x2="${X(x2)}" y2="${Y(a + b * x2)}"
          stroke="#e58768" stroke-width="2.5" stroke-dasharray="7 5"/>`;
      }
    }

    const meanLines = o.showMeans ? `
      <line x1="${X(mx)}" y1="${pad}" x2="${X(mx)}" y2="${H - pad}" stroke="#9fb3ad" stroke-width="1.5" stroke-dasharray="4 4"/>
      <line x1="${pad}" y1="${Y(my)}" x2="${W - pad}" y2="${Y(my)}" stroke="#9fb3ad" stroke-width="1.5" stroke-dasharray="4 4"/>` : '';

    return svg(W, H, `
      <rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" fill="#fbfdfc" stroke="#dbe7e1"/>
      ${meanLines}${fit}${dots}
      <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6c7f7d">${o.xLabel || 'X'}</text>
      <text x="12" y="${H / 2}" font-size="11" fill="#6c7f7d" transform="rotate(-90 12 ${H / 2})" text-anchor="middle">${o.yLabel || 'Y'}</text>`);
  }
  function rhoWord(r) {
    const a = Math.abs(r);
    const dir = r > 0 ? '正' : '负';
    if (a < 0.1) return '几乎没有线性关系';
    if (a < 0.3) return `很弱的${dir}相关`;
    if (a < 0.5) return `较弱的${dir}相关`;
    if (a < 0.7) return `中等${dir}相关`;
    if (a < 0.9) return `较强的${dir}相关`;
    return `非常强的${dir}相关`;
  }

  /* ======================================================== 散点图与相关系数 */
  function correlationScatterLab(mount, resetBtn) {
    const D = { rho: 0.7, n: 120 };
    const S = { ...D };
    let pts = makeCorrelated(S.n, S.rho);

    mount.innerHTML = `<div id="csc"></div>
      <div class="pdf-viz" id="csChart"></div>
      <div class="stat-pair" id="csStats" aria-live="polite"></div>`;

    const cfg = [
      { label: '目标相关系数 ρ', min: -1, max: 1, step: 0.05, value: D.rho, format: v => (+v).toFixed(2) },
      { label: '样本点数 n', min: 10, max: 400, step: 10, value: D.n, suffix: ' 点' }
    ];
    setupControls(mount.querySelector('#csc'), cfg);

    function draw() {
      mount.querySelector('#csChart').innerHTML = scatterSVG(pts, {
        showFit: true, xLabel: 'X', yLabel: 'Y'
      });
      const r = pearson(pts);
      mount.querySelector('#csStats').innerHTML = `
        <div class="stat-box"><h4>设定的 ρ（理论值）</h4><b>${S.rho.toFixed(2)}</b>
          <small>生成数据时使用的参数</small></div>
        <div class="stat-box"><h4>样本相关系数 r</h4><b>${r.toFixed(3)}</b>
          <small>${rhoWord(r)} · 由 ${pts.length} 个点算出</small></div>`;
    }

    function regen() { pts = makeCorrelated(Math.round(S.n), S.rho); draw(); }

    regen();
    mount.querySelectorAll('#csc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#csc input')];
        S.rho = +all[0].value; S.n = +all[1].value;
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(+inp.value) : inp.value) + (c.suffix || '');
        regen();
      });
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#csc input').forEach((inp, i) => {
        inp.value = [D.rho, D.n][i];
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(inp.value) : inp.value) + (c.suffix || '');
      });
      regen();
    });
  }

  /* ======================================================== 协方差计算过程 */
  function covarianceCalcLab(mount, resetBtn) {
    const base = [
      { x: 2, y: 3 }, { x: 4, y: 6 }, { x: 5, y: 4 },
      { x: 7, y: 8 }, { x: 8, y: 7 }, { x: 9, y: 10 }
    ];
    let pts = base.map(p => ({ ...p }));

    mount.innerHTML = `
      <div class="pdf-viz" id="cvChart"></div>
      <div class="cov-quadrant">
        <span class="q-tag pos">右上 / 左下 → 正贡献</span>
        <span class="q-tag neg">左上 / 右下 → 负贡献</span>
      </div>
      <div class="table-wrap" id="cvTable"></div>
      <div class="stat-pair" id="cvStats" aria-live="polite"></div>`;

    function draw() {
      const n = pts.length;
      const mx = pts.reduce((s, p) => s + p.x, 0) / n;
      const my = pts.reduce((s, p) => s + p.y, 0) / n;

      mount.querySelector('#cvChart').innerHTML = scatterSVG(pts, {
        showMeans: true, xLo: 0, xHi: 11, yLo: 0, yHi: 12,
        radiusBy: () => 6,
        colorBy: (p) => ((p.x - mx) * (p.y - my) >= 0 ? '#197b72' : '#e58768'),
        xLabel: 'X（竖虚线为 X 的平均数）', yLabel: 'Y'
      });

      const rows = pts.map((p, i) => {
        const dx = p.x - mx, dy = p.y - my, prod = dx * dy;
        return [
          `${i + 1}`, p.x, p.y, dx.toFixed(2), dy.toFixed(2),
          `<strong class="${prod >= 0 ? 'pos' : 'neg'}">${prod >= 0 ? '+' : ''}${prod.toFixed(2)}</strong>`
        ];
      });
      mount.querySelector('#cvTable').innerHTML = `<table class="data-table">
        <thead><tr><th>#</th><th>X</th><th>Y</th><th>X−μₓ</th><th>Y−μᵧ</th><th>偏差乘积</th></tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

      const cov = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / n;
      const r = pearson(pts);
      mount.querySelector('#cvStats').innerHTML = `
        <div class="stat-box"><h4>协方差 Cov(X,Y)</h4><b>${cov.toFixed(2)}</b>
          <small>= 偏差乘积的平均 · μₓ=${mx.toFixed(2)}, μᵧ=${my.toFixed(2)}</small></div>
        <div class="stat-box"><h4>相关系数 r</h4><b>${r.toFixed(3)}</b>
          <small>把协方差除以两个标准差后的无量纲版本</small></div>`;
    }

    draw();
    resetBtn?.addEventListener('click', () => { pts = base.map(p => ({ ...p })); draw(); });
  }

  /* ======================================================== 离群值的影响 */
  function outlierEffectLab(mount, resetBtn) {
    const D = { ox: 9, oy: -7, on: 1 };
    const S = { ...D };
    // 固定一组几乎无相关的基础数据，便于观察离群值的破坏力
    const cloud = makeCorrelated(60, 0).map(p => ({ x: p.x, y: p.y }));

    mount.innerHTML = `<div id="oec"></div>
      <div class="pdf-viz" id="oeChart"></div>
      <div class="stat-pair" id="oeStats" aria-live="polite"></div>`;

    const cfg = [
      { label: '离群点位置 X', min: -10, max: 10, step: 0.5, value: D.ox, format: v => (+v).toFixed(1) },
      { label: '离群点位置 Y', min: -10, max: 10, step: 0.5, value: D.oy, format: v => (+v).toFixed(1) },
      { label: '离群点个数', min: 0, max: 5, step: 1, value: D.on, suffix: ' 个' }
    ];
    setupControls(mount.querySelector('#oec'), cfg);

    function draw() {
      const outliers = [];
      for (let i = 0; i < Math.round(S.on); i++) {
        outliers.push({ x: S.ox + (i ? (i % 2 ? .3 : -.3) * i : 0), y: S.oy, bad: true });
      }
      const all = [...cloud, ...outliers];

      mount.querySelector('#oeChart').innerHTML = scatterSVG(all, {
        showFit: true, xLo: -11, xHi: 11, yLo: -11, yHi: 11,
        colorBy: p => (p.bad ? '#e58768' : '#197b72'),
        radiusBy: p => (p.bad ? 8 : 4),
        xLabel: 'X', yLabel: 'Y'
      });

      const rClean = pearson(cloud);
      const rAll = pearson(all);
      const shift = rAll - rClean;
      mount.querySelector('#oeStats').innerHTML = `
        <div class="stat-box"><h4>不含离群点的 r</h4><b>${rClean.toFixed(3)}</b>
          <small>${cloud.length} 个正常点 · ${rhoWord(rClean)}</small></div>
        <div class="stat-box ${Math.abs(shift) > 0.2 ? 'warning' : ''}"><h4>加入离群点后的 r</h4><b>${rAll.toFixed(3)}</b>
          <small>变化 ${shift >= 0 ? '+' : ''}${shift.toFixed(3)} · ${rhoWord(rAll)}</small></div>`;
    }

    draw();
    mount.querySelectorAll('#oec input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#oec input')];
        S.ox = +all[0].value; S.oy = +all[1].value; S.on = +all[2].value;
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(+inp.value) : inp.value) + (c.suffix || '');
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#oec input').forEach((inp, i) => {
        inp.value = [D.ox, D.oy, D.on][i];
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(inp.value) : inp.value) + (c.suffix || '');
      });
      draw();
    });
  }

  /* ======================================================== ρ=0 但有强关系 */
  function nonlinearTrapLab(mount, resetBtn) {
    const shapes = [
      { name: '抛物线 Y = X²', gen: () => {
          const a = [];
          for (let i = 0; i < 140; i++) { const x = -1 + 2 * i / 139; a.push({ x, y: x * x }); }
          return a;
        }, note: 'Y 完全由 X 决定，但 r ≈ 0：因为左半边下降、右半边上升，正负贡献恰好抵消。' },
      { name: '圆环', gen: () => {
          const a = [];
          for (let i = 0; i < 160; i++) {
            const t = 2 * Math.PI * i / 160;
            a.push({ x: Math.cos(t), y: Math.sin(t) });
          }
          return a;
        }, note: '点被严格限制在一个圆上（关系极强），但没有任何线性趋势，r ≈ 0。' },
      { name: 'X 形交叉', gen: () => {
          const a = [];
          for (let i = 0; i < 80; i++) {
            const x = -1 + 2 * i / 79;
            a.push({ x, y: x }); a.push({ x, y: -x });
          }
          return a;
        }, note: '两条斜率相反的直线叠加，正相关与负相关互相抵消，r ≈ 0。' },
      { name: '对照：真正的线性', gen: () => makeCorrelated(140, 0.9),
        note: '这一组才是相关系数擅长描述的情形：明确的线性趋势，r 接近 0.9。' }
    ];
    let cur = 0;

    mount.innerHTML = `
      <div class="dist-picker">
        ${shapes.map((s, i) => `<button class="dist-btn${i === 0 ? ' active' : ''}" data-i="${i}">${s.name}</button>`).join('')}
      </div>
      <div class="pdf-viz" id="ntChart"></div>
      <div class="stat-pair" id="ntStats" aria-live="polite"></div>
      <div class="memoryless-note" id="ntNote"></div>`;

    function draw() {
      const s = shapes[cur];
      const pts = s.gen();
      mount.querySelector('#ntChart').innerHTML = scatterSVG(pts, { showFit: true, xLabel: 'X', yLabel: 'Y' });
      const r = pearson(pts);
      mount.querySelector('#ntStats').innerHTML = `
        <div class="stat-box"><h4>相关系数 r</h4><b>${r.toFixed(3)}</b>
          <small>${rhoWord(r)}</small></div>
        <div class="stat-box"><h4>实际关系强度</h4><b>${cur === 3 ? '线性且强' : '强（但非线性）'}</b>
          <small>${cur === 3 ? 'r 能如实反映' : 'r 完全测不出来'}</small></div>`;
      mount.querySelector('#ntNote').innerHTML =
        `<p>${s.note}</p><p class="muted">结论：<strong>永远先画散点图，再看相关系数。</strong></p>`;
    }

    draw();
    mount.querySelectorAll('.dist-btn').forEach(b => b.addEventListener('click', () => {
      cur = +b.dataset.i;
      mount.querySelectorAll('.dist-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      draw();
    }));

    resetBtn?.addEventListener('click', () => {
      cur = 0;
      mount.querySelectorAll('.dist-btn').forEach((x, i) => x.classList.toggle('active', i === 0));
      draw();
    });
  }

  /* ======================================================== CLT 演示 */
  function cltDemoLab(mount, resetBtn) {
    const pops = {
      uniform: { name: '均匀分布', gen: () => Math.random() },
      exponential: { name: '指数分布（极度右偏）', gen: () => -Math.log(Math.random()) },
      bimodal: { name: '双峰分布', gen: () => Math.random() < 0.5 ? gauss() - 2 : gauss() + 2 }
    };
    let popKey = 'exponential', n = 30, samples = [];

    mount.innerHTML = `
      <div class="dist-picker">
        ${Object.keys(pops).map((k, i) => `<button class="dist-btn${i === 1 ? ' active' : ''}" data-k="${k}">${pops[k].name}</button>`).join('')}
      </div>
      <div id="cltc"></div>
      <div class="dual-chart">
        <div class="chart-row"><h4>总体分布（偏斜的）</h4><div class="pdf-viz" id="cltPop"></div></div>
        <div class="chart-row"><h4>样本平均数的分布（接近正态）</h4><div class="pdf-viz" id="cltSample"></div></div>
      </div>`;

    const cfg = [{ label: '每次抽样大小 n', min: 2, max: 100, step: 1, value: n }];
    setupControls(mount.querySelector('#cltc'), cfg);

    function draw() {
      const pop = pops[popKey];
      // 画总体（随机生成 1000 个点）
      const popData = Array.from({ length: 1000 }, pop.gen);
      const popHist = histogram(popData, 30);
      mount.querySelector('#cltPop').innerHTML = histSVG(popHist, { color: '#a8cec2' });

      // 重新生成抽样分布
      samples = [];
      for (let i = 0; i < 500; i++) {
        let s = 0;
        for (let j = 0; j < n; j++) s += pop.gen();
        samples.push(s / n);
      }
      const sampHist = histogram(samples, 30);
      mount.querySelector('#cltSample').innerHTML = histSVG(sampHist, { color: '#197b72', showFit: true });
    }

    function histogram(data, bins) {
      const min = Math.min(...data), max = Math.max(...data), w = (max - min) / bins;
      const counts = Array(bins).fill(0);
      data.forEach(v => { const i = clamp(Math.floor((v - min) / w), 0, bins - 1); counts[i]++; });
      return counts.map((c, i) => ({ x: min + (i + 0.5) * w, y: c / data.length / w }));
    }

    function histSVG(hist, opts) {
      const W = 560, H = 140, pad = 30;
      const yMax = Math.max(...hist.map(h => h.y), 0.01) * 1.1;
      const xMin = Math.min(...hist.map(h => h.x)) - 0.5, xMax = Math.max(...hist.map(h => h.x)) + 0.5;
      const X = v => pad + (v - xMin) / (xMax - xMin) * (W - pad * 2);
      const Y = v => H - pad - v / yMax * (H - pad * 2);
      const bw = (xMax - xMin) / hist.length * (W - pad * 2) / (xMax - xMin);
      const bars = hist.map(h => `<rect x="${X(h.x) - bw / 2}" y="${Y(h.y)}" width="${bw}" height="${H - pad - Y(h.y)}" fill="${opts.color}" opacity=".8"/>`).join('');
      return svg(W, H, `<line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#dbe7e1" stroke-width="2"/>${bars}`);
    }

    draw();
    mount.querySelectorAll('.dist-btn').forEach(b => b.addEventListener('click', () => {
      popKey = b.dataset.k;
      mount.querySelectorAll('.dist-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      draw();
    }));

    mount.querySelector('#cltc input').addEventListener('input', e => {
      n = +e.target.value;
      e.target.parentElement.querySelector('output').textContent = n;
      draw();
    });

    resetBtn?.addEventListener('click', () => { popKey = 'exponential'; n = 30; mount.querySelector('#cltc input').value = 30; draw(); });
  }

  /* ======================================================== 标准误与 √n */
  function standardErrorLab(mount, resetBtn) {
    const D = { n: 100, sigma: 10 };
    const S = { ...D };

    mount.innerHTML = `<div id="sec"></div><div class="stat-pair" id="seStats"></div>`;
    const cfg = [
      { label: '样本量 n', min: 10, max: 1000, step: 10, value: D.n },
      { label: '总体标准差 σ', min: 1, max: 50, step: 1, value: D.sigma }
    ];
    setupControls(mount.querySelector('#sec'), cfg);

    function draw() {
      const se = S.sigma / Math.sqrt(S.n);
      const halfSE = S.sigma / Math.sqrt(S.n * 4);
      mount.querySelector('#seStats').innerHTML = `
        <div class="stat-box"><h4>当前标准误 SE</h4><b>${se.toFixed(3)}</b>
          <small>σ/√n = ${S.sigma}/√${S.n}</small></div>
        <div class="stat-box"><h4>如果样本 4 倍（${S.n * 4}）</h4><b>${halfSE.toFixed(3)}</b>
          <small>标准误减半：${se.toFixed(3)} → ${halfSE.toFixed(3)}</small></div>`;
    }

    draw();
    mount.querySelectorAll('#sec input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        [S.n, S.sigma] = [...mount.querySelectorAll('#sec input')].map(el => +el.value);
        inp.parentElement.querySelector('output').textContent = inp.value;
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => { Object.assign(S, D); draw(); });
  }

  /* ======================================================== 置信区间构造 */
  function ciBuilderLab(mount, resetBtn) {
    const D = { xbar: 52, sigma: 10, n: 100, level: 95 };
    const S = { ...D };

    mount.innerHTML = `<div id="cic"></div><div class="pdf-viz" id="ciChart"></div><div class="stat-pair" id="ciStats"></div>`;
    const cfg = [
      { label: '样本均值 x̄', min: 40, max: 65, step: 0.5, value: D.xbar, format: v => v.toFixed(1) },
      { label: '总体标准差 σ', min: 1, max: 30, step: 1, value: D.sigma },
      { label: '样本量 n', min: 10, max: 500, step: 10, value: D.n },
      { label: '置信水平 %', min: 80, max: 99, step: 1, value: D.level, suffix: ' %' }
    ];
    setupControls(mount.querySelector('#cic'), cfg);

    function draw() {
      const z = S.level === 90 ? 1.645 : S.level === 95 ? 1.96 : S.level === 99 ? 2.576 : 1.96;
      const se = S.sigma / Math.sqrt(S.n);
      const margin = z * se;
      const lo = S.xbar - margin, hi = S.xbar + margin;

      const W = 560, H = 100, pad = 40;
      const xMin = Math.max(0, lo - margin), xMax = hi + margin;
      const X = v => pad + (v - xMin) / (xMax - xMin) * (W - pad * 2);

      mount.querySelector('#ciChart').innerHTML = svg(W, H, `
        <line x1="${pad}" y1="${H / 2}" x2="${W - pad}" y2="${H / 2}" stroke="#dbe7e1" stroke-width="2"/>
        <rect x="${X(lo)}" y="${H / 2 - 8}" width="${X(hi) - X(lo)}" height="16" fill="#197b7244" stroke="#197b72" stroke-width="2" rx="4"/>
        <line x1="${X(S.xbar)}" y1="10" x2="${X(S.xbar)}" y2="${H - 10}" stroke="#e58768" stroke-width="3"/>
        <text x="${X(S.xbar)}" y="24" text-anchor="middle" font-size="12" fill="#b8543a" font-weight="600">x̄=${S.xbar.toFixed(1)}</text>
        <text x="${X(lo)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#125d59">${lo.toFixed(2)}</text>
        <text x="${X(hi)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="#125d59">${hi.toFixed(2)}</text>`);

      mount.querySelector('#ciStats').innerHTML = `
        <div class="stat-box"><h4>${S.level}% 置信区间</h4><b>[${lo.toFixed(2)}, ${hi.toFixed(2)}]</b>
          <small>宽度 ${(hi - lo).toFixed(2)} = 2 × ${z.toFixed(3)} × ${se.toFixed(3)}</small></div>
        <div class="stat-box"><h4>误差范围</h4><b>±${margin.toFixed(2)}</b>
          <small>临界值 ${z.toFixed(3)} × 标准误 ${se.toFixed(3)}</small></div>`;
    }

    draw();
    mount.querySelectorAll('#cic input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        [S.xbar, S.sigma, S.n, S.level] = [...mount.querySelectorAll('#cic input')].map(el => +el.value);
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent = (c.format ? c.format(+inp.value) : inp.value) + (c.suffix || '');
        draw();
      });
    });

    resetBtn?.addEventListener('click', () => { Object.assign(S, D); draw(); });
  }

  /* ======================================================== 95% 覆盖演示 */
  function ciCoverageLab(mount, resetBtn) {
    const trueMu = 100, sigma = 15, n = 50, trials = 100;
    let intervals = [];

    mount.innerHTML = `<button class="sim-btn primary" id="civRun">重新抽样 100 次</button>
      <div class="pdf-viz" id="civChart"></div><div class="stat-pair" id="civStats"></div>`;

    function run() {
      intervals = [];
      const z = 1.96, se = sigma / Math.sqrt(n);
      for (let i = 0; i < trials; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) sum += trueMu + sigma * gauss();
        const xbar = sum / n;
        const lo = xbar - z * se, hi = xbar + z * se;
        intervals.push({ lo, hi, hit: lo <= trueMu && trueMu <= hi });
      }
      draw();
    }

    function draw() {
      const hits = intervals.filter(iv => iv.hit).length;
      const W = 560, H = 400, pad = 40;
      const xMin = 70, xMax = 130;
      const X = v => pad + (v - xMin) / (xMax - xMin) * (W - pad * 2);
      const dy = (H - pad * 2) / trials;

      const lines = intervals.map((iv, i) => {
        const y = pad + i * dy;
        return `<line x1="${X(iv.lo)}" y1="${y}" x2="${X(iv.hi)}" y2="${y}"
          stroke="${iv.hit ? '#197b72' : '#e58768'}" stroke-width="2" opacity=".7"/>`;
      }).join('');

      mount.querySelector('#civChart').innerHTML = svg(W, H, `
        <line x1="${X(trueMu)}" y1="${pad}" x2="${X(trueMu)}" y2="${H - pad}" stroke="#125d59" stroke-width="3" stroke-dasharray="6 4"/>
        <text x="${X(trueMu)}" y="22" text-anchor="middle" font-size="12" fill="#125d59" font-weight="700">真值 μ=${trueMu}</text>
        ${lines}`);

      mount.querySelector('#civStats').innerHTML = `
        <div class="stat-box"><h4>命中真值的区间</h4><b>${hits} / ${trials}</b>
          <small>${(hits / trials * 100).toFixed(1)}% · 期望约 95%</small></div>
        <div class="stat-box ${hits < 90 || hits > 99 ? 'warning' : ''}"><h4>未命中（红色）</h4><b>${trials - hits}</b>
          <small>这些区间"打偏了"</small></div>`;
    }

    run();
    mount.querySelector('#civRun').addEventListener('click', run);
    resetBtn?.addEventListener('click', run);
  }

  /* --------- 共享：正态分布工具（第 15 课） --------- */
  // 误差函数近似（Abramowitz-Stegun 7.1.26，最大误差 1.5e-7）
  function erf(x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  function normCdf(z) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
  function normPdf(z) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); }
  // 标准正态分位数（Acklam 近似）
  function invNorm(p) {
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425, ph = 1 - pl;
    let q, r;
    if (p < pl) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
             ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p <= ph) {
      q = p - 0.5; r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
             (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // t 分布双侧 p 值近似
  function tTwoSidedP(t, df) {
    const a = Math.abs(t);
    if (!isFinite(a) || df <= 0) return 1;
    let p = 2 * (1 - normCdf(a));
    if (df < 200) {
      const corr = 1 + (a * a + 1) / (4 * df) + (3 * a * a * a * a + a * a) / (96 * df * df);
      p = Math.min(1, p * Math.min(corr, 6));
    }
    return clamp(p, 0, 1);
  }
  // 统计功效
  function calcPower(d, n, alpha) {
    const zc = invNorm(1 - alpha / 2);
    const lambda = Math.abs(d) * Math.sqrt(n);
    return clamp(normCdf(lambda - zc) + normCdf(-lambda - zc), 0, 1);
  }

  /* ======================================================== p 值演示（精简版） */
  function pValueDemoLab(mount, resetBtn) {
    const D = { d: 0.5, n: 30, alpha: 0.05 };
    const S = { ...D };
    let runs = [];

    mount.innerHTML = `<div id="pvc"></div>
      <button class="sim-btn primary" id="pvRun">模拟 500 次实验</button>
      <div class="stat-pair" id="pvStats" aria-live="polite"></div>`;

    const cfg = [
      { label: '真实效应量 d', min: 0, max: 1.5, step: 0.05, value: D.d, format: v => (+v).toFixed(2) },
      { label: '样本量 n', min: 5, max: 200, step: 5, value: D.n },
      { label: '显著性水平 α', min: 0.01, max: 0.2, step: 0.01, value: D.alpha, format: v => (+v).toFixed(2) }
    ];
    setupControls(mount.querySelector('#pvc'), cfg);

    function runSim() {
      runs = [];
      const se = 1 / Math.sqrt(S.n);
      for (let i = 0; i < 500; i++) {
        const obs = S.d + gauss() * se;
        const t = obs / se;
        const p = tTwoSidedP(t, S.n - 1);
        runs.push({ p, sig: p <= S.alpha });
      }
      draw();
    }

    function draw() {
      const sigCount = runs.filter(r => r.sig).length;
      const power = calcPower(S.d, S.n, S.alpha);
      mount.querySelector('#pvStats').innerHTML = `
        <div class="stat-box"><h4>500 次中"显著"的次数</h4><b>${sigCount} / 500</b>
          <small>${(sigCount / 5).toFixed(1)}% · 理论功效 ${(power * 100).toFixed(1)}%</small></div>
        <div class="stat-box ${S.d === 0 ? 'warning' : ''}"><h4>${S.d === 0 ? '假阳性率' : '检出真效应'}</h4>
          <b>${(power * 100).toFixed(0)}%</b>
          <small>${S.d === 0 ? `理论上应为 ${(S.alpha * 100).toFixed(0)}%` : `n=${S.n}, d=${S.d.toFixed(2)}`}</small></div>`;
    }

    runSim();
    mount.querySelectorAll('#pvc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        [S.d, S.n, S.alpha] = [...mount.querySelectorAll('#pvc input')].map(el => +el.value);
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(+inp.value) : inp.value;
        runSim();
      });
    });
    mount.querySelector('#pvRun').addEventListener('click', runSim);
    resetBtn?.addEventListener('click', () => { Object.assign(S, D); runSim(); });
  }

  /* ======================================================== 两类错误 */
  function errorTradeoffLab(mount, resetBtn) {
    const D = { alpha: 0.05, d: 0.4, n: 64 };
    const S = { ...D };

    mount.innerHTML = `<div id="etc"></div><div class="stat-pair" id="etStats"></div>`;
    const cfg = [
      { label: '显著性水平 α', min: 0.01, max: 0.2, step: 0.01, value: D.alpha, format: v => (+v).toFixed(2) },
      { label: '真实效应量 d', min: 0.1, max: 1.2, step: 0.05, value: D.d, format: v => (+v).toFixed(2) },
      { label: '样本量 n', min: 10, max: 400, step: 5, value: D.n }
    ];
    setupControls(mount.querySelector('#etc'), cfg);

    function draw() {
      const beta = 1 - calcPower(S.d, S.n, S.alpha);
      const power = 1 - beta;
      mount.querySelector('#etStats').innerHTML = `
        <div class="stat-box warning"><h4>第一类错误 α</h4><b>${(S.alpha * 100).toFixed(0)}%</b>
          <small>假阳性：冤枉好人</small></div>
        <div class="stat-box"><h4>第二类错误 β</h4><b>${(beta * 100).toFixed(1)}%</b>
          <small>假阴性：放过坏人</small></div>
        <div class="stat-box"><h4>统计功效 1−β</h4><b>${(power * 100).toFixed(1)}%</b>
          <small>${power >= 0.8 ? '✓ 达标' : '低于 80%'}</small></div>`;
    }

    draw();
    mount.querySelectorAll('#etc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        [S.alpha, S.d, S.n] = [...mount.querySelectorAll('#etc input')].map(el => +el.value);
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(+inp.value) : inp.value;
        draw();
      });
    });
    resetBtn?.addEventListener('click', () => { Object.assign(S, D); draw(); });
  }

  /* ======================================================== p-hacking */
  function pHackingLab(mount, resetBtn) {
    let trials = [], studyNo = 0;
    mount.innerHTML = `
      <div class="ph-warn">⚠️ <strong>真实效应为 0</strong>（药物无效）。
        每次点击就多做一次实验，看看多久能挖出 p &lt; 0.05。</div>
      <div class="ph-actions">
        <button class="sim-btn primary" id="phOne">再做一次实验</button>
        <button class="sim-btn" id="phMany">一直做到显著为止</button>
        <button class="sim-btn" id="phClear">清空</button>
      </div>
      <div class="stat-pair" id="phStats"></div>
      <div class="memoryless-note" id="phNote"></div>`;

    function oneStudy() {
      studyNo++;
      const n = 20, se = 1 / Math.sqrt(n);
      const obs = 0 + gauss() * se;
      const t = obs / se;
      const p = tTwoSidedP(t, n - 1);
      trials.push({ no: studyNo, p, sig: p < 0.05 });
      draw();
      return p < 0.05;
    }

    function draw() {
      const sigCount = trials.filter(t => t.sig).length;
      const firstSig = trials.findIndex(t => t.sig);
      mount.querySelector('#phStats').innerHTML = `
        <div class="stat-box"><h4>已做实验</h4><b>${trials.length}</b>
          <small>真实效应 = 0</small></div>
        <div class="stat-box ${sigCount > 0 ? 'warning' : ''}"><h4>"显著"次数</h4><b>${sigCount}</b>
          <small>${trials.length ? (sigCount / trials.length * 100).toFixed(1) : '0'}%</small></div>`;
      mount.querySelector('#phNote').innerHTML = firstSig >= 0
        ? `<p>🎯 第 <strong>${firstSig + 1}</strong> 次就挖到了 p &lt; 0.05——而这个药<strong>完全无效</strong>！</p>
           <p class="muted">这就是 p-hacking。如果只报告这一次，就能发论文。</p>`
        : `<p>继续点，总会撞上一次 p &lt; 0.05（理论上每 20 次约 1 次）。</p>`;
    }

    draw();
    mount.querySelector('#phOne').addEventListener('click', oneStudy);
    mount.querySelector('#phMany').addEventListener('click', () => {
      for (let i = 0; i < 200; i++) if (oneStudy()) break;
    });
    const clear = () => { trials = []; studyNo = 0; draw(); };
    mount.querySelector('#phClear').addEventListener('click', clear);
    resetBtn?.addEventListener('click', clear);
  }

  /* ======================================================== 功效分析 */
  function powerAnalysisLab(mount, resetBtn) {
    const D = { d: 0.3, alpha: 0.05 };
    const S = { ...D };

    mount.innerHTML = `<div id="pac2"></div><div class="stat-pair" id="paStats"></div>
      <div class="memoryless-note" id="paNote"></div>`;

    const cfg = [
      { label: '真实效应量 d', min: 0.1, max: 1, step: 0.05, value: D.d, format: v => (+v).toFixed(2) },
      { label: '显著性水平 α', min: 0.01, max: 0.2, step: 0.01, value: D.alpha, format: v => (+v).toFixed(2) }
    ];
    setupControls(mount.querySelector('#pac2'), cfg);

    function draw() {
      let need = null;
      for (let n = 5; n <= 400; n++) if (calcPower(S.d, n, S.alpha) >= 0.8) { need = n; break; }
      const p30 = calcPower(S.d, 30, S.alpha), p400 = calcPower(S.d, 400, S.alpha);
      mount.querySelector('#paStats').innerHTML = `
        <div class="stat-box"><h4>n=30 时功效</h4><b>${(p30 * 100).toFixed(1)}%</b>
          <small>${p30 < 0.5 ? '多半会漏掉' : '勉强能检出'}</small></div>
        <div class="stat-box"><h4>n=400 时功效</h4><b>${(p400 * 100).toFixed(1)}%</b>
          <small>${p400 > 0.95 ? '几乎必定检出' : '仍有风险'}</small></div>`;
      mount.querySelector('#paNote').innerHTML = need
        ? `<p><strong>达到 80% 功效需要 n = ${need}</strong>（d=${S.d.toFixed(2)}, α=${S.alpha}）。</p>
           <p class="muted">另一陷阱：n 极大时，微小效应也会"显著"。所以必须报告效应量。</p>`
        : `<p>即使 n=400 也达不到 80% 功效——效应太小了。</p>`;
    }

    draw();
    mount.querySelectorAll('#pac2 input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        [S.d, S.alpha] = [...mount.querySelectorAll('#pac2 input')].map(el => +el.value);
        inp.parentElement.querySelector('output').textContent = cfg[i].format(+inp.value);
        draw();
      });
    });
    resetBtn?.addEventListener('click', () => { Object.assign(S, D); draw(); });
  }

  /* --------- 共享：回归工具（第 16 课） --------- */
  function linFit(pts) {
    const n = pts.length;
    if (n < 2) return { a: 0, b: 0, r2: 0, sse: 0, sst: 0 };
    const mx = pts.reduce((s, p) => s + p.x, 0) / n;
    const my = pts.reduce((s, p) => s + p.y, 0) / n;
    let sxy = 0, sxx = 0, sst = 0;
    pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; sst += (p.y - my) ** 2; });
    const b = sxx === 0 ? 0 : sxy / sxx;
    const a = my - b * mx;
    let sse = 0;
    pts.forEach(p => { sse += (p.y - (a + b * p.x)) ** 2; });
    return { a, b, sse, sst, r2: sst === 0 ? 0 : 1 - sse / sst, mx, my };
  }
  // 带自定义直线的散点图，可显示残差竖线
  function regSVG(pts, line, opts) {
    const o = opts || {};
    const W = o.W || 560, H = o.H || 260, pad = 34;
    const xLo = o.xLo, xHi = o.xHi, yLo = o.yLo, yHi = o.yHi;
    const X = v => pad + (v - xLo) / (xHi - xLo) * (W - pad * 2);
    const Y = v => H - pad - (v - yLo) / (yHi - yLo) * (H - pad * 2);

    const resid = o.showResiduals ? pts.map(p => {
      const yh = line.a + line.b * p.x;
      return `<line x1="${X(p.x).toFixed(1)}" y1="${Y(p.y).toFixed(1)}" x2="${X(p.x).toFixed(1)}" y2="${Y(yh).toFixed(1)}"
        stroke="#e58768" stroke-width="1.5" opacity=".55"/>`;
    }).join('') : '';

    const dots = pts.map(p =>
      `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${o.radiusBy ? o.radiusBy(p) : 4.5}"
        fill="${o.colorBy ? o.colorBy(p) : '#197b72'}" opacity=".82"/>`).join('');

    const fitLine = `<line x1="${X(xLo)}" y1="${Y(line.a + line.b * xLo)}" x2="${X(xHi)}" y2="${Y(line.a + line.b * xHi)}"
      stroke="${o.lineColor || '#125d59'}" stroke-width="2.8"/>`;
    const refLine = o.refLine ? `<line x1="${X(xLo)}" y1="${Y(o.refLine.a + o.refLine.b * xLo)}"
      x2="${X(xHi)}" y2="${Y(o.refLine.a + o.refLine.b * xHi)}"
      stroke="#9fb3ad" stroke-width="2" stroke-dasharray="7 5"/>` : '';
    const meanLine = o.showMeanLine ? `<line x1="${X(xLo)}" y1="${Y(o.meanY)}" x2="${X(xHi)}" y2="${Y(o.meanY)}"
      stroke="#c7911c" stroke-width="1.6" stroke-dasharray="5 4"/>
      <text x="${X(xHi) - 4}" y="${Y(o.meanY) - 6}" text-anchor="end" font-size="10" fill="#8a7233">ȳ（不用 x 的笨办法）</text>` : '';

    return svg(W, H, `
      <rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" fill="#fbfdfc" stroke="#dbe7e1"/>
      ${meanLine}${refLine}${resid}${fitLine}${dots}
      <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6c7f7d">${o.xLabel || 'X'}</text>
      <text x="12" y="${H / 2}" font-size="11" fill="#6c7f7d" transform="rotate(-90 12 ${H / 2})" text-anchor="middle">${o.yLabel || 'Y'}</text>`);
  }

  /* ======================================================== 手动拟合 vs 最小二乘 */
  function fitLineLab(mount, resetBtn) {
    // 固定数据，便于反复比较
    const pts = [
      { x: 1, y: 2.6 }, { x: 2, y: 3.4 }, { x: 3, y: 5.1 }, { x: 4, y: 5.4 },
      { x: 5, y: 7.2 }, { x: 6, y: 7.5 }, { x: 7, y: 9.3 }, { x: 8, y: 9.6 }
    ];
    const best = linFit(pts);
    const D = { a: 1.0, b: 0.6 };
    const S = { ...D };

    mount.innerHTML = `<div id="flc"></div>
      <div class="pdf-viz" id="flChart"></div>
      <div class="stat-pair" id="flStats" aria-live="polite"></div>
      <div class="memoryless-note" id="flNote"></div>`;

    const cfg = [
      { label: '你的截距 a', min: -2, max: 6, step: 0.1, value: D.a, format: v => (+v).toFixed(1) },
      { label: '你的斜率 b', min: -0.5, max: 2.5, step: 0.05, value: D.b, format: v => (+v).toFixed(2) }
    ];
    setupControls(mount.querySelector('#flc'), cfg);

    function sseOf(a, b) { return pts.reduce((s, p) => s + (p.y - (a + b * p.x)) ** 2, 0); }

    function draw() {
      const mySSE = sseOf(S.a, S.b);
      mount.querySelector('#flChart').innerHTML = regSVG(pts, { a: S.a, b: S.b }, {
        xLo: 0, xHi: 9, yLo: 0, yHi: 12, showResiduals: true,
        refLine: { a: best.a, b: best.b }, lineColor: '#e58768',
        xLabel: 'X（橙色实线 = 你的直线，灰色虚线 = 最小二乘解）', yLabel: 'Y'
      });

      const gap = mySSE - best.sse;
      mount.querySelector('#flStats').innerHTML = `
        <div class="stat-box ${gap < 0.05 ? '' : 'warning'}"><h4>你的误差平方和 SSE</h4><b>${mySSE.toFixed(3)}</b>
          <small>ŷ = ${S.a.toFixed(1)} + ${S.b.toFixed(2)}x</small></div>
        <div class="stat-box"><h4>最小二乘解的 SSE</h4><b>${best.sse.toFixed(3)}</b>
          <small>ŷ = ${best.a.toFixed(3)} + ${best.b.toFixed(3)}x</small></div>`;

      mount.querySelector('#flNote').innerHTML = gap < 0.05
        ? `<p>🎯 非常接近最优解了！你的 SSE 只比最小值大 <strong>${gap.toFixed(4)}</strong>。</p>
           <p class="muted">最小二乘解是唯一的：任何其他直线的 SSE 都不可能更小。</p>`
        : `<p>你的 SSE 比最优解大 <strong>${gap.toFixed(3)}</strong>。继续调整两个滑块试试。</p>
           <p class="muted">橙色竖线是残差（每个点到你那条线的垂直距离）。最小二乘就是让这些线段的<strong>平方和</strong>最小。</p>`;
    }

    draw();
    mount.querySelectorAll('#flc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#flc input')];
        S.a = +all[0].value; S.b = +all[1].value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format(+inp.value);
        draw();
      });
    });
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#flc input').forEach((inp, i) => {
        inp.value = [D.a, D.b][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format(inp.value);
      });
      draw();
    });
  }

  /* ======================================================== R² 与噪声 */
  function r2DemoLab(mount, resetBtn) {
    const D = { noise: 1.2, slope: 1.5, n: 60 };
    const S = { ...D };
    let pts = [];

    mount.innerHTML = `<div id="r2c"></div>
      <div class="pdf-viz" id="r2Chart"></div>
      <div class="stat-pair" id="r2Stats" aria-live="polite"></div>
      <div class="memoryless-note" id="r2Note"></div>`;

    const cfg = [
      { label: '噪声大小', min: 0, max: 5, step: 0.1, value: D.noise, format: v => (+v).toFixed(1) },
      { label: '真实斜率', min: -2, max: 3, step: 0.1, value: D.slope, format: v => (+v).toFixed(1) },
      { label: '样本点数 n', min: 15, max: 200, step: 5, value: D.n }
    ];
    setupControls(mount.querySelector('#r2c'), cfg);

    function regen() {
      pts = [];
      for (let i = 0; i < Math.round(S.n); i++) {
        const x = Math.random() * 10;
        pts.push({ x, y: 2 + S.slope * x + gauss() * S.noise });
      }
      draw();
    }

    function draw() {
      const f = linFit(pts);
      const ys = pts.map(p => p.y);
      const yLo = Math.min(...ys) - 1, yHi = Math.max(...ys) + 1;
      mount.querySelector('#r2Chart').innerHTML = regSVG(pts, f, {
        xLo: -0.5, xHi: 10.5, yLo, yHi, showMeanLine: true, meanY: f.my,
        xLabel: 'X', yLabel: 'Y'
      });

      const r = Math.sign(f.b) * Math.sqrt(Math.max(0, f.r2));
      mount.querySelector('#r2Stats').innerHTML = `
        <div class="stat-box"><h4>判定系数 R²</h4><b>${(f.r2 * 100).toFixed(1)}%</b>
          <small>回归解释了 y 的 ${(f.r2 * 100).toFixed(1)}% 变异</small></div>
        <div class="stat-box"><h4>相关系数 r</h4><b>${r.toFixed(3)}</b>
          <small>验证 r² = ${(r * r).toFixed(3)} = R² ✓</small></div>
        <div class="stat-box"><h4>拟合方程</h4><b>${f.b.toFixed(2)}x ${f.a >= 0 ? '+' : '−'} ${Math.abs(f.a).toFixed(2)}</b>
          <small>真实斜率 ${S.slope.toFixed(1)}，估计 ${f.b.toFixed(2)}</small></div>`;

      mount.querySelector('#r2Note').innerHTML = `
        <p>SST（总变异）= <strong>${f.sst.toFixed(1)}</strong>，SSE（残差变异）= <strong>${f.sse.toFixed(1)}</strong>，
          回归解释掉的 SSR = <strong>${(f.sst - f.sse).toFixed(1)}</strong>。</p>
        <p class="muted">把噪声调到 0，R² 会接近 100%（点全落在直线上）；把噪声调大，点云散开，R² 骤降。
          注意：<strong>噪声不改变斜率的期望值</strong>，只降低我们对它的确信程度。</p>`;
    }

    regen();
    mount.querySelectorAll('#r2c input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#r2c input')];
        S.noise = +all[0].value; S.slope = +all[1].value; S.n = +all[2].value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(+inp.value) : inp.value;
        regen();
      });
    });
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#r2c input').forEach((inp, i) => {
        inp.value = [D.noise, D.slope, D.n][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(inp.value) : inp.value;
      });
      regen();
    });
  }

  /* ======================================================== 残差图诊断 */
  function residualPlotLab(mount, resetBtn) {
    const shapes = [
      { name: '① 良好（随机散布）', gen: () => {
          const a = [];
          for (let i = 0; i < 70; i++) { const x = Math.random() * 10; a.push({ x, y: 2 + 1.5 * x + gauss() * 1.5 }); }
          return a;
        }, verdict: '✅ 残差随机散布在 0 线上下，没有形状——线性模型合适。', ok: true },
      { name: '② 曲线关系', gen: () => {
          const a = [];
          for (let i = 0; i < 70; i++) { const x = Math.random() * 10; a.push({ x, y: 2 + 0.6 * x * x - 2 * x + gauss() * 1.2 }); }
          return a;
        }, verdict: '❌ 残差呈明显 U 形——真实关系是曲线，直线拟合错了。应加入 x² 项。', ok: false },
      { name: '③ 异方差（喇叭形）', gen: () => {
          const a = [];
          for (let i = 0; i < 70; i++) { const x = Math.random() * 10; a.push({ x, y: 2 + 1.5 * x + gauss() * (0.3 + 0.45 * x) }); }
          return a;
        }, verdict: '❌ 残差呈喇叭形，方差随 x 增大——违反等方差假设。可对 y 取对数。', ok: false },
      { name: '④ 含离群值', gen: () => {
          const a = [];
          for (let i = 0; i < 65; i++) { const x = Math.random() * 10; a.push({ x, y: 2 + 1.5 * x + gauss() * 1.2 }); }
          a.push({ x: 5, y: 28 }, { x: 6, y: -12 });
          return a;
        }, verdict: '❌ 有两个残差极大的孤立点——需检查是否为数据录入错误或特殊情况。', ok: false }
    ];
    let cur = 0, pts = shapes[0].gen();

    mount.innerHTML = `
      <div class="dist-picker">
        ${shapes.map((s, i) => `<button class="dist-btn${i === 0 ? ' active' : ''}" data-i="${i}">${s.name}</button>`).join('')}
      </div>
      <div class="dual-chart">
        <div class="chart-row"><h4>原始数据 + 回归线</h4><div class="pdf-viz" id="rpMain"></div></div>
        <div class="chart-row"><h4>残差图（横轴 x，纵轴 残差 e = y − ŷ）</h4><div class="pdf-viz" id="rpResid"></div></div>
      </div>
      <div class="stat-pair" id="rpStats" aria-live="polite"></div>
      <div class="memoryless-note" id="rpNote"></div>`;

    function draw() {
      const f = linFit(pts);
      const ys = pts.map(p => p.y);
      mount.querySelector('#rpMain').innerHTML = regSVG(pts, f, {
        H: 190, xLo: -0.5, xHi: 10.5, yLo: Math.min(...ys) - 2, yHi: Math.max(...ys) + 2,
        xLabel: 'X', yLabel: 'Y'
      });

      // 残差图
      const res = pts.map(p => ({ x: p.x, y: p.y - (f.a + f.b * p.x) }));
      const rAbs = Math.max(...res.map(p => Math.abs(p.y))) * 1.15 || 1;
      const W = 560, H = 190, pad = 34;
      const X = v => pad + (v + 0.5) / 11 * (W - pad * 2);
      const Y = v => H - pad - (v + rAbs) / (2 * rAbs) * (H - pad * 2);
      const dots = res.map(p =>
        `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="4.2"
          fill="${Math.abs(p.y) > rAbs * 0.65 ? '#e58768' : '#197b72'}" opacity=".8"/>`).join('');

      mount.querySelector('#rpResid').innerHTML = svg(W, H, `
        <rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" fill="#fbfdfc" stroke="#dbe7e1"/>
        <line x1="${pad}" y1="${Y(0)}" x2="${W - pad}" y2="${Y(0)}" stroke="#c7911c" stroke-width="2" stroke-dasharray="6 4"/>
        <text x="${W - pad - 4}" y="${Y(0) - 6}" text-anchor="end" font-size="10" fill="#8a7233">残差 = 0</text>
        ${dots}
        <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6c7f7d">X</text>`);

      const s = shapes[cur];
      mount.querySelector('#rpStats').innerHTML = `
        <div class="stat-box"><h4>判定系数 R²</h4><b>${(f.r2 * 100).toFixed(1)}%</b>
          <small>${!s.ok && f.r2 > 0.5 ? '⚠️ R² 不低，但模型仍有问题！' : '拟合优度指标'}</small></div>
        <div class="stat-box ${s.ok ? '' : 'warning'}"><h4>残差诊断</h4><b>${s.ok ? '通过' : '不通过'}</b>
          <small>${s.ok ? '可以使用该模型' : '需要修正模型'}</small></div>`;

      mount.querySelector('#rpNote').innerHTML = `<p>${s.verdict}</p>
        <p class="muted"><strong>关键教训：</strong>R² 看不出模型形态的问题，残差图能。永远两个都要看。</p>`;
    }

    draw();
    mount.querySelectorAll('.dist-btn').forEach(b => b.addEventListener('click', () => {
      cur = +b.dataset.i; pts = shapes[cur].gen();
      mount.querySelectorAll('.dist-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      draw();
    }));
    resetBtn?.addEventListener('click', () => {
      cur = 0; pts = shapes[0].gen();
      mount.querySelectorAll('.dist-btn').forEach((x, i) => x.classList.toggle('active', i === 0));
      draw();
    });
  }

  /* ======================================================== 离群值与杠杆 */
  function leverageLab(mount, resetBtn) {
    const D = { ox: 9.5, oy: 2 };
    const S = { ...D };
    // 固定基础点云
    const base = [];
    for (let i = 0; i < 40; i++) {
      const x = 1 + (i / 39) * 6;
      base.push({ x, y: 2 + 1.4 * x + gauss() * 1.1 });
    }

    mount.innerHTML = `<div id="lvc"></div>
      <div class="pdf-viz" id="lvChart"></div>
      <div class="stat-pair" id="lvStats" aria-live="polite"></div>
      <div class="memoryless-note" id="lvNote"></div>`;

    const cfg = [
      { label: '异常点的 X 位置', min: 1, max: 14, step: 0.25, value: D.ox, format: v => (+v).toFixed(2) },
      { label: '异常点的 Y 位置', min: -6, max: 26, step: 0.5, value: D.oy, format: v => (+v).toFixed(1) }
    ];
    setupControls(mount.querySelector('#lvc'), cfg);

    function draw() {
      const outlier = { x: S.ox, y: S.oy, bad: true };
      const all = [...base, outlier];
      const fClean = linFit(base);
      const fAll = linFit(all);

      // 杠杆值 h = 1/n + (x−x̄)²/Σ(x−x̄)²
      const n = all.length;
      const mx = all.reduce((s, p) => s + p.x, 0) / n;
      const sxx = all.reduce((s, p) => s + (p.x - mx) ** 2, 0);
      const lev = 1 / n + (outlier.x - mx) ** 2 / sxx;

      const ys = all.map(p => p.y);
      mount.querySelector('#lvChart').innerHTML = regSVG(all, fAll, {
        xLo: 0, xHi: 15, yLo: Math.min(...ys, 0) - 2, yHi: Math.max(...ys) + 2,
        refLine: { a: fClean.a, b: fClean.b },
        colorBy: p => (p.bad ? '#e58768' : '#197b72'),
        radiusBy: p => (p.bad ? 9 : 4),
        xLabel: 'X（实线 = 含异常点，灰虚线 = 不含异常点）', yLabel: 'Y'
      });

      const dSlope = fAll.b - fClean.b;
      mount.querySelector('#lvStats').innerHTML = `
        <div class="stat-box"><h4>不含异常点的斜率</h4><b>${fClean.b.toFixed(3)}</b>
          <small>R² = ${(fClean.r2 * 100).toFixed(1)}%</small></div>
        <div class="stat-box ${Math.abs(dSlope) > 0.15 ? 'warning' : ''}"><h4>含异常点的斜率</h4><b>${fAll.b.toFixed(3)}</b>
          <small>变化 ${dSlope >= 0 ? '+' : ''}${dSlope.toFixed(3)} · R² = ${(fAll.r2 * 100).toFixed(1)}%</small></div>
        <div class="stat-box ${lev > 0.2 ? 'warning' : ''}"><h4>杠杆值 h</h4><b>${lev.toFixed(3)}</b>
          <small>${lev > 0.2 ? '⚠️ 高杠杆点' : '杠杆较低'}（经验阈值 ≈ ${(4 / n).toFixed(3)}）</small></div>`;

      mount.querySelector('#lvNote').innerHTML = `
        <p>把异常点拖到<strong>横轴远端</strong>（X 接近 14），斜率会被强烈"撬动"；
           而把它留在 X 中间、只拉高 Y，对斜率的影响就小得多。</p>
        <p class="muted"><strong>杠杆</strong>取决于 x 离 x̄ 有多远，与 y 无关。
           高杠杆 + 大残差 = 强影响点（influential point），是回归诊断的重点对象。</p>`;
    }

    draw();
    mount.querySelectorAll('#lvc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#lvc input')];
        S.ox = +all[0].value; S.oy = +all[1].value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format(+inp.value);
        draw();
      });
    });
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#lvc input').forEach((inp, i) => {
        inp.value = [D.ox, D.oy][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format(inp.value);
      });
      draw();
    });
  }

  /* --------- 共享：马尔可夫工具（第 17 课） --------- */
  // 2×2 转移矩阵：p = P(晴→晴), q = P(雨→晴)
  function mkP(p, q) { return [[p, 1 - p], [q, 1 - q]]; }
  function matMul(A, B) {
    const n = A.length, m = B[0].length, k = B.length;
    const C = [];
    for (let i = 0; i < n; i++) {
      C[i] = [];
      for (let j = 0; j < m; j++) {
        let s = 0;
        for (let t = 0; t < k; t++) s += A[i][t] * B[t][j];
        C[i][j] = s;
      }
    }
    return C;
  }
  function matPow(A, n) {
    let R = A.map((r, i) => r.map((_, j) => (i === j ? 1 : 0))); // 单位阵
    for (let i = 0; i < n; i++) R = matMul(R, A);
    return R;
  }
  // 2 状态平稳分布：π₁ = q/(1−p+q)
  function stationary2(p, q) {
    const d = 1 - p + q;
    if (Math.abs(d) < 1e-12) return [0.5, 0.5];
    const p1 = q / d;
    return [clamp(p1, 0, 1), clamp(1 - p1, 0, 1)];
  }
  function matTable(M, labels, digits) {
    const d = digits === undefined ? 4 : digits;
    return `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>从 \\ 到</th>${labels.map(l => `<th>${l}</th>`).join('')}</tr></thead>
      <tbody>${M.map((row, i) => `<tr><td><strong>${labels[i]}</strong></td>${row.map(v =>
        `<td>${v.toFixed(d)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  /* ======================================================== 天气链模拟 */
  function markovWeatherLab(mount, resetBtn) {
    const D = { p: 0.8, q: 0.4, days: 120 };
    const S = { ...D };
    let seq = [];

    mount.innerHTML = `<div id="mwc"></div>
      <button class="sim-btn primary" id="mwRun">重新模拟</button>
      <div class="pdf-viz" id="mwChart"></div>
      <div class="stat-pair" id="mwStats" aria-live="polite"></div>`;

    const cfg = [
      { label: 'P(晴→晴)', min: 0.05, max: 0.95, step: 0.05, value: D.p, format: v => (+v).toFixed(2) },
      { label: 'P(雨→晴)', min: 0.05, max: 0.95, step: 0.05, value: D.q, format: v => (+v).toFixed(2) },
      { label: '模拟天数', min: 30, max: 400, step: 10, value: D.days, suffix: ' 天' }
    ];
    setupControls(mount.querySelector('#mwc'), cfg);

    function run() {
      seq = [];
      let st = 0; // 0=晴 1=雨
      for (let i = 0; i < Math.round(S.days); i++) {
        seq.push(st);
        const toSun = st === 0 ? S.p : S.q;
        st = Math.random() < toSun ? 0 : 1;
      }
      draw();
    }

    function draw() {
      const W = 580, H = 130, pad = 30;
      const n = seq.length;
      const bw = (W - pad * 2) / n;
      const bars = seq.map((s, i) =>
        `<rect x="${(pad + i * bw).toFixed(1)}" y="${s === 0 ? 34 : 74}" width="${Math.max(1, bw - 0.4).toFixed(1)}" height="36"
          fill="${s === 0 ? '#f6d991' : '#7fa8c4'}"/>`).join('');

      mount.querySelector('#mwChart').innerHTML = svg(W, H, `
        ${bars}
        <text x="${pad - 6}" y="56" text-anchor="end" font-size="11" fill="#8a7233">晴</text>
        <text x="${pad - 6}" y="96" text-anchor="end" font-size="11" fill="#4a7a99">雨</text>
        <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#6c7f7d">时间（每格一天，共 ${n} 天）</text>`);

      const sunny = seq.filter(s => s === 0).length;
      const pi = stationary2(S.p, S.q);
      mount.querySelector('#mwStats').innerHTML = `
        <div class="stat-box"><h4>实际晴天比例</h4><b>${(sunny / n * 100).toFixed(1)}%</b>
          <small>${sunny} / ${n} 天</small></div>
        <div class="stat-box"><h4>理论平稳分布 π₁</h4><b>${(pi[0] * 100).toFixed(1)}%</b>
          <small>π = q/(1−p+q) = ${S.q.toFixed(2)}/${(1 - S.p + S.q).toFixed(2)}</small></div>
        <div class="stat-box"><h4>偏差</h4><b>${Math.abs(sunny / n - pi[0]) * 100 < 5 ? '✓' : '±'}${(Math.abs(sunny / n - pi[0]) * 100).toFixed(1)}%</b>
          <small>天数越多偏差越小</small></div>`;
    }

    run();
    mount.querySelectorAll('#mwc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#mwc input')];
        S.p = +all[0].value; S.q = +all[1].value; S.days = +all[2].value;
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(+inp.value) : inp.value) + (c.suffix || '');
        run();
      });
    });
    mount.querySelector('#mwRun').addEventListener('click', run);
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#mwc input').forEach((inp, i) => {
        inp.value = [D.p, D.q, D.days][i];
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(inp.value) : inp.value) + (c.suffix || '');
      });
      run();
    });
  }

  /* ======================================================== 分布收敛 */
  function markovConvergeLab(mount, resetBtn) {
    const D = { p: 0.8, q: 0.4, init: 1, steps: 12 };
    const S = { ...D };

    mount.innerHTML = `<div id="mcc"></div>
      <div class="dist-picker">
        <button class="dist-btn active" data-v="1">从"晴"开始 (1,0)</button>
        <button class="dist-btn" data-v="0">从"雨"开始 (0,1)</button>
        <button class="dist-btn" data-v="0.5">各一半 (0.5,0.5)</button>
      </div>
      <div class="pdf-viz" id="mcChart"></div>
      <div class="stat-pair" id="mcStats" aria-live="polite"></div>`;

    const cfg = [
      { label: 'P(晴→晴)', min: 0.05, max: 0.95, step: 0.05, value: D.p, format: v => (+v).toFixed(2) },
      { label: 'P(雨→晴)', min: 0.05, max: 0.95, step: 0.05, value: D.q, format: v => (+v).toFixed(2) },
      { label: '演化步数', min: 3, max: 30, step: 1, value: D.steps, suffix: ' 步' }
    ];
    setupControls(mount.querySelector('#mcc'), cfg);

    function draw() {
      const P = mkP(S.p, S.q);
      const steps = Math.round(S.steps);
      let v = [S.init, 1 - S.init];
      const hist = [v.slice()];
      for (let i = 0; i < steps; i++) {
        v = [v[0] * P[0][0] + v[1] * P[1][0], v[0] * P[0][1] + v[1] * P[1][1]];
        hist.push(v.slice());
      }
      const pi = stationary2(S.p, S.q);

      const W = 580, H = 200, pad = 40;
      const X = i => pad + i / Math.max(1, steps) * (W - pad * 2);
      const Y = val => H - pad - val * (H - pad * 2);
      const line = hist.map((h, i) => `${X(i).toFixed(1)},${Y(h[0]).toFixed(1)}`).join(' L');
      const dots = hist.map((h, i) =>
        `<circle cx="${X(i).toFixed(1)}" cy="${Y(h[0]).toFixed(1)}" r="3.5" fill="#197b72"/>`).join('');

      mount.querySelector('#mcChart').innerHTML = svg(W, H, `
        <rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" fill="#fbfdfc" stroke="#dbe7e1"/>
        <line x1="${pad}" y1="${Y(pi[0])}" x2="${W - pad}" y2="${Y(pi[0])}" stroke="#e58768" stroke-width="2" stroke-dasharray="7 5"/>
        <text x="${W - pad - 4}" y="${Y(pi[0]) - 7}" text-anchor="end" font-size="11" fill="#b8543a">平稳分布 π₁ = ${pi[0].toFixed(4)}</text>
        <path d="M${line}" fill="none" stroke="#197b72" stroke-width="2.4"/>
        ${dots}
        <text x="${pad - 8}" y="${Y(1) + 4}" text-anchor="end" font-size="10" fill="#6c7f7d">1.0</text>
        <text x="${pad - 8}" y="${Y(0) + 4}" text-anchor="end" font-size="10" fill="#6c7f7d">0.0</text>
        <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6c7f7d">演化步数 n（纵轴 = 处于"晴"的概率）</text>`);

      const last = hist[hist.length - 1];
      mount.querySelector('#mcStats').innerHTML = `
        <div class="stat-box"><h4>初始分布</h4><b>(${hist[0][0].toFixed(2)}, ${hist[0][1].toFixed(2)})</b>
          <small>第 0 步</small></div>
        <div class="stat-box"><h4>第 ${steps} 步的分布</h4><b>(${last[0].toFixed(4)}, ${last[1].toFixed(4)})</b>
          <small>距离平稳 ${Math.abs(last[0] - pi[0]).toExponential(2)}</small></div>
        <div class="stat-box"><h4>平稳分布 π</h4><b>(${pi[0].toFixed(4)}, ${pi[1].toFixed(4)})</b>
          <small>与初始分布无关</small></div>`;
    }

    draw();
    mount.querySelectorAll('.dist-btn').forEach(b => b.addEventListener('click', () => {
      S.init = +b.dataset.v;
      mount.querySelectorAll('.dist-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      draw();
    }));
    mount.querySelectorAll('#mcc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#mcc input')];
        S.p = +all[0].value; S.q = +all[1].value; S.steps = +all[2].value;
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(+inp.value) : inp.value) + (c.suffix || '');
        draw();
      });
    });
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('.dist-btn').forEach((x, i) => x.classList.toggle('active', i === 0));
      mount.querySelectorAll('#mcc input').forEach((inp, i) => {
        inp.value = [D.p, D.q, D.steps][i];
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(inp.value) : inp.value) + (c.suffix || '');
      });
      draw();
    });
  }

  /* ======================================================== 转移矩阵的幂 */
  function markovPowerLab(mount, resetBtn) {
    const D = { p: 0.8, q: 0.4, n: 1 };
    const S = { ...D };

    mount.innerHTML = `<div id="mpc"></div>
      <div id="mpTables"></div>
      <div class="stat-pair" id="mpStats" aria-live="polite"></div>
      <div class="memoryless-note" id="mpNote"></div>`;

    const cfg = [
      { label: 'P(晴→晴)', min: 0.05, max: 0.95, step: 0.05, value: D.p, format: v => (+v).toFixed(2) },
      { label: 'P(雨→晴)', min: 0.05, max: 0.95, step: 0.05, value: D.q, format: v => (+v).toFixed(2) },
      { label: '幂次 n', min: 1, max: 40, step: 1, value: D.n }
    ];
    setupControls(mount.querySelector('#mpc'), cfg);

    function draw() {
      const P = mkP(S.p, S.q);
      const n = Math.round(S.n);
      const Pn = matPow(P, n);
      const pi = stationary2(S.p, S.q);
      const labels = ['晴', '雨'];

      mount.querySelector('#mpTables').innerHTML = `
        <h4 class="mat-title">原始转移矩阵 P</h4>${matTable(P, labels, 2)}
        <h4 class="mat-title">n 步转移矩阵 P<sup>${n}</sup></h4>${matTable(Pn, labels, 4)}`;

      // 两行之差衡量"是否已忘记初始状态"
      const gap = Math.abs(Pn[0][0] - Pn[1][0]);
      mount.querySelector('#mpStats').innerHTML = `
        <div class="stat-box"><h4>今天晴 → n 天后晴</h4><b>${(Pn[0][0] * 100).toFixed(2)}%</b>
          <small>P<sup>${n}</sup> 第一行</small></div>
        <div class="stat-box"><h4>今天雨 → n 天后晴</h4><b>${(Pn[1][0] * 100).toFixed(2)}%</b>
          <small>P<sup>${n}</sup> 第二行</small></div>
        <div class="stat-box ${gap < 0.01 ? '' : 'warning'}"><h4>两行之差</h4><b>${(gap * 100).toFixed(3)}%</b>
          <small>${gap < 0.001 ? '✓ 已完全"忘记"初始状态' : '初始状态仍有影响'}</small></div>`;

      mount.querySelector('#mpNote').innerHTML = `
        <p>平稳分布 π = (<strong>${pi[0].toFixed(4)}</strong>, ${pi[1].toFixed(4)})。
          把 n 调大，P<sup>n</sup> 的<strong>两行会越来越接近</strong>，最终都等于 π。</p>
        <p class="muted">这就是"初始状态被遗忘"的数学表现：无论从哪一行（哪个初始状态）出发，
          n 步后的分布都相同。收敛速度由第二大特征值 |λ₂| = |p − q| = ${Math.abs(S.p - S.q).toFixed(2)} 决定，它越小收敛越快。</p>`;
    }

    draw();
    mount.querySelectorAll('#mpc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#mpc input')];
        S.p = +all[0].value; S.q = +all[1].value; S.n = +all[2].value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(+inp.value) : inp.value;
        draw();
      });
    });
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#mpc input').forEach((inp, i) => {
        inp.value = [D.p, D.q, D.n][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(inp.value) : inp.value;
      });
      draw();
    });
  }

  /* ======================================================== 赌徒破产 */
  function gamblersRuinLab(mount, resetBtn) {
    const D = { start: 10, target: 20, p: 0.5 };
    const S = { ...D };
    let paths = [], ruined = 0, won = 0;

    mount.innerHTML = `<div id="grc"></div>
      <button class="sim-btn primary" id="grRun">模拟 200 位赌徒</button>
      <div class="pdf-viz" id="grChart"></div>
      <div class="stat-pair" id="grStats" aria-live="polite"></div>
      <div class="memoryless-note" id="grNote"></div>`;

    const cfg = [
      { label: '本金', min: 1, max: 40, step: 1, value: D.start, suffix: ' 元' },
      { label: '目标', min: 2, max: 60, step: 1, value: D.target, suffix: ' 元' },
      { label: '单局胜率 p', min: 0.4, max: 0.6, step: 0.01, value: D.p, format: v => (+v).toFixed(2) }
    ];
    setupControls(mount.querySelector('#grc'), cfg);

    // 理论破产概率
    function theoryRuin(i, N, p) {
      if (i <= 0) return 1;
      if (i >= N) return 0;
      if (Math.abs(p - 0.5) < 1e-9) return 1 - i / N;
      const r = (1 - p) / p;
      return (Math.pow(r, i) - Math.pow(r, N)) / (1 - Math.pow(r, N));
    }

    function run() {
      const start = Math.round(S.start);
      const target = Math.max(start + 1, Math.round(S.target));
      paths = []; ruined = 0; won = 0;
      for (let k = 0; k < 200; k++) {
        let money = start;
        const path = [money];
        let steps = 0;
        while (money > 0 && money < target && steps < 5000) {
          money += Math.random() < S.p ? 1 : -1;
          path.push(money);
          steps++;
        }
        if (money <= 0) ruined++; else if (money >= target) won++;
        if (k < 40) paths.push(path);   // 只画前 40 条
      }
      draw(start, target);
    }

    function draw(start, target) {
      const W = 580, H = 220, pad = 36;
      const maxLen = Math.max(...paths.map(p => p.length), 2);
      const X = i => pad + i / (maxLen - 1) * (W - pad * 2);
      const Y = m => H - pad - (m / target) * (H - pad * 2);

      const lines = paths.map(path => {
        const end = path[path.length - 1];
        const col = end <= 0 ? '#e58768' : (end >= target ? '#197b72' : '#c9d8d3');
        const d = path.map((m, i) => `${X(i).toFixed(1)},${Y(m).toFixed(1)}`).join(' L');
        return `<path d="M${d}" fill="none" stroke="${col}" stroke-width="1.2" opacity=".6"/>`;
      }).join('');

      mount.querySelector('#grChart').innerHTML = svg(W, H, `
        <rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" fill="#fbfdfc" stroke="#dbe7e1"/>
        <line x1="${pad}" y1="${Y(target)}" x2="${W - pad}" y2="${Y(target)}" stroke="#197b72" stroke-width="2" stroke-dasharray="6 4"/>
        <line x1="${pad}" y1="${Y(0)}" x2="${W - pad}" y2="${Y(0)}" stroke="#e58768" stroke-width="2"/>
        <line x1="${pad}" y1="${Y(start)}" x2="${W - pad}" y2="${Y(start)}" stroke="#c7911c" stroke-width="1.2" stroke-dasharray="3 4"/>
        ${lines}
        <text x="${pad + 4}" y="${Y(target) - 6}" font-size="10" fill="#125d59">目标 ${target} 元（赢）</text>
        <text x="${pad + 4}" y="${Y(0) - 6}" font-size="10" fill="#b8543a">0 元（破产）</text>
        <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#6c7f7d">赌局进程（显示前 40 位赌徒的资金轨迹）</text>`);

      const th = theoryRuin(start, target, S.p);
      mount.querySelector('#grStats').innerHTML = `
        <div class="stat-box warning"><h4>破产人数</h4><b>${ruined} / 200</b>
          <small>${(ruined / 2).toFixed(1)}%</small></div>
        <div class="stat-box"><h4>达成目标</h4><b>${won} / 200</b>
          <small>${(won / 2).toFixed(1)}%</small></div>
        <div class="stat-box"><h4>理论破产概率</h4><b>${(th * 100).toFixed(1)}%</b>
          <small>${Math.abs(S.p - 0.5) < 1e-9 ? `公平赌局：1 − i/N = 1 − ${start}/${target}` : `r = ${((1 - S.p) / S.p).toFixed(4)}`}</small></div>`;

      const fair = theoryRuin(start, target, 0.5);
      mount.querySelector('#grNote').innerHTML = `
        <p>公平赌局（p=0.5）时破产概率为 <strong>${(fair * 100).toFixed(1)}%</strong>；
           当前 p=${S.p.toFixed(2)} 时为 <strong>${(th * 100).toFixed(1)}%</strong>。</p>
        <p class="muted">把 p 调到 0.49（赌场只占 1% 优势），再把目标调大，你会看到破产概率迅速逼近 100%。
           <strong>本金越小、目标越大、玩得越久，破产越接近必然</strong>——这就是赌徒破产定理。</p>`;
    }

    run();
    mount.querySelectorAll('#grc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#grc input')];
        S.start = +all[0].value; S.target = +all[1].value; S.p = +all[2].value;
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(+inp.value) : inp.value) + (c.suffix || '');
        run();
      });
    });
    mount.querySelector('#grRun').addEventListener('click', run);
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#grc input').forEach((inp, i) => {
        inp.value = [D.start, D.target, D.p][i];
        const c = cfg[i];
        inp.parentElement.querySelector('output').textContent =
          (c.format ? c.format(inp.value) : inp.value) + (c.suffix || '');
      });
      run();
    });
  }

  /* --------- 共享：泊松过程工具（第 18 课） --------- */
  // 指数分布采样（逆变换法）
  function expSample(lambda) { return -Math.log(1 - Math.random()) / lambda; }
  // 在 [0, T] 上生成一条泊松过程的到达时刻
  function poissonPath(lambda, T) {
    const t = [];
    let cur = 0;
    while (true) {
      cur += expSample(lambda);
      if (cur > T) break;
      t.push(cur);
    }
    return t;
  }
  // 时间轴上画事件刻度
  function timelineSVG(events, T, opts) {
    const o = opts || {};
    const W = o.W || 580, H = o.H || 90, pad = 32;
    const X = t => pad + t / T * (W - pad * 2);
    const y = o.y || 44;
    const ticks = events.map(t =>
      `<line x1="${X(t).toFixed(1)}" y1="${y - 14}" x2="${X(t).toFixed(1)}" y2="${y + 14}"
        stroke="${o.color || '#197b72'}" stroke-width="2" opacity=".8"/>`).join('');
    const axisLabels = [0, 0.25, 0.5, 0.75, 1].map(f =>
      `<text x="${X(f * T).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#8a9b97">${(f * T).toFixed(0)}</text>`).join('');
    return svg(W, H, `
      <line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="#dbe7e1" stroke-width="2"/>
      ${ticks}${axisLabels}
      <text x="${W / 2}" y="18" text-anchor="middle" font-size="11" fill="#6c7f7d">${o.title || `时间轴（共 ${events.length} 个事件）`}</text>`);
  }

  /* ======================================================== 事件到达模拟 */
  function poissonArrivalsLab(mount, resetBtn) {
    const D = { lambda: 0.5, T: 60 };
    const S = { ...D };
    let events = [];

    mount.innerHTML = `<div id="pac"></div>
      <button class="sim-btn primary" id="paRun">重新模拟</button>
      <div class="pdf-viz" id="paTimeline"></div>
      <div class="pdf-viz" id="paHist"></div>
      <div class="stat-pair" id="paStats" aria-live="polite"></div>`;

    const cfg = [
      { label: '强度 λ（次/分钟）', min: 0.1, max: 3, step: 0.1, value: D.lambda, format: v => (+v).toFixed(1) },
      { label: '观察时长（分钟）', min: 20, max: 200, step: 10, value: D.T }
    ];
    setupControls(mount.querySelector('#pac'), cfg);

    function run() { events = poissonPath(S.lambda, S.T); draw(); }

    function draw() {
      mount.querySelector('#paTimeline').innerHTML = timelineSVG(events, S.T, {
        title: `${S.T} 分钟内到达 ${events.length} 个事件（每条竖线 = 一次到达）`
      });

      // 间隔时间直方图
      const gaps = [];
      let prev = 0;
      events.forEach(t => { gaps.push(t - prev); prev = t; });

      const W = 580, H = 150, pad = 34, bins = 18;
      const maxG = Math.max(...gaps, 1 / S.lambda * 3);
      const counts = Array(bins).fill(0);
      gaps.forEach(g => { counts[clamp(Math.floor(g / maxG * bins), 0, bins - 1)]++; });
      const maxC = Math.max(...counts, 1);
      const bw = (W - pad * 2) / bins;
      const bars = counts.map((c, i) => {
        const h = c / maxC * (H - pad * 2);
        return `<rect x="${(pad + i * bw).toFixed(1)}" y="${(H - pad - h).toFixed(1)}"
          width="${(bw * 0.88).toFixed(1)}" height="${h.toFixed(1)}" fill="#7fbdb2" rx="1.5"/>`;
      }).join('');

      // 理论指数密度曲线（缩放到直方图高度）
      const curve = [];
      for (let i = 0; i <= 120; i++) {
        const g = i / 120 * maxG;
        const dens = S.lambda * Math.exp(-S.lambda * g);
        curve.push({ g, dens });
      }
      const maxD = Math.max(...curve.map(c => c.dens));
      const path = curve.map(c =>
        `${(pad + c.g / maxG * (W - pad * 2)).toFixed(1)},${(H - pad - c.dens / maxD * (H - pad * 2)).toFixed(1)}`).join(' L');

      mount.querySelector('#paHist').innerHTML = svg(W, H, `
        <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#dbe7e1" stroke-width="2"/>
        ${bars}
        <path d="M${path}" fill="none" stroke="#e58768" stroke-width="2.4"/>
        <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6c7f7d">间隔时间（分钟）· 橙线 = 理论指数密度 λe^(−λt)</text>`);

      const meanGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
      mount.querySelector('#paStats').innerHTML = `
        <div class="stat-box"><h4>实际事件数</h4><b>${events.length}</b>
          <small>理论期望 λT = ${(S.lambda * S.T).toFixed(1)}</small></div>
        <div class="stat-box"><h4>平均间隔</h4><b>${meanGap.toFixed(2)} 分</b>
          <small>理论 1/λ = ${(1 / S.lambda).toFixed(2)} 分</small></div>
        <div class="stat-box"><h4>间隔分布</h4><b>指数</b>
          <small>直方图应呈右偏衰减形状</small></div>`;
    }

    run();
    mount.querySelectorAll('#pac input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#pac input')];
        S.lambda = +all[0].value; S.T = +all[1].value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(+inp.value) : inp.value;
        run();
      });
    });
    mount.querySelector('#paRun').addEventListener('click', run);
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#pac input').forEach((inp, i) => {
        inp.value = [D.lambda, D.T][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(inp.value) : inp.value;
      });
      run();
    });
  }

  /* ======================================================== 计数过程 N(t) */
  function poissonCountLab(mount, resetBtn) {
    const D = { lambda: 0.8, T: 60, paths: 5 };
    const S = { ...D };
    let runs = [];

    mount.innerHTML = `<div id="pcc"></div>
      <button class="sim-btn primary" id="pcRun">重新模拟</button>
      <div class="pdf-viz" id="pcChart"></div>
      <div class="stat-pair" id="pcStats" aria-live="polite"></div>
      <div class="memoryless-note" id="pcNote"></div>`;

    const cfg = [
      { label: '强度 λ（次/分钟）', min: 0.1, max: 3, step: 0.1, value: D.lambda, format: v => (+v).toFixed(1) },
      { label: '观察时长（分钟）', min: 20, max: 150, step: 10, value: D.T },
      { label: '轨迹条数', min: 1, max: 15, step: 1, value: D.paths }
    ];
    setupControls(mount.querySelector('#pcc'), cfg);

    function run() {
      runs = [];
      for (let i = 0; i < Math.round(S.paths); i++) runs.push(poissonPath(S.lambda, S.T));
      draw();
    }

    function draw() {
      const W = 580, H = 230, pad = 38;
      const maxN = Math.max(...runs.map(r => r.length), Math.ceil(S.lambda * S.T * 1.4), 3);
      const X = t => pad + t / S.T * (W - pad * 2);
      const Y = n => H - pad - n / maxN * (H - pad * 2);

      // 每条轨迹画成阶梯
      const steps = runs.map((ev, k) => {
        const hue = ['#197b72', '#7fa8c4', '#c7911c', '#b06a8f', '#5a9e6f',
                     '#c26b4a', '#4a8ba0', '#8a7ab0', '#6f9c3f', '#a0705a',
                     '#3f8f85', '#9c7bc0', '#c2955a', '#5f8fb5', '#8fa04a'][k % 15];
        let d = `M${X(0).toFixed(1)},${Y(0).toFixed(1)}`;
        ev.forEach((t, i) => {
          d += ` L${X(t).toFixed(1)},${Y(i).toFixed(1)} L${X(t).toFixed(1)},${Y(i + 1).toFixed(1)}`;
        });
        d += ` L${X(S.T).toFixed(1)},${Y(ev.length).toFixed(1)}`;
        return `<path d="${d}" fill="none" stroke="${hue}" stroke-width="1.8" opacity=".75"/>`;
      }).join('');

      // 理论期望线 λt
      const expLine = `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(S.T)}" y2="${Y(S.lambda * S.T)}"
        stroke="#e58768" stroke-width="2.6" stroke-dasharray="7 5"/>`;

      mount.querySelector('#pcChart').innerHTML = svg(W, H, `
        <rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${H - pad * 2}" fill="#fbfdfc" stroke="#dbe7e1"/>
        ${expLine}${steps}
        <text x="${X(S.T) - 6}" y="${Y(S.lambda * S.T) - 8}" text-anchor="end" font-size="11" fill="#b8543a">理论期望 E[N(t)] = λt</text>
        <text x="${pad - 8}" y="${Y(maxN) + 4}" text-anchor="end" font-size="10" fill="#6c7f7d">${maxN}</text>
        <text x="${pad - 8}" y="${Y(0) + 4}" text-anchor="end" font-size="10" fill="#6c7f7d">0</text>
        <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6c7f7d">时间 t（分钟）· 纵轴 = 累计事件数 N(t)</text>`);

      const finals = runs.map(r => r.length);
      const mn = finals.reduce((a, b) => a + b, 0) / finals.length;
      const vr = finals.reduce((s, x) => s + (x - mn) ** 2, 0) / finals.length;
      mount.querySelector('#pcStats').innerHTML = `
        <div class="stat-box"><h4>终点 N(T) 平均</h4><b>${mn.toFixed(2)}</b>
          <small>理论 λT = ${(S.lambda * S.T).toFixed(1)}</small></div>
        <div class="stat-box"><h4>终点方差</h4><b>${vr.toFixed(2)}</b>
          <small>泊松特性：方差 = 期望 = ${(S.lambda * S.T).toFixed(1)}</small></div>`;

      mount.querySelector('#pcNote').innerHTML = `
        <p>每条彩色阶梯是一次独立模拟的 N(t)。它<strong>只在事件到达的瞬间跳跃 +1</strong>，其余时刻保持水平。</p>
        <p class="muted">注意所有轨迹都围绕橙色虚线（理论期望 λt）波动。
          泊松分布的特点是<strong>方差等于期望</strong>，所以 λT 越大，绝对波动越大，但相对波动（变异系数 1/√(λT)）越小。</p>`;
    }

    run();
    mount.querySelectorAll('#pcc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#pcc input')];
        S.lambda = +all[0].value; S.T = +all[1].value; S.paths = +all[2].value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(+inp.value) : inp.value;
        run();
      });
    });
    mount.querySelector('#pcRun').addEventListener('click', run);
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#pcc input').forEach((inp, i) => {
        inp.value = [D.lambda, D.T, D.paths][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(inp.value) : inp.value;
      });
      run();
    });
  }

  /* ======================================================== 条件均匀性 */
  function poissonConditionalLab(mount, resetBtn) {
    const D = { n: 8, T: 60, rows: 12 };
    const S = { ...D };
    let sets = [];

    mount.innerHTML = `<div id="pnc"></div>
      <button class="sim-btn primary" id="pnRun">重新撒点</button>
      <div class="pdf-viz" id="pnChart"></div>
      <div class="pdf-viz" id="pnHist"></div>
      <div class="memoryless-note" id="pnNote"></div>`;

    const cfg = [
      { label: '给定的事件个数 n', min: 2, max: 30, step: 1, value: D.n },
      { label: '时间窗口（分钟）', min: 20, max: 120, step: 10, value: D.T },
      { label: '重复次数（行数）', min: 4, max: 24, step: 2, value: D.rows }
    ];
    setupControls(mount.querySelector('#pnc'), cfg);

    function run() {
      // 条件均匀性：给定 n 个事件，位置就是 n 个独立 U(0,T) 排序后的结果
      sets = [];
      for (let r = 0; r < Math.round(S.rows); r++) {
        const pts = [];
        for (let i = 0; i < Math.round(S.n); i++) pts.push(Math.random() * S.T);
        pts.sort((a, b) => a - b);
        sets.push(pts);
      }
      draw();
    }

    function draw() {
      const W = 580, pad = 32;
      const rowH = 16;
      const H = pad * 2 + sets.length * rowH;
      const X = t => pad + t / S.T * (W - pad * 2);

      const rows = sets.map((pts, r) => {
        const y = pad + r * rowH + rowH / 2;
        const ticks = pts.map(t =>
          `<line x1="${X(t).toFixed(1)}" y1="${y - 5}" x2="${X(t).toFixed(1)}" y2="${y + 5}"
            stroke="#197b72" stroke-width="2" opacity=".8"/>`).join('');
        return `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="#eaf0ed" stroke-width="1"/>${ticks}`;
      }).join('');

      mount.querySelector('#pnChart').innerHTML = svg(W, H, `
        ${rows}
        <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#6c7f7d">
          每行是一次"已知 ${Math.round(S.n)} 个事件"的独立模拟（共 ${sets.length} 行）</text>`);

      // 所有点合并的位置直方图 → 应接近均匀
      const all = sets.flat();
      const bins = 12, counts = Array(bins).fill(0);
      all.forEach(t => { counts[clamp(Math.floor(t / S.T * bins), 0, bins - 1)]++; });
      const HW = 580, HH = 140, hp = 34;
      const maxC = Math.max(...counts, 1);
      const bw = (HW - hp * 2) / bins;
      const expected = all.length / bins;
      const bars = counts.map((c, i) =>
        `<rect x="${(hp + i * bw).toFixed(1)}" y="${(HH - hp - c / maxC * (HH - hp * 2)).toFixed(1)}"
          width="${(bw * 0.88).toFixed(1)}" height="${(c / maxC * (HH - hp * 2)).toFixed(1)}"
          fill="#7fbdb2" rx="1.5"/>`).join('');

      mount.querySelector('#pnHist').innerHTML = svg(HW, HH, `
        <line x1="${hp}" y1="${HH - hp}" x2="${HW - hp}" y2="${HH - hp}" stroke="#dbe7e1" stroke-width="2"/>
        ${bars}
        <line x1="${hp}" y1="${(HH - hp - expected / maxC * (HH - hp * 2)).toFixed(1)}"
          x2="${HW - hp}" y2="${(HH - hp - expected / maxC * (HH - hp * 2)).toFixed(1)}"
          stroke="#e58768" stroke-width="2.4" stroke-dasharray="7 5"/>
        <text x="${HW - hp - 4}" y="${(HH - hp - expected / maxC * (HH - hp * 2) - 7).toFixed(1)}"
          text-anchor="end" font-size="10" fill="#b8543a">均匀分布的期望高度</text>
        <text x="${HW / 2}" y="${HH - 8}" text-anchor="middle" font-size="11" fill="#6c7f7d">
          全部 ${all.length} 个事件位置的直方图（应接近均匀）</text>`);

      mount.querySelector('#pnNote').innerHTML = `
        <p><strong>条件均匀性定理的可视化：</strong>一旦"已知窗口内有 n 个事件"，这 n 个事件的位置就等同于
          在 [0, ${S.T}] 上<strong>随机撒 n 个点</strong>——没有任何时段更受偏爱。</p>
        <p class="muted">注意上图每一行内部点的<strong>疏密不均</strong>：有的地方挤成一团，有的地方空一大片。
          这是纯随机的正常表现（不是"规律"）。但把很多行<strong>合起来</strong>看（下方直方图），
          就会趋于平坦的均匀分布。这正好解释了"公交车扎堆"现象。</p>`;
    }

    run();
    mount.querySelectorAll('#pnc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all2 = [...mount.querySelectorAll('#pnc input')];
        S.n = +all2[0].value; S.T = +all2[1].value; S.rows = +all2[2].value;
        inp.parentElement.querySelector('output').textContent = inp.value;
        run();
      });
    });
    mount.querySelector('#pnRun').addEventListener('click', run);
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#pnc input').forEach((inp, i) => {
        inp.value = [D.n, D.T, D.rows][i];
        inp.parentElement.querySelector('output').textContent = inp.value;
      });
      run();
    });
  }

  /* ======================================================== 叠加与分流 */
  function poissonSuperpositionLab(mount, resetBtn) {
    const D = { l1: 0.4, l2: 0.6, T: 60 };
    const S = { ...D };
    let e1 = [], e2 = [];

    mount.innerHTML = `<div id="psc"></div>
      <button class="sim-btn primary" id="psRun">重新模拟</button>
      <div class="pdf-viz" id="psT1"></div>
      <div class="pdf-viz" id="psT2"></div>
      <div class="pdf-viz" id="psT3"></div>
      <div class="stat-pair" id="psStats" aria-live="polite"></div>
      <div class="memoryless-note" id="psNote"></div>`;

    const cfg = [
      { label: '流 A 的强度 λ₁', min: 0.1, max: 2, step: 0.1, value: D.l1, format: v => (+v).toFixed(1) },
      { label: '流 B 的强度 λ₂', min: 0.1, max: 2, step: 0.1, value: D.l2, format: v => (+v).toFixed(1) },
      { label: '观察时长（分钟）', min: 30, max: 150, step: 10, value: D.T }
    ];
    setupControls(mount.querySelector('#psc'), cfg);

    function run() {
      e1 = poissonPath(S.l1, S.T);
      e2 = poissonPath(S.l2, S.T);
      draw();
    }

    function draw() {
      const merged = [...e1, ...e2].sort((a, b) => a - b);
      mount.querySelector('#psT1').innerHTML = timelineSVG(e1, S.T, {
        H: 76, color: '#197b72', title: `流 A：λ₁ = ${S.l1.toFixed(1)}，实际 ${e1.length} 个事件`
      });
      mount.querySelector('#psT2').innerHTML = timelineSVG(e2, S.T, {
        H: 76, color: '#c7911c', title: `流 B：λ₂ = ${S.l2.toFixed(1)}，实际 ${e2.length} 个事件`
      });
      mount.querySelector('#psT3').innerHTML = timelineSVG(merged, S.T, {
        H: 76, color: '#b06a8f', title: `叠加流 A+B：理论 λ = ${(S.l1 + S.l2).toFixed(1)}，实际 ${merged.length} 个事件`
      });

      // 叠加流的平均间隔
      const gaps = [];
      let prev = 0;
      merged.forEach(t => { gaps.push(t - prev); prev = t; });
      const meanGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
      const lam = S.l1 + S.l2;

      mount.querySelector('#psStats').innerHTML = `
        <div class="stat-box"><h4>叠加流事件数</h4><b>${merged.length}</b>
          <small>理论 (λ₁+λ₂)T = ${(lam * S.T).toFixed(1)}</small></div>
        <div class="stat-box"><h4>叠加流平均间隔</h4><b>${meanGap.toFixed(2)} 分</b>
          <small>理论 1/(λ₁+λ₂) = ${(1 / lam).toFixed(2)} 分</small></div>
        <div class="stat-box"><h4>下一个来自 A 的概率</h4><b>${(S.l1 / lam * 100).toFixed(1)}%</b>
          <small>λ₁/(λ₁+λ₂) · 实际 ${merged.length ? (e1.length / merged.length * 100).toFixed(1) : '0'}%</small></div>`;

      mount.querySelector('#psNote').innerHTML = `
        <p><strong>叠加性：</strong>两个独立泊松流合并后，仍是泊松流，强度相加。
          第三条时间轴的间隔时间服从 Exp(${lam.toFixed(1)})。</p>
        <p class="muted"><strong>分流性质（反向）：</strong>如果把叠加流中的每个事件按概率
          p = λ₁/(λ₁+λ₂) = ${(S.l1 / lam).toFixed(3)} 标记为"来自 A"，就能还原出原来的两个独立泊松流。
          这就是排队论中"顾客分类"的数学基础。</p>`;
    }

    run();
    mount.querySelectorAll('#psc input').forEach((inp, i) => {
      inp.addEventListener('input', () => {
        const all = [...mount.querySelectorAll('#psc input')];
        S.l1 = +all[0].value; S.l2 = +all[1].value; S.T = +all[2].value;
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(+inp.value) : inp.value;
        run();
      });
    });
    mount.querySelector('#psRun').addEventListener('click', run);
    resetBtn?.addEventListener('click', () => {
      Object.assign(S, D);
      mount.querySelectorAll('#psc input').forEach((inp, i) => {
        inp.value = [D.l1, D.l2, D.T][i];
        inp.parentElement.querySelector('output').textContent = cfg[i].format ? cfg[i].format(inp.value) : inp.value;
      });
      run();
    });
  }

  window.Experiments = { mean: meanLab, median: medianLab, mode: modeLab, spread: spreadLab, probability: probabilityLab,
    expectation: expectationLab, normal: normalLab, sampling: samplingLab, randomwalk: randomwalkLab,
    bayesTest: bayesTestLab, vennConditional: vennConditionalLab, independenceCheck: independenceCheckLab,
    binomialDist: binomialDistLab, poissonDist: poissonDistLab, geometricDist: geometricDistLab, distCompare: distCompareLab,
    pdfArea: pdfAreaLab, pdfCdf: pdfCdfLab, contCompare: contCompareLab, memoryless: memorylessLab,
    correlationScatter: correlationScatterLab, covarianceCalc: covarianceCalcLab,
    outlierEffect: outlierEffectLab, nonlinearTrap: nonlinearTrapLab,
    cltDemo: cltDemoLab, standardError: standardErrorLab, ciBuilder: ciBuilderLab, ciCoverage: ciCoverageLab,
    pValueDemo: pValueDemoLab, errorTradeoff: errorTradeoffLab, pHacking: pHackingLab, powerAnalysis: powerAnalysisLab,
    fitLine: fitLineLab, r2Demo: r2DemoLab, residualPlot: residualPlotLab, leverage: leverageLab,
    markovWeather: markovWeatherLab, markovConverge: markovConvergeLab, markovPower: markovPowerLab, gamblersRuin: gamblersRuinLab,
    poissonArrivals: poissonArrivalsLab, poissonCount: poissonCountLab,
    poissonConditional: poissonConditionalLab, poissonSuperposition: poissonSuperpositionLab };
})();
