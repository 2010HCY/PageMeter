export default {
  async fetch(request, env, ctx) {
    const headers = {
      "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    try {
      const url = new URL(request.url);
      const target = url.searchParams.get("target");
      const isNewVisitor = url.searchParams.get("newVisitor") === "true";
      if (!target) return new Response(JSON.stringify({ error: "缺少 target 参数" }), { status: 400, headers });

      const domain = extractDomain(target);
      console.log(`[处理请求] method=${request.method}, target=${target}, domain=${domain}, newVisitor=${isNewVisitor}`);

      if (request.method === "POST") {
        await updateCounts(env.DB, target, domain, isNewVisitor);
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      if (request.method === "GET") {
        const pageStats = await env.DB.prepare(`SELECT visit_count, visitor_count FROM post WHERE url = ?`)
          .bind(target).first();
        const siteStats = await env.DB.prepare(`SELECT visit_count, visitor_count FROM site WHERE domain = ?`)
          .bind(domain).first();

        const result = {
          page: pageStats || { visit_count: 0, visitor_count: 0 },
          site: siteStats || { visit_count: 0, visitor_count: 0 },
        };
        return new Response(JSON.stringify(result), { headers });
      }

      return new Response("Unsupported method", { status: 405, headers });
    } catch (error) {
      console.error("服务器内部错误：", error);
      return new Response(JSON.stringify({ error: "服务器错误: " + error.message }), { status: 500, headers });
    }
  },
};

async function updateCounts(db, target, domain, isNewVisitor) {
  try {
    await db.prepare(`
      INSERT INTO post (url, visit_count, visitor_count)
      VALUES (?, 1, ?) 
      ON CONFLICT(url) DO UPDATE SET 
      visit_count = visit_count + 1, 
      visitor_count = visitor_count + ?;
    `).bind(target, isNewVisitor ? 1 : 0, isNewVisitor ? 1 : 0).run();

    await db.prepare(`
      INSERT INTO site (domain, visit_count, visitor_count)
      VALUES (?, 1, ?) 
      ON CONFLICT(domain) DO UPDATE SET 
      visit_count = visit_count + 1, 
      visitor_count = visitor_count + ?;
    `).bind(domain, isNewVisitor ? 1 : 0, isNewVisitor ? 1 : 0).run();
  } catch (error) {
    console.error("更新统计数据时出错：", error);
  }
}

function extractDomain(url) {
  try {
    return new URL("http://" + url).hostname;
  } catch (error) {
    console.error("域名提取错误：", error);
    return url;
  }
}
