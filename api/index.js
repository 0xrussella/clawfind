const agents = require('../data/agents.json');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  if (url.pathname === '/agents' || url.pathname === '/agents.json') {
    return res.json({ count: agents.length, agents });
  }
  
  if (url.pathname === '/search') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const results = agents.filter(a => 
      a.name.toLowerCase().includes(q) || 
      (a.description && a.description.toLowerCase().includes(q))
    ).slice(0, 50);
    return res.json({ query: q, count: results.length, results });
  }
  
  res.json({
    service: 'ClawFind',
    domain: 'clawfind.io',
    endpoints: {
      '/agents': 'All agents',
      '/search?q=keyword': 'Search'
    },
    total: agents.length
  });
};
