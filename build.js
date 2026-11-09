#!/usr/bin/env node
/**
 * build.js — generates one static, indexable page per CB channel
 * (dist/channel/{n}/index.html) plus a real sitemap.xml.
 *
 * This is the same play that gave ShortwaveHQ its SEO base: instead of one
 * page hoping to rank for 40 different long-tail searches ("CB channel 19
 * frequency", "what channel do truckers use", "CB channel 9 emergency"),
 * each channel gets its own indexable URL with a unique title/description
 * targeting that exact query.
 *
 * Run: node build.js   (outputs to dist/)
 * Netlify build command should be: node build.js  →  publish dist/
 */
const fs = require("fs");
const path = require("path");

const SITE = "https://cbradiohq.com";
const OUT_DIR = path.join(__dirname, "dist");
const AMZ_TAG = "cbradiohq-20"; // live Amazon Associates tag (single source for build.js)
const GA_ID = "G-FBHW54X2D5";

// Keep this in sync with the CHANNELS array in index.html.
const CHANNELS = [
  {ch:1,freq:"26.965",use:"General chat / travelers",tag:null},
  {ch:2,freq:"26.975",use:"General chat",tag:null},
  {ch:3,freq:"26.985",use:"General chat, some regional off-road use",tag:null},
  {ch:4,freq:"27.005",use:"Off-road / 4x4 club convoy channel (unofficial, widespread)",tag:"4x4"},
  {ch:5,freq:"27.015",use:"General chat",tag:null},
  {ch:6,freq:"27.025",use:'"Superbowl channel" — skip/DX hangout, heaviest during solar skip',tag:"SKIP"},
  {ch:7,freq:"27.035",use:"General chat",tag:null},
  {ch:8,freq:"27.055",use:"General chat",tag:null},
  {ch:9,freq:"27.065",use:"Emergency / REACT monitoring channel — keep clear for real emergencies",tag:"EMERGENCY"},
  {ch:10,freq:"27.075",use:"Regional travelers info in some states; general elsewhere",tag:null},
  {ch:11,freq:"27.085",use:"Historically the pre-1970s calling channel; general chat today",tag:null},
  {ch:12,freq:"27.105",use:"General chat",tag:null},
  {ch:13,freq:"27.115",use:"Marina / RV park channel in coastal & lake regions",tag:null},
  {ch:14,freq:"27.125",use:"Default handheld/walkie-talkie channel — often crowded",tag:null},
  {ch:15,freq:"27.135",use:"General chat",tag:null},
  {ch:16,freq:"27.155",use:"General chat, some regional skip activity",tag:null},
  {ch:17,freq:"27.165",use:"North–south interstate trucker channel (regional convention)",tag:"TRUCKER"},
  {ch:18,freq:"27.175",use:"General chat",tag:null},
  {ch:19,freq:"27.185",use:"THE trucker channel — east–west long-haul, road conditions",tag:"TRUCKER"},
  {ch:20,freq:"27.205",use:"General chat",tag:null},
  {ch:21,freq:"27.215",use:"General chat",tag:null},
  {ch:22,freq:"27.225",use:"General chat",tag:null},
  {ch:23,freq:"27.255",use:"General chat (historically shared w/ RC before 1970s reallocation)",tag:null},
  {ch:24,freq:"27.235",use:"General chat",tag:null},
  {ch:25,freq:"27.245",use:"General chat",tag:null},
  {ch:26,freq:"27.265",use:"General chat",tag:null},
  {ch:27,freq:"27.275",use:"General chat",tag:null},
  {ch:28,freq:"27.285",use:"General chat, some DX/skip use",tag:null},
  {ch:29,freq:"27.295",use:"General chat",tag:null},
  {ch:30,freq:"27.305",use:"General chat",tag:null},
  {ch:31,freq:"27.315",use:"General chat",tag:null},
  {ch:32,freq:"27.325",use:"General chat",tag:null},
  {ch:33,freq:"27.335",use:"General chat",tag:null},
  {ch:34,freq:"27.345",use:"General chat",tag:null},
  {ch:35,freq:"27.355",use:"General chat",tag:null},
  {ch:36,freq:"27.365",use:"SSB — 12W PEP legal here and up",tag:"SSB"},
  {ch:37,freq:"27.375",use:"SSB DX / long-distance chasing",tag:"SSB"},
  {ch:38,freq:"27.385",use:"SSB — most active SSB DX channel on the band",tag:"SSB"},
  {ch:39,freq:"27.395",use:"SSB general",tag:"SSB"},
  {ch:40,freq:"27.405",use:"SSB — trucker SSB overflow from Ch.19",tag:"SSB"}
];

