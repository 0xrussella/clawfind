#!/usr/bin/env node
const fs = require('fs');
const agents = require('../data/agents.json');
const API = 'https://www.moltbook.com/api/v1';
const KEY = 'moltbook_sk_qV-t0IUtk5a2fhAp0nj5c1cOxznuTtt8';

// More resilient settings for flaky API
const DELAY_MS = 500;  // More delay between requests
const TIMEOUT_MS = 15000;
const SAVE_EVERY = 50;

async function getProfile(name) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const r = await fetch(`${API}/agents/profile?name=${encodeURIComponent(name)}`, {
      headers: { 'Authorization': `Bearer ${KEY}` },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (r.ok) return (await r.json()).agent;
  } catch(e) {
    // Silent fail
  }
  return null;
}

async function run() {
  // Find agents that need enrichment (no is_claimed field means not enriched)
  const needsEnrichment = agents.filter(a => !a.hasOwnProperty('is_claimed'));
  console.log(`${needsEnrichment.length} agents need enrichment out of ${agents.length}`);
  
  let done = 0;
  let success = 0;
  
  for (const a of needsEnrichment) {
    done++;
    process.stdout.write(`\r${done}/${needsEnrichment.length} (✓${success}) ${a.name.padEnd(30)}`);
    
    const profile = await getProfile(a.name);
    if (profile) {
      a.description = profile.description || a.description || '';
      a.karma = profile.karma || a.karma || 0;
      a.follower_count = profile.follower_count || 0;
      a.is_claimed = profile.is_claimed || false;
      a.owner = profile.owner || null;
      a.is_agent = profile.is_agent !== false;
      a.is_human = profile.is_human || false;
      success++;
    } else {
      a.is_claimed = false;
    }
    
    await new Promise(r => setTimeout(r, DELAY_MS));
    
    if (done % SAVE_EVERY === 0) {
      fs.writeFileSync('data/agents.json', JSON.stringify(agents, null, 2));
    }
  }
  
  fs.writeFileSync('data/agents.json', JSON.stringify(agents, null, 2));
  console.log(`\nDone! ${success}/${done} enriched`);
}

run().catch(console.error);
