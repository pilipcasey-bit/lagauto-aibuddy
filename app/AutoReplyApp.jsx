"use client";

import { useState, useCallback } from "react";

// ── API — with timeout + friendly error handling ──────────────────────────────
async function callClaude(system, userContent, maxTokens, isRetry = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout
  try {
    const response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens || 1000,
        system: system || undefined,
        messages: [{ role: "user", content: userContent }],
      }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      if ((response.status === 529 || response.status === 503) && !isRetry) {
        await new Promise(r => setTimeout(r, 2000));
        return callClaude(system, userContent, maxTokens, true); // retry flag
      }
      throw new Error(data?.error?.message || "HTTP " + response.status);
    }
    return (data.content || []).map(b => b.text || "").join("").trim();
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Request timed out — please try again.");
    if (!navigator.onLine) throw new Error("No internet connection. Check your network and retry.");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// ── VEHICLE DATA ──────────────────────────────────────────────────────────────
const OEM = {
  Hyundai:{title:"Hyundai Canada",base:"https://www.hyundaicanada.com/en/showroom"},
  Kia:{title:"Kia Canada",base:"https://www.kia.ca/en/vehicles"},
  Honda:{title:"Honda Canada",base:"https://www.honda.ca/en"},
  Nissan:{title:"Nissan Canada",base:"https://www.nissan.ca"},
  Mitsubishi:{title:"Mitsubishi Canada",base:"https://www.mitsubishi-motors.ca/en"},
  Ford:{title:"Ford Canada",base:"https://www.ford.ca"},
  Jeep:{title:"Jeep Canada",base:"https://www.jeep.com/en_ca"},
  Chrysler:{title:"Chrysler Canada",base:"https://www.chrysler.com/en_ca"},
  Dodge:{title:"Dodge Canada",base:"https://www.dodge.com/en_ca"},
  Ram:{title:"Ram Trucks Canada",base:"https://www.ramtrucks.com/en_ca"},
};
const MAKE_MODELS = {
  hyundai:["santa fe hybrid","santa fe","tucson hybrid","tucson","elantra hybrid","elantra","ioniq 6","ioniq 5","palisade","venue","kona hybrid","kona"],
  kia:["sorento hybrid","sorento","sportage hybrid","sportage","telluride","carnival","forte","niro ev","niro","k5"],
  honda:["cr-v hybrid","cr-v","crv hybrid","crv","civic hybrid","civic","accord hybrid","accord","pilot","odyssey","hr-v","hrv","ridgeline","passport"],
  nissan:["rogue","pathfinder","murano","armada","frontier","sentra","altima","kicks","qashqai"],
  mitsubishi:["outlander phev","outlander","eclipse cross","rvr","mirage"],
  ford:["f-150","f 150","mustang mach-e","bronco sport","bronco","escape hybrid","escape","explorer","expedition","ranger","edge"],
  jeep:["grand cherokee 4xe","grand cherokee l","grand cherokee","wrangler 4xe","wrangler","compass","cherokee","gladiator","renegade"],
  chrysler:["pacifica hybrid","pacifica","300"],
  dodge:["durango","challenger","charger","hornet"],
  ram:["1500 trx","1500 classic","1500","2500","3500"],
};
const TRIMS = ["calligraphy","ultimate","luxury","preferred","essential","limited","platinum","sel","sport","ex-l","ex","lx","touring","titanium","king ranch","lariat","xlt","xl","sport touring","black edition","night","highline","sxt","gt"];
const SLUGS = {"Santa Fe Hybrid":"santa-fe","Santa Fe":"santa-fe","Tucson Hybrid":"tucson","Tucson":"tucson","Elantra Hybrid":"elantra","Elantra":"elantra","Palisade":"palisade","Venue":"venue","Kona":"kona","Ioniq 5":"ioniq5","Ioniq 6":"ioniq6","Sorento Hybrid":"sorento","Sorento":"sorento","Sportage Hybrid":"sportage","Sportage":"sportage","Telluride":"telluride","Carnival":"carnival","Forte":"forte","K5":"k5","Niro":"niro","CR-V Hybrid":"cr-v","CR-V":"cr-v","Civic Hybrid":"civic","Civic":"civic","Accord Hybrid":"accord","Accord":"accord","Pilot":"pilot","Odyssey":"odyssey","HR-V":"hr-v","Ridgeline":"ridgeline","Rogue":"rogue","Pathfinder":"pathfinder","Qashqai":"qashqai","Murano":"murano","Frontier":"frontier","Kicks":"kicks","Outlander PHEV":"outlander-phev","Outlander":"outlander","Eclipse Cross":"eclipse-cross","RVR":"rvr","F-150":"trucks/f150","Escape":"suvs/escape","Explorer":"suvs/explorer","Bronco":"suvs/bronco","Bronco Sport":"suvs/bronco-sport","Ranger":"trucks/ranger","Expedition":"suvs/expedition","Edge":"suvs/edge","Mustang Mach-E":"electric-vehicles/mustang-mach-e","Compass":"compass","Wrangler":"wrangler","Grand Cherokee":"grand-cherokee","Gladiator":"gladiator","Pacifica":"pacifica","Durango":"durango","1500":"1500"};

