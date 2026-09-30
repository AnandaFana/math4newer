const lessonRegistry = [
  { id: 'mean', short: '平均数', title: '平均数，真的代表大家吗？', state: 'available', href: '#main' },
  { id: 'median', short: '中位数', title: '中位数：站在队伍正中间', state: 'planned', href: '#experiment' },
  { id: 'spread', short: '波动有多大', title: '同样平均数，为什么感觉不同？', state: 'planned', href: '#experiment' },
  { id: 'probability', short: '概率与猜测', title: '概率：把可能性说清楚', state: 'planned', href: '#experiment' }
];
function renderLessonNav(container, registry = lessonRegistry) {
  container.innerHTML = registry.map((item, index) => `
    <a class="${index === 0 ? 'active' : ''}" href="${item.href}" data-lesson="${item.id}" aria-label="${item.title}${item.state === 'planned' ? '（规划中）' : ''}">
      <span>${String(index + 1).padStart(2, '0')}</span>${item.short}${item.state === 'planned' ? '<small>规划中</small>' : ''}
    </a>`).join('');
}
window.StatisticsLessons = { lessonRegistry, renderLessonNav };