// Per-channel editorial context so each page is substantive, not a thin
// doorway page. Keyed by channel number; channels without a custom entry
// fall back to a generated-but-still-useful paragraph set.
const CH_CONTEXT = {
  4:  "Channel 4 has become an unofficial gathering spot for off-road and 4x4 clubs in many regions. If you run trails with a group, agree on a channel before you head out — 4 is a common default but far from universal.",
  6:  "Channel 6 is known as the \"Superbowl channel\" — during Sporadic-E skip openings it fills with high-power stations chasing long-distance contacts. It's one of the most active DX channels on the band and can get crowded and competitive when conditions are up.",
  9:  "Channel 9 is the traditional emergency and REACT monitoring channel. By long-standing convention it's kept clear for genuine emergencies and travel assistance — don't use it for ragchewing. Some areas still have volunteers monitoring it.",
  11: "Channel 11 was the original CB calling channel before the band expanded from 23 to 40 channels in 1977. You'd call out on 11, then move to a free channel to talk. Today it's general chat like most of the band.",
  14: "Channel 14 is the default channel on many low-cost handheld/walkie-talkie CB radios, so it can be busy with short-range local traffic, especially around retail and family two-way sets.",
  17: "Channel 17 is used by many truckers running north–south interstates, a regional counterpart to Channel 19's east–west convention. It varies by area — listen before assuming.",
  19: "Channel 19 is THE trucker channel — the single busiest channel on the band. Long-haul drivers use it for road conditions, traffic, weather, speed traps, and general chatter along east–west routes. If you only monitor one channel on the highway, this is it.",
  36: "Channel 36 begins the SSB (single-sideband) segment of the band. SSB is legal up to 12W PEP here (versus 4W AM) and gets noticeably more range per watt, but you need an SSB-capable radio and the other station needs one too.",
  38: "Channel 38 (specifically 38 Lower Sideband, \"38 LSB\") is the most active SSB DX channel on the band. Skip-chasers and long-distance operators congregate here when conditions allow."
};


function buildSitemap(channelUrls, toolUrls = []) {
  const staticUrls = [
    { loc: `${SITE}/`, freq: "daily", pri: "1.0" },
  ];
  const all = [
    ...staticUrls,
    ...toolUrls.map((u) => ({ loc: u, freq: "weekly", pri: "0.9" })),
    ...channelUrls.map((u) => ({ loc: u, freq: "monthly", pri: "0.6" })),
  ];
  const body = all
    .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// =====================================================
// STANDALONE TOOL PAGES — each interactive tool gets its own
// indexable URL (dist/{slug}/index.html) targeting the exact
// search intent it solves ("cb swr calculator", "is my cb
// radio legal") instead of competing with the homepage for
// every query at once. Content is extracted directly from
// homepage.html via marker comments, so there's exactly one
// source of truth for each tool's HTML/JS — no copy-paste drift.
// =====================================================
const TOOL_PAGES = [
  {
    slug: "swr-calculator",
    sectionId: "swr",
    jsMarker: "swr",
    title: "CB Antenna SWR Calculator & Diagnosis Tool | CB Radio HQ",
    description: "Enter your Channel 1 and Channel 40 SWR readings and get an instant diagnosis: too long, too short, or a grounding fault — plus the exact fix.",
    schemaName: "CB Antenna SWR Doctor",
    extraJs: "",
  },
  {
    slug: "antenna-picker",
    sectionId: "antenna",
    jsMarker: "antenna",
    title: "CB Antenna & Mount Picker for Your Vehicle | CB Radio HQ",
    description: "Pick your vehicle and priority — get the exact CB antenna and mount recommended, including the ground-plane warning most beginners miss.",
    schemaName: "CB Antenna & Mount Picker",
    extraJs: 'const AMZ_TAG = "' + AMZ_TAG + '"; // live Amazon Associates tag\n',
  },
  {
    slug: "is-my-radio-legal",
    sectionId: "legalcheck",
    jsMarker: "legality",
    title: "Is My CB Radio Legal? Export Radio Checker | CB Radio HQ",
    description: "Search your radio's brand/model against a list of known export/10-meter radios not certified for CB use, sourced from FCC enforcement records.",
    schemaName: "CB Radio Legality Checker",
    extraJs: "",
  },
];

function extractBetween(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error(`Extraction markers not found: ${startMarker} / ${endMarker}`);
  }
  return html.slice(start + startMarker.length, end);
}

