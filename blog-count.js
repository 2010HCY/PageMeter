(function () {
  async function fetchVisitorStats() {
    const hostname = window.location.hostname;
    const target = hostname + window.location.pathname;

    const baseUrl = `https://<你的域名>/visitor-count?target=${encodeURIComponent(target)}`;
    console.log(`目标 API 地址: ${baseUrl}`);

    try {
      console.log('访问数更新');
      await fetch(baseUrl, { method: 'POST', credentials: 'include' });

      const visitorTracked = getCookie('visitorTracked');
      if (!visitorTracked) {
        await fetch(`${baseUrl}&newVisitor=true`, { method: 'POST', credentials: 'include' });
      }

      console.log('获取最新统计数据');
      const response = await fetch(baseUrl, { method: 'GET', credentials: 'include' });
      if (!response.ok) throw new Error(`统计请求失败，状态码：${response.status}`);

      const data = await response.json();
      console.log('统计数据解析成功：', data);

      updateStatistics(data);

      if (!visitorTracked) setCookie('visitorTracked', 'true', 365);
    } catch (error) {
      console.error('获取或更新统计数据出错：', error);
    }
  }

  function updateStatistics(data) {
    document.getElementById('PageMeter_site_uv').textContent = data.site.visitor_count || 0;
    document.getElementById('PageMeter_site_pv').textContent = data.site.visit_count || 0;
    document.getElementById('PageMeter_page_uv').textContent = data.page.visitor_count || 0;
    document.getElementById('PageMeter_page_pv').textContent = data.page.visit_count || 0;

    console.log(`更新站点总访客数: ${data.site.visitor_count || 0}`);
    console.log(`更新站点总访问次数: ${data.site.visit_count || 0}`);
    console.log(`更新页面总访客数: ${data.page.visitor_count || 0}`);
    console.log(`更新页面总访问次数: ${data.page.visit_count || 0}`);
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  }

  function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith(`${name}=`)) return trimmed.substring(name.length + 1);
    }
    return null;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchVisitorStats);
  } else {
    fetchVisitorStats();
  }

  // setInterval(fetchVisitorStats, 60000);  //可选，每60秒更新数据
})();
