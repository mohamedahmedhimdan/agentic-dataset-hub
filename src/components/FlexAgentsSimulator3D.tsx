import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Clock,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import {CANDIDATE_LOSS, DOMAINS, STAGES, type Domain} from '../flexagents/model';

type Tone = 'mint' | 'rose' | 'emerald';
type LogLine = {t: string; msg: string; tone: Tone};
type Snap = {
  stageIdx: number;
  domainId: string;
  running: boolean;
  forceRollback: boolean;
  inRollback: boolean;
  sound: boolean;
  commits: number;
  elapsed: string;
  prompt: string;
  logs: LogLine[];
};

const INITIAL: Snap = {
  stageIdx: 0,
  domainId: DOMAINS[0].id,
  running: false,
  forceRollback: false,
  inRollback: false,
  sound: true,
  commits: 12,
  elapsed: '00.0s',
  prompt: DOMAINS[0].promptAr,
  logs: [],
};

function nowStamp() {
  return new Date().toLocaleTimeString('en-GB', {hour12: false});
}

function domainById(id: string): Domain {
  return DOMAINS.find(d => d.id === id) ?? DOMAINS[0];
}

export default function FlexAgentsSimulator3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sensRef = useRef<HTMLCanvasElement>(null);
  const loraRef = useRef<HTMLCanvasElement>(null);
  const lossRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({...INITIAL, logs: [] as LogLine[]});
  const [snap, setSnap] = useState<Snap>(INITIAL);
  const api = useRef({
    setCam: (_x: number, _y: number, _z: number) => {},
    resetRot: () => {},
    paint: () => {},
  });

  function publish() {
    const s = stateRef.current;
    setSnap({
      stageIdx: s.stageIdx,
      domainId: s.domainId,
      running: s.running,
      forceRollback: s.forceRollback,
      inRollback: s.inRollback,
      sound: s.sound,
      commits: s.commits,
      elapsed: s.elapsed,
      prompt: s.prompt,
      logs: s.logs.slice(0, 14),
    });
    api.current.paint();
  }

  useEffect(() => {
    const mount = mountRef.current;
    const sens = sensRef.current;
    const lora = loraRef.current;
    const loss = lossRef.current;
    if (!mount || !sens || !lora || !loss) return;

    const scene = new Scene();
    const camera = new PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.7, 8.8);
    const renderer = new WebGLRenderer({antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    scene.add(new AmbientLight(0x0f2942, 1.8));
    const coreLight = new PointLight(0x2dd4bf, 3.2, 16);
    scene.add(coreLight);

    const core = new Group();
    scene.add(core);

    const outerGeo = new BoxGeometry(3.4, 3.4, 3.4);
    const outerMat = new MeshPhysicalMaterial({
      color: 0x0c1726,
      transparent: true,
      opacity: 0.24,
      roughness: 0.15,
      metalness: 0.2,
    });
    core.add(new Mesh(outerGeo, outerMat));
    const edgeMat = new LineBasicMaterial({color: 0x2dd4bf, transparent: true, opacity: 0.85});
    core.add(new LineSegments(new EdgesGeometry(outerGeo), edgeMat));

    const sandGeo = new BoxGeometry(2.3, 2.3, 2.3);
    const sandMat = new LineBasicMaterial({color: 0xf59e0b, transparent: true, opacity: 0.22});
    const sandbox = new LineSegments(new EdgesGeometry(sandGeo), sandMat);
    core.add(sandbox);

    const nodes: Mesh[] = [];
    const nodeGeo = new SphereGeometry(0.08, 12, 12);
    const spacing = 0.56;
    const offset = (3 * spacing) / 2;
    const nodeGroup = new Group();
    core.add(nodeGroup);
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        for (let z = 0; z < 4; z++) {
          const mat = new MeshBasicMaterial({color: 0x2dd4bf, transparent: true, opacity: 0.9});
          const mesh = new Mesh(nodeGeo, mat);
          mesh.position.set(x * spacing - offset, y * spacing - offset, z * spacing - offset);
          mesh.userData = {target: y === 2 && (x === 1 || x === 2), mat};
          nodeGroup.add(mesh);
          nodes.push(mesh);
        }
      }
    }

    const coords: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].position.distanceTo(nodes[j].position) <= spacing * 1.05) {
          coords.push(nodes[i].position.x, nodes[i].position.y, nodes[i].position.z, nodes[j].position.x, nodes[j].position.y, nodes[j].position.z);
        }
      }
    }
    const synGeom = new BufferGeometry();
    synGeom.setAttribute('position', new Float32BufferAttribute(coords, 3));
    const synMat = new LineBasicMaterial({color: 0x2dd4bf, transparent: true, opacity: 0.22});
    nodeGroup.add(new LineSegments(synGeom, synMat));

    const ring = new Mesh(
      new TorusGeometry(2.9, 0.015, 16, 90),
      new MeshBasicMaterial({color: 0x00f3ff, transparent: true, opacity: 0.45}),
    );
    ring.rotation.x = Math.PI / 2.2;
    scene.add(ring);

    const camCurrent = new Vector3(0, 1.7, 8.8);
    const camTarget = new Vector3(0, 1.7, 8.8);
    let dragging = false;
    let prevX = 0;
    let prevY = 0;
    let rotY = 0.4;
    let rotX = 0.15;

    api.current.setCam = (x, y, z) => camTarget.set(x, y, z);
    api.current.resetRot = () => {
      rotX = 0.15;
      rotY = 0.4;
    };
    api.current.paint = () => {
      const s = stateRef.current;
      const stage = STAGES[s.stageIdx];
      if (s.inRollback) {
        edgeMat.color.setHex(0xf43f5e);
        sandMat.color.setHex(0xf43f5e);
        sandMat.opacity = 0.9;
      } else if (stage.id >= 4 && stage.id <= 6) {
        edgeMat.color.setHex(0x2dd4bf);
        sandMat.color.setHex(0xf59e0b);
        sandMat.opacity = 0.85;
      } else {
        edgeMat.color.setHex(0x2dd4bf);
        sandMat.color.setHex(0xf59e0b);
        sandMat.opacity = 0.22;
      }
      for (const n of nodes) {
        const mat = n.userData.mat as MeshBasicMaterial;
        const target = Boolean(n.userData.target);
        if (s.inRollback) mat.color.setHex(0xf43f5e);
        else if (stage.id >= 2 && stage.id <= 6 && target) mat.color.setHex(0xf59e0b);
        else mat.color.setHex(0x2dd4bf);
      }
    };

    const resize = () => {
      const w = mount.clientWidth || 640;
      const h = mount.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const onDown = (e: PointerEvent) => {
      dragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      rotY += (e.clientX - prevX) * 0.007;
      rotX = Math.max(-0.7, Math.min(0.7, rotX + (e.clientY - prevY) * 0.007));
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const drawHeat = (time: number) => {
      const w = Math.max(2, Math.floor(sens.clientWidth || 140));
      const h = Math.max(2, Math.floor(sens.clientHeight || 96));
      if (sens.width !== w) sens.width = w;
      if (sens.height !== h) sens.height = h;
      if (lora.width !== w) lora.width = w;
      if (lora.height !== h) lora.height = h;
      const ctxS = sens.getContext('2d');
      const ctxL = lora.getContext('2d');
      if (!ctxS || !ctxL) return;
      const cols = 7;
      const rows = 5;
      const cw = w / cols;
      const ch = h / rows;
      const stageId = STAGES[stateRef.current.stageIdx].id;
      const rollback = stateRef.current.inRollback;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wave = 0.5 + 0.5 * Math.sin(time * 2.4 + r * 0.8 + c * 0.6);
          const hot = r === 2 && c >= 2 && c <= 4;
          const val = hot ? 0.65 + 0.35 * wave : 0.25 * wave;
          ctxS.fillStyle = rollback ? `rgba(244, 63, 94, ${0.3 + val * 0.7})` : hot ? `rgba(245, 158, 11, ${val})` : `rgba(45, 212, 191, ${0.15 + val * 0.7})`;
          ctxS.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
          const loraOn = stageId >= 4 && hot;
          ctxL.fillStyle = rollback && hot
            ? 'rgba(244, 63, 94, 0.85)'
            : stageId === 8 && hot
              ? `rgba(45, 212, 191, ${0.7 + 0.3 * wave})`
              : `rgba(245, 158, 11, ${loraOn ? 0.5 + 0.45 * wave : 0.07})`;
          ctxL.fillRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
        }
      }
    };

    const drawLoss = (time: number) => {
      const w = Math.max(2, Math.floor(loss.clientWidth || 260));
      const h = Math.max(2, Math.floor(loss.clientHeight || 110));
      if (loss.width !== w) loss.width = w;
      if (loss.height !== h) loss.height = h;
      const ctx = loss.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.28)';
      ctx.lineWidth = 1.2;
      for (let x = 0; x <= w; x += 8) {
        const y = h * 0.55 + Math.sin((x / w) * Math.PI * 2.5 + time) * 12;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const steps = Math.max(2, stateRef.current.stageIdx + 1);
      ctx.beginPath();
      ctx.strokeStyle = stateRef.current.inRollback ? '#f43f5e' : '#2dd4bf';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < steps; i++) {
        const px = 14 + (i / 7) * (w - 28);
        const v = stateRef.current.inRollback && i === steps - 1 ? 0.76 : CANDIDATE_LOSS[i];
        const py = h - 14 - (1 - v) * (h - 28);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    };

    const clock = new Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      camCurrent.lerp(camTarget, 0.05);
      camera.position.copy(camCurrent);
      camera.lookAt(0, 0, 0);
      if (!dragging) rotY += 0.0035;
      core.rotation.y = rotY;
      core.rotation.x = rotX + Math.sin(t * 0.6) * 0.04;
      ring.rotation.z = t * 0.3;
      coreLight.intensity = 2.4 + Math.sin(t * 1.6) * 0.6;
      const stageId = STAGES[stateRef.current.stageIdx].id;
      nodes.forEach((n, idx) => {
        const pulse = 1 + 0.2 * Math.sin(t * 3.5 + idx * 0.4);
        const boost = stageId >= 2 && stageId <= 6 && n.userData.target ? 1.4 : 1;
        n.scale.setScalar(pulse * boost);
      });
      renderer.render(scene, camera);
      drawHeat(t);
      drawLoss(t);
    };
    api.current.paint();
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      scene.traverse(obj => {
        const mesh = obj as Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as MeshBasicMaterial | MeshBasicMaterial[] | undefined;
        if (Array.isArray(material)) material.forEach(m => m.dispose());
        else material?.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  const timers = useRef<{step?: number; clock?: number}>({});
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (timers.current.step) window.clearTimeout(timers.current.step);
      if (timers.current.clock) window.clearInterval(timers.current.clock);
      void audioRef.current?.close();
    };
  }, []);

  function playTone(freq = 520, type: OscillatorType = 'sine', duration = 0.11, second?: number) {
    if (!stateRef.current.sound) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
      if (!audioRef.current) audioRef.current = new Ctx();
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (second) osc.frequency.exponentialRampToValueAtTime(second, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.045, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* Autoplay policies and missing audio devices stay silent. */
    }
  }

  function log(msg: string, tone: Tone = 'mint') {
    stateRef.current.logs = [{t: nowStamp(), msg, tone}, ...stateRef.current.logs].slice(0, 14);
  }

  function goToStage(idx: number) {
    const s = stateRef.current;
    s.stageIdx = (idx + STAGES.length) % STAGES.length;
    const stage = STAGES[s.stageIdx];
    log(`[${stage.code}] ${stage.fullTitleAr}`);
    playTone(400 + s.stageIdx * 60, 'triangle', 0.12, 540 + s.stageIdx * 70);
    api.current.setCam(stage.cam.x, stage.cam.y, stage.cam.z);
    publish();
  }

  function stopSim() {
    stateRef.current.running = false;
    if (timers.current.step) window.clearTimeout(timers.current.step);
    if (timers.current.clock) window.clearInterval(timers.current.clock);
    publish();
  }

  function finishCommit() {
    const s = stateRef.current;
    s.commits += 1;
    s.running = false;
    if (timers.current.clock) window.clearInterval(timers.current.clock);
    playTone(587, 'sine', 0.25, 880);
    log('دُمج التحديث بعد اجتياز بوابة الأمان.', 'emerald');
    publish();
  }

  function scheduleStep() {
    timers.current.step = window.setTimeout(() => {
      const s = stateRef.current;
      if (!s.running) return;
      if (s.stageIdx === 6 && s.forceRollback) {
        s.forceRollback = false;
        s.inRollback = true;
        playTone(210, 'sawtooth', 0.35, 130);
        log('بوابة الأمان رصدت تراجعًا. رُفض Δθ وأُعيدت الحلقة إلى E3.', 'rose');
        publish();
        timers.current.step = window.setTimeout(() => {
          if (!stateRef.current.running) return;
          stateRef.current.inRollback = false;
          goToStage(2);
          scheduleStep();
        }, 2100);
        return;
      }
      if (s.stageIdx < STAGES.length - 1) {
        goToStage(s.stageIdx + 1);
        scheduleStep();
      } else finishCommit();
    }, 2000);
  }

  function startSim() {
    stopSim();
    const s = stateRef.current;
    s.running = true;
    s.inRollback = false;
    const started = performance.now();
    s.elapsed = '00.0s';
    timers.current.clock = window.setInterval(() => {
      const elapsed = `${((performance.now() - started) / 1000).toFixed(1)}s`;
      stateRef.current.elapsed = elapsed;
      setSnap(prev => prev.elapsed === elapsed ? prev : {...prev, elapsed});
    }, 100);
    goToStage(0);
    scheduleStep();
  }

  function selectDomain(d: Domain) {
    const s = stateRef.current;
    s.domainId = d.id;
    s.prompt = d.promptAr;
    log(`رُبطت بيئة الظل بالمصدر ${d.datasetId} ${d.name}.`);
    playTone(620, 'sine', 0.08, 860);
    publish();
  }

  function setCamera(mode: 'overview' | 'core' | 'sandbox' | 'top') {
    if (mode === 'overview') api.current.setCam(0, 1.7, 8.8);
    else if (mode === 'core') api.current.setCam(0, 0.2, 5);
    else if (mode === 'sandbox') api.current.setCam(0, 0.4, 4);
    else api.current.setCam(0, 7, 2);
  }

  const stage = STAGES[snap.stageIdx];
  const domain = domainById(snap.domainId);
  const lossVal = snap.inRollback ? 0.785 : stage.lossTarget;
  const accuracy = snap.inRollback ? '72.1%' : `${(91.5 + stage.id * 0.95).toFixed(1)}%`;
  const sandboxOn = stage.id >= 4 && stage.id <= 6 && !snap.inRollback;
  const final = snap.inRollback
    ? {tone: 'rose' as const, label: 'تراجع آمن', text: 'رُفض التحديث المرشح وبقيت الأوزان النشطة كما هي. أُعيدت الحلقة إلى التفكير في الأوزان، المرحلة E3.', formula: 'rollback → θ(t)'}
    : stage.id === 8
      ? {tone: 'emerald' as const, label: 'دمج مقبول', text: domain.outputAr, formula: 'θ(t+1) = θ_cand'}
      : {tone: 'mint' as const, label: stage.code, text: stage.nameAr, formula: stage.formula};

  return (
    <div className="fx-sim">
      <div className="fx-toolbar">
        <div>
          <span className="eyebrow">INTERACTIVE 3D WEIGHT-SPACE</span>
          <h2>محاكي دورة الطلب وتعديل الأوزان</h2>
        </div>
        <div className="fx-toolbar-actions">
          <button type="button" className={'fx-chip' + (snap.forceRollback ? ' is-hot' : '')} onClick={() => {stateRef.current.forceRollback = !stateRef.current.forceRollback; publish();}}>
            <i />{snap.forceRollback ? 'اختبار التراجع: مفعّل' : 'اختبار التراجع: متوقف'}
          </button>
          <button type="button" className="fx-chip" onClick={() => {api.current.resetRot(); const st = STAGES[stateRef.current.stageIdx]; api.current.setCam(st.cam.x, st.cam.y, st.cam.z);}}>ضبط الكاميرا</button>
          <button type="button" className="fx-chip fx-mono" onClick={() => {stateRef.current.sound = !stateRef.current.sound; publish();}}>{snap.sound ? 'SFX: ON' : 'SFX: OFF'}</button>
        </div>
      </div>

      <div className="fx-grid">
        <div className="fx-col">
          <section className="fx-card">
            <div className="fx-head"><h3>بيئات الظل ومصادر المكتبة</h3><span className="fx-mono">4 DOMAINS</span></div>
            <div className="fx-domains">
              {DOMAINS.map(d => (
                <button key={d.id} type="button" className={'fx-domain' + (d.id === snap.domainId ? ' is-on' : '')} onClick={() => selectDomain(d)}>
                  <span className="fx-domain-top"><b>{d.titleAr}</b><span className="fx-mono">{d.datasetId}</span></span>
                  <span className="fx-mono fx-dim">{d.name}</span>
                  <span className="fx-dim">{d.metrics}</span>
                </button>
              ))}
            </div>
            <Link className="textlink" to={'/datasets/' + domain.datasetId}>بطاقة {domain.datasetId} {domain.name}</Link>
          </section>
          <section className="fx-card fx-grow">
            <div className="fx-head"><h3>مهمة الطالب</h3><span className="fx-mono fx-mint">{snap.elapsed}</span></div>
            <textarea value={snap.prompt} rows={4} onChange={e => {stateRef.current.prompt = e.target.value; publish();}} aria-label="مهمة الطالب" />
            <p className="fx-adapt">{domain.adaptAr}</p>
            <div className="fx-heats">
              <div>
                <span>حساسية المعاملات <b dir="ltr" className="fx-mono fx-cyan">S_ij</b></span>
                <canvas ref={sensRef} />
              </div>
              <div>
                <span>تحديث لورا <b dir="ltr" className="fx-mono fx-amber">Δθ r=8</b></span>
                <canvas ref={loraRef} />
              </div>
            </div>
            <div className="fx-run">
              <button type="button" className="fx-go" onClick={() => (snap.running ? stopSim() : startSim())}>{snap.running ? 'إيقاف المحاكاة' : 'تشغيل دورة E1–E8'}</button>
              <button type="button" className="fx-step" onClick={() => {stopSim(); stateRef.current.inRollback = false; goToStage(stateRef.current.stageIdx + 1);}}>خطوة</button>
            </div>
          </section>
        </div>

        <section className="fx-card fx-viewport" aria-label="مجسّم ثلاثي الأبعاد لنواة الطالب وبيئة الظل وبوابة الأمان">
          <div ref={mountRef} className="fx-webgl" />
          <div className="fx-hud">
            <div className="fx-hud-top">
              <span className={'fx-badge' + (stage.theme === 'amber' ? ' is-amber' : '')}>{stage.code} / E8</span>
              <h3>{stage.fullTitleAr}</h3>
              <span className="fx-mono fx-eq">{stage.formula}</span>
            </div>
            <p>{stage.descAr}</p>
          </div>
          <div className="fx-alerts">
            {sandboxOn && <div className="fx-alert fx-alert-sand">SHADOW SANDBOX · θ_cand = θ(t) + Δθ</div>}
            {snap.inRollback && <div className="fx-alert fx-alert-roll">SAFETY GATE · رُصد تراجع، وجارٍ التراجع إلى θ(t)</div>}
          </div>
          <div className="fx-cam">
            <span>اسحب المجسّم للتدوير</span>
            <div>
              <button type="button" onClick={() => setCamera('overview')}>Overview</button>
              <button type="button" onClick={() => setCamera('core')}>Student Core</button>
              <button type="button" onClick={() => setCamera('sandbox')}>Shadow</button>
              <button type="button" onClick={() => setCamera('top')}>Top</button>
            </div>
          </div>
        </section>

        <div className="fx-col">
          <section className="fx-card">
            <div className="fx-head">
              <div><h3>منحنى الخسارة</h3><p className="fx-mono fx-mint">L(θ) trajectory</p></div>
              <b className={'fx-mono' + (snap.inRollback ? ' fx-rose' : ' fx-mint')}>L = {lossVal.toFixed(3)}</b>
            </div>
            <canvas ref={lossRef} className="fx-loss" />
            <div className="fx-metrics">
              <div><span>عدم اليقين</span><b className="fx-mono fx-cyan">{stage.uncertainty.toFixed(2)}</b></div>
              <div><span>دقة الظل</span><b className="fx-mono fx-mint">{accuracy}</b></div>
              <div><span>دمج مقبول</span><b className="fx-mono fx-amber">{snap.commits}</b></div>
            </div>
          </section>
          <section className="fx-card">
            <div className="fx-head">
              <h3>بوابة الأمان</h3>
              <span className={'fx-pill' + (snap.inRollback ? ' is-bad' : stage.id >= 7 ? ' is-ok' : '')}>{snap.inRollback ? 'ROLLBACK' : stage.id >= 7 ? 'VERIFIED' : 'WATCHING'}</span>
            </div>
            <ul className="fx-checks">
              <li><span>كسب الخسارة</span><b dir="ltr" className={'fx-mono ' + (snap.inRollback ? 'fx-rose' : 'fx-mint')}>{snap.inRollback ? 'ΔL = +0.210' : `ΔL = −${(0.72 - lossVal).toFixed(3)}`}</b></li>
              <li><span>حد التراجع</span><b dir="ltr" className={'fx-mono ' + (snap.inRollback ? 'fx-rose' : 'fx-mint')}>{snap.inRollback ? 'regression > 0.01' : 'regression ≤ 0.01'}</b></li>
              <li><span>حجم التحديث</span><b dir="ltr" className={'fx-mono ' + (snap.inRollback ? 'fx-rose' : 'fx-mint')}>{snap.inRollback ? '||Δθ|| unstable' : '||Δθ|| ≤ τ'}</b></li>
            </ul>
          </section>
          <section className="fx-card fx-grow">
            <div className="fx-head"><h3>سجل الحلقة</h3><span className="fx-mono">RUNTIME</span></div>
            <div className="fx-log" aria-live="polite">
              {snap.logs.length === 0 && <p>اختر مصدرًا ثم شغّل الدورة، أو انتقل بين المراحل خطوة بخطوة.</p>}
              {snap.logs.map((line, i) => <p key={line.t + i} className={'fx-' + line.tone}><span className="fx-mono">{line.t}</span> {line.msg}</p>)}
            </div>
            <div className={'fx-final is-' + final.tone}><b>[{final.label}]</b> {final.text}{final.formula && <span dir="ltr" className="fx-mono">{final.formula}</span>}</div>
          </section>
        </div>
      </div>

      <div className="fx-card fx-timeline">
        <div className="fx-head"><h3>مراحل E1–E8</h3><span className="fx-mono">اضغط مرحلة لفحصها في المجسّم</span></div>
        <div className="fx-stages">
          {STAGES.map((st, idx) => {
            const current = idx === snap.stageIdx;
            const done = idx < snap.stageIdx;
            const cls = current ? (snap.inRollback ? 'is-roll' : st.theme === 'amber' ? 'is-amber' : 'is-now') : done ? 'is-done' : '';
            return (
              <button key={st.code} type="button" className={cls} onClick={() => {stopSim(); stateRef.current.inRollback = false; goToStage(idx);}}>
                <span><b className="fx-mono">{st.code}</b><i>{done ? '✓' : current ? '●' : '○'}</i></span>
                {st.nameAr}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