function extractSection(html, sectionId) {
  const re = new RegExp(`<section id="${sectionId}"[^>]*>([\\s\\S]*?)</section>`);
  const m = html.match(re);
  if (!m) throw new Error(`Section #${sectionId} not found in homepage.html`);
  return m[0]; // full <section>...</section> including the tag itself
}

// =====================================================
// HANDS-ON REVIEWS — real, first-person gear reviews, each with
// its own indexable URL (dist/reviews/{slug}/index.html) targeting
// "[radio] review" search intent. Uses Review + Product schema so
// it's eligible for rich results distinct from the tool pages.
// =====================================================
const REVIEWS = [
  {
    slug: "uniden-bearcat-880",
    name: "Uniden Bearcat 880",
    asin: "B006TA2F1M",
    price: "$163",
    ratingValue: "4",
    title: "Uniden Bearcat 880 Review: Hands-On Impressions | CB Radio HQ",
    description: "A real hands-on review of the Uniden Bearcat 880 — the color display, programming, audio quality, sunlight readability, and whether it's worth it.",
    pros: [
      "Bright 7-color LCD makes channel numbers and settings genuinely easy to read and program",
      "Setup out of the box is straightforward — no manual required for basic use",
      "Clear audio on both transmit and receive",
      "Uniden's customer support has been solid whenever I've needed it",
    ],
    cons: [
      "That color screen gets hard to see in direct sunlight — glare is a real issue at certain angles and times of day",
      "Audio and display are good, not best-in-class — a couple steps below what you'd get from a higher-end base unit",
    ],
    verdict: "Still a solid choice for any CB enthusiast. The sunlight glare is the one real gripe, everything else about it — the programming, the audio, the support behind it — holds up.",
    body: [
      { h: "First impressions", p: "I picked up the Bearcat 880 wanting something that wouldn't fight me on programming, and that's exactly what I got. The 7-color LCD is genuinely nice to look at — big numbers, backlit controls, easy to find channel and squelch settings without squinting at tiny labels." },
      { h: "Screen & sunlight", p: "The color display is the headline feature, and indoors or at night it looks great. Where it struggles is direct sunlight — there are times mid-day, depending on the angle, where the screen washes out and gets genuinely hard to read. Not a dealbreaker, but worth knowing if you're running this in a truck cab that gets a lot of sun through the windshield." },
      { h: "Programming & channel selection", p: "This is where the 880 actually shines. Channel numbers are easy to see, and stepping through channels or setting up PA/CB switching didn't require digging through a manual. If you've fought with a cluttered, tiny display on a cheaper radio before, this is a real upgrade." },
      { h: "Audio quality", p: "Audio is clear on both ends — transmissions come through clean and receive audio is easy to understand, even in a noisy cab. It's not the richest, loudest audio I've heard out of a CB, but it's clear and reliable, which is what actually matters on the road." },
      { h: "Support", p: "I haven't had to lean on this heavily, but when I did reach out, Uniden's support was responsive and actually helpful — not just a canned response. Worth something when you're trusting a radio on long hauls." },
      { h: "Bottom line", p: "For the price, the Bearcat 880 is a solid pick. The color screen and easy programming make day-to-day use genuinely pleasant, and the audio and support back it up. Sunlight glare on the display is the one real knock against it — everything else holds up." },
    ],
  },
];


