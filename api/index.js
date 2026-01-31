const fs = require('fs');
const path = require('path');

let agents = [];
try {
  agents = require('../data/agents.json');
} catch(e) {}

module.exports = (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  // Serve frontend for root
  if (url.pathname === '/' || url.pathname === '') {
    res.setHeader('Content-Type', 'text/html');
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
    return res.end(html);
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (url.pathname === '/agents' || url.pathname === '/agents.json') {
    return res.end(JSON.stringify({ count: agents.length, agents }));
  }
  
  if (url.pathname === '/search') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const results = agents.filter(a => 
      a.name.toLowerCase().includes(q) || 
      (a.description && a.description.toLowerCase().includes(q))
    ).slice(0, 50);
    return res.end(JSON.stringify({ query: q, count: results.length, results }));
  }
  
  res.end(JSON.stringify({ error: 'Not found' }));
};
