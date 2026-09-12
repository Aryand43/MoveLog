// Generates index.html — a seek-safe HyperFrames composition of the MoveMate walkthrough.
// Edit the DATA blocks below, run `node build.mjs`, then `npx hyperframes check`.
import fs from 'fs';

const D = 121;            // total seconds
const esc = s => s;       // captions carry intentional markup

// ---------------------------------------------------------------- captions
const CAPS = [
  [1.2, 5.2,  '<b>MoveMate</b> — a voice agent for movers and packers'],
  [6.8, 10.0, 'A packing crew logs a hundred boxes a day on paper.'],
  [10.0,13.0, "Ops finds out what's inside them tomorrow."],
  [13.0,17.0, 'And when something is already damaged, nobody knows whose fault it is until the claim lands.'],
  [18.2,22.0, 'MoveMate is <b>one agent</b> that lives in three places.'],
  [22.0,25.6, "The packer's <b>earbuds</b>. The ops team's <b>Telegram group</b>. The customer's <b>private chat</b>."],
  [26.6,29.6, 'He taps start. The phone goes in his pocket and stays there.'],
  [30.4,34.2, '<b>"Box twelve, kitchen. Glasses, the blender, two chopping boards. Fragile."</b>'],
  [34.2,37.4, '<i>"Twelve, kitchen, three items, fragile."</i> — 1.4 seconds, no screen touched'],
  [38.2,41.0, '<b>"Actually put the phone chargers in that one too."</b>'],
  [41.0,44.6, 'A mid-sentence correction, handled. This is a conversation, not a form.'],
  [45.4,48.0, '<b>"Where did the router go?"</b>'],
  [48.0,51.6, '<i>"Box A9, study."</i> — every box logged today is queryable, by voice, mid-lift'],
  [52.4,55.4, '<b>"The oak dresser has a scratch on the left side."</b>'],
  [55.4,58.8, "<i>\"Noted — that one's on the survey.\"</i> — pre-existing damage, recognised, no escalation"],
  [59.6,62.6, '<b>"The sofa has a tear on the back cushion."</b>'],
  [62.6,65.4, '<i>"Not on the survey. Grab a photo."</i>'],
  [65.4,68.6, 'He taps once. The photo goes to GPT‑5.6 Luna — not into the voice session.'],
  [68.6,71.6, '<i>"Six-inch tear, minor, looks new. Logging it."</i>'],
  [73.6,77.6, 'Ops never opened a dashboard. The card came to where they already are.'],
  [77.6,81.4, 'Photo, assessment, survey verdict — and three buttons that actually resolve the case.'],
  [84.2,86.6, 'Priya taps <b>Wrap and load</b>.'],
  [86.6,91.4, '<i>"Ops says wrap and load. Claim opened."</i> — spoken into his earbuds, in the same session'],
  [91.4,95.2, 'Twenty-seven seconds, defect to decision. Nobody typed. Nobody put the box down.'],
  [96.2,100.6,'At handover the customer gets a deep link to the same bot — scoped to their move only.'],
  [100.6,104.0,'<b>"Did my TV get packed?"</b>'],
  [104.0,108.2,'Every answer comes from the same tools the packer used. One source of truth.'],
  [114.4,118.8,'No chatbox could carry that round trip alone.'],
];