// =====================================================
// SHARED CHROME — HQ Radio Network design system.
// The homepage carries <!--HQ:HEADER--> / <!--HQ:FOOTER--> placeholders;
// every generated page uses the same functions, so nothing drifts.
// Edit NETWORK / SOCIAL / AUTHOR here to change it sitewide.
// =====================================================
const NETWORK = [
  { name: "HQ Shortwave Radio", url: "https://hqshortwaveradio.com" },
  { name: "POC Radio HQ", url: "https://pocradiohq.com" },
  { name: "CB Radio HQ", url: SITE, self: true },
  { name: "GMRS HQ", url: "https://gmrshq.com" },
];
const SOCIAL = [
  { name: "YouTube", url: "https://www.youtube.com/@Hqshortwaveradio" },
  { name: "TikTok", url: "https://www.tiktok.com/@hqshortwaveradio" },
  { name: "Facebook", url: "https://www.facebook.com/Hqshortwaveradio" },
];
const AUTHOR = { name: "Michael Smith", call: "KM7FMJ", where: "Arizona" };
const FONTS_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Mono:wght@400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">';

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function gaSnippet() {
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>`;
}

// shared <head> tail for every generated page
function headAssets() {
  return `<meta name="theme-color" content="#0a0b0e">
${FONTS_LINK}
<link rel="stylesheet" href="/styles.css">`;
}

function sigBars(score) {
  const s = Math.max(0, Math.min(5, Number(score) || 0));
  const full = Math.floor(s + 1e-9);
  const half = s - full >= 0.25 && s - full < 0.75;
  const fullAdj = s - full >= 0.75 ? full + 1 : full;
  let bars = "";
  for (let i = 1; i <= 5; i++) bars += `<i class="${i <= fullAdj ? "f" : ""}"></i>`;
  return `<span class="sig" role="img" aria-label="Rated ${s.toFixed(1)} out of 5"><span class="sig-bars">${bars}</span><span class="sig-num">${s.toFixed(1)}<small>/5</small></span></span>`;
}

function netBar(home) {
  const links = NETWORK.map((n) =>
    n.self
      ? `<a class="on" href="${home ? "#top" : SITE + "/"}" aria-current="true">${n.name}</a>`
      : `<a href="${n.url}" target="_blank" rel="noopener">${n.name}</a>`
  ).join("");
  return `<div class="hq-net"><div class="hq-net-in"><span class="hq-net-lbl"><i></i>HQ Radio Network</span>${links}</div></div>`;
}

function ticker(home) {
  const h = home ? "" : SITE + "/";
  const r = REVIEWS[0];
  const items = [
    `Live skip outlook: <a href="${h}#skip">check conditions</a>`,
    `40 channels · 4W AM / 12W SSB · no license required`,
    r ? `Latest review: <a href="${SITE}/reviews/${r.slug}/">${esc(r.name)}</a> · ${Number(r.ratingValue).toFixed(1)}/5` : null,
    `Free <a href="${SITE}/swr-calculator/">SWR Doctor</a>`,
    `Built by ${AUTHOR.name}, ${AUTHOR.call} · ${AUTHOR.where}`,
  ].filter(Boolean);
  const run = items.map((i) => `<span>${i}</span>`).join("");
  return `<div class="hq-ticker" aria-label="Latest from CB Radio HQ"><div class="hq-tk-lbl"><i></i>On the air</div><div class="hq-tk-scroll"><div class="hq-tk-track">${run}${run.replace(/<span>/g, '<span aria-hidden="true">')}</div></div></div>`;
}

function masthead(home) {
  const h = home ? "" : SITE + "/";
  const nav = [
    [`${h}#channels`, "Channels"],
    [`${h}#skip`, "Skip"],
    [`${h}#sdr`, "Listen Live"],
    [`${h}#gear`, "Gear"],
    [`${SITE}/reviews/`, "Reviews"],
    [`${h}#spots`, "Community"],
  ];
  return `${netBar(home)}${ticker(home)}
<header class="hq-mast"><div class="hq-mast-in">
  <a class="hq-brand" href="${home ? "#top" : SITE + "/"}" aria-label="CB Radio HQ home"><span class="hq-sbars" aria-hidden="true"><i></i><i></i><i></i></span><span><span class="hq-bname">CB Radio<em>HQ</em></span><span class="hq-btag" style="display:block">Free tools for the 11-meter band</span></span></a>
  <button class="hq-burger" type="button" aria-expanded="false" aria-controls="hq-nav" onclick="var n=document.getElementById('hq-nav');var o=n.classList.toggle('open');this.setAttribute('aria-expanded',o);this.textContent=o?'Close':'Menu';">Menu</button>
  <nav class="hq-nav" id="hq-nav" aria-label="Main">${nav.map(([u, l]) => `<a href="${u}">${l}</a>`).join("")}<a class="hq-cta" href="${h}#tools">Free tools</a></nav>
</div></header>`;
}

