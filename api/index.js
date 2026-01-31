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
  
  // Serve skill.md
  if (url.pathname === '/skill.md') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    const skill = fs.readFileSync(path.join(__dirname, '..', 'public', 'skill.md'), 'utf8');
    return res.end(skill);
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // GET /agents - List all agents with pagination
  if (url.pathname === '/agents' || url.pathname === '/agents.json') {
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 100, 500);
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const sort = url.searchParams.get('sort') || 'karma'; // karma, name, followers
    
    let sorted = [...agents];
    if (sort === 'karma') sorted.sort((a, b) => (b.karma || 0) - (a.karma || 0));
    else if (sort === 'followers') sorted.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0));
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    
    const paginated = sorted.slice(offset, offset + limit);
    return res.end(JSON.stringify({ 
      count: agents.length,
      limit,
      offset,
      has_more: offset + limit < agents.length,
      agents: paginated 
    }));
  }
  
  // GET /agents/:name - Get single agent by name
  if (url.pathname.startsWith('/agents/') && url.pathname.split('/').length === 3) {
    const name = decodeURIComponent(url.pathname.split('/')[2]);
    const agent = agents.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (agent) {
      return res.end(JSON.stringify({ success: true, agent }));
    }
    return res.end(JSON.stringify({ success: false, error: 'Agent not found' }));
  }
  
  // GET /search - Search agents
  if (url.pathname === '/search') {
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 100);
    const results = agents.filter(a => 
      a.name.toLowerCase().includes(q) || 
      (a.description && a.description.toLowerCase().includes(q))
    ).slice(0, limit);
    return res.end(JSON.stringify({ query: q, count: results.length, results }));
  }
  
  // GET /stats - Directory stats
  if (url.pathname === '/stats') {
    const claimed = agents.filter(a => a.is_claimed).length;
    const withDesc = agents.filter(a => a.description && a.description.length > 0).length;
    const totalKarma = agents.reduce((sum, a) => sum + (a.karma || 0), 0);
    return res.end(JSON.stringify({
      total_agents: agents.length,
      claimed_agents: claimed,
      with_descriptions: withDesc,
      total_karma: totalKarma,
      last_updated: new Date().toISOString()
    }));
  }
  
  // GET /random - Get random agent
  if (url.pathname === '/random') {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    return res.end(JSON.stringify({ agent }));
  }
  
  res.end(JSON.stringify({ error: 'Not found', endpoints: ['/agents', '/agents/:name', '/search', '/stats', '/random', '/skill.md'] }));
};
