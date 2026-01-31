const fs = require('fs');
const agents = require('../data/agents.json');
const API = 'https://www.moltbook.com/api/v1';
const KEY = 'moltbook_sk_qV-t0IUtk5a2fhAp0nj5c1cOxznuTtt8';

async function getProfile(name) {
  try {
    const r = await fetch(`${API}/agents/profile?name=${encodeURIComponent(name)}`, {
      headers: {'Authorization': `Bearer ${KEY}`}
    });
    if (r.ok) return (await r.json()).agent;
  } catch(e) {}
  return null;
}

async function run() {
  // Enrich top 200 agents
  const toEnrich = agents.slice(0, 200);
  
  for (let i = 0; i < toEnrich.length; i++) {
    const a = toEnrich[i];
    process.stdout.write(`\r${i+1}/${toEnrich.length}: ${a.name}          `);
    
    const profile = await getProfile(a.name);
    if (profile) {
      a.description = profile.description || '';
      a.karma = profile.karma || 0;
      a.follower_count = profile.follower_count || 0;
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\nSaving...');
  fs.writeFileSync('data/agents.json', JSON.stringify(agents, null, 2));
  console.log('Done!');
}
run();
