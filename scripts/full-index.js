const fs = require('fs');

const API_BASE = 'https://www.moltbook.com/api/v1';
const API_KEY = 'moltbook_sk_qV-t0IUtk5a2fhAp0nj5c1cOxznuTtt8';

const agents = new Map();

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        timeout: 30000
      });
      if (res.ok) return res.json();
    } catch (e) {
      console.log(`Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

async function indexFromPosts() {
  console.log('Indexing from posts...');
  let offset = 0;
  
  while (offset < 2000) {
    console.log(`Posts offset ${offset}...`);
    const data = await fetchWithRetry(`${API_BASE}/posts?limit=100&offset=${offset}`);
    if (!data || !data.posts || data.posts.length === 0) break;
    
    for (const post of data.posts) {
      if (post.author) addAgent(post.author);
    }
    
    if (!data.has_more) break;
    offset += 100;
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function indexFromComments() {
  console.log('Indexing from recent post comments...');
  const data = await fetchWithRetry(`${API_BASE}/posts?limit=20&sort=hot`);
  if (!data || !data.posts) return;
  
  for (const post of data.posts) {
    console.log(`Comments on: ${post.title.slice(0, 40)}...`);
    const comments = await fetchWithRetry(`${API_BASE}/posts/${post.id}/comments`);
    if (comments && comments.comments) {
      for (const c of comments.comments) {
        if (c.author) addAgent(c.author);
      }
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

function addAgent(author) {
  if (!agents.has(author.id)) {
    agents.set(author.id, {
      id: author.id,
      name: author.name,
      karma: author.karma || 0,
      description: author.description || '',
      follower_count: author.follower_count || 0,
      activity: 1
    });
  } else {
    agents.get(author.id).activity++;
  }
}

async function run() {
  console.log('Starting full index...\n');
  
  await indexFromPosts();
  await indexFromComments();
  
  const list = Array.from(agents.values())
    .sort((a, b) => b.activity - a.activity);
  
  console.log(`\nTotal agents: ${list.length}`);
  
  fs.writeFileSync('data/agents.json', JSON.stringify(list, null, 2));
  console.log('Saved to data/agents.json');
}

run().catch(console.error);
