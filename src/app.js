(() => {
  'use strict';
  const lessonRegistry = [
    { id:'mean', short:'平均数', href:'#main' },
    { id:'median', short:'中位数', href:'#experiment' },
    { id:'spread', short:'波动有多大', href:'#experiment' },
    { id:'probability', short:'概率与猜测', href:'#experiment' }
  ];
  const $ = id => document.getElementById(id);
  const people = [{name:'爸爸',value:6},{name:'妈妈',value:4},{name:'小明',value:2},{name:'小红',value:4}];
  function init(){
    const nav = $('lessonNav');
    if (!nav) return;
  const links=['index.html','median.html','mode.html','spread.html','probability.html'];
    nav.innerHTML = lessonRegistry.map((item,i)=>`<a class="${i===0?'active':''}" href="${links[i]}"><span>${String(i+1).padStart(2,'0')}</span>${item.short}${i>0?'<small>打开课程</small>':''}</a>`).join('');
    const controls=$('peopleControls'), bars=$('bars'), line=$('meanLine'), value=$('meanValue');
    function render(){
      controls.innerHTML=people.map((p,i)=>`<label class="person-control"><span>${p.name}</span><input data-i="${i}" type="range" min="0" max="8" value="${p.value}" aria-label="${p.name}饮水杯数"><output>${p.value}</output></label>`).join('');
      bars.innerHTML=people.map(p=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(2,p.value/8*100)}%" title="${p.value}杯"></div></div>`).join('');
      const avg=people.reduce((s,p)=>s+p.value,0)/people.length;
      value.textContent=avg.toFixed(1); line.style.top=`${100-avg/8*100}%`;
      controls.querySelectorAll('input').forEach(input=>input.addEventListener('input',e=>{people[+e.target.dataset.i].value=+e.target.value;render()}));
    }
    render();
    $('resetBtn').addEventListener('click',()=>{[6,4,2,4].forEach((v,i)=>people[i].value=v);render()});
    $('revealAnswer').addEventListener('click',()=>{const a=$('answer');a.classList.toggle('show');$('revealAnswer').setAttribute('aria-expanded',a.classList.contains('show'))});
    $('themeToggle').addEventListener('click',()=>document.body.classList.toggle('dark'));
    $('printBtn').addEventListener('click',()=>window.print());
    document.querySelectorAll('#routeList li').forEach((item,i)=>item.addEventListener('click',()=>{document.querySelectorAll('#routeList li').forEach(x=>x.classList.remove('active'));item.classList.add('active');$('progressText').textContent=`${i+1} / 4`;$('progressBar').style.width=`${(i+1)*25}%`}));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