function footer() {
  return `<footer class="hq-foot">
  <div class="hq-foot-in">
    <div>
      <a class="hq-brand" href="${SITE}/"><span class="hq-sbars" aria-hidden="true"><i></i><i></i><i></i></span><span class="hq-bname">CB Radio<em>HQ</em></span></a>
      <p>Free, independent tools and guides for CB radio: a live skip outlook, SWR Doctor, antenna picker, legal-radio checker and the full 40-channel guide.</p>
      <p>Built solo by ${AUTHOR.name}, ${AUTHOR.call}. Part of the HQ Radio Network.</p>
    </div>
    <div><h4>Tools</h4><ul>
      <li><a href="${SITE}/swr-calculator/">SWR Doctor</a></li>
      <li><a href="${SITE}/antenna-picker/">Antenna Picker</a></li>
      <li><a href="${SITE}/is-my-radio-legal/">Is My Radio Legal?</a></li>
      <li><a href="${SITE}/#skip">Skip Outlook</a></li>
      <li><a href="${SITE}/#sdr">Listen Live</a></li>
      <li><a href="${SITE}/#log">Skip Log</a></li>
    </ul></div>
    <div><h4>Learn</h4><ul>
      <li><a href="${SITE}/#channels">40-Channel Guide</a></li>
      <li><a href="${SITE}/#legal">What's Legal</a></li>
      <li><a href="${SITE}/#codes">10-Codes</a></li>
      <li><a href="${SITE}/#gear">Gear Guide</a></li>
      <li><a href="${SITE}/reviews/">Reviews</a></li>
      <li><a href="${SITE}/#faq">FAQ</a></li>
      <li><a href="${SITE}/#about">About</a></li>
    </ul></div>
    <div><h4>HQ Radio Network</h4><ul>
      ${NETWORK.filter((n) => !n.self).map((n) => `<li><a href="${n.url}" target="_blank" rel="noopener">${n.name}</a></li>`).join("\n      ")}
      ${SOCIAL.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></li>`).join("\n      ")}
      <li><a href="mailto:cbradiohq@gmail.com">Contact</a></li>
    </ul></div>
  </div>
  <div class="hq-foot-bot"><span>© ${new Date().getFullYear()} CB Radio HQ · Not affiliated with the FCC, REACT International, or any radio manufacturer.</span><span>As an Amazon Associate we earn from qualifying purchases.</span></div>
</footer>`;
}

function authorCard() {
  return `<aside class="author-card" aria-label="About the reviewer">
  <div class="author-plate">${AUTHOR.call}<small>LICENSED</small></div>
  <div>
    <h3>Reviewed by ${AUTHOR.name}</h3>
    <div class="role">Licensed ham · ${AUTHOR.call} · ${AUTHOR.where} · HQ Radio Network</div>
    <p>I run CB Radio HQ, HQ Shortwave Radio and POC Radio HQ. Every review here is first-person and lists the cons, not a rewritten spec sheet.</p>
    <div class="author-links"><a href="${SITE}/#about">About me</a><a href="${SOCIAL[0].url}" target="_blank" rel="noopener">Videos on YouTube</a><a href="https://hqshortwaveradio.com" target="_blank" rel="noopener">HQ Shortwave Radio</a></div>
  </div>
