import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const d=JSON.parse(readFileSync('src/datasets.json'));assert.equal(d.length,26);assert.equal(new Set(d.map(x=>x.id)).size,26);assert.equal(new Set(d.map(x=>x.url)).size,26);for(const x of d){for(const k of ['id','name','publisher','url','purpose','use'])assert.ok(x[k],`${x.id} ${k}`);assert.ok(x.url.startsWith('https://huggingface.co/datasets/'));}
const src=readFileSync('src/main.tsx','utf8');
for(const needle of ['/student-training','كيف تدرّب Student صغيرًا على استخدام الأدوات والكمبيوتر؟','تسجيل فاتورة مرة واحدة','rikiyat.github.io/blog/weight-space-programming','github.com/RikiyaT/lm_understand-logs/tree/main/exp8_math'])assert.ok(src.includes(needle),needle);
for(const id of ['CU02','CU06','EV04','EV03','AT03','AT01','AT02','CU01','EV02'])assert.ok(src.includes('id="'+id+'"'),id);
for(const path of ['/datasets/CU08','/datasets/EV01'])assert.ok(src.includes(path),path);
for(const needle of ['/self-evolving','E1–E8','θ_cand = θ(t) + Δθ','θ(t+1) = θ_cand','التطور الذاتي 3D (flexagents)'])assert.ok(src.includes(needle),needle);
const sim=readFileSync('src/components/FlexAgentsSimulator3D.tsx','utf8');
for(const needle of ['cancelAnimationFrame','forceContextLoss','/datasets/','requestAnimationFrame'])assert.ok(sim.includes(needle),needle);
const model=readFileSync('src/flexagents/model.ts','utf8');
for(const id of ['CU01','CU02','AT01','AT03'])assert.ok(model.includes(id),id);
assert.equal(model.match(/code: 'E/g).length,8);
console.log('26 unique dataset records validated');
console.log('student training guide links validated');
console.log('self-evolving plane linked to the four library datasets');
