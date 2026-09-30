/*
 * Carte procédurale de la vidéo Pignon.
 * Reprend l'algorithme du fond « rue » du site (static/js/pignon-rue-bg.js : découpe BSP,
 * rues déformées, parcelles bâties, passants), étiré en format portrait et rendu déterministe :
 * tout ce qui bouge est une fonction du temps t, pour un rendu image par image.
 */
(function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function polyArea(P) { var s = 0; for (var i = 0, n = P.length; i < n; i++) { var a = P[i], b = P[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
  function polyCentroid(P) {
    var A = polyArea(P);
    if (Math.abs(A) < 1e-9) { var sx = 0, sy = 0; for (var k = 0; k < P.length; k++) { sx += P[k][0]; sy += P[k][1]; } return [sx / P.length, sy / P.length]; }
    var cx = 0, cy = 0;
    for (var i = 0, n = P.length; i < n; i++) { var a = P[i], b = P[(i + 1) % n], f = a[0] * b[1] - b[0] * a[1]; cx += (a[0] + b[0]) * f; cy += (a[1] + b[1]) * f; }
    return [cx / (6 * A), cy / (6 * A)];
  }
  function clipHalf(P, nx, ny, c) {
    var out = [], n = P.length; if (!n) return out;
    for (var i = 0; i < n; i++) {
      var a = P[i], b = P[(i + 1) % n];
      var da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
      if (da <= 1e-9) out.push(a);
      if ((da < -1e-9 && db > 1e-9) || (da > 1e-9 && db < -1e-9)) {
        var t = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    return out;
  }
  function insetConvex(P, d) {
    var ct = polyCentroid(P), Q = P, n = P.length;
    for (var i = 0; i < n; i++) {
      var a = P[i], b = P[(i + 1) % n];
      var ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey); if (L < 1e-6) continue;
      var nx = -ey / L, ny = ex / L;
      if (nx * (ct[0] - a[0]) + ny * (ct[1] - a[1]) > 0) { nx = -nx; ny = -ny; }
      Q = clipHalf(Q, nx, ny, nx * a[0] + ny * a[1] - (typeof d === 'function' ? d(i) : d));
      if (Q.length < 3) return [];
    }
    return Q;
  }
  function obb(P) {
    var best = { maxExt: 0, maxAngle: 0 };
    for (var i = 0, n = P.length; i < n; i++) {
      var a = P[i], b = P[(i + 1) % n];
      var ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey); if (L < 1e-6) continue;
      var ux = ex / L, uy = ey / L, vx = -uy, vy = ux;
      var u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (var k = 0; k < n; k++) {
        var pu = P[k][0] * ux + P[k][1] * uy, pv = P[k][0] * vx + P[k][1] * vy;
        if (pu < u0) u0 = pu; if (pu > u1) u1 = pu; if (pv < v0) v0 = pv; if (pv > v1) v1 = pv;
      }
      var eu = u1 - u0, ev = v1 - v0, ext = Math.max(eu, ev), ang = eu >= ev ? Math.atan2(uy, ux) : Math.atan2(vy, vx);
      if (ext > best.maxExt) best = { maxExt: ext, maxAngle: ang };
    }
    return best;
  }
  function segDist(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    var t = L2 > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1) : 0;
    return { d: Math.hypot(px - (ax + dx * t), py - (ay + dy * t)), t: t };
  }

  // Ville en portrait : même grammaire que le fond du site, emprise 1500 x 2400.
  var DW = 1500, DH = 2400;
  var SEED = 0x51A7C3;
  var ROOT = [[70, 150], [520, 50], [1110, 40], [1450, 190], [1480, 1180], [1430, 2230], [900, 2370], [290, 2340], [40, 1290]];
  var MINCELL = 26000;
  var CUT_W = [22, 18, 15, 12.5, 10.5, 9, 8, 7];
  var FORCED = [
    { a: 1.4708, x: 760, y: 1190 },
    { a: -0.10, x: 700, y: 620 },
    { a: -0.145, x: 790, y: 1780 }
  ];

  function build() {
    var cuts = [], cells = [];

    (function buildBSP() {
      var rnd = mulberry32(SEED ^ 0x9E37);
      var forced = FORCED.map(function (f) {
        var nx = Math.cos(f.a), ny = Math.sin(f.a);
        return { nx: nx, ny: ny, c: nx * f.x + ny * f.y };
      });
      var q = [{ poly: ROOT.map(function (p) { return [p[0], p[1]]; }), depth: 0, forced: 0 }], guard = 0;
      while (q.length && guard++ < 1400) {
        var cell = q.shift();
        var A = Math.abs(polyArea(cell.poly)), ob = obb(cell.poly);
        if (cell.forced === null && (A < MINCELL || ob.maxExt < 128 || cell.depth >= 9)) { cells.push({ poly: cell.poly }); continue; }
        var nx, ny, c;
        if (cell.forced !== null && forced[cell.forced]) { nx = forced[cell.forced].nx; ny = forced[cell.forced].ny; c = forced[cell.forced].c; }
        else {
          var ang = ob.maxAngle + (rnd() - 0.5) * 0.56;
          nx = Math.cos(ang); ny = Math.sin(ang);
          var ct = polyCentroid(cell.poly);
          c = nx * ct[0] + ny * ct[1] + (rnd() - 0.5) * ob.maxExt * 0.30;
        }
        var p1 = clipHalf(cell.poly, nx, ny, c), p2 = clipHalf(cell.poly, -nx, -ny, -c);
        if (p1.length < 3 || p2.length < 3 || Math.abs(polyArea(p1)) < 2600 || Math.abs(polyArea(p2)) < 2600) { cells.push({ poly: cell.poly }); continue; }
        var f1 = cell.forced === 0 ? 1 : null, f2 = cell.forced === 0 ? 2 : null;
        cuts.push({ nx: nx, ny: ny, c: c, depth: cell.depth, width: CUT_W[Math.min(CUT_W.length - 1, cell.depth)] });
        q.push({ poly: p1, depth: cell.depth + 1, forced: f1 });
        q.push({ poly: p2, depth: cell.depth + 1, forced: f2 });
      }
      while (q.length) cells.push({ poly: q.shift().poly });
    })();

    function warp(x, y) {
      var u = x / DW, v = y / DH;
      var dx = 46 * Math.sin(v * 4.1 + 0.7) + 22 * Math.sin(u * 6.3 + 2.1) + 13 * Math.sin(v * 9.2 + 1.3);
      var dy = 34 * Math.sin(u * 3.4 + 1.9) + 18 * Math.sin(v * 5.7 + 0.4) + 10 * Math.sin(u * 8.8 + 2.7);
      return [x + dx, y + dy];
    }
    function warpPoly(P) { var o = []; for (var i = 0; i < P.length; i++) o.push(warp(P[i][0], P[i][1])); return o; }

    var nodes = [], edges = [];
    (function buildGraph() {
      var GRID = 24, map = Object.create(null);
      function addNode(x, y) {
        var kx = Math.round(x / GRID), ky = Math.round(y / GRID);
        for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) {
          var arr = map[(kx + a) + '_' + (ky + b)];
          if (arr) for (var i = 0; i < arr.length; i++) { var n = nodes[arr[i]]; if (Math.hypot(n.x - x, n.y - y) < 16) return arr[i]; }
        }
        var id = nodes.length; nodes.push({ x: x, y: y, adj: [] });
        var k = kx + '_' + ky; if (!map[k]) map[k] = []; map[k].push(id);
        return id;
      }
      var raw = [], seen = Object.create(null);
      for (var ci = 0; ci < cells.length; ci++) {
        var P = cells[ci].poly;
        for (var i = 0; i < P.length; i++) {
          var a = addNode(P[i][0], P[i][1]), b = addNode(P[(i + 1) % P.length][0], P[(i + 1) % P.length][1]);
          if (a === b) continue;
          var kk = Math.min(a, b) * 100000 + Math.max(a, b);
          if (seen[kk]) continue; seen[kk] = 1; raw.push([a, b]);
        }
      }
      for (var pass = 0; pass < 6; pass++) {
        var changed = false, next = [];
        for (var e = 0; e < raw.length; e++) {
          var A2 = nodes[raw[e][0]], B2 = nodes[raw[e][1]], bestN = -1;
          for (var n2 = 0; n2 < nodes.length; n2++) {
            if (n2 === raw[e][0] || n2 === raw[e][1]) continue;
            var N = nodes[n2], r = segDist(N.x, N.y, A2.x, A2.y, B2.x, B2.y);
            if (r.d < 2.0 && r.t > 0.02 && r.t < 0.98) { bestN = n2; break; }
          }
          if (bestN >= 0) { next.push([raw[e][0], bestN]); next.push([bestN, raw[e][1]]); changed = true; }
          else next.push(raw[e]);
        }
        raw = next; if (!changed) break;
      }
      var seen2 = Object.create(null);
      for (var e2 = 0; e2 < raw.length; e2++) {
        var a2 = raw[e2][0], b2 = raw[e2][1], k2 = Math.min(a2, b2) * 100000 + Math.max(a2, b2);
        if (seen2[k2]) continue; seen2[k2] = 1;
        edges.push({ a: a2, b: b2 });
      }
      for (var e3 = 0; e3 < edges.length; e3++) { nodes[edges[e3].a].adj.push({ n: edges[e3].b, e: e3 }); nodes[edges[e3].b].adj.push({ n: edges[e3].a, e: e3 }); }
    })();

    (function classify() {
      for (var e = 0; e < edges.length; e++) {
        var A = nodes[edges[e].a], B = nodes[edges[e].b], found = -1;
        for (var c = 0; c < cuts.length; c++) {
          var C = cuts[c];
          if (Math.abs(C.nx * A.x + C.ny * A.y - C.c) < 1.2 && Math.abs(C.nx * B.x + C.ny * B.y - C.c) < 1.2) { found = c; break; }
        }
        edges[e].width = found >= 0 ? cuts[found].width : 18;
      }
    })();

    var corridors = [];
    (function buildCorridors() {
      for (var e = 0; e < edges.length; e++) {
        var A = nodes[edges[e].a], B = nodes[edges[e].b];
        var L0 = Math.hypot(B.x - A.x, B.y - A.y);
        var k = Math.max(2, Math.min(8, Math.ceil(L0 / 46) + 1));
        var pts = new Float32Array(k * 2), cum = new Float32Array(k), px = 0, py = 0;
        for (var i = 0; i < k; i++) {
          var t = i / (k - 1);
          var w = warp(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t);
          pts[i * 2] = w[0]; pts[i * 2 + 1] = w[1];
          cum[i] = i === 0 ? 0 : cum[i - 1] + Math.hypot(w[0] - px, w[1] - py);
          px = w[0]; py = w[1];
        }
        corridors.push({ a: edges[e].a, b: edges[e].b, pts: pts, cum: cum, np: k, len: cum[k - 1] || 1, width: edges[e].width });
      }
    })();
    var NN = nodes.length, NE = corridors.length;

    var adjStart = new Int32Array(NN + 1), adjNode, adjEdge;
    (function compactAdj() {
      var tot = 0, i;
      for (i = 0; i < NN; i++) { adjStart[i] = tot; tot += nodes[i].adj.length; }
      adjStart[NN] = tot;
      adjNode = new Int32Array(tot); adjEdge = new Int32Array(tot);
      var p = 0;
      for (i = 0; i < NN; i++) for (var j = 0; j < nodes[i].adj.length; j++) { adjNode[p] = nodes[i].adj[j].n; adjEdge[p] = nodes[i].adj[j].e; p++; }
    })();

    var lots = [];
    (function buildLots() {
      var rnd = mulberry32(SEED ^ 0x2C1D);
      for (var ci = 0; ci < cells.length; ci++) {
        var P = cells[ci].poly;
        var block = insetConvex(P, function (i) {
          var a = P[i], b = P[(i + 1) % P.length], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, wBest = 18;
          for (var c = 0; c < cuts.length; c++) if (Math.abs(cuts[c].nx * mx + cuts[c].ny * my - cuts[c].c) < 1.4) { wBest = cuts[c].width; break; }
          return wBest / 2 + 2.2;
        });
        if (block.length < 3) continue;
        subdiv(block, 0);
      }
      function subdiv(P, depth) {
        var A = Math.abs(polyArea(P)), ob = obb(P);
        if (depth > 6 || A < 3200 || ob.maxExt < 30) { pushLot(P); return; }
        var ang = ob.maxAngle + (rnd() - 0.5) * 0.24, nx = Math.cos(ang), ny = Math.sin(ang), ct = polyCentroid(P);
        var c = nx * ct[0] + ny * ct[1] + (rnd() - 0.5) * ob.maxExt * 0.22;
        var p1 = clipHalf(P, nx, ny, c), p2 = clipHalf(P, -nx, -ny, -c);
        if (p1.length < 3 || p2.length < 3 || Math.abs(polyArea(p1)) < 1000 || Math.abs(polyArea(p2)) < 1000) { pushLot(P); return; }
        subdiv(p1, depth + 1); subdiv(p2, depth + 1);
      }
      function pushLot(P) {
        var A = Math.abs(polyArea(P)); if (A < 900) return;
        var b = insetConvex(P, 2.4), courtyard = rnd() < 0.13;
        var wp = warpPoly(P), wb = (b.length >= 3 && !courtyard) ? warpPoly(b) : null;
        var ctw = polyCentroid(wp);
        lots.push({ poly: wp, bld: wb, cx: ctw[0], cy: ctw[1], area: A });
      }
    })();

    var warpedCells = cells.map(function (c) { return warpPoly(c.poly); });

    var widthBuckets = [];
    (function bucketW() {
      var m = {};
      for (var e = 0; e < NE; e++) { var k = Math.round(corridors[e].width); if (!m[k]) m[k] = []; m[k].push(e); }
      var ks = Object.keys(m).map(Number).sort(function (a, b) { return b - a; });
      for (var i = 0; i < ks.length; i++) widthBuckets.push({ w: ks[i], list: m[ks[i]] });
    })();

    // Passants : trajectoires précalculées à pas fixe, pour que la frame t soit toujours identique.
    var DT = 1 / 120, DUREE = 16;
    var rndA = mulberry32(SEED ^ 0xF1a4);
    var N_AGENTS = 120;
    var tracks = [];
    (function simulate() {
      var agents = [];
      for (var i = 0; i < N_AGENTS; i++) {
        var e = Math.floor(rndA() * NE);
        agents.push({ e: e, t: rndA() * corridors[e].len, dir: rndA() < 0.5 ? 1 : -1, v: 34 + rndA() * 30 });
      }
      function nextEdgeFrom(node, avoidNode) {
        var start = adjStart[node], end = adjStart[node + 1], n = end - start;
        if (n <= 0) return -1;
        var tries = 4;
        while (tries--) {
          var k = start + Math.floor(rndA() * n);
          if (n > 1 && adjNode[k] === avoidNode && tries) continue;
          return k;
        }
        return start;
      }
      var steps = Math.ceil(DUREE / DT) + 1, pos = [0, 0];
      for (var a = 0; a < N_AGENTS; a++) tracks.push(new Float32Array(steps * 2));
      for (var s = 0; s < steps; s++) {
        for (var j = 0; j < N_AGENTS; j++) {
          var ag = agents[j];
          corPoint(corridors[ag.e], ag.t, pos);
          tracks[j][s * 2] = pos[0]; tracks[j][s * 2 + 1] = pos[1];
          var C = corridors[ag.e];
          ag.t += ag.dir * ag.v * DT;
          if (ag.t >= C.len || ag.t <= 0) {
            var reachedB = ag.t >= C.len;
            var node = reachedB ? C.b : C.a, cameFrom = reachedB ? C.a : C.b;
            var k = nextEdgeFrom(node, cameFrom);
            if (k < 0) { ag.dir *= -1; ag.t = clamp(ag.t, 0, C.len); continue; }
            var ne = adjEdge[k], NC = corridors[ne];
            ag.e = ne; ag.dir = (NC.a === node) ? 1 : -1; ag.t = ag.dir === 1 ? 0 : NC.len;
          }
        }
      }
    })();

    function corPoint(C, t, out) {
      var s = 0; while (s < C.np - 2 && C.cum[s + 1] < t) s++;
      var l0 = C.cum[s], l1 = C.cum[s + 1], f = (l1 - l0) > 1e-6 ? clamp((t - l0) / (l1 - l0), 0, 1) : 0;
      out[0] = C.pts[s * 2] + (C.pts[s * 2 + 2] - C.pts[s * 2]) * f;
      out[1] = C.pts[s * 2 + 1] + (C.pts[s * 2 + 3] - C.pts[s * 2 + 1]) * f;
      return out;
    }

    // Distances réseau (Dijkstra) depuis un point : sert à l'isochrone « jusqu'où à 10 minutes ».
    function networkFrom(x, y) {
      var best = { e: 0, t: 0, d: 1e9 };
      for (var e = 0; e < NE; e++) {
        var C = corridors[e];
        for (var i = 0; i < C.np - 1; i++) {
          var r = segDist(x, y, C.pts[i * 2], C.pts[i * 2 + 1], C.pts[i * 2 + 2], C.pts[i * 2 + 3]);
          if (r.d < best.d) best = { e: e, t: C.cum[i] + (C.cum[i + 1] - C.cum[i]) * r.t, d: r.d };
        }
      }
      var dist = new Float64Array(NN).fill(Infinity), done = new Uint8Array(NN);
      var C0 = corridors[best.e];
      dist[C0.a] = best.t; dist[C0.b] = C0.len - best.t;
      for (;;) {
        var u = -1, du = Infinity;
        for (var n = 0; n < NN; n++) if (!done[n] && dist[n] < du) { du = dist[n]; u = n; }
        if (u < 0) break;
        done[u] = 1;
        for (var k = adjStart[u]; k < adjStart[u + 1]; k++) {
          var v = adjNode[k], w = corridors[adjEdge[k]].len;
          if (du + w < dist[v]) dist[v] = du + w;
        }
      }
      return { dist: dist, start: best };
    }

    function tracePoly(ctx, P) { ctx.moveTo(P[0][0], P[0][1]); for (var i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
    function traceCor(ctx, e) { var C = corridors[e]; ctx.moveTo(C.pts[0], C.pts[1]); for (var i = 1; i < C.np; i++) ctx.lineTo(C.pts[i * 2], C.pts[i * 2 + 1]); }
    // Trace la portion [t0, t1] (en longueur) d'un couloir.
    function traceCorRange(ctx, C, t0, t1) {
      if (t1 <= t0) return;
      var p = [0, 0];
      corPoint(C, t0, p); ctx.moveTo(p[0], p[1]);
      for (var i = 1; i < C.np - 1; i++) if (C.cum[i] > t0 && C.cum[i] < t1) ctx.lineTo(C.pts[i * 2], C.pts[i * 2 + 1]);
      corPoint(C, t1, p); ctx.lineTo(p[0], p[1]);
    }

    return {
      width: DW, height: DH,
      cells: warpedCells, lots: lots, corridors: corridors, widthBuckets: widthBuckets, nodes: nodes,
      tracks: tracks, trackDt: DT,
      warp: warp, corPoint: corPoint, networkFrom: networkFrom,
      tracePoly: tracePoly, traceCor: traceCor, traceCorRange: traceCorRange
    };
  }

  window.PignonCity = { build: build, mulberry32: mulberry32 };
})();