</aside>`;
}

function relatedTools() {
  return `<div class="related">
    <a href="${SITE}/swr-calculator/">SWR Doctor</a>
    <a href="${SITE}/antenna-picker/">Antenna Picker</a>
    <a href="${SITE}/is-my-radio-legal/">Is My Radio Legal?</a>
    <a href="${SITE}/#skip">Skip Outlook</a>
    <a href="${SITE}/reviews/">Gear Reviews</a>
  </div>`;
}

function channelPage(c) {
  const title = c.tag
    ? `CB Channel ${c.ch} (${c.freq} MHz) — ${c.tag} Channel | CB Radio HQ`
    : `CB Channel ${c.ch} Frequency: ${c.freq} MHz | CB Radio HQ`;
  const description = `Channel ${c.ch}: ${c.freq} MHz. ${c.use}.`.slice(0, 150);
  const canonical = `${SITE}/channel/${c.ch}/`;

  const context = CH_CONTEXT[c.ch] ||
    `Channel ${c.ch} sits at ${c.freq} MHz and is used mainly for ${c.use.toLowerCase()}. Like most of the 40-channel band, exact usage varies by region and time of day — the best way to know what a channel is used for near you is to listen before you transmit.`;

  const prev = c.ch > 1 ? c.ch - 1 : null;
  const next = c.ch < 40 ? c.ch + 1 : null;
  const isSSB = c.ch >= 36;
  const powerLine = isSSB
    ? "This channel is in the SSB segment: up to 12 watts PEP on single-sideband is legal, versus 4 watts on AM. No license is required either way."
    : "Like all AM CB channels, the legal power limit here is 4 watts, and no license is required to transmit.";
  const chips = CHANNELS.map((x) => `<a href="${SITE}/channel/${x.ch}/"${x.ch === c.ch ? ' class="on" aria-current="page"' : ""}>${x.ch}</a>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow">
${gaSnippet()}
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "CB Channel ${c.ch} — ${c.freq} MHz",
  "description": "${description.replace(/"/g, '\\"')}",
  "url": "${canonical}",
  "publisher": { "@type": "Organization", "name": "CB Radio HQ", "url": "${SITE}/" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type":"ListItem","position":1,"name":"CB Radio HQ","item":"${SITE}/"},
    {"@type":"ListItem","position":2,"name":"Channel Guide","item":"${SITE}/#channels"},
    {"@type":"ListItem","position":3,"name":"Channel ${c.ch}","item":"${canonical}"}
  ]
}
</script>
${headAssets()}
</head>
<body>
${masthead(false)}
<main class="page-wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="${SITE}/">CB Radio HQ</a> / <a href="${SITE}/#channels">Channel Guide</a> / Channel ${c.ch}</nav>

  <div class="ch-hero">
    <div class="ch-lcd"><div class="lbl">CB Channel</div><div class="num">${String(c.ch).padStart(2, "0")}</div><div class="fq">${c.freq} MHz</div></div>
    <div class="ch-title">
      <h1>CB Channel ${c.ch}${c.tag ? `<span class="tag ${c.tag === "EMERGENCY" || c.tag === "TRUCKER" ? "hot" : ""}">${c.tag}</span>` : ""}</h1>
      <p>${esc(c.use)}</p>
    </div>
  </div>

  <div class="facts">
    <div><span>Frequency</span><b>${c.freq} MHz</b></div>
    <div><span>Mode</span><b>${isSSB ? "AM / SSB" : "AM"}</b></div>
    <div><span>Legal power</span><b>${isSSB ? "4W AM / 12W SSB" : "4W AM"}</b></div>
    <div><span>License</span><b>None required</b></div>
  </div>

  <div class="ch-body">
    <p>${context}</p>
    <p>${powerLine}</p>
    <p>All 40 CB channels are fixed nationwide by the FCC between 26.965 and 27.405 MHz. Channel <em>uses</em> like the ones described here are widely-observed operator conventions, not law — the frequency is fixed, but who's talking on it depends on your region and the time of day.</p>
  </div>

  <div class="ch-nav">
    ${prev ? `<a href="${SITE}/channel/${prev}/">← Channel ${prev}</a>` : "<span></span>"}
    ${next ? `<a href="${SITE}/channel/${next}/">Channel ${next} →</a>` : "<span></span>"}
  </div>

  <div class="chips-h">All 40 channels</div>
  <div class="chips">${chips}</div>

  <a class="cta-card" href="${SITE}/#skip">
    <b>Is skip running right now?</b>
    <span>Check the live NOAA-driven Skip Outlook, browse the full channel guide, or run the SWR Doctor on CB Radio HQ →</span>
  </a>
  ${relatedTools()}
