(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var warn = style.getPropertyValue('--warn').trim();
  var danger = style.getPropertyValue('--danger').trim();
  var purple = style.getPropertyValue('--purple').trim();

  // --- Chart 1: Radar Chart - Industry Comparison ---
  var radarChart = echarts.init(document.getElementById('chart-radar'), null, { renderer: 'svg' });
  radarChart.setOption({
    title: {
      text: '能力对标雷达图',
      left: 'center',
      top: 10,
      textStyle: { color: ink, fontSize: 14, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      backgroundColor: bg2,
      borderColor: rule,
      textStyle: { color: ink }
    },
    legend: {
      data: ['Claw Router', '行业标杆'],
      bottom: 5,
      textStyle: { color: muted, fontSize: 12 },
      itemGap: 20
    },
    radar: {
      indicator: [
        { name: '调用管道', max: 10 },
        { name: '可观测性', max: 10 },
        { name: '流式响应', max: 10 },
        { name: '多租户', max: 10 },
        { name: '计费计量', max: 10 },
        { name: 'Provider 适配', max: 10 },
        { name: 'SDK 生成', max: 10 },
        { name: '高可用', max: 10 },
        { name: '灾备恢复', max: 10 },
        { name: '合规性', max: 10 }
      ],
      center: ['50%', '55%'],
      radius: '65%',
      axisName: {
        color: ink,
        fontSize: 11
      },
      splitLine: { lineStyle: { color: rule } },
      splitArea: { areaStyle: { color: ['transparent', 'rgba(255,255,255,0.02)'] } },
      axisLine: { lineStyle: { color: rule } }
    },
    series: [{
      type: 'radar',
      animation: false,
      data: [
        {
          value: [9, 2, 8, 7, 8, 5, 9, 6, 2, 3],
          name: 'Claw Router',
          itemStyle: { color: accent },
          areaStyle: { color: accent, opacity: 0.15 },
          lineStyle: { color: accent, width: 2 },
          symbol: 'circle',
          symbolSize: 5
        },
        {
          value: [8, 9, 9, 9, 8, 9, 6, 9, 8, 8],
          name: '行业标杆',
          itemStyle: { color: accent2 },
          areaStyle: { color: accent2, opacity: 0.1 },
          lineStyle: { color: accent2, width: 2, type: 'dashed' },
          symbol: 'circle',
          symbolSize: 5
        }
      ]
    }]
  });
  window.addEventListener('resize', function() { radarChart.resize(); });

  // --- Chart 2: Commercial Readiness Bar Chart ---
  var commercialChart = echarts.init(document.getElementById('chart-commercial'), null, { renderer: 'svg' });
  var dimensions = ['多租户支持', '计费计量', '支付集成', '用户管理', '运营后台', '监控告警', '高可用', '灾备恢复', 'SLA 支持', '合规性'];
  var scores = [8, 8, 6, 8, 8, 2, 6, 2, 1, 3];
  var colors = scores.map(function(s) {
    if (s >= 7) return accent2;
    if (s >= 4) return warn;
    return danger;
  });

  commercialChart.setOption({
    title: {
      text: '各维度就绪度评分',
      left: 'center',
      top: 10,
      textStyle: { color: ink, fontSize: 14, fontWeight: 600 }
    },
    tooltip: {
      trigger: 'axis',
      appendToBody: true,
      backgroundColor: bg2,
      borderColor: rule,
      textStyle: { color: ink },
      formatter: function(params) {
        var p = params[0];
        return p.name + ': ' + p.value + '/10';
      }
    },
    grid: {
      left: '3%',
      right: '5%',
      bottom: '3%',
      top: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dimensions,
      axisLabel: {
        color: muted,
        fontSize: 10,
        rotate: 30,
        interval: 0
      },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { lineStyle: { color: rule } }
    },
    yAxis: {
      type: 'value',
      max: 10,
      axisLabel: { color: muted, fontSize: 11 },
      axisLine: { lineStyle: { color: rule } },
      splitLine: { lineStyle: { color: rule, opacity: 0.5 } }
    },
    series: [{
      type: 'bar',
      data: scores.map(function(v, i) {
        return { value: v, itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] } };
      }),
      animation: false,
      barWidth: '55%',
      label: {
        show: true,
        position: 'top',
        color: ink,
        fontSize: 11,
        formatter: '{c}'
      }
    }]
  });
  window.addEventListener('resize', function() { commercialChart.resize(); });

  // --- Mermaid Initialization ---
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: bg2,
        primaryTextColor: ink,
        primaryBorderColor: accent,
        lineColor: rule,
        secondaryColor: bg2,
        tertiaryColor: '#1c2330',
        fontFamily: 'InstrumentSans, sans-serif',
        fontSize: '13px'
      },
      securityLevel: 'loose',
      flowchart: { htmlLabels: true, curve: 'basis' },
      gantt: {
        fontSize: 11,
        sectionFontSize: 11,
        numberSectionStyles: 4
      }
    });
  }

})();
