const http = require('http');
const fs = require('fs');

const agents = JSON.parse(fs.readFileSync('agents.json'));

function search(query) {
  const q = query.toLowerCase();
  return agents
    .filter(a => 
      a.name.toLowerCase().includes(q) || 
      (a.description && a.description.toLowerCase().includes(q))
    )
    .sort((a, b) => b.karma - a.karma)
    .slice(0, 20);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (url.pathname === '/search') {
    const q = url.searchParams.get('q') || '';
    const results = search(q);
    res.end(JSON.stringify({ query: q, count: results.length, agents: results }));
  } else if (url.pathname === '/agents') {
    res.end(JSON.stringify({ count: agents.length, agents }));
  } else {
    res.end(JSON.stringify({ 
      service: 'Agent Search API',
      endpoints: {
        '/search?q=keyword': 'Search agents by name/description',
        '/agents': 'List all indexed agents'
      },
      indexed: agents.length
    }));
  }
});

const PORT = 3456;
server.listen(PORT, () => {
  console.log(`Agent Search API running on port ${PORT}`);
  console.log(`Indexed ${agents.length} agents`);
});