function getOEMUrl(make,model){const o=OEM[make];if(!o)return"https://www.lagauto.ca";const slug=SLUGS[model]||(model||"").toLowerCase().replace(/ /g,"-");if(make==="Nissan"){const nissanSlugs={"Rogue":"crossovers-suvs/rogue","Pathfinder":"crossovers-suvs/pathfinder","Qashqai":"crossovers-suvs/qashqai","Murano":"crossovers-suvs/murano","Armada":"crossovers-suvs/armada","Kicks":"crossovers-suvs/kicks","Frontier":"trucks/frontier","Sentra":"cars/sentra","Altima":"cars/altima"};const ns=nissanSlugs[model];return ns?"https://www.nissan.ca/vehicles/"+ns+".html":"https://www.nissan.ca";}if(make==="Mitsubishi")return o.base+"/vehicles/"+slug;if(make==="Ford")return"https://www.ford.ca/"+slug+"/";if(["Jeep","Chrysler","Dodge","Ram"].includes(make))return o.base+"/vehicles/"+slug+".html";return o.base+"/"+slug;}
function getLagAutoInventoryUrl(make,model){const q=[make&&"make="+encodeURIComponent(make),model&&"model="+encodeURIComponent(model)].filter(Boolean).join("&");return"https://www.lagauto.ca/en/new-inventory"+(q?"?"+q:"");}
function getVideos(make,model,year){const base=[year,make,model].filter(Boolean).join(" ");const isH=/hybrid|phev|ev|ioniq|mach-e|niro/i.test(model||"");const ytQ=encodeURIComponent(base+(isH?" hybrid review walkaround":" review walkaround"));const lagUrl=getLagAutoInventoryUrl(make,model);return[{title:base+(isH?" Hybrid Review & Walkaround":" Review & Walkaround"),channel:"YouTube Search →",url:"https://www.youtube.com/results?search_query="+ytQ+"&sp=CAMSAhAB",reason:"YouTube search — recent walkarounds & reviews"},{title:"LAG Auto — "+[make,model].filter(Boolean).join(" ")+" Inventory",channel:"LAG Auto Inventory →",url:lagUrl,reason:"Current in-stock units at LAG Auto"}];}
function parseVehicle(input){const s=input.toLowerCase().replace(/-/g," ");const yearM=s.match(/20(1[6-9]|2[0-9])/);const year=yearM?yearM[0]:null;const makeKey=Object.keys(MAKE_MODELS).find(m=>s.includes(m))||null;const make=makeKey?makeKey.charAt(0).toUpperCase()+makeKey.slice(1):null;let model=null;if(makeKey){const f=MAKE_MODELS[makeKey].find(m=>s.includes(m));if(f)model=f.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ");}const trim=TRIMS.find(t=>s.includes(t));const trimProper=trim?trim.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" "):null;const vinM=input.match(/[A-HJ-NPR-Z0-9]{17}/i);const vin=vinM?vinM[0].toUpperCase():null;return{year,make,model,trim:trimProper,vin,stock:vin?vin.slice(-6):null};}
function parseEmail(raw){if(!raw)return{subj:"",body:""};const lines=raw.split("\n");const si=lines.findIndex(l=>l.startsWith("SUBJECT:"));const subj=si>=0?lines[si].replace("SUBJECT:","").trim():"";const bi=lines.findIndex(l=>/^Hi /i.test(l.trim()));const body=lines.slice(bi>=0?bi:(si>=0?si+2:0)).join("\n").trim();return{subj,body};}
function lagSig(n){return[n||"[Your Name]","LAG Auto — Landsperg Automotive Group","Hyundai · Kia · Honda · Nissan · Mitsubishi · Ford · Jeep · Ram","📍 6444 67 Street, Red Deer, AB T4P 1A1","📞 1-403-348-8000  |  🌐 lagauto.ca"].join("\n");}
function copyText(t){navigator.clipboard?.writeText(t).catch(()=>{});}

async function sendSmsApi(to, message) {
  const res = await fetch("/api/send-sms", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({to, message}),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Send failed");
  return data;
}

async function sendEmailApi(to, subject, bodyText) {
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#333;white-space:pre-wrap">'
    + bodyText.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    + "</div>";
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({to, subject, html}),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Send failed");
  return data;
}

const NAVY="#002C5F",CYAN="#00AAD2",GOLD="#C8960C",GREEN="#16a34a",RED="#dc2626",PURPLE="#7c3aed";
const TONES=["Warm & Friendly","Professional & Direct","Enthusiastic & Energetic"];
const SAMPLES=["2026 Ram 1500 Sport","2026 Hyundai Santa Fe Hybrid Calligraphy","2025 Kia Telluride SX","2026 Jeep Compass Sport 4x4"];

// ── STYLES ────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f2f0eb;}
.app{font-family:'DM Sans',system-ui,sans-serif;background:#f2f0eb;min-height:100vh;color:#1c1917;}
.hdr{background:${NAVY};padding:0 28px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 16px rgba(0,44,95,.3);position:sticky;top:0;z-index:100;}
.hdr-l{display:flex;align-items:center;gap:16px;padding:13px 0;}
.logo{background:#fff;border-radius:6px;padding:5px 12px;line-height:1.1;}
.logo-lag{font-weight:900;font-size:15px;color:${NAVY};letter-spacing:3px;}
.logo-auto{font-weight:300;font-size:10px;color:${NAVY};}
.hdr-name{font-family:'DM Serif Display',serif;font-size:17px;color:#fff;}
.hdr-sub{font-size:9px;color:${CYAN};letter-spacing:2px;margin-top:2px;font-weight:600;}
.hdr-r{font-size:10px;color:rgba(255,255,255,.3);display:flex;gap:4px;align-items:center;}
.main{max-width:780px;margin:0 auto;padding:28px 18px 52px;}
.card{background:#fff;border:1px solid #e7e3dc;border-radius:16px;padding:24px 26px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 14px rgba(0,0,0,.04);overflow:hidden;}
.cc{border-top:3px solid ${CYAN};}.cg{border-top:3px solid ${GOLD};}
.cn{background:${NAVY};border:none;border-radius:16px;padding:24px 26px;margin-bottom:16px;}
.badge{display:inline-flex;align-items:center;gap:8px;background:${NAVY};color:#fff;font-size:9.5px;font-weight:700;letter-spacing:1.5px;padding:3px 12px 3px 3px;border-radius:20px;margin-bottom:14px;}
.bn{background:${CYAN};color:#fff;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;}
.bg{background:${GOLD};}.bg .bn{background:${NAVY};}
label{display:block;font-size:11px;font-weight:600;color:#78716c;margin-bottom:6px;}
.slbl{font-size:9.5px;font-weight:700;color:#a8a29e;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;}
.hint{font-size:11.5px;color:#a8a29e;line-height:1.7;margin:0 0 14px;}
.inp{width:100%;padding:11px 14px;border:1.5px solid #e7e3dc;border-radius:10px;font-size:13.5px;font-family:inherit;background:#faf9f7;color:#1c1917;outline:none;transition:border-color .15s,box-shadow .15s;}
.inp:focus{border-color:${CYAN};box-shadow:0 0 0 3px rgba(0,170,210,.1);background:#fff;}
.inp::placeholder{color:#c4bdb4;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.s2{grid-column:1/-1;}
.divider{border:none;border-top:1px solid #e7e3dc;margin:18px 0;}
.bp{background:${NAVY};color:#fff;border:none;border-radius:10px;padding:11px 20px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,44,95,.25);transition:all .15s;white-space:nowrap;min-height:44px;}
.bp:hover:not(:disabled){background:#003a7a;transform:translateY(-1px);}
.bp:disabled{background:#d6d3cd;color:#a3a09a;cursor:not-allowed;transform:none;}
.bgen{width:100%;padding:15px;font-size:14.5px;letter-spacing:.4px;background:linear-gradient(135deg,${NAVY},#005080);border-radius:12px;margin-top:20px;border:none;color:#fff;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 18px rgba(0,44,95,.28);transition:all .15s;min-height:52px;}
.bgen:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,44,95,.38);}
.bgen:disabled{background:#d6d3cd;color:#a3a09a;cursor:not-allowed;transform:none;box-shadow:none;}
.bsm{background:#fff;border:1.5px solid #e7e3dc;border-radius:9px;padding:7px 15px;color:#78716c;font-size:11.5px;cursor:pointer;font-weight:600;font-family:inherit;transition:all .15s;min-height:36px;}
.bsm:hover{border-color:#a8a29e;color:#292524;}.bsm.ok{border-color:${GREEN};color:${GREEN};background:#f0fdf4;}
.bsend{background:#f5f4f1;border:1.5px solid #d6d3cd;border-radius:9px;padding:8px 14px;color:#57534e;font-size:11px;cursor:pointer;font-weight:600;font-family:inherit;transition:all .15s;min-height:40px;white-space:nowrap;}
.bsend:hover:not(:disabled){background:#e7e3dc;color:#292524;border-color:#a8a29e;}
.bsend:disabled{opacity:.5;cursor:not-allowed;}
.bsend.ok{border-color:${GREEN};color:${GREEN};background:#f0fdf4;}
.bsend.err{border-color:${RED};color:${RED};background:#fef2f2;}
.bretry{background:#fff3cd;border:1.5px solid #e6ac00;border-radius:9px;padding:8px 16px;color:#b45309;font-size:12px;cursor:pointer;font-weight:700;font-family:inherit;transition:all .15s;min-height:40px;display:inline-flex;align-items:center;gap:6px;}
.bretry:hover{background:#ffe9a0;border-color:#c8960c;}
.snd-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px dashed #e7e3dc;}
.snd-disc{font-size:9.5px;color:#c4bdb4;}
.bfu{border:none;border-radius:10px;padding:10px 18px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.1);transition:all .15s;min-height:44px;}
.bfu:disabled{opacity:.45;cursor:not-allowed;}
.bgr{background:${GREEN};color:#fff;}.bgr:hover:not(:disabled){background:#15803d;}
.bam{background:#d97706;color:#fff;}.bam:hover:not(:disabled){background:#b45309;}
.bpu{background:#7c3aed;color:#fff;}.bpu:hover:not(:disabled){background:#6d28d9;}
.qp{background:none;border:1.5px dashed #d6d3cd;border-radius:8px;padding:7px 11px;color:#a8a29e;font-size:10.5px;cursor:pointer;font-family:inherit;transition:all .15s;min-height:36px;}
.qp:hover{border-color:${NAVY};color:${NAVY};background:#f0f4ff;}
.tog{display:flex;align-items:center;gap:8px;cursor:pointer;}
.ttrack{width:38px;height:22px;border-radius:11px;position:relative;transition:background .2s;flex-shrink:0;}
.ton{background:${CYAN};}.toff{background:#d6d3cd;}
.tthumb{position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:left .2s;}
.vy{font-family:'DM Serif Display',serif;font-size:26px;color:#fff;line-height:1.1;}
.vm{font-size:14px;color:rgba(255,255,255,.55);margin-top:4px;margin-bottom:14px;}
.vtag{display:inline-block;border-radius:20px;padding:3px 12px;font-size:10.5px;font-weight:600;margin:0 4px 6px 0;}
.vtd{background:rgba(255,255,255,.1);color:rgba(255,255,255,.55);}
.vtg{background:rgba(34,197,94,.15);color:#4ade80;}
.vlink{font-size:11px;color:${CYAN};text-decoration:none;display:inline-block;margin-top:8px;font-weight:500;}
.vlink:hover{text-decoration:underline;}
.rbox{background:rgba(255,255,255,.06);border-radius:12px;padding:16px 18px;border:1px solid rgba(255,255,255,.08);min-width:200px;}
.rhd{font-size:9px;color:${GOLD};font-weight:700;letter-spacing:2px;margin-bottom:12px;}
.ra{font-size:11.5px;color:${CYAN};font-weight:600;text-decoration:none;display:block;}
.ra:hover{text-decoration:underline;}
.rw{font-size:10px;color:rgba(255,255,255,.28);margin-top:2px;line-height:1.4;}
.tp{flex:1;min-width:130px;padding:12px 14px;border-radius:12px;cursor:pointer;border:2px solid #e7e3dc;background:#faf9f7;transition:all .15s;}
.tp:hover{border-color:#a8a29e;}.tp.on{border-color:${NAVY};background:#eef2ff;}
.tpl{font-size:12px;font-weight:700;color:#78716c;margin-bottom:3px;}.tp.on .tpl{color:${NAVY};}
.tpd{font-size:10px;color:#c4bdb4;line-height:1.4;}
.trade{display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:12px;cursor:pointer;border:2px solid #e7e3dc;background:#faf9f7;margin-top:14px;transition:all .15s;}
.trade:hover{border-color:#a8a29e;}.trade.on{border-color:${GOLD};background:#fffbf0;}
.tchk{width:20px;height:20px;border-radius:6px;flex-shrink:0;border:2px solid #d6d3cd;background:#fff;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.trade.on .tchk{border-color:${GOLD};background:${GOLD};}
.vr{display:flex;gap:14px;padding:13px 16px;border-radius:12px;border:2px solid #e7e3dc;background:#faf9f7;cursor:pointer;transition:all .15s;margin-bottom:8px;}
.vr:hover{border-color:#a8a29e;}.vr.on{border-color:${CYAN};background:#f0faff;}.vr.always{border-color:${CYAN};background:#f0faff;cursor:default;}
.vrr{width:18px;height:18px;border-radius:50%;flex-shrink:0;margin-top:2px;border:2px solid #d6d3cd;background:#fff;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.vrr.on{border-color:${CYAN};background:${CYAN};}
.vrd{width:6px;height:6px;border-radius:50%;background:#fff;}
.vt{font-weight:600;font-size:12.5px;color:#1c1917;}
.vme{font-size:10.5px;color:#a8a29e;margin:2px 0 5px;}
.vp{font-size:10.5px;color:${CYAN};font-weight:500;text-decoration:none;}
.vp:hover{text-decoration:underline;}
.nr{background:#faf9f7;border:1.5px solid #e7e3dc;border-radius:12px;padding:12px 16px;margin-bottom:10px;}
.nr:focus-within{border-color:${CYAN};background:#fff;box-shadow:0 0 0 3px rgba(0,170,210,.08);}
.nr input{border:none;background:transparent;padding:5px 0;box-shadow:none;font-size:13px;}
.nr input:focus{box-shadow:none;}
.ck{background:#faf9f7;border:1.5px solid #e7e3dc;border-radius:12px;padding:12px 16px;margin-top:16px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;}
.cki{display:flex;align-items:center;gap:5px;font-size:11px;}
.ckd{width:17px;height:17px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;}
.ckok{background:#dcfce7;color:${GREEN};}.ckno{background:#fee2e2;color:${RED};}
.cktok{color:#6b7280;}.cktno{color:${RED};font-weight:600;}
.ehdr{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px;}
.etit{font-size:9.5px;font-weight:700;letter-spacing:2px;}
.ebox{background:#faf9f7;border:1.5px solid #e7e3dc;border-radius:14px;padding:22px 24px;overflow:hidden;max-width:100%;}
.esubj{font-size:13px;font-weight:700;color:${NAVY};padding-bottom:12px;margin-bottom:14px;border-bottom:1px solid #e7e3dc;overflow-wrap:break-word;word-break:break-word;}
.ebody{font-size:13.5px;line-height:2;color:#374151;white-space:pre-wrap;font-family:inherit;overflow-wrap:break-word;word-break:break-word;max-width:100%;}
.eerr{background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:16px 18px;color:${RED};font-size:13px;line-height:1.6;}
.eerr-msg{font-weight:600;margin-bottom:6px;}
.eerr-detail{font-size:11.5px;color:#b91c1c;opacity:.8;margin-bottom:12px;}
.ibx{background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e7e3dc;}
.ibxh{background:#f3f2f0;border-bottom:1px solid #e7e3dc;padding:14px 18px;}
.ibxav{width:32px;height:32px;border-radius:50%;background:${NAVY};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px;flex-shrink:0;}
.ibxb{font-size:13.5px;line-height:1.9;color:#222;white-space:pre-wrap;font-family:Georgia,serif;padding:18px 20px;overflow-wrap:break-word;word-break:break-word;max-width:100%;}
.ibxf{background:#f3f2f0;border-top:1px solid #e7e3dc;padding:8px 18px;display:flex;gap:18px;}
.sms{background:#f5f4f1;border:1.5px solid #e7e3dc;border-radius:14px;padding:16px;margin-top:12px;}
.smsh{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
.smsl{font-size:9px;font-weight:700;letter-spacing:2px;color:#7c3aed;}
.smsbub{background:#007AFF;border-radius:18px 18px 4px 18px;padding:12px 16px;max-width:85%;margin-left:auto;overflow-wrap:break-word;word-break:break-word;}
.smschar{font-size:9.5px;color:#a8a29e;text-align:right;margin-top:8px;}
.fu{border-top:1px solid #e7e3dc;margin-top:20px;padding-top:20px;}
.fut{font-size:9.5px;font-weight:700;letter-spacing:2px;color:#a8a29e;margin-bottom:4px;}
.fud{font-size:11.5px;color:#a8a29e;margin-bottom:14px;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#16a34a;color:#fff;font-size:13px;font-weight:600;padding:10px 22px;border-radius:20px;box-shadow:0 4px 16px rgba(0,0,0,.18);animation:slideUp .25s ease;z-index:9999;pointer-events:none;white-space:nowrap;}
.spin{width:32px;height:32px;border:3px solid rgba(0,170,210,.15);border-top-color:${CYAN};border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 14px;}
.anim{animation:fi .3s ease;}
.ftr{background:${NAVY};padding:20px 28px;text-align:center;margin-top:8px;}
.ftrn{font-family:'DM Serif Display',serif;font-size:15px;color:#fff;margin-bottom:4px;}
.ftrb{font-size:10px;color:rgba(255,255,255,.3);margin-bottom:4px;}
.ftra{font-size:10px;color:rgba(255,255,255,.18);}

/* ── MOBILE POLISH (375px) ─────────────────────────────────────────── */
@media(max-width:600px){
  .g2{grid-template-columns:1fr;}
  .s2{grid-column:1;}
  .hdr-r{display:none;}
  .hdr{padding:0 14px;}
  .hdr-l{gap:10px;padding:11px 0;}
  .logo{padding:4px 9px;}
  .logo-lag{font-size:13px;}
  .hdr-name{font-size:14px;}
  .hdr-sub{font-size:7.5px;letter-spacing:1.5px;}
  .main{padding:16px 12px 40px;}
  .card{padding:16px 14px;border-radius:12px;}
  .cn{padding:16px 14px;border-radius:12px;}
  .vy{font-size:22px;}
  .vm{font-size:13px;}
  .rbox{min-width:100%;width:100%;margin-top:14px;}
  /* Stack vehicle card vertically */
  .cn > div{flex-direction:column!important;}
  /* Full-width send inputs */
  .snd-row{flex-direction:column;align-items:stretch;}
  .snd-row input{width:100%!important;font-size:14px!important;padding:10px 12px!important;}
  .bsend{width:100%;text-align:center;padding:12px 14px;font-size:13px;}
  .bretry{width:100%;}
  /* Bigger tap targets */
  .bp{min-height:48px;font-size:13px;}
  .bgen{min-height:54px;font-size:14px;}
  .bfu{width:100%;min-height:48px;font-size:13px;}
  .bsm{min-height:40px;padding:8px 14px;}
  .qp{min-height:38px;font-size:11px;padding:8px 12px;}
  /* Email card controls row - stack on small */
  .ehdr{flex-direction:column;gap:8px;}
  .ehdr > div:last-child{display:flex;flex-wrap:wrap;gap:8px;}
  /* Email body font size */
  .ebody{font-size:13px;line-height:1.9;}
  .ibxb{font-size:12.5px;padding:14px 14px;}
  .ebox{padding:14px 16px;}
  /* SMS bubble */
  .smsbub{max-width:92%;}
  /* Tone picker - full width on very small */
  .tp{flex-basis:100%;min-width:unset;}
  /* Input search bar */
  .inp{font-size:14px;}
  /* Lookup row */
  #lookup-row{flex-direction:column!important;}
  #lookup-row .inp{width:100%;}
  #lookup-row .bp{width:100%;}
  /* Quick sample pills - smaller */
  .qp{font-size:10px;padding:7px 10px;}
  /* Follow-up sequence items */
  .fu-item{flex-direction:column!important;gap:8px!important;}
  /* Card header badges */
  .badge{font-size:9px;}
  /* Footer */
  .ftr{padding:16px 14px;}
  /* Checklist row */
  .ck{gap:10px;}
}
@media(max-width:400px){
  .hdr-sub{display:none;}
  .vy{font-size:20px;}
  .main{padding:12px 10px 36px;}
  .card{padding:14px 12px;}
  .cn{padding:14px 12px;}
}
`;

// ── SUB COMPONENTS ────────────────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div style={{textAlign:"center",padding:"28px 0"}}>
      <div className="spin"/>
      <div style={{fontSize:13,color:"#78716c",fontWeight:500}}>{label||"Writing email…"}</div>
      <div style={{fontSize:11,color:"#a8a29e",marginTop:4}}>Usually 3–5 seconds</div>
    </div>
  );
}

function ErrorBox({ message, onRetry, retryLabel }) {
  const friendlyMsg = message
    .replace("Error: ", "")
    .replace(/^HTTP 429.*/, "AI is busy right now — please wait a moment and try again.")
    .replace(/^HTTP 5\d\d.*/, "Server hiccup — give it a second and retry.")
    .replace(/^HTTP 4\d\d.*/, "Something went wrong with that request.");
  return (
    <div className="eerr">
      <div className="eerr-msg">⚠ Something went wrong</div>
      <div className="eerr-detail">{friendlyMsg}</div>
      {onRetry && (
        <button className="bretry" onClick={onRetry}>
          🔄 {retryLabel || "Try Again"}
        </button>
      )}
    </div>
  );
}

function CopyBtn({ getText }) {
  const [ok, setOk] = useState(false);
  return (
    <button className={"bsm"+(ok?" ok":"")} onClick={()=>{copyText(getText());setOk(true);setTimeout(()=>setOk(false),2000);}}>
      {ok?"✓ Copied!":"Copy Email"}
    </button>
  );
}

function SendEmailBtn({ text, defaultEmail }) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");
  const { subj, body } = parseEmail(text || "");
  const handleSend = async () => {
    if (!email.trim()) return;
    setStatus("sending"); setMsg("");
    try {
      await sendEmailApi(email.trim(), subj || "Follow-up from LAG Auto", body);
      setStatus("ok"); setMsg("Sent!");
    } catch(e) {
      setStatus("err"); setMsg(e.message);
    }
    setTimeout(() => { setStatus(null); setMsg(""); }, 5000);
  };
  return (
    <div className="snd-row">
      <input
        className="inp"
        style={{width:200,fontSize:12,padding:"8px 10px"}}
        value={email}
        onChange={e=>setEmail(e.target.value)}
        placeholder="customer@email.com"
        disabled={status==="sending"}
        type="email"
      />
      <button
        className={"bsend"+(status==="ok"?" ok":status==="err"?" err":"")}
        onClick={handleSend}
        disabled={status==="sending"||!email.trim()}
      >
        {status==="sending"?"Sending…":status==="ok"?"✓ Sent!":status==="err"?"✕ Failed":"📧 Send Email"}
      </button>
      {msg && <span style={{fontSize:11,color:status==="ok"?"#16a34a":"#dc2626",fontWeight:500}}>{msg}</span>}
    </div>
  );
}

function SendSmsBtn({ message, defaultPhone }) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");
  const handleSend = async () => {
    if (!phone.trim()) return;
    setStatus("sending"); setMsg("");
    try {
      await sendSmsApi(phone.trim(), message);
      setStatus("ok"); setMsg("Sent!");
    } catch(e) {
      setStatus("err"); setMsg(e.message);
    }
    setTimeout(() => { setStatus(null); setMsg(""); }, 5000);
  };
  return (
    <div className="snd-row" style={{alignItems:"center"}}>
      <input
        className="inp"
        style={{width:160,fontSize:12,padding:"8px 10px"}}
        value={phone}
        onChange={e=>setPhone(e.target.value)}
        placeholder="e.g. 780-555-1234"
        disabled={status==="sending"}
      />
      <button
        className={"bsend"+(status==="ok"?" ok":status==="err"?" err":"")}
        onClick={handleSend}
        disabled={status==="sending"||!phone.trim()}
      >
        {status==="sending"?"Sending…":status==="ok"?"✓ Sent!":status==="err"?"✕ Failed":"📱 Send SMS"}
      </button>
      {msg && <span style={{fontSize:11,color:status==="ok"?"#16a34a":"#dc2626",fontWeight:500}}>{msg}</span>}
    </div>
  );
}

function EmailCard({ text, title, color, onRetry }) {
  const [prev, setPrev] = useState(false);
  const [copiedSubj, setCopiedSubj] = useState(false);
  if (!text) return null;
  const isErr = text.startsWith("Error:");
  const { subj, body } = parseEmail(text);
  const full = (subj?"Subject: "+subj+"\n\n":"")+body;
  const copySubj = () => { copyText(subj); setCopiedSubj(true); setTimeout(()=>setCopiedSubj(false),2000); };
  return (
    <div className="anim" style={{marginBottom:16}}>
      <div className="ehdr">
        <div className="etit" style={{color:color||CYAN}}>{title}</div>
        {!isErr && (
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div className="tog" onClick={()=>setPrev(p=>!p)}>
              <div className={"ttrack "+(prev?"ton":"toff")}><div className="tthumb" style={{left:prev?19:3}}/></div>
              <span style={{fontSize:11,fontWeight:600,color:prev?CYAN:"#a8a29e"}}>{prev?"Inbox View":"Raw Text"}</span>
            </div>
            <CopyBtn getText={()=>full}/>
            {subj && <button className={"bsm"+(copiedSubj?" ok":"")} onClick={copySubj}>{copiedSubj?"✓ Copied!":"Copy Subject"}</button>}
          </div>
        )}
      </div>
      {isErr ? (
        <ErrorBox message={text} onRetry={onRetry} retryLabel="Regenerate Email"/>
      ) : prev ? (
        <div className="ibx">
          <div className="ibxh">
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <div className="ibxav">S</div>
              <div><div style={{fontWeight:700,fontSize:13,color:"#111"}}>LAG Auto Salesperson</div><div style={{fontSize:10,color:"#9ca3af"}}>Just now</div></div>
            </div>
            {subj&&<div style={{fontWeight:700,fontSize:13.5,color:"#111",marginTop:6}}>{subj}</div>}
          </div>
          <div className="ibxb">{body}</div>
          <div className="ibxf">{["↩ Reply","↪ Forward","🗑 Delete"].map(t=><span key={t} style={{fontSize:11,color:"#9ca3af"}}>{t}</span>)}</div>
        </div>
      ) : (
        <div className="ebox">
          {subj&&<div className="esubj">Subject: {subj}{subj.length > 60 && <div style={{fontSize:10, color:'#b45309', marginTop:4}}>⚠️ {subj.length}/60 chars — subject may get cut off in Gmail</div>}</div>}
          <div className="ebody">{body}</div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [toast,     setToast]     = useState("");
  const [urlInput,  setUrlInput]  = useState("");
  const [vehicle,   setVehicle]   = useState(null);
  const [lookupErr, setLookupErr] = useState("");
  const [lookupBusy,setLookupBusy]= useState(false);
  const [custName,  setCustName]  = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [salesName, setSalesName] = useState("");
  const [leadMsg,   setLeadMsg]   = useState("");
  const [notes,     setNotes]     = useState({q1:"",q2:"",q3:"",q4:"",q5:""});
  const [toneIdx,   setToneIdx]   = useState(0);
  const [tradeIn,   setTradeIn]   = useState(false);
  const [useVids,   setUseVids]   = useState(true);
  const [selVids,   setSelVids]   = useState([0,1]);
  const [emailOut,  setEmailOut]  = useState(null);
  const [seqOut,    setSeqOut]    = useState(null);
  const [seqBusy,   setSeqBusy]  = useState(false);
  const [smsOut,    setSmsOut]    = useState(null);

  const doLookup = useCallback(async (override) => {
    const input = (override !== undefined ? override : urlInput).trim();
    setLookupErr(""); setVehicle(null); setEmailOut(null); setSeqOut(null); setSmsOut(null);
    if (!input) { setLookupErr("Please enter a vehicle name or URL."); return; }
    setLookupBusy(true);
    let p = parseVehicle(input);
    if (!p.make || !p.model) {
      try {
        const raw = await callClaude('Respond ONLY with valid JSON no markdown: {"year":"2026","make":"Hyundai","model":"Santa Fe Hybrid","trim":"Calligraphy","vin":null,"stock":null}. Use null for unknowns.', 'Vehicle: '+input, 300);
        const p2 = JSON.parse(raw.replace(/```json|```/g,"").trim());
        if (p2.make && p2.model) p = {...p, ...p2};
      } catch(e) {
        setLookupErr(e.message.includes("timeout")?"Request timed out — check your connection and try again.":"Couldn't identify that vehicle. Try: 2025 Kia Sorento Hybrid");
        setLookupBusy(false);
        return;
      }
    }
    if (!p.make || !p.model) { setLookupErr("Not found. Try: 2025 Kia Sorento Hybrid"); setLookupBusy(false); return; }
    setVehicle({...p, url:input.startsWith("http")?input:"https://www.lagauto.ca", videos:getVideos(p.make,p.model,p.year)});
    setSelVids([0,1]); setLookupBusy(false);
  }, [urlInput]);

  const buildSystem = useCallback(() => {
    const v = vehicle;
    const oemTitle = (OEM[v.make]||{}).title||v.make+" Canada";
    const oemUrl = getOEMUrl(v.make, v.model);
    const vids = useVids ? v.videos.filter((_,i)=>selVids.includes(i)) : [];
    const vBlock = vids.length ? "MANDATORY LINKS — You MUST embed ALL of these actual URLs verbatim in the email body. Do NOT write placeholder text like '[link]' or '[URL]'. Use the real URLs exactly as shown:\n"+vids.map(vid=>"- "+vid.title+" — "+vid.url).join("\n")+"\n- "+oemTitle+" official specs — "+oemUrl+"\n\nEmbed them as plain text URLs inline in the email, e.g.: 'Here's the Canadian review: https://...' and 'See full specs at: https://...'\n\n" : "";
    const noteLines = [notes.q1&&"Pricing: "+notes.q1,notes.q2&&"Features: "+notes.q2,notes.q3&&"Why us: "+notes.q3,notes.q4&&"Timeline: "+notes.q4,notes.q5&&"Next step: "+notes.q5].filter(Boolean).join("\n");
    return [
      "You are AutoReply AI for Landsperg Automotive Group (LAG Auto), a trusted multi-brand dealership in Red Deer & Leduc, Alberta, Canada (16 stores).",
      "Write a personalized sales email reply to a customer internet lead.",
      "VEHICLE: "+[v.year,v.make,v.model,v.trim].filter(Boolean).join(" ")+(v.stock?" Stock #"+v.stock:""),
      "TONE: "+TONES[toneIdx],
      tradeIn?"TRADE-IN: Customer has a trade-in. Add one warm sentence — LAG accepts trade-ins, fair appraisals.":"",
      "Answer these naturally:\n1. Cost — competitive financing, invite them for exact CAD figures\n2. Features — 2-3 highlights relevant to their message\n3. Why LAG Auto — 16 stores, no-pressure, Les Landsperg stands behind every deal\n4. Timeline — most drive within 1-3 days\n5. Next step — warm CTA with [Booking Link]",
      vBlock,
      noteLines?"Salesperson notes (weave in naturally):\n"+noteLines:"",
      "Include: 🎥 [Personal video: 60-sec walkaround — try Covideo or BombBomb]\n\nIMPORTANT: Any links provided above are REAL working URLs. Paste them verbatim. Never write '[link]', '[URL]', or any bracketed placeholder for a link.",
      "RULES: No markdown, no bullets, no bold, no headers. Natural paragraphs. Max 3 emoji.\nLine 1: SUBJECT: [subject]\nBlank line, then: Hi [First Name],\nEnd with warm sign-off then:\n"+lagSig(salesName)+"\n\nSTYLE: No em dashes (use a regular dash or comma instead). Never use these words: delve, tapestry, vibrant, crucial, landscape, comprehensive, streamline. Mix short punchy sentences with longer ones - vary your rhythm. Sound like a real Alberta car salesperson, not a corporate AI. Use contractions naturally: you're, we'd, it's, I've, that's.",
    ].filter(Boolean).join("\n\n");
  }, [vehicle, toneIdx, tradeIn, useVids, selVids, notes, salesName]);

  const doGenerate = useCallback(async () => {
    if (!vehicle || !custName || !leadMsg) return;
    setEmailOut("loading"); setSeqOut(null); setSmsOut(null);
    try {
      const text = await callClaude(buildSystem(), "Customer: "+custName+"\nSalesperson: "+(salesName||"[Your Name]")+"\nLead message: "+leadMsg, 1000);
      setEmailOut(text);
    } catch(e) { setEmailOut("Error: "+e.message); }
  }, [vehicle, custName, salesName, leadMsg, buildSystem]);

  const doFollowUpSequence = useCallback(async () => {
    if (!vehicle || !custName) return;
    setSeqBusy(true);
    setSeqOut(null);
    const vName = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
    const firstName = custName.split(" ")[0];
    const sig = lagSig(salesName);
    const vids7 = vehicle.videos || [];
    const oemUrl7 = getOEMUrl(vehicle.make, vehicle.model);
    const linkBlock7 = vids7.length ? "\nInclude ONE of these real links naturally in the email body (paste URL verbatim, no placeholders):\n- Review: "+vids7[0].url+"\n- Specs: "+oemUrl7+"\n" : "";
    try {
      const [t1, t2, t3] = await Promise.all([
        callClaude(null,
          "Write a same-day thank-you email from a car salesperson at LAG Auto in Red Deer, AB.\nFrom: "+(salesName||"[Your Name]")+"\nTo: "+custName+" who enquired about the "+vName+" today.\nTone: warm, genuine, brief (4-5 sentences). No pressure. They just reached out.\nRules: No markdown, no bullets. Max 2 emoji. No em dashes - use regular dashes or commas. Avoid: delve, tapestry, vibrant, crucial, landscape, comprehensive, streamline. Use contractions naturally (you're, I'd, it's). Sound like a real Alberta car salesperson.\nLine 1: SUBJECT: [subject line]\nBlank line, then: Hi "+firstName+",\nEnd with:\n"+sig, 500),
        callClaude(null,
          "Write ONE SMS text message from "+(salesName||"[Your Name]")+" at LAG Auto to "+firstName+" about the "+vName+".\nContext: 48 hours have passed since they enquired. No reply yet. Just checking in.\nRules:\n- ABSOLUTE MAXIMUM: 140 characters. You have 140 characters TOTAL including spaces. Count carefully. If in doubt, make it shorter.\n- Count every character including spaces and punctuation\n- Casual, friendly tone\n- End with a simple CTA (call or reply)\n- NO emoji\n- NO quotation marks\n- Return ONLY the SMS text, nothing else — no labels, no quotes, no explanation", 100),
        callClaude(null,
          "Write a 7-day follow-up email from a car salesperson at LAG Auto in Red Deer, AB.\nFrom: "+(salesName||"[Your Name]")+"\nTo: "+custName+" who enquired about the "+vName+" 7 days ago.\nTone: warm re-engagement, add genuine value - mention one relevant feature, current financing offer, or seasonal tip for Alberta drivers.\nRules: No markdown, no bullets. Natural paragraphs. Max 2 emoji. Gentle urgency (not pushy). No em dashes - use regular dashes or commas. Avoid: delve, tapestry, vibrant, crucial, landscape, comprehensive, streamline. Mix short punchy sentences with longer ones. Use contractions naturally (you're, we'd, it's). Sound like a real Alberta car salesperson.\nLine 1: SUBJECT: [subject line]\nBlank line, then: Hi "+firstName+","+linkBlock7+"\nEnd with:\n"+sig, 600),
      ]);
      setSeqOut({ touch1: t1, touch2: t2, touch3: t3 });
    } catch(e) {
      setSeqOut({ touch1: "Error: "+e.message, touch2: "Error: "+e.message, touch3: "Error: "+e.message });
    }
    setSeqBusy(false);
  }, [vehicle, custName, salesName]);

  const doSMS = useCallback(async () => {
    if (!vehicle) return;
    setSmsOut("loading");
    try {
      const text = await callClaude(null,
        "Write ONE SMS text message from "+(salesName||"[Your Name]")+" at LAG Auto to "+custName.split(" ")[0]+(custPhone?" ("+custPhone+")":"")+" about the "+[vehicle.year,vehicle.make,vehicle.model].filter(Boolean).join(" ")+" from lagauto.ca.\nRules:\n- ABSOLUTE MAXIMUM: 140 characters. You have 140 characters TOTAL including spaces. Count carefully. If in doubt, make it shorter.\n- Count every character including spaces and punctuation\n- Casual, friendly, direct\n- End with a clear CTA (call or reply)\n- NO emoji\n- NO quotation marks\n- Return ONLY the SMS text, nothing else — no labels, no quotes, no explanation", 100);
      setSmsOut(text);
    } catch(e) { setSmsOut("Error: "+e.message); }
  }, [vehicle, custName, salesName, custPhone]);

  const canGen = emailOut!=="loading" && !!vehicle && !!custName && !!leadMsg;
  const emailDone = emailOut && emailOut!=="loading" && !emailOut.startsWith("Error:");
  const emailIsErr = emailOut && emailOut!=="loading" && emailOut.startsWith("Error:");
  const canSeq = !!vehicle && !!custName && !seqBusy;

  return (
    <div className="app">
      <style>{CSS}</style>
      {toast && <div className="toast">{toast}</div>}

      <div className="hdr">
        <div className="hdr-l">
          <div className="logo"><div className="logo-lag">LAG</div><div className="logo-auto">AUTO</div></div>
          <div><div className="hdr-name">AutoReply AI</div><div className="hdr-sub">THE LES STANDARD · LANDSPERG AUTOMOTIVE GROUP</div></div>
        </div>
        <div className="hdr-r">
          <span>📍 6444 67 St, Red Deer AB</span><span style={{margin:"0 4px",color:"rgba(255,255,255,.15)"}}>·</span>
          <span>📞 1-403-348-8000</span><span style={{margin:"0 4px",color:"rgba(255,255,255,.15)"}}>·</span><span>lagauto.ca</span>
        </div>
      </div>

      <div className="main">

        {/* STEP 1 */}
        <div className="card cc">
          <div className="badge"><div className="bn">1</div>VEHICLE LOOKUP</div>
          <p className="hint">Paste a lagauto.ca URL — or type like <span style={{color:CYAN,background:"#f0faff",border:"1px solid #bde8f5",padding:"1px 7px",borderRadius:4,fontSize:11}}>2026 Jeep Compass Sport</span></p>
          <div id="lookup-row" style={{display:"flex",gap:10}}>
            <input className="inp" style={{flex:1}} value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLookup()} placeholder="https://www.lagauto.ca/... or type a vehicle name"/>
            <button className="bp" onClick={()=>doLookup()} disabled={lookupBusy}>{lookupBusy?"Detecting…":"Look Up →"}</button>
          </div>
          {lookupErr && <div style={{color:RED,fontSize:11.5,marginTop:8,fontWeight:500}}>⚠ {lookupErr}</div>}
          <div style={{display:"flex",gap:6,marginTop:12,flexWrap:"wrap"}}>
            {SAMPLES.map(v=><button key={v} className="qp" onClick={()=>{setUrlInput(v);doLookup(v);}}>{v}</button>)}
          </div>
        </div>

        {/* VEHICLE CARD */}
        {vehicle && (
          <div className="cn">
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:190}}>
                <div style={{fontSize:9,color:"#4ade80",fontWeight:700,letterSpacing:2,marginBottom:8}}>✅ VEHICLE IDENTIFIED</div>
                <div className="vy">{vehicle.year} {vehicle.make}</div>
                <div className="vm">{vehicle.model}{vehicle.trim?" · "+vehicle.trim:""}</div>
                <div>
                  {vehicle.stock&&<span className="vtag vtd">Stock #{vehicle.stock}</span>}
                  {vehicle.vin&&<span className="vtag vtd">VIN: {vehicle.vin}</span>}
                  <span className="vtag vtd">LAG Auto</span><span className="vtag vtg">In Stock</span>
                </div>
                <a href={vehicle.url} target="_blank" rel="noreferrer" className="vlink">View on LagAuto.ca →</a>
              </div>
              <div className="rbox">
                <div className="rhd">📹 RESOURCES</div>
                {vehicle.videos.map(v=>(
                  <div key={v.channel} style={{marginBottom:12}}>
                    <a href={v.url} target="_blank" rel="noreferrer" className="ra">▶ {v.channel}</a>
                    <div className="rw">{v.reason}</div>
                  </div>
                ))}
                <a href={getOEMUrl(vehicle.make,vehicle.model)} target="_blank" rel="noreferrer" style={{fontSize:11,color:"rgba(255,255,255,.25)",display:"block",marginTop:6,textDecoration:"none"}}>
                  🏷 {(OEM[vehicle.make]||{}).title||vehicle.make+" Canada"} →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {vehicle && (
          <div className="card cc">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
              <div className="badge"><div className="bn">2</div>RESOURCE LINKS IN EMAIL?</div>
              <div className="tog" onClick={()=>setUseVids(v=>!v)}>
                <div className={"ttrack "+(useVids?"ton":"toff")}><div className="tthumb" style={{left:useVids?19:3}}/></div>
                <span style={{fontSize:11,fontWeight:600,color:useVids?CYAN:"#a8a29e"}}>{useVids?"Links ON":"Links OFF"}</span>
              </div>
            </div>
            <div style={{opacity:useVids?1:0.4,transition:"opacity .2s"}}>
              {vehicle.videos.map((v,i)=>{
                const on=useVids&&selVids.includes(i);
                return(
                  <div key={i} className={"vr"+(on?" on":"")} onClick={()=>useVids&&setSelVids(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i])}>
                    <div className={"vrr"+(on?" on":"")}>{on&&<div className="vrd"/>}</div>
                    <div><div className="vt">{v.title}</div><div className="vme">{v.channel} · {v.reason}</div><a href={v.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="vp">Preview →</a></div>
                  </div>
                );
              })}
              <div className="vr always">
                <div className="vrr on"><div className="vrd"/></div>
                <div><div className="vt">🏷 {(OEM[vehicle.make]||{}).title||vehicle.make+" Canada"} — Official Canadian Site</div><div className="vme">Always included</div><a href={getOEMUrl(vehicle.make,vehicle.model)} target="_blank" rel="noreferrer" className="vp">View →</a></div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {vehicle && (
          <div className="card cg">
            <div className="badge bg"><div className="bn">3</div>CUSTOMER LEAD DETAILS</div>
            <div className="g2">
              <div><label>Customer Name *</label><input className="inp" value={custName} onChange={e=>setCustName(e.target.value)} placeholder="e.g. Sarah Johnson"/></div>
              <div><label>Customer Phone</label><input className="inp" value={custPhone} onChange={e=>setCustPhone(e.target.value)} placeholder="e.g. 780-555-1234"/></div>
              <div><label>Customer Email</label><input className="inp" value={custEmail} onChange={e=>setCustEmail(e.target.value)} placeholder="e.g. sarah@email.com" type="email"/></div>
              <div><label>Salesperson Name</label><input className="inp" value={salesName} onChange={e=>setSalesName(e.target.value)} placeholder="e.g. Casey Pilip"/></div>
              <div className="s2"><label>Customer's Lead Message *</label><textarea rows={3} className="inp" value={leadMsg} onChange={e=>setLeadMsg(e.target.value)} placeholder="Paste the customer's message here…" style={{resize:"vertical"}}/></div>
            </div>

            <div className="divider"/>
            <span className="slbl">Email Tone</span>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {TONES.map((t,i)=>(
                <div key={t} className={"tp"+(toneIdx===i?" on":"")} onClick={()=>setToneIdx(i)}>
                  <div className="tpl">{t}</div>
                  <div className="tpd">{["Like a trusted friend in the business","Confident, concise, no fluff","Upbeat, high energy, never pushy"][i]}</div>
                </div>
              ))}
            </div>

            <div className={"trade"+(tradeIn?" on":"")} onClick={()=>setTradeIn(v=>!v)}>
              <div className="tchk">{tradeIn&&<span style={{fontSize:11,color:"#fff",fontWeight:900}}>✓</span>}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:tradeIn?GOLD:"#78716c"}}>🚗 Customer mentioned a trade-in</div>
                <div style={{fontSize:11,color:"#a8a29e",marginTop:2}}>Adds a warm trade-in line automatically</div>
              </div>
            </div>

            <div className="divider"/>
            <span className="slbl">Salesperson Notes — Optional</span>
            <p className="hint">Rough notes only — AI polishes them. More detail = better email.</p>
            {[{k:"q1",i:"💰",l:"What does it cost?",p:"e.g. ~$58k CAD, loyalty discount available"},{k:"q2",i:"⚙️",l:"Key features?",p:"e.g. AWD for AB winters, great hybrid economy"},{k:"q3",i:"🏆",l:"Why LAG Auto?",p:"e.g. 16 AB stores, Les stands behind every deal"},{k:"q4",i:"⏱️",l:"How fast can they get it?",p:"e.g. in stock at Leduc, driving it this weekend"},{k:"q5",i:"📅",l:"Best next step?",p:"e.g. test drive or video walkthrough"}].map(q=>(
              <div key={q.k} className="nr"><label>{q.i} {q.l}</label><input value={notes[q.k]} onChange={e=>{const v=e.target.value;setNotes(n=>({...n,[q.k]:v}));}} placeholder={q.p}/></div>
            ))}

            <div className="ck">
              {[{l:"Vehicle",ok:!!vehicle},{l:"Customer name",ok:!!custName},{l:"Lead message",ok:!!leadMsg}].map(item=>(
                <div key={item.l} className="cki">
                  <div className={"ckd "+(item.ok?"ckok":"ckno")}>{item.ok?"✓":"✕"}</div>
                  <span className={item.ok?"cktok":"cktno"}>{item.l}</span>
                </div>
              ))}
              {canGen&&<span style={{fontSize:11,color:GREEN,fontWeight:600,marginLeft:"auto"}}>Ready ✓</span>}
            </div>

            <button className="bgen" onClick={doGenerate} disabled={!canGen}>
              {emailOut==="loading"
                ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                    <span style={{width:16,height:16,border:"2.5px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>
                    Generating…
                  </span>
                : "⚡  Generate AI Email Reply"}
            </button>
          </div>
        )}

        {/* OUTPUT — Initial Email */}
        {emailOut!==null && (
          <div className="card cc">
            {emailOut==="loading"
              ? <Spinner label="Writing your personalized email…"/>
              : <>
                  <EmailCard
                    text={emailOut}
                    title={"📧 INITIAL REPLY · "+[vehicle?.year,vehicle?.make,vehicle?.model].filter(Boolean).join(" ")+(vehicle?.stock?" · Stock #"+vehicle.stock:"")}
                    color={CYAN}
                    onRetry={emailIsErr ? doGenerate : null}
                  />
                  {emailDone && <SendEmailBtn text={emailOut} defaultEmail={custEmail}/>}
                </>
            }
          </div>
        )}

        {/* STAGE 3: SMS GENERATOR */}
        {vehicle && (
          <div className="card" style={{borderTop:"3px solid "+PURPLE}}>
            <div className="badge" style={{background:PURPLE}}><div className="bn" style={{background:"rgba(255,255,255,0.25)"}}>📱</div>SMS GENERATOR</div>
            <p className="hint">Generate a short text message (max 140 chars) for the same vehicle/customer scenario. Perfect for buyers who prefer texting.</p>
            {(!custName) && <div style={{fontSize:11.5,color:"#a8a29e",marginBottom:14}}>⚠ Fill in customer name in Step 3 to enable SMS generation.</div>}
            <button
              className="bfu bpu"
              style={{padding:"11px 22px",fontSize:13,fontWeight:700,borderRadius:10,marginBottom:12}}
              onClick={doSMS}
              disabled={smsOut==="loading"||!custName||!vehicle}
            >
              {smsOut==="loading"
                ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <span style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>
                    Generating SMS…
                  </span>
                : "📱 Generate SMS (140 chars)"}
            </button>
            {smsOut && smsOut!=="loading" && (
              smsOut.startsWith("Error:") ? (
                <ErrorBox message={smsOut} onRetry={doSMS} retryLabel="Regenerate SMS"/>
              ) : (
                <div className="sms">
                  <div className="smsh">
                    <span className="smsl">📱 TEXT MESSAGE · {[vehicle?.year,vehicle?.make,vehicle?.model].filter(Boolean).join(" ")}</span>
                    <button className="bsm" onClick={()=>{copyText(smsOut);setToast("Copied!");setTimeout(()=>setToast(""),1500);}} style={{fontSize:11}}>Copy SMS</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <div className="smsbub">
                      <div style={{fontSize:13.5,color:"#fff",lineHeight:1.7}}>{smsOut}</div>
                    </div>
                  </div>
                  <div className="smschar" style={{color:smsOut.length>140?RED:"#a8a29e"}}>
                    {smsOut.length} / 140 chars {smsOut.length>140?"⚠️ over limit — regenerate":"✓ good length"}
                  </div>
                  <SendSmsBtn message={smsOut} defaultPhone={custPhone}/>
                </div>
              )
            )}
          </div>
        )}

        {/* STAGE 3: 7-DAY FOLLOW-UP SEQUENCE */}
        {vehicle && (
          <div className="card" style={{borderTop:"3px solid "+GOLD}}>
            <div className="badge bg"><div className="bn">📅</div>7-DAY FOLLOW-UP SEQUENCE</div>
            <p className="hint">Generate all 3 follow-up touches at once. Most dealers never follow up — this puts you ahead of 90% of the competition.</p>

            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
              {[
                {n:"1",label:"📧 Same-Day Thank You (Email)",type:"Email",color:GREEN,desc:"Sent the same day as the initial enquiry"},
                {n:"2",label:"📱 48-Hour Check-In (SMS)",type:"SMS",color:PURPLE,desc:"Short text if no reply after 2 days"},
                {n:"3",label:"📧 7-Day Re-Engagement (Email)",type:"Email",color:GOLD,desc:"Warm re-engagement with relevant info or offer"},
              ].map(t=>(
                <div key={t.n} className="fu-item" style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderRadius:10,border:"1.5px solid #e7e3dc",background:"#faf9f7"}}>
                  <div style={{width:28,height:28,borderRadius:50,background:t.color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:12,flexShrink:0}}>{t.n}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#1c1917"}}>{t.label}</div>
                    <div style={{fontSize:10.5,color:"#a8a29e",marginTop:2}}>{t.desc}</div>
                  </div>
                  <div style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,background:t.color+"20",color:t.color,border:"1px solid "+t.color+"40",flexShrink:0}}>{t.type}</div>
                </div>
              ))}
            </div>

            {!custName && <div style={{fontSize:11.5,color:"#a8a29e",marginBottom:12}}>⚠ Fill in customer name in Step 3 to enable sequence generation.</div>}
            <button
              className="bgen"
              style={{background:"linear-gradient(135deg,"+GOLD+",#e6a800)",marginTop:0}}
              onClick={doFollowUpSequence}
              disabled={!canSeq||!custName}
            >
              {seqBusy
                ? <span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                    <span style={{width:16,height:16,border:"2.5px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin .7s linear infinite"}}/>
                    Generating 3 touches…
                  </span>
                : "⚡  Generate Follow-Up Sequence"}
            </button>

            {seqBusy && <Spinner label="Generating 3-touch sequence in parallel…"/>}

            {seqOut && !seqBusy && (
              <div style={{marginTop:24}}>
                {/* Touch 1 */}
                <div style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div style={{width:24,height:24,borderRadius:50,background:GREEN,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:11}}>1</div>
                    <span style={{fontSize:12,fontWeight:700,color:GREEN}}>📧 Same-Day Thank You (Email)</span>
                  </div>
                  <EmailCard text={seqOut.touch1} title="" color={GREEN} onRetry={seqOut.touch1.startsWith("Error:") ? doFollowUpSequence : null}/>
                  {!seqOut.touch1.startsWith("Error:") && <SendEmailBtn text={seqOut.touch1} defaultEmail={custEmail}/>}
                </div>

                {/* Touch 2 — SMS */}
                <div style={{marginBottom:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div style={{width:24,height:24,borderRadius:50,background:PURPLE,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:11}}>2</div>
                    <span style={{fontSize:12,fontWeight:700,color:PURPLE}}>📱 48-Hour Check-In (SMS)</span>
                  </div>
                  {seqOut.touch2.startsWith("Error:") ? (
                    <ErrorBox message={seqOut.touch2} onRetry={doFollowUpSequence} retryLabel="Regenerate Sequence"/>
                  ) : (
                    <div className="sms">
                      <div className="smsh">
                        <span className="smsl">📱 48-HOUR CHECK-IN SMS</span>
                        <button className="bsm" onClick={()=>{copyText(seqOut.touch2);setToast("Copied!");setTimeout(()=>setToast(""),1500);}} style={{fontSize:11}}>Copy SMS</button>
                      </div>
                      <div style={{display:"flex",justifyContent:"flex-end"}}>
                        <div className="smsbub">
                          <div style={{fontSize:13.5,color:"#fff",lineHeight:1.7}}>{seqOut.touch2}</div>
                        </div>
                      </div>
                      <div className="smschar" style={{color:seqOut.touch2.length>140?RED:"#a8a29e"}}>
                        {seqOut.touch2.length} / 140 chars {seqOut.touch2.length>140?"⚠️ over limit":"✓ good length"}
                      </div>
                      <SendSmsBtn message={seqOut.touch2} defaultPhone={custPhone}/>
                    </div>
                  )}
                </div>

                {/* Touch 3 */}
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div style={{width:24,height:24,borderRadius:50,background:GOLD,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:11}}>3</div>
                    <span style={{fontSize:12,fontWeight:700,color:GOLD}}>📧 7-Day Re-Engagement (Email)</span>
                  </div>
                  <EmailCard text={seqOut.touch3} title="" color={GOLD} onRetry={seqOut.touch3.startsWith("Error:") ? doFollowUpSequence : null}/>
                  {!seqOut.touch3.startsWith("Error:") && <SendEmailBtn text={seqOut.touch3} defaultEmail={custEmail}/>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ftr">
        <div className="ftrn">Landsperg Automotive Group</div>
        <div className="ftrb">Hyundai · Kia · Honda · Nissan · Mitsubishi · Ford · Jeep · Ram · Red Deer &amp; Leduc, AB</div>
        <div className="ftra">6444 67 Street, Red Deer, AB T4P 1A1 · 1-403-348-8000 · lagauto.ca</div>
        <div style={{fontSize:9,color:"rgba(255,255,255,.08)",marginTop:10,letterSpacing:2}}>AUTOREPLY AI · POWERED BY CLAUDE · BUILT FOR LES</div>
      </div>
    </div>
  );
}
