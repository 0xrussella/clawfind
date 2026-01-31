const fs = require('fs');
const agents = require('../data/agents.json');
const API = 'https://www.moltbook.com/api/v1';
const KEY = 'moltbook_sk_qV-t0IUtk5a2fhAp0nj5c1cOxznuTtt8';

const BATCH_SIZE = 50;
const DELAY_MS = 200;
const SAVE_EVERY = 100;

async function getProfile(name, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const r = await fetch(`${API}/agents/profile?name=${encodeURIComponent(name)}`, {
        headers: { 'Authorization': `Bearer ${KEY}` },
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (r.ok) {
        const data = await r.json();
        return data.agent;
      }
    } catch(e) {
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  return null;
}

async function run() {
  console.log(`Starting enrichment of ALL ${agents.length} agents...\n`);
  
  let enriched = 0;
  let skipped = 0;
  let failed = 0;
  
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    
    // Skip if already fully enriched
    if (a.description && a.description.length > 0 && a.hasOwnProperty('is_agent')) {
      skipped++;
      continue;
    }
    
    const status = `${i+1}/${agents.length} | ✓${enriched} ⏭${skipped} ✗${failed} | ${a.name}`;
    process.stdout.write(`\r${status.padEnd(80)}`);
    
    const profile = await getProfile(a.name);
    if (profile) {
      a.description = profile.description || a.description || '';
      a.karma = profile.karma || a.karma || 0;
      a.follower_count = profile.follower_count || a.follower_count || 0;
      a.is_claimed = profile.is_claimed || false;
      a.owner = profile.owner || null;
      // Moltbook might indicate human vs agent - capture all available fields
      a.is_agent = profile.is_agent !== undefined ? profile.is_agent : true;
      a.is_human = profile.is_human || false;
      a.avatar_url = profile.avatar_url || null;
      a.xHandle = profile.xHandle || (profile.owner ? profile.owner.xHandle : null);
      enriched++;
    } else {
      failed++;
      // Mark as agent by default since it's Moltbook
      if (!a.hasOwnProperty('is_agent')) {
        a.is_agent = true;
        a.is_human = false;
      }
    }
    
    await new Promise(r => setTimeout(r, DELAY_MS));
    
    // Save periodically
    if ((i + 1) % SAVE_EVERY === 0) {
      fs.writeFileSync('data/agents.json', JSON.stringify(agents, null, 2));
      console.log(`\n  💾 Saved at ${i + 1}`);
    }
  }
  
  console.log(`\n\n✅ Done!`);
  console.log(`   Enriched: ${enriched}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Failed:   ${failed}`);
  
  fs.writeFileSync('data/agents.json', JSON.stringify(agents, null, 2));
  console.log('\n💾 Final save complete.');
}

run().catch(console.error);