// ------------------------------------------------------- scene 4 transcript
const TR = [  // [time, kind, text]
  [30.0,'me','Box twelve, kitchen. Glasses, the blender, two chopping boards. Fragile.'],
  [34.2,'ag','Twelve, kitchen, three items, fragile.'],
  [38.2,'me','Actually put the phone chargers in that one too.'],
  [41.0,'ag','Added — four items.'],
  [45.4,'me','Where did the router go?'],
  [48.0,'ag','Box A9, study.'],
  [52.4,'me','The oak dresser has a scratch on the left side.'],
  [55.4,'ag',"Noted — that one's on the survey."],
  [59.6,'me','The sofa has a tear on the back cushion.'],
  [62.6,'ag','Not on the survey. Grab a photo.'],
  [68.6,'ag','Six-inch tear, minor, looks new. Logging it.'],
];
const ROWS = [ // [time, clock, text, cls]
  [28.0,'09:14:02','session_started · packer A',''],
  [32.6,'09:14:11','item_logged · A12 · glasses',''],
  [33.1,'09:14:11','item_logged · A12 · blender',''],
  [33.6,'09:14:11','item_logged · A12 · chopping boards ×2',''],
  [40.4,'09:14:19','item_logged · A12 · phone chargers',''],
  [47.2,'09:14:26','query_asked · find_item "router"',''],
  [54.6,'09:15:03','check_survey · MATCH "oak dresser: scratch left side"','ok'],
  [61.8,'09:15:22','check_survey · NO MATCH · sofa','warn'],
  [65.4,'09:15:28','photo_received · 1 image','warn'],
  [67.6,'09:15:31','assessment_done · tear · minor · likely_new','warn'],
];
const CHIPS = [[32.6,'glasses',0],[33.1,'blender',0],[33.6,'chopping boards ×2',0],[33.9,'FRAGILE',1],[40.4,'phone chargers',0]];
const TR5 = [[72.6,'me','The sofa has a tear on the back cushion.'],[73.2,'ag','Six-inch tear, minor, looks new. Logging it.'],[86.6,'ag','Ops says wrap and load. Claim opened.']];
const CTG = [[99.4,'in','Hi — I have your move. Ask me anything.'],[100.6,'out','did my TV get packed?'],[102.4,'in','Yes — box A7, living room, marked fragile. Packed at 10:42 and logged with a photo.']];
const MAN = [[97.0,'Box A9','router, cables, desk lamp','STUDY'],[97.5,'Box A12','glasses, blender, chopping boards ×2, phone chargers','FRAGILE'],[98.0,'Box A13','plates, bowls, cutlery tray','KITCHEN']];

const SCENES = [['s1',0,6],['s2',6,11.6],['s3',17.6,8.6],['s4',26.2,46],['s5',72.2,23.6],['s6',95.8,13],['s7',108.8,12.2]];

// ---------------------------------------------------------------- fragments
const bubbles = (arr,pfx) => arr.map(([t,k,txt],i)=>
  `<div class="b ${k}" id="${pfx}${i}">${k==='ag'?'<span class="who">MoveMate</span>':''}<span>${txt}</span></div>`).join('\n          ');
const rows = ROWS.map(([t,clk,txt,c],i)=>
  `<div class="r ${c}" id="row${i}"><span class="t">${clk}</span><span class="e">${txt}</span></div>`).join('\n            ');
const chips = CHIPS.map(([t,txt,f],i)=>`<div class="chip${f?' frag':''}" id="chip${i}">${txt}</div>`).join('');
const caps = CAPS.map(([a,b,txt],i)=>
  `<div class="cap clip" id="cap${i}" data-start="${a}" data-duration="${(b-a).toFixed(2)}">${txt}</div>`).join('\n      ');
const ctg = CTG.map(([t,d,txt],i)=>`<div class="tgm ${d==='out'?'out':''}" id="ctg${i}">${txt}</div>`).join('\n            ');
const man = MAN.map(([t,bx,it,tag],i)=>
  `<div class="mrow" id="man${i}"><div><div class="bx">${bx}</div><div class="it">${it}</div></div><div class="tag2">${tag}</div></div>`).join('\n            ');
const bars = n => Array.from({length:n},(_,i)=>`<i class="bar"></i>`).join('');

const SOFA = `<svg viewBox="0 0 420 128" preserveAspectRatio="xMidYMid slice">
              <defs><linearGradient id="gsofa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5568"/><stop offset="1" stop-color="#2d3748"/></linearGradient></defs>
              <rect width="420" height="128" fill="#1a2029"/><rect x="34" y="26" width="352" height="84" rx="13" fill="url(#gsofa)"/>
              <rect x="48" y="38" width="156" height="60" rx="9" fill="#556075" opacity=".75"/><rect x="216" y="38" width="156" height="60" rx="9" fill="#556075" opacity=".75"/>
              <path d="M243 52 l13 11 -7 6 14 12 -9 5 12 10" stroke="#e2564a" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M243 52 l13 11 -7 6 14 12 -9 5 12 10" stroke="#ff9d94" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="262" cy="74" r="35" fill="none" stroke="#ef5d52" stroke-width="2" stroke-dasharray="6 5" opacity=".85"/></svg>`;

