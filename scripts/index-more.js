#!/usr/bin/env node
// Index more agents by pulling from multiple sources
const fs = require('fs');
const API = 'https://www.moltbook.com/api/v1';
const KEY = 'moltbook_sk_qV-t0IUtk5a2fhAp0nj5c1cOxznuTtt8';

const agents = new Map();

// Load existing
try {
  const existing = require('../data/agents.json');
  existing.forEach(a => agents.set(a.id, a));
  console.log(`Loaded ${agents.size} existing agents`);
} catch(e) {}

async function fetch_(url) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30000);
    const r = await fetch(url, {
      headers: { 'Authorization': `Bearer ${KEY}` },
      signal: controller.signal
    });
    if (r.ok) return r.json();
  } catch(e) {}
  return null;
}

function add(author) {
  if (!author || !author.id) return;
  if (!agents.has(author.id)) {
    agents.set(author.id, {
      id: author.id,
      name: author.name,
      karma: author.karma || 0,
      description: author.description || '',
      follower_count: author.follower_count || 0
    });
    return true;
  }
  return false;
}

async function indexPosts(pages = 100) {
  console.log('Indexing from posts...');
  let newCount = 0;
  for (let i = 0; i < pages; i++) {
    const d = await fetch_(`${API}/posts?limit=100&offset=${i*100}`);
    if (!d?.posts?.length) break;
    d.posts.forEach(p => { if (add(p.author)) newCount++; });
    process.stdout.write(`\rPosts page ${i+1}: ${agents.size} total (+${newCount} new)`);
    if (!d.has_more) break;
    await new Promise(r => setTimeout(r, 500));
  }
  console.log();
}

async function indexComments() {
  console.log('Indexing from comments on hot posts...');
  const d = await fetch_(`${API}/posts?limit=50&sort=hot`);
  if (!d?.posts) return;
  
  let newCount = 0;
  for (const post of d.posts) {
    const c = await fetch_(`${API}/posts/${post.id}/comments`);
    if (c?.comments) {
      c.comments.forEach(cm => { if (add(cm.author)) newCount++; });
    }
    process.stdout.write(`\rComments: ${agents.size} total (+${newCount} new)`);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log();
}

async function indexFollowers() {
  console.log('Indexing from follower lists of top agents...');
  const top = [...agents.values()].sort((a,b) => b.karma - a.karma).slice(0, 20);
  
  let newCount = 0;
  for (const agent of top) {
    // Try to get followers (if endpoint exists)
    const f = await fetch_(`${API}/agents/${agent.name}/followers`);
    if (f?.followers) {
      f.followers.forEach(a => { if (add(a)) newCount++; });
    }
    process.stdout.write(`\rFollowers: ${agents.size} total (+${newCount} new)`);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log();
}

async function indexSubmolts() {
  console.log('Indexing from submolt feeds...');
  const s = await fetch_(`${API}/submolts`);
  if (!s?.submolts) return;
  
  let newCount = 0;
  for (const sub of s.submolts.slice(0, 20)) {
    const d = await fetch_(`${API}/submolts/${sub.name}/feed?limit=100`);
    if (d?.posts) {
      d.posts.forEach(p => { if (add(p.author)) newCount++; });
    }
    process.stdout.write(`\rSubmolts: ${agents.size} total (+${newCount} new)`);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log();
}

async function run() {
  console.log('Starting comprehensive index...\n');
  
  await indexPosts(200); // More pages
  await indexComments();
  await indexSubmolts();
  await indexFollowers();
  
  const list = [...agents.values()];
  console.log(`\nTotal: ${list.length} agents`);
  
  fs.writeFileSync('data/agents.json', JSON.stringify(list, null, 2));
  console.log('Saved!');
}

run().catch(console.error);
