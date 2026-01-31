#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '../data/agents.json');
const agents = require(dataPath);
const API = 'https://www.moltbook.com/api/v1';
const KEY = 'moltbook_sk_qV-t0IUtk5a2fhAp0nj5c1cOxznuTtt8';

// Very resilient settings for extremely flaky API
const DELAY_MS = 200;
const TIMEOUT_MS = 60000;  // 60 second timeout
const SAVE_EVERY = 25;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getProfile(name, attempt = 1) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const r = await fetch(`${API}/agents/profile?name=${encodeURIComponent(name)}`, {
      headers: { 'Authorization': `Bearer ${KEY}` },
      signal: controller.signal
    });
    clearTimeout(timeout);
    
    if (r.ok) return (await r.json()).agent;
    if (r.status === 429) {
      // Rate limited, wait and retry
      console.log(`\n  Rate limited on ${name}, waiting...`);
      await sleep(5000);
      if (attempt < MAX_RETRIES) return getProfile(name, attempt + 1);
    }
  } catch(e) {
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS);
      return getProfile(name, attempt + 1);
    }
  }
  return null;
}

async function run() {
  // Find agents that need enrichment (no is_claimed field means not enriched)
  const needsEnrichment = agents.filter(a => !a.hasOwnProperty('is_claimed'));
  console.log(`${needsEnrichment.length} agents need enrichment out of ${agents.length}`);
  
  if (needsEnrichment.length === 0) {
    console.log('All agents already enriched!');
    return;
  }
  
  let done = 0;
  let success = 0;
  let failures = 0;
  const startTime = Date.now();
  
  for (const a of needsEnrichment) {
    done++;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = (done / (elapsed || 1)).toFixed(2);
    process.stdout.write(`\r${done}/${needsEnrichment.length} (✓${success} ✗${failures}) [${elapsed}s, ${rate}/s] ${a.name.padEnd(30)}`);
    
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
      a.is_claimed = false;  // Mark as processed even if failed
      failures++;
    }
    
    await sleep(DELAY_MS);
    
    if (done % SAVE_EVERY === 0) {
      fs.writeFileSync(dataPath, JSON.stringify(agents, null, 2));
      console.log(`\n  [Saved progress at ${done}]`);
    }
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(agents, null, 2));
  console.log(`\n\nDone! ${success}/${done} enriched (${failures} failures)`);
}

run().catch(console.error);