</main>
${footer()}
</body>
</html>`;
}



function reviewPage(review) {
  const canonical = `${SITE}/reviews/${review.slug}/`;
  const prosHtml = review.pros.map((p) => `<li>${p}</li>`).join("\n          ");
  const consHtml = review.cons.map((c) => `<li>${c}</li>`).join("\n          ");
  const bodyHtml = review.body
    .map((section) => `<h2>${section.h}</h2>\n      <p>${section.p}</p>`)
    .join("\n\n      ");
  const buy = `https://www.amazon.com/dp/${review.asin}?tag=${AMZ_TAG}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${review.title}</title>
<meta name="description" content="${review.description}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow">
${gaSnippet()}
<meta property="og:type" content="article">
<meta property="og:title" content="${review.title}">
<meta property="og:description" content="${review.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.png">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Review",
  "itemReviewed": {
    "@type": "Product",
    "name": "${review.name}",
    "offers": { "@type": "Offer", "price": "${review.price.replace(/[^0-9.]/g, "")}", "priceCurrency": "USD" }
  },
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "${review.ratingValue}",
    "bestRating": "5"
  },
  "author": { "@type": "Person", "name": "Michael Smith" },
  "publisher": { "@type": "Organization", "name": "CB Radio HQ", "url": "${SITE}/" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type":"ListItem","position":1,"name":"CB Radio HQ","item":"${SITE}/"},
    {"@type":"ListItem","position":2,"name":"Reviews","item":"${SITE}/reviews/"},
    {"@type":"ListItem","position":3,"name":"${review.name}","item":"${canonical}"}
  ]
}
</script>
${headAssets()}
</head>
<body>
${masthead(false)}
<main class="page-wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="${SITE}/">CB Radio HQ</a> / <a href="${SITE}/reviews/">Reviews</a> / ${review.name}</nav>

  <div class="pg-hero">
    <div class="rv-badge">Hands-on review</div>
    <h1>${review.name}</h1>
    <div class="cat">Reviewed by ${AUTHOR.name} · CB Radio HQ</div>
    ${sigBars(review.ratingValue)}
    <div class="price-box">
      <div><div class="lbl">Est. price</div><div class="price">${review.price}</div></div>
      <a class="btn btn-primary gear-link" href="${buy}" target="_blank" rel="noopener sponsored">View on Amazon →</a>
    </div>
    <p class="disclosure">As an Amazon Associate, CB Radio HQ earns from qualifying purchases. This costs you nothing extra.</p>
  </div>

  <section class="block">
    <div class="pros-cons">
      <div class="pros">
        <h3>What I liked</h3>
        <ul>
          ${prosHtml}
        </ul>
      </div>
      <div class="cons">
        <h3>What I didn't</h3>
        <ul>
          ${consHtml}
        </ul>
      </div>
    </div>
  </section>

  <section class="block">
    <div class="rv-body">
      ${bodyHtml}
    </div>
  </section>

  <div class="verdict-box">
    <h3>Verdict</h3>
    <p>${review.verdict}</p>
  </div>

  <a class="btn btn-primary gear-link" style="margin-top:24px;" href="${buy}" target="_blank" rel="noopener sponsored">View on Amazon →</a>

  ${authorCard()}
  ${relatedTools()}
</main>
${footer()}
</body>
</html>`;
}

function reviewsIndexPage() {
  const canonical = `${SITE}/reviews/`;
  const cards = REVIEWS.map(
    (r) => `<a class="review-card" href="${SITE}/reviews/${r.slug}/">
      <h2>${r.name}</h2>
      <p>${r.description}</p>
      ${sigBars(r.ratingValue)}
    </a>`
  ).join("\n    ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CB Radio Gear Reviews — Hands-On | CB Radio HQ</title>
<meta name="description" content="Real hands-on CB radio and gear reviews from CB Radio HQ — honest pros, cons, and verdicts, no fluff.">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow">
${gaSnippet()}
${headAssets()}
</head>
<body>
${masthead(false)}
<main class="page-wrap">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="${SITE}/">CB Radio HQ</a> / Reviews</nav>
  <div class="pg-hero">
    <div class="rv-badge">Hands-on</div>
    <h1>Gear Reviews</h1>
    <p style="margin:0;">Hands-on reviews, written by a real one-man CB operation — not rewritten spec sheets.</p>
  </div>
  <section class="block">
    ${cards}
  </section>
  ${relatedTools()}
</main>
${footer()}
</body>
</html>`;
}

