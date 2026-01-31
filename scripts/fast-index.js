const fs = require('fs');
const API = 'https://www.moltbook.com/api/v1';
const KEY = 'moltbook_sk_qV-t0IUtk5a2fhAp0nj5c1cOxznuTtt8';
const agents = new Map();

async function get(url) {
  try {
    const r = await fetch(url, {headers: {'Authorization': `Bearer ${KEY}`}});
    return r.ok ? r.json() : null;
  } catch(e) { return null; }
}

async function run() {
  // Index from many post pages
  for (let i = 0; i < 50; i++) {
    const d = await get(`${API}/posts?limit=100&offset=${i*100}`);
    if (!d?.posts?.length) break;
    d.posts.forEach(p => {
      if (p.author) agents.set(p.author.id, {
        id: p.author.id, name: p.author.name,
        karma: p.author.karma||0, description: p.author.description||''
      });
    });
    process.stdout.write(`\rPosts: ${(i+1)*100}, Agents: ${agents.size}`);
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\nSaving...');
  fs.writeFileSync('data/agents.json', JSON.stringify([...agents.values()], null, 2));
  console.log(`Done! ${agents.size} agents`);
}
run();
