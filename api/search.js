// WhatsApp Group Finder - Search for public WhatsApp groups
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function searchGoogle(query) {
  try {
    const r = await fetch(`https://www.google.com/search?q=site:chat.whatsapp.com+${encodeURIComponent(query)}&num=20`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000)
    });
    const html = await r.text();
    const groups = [];
    
    // Extract WhatsApp group links
    const links = [...html.matchAll(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/g)];
    const seen = new Set();
    
    links.forEach(m => {
      const code = m[1];
      if (!seen.has(code)) {
        seen.add(code);
        groups.push({
          name: `${query} Group`,
          inviteLink: `https://chat.whatsapp.com/${code}`,
          code,
          source: 'Google',
          foundAt: new Date().toISOString()
        });
      }
    });
    
    return groups;
  } catch { return []; }
}

async function searchBing(query) {
  try {
    const r = await fetch(`https://www.bing.com/search?q=site:chat.whatsapp.com+${encodeURIComponent(query)}&count=20`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000)
    });
    const html = await r.text();
    const groups = [];
    const links = [...html.matchAll(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/g)];
    const seen = new Set();
    
    links.forEach(m => {
      const code = m[1];
      if (!seen.has(code)) {
        seen.add(code);
        groups.push({
          name: `${query} Group`,
          inviteLink: `https://chat.whatsapp.com/${code}`,
          code,
          source: 'Bing',
          foundAt: new Date().toISOString()
        });
      }
    });
    
    return groups;
  } catch { return []; }
}

async function searchDuckDuckGo(query) {
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=site:chat.whatsapp.com+${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000)
    });
    const html = await r.text();
    const groups = [];
    const links = [...html.matchAll(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/g)];
    const seen = new Set();
    
    links.forEach(m => {
      const code = m[1];
      if (!seen.has(code)) {
        seen.add(code);
        groups.push({
          name: `${query} Group`,
          inviteLink: `https://chat.whatsapp.com/${code}`,
          code,
          source: 'DuckDuckGo',
          foundAt: new Date().toISOString()
        });
      }
    });
    
    return groups;
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.method === 'POST' 
    ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {})
    : {};
  const query = body.q || req.query?.q || '';
  
  if (!query) return res.status(400).json({ error: 'Search query required (use ?q= parameter)' });

  const [google, bing, ddg] = await Promise.allSettled([
    searchGoogle(query),
    searchBing(query),
    searchDuckDuckGo(query)
  ]);

  // Deduplicate by code
  const seen = new Set();
  const groups = [
    ...(google.status === 'fulfilled' ? google.value : []),
    ...(bing.status === 'fulfilled' ? bing.value : []),
    ...(ddg.status === 'fulfilled' ? ddg.value : [])
  ].filter(g => {
    if (seen.has(g.code)) return false;
    seen.add(g.code);
    return true;
  });

  res.json({
    groups,
    total: groups.length,
    query,
    sources: {
      google: google.status === 'fulfilled' ? google.value.length : 0,
      bing: bing.status === 'fulfilled' ? bing.value.length : 0,
      duckduckgo: ddg.status === 'fulfilled' ? ddg.value.length : 0
    },
    timestamp: new Date().toISOString()
  });
}
