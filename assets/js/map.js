/* ==========================================================================
   AQUILA — Service coverage map + suburb lookup
   Self-contained SVG map. No tiles, no external libraries, works offline.

   Coordinates are a plain equirectangular projection of real lat/lng:
     x = (lng - 153.335) / 0.265 * 560
     y = (-27.995 - lat) / 0.405 * 975
   ========================================================================== */
(function () {
  'use strict';

  var stage = document.getElementById('mapStage');
  if (!stage) return;

  var W = 560, H = 975;

  /* ---------- Serviced areas (from the Aquila service-area list) ---------- */
  var AREAS = [
    { n: 'Broadbeach Waters', p: '4218', s: 'QLD', x: 180, y: 84,  r: 24 },
    { n: 'Mermaid Waters',    p: '4218', s: 'QLD', x: 192, y: 116, r: 24 },
    { n: 'Robina',            p: '4226', s: 'QLD', x: 123, y: 197, r: 40 },
    { n: 'Mudgeeraba',        p: '4213', s: 'QLD', x: 44,  y: 202, r: 44 },
    { n: 'Varsity Lakes',     p: '4227', s: 'QLD', x: 152, y: 221, r: 28 },
    { n: 'Burleigh Heads',    p: '4220', s: 'QLD', x: 241, y: 241, r: 30 },
    { n: 'Tallebudgera',      p: '4228', s: 'QLD', x: 201, y: 301, r: 36 },
    { n: 'Palm Beach',        p: '4221', s: 'QLD', x: 279, y: 301, r: 26 },
    { n: 'Elanora',           p: '4221', s: 'QLD', x: 235, y: 337, r: 28 },
    { n: 'Currumbin',         p: '4223', s: 'QLD', x: 313, y: 349, r: 30 },
    { n: 'Tugun',             p: '4224', s: 'QLD', x: 334, y: 388, r: 22 },
    { n: 'Coolangatta',       p: '4225', s: 'QLD', x: 423, y: 414, r: 26 },
    { n: 'Tweed Heads',       p: '2485', s: 'NSW', x: 444, y: 445, r: 28 },
    { n: 'Terranora',         p: '2486', s: 'NSW', x: 340, y: 532, r: 36 },
    { n: 'Banora Point',      p: '2486', s: 'NSW', x: 418, y: 525, r: 30 },
    { n: 'Kingscliff',        p: '2487', s: 'NSW', x: 509, y: 628, r: 26 },
    { n: 'Casuarina',         p: '2487', s: 'NSW', x: 507, y: 710, r: 24 },
    { n: 'Murwillumbah',      p: '2484', s: 'NSW', x: 129, y: 797, r: 44 },
    { n: 'Cabarita Beach',    p: '2488', s: 'NSW', x: 501, y: 819, r: 24 },
    { n: 'Pottsville',        p: '2489', s: 'NSW', x: 484, y: 917, r: 28 }
  ];

  /* Alternative spellings / common shorthand that should still resolve */
  var ALIAS = {
    'broadbeach': 'Broadbeach Waters',
    'mermaidbeach': 'Mermaid Waters',
    'mermaid': 'Mermaid Waters',
    'tweed': 'Tweed Heads',
    'tweedheadssouth': 'Tweed Heads',
    'coolie': 'Coolangatta',
    'burleigh': 'Burleigh Heads',
    'burleighwaters': 'Burleigh Heads',
    'currumbinwaters': 'Currumbin',
    'currumbinvalley': 'Currumbin',
    'palmbeachqld': 'Palm Beach',
    'bogangar': 'Cabarita Beach',
    'murbah': 'Murwillumbah',
    'salt': 'Casuarina',
    'kingy': 'Kingscliff'
  };

  /* ---------- Geometry helpers ---------- */
  function rnd(seed) {
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* Closed Catmull-Rom through points -> cubic bezier path (organic blobs) */
  function smoothClosed(pts) {
    var n = pts.length;
    var d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' +
                 c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' +
                 p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
    }
    return d + 'Z';
  }

  function blobPath(cx, cy, r, seed) {
    var pts = [], n = 13;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var rr = r * (0.80 + 0.40 * rnd(seed * 7.3 + i * 2.1));
      pts.push([cx + Math.cos(a) * rr * 1.06, cy + Math.sin(a) * rr * 0.94]);
    }
    return smoothClosed(pts);
  }

  var COAST = [[211,0],[216,60],[224,110],[234,160],[244,215],[258,258],[285,301],[310,335],
               [330,368],[352,398],[380,405],[415,410],[444,418],[455,440],[470,470],[490,505],
               [505,560],[518,620],[524,680],[528,723],[524,780],[518,843],[512,905],[507,975]];
  var BORDER = [[446,418],[400,438],[349,469],[300,499],[243,542],[185,580],[137,614],[70,652],[0,694]];
  var RIVER  = [[452,442],[420,470],[390,490],[350,520],[300,560],[255,610],[215,660],[180,710],[150,760],[132,795]];

  function poly(pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ',' + p[1]; }).join('');
  }

  /* ---------- Build the SVG ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }

  var svg = el('svg', {
    viewBox: '0 0 ' + W + ' ' + H,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': 'Map of Aquila Water Leak Detection service areas across the southern Gold Coast and Tweed'
  });

  var vp = el('g', { id: 'mapViewport' });
  svg.appendChild(vp);

  /* Ocean */
  vp.appendChild(el('rect', { x: -200, y: -200, width: W + 400, height: H + 400, fill: '#c9d8e6' }));

  /* Decorative swell lines out at sea */
  [[300,120],[340,250],[420,470],[540,640],[560,880]].forEach(function (p, i) {
    vp.appendChild(el('path', {
      class: 'map-wave',
      d: 'M' + p[0] + ',' + p[1] + ' q 22,-10 44,0 t 44,0 t 44,0'
    }));
  });

  /* Land mass (everything west of the coastline) */
  vp.appendChild(el('path', { class: 'map-land', d: 'M-200,-200 L211,-200 ' + poly(COAST).slice(1) + ' L507,' + (H + 200) + ' L-200,' + (H + 200) + ' Z' }));
  vp.appendChild(el('path', { class: 'map-coast', d: poly(COAST) }));
  vp.appendChild(el('path', { class: 'map-river', d: poly(RIVER) }));
  vp.appendChild(el('path', { class: 'map-border', d: poly(BORDER) }));

  /* State + region labels */
  function regionLabel(x, y, text, cls) {
    var g = el('g', { class: 'map-region ' + (cls || '') });
    var t = el('text', { x: x, y: y });
    t.textContent = text;
    g.appendChild(t);
    vp.appendChild(g);
  }
  regionLabel(70, 60, 'Gold Coast');
  regionLabel(150, 470, 'QLD');
  regionLabel(120, 560, 'NSW');
  regionLabel(300, 700, 'Tweed Shire');
  regionLabel(430, 180, 'Coral Sea', 'sea');

  /* Serviced areas */
  var areaLayer = el('g', {});
  var labelLayer = el('g', {});
  vp.appendChild(areaLayer);
  vp.appendChild(labelLayer);

  var nodes = {};

  AREAS.forEach(function (a, i) {
    var g = el('g', { class: 'area-g', 'data-name': a.n, tabindex: '0', role: 'button' });
    var title = el('title', {});
    title.textContent = a.n + ' ' + a.s + ' ' + a.p + ' — serviced';
    g.appendChild(title);
    g.appendChild(el('path', { class: 'area-shape', d: blobPath(a.x, a.y, a.r, i + 1) }));
    g.appendChild(el('circle', { class: 'area-dot', cx: a.x, cy: a.y, r: 2.6 }));
    areaLayer.appendChild(g);

    var lg = el('g', { class: 'map-label', transform: 'translate(' + a.x + ',' + (a.y + a.r + 13) + ')' });
    var t = el('text', { x: 0, y: 0 });
    t.textContent = a.n;
    lg.appendChild(t);
    labelLayer.appendChild(lg);

    nodes[a.n] = { g: g, label: lg, data: a };

    g.addEventListener('click', function () { select(a.n, true); });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(a.n, true); }
    });
  });

  stage.insertBefore(svg, stage.firstChild);

  /* ---------- Zoom ---------- */
  var scale = 1, focus = { x: W / 2, y: H / 2 };

  function applyView() {
    vp.setAttribute('transform',
      'translate(' + (W / 2 - focus.x * scale).toFixed(2) + ',' +
                     (H / 2 - focus.y * scale).toFixed(2) + ') scale(' + scale.toFixed(3) + ')');
    // Keep labels and strokes at a constant on-screen size
    var inv = (1 / scale).toFixed(3);
    AREAS.forEach(function (a) {
      nodes[a.n].label.setAttribute('transform',
        'translate(' + a.x + ',' + (a.y + a.r * 1.0 + 13 / scale) + ') scale(' + inv + ')');
    });
    document.querySelectorAll('.map-region text').forEach(function (t) {
      t.style.fontSize = (15 / scale) + 'px';
      t.style.letterSpacing = (0.22 * 15 / scale) + 'px';
    });
    [].forEach.call(svg.querySelectorAll('.area-shape,.map-coast,.map-river,.map-border,.map-wave'), function (p) {
      p.style.strokeWidth = '';
      p.setAttribute('vector-effect', 'non-scaling-stroke');
    });
  }

  function zoomTo(x, y, k) {
    scale = Math.max(1, Math.min(6, k));
    focus.x = x; focus.y = y;
    applyView();
  }

  /* ---------- Selection + lookup ---------- */
  var resultBox  = document.getElementById('lookupResult');
  var input      = document.getElementById('lookupInput');
  var chipWrap   = document.getElementById('chipList');

  function clearActive() {
    [].forEach.call(document.querySelectorAll('.area-g.is-active'), function (g) { g.classList.remove('is-active'); });
    [].forEach.call(document.querySelectorAll('.chip.is-active'), function (c) { c.classList.remove('is-active'); });
  }

  function select(name, scroll) {
    var node = nodes[name];
    if (!node) return;
    clearActive();
    node.g.classList.add('is-active');
    node.g.parentNode.appendChild(node.g); // bring to front
    var chip = chipWrap && chipWrap.querySelector('[data-chip="' + name + '"]');
    if (chip) chip.classList.add('is-active');
    zoomTo(node.data.x, node.data.y, 3.4);
    showResult(true, node.data);
    if (scroll && window.innerWidth <= 920) {
      stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showResult(covered, data, query) {
    if (!resultBox) return;
    resultBox.className = 'lookup-result show ' + (covered ? 'yes' : 'maybe');
    if (covered) {
      resultBox.innerHTML =
        '<div class="lr-head">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a7fd4" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/></svg>' +
          '<b>Yes — we service ' + data.n + '</b>' +
        '</div>' +
        '<p>' + data.n + ' ' + data.s + ' ' + data.p + ' is inside our standard service area. ' +
        'Bookings Monday to Friday, 7:00am – 5:00pm.</p>' +
        '<a class="btn btn-primary" href="contact.html">Book an Inspection</a>';
    } else {
      resultBox.innerHTML =
        '<div class="lr-head">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c69126" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>' +
          '<b>Not on our standard list</b>' +
        '</div>' +
        '<p>We couldn\'t match <strong>' + (query || '') + '</strong> to a suburb in our service area. ' +
        'That doesn\'t always mean no — give us a call and we\'ll tell you straight away whether we can get to you.</p>' +
        '<a class="btn btn-primary" href="tel:0413336880">Call 0413 336 880</a>';
    }
  }

  function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function lookup(query) {
    var q = norm(query);
    if (!q) return;

    if (ALIAS[q]) { select(ALIAS[q], true); return; }

    var exact = null, starts = null, contains = null, byPost = null;
    AREAS.forEach(function (a) {
      var n = norm(a.n);
      if (n === q) exact = a.n;
      else if (!starts && n.indexOf(q) === 0) starts = a.n;
      else if (!contains && q.length >= 3 && n.indexOf(q) > -1) contains = a.n;
      if (!byPost && a.p === q) byPost = a.n;
    });

    var hit = exact || byPost || starts || contains;
    if (hit) select(hit, true);
    else { clearActive(); zoomTo(W / 2, H / 2, 1); showResult(false, null, query.trim()); }
  }

  /* ---------- Wire up controls ---------- */
  var form = document.getElementById('lookupForm');
  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); lookup(input.value); });
  }
  if (input) {
    input.addEventListener('change', function () { if (input.value) lookup(input.value); });
  }

  // Datalist of suburb + postcode suggestions
  var dl = document.getElementById('suburbOptions');
  if (dl) {
    AREAS.forEach(function (a) {
      var o = document.createElement('option');
      o.value = a.n;
      o.label = a.s + ' ' + a.p;
      dl.appendChild(o);
    });
  }

  // Chip list
  if (chipWrap) {
    AREAS.slice().sort(function (a, b) { return a.n.localeCompare(b.n); }).forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('data-chip', a.n);
      b.innerHTML = a.n + ' <small>' + a.s + ' ' + a.p + '</small>';
      b.addEventListener('click', function () { select(a.n, true); });
      chipWrap.appendChild(b);
    });
    var count = document.getElementById('chipCount');
    if (count) count.textContent = AREAS.length + ' suburbs in our standard service area';
  }

  var zin  = document.getElementById('zoomIn');
  var zout = document.getElementById('zoomOut');
  var zres = document.getElementById('zoomReset');
  if (zin)  zin.addEventListener('click',  function () { zoomTo(focus.x, focus.y, scale * 1.5); });
  if (zout) zout.addEventListener('click', function () { zoomTo(focus.x, focus.y, scale / 1.5); });
  if (zres) zres.addEventListener('click', function () {
    clearActive();
    zoomTo(W / 2, H / 2, 1);
    if (resultBox) resultBox.className = 'lookup-result';
    if (input) input.value = '';
  });

  applyView();
})();
