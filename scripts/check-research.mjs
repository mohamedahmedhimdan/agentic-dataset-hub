import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(readFileSync('src/research/progress.json','utf8'));
const exported=JSON.parse(readFileSync('public/research/progress.json','utf8'));
assert.deepEqual(d,exported,'downloadable snapshot must match site data');
assert.equal(new Set(d.milestones.map(x=>x.id)).size,d.milestones.length);
assert.equal(d.milestones.filter(x=>x.state==='current').length,1,'one current checkpoint');
assert.equal(d.milestones.at(-1).state,'current');
assert.equal(d.probe.restoreVerified,false);
assert.equal(d.probe.outerPolicyUpdated,false);
assert.equal(d.probe.generalImprovementProven,false);
for(const m of d.milestones){assert.ok(m.title&&m.summary&&m.details&&m.source);assert.ok(['done','negative','blocked','unknown','current'].includes(m.state));assert.ok(['foundation','wsp','seal','infra'].includes(m.track));}
for(const r of d.references)assert.equal(new URL(r.url).protocol,'https:');
assert.equal(new Set(d.nextSteps.map(x=>x.id)).size,d.nextSteps.length);
assert.ok(existsSync('public/research/PROJECT_STATUS.md'));
const md=readFileSync('public/research/PROJECT_STATUS.md','utf8');
assert.ok(md.includes(d.sourceVersion));
for(const m of d.milestones)assert.ok(md.includes(m.title),`report missing ${m.id}`);
console.log('Research checkpoint, unique timeline, evidence labels, export parity and report verified.');
