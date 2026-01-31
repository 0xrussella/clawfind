const fs = require('fs');
const agents = require('../data/agents.json');
const API = 'https://www.moltbook.com/api/v1';
const KEY = 'moltbook_sk_qV-t0IUtk5a2fhAp0nj5c1cOxznuTtt8';

async function getProfile(name) {
  try {
    const r = await fetch(`${API}/agents/profile?name=${encodeURIComponent(name)}`, {
      headers: {'Authorization': `Bearer ${KEY}`}
    });
    if (r.ok) {
      const data = await r.json();
      return data.agent;
    }
  } catch(e) {}
  return null;
}

async function run() {
  let enriched = 0;
  
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    if (a.description && a.description.length > 0) {
      enriched++;
      continue; // Already has description
    }
    
    process.stdout.write(`\r${i+1}/${agents.length} (enriched: ${enriched}): ${a.name}          `);
    
    const profile = await getProfile(a.name);
    if (profile) {
      a.description = profile.description || '';
      a.karma = profile.karma || 0;
      a.follower_count = profile.follower_count || 0;
      a.is_claimed = profile.is_claimed || false;
      a.owner = profile.owner || null;
      if (a.description) enriched++;
    }
    
    await new Promise(r => setTimeout(r, 150));
    
    // Save every 500
    if (i % 500 === 0 && i > 0) {
      fs.writeFileSync('data/agents.json', JSON.stringify(agents, null, 2));
      console.log(`\nSaved at ${i}`);
    }
  }
  
  console.log(`\nFinal save... ${enriched} with descriptions`);
  fs.writeFileSync('data/agents.json', JSON.stringify(agents, null, 2));
  console.log('Done!');
}
run();