function toolPage(tool, sectionHtml, toolJs) {
  const canonical = `${SITE}/${tool.slug}/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tool.title}</title>
<meta name="description" content="${tool.description}">
<link rel="canonical" href="${canonical}">
<meta name="robots" content="index, follow">
${gaSnippet()}
<meta property="og:type" content="website">
<meta property="og:title" content="${tool.title}">
<meta property="og:description" content="${tool.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.png">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "${tool.schemaName}",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Any (web browser)",
  "url": "${canonical}",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@type": "Organization", "name": "CB Radio HQ", "url": "${SITE}/" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type":"ListItem","position":1,"name":"CB Radio HQ","item":"${SITE}/"},
    {"@type":"ListItem","position":2,"name":"${tool.schemaName}","item":"${canonical}"}
  ]
}
</script>
${headAssets()}
</head>
<body>
${masthead(false)}
<main class="tool-page" id="top">
${sectionHtml}
<div class="wrap" style="padding:0 20px 64px;">
  <div class="chips-h">More free tools from CB Radio HQ</div>
  ${relatedTools()}
</div>
</main>
${footer()}

<script>
${tool.extraJs}${toolJs}
</script>
</body>
</html>`;
}

function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // The homepage source is kept as homepage.html and written out as the real
  // index.html. Its <!--HQ:HEADER--> / <!--HQ:FOOTER--> placeholders are filled
  // from the same functions every generated page uses.
  const homepageSrc = path.join(__dirname, "homepage.html");
  if (!fs.existsSync(homepageSrc)) throw new Error("homepage.html not found");
  const homepageHtml = fs.readFileSync(homepageSrc, "utf8");

  const styleMatch = homepageHtml.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) throw new Error("Could not find <style> block in homepage.html");
  // one stylesheet for the whole site: generated pages link /styles.css
  fs.writeFileSync(path.join(OUT_DIR, "styles.css"), styleMatch[1].trim() + "\n");

  const homeOut = homepageHtml
    .replace("<!--HQ:HEADER-->", masthead(true))
    .replace("<!--HQ:FOOTER-->", footer());
  if (/<!--HQ:/.test(homeOut)) throw new Error("Homepage placeholder left unfilled");
  fs.writeFileSync(path.join(OUT_DIR, "index.html"), homeOut);

  for (const f of ["robots.txt", "netlify.toml", "og-image.png"]) {
    const src = path.join(__dirname, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT_DIR, f));
  }
  // Note: functions/ is NOT copied here on purpose — Netlify Functions are
  // bundled from the functions directory set in the Netlify project settings.

  const channelUrls = [];
  for (const c of CHANNELS) {
    const dir = path.join(OUT_DIR, "channel", String(c.ch));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), channelPage(c));
    channelUrls.push(`${SITE}/channel/${c.ch}/`);
  }

  // Standalone tool pages — extracted from homepage.html via markers, so there
  // is exactly one source of truth for each tool's HTML/JS.
  const toolUrls = [];
  for (const tool of TOOL_PAGES) {
    const sectionHtml = extractSection(homepageHtml, tool.sectionId);
    const toolJs = extractBetween(
      homepageHtml,
      `/* ===TOOLJS:${tool.jsMarker}:START=== */`,
      `/* ===TOOLJS:${tool.jsMarker}:END=== */`
    );
    const dir = path.join(OUT_DIR, tool.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), toolPage(tool, sectionHtml, toolJs));
    toolUrls.push(`${SITE}/${tool.slug}/`);
  }

  const reviewUrls = [];
  for (const review of REVIEWS) {
    const dir = path.join(OUT_DIR, "reviews", review.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), reviewPage(review));
    reviewUrls.push(`${SITE}/reviews/${review.slug}/`);
  }
  fs.mkdirSync(path.join(OUT_DIR, "reviews"), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "reviews", "index.html"), reviewsIndexPage());
  reviewUrls.push(`${SITE}/reviews/`);

  fs.writeFileSync(path.join(OUT_DIR, "sitemap.xml"), buildSitemap(channelUrls, [...toolUrls, ...reviewUrls]));

  console.log(`Built ${CHANNELS.length} channel pages + ${toolUrls.length} tool pages + ${reviewUrls.length} review pages + sitemap.xml into dist/`);
}

main();