const html = `<!doctype html>
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>MoveMate Walkthrough</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      html,body{width:1920px;height:1080px;overflow:hidden;background:#0a0c10}
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif}
      :root{--bg:#0a0c10;--panel:#141920;--line:#2a3340;--ink:#eef3f8;--dim:#8a99ab;--amber:#f2a355;
            --cyan:#5fd3dc;--red:#ef5d52;--green:#4fc98a;--tg:#2b5278;--tgbg:#17212b}
      #root{position:relative;background:var(--bg)}
      #board{position:absolute;top:0;left:0;width:1280px;height:720px;transform:scale(1.5);transform-origin:0 0;color:var(--ink)}
      #grid{position:absolute;inset:0;opacity:.35;
        background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
        background-size:64px 64px;-webkit-mask-image:radial-gradient(ellipse 90% 70% at 50% 45%,#000 30%,transparent 100%)}
      .scene{position:absolute;inset:0}
      .cap{position:absolute;left:50%;margin-left:-480px;width:960px;bottom:34px;padding:11px 22px;
        background:rgba(6,8,11,.86);border:1px solid var(--line);border-radius:10px;font-size:21px;line-height:1.42;text-align:center}
      .cap b{color:var(--amber);font-weight:600}.cap i{color:var(--cyan);font-style:normal}
      #timer{position:absolute;top:20px;left:50%;margin-left:-145px;width:290px;text-align:center;padding:8px 0;border-radius:999px;
        background:rgba(239,93,82,.12);border:1px solid rgba(239,93,82,.5);
        font:600 17px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#ff9d94}
      #timer.done{background:rgba(79,201,138,.14);border-color:rgba(79,201,138,.55);color:#7fe6b0}
      .tw{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}
      .logo{font-size:76px;font-weight:700;letter-spacing:-2.5px}.logo span{color:var(--amber)}
      .tag{font-size:23px;color:var(--dim)}.rule{width:74px;height:3px;background:var(--amber);border-radius:2px}
      .badge{position:absolute;bottom:104px;left:0;right:0;text-align:center;font-size:13px;color:#8697a8;letter-spacing:2.2px;text-transform:uppercase}
      .prob{display:flex;flex-direction:column;gap:26px;align-items:flex-start;width:760px}
      .pl{font-size:31px;line-height:1.3;color:#c6d2de}.pl b{color:#fff;font-weight:600}
      .surf{display:flex;gap:26px;align-items:stretch;justify-content:center;height:100%;padding:150px 60px 120px}
      .sc{flex:1;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:30px 26px;display:flex;flex-direction:column;gap:13px}
      .sc .ic{font-size:42px}.sc h3{font-size:22px;font-weight:600}.sc p{font-size:16px;color:var(--dim);line-height:1.5}
      .sc .who2{margin-top:auto;font-size:13px;letter-spacing:1.6px;text-transform:uppercase;color:var(--amber)}
      .row{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:34px;padding:40px 56px 112px}
      .hdr{position:absolute;top:30px;left:56px;font-size:13px;letter-spacing:2.4px;text-transform:uppercase;color:#8697a8}
      .hdr b{color:var(--amber);font-weight:600}
      .phone{width:326px;height:540px;border-radius:38px;background:#05070a;border:9px solid #222a35;
        box-shadow:0 30px 70px rgba(0,0,0,.6);padding:16px 15px;display:flex;flex-direction:column;gap:11px;position:relative;flex:none}
      .notch{position:absolute;top:9px;left:50%;margin-left:-48px;width:96px;height:19px;background:#222a35;border-radius:0 0 11px 11px}
      .ph-top{display:flex;justify-content:space-between;align-items:center;padding-top:12px}
      .ph-title{font-size:15px;font-weight:600}
      .ph-pill{display:inline-flex;align-items:center;gap:7px;font-size:12px;padding:5px 11px;border-radius:999px;
        background:rgba(79,201,138,.13);color:#7fe6b0;border:1px solid rgba(79,201,138,.35)}
      .dot{width:7px;height:7px;border-radius:50%;background:currentColor}
      .wave{height:46px;display:flex;align-items:center;justify-content:center;gap:4px}
      .bar{width:4px;height:8px;border-radius:2px;background:var(--cyan);opacity:.55;transform-origin:center}
      .trw{flex:1;overflow:hidden;position:relative}
      .tr{position:absolute;top:0;left:0;right:0;display:flex;flex-direction:column;gap:9px;padding:3px 1px}
      .b{max-width:87%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.38}
      .b.me{align-self:flex-end;background:#2c3542;border-bottom-right-radius:4px}
      .b.ag{align-self:flex-start;background:rgba(95,211,220,.13);border:1px solid rgba(95,211,220,.28);color:#c9f2f5;border-bottom-left-radius:4px}
      .b .who{display:block;font-size:10px;letter-spacing:1.3px;color:var(--cyan);margin-bottom:4px;text-transform:uppercase}
      .camb{padding:13px;border-radius:13px;background:var(--amber);color:#1a1206;font-weight:650;font-size:15px;text-align:center}
      .feed{width:412px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:17px;display:flex;flex-direction:column;gap:11px;flex:none}
      .feed h4{font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:var(--dim);display:flex;justify-content:space-between;align-items:center}
      .feed h4 em{font-style:normal;color:var(--green);font-size:11px}
      .roww{height:266px;overflow:hidden;position:relative}
      .rows{position:absolute;top:0;left:0;right:0;display:flex;flex-direction:column;gap:6px;font:12.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
      .r{display:flex;gap:9px;padding:7px 9px;background:#0e131a;border-left:2px solid var(--cyan);border-radius:5px}
      .r .t{color:#8a97a7;flex:none}.r .e{color:var(--cyan)}
      .r.warn{border-left-color:var(--red)}.r.warn .e{color:#ff9d94}
      .r.ok{border-left-color:var(--green)}.r.ok .e{color:#7fe6b0}
      .boxcard{background:#0e131a;border:1px solid var(--line);border-radius:11px;padding:13px}
      .boxcard .bh{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}
      .boxcard .bn{font-size:19px;font-weight:650}
      .boxcard .rm{font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:1.3px}
      .chips{display:flex;flex-wrap:wrap;gap:6px}
      .chip{font-size:12px;padding:4px 9px;border-radius:6px;background:#1d2530;color:#b9c7d6}
      .chip.frag{background:rgba(242,163,83,.15);color:var(--amber)}
      .tg{width:452px;background:var(--tgbg);border:1px solid #24313d;border-radius:14px;overflow:hidden;
        display:flex;flex-direction:column;flex:none;box-shadow:0 22px 55px rgba(0,0,0,.5)}
      .tg-head{padding:13px 17px;background:#1f2c3a;display:flex;align-items:center;gap:11px;border-bottom:1px solid #24313d}
      .tg-av{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#f2a355,#e0762f);display:grid;place-items:center;font-size:17px}
      .tg-head .n{font-size:15px;font-weight:600}.tg-head .s{font-size:11.5px;color:#93a8bc}
      .tg-body{flex:1;min-height:0;padding:15px;display:flex;flex-direction:column;justify-content:flex-end;gap:11px;overflow:hidden}
      .tgm{max-width:86%;padding:9px 13px;border-radius:12px;background:#212e3c;font-size:14px;line-height:1.4}
      .tgm.out{align-self:flex-end;background:var(--tg)}
      .card{background:#212e3c;border-radius:12px;overflow:hidden}
      .card-h{padding:11px 14px;background:rgba(239,93,82,.16);border-bottom:1px solid rgba(239,93,82,.3);
        font-size:14px;font-weight:650;color:#ffb0a8}
      .card-b{padding:13px 14px;display:flex;flex-direction:column;gap:11px}
      .shot{height:64px;border-radius:9px;overflow:hidden;position:relative;background:#0d1117}
      .shot svg{width:100%;height:100%;display:block}
      .shot .lbl{position:absolute;bottom:6px;left:8px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;
        color:#b6c4d2;background:rgba(0,0,0,.55);padding:3px 7px;border-radius:4px}
      .fl{display:flex;gap:10px;font-size:13px;line-height:1.45}
      .fl .k{color:#9ab0c3;width:106px;flex:none}.fl .v{color:#e3ebf3}.fl .v.no{color:#ff9d94;font-weight:600}
      .acts{display:flex;flex-direction:column;gap:7px;padding:0 14px 13px}
      .btn{padding:9px;border-radius:8px;background:#2b3d4f;text-align:center;font-size:13.5px;font-weight:600;color:#cfe0ef;border:1px solid #36495d}
      .btn.hot{background:#3a6ea5;border-color:#4d86c4;color:#fff}
      .decided{padding:9px 14px;margin:0 14px 13px;border-radius:9px;background:rgba(79,201,138,.13);
        border:1px solid rgba(79,201,138,.4);font-size:13.5px;color:#8fe9b8}
      .decided b{display:block;font-size:15px;color:#b6f3d3;margin-bottom:3px}
      #cursor{position:absolute;top:0;left:0;width:22px;height:22px;filter:drop-shadow(0 2px 5px rgba(0,0,0,.8))}
      #ripple{position:absolute;top:0;left:0;width:16px;height:16px;border-radius:50%;border:2px solid #fff}
      .man{width:470px;background:#fff;color:#1a1f26;border-radius:13px;overflow:hidden;flex:none;box-shadow:0 22px 55px rgba(0,0,0,.5)}
      .man-h{padding:15px 18px;background:#f3f5f8;border-bottom:1px solid #e2e7ee}
      .man-h .t1{font-size:17px;font-weight:700}.man-h .t2{font-size:12.5px;color:#4d5866;margin-top:2px}
      .man-b{padding:14px 18px;display:flex;flex-direction:column;gap:11px}
      .mrow{display:flex;justify-content:space-between;align-items:center;padding:9px 11px;background:#f7f9fb;border:1px solid #e7ecf2;border-radius:8px;font-size:13px}
      .mrow .bx{font-weight:700}.mrow .it{color:#4d5866;font-size:12px}
      .mrow .tag2{font-size:11px;padding:3px 8px;border-radius:5px;background:#fdf0e2;color:#a2621f;font-weight:600}
      .cond{margin:0 18px 16px;padding:11px 13px;border-radius:9px;background:#fef4f3;border:1px solid #f8ddd9;font-size:12.5px;color:#8a3b33}
      .cond b{display:block;margin-bottom:4px;font-size:13px}
      .arch{display:flex;gap:16px;align-items:center;justify-content:center;margin-top:8px}
      .ab{padding:13px 20px;border:1px solid var(--line);border-radius:11px;background:var(--panel);text-align:center}
      .ab .i2{font-size:25px}.ab .l2{font-size:13px;color:var(--dim);margin-top:5px}
      .arrow{color:var(--amber);font-size:24px}
      .kicker{font-size:26px;line-height:1.45;max-width:880px;text-align:center;color:#d7e2ed}
      .kicker b{color:var(--amber);font-weight:600}
      .stackline{font-size:13.5px;color:#8697a8;letter-spacing:1.5px}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-fps="30"
         data-width="1920" data-height="1080" data-layout-allow-overflow="true">
      <div id="board">
        <div id="grid"></div>

        <div class="scene clip" id="s1" data-start="0" data-duration="6">
          <div class="tw">
            <div class="logo" id="t-logo">Move<span>Mate</span></div>
            <div class="rule" id="t-rule"></div>
            <div class="tag" id="t-tag">One agent. Three surfaces. Zero keyboards.</div>
          </div>
          <div class="badge" id="t-badge">Animated product walkthrough</div>
        </div>

        <div class="scene clip" id="s2" data-start="6" data-duration="11.6">
          <div class="tw"><div class="prob">
            <div class="pl" id="p1">A packing crew logs <b>a hundred boxes a day</b> on paper.</div>
            <div class="pl" id="p2">Ops finds out what's inside them <b>tomorrow.</b></div>
            <div class="pl" id="p3">And when something is already broken, nobody knows whose fault it is until <b>the claim lands.</b></div>
          </div></div>
        </div>

        <div class="scene clip" id="s3" data-start="17.6" data-duration="8.6">
          <div class="hdr">One agent · <b>three surfaces</b></div>
          <div class="surf">
            <div class="sc" id="sc1"><div class="ic">🎧</div><h3>Earbuds</h3>
              <p>The packer narrates while their hands are full. GPT‑Live‑1 listens, delegates every tool call, and answers in under two seconds.</p>
              <div class="who2">Packer</div></div>
            <div class="sc" id="sc2"><div class="ic">💬</div><h3>Telegram group</h3>
              <p>Damage cards land where ops already live — photo, assessment, and buttons that actually resolve the case.</p>
              <div class="who2">Ops team</div></div>
            <div class="sc" id="sc3"><div class="ic">📦</div><h3>Private chat</h3>
              <p>At handover the customer gets the same bot, scoped to their move, plus a manifest of every box.</p>
              <div class="who2">Customer</div></div>
          </div>
        </div>

        <div class="scene clip" id="s4" data-start="26.2" data-duration="46">
          <div class="hdr">Packing · move <b>TAN-001</b> · packer A</div>
          <div class="row">
            <div class="phone">
              <div class="notch"></div>
              <div class="ph-top"><span class="ph-title">MoveMate</span>
                <span class="ph-pill"><span class="dot" id="dot4"></span>Listening</span></div>
              <div class="wave" id="wave4">${bars(14)}</div>
              <div class="trw"><div class="tr" id="tr">
          ${bubbles(TR,'b')}
              </div></div>
              <div class="camb" id="camb">📷  Take photo of damage</div>
            </div>
            <div class="feed">
              <h4>ClickHouse · events <em>● live</em></h4>
              <div class="roww"><div class="rows" id="rows">
            ${rows}
              </div></div>
              <div class="boxcard" id="bc">
                <div class="bh"><span class="bn">Box A12</span><span class="rm">Kitchen</span></div>
                <div class="chips" id="chips">${chips}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="scene clip" id="s5" data-start="72.2" data-duration="23.6">
          <div class="hdr">The round trip · <b>earbuds → ops → earbuds</b></div>
          <div class="row">
            <div class="phone">
              <div class="notch"></div>
              <div class="ph-top"><span class="ph-title">MoveMate</span>
                <span class="ph-pill"><span class="dot" id="dot5"></span>Listening</span></div>
              <div class="wave" id="wave5">${bars(14)}</div>
              <div class="trw"><div class="tr" id="tr5">
          ${bubbles(TR5,'c')}
              </div></div>
            </div>
            <div class="tg">
              <div class="tg-head"><div class="tg-av" data-layout-ignore="true">📦</div><div><div class="n">Ops – Moves</div><div class="s">6 members, 2 online</div></div></div>
              <div class="tg-body">
                <div class="card" id="card">
                  <div class="card-h">⚠️ New damage · TAN-001 · Sofa</div>
                  <div class="card-b">
                    <div class="shot">${SOFA}<div class="lbl">Packer photo · illustration</div></div>
                    <div class="fl"><span class="k">Assessment</span><span class="v">Six-inch tear along the back cushion seam.</span></div>
                    <div class="fl"><span class="k">Severity</span><span class="v">Minor · likely new</span></div>
                    <div class="fl"><span class="k">On survey?</span><span class="v no">No</span></div>
                  </div>
                  <div class="acts">
                    <div class="btn" id="btn1">Wrap and load</div>
                    <div class="btn" id="btn2">Hold for inspection</div>
                    <div class="btn" id="btn3">Open claim</div>
                  </div>
                  <div class="decided" id="decided"><b>✓ Wrap and load — and claim opened</b>Decided by Priya (ops) · relayed to packer A</div>
                </div>
              </div>
            </div>
          </div>
          <svg id="cursor" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.5 L12 14.5 L19 14 Z" fill="#fff" stroke="#111" stroke-width="1.2"/></svg>
          <div id="ripple"></div>
        </div>

        <div class="scene clip" id="s6" data-start="95.8" data-duration="13">
          <div class="hdr">Handover · <b>the same bot, scoped to one move</b></div>
          <div class="row">
            <div class="tg" style="width:400px">
              <div class="tg-head"><div class="tg-av" data-layout-ignore="true">📦</div><div><div class="n">MoveMate</div><div class="s">bot</div></div></div>
              <div class="tg-body">
            ${ctg}
              </div>
            </div>
            <div class="man">
              <div class="man-h"><div class="t1">Your move — TAN-001</div><div class="t2">Tan residence · 41 boxes · packed 12 Sep</div></div>
              <div class="man-b">
            ${man}
              </div>
              <div class="cond" id="cond"><b>Condition report · 1 new item</b>Sofa — six-inch tear, back cushion seam. Not on the pre-move survey. Ops decision: wrap and load, claim opened.</div>
            </div>
          </div>
        </div>

        <div class="scene clip" id="s7" data-start="108.8" data-duration="12.2">
          <div class="tw">
            <div class="logo" id="k0" style="font-size:44px">Move<span>Mate</span></div>
            <div class="kicker" id="k1">Same agent. Same tools. Same state.<br>
              It meets the packer in their <b>earbuds</b>, ops in their <b>Telegram group</b>,<br>and the customer in a <b>private chat</b>.</div>
            <div class="arch">
              <div class="ab" id="a1"><div class="i2">🎧</div><div class="l2">GPT‑Live‑1</div></div>
              <div class="arrow" id="ar1">→</div>
              <div class="ab" id="a2"><div class="i2">⚙️</div><div class="l2">Agent core</div></div>
              <div class="arrow" id="ar2">→</div>
              <div class="ab" id="a3"><div class="i2">💬</div><div class="l2">CopilotKit Channels</div></div>
              <div class="arrow" id="ar3">→</div>
              <div class="ab" id="a4"><div class="i2">🗄️</div><div class="l2">ClickHouse</div></div>
            </div>
            <div class="stackline" id="sl">GPT‑LIVE‑1 · GPT‑5.6 LUNA · COPILOTKIT CHANNELS · CLICKHOUSE · TRIGGER.DEV · MODAL</div>
          </div>
        </div>

        <div class="clip" id="timer" data-start="59.6" data-duration="35.6">27.0s · round trip closed</div>
      ${caps}
      </div>
    </div>

    <script>
      const TR=${JSON.stringify(TR.map(r=>r[0]))};
      const ROWS=${JSON.stringify(ROWS.map(r=>r[0]))};
      const CHIPS=${JSON.stringify(CHIPS.map(r=>r[0]))};
      const TR5=${JSON.stringify(TR5.map(r=>r[0]))};
      const CTG=${JSON.stringify(CTG.map(r=>r[0]))};
      const MAN=${JSON.stringify(MAN.map(r=>r[0]))};
      const CAPS=${JSON.stringify(CAPS.map(c=>[c[0],c[1]]))};
      const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];

      function build(){
        const tl = gsap.timeline({ paused: true });
        const IN = { autoAlpha: 0, y: 10 }, OUT = { autoAlpha: 1, y: 0, duration: .4, ease: "power2.out" };
        const pop = (el,t,d) => tl.fromTo(el,{autoAlpha:0,scale:.85},{autoAlpha:1,scale:1,duration:d||.34,ease:"back.out(2)"},t);
        const rise = (el,t,dy,d) => tl.fromTo(el,{autoAlpha:0,y:dy===undefined?10:dy},{autoAlpha:1,y:0,duration:d||.45,ease:"power3.out"},t);

        // idle motion — finite repeats keep the render deterministic
        qa("#wave4 .bar").forEach((b,i)=>tl.to(b,{scaleY:4.2,opacity:1,duration:.38,ease:"sine.inOut",
          yoyo:true,repeat:120,transformOrigin:"center"},26.2+(i%5)*.09));
        qa("#wave5 .bar").forEach((b,i)=>tl.to(b,{scaleY:4.2,opacity:1,duration:.38,ease:"sine.inOut",
          yoyo:true,repeat:62,transformOrigin:"center"},72.2+(i%5)*.09));
        tl.to("#dot4",{opacity:.25,duration:.8,yoyo:true,repeat:56,ease:"sine.inOut"},26.2);
        tl.to("#dot5",{opacity:.25,duration:.8,yoyo:true,repeat:28,ease:"sine.inOut"},72.2);

        // captions
        CAPS.forEach(([a,b],i)=>{ const el="#cap"+i;
          tl.fromTo(el,{autoAlpha:0},{autoAlpha:1,duration:.3,ease:"power2.out"},a+.02);
          tl.to(el,{autoAlpha:0,duration:.25,ease:"power2.in"},b-.3); });

        // 1 title
        rise("#t-logo",0.5,16,.8); rise("#t-rule",0.9,0,.5); rise("#t-tag",1.1,10,.7);
        tl.fromTo("#t-badge",{autoAlpha:0},{autoAlpha:1,duration:.6},1.8);
        // 2 problem
        rise("#p1",6.8,14,.55); rise("#p2",10.0,14,.55); rise("#p3",13.0,14,.55);
        // 3 surfaces
        rise("#sc1",18.2,22,.6); rise("#sc2",20.4,22,.6); rise("#sc3",22.0,22,.6);

        // 4 voice logging — reveal each bubble, then scroll the column to keep it in frame
        const trw = q(".trw").clientHeight, tr = q("#tr");
        qa("#tr .b").forEach((el,i)=>{
          tl.fromTo(el,IN,OUT,TR[i]);
          const need = el.offsetTop + el.offsetHeight - trw + 6;
          if (need > 0) tl.to(tr,{y:-need,duration:.45,ease:"power2.out"},TR[i]);
        });
        const roww = q(".roww").clientHeight, rowsEl = q("#rows");
        qa("#rows .r").forEach((el,i)=>{
          tl.fromTo(el,{autoAlpha:0,x:-10},{autoAlpha:1,x:0,duration:.35,ease:"power2.out"},ROWS[i]);
          const need = el.offsetTop + el.offsetHeight - roww + 4;
          if (need > 0) tl.to(rowsEl,{y:-need,duration:.4,ease:"power2.out"},ROWS[i]);
        });
        tl.fromTo("#bc",{autoAlpha:0},{autoAlpha:1,duration:.4},32.4);
        qa("#chips .chip").forEach((el,i)=>pop(el,CHIPS[i]));
        tl.fromTo("#camb",{autoAlpha:0,scale:.9},{autoAlpha:1,scale:1,duration:.4,ease:"back.out(2)"},62.6)
          .to("#camb",{autoAlpha:0,duration:.3},67.6);

        // 5 round trip
        qa("#tr5 .b").forEach((el,i)=>tl.fromTo(el,IN,OUT,TR5[i]));
        tl.fromTo("#card",{autoAlpha:0,y:18,scale:.97},{autoAlpha:1,y:0,scale:1,duration:.55,ease:"power3.out"},74.6);
        tl.fromTo("#cursor",{autoAlpha:0,x:960,y:150},{autoAlpha:1,duration:.3},81.0);
        const b1 = q("#btn1").getBoundingClientRect(), bd = q("#board").getBoundingClientRect();
        const bx = (b1.left+b1.width/2-bd.left)/1.5, by = (b1.top+b1.height/2-bd.top)/1.5;
        tl.to("#cursor",{x:bx+18,y:by,duration:.9,ease:"power2.inOut"},82.2);
        tl.to("#btn1",{backgroundColor:"#3a6ea5",borderColor:"#4d86c4",color:"#ffffff",duration:.2},83.7);
        tl.fromTo("#ripple",{autoAlpha:.9,scale:.4,x:bx-8,y:by-8},{autoAlpha:0,scale:3.6,duration:.55,ease:"power2.out"},84.2);
        tl.to(["#btn2","#btn3"],{autoAlpha:.28,duration:.3},84.2);
        tl.to("#cursor",{autoAlpha:0,duration:.3},85.0);
        tl.fromTo("#decided",{autoAlpha:0,y:8},{autoAlpha:1,y:0,duration:.45},85.6);

        // the timer — one tween writes the readout, so seeking is exact
        const tEl = q("#timer"), o = { v: 0 };
        tl.fromTo(tEl,{autoAlpha:0},{autoAlpha:1,duration:.35},59.6);
        tl.fromTo(o,{v:0},{v:27.0,duration:27.0,ease:"none",
          onUpdate(){ tEl.textContent = o.v.toFixed(1) + "s  ·  defect → decision"; }},59.6);
        tl.call(()=>{ tEl.textContent="27.0s  ·  round trip closed"; tEl.classList.add("done"); },null,86.6);
        tl.call(()=>{ tEl.classList.remove("done"); },null,86.5);
        tl.to(tEl,{autoAlpha:0,duration:.4},94.6);

        // 6 customer
        qa("#s6 .mrow").forEach((el,i)=>rise(el,MAN[i],8,.4));
        tl.fromTo("#cond",{autoAlpha:0},{autoAlpha:1,duration:.4},98.5);
        qa("#s6 .tgm").forEach((el,i)=>rise(el,CTG[i],10,.4));

        // 7 close
        rise("#k0",108.9,12,.6); rise("#k1",109.7,12,.6);
        [["#a1",110.4],["#ar1",111.0],["#a2",111.4],["#ar2",112.0],["#a3",112.4],["#ar3",113.0],["#a4",113.4]]
          .forEach(([el,t])=>rise(el,t,12,.5));
        tl.fromTo("#sl",{autoAlpha:0},{autoAlpha:1,duration:.5},114.4);

        window.__timelines["main"] = tl;
      }
      document.fonts.ready.then(build);
    </script>
  </body>
</html>
`;
fs.writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('wrote index.html', html.length, 'bytes');
