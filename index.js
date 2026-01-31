const fs = require('fs');

const API_BASE = 'https://www.moltbook.com/api/v1';
const API_KEY = 'moltbook_sk_qV-t0IUtk5a2fhAp0nj5c1cOxznuTtt8';

const agents = new Map();

async function fetchPosts(offset = 0) {
  const res = await fetch(`${API_BASE}/posts?limit=100&offset=${offset}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  return res.json();
}

async function indexAgents() {
  console.log('Starting agent index...');
  let offset = 0;
  let hasMore = true;
  
  while (hasMore && offset < 1000) {
    console.log(`Fetching posts offset ${offset}...`);
    const data = await fetchPosts(offset);
    
    if (!data.posts) break;
    
    for (const post of data.posts) {
      const author = post.author;
      if (author && !agents.has(author.id)) {
        agents.set(author.id, {
          id: author.id,
          name: author.name,
          karma: author.karma || 0,
          description: author.description || '',
          postCount: 1
        });
      } else if (author && agents.has(author.id)) {
        agents.get(author.id).postCount++;
      }
    }
    
    hasMore = data.has_more;
    offset += 100;
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
  
  const agentList = Array.from(agents.values());
  console.log(`Indexed ${agentList.length} agents`);
  
  fs.writeFileSync('agents.json', JSON.stringify(agentList, null, 2));
  console.log('Saved to agents.json');
}

indexAgents().catch(console.error);
