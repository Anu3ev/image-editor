function fe(l) {
  "@babel/helpers - typeof";
  return fe = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
    return typeof e;
  } : function(e) {
    return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
  }, fe(l);
}
var tr = Uint8Array, gr = Uint16Array, _o = Int32Array, cs = new tr([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]), hs = new tr([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]), go = new tr([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), Au = function(e, r) {
  for (var n = new gr(31), s = 0; s < 31; ++s)
    n[s] = r += 1 << e[s - 1];
  for (var a = new _o(n[30]), s = 1; s < 30; ++s)
    for (var o = n[s]; o < n[s + 1]; ++o)
      a[o] = o - n[s] << 5 | s;
  return {
    b: n,
    r: a
  };
}, xu = Au(cs, 2), Su = xu.b, mo = xu.r;
Su[28] = 258, mo[258] = 28;
var _u = Au(hs, 0), Pl = _u.b, nu = _u.r, vo = new gr(32768);
for (var Ne = 0; Ne < 32768; ++Ne) {
  var Fn = (Ne & 43690) >> 1 | (Ne & 21845) << 1;
  Fn = (Fn & 52428) >> 2 | (Fn & 13107) << 2, Fn = (Fn & 61680) >> 4 | (Fn & 3855) << 4, vo[Ne] = ((Fn & 65280) >> 8 | (Fn & 255) << 8) >> 1;
}
var en = function(e, r, n) {
  for (var s = e.length, a = 0, o = new gr(r); a < s; ++a)
    e[a] && ++o[e[a] - 1];
  var f = new gr(r);
  for (a = 1; a < r; ++a)
    f[a] = f[a - 1] + o[a - 1] << 1;
  var c;
  if (n) {
    c = new gr(1 << r);
    var m = 15 - r;
    for (a = 0; a < s; ++a)
      if (e[a])
        for (var A = a << 4 | e[a], b = r - e[a], S = f[e[a] - 1]++ << b, g = S | (1 << b) - 1; S <= g; ++S)
          c[vo[S] >> m] = A;
  } else
    for (c = new gr(s), a = 0; a < s; ++a)
      e[a] && (c[a] = vo[f[e[a] - 1]++] >> 15 - e[a]);
  return c;
}, Bn = new tr(288);
for (var Ne = 0; Ne < 144; ++Ne) Bn[Ne] = 8;
for (var Ne = 144; Ne < 256; ++Ne) Bn[Ne] = 9;
for (var Ne = 256; Ne < 280; ++Ne) Bn[Ne] = 7;
for (var Ne = 280; Ne < 288; ++Ne) Bn[Ne] = 8;
var da = new tr(32);
for (var Ne = 0; Ne < 32; ++Ne) da[Ne] = 5;
var kl = /* @__PURE__ */ en(Bn, 9, 0), Fl = /* @__PURE__ */ en(Bn, 9, 1), Il = /* @__PURE__ */ en(da, 5, 0), Cl = /* @__PURE__ */ en(da, 5, 1), ao = function(e) {
  for (var r = e[0], n = 1; n < e.length; ++n)
    e[n] > r && (r = e[n]);
  return r;
}, qr = function(e, r, n) {
  var s = r / 8 | 0;
  return (e[s] | e[s + 1] << 8) >> (r & 7) & n;
}, so = function(e, r) {
  var n = r / 8 | 0;
  return (e[n] | e[n + 1] << 8 | e[n + 2] << 16) >> (r & 7);
}, Po = function(e) {
  return (e + 7) / 8 | 0;
}, Pu = function(e, r, n) {
  return (n == null || n > e.length) && (n = e.length), new tr(e.subarray(r, n));
}, jl = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
], Dr = function(e, r, n) {
  var s = new Error(r || jl[e]);
  if (s.code = e, Error.captureStackTrace && Error.captureStackTrace(s, Dr), !n) throw s;
  return s;
}, Ol = function(e, r, n, s) {
  var a = e.length, o = 0;
  if (!a || r.f && !r.l) return n || new tr(0);
  var f = !n, c = f || r.i != 2, m = r.i;
  f && (n = new tr(a * 3));
  var A = function(Ft) {
    var Rt = n.length;
    if (Ft > Rt) {
      var Dt = new tr(Math.max(Rt * 2, Ft));
      Dt.set(n), n = Dt;
    }
  }, b = r.f || 0, S = r.p || 0, g = r.b || 0, B = r.l, F = r.d, O = r.m, I = r.n, N = a * 8;
  do {
    if (!B) {
      b = qr(e, S, 1);
      var J = qr(e, S + 1, 3);
      if (S += 3, J)
        if (J == 1) B = Fl, F = Cl, O = 9, I = 5;
        else if (J == 2) {
          var nt = qr(e, S, 31) + 257, dt = qr(e, S + 10, 15) + 4, z = nt + qr(e, S + 5, 31) + 1;
          S += 14;
          for (var at = new tr(z), M = new tr(19), k = 0; k < dt; ++k)
            M[go[k]] = qr(e, S + k * 3, 7);
          S += dt * 3;
          for (var D = ao(M), R = (1 << D) - 1, ot = en(M, D, 1), k = 0; k < z; ) {
            var st = ot[qr(e, S, R)];
            S += st & 15;
            var et = st >> 4;
            if (et < 16)
              at[k++] = et;
            else {
              var ht = 0, X = 0;
              for (et == 16 ? (X = 3 + qr(e, S, 3), S += 2, ht = at[k - 1]) : et == 17 ? (X = 3 + qr(e, S, 7), S += 3) : et == 18 && (X = 11 + qr(e, S, 127), S += 7); X--; ) at[k++] = ht;
            }
          }
          var Nt = at.subarray(0, nt), rt = at.subarray(nt);
          O = ao(Nt), I = ao(rt), B = en(Nt, O, 1), F = en(rt, I, 1);
        } else Dr(1);
      else {
        var et = Po(S) + 4, ct = e[et - 4] | e[et - 3] << 8, bt = et + ct;
        if (bt > a) {
          m && Dr(0);
          break;
        }
        c && A(g + ct), n.set(e.subarray(et, bt), g), r.b = g += ct, r.p = S = bt * 8, r.f = b;
        continue;
      }
      if (S > N) {
        m && Dr(0);
        break;
      }
    }
    c && A(g + 131072);
    for (var xt = (1 << O) - 1, E = (1 << I) - 1, x = S; ; x = S) {
      var ht = B[so(e, S) & xt], q = ht >> 4;
      if (S += ht & 15, S > N) {
        m && Dr(0);
        break;
      }
      if (ht || Dr(2), q < 256) n[g++] = q;
      else if (q == 256) {
        x = S, B = null;
        break;
      } else {
        var U = q - 254;
        if (q > 264) {
          var k = q - 257, V = cs[k];
          U = qr(e, S, (1 << V) - 1) + Su[k], S += V;
        }
        var K = F[so(e, S) & E], ft = K >> 4;
        K || Dr(3), S += K & 15;
        var rt = Pl[ft];
        if (ft > 3) {
          var V = hs[ft];
          rt += so(e, S) & (1 << V) - 1, S += V;
        }
        if (S > N) {
          m && Dr(0);
          break;
        }
        c && A(g + 131072);
        var it = g + U;
        if (g < rt) {
          var ut = o - rt, Lt = Math.min(rt, it);
          for (ut + g < 0 && Dr(3); g < Lt; ++g) n[g] = s[ut + g];
        }
        for (; g < it; ++g) n[g] = n[g - rt];
      }
    }
    r.l = B, r.p = x, r.b = g, r.f = b, B && (b = 1, r.m = O, r.d = F, r.n = I);
  } while (!b);
  return g != n.length && f ? Pu(n, 0, g) : n.subarray(0, g);
}, gn = function(e, r, n) {
  n <<= r & 7;
  var s = r / 8 | 0;
  e[s] |= n, e[s + 1] |= n >> 8;
}, sa = function(e, r, n) {
  n <<= r & 7;
  var s = r / 8 | 0;
  e[s] |= n, e[s + 1] |= n >> 8, e[s + 2] |= n >> 16;
}, oo = function(e, r) {
  for (var n = [], s = 0; s < e.length; ++s)
    e[s] && n.push({
      s,
      f: e[s]
    });
  var a = n.length, o = n.slice();
  if (!a) return {
    t: Fu,
    l: 0
  };
  if (a == 1) {
    var f = new tr(n[0].s + 1);
    return f[n[0].s] = 1, {
      t: f,
      l: 1
    };
  }
  n.sort(function(bt, nt) {
    return bt.f - nt.f;
  }), n.push({
    s: -1,
    f: 25001
  });
  var c = n[0], m = n[1], A = 0, b = 1, S = 2;
  for (n[0] = {
    s: -1,
    f: c.f + m.f,
    l: c,
    r: m
  }; b != a - 1; )
    c = n[n[A].f < n[S].f ? A++ : S++], m = n[A != b && n[A].f < n[S].f ? A++ : S++], n[b++] = {
      s: -1,
      f: c.f + m.f,
      l: c,
      r: m
    };
  for (var g = o[0].s, s = 1; s < a; ++s)
    o[s].s > g && (g = o[s].s);
  var B = new gr(g + 1), F = bo(n[b - 1], B, 0);
  if (F > r) {
    var s = 0, O = 0, I = F - r, N = 1 << I;
    for (o.sort(function(nt, dt) {
      return B[dt.s] - B[nt.s] || nt.f - dt.f;
    }); s < a; ++s) {
      var J = o[s].s;
      if (B[J] > r)
        O += N - (1 << F - B[J]), B[J] = r;
      else break;
    }
    for (O >>= I; O > 0; ) {
      var et = o[s].s;
      B[et] < r ? O -= 1 << r - B[et]++ - 1 : ++s;
    }
    for (; s >= 0 && O; --s) {
      var ct = o[s].s;
      B[ct] == r && (--B[ct], ++O);
    }
    F = r;
  }
  return {
    t: new tr(B),
    l: F
  };
}, bo = function(e, r, n) {
  return e.s == -1 ? Math.max(bo(e.l, r, n + 1), bo(e.r, r, n + 1)) : r[e.s] = n;
}, iu = function(e) {
  for (var r = e.length; r && !e[--r]; ) ;
  for (var n = new gr(++r), s = 0, a = e[0], o = 1, f = function(A) {
    n[s++] = A;
  }, c = 1; c <= r; ++c)
    if (e[c] == a && c != r) ++o;
    else {
      if (!a && o > 2) {
        for (; o > 138; o -= 138) f(32754);
        o > 2 && (f(o > 10 ? o - 11 << 5 | 28690 : o - 3 << 5 | 12305), o = 0);
      } else if (o > 3) {
        for (f(a), --o; o > 6; o -= 6) f(8304);
        o > 2 && (f(o - 3 << 5 | 8208), o = 0);
      }
      for (; o--; ) f(a);
      o = 1, a = e[c];
    }
  return {
    c: n.subarray(0, s),
    n: r
  };
}, oa = function(e, r) {
  for (var n = 0, s = 0; s < r.length; ++s) n += e[s] * r[s];
  return n;
}, ku = function(e, r, n) {
  var s = n.length, a = Po(r + 2);
  e[a] = s & 255, e[a + 1] = s >> 8, e[a + 2] = e[a] ^ 255, e[a + 3] = e[a + 1] ^ 255;
  for (var o = 0; o < s; ++o) e[a + o + 4] = n[o];
  return (a + 4 + s) * 8;
}, au = function(e, r, n, s, a, o, f, c, m, A, b) {
  gn(r, b++, n), ++a[256];
  for (var S = oo(a, 15), g = S.t, B = S.l, F = oo(o, 15), O = F.t, I = F.l, N = iu(g), J = N.c, et = N.n, ct = iu(O), bt = ct.c, nt = ct.n, dt = new gr(19), z = 0; z < J.length; ++z) ++dt[J[z] & 31];
  for (var z = 0; z < bt.length; ++z) ++dt[bt[z] & 31];
  for (var at = oo(dt, 7), M = at.t, k = at.l, D = 19; D > 4 && !M[go[D - 1]]; --D) ;
  var R = A + 5 << 3, ot = oa(a, Bn) + oa(o, da) + f, st = oa(a, g) + oa(o, O) + f + 14 + 3 * D + oa(dt, M) + 2 * dt[16] + 3 * dt[17] + 7 * dt[18];
  if (m >= 0 && R <= ot && R <= st) return ku(r, b, e.subarray(m, m + A));
  var ht, X, Nt, rt;
  if (gn(r, b, 1 + (st < ot)), b += 2, st < ot) {
    ht = en(g, B, 0), X = g, Nt = en(O, I, 0), rt = O;
    var xt = en(M, k, 0);
    gn(r, b, et - 257), gn(r, b + 5, nt - 1), gn(r, b + 10, D - 4), b += 14;
    for (var z = 0; z < D; ++z) gn(r, b + 3 * z, M[go[z]]);
    b += 3 * D;
    for (var E = [J, bt], x = 0; x < 2; ++x)
      for (var q = E[x], z = 0; z < q.length; ++z) {
        var U = q[z] & 31;
        gn(r, b, xt[U]), b += M[U], U > 15 && (gn(r, b, q[z] >> 5 & 127), b += q[z] >> 12);
      }
  } else
    ht = kl, X = Bn, Nt = Il, rt = da;
  for (var z = 0; z < c; ++z) {
    var V = s[z];
    if (V > 255) {
      var U = V >> 18 & 31;
      sa(r, b, ht[U + 257]), b += X[U + 257], U > 7 && (gn(r, b, V >> 23 & 31), b += cs[U]);
      var K = V & 31;
      sa(r, b, Nt[K]), b += rt[K], K > 3 && (sa(r, b, V >> 5 & 8191), b += hs[K]);
    } else
      sa(r, b, ht[V]), b += X[V];
  }
  return sa(r, b, ht[256]), b + X[256];
}, Bl = /* @__PURE__ */ new _o([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]), Fu = /* @__PURE__ */ new tr(0), Ml = function(e, r, n, s, a, o) {
  var f = o.z || e.length, c = new tr(s + f + 5 * (1 + Math.ceil(f / 7e3)) + a), m = c.subarray(s, c.length - a), A = o.l, b = (o.r || 0) & 7;
  if (r) {
    b && (m[0] = o.r >> 3);
    for (var S = Bl[r - 1], g = S >> 13, B = S & 8191, F = (1 << n) - 1, O = o.p || new gr(32768), I = o.h || new gr(F + 1), N = Math.ceil(n / 3), J = 2 * N, et = function(j) {
      return (e[j] ^ e[j + 1] << N ^ e[j + 2] << J) & F;
    }, ct = new _o(25e3), bt = new gr(288), nt = new gr(32), dt = 0, z = 0, at = o.i || 0, M = 0, k = o.w || 0, D = 0; at + 2 < f; ++at) {
      var R = et(at), ot = at & 32767, st = I[R];
      if (O[ot] = st, I[R] = ot, k <= at) {
        var ht = f - at;
        if ((dt > 7e3 || M > 24576) && (ht > 423 || !A)) {
          b = au(e, m, 0, ct, bt, nt, z, M, D, at - D, b), M = dt = z = 0, D = at;
          for (var X = 0; X < 286; ++X) bt[X] = 0;
          for (var X = 0; X < 30; ++X) nt[X] = 0;
        }
        var Nt = 2, rt = 0, xt = B, E = ot - st & 32767;
        if (ht > 2 && R == et(at - E))
          for (var x = Math.min(g, ht) - 1, q = Math.min(32767, at), U = Math.min(258, ht); E <= q && --xt && ot != st; ) {
            if (e[at + Nt] == e[at + Nt - E]) {
              for (var V = 0; V < U && e[at + V] == e[at + V - E]; ++V) ;
              if (V > Nt) {
                if (Nt = V, rt = E, V > x) break;
                for (var K = Math.min(E, V - 2), ft = 0, X = 0; X < K; ++X) {
                  var it = at - E + X & 32767, ut = O[it], Lt = it - ut & 32767;
                  Lt > ft && (ft = Lt, st = it);
                }
              }
            }
            ot = st, st = O[ot], E += ot - st & 32767;
          }
        if (rt) {
          ct[M++] = 268435456 | mo[Nt] << 18 | nu[rt];
          var jt = mo[Nt] & 31, Ft = nu[rt] & 31;
          z += cs[jt] + hs[Ft], ++bt[257 + jt], ++nt[Ft], k = at + Nt, ++dt;
        } else
          ct[M++] = e[at], ++bt[e[at]];
      }
    }
    for (at = Math.max(at, k); at < f; ++at)
      ct[M++] = e[at], ++bt[e[at]];
    b = au(e, m, A, ct, bt, nt, z, M, D, at - D, b), A || (o.r = b & 7 | m[b / 8 | 0] << 3, b -= 7, o.h = I, o.p = O, o.i = at, o.w = k);
  } else {
    for (var at = o.w || 0; at < f + A; at += 65535) {
      var Rt = at + 65535;
      Rt >= f && (m[b / 8 | 0] = A, Rt = f), b = ku(m, b + 1, e.subarray(at, Rt));
    }
    o.i = f;
  }
  return Pu(c, 0, s + Po(b) + a);
}, Iu = function() {
  var e = 1, r = 0;
  return {
    p: function(s) {
      for (var a = e, o = r, f = s.length | 0, c = 0; c != f; ) {
        for (var m = Math.min(c + 2655, f); c < m; ++c) o += a += s[c];
        a = (a & 65535) + 15 * (a >> 16), o = (o & 65535) + 15 * (o >> 16);
      }
      e = a, r = o;
    },
    d: function() {
      return e %= 65521, r %= 65521, (e & 255) << 24 | (e & 65280) << 8 | (r & 255) << 8 | r >> 8;
    }
  };
}, ql = function(e, r, n, s, a) {
  if (!a && (a = {
    l: 1
  }, r.dictionary)) {
    var o = r.dictionary.subarray(-32768), f = new tr(o.length + e.length);
    f.set(o), f.set(e, o.length), e = f, a.w = o.length;
  }
  return Ml(e, r.level == null ? 6 : r.level, r.mem == null ? a.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(e.length))) * 1.5) : 20 : 12 + r.mem, n, s, a);
}, Cu = function(e, r, n) {
  for (; n; ++r) e[r] = n, n >>>= 8;
}, El = function(e, r) {
  var n = r.level, s = n == 0 ? 0 : n < 6 ? 1 : n == 9 ? 3 : 2;
  if (e[0] = 120, e[1] = s << 6 | (r.dictionary && 32), e[1] |= 31 - (e[0] << 8 | e[1]) % 31, r.dictionary) {
    var a = Iu();
    a.p(r.dictionary), Cu(e, 2, a.d());
  }
}, Dl = function(e, r) {
  return ((e[0] & 15) != 8 || e[0] >> 4 > 7 || (e[0] << 8 | e[1]) % 31) && Dr(6, "invalid zlib data"), (e[1] >> 5 & 1) == 1 && Dr(6, "invalid zlib data: " + (e[1] & 32 ? "need" : "unexpected") + " dictionary"), (e[1] >> 3 & 4) + 2;
};
function yo(l, e) {
  e || (e = {});
  var r = Iu();
  r.p(l);
  var n = ql(l, e, e.dictionary ? 6 : 2, 4);
  return El(n, e), Cu(n, n.length - 4, r.d()), n;
}
function Tl(l, e) {
  return Ol(l.subarray(Dl(l), -4), {
    i: 2
  }, e, e);
}
var Rl = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder(), zl = 0;
try {
  Rl.decode(Fu, {
    stream: !0
  }), zl = 1;
} catch (l) {
}
/** @license
 *
 * jsPDF - PDF Document creation from JavaScript
 * Version 3.0.1 Built on 2025-03-17T14:19:36.873Z
 *                      CommitID 00000000
 *
 * Copyright (c) 2010-2021 James Hall <james@parall.ax>, https://github.com/MrRio/jsPDF
 *               2015-2021 yWorks GmbH, http://www.yworks.com
 *               2015-2021 Lukas Holländer <lukas.hollaender@yworks.com>, https://github.com/HackbrettXXX
 *               2016-2018 Aras Abbasi <aras.abbasi@gmail.com>
 *               2010 Aaron Spike, https://github.com/acspike
 *               2012 Willow Systems Corporation, https://github.com/willowsystems
 *               2012 Pablo Hess, https://github.com/pablohess
 *               2012 Florian Jenett, https://github.com/fjenett
 *               2013 Warren Weckesser, https://github.com/warrenweckesser
 *               2013 Youssef Beddad, https://github.com/lifof
 *               2013 Lee Driscoll, https://github.com/lsdriscoll
 *               2013 Stefan Slonevskiy, https://github.com/stefslon
 *               2013 Jeremy Morel, https://github.com/jmorel
 *               2013 Christoph Hartmann, https://github.com/chris-rock
 *               2014 Juan Pablo Gaviria, https://github.com/juanpgaviria
 *               2014 James Makes, https://github.com/dollaruw
 *               2014 Diego Casorran, https://github.com/diegocr
 *               2014 Steven Spungin, https://github.com/Flamenco
 *               2014 Kenneth Glassey, https://github.com/Gavvers
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Contributor(s):
 *    siefkenj, ahwolf, rickygu, Midnith, saintclair, eaparango,
 *    kim3er, mfo, alnorth, Flamenco
 */
var Yt = /* @__PURE__ */ function() {
  return typeof window != "undefined" ? window : typeof global != "undefined" ? global : typeof self != "undefined" ? self : this;
}();
function uo() {
  Yt.console && typeof Yt.console.log == "function" && Yt.console.log.apply(Yt.console, arguments);
}
var ve = {
  log: uo,
  warn: function(e) {
    Yt.console && (typeof Yt.console.warn == "function" ? Yt.console.warn.apply(Yt.console, arguments) : uo.call(null, arguments));
  },
  error: function(e) {
    Yt.console && (typeof Yt.console.error == "function" ? Yt.console.error.apply(Yt.console, arguments) : uo(e));
  }
};
function lo(l, e, r) {
  var n = new XMLHttpRequest();
  n.open("GET", l), n.responseType = "blob", n.onload = function() {
    Qn(n.response, e, r);
  }, n.onerror = function() {
    ve.error("could not download file");
  }, n.send();
}
function su(l) {
  var e = new XMLHttpRequest();
  e.open("HEAD", l, !1);
  try {
    e.send();
  } catch (r) {
  }
  return e.status >= 200 && e.status <= 299;
}
function as(l) {
  try {
    l.dispatchEvent(new MouseEvent("click"));
  } catch (r) {
    var e = document.createEvent("MouseEvents");
    e.initMouseEvent("click", !0, !0, window, 0, 0, 0, 80, 20, !1, !1, !1, !1, 0, null), l.dispatchEvent(e);
  }
}
var ua, wo, Qn = Yt.saveAs || ((typeof window == "undefined" ? "undefined" : fe(window)) !== "object" || window !== Yt ? function() {
} : typeof HTMLAnchorElement != "undefined" && "download" in HTMLAnchorElement.prototype ? function(l, e, r) {
  var n = Yt.URL || Yt.webkitURL, s = document.createElement("a");
  e = e || l.name || "download", s.download = e, s.rel = "noopener", typeof l == "string" ? (s.href = l, s.origin !== location.origin ? su(s.href) ? lo(l, e, r) : as(s, s.target = "_blank") : as(s)) : (s.href = n.createObjectURL(l), setTimeout(function() {
    n.revokeObjectURL(s.href);
  }, 4e4), setTimeout(function() {
    as(s);
  }, 0));
} : "msSaveOrOpenBlob" in navigator ? function(l, e, r) {
  if (e = e || l.name || "download", typeof l == "string")
    if (su(l)) lo(l, e, r);
    else {
      var n = document.createElement("a");
      n.href = l, n.target = "_blank", setTimeout(function() {
        as(n);
      });
    }
  else navigator.msSaveOrOpenBlob(function(s, a) {
    return a === void 0 ? a = {
      autoBom: !1
    } : fe(a) !== "object" && (ve.warn("Deprecated: Expected third argument to be a object"), a = {
      autoBom: !a
    }), a.autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(s.type) ? new Blob(["\uFEFF", s], {
      type: s.type
    }) : s;
  }(l, r), e);
} : function(l, e, r, n) {
  if ((n = n || open("", "_blank")) && (n.document.title = n.document.body.innerText = "downloading..."), typeof l == "string") return lo(l, e, r);
  var s = l.type === "application/octet-stream", a = /constructor/i.test(Yt.HTMLElement) || Yt.safari, o = /CriOS\/[\d]+/.test(navigator.userAgent);
  if ((o || s && a) && (typeof FileReader == "undefined" ? "undefined" : fe(FileReader)) === "object") {
    var f = new FileReader();
    f.onloadend = function() {
      var A = f.result;
      A = o ? A : A.replace(/^data:[^;]*;/, "data:attachment/file;"), n ? n.location.href = A : location = A, n = null;
    }, f.readAsDataURL(l);
  } else {
    var c = Yt.URL || Yt.webkitURL, m = c.createObjectURL(l);
    n ? n.location = m : location.href = m, n = null, setTimeout(function() {
      c.revokeObjectURL(m);
    }, 4e4);
  }
});
/**
 * A class to parse color values
 * @author Stoyan Stefanov <sstoo@gmail.com>
 * {@link   http://www.phpied.com/rgb-color-parser-in-javascript/}
 * @license Use it if you like it
 */
function ju(l) {
  var e;
  l = l || "", this.ok = !1, l.charAt(0) == "#" && (l = l.substr(1, 6)), l = {
    aliceblue: "f0f8ff",
    antiquewhite: "faebd7",
    aqua: "00ffff",
    aquamarine: "7fffd4",
    azure: "f0ffff",
    beige: "f5f5dc",
    bisque: "ffe4c4",
    black: "000000",
    blanchedalmond: "ffebcd",
    blue: "0000ff",
    blueviolet: "8a2be2",
    brown: "a52a2a",
    burlywood: "deb887",
    cadetblue: "5f9ea0",
    chartreuse: "7fff00",
    chocolate: "d2691e",
    coral: "ff7f50",
    cornflowerblue: "6495ed",
    cornsilk: "fff8dc",
    crimson: "dc143c",
    cyan: "00ffff",
    darkblue: "00008b",
    darkcyan: "008b8b",
    darkgoldenrod: "b8860b",
    darkgray: "a9a9a9",
    darkgreen: "006400",
    darkkhaki: "bdb76b",
    darkmagenta: "8b008b",
    darkolivegreen: "556b2f",
    darkorange: "ff8c00",
    darkorchid: "9932cc",
    darkred: "8b0000",
    darksalmon: "e9967a",
    darkseagreen: "8fbc8f",
    darkslateblue: "483d8b",
    darkslategray: "2f4f4f",
    darkturquoise: "00ced1",
    darkviolet: "9400d3",
    deeppink: "ff1493",
    deepskyblue: "00bfff",
    dimgray: "696969",
    dodgerblue: "1e90ff",
    feldspar: "d19275",
    firebrick: "b22222",
    floralwhite: "fffaf0",
    forestgreen: "228b22",
    fuchsia: "ff00ff",
    gainsboro: "dcdcdc",
    ghostwhite: "f8f8ff",
    gold: "ffd700",
    goldenrod: "daa520",
    gray: "808080",
    green: "008000",
    greenyellow: "adff2f",
    honeydew: "f0fff0",
    hotpink: "ff69b4",
    indianred: "cd5c5c",
    indigo: "4b0082",
    ivory: "fffff0",
    khaki: "f0e68c",
    lavender: "e6e6fa",
    lavenderblush: "fff0f5",
    lawngreen: "7cfc00",
    lemonchiffon: "fffacd",
    lightblue: "add8e6",
    lightcoral: "f08080",
    lightcyan: "e0ffff",
    lightgoldenrodyellow: "fafad2",
    lightgrey: "d3d3d3",
    lightgreen: "90ee90",
    lightpink: "ffb6c1",
    lightsalmon: "ffa07a",
    lightseagreen: "20b2aa",
    lightskyblue: "87cefa",
    lightslateblue: "8470ff",
    lightslategray: "778899",
    lightsteelblue: "b0c4de",
    lightyellow: "ffffe0",
    lime: "00ff00",
    limegreen: "32cd32",
    linen: "faf0e6",
    magenta: "ff00ff",
    maroon: "800000",
    mediumaquamarine: "66cdaa",
    mediumblue: "0000cd",
    mediumorchid: "ba55d3",
    mediumpurple: "9370d8",
    mediumseagreen: "3cb371",
    mediumslateblue: "7b68ee",
    mediumspringgreen: "00fa9a",
    mediumturquoise: "48d1cc",
    mediumvioletred: "c71585",
    midnightblue: "191970",
    mintcream: "f5fffa",
    mistyrose: "ffe4e1",
    moccasin: "ffe4b5",
    navajowhite: "ffdead",
    navy: "000080",
    oldlace: "fdf5e6",
    olive: "808000",
    olivedrab: "6b8e23",
    orange: "ffa500",
    orangered: "ff4500",
    orchid: "da70d6",
    palegoldenrod: "eee8aa",
    palegreen: "98fb98",
    paleturquoise: "afeeee",
    palevioletred: "d87093",
    papayawhip: "ffefd5",
    peachpuff: "ffdab9",
    peru: "cd853f",
    pink: "ffc0cb",
    plum: "dda0dd",
    powderblue: "b0e0e6",
    purple: "800080",
    red: "ff0000",
    rosybrown: "bc8f8f",
    royalblue: "4169e1",
    saddlebrown: "8b4513",
    salmon: "fa8072",
    sandybrown: "f4a460",
    seagreen: "2e8b57",
    seashell: "fff5ee",
    sienna: "a0522d",
    silver: "c0c0c0",
    skyblue: "87ceeb",
    slateblue: "6a5acd",
    slategray: "708090",
    snow: "fffafa",
    springgreen: "00ff7f",
    steelblue: "4682b4",
    tan: "d2b48c",
    teal: "008080",
    thistle: "d8bfd8",
    tomato: "ff6347",
    turquoise: "40e0d0",
    violet: "ee82ee",
    violetred: "d02090",
    wheat: "f5deb3",
    white: "ffffff",
    whitesmoke: "f5f5f5",
    yellow: "ffff00",
    yellowgreen: "9acd32"
  }[l = (l = l.replace(/ /g, "")).toLowerCase()] || l;
  for (var r = [{
    re: /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/,
    example: ["rgb(123, 234, 45)", "rgb(255,234,245)"],
    process: function(c) {
      return [parseInt(c[1]), parseInt(c[2]), parseInt(c[3])];
    }
  }, {
    re: /^(\w{2})(\w{2})(\w{2})$/,
    example: ["#00ff00", "336699"],
    process: function(c) {
      return [parseInt(c[1], 16), parseInt(c[2], 16), parseInt(c[3], 16)];
    }
  }, {
    re: /^(\w{1})(\w{1})(\w{1})$/,
    example: ["#fb0", "f0f"],
    process: function(c) {
      return [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16)];
    }
  }], n = 0; n < r.length; n++) {
    var s = r[n].re, a = r[n].process, o = s.exec(l);
    o && (e = a(o), this.r = e[0], this.g = e[1], this.b = e[2], this.ok = !0);
  }
  this.r = this.r < 0 || isNaN(this.r) ? 0 : this.r > 255 ? 255 : this.r, this.g = this.g < 0 || isNaN(this.g) ? 0 : this.g > 255 ? 255 : this.g, this.b = this.b < 0 || isNaN(this.b) ? 0 : this.b > 255 ? 255 : this.b, this.toRGB = function() {
    return "rgb(" + this.r + ", " + this.g + ", " + this.b + ")";
  }, this.toHex = function() {
    var f = this.r.toString(16), c = this.g.toString(16), m = this.b.toString(16);
    return f.length == 1 && (f = "0" + f), c.length == 1 && (c = "0" + c), m.length == 1 && (m = "0" + m), "#" + f + c + m;
  };
}
/**
 * @license
 * Joseph Myers does not specify a particular license for his work.
 *
 * Author: Joseph Myers
 * Accessed from: http://www.myersdaily.org/joseph/javascript/md5.js
 *
 * Modified by: Owen Leong
 */
function co(l, e) {
  var r = l[0], n = l[1], s = l[2], a = l[3];
  r = Ke(r, n, s, a, e[0], 7, -680876936), a = Ke(a, r, n, s, e[1], 12, -389564586), s = Ke(s, a, r, n, e[2], 17, 606105819), n = Ke(n, s, a, r, e[3], 22, -1044525330), r = Ke(r, n, s, a, e[4], 7, -176418897), a = Ke(a, r, n, s, e[5], 12, 1200080426), s = Ke(s, a, r, n, e[6], 17, -1473231341), n = Ke(n, s, a, r, e[7], 22, -45705983), r = Ke(r, n, s, a, e[8], 7, 1770035416), a = Ke(a, r, n, s, e[9], 12, -1958414417), s = Ke(s, a, r, n, e[10], 17, -42063), n = Ke(n, s, a, r, e[11], 22, -1990404162), r = Ke(r, n, s, a, e[12], 7, 1804603682), a = Ke(a, r, n, s, e[13], 12, -40341101), s = Ke(s, a, r, n, e[14], 17, -1502002290), r = Ze(r, n = Ke(n, s, a, r, e[15], 22, 1236535329), s, a, e[1], 5, -165796510), a = Ze(a, r, n, s, e[6], 9, -1069501632), s = Ze(s, a, r, n, e[11], 14, 643717713), n = Ze(n, s, a, r, e[0], 20, -373897302), r = Ze(r, n, s, a, e[5], 5, -701558691), a = Ze(a, r, n, s, e[10], 9, 38016083), s = Ze(s, a, r, n, e[15], 14, -660478335), n = Ze(n, s, a, r, e[4], 20, -405537848), r = Ze(r, n, s, a, e[9], 5, 568446438), a = Ze(a, r, n, s, e[14], 9, -1019803690), s = Ze(s, a, r, n, e[3], 14, -187363961), n = Ze(n, s, a, r, e[8], 20, 1163531501), r = Ze(r, n, s, a, e[13], 5, -1444681467), a = Ze(a, r, n, s, e[2], 9, -51403784), s = Ze(s, a, r, n, e[7], 14, 1735328473), r = $e(r, n = Ze(n, s, a, r, e[12], 20, -1926607734), s, a, e[5], 4, -378558), a = $e(a, r, n, s, e[8], 11, -2022574463), s = $e(s, a, r, n, e[11], 16, 1839030562), n = $e(n, s, a, r, e[14], 23, -35309556), r = $e(r, n, s, a, e[1], 4, -1530992060), a = $e(a, r, n, s, e[4], 11, 1272893353), s = $e(s, a, r, n, e[7], 16, -155497632), n = $e(n, s, a, r, e[10], 23, -1094730640), r = $e(r, n, s, a, e[13], 4, 681279174), a = $e(a, r, n, s, e[0], 11, -358537222), s = $e(s, a, r, n, e[3], 16, -722521979), n = $e(n, s, a, r, e[6], 23, 76029189), r = $e(r, n, s, a, e[9], 4, -640364487), a = $e(a, r, n, s, e[12], 11, -421815835), s = $e(s, a, r, n, e[15], 16, 530742520), r = Qe(r, n = $e(n, s, a, r, e[2], 23, -995338651), s, a, e[0], 6, -198630844), a = Qe(a, r, n, s, e[7], 10, 1126891415), s = Qe(s, a, r, n, e[14], 15, -1416354905), n = Qe(n, s, a, r, e[5], 21, -57434055), r = Qe(r, n, s, a, e[12], 6, 1700485571), a = Qe(a, r, n, s, e[3], 10, -1894986606), s = Qe(s, a, r, n, e[10], 15, -1051523), n = Qe(n, s, a, r, e[1], 21, -2054922799), r = Qe(r, n, s, a, e[8], 6, 1873313359), a = Qe(a, r, n, s, e[15], 10, -30611744), s = Qe(s, a, r, n, e[6], 15, -1560198380), n = Qe(n, s, a, r, e[13], 21, 1309151649), r = Qe(r, n, s, a, e[4], 6, -145523070), a = Qe(a, r, n, s, e[11], 10, -1120210379), s = Qe(s, a, r, n, e[2], 15, 718787259), n = Qe(n, s, a, r, e[9], 21, -343485551), l[0] = jn(r, l[0]), l[1] = jn(n, l[1]), l[2] = jn(s, l[2]), l[3] = jn(a, l[3]);
}
function fs(l, e, r, n, s, a) {
  return e = jn(jn(e, l), jn(n, a)), jn(e << s | e >>> 32 - s, r);
}
function Ke(l, e, r, n, s, a, o) {
  return fs(e & r | ~e & n, l, e, s, a, o);
}
function Ze(l, e, r, n, s, a, o) {
  return fs(e & n | r & ~n, l, e, s, a, o);
}
function $e(l, e, r, n, s, a, o) {
  return fs(e ^ r ^ n, l, e, s, a, o);
}
function Qe(l, e, r, n, s, a, o) {
  return fs(r ^ (e | ~n), l, e, s, a, o);
}
function Ou(l) {
  var e, r = l.length, n = [1732584193, -271733879, -1732584194, 271733878];
  for (e = 64; e <= l.length; e += 64) co(n, Ul(l.substring(e - 64, e)));
  l = l.substring(e - 64);
  var s = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (e = 0; e < l.length; e++) s[e >> 2] |= l.charCodeAt(e) << (e % 4 << 3);
  if (s[e >> 2] |= 128 << (e % 4 << 3), e > 55) for (co(n, s), e = 0; e < 16; e++) s[e] = 0;
  return s[14] = 8 * r, co(n, s), n;
}
function Ul(l) {
  var e, r = [];
  for (e = 0; e < 64; e += 4) r[e >> 2] = l.charCodeAt(e) + (l.charCodeAt(e + 1) << 8) + (l.charCodeAt(e + 2) << 16) + (l.charCodeAt(e + 3) << 24);
  return r;
}
ua = Yt.atob.bind(Yt), wo = Yt.btoa.bind(Yt);
var ou = "0123456789abcdef".split("");
function Hl(l) {
  for (var e = "", r = 0; r < 4; r++) e += ou[l >> 8 * r + 4 & 15] + ou[l >> 8 * r & 15];
  return e;
}
function Wl(l) {
  return String.fromCharCode((255 & l) >> 0, (65280 & l) >> 8, (16711680 & l) >> 16, (4278190080 & l) >> 24);
}
function No(l) {
  return Ou(l).map(Wl).join("");
}
var Vl = function(l) {
  for (var e = 0; e < l.length; e++) l[e] = Hl(l[e]);
  return l.join("");
}(Ou("hello")) != "5d41402abc4b2a76b9719d911017c592";
function jn(l, e) {
  if (Vl) {
    var r = (65535 & l) + (65535 & e);
    return (l >> 16) + (e >> 16) + (r >> 16) << 16 | 65535 & r;
  }
  return l + e & 4294967295;
}
/**
 * @license
 * FPDF is released under a permissive license: there is no usage restriction.
 * You may embed it freely in your application (commercial or not), with or
 * without modifications.
 *
 * Reference: http://www.fpdf.org/en/script/script37.php
 */
function Lo(l, e) {
  var r, n, s, a;
  if (l !== r) {
    for (var o = (s = l, a = 1 + (256 / l.length >> 0), new Array(a + 1).join(s)), f = [], c = 0; c < 256; c++) f[c] = c;
    var m = 0;
    for (c = 0; c < 256; c++) {
      var A = f[c];
      m = (m + A + o.charCodeAt(c)) % 256, f[c] = f[m], f[m] = A;
    }
    r = l, n = f;
  } else f = n;
  var b = e.length, S = 0, g = 0, B = "";
  for (c = 0; c < b; c++) g = (g + (A = f[S = (S + 1) % 256])) % 256, f[S] = f[g], f[g] = A, o = f[(f[S] + f[g]) % 256], B += String.fromCharCode(e.charCodeAt(c) ^ o);
  return B;
}
/**
 * @license
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 * Author: Owen Leong (@owenl131)
 * Date: 15 Oct 2020
 * References:
 * https://www.cs.cmu.edu/~dst/Adobe/Gallery/anon21jul01-pdf-encryption.txt
 * https://github.com/foliojs/pdfkit/blob/master/lib/security.js
 * http://www.fpdf.org/en/script/script37.php
 */
var uu = {
  print: 4,
  modify: 8,
  copy: 16,
  "annot-forms": 32
};
function Oi(l, e, r, n) {
  this.v = 1, this.r = 2;
  var s = 192;
  l.forEach(function(f) {
    if (uu.perm !== void 0) throw new Error("Invalid permission: " + f);
    s += uu[f];
  }), this.padding = "(¿N^NuAd\0NVÿú\b..\0¶Ðh>/\f©þdSiz";
  var a = (e + this.padding).substr(0, 32), o = (r + this.padding).substr(0, 32);
  this.O = this.processOwnerPassword(a, o), this.P = -(1 + (255 ^ s)), this.encryptionKey = No(a + this.O + this.lsbFirstWord(this.P) + this.hexToBytes(n)).substr(0, 5), this.U = Lo(this.encryptionKey, this.padding);
}
function Bi(l) {
  if (/[^\u0000-\u00ff]/.test(l)) throw new Error("Invalid PDF Name Object: " + l + ", Only accept ASCII characters.");
  for (var e = "", r = l.length, n = 0; n < r; n++) {
    var s = l.charCodeAt(n);
    s < 33 || s === 35 || s === 37 || s === 40 || s === 41 || s === 47 || s === 60 || s === 62 || s === 91 || s === 93 || s === 123 || s === 125 || s > 126 ? e += "#" + ("0" + s.toString(16)).slice(-2) : e += l[n];
  }
  return e;
}
function lu(l) {
  if (fe(l) !== "object") throw new Error("Invalid Context passed to initialize PubSub (jsPDF-module)");
  var e = {};
  this.subscribe = function(r, n, s) {
    if (s = s || !1, typeof r != "string" || typeof n != "function" || typeof s != "boolean") throw new Error("Invalid arguments passed to PubSub.subscribe (jsPDF-module)");
    e.hasOwnProperty(r) || (e[r] = {});
    var a = Math.random().toString(35);
    return e[r][a] = [n, !!s], a;
  }, this.unsubscribe = function(r) {
    for (var n in e) if (e[n][r]) return delete e[n][r], Object.keys(e[n]).length === 0 && delete e[n], !0;
    return !1;
  }, this.publish = function(r) {
    if (e.hasOwnProperty(r)) {
      var n = Array.prototype.slice.call(arguments, 1), s = [];
      for (var a in e[r]) {
        var o = e[r][a];
        try {
          o[0].apply(l, n);
        } catch (f) {
          Yt.console && ve.error("jsPDF PubSub Error", f.message, f);
        }
        o[1] && s.push(a);
      }
      s.length && s.forEach(this.unsubscribe);
    }
  }, this.getTopics = function() {
    return e;
  };
}
function pa(l) {
  if (!(this instanceof pa)) return new pa(l);
  var e = "opacity,stroke-opacity".split(",");
  for (var r in l) l.hasOwnProperty(r) && e.indexOf(r) >= 0 && (this[r] = l[r]);
  this.id = "", this.objectNumber = -1;
}
function Bu(l, e) {
  this.gState = l, this.matrix = e, this.id = "", this.objectNumber = -1;
}
function Cn(l, e, r, n, s) {
  if (!(this instanceof Cn)) return new Cn(l, e, r, n, s);
  this.type = l === "axial" ? 2 : 3, this.coords = e, this.colors = r, Bu.call(this, n, s);
}
function ti(l, e, r, n, s) {
  if (!(this instanceof ti)) return new ti(l, e, r, n, s);
  this.boundingBox = l, this.xStep = e, this.yStep = r, this.stream = "", this.cloneIndex = 0, Bu.call(this, n, s);
}
function Wt(l) {
  var e, r = typeof arguments[0] == "string" ? arguments[0] : "p", n = arguments[1], s = arguments[2], a = arguments[3], o = [], f = 1, c = 16, m = "S", A = null;
  fe(l = l || {}) === "object" && (r = l.orientation, n = l.unit || n, s = l.format || s, a = l.compress || l.compressPdf || a, (A = l.encryption || null) !== null && (A.userPassword = A.userPassword || "", A.ownerPassword = A.ownerPassword || "", A.userPermissions = A.userPermissions || []), f = typeof l.userUnit == "number" ? Math.abs(l.userUnit) : 1, l.precision !== void 0 && (e = l.precision), l.floatPrecision !== void 0 && (c = l.floatPrecision), m = l.defaultPathOperation || "S"), o = l.filters || (a === !0 ? ["FlateEncode"] : o), n = n || "mm", r = ("" + (r || "P")).toLowerCase();
  var b = l.putOnlyUsedFonts || !1, S = {}, g = {
    internal: {},
    __private__: {}
  };
  g.__private__.PubSub = lu;
  var B = "1.3", F = g.__private__.getPdfVersion = function() {
    return B;
  };
  g.__private__.setPdfVersion = function(h) {
    B = h;
  };
  var O = {
    a0: [2383.94, 3370.39],
    a1: [1683.78, 2383.94],
    a2: [1190.55, 1683.78],
    a3: [841.89, 1190.55],
    a4: [595.28, 841.89],
    a5: [419.53, 595.28],
    a6: [297.64, 419.53],
    a7: [209.76, 297.64],
    a8: [147.4, 209.76],
    a9: [104.88, 147.4],
    a10: [73.7, 104.88],
    b0: [2834.65, 4008.19],
    b1: [2004.09, 2834.65],
    b2: [1417.32, 2004.09],
    b3: [1000.63, 1417.32],
    b4: [708.66, 1000.63],
    b5: [498.9, 708.66],
    b6: [354.33, 498.9],
    b7: [249.45, 354.33],
    b8: [175.75, 249.45],
    b9: [124.72, 175.75],
    b10: [87.87, 124.72],
    c0: [2599.37, 3676.54],
    c1: [1836.85, 2599.37],
    c2: [1298.27, 1836.85],
    c3: [918.43, 1298.27],
    c4: [649.13, 918.43],
    c5: [459.21, 649.13],
    c6: [323.15, 459.21],
    c7: [229.61, 323.15],
    c8: [161.57, 229.61],
    c9: [113.39, 161.57],
    c10: [79.37, 113.39],
    dl: [311.81, 623.62],
    letter: [612, 792],
    "government-letter": [576, 756],
    legal: [612, 1008],
    "junior-legal": [576, 360],
    ledger: [1224, 792],
    tabloid: [792, 1224],
    "credit-card": [153, 243]
  };
  g.__private__.getPageFormats = function() {
    return O;
  };
  var I = g.__private__.getPageFormat = function(h) {
    return O[h];
  };
  s = s || "a4";
  var N = {
    COMPAT: "compat",
    ADVANCED: "advanced"
  }, J = N.COMPAT;
  function et() {
    this.saveGraphicsState(), j(new Gt(Ct, 0, 0, -Ct, 0, vn() * Ct).toString() + " cm"), this.setFontSize(this.getFontSize() / Ct), m = "n", J = N.ADVANCED;
  }
  function ct() {
    this.restoreGraphicsState(), m = "S", J = N.COMPAT;
  }
  var bt = g.__private__.combineFontStyleAndFontWeight = function(h, d) {
    if (h == "bold" && d == "normal" || h == "bold" && d == 400 || h == "normal" && d == "italic" || h == "bold" && d == "italic") throw new Error("Invalid Combination of fontweight and fontstyle");
    return d && (h = d == 400 || d === "normal" ? h === "italic" ? "italic" : "normal" : d != 700 && d !== "bold" || h !== "normal" ? (d == 700 ? "bold" : d) + "" + h : "bold"), h;
  };
  g.advancedAPI = function(h) {
    var d = J === N.COMPAT;
    return d && et.call(this), typeof h != "function" || (h(this), d && ct.call(this)), this;
  }, g.compatAPI = function(h) {
    var d = J === N.ADVANCED;
    return d && ct.call(this), typeof h != "function" || (h(this), d && et.call(this)), this;
  }, g.isAdvancedAPI = function() {
    return J === N.ADVANCED;
  };
  var nt, dt = function(d) {
    if (J !== N.ADVANCED) throw new Error(d + " is only available in 'advanced' API mode. You need to call advancedAPI() first.");
  }, z = g.roundToPrecision = g.__private__.roundToPrecision = function(h, d) {
    var P = e || d;
    if (isNaN(h) || isNaN(P)) throw new Error("Invalid argument passed to jsPDF.roundToPrecision");
    return h.toFixed(P).replace(/0+$/, "");
  };
  nt = g.hpf = g.__private__.hpf = typeof c == "number" ? function(h) {
    if (isNaN(h)) throw new Error("Invalid argument passed to jsPDF.hpf");
    return z(h, c);
  } : c === "smart" ? function(h) {
    if (isNaN(h)) throw new Error("Invalid argument passed to jsPDF.hpf");
    return z(h, h > -1 && h < 1 ? 16 : 5);
  } : function(h) {
    if (isNaN(h)) throw new Error("Invalid argument passed to jsPDF.hpf");
    return z(h, 16);
  };
  var at = g.f2 = g.__private__.f2 = function(h) {
    if (isNaN(h)) throw new Error("Invalid argument passed to jsPDF.f2");
    return z(h, 2);
  }, M = g.__private__.f3 = function(h) {
    if (isNaN(h)) throw new Error("Invalid argument passed to jsPDF.f3");
    return z(h, 3);
  }, k = g.scale = g.__private__.scale = function(h) {
    if (isNaN(h)) throw new Error("Invalid argument passed to jsPDF.scale");
    return J === N.COMPAT ? h * Ct : J === N.ADVANCED ? h : void 0;
  }, D = function(d) {
    return J === N.COMPAT ? vn() - d : J === N.ADVANCED ? d : void 0;
  }, R = function(d) {
    return k(D(d));
  };
  g.__private__.setPrecision = g.setPrecision = function(h) {
    typeof parseInt(h, 10) == "number" && (e = parseInt(h, 10));
  };
  var ot, st = "00000000000000000000000000000000", ht = g.__private__.getFileId = function() {
    return st;
  }, X = g.__private__.setFileId = function(h) {
    return st = h !== void 0 && /^[a-fA-F0-9]{32}$/.test(h) ? h.toUpperCase() : st.split("").map(function() {
      return "ABCDEF0123456789".charAt(Math.floor(16 * Math.random()));
    }).join(""), A !== null && (Je = new Oi(A.userPermissions, A.userPassword, A.ownerPassword, st)), st;
  };
  g.setFileId = function(h) {
    return X(h), this;
  }, g.getFileId = function() {
    return ht();
  };
  var Nt = g.__private__.convertDateToPDFDate = function(h) {
    var d = h.getTimezoneOffset(), P = d < 0 ? "+" : "-", T = Math.floor(Math.abs(d / 60)), Z = Math.abs(d % 60), $ = [P, q(T), "'", q(Z), "'"].join("");
    return ["D:", h.getFullYear(), q(h.getMonth() + 1), q(h.getDate()), q(h.getHours()), q(h.getMinutes()), q(h.getSeconds()), $].join("");
  }, rt = g.__private__.convertPDFDateToDate = function(h) {
    var d = parseInt(h.substr(2, 4), 10), P = parseInt(h.substr(6, 2), 10) - 1, T = parseInt(h.substr(8, 2), 10), Z = parseInt(h.substr(10, 2), 10), $ = parseInt(h.substr(12, 2), 10), yt = parseInt(h.substr(14, 2), 10);
    return new Date(d, P, T, Z, $, yt, 0);
  }, xt = g.__private__.setCreationDate = function(h) {
    var d;
    if (h === void 0 && (h = /* @__PURE__ */ new Date()), h instanceof Date) d = Nt(h);
    else {
      if (!/^D:(20[0-2][0-9]|203[0-7]|19[7-9][0-9])(0[0-9]|1[0-2])([0-2][0-9]|3[0-1])(0[0-9]|1[0-9]|2[0-3])(0[0-9]|[1-5][0-9])(0[0-9]|[1-5][0-9])(\+0[0-9]|\+1[0-4]|-0[0-9]|-1[0-1])'(0[0-9]|[1-5][0-9])'?$/.test(h)) throw new Error("Invalid argument passed to jsPDF.setCreationDate");
      d = h;
    }
    return ot = d;
  }, E = g.__private__.getCreationDate = function(h) {
    var d = ot;
    return h === "jsDate" && (d = rt(ot)), d;
  };
  g.setCreationDate = function(h) {
    return xt(h), this;
  }, g.getCreationDate = function(h) {
    return E(h);
  };
  var x, q = g.__private__.padd2 = function(h) {
    return ("0" + parseInt(h)).slice(-2);
  }, U = g.__private__.padd2Hex = function(h) {
    return ("00" + (h = h.toString())).substr(h.length);
  }, V = 0, K = [], ft = [], it = 0, ut = [], Lt = [], jt = !1, Ft = ft, Rt = function() {
    V = 0, it = 0, ft = [], K = [], ut = [], mn = Re(), Pr = Re();
  };
  g.__private__.setCustomOutputDestination = function(h) {
    jt = !0, Ft = h;
  };
  var Dt = function(d) {
    jt || (Ft = d);
  };
  g.__private__.resetCustomOutputDestination = function() {
    jt = !1, Ft = ft;
  };
  var j = g.__private__.out = function(h) {
    return h = h.toString(), it += h.length + 1, Ft.push(h), Ft;
  }, mt = g.__private__.write = function(h) {
    return j(arguments.length === 1 ? h.toString() : Array.prototype.join.call(arguments, " "));
  }, kt = g.__private__.getArrayBuffer = function(h) {
    for (var d = h.length, P = new ArrayBuffer(d), T = new Uint8Array(P); d--; ) T[d] = h.charCodeAt(d);
    return P;
  }, At = [["Helvetica", "helvetica", "normal", "WinAnsiEncoding"], ["Helvetica-Bold", "helvetica", "bold", "WinAnsiEncoding"], ["Helvetica-Oblique", "helvetica", "italic", "WinAnsiEncoding"], ["Helvetica-BoldOblique", "helvetica", "bolditalic", "WinAnsiEncoding"], ["Courier", "courier", "normal", "WinAnsiEncoding"], ["Courier-Bold", "courier", "bold", "WinAnsiEncoding"], ["Courier-Oblique", "courier", "italic", "WinAnsiEncoding"], ["Courier-BoldOblique", "courier", "bolditalic", "WinAnsiEncoding"], ["Times-Roman", "times", "normal", "WinAnsiEncoding"], ["Times-Bold", "times", "bold", "WinAnsiEncoding"], ["Times-Italic", "times", "italic", "WinAnsiEncoding"], ["Times-BoldItalic", "times", "bolditalic", "WinAnsiEncoding"], ["ZapfDingbats", "zapfdingbats", "normal", null], ["Symbol", "symbol", "normal", null]];
  g.__private__.getStandardFonts = function() {
    return At;
  };
  var Ot = l.fontSize || 16;
  g.__private__.setFontSize = g.setFontSize = function(h) {
    return Ot = J === N.ADVANCED ? h / Ct : h, this;
  };
  var _t, Mt = g.__private__.getFontSize = g.getFontSize = function() {
    return J === N.COMPAT ? Ot : Ot * Ct;
  }, qt = l.R2L || !1;
  g.__private__.setR2L = g.setR2L = function(h) {
    return qt = h, this;
  }, g.__private__.getR2L = g.getR2L = function() {
    return qt;
  };
  var zt, ne = g.__private__.setZoomMode = function(h) {
    var d = [void 0, null, "fullwidth", "fullheight", "fullpage", "original"];
    if (/^(?:\d+\.\d*|\d*\.\d+|\d+)%$/.test(h)) _t = h;
    else if (isNaN(h)) {
      if (d.indexOf(h) === -1) throw new Error('zoom must be Integer (e.g. 2), a percentage Value (e.g. 300%) or fullwidth, fullheight, fullpage, original. "' + h + '" is not recognized.');
      _t = h;
    } else _t = parseInt(h, 10);
  };
  g.__private__.getZoomMode = function() {
    return _t;
  };
  var Ht, ie = g.__private__.setPageMode = function(h) {
    if ([void 0, null, "UseNone", "UseOutlines", "UseThumbs", "FullScreen"].indexOf(h) == -1) throw new Error('Page mode must be one of UseNone, UseOutlines, UseThumbs, or FullScreen. "' + h + '" is not recognized.');
    zt = h;
  };
  g.__private__.getPageMode = function() {
    return zt;
  };
  var be = g.__private__.setLayoutMode = function(h) {
    if ([void 0, null, "continuous", "single", "twoleft", "tworight", "two"].indexOf(h) == -1) throw new Error('Layout mode must be one of continuous, single, twoleft, tworight. "' + h + '" is not recognized.');
    Ht = h;
  };
  g.__private__.getLayoutMode = function() {
    return Ht;
  }, g.__private__.setDisplayMode = g.setDisplayMode = function(h, d, P) {
    return ne(h), be(d), ie(P), this;
  };
  var Vt = {
    title: "",
    subject: "",
    author: "",
    keywords: "",
    creator: ""
  };
  g.__private__.getDocumentProperty = function(h) {
    if (Object.keys(Vt).indexOf(h) === -1) throw new Error("Invalid argument passed to jsPDF.getDocumentProperty");
    return Vt[h];
  }, g.__private__.getDocumentProperties = function() {
    return Vt;
  }, g.__private__.setDocumentProperties = g.setProperties = g.setDocumentProperties = function(h) {
    for (var d in Vt) Vt.hasOwnProperty(d) && h[d] && (Vt[d] = h[d]);
    return this;
  }, g.__private__.setDocumentProperty = function(h, d) {
    if (Object.keys(Vt).indexOf(h) === -1) throw new Error("Invalid arguments passed to jsPDF.setDocumentProperty");
    return Vt[h] = d;
  };
  var Qt, Ct, er, ye, He, ee = {}, Ce = {}, zr = [], ue = {}, Ur = {}, _e = {}, nn = {}, _r = null, Pe = 0, Zt = [], le = new lu(g), qn = l.hotfixes || [], Ye = {}, Hr = {}, Wr = [], Gt = function h(d, P, T, Z, $, yt) {
    if (!(this instanceof h)) return new h(d, P, T, Z, $, yt);
    isNaN(d) && (d = 1), isNaN(P) && (P = 0), isNaN(T) && (T = 0), isNaN(Z) && (Z = 1), isNaN($) && ($ = 0), isNaN(yt) && (yt = 0), this._matrix = [d, P, T, Z, $, yt];
  };
  Object.defineProperty(Gt.prototype, "sx", {
    get: function() {
      return this._matrix[0];
    },
    set: function(d) {
      this._matrix[0] = d;
    }
  }), Object.defineProperty(Gt.prototype, "shy", {
    get: function() {
      return this._matrix[1];
    },
    set: function(d) {
      this._matrix[1] = d;
    }
  }), Object.defineProperty(Gt.prototype, "shx", {
    get: function() {
      return this._matrix[2];
    },
    set: function(d) {
      this._matrix[2] = d;
    }
  }), Object.defineProperty(Gt.prototype, "sy", {
    get: function() {
      return this._matrix[3];
    },
    set: function(d) {
      this._matrix[3] = d;
    }
  }), Object.defineProperty(Gt.prototype, "tx", {
    get: function() {
      return this._matrix[4];
    },
    set: function(d) {
      this._matrix[4] = d;
    }
  }), Object.defineProperty(Gt.prototype, "ty", {
    get: function() {
      return this._matrix[5];
    },
    set: function(d) {
      this._matrix[5] = d;
    }
  }), Object.defineProperty(Gt.prototype, "a", {
    get: function() {
      return this._matrix[0];
    },
    set: function(d) {
      this._matrix[0] = d;
    }
  }), Object.defineProperty(Gt.prototype, "b", {
    get: function() {
      return this._matrix[1];
    },
    set: function(d) {
      this._matrix[1] = d;
    }
  }), Object.defineProperty(Gt.prototype, "c", {
    get: function() {
      return this._matrix[2];
    },
    set: function(d) {
      this._matrix[2] = d;
    }
  }), Object.defineProperty(Gt.prototype, "d", {
    get: function() {
      return this._matrix[3];
    },
    set: function(d) {
      this._matrix[3] = d;
    }
  }), Object.defineProperty(Gt.prototype, "e", {
    get: function() {
      return this._matrix[4];
    },
    set: function(d) {
      this._matrix[4] = d;
    }
  }), Object.defineProperty(Gt.prototype, "f", {
    get: function() {
      return this._matrix[5];
    },
    set: function(d) {
      this._matrix[5] = d;
    }
  }), Object.defineProperty(Gt.prototype, "rotation", {
    get: function() {
      return Math.atan2(this.shx, this.sx);
    }
  }), Object.defineProperty(Gt.prototype, "scaleX", {
    get: function() {
      return this.decompose().scale.sx;
    }
  }), Object.defineProperty(Gt.prototype, "scaleY", {
    get: function() {
      return this.decompose().scale.sy;
    }
  }), Object.defineProperty(Gt.prototype, "isIdentity", {
    get: function() {
      return this.sx === 1 && this.shy === 0 && this.shx === 0 && this.sy === 1 && this.tx === 0 && this.ty === 0;
    }
  }), Gt.prototype.join = function(h) {
    return [this.sx, this.shy, this.shx, this.sy, this.tx, this.ty].map(nt).join(h);
  }, Gt.prototype.multiply = function(h) {
    var d = h.sx * this.sx + h.shy * this.shx, P = h.sx * this.shy + h.shy * this.sy, T = h.shx * this.sx + h.sy * this.shx, Z = h.shx * this.shy + h.sy * this.sy, $ = h.tx * this.sx + h.ty * this.shx + this.tx, yt = h.tx * this.shy + h.ty * this.sy + this.ty;
    return new Gt(d, P, T, Z, $, yt);
  }, Gt.prototype.decompose = function() {
    var h = this.sx, d = this.shy, P = this.shx, T = this.sy, Z = this.tx, $ = this.ty, yt = Math.sqrt(h * h + d * d), St = (h /= yt) * P + (d /= yt) * T;
    P -= h * St, T -= d * St;
    var Tt = Math.sqrt(P * P + T * T);
    return St /= Tt, h * (T /= Tt) < d * (P /= Tt) && (h = -h, d = -d, St = -St, yt = -yt), {
      scale: new Gt(yt, 0, 0, Tt, 0, 0),
      translate: new Gt(1, 0, 0, 1, Z, $),
      rotate: new Gt(h, d, -d, h, 0, 0),
      skew: new Gt(1, 0, St, 1, 0, 0)
    };
  }, Gt.prototype.toString = function(h) {
    return this.join(" ");
  }, Gt.prototype.inversed = function() {
    var h = this.sx, d = this.shy, P = this.shx, T = this.sy, Z = this.tx, $ = this.ty, yt = 1 / (h * T - d * P), St = T * yt, Tt = -d * yt, Jt = -P * yt, Xt = h * yt;
    return new Gt(St, Tt, Jt, Xt, -St * Z - Jt * $, -Tt * Z - Xt * $);
  }, Gt.prototype.applyToPoint = function(h) {
    var d = h.x * this.sx + h.y * this.shx + this.tx, P = h.x * this.shy + h.y * this.sy + this.ty;
    return new gi(d, P);
  }, Gt.prototype.applyToRectangle = function(h) {
    var d = this.applyToPoint(h), P = this.applyToPoint(new gi(h.x + h.w, h.y + h.h));
    return new ja(d.x, d.y, P.x - d.x, P.y - d.y);
  }, Gt.prototype.clone = function() {
    var h = this.sx, d = this.shy, P = this.shx, T = this.sy, Z = this.tx, $ = this.ty;
    return new Gt(h, d, P, T, Z, $);
  }, g.Matrix = Gt;
  var an = g.matrixMult = function(h, d) {
    return d.multiply(h);
  }, mr = new Gt(1, 0, 0, 1, 0, 0);
  g.unitMatrix = g.identityMatrix = mr;
  var sn = function(d, P) {
    if (!Ur[d]) {
      var T = (P instanceof Cn ? "Sh" : "P") + (Object.keys(ue).length + 1).toString(10);
      P.id = T, Ur[d] = T, ue[T] = P, le.publish("addPattern", P);
    }
  };
  g.ShadingPattern = Cn, g.TilingPattern = ti, g.addShadingPattern = function(h, d) {
    return dt("addShadingPattern()"), sn(h, d), this;
  }, g.beginTilingPattern = function(h) {
    dt("beginTilingPattern()"), Oa(h.boundingBox[0], h.boundingBox[1], h.boundingBox[2] - h.boundingBox[0], h.boundingBox[3] - h.boundingBox[1], h.matrix);
  }, g.endTilingPattern = function(h, d) {
    dt("endTilingPattern()"), d.stream = Lt[x].join(`
`), sn(h, d), le.publish("endTilingPattern", d), Wr.pop().restore();
  };
  var ke = g.__private__.newObject = function() {
    var h = Re();
    return We(h, !0), h;
  }, Re = g.__private__.newObjectDeferred = function() {
    return V++, K[V] = function() {
      return it;
    }, V;
  }, We = function(d, P) {
    return P = typeof P == "boolean" && P, K[d] = it, P && j(d + " 0 obj"), d;
  }, En = g.__private__.newAdditionalObject = function() {
    var h = {
      objId: Re(),
      content: ""
    };
    return ut.push(h), h;
  }, mn = Re(), Pr = Re(), Vr = g.__private__.decodeColorString = function(h) {
    var d = h.split(" ");
    if (d.length !== 2 || d[1] !== "g" && d[1] !== "G")
      d.length === 5 && (d[4] === "k" || d[4] === "K") && (d = [(1 - d[0]) * (1 - d[3]), (1 - d[1]) * (1 - d[3]), (1 - d[2]) * (1 - d[3]), "r"]);
    else {
      var P = parseFloat(d[0]);
      d = [P, P, P, "r"];
    }
    for (var T = "#", Z = 0; Z < 3; Z++) T += ("0" + Math.floor(255 * parseFloat(d[Z])).toString(16)).slice(-2);
    return T;
  }, kr = g.__private__.encodeColorString = function(h) {
    var d;
    typeof h == "string" && (h = {
      ch1: h
    });
    var P = h.ch1, T = h.ch2, Z = h.ch3, $ = h.ch4, yt = h.pdfColorType === "draw" ? ["G", "RG", "K"] : ["g", "rg", "k"];
    if (typeof P == "string" && P.charAt(0) !== "#") {
      var St = new ju(P);
      if (St.ok) P = St.toHex();
      else if (!/^\d*\.?\d*$/.test(P)) throw new Error('Invalid color "' + P + '" passed to jsPDF.encodeColorString.');
    }
    if (typeof P == "string" && /^#[0-9A-Fa-f]{3}$/.test(P) && (P = "#" + P[1] + P[1] + P[2] + P[2] + P[3] + P[3]), typeof P == "string" && /^#[0-9A-Fa-f]{6}$/.test(P)) {
      var Tt = parseInt(P.substr(1), 16);
      P = Tt >> 16 & 255, T = Tt >> 8 & 255, Z = 255 & Tt;
    }
    if (T === void 0 || $ === void 0 && P === T && T === Z)
      if (typeof P == "string") d = P + " " + yt[0];
      else switch (h.precision) {
        case 2:
          d = at(P / 255) + " " + yt[0];
          break;
        case 3:
        default:
          d = M(P / 255) + " " + yt[0];
      }
    else if ($ === void 0 || fe($) === "object") {
      if ($ && !isNaN($.a) && $.a === 0) return d = ["1.", "1.", "1.", yt[1]].join(" ");
      if (typeof P == "string") d = [P, T, Z, yt[1]].join(" ");
      else switch (h.precision) {
        case 2:
          d = [at(P / 255), at(T / 255), at(Z / 255), yt[1]].join(" ");
          break;
        default:
        case 3:
          d = [M(P / 255), M(T / 255), M(Z / 255), yt[1]].join(" ");
      }
    } else if (typeof P == "string") d = [P, T, Z, $, yt[2]].join(" ");
    else switch (h.precision) {
      case 2:
        d = [at(P), at(T), at(Z), at($), yt[2]].join(" ");
        break;
      case 3:
      default:
        d = [M(P), M(T), M(Z), M($), yt[2]].join(" ");
    }
    return d;
  }, Fr = g.__private__.getFilters = function() {
    return o;
  }, vr = g.__private__.putStream = function(h) {
    var d = (h = h || {}).data || "", P = h.filters || Fr(), T = h.alreadyAppliedFilters || [], Z = h.addLength1 || !1, $ = d.length, yt = h.objectId, St = function(qe) {
      return qe;
    };
    if (A !== null && yt === void 0) throw new Error("ObjectId must be passed to putStream for file encryption");
    A !== null && (St = Je.encryptor(yt, 0));
    var Tt = {};
    P === !0 && (P = ["FlateEncode"]);
    var Jt = h.additionalKeyValues || [], Xt = (Tt = Wt.API.processDataByFilters !== void 0 ? Wt.API.processDataByFilters(d, P) : {
      data: d,
      reverseChain: []
    }).reverseChain + (Array.isArray(T) ? T.join(" ") : T.toString());
    if (Tt.data.length !== 0 && (Jt.push({
      key: "Length",
      value: Tt.data.length
    }), Z === !0 && Jt.push({
      key: "Length1",
      value: $
    })), Xt.length != 0) if (Xt.split("/").length - 1 == 1) Jt.push({
      key: "Filter",
      value: Xt
    });
    else {
      Jt.push({
        key: "Filter",
        value: "[" + Xt + "]"
      });
      for (var ae = 0; ae < Jt.length; ae += 1) if (Jt[ae].key === "DecodeParms") {
        for (var ge = [], Ae = 0; Ae < Tt.reverseChain.split("/").length - 1; Ae += 1) ge.push("null");
        ge.push(Jt[ae].value), Jt[ae].value = "[" + ge.join(" ") + "]";
      }
    }
    j("<<");
    for (var Le = 0; Le < Jt.length; Le++) j("/" + Jt[Le].key + " " + Jt[Le].value);
    j(">>"), Tt.data.length !== 0 && (j("stream"), j(St(Tt.data)), j("endstream"));
  }, Dn = g.__private__.putPage = function(h) {
    var d = h.number, P = h.data, T = h.objId, Z = h.contentsObjId;
    We(T, !0), j("<</Type /Page"), j("/Parent " + h.rootDictionaryObjId + " 0 R"), j("/Resources " + h.resourceDictionaryObjId + " 0 R"), j("/MediaBox [" + parseFloat(nt(h.mediaBox.bottomLeftX)) + " " + parseFloat(nt(h.mediaBox.bottomLeftY)) + " " + nt(h.mediaBox.topRightX) + " " + nt(h.mediaBox.topRightY) + "]"), h.cropBox !== null && j("/CropBox [" + nt(h.cropBox.bottomLeftX) + " " + nt(h.cropBox.bottomLeftY) + " " + nt(h.cropBox.topRightX) + " " + nt(h.cropBox.topRightY) + "]"), h.bleedBox !== null && j("/BleedBox [" + nt(h.bleedBox.bottomLeftX) + " " + nt(h.bleedBox.bottomLeftY) + " " + nt(h.bleedBox.topRightX) + " " + nt(h.bleedBox.topRightY) + "]"), h.trimBox !== null && j("/TrimBox [" + nt(h.trimBox.bottomLeftX) + " " + nt(h.trimBox.bottomLeftY) + " " + nt(h.trimBox.topRightX) + " " + nt(h.trimBox.topRightY) + "]"), h.artBox !== null && j("/ArtBox [" + nt(h.artBox.bottomLeftX) + " " + nt(h.artBox.bottomLeftY) + " " + nt(h.artBox.topRightX) + " " + nt(h.artBox.topRightY) + "]"), typeof h.userUnit == "number" && h.userUnit !== 1 && j("/UserUnit " + h.userUnit), le.publish("putPage", {
      objId: T,
      pageContext: Zt[d],
      pageNumber: d,
      page: P
    }), j("/Contents " + Z + " 0 R"), j(">>"), j("endobj");
    var $ = P.join(`
`);
    return J === N.ADVANCED && ($ += `
Q`), We(Z, !0), vr({
      data: $,
      filters: Fr(),
      objectId: Z
    }), j("endobj"), T;
  }, Gr = g.__private__.putPages = function() {
    var h, d, P = [];
    for (h = 1; h <= Pe; h++) Zt[h].objId = Re(), Zt[h].contentsObjId = Re();
    for (h = 1; h <= Pe; h++) P.push(Dn({
      number: h,
      data: Lt[h],
      objId: Zt[h].objId,
      contentsObjId: Zt[h].contentsObjId,
      mediaBox: Zt[h].mediaBox,
      cropBox: Zt[h].cropBox,
      bleedBox: Zt[h].bleedBox,
      trimBox: Zt[h].trimBox,
      artBox: Zt[h].artBox,
      userUnit: Zt[h].userUnit,
      rootDictionaryObjId: mn,
      resourceDictionaryObjId: Pr
    }));
    We(mn, !0), j("<</Type /Pages");
    var T = "/Kids [";
    for (d = 0; d < Pe; d++) T += P[d] + " 0 R ";
    j(T + "]"), j("/Count " + Pe), j(">>"), j("endobj"), le.publish("postPutPages");
  }, Tn = function(d) {
    le.publish("putFont", {
      font: d,
      out: j,
      newObject: ke,
      putStream: vr
    }), d.isAlreadyPutted !== !0 && (d.objectNumber = ke(), j("<<"), j("/Type /Font"), j("/BaseFont /" + Bi(d.postScriptName)), j("/Subtype /Type1"), typeof d.encoding == "string" && j("/Encoding /" + d.encoding), j("/FirstChar 32"), j("/LastChar 255"), j(">>"), j("endobj"));
  }, si = function() {
    for (var d in ee) ee.hasOwnProperty(d) && (b === !1 || b === !0 && S.hasOwnProperty(d)) && Tn(ee[d]);
  }, oi = function(d) {
    d.objectNumber = ke();
    var P = [];
    P.push({
      key: "Type",
      value: "/XObject"
    }), P.push({
      key: "Subtype",
      value: "/Form"
    }), P.push({
      key: "BBox",
      value: "[" + [nt(d.x), nt(d.y), nt(d.x + d.width), nt(d.y + d.height)].join(" ") + "]"
    }), P.push({
      key: "Matrix",
      value: "[" + d.matrix.toString() + "]"
    });
    var T = d.pages[1].join(`
`);
    vr({
      data: T,
      additionalKeyValues: P,
      objectId: d.objectNumber
    }), j("endobj");
  }, ui = function() {
    for (var d in Ye) Ye.hasOwnProperty(d) && oi(Ye[d]);
  }, ds = function(d, P) {
    var T, Z = [], $ = 1 / (P - 1);
    for (T = 0; T < 1; T += $) Z.push(T);
    if (Z.push(1), d[0].offset != 0) {
      var yt = {
        offset: 0,
        color: d[0].color
      };
      d.unshift(yt);
    }
    if (d[d.length - 1].offset != 1) {
      var St = {
        offset: 1,
        color: d[d.length - 1].color
      };
      d.push(St);
    }
    for (var Tt = "", Jt = 0, Xt = 0; Xt < Z.length; Xt++) {
      for (T = Z[Xt]; T > d[Jt + 1].offset; ) Jt++;
      var ae = d[Jt].offset, ge = (T - ae) / (d[Jt + 1].offset - ae), Ae = d[Jt].color, Le = d[Jt + 1].color;
      Tt += U(Math.round((1 - ge) * Ae[0] + ge * Le[0]).toString(16)) + U(Math.round((1 - ge) * Ae[1] + ge * Le[1]).toString(16)) + U(Math.round((1 - ge) * Ae[2] + ge * Le[2]).toString(16));
    }
    return Tt.trim();
  }, ga = function(d, P) {
    P || (P = 21);
    var T = ke(), Z = ds(d.colors, P), $ = [];
    $.push({
      key: "FunctionType",
      value: "0"
    }), $.push({
      key: "Domain",
      value: "[0.0 1.0]"
    }), $.push({
      key: "Size",
      value: "[" + P + "]"
    }), $.push({
      key: "BitsPerSample",
      value: "8"
    }), $.push({
      key: "Range",
      value: "[0.0 1.0 0.0 1.0 0.0 1.0]"
    }), $.push({
      key: "Decode",
      value: "[0.0 1.0 0.0 1.0 0.0 1.0]"
    }), vr({
      data: Z,
      additionalKeyValues: $,
      alreadyAppliedFilters: ["/ASCIIHexDecode"],
      objectId: T
    }), j("endobj"), d.objectNumber = ke(), j("<< /ShadingType " + d.type), j("/ColorSpace /DeviceRGB");
    var yt = "/Coords [" + nt(parseFloat(d.coords[0])) + " " + nt(parseFloat(d.coords[1])) + " ";
    d.type === 2 ? yt += nt(parseFloat(d.coords[2])) + " " + nt(parseFloat(d.coords[3])) : yt += nt(parseFloat(d.coords[2])) + " " + nt(parseFloat(d.coords[3])) + " " + nt(parseFloat(d.coords[4])) + " " + nt(parseFloat(d.coords[5])), j(yt += "]"), d.matrix && j("/Matrix [" + d.matrix.toString() + "]"), j("/Function " + T + " 0 R"), j("/Extend [true true]"), j(">>"), j("endobj");
  }, ps = function(d, P) {
    var T = Re(), Z = ke();
    P.push({
      resourcesOid: T,
      objectOid: Z
    }), d.objectNumber = Z;
    var $ = [];
    $.push({
      key: "Type",
      value: "/Pattern"
    }), $.push({
      key: "PatternType",
      value: "1"
    }), $.push({
      key: "PaintType",
      value: "1"
    }), $.push({
      key: "TilingType",
      value: "1"
    }), $.push({
      key: "BBox",
      value: "[" + d.boundingBox.map(nt).join(" ") + "]"
    }), $.push({
      key: "XStep",
      value: nt(d.xStep)
    }), $.push({
      key: "YStep",
      value: nt(d.yStep)
    }), $.push({
      key: "Resources",
      value: T + " 0 R"
    }), d.matrix && $.push({
      key: "Matrix",
      value: "[" + d.matrix.toString() + "]"
    }), vr({
      data: d.stream,
      additionalKeyValues: $,
      objectId: d.objectNumber
    }), j("endobj");
  }, gs = function(d) {
    var P;
    for (P in ue) ue.hasOwnProperty(P) && (ue[P] instanceof Cn ? ga(ue[P]) : ue[P] instanceof ti && ps(ue[P], d));
  }, li = function(d) {
    for (var P in d.objectNumber = ke(), j("<<"), d) switch (P) {
      case "opacity":
        j("/ca " + at(d[P]));
        break;
      case "stroke-opacity":
        j("/CA " + at(d[P]));
    }
    j(">>"), j("endobj");
  }, ma = function() {
    var d;
    for (d in _e) _e.hasOwnProperty(d) && li(_e[d]);
  }, ms = function() {
    for (var d in j("/XObject <<"), Ye) Ye.hasOwnProperty(d) && Ye[d].objectNumber >= 0 && j("/" + d + " " + Ye[d].objectNumber + " 0 R");
    le.publish("putXobjectDict"), j(">>");
  }, Mi = function() {
    Je.oid = ke(), j("<<"), j("/Filter /Standard"), j("/V " + Je.v), j("/R " + Je.r), j("/U <" + Je.toHexString(Je.U) + ">"), j("/O <" + Je.toHexString(Je.O) + ">"), j("/P " + Je.P), j(">>"), j("endobj");
  }, vs = function() {
    for (var d in j("/Font <<"), ee) ee.hasOwnProperty(d) && (b === !1 || b === !0 && S.hasOwnProperty(d)) && j("/" + d + " " + ee[d].objectNumber + " 0 R");
    j(">>");
  }, va = function() {
    if (Object.keys(ue).length > 0) {
      for (var d in j("/Shading <<"), ue) ue.hasOwnProperty(d) && ue[d] instanceof Cn && ue[d].objectNumber >= 0 && j("/" + d + " " + ue[d].objectNumber + " 0 R");
      le.publish("putShadingPatternDict"), j(">>");
    }
  }, bs = function(d) {
    if (Object.keys(ue).length > 0) {
      for (var P in j("/Pattern <<"), ue) ue.hasOwnProperty(P) && ue[P] instanceof g.TilingPattern && ue[P].objectNumber >= 0 && ue[P].objectNumber < d && j("/" + P + " " + ue[P].objectNumber + " 0 R");
      le.publish("putTilingPatternDict"), j(">>");
    }
  }, ci = function() {
    if (Object.keys(_e).length > 0) {
      var d;
      for (d in j("/ExtGState <<"), _e) _e.hasOwnProperty(d) && _e[d].objectNumber >= 0 && j("/" + d + " " + _e[d].objectNumber + " 0 R");
      le.publish("putGStateDict"), j(">>");
    }
  }, ba = function(d) {
    We(d.resourcesOid, !0), j("<<"), j("/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]"), vs(), va(), bs(d.objectOid), ci(), ms(), j(">>"), j("endobj");
  }, Me = function() {
    var d = [];
    si(), ma(), ui(), gs(d), le.publish("putResources"), d.forEach(ba), ba({
      resourcesOid: Pr,
      objectOid: Number.MAX_SAFE_INTEGER
    }), le.publish("postPutResources");
  }, ya = function() {
    le.publish("putAdditionalObjects");
    for (var d = 0; d < ut.length; d++) {
      var P = ut[d];
      We(P.objId, !0), j(P.content), j("endobj");
    }
    le.publish("postPutAdditionalObjects");
  }, qi = function(d) {
    Ce[d.fontName] = Ce[d.fontName] || {}, Ce[d.fontName][d.fontStyle] = d.id;
  }, wa = function(d, P, T, Z, $) {
    var yt = {
      id: "F" + (Object.keys(ee).length + 1).toString(10),
      postScriptName: d,
      fontName: P,
      fontStyle: T,
      encoding: Z,
      isStandardFont: $ || !1,
      metadata: {}
    };
    return le.publish("addFont", {
      font: yt,
      instance: this
    }), ee[yt.id] = yt, qi(yt), yt.id;
  }, Na = function(d) {
    for (var P = 0, T = At.length; P < T; P++) {
      var Z = wa.call(this, d[P][0], d[P][1], d[P][2], At[P][3], !0);
      b === !1 && (S[Z] = !0);
      var $ = d[P][0].split("-");
      qi({
        id: Z,
        fontName: $[0],
        fontStyle: $[1] || ""
      });
    }
    le.publish("addFonts", {
      fonts: ee,
      dictionary: Ce
    });
  }, ys = function(d) {
    return d.foo = function() {
      try {
        return d.apply(this, arguments);
      } catch (Z) {
        var P = Z.stack || "";
        ~P.indexOf(" at ") && (P = P.split(" at ")[1]);
        var T = "Error in function " + P.split(`
`)[0].split("<")[0] + ": " + Z.message;
        if (!Yt.console) throw new Error(T);
        Yt.console.error(T, Z), Yt.alert && alert(T);
      }
    }, d.foo.bar = d, d.foo;
  }, Ir = function(d, P) {
    var T, Z, $, yt, St, Tt, Jt, Xt, ae;
    if ($ = (P = P || {}).sourceEncoding || "Unicode", St = P.outputEncoding, (P.autoencode || St) && ee[Qt].metadata && ee[Qt].metadata[$] && ee[Qt].metadata[$].encoding && (yt = ee[Qt].metadata[$].encoding, !St && ee[Qt].encoding && (St = ee[Qt].encoding), !St && yt.codePages && (St = yt.codePages[0]), typeof St == "string" && (St = yt[St]), St)) {
      for (Jt = !1, Tt = [], T = 0, Z = d.length; T < Z; T++) (Xt = St[d.charCodeAt(T)]) ? Tt.push(String.fromCharCode(Xt)) : Tt.push(d[T]), Tt[T].charCodeAt(0) >> 8 && (Jt = !0);
      d = Tt.join("");
    }
    for (T = d.length; Jt === void 0 && T !== 0; ) d.charCodeAt(T - 1) >> 8 && (Jt = !0), T--;
    if (!Jt) return d;
    for (Tt = P.noBOM ? [] : [254, 255], T = 0, Z = d.length; T < Z; T++) {
      if ((ae = (Xt = d.charCodeAt(T)) >> 8) >> 8) throw new Error("Character at position " + T + " of string '" + d + "' exceeds 16bits. Cannot be encoded into UCS-2 BE");
      Tt.push(ae), Tt.push(Xt - (ae << 8));
    }
    return String.fromCharCode.apply(void 0, Tt);
  }, br = g.__private__.pdfEscape = g.pdfEscape = function(h, d) {
    return Ir(h, d).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }, on = g.__private__.beginPage = function(h) {
    Lt[++Pe] = [], Zt[Pe] = {
      objId: 0,
      contentsObjId: 0,
      userUnit: Number(f),
      artBox: null,
      bleedBox: null,
      cropBox: null,
      trimBox: null,
      mediaBox: {
        bottomLeftX: 0,
        bottomLeftY: 0,
        topRightX: Number(h[0]),
        topRightY: Number(h[1])
      }
    }, La(Pe), Dt(Lt[x]);
  }, Ei = function(d, P) {
    var T, Z, $;
    switch (r = P || r, typeof d == "string" && (T = I(d.toLowerCase()), Array.isArray(T) && (Z = T[0], $ = T[1])), Array.isArray(d) && (Z = d[0] * Ct, $ = d[1] * Ct), isNaN(Z) && (Z = s[0], $ = s[1]), (Z > 14400 || $ > 14400) && (ve.warn("A page in a PDF can not be wider or taller than 14400 userUnit. jsPDF limits the width/height to 14400"), Z = Math.min(14400, Z), $ = Math.min(14400, $)), s = [Z, $], r.substr(0, 1)) {
      case "l":
        $ > Z && (s = [$, Z]);
        break;
      case "p":
        Z > $ && (s = [$, Z]);
    }
    on(s), di(zi), j(jr), Ui !== 0 && j(Ui + " J"), Hi !== 0 && j(Hi + " j"), le.publish("addPage", {
      pageNumber: Pe
    });
  }, ws = function(d) {
    d > 0 && d <= Pe && (Lt.splice(d, 1), Zt.splice(d, 1), Pe--, x > Pe && (x = Pe), this.setPage(x));
  }, La = function(d) {
    d > 0 && d <= Pe && (x = d);
  }, Ns = g.__private__.getNumberOfPages = g.getNumberOfPages = function() {
    return Lt.length - 1;
  }, Aa = function(d, P, T) {
    var Z, $ = void 0;
    return T = T || {}, d = d !== void 0 ? d : ee[Qt].fontName, P = P !== void 0 ? P : ee[Qt].fontStyle, Z = d.toLowerCase(), Ce[Z] !== void 0 && Ce[Z][P] !== void 0 ? $ = Ce[Z][P] : Ce[d] !== void 0 && Ce[d][P] !== void 0 ? $ = Ce[d][P] : T.disableWarning === !1 && ve.warn("Unable to look up font label for font '" + d + "', '" + P + "'. Refer to getFontList() for available fonts."), $ || T.noFallback || ($ = Ce.times[P]) == null && ($ = Ce.times.normal), $;
  }, Ls = g.__private__.putInfo = function() {
    var h = ke(), d = function(Z) {
      return Z;
    };
    for (var P in A !== null && (d = Je.encryptor(h, 0)), j("<<"), j("/Producer (" + br(d("jsPDF " + Wt.version)) + ")"), Vt) Vt.hasOwnProperty(P) && Vt[P] && j("/" + P.substr(0, 1).toUpperCase() + P.substr(1) + " (" + br(d(Vt[P])) + ")");
    j("/CreationDate (" + br(d(ot)) + ")"), j(">>"), j("endobj");
  }, As = g.__private__.putCatalog = function(h) {
    var d = (h = h || {}).rootDictionaryObjId || mn;
    switch (ke(), j("<<"), j("/Type /Catalog"), j("/Pages " + d + " 0 R"), _t || (_t = "fullwidth"), _t) {
      case "fullwidth":
        j("/OpenAction [3 0 R /FitH null]");
        break;
      case "fullheight":
        j("/OpenAction [3 0 R /FitV null]");
        break;
      case "fullpage":
        j("/OpenAction [3 0 R /Fit]");
        break;
      case "original":
        j("/OpenAction [3 0 R /XYZ null null 1]");
        break;
      default:
        var P = "" + _t;
        P.substr(P.length - 1) === "%" && (_t = parseInt(_t) / 100), typeof _t == "number" && j("/OpenAction [3 0 R /XYZ null null " + at(_t) + "]");
    }
    switch (Ht || (Ht = "continuous"), Ht) {
      case "continuous":
        j("/PageLayout /OneColumn");
        break;
      case "single":
        j("/PageLayout /SinglePage");
        break;
      case "two":
      case "twoleft":
        j("/PageLayout /TwoColumnLeft");
        break;
      case "tworight":
        j("/PageLayout /TwoColumnRight");
    }
    zt && j("/PageMode /" + zt), le.publish("putCatalog"), j(">>"), j("endobj");
  }, Di = g.__private__.putTrailer = function() {
    j("trailer"), j("<<"), j("/Size " + (V + 1)), j("/Root " + V + " 0 R"), j("/Info " + (V - 1) + " 0 R"), A !== null && j("/Encrypt " + Je.oid + " 0 R"), j("/ID [ <" + st + "> <" + st + "> ]"), j(">>");
  }, xs = g.__private__.putHeader = function() {
    j("%PDF-" + B), j("%ºß¬à");
  }, Ss = g.__private__.putXRef = function() {
    var h = "0000000000";
    j("xref"), j("0 " + (V + 1)), j("0000000000 65535 f ");
    for (var d = 1; d <= V; d++)
      typeof K[d] == "function" ? j((h + K[d]()).slice(-10) + " 00000 n ") : K[d] !== void 0 ? j((h + K[d]).slice(-10) + " 00000 n ") : j("0000000000 00000 n ");
  }, un = g.__private__.buildDocument = function() {
    Rt(), Dt(ft), le.publish("buildDocument"), xs(), Gr(), ya(), Me(), A !== null && Mi(), Ls(), As();
    var h = it;
    return Ss(), Di(), j("startxref"), j("" + h), j("%%EOF"), Dt(Lt[x]), ft.join(`
`);
  }, hi = g.__private__.getBlob = function(h) {
    return new Blob([kt(h)], {
      type: "application/pdf"
    });
  }, _s = g.output = g.__private__.output = ys(function(h, d) {
    switch (typeof (d = d || {}) == "string" ? d = {
      filename: d
    } : d.filename = d.filename || "generated.pdf", h) {
      case void 0:
        return un();
      case "save":
        g.save(d.filename);
        break;
      case "arraybuffer":
        return kt(un());
      case "blob":
        return hi(un());
      case "bloburi":
      case "bloburl":
        if (Yt.URL !== void 0 && typeof Yt.URL.createObjectURL == "function") return Yt.URL && Yt.URL.createObjectURL(hi(un())) || void 0;
        ve.warn("bloburl is not supported by your system, because URL.createObjectURL is not supported by your browser.");
        break;
      case "datauristring":
      case "dataurlstring":
        var P = "", T = un();
        try {
          P = wo(T);
        } catch (Ae) {
          P = wo(unescape(encodeURIComponent(T)));
        }
        return "data:application/pdf;filename=" + d.filename + ";base64," + P;
      case "pdfobjectnewwindow":
        if (Object.prototype.toString.call(Yt) === "[object Window]") {
          var Z = "https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js", $ = ' integrity="sha512-4ze/a9/4jqu+tX9dfOqJYSvyYd5M6qum/3HpCLr+/Jqf0whc37VUbkpNGHR7/8pSnCFw47T1fmIpwBV7UySh3g==" crossorigin="anonymous"';
          d.pdfObjectUrl && (Z = d.pdfObjectUrl, $ = "");
          var yt = '<html><style>html, body { padding: 0; margin: 0; } iframe { width: 100%; height: 100%; border: 0;}  </style><body><script src="' + Z + '"' + $ + '><\/script><script >PDFObject.embed("' + this.output("dataurlstring") + '", ' + JSON.stringify(d) + ");<\/script></body></html>", St = Yt.open();
          return St !== null && St.document.write(yt), St;
        }
        throw new Error("The option pdfobjectnewwindow just works in a browser-environment.");
      case "pdfjsnewwindow":
        if (Object.prototype.toString.call(Yt) === "[object Window]") {
          var Tt = '<html><style>html, body { padding: 0; margin: 0; } iframe { width: 100%; height: 100%; border: 0;}  </style><body><iframe id="pdfViewer" src="' + (d.pdfJsUrl || "examples/PDF.js/web/viewer.html") + "?file=&downloadName=" + d.filename + '" width="500px" height="400px" /></body></html>', Jt = Yt.open();
          if (Jt !== null) {
            Jt.document.write(Tt);
            var Xt = this;
            Jt.document.documentElement.querySelector("#pdfViewer").onload = function() {
              Jt.document.title = d.filename, Jt.document.documentElement.querySelector("#pdfViewer").contentWindow.PDFViewerApplication.open(Xt.output("bloburl"));
            };
          }
          return Jt;
        }
        throw new Error("The option pdfjsnewwindow just works in a browser-environment.");
      case "dataurlnewwindow":
        if (Object.prototype.toString.call(Yt) !== "[object Window]") throw new Error("The option dataurlnewwindow just works in a browser-environment.");
        var ae = '<html><style>html, body { padding: 0; margin: 0; } iframe { width: 100%; height: 100%; border: 0;}  </style><body><iframe src="' + this.output("datauristring", d) + '"></iframe></body></html>', ge = Yt.open();
        if (ge !== null && (ge.document.write(ae), ge.document.title = d.filename), ge || typeof safari == "undefined") return ge;
        break;
      case "datauri":
      case "dataurl":
        return Yt.document.location.href = this.output("datauristring", d);
      default:
        return null;
    }
  }), Rn = function(d) {
    return Array.isArray(qn) === !0 && qn.indexOf(d) > -1;
  };
  switch (n) {
    case "pt":
      Ct = 1;
      break;
    case "mm":
      Ct = 72 / 25.4;
      break;
    case "cm":
      Ct = 72 / 2.54;
      break;
    case "in":
      Ct = 72;
      break;
    case "px":
      Ct = Rn("px_scaling") == 1 ? 0.75 : 96 / 72;
      break;
    case "pc":
    case "em":
      Ct = 12;
      break;
    case "ex":
      Ct = 6;
      break;
    default:
      if (typeof n != "number") throw new Error("Invalid unit: " + n);
      Ct = n;
  }
  var Je = null;
  xt(), X();
  var Ps = function(d) {
    return A !== null ? Je.encryptor(d, 0) : function(P) {
      return P;
    };
  }, xa = g.__private__.getPageInfo = g.getPageInfo = function(h) {
    if (isNaN(h) || h % 1 != 0) throw new Error("Invalid argument passed to jsPDF.getPageInfo");
    return {
      objId: Zt[h].objId,
      pageNumber: h,
      pageContext: Zt[h]
    };
  }, ks = g.__private__.getPageInfoByObjId = function(h) {
    if (isNaN(h) || h % 1 != 0) throw new Error("Invalid argument passed to jsPDF.getPageInfoByObjId");
    for (var d in Zt) if (Zt[d].objId === h) break;
    return xa(d);
  }, Kt = g.__private__.getCurrentPageInfo = g.getCurrentPageInfo = function() {
    return {
      objId: Zt[x].objId,
      pageNumber: x,
      pageContext: Zt[x]
    };
  };
  g.addPage = function() {
    return Ei.apply(this, arguments), this;
  }, g.setPage = function() {
    return La.apply(this, arguments), Dt.call(this, Lt[x]), this;
  }, g.insertPage = function(h) {
    return this.addPage(), this.movePage(x, h), this;
  }, g.movePage = function(h, d) {
    var P, T;
    if (h > d) {
      P = Lt[h], T = Zt[h];
      for (var Z = h; Z > d; Z--) Lt[Z] = Lt[Z - 1], Zt[Z] = Zt[Z - 1];
      Lt[d] = P, Zt[d] = T, this.setPage(d);
    } else if (h < d) {
      P = Lt[h], T = Zt[h];
      for (var $ = h; $ < d; $++) Lt[$] = Lt[$ + 1], Zt[$] = Zt[$ + 1];
      Lt[d] = P, Zt[d] = T, this.setPage(d);
    }
    return this;
  }, g.deletePage = function() {
    return ws.apply(this, arguments), this;
  }, g.__private__.text = g.text = function(h, d, P, T, Z) {
    var $, yt, St, Tt, Jt, Xt, ae, ge, Ae, Le = (T = T || {}).scope || this;
    if (typeof h == "number" && typeof d == "number" && (typeof P == "string" || Array.isArray(P))) {
      var rr = P;
      P = d, d = h, h = rr;
    }
    if (arguments[3] instanceof Gt ? (dt("The transform parameter of text() with a Matrix value"), Ae = Z) : (St = arguments[4], Tt = arguments[5], fe(ae = arguments[3]) === "object" && ae !== null || (typeof St == "string" && (Tt = St, St = null), typeof ae == "string" && (Tt = ae, ae = null), typeof ae == "number" && (St = ae, ae = null), T = {
      flags: ae,
      angle: St,
      align: Tt
    })), isNaN(d) || isNaN(P) || h == null) throw new Error("Invalid arguments passed to jsPDF.text");
    if (h.length === 0) return Le;
    var qe = "", Or = !1, bi = typeof T.lineHeightFactor == "number" ? T.lineHeightFactor : zn, yr = Le.internal.scaleFactor;
    function ln(we) {
      return we = we.split("	").join(Array(T.TabLen || 9).join(" ")), br(we, ae);
    }
    function Gi(we) {
      for (var de, Ve = we.concat(), Se = [], hr = Ve.length; hr--; ) typeof (de = Ve.shift()) == "string" ? Se.push(de) : Array.isArray(we) && (de.length === 1 || de[1] === void 0 && de[2] === void 0) ? Se.push(de[0]) : Se.push([de[0], de[1], de[2]]);
      return Se;
    }
    function Yi(we, de) {
      var Ve;
      if (typeof we == "string") Ve = de(we)[0];
      else if (Array.isArray(we)) {
        for (var Se, hr, Qi = we.concat(), _i = [], Ta = Qi.length; Ta--; ) typeof (Se = Qi.shift()) == "string" ? _i.push(de(Se)[0]) : Array.isArray(Se) && typeof Se[0] == "string" && (hr = de(Se[0], Se[1], Se[2]), _i.push([hr[0], hr[1], hr[2]]));
        Ve = _i;
      }
      return Ve;
    }
    var yi = !1, Ji = !0;
    if (typeof h == "string") yi = !0;
    else if (Array.isArray(h)) {
      var Xi = h.concat();
      yt = [];
      for (var wi, Xe = Xi.length; Xe--; ) (typeof (wi = Xi.shift()) != "string" || Array.isArray(wi) && typeof wi[0] != "string") && (Ji = !1);
      yi = Ji;
    }
    if (yi === !1) throw new Error('Type of text must be string or Array. "' + h + '" is not recognized.');
    typeof h == "string" && (h = h.match(/[\r?\n]/) ? h.split(/\r\n|\r|\n/g) : [h]);
    var bn = Ot / Le.internal.scaleFactor, Ni = bn * (bi - 1);
    switch (T.baseline) {
      case "bottom":
        P -= Ni;
        break;
      case "top":
        P += bn - Ni;
        break;
      case "hanging":
        P += bn - 2 * Ni;
        break;
      case "middle":
        P += bn / 2 - Ni;
    }
    if ((Xt = T.maxWidth || 0) > 0 && (typeof h == "string" ? h = Le.splitTextToSize(h, Xt) : Object.prototype.toString.call(h) === "[object Array]" && (h = h.reduce(function(we, de) {
      return we.concat(Le.splitTextToSize(de, Xt));
    }, []))), $ = {
      text: h,
      x: d,
      y: P,
      options: T,
      mutex: {
        pdfEscape: br,
        activeFontKey: Qt,
        fonts: ee,
        activeFontSize: Ot
      }
    }, le.publish("preProcessText", $), h = $.text, St = (T = $.options).angle, !(Ae instanceof Gt) && St && typeof St == "number") {
      St *= Math.PI / 180, T.rotationDirection === 0 && (St = -St), J === N.ADVANCED && (St = -St);
      var Ba = Math.cos(St), Li = Math.sin(St);
      Ae = new Gt(Ba, Li, -Li, Ba, 0, 0);
    } else St && St instanceof Gt && (Ae = St);
    J !== N.ADVANCED || Ae || (Ae = mr), (Jt = T.charSpace || pi) !== void 0 && (qe += nt(k(Jt)) + ` Tc
`, this.setCharSpace(this.getCharSpace() || 0)), (ge = T.horizontalScale) !== void 0 && (qe += nt(100 * ge) + ` Tz
`), T.lang;
    var nr = -1, Rs = T.renderingMode !== void 0 ? T.renderingMode : T.stroke, Ki = Le.internal.getCurrentPageInfo().pageContext;
    switch (Rs) {
      case 0:
      case !1:
      case "fill":
        nr = 0;
        break;
      case 1:
      case !0:
      case "stroke":
        nr = 1;
        break;
      case 2:
      case "fillThenStroke":
        nr = 2;
        break;
      case 3:
      case "invisible":
        nr = 3;
        break;
      case 4:
      case "fillAndAddForClipping":
        nr = 4;
        break;
      case 5:
      case "strokeAndAddPathForClipping":
        nr = 5;
        break;
      case 6:
      case "fillThenStrokeAndAddToPathForClipping":
        nr = 6;
        break;
      case 7:
      case "addToPathForClipping":
        nr = 7;
    }
    var zs = Ki.usedRenderingMode !== void 0 ? Ki.usedRenderingMode : -1;
    nr !== -1 ? qe += nr + ` Tr
` : zs !== -1 && (qe += `0 Tr
`), nr !== -1 && (Ki.usedRenderingMode = nr), Tt = T.align || "left";
    var wr, Wn = Ot * bi, Ma = Le.internal.pageSize.getWidth(), qa = ee[Qt];
    Jt = T.charSpace || pi, Xt = T.maxWidth || 0, ae = Object.assign({
      autoencode: !0,
      noBOM: !0
    }, T.flags);
    var Vn = [], Ai = function(de) {
      return Le.getStringUnitWidth(de, {
        font: qa,
        charSpace: Jt,
        fontSize: Ot,
        doKerning: !1
      }) * Ot / yr;
    };
    if (Object.prototype.toString.call(h) === "[object Array]") {
      var ir;
      yt = Gi(h), Tt !== "left" && (wr = yt.map(Ai));
      var or, yn = 0;
      if (Tt === "right") {
        d -= wr[0], h = [], Xe = yt.length;
        for (var Zr = 0; Zr < Xe; Zr++) Zr === 0 ? (or = Jr(d), ir = Xr(P)) : (or = k(yn - wr[Zr]), ir = -Wn), h.push([yt[Zr], or, ir]), yn = wr[Zr];
      } else if (Tt === "center") {
        d -= wr[0] / 2, h = [], Xe = yt.length;
        for (var cn = 0; cn < Xe; cn++) cn === 0 ? (or = Jr(d), ir = Xr(P)) : (or = k((yn - wr[cn]) / 2), ir = -Wn), h.push([yt[cn], or, ir]), yn = wr[cn];
      } else if (Tt === "left") {
        h = [], Xe = yt.length;
        for (var xi = 0; xi < Xe; xi++) h.push(yt[xi]);
      } else if (Tt === "justify" && qa.encoding === "Identity-H") {
        h = [], Xe = yt.length, Xt = Xt !== 0 ? Xt : Ma;
        for (var Gn = 0, xe = 0; xe < Xe; xe++) if (ir = xe === 0 ? Xr(P) : -Wn, or = xe === 0 ? Jr(d) : Gn, xe < Xe - 1) {
          var Ea = k((Xt - wr[xe]) / (yt[xe].split(" ").length - 1)), Nr = yt[xe].split(" ");
          h.push([Nr[0] + " ", or, ir]), Gn = 0;
          for (var ar = 1; ar < Nr.length; ar++) {
            var Yn = (Ai(Nr[ar - 1] + " " + Nr[ar]) - Ai(Nr[ar])) * yr + Ea;
            ar == Nr.length - 1 ? h.push([Nr[ar], Yn, 0]) : h.push([Nr[ar] + " ", Yn, 0]), Gn -= Yn;
          }
        } else h.push([yt[xe], or, ir]);
        h.push(["", Gn, 0]);
      } else {
        if (Tt !== "justify") throw new Error('Unrecognized alignment option, use "left", "center", "right" or "justify".');
        for (h = [], Xe = yt.length, Xt = Xt !== 0 ? Xt : Ma, xe = 0; xe < Xe; xe++) ir = xe === 0 ? Xr(P) : -Wn, or = xe === 0 ? Jr(d) : 0, xe < Xe - 1 ? Vn.push(nt(k((Xt - wr[xe]) / (yt[xe].split(" ").length - 1)))) : Vn.push(0), h.push([yt[xe], or, ir]);
      }
    }
    var Da = typeof T.R2L == "boolean" ? T.R2L : qt;
    Da === !0 && (h = Yi(h, function(we, de, Ve) {
      return [we.split("").reverse().join(""), de, Ve];
    })), $ = {
      text: h,
      x: d,
      y: P,
      options: T,
      mutex: {
        pdfEscape: br,
        activeFontKey: Qt,
        fonts: ee,
        activeFontSize: Ot
      }
    }, le.publish("postProcessText", $), h = $.text, Or = $.mutex.isHex || !1;
    var Zi = ee[Qt].encoding;
    Zi !== "WinAnsiEncoding" && Zi !== "StandardEncoding" || (h = Yi(h, function(we, de, Ve) {
      return [ln(we), de, Ve];
    })), yt = Gi(h), h = [];
    for (var Jn, Xn, wn, Kn = 0, Si = 1, Zn = Array.isArray(yt[0]) ? Si : Kn, Nn = "", $i = function(de, Ve, Se) {
      var hr = "";
      return Se instanceof Gt ? (Se = typeof T.angle == "number" ? an(Se, new Gt(1, 0, 0, 1, de, Ve)) : an(new Gt(1, 0, 0, 1, de, Ve), Se), J === N.ADVANCED && (Se = an(new Gt(1, 0, 0, -1, 0, 0), Se)), hr = Se.join(" ") + ` Tm
`) : hr = nt(de) + " " + nt(Ve) + ` Td
`, hr;
    }, Lr = 0; Lr < yt.length; Lr++) {
      switch (Nn = "", Zn) {
        case Si:
          wn = (Or ? "<" : "(") + yt[Lr][0] + (Or ? ">" : ")"), Jn = parseFloat(yt[Lr][1]), Xn = parseFloat(yt[Lr][2]);
          break;
        case Kn:
          wn = (Or ? "<" : "(") + yt[Lr] + (Or ? ">" : ")"), Jn = Jr(d), Xn = Xr(P);
      }
      Vn !== void 0 && Vn[Lr] !== void 0 && (Nn = Vn[Lr] + ` Tw
`), Lr === 0 ? h.push(Nn + $i(Jn, Xn, Ae) + wn) : Zn === Kn ? h.push(Nn + wn) : Zn === Si && h.push(Nn + $i(Jn, Xn, Ae) + wn);
    }
    h = Zn === Kn ? h.join(` Tj
T* `) : h.join(` Tj
`), h += ` Tj
`;
    var hn = `BT
/`;
    return hn += Qt + " " + Ot + ` Tf
`, hn += nt(Ot * bi) + ` TL
`, hn += Un + `
`, hn += qe, hn += h, j(hn += "ET"), S[Qt] = !0, Le;
  };
  var Fs = g.__private__.clip = g.clip = function(h) {
    return j(h === "evenodd" ? "W*" : "W"), this;
  };
  g.clipEvenOdd = function() {
    return Fs("evenodd");
  }, g.__private__.discardPath = g.discardPath = function() {
    return j("n"), this;
  };
  var Yr = g.__private__.isValidStyle = function(h) {
    var d = !1;
    return [void 0, null, "S", "D", "F", "DF", "FD", "f", "f*", "B", "B*", "n"].indexOf(h) !== -1 && (d = !0), d;
  };
  g.__private__.setDefaultPathOperation = g.setDefaultPathOperation = function(h) {
    return Yr(h) && (m = h), this;
  };
  var Sa = g.__private__.getStyle = g.getStyle = function(h) {
    var d = m;
    switch (h) {
      case "D":
      case "S":
        d = "S";
        break;
      case "F":
        d = "f";
        break;
      case "FD":
      case "DF":
        d = "B";
        break;
      case "f":
      case "f*":
      case "B":
      case "B*":
        d = h;
    }
    return d;
  }, _a = g.close = function() {
    return j("h"), this;
  };
  g.stroke = function() {
    return j("S"), this;
  }, g.fill = function(h) {
    return fi("f", h), this;
  }, g.fillEvenOdd = function(h) {
    return fi("f*", h), this;
  }, g.fillStroke = function(h) {
    return fi("B", h), this;
  }, g.fillStrokeEvenOdd = function(h) {
    return fi("B*", h), this;
  };
  var fi = function(d, P) {
    fe(P) === "object" ? Cs(P, d) : j(d);
  }, Ti = function(d) {
    d === null || J === N.ADVANCED && d === void 0 || (d = Sa(d), j(d));
  };
  function Is(h, d, P, T, Z) {
    var $ = new ti(d || this.boundingBox, P || this.xStep, T || this.yStep, this.gState, Z || this.matrix);
    $.stream = this.stream;
    var yt = h + "$$" + this.cloneIndex++ + "$$";
    return sn(yt, $), $;
  }
  var Cs = function(d, P) {
    var T = Ur[d.key], Z = ue[T];
    if (Z instanceof Cn) j("q"), j(js(P)), Z.gState && g.setGState(Z.gState), j(d.matrix.toString() + " cm"), j("/" + T + " sh"), j("Q");
    else if (Z instanceof ti) {
      var $ = new Gt(1, 0, 0, -1, 0, vn());
      d.matrix && ($ = $.multiply(d.matrix || mr), T = Is.call(Z, d.key, d.boundingBox, d.xStep, d.yStep, $).id), j("q"), j("/Pattern cs"), j("/" + T + " scn"), Z.gState && g.setGState(Z.gState), j(P), j("Q");
    }
  }, js = function(d) {
    switch (d) {
      case "f":
      case "F":
        return "W n";
      case "f*":
        return "W* n";
      case "B":
        return "W S";
      case "B*":
        return "W* S";
      case "S":
        return "W S";
      case "n":
        return "W n";
    }
  }, Ri = g.moveTo = function(h, d) {
    return j(nt(k(h)) + " " + nt(R(d)) + " m"), this;
  }, Pa = g.lineTo = function(h, d) {
    return j(nt(k(h)) + " " + nt(R(d)) + " l"), this;
  }, Cr = g.curveTo = function(h, d, P, T, Z, $) {
    return j([nt(k(h)), nt(R(d)), nt(k(P)), nt(R(T)), nt(k(Z)), nt(R($)), "c"].join(" ")), this;
  };
  g.__private__.line = g.line = function(h, d, P, T, Z) {
    if (isNaN(h) || isNaN(d) || isNaN(P) || isNaN(T) || !Yr(Z)) throw new Error("Invalid arguments passed to jsPDF.line");
    return J === N.COMPAT ? this.lines([[P - h, T - d]], h, d, [1, 1], Z || "S") : this.lines([[P - h, T - d]], h, d, [1, 1]).stroke();
  }, g.__private__.lines = g.lines = function(h, d, P, T, Z, $) {
    var yt, St, Tt, Jt, Xt, ae, ge, Ae, Le, rr, qe, Or;
    if (typeof h == "number" && (Or = P, P = d, d = h, h = Or), T = T || [1, 1], $ = $ || !1, isNaN(d) || isNaN(P) || !Array.isArray(h) || !Array.isArray(T) || !Yr(Z) || typeof $ != "boolean") throw new Error("Invalid arguments passed to jsPDF.lines");
    for (Ri(d, P), yt = T[0], St = T[1], Jt = h.length, rr = d, qe = P, Tt = 0; Tt < Jt; Tt++) (Xt = h[Tt]).length === 2 ? (rr = Xt[0] * yt + rr, qe = Xt[1] * St + qe, Pa(rr, qe)) : (ae = Xt[0] * yt + rr, ge = Xt[1] * St + qe, Ae = Xt[2] * yt + rr, Le = Xt[3] * St + qe, rr = Xt[4] * yt + rr, qe = Xt[5] * St + qe, Cr(ae, ge, Ae, Le, rr, qe));
    return $ && _a(), Ti(Z), this;
  }, g.path = function(h) {
    for (var d = 0; d < h.length; d++) {
      var P = h[d], T = P.c;
      switch (P.op) {
        case "m":
          Ri(T[0], T[1]);
          break;
        case "l":
          Pa(T[0], T[1]);
          break;
        case "c":
          Cr.apply(this, T);
          break;
        case "h":
          _a();
      }
    }
    return this;
  }, g.__private__.rect = g.rect = function(h, d, P, T, Z) {
    if (isNaN(h) || isNaN(d) || isNaN(P) || isNaN(T) || !Yr(Z)) throw new Error("Invalid arguments passed to jsPDF.rect");
    return J === N.COMPAT && (T = -T), j([nt(k(h)), nt(R(d)), nt(k(P)), nt(k(T)), "re"].join(" ")), Ti(Z), this;
  }, g.__private__.triangle = g.triangle = function(h, d, P, T, Z, $, yt) {
    if (isNaN(h) || isNaN(d) || isNaN(P) || isNaN(T) || isNaN(Z) || isNaN($) || !Yr(yt)) throw new Error("Invalid arguments passed to jsPDF.triangle");
    return this.lines([[P - h, T - d], [Z - P, $ - T], [h - Z, d - $]], h, d, [1, 1], yt, !0), this;
  }, g.__private__.roundedRect = g.roundedRect = function(h, d, P, T, Z, $, yt) {
    if (isNaN(h) || isNaN(d) || isNaN(P) || isNaN(T) || isNaN(Z) || isNaN($) || !Yr(yt)) throw new Error("Invalid arguments passed to jsPDF.roundedRect");
    var St = 4 / 3 * (Math.SQRT2 - 1);
    return Z = Math.min(Z, 0.5 * P), $ = Math.min($, 0.5 * T), this.lines([[P - 2 * Z, 0], [Z * St, 0, Z, $ - $ * St, Z, $], [0, T - 2 * $], [0, $ * St, -Z * St, $, -Z, $], [2 * Z - P, 0], [-Z * St, 0, -Z, -$ * St, -Z, -$], [0, 2 * $ - T], [0, -$ * St, Z * St, -$, Z, -$]], h + Z, d, [1, 1], yt, !0), this;
  }, g.__private__.ellipse = g.ellipse = function(h, d, P, T, Z) {
    if (isNaN(h) || isNaN(d) || isNaN(P) || isNaN(T) || !Yr(Z)) throw new Error("Invalid arguments passed to jsPDF.ellipse");
    var $ = 4 / 3 * (Math.SQRT2 - 1) * P, yt = 4 / 3 * (Math.SQRT2 - 1) * T;
    return Ri(h + P, d), Cr(h + P, d - yt, h + $, d - T, h, d - T), Cr(h - $, d - T, h - P, d - yt, h - P, d), Cr(h - P, d + yt, h - $, d + T, h, d + T), Cr(h + $, d + T, h + P, d + yt, h + P, d), Ti(Z), this;
  }, g.__private__.circle = g.circle = function(h, d, P, T) {
    if (isNaN(h) || isNaN(d) || isNaN(P) || !Yr(T)) throw new Error("Invalid arguments passed to jsPDF.circle");
    return this.ellipse(h, d, P, P, T);
  }, g.setFont = function(h, d, P) {
    return P && (d = bt(d, P)), Qt = Aa(h, d, {
      disableWarning: !1
    }), this;
  };
  var Os = g.__private__.getFont = g.getFont = function() {
    return ee[Aa.apply(g, arguments)];
  };
  g.__private__.getFontList = g.getFontList = function() {
    var h, d, P = {};
    for (h in Ce) if (Ce.hasOwnProperty(h)) for (d in P[h] = [], Ce[h]) Ce[h].hasOwnProperty(d) && P[h].push(d);
    return P;
  }, g.addFont = function(h, d, P, T, Z) {
    var $ = ["StandardEncoding", "MacRomanEncoding", "Identity-H", "WinAnsiEncoding"];
    return arguments[3] && $.indexOf(arguments[3]) !== -1 ? Z = arguments[3] : arguments[3] && $.indexOf(arguments[3]) == -1 && (P = bt(P, T)), Z = Z || "Identity-H", wa.call(this, h, d, P, Z);
  };
  var zn, zi = l.lineWidth || 0.200025, Bs = g.__private__.getLineWidth = g.getLineWidth = function() {
    return zi;
  }, di = g.__private__.setLineWidth = g.setLineWidth = function(h) {
    return zi = h, j(nt(k(h)) + " w"), this;
  };
  g.__private__.setLineDash = Wt.API.setLineDash = Wt.API.setLineDashPattern = function(h, d) {
    if (h = h || [], d = d || 0, isNaN(d) || !Array.isArray(h)) throw new Error("Invalid arguments passed to jsPDF.setLineDash");
    return h = h.map(function(P) {
      return nt(k(P));
    }).join(" "), d = nt(k(d)), j("[" + h + "] " + d + " d"), this;
  };
  var ka = g.__private__.getLineHeight = g.getLineHeight = function() {
    return Ot * zn;
  };
  g.__private__.getLineHeight = g.getLineHeight = function() {
    return Ot * zn;
  };
  var Fa = g.__private__.setLineHeightFactor = g.setLineHeightFactor = function(h) {
    return typeof (h = h || 1.15) == "number" && (zn = h), this;
  }, Ia = g.__private__.getLineHeightFactor = g.getLineHeightFactor = function() {
    return zn;
  };
  Fa(l.lineHeight);
  var Jr = g.__private__.getHorizontalCoordinate = function(h) {
    return k(h);
  }, Xr = g.__private__.getVerticalCoordinate = function(h) {
    return J === N.ADVANCED ? h : Zt[x].mediaBox.topRightY - Zt[x].mediaBox.bottomLeftY - k(h);
  }, Ms = g.__private__.getHorizontalCoordinateString = g.getHorizontalCoordinateString = function(h) {
    return nt(Jr(h));
  }, qs = g.__private__.getVerticalCoordinateString = g.getVerticalCoordinateString = function(h) {
    return nt(Xr(h));
  }, jr = l.strokeColor || "0 G";
  g.__private__.getStrokeColor = g.getDrawColor = function() {
    return Vr(jr);
  }, g.__private__.setStrokeColor = g.setDrawColor = function(h, d, P, T) {
    return jr = kr({
      ch1: h,
      ch2: d,
      ch3: P,
      ch4: T,
      pdfColorType: "draw",
      precision: 2
    }), j(jr), this;
  };
  var Kr = l.fillColor || "0 g";
  g.__private__.getFillColor = g.getFillColor = function() {
    return Vr(Kr);
  }, g.__private__.setFillColor = g.setFillColor = function(h, d, P, T) {
    return Kr = kr({
      ch1: h,
      ch2: d,
      ch3: P,
      ch4: T,
      pdfColorType: "fill",
      precision: 2
    }), j(Kr), this;
  };
  var Un = l.textColor || "0 g", Es = g.__private__.getTextColor = g.getTextColor = function() {
    return Vr(Un);
  };
  g.__private__.setTextColor = g.setTextColor = function(h, d, P, T) {
    return Un = kr({
      ch1: h,
      ch2: d,
      ch3: P,
      ch4: T,
      pdfColorType: "text",
      precision: 3
    }), this;
  };
  var pi = l.charSpace, Ds = g.__private__.getCharSpace = g.getCharSpace = function() {
    return parseFloat(pi || 0);
  };
  g.__private__.setCharSpace = g.setCharSpace = function(h) {
    if (isNaN(h)) throw new Error("Invalid argument passed to jsPDF.setCharSpace");
    return pi = h, this;
  };
  var Ui = 0;
  g.CapJoinStyles = {
    0: 0,
    butt: 0,
    but: 0,
    miter: 0,
    1: 1,
    round: 1,
    rounded: 1,
    circle: 1,
    2: 2,
    projecting: 2,
    project: 2,
    square: 2,
    bevel: 2
  }, g.__private__.setLineCap = g.setLineCap = function(h) {
    var d = g.CapJoinStyles[h];
    if (d === void 0) throw new Error("Line cap style of '" + h + "' is not recognized. See or extend .CapJoinStyles property for valid styles");
    return Ui = d, j(d + " J"), this;
  };
  var Hi = 0;
  g.__private__.setLineJoin = g.setLineJoin = function(h) {
    var d = g.CapJoinStyles[h];
    if (d === void 0) throw new Error("Line join style of '" + h + "' is not recognized. See or extend .CapJoinStyles property for valid styles");
    return Hi = d, j(d + " j"), this;
  }, g.__private__.setLineMiterLimit = g.__private__.setMiterLimit = g.setLineMiterLimit = g.setMiterLimit = function(h) {
    if (h = h || 0, isNaN(h)) throw new Error("Invalid argument passed to jsPDF.setLineMiterLimit");
    return j(nt(k(h)) + " M"), this;
  }, g.GState = pa, g.setGState = function(h) {
    (h = typeof h == "string" ? _e[nn[h]] : Ca(null, h)).equals(_r) || (j("/" + h.id + " gs"), _r = h);
  };
  var Ca = function(d, P) {
    if (!d || !nn[d]) {
      var T = !1;
      for (var Z in _e) if (_e.hasOwnProperty(Z) && _e[Z].equals(P)) {
        T = !0;
        break;
      }
      if (T) P = _e[Z];
      else {
        var $ = "GS" + (Object.keys(_e).length + 1).toString(10);
        _e[$] = P, P.id = $;
      }
      return d && (nn[d] = P.id), le.publish("addGState", P), P;
    }
  };
  g.addGState = function(h, d) {
    return Ca(h, d), this;
  }, g.saveGraphicsState = function() {
    return j("q"), zr.push({
      key: Qt,
      size: Ot,
      color: Un
    }), this;
  }, g.restoreGraphicsState = function() {
    j("Q");
    var h = zr.pop();
    return Qt = h.key, Ot = h.size, Un = h.color, _r = null, this;
  }, g.setCurrentTransformationMatrix = function(h) {
    return j(h.toString() + " cm"), this;
  }, g.comment = function(h) {
    return j("#" + h), this;
  };
  var gi = function(d, P) {
    var T = d || 0;
    Object.defineProperty(this, "x", {
      enumerable: !0,
      get: function() {
        return T;
      },
      set: function(St) {
        isNaN(St) || (T = parseFloat(St));
      }
    });
    var Z = P || 0;
    Object.defineProperty(this, "y", {
      enumerable: !0,
      get: function() {
        return Z;
      },
      set: function(St) {
        isNaN(St) || (Z = parseFloat(St));
      }
    });
    var $ = "pt";
    return Object.defineProperty(this, "type", {
      enumerable: !0,
      get: function() {
        return $;
      },
      set: function(St) {
        $ = St.toString();
      }
    }), this;
  }, ja = function(d, P, T, Z) {
    gi.call(this, d, P), this.type = "rect";
    var $ = T || 0;
    Object.defineProperty(this, "w", {
      enumerable: !0,
      get: function() {
        return $;
      },
      set: function(Tt) {
        isNaN(Tt) || ($ = parseFloat(Tt));
      }
    });
    var yt = Z || 0;
    return Object.defineProperty(this, "h", {
      enumerable: !0,
      get: function() {
        return yt;
      },
      set: function(Tt) {
        isNaN(Tt) || (yt = parseFloat(Tt));
      }
    }), this;
  }, mi = function() {
    this.page = Pe, this.currentPage = x, this.pages = Lt.slice(0), this.pagesContext = Zt.slice(0), this.x = er, this.y = ye, this.matrix = He, this.width = Wi(x), this.height = vn(x), this.outputDestination = Ft, this.id = "", this.objectNumber = -1;
  };
  mi.prototype.restore = function() {
    Pe = this.page, x = this.currentPage, Zt = this.pagesContext, Lt = this.pages, er = this.x, ye = this.y, He = this.matrix, Hn(x, this.width), Vi(x, this.height), Ft = this.outputDestination;
  };
  var Oa = function(d, P, T, Z, $) {
    Wr.push(new mi()), Pe = x = 0, Lt = [], er = d, ye = P, He = $, on([T, Z]);
  }, Ts = function(d) {
    if (Hr[d]) Wr.pop().restore();
    else {
      var P = new mi(), T = "Xo" + (Object.keys(Ye).length + 1).toString(10);
      P.id = T, Hr[d] = T, Ye[T] = P, le.publish("addFormObject", P), Wr.pop().restore();
    }
  };
  for (var vi in g.beginFormObject = function(h, d, P, T, Z) {
    return Oa(h, d, P, T, Z), this;
  }, g.endFormObject = function(h) {
    return Ts(h), this;
  }, g.doFormObject = function(h, d) {
    var P = Ye[Hr[h]];
    return j("q"), j(d.toString() + " cm"), j("/" + P.id + " Do"), j("Q"), this;
  }, g.getFormObject = function(h) {
    var d = Ye[Hr[h]];
    return {
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      matrix: d.matrix
    };
  }, g.save = function(h, d) {
    return h = h || "generated.pdf", (d = d || {}).returnPromise = d.returnPromise || !1, d.returnPromise === !1 ? (Qn(hi(un()), h), typeof Qn.unload == "function" && Yt.setTimeout && setTimeout(Qn.unload, 911), this) : new Promise(function(P, T) {
      try {
        var Z = Qn(hi(un()), h);
        typeof Qn.unload == "function" && Yt.setTimeout && setTimeout(Qn.unload, 911), P(Z);
      } catch ($) {
        T($.message);
      }
    });
  }, Wt.API) Wt.API.hasOwnProperty(vi) && (vi === "events" && Wt.API.events.length ? function(h, d) {
    var P, T, Z;
    for (Z = d.length - 1; Z !== -1; Z--) P = d[Z][0], T = d[Z][1], h.subscribe.apply(h, [P].concat(typeof T == "function" ? [T] : T));
  }(le, Wt.API.events) : g[vi] = Wt.API[vi]);
  var Wi = g.getPageWidth = function(h) {
    return (Zt[h = h || x].mediaBox.topRightX - Zt[h].mediaBox.bottomLeftX) / Ct;
  }, Hn = g.setPageWidth = function(h, d) {
    Zt[h].mediaBox.topRightX = d * Ct + Zt[h].mediaBox.bottomLeftX;
  }, vn = g.getPageHeight = function(h) {
    return (Zt[h = h || x].mediaBox.topRightY - Zt[h].mediaBox.bottomLeftY) / Ct;
  }, Vi = g.setPageHeight = function(h, d) {
    Zt[h].mediaBox.topRightY = d * Ct + Zt[h].mediaBox.bottomLeftY;
  };
  return g.internal = {
    pdfEscape: br,
    getStyle: Sa,
    getFont: Os,
    getFontSize: Mt,
    getCharSpace: Ds,
    getTextColor: Es,
    getLineHeight: ka,
    getLineHeightFactor: Ia,
    getLineWidth: Bs,
    write: mt,
    getHorizontalCoordinate: Jr,
    getVerticalCoordinate: Xr,
    getCoordinateString: Ms,
    getVerticalCoordinateString: qs,
    collections: {},
    newObject: ke,
    newAdditionalObject: En,
    newObjectDeferred: Re,
    newObjectDeferredBegin: We,
    getFilters: Fr,
    putStream: vr,
    events: le,
    scaleFactor: Ct,
    pageSize: {
      getWidth: function() {
        return Wi(x);
      },
      setWidth: function(d) {
        Hn(x, d);
      },
      getHeight: function() {
        return vn(x);
      },
      setHeight: function(d) {
        Vi(x, d);
      }
    },
    encryptionOptions: A,
    encryption: Je,
    getEncryptor: Ps,
    output: _s,
    getNumberOfPages: Ns,
    pages: Lt,
    out: j,
    f2: at,
    f3: M,
    getPageInfo: xa,
    getPageInfoByObjId: ks,
    getCurrentPageInfo: Kt,
    getPDFVersion: F,
    Point: gi,
    Rectangle: ja,
    Matrix: Gt,
    hasHotfix: Rn
  }, Object.defineProperty(g.internal.pageSize, "width", {
    get: function() {
      return Wi(x);
    },
    set: function(d) {
      Hn(x, d);
    },
    enumerable: !0,
    configurable: !0
  }), Object.defineProperty(g.internal.pageSize, "height", {
    get: function() {
      return vn(x);
    },
    set: function(d) {
      Vi(x, d);
    },
    enumerable: !0,
    configurable: !0
  }), Na.call(g, At), Qt = "F1", Ei(s, r), le.publish("initialized"), g;
}
Oi.prototype.lsbFirstWord = function(l) {
  return String.fromCharCode(l >> 0 & 255, l >> 8 & 255, l >> 16 & 255, l >> 24 & 255);
}, Oi.prototype.toHexString = function(l) {
  return l.split("").map(function(e) {
    return ("0" + (255 & e.charCodeAt(0)).toString(16)).slice(-2);
  }).join("");
}, Oi.prototype.hexToBytes = function(l) {
  for (var e = [], r = 0; r < l.length; r += 2) e.push(String.fromCharCode(parseInt(l.substr(r, 2), 16)));
  return e.join("");
}, Oi.prototype.processOwnerPassword = function(l, e) {
  return Lo(No(e).substr(0, 5), l);
}, Oi.prototype.encryptor = function(l, e) {
  var r = No(this.encryptionKey + String.fromCharCode(255 & l, l >> 8 & 255, l >> 16 & 255, 255 & e, e >> 8 & 255)).substr(0, 10);
  return function(n) {
    return Lo(r, n);
  };
}, pa.prototype.equals = function(l) {
  var e, r = "id,objectNumber,equals";
  if (!l || fe(l) !== fe(this)) return !1;
  var n = 0;
  for (e in this) if (!(r.indexOf(e) >= 0)) {
    if (this.hasOwnProperty(e) && !l.hasOwnProperty(e) || this[e] !== l[e]) return !1;
    n++;
  }
  for (e in l) l.hasOwnProperty(e) && r.indexOf(e) < 0 && n--;
  return n === 0;
}, Wt.API = {
  events: []
}, Wt.version = "3.0.1";
var Ie = Wt.API, ko = 1, ai = function(e) {
  return e.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}, Ci = function(e) {
  return e.replace(/\\\\/g, "\\").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
}, $t = function(e) {
  return e.toFixed(2);
}, In = function(e) {
  return e.toFixed(5);
};
Ie.__acroform__ = {};
var cr = function(e, r) {
  e.prototype = Object.create(r.prototype), e.prototype.constructor = e;
}, cu = function(e) {
  return e * ko;
}, Qr = function(e) {
  var r = new qu(), n = Et.internal.getHeight(e) || 0, s = Et.internal.getWidth(e) || 0;
  return r.BBox = [0, 0, Number($t(s)), Number($t(n))], r;
}, Gl = Ie.__acroform__.setBit = function(l, e) {
  if (l = l || 0, e = e || 0, isNaN(l) || isNaN(e)) throw new Error("Invalid arguments passed to jsPDF.API.__acroform__.setBit");
  return l |= 1 << e;
}, Yl = Ie.__acroform__.clearBit = function(l, e) {
  if (l = l || 0, e = e || 0, isNaN(l) || isNaN(e)) throw new Error("Invalid arguments passed to jsPDF.API.__acroform__.clearBit");
  return l &= ~(1 << e);
}, Jl = Ie.__acroform__.getBit = function(l, e) {
  if (isNaN(l) || isNaN(e)) throw new Error("Invalid arguments passed to jsPDF.API.__acroform__.getBit");
  return (l & 1 << e) == 0 ? 0 : 1;
}, je = Ie.__acroform__.getBitForPdf = function(l, e) {
  if (isNaN(l) || isNaN(e)) throw new Error("Invalid arguments passed to jsPDF.API.__acroform__.getBitForPdf");
  return Jl(l, e - 1);
}, Oe = Ie.__acroform__.setBitForPdf = function(l, e) {
  if (isNaN(l) || isNaN(e)) throw new Error("Invalid arguments passed to jsPDF.API.__acroform__.setBitForPdf");
  return Gl(l, e - 1);
}, Be = Ie.__acroform__.clearBitForPdf = function(l, e) {
  if (isNaN(l) || isNaN(e)) throw new Error("Invalid arguments passed to jsPDF.API.__acroform__.clearBitForPdf");
  return Yl(l, e - 1);
}, Xl = Ie.__acroform__.calculateCoordinates = function(l, e) {
  var r = e.internal.getHorizontalCoordinate, n = e.internal.getVerticalCoordinate, s = l[0], a = l[1], o = l[2], f = l[3], c = {};
  return c.lowerLeft_X = r(s) || 0, c.lowerLeft_Y = n(a + f) || 0, c.upperRight_X = r(s + o) || 0, c.upperRight_Y = n(a) || 0, [Number($t(c.lowerLeft_X)), Number($t(c.lowerLeft_Y)), Number($t(c.upperRight_X)), Number($t(c.upperRight_Y))];
}, Kl = function(e) {
  if (e.appearanceStreamContent) return e.appearanceStreamContent;
  if (e.V || e.DV) {
    var r = [], n = e._V || e.DV, s = Ao(e, n), a = e.scope.internal.getFont(e.fontName, e.fontStyle).id;
    r.push("/Tx BMC"), r.push("q"), r.push("BT"), r.push(e.scope.__private__.encodeColorString(e.color)), r.push("/" + a + " " + $t(s.fontSize) + " Tf"), r.push("1 0 0 1 0 0 Tm"), r.push(s.text), r.push("ET"), r.push("Q"), r.push("EMC");
    var o = Qr(e);
    return o.scope = e.scope, o.stream = r.join(`
`), o;
  }
}, Ao = function(e, r) {
  var n = e.fontSize === 0 ? e.maxFontSize : e.fontSize, s = {
    text: "",
    fontSize: ""
  }, a = (r = (r = r.substr(0, 1) == "(" ? r.substr(1) : r).substr(r.length - 1) == ")" ? r.substr(0, r.length - 1) : r).split(" ");
  a = e.multiline ? a.map(function(k) {
    return k.split(`
`);
  }) : a.map(function(k) {
    return [k];
  });
  var o = n, f = Et.internal.getHeight(e) || 0;
  f = f < 0 ? -f : f;
  var c = Et.internal.getWidth(e) || 0;
  c = c < 0 ? -c : c;
  var m = function(D, R, ot) {
    if (D + 1 < a.length) {
      var st = R + " " + a[D + 1][0];
      return ss(st, e, ot).width <= c - 4;
    }
    return !1;
  };
  o++;
  t: for (; o > 0; ) {
    r = "", o--;
    var A, b, S = ss("3", e, o).height, g = e.multiline ? f - o : (f - S) / 2, B = g += 2, F = 0, O = 0, I = 0;
    if (o <= 0) {
      r = `(...) Tj
`, r += "% Width of Text: " + ss(r, e, o = 12).width + ", FieldWidth:" + c + `
`;
      break;
    }
    for (var N = "", J = 0, et = 0; et < a.length; et++) if (a.hasOwnProperty(et)) {
      var ct = !1;
      if (a[et].length !== 1 && I !== a[et].length - 1) {
        if ((S + 2) * (J + 2) + 2 > f) continue t;
        N += a[et][I], ct = !0, O = et, et--;
      } else {
        N = (N += a[et][I] + " ").substr(N.length - 1) == " " ? N.substr(0, N.length - 1) : N;
        var bt = parseInt(et), nt = m(bt, N, o), dt = et >= a.length - 1;
        if (nt && !dt) {
          N += " ", I = 0;
          continue;
        }
        if (nt || dt) {
          if (dt) O = bt;
          else if (e.multiline && (S + 2) * (J + 2) + 2 > f) continue t;
        } else {
          if (!e.multiline || (S + 2) * (J + 2) + 2 > f) continue t;
          O = bt;
        }
      }
      for (var z = "", at = F; at <= O; at++) {
        var M = a[at];
        if (e.multiline) {
          if (at === O) {
            z += M[I] + " ", I = (I + 1) % M.length;
            continue;
          }
          if (at === F) {
            z += M[M.length - 1] + " ";
            continue;
          }
        }
        z += M[0] + " ";
      }
      switch (z = z.substr(z.length - 1) == " " ? z.substr(0, z.length - 1) : z, b = ss(z, e, o).width, e.textAlign) {
        case "right":
          A = c - b - 2;
          break;
        case "center":
          A = (c - b) / 2;
          break;
        case "left":
        default:
          A = 2;
      }
      r += $t(A) + " " + $t(B) + ` Td
`, r += "(" + ai(z) + `) Tj
`, r += -$t(A) + ` 0 Td
`, B = -(o + 2), b = 0, F = ct ? O : O + 1, J++, N = "";
    }
    break;
  }
  return s.text = r, s.fontSize = o, s;
}, ss = function(e, r, n) {
  var s = r.scope.internal.getFont(r.fontName, r.fontStyle), a = r.scope.getStringUnitWidth(e, {
    font: s,
    fontSize: parseFloat(n),
    charSpace: 0
  }) * parseFloat(n);
  return {
    height: r.scope.getStringUnitWidth("3", {
      font: s,
      fontSize: parseFloat(n),
      charSpace: 0
    }) * parseFloat(n) * 1.5,
    width: a
  };
}, Zl = {
  fields: [],
  xForms: [],
  acroFormDictionaryRoot: null,
  printedOut: !1,
  internal: null,
  isInitialized: !1
}, $l = function(e, r) {
  var n = {
    type: "reference",
    object: e
  };
  r.internal.getPageInfo(e.page).pageContext.annotations.find(function(s) {
    return s.type === n.type && s.object === n.object;
  }) === void 0 && r.internal.getPageInfo(e.page).pageContext.annotations.push(n);
}, Ql = function(e, r) {
  for (var n in e) if (e.hasOwnProperty(n)) {
    var s = n, a = e[n];
    r.internal.newObjectDeferredBegin(a.objId, !0), fe(a) === "object" && typeof a.putStream == "function" && a.putStream(), delete e[s];
  }
}, tc = function(e, r) {
  if (r.scope = e, e.internal !== void 0 && (e.internal.acroformPlugin === void 0 || e.internal.acroformPlugin.isInitialized === !1)) {
    if (Tr.FieldNum = 0, e.internal.acroformPlugin = JSON.parse(JSON.stringify(Zl)), e.internal.acroformPlugin.acroFormDictionaryRoot) throw new Error("Exception while creating AcroformDictionary");
    ko = e.internal.scaleFactor, e.internal.acroformPlugin.acroFormDictionaryRoot = new Eu(), e.internal.acroformPlugin.acroFormDictionaryRoot.scope = e, e.internal.acroformPlugin.acroFormDictionaryRoot._eventID = e.internal.events.subscribe("postPutResources", function() {
      (function(n) {
        n.internal.events.unsubscribe(n.internal.acroformPlugin.acroFormDictionaryRoot._eventID), delete n.internal.acroformPlugin.acroFormDictionaryRoot._eventID, n.internal.acroformPlugin.printedOut = !0;
      })(e);
    }), e.internal.events.subscribe("buildDocument", function() {
      (function(n) {
        n.internal.acroformPlugin.acroFormDictionaryRoot.objId = void 0;
        var s = n.internal.acroformPlugin.acroFormDictionaryRoot.Fields;
        for (var a in s) if (s.hasOwnProperty(a)) {
          var o = s[a];
          o.objId = void 0, o.hasAnnotation && $l(o, n);
        }
      })(e);
    }), e.internal.events.subscribe("putCatalog", function() {
      (function(n) {
        if (n.internal.acroformPlugin.acroFormDictionaryRoot === void 0) throw new Error("putCatalogCallback: Root missing.");
        n.internal.write("/AcroForm " + n.internal.acroformPlugin.acroFormDictionaryRoot.objId + " 0 R");
      })(e);
    }), e.internal.events.subscribe("postPutPages", function(n) {
      (function(s, a) {
        var o = !s;
        for (var f in s || (a.internal.newObjectDeferredBegin(a.internal.acroformPlugin.acroFormDictionaryRoot.objId, !0), a.internal.acroformPlugin.acroFormDictionaryRoot.putStream()), s = s || a.internal.acroformPlugin.acroFormDictionaryRoot.Kids) if (s.hasOwnProperty(f)) {
          var c = s[f], m = [], A = c.Rect;
          if (c.Rect && (c.Rect = Xl(c.Rect, a)), a.internal.newObjectDeferredBegin(c.objId, !0), c.DA = Et.createDefaultAppearanceStream(c), fe(c) === "object" && typeof c.getKeyValueListForStream == "function" && (m = c.getKeyValueListForStream()), c.Rect = A, c.hasAppearanceStream && !c.appearanceStreamContent) {
            var b = Kl(c);
            m.push({
              key: "AP",
              value: "<</N " + b + ">>"
            }), a.internal.acroformPlugin.xForms.push(b);
          }
          if (c.appearanceStreamContent) {
            var S = "";
            for (var g in c.appearanceStreamContent) if (c.appearanceStreamContent.hasOwnProperty(g)) {
              var B = c.appearanceStreamContent[g];
              if (S += "/" + g + " ", S += "<<", Object.keys(B).length >= 1 || Array.isArray(B)) {
                for (var f in B) if (B.hasOwnProperty(f)) {
                  var F = B[f];
                  typeof F == "function" && (F = F.call(a, c)), S += "/" + f + " " + F + " ", a.internal.acroformPlugin.xForms.indexOf(F) >= 0 || a.internal.acroformPlugin.xForms.push(F);
                }
              } else typeof (F = B) == "function" && (F = F.call(a, c)), S += "/" + f + " " + F, a.internal.acroformPlugin.xForms.indexOf(F) >= 0 || a.internal.acroformPlugin.xForms.push(F);
              S += ">>";
            }
            m.push({
              key: "AP",
              value: `<<
` + S + ">>"
            });
          }
          a.internal.putStream({
            additionalKeyValues: m,
            objectId: c.objId
          }), a.internal.out("endobj");
        }
        o && Ql(a.internal.acroformPlugin.xForms, a);
      })(n, e);
    }), e.internal.acroformPlugin.isInitialized = !0;
  }
}, Mu = Ie.__acroform__.arrayToPdfArray = function(l, e, r) {
  var n = function(f) {
    return f;
  };
  if (Array.isArray(l)) {
    for (var s = "[", a = 0; a < l.length; a++) switch (a !== 0 && (s += " "), fe(l[a])) {
      case "boolean":
      case "number":
      case "object":
        s += l[a].toString();
        break;
      case "string":
        l[a].substr(0, 1) !== "/" ? (e !== void 0 && r && (n = r.internal.getEncryptor(e)), s += "(" + ai(n(l[a].toString())) + ")") : s += l[a].toString();
    }
    return s += "]";
  }
  throw new Error("Invalid argument passed to jsPDF.__acroform__.arrayToPdfArray");
}, ho = function(e, r, n) {
  var s = function(o) {
    return o;
  };
  return r !== void 0 && n && (s = n.internal.getEncryptor(r)), (e = e || "").toString(), e = "(" + ai(s(e)) + ")";
}, tn = function() {
  this._objId = void 0, this._scope = void 0, Object.defineProperty(this, "objId", {
    get: function() {
      if (this._objId === void 0) {
        if (this.scope === void 0) return;
        this._objId = this.scope.internal.newObjectDeferred();
      }
      return this._objId;
    },
    set: function(r) {
      this._objId = r;
    }
  }), Object.defineProperty(this, "scope", {
    value: this._scope,
    writable: !0
  });
};
tn.prototype.toString = function() {
  return this.objId + " 0 R";
}, tn.prototype.putStream = function() {
  var l = this.getKeyValueListForStream();
  this.scope.internal.putStream({
    data: this.stream,
    additionalKeyValues: l,
    objectId: this.objId
  }), this.scope.internal.out("endobj");
}, tn.prototype.getKeyValueListForStream = function() {
  var l = [], e = Object.getOwnPropertyNames(this).filter(function(a) {
    return a != "content" && a != "appearanceStreamContent" && a != "scope" && a != "objId" && a.substring(0, 1) != "_";
  });
  for (var r in e) if (Object.getOwnPropertyDescriptor(this, e[r]).configurable === !1) {
    var n = e[r], s = this[n];
    s && (Array.isArray(s) ? l.push({
      key: n,
      value: Mu(s, this.objId, this.scope)
    }) : s instanceof tn ? (s.scope = this.scope, l.push({
      key: n,
      value: s.objId + " 0 R"
    })) : typeof s != "function" && l.push({
      key: n,
      value: s
    }));
  }
  return l;
};
var qu = function() {
  tn.call(this), Object.defineProperty(this, "Type", {
    value: "/XObject",
    configurable: !1,
    writable: !0
  }), Object.defineProperty(this, "Subtype", {
    value: "/Form",
    configurable: !1,
    writable: !0
  }), Object.defineProperty(this, "FormType", {
    value: 1,
    configurable: !1,
    writable: !0
  });
  var e, r = [];
  Object.defineProperty(this, "BBox", {
    configurable: !1,
    get: function() {
      return r;
    },
    set: function(s) {
      r = s;
    }
  }), Object.defineProperty(this, "Resources", {
    value: "2 0 R",
    configurable: !1,
    writable: !0
  }), Object.defineProperty(this, "stream", {
    enumerable: !1,
    configurable: !0,
    set: function(s) {
      e = s.trim();
    },
    get: function() {
      return e || null;
    }
  });
};
cr(qu, tn);
var Eu = function() {
  tn.call(this);
  var e, r = [];
  Object.defineProperty(this, "Kids", {
    enumerable: !1,
    configurable: !0,
    get: function() {
      return r.length > 0 ? r : void 0;
    }
  }), Object.defineProperty(this, "Fields", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      return r;
    }
  }), Object.defineProperty(this, "DA", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      if (e) {
        var s = function(o) {
          return o;
        };
        return this.scope && (s = this.scope.internal.getEncryptor(this.objId)), "(" + ai(s(e)) + ")";
      }
    },
    set: function(s) {
      e = s;
    }
  });
};
cr(Eu, tn);
var Tr = function l() {
  tn.call(this);
  var e = 4;
  Object.defineProperty(this, "F", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      return e;
    },
    set: function(N) {
      if (isNaN(N)) throw new Error('Invalid value "' + N + '" for attribute F supplied.');
      e = N;
    }
  }), Object.defineProperty(this, "showWhenPrinted", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(e, 3);
    },
    set: function(N) {
      N ? this.F = Oe(e, 3) : this.F = Be(e, 3);
    }
  });
  var r = 0;
  Object.defineProperty(this, "Ff", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      return r;
    },
    set: function(N) {
      if (isNaN(N)) throw new Error('Invalid value "' + N + '" for attribute Ff supplied.');
      r = N;
    }
  });
  var n = [];
  Object.defineProperty(this, "Rect", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      if (n.length !== 0) return n;
    },
    set: function(N) {
      n = N !== void 0 ? N : [];
    }
  }), Object.defineProperty(this, "x", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !n || isNaN(n[0]) ? 0 : n[0];
    },
    set: function(N) {
      n[0] = N;
    }
  }), Object.defineProperty(this, "y", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !n || isNaN(n[1]) ? 0 : n[1];
    },
    set: function(N) {
      n[1] = N;
    }
  }), Object.defineProperty(this, "width", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !n || isNaN(n[2]) ? 0 : n[2];
    },
    set: function(N) {
      n[2] = N;
    }
  }), Object.defineProperty(this, "height", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !n || isNaN(n[3]) ? 0 : n[3];
    },
    set: function(N) {
      n[3] = N;
    }
  });
  var s = "";
  Object.defineProperty(this, "FT", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      return s;
    },
    set: function(N) {
      switch (N) {
        case "/Btn":
        case "/Tx":
        case "/Ch":
        case "/Sig":
          s = N;
          break;
        default:
          throw new Error('Invalid value "' + N + '" for attribute FT supplied.');
      }
    }
  });
  var a = null;
  Object.defineProperty(this, "T", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      if (!a || a.length < 1) {
        if (this instanceof ls) return;
        a = "FieldObject" + l.FieldNum++;
      }
      var N = function(et) {
        return et;
      };
      return this.scope && (N = this.scope.internal.getEncryptor(this.objId)), "(" + ai(N(a)) + ")";
    },
    set: function(N) {
      a = N.toString();
    }
  }), Object.defineProperty(this, "fieldName", {
    configurable: !0,
    enumerable: !0,
    get: function() {
      return a;
    },
    set: function(N) {
      a = N;
    }
  });
  var o = "helvetica";
  Object.defineProperty(this, "fontName", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return o;
    },
    set: function(N) {
      o = N;
    }
  });
  var f = "normal";
  Object.defineProperty(this, "fontStyle", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return f;
    },
    set: function(N) {
      f = N;
    }
  });
  var c = 0;
  Object.defineProperty(this, "fontSize", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return c;
    },
    set: function(N) {
      c = N;
    }
  });
  var m = void 0;
  Object.defineProperty(this, "maxFontSize", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return m === void 0 ? 50 / ko : m;
    },
    set: function(N) {
      m = N;
    }
  });
  var A = "black";
  Object.defineProperty(this, "color", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return A;
    },
    set: function(N) {
      A = N;
    }
  });
  var b = "/F1 0 Tf 0 g";
  Object.defineProperty(this, "DA", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      if (!(!b || this instanceof ls || this instanceof On)) return ho(b, this.objId, this.scope);
    },
    set: function(N) {
      N = N.toString(), b = N;
    }
  });
  var S = null;
  Object.defineProperty(this, "DV", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      if (S) return this instanceof Te ? S : ho(S, this.objId, this.scope);
    },
    set: function(N) {
      N = N.toString(), S = this instanceof Te ? N : N.substr(0, 1) === "(" ? Ci(N.substr(1, N.length - 2)) : Ci(N);
    }
  }), Object.defineProperty(this, "defaultValue", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return this instanceof Te ? Ci(S.substr(1, S.length - 1)) : S;
    },
    set: function(N) {
      N = N.toString(), S = this instanceof Te ? "/" + N : N;
    }
  });
  var g = null;
  Object.defineProperty(this, "_V", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      if (g) return g;
    },
    set: function(N) {
      this.V = N;
    }
  }), Object.defineProperty(this, "V", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      if (g) return this instanceof Te ? g : ho(g, this.objId, this.scope);
    },
    set: function(N) {
      N = N.toString(), g = this instanceof Te ? N : N.substr(0, 1) === "(" ? Ci(N.substr(1, N.length - 2)) : Ci(N);
    }
  }), Object.defineProperty(this, "value", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return this instanceof Te ? Ci(g.substr(1, g.length - 1)) : g;
    },
    set: function(N) {
      N = N.toString(), g = this instanceof Te ? "/" + N : N;
    }
  }), Object.defineProperty(this, "hasAnnotation", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return this.Rect;
    }
  }), Object.defineProperty(this, "Type", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      return this.hasAnnotation ? "/Annot" : null;
    }
  }), Object.defineProperty(this, "Subtype", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      return this.hasAnnotation ? "/Widget" : null;
    }
  });
  var B, F = !1;
  Object.defineProperty(this, "hasAppearanceStream", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return F;
    },
    set: function(N) {
      N = !!N, F = N;
    }
  }), Object.defineProperty(this, "page", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      if (B) return B;
    },
    set: function(N) {
      B = N;
    }
  }), Object.defineProperty(this, "readOnly", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 1);
    },
    set: function(N) {
      N ? this.Ff = Oe(this.Ff, 1) : this.Ff = Be(this.Ff, 1);
    }
  }), Object.defineProperty(this, "required", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 2);
    },
    set: function(N) {
      N ? this.Ff = Oe(this.Ff, 2) : this.Ff = Be(this.Ff, 2);
    }
  }), Object.defineProperty(this, "noExport", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 3);
    },
    set: function(N) {
      N ? this.Ff = Oe(this.Ff, 3) : this.Ff = Be(this.Ff, 3);
    }
  });
  var O = null;
  Object.defineProperty(this, "Q", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      if (O !== null) return O;
    },
    set: function(N) {
      if ([0, 1, 2].indexOf(N) === -1) throw new Error('Invalid value "' + N + '" for attribute Q supplied.');
      O = N;
    }
  }), Object.defineProperty(this, "textAlign", {
    get: function() {
      var N;
      switch (O) {
        case 0:
        default:
          N = "left";
          break;
        case 1:
          N = "center";
          break;
        case 2:
          N = "right";
      }
      return N;
    },
    configurable: !0,
    enumerable: !0,
    set: function(N) {
      switch (N) {
        case "right":
        case 2:
          O = 2;
          break;
        case "center":
        case 1:
          O = 1;
          break;
        case "left":
        case 0:
        default:
          O = 0;
      }
    }
  });
};
cr(Tr, tn);
var ei = function() {
  Tr.call(this), this.FT = "/Ch", this.V = "()", this.fontName = "zapfdingbats";
  var e = 0;
  Object.defineProperty(this, "TI", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      return e;
    },
    set: function(s) {
      e = s;
    }
  }), Object.defineProperty(this, "topIndex", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return e;
    },
    set: function(s) {
      e = s;
    }
  });
  var r = [];
  Object.defineProperty(this, "Opt", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      return Mu(r, this.objId, this.scope);
    },
    set: function(s) {
      var a, o;
      o = [], typeof (a = s) == "string" && (o = function(f, c, m) {
        m || (m = 1);
        for (var A, b = []; A = c.exec(f); ) b.push(A[m]);
        return b;
      }(a, /\((.*?)\)/g)), r = o;
    }
  }), this.getOptions = function() {
    return r;
  }, this.setOptions = function(n) {
    r = n, this.sort && r.sort();
  }, this.addOption = function(n) {
    n = (n = n || "").toString(), r.push(n), this.sort && r.sort();
  }, this.removeOption = function(n, s) {
    for (s = s || !1, n = (n = n || "").toString(); r.indexOf(n) !== -1 && (r.splice(r.indexOf(n), 1), s !== !1); ) ;
  }, Object.defineProperty(this, "combo", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 18);
    },
    set: function(s) {
      s ? this.Ff = Oe(this.Ff, 18) : this.Ff = Be(this.Ff, 18);
    }
  }), Object.defineProperty(this, "edit", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 19);
    },
    set: function(s) {
      this.combo === !0 && (s ? this.Ff = Oe(this.Ff, 19) : this.Ff = Be(this.Ff, 19));
    }
  }), Object.defineProperty(this, "sort", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 20);
    },
    set: function(s) {
      s ? (this.Ff = Oe(this.Ff, 20), r.sort()) : this.Ff = Be(this.Ff, 20);
    }
  }), Object.defineProperty(this, "multiSelect", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 22);
    },
    set: function(s) {
      s ? this.Ff = Oe(this.Ff, 22) : this.Ff = Be(this.Ff, 22);
    }
  }), Object.defineProperty(this, "doNotSpellCheck", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 23);
    },
    set: function(s) {
      s ? this.Ff = Oe(this.Ff, 23) : this.Ff = Be(this.Ff, 23);
    }
  }), Object.defineProperty(this, "commitOnSelChange", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 27);
    },
    set: function(s) {
      s ? this.Ff = Oe(this.Ff, 27) : this.Ff = Be(this.Ff, 27);
    }
  }), this.hasAppearanceStream = !1;
};
cr(ei, Tr);
var ri = function() {
  ei.call(this), this.fontName = "helvetica", this.combo = !1;
};
cr(ri, ei);
var ni = function() {
  ri.call(this), this.combo = !0;
};
cr(ni, ri);
var la = function() {
  ni.call(this), this.edit = !0;
};
cr(la, ni);
var Te = function() {
  Tr.call(this), this.FT = "/Btn", Object.defineProperty(this, "noToggleToOff", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 15);
    },
    set: function(s) {
      s ? this.Ff = Oe(this.Ff, 15) : this.Ff = Be(this.Ff, 15);
    }
  }), Object.defineProperty(this, "radio", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 16);
    },
    set: function(s) {
      s ? this.Ff = Oe(this.Ff, 16) : this.Ff = Be(this.Ff, 16);
    }
  }), Object.defineProperty(this, "pushButton", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 17);
    },
    set: function(s) {
      s ? this.Ff = Oe(this.Ff, 17) : this.Ff = Be(this.Ff, 17);
    }
  }), Object.defineProperty(this, "radioIsUnison", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 26);
    },
    set: function(s) {
      s ? this.Ff = Oe(this.Ff, 26) : this.Ff = Be(this.Ff, 26);
    }
  });
  var e, r = {};
  Object.defineProperty(this, "MK", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      var s = function(c) {
        return c;
      };
      if (this.scope && (s = this.scope.internal.getEncryptor(this.objId)), Object.keys(r).length !== 0) {
        var a, o = [];
        for (a in o.push("<<"), r) o.push("/" + a + " (" + ai(s(r[a])) + ")");
        return o.push(">>"), o.join(`
`);
      }
    },
    set: function(s) {
      fe(s) === "object" && (r = s);
    }
  }), Object.defineProperty(this, "caption", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return r.CA || "";
    },
    set: function(s) {
      typeof s == "string" && (r.CA = s);
    }
  }), Object.defineProperty(this, "AS", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      return e;
    },
    set: function(s) {
      e = s;
    }
  }), Object.defineProperty(this, "appearanceState", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return e.substr(1, e.length - 1);
    },
    set: function(s) {
      e = "/" + s;
    }
  });
};
cr(Te, Tr);
var ca = function() {
  Te.call(this), this.pushButton = !0;
};
cr(ca, Te);
var ii = function() {
  Te.call(this), this.radio = !0, this.pushButton = !1;
  var e = [];
  Object.defineProperty(this, "Kids", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      return e;
    },
    set: function(n) {
      e = n !== void 0 ? n : [];
    }
  });
};
cr(ii, Te);
var ls = function() {
  var e, r;
  Tr.call(this), Object.defineProperty(this, "Parent", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      return e;
    },
    set: function(o) {
      e = o;
    }
  }), Object.defineProperty(this, "optionName", {
    enumerable: !1,
    configurable: !0,
    get: function() {
      return r;
    },
    set: function(o) {
      r = o;
    }
  });
  var n, s = {};
  Object.defineProperty(this, "MK", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      var o = function(A) {
        return A;
      };
      this.scope && (o = this.scope.internal.getEncryptor(this.objId));
      var f, c = [];
      for (f in c.push("<<"), s) c.push("/" + f + " (" + ai(o(s[f])) + ")");
      return c.push(">>"), c.join(`
`);
    },
    set: function(o) {
      fe(o) === "object" && (s = o);
    }
  }), Object.defineProperty(this, "caption", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return s.CA || "";
    },
    set: function(o) {
      typeof o == "string" && (s.CA = o);
    }
  }), Object.defineProperty(this, "AS", {
    enumerable: !1,
    configurable: !1,
    get: function() {
      return n;
    },
    set: function(o) {
      n = o;
    }
  }), Object.defineProperty(this, "appearanceState", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return n.substr(1, n.length - 1);
    },
    set: function(o) {
      n = "/" + o;
    }
  }), this.caption = "l", this.appearanceState = "Off", this._AppearanceType = Et.RadioButton.Circle, this.appearanceStreamContent = this._AppearanceType.createAppearanceStream(this.optionName);
};
cr(ls, Tr), ii.prototype.setAppearance = function(l) {
  if (!("createAppearanceStream" in l) || !("getCA" in l)) throw new Error("Couldn't assign Appearance to RadioButton. Appearance was Invalid!");
  for (var e in this.Kids) if (this.Kids.hasOwnProperty(e)) {
    var r = this.Kids[e];
    r.appearanceStreamContent = l.createAppearanceStream(r.optionName), r.caption = l.getCA();
  }
}, ii.prototype.createOption = function(l) {
  var e = new ls();
  return e.Parent = this, e.optionName = l, this.Kids.push(e), ec.call(this.scope, e), e;
};
var ha = function() {
  Te.call(this), this.fontName = "zapfdingbats", this.caption = "3", this.appearanceState = "On", this.value = "On", this.textAlign = "center", this.appearanceStreamContent = Et.CheckBox.createAppearanceStream();
};
cr(ha, Te);
var On = function() {
  Tr.call(this), this.FT = "/Tx", Object.defineProperty(this, "multiline", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 13);
    },
    set: function(n) {
      n ? this.Ff = Oe(this.Ff, 13) : this.Ff = Be(this.Ff, 13);
    }
  }), Object.defineProperty(this, "fileSelect", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 21);
    },
    set: function(n) {
      n ? this.Ff = Oe(this.Ff, 21) : this.Ff = Be(this.Ff, 21);
    }
  }), Object.defineProperty(this, "doNotSpellCheck", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 23);
    },
    set: function(n) {
      n ? this.Ff = Oe(this.Ff, 23) : this.Ff = Be(this.Ff, 23);
    }
  }), Object.defineProperty(this, "doNotScroll", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 24);
    },
    set: function(n) {
      n ? this.Ff = Oe(this.Ff, 24) : this.Ff = Be(this.Ff, 24);
    }
  }), Object.defineProperty(this, "comb", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 25);
    },
    set: function(n) {
      n ? this.Ff = Oe(this.Ff, 25) : this.Ff = Be(this.Ff, 25);
    }
  }), Object.defineProperty(this, "richText", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 26);
    },
    set: function(n) {
      n ? this.Ff = Oe(this.Ff, 26) : this.Ff = Be(this.Ff, 26);
    }
  });
  var e = null;
  Object.defineProperty(this, "MaxLen", {
    enumerable: !0,
    configurable: !1,
    get: function() {
      return e;
    },
    set: function(n) {
      e = n;
    }
  }), Object.defineProperty(this, "maxLength", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return e;
    },
    set: function(n) {
      Number.isInteger(n) && (e = n);
    }
  }), Object.defineProperty(this, "hasAppearanceStream", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return this.V || this.DV;
    }
  });
};
cr(On, Tr);
var fa = function() {
  On.call(this), Object.defineProperty(this, "password", {
    enumerable: !0,
    configurable: !0,
    get: function() {
      return !!je(this.Ff, 14);
    },
    set: function(r) {
      r ? this.Ff = Oe(this.Ff, 14) : this.Ff = Be(this.Ff, 14);
    }
  }), this.password = !0;
};
cr(fa, On);
var Et = {
  CheckBox: {
    createAppearanceStream: function() {
      return {
        N: {
          On: Et.CheckBox.YesNormal
        },
        D: {
          On: Et.CheckBox.YesPushDown,
          Off: Et.CheckBox.OffPushDown
        }
      };
    },
    YesPushDown: function(e) {
      var r = Qr(e);
      r.scope = e.scope;
      var n = [], s = e.scope.internal.getFont(e.fontName, e.fontStyle).id, a = e.scope.__private__.encodeColorString(e.color), o = Ao(e, e.caption);
      return n.push("0.749023 g"), n.push("0 0 " + $t(Et.internal.getWidth(e)) + " " + $t(Et.internal.getHeight(e)) + " re"), n.push("f"), n.push("BMC"), n.push("q"), n.push("0 0 1 rg"), n.push("/" + s + " " + $t(o.fontSize) + " Tf " + a), n.push("BT"), n.push(o.text), n.push("ET"), n.push("Q"), n.push("EMC"), r.stream = n.join(`
`), r;
    },
    YesNormal: function(e) {
      var r = Qr(e);
      r.scope = e.scope;
      var n = e.scope.internal.getFont(e.fontName, e.fontStyle).id, s = e.scope.__private__.encodeColorString(e.color), a = [], o = Et.internal.getHeight(e), f = Et.internal.getWidth(e), c = Ao(e, e.caption);
      return a.push("1 g"), a.push("0 0 " + $t(f) + " " + $t(o) + " re"), a.push("f"), a.push("q"), a.push("0 0 1 rg"), a.push("0 0 " + $t(f - 1) + " " + $t(o - 1) + " re"), a.push("W"), a.push("n"), a.push("0 g"), a.push("BT"), a.push("/" + n + " " + $t(c.fontSize) + " Tf " + s), a.push(c.text), a.push("ET"), a.push("Q"), r.stream = a.join(`
`), r;
    },
    OffPushDown: function(e) {
      var r = Qr(e);
      r.scope = e.scope;
      var n = [];
      return n.push("0.749023 g"), n.push("0 0 " + $t(Et.internal.getWidth(e)) + " " + $t(Et.internal.getHeight(e)) + " re"), n.push("f"), r.stream = n.join(`
`), r;
    }
  },
  RadioButton: {
    Circle: {
      createAppearanceStream: function(e) {
        var r = {
          D: {
            Off: Et.RadioButton.Circle.OffPushDown
          },
          N: {}
        };
        return r.N[e] = Et.RadioButton.Circle.YesNormal, r.D[e] = Et.RadioButton.Circle.YesPushDown, r;
      },
      getCA: function() {
        return "l";
      },
      YesNormal: function(e) {
        var r = Qr(e);
        r.scope = e.scope;
        var n = [], s = Et.internal.getWidth(e) <= Et.internal.getHeight(e) ? Et.internal.getWidth(e) / 4 : Et.internal.getHeight(e) / 4;
        s = Number((0.9 * s).toFixed(5));
        var a = Et.internal.Bezier_C, o = Number((s * a).toFixed(5));
        return n.push("q"), n.push("1 0 0 1 " + In(Et.internal.getWidth(e) / 2) + " " + In(Et.internal.getHeight(e) / 2) + " cm"), n.push(s + " 0 m"), n.push(s + " " + o + " " + o + " " + s + " 0 " + s + " c"), n.push("-" + o + " " + s + " -" + s + " " + o + " -" + s + " 0 c"), n.push("-" + s + " -" + o + " -" + o + " -" + s + " 0 -" + s + " c"), n.push(o + " -" + s + " " + s + " -" + o + " " + s + " 0 c"), n.push("f"), n.push("Q"), r.stream = n.join(`
`), r;
      },
      YesPushDown: function(e) {
        var r = Qr(e);
        r.scope = e.scope;
        var n = [], s = Et.internal.getWidth(e) <= Et.internal.getHeight(e) ? Et.internal.getWidth(e) / 4 : Et.internal.getHeight(e) / 4;
        s = Number((0.9 * s).toFixed(5));
        var a = Number((2 * s).toFixed(5)), o = Number((a * Et.internal.Bezier_C).toFixed(5)), f = Number((s * Et.internal.Bezier_C).toFixed(5));
        return n.push("0.749023 g"), n.push("q"), n.push("1 0 0 1 " + In(Et.internal.getWidth(e) / 2) + " " + In(Et.internal.getHeight(e) / 2) + " cm"), n.push(a + " 0 m"), n.push(a + " " + o + " " + o + " " + a + " 0 " + a + " c"), n.push("-" + o + " " + a + " -" + a + " " + o + " -" + a + " 0 c"), n.push("-" + a + " -" + o + " -" + o + " -" + a + " 0 -" + a + " c"), n.push(o + " -" + a + " " + a + " -" + o + " " + a + " 0 c"), n.push("f"), n.push("Q"), n.push("0 g"), n.push("q"), n.push("1 0 0 1 " + In(Et.internal.getWidth(e) / 2) + " " + In(Et.internal.getHeight(e) / 2) + " cm"), n.push(s + " 0 m"), n.push(s + " " + f + " " + f + " " + s + " 0 " + s + " c"), n.push("-" + f + " " + s + " -" + s + " " + f + " -" + s + " 0 c"), n.push("-" + s + " -" + f + " -" + f + " -" + s + " 0 -" + s + " c"), n.push(f + " -" + s + " " + s + " -" + f + " " + s + " 0 c"), n.push("f"), n.push("Q"), r.stream = n.join(`
`), r;
      },
      OffPushDown: function(e) {
        var r = Qr(e);
        r.scope = e.scope;
        var n = [], s = Et.internal.getWidth(e) <= Et.internal.getHeight(e) ? Et.internal.getWidth(e) / 4 : Et.internal.getHeight(e) / 4;
        s = Number((0.9 * s).toFixed(5));
        var a = Number((2 * s).toFixed(5)), o = Number((a * Et.internal.Bezier_C).toFixed(5));
        return n.push("0.749023 g"), n.push("q"), n.push("1 0 0 1 " + In(Et.internal.getWidth(e) / 2) + " " + In(Et.internal.getHeight(e) / 2) + " cm"), n.push(a + " 0 m"), n.push(a + " " + o + " " + o + " " + a + " 0 " + a + " c"), n.push("-" + o + " " + a + " -" + a + " " + o + " -" + a + " 0 c"), n.push("-" + a + " -" + o + " -" + o + " -" + a + " 0 -" + a + " c"), n.push(o + " -" + a + " " + a + " -" + o + " " + a + " 0 c"), n.push("f"), n.push("Q"), r.stream = n.join(`
`), r;
      }
    },
    Cross: {
      createAppearanceStream: function(e) {
        var r = {
          D: {
            Off: Et.RadioButton.Cross.OffPushDown
          },
          N: {}
        };
        return r.N[e] = Et.RadioButton.Cross.YesNormal, r.D[e] = Et.RadioButton.Cross.YesPushDown, r;
      },
      getCA: function() {
        return "8";
      },
      YesNormal: function(e) {
        var r = Qr(e);
        r.scope = e.scope;
        var n = [], s = Et.internal.calculateCross(e);
        return n.push("q"), n.push("1 1 " + $t(Et.internal.getWidth(e) - 2) + " " + $t(Et.internal.getHeight(e) - 2) + " re"), n.push("W"), n.push("n"), n.push($t(s.x1.x) + " " + $t(s.x1.y) + " m"), n.push($t(s.x2.x) + " " + $t(s.x2.y) + " l"), n.push($t(s.x4.x) + " " + $t(s.x4.y) + " m"), n.push($t(s.x3.x) + " " + $t(s.x3.y) + " l"), n.push("s"), n.push("Q"), r.stream = n.join(`
`), r;
      },
      YesPushDown: function(e) {
        var r = Qr(e);
        r.scope = e.scope;
        var n = Et.internal.calculateCross(e), s = [];
        return s.push("0.749023 g"), s.push("0 0 " + $t(Et.internal.getWidth(e)) + " " + $t(Et.internal.getHeight(e)) + " re"), s.push("f"), s.push("q"), s.push("1 1 " + $t(Et.internal.getWidth(e) - 2) + " " + $t(Et.internal.getHeight(e) - 2) + " re"), s.push("W"), s.push("n"), s.push($t(n.x1.x) + " " + $t(n.x1.y) + " m"), s.push($t(n.x2.x) + " " + $t(n.x2.y) + " l"), s.push($t(n.x4.x) + " " + $t(n.x4.y) + " m"), s.push($t(n.x3.x) + " " + $t(n.x3.y) + " l"), s.push("s"), s.push("Q"), r.stream = s.join(`
`), r;
      },
      OffPushDown: function(e) {
        var r = Qr(e);
        r.scope = e.scope;
        var n = [];
        return n.push("0.749023 g"), n.push("0 0 " + $t(Et.internal.getWidth(e)) + " " + $t(Et.internal.getHeight(e)) + " re"), n.push("f"), r.stream = n.join(`
`), r;
      }
    }
  },
  createDefaultAppearanceStream: function(e) {
    var r = e.scope.internal.getFont(e.fontName, e.fontStyle).id, n = e.scope.__private__.encodeColorString(e.color);
    return "/" + r + " " + e.fontSize + " Tf " + n;
  }
};
Et.internal = {
  Bezier_C: 0.551915024494,
  calculateCross: function(e) {
    var r = Et.internal.getWidth(e), n = Et.internal.getHeight(e), s = Math.min(r, n);
    return {
      x1: {
        x: (r - s) / 2,
        y: (n - s) / 2 + s
      },
      x2: {
        x: (r - s) / 2 + s,
        y: (n - s) / 2
      },
      x3: {
        x: (r - s) / 2,
        y: (n - s) / 2
      },
      x4: {
        x: (r - s) / 2 + s,
        y: (n - s) / 2 + s
      }
    };
  }
}, Et.internal.getWidth = function(l) {
  var e = 0;
  return fe(l) === "object" && (e = cu(l.Rect[2])), e;
}, Et.internal.getHeight = function(l) {
  var e = 0;
  return fe(l) === "object" && (e = cu(l.Rect[3])), e;
};
var ec = Ie.addField = function(l) {
  if (tc(this, l), !(l instanceof Tr)) throw new Error("Invalid argument passed to jsPDF.addField.");
  var e;
  return (e = l).scope.internal.acroformPlugin.printedOut && (e.scope.internal.acroformPlugin.printedOut = !1, e.scope.internal.acroformPlugin.acroFormDictionaryRoot = null), e.scope.internal.acroformPlugin.acroFormDictionaryRoot.Fields.push(e), l.page = l.scope.internal.getCurrentPageInfo().pageNumber, this;
};
Ie.AcroFormChoiceField = ei, Ie.AcroFormListBox = ri, Ie.AcroFormComboBox = ni, Ie.AcroFormEditBox = la, Ie.AcroFormButton = Te, Ie.AcroFormPushButton = ca, Ie.AcroFormRadioButton = ii, Ie.AcroFormCheckBox = ha, Ie.AcroFormTextField = On, Ie.AcroFormPasswordField = fa, Ie.AcroFormAppearance = Et, Ie.AcroForm = {
  ChoiceField: ei,
  ListBox: ri,
  ComboBox: ni,
  EditBox: la,
  Button: Te,
  PushButton: ca,
  RadioButton: ii,
  CheckBox: ha,
  TextField: On,
  PasswordField: fa,
  Appearance: Et
}, Wt.AcroForm = {
  ChoiceField: ei,
  ListBox: ri,
  ComboBox: ni,
  EditBox: la,
  Button: Te,
  PushButton: ca,
  RadioButton: ii,
  CheckBox: ha,
  TextField: On,
  PasswordField: fa,
  Appearance: Et
};
var rc = Wt.AcroForm;
function Du(l) {
  return l.reduce(function(e, r, n) {
    return e[r] = n, e;
  }, {});
}
(function(l) {
  l.__addimage__ = {};
  var e = "UNKNOWN", r = {
    PNG: [[137, 80, 78, 71]],
    TIFF: [[77, 77, 0, 42], [73, 73, 42, 0]],
    JPEG: [[255, 216, 255, 224, void 0, void 0, 74, 70, 73, 70, 0], [255, 216, 255, 225, void 0, void 0, 69, 120, 105, 102, 0, 0], [255, 216, 255, 219], [255, 216, 255, 238]],
    JPEG2000: [[0, 0, 0, 12, 106, 80, 32, 32]],
    GIF87a: [[71, 73, 70, 56, 55, 97]],
    GIF89a: [[71, 73, 70, 56, 57, 97]],
    WEBP: [[82, 73, 70, 70, void 0, void 0, void 0, void 0, 87, 69, 66, 80]],
    BMP: [[66, 77], [66, 65], [67, 73], [67, 80], [73, 67], [80, 84]]
  }, n = l.__addimage__.getImageFileTypeByImageData = function(M, k) {
    var D, R, ot, st, ht, X = e;
    if ((k = k || e) === "RGBA" || M.data !== void 0 && M.data instanceof Uint8ClampedArray && "height" in M && "width" in M) return "RGBA";
    if (bt(M)) for (ht in r) for (ot = r[ht], D = 0; D < ot.length; D += 1) {
      for (st = !0, R = 0; R < ot[D].length; R += 1) if (ot[D][R] !== void 0 && ot[D][R] !== M[R]) {
        st = !1;
        break;
      }
      if (st === !0) {
        X = ht;
        break;
      }
    }
    else for (ht in r) for (ot = r[ht], D = 0; D < ot.length; D += 1) {
      for (st = !0, R = 0; R < ot[D].length; R += 1) if (ot[D][R] !== void 0 && ot[D][R] !== M.charCodeAt(R)) {
        st = !1;
        break;
      }
      if (st === !0) {
        X = ht;
        break;
      }
    }
    return X === e && k !== e && (X = k), X;
  }, s = function M(k) {
    for (var D = this.internal.write, R = this.internal.putStream, ot = (0, this.internal.getFilters)(); ot.indexOf("FlateEncode") !== -1; ) ot.splice(ot.indexOf("FlateEncode"), 1);
    k.objectId = this.internal.newObject();
    var st = [];
    if (st.push({
      key: "Type",
      value: "/XObject"
    }), st.push({
      key: "Subtype",
      value: "/Image"
    }), st.push({
      key: "Width",
      value: k.width
    }), st.push({
      key: "Height",
      value: k.height
    }), k.colorSpace === O.INDEXED ? st.push({
      key: "ColorSpace",
      value: "[/Indexed /DeviceRGB " + (k.palette.length / 3 - 1) + " " + ("sMask" in k && k.sMask !== void 0 ? k.objectId + 2 : k.objectId + 1) + " 0 R]"
    }) : (st.push({
      key: "ColorSpace",
      value: "/" + k.colorSpace
    }), k.colorSpace === O.DEVICE_CMYK && st.push({
      key: "Decode",
      value: "[1 0 1 0 1 0 1 0]"
    })), st.push({
      key: "BitsPerComponent",
      value: k.bitsPerComponent
    }), "decodeParameters" in k && k.decodeParameters !== void 0 && st.push({
      key: "DecodeParms",
      value: "<<" + k.decodeParameters + ">>"
    }), "transparency" in k && Array.isArray(k.transparency)) {
      for (var ht = "", X = 0, Nt = k.transparency.length; X < Nt; X++) ht += k.transparency[X] + " " + k.transparency[X] + " ";
      st.push({
        key: "Mask",
        value: "[" + ht + "]"
      });
    }
    k.sMask !== void 0 && st.push({
      key: "SMask",
      value: k.objectId + 1 + " 0 R"
    });
    var rt = k.filter !== void 0 ? ["/" + k.filter] : void 0;
    if (R({
      data: k.data,
      additionalKeyValues: st,
      alreadyAppliedFilters: rt,
      objectId: k.objectId
    }), D("endobj"), "sMask" in k && k.sMask !== void 0) {
      var xt = "/Predictor " + k.predictor + " /Colors 1 /BitsPerComponent " + k.bitsPerComponent + " /Columns " + k.width, E = {
        width: k.width,
        height: k.height,
        colorSpace: "DeviceGray",
        bitsPerComponent: k.bitsPerComponent,
        decodeParameters: xt,
        data: k.sMask
      };
      "filter" in k && (E.filter = k.filter), M.call(this, E);
    }
    if (k.colorSpace === O.INDEXED) {
      var x = this.internal.newObject();
      R({
        data: dt(new Uint8Array(k.palette)),
        objectId: x
      }), D("endobj");
    }
  }, a = function() {
    var k = this.internal.collections.addImage_images;
    for (var D in k) s.call(this, k[D]);
  }, o = function() {
    var k, D = this.internal.collections.addImage_images, R = this.internal.write;
    for (var ot in D) R("/I" + (k = D[ot]).index, k.objectId, "0", "R");
  }, f = function() {
    this.internal.collections.addImage_images || (this.internal.collections.addImage_images = {}, this.internal.events.subscribe("putResources", a), this.internal.events.subscribe("putXobjectDict", o));
  }, c = function() {
    var k = this.internal.collections.addImage_images;
    return f.call(this), k;
  }, m = function() {
    return Object.keys(this.internal.collections.addImage_images).length;
  }, A = function(k) {
    return typeof l["process" + k.toUpperCase()] == "function";
  }, b = function(k) {
    return fe(k) === "object" && k.nodeType === 1;
  }, S = function(k, D) {
    if (k.nodeName === "IMG" && k.hasAttribute("src")) {
      var R = "" + k.getAttribute("src");
      if (R.indexOf("data:image/") === 0) return ua(unescape(R).split("base64,").pop());
      var ot = l.loadFile(R, !0);
      if (ot !== void 0) return ot;
    }
    if (k.nodeName === "CANVAS") {
      if (k.width === 0 || k.height === 0) throw new Error("Given canvas must have data. Canvas width: " + k.width + ", height: " + k.height);
      var st;
      switch (D) {
        case "PNG":
          st = "image/png";
          break;
        case "WEBP":
          st = "image/webp";
          break;
        case "JPEG":
        case "JPG":
        default:
          st = "image/jpeg";
      }
      return ua(k.toDataURL(st, 1).split("base64,").pop());
    }
  }, g = function(k) {
    var D = this.internal.collections.addImage_images;
    if (D) {
      for (var R in D) if (k === D[R].alias) return D[R];
    }
  }, B = function(k, D, R) {
    return k || D || (k = -96, D = -96), k < 0 && (k = -1 * R.width * 72 / k / this.internal.scaleFactor), D < 0 && (D = -1 * R.height * 72 / D / this.internal.scaleFactor), k === 0 && (k = D * R.width / R.height), D === 0 && (D = k * R.height / R.width), [k, D];
  }, F = function(k, D, R, ot, st, ht) {
    var X = B.call(this, R, ot, st), Nt = this.internal.getCoordinateString, rt = this.internal.getVerticalCoordinateString, xt = c.call(this);
    if (R = X[0], ot = X[1], xt[st.index] = st, ht) {
      ht *= Math.PI / 180;
      var E = Math.cos(ht), x = Math.sin(ht), q = function(K) {
        return K.toFixed(4);
      }, U = [q(E), q(x), q(-1 * x), q(E), 0, 0, "cm"];
    }
    this.internal.write("q"), ht ? (this.internal.write([1, "0", "0", 1, Nt(k), rt(D + ot), "cm"].join(" ")), this.internal.write(U.join(" ")), this.internal.write([Nt(R), "0", "0", Nt(ot), "0", "0", "cm"].join(" "))) : this.internal.write([Nt(R), "0", "0", Nt(ot), Nt(k), rt(D + ot), "cm"].join(" ")), this.isAdvancedAPI() && this.internal.write([1, 0, 0, -1, 0, 0, "cm"].join(" ")), this.internal.write("/I" + st.index + " Do"), this.internal.write("Q");
  }, O = l.color_spaces = {
    DEVICE_RGB: "DeviceRGB",
    DEVICE_GRAY: "DeviceGray",
    DEVICE_CMYK: "DeviceCMYK",
    CAL_GREY: "CalGray",
    CAL_RGB: "CalRGB",
    LAB: "Lab",
    ICC_BASED: "ICCBased",
    INDEXED: "Indexed",
    PATTERN: "Pattern",
    SEPARATION: "Separation",
    DEVICE_N: "DeviceN"
  };
  l.decode = {
    DCT_DECODE: "DCTDecode",
    FLATE_DECODE: "FlateDecode",
    LZW_DECODE: "LZWDecode",
    JPX_DECODE: "JPXDecode",
    JBIG2_DECODE: "JBIG2Decode",
    ASCII85_DECODE: "ASCII85Decode",
    ASCII_HEX_DECODE: "ASCIIHexDecode",
    RUN_LENGTH_DECODE: "RunLengthDecode",
    CCITT_FAX_DECODE: "CCITTFaxDecode"
  };
  var I = l.image_compression = {
    NONE: "NONE",
    FAST: "FAST",
    MEDIUM: "MEDIUM",
    SLOW: "SLOW"
  }, N = l.__addimage__.sHashCode = function(M) {
    var k, D, R = 0;
    if (typeof M == "string") for (D = M.length, k = 0; k < D; k++) R = (R << 5) - R + M.charCodeAt(k), R |= 0;
    else if (bt(M)) for (D = M.byteLength / 2, k = 0; k < D; k++) R = (R << 5) - R + M[k], R |= 0;
    return R;
  }, J = l.__addimage__.validateStringAsBase64 = function(M) {
    (M = M || "").toString().trim();
    var k = !0;
    return M.length === 0 && (k = !1), M.length % 4 != 0 && (k = !1), /^[A-Za-z0-9+/]+$/.test(M.substr(0, M.length - 2)) === !1 && (k = !1), /^[A-Za-z0-9/][A-Za-z0-9+/]|[A-Za-z0-9+/]=|==$/.test(M.substr(-2)) === !1 && (k = !1), k;
  }, et = l.__addimage__.extractImageFromDataUrl = function(M) {
    if (M == null || !(M = M.trim()).startsWith("data:")) return null;
    var k = M.indexOf(",");
    return k < 0 ? null : M.substring(0, k).trim().endsWith("base64") ? M.substring(k + 1) : null;
  }, ct = l.__addimage__.supportsArrayBuffer = function() {
    return typeof ArrayBuffer != "undefined" && typeof Uint8Array != "undefined";
  };
  l.__addimage__.isArrayBuffer = function(M) {
    return ct() && M instanceof ArrayBuffer;
  };
  var bt = l.__addimage__.isArrayBufferView = function(M) {
    return ct() && typeof Uint32Array != "undefined" && (M instanceof Int8Array || M instanceof Uint8Array || typeof Uint8ClampedArray != "undefined" && M instanceof Uint8ClampedArray || M instanceof Int16Array || M instanceof Uint16Array || M instanceof Int32Array || M instanceof Uint32Array || M instanceof Float32Array || M instanceof Float64Array);
  }, nt = l.__addimage__.binaryStringToUint8Array = function(M) {
    for (var k = M.length, D = new Uint8Array(k), R = 0; R < k; R++) D[R] = M.charCodeAt(R);
    return D;
  }, dt = l.__addimage__.arrayBufferToBinaryString = function(M) {
    for (var k = "", D = bt(M) ? M : new Uint8Array(M), R = 0; R < D.length; R += 8192) k += String.fromCharCode.apply(null, D.subarray(R, R + 8192));
    return k;
  };
  l.addImage = function() {
    var M, k, D, R, ot, st, ht, X, Nt;
    if (typeof arguments[1] == "number" ? (k = e, D = arguments[1], R = arguments[2], ot = arguments[3], st = arguments[4], ht = arguments[5], X = arguments[6], Nt = arguments[7]) : (k = arguments[1], D = arguments[2], R = arguments[3], ot = arguments[4], st = arguments[5], ht = arguments[6], X = arguments[7], Nt = arguments[8]), fe(M = arguments[0]) === "object" && !b(M) && "imageData" in M) {
      var rt = M;
      M = rt.imageData, k = rt.format || k || e, D = rt.x || D || 0, R = rt.y || R || 0, ot = rt.w || rt.width || ot, st = rt.h || rt.height || st, ht = rt.alias || ht, X = rt.compression || X, Nt = rt.rotation || rt.angle || Nt;
    }
    var xt = this.internal.getFilters();
    if (X === void 0 && xt.indexOf("FlateEncode") !== -1 && (X = "SLOW"), isNaN(D) || isNaN(R)) throw new Error("Invalid coordinates passed to jsPDF.addImage");
    f.call(this);
    var E = z.call(this, M, k, ht, X);
    return F.call(this, D, R, ot, st, E, Nt), this;
  };
  var z = function(k, D, R, ot) {
    var st, ht, X;
    if (typeof k == "string" && n(k) === e) {
      k = unescape(k);
      var Nt = at(k, !1);
      (Nt !== "" || (Nt = l.loadFile(k, !0)) !== void 0) && (k = Nt);
    }
    if (b(k) && (k = S(k, D)), D = n(k, D), !A(D)) throw new Error("addImage does not support files of type '" + D + "', please ensure that a plugin for '" + D + "' support is added.");
    if (((X = R) == null || X.length === 0) && (R = function(rt) {
      return typeof rt == "string" || bt(rt) ? N(rt) : bt(rt.data) ? N(rt.data) : null;
    }(k)), (st = g.call(this, R)) || (ct() && (k instanceof Uint8Array || D === "RGBA" || (ht = k, k = nt(k))), st = this["process" + D.toUpperCase()](k, m.call(this), R, function(rt) {
      return rt && typeof rt == "string" && (rt = rt.toUpperCase()), rt in l.image_compression ? rt : I.NONE;
    }(ot), ht)), !st) throw new Error("An unknown error occurred whilst processing the image.");
    return st;
  }, at = l.__addimage__.convertBase64ToBinaryString = function(M, k) {
    k = typeof k != "boolean" || k;
    var D, R = "";
    if (typeof M == "string") {
      var ot;
      D = (ot = et(M)) !== null && ot !== void 0 ? ot : M;
      try {
        R = ua(D);
      } catch (st) {
        if (k) throw J(D) ? new Error("atob-Error in jsPDF.convertBase64ToBinaryString " + st.message) : new Error("Supplied Data is not a valid base64-String jsPDF.convertBase64ToBinaryString ");
      }
    }
    return R;
  };
  l.getImageProperties = function(M) {
    var k, D, R = "";
    if (b(M) && (M = S(M)), typeof M == "string" && n(M) === e && ((R = at(M, !1)) === "" && (R = l.loadFile(M) || ""), M = R), D = n(M), !A(D)) throw new Error("addImage does not support files of type '" + D + "', please ensure that a plugin for '" + D + "' support is added.");
    if (!ct() || M instanceof Uint8Array || (M = nt(M)), !(k = this["process" + D.toUpperCase()](M))) throw new Error("An unknown error occurred whilst processing the image");
    return k.fileType = D, k;
  };
})(Wt.API), /**
 * @license
 * Copyright (c) 2014 Steven Spungin (TwelveTone LLC)  steven@twelvetone.tv
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  var e = function(n) {
    if (n !== void 0 && n != "") return !0;
  };
  Wt.API.events.push(["addPage", function(r) {
    this.internal.getPageInfo(r.pageNumber).pageContext.annotations = [];
  }]), l.events.push(["putPage", function(r) {
    for (var n, s, a, o = this.internal.getCoordinateString, f = this.internal.getVerticalCoordinateString, c = this.internal.getPageInfoByObjId(r.objId), m = r.pageContext.annotations, A = !1, b = 0; b < m.length && !A; b++) switch ((n = m[b]).type) {
      case "link":
        (e(n.options.url) || e(n.options.pageNumber)) && (A = !0);
        break;
      case "reference":
      case "text":
      case "freetext":
        A = !0;
    }
    if (A != 0) {
      this.internal.write("/Annots [");
      for (var S = 0; S < m.length; S++) {
        n = m[S];
        var g = this.internal.pdfEscape, B = this.internal.getEncryptor(r.objId);
        switch (n.type) {
          case "reference":
            this.internal.write(" " + n.object.objId + " 0 R ");
            break;
          case "text":
            var F = this.internal.newAdditionalObject(), O = this.internal.newAdditionalObject(), I = this.internal.getEncryptor(F.objId), N = n.title || "Note";
            a = "<</Type /Annot /Subtype /Text " + (s = "/Rect [" + o(n.bounds.x) + " " + f(n.bounds.y + n.bounds.h) + " " + o(n.bounds.x + n.bounds.w) + " " + f(n.bounds.y) + "] ") + "/Contents (" + g(I(n.contents)) + ")", a += " /Popup " + O.objId + " 0 R", a += " /P " + c.objId + " 0 R", a += " /T (" + g(I(N)) + ") >>", F.content = a;
            var J = F.objId + " 0 R";
            a = "<</Type /Annot /Subtype /Popup " + (s = "/Rect [" + o(n.bounds.x + 30) + " " + f(n.bounds.y + n.bounds.h) + " " + o(n.bounds.x + n.bounds.w + 30) + " " + f(n.bounds.y) + "] ") + " /Parent " + J, n.open && (a += " /Open true"), a += " >>", O.content = a, this.internal.write(F.objId, "0 R", O.objId, "0 R");
            break;
          case "freetext":
            s = "/Rect [" + o(n.bounds.x) + " " + f(n.bounds.y) + " " + o(n.bounds.x + n.bounds.w) + " " + f(n.bounds.y + n.bounds.h) + "] ";
            var et = n.color || "#000000";
            a = "<</Type /Annot /Subtype /FreeText " + s + "/Contents (" + g(B(n.contents)) + ")", a += " /DS(font: Helvetica,sans-serif 12.0pt; text-align:left; color:#" + et + ")", a += " /Border [0 0 0]", a += " >>", this.internal.write(a);
            break;
          case "link":
            if (n.options.name) {
              var ct = this.annotations._nameMap[n.options.name];
              n.options.pageNumber = ct.page, n.options.top = ct.y;
            } else n.options.top || (n.options.top = 0);
            if (s = "/Rect [" + n.finalBounds.x + " " + n.finalBounds.y + " " + n.finalBounds.w + " " + n.finalBounds.h + "] ", a = "", n.options.url) a = "<</Type /Annot /Subtype /Link " + s + "/Border [0 0 0] /A <</S /URI /URI (" + g(B(n.options.url)) + ") >>";
            else if (n.options.pageNumber)
              switch (a = "<</Type /Annot /Subtype /Link " + s + "/Border [0 0 0] /Dest [" + this.internal.getPageInfo(n.options.pageNumber).objId + " 0 R", n.options.magFactor = n.options.magFactor || "XYZ", n.options.magFactor) {
                case "Fit":
                  a += " /Fit]";
                  break;
                case "FitH":
                  a += " /FitH " + n.options.top + "]";
                  break;
                case "FitV":
                  n.options.left = n.options.left || 0, a += " /FitV " + n.options.left + "]";
                  break;
                case "XYZ":
                default:
                  var bt = f(n.options.top);
                  n.options.left = n.options.left || 0, n.options.zoom === void 0 && (n.options.zoom = 0), a += " /XYZ " + n.options.left + " " + bt + " " + n.options.zoom + "]";
              }
            a != "" && (a += " >>", this.internal.write(a));
        }
      }
      this.internal.write("]");
    }
  }]), l.createAnnotation = function(r) {
    var n = this.internal.getCurrentPageInfo();
    switch (r.type) {
      case "link":
        this.link(r.bounds.x, r.bounds.y, r.bounds.w, r.bounds.h, r);
        break;
      case "text":
      case "freetext":
        n.pageContext.annotations.push(r);
    }
  }, l.link = function(r, n, s, a, o) {
    var f = this.internal.getCurrentPageInfo(), c = this.internal.getCoordinateString, m = this.internal.getVerticalCoordinateString;
    f.pageContext.annotations.push({
      finalBounds: {
        x: c(r),
        y: m(n),
        w: c(r + s),
        h: m(n + a)
      },
      options: o,
      type: "link"
    });
  }, l.textWithLink = function(r, n, s, a) {
    var o, f, c = this.getTextWidth(r), m = this.internal.getLineHeight() / this.internal.scaleFactor;
    if (a.maxWidth !== void 0) {
      f = a.maxWidth;
      var A = this.splitTextToSize(r, f).length;
      o = Math.ceil(m * A);
    } else f = c, o = m;
    return this.text(r, n, s, a), s += 0.2 * m, a.align === "center" && (n -= c / 2), a.align === "right" && (n -= c), this.link(n, s - m, f, o, a), c;
  }, l.getTextWidth = function(r) {
    var n = this.internal.getFontSize();
    return this.getStringUnitWidth(r) * n / this.internal.scaleFactor;
  };
}(Wt.API), /**
 * @license
 * Copyright (c) 2017 Aras Abbasi
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  var e = {
    1569: [65152],
    1570: [65153, 65154],
    1571: [65155, 65156],
    1572: [65157, 65158],
    1573: [65159, 65160],
    1574: [65161, 65162, 65163, 65164],
    1575: [65165, 65166],
    1576: [65167, 65168, 65169, 65170],
    1577: [65171, 65172],
    1578: [65173, 65174, 65175, 65176],
    1579: [65177, 65178, 65179, 65180],
    1580: [65181, 65182, 65183, 65184],
    1581: [65185, 65186, 65187, 65188],
    1582: [65189, 65190, 65191, 65192],
    1583: [65193, 65194],
    1584: [65195, 65196],
    1585: [65197, 65198],
    1586: [65199, 65200],
    1587: [65201, 65202, 65203, 65204],
    1588: [65205, 65206, 65207, 65208],
    1589: [65209, 65210, 65211, 65212],
    1590: [65213, 65214, 65215, 65216],
    1591: [65217, 65218, 65219, 65220],
    1592: [65221, 65222, 65223, 65224],
    1593: [65225, 65226, 65227, 65228],
    1594: [65229, 65230, 65231, 65232],
    1601: [65233, 65234, 65235, 65236],
    1602: [65237, 65238, 65239, 65240],
    1603: [65241, 65242, 65243, 65244],
    1604: [65245, 65246, 65247, 65248],
    1605: [65249, 65250, 65251, 65252],
    1606: [65253, 65254, 65255, 65256],
    1607: [65257, 65258, 65259, 65260],
    1608: [65261, 65262],
    1609: [65263, 65264, 64488, 64489],
    1610: [65265, 65266, 65267, 65268],
    1649: [64336, 64337],
    1655: [64477],
    1657: [64358, 64359, 64360, 64361],
    1658: [64350, 64351, 64352, 64353],
    1659: [64338, 64339, 64340, 64341],
    1662: [64342, 64343, 64344, 64345],
    1663: [64354, 64355, 64356, 64357],
    1664: [64346, 64347, 64348, 64349],
    1667: [64374, 64375, 64376, 64377],
    1668: [64370, 64371, 64372, 64373],
    1670: [64378, 64379, 64380, 64381],
    1671: [64382, 64383, 64384, 64385],
    1672: [64392, 64393],
    1676: [64388, 64389],
    1677: [64386, 64387],
    1678: [64390, 64391],
    1681: [64396, 64397],
    1688: [64394, 64395],
    1700: [64362, 64363, 64364, 64365],
    1702: [64366, 64367, 64368, 64369],
    1705: [64398, 64399, 64400, 64401],
    1709: [64467, 64468, 64469, 64470],
    1711: [64402, 64403, 64404, 64405],
    1713: [64410, 64411, 64412, 64413],
    1715: [64406, 64407, 64408, 64409],
    1722: [64414, 64415],
    1723: [64416, 64417, 64418, 64419],
    1726: [64426, 64427, 64428, 64429],
    1728: [64420, 64421],
    1729: [64422, 64423, 64424, 64425],
    1733: [64480, 64481],
    1734: [64473, 64474],
    1735: [64471, 64472],
    1736: [64475, 64476],
    1737: [64482, 64483],
    1739: [64478, 64479],
    1740: [64508, 64509, 64510, 64511],
    1744: [64484, 64485, 64486, 64487],
    1746: [64430, 64431],
    1747: [64432, 64433]
  }, r = {
    65247: {
      65154: 65269,
      65156: 65271,
      65160: 65273,
      65166: 65275
    },
    65248: {
      65154: 65270,
      65156: 65272,
      65160: 65274,
      65166: 65276
    },
    65165: {
      65247: {
        65248: {
          65258: 65010
        }
      }
    },
    1617: {
      1612: 64606,
      1613: 64607,
      1614: 64608,
      1615: 64609,
      1616: 64610
    }
  }, n = {
    1612: 64606,
    1613: 64607,
    1614: 64608,
    1615: 64609,
    1616: 64610
  }, s = [1570, 1571, 1573, 1575];
  l.__arabicParser__ = {};
  var a = l.__arabicParser__.isInArabicSubstitutionA = function(F) {
    return e[F.charCodeAt(0)] !== void 0;
  }, o = l.__arabicParser__.isArabicLetter = function(F) {
    return typeof F == "string" && /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/.test(F);
  }, f = l.__arabicParser__.isArabicEndLetter = function(F) {
    return o(F) && a(F) && e[F.charCodeAt(0)].length <= 2;
  }, c = l.__arabicParser__.isArabicAlfLetter = function(F) {
    return o(F) && s.indexOf(F.charCodeAt(0)) >= 0;
  };
  l.__arabicParser__.arabicLetterHasIsolatedForm = function(F) {
    return o(F) && a(F) && e[F.charCodeAt(0)].length >= 1;
  };
  var m = l.__arabicParser__.arabicLetterHasFinalForm = function(F) {
    return o(F) && a(F) && e[F.charCodeAt(0)].length >= 2;
  };
  l.__arabicParser__.arabicLetterHasInitialForm = function(F) {
    return o(F) && a(F) && e[F.charCodeAt(0)].length >= 3;
  };
  var A = l.__arabicParser__.arabicLetterHasMedialForm = function(F) {
    return o(F) && a(F) && e[F.charCodeAt(0)].length == 4;
  }, b = l.__arabicParser__.resolveLigatures = function(F) {
    var O = 0, I = r, N = "", J = 0;
    for (O = 0; O < F.length; O += 1) I[F.charCodeAt(O)] !== void 0 ? (J++, typeof (I = I[F.charCodeAt(O)]) == "number" && (N += String.fromCharCode(I), I = r, J = 0), O === F.length - 1 && (I = r, N += F.charAt(O - (J - 1)), O -= J - 1, J = 0)) : (I = r, N += F.charAt(O - J), O -= J, J = 0);
    return N;
  };
  l.__arabicParser__.isArabicDiacritic = function(F) {
    return F !== void 0 && n[F.charCodeAt(0)] !== void 0;
  };
  var S = l.__arabicParser__.getCorrectForm = function(F, O, I) {
    return o(F) ? a(F) === !1 ? -1 : !m(F) || !o(O) && !o(I) || !o(I) && f(O) || f(F) && !o(O) || f(F) && c(O) || f(F) && f(O) ? 0 : A(F) && o(O) && !f(O) && o(I) && m(I) ? 3 : f(F) || !o(I) ? 1 : 2 : -1;
  }, g = function(O) {
    var I = 0, N = 0, J = 0, et = "", ct = "", bt = "", nt = (O = O || "").split("\\s+"), dt = [];
    for (I = 0; I < nt.length; I += 1) {
      for (dt.push(""), N = 0; N < nt[I].length; N += 1) et = nt[I][N], ct = nt[I][N - 1], bt = nt[I][N + 1], o(et) ? (J = S(et, ct, bt), dt[I] += J !== -1 ? String.fromCharCode(e[et.charCodeAt(0)][J]) : et) : dt[I] += et;
      dt[I] = b(dt[I]);
    }
    return dt.join(" ");
  }, B = l.__arabicParser__.processArabic = l.processArabic = function() {
    var F, O = typeof arguments[0] == "string" ? arguments[0] : arguments[0].text, I = [];
    if (Array.isArray(O)) {
      var N = 0;
      for (I = [], N = 0; N < O.length; N += 1) Array.isArray(O[N]) ? I.push([g(O[N][0]), O[N][1], O[N][2]]) : I.push([g(O[N])]);
      F = I;
    } else F = g(O);
    return typeof arguments[0] == "string" ? F : (arguments[0].text = F, arguments[0]);
  };
  l.events.push(["preProcessText", B]);
}(Wt.API), Wt.API.autoPrint = function(l) {
  var e;
  switch ((l = l || {}).variant = l.variant || "non-conform", l.variant) {
    case "javascript":
      this.addJS("print({});");
      break;
    case "non-conform":
    default:
      this.internal.events.subscribe("postPutResources", function() {
        e = this.internal.newObject(), this.internal.out("<<"), this.internal.out("/S /Named"), this.internal.out("/Type /Action"), this.internal.out("/N /Print"), this.internal.out(">>"), this.internal.out("endobj");
      }), this.internal.events.subscribe("putCatalog", function() {
        this.internal.out("/OpenAction " + e + " 0 R");
      });
  }
  return this;
}, /**
 * @license
 * Copyright (c) 2014 Steven Spungin (TwelveTone LLC)  steven@twelvetone.tv
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  var e = function() {
    var n = void 0;
    Object.defineProperty(this, "pdf", {
      get: function() {
        return n;
      },
      set: function(m) {
        n = m;
      }
    });
    var s = 150;
    Object.defineProperty(this, "width", {
      get: function() {
        return s;
      },
      set: function(m) {
        s = isNaN(m) || Number.isInteger(m) === !1 || m < 0 ? 150 : m, this.getContext("2d").pageWrapXEnabled && (this.getContext("2d").pageWrapX = s + 1);
      }
    });
    var a = 300;
    Object.defineProperty(this, "height", {
      get: function() {
        return a;
      },
      set: function(m) {
        a = isNaN(m) || Number.isInteger(m) === !1 || m < 0 ? 300 : m, this.getContext("2d").pageWrapYEnabled && (this.getContext("2d").pageWrapY = a + 1);
      }
    });
    var o = [];
    Object.defineProperty(this, "childNodes", {
      get: function() {
        return o;
      },
      set: function(m) {
        o = m;
      }
    });
    var f = {};
    Object.defineProperty(this, "style", {
      get: function() {
        return f;
      },
      set: function(m) {
        f = m;
      }
    }), Object.defineProperty(this, "parentNode", {});
  };
  e.prototype.getContext = function(r, n) {
    var s;
    if ((r = r || "2d") !== "2d") return null;
    for (s in n) this.pdf.context2d.hasOwnProperty(s) && (this.pdf.context2d[s] = n[s]);
    return this.pdf.context2d._canvas = this, this.pdf.context2d;
  }, e.prototype.toDataURL = function() {
    throw new Error("toDataURL is not implemented.");
  }, l.events.push(["initialized", function() {
    this.canvas = new e(), this.canvas.pdf = this;
  }]);
}(Wt.API), function(l) {
  var e = {
    left: 0,
    top: 0,
    bottom: 0,
    right: 0
  }, r = !1, n = function() {
    this.internal.__cell__ === void 0 && (this.internal.__cell__ = {}, this.internal.__cell__.padding = 3, this.internal.__cell__.headerFunction = void 0, this.internal.__cell__.margins = Object.assign({}, e), this.internal.__cell__.margins.width = this.getPageWidth(), s.call(this));
  }, s = function() {
    this.internal.__cell__.lastCell = new a(), this.internal.__cell__.pages = 1;
  }, a = function() {
    var m = arguments[0];
    Object.defineProperty(this, "x", {
      enumerable: !0,
      get: function() {
        return m;
      },
      set: function(I) {
        m = I;
      }
    });
    var A = arguments[1];
    Object.defineProperty(this, "y", {
      enumerable: !0,
      get: function() {
        return A;
      },
      set: function(I) {
        A = I;
      }
    });
    var b = arguments[2];
    Object.defineProperty(this, "width", {
      enumerable: !0,
      get: function() {
        return b;
      },
      set: function(I) {
        b = I;
      }
    });
    var S = arguments[3];
    Object.defineProperty(this, "height", {
      enumerable: !0,
      get: function() {
        return S;
      },
      set: function(I) {
        S = I;
      }
    });
    var g = arguments[4];
    Object.defineProperty(this, "text", {
      enumerable: !0,
      get: function() {
        return g;
      },
      set: function(I) {
        g = I;
      }
    });
    var B = arguments[5];
    Object.defineProperty(this, "lineNumber", {
      enumerable: !0,
      get: function() {
        return B;
      },
      set: function(I) {
        B = I;
      }
    });
    var F = arguments[6];
    return Object.defineProperty(this, "align", {
      enumerable: !0,
      get: function() {
        return F;
      },
      set: function(I) {
        F = I;
      }
    }), this;
  };
  a.prototype.clone = function() {
    return new a(this.x, this.y, this.width, this.height, this.text, this.lineNumber, this.align);
  }, a.prototype.toArray = function() {
    return [this.x, this.y, this.width, this.height, this.text, this.lineNumber, this.align];
  }, l.setHeaderFunction = function(c) {
    return n.call(this), this.internal.__cell__.headerFunction = typeof c == "function" ? c : void 0, this;
  }, l.getTextDimensions = function(c, m) {
    n.call(this);
    var A = (m = m || {}).fontSize || this.getFontSize(), b = m.font || this.getFont(), S = m.scaleFactor || this.internal.scaleFactor, g = 0, B = 0, F = 0, O = this;
    if (!Array.isArray(c) && typeof c != "string") {
      if (typeof c != "number") throw new Error("getTextDimensions expects text-parameter to be of type String or type Number or an Array of Strings.");
      c = String(c);
    }
    var I = m.maxWidth;
    I > 0 ? typeof c == "string" ? c = this.splitTextToSize(c, I) : Object.prototype.toString.call(c) === "[object Array]" && (c = c.reduce(function(J, et) {
      return J.concat(O.splitTextToSize(et, I));
    }, [])) : c = Array.isArray(c) ? c : [c];
    for (var N = 0; N < c.length; N++) g < (F = this.getStringUnitWidth(c[N], {
      font: b
    }) * A) && (g = F);
    return g !== 0 && (B = c.length), {
      w: g /= S,
      h: Math.max((B * A * this.getLineHeightFactor() - A * (this.getLineHeightFactor() - 1)) / S, 0)
    };
  }, l.cellAddPage = function() {
    n.call(this), this.addPage();
    var c = this.internal.__cell__.margins || e;
    return this.internal.__cell__.lastCell = new a(c.left, c.top, void 0, void 0), this.internal.__cell__.pages += 1, this;
  };
  var o = l.cell = function() {
    var c;
    c = arguments[0] instanceof a ? arguments[0] : new a(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]), n.call(this);
    var m = this.internal.__cell__.lastCell, A = this.internal.__cell__.padding, b = this.internal.__cell__.margins || e, S = this.internal.__cell__.tableHeaderRow, g = this.internal.__cell__.printHeaders;
    return m.lineNumber !== void 0 && (m.lineNumber === c.lineNumber ? (c.x = (m.x || 0) + (m.width || 0), c.y = m.y || 0) : m.y + m.height + c.height + b.bottom > this.getPageHeight() ? (this.cellAddPage(), c.y = b.top, g && S && (this.printHeaderRow(c.lineNumber, !0), c.y += S[0].height)) : c.y = m.y + m.height || c.y), c.text[0] !== void 0 && (this.rect(c.x, c.y, c.width, c.height, r === !0 ? "FD" : void 0), c.align === "right" ? this.text(c.text, c.x + c.width - A, c.y + A, {
      align: "right",
      baseline: "top"
    }) : c.align === "center" ? this.text(c.text, c.x + c.width / 2, c.y + A, {
      align: "center",
      baseline: "top",
      maxWidth: c.width - A - A
    }) : this.text(c.text, c.x + A, c.y + A, {
      align: "left",
      baseline: "top",
      maxWidth: c.width - A - A
    })), this.internal.__cell__.lastCell = c, this;
  };
  l.table = function(c, m, A, b, S) {
    if (n.call(this), !A) throw new Error("No data for PDF table.");
    var g, B, F, O, I = [], N = [], J = [], et = {}, ct = {}, bt = [], nt = [], dt = (S = S || {}).autoSize || !1, z = S.printHeaders !== !1, at = S.css && S.css["font-size"] !== void 0 ? 16 * S.css["font-size"] : S.fontSize || 12, M = S.margins || Object.assign({
      width: this.getPageWidth()
    }, e), k = typeof S.padding == "number" ? S.padding : 3, D = S.headerBackgroundColor || "#c8c8c8", R = S.headerTextColor || "#000";
    if (s.call(this), this.internal.__cell__.printHeaders = z, this.internal.__cell__.margins = M, this.internal.__cell__.table_font_size = at, this.internal.__cell__.padding = k, this.internal.__cell__.headerBackgroundColor = D, this.internal.__cell__.headerTextColor = R, this.setFontSize(at), b == null) N = I = Object.keys(A[0]), J = I.map(function() {
      return "left";
    });
    else if (Array.isArray(b) && fe(b[0]) === "object") for (I = b.map(function(rt) {
      return rt.name;
    }), N = b.map(function(rt) {
      return rt.prompt || rt.name || "";
    }), J = b.map(function(rt) {
      return rt.align || "left";
    }), g = 0; g < b.length; g += 1) ct[b[g].name] = b[g].width * (19.049976 / 25.4);
    else Array.isArray(b) && typeof b[0] == "string" && (N = I = b, J = I.map(function() {
      return "left";
    }));
    if (dt || Array.isArray(b) && typeof b[0] == "string") for (g = 0; g < I.length; g += 1) {
      for (et[O = I[g]] = A.map(function(rt) {
        return rt[O];
      }), this.setFont(void 0, "bold"), bt.push(this.getTextDimensions(N[g], {
        fontSize: this.internal.__cell__.table_font_size,
        scaleFactor: this.internal.scaleFactor
      }).w), B = et[O], this.setFont(void 0, "normal"), F = 0; F < B.length; F += 1) bt.push(this.getTextDimensions(B[F], {
        fontSize: this.internal.__cell__.table_font_size,
        scaleFactor: this.internal.scaleFactor
      }).w);
      ct[O] = Math.max.apply(null, bt) + k + k, bt = [];
    }
    if (z) {
      var ot = {};
      for (g = 0; g < I.length; g += 1) ot[I[g]] = {}, ot[I[g]].text = N[g], ot[I[g]].align = J[g];
      var st = f.call(this, ot, ct);
      nt = I.map(function(rt) {
        return new a(c, m, ct[rt], st, ot[rt].text, void 0, ot[rt].align);
      }), this.setTableHeaderRow(nt), this.printHeaderRow(1, !1);
    }
    var ht = b.reduce(function(rt, xt) {
      return rt[xt.name] = xt.align, rt;
    }, {});
    for (g = 0; g < A.length; g += 1) {
      "rowStart" in S && S.rowStart instanceof Function && S.rowStart({
        row: g,
        data: A[g]
      }, this);
      var X = f.call(this, A[g], ct);
      for (F = 0; F < I.length; F += 1) {
        var Nt = A[g][I[F]];
        "cellStart" in S && S.cellStart instanceof Function && S.cellStart({
          row: g,
          col: F,
          data: Nt
        }, this), o.call(this, new a(c, m, ct[I[F]], X, Nt, g + 2, ht[I[F]]));
      }
    }
    return this.internal.__cell__.table_x = c, this.internal.__cell__.table_y = m, this;
  };
  var f = function(m, A) {
    var b = this.internal.__cell__.padding, S = this.internal.__cell__.table_font_size, g = this.internal.scaleFactor;
    return Object.keys(m).map(function(B) {
      var F = m[B];
      return this.splitTextToSize(F.hasOwnProperty("text") ? F.text : F, A[B] - b - b);
    }, this).map(function(B) {
      return this.getLineHeightFactor() * B.length * S / g + b + b;
    }, this).reduce(function(B, F) {
      return Math.max(B, F);
    }, 0);
  };
  l.setTableHeaderRow = function(c) {
    n.call(this), this.internal.__cell__.tableHeaderRow = c;
  }, l.printHeaderRow = function(c, m) {
    if (n.call(this), !this.internal.__cell__.tableHeaderRow) throw new Error("Property tableHeaderRow does not exist.");
    var A;
    if (r = !0, typeof this.internal.__cell__.headerFunction == "function") {
      var b = this.internal.__cell__.headerFunction(this, this.internal.__cell__.pages);
      this.internal.__cell__.lastCell = new a(b[0], b[1], b[2], b[3], void 0, -1);
    }
    this.setFont(void 0, "bold");
    for (var S = [], g = 0; g < this.internal.__cell__.tableHeaderRow.length; g += 1) {
      A = this.internal.__cell__.tableHeaderRow[g].clone(), m && (A.y = this.internal.__cell__.margins.top || 0, S.push(A)), A.lineNumber = c;
      var B = this.getTextColor();
      this.setTextColor(this.internal.__cell__.headerTextColor), this.setFillColor(this.internal.__cell__.headerBackgroundColor), o.call(this, A), this.setTextColor(B);
    }
    S.length > 0 && this.setTableHeaderRow(S), this.setFont(void 0, "normal"), r = !1;
  };
}(Wt.API);
var Tu = {
  italic: ["italic", "oblique", "normal"],
  oblique: ["oblique", "italic", "normal"],
  normal: ["normal", "oblique", "italic"]
}, Ru = ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded"], xo = Du(Ru), zu = [100, 200, 300, 400, 500, 600, 700, 800, 900], nc = Du(zu);
function So(l) {
  var e = l.family.replace(/"|'/g, "").toLowerCase(), r = function(a) {
    return Tu[a = a || "normal"] ? a : "normal";
  }(l.style), n = function(a) {
    if (!a) return 400;
    if (typeof a == "number") return a >= 100 && a <= 900 && a % 100 == 0 ? a : 400;
    if (/^\d00$/.test(a)) return parseInt(a);
    switch (a) {
      case "bold":
        return 700;
      case "normal":
      default:
        return 400;
    }
  }(l.weight), s = function(a) {
    return typeof xo[a = a || "normal"] == "number" ? a : "normal";
  }(l.stretch);
  return {
    family: e,
    style: r,
    weight: n,
    stretch: s,
    src: l.src || [],
    ref: l.ref || {
      name: e,
      style: [s, r, n].join(" ")
    }
  };
}
function hu(l, e, r, n) {
  var s;
  for (s = r; s >= 0 && s < e.length; s += n) if (l[e[s]]) return l[e[s]];
  for (s = r; s >= 0 && s < e.length; s -= n) if (l[e[s]]) return l[e[s]];
}
var ic = {
  "sans-serif": "helvetica",
  fixed: "courier",
  monospace: "courier",
  terminal: "courier",
  cursive: "times",
  fantasy: "times",
  serif: "times"
}, fu = {
  caption: "times",
  icon: "times",
  menu: "times",
  "message-box": "times",
  "small-caption": "times",
  "status-bar": "times"
};
function du(l) {
  return [l.stretch, l.style, l.weight, l.family].join(" ");
}
function ac(l, e, r) {
  for (var n = (r = r || {}).defaultFontFamily || "times", s = Object.assign({}, ic, r.genericFontFamilies || {}), a = null, o = null, f = 0; f < e.length; ++f) if (s[(a = So(e[f])).family] && (a.family = s[a.family]), l.hasOwnProperty(a.family)) {
    o = l[a.family];
    break;
  }
  if (!(o = o || l[n])) throw new Error("Could not find a font-family for the rule '" + du(a) + "' and default family '" + n + "'.");
  if (o = function(c, m) {
    if (m[c]) return m[c];
    var A = xo[c], b = A <= xo.normal ? -1 : 1, S = hu(m, Ru, A, b);
    if (!S) throw new Error("Could not find a matching font-stretch value for " + c);
    return S;
  }(a.stretch, o), o = function(c, m) {
    if (m[c]) return m[c];
    for (var A = Tu[c], b = 0; b < A.length; ++b) if (m[A[b]]) return m[A[b]];
    throw new Error("Could not find a matching font-style for " + c);
  }(a.style, o), !(o = function(c, m) {
    if (m[c]) return m[c];
    if (c === 400 && m[500]) return m[500];
    if (c === 500 && m[400]) return m[400];
    var A = nc[c], b = hu(m, zu, A, c < 400 ? -1 : 1);
    if (!b) throw new Error("Could not find a matching font-weight for value " + c);
    return b;
  }(a.weight, o))) throw new Error("Failed to resolve a font for the rule '" + du(a) + "'.");
  return o;
}
function pu(l) {
  return l.trimLeft();
}
function sc(l, e) {
  for (var r = 0; r < l.length; ) {
    if (l.charAt(r) === e) return [l.substring(0, r), l.substring(r + 1)];
    r += 1;
  }
  return null;
}
function oc(l) {
  var e = l.match(/^(-[a-z_]|[a-z_])[a-z0-9_-]*/i);
  return e === null ? null : [e[0], l.substring(e[0].length)];
}
var os, gu, mu, fo = ["times"];
(function(l) {
  var e, r, n, s, a, o, f, c, m, A = function(x) {
    return x = x || {}, this.isStrokeTransparent = x.isStrokeTransparent || !1, this.strokeOpacity = x.strokeOpacity || 1, this.strokeStyle = x.strokeStyle || "#000000", this.fillStyle = x.fillStyle || "#000000", this.isFillTransparent = x.isFillTransparent || !1, this.fillOpacity = x.fillOpacity || 1, this.font = x.font || "10px sans-serif", this.textBaseline = x.textBaseline || "alphabetic", this.textAlign = x.textAlign || "left", this.lineWidth = x.lineWidth || 1, this.lineJoin = x.lineJoin || "miter", this.lineCap = x.lineCap || "butt", this.path = x.path || [], this.transform = x.transform !== void 0 ? x.transform.clone() : new c(), this.globalCompositeOperation = x.globalCompositeOperation || "normal", this.globalAlpha = x.globalAlpha || 1, this.clip_path = x.clip_path || [], this.currentPoint = x.currentPoint || new o(), this.miterLimit = x.miterLimit || 10, this.lastPoint = x.lastPoint || new o(), this.lineDashOffset = x.lineDashOffset || 0, this.lineDash = x.lineDash || [], this.margin = x.margin || [0, 0, 0, 0], this.prevPageLastElemOffset = x.prevPageLastElemOffset || 0, this.ignoreClearRect = typeof x.ignoreClearRect != "boolean" || x.ignoreClearRect, this;
  };
  l.events.push(["initialized", function() {
    this.context2d = new b(this), e = this.internal.f2, r = this.internal.getCoordinateString, n = this.internal.getVerticalCoordinateString, s = this.internal.getHorizontalCoordinate, a = this.internal.getVerticalCoordinate, o = this.internal.Point, f = this.internal.Rectangle, c = this.internal.Matrix, m = new A();
  }]);
  var b = function(x) {
    Object.defineProperty(this, "canvas", {
      get: function() {
        return {
          parentNode: !1,
          style: !1
        };
      }
    });
    var q = x;
    Object.defineProperty(this, "pdf", {
      get: function() {
        return q;
      }
    });
    var U = !1;
    Object.defineProperty(this, "pageWrapXEnabled", {
      get: function() {
        return U;
      },
      set: function(mt) {
        U = !!mt;
      }
    });
    var V = !1;
    Object.defineProperty(this, "pageWrapYEnabled", {
      get: function() {
        return V;
      },
      set: function(mt) {
        V = !!mt;
      }
    });
    var K = 0;
    Object.defineProperty(this, "posX", {
      get: function() {
        return K;
      },
      set: function(mt) {
        isNaN(mt) || (K = mt);
      }
    });
    var ft = 0;
    Object.defineProperty(this, "posY", {
      get: function() {
        return ft;
      },
      set: function(mt) {
        isNaN(mt) || (ft = mt);
      }
    }), Object.defineProperty(this, "margin", {
      get: function() {
        return m.margin;
      },
      set: function(mt) {
        var kt;
        typeof mt == "number" ? kt = [mt, mt, mt, mt] : ((kt = new Array(4))[0] = mt[0], kt[1] = mt.length >= 2 ? mt[1] : kt[0], kt[2] = mt.length >= 3 ? mt[2] : kt[0], kt[3] = mt.length >= 4 ? mt[3] : kt[1]), m.margin = kt;
      }
    });
    var it = !1;
    Object.defineProperty(this, "autoPaging", {
      get: function() {
        return it;
      },
      set: function(mt) {
        it = mt;
      }
    });
    var ut = 0;
    Object.defineProperty(this, "lastBreak", {
      get: function() {
        return ut;
      },
      set: function(mt) {
        ut = mt;
      }
    });
    var Lt = [];
    Object.defineProperty(this, "pageBreaks", {
      get: function() {
        return Lt;
      },
      set: function(mt) {
        Lt = mt;
      }
    }), Object.defineProperty(this, "ctx", {
      get: function() {
        return m;
      },
      set: function(mt) {
        mt instanceof A && (m = mt);
      }
    }), Object.defineProperty(this, "path", {
      get: function() {
        return m.path;
      },
      set: function(mt) {
        m.path = mt;
      }
    });
    var jt = [];
    Object.defineProperty(this, "ctxStack", {
      get: function() {
        return jt;
      },
      set: function(mt) {
        jt = mt;
      }
    }), Object.defineProperty(this, "fillStyle", {
      get: function() {
        return this.ctx.fillStyle;
      },
      set: function(mt) {
        var kt;
        kt = S(mt), this.ctx.fillStyle = kt.style, this.ctx.isFillTransparent = kt.a === 0, this.ctx.fillOpacity = kt.a, this.pdf.setFillColor(kt.r, kt.g, kt.b, {
          a: kt.a
        }), this.pdf.setTextColor(kt.r, kt.g, kt.b, {
          a: kt.a
        });
      }
    }), Object.defineProperty(this, "strokeStyle", {
      get: function() {
        return this.ctx.strokeStyle;
      },
      set: function(mt) {
        var kt = S(mt);
        this.ctx.strokeStyle = kt.style, this.ctx.isStrokeTransparent = kt.a === 0, this.ctx.strokeOpacity = kt.a, kt.a === 0 ? this.pdf.setDrawColor(255, 255, 255) : (kt.a, this.pdf.setDrawColor(kt.r, kt.g, kt.b));
      }
    }), Object.defineProperty(this, "lineCap", {
      get: function() {
        return this.ctx.lineCap;
      },
      set: function(mt) {
        ["butt", "round", "square"].indexOf(mt) !== -1 && (this.ctx.lineCap = mt, this.pdf.setLineCap(mt));
      }
    }), Object.defineProperty(this, "lineWidth", {
      get: function() {
        return this.ctx.lineWidth;
      },
      set: function(mt) {
        isNaN(mt) || (this.ctx.lineWidth = mt, this.pdf.setLineWidth(mt));
      }
    }), Object.defineProperty(this, "lineJoin", {
      get: function() {
        return this.ctx.lineJoin;
      },
      set: function(mt) {
        ["bevel", "round", "miter"].indexOf(mt) !== -1 && (this.ctx.lineJoin = mt, this.pdf.setLineJoin(mt));
      }
    }), Object.defineProperty(this, "miterLimit", {
      get: function() {
        return this.ctx.miterLimit;
      },
      set: function(mt) {
        isNaN(mt) || (this.ctx.miterLimit = mt, this.pdf.setMiterLimit(mt));
      }
    }), Object.defineProperty(this, "textBaseline", {
      get: function() {
        return this.ctx.textBaseline;
      },
      set: function(mt) {
        this.ctx.textBaseline = mt;
      }
    }), Object.defineProperty(this, "textAlign", {
      get: function() {
        return this.ctx.textAlign;
      },
      set: function(mt) {
        ["right", "end", "center", "left", "start"].indexOf(mt) !== -1 && (this.ctx.textAlign = mt);
      }
    });
    var Ft = null;
    function Rt(j, mt) {
      if (Ft === null) {
        var kt = function(At) {
          var Ot = [];
          return Object.keys(At).forEach(function(_t) {
            At[_t].forEach(function(Mt) {
              var qt = null;
              switch (Mt) {
                case "bold":
                  qt = {
                    family: _t,
                    weight: "bold"
                  };
                  break;
                case "italic":
                  qt = {
                    family: _t,
                    style: "italic"
                  };
                  break;
                case "bolditalic":
                  qt = {
                    family: _t,
                    weight: "bold",
                    style: "italic"
                  };
                  break;
                case "":
                case "normal":
                  qt = {
                    family: _t
                  };
              }
              qt !== null && (qt.ref = {
                name: _t,
                style: Mt
              }, Ot.push(qt));
            });
          }), Ot;
        }(j.getFontList());
        Ft = function(At) {
          for (var Ot = {}, _t = 0; _t < At.length; ++_t) {
            var Mt = So(At[_t]), qt = Mt.family, zt = Mt.stretch, ne = Mt.style, Ht = Mt.weight;
            Ot[qt] = Ot[qt] || {}, Ot[qt][zt] = Ot[qt][zt] || {}, Ot[qt][zt][ne] = Ot[qt][zt][ne] || {}, Ot[qt][zt][ne][Ht] = Mt;
          }
          return Ot;
        }(kt.concat(mt));
      }
      return Ft;
    }
    var Dt = null;
    Object.defineProperty(this, "fontFaces", {
      get: function() {
        return Dt;
      },
      set: function(mt) {
        Ft = null, Dt = mt;
      }
    }), Object.defineProperty(this, "font", {
      get: function() {
        return this.ctx.font;
      },
      set: function(mt) {
        var kt;
        if (this.ctx.font = mt, (kt = /^\s*(?=(?:(?:[-a-z]+\s*){0,2}(italic|oblique))?)(?=(?:(?:[-a-z]+\s*){0,2}(small-caps))?)(?=(?:(?:[-a-z]+\s*){0,2}(bold(?:er)?|lighter|[1-9]00))?)(?:(?:normal|\1|\2|\3)\s*){0,3}((?:xx?-)?(?:small|large)|medium|smaller|larger|[.\d]+(?:\%|in|[cem]m|ex|p[ctx]))(?:\s*\/\s*(normal|[.\d]+(?:\%|in|[cem]m|ex|p[ctx])))?\s*([-_,\"\'\sa-z]+?)\s*$/i.exec(mt)) !== null) {
          var At = kt[1];
          kt[2];
          var Ot = kt[3], _t = kt[4];
          kt[5];
          var Mt = kt[6], qt = /^([.\d]+)((?:%|in|[cem]m|ex|p[ctx]))$/i.exec(_t)[2];
          _t = Math.floor(qt === "px" ? parseFloat(_t) * this.pdf.internal.scaleFactor : qt === "em" ? parseFloat(_t) * this.pdf.getFontSize() : parseFloat(_t) * this.pdf.internal.scaleFactor), this.pdf.setFontSize(_t);
          var zt = function(Ct) {
            var er, ye, He = [], ee = Ct.trim();
            if (ee === "") return fo;
            if (ee in fu) return [fu[ee]];
            for (; ee !== ""; ) {
              switch (ye = null, er = (ee = pu(ee)).charAt(0)) {
                case '"':
                case "'":
                  ye = sc(ee.substring(1), er);
                  break;
                default:
                  ye = oc(ee);
              }
              if (ye === null || (He.push(ye[0]), (ee = pu(ye[1])) !== "" && ee.charAt(0) !== ",")) return fo;
              ee = ee.replace(/^,/, "");
            }
            return He;
          }(Mt);
          if (this.fontFaces) {
            var ne = ac(Rt(this.pdf, this.fontFaces), zt.map(function(Ct) {
              return {
                family: Ct,
                stretch: "normal",
                weight: Ot,
                style: At
              };
            }));
            this.pdf.setFont(ne.ref.name, ne.ref.style);
          } else {
            var Ht = "";
            (Ot === "bold" || parseInt(Ot, 10) >= 700 || At === "bold") && (Ht = "bold"), At === "italic" && (Ht += "italic"), Ht.length === 0 && (Ht = "normal");
            for (var ie = "", be = {
              arial: "Helvetica",
              Arial: "Helvetica",
              verdana: "Helvetica",
              Verdana: "Helvetica",
              helvetica: "Helvetica",
              Helvetica: "Helvetica",
              "sans-serif": "Helvetica",
              fixed: "Courier",
              monospace: "Courier",
              terminal: "Courier",
              cursive: "Times",
              fantasy: "Times",
              serif: "Times"
            }, Vt = 0; Vt < zt.length; Vt++) {
              if (this.pdf.internal.getFont(zt[Vt], Ht, {
                noFallback: !0,
                disableWarning: !0
              }) !== void 0) {
                ie = zt[Vt];
                break;
              }
              if (Ht === "bolditalic" && this.pdf.internal.getFont(zt[Vt], "bold", {
                noFallback: !0,
                disableWarning: !0
              }) !== void 0) ie = zt[Vt], Ht = "bold";
              else if (this.pdf.internal.getFont(zt[Vt], "normal", {
                noFallback: !0,
                disableWarning: !0
              }) !== void 0) {
                ie = zt[Vt], Ht = "normal";
                break;
              }
            }
            if (ie === "") {
              for (var Qt = 0; Qt < zt.length; Qt++) if (be[zt[Qt]]) {
                ie = be[zt[Qt]];
                break;
              }
            }
            ie = ie === "" ? "Times" : ie, this.pdf.setFont(ie, Ht);
          }
        }
      }
    }), Object.defineProperty(this, "globalCompositeOperation", {
      get: function() {
        return this.ctx.globalCompositeOperation;
      },
      set: function(mt) {
        this.ctx.globalCompositeOperation = mt;
      }
    }), Object.defineProperty(this, "globalAlpha", {
      get: function() {
        return this.ctx.globalAlpha;
      },
      set: function(mt) {
        this.ctx.globalAlpha = mt;
      }
    }), Object.defineProperty(this, "lineDashOffset", {
      get: function() {
        return this.ctx.lineDashOffset;
      },
      set: function(mt) {
        this.ctx.lineDashOffset = mt, xt.call(this);
      }
    }), Object.defineProperty(this, "lineDash", {
      get: function() {
        return this.ctx.lineDash;
      },
      set: function(mt) {
        this.ctx.lineDash = mt, xt.call(this);
      }
    }), Object.defineProperty(this, "ignoreClearRect", {
      get: function() {
        return this.ctx.ignoreClearRect;
      },
      set: function(mt) {
        this.ctx.ignoreClearRect = !!mt;
      }
    });
  };
  b.prototype.setLineDash = function(E) {
    this.lineDash = E;
  }, b.prototype.getLineDash = function() {
    return this.lineDash.length % 2 ? this.lineDash.concat(this.lineDash) : this.lineDash.slice();
  }, b.prototype.fill = function() {
    et.call(this, "fill", !1);
  }, b.prototype.stroke = function() {
    et.call(this, "stroke", !1);
  }, b.prototype.beginPath = function() {
    this.path = [{
      type: "begin"
    }];
  }, b.prototype.moveTo = function(E, x) {
    if (isNaN(E) || isNaN(x)) throw ve.error("jsPDF.context2d.moveTo: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.moveTo");
    var q = this.ctx.transform.applyToPoint(new o(E, x));
    this.path.push({
      type: "mt",
      x: q.x,
      y: q.y
    }), this.ctx.lastPoint = new o(E, x);
  }, b.prototype.closePath = function() {
    var E = new o(0, 0), x = 0;
    for (x = this.path.length - 1; x !== -1; x--) if (this.path[x].type === "begin" && fe(this.path[x + 1]) === "object" && typeof this.path[x + 1].x == "number") {
      E = new o(this.path[x + 1].x, this.path[x + 1].y);
      break;
    }
    this.path.push({
      type: "close"
    }), this.ctx.lastPoint = new o(E.x, E.y);
  }, b.prototype.lineTo = function(E, x) {
    if (isNaN(E) || isNaN(x)) throw ve.error("jsPDF.context2d.lineTo: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.lineTo");
    var q = this.ctx.transform.applyToPoint(new o(E, x));
    this.path.push({
      type: "lt",
      x: q.x,
      y: q.y
    }), this.ctx.lastPoint = new o(q.x, q.y);
  }, b.prototype.clip = function() {
    this.ctx.clip_path = JSON.parse(JSON.stringify(this.path)), et.call(this, null, !0);
  }, b.prototype.quadraticCurveTo = function(E, x, q, U) {
    if (isNaN(q) || isNaN(U) || isNaN(E) || isNaN(x)) throw ve.error("jsPDF.context2d.quadraticCurveTo: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.quadraticCurveTo");
    var V = this.ctx.transform.applyToPoint(new o(q, U)), K = this.ctx.transform.applyToPoint(new o(E, x));
    this.path.push({
      type: "qct",
      x1: K.x,
      y1: K.y,
      x: V.x,
      y: V.y
    }), this.ctx.lastPoint = new o(V.x, V.y);
  }, b.prototype.bezierCurveTo = function(E, x, q, U, V, K) {
    if (isNaN(V) || isNaN(K) || isNaN(E) || isNaN(x) || isNaN(q) || isNaN(U)) throw ve.error("jsPDF.context2d.bezierCurveTo: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.bezierCurveTo");
    var ft = this.ctx.transform.applyToPoint(new o(V, K)), it = this.ctx.transform.applyToPoint(new o(E, x)), ut = this.ctx.transform.applyToPoint(new o(q, U));
    this.path.push({
      type: "bct",
      x1: it.x,
      y1: it.y,
      x2: ut.x,
      y2: ut.y,
      x: ft.x,
      y: ft.y
    }), this.ctx.lastPoint = new o(ft.x, ft.y);
  }, b.prototype.arc = function(E, x, q, U, V, K) {
    if (isNaN(E) || isNaN(x) || isNaN(q) || isNaN(U) || isNaN(V)) throw ve.error("jsPDF.context2d.arc: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.arc");
    if (K = !!K, !this.ctx.transform.isIdentity) {
      var ft = this.ctx.transform.applyToPoint(new o(E, x));
      E = ft.x, x = ft.y;
      var it = this.ctx.transform.applyToPoint(new o(0, q)), ut = this.ctx.transform.applyToPoint(new o(0, 0));
      q = Math.sqrt(Math.pow(it.x - ut.x, 2) + Math.pow(it.y - ut.y, 2));
    }
    Math.abs(V - U) >= 2 * Math.PI && (U = 0, V = 2 * Math.PI), this.path.push({
      type: "arc",
      x: E,
      y: x,
      radius: q,
      startAngle: U,
      endAngle: V,
      counterclockwise: K
    });
  }, b.prototype.arcTo = function(E, x, q, U, V) {
    throw new Error("arcTo not implemented.");
  }, b.prototype.rect = function(E, x, q, U) {
    if (isNaN(E) || isNaN(x) || isNaN(q) || isNaN(U)) throw ve.error("jsPDF.context2d.rect: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.rect");
    this.moveTo(E, x), this.lineTo(E + q, x), this.lineTo(E + q, x + U), this.lineTo(E, x + U), this.lineTo(E, x), this.lineTo(E + q, x), this.lineTo(E, x);
  }, b.prototype.fillRect = function(E, x, q, U) {
    if (isNaN(E) || isNaN(x) || isNaN(q) || isNaN(U)) throw ve.error("jsPDF.context2d.fillRect: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.fillRect");
    if (!g.call(this)) {
      var V = {};
      this.lineCap !== "butt" && (V.lineCap = this.lineCap, this.lineCap = "butt"), this.lineJoin !== "miter" && (V.lineJoin = this.lineJoin, this.lineJoin = "miter"), this.beginPath(), this.rect(E, x, q, U), this.fill(), V.hasOwnProperty("lineCap") && (this.lineCap = V.lineCap), V.hasOwnProperty("lineJoin") && (this.lineJoin = V.lineJoin);
    }
  }, b.prototype.strokeRect = function(E, x, q, U) {
    if (isNaN(E) || isNaN(x) || isNaN(q) || isNaN(U)) throw ve.error("jsPDF.context2d.strokeRect: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.strokeRect");
    B.call(this) || (this.beginPath(), this.rect(E, x, q, U), this.stroke());
  }, b.prototype.clearRect = function(E, x, q, U) {
    if (isNaN(E) || isNaN(x) || isNaN(q) || isNaN(U)) throw ve.error("jsPDF.context2d.clearRect: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.clearRect");
    this.ignoreClearRect || (this.fillStyle = "#ffffff", this.fillRect(E, x, q, U));
  }, b.prototype.save = function(E) {
    E = typeof E != "boolean" || E;
    for (var x = this.pdf.internal.getCurrentPageInfo().pageNumber, q = 0; q < this.pdf.internal.getNumberOfPages(); q++) this.pdf.setPage(q + 1), this.pdf.internal.out("q");
    if (this.pdf.setPage(x), E) {
      this.ctx.fontSize = this.pdf.internal.getFontSize();
      var U = new A(this.ctx);
      this.ctxStack.push(this.ctx), this.ctx = U;
    }
  }, b.prototype.restore = function(E) {
    E = typeof E != "boolean" || E;
    for (var x = this.pdf.internal.getCurrentPageInfo().pageNumber, q = 0; q < this.pdf.internal.getNumberOfPages(); q++) this.pdf.setPage(q + 1), this.pdf.internal.out("Q");
    this.pdf.setPage(x), E && this.ctxStack.length !== 0 && (this.ctx = this.ctxStack.pop(), this.fillStyle = this.ctx.fillStyle, this.strokeStyle = this.ctx.strokeStyle, this.font = this.ctx.font, this.lineCap = this.ctx.lineCap, this.lineWidth = this.ctx.lineWidth, this.lineJoin = this.ctx.lineJoin, this.lineDash = this.ctx.lineDash, this.lineDashOffset = this.ctx.lineDashOffset);
  }, b.prototype.toDataURL = function() {
    throw new Error("toDataUrl not implemented.");
  };
  var S = function(x) {
    var q, U, V, K;
    if (x.isCanvasGradient === !0 && (x = x.getColor()), !x) return {
      r: 0,
      g: 0,
      b: 0,
      a: 0,
      style: x
    };
    if (/transparent|rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*0+\s*\)/.test(x)) q = 0, U = 0, V = 0, K = 0;
    else {
      var ft = /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(x);
      if (ft !== null) q = parseInt(ft[1]), U = parseInt(ft[2]), V = parseInt(ft[3]), K = 1;
      else if ((ft = /rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/.exec(x)) !== null) q = parseInt(ft[1]), U = parseInt(ft[2]), V = parseInt(ft[3]), K = parseFloat(ft[4]);
      else {
        if (K = 1, typeof x == "string" && x.charAt(0) !== "#") {
          var it = new ju(x);
          x = it.ok ? it.toHex() : "#000000";
        }
        x.length === 4 ? (q = x.substring(1, 2), q += q, U = x.substring(2, 3), U += U, V = x.substring(3, 4), V += V) : (q = x.substring(1, 3), U = x.substring(3, 5), V = x.substring(5, 7)), q = parseInt(q, 16), U = parseInt(U, 16), V = parseInt(V, 16);
      }
    }
    return {
      r: q,
      g: U,
      b: V,
      a: K,
      style: x
    };
  }, g = function() {
    return this.ctx.isFillTransparent || this.globalAlpha == 0;
  }, B = function() {
    return !!(this.ctx.isStrokeTransparent || this.globalAlpha == 0);
  };
  b.prototype.fillText = function(E, x, q, U) {
    if (isNaN(x) || isNaN(q) || typeof E != "string") throw ve.error("jsPDF.context2d.fillText: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.fillText");
    if (U = isNaN(U) ? void 0 : U, !g.call(this)) {
      var V = X(this.ctx.transform.rotation), K = this.ctx.transform.scaleX;
      k.call(this, {
        text: E,
        x,
        y: q,
        scale: K,
        angle: V,
        align: this.textAlign,
        maxWidth: U
      });
    }
  }, b.prototype.strokeText = function(E, x, q, U) {
    if (isNaN(x) || isNaN(q) || typeof E != "string") throw ve.error("jsPDF.context2d.strokeText: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.strokeText");
    if (!B.call(this)) {
      U = isNaN(U) ? void 0 : U;
      var V = X(this.ctx.transform.rotation), K = this.ctx.transform.scaleX;
      k.call(this, {
        text: E,
        x,
        y: q,
        scale: K,
        renderingMode: "stroke",
        angle: V,
        align: this.textAlign,
        maxWidth: U
      });
    }
  }, b.prototype.measureText = function(E) {
    if (typeof E != "string") throw ve.error("jsPDF.context2d.measureText: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.measureText");
    var x = this.pdf, q = this.pdf.internal.scaleFactor, U = x.internal.getFontSize(), V = x.getStringUnitWidth(E) * U / x.internal.scaleFactor, K = function(it) {
      var ut = (it = it || {}).width || 0;
      return Object.defineProperty(this, "width", {
        get: function() {
          return ut;
        }
      }), this;
    };
    return new K({
      width: V *= Math.round(96 * q / 72 * 1e4) / 1e4
    });
  }, b.prototype.scale = function(E, x) {
    if (isNaN(E) || isNaN(x)) throw ve.error("jsPDF.context2d.scale: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.scale");
    var q = new c(E, 0, 0, x, 0, 0);
    this.ctx.transform = this.ctx.transform.multiply(q);
  }, b.prototype.rotate = function(E) {
    if (isNaN(E)) throw ve.error("jsPDF.context2d.rotate: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.rotate");
    var x = new c(Math.cos(E), Math.sin(E), -Math.sin(E), Math.cos(E), 0, 0);
    this.ctx.transform = this.ctx.transform.multiply(x);
  }, b.prototype.translate = function(E, x) {
    if (isNaN(E) || isNaN(x)) throw ve.error("jsPDF.context2d.translate: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.translate");
    var q = new c(1, 0, 0, 1, E, x);
    this.ctx.transform = this.ctx.transform.multiply(q);
  }, b.prototype.transform = function(E, x, q, U, V, K) {
    if (isNaN(E) || isNaN(x) || isNaN(q) || isNaN(U) || isNaN(V) || isNaN(K)) throw ve.error("jsPDF.context2d.transform: Invalid arguments", arguments), new Error("Invalid arguments passed to jsPDF.context2d.transform");
    var ft = new c(E, x, q, U, V, K);
    this.ctx.transform = this.ctx.transform.multiply(ft);
  }, b.prototype.setTransform = function(E, x, q, U, V, K) {
    E = isNaN(E) ? 1 : E, x = isNaN(x) ? 0 : x, q = isNaN(q) ? 0 : q, U = isNaN(U) ? 1 : U, V = isNaN(V) ? 0 : V, K = isNaN(K) ? 0 : K, this.ctx.transform = new c(E, x, q, U, V, K);
  };
  var F = function() {
    return this.margin[0] > 0 || this.margin[1] > 0 || this.margin[2] > 0 || this.margin[3] > 0;
  };
  b.prototype.drawImage = function(E, x, q, U, V, K, ft, it, ut) {
    var Lt = this.pdf.getImageProperties(E), jt = 1, Ft = 1, Rt = 1, Dt = 1;
    U !== void 0 && it !== void 0 && (Rt = it / U, Dt = ut / V, jt = Lt.width / U * it / U, Ft = Lt.height / V * ut / V), K === void 0 && (K = x, ft = q, x = 0, q = 0), U !== void 0 && it === void 0 && (it = U, ut = V), U === void 0 && it === void 0 && (it = Lt.width, ut = Lt.height);
    for (var j, mt = this.ctx.transform.decompose(), kt = X(mt.rotate.shx), At = new c(), Ot = (At = (At = (At = At.multiply(mt.translate)).multiply(mt.skew)).multiply(mt.scale)).applyToRectangle(new f(K - x * Rt, ft - q * Dt, U * jt, V * Ft)), _t = O.call(this, Ot), Mt = [], qt = 0; qt < _t.length; qt += 1) Mt.indexOf(_t[qt]) === -1 && Mt.push(_t[qt]);
    if (J(Mt), this.autoPaging) for (var zt = Mt[0], ne = Mt[Mt.length - 1], Ht = zt; Ht < ne + 1; Ht++) {
      this.pdf.setPage(Ht);
      var ie = this.pdf.internal.pageSize.width - this.margin[3] - this.margin[1], be = Ht === 1 ? this.posY + this.margin[0] : this.margin[0], Vt = this.pdf.internal.pageSize.height - this.posY - this.margin[0] - this.margin[2], Qt = this.pdf.internal.pageSize.height - this.margin[0] - this.margin[2], Ct = Ht === 1 ? 0 : Vt + (Ht - 2) * Qt;
      if (this.ctx.clip_path.length !== 0) {
        var er = this.path;
        j = JSON.parse(JSON.stringify(this.ctx.clip_path)), this.path = N(j, this.posX + this.margin[3], -Ct + be + this.ctx.prevPageLastElemOffset), ct.call(this, "fill", !0), this.path = er;
      }
      var ye = JSON.parse(JSON.stringify(Ot));
      ye = N([ye], this.posX + this.margin[3], -Ct + be + this.ctx.prevPageLastElemOffset)[0];
      var He = (Ht > zt || Ht < ne) && F.call(this);
      He && (this.pdf.saveGraphicsState(), this.pdf.rect(this.margin[3], this.margin[0], ie, Qt, null).clip().discardPath()), this.pdf.addImage(E, "JPEG", ye.x, ye.y, ye.w, ye.h, null, null, kt), He && this.pdf.restoreGraphicsState();
    }
    else this.pdf.addImage(E, "JPEG", Ot.x, Ot.y, Ot.w, Ot.h, null, null, kt);
  };
  var O = function(x, q, U) {
    var V = [];
    q = q || this.pdf.internal.pageSize.width, U = U || this.pdf.internal.pageSize.height - this.margin[0] - this.margin[2];
    var K = this.posY + this.ctx.prevPageLastElemOffset;
    switch (x.type) {
      default:
      case "mt":
      case "lt":
        V.push(Math.floor((x.y + K) / U) + 1);
        break;
      case "arc":
        V.push(Math.floor((x.y + K - x.radius) / U) + 1), V.push(Math.floor((x.y + K + x.radius) / U) + 1);
        break;
      case "qct":
        var ft = Nt(this.ctx.lastPoint.x, this.ctx.lastPoint.y, x.x1, x.y1, x.x, x.y);
        V.push(Math.floor((ft.y + K) / U) + 1), V.push(Math.floor((ft.y + ft.h + K) / U) + 1);
        break;
      case "bct":
        var it = rt(this.ctx.lastPoint.x, this.ctx.lastPoint.y, x.x1, x.y1, x.x2, x.y2, x.x, x.y);
        V.push(Math.floor((it.y + K) / U) + 1), V.push(Math.floor((it.y + it.h + K) / U) + 1);
        break;
      case "rect":
        V.push(Math.floor((x.y + K) / U) + 1), V.push(Math.floor((x.y + x.h + K) / U) + 1);
    }
    for (var ut = 0; ut < V.length; ut += 1) for (; this.pdf.internal.getNumberOfPages() < V[ut]; ) I.call(this);
    return V;
  }, I = function() {
    var x = this.fillStyle, q = this.strokeStyle, U = this.font, V = this.lineCap, K = this.lineWidth, ft = this.lineJoin;
    this.pdf.addPage(), this.fillStyle = x, this.strokeStyle = q, this.font = U, this.lineCap = V, this.lineWidth = K, this.lineJoin = ft;
  }, N = function(x, q, U) {
    for (var V = 0; V < x.length; V++) switch (x[V].type) {
      case "bct":
        x[V].x2 += q, x[V].y2 += U;
      case "qct":
        x[V].x1 += q, x[V].y1 += U;
      case "mt":
      case "lt":
      case "arc":
      default:
        x[V].x += q, x[V].y += U;
    }
    return x;
  }, J = function(x) {
    return x.sort(function(q, U) {
      return q - U;
    });
  }, et = function(x, q) {
    for (var U, V, K = this.fillStyle, ft = this.strokeStyle, it = this.lineCap, ut = this.lineWidth, Lt = Math.abs(ut * this.ctx.transform.scaleX), jt = this.lineJoin, Ft = JSON.parse(JSON.stringify(this.path)), Rt = JSON.parse(JSON.stringify(this.path)), Dt = [], j = 0; j < Rt.length; j++) if (Rt[j].x !== void 0) for (var mt = O.call(this, Rt[j]), kt = 0; kt < mt.length; kt += 1) Dt.indexOf(mt[kt]) === -1 && Dt.push(mt[kt]);
    for (var At = 0; At < Dt.length; At++) for (; this.pdf.internal.getNumberOfPages() < Dt[At]; ) I.call(this);
    if (J(Dt), this.autoPaging) for (var Ot = Dt[0], _t = Dt[Dt.length - 1], Mt = Ot; Mt < _t + 1; Mt++) {
      this.pdf.setPage(Mt), this.fillStyle = K, this.strokeStyle = ft, this.lineCap = it, this.lineWidth = Lt, this.lineJoin = jt;
      var qt = this.pdf.internal.pageSize.width - this.margin[3] - this.margin[1], zt = Mt === 1 ? this.posY + this.margin[0] : this.margin[0], ne = this.pdf.internal.pageSize.height - this.posY - this.margin[0] - this.margin[2], Ht = this.pdf.internal.pageSize.height - this.margin[0] - this.margin[2], ie = Mt === 1 ? 0 : ne + (Mt - 2) * Ht;
      if (this.ctx.clip_path.length !== 0) {
        var be = this.path;
        U = JSON.parse(JSON.stringify(this.ctx.clip_path)), this.path = N(U, this.posX + this.margin[3], -ie + zt + this.ctx.prevPageLastElemOffset), ct.call(this, x, !0), this.path = be;
      }
      if (V = JSON.parse(JSON.stringify(Ft)), this.path = N(V, this.posX + this.margin[3], -ie + zt + this.ctx.prevPageLastElemOffset), q === !1 || Mt === 0) {
        var Vt = (Mt > Ot || Mt < _t) && F.call(this);
        Vt && (this.pdf.saveGraphicsState(), this.pdf.rect(this.margin[3], this.margin[0], qt, Ht, null).clip().discardPath()), ct.call(this, x, q), Vt && this.pdf.restoreGraphicsState();
      }
      this.lineWidth = ut;
    }
    else this.lineWidth = Lt, ct.call(this, x, q), this.lineWidth = ut;
    this.path = Ft;
  }, ct = function(x, q) {
    if ((x !== "stroke" || q || !B.call(this)) && (x === "stroke" || q || !g.call(this))) {
      for (var U, V, K = [], ft = this.path, it = 0; it < ft.length; it++) {
        var ut = ft[it];
        switch (ut.type) {
          case "begin":
            K.push({
              begin: !0
            });
            break;
          case "close":
            K.push({
              close: !0
            });
            break;
          case "mt":
            K.push({
              start: ut,
              deltas: [],
              abs: []
            });
            break;
          case "lt":
            var Lt = K.length;
            if (ft[it - 1] && !isNaN(ft[it - 1].x) && (U = [ut.x - ft[it - 1].x, ut.y - ft[it - 1].y], Lt > 0)) {
              for (; Lt >= 0; Lt--) if (K[Lt - 1].close !== !0 && K[Lt - 1].begin !== !0) {
                K[Lt - 1].deltas.push(U), K[Lt - 1].abs.push(ut);
                break;
              }
            }
            break;
          case "bct":
            U = [ut.x1 - ft[it - 1].x, ut.y1 - ft[it - 1].y, ut.x2 - ft[it - 1].x, ut.y2 - ft[it - 1].y, ut.x - ft[it - 1].x, ut.y - ft[it - 1].y], K[K.length - 1].deltas.push(U);
            break;
          case "qct":
            var jt = ft[it - 1].x + 2 / 3 * (ut.x1 - ft[it - 1].x), Ft = ft[it - 1].y + 2 / 3 * (ut.y1 - ft[it - 1].y), Rt = ut.x + 2 / 3 * (ut.x1 - ut.x), Dt = ut.y + 2 / 3 * (ut.y1 - ut.y), j = ut.x, mt = ut.y;
            U = [jt - ft[it - 1].x, Ft - ft[it - 1].y, Rt - ft[it - 1].x, Dt - ft[it - 1].y, j - ft[it - 1].x, mt - ft[it - 1].y], K[K.length - 1].deltas.push(U);
            break;
          case "arc":
            K.push({
              deltas: [],
              abs: [],
              arc: !0
            }), Array.isArray(K[K.length - 1].abs) && K[K.length - 1].abs.push(ut);
        }
      }
      V = q ? null : x === "stroke" ? "stroke" : "fill";
      for (var kt = !1, At = 0; At < K.length; At++) if (K[At].arc) for (var Ot = K[At].abs, _t = 0; _t < Ot.length; _t++) {
        var Mt = Ot[_t];
        Mt.type === "arc" ? dt.call(this, Mt.x, Mt.y, Mt.radius, Mt.startAngle, Mt.endAngle, Mt.counterclockwise, void 0, q, !kt) : D.call(this, Mt.x, Mt.y), kt = !0;
      }
      else if (K[At].close === !0) this.pdf.internal.out("h"), kt = !1;
      else if (K[At].begin !== !0) {
        var qt = K[At].start.x, zt = K[At].start.y;
        R.call(this, K[At].deltas, qt, zt), kt = !0;
      }
      V && z.call(this, V), q && at.call(this);
    }
  }, bt = function(x) {
    var q = this.pdf.internal.getFontSize() / this.pdf.internal.scaleFactor, U = q * (this.pdf.internal.getLineHeightFactor() - 1);
    switch (this.ctx.textBaseline) {
      case "bottom":
        return x - U;
      case "top":
        return x + q - U;
      case "hanging":
        return x + q - 2 * U;
      case "middle":
        return x + q / 2 - U;
      case "ideographic":
        return x;
      case "alphabetic":
      default:
        return x;
    }
  }, nt = function(x) {
    return x + this.pdf.internal.getFontSize() / this.pdf.internal.scaleFactor * (this.pdf.internal.getLineHeightFactor() - 1);
  };
  b.prototype.createLinearGradient = function() {
    var E = function() {
    };
    return E.colorStops = [], E.addColorStop = function(x, q) {
      this.colorStops.push([x, q]);
    }, E.getColor = function() {
      return this.colorStops.length === 0 ? "#000000" : this.colorStops[0][1];
    }, E.isCanvasGradient = !0, E;
  }, b.prototype.createPattern = function() {
    return this.createLinearGradient();
  }, b.prototype.createRadialGradient = function() {
    return this.createLinearGradient();
  };
  var dt = function(x, q, U, V, K, ft, it, ut, Lt) {
    for (var jt = st.call(this, U, V, K, ft), Ft = 0; Ft < jt.length; Ft++) {
      var Rt = jt[Ft];
      Ft === 0 && (Lt ? M.call(this, Rt.x1 + x, Rt.y1 + q) : D.call(this, Rt.x1 + x, Rt.y1 + q)), ot.call(this, x, q, Rt.x2, Rt.y2, Rt.x3, Rt.y3, Rt.x4, Rt.y4);
    }
    ut ? at.call(this) : z.call(this, it);
  }, z = function(x) {
    switch (x) {
      case "stroke":
        this.pdf.internal.out("S");
        break;
      case "fill":
        this.pdf.internal.out("f");
    }
  }, at = function() {
    this.pdf.clip(), this.pdf.discardPath();
  }, M = function(x, q) {
    this.pdf.internal.out(r(x) + " " + n(q) + " m");
  }, k = function(x) {
    var q;
    switch (x.align) {
      case "right":
      case "end":
        q = "right";
        break;
      case "center":
        q = "center";
        break;
      case "left":
      case "start":
      default:
        q = "left";
    }
    var U = this.pdf.getTextDimensions(x.text), V = bt.call(this, x.y), K = nt.call(this, V) - U.h, ft = this.ctx.transform.applyToPoint(new o(x.x, V)), it = this.ctx.transform.decompose(), ut = new c();
    ut = (ut = (ut = ut.multiply(it.translate)).multiply(it.skew)).multiply(it.scale);
    for (var Lt, jt, Ft, Rt = this.ctx.transform.applyToRectangle(new f(x.x, V, U.w, U.h)), Dt = ut.applyToRectangle(new f(x.x, K, U.w, U.h)), j = O.call(this, Dt), mt = [], kt = 0; kt < j.length; kt += 1) mt.indexOf(j[kt]) === -1 && mt.push(j[kt]);
    if (J(mt), this.autoPaging) for (var At = mt[0], Ot = mt[mt.length - 1], _t = At; _t < Ot + 1; _t++) {
      this.pdf.setPage(_t);
      var Mt = _t === 1 ? this.posY + this.margin[0] : this.margin[0], qt = this.pdf.internal.pageSize.height - this.posY - this.margin[0] - this.margin[2], zt = this.pdf.internal.pageSize.height - this.margin[2], ne = zt - this.margin[0], Ht = this.pdf.internal.pageSize.width - this.margin[1], ie = Ht - this.margin[3], be = _t === 1 ? 0 : qt + (_t - 2) * ne;
      if (this.ctx.clip_path.length !== 0) {
        var Vt = this.path;
        Lt = JSON.parse(JSON.stringify(this.ctx.clip_path)), this.path = N(Lt, this.posX + this.margin[3], -1 * be + Mt), ct.call(this, "fill", !0), this.path = Vt;
      }
      var Qt = N([JSON.parse(JSON.stringify(Dt))], this.posX + this.margin[3], -be + Mt + this.ctx.prevPageLastElemOffset)[0];
      x.scale >= 0.01 && (jt = this.pdf.internal.getFontSize(), this.pdf.setFontSize(jt * x.scale), Ft = this.lineWidth, this.lineWidth = Ft * x.scale);
      var Ct = this.autoPaging !== "text";
      if (Ct || Qt.y + Qt.h <= zt) {
        if (Ct || Qt.y >= Mt && Qt.x <= Ht) {
          var er = Ct ? x.text : this.pdf.splitTextToSize(x.text, x.maxWidth || Ht - Qt.x)[0], ye = N([JSON.parse(JSON.stringify(Rt))], this.posX + this.margin[3], -be + Mt + this.ctx.prevPageLastElemOffset)[0], He = Ct && (_t > At || _t < Ot) && F.call(this);
          He && (this.pdf.saveGraphicsState(), this.pdf.rect(this.margin[3], this.margin[0], ie, ne, null).clip().discardPath()), this.pdf.text(er, ye.x, ye.y, {
            angle: x.angle,
            align: q,
            renderingMode: x.renderingMode
          }), He && this.pdf.restoreGraphicsState();
        }
      } else Qt.y < zt && (this.ctx.prevPageLastElemOffset += zt - Qt.y);
      x.scale >= 0.01 && (this.pdf.setFontSize(jt), this.lineWidth = Ft);
    }
    else x.scale >= 0.01 && (jt = this.pdf.internal.getFontSize(), this.pdf.setFontSize(jt * x.scale), Ft = this.lineWidth, this.lineWidth = Ft * x.scale), this.pdf.text(x.text, ft.x + this.posX, ft.y + this.posY, {
      angle: x.angle,
      align: q,
      renderingMode: x.renderingMode,
      maxWidth: x.maxWidth
    }), x.scale >= 0.01 && (this.pdf.setFontSize(jt), this.lineWidth = Ft);
  }, D = function(x, q, U, V) {
    U = U || 0, V = V || 0, this.pdf.internal.out(r(x + U) + " " + n(q + V) + " l");
  }, R = function(x, q, U) {
    return this.pdf.lines(x, q, U, null, null);
  }, ot = function(x, q, U, V, K, ft, it, ut) {
    this.pdf.internal.out([e(s(U + x)), e(a(V + q)), e(s(K + x)), e(a(ft + q)), e(s(it + x)), e(a(ut + q)), "c"].join(" "));
  }, st = function(x, q, U, V) {
    for (var K = 2 * Math.PI, ft = Math.PI / 2; q > U; ) q -= K;
    var it = Math.abs(U - q);
    it < K && V && (it = K - it);
    for (var ut = [], Lt = V ? -1 : 1, jt = q; it > 1e-5; ) {
      var Ft = jt + Lt * Math.min(it, ft);
      ut.push(ht.call(this, x, jt, Ft)), it -= Math.abs(Ft - jt), jt = Ft;
    }
    return ut;
  }, ht = function(x, q, U) {
    var V = (U - q) / 2, K = x * Math.cos(V), ft = x * Math.sin(V), it = K, ut = -ft, Lt = it * it + ut * ut, jt = Lt + it * K + ut * ft, Ft = 4 / 3 * (Math.sqrt(2 * Lt * jt) - jt) / (it * ft - ut * K), Rt = it - Ft * ut, Dt = ut + Ft * it, j = Rt, mt = -Dt, kt = V + q, At = Math.cos(kt), Ot = Math.sin(kt);
    return {
      x1: x * Math.cos(q),
      y1: x * Math.sin(q),
      x2: Rt * At - Dt * Ot,
      y2: Rt * Ot + Dt * At,
      x3: j * At - mt * Ot,
      y3: j * Ot + mt * At,
      x4: x * Math.cos(U),
      y4: x * Math.sin(U)
    };
  }, X = function(x) {
    return 180 * x / Math.PI;
  }, Nt = function(x, q, U, V, K, ft) {
    var it = x + 0.5 * (U - x), ut = q + 0.5 * (V - q), Lt = K + 0.5 * (U - K), jt = ft + 0.5 * (V - ft), Ft = Math.min(x, K, it, Lt), Rt = Math.max(x, K, it, Lt), Dt = Math.min(q, ft, ut, jt), j = Math.max(q, ft, ut, jt);
    return new f(Ft, Dt, Rt - Ft, j - Dt);
  }, rt = function(x, q, U, V, K, ft, it, ut) {
    var Lt, jt, Ft, Rt, Dt, j, mt, kt, At, Ot, _t, Mt, qt, zt, ne = U - x, Ht = V - q, ie = K - U, be = ft - V, Vt = it - K, Qt = ut - ft;
    for (jt = 0; jt < 41; jt++) At = (mt = (Ft = x + (Lt = jt / 40) * ne) + Lt * ((Dt = U + Lt * ie) - Ft)) + Lt * (Dt + Lt * (K + Lt * Vt - Dt) - mt), Ot = (kt = (Rt = q + Lt * Ht) + Lt * ((j = V + Lt * be) - Rt)) + Lt * (j + Lt * (ft + Lt * Qt - j) - kt), jt == 0 ? (_t = At, Mt = Ot, qt = At, zt = Ot) : (_t = Math.min(_t, At), Mt = Math.min(Mt, Ot), qt = Math.max(qt, At), zt = Math.max(zt, Ot));
    return new f(Math.round(_t), Math.round(Mt), Math.round(qt - _t), Math.round(zt - Mt));
  }, xt = function() {
    if (this.prevLineDash || this.ctx.lineDash.length || this.ctx.lineDashOffset) {
      var x, q, U = (x = this.ctx.lineDash, q = this.ctx.lineDashOffset, JSON.stringify({
        lineDash: x,
        lineDashOffset: q
      }));
      this.prevLineDash !== U && (this.pdf.setLineDash(this.ctx.lineDash, this.ctx.lineDashOffset), this.prevLineDash = U);
    }
  };
})(Wt.API), /**
 * @license
 * jsPDF filters PlugIn
 * Copyright (c) 2014 Aras Abbasi
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  var e = function(o) {
    var f, c, m, A, b, S, g, B, F, O;
    for (c = [], m = 0, A = (o += f = "\0\0\0\0".slice(o.length % 4 || 4)).length; A > m; m += 4) (b = (o.charCodeAt(m) << 24) + (o.charCodeAt(m + 1) << 16) + (o.charCodeAt(m + 2) << 8) + o.charCodeAt(m + 3)) !== 0 ? (S = (b = ((b = ((b = ((b = (b - (O = b % 85)) / 85) - (F = b % 85)) / 85) - (B = b % 85)) / 85) - (g = b % 85)) / 85) % 85, c.push(S + 33, g + 33, B + 33, F + 33, O + 33)) : c.push(122);
    return function(I, N) {
      for (var J = N; J > 0; J--) I.pop();
    }(c, f.length), String.fromCharCode.apply(String, c) + "~>";
  }, r = function(o) {
    var f, c, m, A, b, S = String, g = "length", B = 255, F = "charCodeAt", O = "slice", I = "replace";
    for (o[O](-2), o = o[O](0, -2)[I](/\s/g, "")[I]("z", "!!!!!"), m = [], A = 0, b = (o += f = "uuuuu"[O](o[g] % 5 || 5))[g]; b > A; A += 5) c = 52200625 * (o[F](A) - 33) + 614125 * (o[F](A + 1) - 33) + 7225 * (o[F](A + 2) - 33) + 85 * (o[F](A + 3) - 33) + (o[F](A + 4) - 33), m.push(B & c >> 24, B & c >> 16, B & c >> 8, B & c);
    return function(N, J) {
      for (var et = J; et > 0; et--) N.pop();
    }(m, f[g]), S.fromCharCode.apply(S, m);
  }, n = function(o) {
    var f = new RegExp(/^([0-9A-Fa-f]{2})+$/);
    if ((o = o.replace(/\s/g, "")).indexOf(">") !== -1 && (o = o.substr(0, o.indexOf(">"))), o.length % 2 && (o += "0"), f.test(o) === !1) return "";
    for (var c = "", m = 0; m < o.length; m += 2) c += String.fromCharCode("0x" + (o[m] + o[m + 1]));
    return c;
  }, s = function(o) {
    for (var f = new Uint8Array(o.length), c = o.length; c--; ) f[c] = o.charCodeAt(c);
    return o = (f = yo(f)).reduce(function(m, A) {
      return m + String.fromCharCode(A);
    }, "");
  };
  l.processDataByFilters = function(a, o) {
    var f = 0, c = a || "", m = [];
    for (typeof (o = o || []) == "string" && (o = [o]), f = 0; f < o.length; f += 1) switch (o[f]) {
      case "ASCII85Decode":
      case "/ASCII85Decode":
        c = r(c), m.push("/ASCII85Encode");
        break;
      case "ASCII85Encode":
      case "/ASCII85Encode":
        c = e(c), m.push("/ASCII85Decode");
        break;
      case "ASCIIHexDecode":
      case "/ASCIIHexDecode":
        c = n(c), m.push("/ASCIIHexEncode");
        break;
      case "ASCIIHexEncode":
      case "/ASCIIHexEncode":
        c = c.split("").map(function(A) {
          return ("0" + A.charCodeAt().toString(16)).slice(-2);
        }).join("") + ">", m.push("/ASCIIHexDecode");
        break;
      case "FlateEncode":
      case "/FlateEncode":
        c = s(c), m.push("/FlateDecode");
        break;
      default:
        throw new Error('The filter: "' + o[f] + '" is not implemented');
    }
    return {
      data: c,
      reverseChain: m.reverse().join(" ")
    };
  };
}(Wt.API), /**
 * @license
 * jsPDF fileloading PlugIn
 * Copyright (c) 2018 Aras Abbasi (aras.abbasi@gmail.com)
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  l.loadFile = function(e, r, n) {
    return function(s, a, o) {
      a = a !== !1, o = typeof o == "function" ? o : function() {
      };
      var f = void 0;
      try {
        f = function(c, m, A) {
          var b = new XMLHttpRequest(), S = 0, g = function(F) {
            var O = F.length, I = [], N = String.fromCharCode;
            for (S = 0; S < O; S += 1) I.push(N(255 & F.charCodeAt(S)));
            return I.join("");
          };
          if (b.open("GET", c, !m), b.overrideMimeType("text/plain; charset=x-user-defined"), m === !1 && (b.onload = function() {
            b.status === 200 ? A(g(this.responseText)) : A(void 0);
          }), b.send(null), m && b.status === 200) return g(b.responseText);
        }(s, a, o);
      } catch (c) {
      }
      return f;
    }(e, r, n);
  }, l.loadImageFile = l.loadFile;
}(Wt.API), function(l) {
  function e() {
    return (Yt.html2canvas ? Promise.resolve(Yt.html2canvas) : import("./html2canvas.esm-Cb9_gtsU.js")).catch(function(o) {
      return Promise.reject(new Error("Could not load html2canvas: " + o));
    }).then(function(o) {
      return o.default ? o.default : o;
    });
  }
  function r() {
    return (Yt.DOMPurify ? Promise.resolve(Yt.DOMPurify) : import("./purify.es-DU-5x4Jr.js")).catch(function(o) {
      return Promise.reject(new Error("Could not load dompurify: " + o));
    }).then(function(o) {
      return o.default ? o.default : o;
    });
  }
  var n = function(f) {
    var c = fe(f);
    return c === "undefined" ? "undefined" : c === "string" || f instanceof String ? "string" : c === "number" || f instanceof Number ? "number" : c === "function" || f instanceof Function ? "function" : f && f.constructor === Array ? "array" : f && f.nodeType === 1 ? "element" : c === "object" ? "object" : "unknown";
  }, s = function(f, c) {
    var m = document.createElement(f);
    for (var A in c.className && (m.className = c.className), c.innerHTML && c.dompurify && (m.innerHTML = c.dompurify.sanitize(c.innerHTML)), c.style) m.style[A] = c.style[A];
    return m;
  }, a = function o(f) {
    var c = Object.assign(o.convert(Promise.resolve()), JSON.parse(JSON.stringify(o.template))), m = o.convert(Promise.resolve(), c);
    return m = (m = m.setProgress(1, o, 1, [o])).set(f);
  };
  (a.prototype = Object.create(Promise.prototype)).constructor = a, a.convert = function(o, f) {
    return o.__proto__ = f || a.prototype, o;
  }, a.template = {
    prop: {
      src: null,
      container: null,
      overlay: null,
      canvas: null,
      img: null,
      pdf: null,
      pageSize: null,
      callback: function() {
      }
    },
    progress: {
      val: 0,
      state: null,
      n: 0,
      stack: []
    },
    opt: {
      filename: "file.pdf",
      margin: [0, 0, 0, 0],
      enableLinks: !0,
      x: 0,
      y: 0,
      html2canvas: {},
      jsPDF: {},
      backgroundColor: "transparent"
    }
  }, a.prototype.from = function(o, f) {
    return this.then(function() {
      switch (f = f || function(c) {
        switch (n(c)) {
          case "string":
            return "string";
          case "element":
            return c.nodeName.toLowerCase() === "canvas" ? "canvas" : "element";
          default:
            return "unknown";
        }
      }(o)) {
        case "string":
          return this.then(r).then(function(c) {
            return this.set({
              src: s("div", {
                innerHTML: o,
                dompurify: c
              })
            });
          });
        case "element":
          return this.set({
            src: o
          });
        case "canvas":
          return this.set({
            canvas: o
          });
        case "img":
          return this.set({
            img: o
          });
        default:
          return this.error("Unknown source type.");
      }
    });
  }, a.prototype.to = function(o) {
    switch (o) {
      case "container":
        return this.toContainer();
      case "canvas":
        return this.toCanvas();
      case "img":
        return this.toImg();
      case "pdf":
        return this.toPdf();
      default:
        return this.error("Invalid target.");
    }
  }, a.prototype.toContainer = function() {
    return this.thenList([function() {
      return this.prop.src || this.error("Cannot duplicate - no source HTML.");
    }, function() {
      return this.prop.pageSize || this.setPageSize();
    }]).then(function() {
      var o = {
        position: "relative",
        display: "inline-block",
        width: (typeof this.opt.width != "number" || isNaN(this.opt.width) || typeof this.opt.windowWidth != "number" || isNaN(this.opt.windowWidth) ? Math.max(this.prop.src.clientWidth, this.prop.src.scrollWidth, this.prop.src.offsetWidth) : this.opt.windowWidth) + "px",
        left: 0,
        right: 0,
        top: 0,
        margin: "auto",
        backgroundColor: this.opt.backgroundColor
      }, f = function c(m, A) {
        for (var b = m.nodeType === 3 ? document.createTextNode(m.nodeValue) : m.cloneNode(!1), S = m.firstChild; S; S = S.nextSibling) A !== !0 && S.nodeType === 1 && S.nodeName === "SCRIPT" || b.appendChild(c(S, A));
        return m.nodeType === 1 && (m.nodeName === "CANVAS" ? (b.width = m.width, b.height = m.height, b.getContext("2d").drawImage(m, 0, 0)) : m.nodeName !== "TEXTAREA" && m.nodeName !== "SELECT" || (b.value = m.value), b.addEventListener("load", function() {
          b.scrollTop = m.scrollTop, b.scrollLeft = m.scrollLeft;
        }, !0)), b;
      }(this.prop.src, this.opt.html2canvas.javascriptEnabled);
      f.tagName === "BODY" && (o.height = Math.max(document.body.scrollHeight, document.body.offsetHeight, document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight) + "px"), this.prop.overlay = s("div", {
        className: "html2pdf__overlay",
        style: {
          position: "fixed",
          overflow: "hidden",
          zIndex: 1e3,
          left: "-100000px",
          right: 0,
          bottom: 0,
          top: 0
        }
      }), this.prop.container = s("div", {
        className: "html2pdf__container",
        style: o
      }), this.prop.container.appendChild(f), this.prop.container.firstChild.appendChild(s("div", {
        style: {
          clear: "both",
          border: "0 none transparent",
          margin: 0,
          padding: 0,
          height: 0
        }
      })), this.prop.container.style.float = "none", this.prop.overlay.appendChild(this.prop.container), document.body.appendChild(this.prop.overlay), this.prop.container.firstChild.style.position = "relative", this.prop.container.height = Math.max(this.prop.container.firstChild.clientHeight, this.prop.container.firstChild.scrollHeight, this.prop.container.firstChild.offsetHeight) + "px";
    });
  }, a.prototype.toCanvas = function() {
    var o = [function() {
      return document.body.contains(this.prop.container) || this.toContainer();
    }];
    return this.thenList(o).then(e).then(function(f) {
      var c = Object.assign({}, this.opt.html2canvas);
      return delete c.onrendered, f(this.prop.container, c);
    }).then(function(f) {
      (this.opt.html2canvas.onrendered || function() {
      })(f), this.prop.canvas = f, document.body.removeChild(this.prop.overlay);
    });
  }, a.prototype.toContext2d = function() {
    var o = [function() {
      return document.body.contains(this.prop.container) || this.toContainer();
    }];
    return this.thenList(o).then(e).then(function(f) {
      var c = this.opt.jsPDF, m = this.opt.fontFaces, A = typeof this.opt.width != "number" || isNaN(this.opt.width) || typeof this.opt.windowWidth != "number" || isNaN(this.opt.windowWidth) ? 1 : this.opt.width / this.opt.windowWidth, b = Object.assign({
        async: !0,
        allowTaint: !0,
        scale: A,
        scrollX: this.opt.scrollX || 0,
        scrollY: this.opt.scrollY || 0,
        backgroundColor: "#ffffff",
        imageTimeout: 15e3,
        logging: !0,
        proxy: null,
        removeContainer: !0,
        foreignObjectRendering: !1,
        useCORS: !1
      }, this.opt.html2canvas);
      if (delete b.onrendered, c.context2d.autoPaging = this.opt.autoPaging === void 0 || this.opt.autoPaging, c.context2d.posX = this.opt.x, c.context2d.posY = this.opt.y, c.context2d.margin = this.opt.margin, c.context2d.fontFaces = m, m) for (var S = 0; S < m.length; ++S) {
        var g = m[S], B = g.src.find(function(F) {
          return F.format === "truetype";
        });
        B && c.addFont(B.url, g.ref.name, g.ref.style);
      }
      return b.windowHeight = b.windowHeight || 0, b.windowHeight = b.windowHeight == 0 ? Math.max(this.prop.container.clientHeight, this.prop.container.scrollHeight, this.prop.container.offsetHeight) : b.windowHeight, c.context2d.save(!0), f(this.prop.container, b);
    }).then(function(f) {
      this.opt.jsPDF.context2d.restore(!0), (this.opt.html2canvas.onrendered || function() {
      })(f), this.prop.canvas = f, document.body.removeChild(this.prop.overlay);
    });
  }, a.prototype.toImg = function() {
    return this.thenList([function() {
      return this.prop.canvas || this.toCanvas();
    }]).then(function() {
      var o = this.prop.canvas.toDataURL("image/" + this.opt.image.type, this.opt.image.quality);
      this.prop.img = document.createElement("img"), this.prop.img.src = o;
    });
  }, a.prototype.toPdf = function() {
    return this.thenList([function() {
      return this.toContext2d();
    }]).then(function() {
      this.prop.pdf = this.prop.pdf || this.opt.jsPDF;
    });
  }, a.prototype.output = function(o, f, c) {
    return (c = c || "pdf").toLowerCase() === "img" || c.toLowerCase() === "image" ? this.outputImg(o, f) : this.outputPdf(o, f);
  }, a.prototype.outputPdf = function(o, f) {
    return this.thenList([function() {
      return this.prop.pdf || this.toPdf();
    }]).then(function() {
      return this.prop.pdf.output(o, f);
    });
  }, a.prototype.outputImg = function(o) {
    return this.thenList([function() {
      return this.prop.img || this.toImg();
    }]).then(function() {
      switch (o) {
        case void 0:
        case "img":
          return this.prop.img;
        case "datauristring":
        case "dataurlstring":
          return this.prop.img.src;
        case "datauri":
        case "dataurl":
          return document.location.href = this.prop.img.src;
        default:
          throw 'Image output type "' + o + '" is not supported.';
      }
    });
  }, a.prototype.save = function(o) {
    return this.thenList([function() {
      return this.prop.pdf || this.toPdf();
    }]).set(o ? {
      filename: o
    } : null).then(function() {
      this.prop.pdf.save(this.opt.filename);
    });
  }, a.prototype.doCallback = function() {
    return this.thenList([function() {
      return this.prop.pdf || this.toPdf();
    }]).then(function() {
      this.prop.callback(this.prop.pdf);
    });
  }, a.prototype.set = function(o) {
    if (n(o) !== "object") return this;
    var f = Object.keys(o || {}).map(function(c) {
      if (c in a.template.prop) return function() {
        this.prop[c] = o[c];
      };
      switch (c) {
        case "margin":
          return this.setMargin.bind(this, o.margin);
        case "jsPDF":
          return function() {
            return this.opt.jsPDF = o.jsPDF, this.setPageSize();
          };
        case "pageSize":
          return this.setPageSize.bind(this, o.pageSize);
        default:
          return function() {
            this.opt[c] = o[c];
          };
      }
    }, this);
    return this.then(function() {
      return this.thenList(f);
    });
  }, a.prototype.get = function(o, f) {
    return this.then(function() {
      var c = o in a.template.prop ? this.prop[o] : this.opt[o];
      return f ? f(c) : c;
    });
  }, a.prototype.setMargin = function(o) {
    return this.then(function() {
      switch (n(o)) {
        case "number":
          o = [o, o, o, o];
        case "array":
          if (o.length === 2 && (o = [o[0], o[1], o[0], o[1]]), o.length === 4) break;
        default:
          return this.error("Invalid margin array.");
      }
      this.opt.margin = o;
    }).then(this.setPageSize);
  }, a.prototype.setPageSize = function(o) {
    function f(c, m) {
      return Math.floor(c * m / 72 * 96);
    }
    return this.then(function() {
      (o = o || Wt.getPageSize(this.opt.jsPDF)).hasOwnProperty("inner") || (o.inner = {
        width: o.width - this.opt.margin[1] - this.opt.margin[3],
        height: o.height - this.opt.margin[0] - this.opt.margin[2]
      }, o.inner.px = {
        width: f(o.inner.width, o.k),
        height: f(o.inner.height, o.k)
      }, o.inner.ratio = o.inner.height / o.inner.width), this.prop.pageSize = o;
    });
  }, a.prototype.setProgress = function(o, f, c, m) {
    return o != null && (this.progress.val = o), f != null && (this.progress.state = f), c != null && (this.progress.n = c), m != null && (this.progress.stack = m), this.progress.ratio = this.progress.val / this.progress.state, this;
  }, a.prototype.updateProgress = function(o, f, c, m) {
    return this.setProgress(o ? this.progress.val + o : null, f || null, c ? this.progress.n + c : null, m ? this.progress.stack.concat(m) : null);
  }, a.prototype.then = function(o, f) {
    var c = this;
    return this.thenCore(o, f, function(m, A) {
      return c.updateProgress(null, null, 1, [m]), Promise.prototype.then.call(this, function(b) {
        return c.updateProgress(null, m), b;
      }).then(m, A).then(function(b) {
        return c.updateProgress(1), b;
      });
    });
  }, a.prototype.thenCore = function(o, f, c) {
    c = c || Promise.prototype.then, o && (o = o.bind(this)), f && (f = f.bind(this));
    var m = Promise.toString().indexOf("[native code]") !== -1 && Promise.name === "Promise" ? this : a.convert(Object.assign({}, this), Promise.prototype), A = c.call(m, o, f);
    return a.convert(A, this.__proto__);
  }, a.prototype.thenExternal = function(o, f) {
    return Promise.prototype.then.call(this, o, f);
  }, a.prototype.thenList = function(o) {
    var f = this;
    return o.forEach(function(c) {
      f = f.thenCore(c);
    }), f;
  }, a.prototype.catch = function(o) {
    o && (o = o.bind(this));
    var f = Promise.prototype.catch.call(this, o);
    return a.convert(f, this);
  }, a.prototype.catchExternal = function(o) {
    return Promise.prototype.catch.call(this, o);
  }, a.prototype.error = function(o) {
    return this.then(function() {
      throw new Error(o);
    });
  }, a.prototype.using = a.prototype.set, a.prototype.saveAs = a.prototype.save, a.prototype.export = a.prototype.output, a.prototype.run = a.prototype.then, Wt.getPageSize = function(o, f, c) {
    if (fe(o) === "object") {
      var m = o;
      o = m.orientation, f = m.unit || f, c = m.format || c;
    }
    f = f || "mm", c = c || "a4", o = ("" + (o || "P")).toLowerCase();
    var A, b = ("" + c).toLowerCase(), S = {
      a0: [2383.94, 3370.39],
      a1: [1683.78, 2383.94],
      a2: [1190.55, 1683.78],
      a3: [841.89, 1190.55],
      a4: [595.28, 841.89],
      a5: [419.53, 595.28],
      a6: [297.64, 419.53],
      a7: [209.76, 297.64],
      a8: [147.4, 209.76],
      a9: [104.88, 147.4],
      a10: [73.7, 104.88],
      b0: [2834.65, 4008.19],
      b1: [2004.09, 2834.65],
      b2: [1417.32, 2004.09],
      b3: [1000.63, 1417.32],
      b4: [708.66, 1000.63],
      b5: [498.9, 708.66],
      b6: [354.33, 498.9],
      b7: [249.45, 354.33],
      b8: [175.75, 249.45],
      b9: [124.72, 175.75],
      b10: [87.87, 124.72],
      c0: [2599.37, 3676.54],
      c1: [1836.85, 2599.37],
      c2: [1298.27, 1836.85],
      c3: [918.43, 1298.27],
      c4: [649.13, 918.43],
      c5: [459.21, 649.13],
      c6: [323.15, 459.21],
      c7: [229.61, 323.15],
      c8: [161.57, 229.61],
      c9: [113.39, 161.57],
      c10: [79.37, 113.39],
      dl: [311.81, 623.62],
      letter: [612, 792],
      "government-letter": [576, 756],
      legal: [612, 1008],
      "junior-legal": [576, 360],
      ledger: [1224, 792],
      tabloid: [792, 1224],
      "credit-card": [153, 243]
    };
    switch (f) {
      case "pt":
        A = 1;
        break;
      case "mm":
        A = 72 / 25.4;
        break;
      case "cm":
        A = 72 / 2.54;
        break;
      case "in":
        A = 72;
        break;
      case "px":
        A = 0.75;
        break;
      case "pc":
      case "em":
        A = 12;
        break;
      case "ex":
        A = 6;
        break;
      default:
        throw "Invalid unit: " + f;
    }
    var g, B = 0, F = 0;
    if (S.hasOwnProperty(b)) B = S[b][1] / A, F = S[b][0] / A;
    else try {
      B = c[1], F = c[0];
    } catch (O) {
      throw new Error("Invalid format: " + c);
    }
    if (o === "p" || o === "portrait") o = "p", F > B && (g = F, F = B, B = g);
    else {
      if (o !== "l" && o !== "landscape") throw "Invalid orientation: " + o;
      o = "l", B > F && (g = F, F = B, B = g);
    }
    return {
      width: F,
      height: B,
      unit: f,
      k: A,
      orientation: o
    };
  }, l.html = function(o, f) {
    (f = f || {}).callback = f.callback || function() {
    }, f.html2canvas = f.html2canvas || {}, f.html2canvas.canvas = f.html2canvas.canvas || this.canvas, f.jsPDF = f.jsPDF || this, f.fontFaces = f.fontFaces ? f.fontFaces.map(So) : null;
    var c = new a(f);
    return f.worker ? c : c.from(o).doCallback();
  };
}(Wt.API), Wt.API.addJS = function(l) {
  return mu = l, this.internal.events.subscribe("postPutResources", function() {
    os = this.internal.newObject(), this.internal.out("<<"), this.internal.out("/Names [(EmbeddedJS) " + (os + 1) + " 0 R]"), this.internal.out(">>"), this.internal.out("endobj"), gu = this.internal.newObject(), this.internal.out("<<"), this.internal.out("/S /JavaScript"), this.internal.out("/JS (" + mu + ")"), this.internal.out(">>"), this.internal.out("endobj");
  }), this.internal.events.subscribe("putCatalog", function() {
    os !== void 0 && gu !== void 0 && this.internal.out("/Names <</JavaScript " + os + " 0 R>>");
  }), this;
}, /**
 * @license
 * Copyright (c) 2014 Steven Spungin (TwelveTone LLC)  steven@twelvetone.tv
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  var e;
  l.events.push(["postPutResources", function() {
    var r = this, n = /^(\d+) 0 obj$/;
    if (this.outline.root.children.length > 0) for (var s = r.outline.render().split(/\r\n/), a = 0; a < s.length; a++) {
      var o = s[a], f = n.exec(o);
      if (f != null) {
        var c = f[1];
        r.internal.newObjectDeferredBegin(c, !1);
      }
      r.internal.write(o);
    }
    if (this.outline.createNamedDestinations) {
      var m = this.internal.pages.length, A = [];
      for (a = 0; a < m; a++) {
        var b = r.internal.newObject();
        A.push(b);
        var S = r.internal.getPageInfo(a + 1);
        r.internal.write("<< /D[" + S.objId + " 0 R /XYZ null null null]>> endobj");
      }
      var g = r.internal.newObject();
      for (r.internal.write("<< /Names [ "), a = 0; a < A.length; a++) r.internal.write("(page_" + (a + 1) + ")" + A[a] + " 0 R");
      r.internal.write(" ] >>", "endobj"), e = r.internal.newObject(), r.internal.write("<< /Dests " + g + " 0 R"), r.internal.write(">>", "endobj");
    }
  }]), l.events.push(["putCatalog", function() {
    this.outline.root.children.length > 0 && (this.internal.write("/Outlines", this.outline.makeRef(this.outline.root)), this.outline.createNamedDestinations && this.internal.write("/Names " + e + " 0 R"));
  }]), l.events.push(["initialized", function() {
    var r = this;
    r.outline = {
      createNamedDestinations: !1,
      root: {
        children: []
      }
    }, r.outline.add = function(n, s, a) {
      var o = {
        title: s,
        options: a,
        children: []
      };
      return n == null && (n = this.root), n.children.push(o), o;
    }, r.outline.render = function() {
      return this.ctx = {}, this.ctx.val = "", this.ctx.pdf = r, this.genIds_r(this.root), this.renderRoot(this.root), this.renderItems(this.root), this.ctx.val;
    }, r.outline.genIds_r = function(n) {
      n.id = r.internal.newObjectDeferred();
      for (var s = 0; s < n.children.length; s++) this.genIds_r(n.children[s]);
    }, r.outline.renderRoot = function(n) {
      this.objStart(n), this.line("/Type /Outlines"), n.children.length > 0 && (this.line("/First " + this.makeRef(n.children[0])), this.line("/Last " + this.makeRef(n.children[n.children.length - 1]))), this.line("/Count " + this.count_r({
        count: 0
      }, n)), this.objEnd();
    }, r.outline.renderItems = function(n) {
      for (var s = this.ctx.pdf.internal.getVerticalCoordinateString, a = 0; a < n.children.length; a++) {
        var o = n.children[a];
        this.objStart(o), this.line("/Title " + this.makeString(o.title)), this.line("/Parent " + this.makeRef(n)), a > 0 && this.line("/Prev " + this.makeRef(n.children[a - 1])), a < n.children.length - 1 && this.line("/Next " + this.makeRef(n.children[a + 1])), o.children.length > 0 && (this.line("/First " + this.makeRef(o.children[0])), this.line("/Last " + this.makeRef(o.children[o.children.length - 1])));
        var f = this.count = this.count_r({
          count: 0
        }, o);
        if (f > 0 && this.line("/Count " + f), o.options && o.options.pageNumber) {
          var c = r.internal.getPageInfo(o.options.pageNumber);
          this.line("/Dest [" + c.objId + " 0 R /XYZ 0 " + s(0) + " 0]");
        }
        this.objEnd();
      }
      for (var m = 0; m < n.children.length; m++) this.renderItems(n.children[m]);
    }, r.outline.line = function(n) {
      this.ctx.val += n + `\r
`;
    }, r.outline.makeRef = function(n) {
      return n.id + " 0 R";
    }, r.outline.makeString = function(n) {
      return "(" + r.internal.pdfEscape(n) + ")";
    }, r.outline.objStart = function(n) {
      this.ctx.val += `\r
` + n.id + ` 0 obj\r
<<\r
`;
    }, r.outline.objEnd = function() {
      this.ctx.val += `>> \r
endobj\r
`;
    }, r.outline.count_r = function(n, s) {
      for (var a = 0; a < s.children.length; a++) n.count++, this.count_r(n, s.children[a]);
      return n.count;
    };
  }]);
}(Wt.API), /**
 * @license
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  var e = [192, 193, 194, 195, 196, 197, 198, 199];
  l.processJPEG = function(r, n, s, a, o, f) {
    var c, m = this.decode.DCT_DECODE, A = null;
    if (typeof r == "string" || this.__addimage__.isArrayBuffer(r) || this.__addimage__.isArrayBufferView(r)) {
      switch (r = o || r, r = this.__addimage__.isArrayBuffer(r) ? new Uint8Array(r) : r, (c = function(b) {
        for (var S, g = 256 * b.charCodeAt(4) + b.charCodeAt(5), B = b.length, F = {
          width: 0,
          height: 0,
          numcomponents: 1
        }, O = 4; O < B; O += 2) {
          if (O += g, e.indexOf(b.charCodeAt(O + 1)) !== -1) {
            S = 256 * b.charCodeAt(O + 5) + b.charCodeAt(O + 6), F = {
              width: 256 * b.charCodeAt(O + 7) + b.charCodeAt(O + 8),
              height: S,
              numcomponents: b.charCodeAt(O + 9)
            };
            break;
          }
          g = 256 * b.charCodeAt(O + 2) + b.charCodeAt(O + 3);
        }
        return F;
      }(r = this.__addimage__.isArrayBufferView(r) ? this.__addimage__.arrayBufferToBinaryString(r) : r)).numcomponents) {
        case 1:
          f = this.color_spaces.DEVICE_GRAY;
          break;
        case 4:
          f = this.color_spaces.DEVICE_CMYK;
          break;
        case 3:
          f = this.color_spaces.DEVICE_RGB;
      }
      A = {
        data: r,
        width: c.width,
        height: c.height,
        colorSpace: f,
        bitsPerComponent: 8,
        filter: m,
        index: n,
        alias: s
      };
    }
    return A;
  };
}(Wt.API);
var ji, us, vu, bu, yu, uc = function() {
  var l, e, r;
  function n(a) {
    var o, f, c, m, A, b, S, g, B, F, O, I, N, J;
    for (this.data = a, this.pos = 8, this.palette = [], this.imgData = [], this.transparency = {}, this.animation = null, this.text = {}, b = null; ; ) {
      switch (o = this.readUInt32(), B = function() {
        var et, ct;
        for (ct = [], et = 0; et < 4; ++et) ct.push(String.fromCharCode(this.data[this.pos++]));
        return ct;
      }.call(this).join("")) {
        case "IHDR":
          this.width = this.readUInt32(), this.height = this.readUInt32(), this.bits = this.data[this.pos++], this.colorType = this.data[this.pos++], this.compressionMethod = this.data[this.pos++], this.filterMethod = this.data[this.pos++], this.interlaceMethod = this.data[this.pos++];
          break;
        case "acTL":
          this.animation = {
            numFrames: this.readUInt32(),
            numPlays: this.readUInt32() || 1 / 0,
            frames: []
          };
          break;
        case "PLTE":
          this.palette = this.read(o);
          break;
        case "fcTL":
          b && this.animation.frames.push(b), this.pos += 4, b = {
            width: this.readUInt32(),
            height: this.readUInt32(),
            xOffset: this.readUInt32(),
            yOffset: this.readUInt32()
          }, A = this.readUInt16(), m = this.readUInt16() || 100, b.delay = 1e3 * A / m, b.disposeOp = this.data[this.pos++], b.blendOp = this.data[this.pos++], b.data = [];
          break;
        case "IDAT":
        case "fdAT":
          for (B === "fdAT" && (this.pos += 4, o -= 4), a = (b != null ? b.data : void 0) || this.imgData, I = 0; 0 <= o ? I < o : I > o; 0 <= o ? ++I : --I) a.push(this.data[this.pos++]);
          break;
        case "tRNS":
          switch (this.transparency = {}, this.colorType) {
            case 3:
              if (c = this.palette.length / 3, this.transparency.indexed = this.read(o), this.transparency.indexed.length > c) throw new Error("More transparent colors than palette size");
              if ((F = c - this.transparency.indexed.length) > 0) for (N = 0; 0 <= F ? N < F : N > F; 0 <= F ? ++N : --N) this.transparency.indexed.push(255);
              break;
            case 0:
              this.transparency.grayscale = this.read(o)[0];
              break;
            case 2:
              this.transparency.rgb = this.read(o);
          }
          break;
        case "tEXt":
          S = (O = this.read(o)).indexOf(0), g = String.fromCharCode.apply(String, O.slice(0, S)), this.text[g] = String.fromCharCode.apply(String, O.slice(S + 1));
          break;
        case "IEND":
          return b && this.animation.frames.push(b), this.colors = function() {
            switch (this.colorType) {
              case 0:
              case 3:
              case 4:
                return 1;
              case 2:
              case 6:
                return 3;
            }
          }.call(this), this.hasAlphaChannel = (J = this.colorType) === 4 || J === 6, f = this.colors + (this.hasAlphaChannel ? 1 : 0), this.pixelBitlength = this.bits * f, this.colorSpace = function() {
            switch (this.colors) {
              case 1:
                return "DeviceGray";
              case 3:
                return "DeviceRGB";
            }
          }.call(this), void (this.imgData = new Uint8Array(this.imgData));
        default:
          this.pos += o;
      }
      if (this.pos += 4, this.pos > this.data.length) throw new Error("Incomplete or corrupt PNG file");
    }
  }
  n.prototype.read = function(a) {
    var o, f;
    for (f = [], o = 0; 0 <= a ? o < a : o > a; 0 <= a ? ++o : --o) f.push(this.data[this.pos++]);
    return f;
  }, n.prototype.readUInt32 = function() {
    return this.data[this.pos++] << 24 | this.data[this.pos++] << 16 | this.data[this.pos++] << 8 | this.data[this.pos++];
  }, n.prototype.readUInt16 = function() {
    return this.data[this.pos++] << 8 | this.data[this.pos++];
  }, n.prototype.decodePixels = function(a) {
    var o = this.pixelBitlength / 8, f = new Uint8Array(this.width * this.height * o), c = 0, m = this;
    if (a == null && (a = this.imgData), a.length === 0) return new Uint8Array(0);
    function A(b, S, g, B) {
      var F, O, I, N, J, et, ct, bt, nt, dt, z, at, M, k, D, R, ot, st, ht, X, Nt, rt = Math.ceil((m.width - b) / g), xt = Math.ceil((m.height - S) / B), E = m.width == rt && m.height == xt;
      for (k = o * rt, at = E ? f : new Uint8Array(k * xt), et = a.length, M = 0, O = 0; M < xt && c < et; ) {
        switch (a[c++]) {
          case 0:
            for (N = ot = 0; ot < k; N = ot += 1) at[O++] = a[c++];
            break;
          case 1:
            for (N = st = 0; st < k; N = st += 1) F = a[c++], J = N < o ? 0 : at[O - o], at[O++] = (F + J) % 256;
            break;
          case 2:
            for (N = ht = 0; ht < k; N = ht += 1) F = a[c++], I = (N - N % o) / o, D = M && at[(M - 1) * k + I * o + N % o], at[O++] = (D + F) % 256;
            break;
          case 3:
            for (N = X = 0; X < k; N = X += 1) F = a[c++], I = (N - N % o) / o, J = N < o ? 0 : at[O - o], D = M && at[(M - 1) * k + I * o + N % o], at[O++] = (F + Math.floor((J + D) / 2)) % 256;
            break;
          case 4:
            for (N = Nt = 0; Nt < k; N = Nt += 1) F = a[c++], I = (N - N % o) / o, J = N < o ? 0 : at[O - o], M === 0 ? D = R = 0 : (D = at[(M - 1) * k + I * o + N % o], R = I && at[(M - 1) * k + (I - 1) * o + N % o]), ct = J + D - R, bt = Math.abs(ct - J), dt = Math.abs(ct - D), z = Math.abs(ct - R), nt = bt <= dt && bt <= z ? J : dt <= z ? D : R, at[O++] = (F + nt) % 256;
            break;
          default:
            throw new Error("Invalid filter algorithm: " + a[c - 1]);
        }
        if (!E) {
          var x = ((S + M * B) * m.width + b) * o, q = M * k;
          for (N = 0; N < rt; N += 1) {
            for (var U = 0; U < o; U += 1) f[x++] = at[q++];
            x += (g - 1) * o;
          }
        }
        M++;
      }
    }
    return a = Tl(a), m.interlaceMethod == 1 ? (A(0, 0, 8, 8), A(4, 0, 8, 8), A(0, 4, 4, 8), A(2, 0, 4, 4), A(0, 2, 2, 4), A(1, 0, 2, 2), A(0, 1, 1, 2)) : A(0, 0, 1, 1), f;
  }, n.prototype.decodePalette = function() {
    var a, o, f, c, m, A, b, S, g;
    for (f = this.palette, A = this.transparency.indexed || [], m = new Uint8Array((A.length || 0) + f.length), c = 0, a = 0, o = b = 0, S = f.length; b < S; o = b += 3) m[c++] = f[o], m[c++] = f[o + 1], m[c++] = f[o + 2], m[c++] = (g = A[a++]) != null ? g : 255;
    return m;
  }, n.prototype.copyToImageData = function(a, o) {
    var f, c, m, A, b, S, g, B, F, O, I;
    if (c = this.colors, F = null, f = this.hasAlphaChannel, this.palette.length && (F = (I = this._decodedPalette) != null ? I : this._decodedPalette = this.decodePalette(), c = 4, f = !0), B = (m = a.data || a).length, b = F || o, A = S = 0, c === 1) for (; A < B; ) g = F ? 4 * o[A / 4] : S, O = b[g++], m[A++] = O, m[A++] = O, m[A++] = O, m[A++] = f ? b[g++] : 255, S = g;
    else for (; A < B; ) g = F ? 4 * o[A / 4] : S, m[A++] = b[g++], m[A++] = b[g++], m[A++] = b[g++], m[A++] = f ? b[g++] : 255, S = g;
  }, n.prototype.decode = function() {
    var a;
    return a = new Uint8Array(this.width * this.height * 4), this.copyToImageData(a, this.decodePixels()), a;
  };
  var s = function() {
    if (Object.prototype.toString.call(Yt) === "[object Window]") {
      try {
        e = Yt.document.createElement("canvas"), r = e.getContext("2d");
      } catch (o) {
        return !1;
      }
      return !0;
    }
    return !1;
  };
  return s(), l = function(o) {
    var f;
    if (s() === !0) return r.width = o.width, r.height = o.height, r.clearRect(0, 0, o.width, o.height), r.putImageData(o, 0, 0), (f = new Image()).src = e.toDataURL(), f;
    throw new Error("This method requires a Browser with Canvas-capability.");
  }, n.prototype.decodeFrames = function(a) {
    var o, f, c, m, A, b, S, g;
    if (this.animation) {
      for (g = [], f = A = 0, b = (S = this.animation.frames).length; A < b; f = ++A) o = S[f], c = a.createImageData(o.width, o.height), m = this.decodePixels(new Uint8Array(o.data)), this.copyToImageData(c, m), o.imageData = c, g.push(o.image = l(c));
      return g;
    }
  }, n.prototype.renderFrame = function(a, o) {
    var f, c, m;
    return f = (c = this.animation.frames)[o], m = c[o - 1], o === 0 && a.clearRect(0, 0, this.width, this.height), (m != null ? m.disposeOp : void 0) === 1 ? a.clearRect(m.xOffset, m.yOffset, m.width, m.height) : (m != null ? m.disposeOp : void 0) === 2 && a.putImageData(m.imageData, m.xOffset, m.yOffset), f.blendOp === 0 && a.clearRect(f.xOffset, f.yOffset, f.width, f.height), a.drawImage(f.image, f.xOffset, f.yOffset);
  }, n.prototype.animate = function(a) {
    var o, f, c, m, A, b, S = this;
    return f = 0, b = this.animation, m = b.numFrames, c = b.frames, A = b.numPlays, (o = function() {
      var B, F;
      if (B = f++ % m, F = c[B], S.renderFrame(a, B), m > 1 && f / m < A) return S.animation._timeout = setTimeout(o, F.delay);
    })();
  }, n.prototype.stopAnimation = function() {
    var a;
    return clearTimeout((a = this.animation) != null ? a._timeout : void 0);
  }, n.prototype.render = function(a) {
    var o, f;
    return a._png && a._png.stopAnimation(), a._png = this, a.width = this.width, a.height = this.height, o = a.getContext("2d"), this.animation ? (this.decodeFrames(o), this.animate(o)) : (f = o.createImageData(this.width, this.height), this.copyToImageData(f, this.decodePixels()), o.putImageData(f, 0, 0));
  }, n;
}();
/**
 * @license
 *
 * Copyright (c) 2014 James Robb, https://github.com/jamesbrobb
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ====================================================================
 */
/**
 * @license
 * (c) Dean McNamee <dean@gmail.com>, 2013.
 *
 * https://github.com/deanm/omggif
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 * omggif is a JavaScript implementation of a GIF 89a encoder and decoder,
 * including animation and compression.  It does not rely on any specific
 * underlying system, so should run in the browser, Node, or Plask.
 */
function lc(l) {
  var e = 0;
  if (l[e++] !== 71 || l[e++] !== 73 || l[e++] !== 70 || l[e++] !== 56 || (l[e++] + 1 & 253) != 56 || l[e++] !== 97) throw new Error("Invalid GIF 87a/89a header.");
  var r = l[e++] | l[e++] << 8, n = l[e++] | l[e++] << 8, s = l[e++], a = s >> 7, o = 1 << (7 & s) + 1;
  l[e++], l[e++];
  var f = null, c = null;
  a && (f = e, c = o, e += 3 * o);
  var m = !0, A = [], b = 0, S = null, g = 0, B = null;
  for (this.width = r, this.height = n; m && e < l.length; ) switch (l[e++]) {
    case 33:
      switch (l[e++]) {
        case 255:
          if (l[e] !== 11 || l[e + 1] == 78 && l[e + 2] == 69 && l[e + 3] == 84 && l[e + 4] == 83 && l[e + 5] == 67 && l[e + 6] == 65 && l[e + 7] == 80 && l[e + 8] == 69 && l[e + 9] == 50 && l[e + 10] == 46 && l[e + 11] == 48 && l[e + 12] == 3 && l[e + 13] == 1 && l[e + 16] == 0) e += 14, B = l[e++] | l[e++] << 8, e++;
          else for (e += 12; ; ) {
            if (!((M = l[e++]) >= 0)) throw Error("Invalid block size");
            if (M === 0) break;
            e += M;
          }
          break;
        case 249:
          if (l[e++] !== 4 || l[e + 4] !== 0) throw new Error("Invalid graphics extension block.");
          var F = l[e++];
          b = l[e++] | l[e++] << 8, S = l[e++], (1 & F) == 0 && (S = null), g = F >> 2 & 7, e++;
          break;
        case 254:
          for (; ; ) {
            if (!((M = l[e++]) >= 0)) throw Error("Invalid block size");
            if (M === 0) break;
            e += M;
          }
          break;
        default:
          throw new Error("Unknown graphic control label: 0x" + l[e - 1].toString(16));
      }
      break;
    case 44:
      var O = l[e++] | l[e++] << 8, I = l[e++] | l[e++] << 8, N = l[e++] | l[e++] << 8, J = l[e++] | l[e++] << 8, et = l[e++], ct = et >> 6 & 1, bt = 1 << (7 & et) + 1, nt = f, dt = c, z = !1;
      et >> 7 && (z = !0, nt = e, dt = bt, e += 3 * bt);
      var at = e;
      for (e++; ; ) {
        var M;
        if (!((M = l[e++]) >= 0)) throw Error("Invalid block size");
        if (M === 0) break;
        e += M;
      }
      A.push({
        x: O,
        y: I,
        width: N,
        height: J,
        has_local_palette: z,
        palette_offset: nt,
        palette_size: dt,
        data_offset: at,
        data_length: e - at,
        transparent_index: S,
        interlaced: !!ct,
        delay: b,
        disposal: g
      });
      break;
    case 59:
      m = !1;
      break;
    default:
      throw new Error("Unknown gif block: 0x" + l[e - 1].toString(16));
  }
  this.numFrames = function() {
    return A.length;
  }, this.loopCount = function() {
    return B;
  }, this.frameInfo = function(k) {
    if (k < 0 || k >= A.length) throw new Error("Frame index out of range.");
    return A[k];
  }, this.decodeAndBlitFrameBGRA = function(k, D) {
    var R = this.frameInfo(k), ot = R.width * R.height, st = new Uint8Array(ot);
    wu(l, R.data_offset, st, ot);
    var ht = R.palette_offset, X = R.transparent_index;
    X === null && (X = 256);
    var Nt = R.width, rt = r - Nt, xt = Nt, E = 4 * (R.y * r + R.x), x = 4 * ((R.y + R.height) * r + R.x), q = E, U = 4 * rt;
    R.interlaced === !0 && (U += 4 * r * 7);
    for (var V = 8, K = 0, ft = st.length; K < ft; ++K) {
      var it = st[K];
      if (xt === 0 && (xt = Nt, (q += U) >= x && (U = 4 * rt + 4 * r * (V - 1), q = E + (Nt + rt) * (V << 1), V >>= 1)), it === X) q += 4;
      else {
        var ut = l[ht + 3 * it], Lt = l[ht + 3 * it + 1], jt = l[ht + 3 * it + 2];
        D[q++] = jt, D[q++] = Lt, D[q++] = ut, D[q++] = 255;
      }
      --xt;
    }
  }, this.decodeAndBlitFrameRGBA = function(k, D) {
    var R = this.frameInfo(k), ot = R.width * R.height, st = new Uint8Array(ot);
    wu(l, R.data_offset, st, ot);
    var ht = R.palette_offset, X = R.transparent_index;
    X === null && (X = 256);
    var Nt = R.width, rt = r - Nt, xt = Nt, E = 4 * (R.y * r + R.x), x = 4 * ((R.y + R.height) * r + R.x), q = E, U = 4 * rt;
    R.interlaced === !0 && (U += 4 * r * 7);
    for (var V = 8, K = 0, ft = st.length; K < ft; ++K) {
      var it = st[K];
      if (xt === 0 && (xt = Nt, (q += U) >= x && (U = 4 * rt + 4 * r * (V - 1), q = E + (Nt + rt) * (V << 1), V >>= 1)), it === X) q += 4;
      else {
        var ut = l[ht + 3 * it], Lt = l[ht + 3 * it + 1], jt = l[ht + 3 * it + 2];
        D[q++] = ut, D[q++] = Lt, D[q++] = jt, D[q++] = 255;
      }
      --xt;
    }
  };
}
function wu(l, e, r, n) {
  for (var s = l[e++], a = 1 << s, o = a + 1, f = o + 1, c = s + 1, m = (1 << c) - 1, A = 0, b = 0, S = 0, g = l[e++], B = new Int32Array(4096), F = null; ; ) {
    for (; A < 16 && g !== 0; ) b |= l[e++] << A, A += 8, g === 1 ? g = l[e++] : --g;
    if (A < c) break;
    var O = b & m;
    if (b >>= c, A -= c, O !== a) {
      if (O === o) break;
      for (var I = O < f ? O : F, N = 0, J = I; J > a; ) J = B[J] >> 8, ++N;
      var et = J;
      if (S + N + (I !== O ? 1 : 0) > n) return void ve.log("Warning, gif stream longer than expected.");
      r[S++] = et;
      var ct = S += N;
      for (I !== O && (r[S++] = et), J = I; N--; ) J = B[J], r[--ct] = 255 & J, J >>= 8;
      F !== null && f < 4096 && (B[f++] = F << 8 | et, f >= m + 1 && c < 12 && (++c, m = m << 1 | 1)), F = O;
    } else f = o + 1, m = (1 << (c = s + 1)) - 1, F = null;
  }
  return S !== n && ve.log("Warning, gif stream shorter than expected."), r;
}
/**
 * @license
  Copyright (c) 2008, Adobe Systems Incorporated
  All rights reserved.

  Redistribution and use in source and binary forms, with or without 
  modification, are permitted provided that the following conditions are
  met:

  * Redistributions of source code must retain the above copyright notice, 
    this list of conditions and the following disclaimer.
  
  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in the 
    documentation and/or other materials provided with the distribution.
  
  * Neither the name of Adobe Systems Incorporated nor the names of its 
    contributors may be used to endorse or promote products derived from 
    this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
  IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
  THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
  PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR 
  CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
function po(l) {
  var e, r, n, s, a, o = Math.floor, f = new Array(64), c = new Array(64), m = new Array(64), A = new Array(64), b = new Array(65535), S = new Array(65535), g = new Array(64), B = new Array(64), F = [], O = 0, I = 7, N = new Array(64), J = new Array(64), et = new Array(64), ct = new Array(256), bt = new Array(2048), nt = [0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40, 44, 53, 10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36, 48, 49, 57, 58, 62, 63], dt = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], z = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], at = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125], M = [1, 2, 3, 0, 4, 17, 5, 18, 33, 49, 65, 6, 19, 81, 97, 7, 34, 113, 20, 50, 129, 145, 161, 8, 35, 66, 177, 193, 21, 82, 209, 240, 36, 51, 98, 114, 130, 9, 10, 22, 23, 24, 25, 26, 37, 38, 39, 40, 41, 42, 52, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250], k = [0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], D = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], R = [0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119], ot = [0, 1, 2, 3, 17, 4, 5, 33, 49, 6, 18, 65, 81, 7, 97, 113, 19, 34, 50, 129, 8, 20, 66, 145, 161, 177, 193, 9, 35, 51, 82, 240, 21, 98, 114, 209, 10, 22, 36, 52, 225, 37, 241, 23, 24, 25, 26, 38, 39, 40, 41, 42, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 130, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 226, 227, 228, 229, 230, 231, 232, 233, 234, 242, 243, 244, 245, 246, 247, 248, 249, 250];
  function st(E, x) {
    for (var q = 0, U = 0, V = new Array(), K = 1; K <= 16; K++) {
      for (var ft = 1; ft <= E[K]; ft++) V[x[U]] = [], V[x[U]][0] = q, V[x[U]][1] = K, U++, q++;
      q *= 2;
    }
    return V;
  }
  function ht(E) {
    for (var x = E[0], q = E[1] - 1; q >= 0; ) x & 1 << q && (O |= 1 << I), q--, --I < 0 && (O == 255 ? (X(255), X(0)) : X(O), I = 7, O = 0);
  }
  function X(E) {
    F.push(E);
  }
  function Nt(E) {
    X(E >> 8 & 255), X(255 & E);
  }
  function rt(E, x, q, U, V) {
    for (var K, ft = V[0], it = V[240], ut = function(At, Ot) {
      var _t, Mt, qt, zt, ne, Ht, ie, be, Vt, Qt, Ct = 0;
      for (Vt = 0; Vt < 8; ++Vt) {
        _t = At[Ct], Mt = At[Ct + 1], qt = At[Ct + 2], zt = At[Ct + 3], ne = At[Ct + 4], Ht = At[Ct + 5], ie = At[Ct + 6];
        var er = _t + (be = At[Ct + 7]), ye = _t - be, He = Mt + ie, ee = Mt - ie, Ce = qt + Ht, zr = qt - Ht, ue = zt + ne, Ur = zt - ne, _e = er + ue, nn = er - ue, _r = He + Ce, Pe = He - Ce;
        At[Ct] = _e + _r, At[Ct + 4] = _e - _r;
        var Zt = 0.707106781 * (Pe + nn);
        At[Ct + 2] = nn + Zt, At[Ct + 6] = nn - Zt;
        var le = 0.382683433 * ((_e = Ur + zr) - (Pe = ee + ye)), qn = 0.5411961 * _e + le, Ye = 1.306562965 * Pe + le, Hr = 0.707106781 * (_r = zr + ee), Wr = ye + Hr, Gt = ye - Hr;
        At[Ct + 5] = Gt + qn, At[Ct + 3] = Gt - qn, At[Ct + 1] = Wr + Ye, At[Ct + 7] = Wr - Ye, Ct += 8;
      }
      for (Ct = 0, Vt = 0; Vt < 8; ++Vt) {
        _t = At[Ct], Mt = At[Ct + 8], qt = At[Ct + 16], zt = At[Ct + 24], ne = At[Ct + 32], Ht = At[Ct + 40], ie = At[Ct + 48];
        var an = _t + (be = At[Ct + 56]), mr = _t - be, sn = Mt + ie, ke = Mt - ie, Re = qt + Ht, We = qt - Ht, En = zt + ne, mn = zt - ne, Pr = an + En, Vr = an - En, kr = sn + Re, Fr = sn - Re;
        At[Ct] = Pr + kr, At[Ct + 32] = Pr - kr;
        var vr = 0.707106781 * (Fr + Vr);
        At[Ct + 16] = Vr + vr, At[Ct + 48] = Vr - vr;
        var Dn = 0.382683433 * ((Pr = mn + We) - (Fr = ke + mr)), Gr = 0.5411961 * Pr + Dn, Tn = 1.306562965 * Fr + Dn, si = 0.707106781 * (kr = We + ke), oi = mr + si, ui = mr - si;
        At[Ct + 40] = ui + Gr, At[Ct + 24] = ui - Gr, At[Ct + 8] = oi + Tn, At[Ct + 56] = oi - Tn, Ct++;
      }
      for (Vt = 0; Vt < 64; ++Vt) Qt = At[Vt] * Ot[Vt], g[Vt] = Qt > 0 ? Qt + 0.5 | 0 : Qt - 0.5 | 0;
      return g;
    }(E, x), Lt = 0; Lt < 64; ++Lt) B[nt[Lt]] = ut[Lt];
    var jt = B[0] - q;
    q = B[0], jt == 0 ? ht(U[0]) : (ht(U[S[K = 32767 + jt]]), ht(b[K]));
    for (var Ft = 63; Ft > 0 && B[Ft] == 0; ) Ft--;
    if (Ft == 0) return ht(ft), q;
    for (var Rt, Dt = 1; Dt <= Ft; ) {
      for (var j = Dt; B[Dt] == 0 && Dt <= Ft; ) ++Dt;
      var mt = Dt - j;
      if (mt >= 16) {
        Rt = mt >> 4;
        for (var kt = 1; kt <= Rt; ++kt) ht(it);
        mt &= 15;
      }
      K = 32767 + B[Dt], ht(V[(mt << 4) + S[K]]), ht(b[K]), Dt++;
    }
    return Ft != 63 && ht(ft), q;
  }
  function xt(E) {
    E = Math.min(Math.max(E, 1), 100), a != E && (function(x) {
      for (var q = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99], U = 0; U < 64; U++) {
        var V = o((q[U] * x + 50) / 100);
        V = Math.min(Math.max(V, 1), 255), f[nt[U]] = V;
      }
      for (var K = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99], ft = 0; ft < 64; ft++) {
        var it = o((K[ft] * x + 50) / 100);
        it = Math.min(Math.max(it, 1), 255), c[nt[ft]] = it;
      }
      for (var ut = [1, 1.387039845, 1.306562965, 1.175875602, 1, 0.785694958, 0.5411961, 0.275899379], Lt = 0, jt = 0; jt < 8; jt++) for (var Ft = 0; Ft < 8; Ft++) m[Lt] = 1 / (f[nt[Lt]] * ut[jt] * ut[Ft] * 8), A[Lt] = 1 / (c[nt[Lt]] * ut[jt] * ut[Ft] * 8), Lt++;
    }(E < 50 ? Math.floor(5e3 / E) : Math.floor(200 - 2 * E)), a = E);
  }
  this.encode = function(E, x) {
    x && xt(x), F = new Array(), O = 0, I = 7, Nt(65496), Nt(65504), Nt(16), X(74), X(70), X(73), X(70), X(0), X(1), X(1), X(0), Nt(1), Nt(1), X(0), X(0), function() {
      Nt(65499), Nt(132), X(0);
      for (var Mt = 0; Mt < 64; Mt++) X(f[Mt]);
      X(1);
      for (var qt = 0; qt < 64; qt++) X(c[qt]);
    }(), function(Mt, qt) {
      Nt(65472), Nt(17), X(8), Nt(qt), Nt(Mt), X(3), X(1), X(17), X(0), X(2), X(17), X(1), X(3), X(17), X(1);
    }(E.width, E.height), function() {
      Nt(65476), Nt(418), X(0);
      for (var Mt = 0; Mt < 16; Mt++) X(dt[Mt + 1]);
      for (var qt = 0; qt <= 11; qt++) X(z[qt]);
      X(16);
      for (var zt = 0; zt < 16; zt++) X(at[zt + 1]);
      for (var ne = 0; ne <= 161; ne++) X(M[ne]);
      X(1);
      for (var Ht = 0; Ht < 16; Ht++) X(k[Ht + 1]);
      for (var ie = 0; ie <= 11; ie++) X(D[ie]);
      X(17);
      for (var be = 0; be < 16; be++) X(R[be + 1]);
      for (var Vt = 0; Vt <= 161; Vt++) X(ot[Vt]);
    }(), Nt(65498), Nt(12), X(3), X(1), X(0), X(2), X(17), X(3), X(17), X(0), X(63), X(0);
    var q = 0, U = 0, V = 0;
    O = 0, I = 7, this.encode.displayName = "_encode_";
    for (var K, ft, it, ut, Lt, jt, Ft, Rt, Dt, j = E.data, mt = E.width, kt = E.height, At = 4 * mt, Ot = 0; Ot < kt; ) {
      for (K = 0; K < At; ) {
        for (Lt = At * Ot + K, Ft = -1, Rt = 0, Dt = 0; Dt < 64; Dt++) jt = Lt + (Rt = Dt >> 3) * At + (Ft = 4 * (7 & Dt)), Ot + Rt >= kt && (jt -= At * (Ot + 1 + Rt - kt)), K + Ft >= At && (jt -= K + Ft - At + 4), ft = j[jt++], it = j[jt++], ut = j[jt++], N[Dt] = (bt[ft] + bt[it + 256 >> 0] + bt[ut + 512 >> 0] >> 16) - 128, J[Dt] = (bt[ft + 768 >> 0] + bt[it + 1024 >> 0] + bt[ut + 1280 >> 0] >> 16) - 128, et[Dt] = (bt[ft + 1280 >> 0] + bt[it + 1536 >> 0] + bt[ut + 1792 >> 0] >> 16) - 128;
        q = rt(N, m, q, e, n), U = rt(J, A, U, r, s), V = rt(et, A, V, r, s), K += 32;
      }
      Ot += 8;
    }
    if (I >= 0) {
      var _t = [];
      _t[1] = I + 1, _t[0] = (1 << I + 1) - 1, ht(_t);
    }
    return Nt(65497), new Uint8Array(F);
  }, l = l || 50, function() {
    for (var E = String.fromCharCode, x = 0; x < 256; x++) ct[x] = E(x);
  }(), e = st(dt, z), r = st(k, D), n = st(at, M), s = st(R, ot), function() {
    for (var E = 1, x = 2, q = 1; q <= 15; q++) {
      for (var U = E; U < x; U++) S[32767 + U] = q, b[32767 + U] = [], b[32767 + U][1] = q, b[32767 + U][0] = U;
      for (var V = -(x - 1); V <= -E; V++) S[32767 + V] = q, b[32767 + V] = [], b[32767 + V][1] = q, b[32767 + V][0] = x - 1 + V;
      E <<= 1, x <<= 1;
    }
  }(), function() {
    for (var E = 0; E < 256; E++) bt[E] = 19595 * E, bt[E + 256 >> 0] = 38470 * E, bt[E + 512 >> 0] = 7471 * E + 32768, bt[E + 768 >> 0] = -11059 * E, bt[E + 1024 >> 0] = -21709 * E, bt[E + 1280 >> 0] = 32768 * E + 8421375, bt[E + 1536 >> 0] = -27439 * E, bt[E + 1792 >> 0] = -5329 * E;
  }(), xt(l);
}
/**
 * @license
 * Copyright (c) 2017 Aras Abbasi
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function Er(l, e) {
  if (this.pos = 0, this.buffer = l, this.datav = new DataView(l.buffer), this.is_with_alpha = !!e, this.bottom_up = !0, this.flag = String.fromCharCode(this.buffer[0]) + String.fromCharCode(this.buffer[1]), this.pos += 2, ["BM", "BA", "CI", "CP", "IC", "PT"].indexOf(this.flag) === -1) throw new Error("Invalid BMP File");
  this.parseHeader(), this.parseBGR();
}
function Nu(l) {
  function e(dt) {
    if (!dt) throw Error("assert :P");
  }
  function r(dt, z, at) {
    for (var M = 0; 4 > M; M++) if (dt[z + M] != at.charCodeAt(M)) return !0;
    return !1;
  }
  function n(dt, z, at, M, k) {
    for (var D = 0; D < k; D++) dt[z + D] = at[M + D];
  }
  function s(dt, z, at, M) {
    for (var k = 0; k < M; k++) dt[z + k] = at;
  }
  function a(dt) {
    return new Int32Array(dt);
  }
  function o(dt, z) {
    for (var at = [], M = 0; M < dt; M++) at.push(new z());
    return at;
  }
  function f(dt, z) {
    var at = [];
    return function M(k, D, R) {
      for (var ot = R[D], st = 0; st < ot && (k.push(R.length > D + 1 ? [] : new z()), !(R.length < D + 1)); st++) M(k[st], D + 1, R);
    }(at, 0, dt), at;
  }
  var c = function() {
    var z = this;
    function at(t, i) {
      for (var u = 1 << i - 1 >>> 0; t & u; ) u >>>= 1;
      return u ? (t & u - 1) + u : t;
    }
    function M(t, i, u, p, v) {
      e(!(p % u));
      do
        t[i + (p -= u)] = v;
      while (0 < p);
    }
    function k(t, i, u, p, v) {
      if (e(2328 >= v), 512 >= v) var y = a(512);
      else if ((y = a(v)) == null) return 0;
      return function(w, L, _, C, H, Q) {
        var tt, Y, vt = L, lt = 1 << _, W = a(16), G = a(16);
        for (e(H != 0), e(C != null), e(w != null), e(0 < _), Y = 0; Y < H; ++Y) {
          if (15 < C[Y]) return 0;
          ++W[C[Y]];
        }
        if (W[0] == H) return 0;
        for (G[1] = 0, tt = 1; 15 > tt; ++tt) {
          if (W[tt] > 1 << tt) return 0;
          G[tt + 1] = G[tt] + W[tt];
        }
        for (Y = 0; Y < H; ++Y) tt = C[Y], 0 < C[Y] && (Q[G[tt]++] = Y);
        if (G[15] == 1) return (C = new D()).g = 0, C.value = Q[0], M(w, vt, 1, lt, C), lt;
        var pt, wt = -1, gt = lt - 1, Bt = 0, Pt = 1, Ut = 1, It = 1 << _;
        for (Y = 0, tt = 1, H = 2; tt <= _; ++tt, H <<= 1) {
          if (Pt += Ut <<= 1, 0 > (Ut -= W[tt])) return 0;
          for (; 0 < W[tt]; --W[tt]) (C = new D()).g = tt, C.value = Q[Y++], M(w, vt + Bt, H, It, C), Bt = at(Bt, tt);
        }
        for (tt = _ + 1, H = 2; 15 >= tt; ++tt, H <<= 1) {
          if (Pt += Ut <<= 1, 0 > (Ut -= W[tt])) return 0;
          for (; 0 < W[tt]; --W[tt]) {
            if (C = new D(), (Bt & gt) != wt) {
              for (vt += It, pt = 1 << (wt = tt) - _; 15 > wt && !(0 >= (pt -= W[wt])); ) ++wt, pt <<= 1;
              lt += It = 1 << (pt = wt - _), w[L + (wt = Bt & gt)].g = pt + _, w[L + wt].value = vt - L - wt;
            }
            C.g = tt - _, C.value = Q[Y++], M(w, vt + (Bt >> _), H, It, C), Bt = at(Bt, tt);
          }
        }
        return Pt != 2 * G[15] - 1 ? 0 : lt;
      }(t, i, u, p, v, y);
    }
    function D() {
      this.value = this.g = 0;
    }
    function R() {
      this.value = this.g = 0;
    }
    function ot() {
      this.G = o(5, D), this.H = a(5), this.jc = this.Qb = this.qb = this.nd = 0, this.pd = o(bn, R);
    }
    function st(t, i, u, p) {
      e(t != null), e(i != null), e(2147483648 > p), t.Ca = 254, t.I = 0, t.b = -8, t.Ka = 0, t.oa = i, t.pa = u, t.Jd = i, t.Yc = u + p, t.Zc = 4 <= p ? u + p - 4 + 1 : u, ft(t);
    }
    function ht(t, i) {
      for (var u = 0; 0 < i--; ) u |= ut(t, 128) << i;
      return u;
    }
    function X(t, i) {
      var u = ht(t, i);
      return it(t) ? -u : u;
    }
    function Nt(t, i, u, p) {
      var v, y = 0;
      for (e(t != null), e(i != null), e(4294967288 > p), t.Sb = p, t.Ra = 0, t.u = 0, t.h = 0, 4 < p && (p = 4), v = 0; v < p; ++v) y += i[u + v] << 8 * v;
      t.Ra = y, t.bb = p, t.oa = i, t.pa = u;
    }
    function rt(t) {
      for (; 8 <= t.u && t.bb < t.Sb; ) t.Ra >>>= 8, t.Ra += t.oa[t.pa + t.bb] << Li - 8 >>> 0, ++t.bb, t.u -= 8;
      U(t) && (t.h = 1, t.u = 0);
    }
    function xt(t, i) {
      if (e(0 <= i), !t.h && i <= Ba) {
        var u = q(t) & Ni[i];
        return t.u += i, rt(t), u;
      }
      return t.h = 1, t.u = 0;
    }
    function E() {
      this.b = this.Ca = this.I = 0, this.oa = [], this.pa = 0, this.Jd = [], this.Yc = 0, this.Zc = [], this.Ka = 0;
    }
    function x() {
      this.Ra = 0, this.oa = [], this.h = this.u = this.bb = this.Sb = this.pa = 0;
    }
    function q(t) {
      return t.Ra >>> (t.u & Li - 1) >>> 0;
    }
    function U(t) {
      return e(t.bb <= t.Sb), t.h || t.bb == t.Sb && t.u > Li;
    }
    function V(t, i) {
      t.u = i, t.h = U(t);
    }
    function K(t) {
      t.u >= nr && (e(t.u >= nr), rt(t));
    }
    function ft(t) {
      e(t != null && t.oa != null), t.pa < t.Zc ? (t.I = (t.oa[t.pa++] | t.I << 8) >>> 0, t.b += 8) : (e(t != null && t.oa != null), t.pa < t.Yc ? (t.b += 8, t.I = t.oa[t.pa++] | t.I << 8) : t.Ka ? t.b = 0 : (t.I <<= 8, t.b += 8, t.Ka = 1));
    }
    function it(t) {
      return ht(t, 1);
    }
    function ut(t, i) {
      var u = t.Ca;
      0 > t.b && ft(t);
      var p = t.b, v = u * i >>> 8, y = (t.I >>> p > v) + 0;
      for (y ? (u -= v, t.I -= v + 1 << p >>> 0) : u = v + 1, p = u, v = 0; 256 <= p; ) v += 8, p >>= 8;
      return p = 7 ^ v + Rs[p], t.b -= p, t.Ca = (u << p) - 1, y;
    }
    function Lt(t, i, u) {
      t[i + 0] = u >> 24 & 255, t[i + 1] = u >> 16 & 255, t[i + 2] = u >> 8 & 255, t[i + 3] = u >> 0 & 255;
    }
    function jt(t, i) {
      return t[i + 0] << 0 | t[i + 1] << 8;
    }
    function Ft(t, i) {
      return jt(t, i) | t[i + 2] << 16;
    }
    function Rt(t, i) {
      return jt(t, i) | jt(t, i + 2) << 16;
    }
    function Dt(t, i) {
      var u = 1 << i;
      return e(t != null), e(0 < i), t.X = a(u), t.X == null ? 0 : (t.Mb = 32 - i, t.Xa = i, 1);
    }
    function j(t, i) {
      e(t != null), e(i != null), e(t.Xa == i.Xa), n(i.X, 0, t.X, 0, 1 << i.Xa);
    }
    function mt() {
      this.X = [], this.Xa = this.Mb = 0;
    }
    function kt(t, i, u, p) {
      e(u != null), e(p != null);
      var v = u[0], y = p[0];
      return v == 0 && (v = (t * y + i / 2) / i), y == 0 && (y = (i * v + t / 2) / t), 0 >= v || 0 >= y ? 0 : (u[0] = v, p[0] = y, 1);
    }
    function At(t, i) {
      return t + (1 << i) - 1 >>> i;
    }
    function Ot(t, i) {
      return ((4278255360 & t) + (4278255360 & i) >>> 0 & 4278255360) + ((16711935 & t) + (16711935 & i) >>> 0 & 16711935) >>> 0;
    }
    function _t(t, i) {
      z[i] = function(u, p, v, y, w, L, _) {
        var C;
        for (C = 0; C < w; ++C) {
          var H = z[t](L[_ + C - 1], v, y + C);
          L[_ + C] = Ot(u[p + C], H);
        }
      };
    }
    function Mt() {
      this.ud = this.hd = this.jd = 0;
    }
    function qt(t, i) {
      return ((4278124286 & (t ^ i)) >>> 1) + (t & i) >>> 0;
    }
    function zt(t) {
      return 0 <= t && 256 > t ? t : 0 > t ? 0 : 255 < t ? 255 : void 0;
    }
    function ne(t, i) {
      return zt(t + (t - i + 0.5 >> 1));
    }
    function Ht(t, i, u) {
      return Math.abs(i - u) - Math.abs(t - u);
    }
    function ie(t, i, u, p, v, y, w) {
      for (p = y[w - 1], u = 0; u < v; ++u) y[w + u] = p = Ot(t[i + u], p);
    }
    function be(t, i, u, p, v) {
      var y;
      for (y = 0; y < u; ++y) {
        var w = t[i + y], L = w >> 8 & 255, _ = 16711935 & (_ = (_ = 16711935 & w) + ((L << 16) + L));
        p[v + y] = (4278255360 & w) + _ >>> 0;
      }
    }
    function Vt(t, i) {
      i.jd = t >> 0 & 255, i.hd = t >> 8 & 255, i.ud = t >> 16 & 255;
    }
    function Qt(t, i, u, p, v, y) {
      var w;
      for (w = 0; w < p; ++w) {
        var L = i[u + w], _ = L >>> 8, C = L, H = 255 & (H = (H = L >>> 16) + ((t.jd << 24 >> 24) * (_ << 24 >> 24) >>> 5));
        C = 255 & (C = (C = C + ((t.hd << 24 >> 24) * (_ << 24 >> 24) >>> 5)) + ((t.ud << 24 >> 24) * (H << 24 >> 24) >>> 5)), v[y + w] = (4278255360 & L) + (H << 16) + C;
      }
    }
    function Ct(t, i, u, p, v) {
      z[i] = function(y, w, L, _, C, H, Q, tt, Y) {
        for (_ = Q; _ < tt; ++_) for (Q = 0; Q < Y; ++Q) C[H++] = v(L[p(y[w++])]);
      }, z[t] = function(y, w, L, _, C, H, Q) {
        var tt = 8 >> y.b, Y = y.Ea, vt = y.K[0], lt = y.w;
        if (8 > tt) for (y = (1 << y.b) - 1, lt = (1 << tt) - 1; w < L; ++w) {
          var W, G = 0;
          for (W = 0; W < Y; ++W) W & y || (G = p(_[C++])), H[Q++] = v(vt[G & lt]), G >>= tt;
        }
        else z["VP8LMapColor" + u](_, C, vt, lt, H, Q, w, L, Y);
      };
    }
    function er(t, i, u, p, v) {
      for (u = i + u; i < u; ) {
        var y = t[i++];
        p[v++] = y >> 16 & 255, p[v++] = y >> 8 & 255, p[v++] = y >> 0 & 255;
      }
    }
    function ye(t, i, u, p, v) {
      for (u = i + u; i < u; ) {
        var y = t[i++];
        p[v++] = y >> 16 & 255, p[v++] = y >> 8 & 255, p[v++] = y >> 0 & 255, p[v++] = y >> 24 & 255;
      }
    }
    function He(t, i, u, p, v) {
      for (u = i + u; i < u; ) {
        var y = (w = t[i++]) >> 16 & 240 | w >> 12 & 15, w = w >> 0 & 240 | w >> 28 & 15;
        p[v++] = y, p[v++] = w;
      }
    }
    function ee(t, i, u, p, v) {
      for (u = i + u; i < u; ) {
        var y = (w = t[i++]) >> 16 & 248 | w >> 13 & 7, w = w >> 5 & 224 | w >> 3 & 31;
        p[v++] = y, p[v++] = w;
      }
    }
    function Ce(t, i, u, p, v) {
      for (u = i + u; i < u; ) {
        var y = t[i++];
        p[v++] = y >> 0 & 255, p[v++] = y >> 8 & 255, p[v++] = y >> 16 & 255;
      }
    }
    function zr(t, i, u, p, v, y) {
      if (y == 0) for (u = i + u; i < u; ) Lt(p, ((y = t[i++])[0] >> 24 | y[1] >> 8 & 65280 | y[2] << 8 & 16711680 | y[3] << 24) >>> 0), v += 32;
      else n(p, v, t, i, u);
    }
    function ue(t, i) {
      z[i][0] = z[t + "0"], z[i][1] = z[t + "1"], z[i][2] = z[t + "2"], z[i][3] = z[t + "3"], z[i][4] = z[t + "4"], z[i][5] = z[t + "5"], z[i][6] = z[t + "6"], z[i][7] = z[t + "7"], z[i][8] = z[t + "8"], z[i][9] = z[t + "9"], z[i][10] = z[t + "10"], z[i][11] = z[t + "11"], z[i][12] = z[t + "12"], z[i][13] = z[t + "13"], z[i][14] = z[t + "0"], z[i][15] = z[t + "0"];
    }
    function Ur(t) {
      return t == Ws || t == Vs || t == Va || t == Gs;
    }
    function _e() {
      this.eb = [], this.size = this.A = this.fb = 0;
    }
    function nn() {
      this.y = [], this.f = [], this.ea = [], this.F = [], this.Tc = this.Ed = this.Cd = this.Fd = this.lb = this.Db = this.Ab = this.fa = this.J = this.W = this.N = this.O = 0;
    }
    function _r() {
      this.Rd = this.height = this.width = this.S = 0, this.f = {}, this.f.RGBA = new _e(), this.f.kb = new nn(), this.sd = null;
    }
    function Pe() {
      this.width = [0], this.height = [0], this.Pd = [0], this.Qd = [0], this.format = [0];
    }
    function Zt() {
      this.Id = this.fd = this.Md = this.hb = this.ib = this.da = this.bd = this.cd = this.j = this.v = this.Da = this.Sd = this.ob = 0;
    }
    function le(t) {
      return alert("todo:WebPSamplerProcessPlane"), t.T;
    }
    function qn(t, i) {
      var u = t.T, p = i.ba.f.RGBA, v = p.eb, y = p.fb + t.ka * p.A, w = xr[i.ba.S], L = t.y, _ = t.O, C = t.f, H = t.N, Q = t.ea, tt = t.W, Y = i.cc, vt = i.dc, lt = i.Mc, W = i.Nc, G = t.ka, pt = t.ka + t.T, wt = t.U, gt = wt + 1 >> 1;
      for (G == 0 ? w(L, _, null, null, C, H, Q, tt, C, H, Q, tt, v, y, null, null, wt) : (w(i.ec, i.fc, L, _, Y, vt, lt, W, C, H, Q, tt, v, y - p.A, v, y, wt), ++u); G + 2 < pt; G += 2) Y = C, vt = H, lt = Q, W = tt, H += t.Rc, tt += t.Rc, y += 2 * p.A, w(L, (_ += 2 * t.fa) - t.fa, L, _, Y, vt, lt, W, C, H, Q, tt, v, y - p.A, v, y, wt);
      return _ += t.fa, t.j + pt < t.o ? (n(i.ec, i.fc, L, _, wt), n(i.cc, i.dc, C, H, gt), n(i.Mc, i.Nc, Q, tt, gt), u--) : 1 & pt || w(L, _, null, null, C, H, Q, tt, C, H, Q, tt, v, y + p.A, null, null, wt), u;
    }
    function Ye(t, i, u) {
      var p = t.F, v = [t.J];
      if (p != null) {
        var y = t.U, w = i.ba.S, L = w == Wa || w == Va;
        i = i.ba.f.RGBA;
        var _ = [0], C = t.ka;
        _[0] = t.T, t.Kb && (C == 0 ? --_[0] : (--C, v[0] -= t.width), t.j + t.ka + t.T == t.o && (_[0] = t.o - t.j - C));
        var H = i.eb;
        C = i.fb + C * i.A, t = Ve(p, v[0], t.width, y, _, H, C + (L ? 0 : 3), i.A), e(u == _), t && Ur(w) && we(H, C, L, y, _, i.A);
      }
      return 0;
    }
    function Hr(t) {
      var i = t.ma, u = i.ba.S, p = 11 > u, v = u == Ua || u == Ha || u == Wa || u == Hs || u == 12 || Ur(u);
      if (i.memory = null, i.Ib = null, i.Jb = null, i.Nd = null, !Xi(i.Oa, t, v ? 11 : 12)) return 0;
      if (v && Ur(u) && St(), t.da) alert("todo:use_scaling");
      else {
        if (p) {
          if (i.Ib = le, t.Kb) {
            if (u = t.U + 1 >> 1, i.memory = a(t.U + 2 * u), i.memory == null) return 0;
            i.ec = i.memory, i.fc = 0, i.cc = i.ec, i.dc = i.fc + t.U, i.Mc = i.cc, i.Nc = i.dc + u, i.Ib = qn, St();
          }
        } else alert("todo:EmitYUV");
        v && (i.Jb = Ye, p && $());
      }
      if (p && !To) {
        for (t = 0; 256 > t; ++t) ul[t] = 89858 * (t - 128) + Ya >> Ga, hl[t] = -22014 * (t - 128) + Ya, cl[t] = -45773 * (t - 128), ll[t] = 113618 * (t - 128) + Ya >> Ga;
        for (t = ea; t < Xs; ++t) i = 76283 * (t - 16) + Ya >> Ga, fl[t - ea] = yr(i, 255), dl[t - ea] = yr(i + 8 >> 4, 15);
        To = 1;
      }
      return 1;
    }
    function Wr(t) {
      var i = t.ma, u = t.U, p = t.T;
      return e(!(1 & t.ka)), 0 >= u || 0 >= p ? 0 : (u = i.Ib(t, i), i.Jb != null && i.Jb(t, i, u), i.Dc += u, 1);
    }
    function Gt(t) {
      t.ma.memory = null;
    }
    function an(t, i, u, p) {
      return xt(t, 8) != 47 ? 0 : (i[0] = xt(t, 14) + 1, u[0] = xt(t, 14) + 1, p[0] = xt(t, 1), xt(t, 3) != 0 ? 0 : !t.h);
    }
    function mr(t, i) {
      if (4 > t) return t + 1;
      var u = t - 2 >> 1;
      return (2 + (1 & t) << u) + xt(i, u) + 1;
    }
    function sn(t, i) {
      return 120 < i ? i - 120 : 1 <= (u = ((u = Ju[i - 1]) >> 4) * t + (8 - (15 & u))) ? u : 1;
      var u;
    }
    function ke(t, i, u) {
      var p = q(u), v = t[i += 255 & p].g - 8;
      return 0 < v && (V(u, u.u + 8), p = q(u), i += t[i].value, i += p & (1 << v) - 1), V(u, u.u + t[i].g), t[i].value;
    }
    function Re(t, i, u) {
      return u.g += t.g, u.value += t.value << i >>> 0, e(8 >= u.g), t.g;
    }
    function We(t, i, u) {
      var p = t.xc;
      return e((i = p == 0 ? 0 : t.vc[t.md * (u >> p) + (i >> p)]) < t.Wb), t.Ya[i];
    }
    function En(t, i, u, p) {
      var v = t.ab, y = t.c * i, w = t.C;
      i = w + i;
      var L = u, _ = p;
      for (p = t.Ta, u = t.Ua; 0 < v--; ) {
        var C = t.gc[v], H = w, Q = i, tt = L, Y = _, vt = (_ = p, L = u, C.Ea);
        switch (e(H < Q), e(Q <= C.nc), C.hc) {
          case 2:
            wr(tt, Y, (Q - H) * vt, _, L);
            break;
          case 0:
            var lt = H, W = Q, G = _, pt = L, wt = (It = C).Ea;
            lt == 0 && (Ki(tt, Y, null, null, 1, G, pt), ie(tt, Y + 1, 0, 0, wt - 1, G, pt + 1), Y += wt, pt += wt, ++lt);
            for (var gt = 1 << It.b, Bt = gt - 1, Pt = At(wt, It.b), Ut = It.K, It = It.w + (lt >> It.b) * Pt; lt < W; ) {
              var oe = Ut, ce = It, se = 1;
              for (zs(tt, Y, G, pt - wt, 1, G, pt); se < wt; ) {
                var re = (se & ~Bt) + gt;
                re > wt && (re = wt), (0, Ai[oe[ce++] >> 8 & 15])(tt, Y + +se, G, pt + se - wt, re - se, G, pt + se), se = re;
              }
              Y += wt, pt += wt, ++lt & Bt || (It += Pt);
            }
            Q != C.nc && n(_, L - vt, _, L + (Q - H - 1) * vt, vt);
            break;
          case 1:
            for (vt = tt, W = Y, wt = (tt = C.Ea) - (pt = tt & ~(G = (Y = 1 << C.b) - 1)), lt = At(tt, C.b), gt = C.K, C = C.w + (H >> C.b) * lt; H < Q; ) {
              for (Bt = gt, Pt = C, Ut = new Mt(), It = W + pt, oe = W + tt; W < It; ) Vt(Bt[Pt++], Ut), ir(Ut, vt, W, Y, _, L), W += Y, L += Y;
              W < oe && (Vt(Bt[Pt++], Ut), ir(Ut, vt, W, wt, _, L), W += wt, L += wt), ++H & G || (C += lt);
            }
            break;
          case 3:
            if (tt == _ && Y == L && 0 < C.b) {
              for (W = _, tt = vt = L + (Q - H) * vt - (pt = (Q - H) * At(C.Ea, C.b)), Y = _, G = L, lt = [], pt = (wt = pt) - 1; 0 <= pt; --pt) lt[pt] = Y[G + pt];
              for (pt = wt - 1; 0 <= pt; --pt) W[tt + pt] = lt[pt];
              Wn(C, H, Q, _, vt, _, L);
            } else Wn(C, H, Q, tt, Y, _, L);
        }
        L = p, _ = u;
      }
      _ != u && n(p, u, L, _, y);
    }
    function mn(t, i) {
      var u = t.V, p = t.Ba + t.c * t.C, v = i - t.C;
      if (e(i <= t.l.o), e(16 >= v), 0 < v) {
        var y = t.l, w = t.Ta, L = t.Ua, _ = y.width;
        if (En(t, v, u, p), v = L = [L], e((u = t.C) < (p = i)), e(y.v < y.va), p > y.o && (p = y.o), u < y.j) {
          var C = y.j - u;
          u = y.j, v[0] += C * _;
        }
        if (u >= p ? u = 0 : (v[0] += 4 * y.v, y.ka = u - y.j, y.U = y.va - y.v, y.T = p - u, u = 1), u) {
          if (L = L[0], 11 > (u = t.ca).S) {
            var H = u.f.RGBA, Q = (p = u.S, v = y.U, y = y.T, C = H.eb, H.A), tt = y;
            for (H = H.fb + t.Ma * H.A; 0 < tt--; ) {
              var Y = w, vt = L, lt = v, W = C, G = H;
              switch (p) {
                case za:
                  or(Y, vt, lt, W, G);
                  break;
                case Ua:
                  yn(Y, vt, lt, W, G);
                  break;
                case Ws:
                  yn(Y, vt, lt, W, G), we(W, G, 0, lt, 1, 0);
                  break;
                case Io:
                  xi(Y, vt, lt, W, G);
                  break;
                case Ha:
                  zr(Y, vt, lt, W, G, 1);
                  break;
                case Vs:
                  zr(Y, vt, lt, W, G, 1), we(W, G, 0, lt, 1, 0);
                  break;
                case Wa:
                  zr(Y, vt, lt, W, G, 0);
                  break;
                case Va:
                  zr(Y, vt, lt, W, G, 0), we(W, G, 1, lt, 1, 0);
                  break;
                case Hs:
                  Zr(Y, vt, lt, W, G);
                  break;
                case Gs:
                  Zr(Y, vt, lt, W, G), de(W, G, lt, 1, 0);
                  break;
                case Co:
                  cn(Y, vt, lt, W, G);
                  break;
                default:
                  e(0);
              }
              L += _, H += Q;
            }
            t.Ma += y;
          } else alert("todo:EmitRescaledRowsYUVA");
          e(t.Ma <= u.height);
        }
      }
      t.C = i, e(t.C <= t.i);
    }
    function Pr(t) {
      var i;
      if (0 < t.ua) return 0;
      for (i = 0; i < t.Wb; ++i) {
        var u = t.Ya[i].G, p = t.Ya[i].H;
        if (0 < u[1][p[1] + 0].g || 0 < u[2][p[2] + 0].g || 0 < u[3][p[3] + 0].g) return 0;
      }
      return 1;
    }
    function Vr(t, i, u, p, v, y) {
      if (t.Z != 0) {
        var w = t.qd, L = t.rd;
        for (e(An[t.Z] != null); i < u; ++i) An[t.Z](w, L, p, v, p, v, y), w = p, L = v, v += y;
        t.qd = w, t.rd = L;
      }
    }
    function kr(t, i) {
      var u = t.l.ma, p = u.Z == 0 || u.Z == 1 ? t.l.j : t.C;
      if (p = t.C < p ? p : t.C, e(i <= t.l.o), i > p) {
        var v = t.l.width, y = u.ca, w = u.tb + v * p, L = t.V, _ = t.Ba + t.c * p, C = t.gc;
        e(t.ab == 1), e(C[0].hc == 3), qa(C[0], p, i, L, _, y, w), Vr(u, p, i, y, w, v);
      }
      t.C = t.Ma = i;
    }
    function Fr(t, i, u, p, v, y, w) {
      var L = t.$ / p, _ = t.$ % p, C = t.m, H = t.s, Q = u + t.$, tt = Q;
      v = u + p * v;
      var Y = u + p * y, vt = 280 + H.ua, lt = t.Pb ? L : 16777216, W = 0 < H.ua ? H.Wa : null, G = H.wc, pt = Q < Y ? We(H, _, L) : null;
      e(t.C < y), e(Y <= v);
      var wt = !1;
      t: for (; ; ) {
        for (; wt || Q < Y; ) {
          var gt = 0;
          if (L >= lt) {
            var Bt = Q - u;
            e((lt = t).Pb), lt.wd = lt.m, lt.xd = Bt, 0 < lt.s.ua && j(lt.s.Wa, lt.s.vb), lt = L + Ku;
          }
          if (_ & G || (pt = We(H, _, L)), e(pt != null), pt.Qb && (i[Q] = pt.qb, wt = !0), !wt) if (K(C), pt.jc) {
            gt = C, Bt = i;
            var Pt = Q, Ut = pt.pd[q(gt) & bn - 1];
            e(pt.jc), 256 > Ut.g ? (V(gt, gt.u + Ut.g), Bt[Pt] = Ut.value, gt = 0) : (V(gt, gt.u + Ut.g - 256), e(256 <= Ut.value), gt = Ut.value), gt == 0 && (wt = !0);
          } else gt = ke(pt.G[0], pt.H[0], C);
          if (C.h) break;
          if (wt || 256 > gt) {
            if (!wt) if (pt.nd) i[Q] = (pt.qb | gt << 8) >>> 0;
            else {
              if (K(C), wt = ke(pt.G[1], pt.H[1], C), K(C), Bt = ke(pt.G[2], pt.H[2], C), Pt = ke(pt.G[3], pt.H[3], C), C.h) break;
              i[Q] = (Pt << 24 | wt << 16 | gt << 8 | Bt) >>> 0;
            }
            if (wt = !1, ++Q, ++_ >= p && (_ = 0, ++L, w != null && L <= y && !(L % 16) && w(t, L), W != null)) for (; tt < Q; ) gt = i[tt++], W.X[(506832829 * gt & 4294967295) >>> W.Mb] = gt;
          } else if (280 > gt) {
            if (gt = mr(gt - 256, C), Bt = ke(pt.G[4], pt.H[4], C), K(C), Bt = sn(p, Bt = mr(Bt, C)), C.h) break;
            if (Q - u < Bt || v - Q < gt) break t;
            for (Pt = 0; Pt < gt; ++Pt) i[Q + Pt] = i[Q + Pt - Bt];
            for (Q += gt, _ += gt; _ >= p; ) _ -= p, ++L, w != null && L <= y && !(L % 16) && w(t, L);
            if (e(Q <= v), _ & G && (pt = We(H, _, L)), W != null) for (; tt < Q; ) gt = i[tt++], W.X[(506832829 * gt & 4294967295) >>> W.Mb] = gt;
          } else {
            if (!(gt < vt)) break t;
            for (wt = gt - 280, e(W != null); tt < Q; ) gt = i[tt++], W.X[(506832829 * gt & 4294967295) >>> W.Mb] = gt;
            gt = Q, e(!(wt >>> (Bt = W).Xa)), i[gt] = Bt.X[wt], wt = !0;
          }
          wt || e(C.h == U(C));
        }
        if (t.Pb && C.h && Q < v) e(t.m.h), t.a = 5, t.m = t.wd, t.$ = t.xd, 0 < t.s.ua && j(t.s.vb, t.s.Wa);
        else {
          if (C.h) break t;
          w != null && w(t, L > y ? y : L), t.a = 0, t.$ = Q - u;
        }
        return 1;
      }
      return t.a = 3, 0;
    }
    function vr(t) {
      e(t != null), t.vc = null, t.yc = null, t.Ya = null;
      var i = t.Wa;
      i != null && (i.X = null), t.vb = null, e(t != null);
    }
    function Dn() {
      var t = new vi();
      return t == null ? null : (t.a = 0, t.xb = Bo, ue("Predictor", "VP8LPredictors"), ue("Predictor", "VP8LPredictors_C"), ue("PredictorAdd", "VP8LPredictorsAdd"), ue("PredictorAdd", "VP8LPredictorsAdd_C"), wr = be, ir = Qt, or = er, yn = ye, Zr = He, cn = ee, xi = Ce, z.VP8LMapColor32b = Ma, z.VP8LMapColor8b = Vn, t);
    }
    function Gr(t, i, u, p, v) {
      var y = 1, w = [t], L = [i], _ = p.m, C = p.s, H = null, Q = 0;
      t: for (; ; ) {
        if (u) for (; y && xt(_, 1); ) {
          var tt = w, Y = L, vt = p, lt = 1, W = vt.m, G = vt.gc[vt.ab], pt = xt(W, 2);
          if (vt.Oc & 1 << pt) y = 0;
          else {
            switch (vt.Oc |= 1 << pt, G.hc = pt, G.Ea = tt[0], G.nc = Y[0], G.K = [null], ++vt.ab, e(4 >= vt.ab), pt) {
              case 0:
              case 1:
                G.b = xt(W, 3) + 2, lt = Gr(At(G.Ea, G.b), At(G.nc, G.b), 0, vt, G.K), G.K = G.K[0];
                break;
              case 3:
                var wt, gt = xt(W, 8) + 1, Bt = 16 < gt ? 0 : 4 < gt ? 1 : 2 < gt ? 2 : 3;
                if (tt[0] = At(G.Ea, Bt), G.b = Bt, wt = lt = Gr(gt, 1, 0, vt, G.K)) {
                  var Pt, Ut = gt, It = G, oe = 1 << (8 >> It.b), ce = a(oe);
                  if (ce == null) wt = 0;
                  else {
                    var se = It.K[0], re = It.w;
                    for (ce[0] = It.K[0][0], Pt = 1; Pt < 1 * Ut; ++Pt) ce[Pt] = Ot(se[re + Pt], ce[Pt - 1]);
                    for (; Pt < 4 * oe; ++Pt) ce[Pt] = 0;
                    It.K[0] = null, It.K[0] = ce, wt = 1;
                  }
                }
                lt = wt;
                break;
              case 2:
                break;
              default:
                e(0);
            }
            y = lt;
          }
        }
        if (w = w[0], L = L[0], y && xt(_, 1) && !(y = 1 <= (Q = xt(_, 4)) && 11 >= Q)) {
          p.a = 3;
          break t;
        }
        var me;
        if (me = y) e: {
          var pe, te, Ee, ur = p, De = w, lr = L, he = Q, dr = u, pr = ur.m, ze = ur.s, Ge = [null], sr = 1, Sr = 0, $r = Xu[he];
          r: for (; ; ) {
            if (dr && xt(pr, 1)) {
              var Ue = xt(pr, 3) + 2, dn = At(De, Ue), $n = At(lr, Ue), Pi = dn * $n;
              if (!Gr(dn, $n, 0, ur, Ge)) break r;
              for (Ge = Ge[0], ze.xc = Ue, pe = 0; pe < Pi; ++pe) {
                var xn = Ge[pe] >> 8 & 65535;
                Ge[pe] = xn, xn >= sr && (sr = xn + 1);
              }
            }
            if (pr.h) break r;
            for (te = 0; 5 > te; ++te) {
              var Fe = jo[te];
              !te && 0 < he && (Fe += 1 << he), Sr < Fe && (Sr = Fe);
            }
            var Ks = o(sr * $r, D), Uo = sr, Ho = o(Uo, ot);
            if (Ho == null) var Xa = null;
            else e(65536 >= Uo), Xa = Ho;
            var ra = a(Sr);
            if (Xa == null || ra == null || Ks == null) {
              ur.a = 1;
              break r;
            }
            var Ka = Ks;
            for (pe = Ee = 0; pe < sr; ++pe) {
              var Mr = Xa[pe], ki = Mr.G, Fi = Mr.H, Wo = 0, Za = 1, Vo = 0;
              for (te = 0; 5 > te; ++te) {
                Fe = jo[te], ki[te] = Ka, Fi[te] = Ee, !te && 0 < he && (Fe += 1 << he);
                i: {
                  var $a, Zs = Fe, Qa = ur, na = ra, ml = Ka, vl = Ee, $s = 0, Sn = Qa.m, bl = xt(Sn, 1);
                  if (s(na, 0, 0, Zs), bl) {
                    var yl = xt(Sn, 1) + 1, wl = xt(Sn, 1), Go = xt(Sn, wl == 0 ? 1 : 8);
                    na[Go] = 1, yl == 2 && (na[Go = xt(Sn, 8)] = 1);
                    var ts = 1;
                  } else {
                    var Yo = a(19), Jo = xt(Sn, 4) + 4;
                    if (19 < Jo) {
                      Qa.a = 3;
                      var es = 0;
                      break i;
                    }
                    for ($a = 0; $a < Jo; ++$a) Yo[Yu[$a]] = xt(Sn, 3);
                    var Qs = void 0, ia = void 0, Xo = Qa, Nl = Yo, rs = Zs, Ko = na, to = 0, _n = Xo.m, Zo = 8, $o = o(128, D);
                    n: for (; k($o, 0, 7, Nl, 19); ) {
                      if (xt(_n, 1)) {
                        var Ll = 2 + 2 * xt(_n, 3);
                        if ((Qs = 2 + xt(_n, Ll)) > rs) break n;
                      } else Qs = rs;
                      for (ia = 0; ia < rs && Qs--; ) {
                        K(_n);
                        var Qo = $o[0 + (127 & q(_n))];
                        V(_n, _n.u + Qo.g);
                        var Ii = Qo.value;
                        if (16 > Ii) Ko[ia++] = Ii, Ii != 0 && (Zo = Ii);
                        else {
                          var Al = Ii == 16, tu = Ii - 16, xl = Vu[tu], eu = xt(_n, Wu[tu]) + xl;
                          if (ia + eu > rs) break n;
                          for (var Sl = Al ? Zo : 0; 0 < eu--; ) Ko[ia++] = Sl;
                        }
                      }
                      to = 1;
                      break n;
                    }
                    to || (Xo.a = 3), ts = to;
                  }
                  (ts = ts && !Sn.h) && ($s = k(ml, vl, 8, na, Zs)), ts && $s != 0 ? es = $s : (Qa.a = 3, es = 0);
                }
                if (es == 0) break r;
                if (Za && Gu[te] == 1 && (Za = Ka[Ee].g == 0), Wo += Ka[Ee].g, Ee += es, 3 >= te) {
                  var aa, eo = ra[0];
                  for (aa = 1; aa < Fe; ++aa) ra[aa] > eo && (eo = ra[aa]);
                  Vo += eo;
                }
              }
              if (Mr.nd = Za, Mr.Qb = 0, Za && (Mr.qb = (ki[3][Fi[3] + 0].value << 24 | ki[1][Fi[1] + 0].value << 16 | ki[2][Fi[2] + 0].value) >>> 0, Wo == 0 && 256 > ki[0][Fi[0] + 0].value && (Mr.Qb = 1, Mr.qb += ki[0][Fi[0] + 0].value << 8)), Mr.jc = !Mr.Qb && 6 > Vo, Mr.jc) {
                var ns, pn = Mr;
                for (ns = 0; ns < bn; ++ns) {
                  var Pn = ns, kn = pn.pd[Pn], is = pn.G[0][pn.H[0] + Pn];
                  256 <= is.value ? (kn.g = is.g + 256, kn.value = is.value) : (kn.g = 0, kn.value = 0, Pn >>= Re(is, 8, kn), Pn >>= Re(pn.G[1][pn.H[1] + Pn], 16, kn), Pn >>= Re(pn.G[2][pn.H[2] + Pn], 0, kn), Re(pn.G[3][pn.H[3] + Pn], 24, kn));
                }
              }
            }
            ze.vc = Ge, ze.Wb = sr, ze.Ya = Xa, ze.yc = Ks, me = 1;
            break e;
          }
          me = 0;
        }
        if (!(y = me)) {
          p.a = 3;
          break t;
        }
        if (0 < Q) {
          if (C.ua = 1 << Q, !Dt(C.Wa, Q)) {
            p.a = 1, y = 0;
            break t;
          }
        } else C.ua = 0;
        var ro = p, ru = w, _l = L, no = ro.s, io = no.xc;
        if (ro.c = ru, ro.i = _l, no.md = At(ru, io), no.wc = io == 0 ? -1 : (1 << io) - 1, u) {
          p.xb = nl;
          break t;
        }
        if ((H = a(w * L)) == null) {
          p.a = 1, y = 0;
          break t;
        }
        y = (y = Fr(p, H, 0, w, L, L, null)) && !_.h;
        break t;
      }
      return y ? (v != null ? v[0] = H : (e(H == null), e(u)), p.$ = 0, u || vr(C)) : vr(C), y;
    }
    function Tn(t, i) {
      var u = t.c * t.i, p = u + i + 16 * i;
      return e(t.c <= i), t.V = a(p), t.V == null ? (t.Ta = null, t.Ua = 0, t.a = 1, 0) : (t.Ta = t.V, t.Ua = t.Ba + u + i, 1);
    }
    function si(t, i) {
      var u = t.C, p = i - u, v = t.V, y = t.Ba + t.c * u;
      for (e(i <= t.l.o); 0 < p; ) {
        var w = 16 < p ? 16 : p, L = t.l.ma, _ = t.l.width, C = _ * w, H = L.ca, Q = L.tb + _ * u, tt = t.Ta, Y = t.Ua;
        En(t, w, v, y), Se(tt, Y, H, Q, C), Vr(L, u, u + w, H, Q, _), p -= w, v += w * t.c, u += w;
      }
      e(u == i), t.C = t.Ma = i;
    }
    function oi() {
      this.ub = this.yd = this.td = this.Rb = 0;
    }
    function ui() {
      this.Kd = this.Ld = this.Ud = this.Td = this.i = this.c = 0;
    }
    function ds() {
      this.Fb = this.Bb = this.Cb = 0, this.Zb = a(4), this.Lb = a(4);
    }
    function ga() {
      this.Yb = function() {
        var t = [];
        return function i(u, p, v) {
          for (var y = v[p], w = 0; w < y && (u.push(v.length > p + 1 ? [] : 0), !(v.length < p + 1)); w++) i(u[w], p + 1, v);
        }(t, 0, [3, 11]), t;
      }();
    }
    function ps() {
      this.jb = a(3), this.Wc = f([4, 8], ga), this.Xc = f([4, 17], ga);
    }
    function gs() {
      this.Pc = this.wb = this.Tb = this.zd = 0, this.vd = new a(4), this.od = new a(4);
    }
    function li() {
      this.ld = this.La = this.dd = this.tc = 0;
    }
    function ma() {
      this.Na = this.la = 0;
    }
    function ms() {
      this.Sc = [0, 0], this.Eb = [0, 0], this.Qc = [0, 0], this.ia = this.lc = 0;
    }
    function Mi() {
      this.ad = a(384), this.Za = 0, this.Ob = a(16), this.$b = this.Ad = this.ia = this.Gc = this.Hc = this.Dd = 0;
    }
    function vs() {
      this.uc = this.M = this.Nb = 0, this.wa = Array(new li()), this.Y = 0, this.ya = Array(new Mi()), this.aa = 0, this.l = new ci();
    }
    function va() {
      this.y = a(16), this.f = a(8), this.ea = a(8);
    }
    function bs() {
      this.cb = this.a = 0, this.sc = "", this.m = new E(), this.Od = new oi(), this.Kc = new ui(), this.ed = new gs(), this.Qa = new ds(), this.Ic = this.$c = this.Aa = 0, this.D = new vs(), this.Xb = this.Va = this.Hb = this.zb = this.yb = this.Ub = this.za = 0, this.Jc = o(8, E), this.ia = 0, this.pb = o(4, ms), this.Pa = new ps(), this.Bd = this.kc = 0, this.Ac = [], this.Bc = 0, this.zc = [0, 0, 0, 0], this.Gd = Array(new va()), this.Hd = 0, this.rb = Array(new ma()), this.sb = 0, this.wa = Array(new li()), this.Y = 0, this.oc = [], this.pc = 0, this.sa = [], this.ta = 0, this.qa = [], this.ra = 0, this.Ha = [], this.B = this.R = this.Ia = 0, this.Ec = [], this.M = this.ja = this.Vb = this.Fc = 0, this.ya = Array(new Mi()), this.L = this.aa = 0, this.gd = f([4, 2], li), this.ga = null, this.Fa = [], this.Cc = this.qc = this.P = 0, this.Gb = [], this.Uc = 0, this.mb = [], this.nb = 0, this.rc = [], this.Ga = this.Vc = 0;
    }
    function ci() {
      this.T = this.U = this.ka = this.height = this.width = 0, this.y = [], this.f = [], this.ea = [], this.Rc = this.fa = this.W = this.N = this.O = 0, this.ma = "void", this.put = "VP8IoPutHook", this.ac = "VP8IoSetupHook", this.bc = "VP8IoTeardownHook", this.ha = this.Kb = 0, this.data = [], this.hb = this.ib = this.da = this.o = this.j = this.va = this.v = this.Da = this.ob = this.w = 0, this.F = [], this.J = 0;
    }
    function ba() {
      var t = new bs();
      return t != null && (t.a = 0, t.sc = "OK", t.cb = 0, t.Xb = 0, ta || (ta = wa)), t;
    }
    function Me(t, i, u) {
      return t.a == 0 && (t.a = i, t.sc = u, t.cb = 0), 0;
    }
    function ya(t, i, u) {
      return 3 <= u && t[i + 0] == 157 && t[i + 1] == 1 && t[i + 2] == 42;
    }
    function qi(t, i) {
      if (t == null) return 0;
      if (t.a = 0, t.sc = "OK", i == null) return Me(t, 2, "null VP8Io passed to VP8GetHeaders()");
      var u = i.data, p = i.w, v = i.ha;
      if (4 > v) return Me(t, 7, "Truncated header.");
      var y = u[p + 0] | u[p + 1] << 8 | u[p + 2] << 16, w = t.Od;
      if (w.Rb = !(1 & y), w.td = y >> 1 & 7, w.yd = y >> 4 & 1, w.ub = y >> 5, 3 < w.td) return Me(t, 3, "Incorrect keyframe parameters.");
      if (!w.yd) return Me(t, 4, "Frame not displayable.");
      p += 3, v -= 3;
      var L = t.Kc;
      if (w.Rb) {
        if (7 > v) return Me(t, 7, "cannot parse picture header");
        if (!ya(u, p, v)) return Me(t, 3, "Bad code word");
        L.c = 16383 & (u[p + 4] << 8 | u[p + 3]), L.Td = u[p + 4] >> 6, L.i = 16383 & (u[p + 6] << 8 | u[p + 5]), L.Ud = u[p + 6] >> 6, p += 7, v -= 7, t.za = L.c + 15 >> 4, t.Ub = L.i + 15 >> 4, i.width = L.c, i.height = L.i, i.Da = 0, i.j = 0, i.v = 0, i.va = i.width, i.o = i.height, i.da = 0, i.ib = i.width, i.hb = i.height, i.U = i.width, i.T = i.height, s((y = t.Pa).jb, 0, 255, y.jb.length), e((y = t.Qa) != null), y.Cb = 0, y.Bb = 0, y.Fb = 1, s(y.Zb, 0, 0, y.Zb.length), s(y.Lb, 0, 0, y.Lb);
      }
      if (w.ub > v) return Me(t, 7, "bad partition length");
      st(y = t.m, u, p, w.ub), p += w.ub, v -= w.ub, w.Rb && (L.Ld = it(y), L.Kd = it(y)), L = t.Qa;
      var _, C = t.Pa;
      if (e(y != null), e(L != null), L.Cb = it(y), L.Cb) {
        if (L.Bb = it(y), it(y)) {
          for (L.Fb = it(y), _ = 0; 4 > _; ++_) L.Zb[_] = it(y) ? X(y, 7) : 0;
          for (_ = 0; 4 > _; ++_) L.Lb[_] = it(y) ? X(y, 6) : 0;
        }
        if (L.Bb) for (_ = 0; 3 > _; ++_) C.jb[_] = it(y) ? ht(y, 8) : 255;
      } else L.Bb = 0;
      if (y.Ka) return Me(t, 3, "cannot parse segment header");
      if ((L = t.ed).zd = it(y), L.Tb = ht(y, 6), L.wb = ht(y, 3), L.Pc = it(y), L.Pc && it(y)) {
        for (C = 0; 4 > C; ++C) it(y) && (L.vd[C] = X(y, 6));
        for (C = 0; 4 > C; ++C) it(y) && (L.od[C] = X(y, 6));
      }
      if (t.L = L.Tb == 0 ? 0 : L.zd ? 1 : 2, y.Ka) return Me(t, 3, "cannot parse filter header");
      var H = v;
      if (v = _ = p, p = _ + H, L = H, t.Xb = (1 << ht(t.m, 2)) - 1, H < 3 * (C = t.Xb)) u = 7;
      else {
        for (_ += 3 * C, L -= 3 * C, H = 0; H < C; ++H) {
          var Q = u[v + 0] | u[v + 1] << 8 | u[v + 2] << 16;
          Q > L && (Q = L), st(t.Jc[+H], u, _, Q), _ += Q, L -= Q, v += 3;
        }
        st(t.Jc[+C], u, _, L), u = _ < p ? 0 : 5;
      }
      if (u != 0) return Me(t, u, "cannot parse partitions");
      for (u = ht(_ = t.m, 7), v = it(_) ? X(_, 4) : 0, p = it(_) ? X(_, 4) : 0, L = it(_) ? X(_, 4) : 0, C = it(_) ? X(_, 4) : 0, _ = it(_) ? X(_, 4) : 0, H = t.Qa, Q = 0; 4 > Q; ++Q) {
        if (H.Cb) {
          var tt = H.Zb[Q];
          H.Fb || (tt += u);
        } else {
          if (0 < Q) {
            t.pb[Q] = t.pb[0];
            continue;
          }
          tt = u;
        }
        var Y = t.pb[Q];
        Y.Sc[0] = Ys[yr(tt + v, 127)], Y.Sc[1] = Js[yr(tt + 0, 127)], Y.Eb[0] = 2 * Ys[yr(tt + p, 127)], Y.Eb[1] = 101581 * Js[yr(tt + L, 127)] >> 16, 8 > Y.Eb[1] && (Y.Eb[1] = 8), Y.Qc[0] = Ys[yr(tt + C, 117)], Y.Qc[1] = Js[yr(tt + _, 127)], Y.lc = tt + _;
      }
      if (!w.Rb) return Me(t, 4, "Not a key frame.");
      for (it(y), w = t.Pa, u = 0; 4 > u; ++u) {
        for (v = 0; 8 > v; ++v) for (p = 0; 3 > p; ++p) for (L = 0; 11 > L; ++L) C = ut(y, el[u][v][p][L]) ? ht(y, 8) : Qu[u][v][p][L], w.Wc[u][v].Yb[p][L] = C;
        for (v = 0; 17 > v; ++v) w.Xc[u][v] = w.Wc[u][rl[v]];
      }
      return t.kc = it(y), t.kc && (t.Bd = ht(y, 8)), t.cb = 1;
    }
    function wa(t, i, u, p, v, y, w) {
      var L = i[v].Yb[u];
      for (u = 0; 16 > v; ++v) {
        if (!ut(t, L[u + 0])) return v;
        for (; !ut(t, L[u + 1]); ) if (L = i[++v].Yb[0], u = 0, v == 16) return 16;
        var _ = i[v + 1].Yb;
        if (ut(t, L[u + 2])) {
          var C = t, H = 0;
          if (ut(C, (tt = L)[(Q = u) + 3]))
            if (ut(C, tt[Q + 6])) {
              for (L = 0, Q = 2 * (H = ut(C, tt[Q + 8])) + (tt = ut(C, tt[Q + 9 + H])), H = 0, tt = Zu[Q]; tt[L]; ++L) H += H + ut(C, tt[L]);
              H += 3 + (8 << Q);
            } else ut(C, tt[Q + 7]) ? (H = 7 + 2 * ut(C, 165), H += ut(C, 145)) : H = 5 + ut(C, 159);
          else H = ut(C, tt[Q + 4]) ? 3 + ut(C, tt[Q + 5]) : 2;
          L = _[2];
        } else H = 1, L = _[1];
        _ = w + $u[v], 0 > (C = t).b && ft(C);
        var Q, tt = C.b, Y = (Q = C.Ca >> 1) - (C.I >> tt) >> 31;
        --C.b, C.Ca += Y, C.Ca |= 1, C.I -= (Q + 1 & Y) << tt, y[_] = ((H ^ Y) - Y) * p[(0 < v) + 0];
      }
      return 16;
    }
    function Na(t) {
      var i = t.rb[t.sb - 1];
      i.la = 0, i.Na = 0, s(t.zc, 0, 0, t.zc.length), t.ja = 0;
    }
    function ys(t, i) {
      if (t == null) return 0;
      if (i == null) return Me(t, 2, "NULL VP8Io parameter in VP8Decode().");
      if (!t.cb && !qi(t, i)) return 0;
      if (e(t.cb), i.ac == null || i.ac(i)) {
        i.ob && (t.L = 0);
        var u = Ja[t.L];
        if (t.L == 2 ? (t.yb = 0, t.zb = 0) : (t.yb = i.v - u >> 4, t.zb = i.j - u >> 4, 0 > t.yb && (t.yb = 0), 0 > t.zb && (t.zb = 0)), t.Va = i.o + 15 + u >> 4, t.Hb = i.va + 15 + u >> 4, t.Hb > t.za && (t.Hb = t.za), t.Va > t.Ub && (t.Va = t.Ub), 0 < t.L) {
          var p = t.ed;
          for (u = 0; 4 > u; ++u) {
            var v;
            if (t.Qa.Cb) {
              var y = t.Qa.Lb[u];
              t.Qa.Fb || (y += p.Tb);
            } else y = p.Tb;
            for (v = 0; 1 >= v; ++v) {
              var w = t.gd[u][v], L = y;
              if (p.Pc && (L += p.vd[0], v && (L += p.od[0])), 0 < (L = 0 > L ? 0 : 63 < L ? 63 : L)) {
                var _ = L;
                0 < p.wb && (_ = 4 < p.wb ? _ >> 2 : _ >> 1) > 9 - p.wb && (_ = 9 - p.wb), 1 > _ && (_ = 1), w.dd = _, w.tc = 2 * L + _, w.ld = 40 <= L ? 2 : 15 <= L ? 1 : 0;
              } else w.tc = 0;
              w.La = v;
            }
          }
        }
        u = 0;
      } else Me(t, 6, "Frame setup failed"), u = t.a;
      if (u = u == 0) {
        if (u) {
          t.$c = 0, 0 < t.Aa || (t.Ic = gl);
          t: {
            u = t.Ic, p = 4 * (_ = t.za);
            var C = 32 * _, H = _ + 1, Q = 0 < t.L ? _ * (0 < t.Aa ? 2 : 1) : 0, tt = (t.Aa == 2 ? 2 : 1) * _;
            if ((w = p + 832 + (v = 3 * (16 * u + Ja[t.L]) / 2 * C) + (y = t.Fa != null && 0 < t.Fa.length ? t.Kc.c * t.Kc.i : 0)) != w) u = 0;
            else {
              if (w > t.Vb) {
                if (t.Vb = 0, t.Ec = a(w), t.Fc = 0, t.Ec == null) {
                  u = Me(t, 1, "no memory during frame initialization.");
                  break t;
                }
                t.Vb = w;
              }
              w = t.Ec, L = t.Fc, t.Ac = w, t.Bc = L, L += p, t.Gd = o(C, va), t.Hd = 0, t.rb = o(H + 1, ma), t.sb = 1, t.wa = Q ? o(Q, li) : null, t.Y = 0, t.D.Nb = 0, t.D.wa = t.wa, t.D.Y = t.Y, 0 < t.Aa && (t.D.Y += _), e(!0), t.oc = w, t.pc = L, L += 832, t.ya = o(tt, Mi), t.aa = 0, t.D.ya = t.ya, t.D.aa = t.aa, t.Aa == 2 && (t.D.aa += _), t.R = 16 * _, t.B = 8 * _, _ = (C = Ja[t.L]) * t.R, C = C / 2 * t.B, t.sa = w, t.ta = L + _, t.qa = t.sa, t.ra = t.ta + 16 * u * t.R + C, t.Ha = t.qa, t.Ia = t.ra + 8 * u * t.B + C, t.$c = 0, L += v, t.mb = y ? w : null, t.nb = y ? L : null, e(L + y <= t.Fc + t.Vb), Na(t), s(t.Ac, t.Bc, 0, p), u = 1;
            }
          }
          if (u) {
            if (i.ka = 0, i.y = t.sa, i.O = t.ta, i.f = t.qa, i.N = t.ra, i.ea = t.Ha, i.Vd = t.Ia, i.fa = t.R, i.Rc = t.B, i.F = null, i.J = 0, !Fo) {
              for (u = -255; 255 >= u; ++u) hr[255 + u] = 0 > u ? -u : u;
              for (u = -1020; 1020 >= u; ++u) Qi[1020 + u] = -128 > u ? -128 : 127 < u ? 127 : u;
              for (u = -112; 112 >= u; ++u) _i[112 + u] = -16 > u ? -16 : 15 < u ? 15 : u;
              for (u = -255; 510 >= u; ++u) Ta[255 + u] = 0 > u ? 0 : 255 < u ? 255 : u;
              Fo = 1;
            }
            Gn = As, xe = La, Nr = Ns, ar = Aa, Yn = Ls, Ea = ws, Da = Un, Zi = Es, Jn = Ui, Xn = Hi, wn = pi, Kn = Ds, Si = Ca, Zn = gi, Nn = Jr, $i = Xr, Lr = Ms, hn = qs, Br[0] = Sa, Br[1] = xs, Br[2] = Fs, Br[3] = Yr, Br[4] = _a, Br[5] = Ti, Br[6] = fi, Br[7] = Is, Br[8] = js, Br[9] = Cs, Ln[0] = Je, Ln[1] = un, Ln[2] = hi, Ln[3] = _s, Ln[4] = Ps, Ln[5] = xa, Ln[6] = ks, fn[0] = Os, fn[1] = Ss, fn[2] = Ri, fn[3] = Pa, fn[4] = zi, fn[5] = zn, fn[6] = Bs, u = 1;
          } else u = 0;
        }
        u && (u = function(Y, vt) {
          for (Y.M = 0; Y.M < Y.Va; ++Y.M) {
            var lt, W = Y.Jc[Y.M & Y.Xb], G = Y.m, pt = Y;
            for (lt = 0; lt < pt.za; ++lt) {
              var wt = G, gt = pt, Bt = gt.Ac, Pt = gt.Bc + 4 * lt, Ut = gt.zc, It = gt.ya[gt.aa + lt];
              if (gt.Qa.Bb ? It.$b = ut(wt, gt.Pa.jb[0]) ? 2 + ut(wt, gt.Pa.jb[2]) : ut(wt, gt.Pa.jb[1]) : It.$b = 0, gt.kc && (It.Ad = ut(wt, gt.Bd)), It.Za = !ut(wt, 145) + 0, It.Za) {
                var oe = It.Ob, ce = 0;
                for (gt = 0; 4 > gt; ++gt) {
                  var se, re = Ut[0 + gt];
                  for (se = 0; 4 > se; ++se) {
                    re = tl[Bt[Pt + se]][re];
                    for (var me = Oo[ut(wt, re[0])]; 0 < me; ) me = Oo[2 * me + ut(wt, re[me])];
                    re = -me, Bt[Pt + se] = re;
                  }
                  n(oe, ce, Bt, Pt, 4), ce += 4, Ut[0 + gt] = re;
                }
              } else re = ut(wt, 156) ? ut(wt, 128) ? 1 : 3 : ut(wt, 163) ? 2 : 0, It.Ob[0] = re, s(Bt, Pt, re, 4), s(Ut, 0, re, 4);
              It.Dd = ut(wt, 142) ? ut(wt, 114) ? ut(wt, 183) ? 1 : 3 : 2 : 0;
            }
            if (pt.m.Ka) return Me(Y, 7, "Premature end-of-partition0 encountered.");
            for (; Y.ja < Y.za; ++Y.ja) {
              if (pt = W, wt = (G = Y).rb[G.sb - 1], Bt = G.rb[G.sb + G.ja], lt = G.ya[G.aa + G.ja], Pt = G.kc ? lt.Ad : 0) wt.la = Bt.la = 0, lt.Za || (wt.Na = Bt.Na = 0), lt.Hc = 0, lt.Gc = 0, lt.ia = 0;
              else {
                var pe, te;
                if (wt = Bt, Bt = pt, Pt = G.Pa.Xc, Ut = G.ya[G.aa + G.ja], It = G.pb[Ut.$b], gt = Ut.ad, oe = 0, ce = G.rb[G.sb - 1], re = se = 0, s(gt, oe, 0, 384), Ut.Za) var Ee = 0, ur = Pt[3];
                else {
                  me = a(16);
                  var De = wt.Na + ce.Na;
                  if (De = ta(Bt, Pt[1], De, It.Eb, 0, me, 0), wt.Na = ce.Na = (0 < De) + 0, 1 < De) Gn(me, 0, gt, oe);
                  else {
                    var lr = me[0] + 3 >> 3;
                    for (me = 0; 256 > me; me += 16) gt[oe + me] = lr;
                  }
                  Ee = 1, ur = Pt[0];
                }
                var he = 15 & wt.la, dr = 15 & ce.la;
                for (me = 0; 4 > me; ++me) {
                  var pr = 1 & dr;
                  for (lr = te = 0; 4 > lr; ++lr) he = he >> 1 | (pr = (De = ta(Bt, ur, De = pr + (1 & he), It.Sc, Ee, gt, oe)) > Ee) << 7, te = te << 2 | (3 < De ? 3 : 1 < De ? 2 : gt[oe + 0] != 0), oe += 16;
                  he >>= 4, dr = dr >> 1 | pr << 7, se = (se << 8 | te) >>> 0;
                }
                for (ur = he, Ee = dr >> 4, pe = 0; 4 > pe; pe += 2) {
                  for (te = 0, he = wt.la >> 4 + pe, dr = ce.la >> 4 + pe, me = 0; 2 > me; ++me) {
                    for (pr = 1 & dr, lr = 0; 2 > lr; ++lr) De = pr + (1 & he), he = he >> 1 | (pr = 0 < (De = ta(Bt, Pt[2], De, It.Qc, 0, gt, oe))) << 3, te = te << 2 | (3 < De ? 3 : 1 < De ? 2 : gt[oe + 0] != 0), oe += 16;
                    he >>= 2, dr = dr >> 1 | pr << 5;
                  }
                  re |= te << 4 * pe, ur |= he << 4 << pe, Ee |= (240 & dr) << pe;
                }
                wt.la = ur, ce.la = Ee, Ut.Hc = se, Ut.Gc = re, Ut.ia = 43690 & re ? 0 : It.ia, Pt = !(se | re);
              }
              if (0 < G.L && (G.wa[G.Y + G.ja] = G.gd[lt.$b][lt.Za], G.wa[G.Y + G.ja].La |= !Pt), pt.Ka) return Me(Y, 7, "Premature end-of-file encountered.");
            }
            if (Na(Y), G = vt, pt = 1, lt = (W = Y).D, wt = 0 < W.L && W.M >= W.zb && W.M <= W.Va, W.Aa == 0) t: {
              if (lt.M = W.M, lt.uc = wt, yi(W, lt), pt = 1, lt = (te = W.D).Nb, wt = (re = Ja[W.L]) * W.R, Bt = re / 2 * W.B, me = 16 * lt * W.R, lr = 8 * lt * W.B, Pt = W.sa, Ut = W.ta - wt + me, It = W.qa, gt = W.ra - Bt + lr, oe = W.Ha, ce = W.Ia - Bt + lr, dr = (he = te.M) == 0, se = he >= W.Va - 1, W.Aa == 2 && yi(W, te), te.uc) for (pr = (De = W).D.M, e(De.D.uc), te = De.yb; te < De.Hb; ++te) {
                Ee = te, ur = pr;
                var ze = (Ge = (Fe = De).D).Nb;
                pe = Fe.R;
                var Ge = Ge.wa[Ge.Y + Ee], sr = Fe.sa, Sr = Fe.ta + 16 * ze * pe + 16 * Ee, $r = Ge.dd, Ue = Ge.tc;
                if (Ue != 0) if (e(3 <= Ue), Fe.L == 1) 0 < Ee && $i(sr, Sr, pe, Ue + 4), Ge.La && hn(sr, Sr, pe, Ue), 0 < ur && Nn(sr, Sr, pe, Ue + 4), Ge.La && Lr(sr, Sr, pe, Ue);
                else {
                  var dn = Fe.B, $n = Fe.qa, Pi = Fe.ra + 8 * ze * dn + 8 * Ee, xn = Fe.Ha, Fe = Fe.Ia + 8 * ze * dn + 8 * Ee;
                  ze = Ge.ld, 0 < Ee && (Zi(sr, Sr, pe, Ue + 4, $r, ze), Xn($n, Pi, xn, Fe, dn, Ue + 4, $r, ze)), Ge.La && (Kn(sr, Sr, pe, Ue, $r, ze), Zn($n, Pi, xn, Fe, dn, Ue, $r, ze)), 0 < ur && (Da(sr, Sr, pe, Ue + 4, $r, ze), Jn($n, Pi, xn, Fe, dn, Ue + 4, $r, ze)), Ge.La && (wn(sr, Sr, pe, Ue, $r, ze), Si($n, Pi, xn, Fe, dn, Ue, $r, ze));
                }
              }
              if (W.ia && alert("todo:DitherRow"), G.put != null) {
                if (te = 16 * he, he = 16 * (he + 1), dr ? (G.y = W.sa, G.O = W.ta + me, G.f = W.qa, G.N = W.ra + lr, G.ea = W.Ha, G.W = W.Ia + lr) : (te -= re, G.y = Pt, G.O = Ut, G.f = It, G.N = gt, G.ea = oe, G.W = ce), se || (he -= re), he > G.o && (he = G.o), G.F = null, G.J = null, W.Fa != null && 0 < W.Fa.length && te < he && (G.J = h(W, G, te, he - te), G.F = W.mb, G.F == null && G.F.length == 0)) {
                  pt = Me(W, 3, "Could not decode alpha data.");
                  break t;
                }
                te < G.j && (re = G.j - te, te = G.j, e(!(1 & re)), G.O += W.R * re, G.N += W.B * (re >> 1), G.W += W.B * (re >> 1), G.F != null && (G.J += G.width * re)), te < he && (G.O += G.v, G.N += G.v >> 1, G.W += G.v >> 1, G.F != null && (G.J += G.v), G.ka = te - G.j, G.U = G.va - G.v, G.T = he - te, pt = G.put(G));
              }
              lt + 1 != W.Ic || se || (n(W.sa, W.ta - wt, Pt, Ut + 16 * W.R, wt), n(W.qa, W.ra - Bt, It, gt + 8 * W.B, Bt), n(W.Ha, W.Ia - Bt, oe, ce + 8 * W.B, Bt));
            }
            if (!pt) return Me(Y, 6, "Output aborted.");
          }
          return 1;
        }(t, i)), i.bc != null && i.bc(i), u &= 1;
      }
      return u ? (t.cb = 0, u) : 0;
    }
    function Ir(t, i, u, p, v) {
      v = t[i + u + 32 * p] + (v >> 3), t[i + u + 32 * p] = -256 & v ? 0 > v ? 0 : 255 : v;
    }
    function br(t, i, u, p, v, y) {
      Ir(t, i, 0, u, p + v), Ir(t, i, 1, u, p + y), Ir(t, i, 2, u, p - y), Ir(t, i, 3, u, p - v);
    }
    function on(t) {
      return (20091 * t >> 16) + t;
    }
    function Ei(t, i, u, p) {
      var v, y = 0, w = a(16);
      for (v = 0; 4 > v; ++v) {
        var L = t[i + 0] + t[i + 8], _ = t[i + 0] - t[i + 8], C = (35468 * t[i + 4] >> 16) - on(t[i + 12]), H = on(t[i + 4]) + (35468 * t[i + 12] >> 16);
        w[y + 0] = L + H, w[y + 1] = _ + C, w[y + 2] = _ - C, w[y + 3] = L - H, y += 4, i++;
      }
      for (v = y = 0; 4 > v; ++v) L = (t = w[y + 0] + 4) + w[y + 8], _ = t - w[y + 8], C = (35468 * w[y + 4] >> 16) - on(w[y + 12]), Ir(u, p, 0, 0, L + (H = on(w[y + 4]) + (35468 * w[y + 12] >> 16))), Ir(u, p, 1, 0, _ + C), Ir(u, p, 2, 0, _ - C), Ir(u, p, 3, 0, L - H), y++, p += 32;
    }
    function ws(t, i, u, p) {
      var v = t[i + 0] + 4, y = 35468 * t[i + 4] >> 16, w = on(t[i + 4]), L = 35468 * t[i + 1] >> 16;
      br(u, p, 0, v + w, t = on(t[i + 1]), L), br(u, p, 1, v + y, t, L), br(u, p, 2, v - y, t, L), br(u, p, 3, v - w, t, L);
    }
    function La(t, i, u, p, v) {
      Ei(t, i, u, p), v && Ei(t, i + 16, u, p + 4);
    }
    function Ns(t, i, u, p) {
      xe(t, i + 0, u, p, 1), xe(t, i + 32, u, p + 128, 1);
    }
    function Aa(t, i, u, p) {
      var v;
      for (t = t[i + 0] + 4, v = 0; 4 > v; ++v) for (i = 0; 4 > i; ++i) Ir(u, p, i, v, t);
    }
    function Ls(t, i, u, p) {
      t[i + 0] && ar(t, i + 0, u, p), t[i + 16] && ar(t, i + 16, u, p + 4), t[i + 32] && ar(t, i + 32, u, p + 128), t[i + 48] && ar(t, i + 48, u, p + 128 + 4);
    }
    function As(t, i, u, p) {
      var v, y = a(16);
      for (v = 0; 4 > v; ++v) {
        var w = t[i + 0 + v] + t[i + 12 + v], L = t[i + 4 + v] + t[i + 8 + v], _ = t[i + 4 + v] - t[i + 8 + v], C = t[i + 0 + v] - t[i + 12 + v];
        y[0 + v] = w + L, y[8 + v] = w - L, y[4 + v] = C + _, y[12 + v] = C - _;
      }
      for (v = 0; 4 > v; ++v) w = (t = y[0 + 4 * v] + 3) + y[3 + 4 * v], L = y[1 + 4 * v] + y[2 + 4 * v], _ = y[1 + 4 * v] - y[2 + 4 * v], C = t - y[3 + 4 * v], u[p + 0] = w + L >> 3, u[p + 16] = C + _ >> 3, u[p + 32] = w - L >> 3, u[p + 48] = C - _ >> 3, p += 64;
    }
    function Di(t, i, u) {
      var p, v = i - 32, y = fr, w = 255 - t[v - 1];
      for (p = 0; p < u; ++p) {
        var L, _ = y, C = w + t[i - 1];
        for (L = 0; L < u; ++L) t[i + L] = _[C + t[v + L]];
        i += 32;
      }
    }
    function xs(t, i) {
      Di(t, i, 4);
    }
    function Ss(t, i) {
      Di(t, i, 8);
    }
    function un(t, i) {
      Di(t, i, 16);
    }
    function hi(t, i) {
      var u;
      for (u = 0; 16 > u; ++u) n(t, i + 32 * u, t, i - 32, 16);
    }
    function _s(t, i) {
      var u;
      for (u = 16; 0 < u; --u) s(t, i, t[i - 1], 16), i += 32;
    }
    function Rn(t, i, u) {
      var p;
      for (p = 0; 16 > p; ++p) s(i, u + 32 * p, t, 16);
    }
    function Je(t, i) {
      var u, p = 16;
      for (u = 0; 16 > u; ++u) p += t[i - 1 + 32 * u] + t[i + u - 32];
      Rn(p >> 5, t, i);
    }
    function Ps(t, i) {
      var u, p = 8;
      for (u = 0; 16 > u; ++u) p += t[i - 1 + 32 * u];
      Rn(p >> 4, t, i);
    }
    function xa(t, i) {
      var u, p = 8;
      for (u = 0; 16 > u; ++u) p += t[i + u - 32];
      Rn(p >> 4, t, i);
    }
    function ks(t, i) {
      Rn(128, t, i);
    }
    function Kt(t, i, u) {
      return t + 2 * i + u + 2 >> 2;
    }
    function Fs(t, i) {
      var u, p = i - 32;
      for (p = new Uint8Array([Kt(t[p - 1], t[p + 0], t[p + 1]), Kt(t[p + 0], t[p + 1], t[p + 2]), Kt(t[p + 1], t[p + 2], t[p + 3]), Kt(t[p + 2], t[p + 3], t[p + 4])]), u = 0; 4 > u; ++u) n(t, i + 32 * u, p, 0, p.length);
    }
    function Yr(t, i) {
      var u = t[i - 1], p = t[i - 1 + 32], v = t[i - 1 + 64], y = t[i - 1 + 96];
      Lt(t, i + 0, 16843009 * Kt(t[i - 1 - 32], u, p)), Lt(t, i + 32, 16843009 * Kt(u, p, v)), Lt(t, i + 64, 16843009 * Kt(p, v, y)), Lt(t, i + 96, 16843009 * Kt(v, y, y));
    }
    function Sa(t, i) {
      var u, p = 4;
      for (u = 0; 4 > u; ++u) p += t[i + u - 32] + t[i - 1 + 32 * u];
      for (p >>= 3, u = 0; 4 > u; ++u) s(t, i + 32 * u, p, 4);
    }
    function _a(t, i) {
      var u = t[i - 1 + 0], p = t[i - 1 + 32], v = t[i - 1 + 64], y = t[i - 1 - 32], w = t[i + 0 - 32], L = t[i + 1 - 32], _ = t[i + 2 - 32], C = t[i + 3 - 32];
      t[i + 0 + 96] = Kt(p, v, t[i - 1 + 96]), t[i + 1 + 96] = t[i + 0 + 64] = Kt(u, p, v), t[i + 2 + 96] = t[i + 1 + 64] = t[i + 0 + 32] = Kt(y, u, p), t[i + 3 + 96] = t[i + 2 + 64] = t[i + 1 + 32] = t[i + 0 + 0] = Kt(w, y, u), t[i + 3 + 64] = t[i + 2 + 32] = t[i + 1 + 0] = Kt(L, w, y), t[i + 3 + 32] = t[i + 2 + 0] = Kt(_, L, w), t[i + 3 + 0] = Kt(C, _, L);
    }
    function fi(t, i) {
      var u = t[i + 1 - 32], p = t[i + 2 - 32], v = t[i + 3 - 32], y = t[i + 4 - 32], w = t[i + 5 - 32], L = t[i + 6 - 32], _ = t[i + 7 - 32];
      t[i + 0 + 0] = Kt(t[i + 0 - 32], u, p), t[i + 1 + 0] = t[i + 0 + 32] = Kt(u, p, v), t[i + 2 + 0] = t[i + 1 + 32] = t[i + 0 + 64] = Kt(p, v, y), t[i + 3 + 0] = t[i + 2 + 32] = t[i + 1 + 64] = t[i + 0 + 96] = Kt(v, y, w), t[i + 3 + 32] = t[i + 2 + 64] = t[i + 1 + 96] = Kt(y, w, L), t[i + 3 + 64] = t[i + 2 + 96] = Kt(w, L, _), t[i + 3 + 96] = Kt(L, _, _);
    }
    function Ti(t, i) {
      var u = t[i - 1 + 0], p = t[i - 1 + 32], v = t[i - 1 + 64], y = t[i - 1 - 32], w = t[i + 0 - 32], L = t[i + 1 - 32], _ = t[i + 2 - 32], C = t[i + 3 - 32];
      t[i + 0 + 0] = t[i + 1 + 64] = y + w + 1 >> 1, t[i + 1 + 0] = t[i + 2 + 64] = w + L + 1 >> 1, t[i + 2 + 0] = t[i + 3 + 64] = L + _ + 1 >> 1, t[i + 3 + 0] = _ + C + 1 >> 1, t[i + 0 + 96] = Kt(v, p, u), t[i + 0 + 64] = Kt(p, u, y), t[i + 0 + 32] = t[i + 1 + 96] = Kt(u, y, w), t[i + 1 + 32] = t[i + 2 + 96] = Kt(y, w, L), t[i + 2 + 32] = t[i + 3 + 96] = Kt(w, L, _), t[i + 3 + 32] = Kt(L, _, C);
    }
    function Is(t, i) {
      var u = t[i + 0 - 32], p = t[i + 1 - 32], v = t[i + 2 - 32], y = t[i + 3 - 32], w = t[i + 4 - 32], L = t[i + 5 - 32], _ = t[i + 6 - 32], C = t[i + 7 - 32];
      t[i + 0 + 0] = u + p + 1 >> 1, t[i + 1 + 0] = t[i + 0 + 64] = p + v + 1 >> 1, t[i + 2 + 0] = t[i + 1 + 64] = v + y + 1 >> 1, t[i + 3 + 0] = t[i + 2 + 64] = y + w + 1 >> 1, t[i + 0 + 32] = Kt(u, p, v), t[i + 1 + 32] = t[i + 0 + 96] = Kt(p, v, y), t[i + 2 + 32] = t[i + 1 + 96] = Kt(v, y, w), t[i + 3 + 32] = t[i + 2 + 96] = Kt(y, w, L), t[i + 3 + 64] = Kt(w, L, _), t[i + 3 + 96] = Kt(L, _, C);
    }
    function Cs(t, i) {
      var u = t[i - 1 + 0], p = t[i - 1 + 32], v = t[i - 1 + 64], y = t[i - 1 + 96];
      t[i + 0 + 0] = u + p + 1 >> 1, t[i + 2 + 0] = t[i + 0 + 32] = p + v + 1 >> 1, t[i + 2 + 32] = t[i + 0 + 64] = v + y + 1 >> 1, t[i + 1 + 0] = Kt(u, p, v), t[i + 3 + 0] = t[i + 1 + 32] = Kt(p, v, y), t[i + 3 + 32] = t[i + 1 + 64] = Kt(v, y, y), t[i + 3 + 64] = t[i + 2 + 64] = t[i + 0 + 96] = t[i + 1 + 96] = t[i + 2 + 96] = t[i + 3 + 96] = y;
    }
    function js(t, i) {
      var u = t[i - 1 + 0], p = t[i - 1 + 32], v = t[i - 1 + 64], y = t[i - 1 + 96], w = t[i - 1 - 32], L = t[i + 0 - 32], _ = t[i + 1 - 32], C = t[i + 2 - 32];
      t[i + 0 + 0] = t[i + 2 + 32] = u + w + 1 >> 1, t[i + 0 + 32] = t[i + 2 + 64] = p + u + 1 >> 1, t[i + 0 + 64] = t[i + 2 + 96] = v + p + 1 >> 1, t[i + 0 + 96] = y + v + 1 >> 1, t[i + 3 + 0] = Kt(L, _, C), t[i + 2 + 0] = Kt(w, L, _), t[i + 1 + 0] = t[i + 3 + 32] = Kt(u, w, L), t[i + 1 + 32] = t[i + 3 + 64] = Kt(p, u, w), t[i + 1 + 64] = t[i + 3 + 96] = Kt(v, p, u), t[i + 1 + 96] = Kt(y, v, p);
    }
    function Ri(t, i) {
      var u;
      for (u = 0; 8 > u; ++u) n(t, i + 32 * u, t, i - 32, 8);
    }
    function Pa(t, i) {
      var u;
      for (u = 0; 8 > u; ++u) s(t, i, t[i - 1], 8), i += 32;
    }
    function Cr(t, i, u) {
      var p;
      for (p = 0; 8 > p; ++p) s(i, u + 32 * p, t, 8);
    }
    function Os(t, i) {
      var u, p = 8;
      for (u = 0; 8 > u; ++u) p += t[i + u - 32] + t[i - 1 + 32 * u];
      Cr(p >> 4, t, i);
    }
    function zn(t, i) {
      var u, p = 4;
      for (u = 0; 8 > u; ++u) p += t[i + u - 32];
      Cr(p >> 3, t, i);
    }
    function zi(t, i) {
      var u, p = 4;
      for (u = 0; 8 > u; ++u) p += t[i - 1 + 32 * u];
      Cr(p >> 3, t, i);
    }
    function Bs(t, i) {
      Cr(128, t, i);
    }
    function di(t, i, u) {
      var p = t[i - u], v = t[i + 0], y = 3 * (v - p) + Us[1020 + t[i - 2 * u] - t[i + u]], w = Ra[112 + (y + 4 >> 3)];
      t[i - u] = fr[255 + p + Ra[112 + (y + 3 >> 3)]], t[i + 0] = fr[255 + v - w];
    }
    function ka(t, i, u, p) {
      var v = t[i + 0], y = t[i + u];
      return Ar[255 + t[i - 2 * u] - t[i - u]] > p || Ar[255 + y - v] > p;
    }
    function Fa(t, i, u, p) {
      return 4 * Ar[255 + t[i - u] - t[i + 0]] + Ar[255 + t[i - 2 * u] - t[i + u]] <= p;
    }
    function Ia(t, i, u, p, v) {
      var y = t[i - 3 * u], w = t[i - 2 * u], L = t[i - u], _ = t[i + 0], C = t[i + u], H = t[i + 2 * u], Q = t[i + 3 * u];
      return 4 * Ar[255 + L - _] + Ar[255 + w - C] > p ? 0 : Ar[255 + t[i - 4 * u] - y] <= v && Ar[255 + y - w] <= v && Ar[255 + w - L] <= v && Ar[255 + Q - H] <= v && Ar[255 + H - C] <= v && Ar[255 + C - _] <= v;
    }
    function Jr(t, i, u, p) {
      var v = 2 * p + 1;
      for (p = 0; 16 > p; ++p) Fa(t, i + p, u, v) && di(t, i + p, u);
    }
    function Xr(t, i, u, p) {
      var v = 2 * p + 1;
      for (p = 0; 16 > p; ++p) Fa(t, i + p * u, 1, v) && di(t, i + p * u, 1);
    }
    function Ms(t, i, u, p) {
      var v;
      for (v = 3; 0 < v; --v) Jr(t, i += 4 * u, u, p);
    }
    function qs(t, i, u, p) {
      var v;
      for (v = 3; 0 < v; --v) Xr(t, i += 4, u, p);
    }
    function jr(t, i, u, p, v, y, w, L) {
      for (y = 2 * y + 1; 0 < v--; ) {
        if (Ia(t, i, u, y, w)) if (ka(t, i, u, L)) di(t, i, u);
        else {
          var _ = t, C = i, H = u, Q = _[C - 2 * H], tt = _[C - H], Y = _[C + 0], vt = _[C + H], lt = _[C + 2 * H], W = 27 * (pt = Us[1020 + 3 * (Y - tt) + Us[1020 + Q - vt]]) + 63 >> 7, G = 18 * pt + 63 >> 7, pt = 9 * pt + 63 >> 7;
          _[C - 3 * H] = fr[255 + _[C - 3 * H] + pt], _[C - 2 * H] = fr[255 + Q + G], _[C - H] = fr[255 + tt + W], _[C + 0] = fr[255 + Y - W], _[C + H] = fr[255 + vt - G], _[C + 2 * H] = fr[255 + lt - pt];
        }
        i += p;
      }
    }
    function Kr(t, i, u, p, v, y, w, L) {
      for (y = 2 * y + 1; 0 < v--; ) {
        if (Ia(t, i, u, y, w)) if (ka(t, i, u, L)) di(t, i, u);
        else {
          var _ = t, C = i, H = u, Q = _[C - H], tt = _[C + 0], Y = _[C + H], vt = Ra[112 + ((lt = 3 * (tt - Q)) + 4 >> 3)], lt = Ra[112 + (lt + 3 >> 3)], W = vt + 1 >> 1;
          _[C - 2 * H] = fr[255 + _[C - 2 * H] + W], _[C - H] = fr[255 + Q + lt], _[C + 0] = fr[255 + tt - vt], _[C + H] = fr[255 + Y - W];
        }
        i += p;
      }
    }
    function Un(t, i, u, p, v, y) {
      jr(t, i, u, 1, 16, p, v, y);
    }
    function Es(t, i, u, p, v, y) {
      jr(t, i, 1, u, 16, p, v, y);
    }
    function pi(t, i, u, p, v, y) {
      var w;
      for (w = 3; 0 < w; --w) Kr(t, i += 4 * u, u, 1, 16, p, v, y);
    }
    function Ds(t, i, u, p, v, y) {
      var w;
      for (w = 3; 0 < w; --w) Kr(t, i += 4, 1, u, 16, p, v, y);
    }
    function Ui(t, i, u, p, v, y, w, L) {
      jr(t, i, v, 1, 8, y, w, L), jr(u, p, v, 1, 8, y, w, L);
    }
    function Hi(t, i, u, p, v, y, w, L) {
      jr(t, i, 1, v, 8, y, w, L), jr(u, p, 1, v, 8, y, w, L);
    }
    function Ca(t, i, u, p, v, y, w, L) {
      Kr(t, i + 4 * v, v, 1, 8, y, w, L), Kr(u, p + 4 * v, v, 1, 8, y, w, L);
    }
    function gi(t, i, u, p, v, y, w, L) {
      Kr(t, i + 4, 1, v, 8, y, w, L), Kr(u, p + 4, 1, v, 8, y, w, L);
    }
    function ja() {
      this.ba = new _r(), this.ec = [], this.cc = [], this.Mc = [], this.Dc = this.Nc = this.dc = this.fc = 0, this.Oa = new Zt(), this.memory = 0, this.Ib = "OutputFunc", this.Jb = "OutputAlphaFunc", this.Nd = "OutputRowFunc";
    }
    function mi() {
      this.data = [], this.offset = this.kd = this.ha = this.w = 0, this.na = [], this.xa = this.gb = this.Ja = this.Sa = this.P = 0;
    }
    function Oa() {
      this.nc = this.Ea = this.b = this.hc = 0, this.K = [], this.w = 0;
    }
    function Ts() {
      this.ua = 0, this.Wa = new mt(), this.vb = new mt(), this.md = this.xc = this.wc = 0, this.vc = [], this.Wb = 0, this.Ya = new ot(), this.yc = new D();
    }
    function vi() {
      this.xb = this.a = 0, this.l = new ci(), this.ca = new _r(), this.V = [], this.Ba = 0, this.Ta = [], this.Ua = 0, this.m = new x(), this.Pb = 0, this.wd = new x(), this.Ma = this.$ = this.C = this.i = this.c = this.xd = 0, this.s = new Ts(), this.ab = 0, this.gc = o(4, Oa), this.Oc = 0;
    }
    function Wi() {
      this.Lc = this.Z = this.$a = this.i = this.c = 0, this.l = new ci(), this.ic = 0, this.ca = [], this.tb = 0, this.qd = null, this.rd = 0;
    }
    function Hn(t, i, u, p, v, y, w) {
      for (t = t == null ? 0 : t[i + 0], i = 0; i < w; ++i) v[y + i] = t + u[p + i] & 255, t = v[y + i];
    }
    function vn(t, i, u, p, v, y, w) {
      var L;
      if (t == null) Hn(null, null, u, p, v, y, w);
      else for (L = 0; L < w; ++L) v[y + L] = t[i + L] + u[p + L] & 255;
    }
    function Vi(t, i, u, p, v, y, w) {
      if (t == null) Hn(null, null, u, p, v, y, w);
      else {
        var L, _ = t[i + 0], C = _, H = _;
        for (L = 0; L < w; ++L) C = H + (_ = t[i + L]) - C, H = u[p + L] + (-256 & C ? 0 > C ? 0 : 255 : C) & 255, C = _, v[y + L] = H;
      }
    }
    function h(t, i, u, p) {
      var v = i.width, y = i.o;
      if (e(t != null && i != null), 0 > u || 0 >= p || u + p > y) return null;
      if (!t.Cc) {
        if (t.ga == null) {
          var w;
          if (t.ga = new Wi(), (w = t.ga == null) || (w = i.width * i.o, e(t.Gb.length == 0), t.Gb = a(w), t.Uc = 0, t.Gb == null ? w = 0 : (t.mb = t.Gb, t.nb = t.Uc, t.rc = null, w = 1), w = !w), !w) {
            w = t.ga;
            var L = t.Fa, _ = t.P, C = t.qc, H = t.mb, Q = t.nb, tt = _ + 1, Y = C - 1, vt = w.l;
            if (e(L != null && H != null && i != null), An[0] = null, An[1] = Hn, An[2] = vn, An[3] = Vi, w.ca = H, w.tb = Q, w.c = i.width, w.i = i.height, e(0 < w.c && 0 < w.i), 1 >= C) i = 0;
            else if (w.$a = L[_ + 0] >> 0 & 3, w.Z = L[_ + 0] >> 2 & 3, w.Lc = L[_ + 0] >> 4 & 3, _ = L[_ + 0] >> 6 & 3, 0 > w.$a || 1 < w.$a || 4 <= w.Z || 1 < w.Lc || _) i = 0;
            else if (vt.put = Wr, vt.ac = Hr, vt.bc = Gt, vt.ma = w, vt.width = i.width, vt.height = i.height, vt.Da = i.Da, vt.v = i.v, vt.va = i.va, vt.j = i.j, vt.o = i.o, w.$a) t: {
              e(w.$a == 1), i = Dn();
              e: for (; ; ) {
                if (i == null) {
                  i = 0;
                  break t;
                }
                if (e(w != null), w.mc = i, i.c = w.c, i.i = w.i, i.l = w.l, i.l.ma = w, i.l.width = w.c, i.l.height = w.i, i.a = 0, Nt(i.m, L, tt, Y), !Gr(w.c, w.i, 1, i, null) || (i.ab == 1 && i.gc[0].hc == 3 && Pr(i.s) ? (w.ic = 1, L = i.c * i.i, i.Ta = null, i.Ua = 0, i.V = a(L), i.Ba = 0, i.V == null ? (i.a = 1, i = 0) : i = 1) : (w.ic = 0, i = Tn(i, w.c)), !i)) break e;
                i = 1;
                break t;
              }
              w.mc = null, i = 0;
            }
            else i = Y >= w.c * w.i;
            w = !i;
          }
          if (w) return null;
          t.ga.Lc != 1 ? t.Ga = 0 : p = y - u;
        }
        e(t.ga != null), e(u + p <= y);
        t: {
          if (i = (L = t.ga).c, y = L.l.o, L.$a == 0) {
            if (tt = t.rc, Y = t.Vc, vt = t.Fa, _ = t.P + 1 + u * i, C = t.mb, H = t.nb + u * i, e(_ <= t.P + t.qc), L.Z != 0) for (e(An[L.Z] != null), w = 0; w < p; ++w) An[L.Z](tt, Y, vt, _, C, H, i), tt = C, Y = H, H += i, _ += i;
            else for (w = 0; w < p; ++w) n(C, H, vt, _, i), tt = C, Y = H, H += i, _ += i;
            t.rc = tt, t.Vc = Y;
          } else {
            if (e(L.mc != null), i = u + p, e((w = L.mc) != null), e(i <= w.i), w.C >= i) i = 1;
            else if (L.ic || $(), L.ic) {
              L = w.V, tt = w.Ba, Y = w.c;
              var lt = w.i, W = (vt = 1, _ = w.$ / Y, C = w.$ % Y, H = w.m, Q = w.s, w.$), G = Y * lt, pt = Y * i, wt = Q.wc, gt = W < pt ? We(Q, C, _) : null;
              e(W <= G), e(i <= lt), e(Pr(Q));
              e: for (; ; ) {
                for (; !H.h && W < pt; ) {
                  if (C & wt || (gt = We(Q, C, _)), e(gt != null), K(H), 256 > (lt = ke(gt.G[0], gt.H[0], H))) L[tt + W] = lt, ++W, ++C >= Y && (C = 0, ++_ <= i && !(_ % 16) && kr(w, _));
                  else {
                    if (!(280 > lt)) {
                      vt = 0;
                      break e;
                    }
                    lt = mr(lt - 256, H);
                    var Bt, Pt = ke(gt.G[4], gt.H[4], H);
                    if (K(H), !(W >= (Pt = sn(Y, Pt = mr(Pt, H))) && G - W >= lt)) {
                      vt = 0;
                      break e;
                    }
                    for (Bt = 0; Bt < lt; ++Bt) L[tt + W + Bt] = L[tt + W + Bt - Pt];
                    for (W += lt, C += lt; C >= Y; ) C -= Y, ++_ <= i && !(_ % 16) && kr(w, _);
                    W < pt && C & wt && (gt = We(Q, C, _));
                  }
                  e(H.h == U(H));
                }
                kr(w, _ > i ? i : _);
                break e;
              }
              !vt || H.h && W < G ? (vt = 0, w.a = H.h ? 5 : 3) : w.$ = W, i = vt;
            } else i = Fr(w, w.V, w.Ba, w.c, w.i, i, si);
            if (!i) {
              p = 0;
              break t;
            }
          }
          u + p >= y && (t.Cc = 1), p = 1;
        }
        if (!p) return null;
        if (t.Cc && ((p = t.ga) != null && (p.mc = null), t.ga = null, 0 < t.Ga)) return alert("todo:WebPDequantizeLevels"), null;
      }
      return t.nb + u * v;
    }
    function d(t, i, u, p, v, y) {
      for (; 0 < v--; ) {
        var w, L = t, _ = i + (u ? 1 : 0), C = t, H = i + (u ? 0 : 3);
        for (w = 0; w < p; ++w) {
          var Q = C[H + 4 * w];
          Q != 255 && (Q *= 32897, L[_ + 4 * w + 0] = L[_ + 4 * w + 0] * Q >> 23, L[_ + 4 * w + 1] = L[_ + 4 * w + 1] * Q >> 23, L[_ + 4 * w + 2] = L[_ + 4 * w + 2] * Q >> 23);
        }
        i += y;
      }
    }
    function P(t, i, u, p, v) {
      for (; 0 < p--; ) {
        var y;
        for (y = 0; y < u; ++y) {
          var w = t[i + 2 * y + 0], L = 15 & (C = t[i + 2 * y + 1]), _ = 4369 * L, C = (240 & C | C >> 4) * _ >> 16;
          t[i + 2 * y + 0] = (240 & w | w >> 4) * _ >> 16 & 240 | (15 & w | w << 4) * _ >> 16 >> 4 & 15, t[i + 2 * y + 1] = 240 & C | L;
        }
        i += v;
      }
    }
    function T(t, i, u, p, v, y, w, L) {
      var _, C, H = 255;
      for (C = 0; C < v; ++C) {
        for (_ = 0; _ < p; ++_) {
          var Q = t[i + _];
          y[w + 4 * _] = Q, H &= Q;
        }
        i += u, w += L;
      }
      return H != 255;
    }
    function Z(t, i, u, p, v) {
      var y;
      for (y = 0; y < v; ++y) u[p + y] = t[i + y] >> 8;
    }
    function $() {
      we = d, de = P, Ve = T, Se = Z;
    }
    function yt(t, i, u) {
      z[t] = function(p, v, y, w, L, _, C, H, Q, tt, Y, vt, lt, W, G, pt, wt) {
        var gt, Bt = wt - 1 >> 1, Pt = L[_ + 0] | C[H + 0] << 16, Ut = Q[tt + 0] | Y[vt + 0] << 16;
        e(p != null);
        var It = 3 * Pt + Ut + 131074 >> 2;
        for (i(p[v + 0], 255 & It, It >> 16, lt, W), y != null && (It = 3 * Ut + Pt + 131074 >> 2, i(y[w + 0], 255 & It, It >> 16, G, pt)), gt = 1; gt <= Bt; ++gt) {
          var oe = L[_ + gt] | C[H + gt] << 16, ce = Q[tt + gt] | Y[vt + gt] << 16, se = Pt + oe + Ut + ce + 524296, re = se + 2 * (oe + Ut) >> 3;
          It = re + Pt >> 1, Pt = (se = se + 2 * (Pt + ce) >> 3) + oe >> 1, i(p[v + 2 * gt - 1], 255 & It, It >> 16, lt, W + (2 * gt - 1) * u), i(p[v + 2 * gt - 0], 255 & Pt, Pt >> 16, lt, W + (2 * gt - 0) * u), y != null && (It = se + Ut >> 1, Pt = re + ce >> 1, i(y[w + 2 * gt - 1], 255 & It, It >> 16, G, pt + (2 * gt - 1) * u), i(y[w + 2 * gt + 0], 255 & Pt, Pt >> 16, G, pt + (2 * gt + 0) * u)), Pt = oe, Ut = ce;
        }
        1 & wt || (It = 3 * Pt + Ut + 131074 >> 2, i(p[v + wt - 1], 255 & It, It >> 16, lt, W + (wt - 1) * u), y != null && (It = 3 * Ut + Pt + 131074 >> 2, i(y[w + wt - 1], 255 & It, It >> 16, G, pt + (wt - 1) * u)));
      };
    }
    function St() {
      xr[za] = il, xr[Ua] = Mo, xr[Io] = al, xr[Ha] = qo, xr[Wa] = Eo, xr[Hs] = Do, xr[Co] = sl, xr[Ws] = Mo, xr[Vs] = qo, xr[Va] = Eo, xr[Gs] = Do;
    }
    function Tt(t) {
      return t & -16384 ? 0 > t ? 0 : 255 : t >> ol;
    }
    function Jt(t, i) {
      return Tt((19077 * t >> 8) + (26149 * i >> 8) - 14234);
    }
    function Xt(t, i, u) {
      return Tt((19077 * t >> 8) - (6419 * i >> 8) - (13320 * u >> 8) + 8708);
    }
    function ae(t, i) {
      return Tt((19077 * t >> 8) + (33050 * i >> 8) - 17685);
    }
    function ge(t, i, u, p, v) {
      p[v + 0] = Jt(t, u), p[v + 1] = Xt(t, i, u), p[v + 2] = ae(t, i);
    }
    function Ae(t, i, u, p, v) {
      p[v + 0] = ae(t, i), p[v + 1] = Xt(t, i, u), p[v + 2] = Jt(t, u);
    }
    function Le(t, i, u, p, v) {
      var y = Xt(t, i, u);
      i = y << 3 & 224 | ae(t, i) >> 3, p[v + 0] = 248 & Jt(t, u) | y >> 5, p[v + 1] = i;
    }
    function rr(t, i, u, p, v) {
      var y = 240 & ae(t, i) | 15;
      p[v + 0] = 240 & Jt(t, u) | Xt(t, i, u) >> 4, p[v + 1] = y;
    }
    function qe(t, i, u, p, v) {
      p[v + 0] = 255, ge(t, i, u, p, v + 1);
    }
    function Or(t, i, u, p, v) {
      Ae(t, i, u, p, v), p[v + 3] = 255;
    }
    function bi(t, i, u, p, v) {
      ge(t, i, u, p, v), p[v + 3] = 255;
    }
    function yr(t, i) {
      return 0 > t ? 0 : t > i ? i : t;
    }
    function ln(t, i, u) {
      z[t] = function(p, v, y, w, L, _, C, H, Q) {
        for (var tt = H + (-2 & Q) * u; H != tt; ) i(p[v + 0], y[w + 0], L[_ + 0], C, H), i(p[v + 1], y[w + 0], L[_ + 0], C, H + u), v += 2, ++w, ++_, H += 2 * u;
        1 & Q && i(p[v + 0], y[w + 0], L[_ + 0], C, H);
      };
    }
    function Gi(t, i, u) {
      return u == 0 ? t == 0 ? i == 0 ? 6 : 5 : i == 0 ? 4 : 0 : u;
    }
    function Yi(t, i, u, p, v) {
      switch (t >>> 30) {
        case 3:
          xe(i, u, p, v, 0);
          break;
        case 2:
          Ea(i, u, p, v);
          break;
        case 1:
          ar(i, u, p, v);
      }
    }
    function yi(t, i) {
      var u, p, v = i.M, y = i.Nb, w = t.oc, L = t.pc + 40, _ = t.oc, C = t.pc + 584, H = t.oc, Q = t.pc + 600;
      for (u = 0; 16 > u; ++u) w[L + 32 * u - 1] = 129;
      for (u = 0; 8 > u; ++u) _[C + 32 * u - 1] = 129, H[Q + 32 * u - 1] = 129;
      for (0 < v ? w[L - 1 - 32] = _[C - 1 - 32] = H[Q - 1 - 32] = 129 : (s(w, L - 32 - 1, 127, 21), s(_, C - 32 - 1, 127, 9), s(H, Q - 32 - 1, 127, 9)), p = 0; p < t.za; ++p) {
        var tt = i.ya[i.aa + p];
        if (0 < p) {
          for (u = -1; 16 > u; ++u) n(w, L + 32 * u - 4, w, L + 32 * u + 12, 4);
          for (u = -1; 8 > u; ++u) n(_, C + 32 * u - 4, _, C + 32 * u + 4, 4), n(H, Q + 32 * u - 4, H, Q + 32 * u + 4, 4);
        }
        var Y = t.Gd, vt = t.Hd + p, lt = tt.ad, W = tt.Hc;
        if (0 < v && (n(w, L - 32, Y[vt].y, 0, 16), n(_, C - 32, Y[vt].f, 0, 8), n(H, Q - 32, Y[vt].ea, 0, 8)), tt.Za) {
          var G = w, pt = L - 32 + 16;
          for (0 < v && (p >= t.za - 1 ? s(G, pt, Y[vt].y[15], 4) : n(G, pt, Y[vt + 1].y, 0, 4)), u = 0; 4 > u; u++) G[pt + 128 + u] = G[pt + 256 + u] = G[pt + 384 + u] = G[pt + 0 + u];
          for (u = 0; 16 > u; ++u, W <<= 2) G = w, pt = L + Ro[u], Br[tt.Ob[u]](G, pt), Yi(W, lt, 16 * +u, G, pt);
        } else if (G = Gi(p, v, tt.Ob[0]), Ln[G](w, L), W != 0) for (u = 0; 16 > u; ++u, W <<= 2) Yi(W, lt, 16 * +u, w, L + Ro[u]);
        for (u = tt.Gc, G = Gi(p, v, tt.Dd), fn[G](_, C), fn[G](H, Q), W = lt, G = _, pt = C, 255 & (tt = u >> 0) && (170 & tt ? Nr(W, 256, G, pt) : Yn(W, 256, G, pt)), tt = H, W = Q, 255 & (u >>= 8) && (170 & u ? Nr(lt, 320, tt, W) : Yn(lt, 320, tt, W)), v < t.Ub - 1 && (n(Y[vt].y, 0, w, L + 480, 16), n(Y[vt].f, 0, _, C + 224, 8), n(Y[vt].ea, 0, H, Q + 224, 8)), u = 8 * y * t.B, Y = t.sa, vt = t.ta + 16 * p + 16 * y * t.R, lt = t.qa, tt = t.ra + 8 * p + u, W = t.Ha, G = t.Ia + 8 * p + u, u = 0; 16 > u; ++u) n(Y, vt + u * t.R, w, L + 32 * u, 16);
        for (u = 0; 8 > u; ++u) n(lt, tt + u * t.B, _, C + 32 * u, 8), n(W, G + u * t.B, H, Q + 32 * u, 8);
      }
    }
    function Ji(t, i, u, p, v, y, w, L, _) {
      var C = [0], H = [0], Q = 0, tt = _ != null ? _.kd : 0, Y = _ != null ? _ : new mi();
      if (t == null || 12 > u) return 7;
      Y.data = t, Y.w = i, Y.ha = u, i = [i], u = [u], Y.gb = [Y.gb];
      t: {
        var vt = i, lt = u, W = Y.gb;
        if (e(t != null), e(lt != null), e(W != null), W[0] = 0, 12 <= lt[0] && !r(t, vt[0], "RIFF")) {
          if (r(t, vt[0] + 8, "WEBP")) {
            W = 3;
            break t;
          }
          var G = Rt(t, vt[0] + 4);
          if (12 > G || 4294967286 < G) {
            W = 3;
            break t;
          }
          if (tt && G > lt[0] - 8) {
            W = 7;
            break t;
          }
          W[0] = G, vt[0] += 12, lt[0] -= 12;
        }
        W = 0;
      }
      if (W != 0) return W;
      for (G = 0 < Y.gb[0], u = u[0]; ; ) {
        t: {
          var pt = t;
          lt = i, W = u;
          var wt = C, gt = H, Bt = vt = [0];
          if ((It = Q = [Q])[0] = 0, 8 > W[0]) W = 7;
          else {
            if (!r(pt, lt[0], "VP8X")) {
              if (Rt(pt, lt[0] + 4) != 10) {
                W = 3;
                break t;
              }
              if (18 > W[0]) {
                W = 7;
                break t;
              }
              var Pt = Rt(pt, lt[0] + 8), Ut = 1 + Ft(pt, lt[0] + 12);
              if (2147483648 <= Ut * (pt = 1 + Ft(pt, lt[0] + 15))) {
                W = 3;
                break t;
              }
              Bt != null && (Bt[0] = Pt), wt != null && (wt[0] = Ut), gt != null && (gt[0] = pt), lt[0] += 18, W[0] -= 18, It[0] = 1;
            }
            W = 0;
          }
        }
        if (Q = Q[0], vt = vt[0], W != 0) return W;
        if (lt = !!(2 & vt), !G && Q) return 3;
        if (y != null && (y[0] = !!(16 & vt)), w != null && (w[0] = lt), L != null && (L[0] = 0), w = C[0], vt = H[0], Q && lt && _ == null) {
          W = 0;
          break;
        }
        if (4 > u) {
          W = 7;
          break;
        }
        if (G && Q || !G && !Q && !r(t, i[0], "ALPH")) {
          u = [u], Y.na = [Y.na], Y.P = [Y.P], Y.Sa = [Y.Sa];
          t: {
            Pt = t, W = i, G = u;
            var It = Y.gb;
            wt = Y.na, gt = Y.P, Bt = Y.Sa, Ut = 22, e(Pt != null), e(G != null), pt = W[0];
            var oe = G[0];
            for (e(wt != null), e(Bt != null), wt[0] = null, gt[0] = null, Bt[0] = 0; ; ) {
              if (W[0] = pt, G[0] = oe, 8 > oe) {
                W = 7;
                break t;
              }
              var ce = Rt(Pt, pt + 4);
              if (4294967286 < ce) {
                W = 3;
                break t;
              }
              var se = 8 + ce + 1 & -2;
              if (Ut += se, 0 < It && Ut > It) {
                W = 3;
                break t;
              }
              if (!r(Pt, pt, "VP8 ") || !r(Pt, pt, "VP8L")) {
                W = 0;
                break t;
              }
              if (oe[0] < se) {
                W = 7;
                break t;
              }
              r(Pt, pt, "ALPH") || (wt[0] = Pt, gt[0] = pt + 8, Bt[0] = ce), pt += se, oe -= se;
            }
          }
          if (u = u[0], Y.na = Y.na[0], Y.P = Y.P[0], Y.Sa = Y.Sa[0], W != 0) break;
        }
        u = [u], Y.Ja = [Y.Ja], Y.xa = [Y.xa];
        t: if (It = t, W = i, G = u, wt = Y.gb[0], gt = Y.Ja, Bt = Y.xa, Pt = W[0], pt = !r(It, Pt, "VP8 "), Ut = !r(It, Pt, "VP8L"), e(It != null), e(G != null), e(gt != null), e(Bt != null), 8 > G[0]) W = 7;
        else {
          if (pt || Ut) {
            if (It = Rt(It, Pt + 4), 12 <= wt && It > wt - 12) {
              W = 3;
              break t;
            }
            if (tt && It > G[0] - 8) {
              W = 7;
              break t;
            }
            gt[0] = It, W[0] += 8, G[0] -= 8, Bt[0] = Ut;
          } else Bt[0] = 5 <= G[0] && It[Pt + 0] == 47 && !(It[Pt + 4] >> 5), gt[0] = G[0];
          W = 0;
        }
        if (u = u[0], Y.Ja = Y.Ja[0], Y.xa = Y.xa[0], i = i[0], W != 0) break;
        if (4294967286 < Y.Ja) return 3;
        if (L == null || lt || (L[0] = Y.xa ? 2 : 1), w = [w], vt = [vt], Y.xa) {
          if (5 > u) {
            W = 7;
            break;
          }
          L = w, tt = vt, lt = y, t == null || 5 > u ? t = 0 : 5 <= u && t[i + 0] == 47 && !(t[i + 4] >> 5) ? (G = [0], It = [0], wt = [0], Nt(gt = new x(), t, i, u), an(gt, G, It, wt) ? (L != null && (L[0] = G[0]), tt != null && (tt[0] = It[0]), lt != null && (lt[0] = wt[0]), t = 1) : t = 0) : t = 0;
        } else {
          if (10 > u) {
            W = 7;
            break;
          }
          L = vt, t == null || 10 > u || !ya(t, i + 3, u - 3) ? t = 0 : (tt = t[i + 0] | t[i + 1] << 8 | t[i + 2] << 16, lt = 16383 & (t[i + 7] << 8 | t[i + 6]), t = 16383 & (t[i + 9] << 8 | t[i + 8]), 1 & tt || 3 < (tt >> 1 & 7) || !(tt >> 4 & 1) || tt >> 5 >= Y.Ja || !lt || !t ? t = 0 : (w && (w[0] = lt), L && (L[0] = t), t = 1));
        }
        if (!t || (w = w[0], vt = vt[0], Q && (C[0] != w || H[0] != vt))) return 3;
        _ != null && (_[0] = Y, _.offset = i - _.w, e(4294967286 > i - _.w), e(_.offset == _.ha - u));
        break;
      }
      return W == 0 || W == 7 && Q && _ == null ? (y != null && (y[0] |= Y.na != null && 0 < Y.na.length), p != null && (p[0] = w), v != null && (v[0] = vt), 0) : W;
    }
    function Xi(t, i, u) {
      var p = i.width, v = i.height, y = 0, w = 0, L = p, _ = v;
      if (i.Da = t != null && 0 < t.Da, i.Da && (L = t.cd, _ = t.bd, y = t.v, w = t.j, 11 > u || (y &= -2, w &= -2), 0 > y || 0 > w || 0 >= L || 0 >= _ || y + L > p || w + _ > v)) return 0;
      if (i.v = y, i.j = w, i.va = y + L, i.o = w + _, i.U = L, i.T = _, i.da = t != null && 0 < t.da, i.da) {
        if (!kt(L, _, u = [t.ib], y = [t.hb])) return 0;
        i.ib = u[0], i.hb = y[0];
      }
      return i.ob = t != null && t.ob, i.Kb = t == null || !t.Sd, i.da && (i.ob = i.ib < 3 * p / 4 && i.hb < 3 * v / 4, i.Kb = 0), 1;
    }
    function wi(t) {
      if (t == null) return 2;
      if (11 > t.S) {
        var i = t.f.RGBA;
        i.fb += (t.height - 1) * i.A, i.A = -i.A;
      } else i = t.f.kb, t = t.height, i.O += (t - 1) * i.fa, i.fa = -i.fa, i.N += (t - 1 >> 1) * i.Ab, i.Ab = -i.Ab, i.W += (t - 1 >> 1) * i.Db, i.Db = -i.Db, i.F != null && (i.J += (t - 1) * i.lb, i.lb = -i.lb);
      return 0;
    }
    function Xe(t, i, u, p) {
      if (p == null || 0 >= t || 0 >= i) return 2;
      if (u != null) {
        if (u.Da) {
          var v = u.cd, y = u.bd, w = -2 & u.v, L = -2 & u.j;
          if (0 > w || 0 > L || 0 >= v || 0 >= y || w + v > t || L + y > i) return 2;
          t = v, i = y;
        }
        if (u.da) {
          if (!kt(t, i, v = [u.ib], y = [u.hb])) return 2;
          t = v[0], i = y[0];
        }
      }
      p.width = t, p.height = i;
      t: {
        var _ = p.width, C = p.height;
        if (t = p.S, 0 >= _ || 0 >= C || !(t >= za && 13 > t)) t = 2;
        else {
          if (0 >= p.Rd && p.sd == null) {
            w = y = v = i = 0;
            var H = (L = _ * zo[t]) * C;
            if (11 > t || (y = (C + 1) / 2 * (i = (_ + 1) / 2), t == 12 && (w = (v = _) * C)), (C = a(H + 2 * y + w)) == null) {
              t = 1;
              break t;
            }
            p.sd = C, 11 > t ? ((_ = p.f.RGBA).eb = C, _.fb = 0, _.A = L, _.size = H) : ((_ = p.f.kb).y = C, _.O = 0, _.fa = L, _.Fd = H, _.f = C, _.N = 0 + H, _.Ab = i, _.Cd = y, _.ea = C, _.W = 0 + H + y, _.Db = i, _.Ed = y, t == 12 && (_.F = C, _.J = 0 + H + 2 * y), _.Tc = w, _.lb = v);
          }
          if (i = 1, v = p.S, y = p.width, w = p.height, v >= za && 13 > v)
            if (11 > v) t = p.f.RGBA, i &= (L = Math.abs(t.A)) * (w - 1) + y <= t.size, i &= L >= y * zo[v], i &= t.eb != null;
            else {
              t = p.f.kb, L = (y + 1) / 2, H = (w + 1) / 2, _ = Math.abs(t.fa), C = Math.abs(t.Ab);
              var Q = Math.abs(t.Db), tt = Math.abs(t.lb), Y = tt * (w - 1) + y;
              i &= _ * (w - 1) + y <= t.Fd, i &= C * (H - 1) + L <= t.Cd, i = (i &= Q * (H - 1) + L <= t.Ed) & _ >= y & C >= L & Q >= L, i &= t.y != null, i &= t.f != null, i &= t.ea != null, v == 12 && (i &= tt >= y, i &= Y <= t.Tc, i &= t.F != null);
            }
          else i = 0;
          t = i ? 0 : 2;
        }
      }
      return t != 0 || u != null && u.fd && (t = wi(p)), t;
    }
    var bn = 64, Ni = [0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535, 131071, 262143, 524287, 1048575, 2097151, 4194303, 8388607, 16777215], Ba = 24, Li = 32, nr = 8, Rs = [0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7];
    _t("Predictor0", "PredictorAdd0"), z.Predictor0 = function() {
      return 4278190080;
    }, z.Predictor1 = function(t) {
      return t;
    }, z.Predictor2 = function(t, i, u) {
      return i[u + 0];
    }, z.Predictor3 = function(t, i, u) {
      return i[u + 1];
    }, z.Predictor4 = function(t, i, u) {
      return i[u - 1];
    }, z.Predictor5 = function(t, i, u) {
      return qt(qt(t, i[u + 1]), i[u + 0]);
    }, z.Predictor6 = function(t, i, u) {
      return qt(t, i[u - 1]);
    }, z.Predictor7 = function(t, i, u) {
      return qt(t, i[u + 0]);
    }, z.Predictor8 = function(t, i, u) {
      return qt(i[u - 1], i[u + 0]);
    }, z.Predictor9 = function(t, i, u) {
      return qt(i[u + 0], i[u + 1]);
    }, z.Predictor10 = function(t, i, u) {
      return qt(qt(t, i[u - 1]), qt(i[u + 0], i[u + 1]));
    }, z.Predictor11 = function(t, i, u) {
      var p = i[u + 0];
      return 0 >= Ht(p >> 24 & 255, t >> 24 & 255, (i = i[u - 1]) >> 24 & 255) + Ht(p >> 16 & 255, t >> 16 & 255, i >> 16 & 255) + Ht(p >> 8 & 255, t >> 8 & 255, i >> 8 & 255) + Ht(255 & p, 255 & t, 255 & i) ? p : t;
    }, z.Predictor12 = function(t, i, u) {
      var p = i[u + 0];
      return (zt((t >> 24 & 255) + (p >> 24 & 255) - ((i = i[u - 1]) >> 24 & 255)) << 24 | zt((t >> 16 & 255) + (p >> 16 & 255) - (i >> 16 & 255)) << 16 | zt((t >> 8 & 255) + (p >> 8 & 255) - (i >> 8 & 255)) << 8 | zt((255 & t) + (255 & p) - (255 & i))) >>> 0;
    }, z.Predictor13 = function(t, i, u) {
      var p = i[u - 1];
      return (ne((t = qt(t, i[u + 0])) >> 24 & 255, p >> 24 & 255) << 24 | ne(t >> 16 & 255, p >> 16 & 255) << 16 | ne(t >> 8 & 255, p >> 8 & 255) << 8 | ne(t >> 0 & 255, p >> 0 & 255)) >>> 0;
    };
    var Ki = z.PredictorAdd0;
    z.PredictorAdd1 = ie, _t("Predictor2", "PredictorAdd2"), _t("Predictor3", "PredictorAdd3"), _t("Predictor4", "PredictorAdd4"), _t("Predictor5", "PredictorAdd5"), _t("Predictor6", "PredictorAdd6"), _t("Predictor7", "PredictorAdd7"), _t("Predictor8", "PredictorAdd8"), _t("Predictor9", "PredictorAdd9"), _t("Predictor10", "PredictorAdd10"), _t("Predictor11", "PredictorAdd11"), _t("Predictor12", "PredictorAdd12"), _t("Predictor13", "PredictorAdd13");
    var zs = z.PredictorAdd2;
    Ct("ColorIndexInverseTransform", "MapARGB", "32b", function(t) {
      return t >> 8 & 255;
    }, function(t) {
      return t;
    }), Ct("VP8LColorIndexInverseTransformAlpha", "MapAlpha", "8b", function(t) {
      return t;
    }, function(t) {
      return t >> 8 & 255;
    });
    var wr, Wn = z.ColorIndexInverseTransform, Ma = z.MapARGB, qa = z.VP8LColorIndexInverseTransformAlpha, Vn = z.MapAlpha, Ai = z.VP8LPredictorsAdd = [];
    Ai.length = 16, (z.VP8LPredictors = []).length = 16, (z.VP8LPredictorsAdd_C = []).length = 16, (z.VP8LPredictors_C = []).length = 16;
    var ir, or, yn, Zr, cn, xi, Gn, xe, Ea, Nr, ar, Yn, Da, Zi, Jn, Xn, wn, Kn, Si, Zn, Nn, $i, Lr, hn, we, de, Ve, Se, hr = a(511), Qi = a(2041), _i = a(225), Ta = a(767), Fo = 0, Us = Qi, Ra = _i, fr = Ta, Ar = hr, za = 0, Ua = 1, Io = 2, Ha = 3, Wa = 4, Hs = 5, Co = 6, Ws = 7, Vs = 8, Va = 9, Gs = 10, Wu = [2, 3, 7], Vu = [3, 3, 11], jo = [280, 256, 256, 256, 40], Gu = [0, 1, 1, 1, 0], Yu = [17, 18, 0, 1, 2, 3, 4, 5, 16, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], Ju = [24, 7, 23, 25, 40, 6, 39, 41, 22, 26, 38, 42, 56, 5, 55, 57, 21, 27, 54, 58, 37, 43, 72, 4, 71, 73, 20, 28, 53, 59, 70, 74, 36, 44, 88, 69, 75, 52, 60, 3, 87, 89, 19, 29, 86, 90, 35, 45, 68, 76, 85, 91, 51, 61, 104, 2, 103, 105, 18, 30, 102, 106, 34, 46, 84, 92, 67, 77, 101, 107, 50, 62, 120, 1, 119, 121, 83, 93, 17, 31, 100, 108, 66, 78, 118, 122, 33, 47, 117, 123, 49, 63, 99, 109, 82, 94, 0, 116, 124, 65, 79, 16, 32, 98, 110, 48, 115, 125, 81, 95, 64, 114, 126, 97, 111, 80, 113, 127, 96, 112], Xu = [2954, 2956, 2958, 2962, 2970, 2986, 3018, 3082, 3212, 3468, 3980, 5004], Ku = 8, Ys = [4, 5, 6, 7, 8, 9, 10, 10, 11, 12, 13, 14, 15, 16, 17, 17, 18, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 25, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 93, 95, 96, 98, 100, 101, 102, 104, 106, 108, 110, 112, 114, 116, 118, 122, 124, 126, 128, 130, 132, 134, 136, 138, 140, 143, 145, 148, 151, 154, 157], Js = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108, 110, 112, 114, 116, 119, 122, 125, 128, 131, 134, 137, 140, 143, 146, 149, 152, 155, 158, 161, 164, 167, 170, 173, 177, 181, 185, 189, 193, 197, 201, 205, 209, 213, 217, 221, 225, 229, 234, 239, 245, 249, 254, 259, 264, 269, 274, 279, 284], ta = null, Zu = [[173, 148, 140, 0], [176, 155, 140, 135, 0], [180, 157, 141, 134, 130, 0], [254, 254, 243, 230, 196, 177, 153, 140, 133, 130, 129, 0]], $u = [0, 1, 4, 8, 5, 2, 3, 6, 9, 12, 13, 10, 7, 11, 14, 15], Oo = [-0, 1, -1, 2, -2, 3, 4, 6, -3, 5, -4, -5, -6, 7, -7, 8, -8, -9], Qu = [[[[128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128], [128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128], [128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128]], [[253, 136, 254, 255, 228, 219, 128, 128, 128, 128, 128], [189, 129, 242, 255, 227, 213, 255, 219, 128, 128, 128], [106, 126, 227, 252, 214, 209, 255, 255, 128, 128, 128]], [[1, 98, 248, 255, 236, 226, 255, 255, 128, 128, 128], [181, 133, 238, 254, 221, 234, 255, 154, 128, 128, 128], [78, 134, 202, 247, 198, 180, 255, 219, 128, 128, 128]], [[1, 185, 249, 255, 243, 255, 128, 128, 128, 128, 128], [184, 150, 247, 255, 236, 224, 128, 128, 128, 128, 128], [77, 110, 216, 255, 236, 230, 128, 128, 128, 128, 128]], [[1, 101, 251, 255, 241, 255, 128, 128, 128, 128, 128], [170, 139, 241, 252, 236, 209, 255, 255, 128, 128, 128], [37, 116, 196, 243, 228, 255, 255, 255, 128, 128, 128]], [[1, 204, 254, 255, 245, 255, 128, 128, 128, 128, 128], [207, 160, 250, 255, 238, 128, 128, 128, 128, 128, 128], [102, 103, 231, 255, 211, 171, 128, 128, 128, 128, 128]], [[1, 152, 252, 255, 240, 255, 128, 128, 128, 128, 128], [177, 135, 243, 255, 234, 225, 128, 128, 128, 128, 128], [80, 129, 211, 255, 194, 224, 128, 128, 128, 128, 128]], [[1, 1, 255, 128, 128, 128, 128, 128, 128, 128, 128], [246, 1, 255, 128, 128, 128, 128, 128, 128, 128, 128], [255, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128]]], [[[198, 35, 237, 223, 193, 187, 162, 160, 145, 155, 62], [131, 45, 198, 221, 172, 176, 220, 157, 252, 221, 1], [68, 47, 146, 208, 149, 167, 221, 162, 255, 223, 128]], [[1, 149, 241, 255, 221, 224, 255, 255, 128, 128, 128], [184, 141, 234, 253, 222, 220, 255, 199, 128, 128, 128], [81, 99, 181, 242, 176, 190, 249, 202, 255, 255, 128]], [[1, 129, 232, 253, 214, 197, 242, 196, 255, 255, 128], [99, 121, 210, 250, 201, 198, 255, 202, 128, 128, 128], [23, 91, 163, 242, 170, 187, 247, 210, 255, 255, 128]], [[1, 200, 246, 255, 234, 255, 128, 128, 128, 128, 128], [109, 178, 241, 255, 231, 245, 255, 255, 128, 128, 128], [44, 130, 201, 253, 205, 192, 255, 255, 128, 128, 128]], [[1, 132, 239, 251, 219, 209, 255, 165, 128, 128, 128], [94, 136, 225, 251, 218, 190, 255, 255, 128, 128, 128], [22, 100, 174, 245, 186, 161, 255, 199, 128, 128, 128]], [[1, 182, 249, 255, 232, 235, 128, 128, 128, 128, 128], [124, 143, 241, 255, 227, 234, 128, 128, 128, 128, 128], [35, 77, 181, 251, 193, 211, 255, 205, 128, 128, 128]], [[1, 157, 247, 255, 236, 231, 255, 255, 128, 128, 128], [121, 141, 235, 255, 225, 227, 255, 255, 128, 128, 128], [45, 99, 188, 251, 195, 217, 255, 224, 128, 128, 128]], [[1, 1, 251, 255, 213, 255, 128, 128, 128, 128, 128], [203, 1, 248, 255, 255, 128, 128, 128, 128, 128, 128], [137, 1, 177, 255, 224, 255, 128, 128, 128, 128, 128]]], [[[253, 9, 248, 251, 207, 208, 255, 192, 128, 128, 128], [175, 13, 224, 243, 193, 185, 249, 198, 255, 255, 128], [73, 17, 171, 221, 161, 179, 236, 167, 255, 234, 128]], [[1, 95, 247, 253, 212, 183, 255, 255, 128, 128, 128], [239, 90, 244, 250, 211, 209, 255, 255, 128, 128, 128], [155, 77, 195, 248, 188, 195, 255, 255, 128, 128, 128]], [[1, 24, 239, 251, 218, 219, 255, 205, 128, 128, 128], [201, 51, 219, 255, 196, 186, 128, 128, 128, 128, 128], [69, 46, 190, 239, 201, 218, 255, 228, 128, 128, 128]], [[1, 191, 251, 255, 255, 128, 128, 128, 128, 128, 128], [223, 165, 249, 255, 213, 255, 128, 128, 128, 128, 128], [141, 124, 248, 255, 255, 128, 128, 128, 128, 128, 128]], [[1, 16, 248, 255, 255, 128, 128, 128, 128, 128, 128], [190, 36, 230, 255, 236, 255, 128, 128, 128, 128, 128], [149, 1, 255, 128, 128, 128, 128, 128, 128, 128, 128]], [[1, 226, 255, 128, 128, 128, 128, 128, 128, 128, 128], [247, 192, 255, 128, 128, 128, 128, 128, 128, 128, 128], [240, 128, 255, 128, 128, 128, 128, 128, 128, 128, 128]], [[1, 134, 252, 255, 255, 128, 128, 128, 128, 128, 128], [213, 62, 250, 255, 255, 128, 128, 128, 128, 128, 128], [55, 93, 255, 128, 128, 128, 128, 128, 128, 128, 128]], [[128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128], [128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128], [128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128]]], [[[202, 24, 213, 235, 186, 191, 220, 160, 240, 175, 255], [126, 38, 182, 232, 169, 184, 228, 174, 255, 187, 128], [61, 46, 138, 219, 151, 178, 240, 170, 255, 216, 128]], [[1, 112, 230, 250, 199, 191, 247, 159, 255, 255, 128], [166, 109, 228, 252, 211, 215, 255, 174, 128, 128, 128], [39, 77, 162, 232, 172, 180, 245, 178, 255, 255, 128]], [[1, 52, 220, 246, 198, 199, 249, 220, 255, 255, 128], [124, 74, 191, 243, 183, 193, 250, 221, 255, 255, 128], [24, 71, 130, 219, 154, 170, 243, 182, 255, 255, 128]], [[1, 182, 225, 249, 219, 240, 255, 224, 128, 128, 128], [149, 150, 226, 252, 216, 205, 255, 171, 128, 128, 128], [28, 108, 170, 242, 183, 194, 254, 223, 255, 255, 128]], [[1, 81, 230, 252, 204, 203, 255, 192, 128, 128, 128], [123, 102, 209, 247, 188, 196, 255, 233, 128, 128, 128], [20, 95, 153, 243, 164, 173, 255, 203, 128, 128, 128]], [[1, 222, 248, 255, 216, 213, 128, 128, 128, 128, 128], [168, 175, 246, 252, 235, 205, 255, 255, 128, 128, 128], [47, 116, 215, 255, 211, 212, 255, 255, 128, 128, 128]], [[1, 121, 236, 253, 212, 214, 255, 255, 128, 128, 128], [141, 84, 213, 252, 201, 202, 255, 219, 128, 128, 128], [42, 80, 160, 240, 162, 185, 255, 205, 128, 128, 128]], [[1, 1, 255, 128, 128, 128, 128, 128, 128, 128, 128], [244, 1, 255, 128, 128, 128, 128, 128, 128, 128, 128], [238, 1, 255, 128, 128, 128, 128, 128, 128, 128, 128]]]], tl = [[[231, 120, 48, 89, 115, 113, 120, 152, 112], [152, 179, 64, 126, 170, 118, 46, 70, 95], [175, 69, 143, 80, 85, 82, 72, 155, 103], [56, 58, 10, 171, 218, 189, 17, 13, 152], [114, 26, 17, 163, 44, 195, 21, 10, 173], [121, 24, 80, 195, 26, 62, 44, 64, 85], [144, 71, 10, 38, 171, 213, 144, 34, 26], [170, 46, 55, 19, 136, 160, 33, 206, 71], [63, 20, 8, 114, 114, 208, 12, 9, 226], [81, 40, 11, 96, 182, 84, 29, 16, 36]], [[134, 183, 89, 137, 98, 101, 106, 165, 148], [72, 187, 100, 130, 157, 111, 32, 75, 80], [66, 102, 167, 99, 74, 62, 40, 234, 128], [41, 53, 9, 178, 241, 141, 26, 8, 107], [74, 43, 26, 146, 73, 166, 49, 23, 157], [65, 38, 105, 160, 51, 52, 31, 115, 128], [104, 79, 12, 27, 217, 255, 87, 17, 7], [87, 68, 71, 44, 114, 51, 15, 186, 23], [47, 41, 14, 110, 182, 183, 21, 17, 194], [66, 45, 25, 102, 197, 189, 23, 18, 22]], [[88, 88, 147, 150, 42, 46, 45, 196, 205], [43, 97, 183, 117, 85, 38, 35, 179, 61], [39, 53, 200, 87, 26, 21, 43, 232, 171], [56, 34, 51, 104, 114, 102, 29, 93, 77], [39, 28, 85, 171, 58, 165, 90, 98, 64], [34, 22, 116, 206, 23, 34, 43, 166, 73], [107, 54, 32, 26, 51, 1, 81, 43, 31], [68, 25, 106, 22, 64, 171, 36, 225, 114], [34, 19, 21, 102, 132, 188, 16, 76, 124], [62, 18, 78, 95, 85, 57, 50, 48, 51]], [[193, 101, 35, 159, 215, 111, 89, 46, 111], [60, 148, 31, 172, 219, 228, 21, 18, 111], [112, 113, 77, 85, 179, 255, 38, 120, 114], [40, 42, 1, 196, 245, 209, 10, 25, 109], [88, 43, 29, 140, 166, 213, 37, 43, 154], [61, 63, 30, 155, 67, 45, 68, 1, 209], [100, 80, 8, 43, 154, 1, 51, 26, 71], [142, 78, 78, 16, 255, 128, 34, 197, 171], [41, 40, 5, 102, 211, 183, 4, 1, 221], [51, 50, 17, 168, 209, 192, 23, 25, 82]], [[138, 31, 36, 171, 27, 166, 38, 44, 229], [67, 87, 58, 169, 82, 115, 26, 59, 179], [63, 59, 90, 180, 59, 166, 93, 73, 154], [40, 40, 21, 116, 143, 209, 34, 39, 175], [47, 15, 16, 183, 34, 223, 49, 45, 183], [46, 17, 33, 183, 6, 98, 15, 32, 183], [57, 46, 22, 24, 128, 1, 54, 17, 37], [65, 32, 73, 115, 28, 128, 23, 128, 205], [40, 3, 9, 115, 51, 192, 18, 6, 223], [87, 37, 9, 115, 59, 77, 64, 21, 47]], [[104, 55, 44, 218, 9, 54, 53, 130, 226], [64, 90, 70, 205, 40, 41, 23, 26, 57], [54, 57, 112, 184, 5, 41, 38, 166, 213], [30, 34, 26, 133, 152, 116, 10, 32, 134], [39, 19, 53, 221, 26, 114, 32, 73, 255], [31, 9, 65, 234, 2, 15, 1, 118, 73], [75, 32, 12, 51, 192, 255, 160, 43, 51], [88, 31, 35, 67, 102, 85, 55, 186, 85], [56, 21, 23, 111, 59, 205, 45, 37, 192], [55, 38, 70, 124, 73, 102, 1, 34, 98]], [[125, 98, 42, 88, 104, 85, 117, 175, 82], [95, 84, 53, 89, 128, 100, 113, 101, 45], [75, 79, 123, 47, 51, 128, 81, 171, 1], [57, 17, 5, 71, 102, 57, 53, 41, 49], [38, 33, 13, 121, 57, 73, 26, 1, 85], [41, 10, 67, 138, 77, 110, 90, 47, 114], [115, 21, 2, 10, 102, 255, 166, 23, 6], [101, 29, 16, 10, 85, 128, 101, 196, 26], [57, 18, 10, 102, 102, 213, 34, 20, 43], [117, 20, 15, 36, 163, 128, 68, 1, 26]], [[102, 61, 71, 37, 34, 53, 31, 243, 192], [69, 60, 71, 38, 73, 119, 28, 222, 37], [68, 45, 128, 34, 1, 47, 11, 245, 171], [62, 17, 19, 70, 146, 85, 55, 62, 70], [37, 43, 37, 154, 100, 163, 85, 160, 1], [63, 9, 92, 136, 28, 64, 32, 201, 85], [75, 15, 9, 9, 64, 255, 184, 119, 16], [86, 6, 28, 5, 64, 255, 25, 248, 1], [56, 8, 17, 132, 137, 255, 55, 116, 128], [58, 15, 20, 82, 135, 57, 26, 121, 40]], [[164, 50, 31, 137, 154, 133, 25, 35, 218], [51, 103, 44, 131, 131, 123, 31, 6, 158], [86, 40, 64, 135, 148, 224, 45, 183, 128], [22, 26, 17, 131, 240, 154, 14, 1, 209], [45, 16, 21, 91, 64, 222, 7, 1, 197], [56, 21, 39, 155, 60, 138, 23, 102, 213], [83, 12, 13, 54, 192, 255, 68, 47, 28], [85, 26, 85, 85, 128, 128, 32, 146, 171], [18, 11, 7, 63, 144, 171, 4, 4, 246], [35, 27, 10, 146, 174, 171, 12, 26, 128]], [[190, 80, 35, 99, 180, 80, 126, 54, 45], [85, 126, 47, 87, 176, 51, 41, 20, 32], [101, 75, 128, 139, 118, 146, 116, 128, 85], [56, 41, 15, 176, 236, 85, 37, 9, 62], [71, 30, 17, 119, 118, 255, 17, 18, 138], [101, 38, 60, 138, 55, 70, 43, 26, 142], [146, 36, 19, 30, 171, 255, 97, 27, 20], [138, 45, 61, 62, 219, 1, 81, 188, 64], [32, 41, 20, 117, 151, 142, 20, 21, 163], [112, 19, 12, 61, 195, 128, 48, 4, 24]]], el = [[[[255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[176, 246, 255, 255, 255, 255, 255, 255, 255, 255, 255], [223, 241, 252, 255, 255, 255, 255, 255, 255, 255, 255], [249, 253, 253, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 244, 252, 255, 255, 255, 255, 255, 255, 255, 255], [234, 254, 254, 255, 255, 255, 255, 255, 255, 255, 255], [253, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 246, 254, 255, 255, 255, 255, 255, 255, 255, 255], [239, 253, 254, 255, 255, 255, 255, 255, 255, 255, 255], [254, 255, 254, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 248, 254, 255, 255, 255, 255, 255, 255, 255, 255], [251, 255, 254, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 253, 254, 255, 255, 255, 255, 255, 255, 255, 255], [251, 254, 254, 255, 255, 255, 255, 255, 255, 255, 255], [254, 255, 254, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 254, 253, 255, 254, 255, 255, 255, 255, 255, 255], [250, 255, 254, 255, 254, 255, 255, 255, 255, 255, 255], [254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]]], [[[217, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [225, 252, 241, 253, 255, 255, 254, 255, 255, 255, 255], [234, 250, 241, 250, 253, 255, 253, 254, 255, 255, 255]], [[255, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255], [223, 254, 254, 255, 255, 255, 255, 255, 255, 255, 255], [238, 253, 254, 254, 255, 255, 255, 255, 255, 255, 255]], [[255, 248, 254, 255, 255, 255, 255, 255, 255, 255, 255], [249, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 253, 255, 255, 255, 255, 255, 255, 255, 255, 255], [247, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 253, 254, 255, 255, 255, 255, 255, 255, 255, 255], [252, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 254, 254, 255, 255, 255, 255, 255, 255, 255, 255], [253, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 254, 253, 255, 255, 255, 255, 255, 255, 255, 255], [250, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]]], [[[186, 251, 250, 255, 255, 255, 255, 255, 255, 255, 255], [234, 251, 244, 254, 255, 255, 255, 255, 255, 255, 255], [251, 251, 243, 253, 254, 255, 254, 255, 255, 255, 255]], [[255, 253, 254, 255, 255, 255, 255, 255, 255, 255, 255], [236, 253, 254, 255, 255, 255, 255, 255, 255, 255, 255], [251, 253, 253, 254, 254, 255, 255, 255, 255, 255, 255]], [[255, 254, 254, 255, 255, 255, 255, 255, 255, 255, 255], [254, 254, 254, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255], [254, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255], [254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]]], [[[248, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [250, 254, 252, 254, 255, 255, 255, 255, 255, 255, 255], [248, 254, 249, 253, 255, 255, 255, 255, 255, 255, 255]], [[255, 253, 253, 255, 255, 255, 255, 255, 255, 255, 255], [246, 253, 253, 255, 255, 255, 255, 255, 255, 255, 255], [252, 254, 251, 254, 254, 255, 255, 255, 255, 255, 255]], [[255, 254, 252, 255, 255, 255, 255, 255, 255, 255, 255], [248, 254, 253, 255, 255, 255, 255, 255, 255, 255, 255], [253, 255, 254, 254, 255, 255, 255, 255, 255, 255, 255]], [[255, 251, 254, 255, 255, 255, 255, 255, 255, 255, 255], [245, 251, 254, 255, 255, 255, 255, 255, 255, 255, 255], [253, 253, 254, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 251, 253, 255, 255, 255, 255, 255, 255, 255, 255], [252, 253, 254, 255, 255, 255, 255, 255, 255, 255, 255], [255, 254, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 252, 255, 255, 255, 255, 255, 255, 255, 255, 255], [249, 255, 254, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 254, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 255, 253, 255, 255, 255, 255, 255, 255, 255, 255], [250, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]], [[255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [254, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255], [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]]]], rl = [0, 1, 2, 3, 6, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 7, 0], Ln = [], Br = [], fn = [], nl = 1, Bo = 2, An = [], xr = [];
    yt("UpsampleRgbLinePair", ge, 3), yt("UpsampleBgrLinePair", Ae, 3), yt("UpsampleRgbaLinePair", bi, 4), yt("UpsampleBgraLinePair", Or, 4), yt("UpsampleArgbLinePair", qe, 4), yt("UpsampleRgba4444LinePair", rr, 2), yt("UpsampleRgb565LinePair", Le, 2);
    var il = z.UpsampleRgbLinePair, al = z.UpsampleBgrLinePair, Mo = z.UpsampleRgbaLinePair, qo = z.UpsampleBgraLinePair, Eo = z.UpsampleArgbLinePair, Do = z.UpsampleRgba4444LinePair, sl = z.UpsampleRgb565LinePair, Ga = 16, Ya = 1 << Ga - 1, ea = -227, Xs = 482, ol = 6, To = 0, ul = a(256), ll = a(256), cl = a(256), hl = a(256), fl = a(Xs - ea), dl = a(Xs - ea);
    ln("YuvToRgbRow", ge, 3), ln("YuvToBgrRow", Ae, 3), ln("YuvToRgbaRow", bi, 4), ln("YuvToBgraRow", Or, 4), ln("YuvToArgbRow", qe, 4), ln("YuvToRgba4444Row", rr, 2), ln("YuvToRgb565Row", Le, 2);
    var Ro = [0, 4, 8, 12, 128, 132, 136, 140, 256, 260, 264, 268, 384, 388, 392, 396], Ja = [0, 2, 8], pl = [8, 7, 6, 4, 4, 2, 2, 2, 1, 1, 1, 1], gl = 1;
    this.WebPDecodeRGBA = function(t, i, u, p, v) {
      var y = Ua, w = new ja(), L = new _r();
      w.ba = L, L.S = y, L.width = [L.width], L.height = [L.height];
      var _ = L.width, C = L.height, H = new Pe();
      if (H == null || t == null) var Q = 2;
      else e(H != null), Q = Ji(t, i, u, H.width, H.height, H.Pd, H.Qd, H.format, null);
      if (Q != 0 ? _ = 0 : (_ != null && (_[0] = H.width[0]), C != null && (C[0] = H.height[0]), _ = 1), _) {
        L.width = L.width[0], L.height = L.height[0], p != null && (p[0] = L.width), v != null && (v[0] = L.height);
        t: {
          if (p = new ci(), (v = new mi()).data = t, v.w = i, v.ha = u, v.kd = 1, i = [0], e(v != null), ((t = Ji(v.data, v.w, v.ha, null, null, null, i, null, v)) == 0 || t == 7) && i[0] && (t = 4), (i = t) == 0) {
            if (e(w != null), p.data = v.data, p.w = v.w + v.offset, p.ha = v.ha - v.offset, p.put = Wr, p.ac = Hr, p.bc = Gt, p.ma = w, v.xa) {
              if ((t = Dn()) == null) {
                w = 1;
                break t;
              }
              if (function(tt, Y) {
                var vt = [0], lt = [0], W = [0];
                e: for (; ; ) {
                  if (tt == null) return 0;
                  if (Y == null) return tt.a = 2, 0;
                  if (tt.l = Y, tt.a = 0, Nt(tt.m, Y.data, Y.w, Y.ha), !an(tt.m, vt, lt, W)) {
                    tt.a = 3;
                    break e;
                  }
                  if (tt.xb = Bo, Y.width = vt[0], Y.height = lt[0], !Gr(vt[0], lt[0], 1, tt, null)) break e;
                  return 1;
                }
                return e(tt.a != 0), 0;
              }(t, p)) {
                if (p = (i = Xe(p.width, p.height, w.Oa, w.ba)) == 0) {
                  e: {
                    p = t;
                    r: for (; ; ) {
                      if (p == null) {
                        p = 0;
                        break e;
                      }
                      if (e(p.s.yc != null), e(p.s.Ya != null), e(0 < p.s.Wb), e((u = p.l) != null), e((v = u.ma) != null), p.xb != 0) {
                        if (p.ca = v.ba, p.tb = v.tb, e(p.ca != null), !Xi(v.Oa, u, Ha)) {
                          p.a = 2;
                          break r;
                        }
                        if (!Tn(p, u.width) || u.da) break r;
                        if ((u.da || Ur(p.ca.S)) && $(), 11 > p.ca.S || (alert("todo:WebPInitConvertARGBToYUV"), p.ca.f.kb.F != null && $()), p.Pb && 0 < p.s.ua && p.s.vb.X == null && !Dt(p.s.vb, p.s.Wa.Xa)) {
                          p.a = 1;
                          break r;
                        }
                        p.xb = 0;
                      }
                      if (!Fr(p, p.V, p.Ba, p.c, p.i, u.o, mn)) break r;
                      v.Dc = p.Ma, p = 1;
                      break e;
                    }
                    e(p.a != 0), p = 0;
                  }
                  p = !p;
                }
                p && (i = t.a);
              } else i = t.a;
            } else {
              if ((t = new ba()) == null) {
                w = 1;
                break t;
              }
              if (t.Fa = v.na, t.P = v.P, t.qc = v.Sa, qi(t, p)) {
                if ((i = Xe(p.width, p.height, w.Oa, w.ba)) == 0) {
                  if (t.Aa = 0, u = w.Oa, e((v = t) != null), u != null) {
                    if (0 < (_ = 0 > (_ = u.Md) ? 0 : 100 < _ ? 255 : 255 * _ / 100)) {
                      for (C = H = 0; 4 > C; ++C) 12 > (Q = v.pb[C]).lc && (Q.ia = _ * pl[0 > Q.lc ? 0 : Q.lc] >> 3), H |= Q.ia;
                      H && (alert("todo:VP8InitRandom"), v.ia = 1);
                    }
                    v.Ga = u.Id, 100 < v.Ga ? v.Ga = 100 : 0 > v.Ga && (v.Ga = 0);
                  }
                  ys(t, p) || (i = t.a);
                }
              } else i = t.a;
            }
            i == 0 && w.Oa != null && w.Oa.fd && (i = wi(w.ba));
          }
          w = i;
        }
        y = w != 0 ? null : 11 > y ? L.f.RGBA.eb : L.f.kb.y;
      } else y = null;
      return y;
    };
    var zo = [3, 4, 3, 4, 4, 2, 2, 4, 4, 4, 2, 1, 1];
  };
  function m(dt, z) {
    for (var at = "", M = 0; M < 4; M++) at += String.fromCharCode(dt[z++]);
    return at;
  }
  function A(dt, z) {
    return (dt[z + 0] << 0 | dt[z + 1] << 8 | dt[z + 2] << 16) >>> 0;
  }
  function b(dt, z) {
    return (dt[z + 0] << 0 | dt[z + 1] << 8 | dt[z + 2] << 16 | dt[z + 3] << 24) >>> 0;
  }
  new c();
  var S = [0], g = [0], B = [], F = new c(), O = l, I = function(dt, z) {
    var at = {}, M = 0, k = !1, D = 0, R = 0;
    if (at.frames = [], !/** @license
       * Copyright (c) 2017 Dominik Homberger
      Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
      The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
      https://webpjs.appspot.com
      WebPRiffParser dominikhlbg@gmail.com
      */
    function(x, q, U, V) {
      for (var K = 0; K < V; K++) if (x[q + K] != U.charCodeAt(K)) return !0;
      return !1;
    }(dt, z, "RIFF", 4)) {
      for (b(dt, z += 4), z += 8; z < dt.length; ) {
        var ot = m(dt, z), st = b(dt, z += 4);
        z += 4;
        var ht = st + (1 & st);
        switch (ot) {
          case "VP8 ":
          case "VP8L":
            at.frames[M] === void 0 && (at.frames[M] = {}), (rt = at.frames[M]).src_off = k ? R : z - 8, rt.src_size = D + st + 8, M++, k && (k = !1, D = 0, R = 0);
            break;
          case "VP8X":
            (rt = at.header = {}).feature_flags = dt[z];
            var X = z + 4;
            rt.canvas_width = 1 + A(dt, X), X += 3, rt.canvas_height = 1 + A(dt, X), X += 3;
            break;
          case "ALPH":
            k = !0, D = ht + 8, R = z - 8;
            break;
          case "ANIM":
            (rt = at.header).bgcolor = b(dt, z), X = z + 4, rt.loop_count = (xt = dt)[(E = X) + 0] << 0 | xt[E + 1] << 8, X += 2;
            break;
          case "ANMF":
            var Nt, rt;
            (rt = at.frames[M] = {}).offset_x = 2 * A(dt, z), z += 3, rt.offset_y = 2 * A(dt, z), z += 3, rt.width = 1 + A(dt, z), z += 3, rt.height = 1 + A(dt, z), z += 3, rt.duration = A(dt, z), z += 3, Nt = dt[z++], rt.dispose = 1 & Nt, rt.blend = Nt >> 1 & 1;
        }
        ot != "ANMF" && (z += ht);
      }
      var xt, E;
      return at;
    }
  }(O, 0);
  I.response = O, I.rgbaoutput = !0, I.dataurl = !1;
  var N = I.header ? I.header : null, J = I.frames ? I.frames : null;
  if (N) {
    N.loop_counter = N.loop_count, S = [N.canvas_height], g = [N.canvas_width];
    for (var et = 0; et < J.length && J[et].blend != 0; et++) ;
  }
  var ct = J[0], bt = F.WebPDecodeRGBA(O, ct.src_off, ct.src_size, g, S);
  ct.rgba = bt, ct.imgwidth = g[0], ct.imgheight = S[0];
  for (var nt = 0; nt < g[0] * S[0] * 4; nt++) B[nt] = bt[nt];
  return this.width = g, this.height = S, this.data = B, this;
}
(function(l) {
  var e = function() {
    return typeof yo == "function";
  }, r = function(g, B, F, O) {
    var I = 4, N = o;
    switch (O) {
      case l.image_compression.FAST:
        I = 1, N = a;
        break;
      case l.image_compression.MEDIUM:
        I = 6, N = f;
        break;
      case l.image_compression.SLOW:
        I = 9, N = c;
    }
    g = n(g, B, F, N);
    var J = yo(g, {
      level: I
    });
    return l.__addimage__.arrayBufferToBinaryString(J);
  }, n = function(g, B, F, O) {
    for (var I, N, J, et = g.length / B, ct = new Uint8Array(g.length + et), bt = A(), nt = 0; nt < et; nt += 1) {
      if (J = nt * B, I = g.subarray(J, J + B), O) ct.set(O(I, F, N), J + nt);
      else {
        for (var dt, z = bt.length, at = []; dt < z; dt += 1) at[dt] = bt[dt](I, F, N);
        var M = b(at.concat());
        ct.set(at[M], J + nt);
      }
      N = I;
    }
    return ct;
  }, s = function(g) {
    var B = Array.apply([], g);
    return B.unshift(0), B;
  }, a = function(g, B) {
    var F, O = [], I = g.length;
    O[0] = 1;
    for (var N = 0; N < I; N += 1) F = g[N - B] || 0, O[N + 1] = g[N] - F + 256 & 255;
    return O;
  }, o = function(g, B, F) {
    var O, I = [], N = g.length;
    I[0] = 2;
    for (var J = 0; J < N; J += 1) O = F && F[J] || 0, I[J + 1] = g[J] - O + 256 & 255;
    return I;
  }, f = function(g, B, F) {
    var O, I, N = [], J = g.length;
    N[0] = 3;
    for (var et = 0; et < J; et += 1) O = g[et - B] || 0, I = F && F[et] || 0, N[et + 1] = g[et] + 256 - (O + I >>> 1) & 255;
    return N;
  }, c = function(g, B, F) {
    var O, I, N, J, et = [], ct = g.length;
    et[0] = 4;
    for (var bt = 0; bt < ct; bt += 1) O = g[bt - B] || 0, I = F && F[bt] || 0, N = F && F[bt - B] || 0, J = m(O, I, N), et[bt + 1] = g[bt] - J + 256 & 255;
    return et;
  }, m = function(g, B, F) {
    if (g === B && B === F) return g;
    var O = Math.abs(B - F), I = Math.abs(g - F), N = Math.abs(g + B - F - F);
    return O <= I && O <= N ? g : I <= N ? B : F;
  }, A = function() {
    return [s, a, o, f, c];
  }, b = function(g) {
    var B = g.map(function(F) {
      return F.reduce(function(O, I) {
        return O + Math.abs(I);
      }, 0);
    });
    return B.indexOf(Math.min.apply(null, B));
  };
  l.processPNG = function(S, g, B, F) {
    var O, I, N, J, et, ct, bt, nt, dt, z, at, M, k, D, R, ot = this.decode.FLATE_DECODE, st = "";
    if (this.__addimage__.isArrayBuffer(S) && (S = new Uint8Array(S)), this.__addimage__.isArrayBufferView(S)) {
      if (S = (N = new uc(S)).imgData, I = N.bits, O = N.colorSpace, et = N.colors, [4, 6].indexOf(N.colorType) !== -1) {
        if (N.bits === 8) {
          dt = (nt = N.pixelBitlength == 32 ? new Uint32Array(N.decodePixels().buffer) : N.pixelBitlength == 16 ? new Uint16Array(N.decodePixels().buffer) : new Uint8Array(N.decodePixels().buffer)).length, at = new Uint8Array(dt * N.colors), z = new Uint8Array(dt);
          var ht, X = N.pixelBitlength - N.bits;
          for (D = 0, R = 0; D < dt; D++) {
            for (k = nt[D], ht = 0; ht < X; ) at[R++] = k >>> ht & 255, ht += N.bits;
            z[D] = k >>> ht & 255;
          }
        }
        if (N.bits === 16) {
          dt = (nt = new Uint32Array(N.decodePixels().buffer)).length, at = new Uint8Array(dt * (32 / N.pixelBitlength) * N.colors), z = new Uint8Array(dt * (32 / N.pixelBitlength)), M = N.colors > 1, D = 0, R = 0;
          for (var Nt = 0; D < dt; ) k = nt[D++], at[R++] = k >>> 0 & 255, M && (at[R++] = k >>> 16 & 255, k = nt[D++], at[R++] = k >>> 0 & 255), z[Nt++] = k >>> 16 & 255;
          I = 8;
        }
        F !== l.image_compression.NONE && e() ? (S = r(at, N.width * N.colors, N.colors, F), bt = r(z, N.width, 1, F)) : (S = at, bt = z, ot = void 0);
      }
      if (N.colorType === 3 && (O = this.color_spaces.INDEXED, ct = N.palette, N.transparency.indexed)) {
        var rt = N.transparency.indexed, xt = 0;
        for (D = 0, dt = rt.length; D < dt; ++D) xt += rt[D];
        if ((xt /= 255) === dt - 1 && rt.indexOf(0) !== -1) J = [rt.indexOf(0)];
        else if (xt !== dt) {
          for (nt = N.decodePixels(), z = new Uint8Array(nt.length), D = 0, dt = nt.length; D < dt; D++) z[D] = rt[nt[D]];
          bt = r(z, N.width, 1);
        }
      }
      var E = function(x) {
        var q;
        switch (x) {
          case l.image_compression.FAST:
            q = 11;
            break;
          case l.image_compression.MEDIUM:
            q = 13;
            break;
          case l.image_compression.SLOW:
            q = 14;
            break;
          default:
            q = 12;
        }
        return q;
      }(F);
      return ot === this.decode.FLATE_DECODE && (st = "/Predictor " + E + " "), st += "/Colors " + et + " /BitsPerComponent " + I + " /Columns " + N.width, (this.__addimage__.isArrayBuffer(S) || this.__addimage__.isArrayBufferView(S)) && (S = this.__addimage__.arrayBufferToBinaryString(S)), (bt && this.__addimage__.isArrayBuffer(bt) || this.__addimage__.isArrayBufferView(bt)) && (bt = this.__addimage__.arrayBufferToBinaryString(bt)), {
        alias: B,
        data: S,
        index: g,
        filter: ot,
        decodeParameters: st,
        transparency: J,
        palette: ct,
        sMask: bt,
        predictor: E,
        width: N.width,
        height: N.height,
        bitsPerComponent: I,
        colorSpace: O
      };
    }
  };
})(Wt.API), function(l) {
  l.processGIF89A = function(e, r, n, s) {
    var a = new lc(e), o = a.width, f = a.height, c = [];
    a.decodeAndBlitFrameRGBA(0, c);
    var m = {
      data: c,
      width: o,
      height: f
    }, A = new po(100).encode(m, 100);
    return l.processJPEG.call(this, A, r, n, s);
  }, l.processGIF87A = l.processGIF89A;
}(Wt.API), Er.prototype.parseHeader = function() {
  if (this.fileSize = this.datav.getUint32(this.pos, !0), this.pos += 4, this.reserved = this.datav.getUint32(this.pos, !0), this.pos += 4, this.offset = this.datav.getUint32(this.pos, !0), this.pos += 4, this.headerSize = this.datav.getUint32(this.pos, !0), this.pos += 4, this.width = this.datav.getUint32(this.pos, !0), this.pos += 4, this.height = this.datav.getInt32(this.pos, !0), this.pos += 4, this.planes = this.datav.getUint16(this.pos, !0), this.pos += 2, this.bitPP = this.datav.getUint16(this.pos, !0), this.pos += 2, this.compress = this.datav.getUint32(this.pos, !0), this.pos += 4, this.rawSize = this.datav.getUint32(this.pos, !0), this.pos += 4, this.hr = this.datav.getUint32(this.pos, !0), this.pos += 4, this.vr = this.datav.getUint32(this.pos, !0), this.pos += 4, this.colors = this.datav.getUint32(this.pos, !0), this.pos += 4, this.importantColors = this.datav.getUint32(this.pos, !0), this.pos += 4, this.bitPP === 16 && this.is_with_alpha && (this.bitPP = 15), this.bitPP < 15) {
    var l = this.colors === 0 ? 1 << this.bitPP : this.colors;
    this.palette = new Array(l);
    for (var e = 0; e < l; e++) {
      var r = this.datav.getUint8(this.pos++, !0), n = this.datav.getUint8(this.pos++, !0), s = this.datav.getUint8(this.pos++, !0), a = this.datav.getUint8(this.pos++, !0);
      this.palette[e] = {
        red: s,
        green: n,
        blue: r,
        quad: a
      };
    }
  }
  this.height < 0 && (this.height *= -1, this.bottom_up = !1);
}, Er.prototype.parseBGR = function() {
  this.pos = this.offset;
  try {
    var l = "bit" + this.bitPP, e = this.width * this.height * 4;
    this.data = new Uint8Array(e), this[l]();
  } catch (r) {
    ve.log("bit decode error:" + r);
  }
}, Er.prototype.bit1 = function() {
  var l, e = Math.ceil(this.width / 8), r = e % 4;
  for (l = this.height - 1; l >= 0; l--) {
    for (var n = this.bottom_up ? l : this.height - 1 - l, s = 0; s < e; s++) for (var a = this.datav.getUint8(this.pos++, !0), o = n * this.width * 4 + 8 * s * 4, f = 0; f < 8 && 8 * s + f < this.width; f++) {
      var c = this.palette[a >> 7 - f & 1];
      this.data[o + 4 * f] = c.blue, this.data[o + 4 * f + 1] = c.green, this.data[o + 4 * f + 2] = c.red, this.data[o + 4 * f + 3] = 255;
    }
    r !== 0 && (this.pos += 4 - r);
  }
}, Er.prototype.bit4 = function() {
  for (var l = Math.ceil(this.width / 2), e = l % 4, r = this.height - 1; r >= 0; r--) {
    for (var n = this.bottom_up ? r : this.height - 1 - r, s = 0; s < l; s++) {
      var a = this.datav.getUint8(this.pos++, !0), o = n * this.width * 4 + 2 * s * 4, f = a >> 4, c = 15 & a, m = this.palette[f];
      if (this.data[o] = m.blue, this.data[o + 1] = m.green, this.data[o + 2] = m.red, this.data[o + 3] = 255, 2 * s + 1 >= this.width) break;
      m = this.palette[c], this.data[o + 4] = m.blue, this.data[o + 4 + 1] = m.green, this.data[o + 4 + 2] = m.red, this.data[o + 4 + 3] = 255;
    }
    e !== 0 && (this.pos += 4 - e);
  }
}, Er.prototype.bit8 = function() {
  for (var l = this.width % 4, e = this.height - 1; e >= 0; e--) {
    for (var r = this.bottom_up ? e : this.height - 1 - e, n = 0; n < this.width; n++) {
      var s = this.datav.getUint8(this.pos++, !0), a = r * this.width * 4 + 4 * n;
      if (s < this.palette.length) {
        var o = this.palette[s];
        this.data[a] = o.red, this.data[a + 1] = o.green, this.data[a + 2] = o.blue, this.data[a + 3] = 255;
      } else this.data[a] = 255, this.data[a + 1] = 255, this.data[a + 2] = 255, this.data[a + 3] = 255;
    }
    l !== 0 && (this.pos += 4 - l);
  }
}, Er.prototype.bit15 = function() {
  for (var l = this.width % 3, e = parseInt("11111", 2), r = this.height - 1; r >= 0; r--) {
    for (var n = this.bottom_up ? r : this.height - 1 - r, s = 0; s < this.width; s++) {
      var a = this.datav.getUint16(this.pos, !0);
      this.pos += 2;
      var o = (a & e) / e * 255 | 0, f = (a >> 5 & e) / e * 255 | 0, c = (a >> 10 & e) / e * 255 | 0, m = a >> 15 ? 255 : 0, A = n * this.width * 4 + 4 * s;
      this.data[A] = c, this.data[A + 1] = f, this.data[A + 2] = o, this.data[A + 3] = m;
    }
    this.pos += l;
  }
}, Er.prototype.bit16 = function() {
  for (var l = this.width % 3, e = parseInt("11111", 2), r = parseInt("111111", 2), n = this.height - 1; n >= 0; n--) {
    for (var s = this.bottom_up ? n : this.height - 1 - n, a = 0; a < this.width; a++) {
      var o = this.datav.getUint16(this.pos, !0);
      this.pos += 2;
      var f = (o & e) / e * 255 | 0, c = (o >> 5 & r) / r * 255 | 0, m = (o >> 11) / e * 255 | 0, A = s * this.width * 4 + 4 * a;
      this.data[A] = m, this.data[A + 1] = c, this.data[A + 2] = f, this.data[A + 3] = 255;
    }
    this.pos += l;
  }
}, Er.prototype.bit24 = function() {
  for (var l = this.height - 1; l >= 0; l--) {
    for (var e = this.bottom_up ? l : this.height - 1 - l, r = 0; r < this.width; r++) {
      var n = this.datav.getUint8(this.pos++, !0), s = this.datav.getUint8(this.pos++, !0), a = this.datav.getUint8(this.pos++, !0), o = e * this.width * 4 + 4 * r;
      this.data[o] = a, this.data[o + 1] = s, this.data[o + 2] = n, this.data[o + 3] = 255;
    }
    this.pos += this.width % 4;
  }
}, Er.prototype.bit32 = function() {
  for (var l = this.height - 1; l >= 0; l--) for (var e = this.bottom_up ? l : this.height - 1 - l, r = 0; r < this.width; r++) {
    var n = this.datav.getUint8(this.pos++, !0), s = this.datav.getUint8(this.pos++, !0), a = this.datav.getUint8(this.pos++, !0), o = this.datav.getUint8(this.pos++, !0), f = e * this.width * 4 + 4 * r;
    this.data[f] = a, this.data[f + 1] = s, this.data[f + 2] = n, this.data[f + 3] = o;
  }
}, Er.prototype.getData = function() {
  return this.data;
}, /**
 * @license
 * Copyright (c) 2018 Aras Abbasi
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  l.processBMP = function(e, r, n, s) {
    var a = new Er(e, !1), o = a.width, f = a.height, c = {
      data: a.getData(),
      width: o,
      height: f
    }, m = new po(100).encode(c, 100);
    return l.processJPEG.call(this, m, r, n, s);
  };
}(Wt.API), Nu.prototype.getData = function() {
  return this.data;
}, /**
 * @license
 * Copyright (c) 2019 Aras Abbasi
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  l.processWEBP = function(e, r, n, s) {
    var a = new Nu(e), o = a.width, f = a.height, c = {
      data: a.getData(),
      width: o,
      height: f
    }, m = new po(100).encode(c, 100);
    return l.processJPEG.call(this, m, r, n, s);
  };
}(Wt.API), Wt.API.processRGBA = function(l, e, r) {
  for (var n = l.data, s = n.length, a = new Uint8Array(s / 4 * 3), o = new Uint8Array(s / 4), f = 0, c = 0, m = 0; m < s; m += 4) {
    var A = n[m], b = n[m + 1], S = n[m + 2], g = n[m + 3];
    a[f++] = A, a[f++] = b, a[f++] = S, o[c++] = g;
  }
  var B = this.__addimage__.arrayBufferToBinaryString(a);
  return {
    alpha: this.__addimage__.arrayBufferToBinaryString(o),
    data: B,
    index: e,
    alias: r,
    colorSpace: "DeviceRGB",
    bitsPerComponent: 8,
    width: l.width,
    height: l.height
  };
}, Wt.API.setLanguage = function(l) {
  return this.internal.languageSettings === void 0 && (this.internal.languageSettings = {}, this.internal.languageSettings.isSubscribed = !1), {
    af: "Afrikaans",
    sq: "Albanian",
    ar: "Arabic (Standard)",
    "ar-DZ": "Arabic (Algeria)",
    "ar-BH": "Arabic (Bahrain)",
    "ar-EG": "Arabic (Egypt)",
    "ar-IQ": "Arabic (Iraq)",
    "ar-JO": "Arabic (Jordan)",
    "ar-KW": "Arabic (Kuwait)",
    "ar-LB": "Arabic (Lebanon)",
    "ar-LY": "Arabic (Libya)",
    "ar-MA": "Arabic (Morocco)",
    "ar-OM": "Arabic (Oman)",
    "ar-QA": "Arabic (Qatar)",
    "ar-SA": "Arabic (Saudi Arabia)",
    "ar-SY": "Arabic (Syria)",
    "ar-TN": "Arabic (Tunisia)",
    "ar-AE": "Arabic (U.A.E.)",
    "ar-YE": "Arabic (Yemen)",
    an: "Aragonese",
    hy: "Armenian",
    as: "Assamese",
    ast: "Asturian",
    az: "Azerbaijani",
    eu: "Basque",
    be: "Belarusian",
    bn: "Bengali",
    bs: "Bosnian",
    br: "Breton",
    bg: "Bulgarian",
    my: "Burmese",
    ca: "Catalan",
    ch: "Chamorro",
    ce: "Chechen",
    zh: "Chinese",
    "zh-HK": "Chinese (Hong Kong)",
    "zh-CN": "Chinese (PRC)",
    "zh-SG": "Chinese (Singapore)",
    "zh-TW": "Chinese (Taiwan)",
    cv: "Chuvash",
    co: "Corsican",
    cr: "Cree",
    hr: "Croatian",
    cs: "Czech",
    da: "Danish",
    nl: "Dutch (Standard)",
    "nl-BE": "Dutch (Belgian)",
    en: "English",
    "en-AU": "English (Australia)",
    "en-BZ": "English (Belize)",
    "en-CA": "English (Canada)",
    "en-IE": "English (Ireland)",
    "en-JM": "English (Jamaica)",
    "en-NZ": "English (New Zealand)",
    "en-PH": "English (Philippines)",
    "en-ZA": "English (South Africa)",
    "en-TT": "English (Trinidad & Tobago)",
    "en-GB": "English (United Kingdom)",
    "en-US": "English (United States)",
    "en-ZW": "English (Zimbabwe)",
    eo: "Esperanto",
    et: "Estonian",
    fo: "Faeroese",
    fj: "Fijian",
    fi: "Finnish",
    fr: "French (Standard)",
    "fr-BE": "French (Belgium)",
    "fr-CA": "French (Canada)",
    "fr-FR": "French (France)",
    "fr-LU": "French (Luxembourg)",
    "fr-MC": "French (Monaco)",
    "fr-CH": "French (Switzerland)",
    fy: "Frisian",
    fur: "Friulian",
    gd: "Gaelic (Scots)",
    "gd-IE": "Gaelic (Irish)",
    gl: "Galacian",
    ka: "Georgian",
    de: "German (Standard)",
    "de-AT": "German (Austria)",
    "de-DE": "German (Germany)",
    "de-LI": "German (Liechtenstein)",
    "de-LU": "German (Luxembourg)",
    "de-CH": "German (Switzerland)",
    el: "Greek",
    gu: "Gujurati",
    ht: "Haitian",
    he: "Hebrew",
    hi: "Hindi",
    hu: "Hungarian",
    is: "Icelandic",
    id: "Indonesian",
    iu: "Inuktitut",
    ga: "Irish",
    it: "Italian (Standard)",
    "it-CH": "Italian (Switzerland)",
    ja: "Japanese",
    kn: "Kannada",
    ks: "Kashmiri",
    kk: "Kazakh",
    km: "Khmer",
    ky: "Kirghiz",
    tlh: "Klingon",
    ko: "Korean",
    "ko-KP": "Korean (North Korea)",
    "ko-KR": "Korean (South Korea)",
    la: "Latin",
    lv: "Latvian",
    lt: "Lithuanian",
    lb: "Luxembourgish",
    mk: "North Macedonia",
    ms: "Malay",
    ml: "Malayalam",
    mt: "Maltese",
    mi: "Maori",
    mr: "Marathi",
    mo: "Moldavian",
    nv: "Navajo",
    ng: "Ndonga",
    ne: "Nepali",
    no: "Norwegian",
    nb: "Norwegian (Bokmal)",
    nn: "Norwegian (Nynorsk)",
    oc: "Occitan",
    or: "Oriya",
    om: "Oromo",
    fa: "Persian",
    "fa-IR": "Persian/Iran",
    pl: "Polish",
    pt: "Portuguese",
    "pt-BR": "Portuguese (Brazil)",
    pa: "Punjabi",
    "pa-IN": "Punjabi (India)",
    "pa-PK": "Punjabi (Pakistan)",
    qu: "Quechua",
    rm: "Rhaeto-Romanic",
    ro: "Romanian",
    "ro-MO": "Romanian (Moldavia)",
    ru: "Russian",
    "ru-MO": "Russian (Moldavia)",
    sz: "Sami (Lappish)",
    sg: "Sango",
    sa: "Sanskrit",
    sc: "Sardinian",
    sd: "Sindhi",
    si: "Singhalese",
    sr: "Serbian",
    sk: "Slovak",
    sl: "Slovenian",
    so: "Somani",
    sb: "Sorbian",
    es: "Spanish",
    "es-AR": "Spanish (Argentina)",
    "es-BO": "Spanish (Bolivia)",
    "es-CL": "Spanish (Chile)",
    "es-CO": "Spanish (Colombia)",
    "es-CR": "Spanish (Costa Rica)",
    "es-DO": "Spanish (Dominican Republic)",
    "es-EC": "Spanish (Ecuador)",
    "es-SV": "Spanish (El Salvador)",
    "es-GT": "Spanish (Guatemala)",
    "es-HN": "Spanish (Honduras)",
    "es-MX": "Spanish (Mexico)",
    "es-NI": "Spanish (Nicaragua)",
    "es-PA": "Spanish (Panama)",
    "es-PY": "Spanish (Paraguay)",
    "es-PE": "Spanish (Peru)",
    "es-PR": "Spanish (Puerto Rico)",
    "es-ES": "Spanish (Spain)",
    "es-UY": "Spanish (Uruguay)",
    "es-VE": "Spanish (Venezuela)",
    sx: "Sutu",
    sw: "Swahili",
    sv: "Swedish",
    "sv-FI": "Swedish (Finland)",
    "sv-SV": "Swedish (Sweden)",
    ta: "Tamil",
    tt: "Tatar",
    te: "Teluga",
    th: "Thai",
    tig: "Tigre",
    ts: "Tsonga",
    tn: "Tswana",
    tr: "Turkish",
    tk: "Turkmen",
    uk: "Ukrainian",
    hsb: "Upper Sorbian",
    ur: "Urdu",
    ve: "Venda",
    vi: "Vietnamese",
    vo: "Volapuk",
    wa: "Walloon",
    cy: "Welsh",
    xh: "Xhosa",
    ji: "Yiddish",
    zu: "Zulu"
  }[l] !== void 0 && (this.internal.languageSettings.languageCode = l, this.internal.languageSettings.isSubscribed === !1 && (this.internal.events.subscribe("putCatalog", function() {
    this.internal.write("/Lang (" + this.internal.languageSettings.languageCode + ")");
  }), this.internal.languageSettings.isSubscribed = !0)), this;
}, ji = Wt.API, us = ji.getCharWidthsArray = function(l, e) {
  var r, n, s = (e = e || {}).font || this.internal.getFont(), a = e.fontSize || this.internal.getFontSize(), o = e.charSpace || this.internal.getCharSpace(), f = e.widths ? e.widths : s.metadata.Unicode.widths, c = f.fof ? f.fof : 1, m = e.kerning ? e.kerning : s.metadata.Unicode.kerning, A = m.fof ? m.fof : 1, b = e.doKerning !== !1, S = 0, g = l.length, B = 0, F = f[0] || c, O = [];
  for (r = 0; r < g; r++) n = l.charCodeAt(r), typeof s.metadata.widthOfString == "function" ? O.push((s.metadata.widthOfGlyph(s.metadata.characterToGlyph(n)) + o * (1e3 / a) || 0) / 1e3) : (S = b && fe(m[n]) === "object" && !isNaN(parseInt(m[n][B], 10)) ? m[n][B] / A : 0, O.push((f[n] || F) / c + S)), B = n;
  return O;
}, vu = ji.getStringUnitWidth = function(l, e) {
  var r = (e = e || {}).fontSize || this.internal.getFontSize(), n = e.font || this.internal.getFont(), s = e.charSpace || this.internal.getCharSpace();
  return ji.processArabic && (l = ji.processArabic(l)), typeof n.metadata.widthOfString == "function" ? n.metadata.widthOfString(l, r, s) / r : us.apply(this, arguments).reduce(function(a, o) {
    return a + o;
  }, 0);
}, bu = function(e, r, n, s) {
  for (var a = [], o = 0, f = e.length, c = 0; o !== f && c + r[o] < n; ) c += r[o], o++;
  a.push(e.slice(0, o));
  var m = o;
  for (c = 0; o !== f; ) c + r[o] > s && (a.push(e.slice(m, o)), c = 0, m = o), c += r[o], o++;
  return m !== o && a.push(e.slice(m, o)), a;
}, yu = function(e, r, n) {
  n || (n = {});
  var s, a, o, f, c, m, A, b = [], S = [b], g = n.textIndent || 0, B = 0, F = 0, O = e.split(" "), I = us.apply(this, [" ", n])[0];
  if (m = n.lineIndent === -1 ? O[0].length + 2 : n.lineIndent || 0) {
    var N = Array(m).join(" "), J = [];
    O.map(function(ct) {
      (ct = ct.split(/\s*\n/)).length > 1 ? J = J.concat(ct.map(function(bt, nt) {
        return (nt && bt.length ? `
` : "") + bt;
      })) : J.push(ct[0]);
    }), O = J, m = vu.apply(this, [N, n]);
  }
  for (o = 0, f = O.length; o < f; o++) {
    var et = 0;
    if (s = O[o], m && s[0] == `
` && (s = s.substr(1), et = 1), g + B + (F = (a = us.apply(this, [s, n])).reduce(function(ct, bt) {
      return ct + bt;
    }, 0)) > r || et) {
      if (F > r) {
        for (c = bu.apply(this, [s, a, r - (g + B), r]), b.push(c.shift()), b = [c.pop()]; c.length; ) S.push([c.shift()]);
        F = a.slice(s.length - (b[0] ? b[0].length : 0)).reduce(function(ct, bt) {
          return ct + bt;
        }, 0);
      } else b = [s];
      S.push(b), g = F + m, B = I;
    } else b.push(s), g += B + F, B = I;
  }
  return A = m ? function(ct, bt) {
    return (bt ? N : "") + ct.join(" ");
  } : function(ct) {
    return ct.join(" ");
  }, S.map(A);
}, ji.splitTextToSize = function(l, e, r) {
  var n, s = (r = r || {}).fontSize || this.internal.getFontSize(), a = function(A) {
    if (A.widths && A.kerning) return {
      widths: A.widths,
      kerning: A.kerning
    };
    var b = this.internal.getFont(A.fontName, A.fontStyle);
    return b.metadata.Unicode ? {
      widths: b.metadata.Unicode.widths || {
        0: 1
      },
      kerning: b.metadata.Unicode.kerning || {}
    } : {
      font: b.metadata,
      fontSize: this.internal.getFontSize(),
      charSpace: this.internal.getCharSpace()
    };
  }.call(this, r);
  n = Array.isArray(l) ? l : String(l).split(/\r?\n/);
  var o = 1 * this.internal.scaleFactor * e / s;
  a.textIndent = r.textIndent ? 1 * r.textIndent * this.internal.scaleFactor / s : 0, a.lineIndent = r.lineIndent;
  var f, c, m = [];
  for (f = 0, c = n.length; f < c; f++) m = m.concat(yu.apply(this, [n[f], o, a]));
  return m;
}, function(l) {
  l.__fontmetrics__ = l.__fontmetrics__ || {};
  for (var e = "klmnopqrstuvwxyz", r = {}, n = {}, s = 0; s < e.length; s++) r[e[s]] = "0123456789abcdef"[s], n["0123456789abcdef"[s]] = e[s];
  var a = function(S) {
    return "0x" + parseInt(S, 10).toString(16);
  }, o = l.__fontmetrics__.compress = function(b) {
    var S, g, B, F, O = ["{"];
    for (var I in b) {
      if (S = b[I], isNaN(parseInt(I, 10)) ? g = "'" + I + "'" : (I = parseInt(I, 10), g = (g = a(I).slice(2)).slice(0, -1) + n[g.slice(-1)]), typeof S == "number") S < 0 ? (B = a(S).slice(3), F = "-") : (B = a(S).slice(2), F = ""), B = F + B.slice(0, -1) + n[B.slice(-1)];
      else {
        if (fe(S) !== "object") throw new Error("Don't know what to do with value type " + fe(S) + ".");
        B = o(S);
      }
      O.push(g + B);
    }
    return O.push("}"), O.join("");
  }, f = l.__fontmetrics__.uncompress = function(b) {
    if (typeof b != "string") throw new Error("Invalid argument passed to uncompress.");
    for (var S, g, B, F, O = {}, I = 1, N = O, J = [], et = "", ct = "", bt = b.length - 1, nt = 1; nt < bt; nt += 1) (F = b[nt]) == "'" ? S ? (B = S.join(""), S = void 0) : S = [] : S ? S.push(F) : F == "{" ? (J.push([N, B]), N = {}, B = void 0) : F == "}" ? ((g = J.pop())[0][g[1]] = N, B = void 0, N = g[0]) : F == "-" ? I = -1 : B === void 0 ? r.hasOwnProperty(F) ? (et += r[F], B = parseInt(et, 16) * I, I = 1, et = "") : et += F : r.hasOwnProperty(F) ? (ct += r[F], N[B] = parseInt(ct, 16) * I, I = 1, B = void 0, ct = "") : ct += F;
    return O;
  }, c = {
    codePages: ["WinAnsiEncoding"],
    WinAnsiEncoding: f("{19m8n201n9q201o9r201s9l201t9m201u8m201w9n201x9o201y8o202k8q202l8r202m9p202q8p20aw8k203k8t203t8v203u9v2cq8s212m9t15m8w15n9w2dw9s16k8u16l9u17s9z17x8y17y9y}")
  }, m = {
    Unicode: {
      Courier: c,
      "Courier-Bold": c,
      "Courier-BoldOblique": c,
      "Courier-Oblique": c,
      Helvetica: c,
      "Helvetica-Bold": c,
      "Helvetica-BoldOblique": c,
      "Helvetica-Oblique": c,
      "Times-Roman": c,
      "Times-Bold": c,
      "Times-BoldItalic": c,
      "Times-Italic": c
    }
  }, A = {
    Unicode: {
      "Courier-Oblique": f("{'widths'{k3w'fof'6o}'kerning'{'fof'-6o}}"),
      "Times-BoldItalic": f("{'widths'{k3o2q4ycx2r201n3m201o6o201s2l201t2l201u2l201w3m201x3m201y3m2k1t2l2r202m2n2n3m2o3m2p5n202q6o2r1w2s2l2t2l2u3m2v3t2w1t2x2l2y1t2z1w3k3m3l3m3m3m3n3m3o3m3p3m3q3m3r3m3s3m203t2l203u2l3v2l3w3t3x3t3y3t3z3m4k5n4l4m4m4m4n4m4o4s4p4m4q4m4r4s4s4y4t2r4u3m4v4m4w3x4x5t4y4s4z4s5k3x5l4s5m4m5n3r5o3x5p4s5q4m5r5t5s4m5t3x5u3x5v2l5w1w5x2l5y3t5z3m6k2l6l3m6m3m6n2w6o3m6p2w6q2l6r3m6s3r6t1w6u1w6v3m6w1w6x4y6y3r6z3m7k3m7l3m7m2r7n2r7o1w7p3r7q2w7r4m7s3m7t2w7u2r7v2n7w1q7x2n7y3t202l3mcl4mal2ram3man3mao3map3mar3mas2lat4uau1uav3maw3way4uaz2lbk2sbl3t'fof'6obo2lbp3tbq3mbr1tbs2lbu1ybv3mbz3mck4m202k3mcm4mcn4mco4mcp4mcq5ycr4mcs4mct4mcu4mcv4mcw2r2m3rcy2rcz2rdl4sdm4sdn4sdo4sdp4sdq4sds4sdt4sdu4sdv4sdw4sdz3mek3mel3mem3men3meo3mep3meq4ser2wes2wet2weu2wev2wew1wex1wey1wez1wfl3rfm3mfn3mfo3mfp3mfq3mfr3tfs3mft3rfu3rfv3rfw3rfz2w203k6o212m6o2dw2l2cq2l3t3m3u2l17s3x19m3m}'kerning'{cl{4qu5kt5qt5rs17ss5ts}201s{201ss}201t{cks4lscmscnscoscpscls2wu2yu201ts}201x{2wu2yu}2k{201ts}2w{4qx5kx5ou5qx5rs17su5tu}2x{17su5tu5ou}2y{4qx5kx5ou5qx5rs17ss5ts}'fof'-6ofn{17sw5tw5ou5qw5rs}7t{cksclscmscnscoscps4ls}3u{17su5tu5os5qs}3v{17su5tu5os5qs}7p{17su5tu}ck{4qu5kt5qt5rs17ss5ts}4l{4qu5kt5qt5rs17ss5ts}cm{4qu5kt5qt5rs17ss5ts}cn{4qu5kt5qt5rs17ss5ts}co{4qu5kt5qt5rs17ss5ts}cp{4qu5kt5qt5rs17ss5ts}6l{4qu5ou5qw5rt17su5tu}5q{ckuclucmucnucoucpu4lu}5r{ckuclucmucnucoucpu4lu}7q{cksclscmscnscoscps4ls}6p{4qu5ou5qw5rt17sw5tw}ek{4qu5ou5qw5rt17su5tu}el{4qu5ou5qw5rt17su5tu}em{4qu5ou5qw5rt17su5tu}en{4qu5ou5qw5rt17su5tu}eo{4qu5ou5qw5rt17su5tu}ep{4qu5ou5qw5rt17su5tu}es{17ss5ts5qs4qu}et{4qu5ou5qw5rt17sw5tw}eu{4qu5ou5qw5rt17ss5ts}ev{17ss5ts5qs4qu}6z{17sw5tw5ou5qw5rs}fm{17sw5tw5ou5qw5rs}7n{201ts}fo{17sw5tw5ou5qw5rs}fp{17sw5tw5ou5qw5rs}fq{17sw5tw5ou5qw5rs}7r{cksclscmscnscoscps4ls}fs{17sw5tw5ou5qw5rs}ft{17su5tu}fu{17su5tu}fv{17su5tu}fw{17su5tu}fz{cksclscmscnscoscps4ls}}}"),
      "Helvetica-Bold": f("{'widths'{k3s2q4scx1w201n3r201o6o201s1w201t1w201u1w201w3m201x3m201y3m2k1w2l2l202m2n2n3r2o3r2p5t202q6o2r1s2s2l2t2l2u2r2v3u2w1w2x2l2y1w2z1w3k3r3l3r3m3r3n3r3o3r3p3r3q3r3r3r3s3r203t2l203u2l3v2l3w3u3x3u3y3u3z3x4k6l4l4s4m4s4n4s4o4s4p4m4q3x4r4y4s4s4t1w4u3r4v4s4w3x4x5n4y4s4z4y5k4m5l4y5m4s5n4m5o3x5p4s5q4m5r5y5s4m5t4m5u3x5v2l5w1w5x2l5y3u5z3r6k2l6l3r6m3x6n3r6o3x6p3r6q2l6r3x6s3x6t1w6u1w6v3r6w1w6x5t6y3x6z3x7k3x7l3x7m2r7n3r7o2l7p3x7q3r7r4y7s3r7t3r7u3m7v2r7w1w7x2r7y3u202l3rcl4sal2lam3ran3rao3rap3rar3ras2lat4tau2pav3raw3uay4taz2lbk2sbl3u'fof'6obo2lbp3xbq3rbr1wbs2lbu2obv3rbz3xck4s202k3rcm4scn4sco4scp4scq6ocr4scs4mct4mcu4mcv4mcw1w2m2zcy1wcz1wdl4sdm4ydn4ydo4ydp4ydq4yds4ydt4sdu4sdv4sdw4sdz3xek3rel3rem3ren3reo3rep3req5ter3res3ret3reu3rev3rew1wex1wey1wez1wfl3xfm3xfn3xfo3xfp3xfq3xfr3ufs3xft3xfu3xfv3xfw3xfz3r203k6o212m6o2dw2l2cq2l3t3r3u2l17s4m19m3r}'kerning'{cl{4qs5ku5ot5qs17sv5tv}201t{2ww4wy2yw}201w{2ks}201x{2ww4wy2yw}2k{201ts201xs}2w{7qs4qu5kw5os5qw5rs17su5tu7tsfzs}2x{5ow5qs}2y{7qs4qu5kw5os5qw5rs17su5tu7tsfzs}'fof'-6o7p{17su5tu5ot}ck{4qs5ku5ot5qs17sv5tv}4l{4qs5ku5ot5qs17sv5tv}cm{4qs5ku5ot5qs17sv5tv}cn{4qs5ku5ot5qs17sv5tv}co{4qs5ku5ot5qs17sv5tv}cp{4qs5ku5ot5qs17sv5tv}6l{17st5tt5os}17s{2kwclvcmvcnvcovcpv4lv4wwckv}5o{2kucltcmtcntcotcpt4lt4wtckt}5q{2ksclscmscnscoscps4ls4wvcks}5r{2ks4ws}5t{2kwclvcmvcnvcovcpv4lv4wwckv}eo{17st5tt5os}fu{17su5tu5ot}6p{17ss5ts}ek{17st5tt5os}el{17st5tt5os}em{17st5tt5os}en{17st5tt5os}6o{201ts}ep{17st5tt5os}es{17ss5ts}et{17ss5ts}eu{17ss5ts}ev{17ss5ts}6z{17su5tu5os5qt}fm{17su5tu5os5qt}fn{17su5tu5os5qt}fo{17su5tu5os5qt}fp{17su5tu5os5qt}fq{17su5tu5os5qt}fs{17su5tu5os5qt}ft{17su5tu5ot}7m{5os}fv{17su5tu5ot}fw{17su5tu5ot}}}"),
      Courier: f("{'widths'{k3w'fof'6o}'kerning'{'fof'-6o}}"),
      "Courier-BoldOblique": f("{'widths'{k3w'fof'6o}'kerning'{'fof'-6o}}"),
      "Times-Bold": f("{'widths'{k3q2q5ncx2r201n3m201o6o201s2l201t2l201u2l201w3m201x3m201y3m2k1t2l2l202m2n2n3m2o3m2p6o202q6o2r1w2s2l2t2l2u3m2v3t2w1t2x2l2y1t2z1w3k3m3l3m3m3m3n3m3o3m3p3m3q3m3r3m3s3m203t2l203u2l3v2l3w3t3x3t3y3t3z3m4k5x4l4s4m4m4n4s4o4s4p4m4q3x4r4y4s4y4t2r4u3m4v4y4w4m4x5y4y4s4z4y5k3x5l4y5m4s5n3r5o4m5p4s5q4s5r6o5s4s5t4s5u4m5v2l5w1w5x2l5y3u5z3m6k2l6l3m6m3r6n2w6o3r6p2w6q2l6r3m6s3r6t1w6u2l6v3r6w1w6x5n6y3r6z3m7k3r7l3r7m2w7n2r7o2l7p3r7q3m7r4s7s3m7t3m7u2w7v2r7w1q7x2r7y3o202l3mcl4sal2lam3man3mao3map3mar3mas2lat4uau1yav3maw3tay4uaz2lbk2sbl3t'fof'6obo2lbp3rbr1tbs2lbu2lbv3mbz3mck4s202k3mcm4scn4sco4scp4scq6ocr4scs4mct4mcu4mcv4mcw2r2m3rcy2rcz2rdl4sdm4ydn4ydo4ydp4ydq4yds4ydt4sdu4sdv4sdw4sdz3rek3mel3mem3men3meo3mep3meq4ser2wes2wet2weu2wev2wew1wex1wey1wez1wfl3rfm3mfn3mfo3mfp3mfq3mfr3tfs3mft3rfu3rfv3rfw3rfz3m203k6o212m6o2dw2l2cq2l3t3m3u2l17s4s19m3m}'kerning'{cl{4qt5ks5ot5qy5rw17sv5tv}201t{cks4lscmscnscoscpscls4wv}2k{201ts}2w{4qu5ku7mu5os5qx5ru17su5tu}2x{17su5tu5ou5qs}2y{4qv5kv7mu5ot5qz5ru17su5tu}'fof'-6o7t{cksclscmscnscoscps4ls}3u{17su5tu5os5qu}3v{17su5tu5os5qu}fu{17su5tu5ou5qu}7p{17su5tu5ou5qu}ck{4qt5ks5ot5qy5rw17sv5tv}4l{4qt5ks5ot5qy5rw17sv5tv}cm{4qt5ks5ot5qy5rw17sv5tv}cn{4qt5ks5ot5qy5rw17sv5tv}co{4qt5ks5ot5qy5rw17sv5tv}cp{4qt5ks5ot5qy5rw17sv5tv}6l{17st5tt5ou5qu}17s{ckuclucmucnucoucpu4lu4wu}5o{ckuclucmucnucoucpu4lu4wu}5q{ckzclzcmzcnzcozcpz4lz4wu}5r{ckxclxcmxcnxcoxcpx4lx4wu}5t{ckuclucmucnucoucpu4lu4wu}7q{ckuclucmucnucoucpu4lu}6p{17sw5tw5ou5qu}ek{17st5tt5qu}el{17st5tt5ou5qu}em{17st5tt5qu}en{17st5tt5qu}eo{17st5tt5qu}ep{17st5tt5ou5qu}es{17ss5ts5qu}et{17sw5tw5ou5qu}eu{17sw5tw5ou5qu}ev{17ss5ts5qu}6z{17sw5tw5ou5qu5rs}fm{17sw5tw5ou5qu5rs}fn{17sw5tw5ou5qu5rs}fo{17sw5tw5ou5qu5rs}fp{17sw5tw5ou5qu5rs}fq{17sw5tw5ou5qu5rs}7r{cktcltcmtcntcotcpt4lt5os}fs{17sw5tw5ou5qu5rs}ft{17su5tu5ou5qu}7m{5os}fv{17su5tu5ou5qu}fw{17su5tu5ou5qu}fz{cksclscmscnscoscps4ls}}}"),
      Symbol: f("{'widths'{k3uaw4r19m3m2k1t2l2l202m2y2n3m2p5n202q6o3k3m2s2l2t2l2v3r2w1t3m3m2y1t2z1wbk2sbl3r'fof'6o3n3m3o3m3p3m3q3m3r3m3s3m3t3m3u1w3v1w3w3r3x3r3y3r3z2wbp3t3l3m5v2l5x2l5z3m2q4yfr3r7v3k7w1o7x3k}'kerning'{'fof'-6o}}"),
      Helvetica: f("{'widths'{k3p2q4mcx1w201n3r201o6o201s1q201t1q201u1q201w2l201x2l201y2l2k1w2l1w202m2n2n3r2o3r2p5t202q6o2r1n2s2l2t2l2u2r2v3u2w1w2x2l2y1w2z1w3k3r3l3r3m3r3n3r3o3r3p3r3q3r3r3r3s3r203t2l203u2l3v1w3w3u3x3u3y3u3z3r4k6p4l4m4m4m4n4s4o4s4p4m4q3x4r4y4s4s4t1w4u3m4v4m4w3r4x5n4y4s4z4y5k4m5l4y5m4s5n4m5o3x5p4s5q4m5r5y5s4m5t4m5u3x5v1w5w1w5x1w5y2z5z3r6k2l6l3r6m3r6n3m6o3r6p3r6q1w6r3r6s3r6t1q6u1q6v3m6w1q6x5n6y3r6z3r7k3r7l3r7m2l7n3m7o1w7p3r7q3m7r4s7s3m7t3m7u3m7v2l7w1u7x2l7y3u202l3rcl4mal2lam3ran3rao3rap3rar3ras2lat4tau2pav3raw3uay4taz2lbk2sbl3u'fof'6obo2lbp3rbr1wbs2lbu2obv3rbz3xck4m202k3rcm4mcn4mco4mcp4mcq6ocr4scs4mct4mcu4mcv4mcw1w2m2ncy1wcz1wdl4sdm4ydn4ydo4ydp4ydq4yds4ydt4sdu4sdv4sdw4sdz3xek3rel3rem3ren3reo3rep3req5ter3mes3ret3reu3rev3rew1wex1wey1wez1wfl3rfm3rfn3rfo3rfp3rfq3rfr3ufs3xft3rfu3rfv3rfw3rfz3m203k6o212m6o2dw2l2cq2l3t3r3u1w17s4m19m3r}'kerning'{5q{4wv}cl{4qs5kw5ow5qs17sv5tv}201t{2wu4w1k2yu}201x{2wu4wy2yu}17s{2ktclucmucnu4otcpu4lu4wycoucku}2w{7qs4qz5k1m17sy5ow5qx5rsfsu5ty7tufzu}2x{17sy5ty5oy5qs}2y{7qs4qz5k1m17sy5ow5qx5rsfsu5ty7tufzu}'fof'-6o7p{17sv5tv5ow}ck{4qs5kw5ow5qs17sv5tv}4l{4qs5kw5ow5qs17sv5tv}cm{4qs5kw5ow5qs17sv5tv}cn{4qs5kw5ow5qs17sv5tv}co{4qs5kw5ow5qs17sv5tv}cp{4qs5kw5ow5qs17sv5tv}6l{17sy5ty5ow}do{17st5tt}4z{17st5tt}7s{fst}dm{17st5tt}dn{17st5tt}5o{ckwclwcmwcnwcowcpw4lw4wv}dp{17st5tt}dq{17st5tt}7t{5ow}ds{17st5tt}5t{2ktclucmucnu4otcpu4lu4wycoucku}fu{17sv5tv5ow}6p{17sy5ty5ow5qs}ek{17sy5ty5ow}el{17sy5ty5ow}em{17sy5ty5ow}en{5ty}eo{17sy5ty5ow}ep{17sy5ty5ow}es{17sy5ty5qs}et{17sy5ty5ow5qs}eu{17sy5ty5ow5qs}ev{17sy5ty5ow5qs}6z{17sy5ty5ow5qs}fm{17sy5ty5ow5qs}fn{17sy5ty5ow5qs}fo{17sy5ty5ow5qs}fp{17sy5ty5qs}fq{17sy5ty5ow5qs}7r{5ow}fs{17sy5ty5ow5qs}ft{17sv5tv5ow}7m{5ow}fv{17sv5tv5ow}fw{17sv5tv5ow}}}"),
      "Helvetica-BoldOblique": f("{'widths'{k3s2q4scx1w201n3r201o6o201s1w201t1w201u1w201w3m201x3m201y3m2k1w2l2l202m2n2n3r2o3r2p5t202q6o2r1s2s2l2t2l2u2r2v3u2w1w2x2l2y1w2z1w3k3r3l3r3m3r3n3r3o3r3p3r3q3r3r3r3s3r203t2l203u2l3v2l3w3u3x3u3y3u3z3x4k6l4l4s4m4s4n4s4o4s4p4m4q3x4r4y4s4s4t1w4u3r4v4s4w3x4x5n4y4s4z4y5k4m5l4y5m4s5n4m5o3x5p4s5q4m5r5y5s4m5t4m5u3x5v2l5w1w5x2l5y3u5z3r6k2l6l3r6m3x6n3r6o3x6p3r6q2l6r3x6s3x6t1w6u1w6v3r6w1w6x5t6y3x6z3x7k3x7l3x7m2r7n3r7o2l7p3x7q3r7r4y7s3r7t3r7u3m7v2r7w1w7x2r7y3u202l3rcl4sal2lam3ran3rao3rap3rar3ras2lat4tau2pav3raw3uay4taz2lbk2sbl3u'fof'6obo2lbp3xbq3rbr1wbs2lbu2obv3rbz3xck4s202k3rcm4scn4sco4scp4scq6ocr4scs4mct4mcu4mcv4mcw1w2m2zcy1wcz1wdl4sdm4ydn4ydo4ydp4ydq4yds4ydt4sdu4sdv4sdw4sdz3xek3rel3rem3ren3reo3rep3req5ter3res3ret3reu3rev3rew1wex1wey1wez1wfl3xfm3xfn3xfo3xfp3xfq3xfr3ufs3xft3xfu3xfv3xfw3xfz3r203k6o212m6o2dw2l2cq2l3t3r3u2l17s4m19m3r}'kerning'{cl{4qs5ku5ot5qs17sv5tv}201t{2ww4wy2yw}201w{2ks}201x{2ww4wy2yw}2k{201ts201xs}2w{7qs4qu5kw5os5qw5rs17su5tu7tsfzs}2x{5ow5qs}2y{7qs4qu5kw5os5qw5rs17su5tu7tsfzs}'fof'-6o7p{17su5tu5ot}ck{4qs5ku5ot5qs17sv5tv}4l{4qs5ku5ot5qs17sv5tv}cm{4qs5ku5ot5qs17sv5tv}cn{4qs5ku5ot5qs17sv5tv}co{4qs5ku5ot5qs17sv5tv}cp{4qs5ku5ot5qs17sv5tv}6l{17st5tt5os}17s{2kwclvcmvcnvcovcpv4lv4wwckv}5o{2kucltcmtcntcotcpt4lt4wtckt}5q{2ksclscmscnscoscps4ls4wvcks}5r{2ks4ws}5t{2kwclvcmvcnvcovcpv4lv4wwckv}eo{17st5tt5os}fu{17su5tu5ot}6p{17ss5ts}ek{17st5tt5os}el{17st5tt5os}em{17st5tt5os}en{17st5tt5os}6o{201ts}ep{17st5tt5os}es{17ss5ts}et{17ss5ts}eu{17ss5ts}ev{17ss5ts}6z{17su5tu5os5qt}fm{17su5tu5os5qt}fn{17su5tu5os5qt}fo{17su5tu5os5qt}fp{17su5tu5os5qt}fq{17su5tu5os5qt}fs{17su5tu5os5qt}ft{17su5tu5ot}7m{5os}fv{17su5tu5ot}fw{17su5tu5ot}}}"),
      ZapfDingbats: f("{'widths'{k4u2k1w'fof'6o}'kerning'{'fof'-6o}}"),
      "Courier-Bold": f("{'widths'{k3w'fof'6o}'kerning'{'fof'-6o}}"),
      "Times-Italic": f("{'widths'{k3n2q4ycx2l201n3m201o5t201s2l201t2l201u2l201w3r201x3r201y3r2k1t2l2l202m2n2n3m2o3m2p5n202q5t2r1p2s2l2t2l2u3m2v4n2w1t2x2l2y1t2z1w3k3m3l3m3m3m3n3m3o3m3p3m3q3m3r3m3s3m203t2l203u2l3v2l3w4n3x4n3y4n3z3m4k5w4l3x4m3x4n4m4o4s4p3x4q3x4r4s4s4s4t2l4u2w4v4m4w3r4x5n4y4m4z4s5k3x5l4s5m3x5n3m5o3r5p4s5q3x5r5n5s3x5t3r5u3r5v2r5w1w5x2r5y2u5z3m6k2l6l3m6m3m6n2w6o3m6p2w6q1w6r3m6s3m6t1w6u1w6v2w6w1w6x4s6y3m6z3m7k3m7l3m7m2r7n2r7o1w7p3m7q2w7r4m7s2w7t2w7u2r7v2s7w1v7x2s7y3q202l3mcl3xal2ram3man3mao3map3mar3mas2lat4wau1vav3maw4nay4waz2lbk2sbl4n'fof'6obo2lbp3mbq3obr1tbs2lbu1zbv3mbz3mck3x202k3mcm3xcn3xco3xcp3xcq5tcr4mcs3xct3xcu3xcv3xcw2l2m2ucy2lcz2ldl4mdm4sdn4sdo4sdp4sdq4sds4sdt4sdu4sdv4sdw4sdz3mek3mel3mem3men3meo3mep3meq4mer2wes2wet2weu2wev2wew1wex1wey1wez1wfl3mfm3mfn3mfo3mfp3mfq3mfr4nfs3mft3mfu3mfv3mfw3mfz2w203k6o212m6m2dw2l2cq2l3t3m3u2l17s3r19m3m}'kerning'{cl{5kt4qw}201s{201sw}201t{201tw2wy2yy6q-t}201x{2wy2yy}2k{201tw}2w{7qs4qy7rs5ky7mw5os5qx5ru17su5tu}2x{17ss5ts5os}2y{7qs4qy7rs5ky7mw5os5qx5ru17su5tu}'fof'-6o6t{17ss5ts5qs}7t{5os}3v{5qs}7p{17su5tu5qs}ck{5kt4qw}4l{5kt4qw}cm{5kt4qw}cn{5kt4qw}co{5kt4qw}cp{5kt4qw}6l{4qs5ks5ou5qw5ru17su5tu}17s{2ks}5q{ckvclvcmvcnvcovcpv4lv}5r{ckuclucmucnucoucpu4lu}5t{2ks}6p{4qs5ks5ou5qw5ru17su5tu}ek{4qs5ks5ou5qw5ru17su5tu}el{4qs5ks5ou5qw5ru17su5tu}em{4qs5ks5ou5qw5ru17su5tu}en{4qs5ks5ou5qw5ru17su5tu}eo{4qs5ks5ou5qw5ru17su5tu}ep{4qs5ks5ou5qw5ru17su5tu}es{5ks5qs4qs}et{4qs5ks5ou5qw5ru17su5tu}eu{4qs5ks5qw5ru17su5tu}ev{5ks5qs4qs}ex{17ss5ts5qs}6z{4qv5ks5ou5qw5ru17su5tu}fm{4qv5ks5ou5qw5ru17su5tu}fn{4qv5ks5ou5qw5ru17su5tu}fo{4qv5ks5ou5qw5ru17su5tu}fp{4qv5ks5ou5qw5ru17su5tu}fq{4qv5ks5ou5qw5ru17su5tu}7r{5os}fs{4qv5ks5ou5qw5ru17su5tu}ft{17su5tu5qs}fu{17su5tu5qs}fv{17su5tu5qs}fw{17su5tu5qs}}}"),
      "Times-Roman": f("{'widths'{k3n2q4ycx2l201n3m201o6o201s2l201t2l201u2l201w2w201x2w201y2w2k1t2l2l202m2n2n3m2o3m2p5n202q6o2r1m2s2l2t2l2u3m2v3s2w1t2x2l2y1t2z1w3k3m3l3m3m3m3n3m3o3m3p3m3q3m3r3m3s3m203t2l203u2l3v1w3w3s3x3s3y3s3z2w4k5w4l4s4m4m4n4m4o4s4p3x4q3r4r4s4s4s4t2l4u2r4v4s4w3x4x5t4y4s4z4s5k3r5l4s5m4m5n3r5o3x5p4s5q4s5r5y5s4s5t4s5u3x5v2l5w1w5x2l5y2z5z3m6k2l6l2w6m3m6n2w6o3m6p2w6q2l6r3m6s3m6t1w6u1w6v3m6w1w6x4y6y3m6z3m7k3m7l3m7m2l7n2r7o1w7p3m7q3m7r4s7s3m7t3m7u2w7v3k7w1o7x3k7y3q202l3mcl4sal2lam3man3mao3map3mar3mas2lat4wau1vav3maw3say4waz2lbk2sbl3s'fof'6obo2lbp3mbq2xbr1tbs2lbu1zbv3mbz2wck4s202k3mcm4scn4sco4scp4scq5tcr4mcs3xct3xcu3xcv3xcw2l2m2tcy2lcz2ldl4sdm4sdn4sdo4sdp4sdq4sds4sdt4sdu4sdv4sdw4sdz3mek2wel2wem2wen2weo2wep2weq4mer2wes2wet2weu2wev2wew1wex1wey1wez1wfl3mfm3mfn3mfo3mfp3mfq3mfr3sfs3mft3mfu3mfv3mfw3mfz3m203k6o212m6m2dw2l2cq2l3t3m3u1w17s4s19m3m}'kerning'{cl{4qs5ku17sw5ou5qy5rw201ss5tw201ws}201s{201ss}201t{ckw4lwcmwcnwcowcpwclw4wu201ts}2k{201ts}2w{4qs5kw5os5qx5ru17sx5tx}2x{17sw5tw5ou5qu}2y{4qs5kw5os5qx5ru17sx5tx}'fof'-6o7t{ckuclucmucnucoucpu4lu5os5rs}3u{17su5tu5qs}3v{17su5tu5qs}7p{17sw5tw5qs}ck{4qs5ku17sw5ou5qy5rw201ss5tw201ws}4l{4qs5ku17sw5ou5qy5rw201ss5tw201ws}cm{4qs5ku17sw5ou5qy5rw201ss5tw201ws}cn{4qs5ku17sw5ou5qy5rw201ss5tw201ws}co{4qs5ku17sw5ou5qy5rw201ss5tw201ws}cp{4qs5ku17sw5ou5qy5rw201ss5tw201ws}6l{17su5tu5os5qw5rs}17s{2ktclvcmvcnvcovcpv4lv4wuckv}5o{ckwclwcmwcnwcowcpw4lw4wu}5q{ckyclycmycnycoycpy4ly4wu5ms}5r{cktcltcmtcntcotcpt4lt4ws}5t{2ktclvcmvcnvcovcpv4lv4wuckv}7q{cksclscmscnscoscps4ls}6p{17su5tu5qw5rs}ek{5qs5rs}el{17su5tu5os5qw5rs}em{17su5tu5os5qs5rs}en{17su5qs5rs}eo{5qs5rs}ep{17su5tu5os5qw5rs}es{5qs}et{17su5tu5qw5rs}eu{17su5tu5qs5rs}ev{5qs}6z{17sv5tv5os5qx5rs}fm{5os5qt5rs}fn{17sv5tv5os5qx5rs}fo{17sv5tv5os5qx5rs}fp{5os5qt5rs}fq{5os5qt5rs}7r{ckuclucmucnucoucpu4lu5os}fs{17sv5tv5os5qx5rs}ft{17ss5ts5qs}fu{17sw5tw5qs}fv{17sw5tw5qs}fw{17ss5ts5qs}fz{ckuclucmucnucoucpu4lu5os5rs}}}"),
      "Helvetica-Oblique": f("{'widths'{k3p2q4mcx1w201n3r201o6o201s1q201t1q201u1q201w2l201x2l201y2l2k1w2l1w202m2n2n3r2o3r2p5t202q6o2r1n2s2l2t2l2u2r2v3u2w1w2x2l2y1w2z1w3k3r3l3r3m3r3n3r3o3r3p3r3q3r3r3r3s3r203t2l203u2l3v1w3w3u3x3u3y3u3z3r4k6p4l4m4m4m4n4s4o4s4p4m4q3x4r4y4s4s4t1w4u3m4v4m4w3r4x5n4y4s4z4y5k4m5l4y5m4s5n4m5o3x5p4s5q4m5r5y5s4m5t4m5u3x5v1w5w1w5x1w5y2z5z3r6k2l6l3r6m3r6n3m6o3r6p3r6q1w6r3r6s3r6t1q6u1q6v3m6w1q6x5n6y3r6z3r7k3r7l3r7m2l7n3m7o1w7p3r7q3m7r4s7s3m7t3m7u3m7v2l7w1u7x2l7y3u202l3rcl4mal2lam3ran3rao3rap3rar3ras2lat4tau2pav3raw3uay4taz2lbk2sbl3u'fof'6obo2lbp3rbr1wbs2lbu2obv3rbz3xck4m202k3rcm4mcn4mco4mcp4mcq6ocr4scs4mct4mcu4mcv4mcw1w2m2ncy1wcz1wdl4sdm4ydn4ydo4ydp4ydq4yds4ydt4sdu4sdv4sdw4sdz3xek3rel3rem3ren3reo3rep3req5ter3mes3ret3reu3rev3rew1wex1wey1wez1wfl3rfm3rfn3rfo3rfp3rfq3rfr3ufs3xft3rfu3rfv3rfw3rfz3m203k6o212m6o2dw2l2cq2l3t3r3u1w17s4m19m3r}'kerning'{5q{4wv}cl{4qs5kw5ow5qs17sv5tv}201t{2wu4w1k2yu}201x{2wu4wy2yu}17s{2ktclucmucnu4otcpu4lu4wycoucku}2w{7qs4qz5k1m17sy5ow5qx5rsfsu5ty7tufzu}2x{17sy5ty5oy5qs}2y{7qs4qz5k1m17sy5ow5qx5rsfsu5ty7tufzu}'fof'-6o7p{17sv5tv5ow}ck{4qs5kw5ow5qs17sv5tv}4l{4qs5kw5ow5qs17sv5tv}cm{4qs5kw5ow5qs17sv5tv}cn{4qs5kw5ow5qs17sv5tv}co{4qs5kw5ow5qs17sv5tv}cp{4qs5kw5ow5qs17sv5tv}6l{17sy5ty5ow}do{17st5tt}4z{17st5tt}7s{fst}dm{17st5tt}dn{17st5tt}5o{ckwclwcmwcnwcowcpw4lw4wv}dp{17st5tt}dq{17st5tt}7t{5ow}ds{17st5tt}5t{2ktclucmucnu4otcpu4lu4wycoucku}fu{17sv5tv5ow}6p{17sy5ty5ow5qs}ek{17sy5ty5ow}el{17sy5ty5ow}em{17sy5ty5ow}en{5ty}eo{17sy5ty5ow}ep{17sy5ty5ow}es{17sy5ty5qs}et{17sy5ty5ow5qs}eu{17sy5ty5ow5qs}ev{17sy5ty5ow5qs}6z{17sy5ty5ow5qs}fm{17sy5ty5ow5qs}fn{17sy5ty5ow5qs}fo{17sy5ty5ow5qs}fp{17sy5ty5qs}fq{17sy5ty5ow5qs}7r{5ow}fs{17sy5ty5ow5qs}ft{17sv5tv5ow}7m{5ow}fv{17sv5tv5ow}fw{17sv5tv5ow}}}")
    }
  };
  l.events.push(["addFont", function(b) {
    var S = b.font, g = A.Unicode[S.postScriptName];
    g && (S.metadata.Unicode = {}, S.metadata.Unicode.widths = g.widths, S.metadata.Unicode.kerning = g.kerning);
    var B = m.Unicode[S.postScriptName];
    B && (S.metadata.Unicode.encoding = B, S.encoding = B.codePages[0]);
  }]);
}(Wt.API), /**
 * @license
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  var e = function(n) {
    for (var s = n.length, a = new Uint8Array(s), o = 0; o < s; o++) a[o] = n.charCodeAt(o);
    return a;
  };
  l.API.events.push(["addFont", function(r) {
    var n = void 0, s = r.font, a = r.instance;
    if (!s.isStandardFont) {
      if (a === void 0) throw new Error("Font does not exist in vFS, import fonts or remove declaration doc.addFont('" + s.postScriptName + "').");
      if (typeof (n = a.existsFileInVFS(s.postScriptName) === !1 ? a.loadFile(s.postScriptName) : a.getFileFromVFS(s.postScriptName)) != "string") throw new Error("Font is not stored as string-data in vFS, import fonts or remove declaration doc.addFont('" + s.postScriptName + "').");
      (function(o, f) {
        f = /^\x00\x01\x00\x00/.test(f) ? e(f) : e(ua(f)), o.metadata = l.API.TTFFont.open(f), o.metadata.Unicode = o.metadata.Unicode || {
          encoding: {},
          kerning: {},
          widths: []
        }, o.metadata.glyIdsUsed = [0];
      })(s, n);
    }
  }]);
}(Wt), /** @license
 * Copyright (c) 2012 Willow Systems Corporation, https://github.com/willowsystems
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ====================================================================
 */
function(l) {
  function e() {
    return (Yt.canvg ? Promise.resolve(Yt.canvg) : import("./index.es-mJZV2KGW.js")).catch(function(r) {
      return Promise.reject(new Error("Could not load canvg: " + r));
    }).then(function(r) {
      return r.default ? r.default : r;
    });
  }
  Wt.API.addSvgAsImage = function(r, n, s, a, o, f, c, m) {
    if (isNaN(n) || isNaN(s)) throw ve.error("jsPDF.addSvgAsImage: Invalid coordinates", arguments), new Error("Invalid coordinates passed to jsPDF.addSvgAsImage");
    if (isNaN(a) || isNaN(o)) throw ve.error("jsPDF.addSvgAsImage: Invalid measurements", arguments), new Error("Invalid measurements (width and/or height) passed to jsPDF.addSvgAsImage");
    var A = document.createElement("canvas");
    A.width = a, A.height = o;
    var b = A.getContext("2d");
    b.fillStyle = "#fff", b.fillRect(0, 0, A.width, A.height);
    var S = {
      ignoreMouse: !0,
      ignoreAnimation: !0,
      ignoreDimensions: !0
    }, g = this;
    return e().then(function(B) {
      return B.fromString(b, r, S);
    }, function() {
      return Promise.reject(new Error("Could not load canvg."));
    }).then(function(B) {
      return B.render(S);
    }).then(function() {
      g.addImage(A.toDataURL("image/jpeg", 1), n, s, a, o, c, m);
    });
  };
}(), Wt.API.putTotalPages = function(l) {
  var e, r = 0;
  parseInt(this.internal.getFont().id.substr(1), 10) < 15 ? (e = new RegExp(l, "g"), r = this.internal.getNumberOfPages()) : (e = new RegExp(this.pdfEscape16(l, this.internal.getFont()), "g"), r = this.pdfEscape16(this.internal.getNumberOfPages() + "", this.internal.getFont()));
  for (var n = 1; n <= this.internal.getNumberOfPages(); n++) for (var s = 0; s < this.internal.pages[n].length; s++) this.internal.pages[n][s] = this.internal.pages[n][s].replace(e, r);
  return this;
}, Wt.API.viewerPreferences = function(l, e) {
  var r;
  l = l || {}, e = e || !1;
  var n, s, a, o = {
    HideToolbar: {
      defaultValue: !1,
      value: !1,
      type: "boolean",
      explicitSet: !1,
      valueSet: [!0, !1],
      pdfVersion: 1.3
    },
    HideMenubar: {
      defaultValue: !1,
      value: !1,
      type: "boolean",
      explicitSet: !1,
      valueSet: [!0, !1],
      pdfVersion: 1.3
    },
    HideWindowUI: {
      defaultValue: !1,
      value: !1,
      type: "boolean",
      explicitSet: !1,
      valueSet: [!0, !1],
      pdfVersion: 1.3
    },
    FitWindow: {
      defaultValue: !1,
      value: !1,
      type: "boolean",
      explicitSet: !1,
      valueSet: [!0, !1],
      pdfVersion: 1.3
    },
    CenterWindow: {
      defaultValue: !1,
      value: !1,
      type: "boolean",
      explicitSet: !1,
      valueSet: [!0, !1],
      pdfVersion: 1.3
    },
    DisplayDocTitle: {
      defaultValue: !1,
      value: !1,
      type: "boolean",
      explicitSet: !1,
      valueSet: [!0, !1],
      pdfVersion: 1.4
    },
    NonFullScreenPageMode: {
      defaultValue: "UseNone",
      value: "UseNone",
      type: "name",
      explicitSet: !1,
      valueSet: ["UseNone", "UseOutlines", "UseThumbs", "UseOC"],
      pdfVersion: 1.3
    },
    Direction: {
      defaultValue: "L2R",
      value: "L2R",
      type: "name",
      explicitSet: !1,
      valueSet: ["L2R", "R2L"],
      pdfVersion: 1.3
    },
    ViewArea: {
      defaultValue: "CropBox",
      value: "CropBox",
      type: "name",
      explicitSet: !1,
      valueSet: ["MediaBox", "CropBox", "TrimBox", "BleedBox", "ArtBox"],
      pdfVersion: 1.4
    },
    ViewClip: {
      defaultValue: "CropBox",
      value: "CropBox",
      type: "name",
      explicitSet: !1,
      valueSet: ["MediaBox", "CropBox", "TrimBox", "BleedBox", "ArtBox"],
      pdfVersion: 1.4
    },
    PrintArea: {
      defaultValue: "CropBox",
      value: "CropBox",
      type: "name",
      explicitSet: !1,
      valueSet: ["MediaBox", "CropBox", "TrimBox", "BleedBox", "ArtBox"],
      pdfVersion: 1.4
    },
    PrintClip: {
      defaultValue: "CropBox",
      value: "CropBox",
      type: "name",
      explicitSet: !1,
      valueSet: ["MediaBox", "CropBox", "TrimBox", "BleedBox", "ArtBox"],
      pdfVersion: 1.4
    },
    PrintScaling: {
      defaultValue: "AppDefault",
      value: "AppDefault",
      type: "name",
      explicitSet: !1,
      valueSet: ["AppDefault", "None"],
      pdfVersion: 1.6
    },
    Duplex: {
      defaultValue: "",
      value: "none",
      type: "name",
      explicitSet: !1,
      valueSet: ["Simplex", "DuplexFlipShortEdge", "DuplexFlipLongEdge", "none"],
      pdfVersion: 1.7
    },
    PickTrayByPDFSize: {
      defaultValue: !1,
      value: !1,
      type: "boolean",
      explicitSet: !1,
      valueSet: [!0, !1],
      pdfVersion: 1.7
    },
    PrintPageRange: {
      defaultValue: "",
      value: "",
      type: "array",
      explicitSet: !1,
      valueSet: null,
      pdfVersion: 1.7
    },
    NumCopies: {
      defaultValue: 1,
      value: 1,
      type: "integer",
      explicitSet: !1,
      valueSet: null,
      pdfVersion: 1.7
    }
  }, f = Object.keys(o), c = [], m = 0, A = 0, b = 0;
  function S(B, F) {
    var O, I = !1;
    for (O = 0; O < B.length; O += 1) B[O] === F && (I = !0);
    return I;
  }
  if (this.internal.viewerpreferences === void 0 && (this.internal.viewerpreferences = {}, this.internal.viewerpreferences.configuration = JSON.parse(JSON.stringify(o)), this.internal.viewerpreferences.isSubscribed = !1), r = this.internal.viewerpreferences.configuration, l === "reset" || e === !0) {
    var g = f.length;
    for (b = 0; b < g; b += 1) r[f[b]].value = r[f[b]].defaultValue, r[f[b]].explicitSet = !1;
  }
  if (fe(l) === "object") {
    for (s in l) if (a = l[s], S(f, s) && a !== void 0) {
      if (r[s].type === "boolean" && typeof a == "boolean") r[s].value = a;
      else if (r[s].type === "name" && S(r[s].valueSet, a)) r[s].value = a;
      else if (r[s].type === "integer" && Number.isInteger(a)) r[s].value = a;
      else if (r[s].type === "array") {
        for (m = 0; m < a.length; m += 1) if (n = !0, a[m].length === 1 && typeof a[m][0] == "number") c.push(String(a[m] - 1));
        else if (a[m].length > 1) {
          for (A = 0; A < a[m].length; A += 1) typeof a[m][A] != "number" && (n = !1);
          n === !0 && c.push([a[m][0] - 1, a[m][1] - 1].join(" "));
        }
        r[s].value = "[" + c.join(" ") + "]";
      } else r[s].value = r[s].defaultValue;
      r[s].explicitSet = !0;
    }
  }
  return this.internal.viewerpreferences.isSubscribed === !1 && (this.internal.events.subscribe("putCatalog", function() {
    var B, F = [];
    for (B in r) r[B].explicitSet === !0 && (r[B].type === "name" ? F.push("/" + B + " /" + r[B].value) : F.push("/" + B + " " + r[B].value));
    F.length !== 0 && this.internal.write(`/ViewerPreferences
<<
` + F.join(`
`) + `
>>`);
  }), this.internal.viewerpreferences.isSubscribed = !0), this.internal.viewerpreferences.configuration = r, this;
}, /** ====================================================================
 * @license
 * jsPDF XMP metadata plugin
 * Copyright (c) 2016 Jussi Utunen, u-jussi@suomi24.fi
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ====================================================================
 */
function(l) {
  var e = function() {
    var s = '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:jspdf="' + this.internal.__metadata__.namespaceuri + '"><jspdf:metadata>', a = unescape(encodeURIComponent('<x:xmpmeta xmlns:x="adobe:ns:meta/">')), o = unescape(encodeURIComponent(s)), f = unescape(encodeURIComponent(this.internal.__metadata__.metadata)), c = unescape(encodeURIComponent("</jspdf:metadata></rdf:Description></rdf:RDF>")), m = unescape(encodeURIComponent("</x:xmpmeta>")), A = o.length + f.length + c.length + a.length + m.length;
    this.internal.__metadata__.metadata_object_number = this.internal.newObject(), this.internal.write("<< /Type /Metadata /Subtype /XML /Length " + A + " >>"), this.internal.write("stream"), this.internal.write(a + o + f + c + m), this.internal.write("endstream"), this.internal.write("endobj");
  }, r = function() {
    this.internal.__metadata__.metadata_object_number && this.internal.write("/Metadata " + this.internal.__metadata__.metadata_object_number + " 0 R");
  };
  l.addMetadata = function(n, s) {
    return this.internal.__metadata__ === void 0 && (this.internal.__metadata__ = {
      metadata: n,
      namespaceuri: s || "http://jspdf.default.namespaceuri/"
    }, this.internal.events.subscribe("putCatalog", r), this.internal.events.subscribe("postPutResources", e)), this;
  };
}(Wt.API), function(l) {
  var e = l.API, r = e.pdfEscape16 = function(a, o) {
    for (var f, c = o.metadata.Unicode.widths, m = ["", "0", "00", "000", "0000"], A = [""], b = 0, S = a.length; b < S; ++b) {
      if (f = o.metadata.characterToGlyph(a.charCodeAt(b)), o.metadata.glyIdsUsed.push(f), o.metadata.toUnicode[f] = a.charCodeAt(b), c.indexOf(f) == -1 && (c.push(f), c.push([parseInt(o.metadata.widthOfGlyph(f), 10)])), f == "0") return A.join("");
      f = f.toString(16), A.push(m[4 - f.length], f);
    }
    return A.join("");
  }, n = function(o) {
    var f, c, m, A, b, S, g;
    for (b = `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo <<
  /Registry (Adobe)
  /Ordering (UCS)
  /Supplement 0
>> def
/CMapName /Adobe-Identity-UCS def
/CMapType 2 def
1 begincodespacerange
<0000><ffff>
endcodespacerange`, m = [], S = 0, g = (c = Object.keys(o).sort(function(B, F) {
      return B - F;
    })).length; S < g; S++) f = c[S], m.length >= 100 && (b += `
` + m.length + ` beginbfchar
` + m.join(`
`) + `
endbfchar`, m = []), o[f] !== void 0 && o[f] !== null && typeof o[f].toString == "function" && (A = ("0000" + o[f].toString(16)).slice(-4), f = ("0000" + (+f).toString(16)).slice(-4), m.push("<" + f + "><" + A + ">"));
    return m.length && (b += `
` + m.length + ` beginbfchar
` + m.join(`
`) + `
endbfchar
`), b += `endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
  };
  e.events.push(["putFont", function(a) {
    (function(o) {
      var f = o.font, c = o.out, m = o.newObject, A = o.putStream;
      if (f.metadata instanceof l.API.TTFFont && f.encoding === "Identity-H") {
        for (var b = f.metadata.Unicode.widths, S = f.metadata.subset.encode(f.metadata.glyIdsUsed, 1), g = "", B = 0; B < S.length; B++) g += String.fromCharCode(S[B]);
        var F = m();
        A({
          data: g,
          addLength1: !0,
          objectId: F
        }), c("endobj");
        var O = m();
        A({
          data: n(f.metadata.toUnicode),
          addLength1: !0,
          objectId: O
        }), c("endobj");
        var I = m();
        c("<<"), c("/Type /FontDescriptor"), c("/FontName /" + Bi(f.fontName)), c("/FontFile2 " + F + " 0 R"), c("/FontBBox " + l.API.PDFObject.convert(f.metadata.bbox)), c("/Flags " + f.metadata.flags), c("/StemV " + f.metadata.stemV), c("/ItalicAngle " + f.metadata.italicAngle), c("/Ascent " + f.metadata.ascender), c("/Descent " + f.metadata.decender), c("/CapHeight " + f.metadata.capHeight), c(">>"), c("endobj");
        var N = m();
        c("<<"), c("/Type /Font"), c("/BaseFont /" + Bi(f.fontName)), c("/FontDescriptor " + I + " 0 R"), c("/W " + l.API.PDFObject.convert(b)), c("/CIDToGIDMap /Identity"), c("/DW 1000"), c("/Subtype /CIDFontType2"), c("/CIDSystemInfo"), c("<<"), c("/Supplement 0"), c("/Registry (Adobe)"), c("/Ordering (" + f.encoding + ")"), c(">>"), c(">>"), c("endobj"), f.objectNumber = m(), c("<<"), c("/Type /Font"), c("/Subtype /Type0"), c("/ToUnicode " + O + " 0 R"), c("/BaseFont /" + Bi(f.fontName)), c("/Encoding /" + f.encoding), c("/DescendantFonts [" + N + " 0 R]"), c(">>"), c("endobj"), f.isAlreadyPutted = !0;
      }
    })(a);
  }]), e.events.push(["putFont", function(a) {
    (function(o) {
      var f = o.font, c = o.out, m = o.newObject, A = o.putStream;
      if (f.metadata instanceof l.API.TTFFont && f.encoding === "WinAnsiEncoding") {
        for (var b = f.metadata.rawData, S = "", g = 0; g < b.length; g++) S += String.fromCharCode(b[g]);
        var B = m();
        A({
          data: S,
          addLength1: !0,
          objectId: B
        }), c("endobj");
        var F = m();
        A({
          data: n(f.metadata.toUnicode),
          addLength1: !0,
          objectId: F
        }), c("endobj");
        var O = m();
        c("<<"), c("/Descent " + f.metadata.decender), c("/CapHeight " + f.metadata.capHeight), c("/StemV " + f.metadata.stemV), c("/Type /FontDescriptor"), c("/FontFile2 " + B + " 0 R"), c("/Flags 96"), c("/FontBBox " + l.API.PDFObject.convert(f.metadata.bbox)), c("/FontName /" + Bi(f.fontName)), c("/ItalicAngle " + f.metadata.italicAngle), c("/Ascent " + f.metadata.ascender), c(">>"), c("endobj"), f.objectNumber = m();
        for (var I = 0; I < f.metadata.hmtx.widths.length; I++) f.metadata.hmtx.widths[I] = parseInt(f.metadata.hmtx.widths[I] * (1e3 / f.metadata.head.unitsPerEm));
        c("<</Subtype/TrueType/Type/Font/ToUnicode " + F + " 0 R/BaseFont/" + Bi(f.fontName) + "/FontDescriptor " + O + " 0 R/Encoding/" + f.encoding + " /FirstChar 29 /LastChar 255 /Widths " + l.API.PDFObject.convert(f.metadata.hmtx.widths) + ">>"), c("endobj"), f.isAlreadyPutted = !0;
      }
    })(a);
  }]);
  var s = function(o) {
    var f, c = o.text || "", m = o.x, A = o.y, b = o.options || {}, S = o.mutex || {}, g = S.pdfEscape, B = S.activeFontKey, F = S.fonts, O = B, I = "", N = 0, J = "", et = F[O].encoding;
    if (F[O].encoding !== "Identity-H") return {
      text: c,
      x: m,
      y: A,
      options: b,
      mutex: S
    };
    for (J = c, O = B, Array.isArray(c) && (J = c[0]), N = 0; N < J.length; N += 1) F[O].metadata.hasOwnProperty("cmap") && (f = F[O].metadata.cmap.unicode.codeMap[J[N].charCodeAt(0)]), f || J[N].charCodeAt(0) < 256 && F[O].metadata.hasOwnProperty("Unicode") ? I += J[N] : I += "";
    var ct = "";
    return parseInt(O.slice(1)) < 14 || et === "WinAnsiEncoding" ? ct = g(I, O).split("").map(function(bt) {
      return bt.charCodeAt(0).toString(16);
    }).join("") : et === "Identity-H" && (ct = r(I, F[O])), S.isHex = !0, {
      text: ct,
      x: m,
      y: A,
      options: b,
      mutex: S
    };
  };
  e.events.push(["postProcessText", function(a) {
    var o = a.text || "", f = [], c = {
      text: o,
      x: a.x,
      y: a.y,
      options: a.options,
      mutex: a.mutex
    };
    if (Array.isArray(o)) {
      var m = 0;
      for (m = 0; m < o.length; m += 1) Array.isArray(o[m]) && o[m].length === 3 ? f.push([s(Object.assign({}, c, {
        text: o[m][0]
      })).text, o[m][1], o[m][2]]) : f.push(s(Object.assign({}, c, {
        text: o[m]
      })).text);
      a.text = f;
    } else a.text = s(Object.assign({}, c, {
      text: o
    })).text;
  }]);
}(Wt), /**
 * @license
 * jsPDF virtual FileSystem functionality
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */
function(l) {
  var e = function() {
    return this.internal.vFS === void 0 && (this.internal.vFS = {}), !0;
  };
  l.existsFileInVFS = function(r) {
    return e.call(this), this.internal.vFS[r] !== void 0;
  }, l.addFileToVFS = function(r, n) {
    return e.call(this), this.internal.vFS[r] = n, this;
  }, l.getFileFromVFS = function(r) {
    return e.call(this), this.internal.vFS[r] !== void 0 ? this.internal.vFS[r] : null;
  };
}(Wt.API), /**
 * @license
 * Unicode Bidi Engine based on the work of Alex Shensis (@asthensis)
 * MIT License
 */
function(l) {
  l.__bidiEngine__ = l.prototype.__bidiEngine__ = function(n) {
    var s, a, o, f, c, m, A, b = e, S = [[0, 3, 0, 1, 0, 0, 0], [0, 3, 0, 1, 2, 2, 0], [0, 3, 0, 17, 2, 0, 1], [0, 3, 5, 5, 4, 1, 0], [0, 3, 21, 21, 4, 0, 1], [0, 3, 5, 5, 4, 2, 0]], g = [[2, 0, 1, 1, 0, 1, 0], [2, 0, 1, 1, 0, 2, 0], [2, 0, 2, 1, 3, 2, 0], [2, 0, 2, 33, 3, 1, 1]], B = {
      L: 0,
      R: 1,
      EN: 2,
      AN: 3,
      N: 4,
      B: 5,
      S: 6
    }, F = {
      0: 0,
      5: 1,
      6: 2,
      7: 3,
      32: 4,
      251: 5,
      254: 6,
      255: 7
    }, O = ["(", ")", "(", "<", ">", "<", "[", "]", "[", "{", "}", "{", "«", "»", "«", "‹", "›", "‹", "⁅", "⁆", "⁅", "⁽", "⁾", "⁽", "₍", "₎", "₍", "≤", "≥", "≤", "〈", "〉", "〈", "﹙", "﹚", "﹙", "﹛", "﹜", "﹛", "﹝", "﹞", "﹝", "﹤", "﹥", "﹤"], I = new RegExp(/^([1-4|9]|1[0-9]|2[0-9]|3[0168]|4[04589]|5[012]|7[78]|159|16[0-9]|17[0-2]|21[569]|22[03489]|250)$/), N = !1, J = 0;
    this.__bidiEngine__ = {};
    var et = function(k) {
      var D = k.charCodeAt(), R = D >> 8, ot = F[R];
      return ot !== void 0 ? b[256 * ot + (255 & D)] : R === 252 || R === 253 ? "AL" : I.test(R) ? "L" : R === 8 ? "R" : "N";
    }, ct = function(k) {
      for (var D, R = 0; R < k.length; R++) {
        if ((D = et(k.charAt(R))) === "L") return !1;
        if (D === "R") return !0;
      }
      return !1;
    }, bt = function(k, D, R, ot) {
      var st, ht, X, Nt, rt = D[ot];
      switch (rt) {
        case "L":
        case "R":
          N = !1;
          break;
        case "N":
        case "AN":
          break;
        case "EN":
          N && (rt = "AN");
          break;
        case "AL":
          N = !0, rt = "R";
          break;
        case "WS":
          rt = "N";
          break;
        case "CS":
          ot < 1 || ot + 1 >= D.length || (st = R[ot - 1]) !== "EN" && st !== "AN" || (ht = D[ot + 1]) !== "EN" && ht !== "AN" ? rt = "N" : N && (ht = "AN"), rt = ht === st ? ht : "N";
          break;
        case "ES":
          rt = (st = ot > 0 ? R[ot - 1] : "B") === "EN" && ot + 1 < D.length && D[ot + 1] === "EN" ? "EN" : "N";
          break;
        case "ET":
          if (ot > 0 && R[ot - 1] === "EN") {
            rt = "EN";
            break;
          }
          if (N) {
            rt = "N";
            break;
          }
          for (X = ot + 1, Nt = D.length; X < Nt && D[X] === "ET"; ) X++;
          rt = X < Nt && D[X] === "EN" ? "EN" : "N";
          break;
        case "NSM":
          if (o && !f) {
            for (Nt = D.length, X = ot + 1; X < Nt && D[X] === "NSM"; ) X++;
            if (X < Nt) {
              var xt = k[ot], E = xt >= 1425 && xt <= 2303 || xt === 64286;
              if (st = D[X], E && (st === "R" || st === "AL")) {
                rt = "R";
                break;
              }
            }
          }
          rt = ot < 1 || (st = D[ot - 1]) === "B" ? "N" : R[ot - 1];
          break;
        case "B":
          N = !1, s = !0, rt = J;
          break;
        case "S":
          a = !0, rt = "N";
          break;
        case "LRE":
        case "RLE":
        case "LRO":
        case "RLO":
        case "PDF":
          N = !1;
          break;
        case "BN":
          rt = "N";
      }
      return rt;
    }, nt = function(k, D, R) {
      var ot = k.split("");
      return R && dt(ot, R, {
        hiLevel: J
      }), ot.reverse(), D && D.reverse(), ot.join("");
    }, dt = function(k, D, R) {
      var ot, st, ht, X, Nt, rt = -1, xt = k.length, E = 0, x = [], q = J ? g : S, U = [];
      for (N = !1, s = !1, a = !1, st = 0; st < xt; st++) U[st] = et(k[st]);
      for (ht = 0; ht < xt; ht++) {
        if (Nt = E, x[ht] = bt(k, U, x, ht), ot = 240 & (E = q[Nt][B[x[ht]]]), E &= 15, D[ht] = X = q[E][5], ot > 0) if (ot === 16) {
          for (st = rt; st < ht; st++) D[st] = 1;
          rt = -1;
        } else rt = -1;
        if (q[E][6]) rt === -1 && (rt = ht);
        else if (rt > -1) {
          for (st = rt; st < ht; st++) D[st] = X;
          rt = -1;
        }
        U[ht] === "B" && (D[ht] = 0), R.hiLevel |= X;
      }
      a && function(V, K, ft) {
        for (var it = 0; it < ft; it++) if (V[it] === "S") {
          K[it] = J;
          for (var ut = it - 1; ut >= 0 && V[ut] === "WS"; ut--) K[ut] = J;
        }
      }(U, D, xt);
    }, z = function(k, D, R, ot, st) {
      if (!(st.hiLevel < k)) {
        if (k === 1 && J === 1 && !s) return D.reverse(), void (R && R.reverse());
        for (var ht, X, Nt, rt, xt = D.length, E = 0; E < xt; ) {
          if (ot[E] >= k) {
            for (Nt = E + 1; Nt < xt && ot[Nt] >= k; ) Nt++;
            for (rt = E, X = Nt - 1; rt < X; rt++, X--) ht = D[rt], D[rt] = D[X], D[X] = ht, R && (ht = R[rt], R[rt] = R[X], R[X] = ht);
            E = Nt;
          }
          E++;
        }
      }
    }, at = function(k, D, R) {
      var ot = k.split(""), st = {
        hiLevel: J
      };
      return R || (R = []), dt(ot, R, st), function(ht, X, Nt) {
        if (Nt.hiLevel !== 0 && A) for (var rt, xt = 0; xt < ht.length; xt++) X[xt] === 1 && (rt = O.indexOf(ht[xt])) >= 0 && (ht[xt] = O[rt + 1]);
      }(ot, R, st), z(2, ot, D, R, st), z(1, ot, D, R, st), ot.join("");
    };
    return this.__bidiEngine__.doBidiReorder = function(M, k, D) {
      if (function(ot, st) {
        if (st) for (var ht = 0; ht < ot.length; ht++) st[ht] = ht;
        f === void 0 && (f = ct(ot)), m === void 0 && (m = ct(ot));
      }(M, k), o || !c || m)
        if (o && c && f ^ m) J = f ? 1 : 0, M = nt(M, k, D);
        else if (!o && c && m) J = f ? 1 : 0, M = at(M, k, D), M = nt(M, k);
        else if (!o || f || c || m) {
          if (o && !c && f ^ m) M = nt(M, k), f ? (J = 0, M = at(M, k, D)) : (J = 1, M = at(M, k, D), M = nt(M, k));
          else if (o && f && !c && m) J = 1, M = at(M, k, D), M = nt(M, k);
          else if (!o && !c && f ^ m) {
            var R = A;
            f ? (J = 1, M = at(M, k, D), J = 0, A = !1, M = at(M, k, D), A = R) : (J = 0, M = at(M, k, D), M = nt(M, k), J = 1, A = !1, M = at(M, k, D), A = R, M = nt(M, k));
          }
        } else J = 0, M = at(M, k, D);
      else J = f ? 1 : 0, M = at(M, k, D);
      return M;
    }, this.__bidiEngine__.setOptions = function(M) {
      M && (o = M.isInputVisual, c = M.isOutputVisual, f = M.isInputRtl, m = M.isOutputRtl, A = M.isSymmetricSwapping);
    }, this.__bidiEngine__.setOptions(n), this.__bidiEngine__;
  };
  var e = ["BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "S", "B", "S", "WS", "B", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "B", "B", "B", "S", "WS", "N", "N", "ET", "ET", "ET", "N", "N", "N", "N", "N", "ES", "CS", "ES", "CS", "CS", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "CS", "N", "N", "N", "N", "N", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "N", "N", "N", "N", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "N", "N", "N", "BN", "BN", "BN", "BN", "BN", "BN", "B", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "CS", "N", "ET", "ET", "ET", "ET", "N", "N", "N", "N", "L", "N", "N", "BN", "N", "N", "ET", "ET", "EN", "EN", "N", "L", "N", "N", "N", "EN", "L", "N", "N", "N", "N", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "N", "L", "L", "L", "L", "L", "L", "L", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "L", "N", "N", "N", "N", "N", "ET", "N", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "R", "NSM", "R", "NSM", "NSM", "R", "NSM", "NSM", "R", "NSM", "N", "N", "N", "N", "N", "N", "N", "N", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "N", "N", "N", "N", "N", "R", "R", "R", "R", "R", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "AN", "AN", "AN", "AN", "AN", "AN", "N", "N", "AL", "ET", "ET", "AL", "CS", "AL", "N", "N", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "AL", "AL", "N", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "AN", "AN", "AN", "AN", "AN", "AN", "AN", "AN", "AN", "AN", "ET", "AN", "AN", "AL", "AL", "AL", "NSM", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "AN", "N", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "AL", "AL", "NSM", "NSM", "N", "NSM", "NSM", "NSM", "NSM", "AL", "AL", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "N", "AL", "AL", "NSM", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "N", "N", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "AL", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "R", "R", "N", "N", "N", "N", "R", "N", "N", "N", "N", "N", "WS", "WS", "WS", "WS", "WS", "WS", "WS", "WS", "WS", "WS", "WS", "BN", "BN", "BN", "L", "R", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "WS", "B", "LRE", "RLE", "PDF", "LRO", "RLO", "CS", "ET", "ET", "ET", "ET", "ET", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "CS", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "WS", "BN", "BN", "BN", "BN", "BN", "N", "LRI", "RLI", "FSI", "PDI", "BN", "BN", "BN", "BN", "BN", "BN", "EN", "L", "N", "N", "EN", "EN", "EN", "EN", "EN", "EN", "ES", "ES", "N", "N", "N", "L", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "ES", "ES", "N", "N", "N", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "N", "N", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "ET", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "L", "L", "L", "L", "L", "L", "L", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "L", "L", "L", "L", "L", "N", "N", "N", "N", "N", "R", "NSM", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "ES", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "N", "R", "R", "R", "R", "R", "N", "R", "N", "R", "R", "N", "R", "R", "N", "R", "R", "R", "R", "R", "R", "R", "R", "R", "R", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "NSM", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "CS", "N", "CS", "N", "N", "CS", "N", "N", "N", "N", "N", "N", "N", "N", "N", "ET", "N", "N", "ES", "ES", "N", "N", "N", "N", "N", "ET", "ET", "N", "N", "N", "N", "N", "AL", "AL", "AL", "AL", "AL", "N", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "AL", "N", "N", "BN", "N", "N", "N", "ET", "ET", "ET", "N", "N", "N", "N", "N", "ES", "CS", "ES", "CS", "CS", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "EN", "CS", "N", "N", "N", "N", "N", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "N", "N", "N", "N", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "L", "N", "N", "N", "L", "L", "L", "L", "L", "L", "N", "N", "L", "L", "L", "L", "L", "L", "N", "N", "L", "L", "L", "L", "L", "L", "N", "N", "L", "L", "L", "N", "N", "N", "ET", "ET", "N", "N", "N", "ET", "ET", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N"], r = new l.__bidiEngine__({
    isInputVisual: !0
  });
  l.API.events.push(["postProcessText", function(n) {
    var s = n.text;
    n.x, n.y;
    var a = n.options || {};
    n.mutex, a.lang;
    var o = [];
    if (a.isInputVisual = typeof a.isInputVisual != "boolean" || a.isInputVisual, r.setOptions(a), Object.prototype.toString.call(s) === "[object Array]") {
      var f = 0;
      for (o = [], f = 0; f < s.length; f += 1) Object.prototype.toString.call(s[f]) === "[object Array]" ? o.push([r.doBidiReorder(s[f][0]), s[f][1], s[f][2]]) : o.push([r.doBidiReorder(s[f])]);
      n.text = o;
    } else n.text = r.doBidiReorder(s);
    r.setOptions({
      isInputVisual: !0
    });
  }]);
}(Wt), Wt.API.TTFFont = function() {
  function l(e) {
    var r;
    if (this.rawData = e, r = this.contents = new Mn(e), this.contents.pos = 4, r.readString(4) === "ttcf") throw new Error("TTCF not supported.");
    r.pos = 0, this.parse(), this.subset = new xc(this), this.registerTTF();
  }
  return l.open = function(e) {
    return new l(e);
  }, l.prototype.parse = function() {
    return this.directory = new cc(this.contents), this.head = new fc(this), this.name = new vc(this), this.cmap = new Uu(this), this.toUnicode = {}, this.hhea = new dc(this), this.maxp = new bc(this), this.hmtx = new yc(this), this.post = new gc(this), this.os2 = new pc(this), this.loca = new Ac(this), this.glyf = new wc(this), this.ascender = this.os2.exists && this.os2.ascender || this.hhea.ascender, this.decender = this.os2.exists && this.os2.decender || this.hhea.decender, this.lineGap = this.os2.exists && this.os2.lineGap || this.hhea.lineGap, this.bbox = [this.head.xMin, this.head.yMin, this.head.xMax, this.head.yMax];
  }, l.prototype.registerTTF = function() {
    var e, r, n, s, a;
    if (this.scaleFactor = 1e3 / this.head.unitsPerEm, this.bbox = function() {
      var o, f, c, m;
      for (m = [], o = 0, f = (c = this.bbox).length; o < f; o++) e = c[o], m.push(Math.round(e * this.scaleFactor));
      return m;
    }.call(this), this.stemV = 0, this.post.exists ? (n = 255 & (s = this.post.italic_angle), (32768 & (r = s >> 16)) != 0 && (r = -(1 + (65535 ^ r))), this.italicAngle = +(r + "." + n)) : this.italicAngle = 0, this.ascender = Math.round(this.ascender * this.scaleFactor), this.decender = Math.round(this.decender * this.scaleFactor), this.lineGap = Math.round(this.lineGap * this.scaleFactor), this.capHeight = this.os2.exists && this.os2.capHeight || this.ascender, this.xHeight = this.os2.exists && this.os2.xHeight || 0, this.familyClass = (this.os2.exists && this.os2.familyClass || 0) >> 8, this.isSerif = (a = this.familyClass) === 1 || a === 2 || a === 3 || a === 4 || a === 5 || a === 7, this.isScript = this.familyClass === 10, this.flags = 0, this.post.isFixedPitch && (this.flags |= 1), this.isSerif && (this.flags |= 2), this.isScript && (this.flags |= 8), this.italicAngle !== 0 && (this.flags |= 64), this.flags |= 32, !this.cmap.unicode) throw new Error("No unicode cmap for font");
  }, l.prototype.characterToGlyph = function(e) {
    var r;
    return ((r = this.cmap.unicode) != null ? r.codeMap[e] : void 0) || 0;
  }, l.prototype.widthOfGlyph = function(e) {
    var r;
    return r = 1e3 / this.head.unitsPerEm, this.hmtx.forGlyph(e).advance * r;
  }, l.prototype.widthOfString = function(e, r, n) {
    var s, a, o, f;
    for (o = 0, a = 0, f = (e = "" + e).length; 0 <= f ? a < f : a > f; a = 0 <= f ? ++a : --a) s = e.charCodeAt(a), o += this.widthOfGlyph(this.characterToGlyph(s)) + n * (1e3 / r) || 0;
    return o * (r / 1e3);
  }, l.prototype.lineHeight = function(e, r) {
    var n;
    return r == null && (r = !1), n = r ? this.lineGap : 0, (this.ascender + n - this.decender) / 1e3 * e;
  }, l;
}();
var Rr, Mn = function() {
  function l(e) {
    this.data = e != null ? e : [], this.pos = 0, this.length = this.data.length;
  }
  return l.prototype.readByte = function() {
    return this.data[this.pos++];
  }, l.prototype.writeByte = function(e) {
    return this.data[this.pos++] = e;
  }, l.prototype.readUInt32 = function() {
    return 16777216 * this.readByte() + (this.readByte() << 16) + (this.readByte() << 8) + this.readByte();
  }, l.prototype.writeUInt32 = function(e) {
    return this.writeByte(e >>> 24 & 255), this.writeByte(e >> 16 & 255), this.writeByte(e >> 8 & 255), this.writeByte(255 & e);
  }, l.prototype.readInt32 = function() {
    var e;
    return (e = this.readUInt32()) >= 2147483648 ? e - 4294967296 : e;
  }, l.prototype.writeInt32 = function(e) {
    return e < 0 && (e += 4294967296), this.writeUInt32(e);
  }, l.prototype.readUInt16 = function() {
    return this.readByte() << 8 | this.readByte();
  }, l.prototype.writeUInt16 = function(e) {
    return this.writeByte(e >> 8 & 255), this.writeByte(255 & e);
  }, l.prototype.readInt16 = function() {
    var e;
    return (e = this.readUInt16()) >= 32768 ? e - 65536 : e;
  }, l.prototype.writeInt16 = function(e) {
    return e < 0 && (e += 65536), this.writeUInt16(e);
  }, l.prototype.readString = function(e) {
    var r, n;
    for (n = [], r = 0; 0 <= e ? r < e : r > e; r = 0 <= e ? ++r : --r) n[r] = String.fromCharCode(this.readByte());
    return n.join("");
  }, l.prototype.writeString = function(e) {
    var r, n, s;
    for (s = [], r = 0, n = e.length; 0 <= n ? r < n : r > n; r = 0 <= n ? ++r : --r) s.push(this.writeByte(e.charCodeAt(r)));
    return s;
  }, l.prototype.readShort = function() {
    return this.readInt16();
  }, l.prototype.writeShort = function(e) {
    return this.writeInt16(e);
  }, l.prototype.readLongLong = function() {
    var e, r, n, s, a, o, f, c;
    return e = this.readByte(), r = this.readByte(), n = this.readByte(), s = this.readByte(), a = this.readByte(), o = this.readByte(), f = this.readByte(), c = this.readByte(), 128 & e ? -1 * (72057594037927940 * (255 ^ e) + 281474976710656 * (255 ^ r) + 1099511627776 * (255 ^ n) + 4294967296 * (255 ^ s) + 16777216 * (255 ^ a) + 65536 * (255 ^ o) + 256 * (255 ^ f) + (255 ^ c) + 1) : 72057594037927940 * e + 281474976710656 * r + 1099511627776 * n + 4294967296 * s + 16777216 * a + 65536 * o + 256 * f + c;
  }, l.prototype.writeLongLong = function(e) {
    var r, n;
    return r = Math.floor(e / 4294967296), n = 4294967295 & e, this.writeByte(r >> 24 & 255), this.writeByte(r >> 16 & 255), this.writeByte(r >> 8 & 255), this.writeByte(255 & r), this.writeByte(n >> 24 & 255), this.writeByte(n >> 16 & 255), this.writeByte(n >> 8 & 255), this.writeByte(255 & n);
  }, l.prototype.readInt = function() {
    return this.readInt32();
  }, l.prototype.writeInt = function(e) {
    return this.writeInt32(e);
  }, l.prototype.read = function(e) {
    var r, n;
    for (r = [], n = 0; 0 <= e ? n < e : n > e; n = 0 <= e ? ++n : --n) r.push(this.readByte());
    return r;
  }, l.prototype.write = function(e) {
    var r, n, s, a;
    for (a = [], n = 0, s = e.length; n < s; n++) r = e[n], a.push(this.writeByte(r));
    return a;
  }, l;
}(), cc = function() {
  var l;
  function e(r) {
    var n, s, a;
    for (this.scalarType = r.readInt(), this.tableCount = r.readShort(), this.searchRange = r.readShort(), this.entrySelector = r.readShort(), this.rangeShift = r.readShort(), this.tables = {}, s = 0, a = this.tableCount; 0 <= a ? s < a : s > a; s = 0 <= a ? ++s : --s) n = {
      tag: r.readString(4),
      checksum: r.readInt(),
      offset: r.readInt(),
      length: r.readInt()
    }, this.tables[n.tag] = n;
  }
  return e.prototype.encode = function(r) {
    var n, s, a, o, f, c, m, A, b, S, g, B, F;
    for (F in g = Object.keys(r).length, c = Math.log(2), b = 16 * Math.floor(Math.log(g) / c), o = Math.floor(b / c), A = 16 * g - b, (s = new Mn()).writeInt(this.scalarType), s.writeShort(g), s.writeShort(b), s.writeShort(o), s.writeShort(A), a = 16 * g, m = s.pos + a, f = null, B = [], r) for (S = r[F], s.writeString(F), s.writeInt(l(S)), s.writeInt(m), s.writeInt(S.length), B = B.concat(S), F === "head" && (f = m), m += S.length; m % 4; ) B.push(0), m++;
    return s.write(B), n = 2981146554 - l(s.data), s.pos = f + 8, s.writeUInt32(n), s.data;
  }, l = function(n) {
    var s, a, o, f;
    for (n = Hu.call(n); n.length % 4; ) n.push(0);
    for (o = new Mn(n), a = 0, s = 0, f = n.length; s < f; s = s += 4) a += o.readUInt32();
    return 4294967295 & a;
  }, e;
}(), hc = {}.hasOwnProperty, rn = function(e, r) {
  for (var n in r) hc.call(r, n) && (e[n] = r[n]);
  function s() {
    this.constructor = e;
  }
  return s.prototype = r.prototype, e.prototype = new s(), e.__super__ = r.prototype, e;
};
Rr = function() {
  function l(e) {
    var r;
    this.file = e, r = this.file.directory.tables[this.tag], this.exists = !!r, r && (this.offset = r.offset, this.length = r.length, this.parse(this.file.contents));
  }
  return l.prototype.parse = function() {
  }, l.prototype.encode = function() {
  }, l.prototype.raw = function() {
    return this.exists ? (this.file.contents.pos = this.offset, this.file.contents.read(this.length)) : null;
  }, l;
}();
var fc = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "head", e.prototype.parse = function(r) {
    return r.pos = this.offset, this.version = r.readInt(), this.revision = r.readInt(), this.checkSumAdjustment = r.readInt(), this.magicNumber = r.readInt(), this.flags = r.readShort(), this.unitsPerEm = r.readShort(), this.created = r.readLongLong(), this.modified = r.readLongLong(), this.xMin = r.readShort(), this.yMin = r.readShort(), this.xMax = r.readShort(), this.yMax = r.readShort(), this.macStyle = r.readShort(), this.lowestRecPPEM = r.readShort(), this.fontDirectionHint = r.readShort(), this.indexToLocFormat = r.readShort(), this.glyphDataFormat = r.readShort();
  }, e.prototype.encode = function(r) {
    var n;
    return (n = new Mn()).writeInt(this.version), n.writeInt(this.revision), n.writeInt(this.checkSumAdjustment), n.writeInt(this.magicNumber), n.writeShort(this.flags), n.writeShort(this.unitsPerEm), n.writeLongLong(this.created), n.writeLongLong(this.modified), n.writeShort(this.xMin), n.writeShort(this.yMin), n.writeShort(this.xMax), n.writeShort(this.yMax), n.writeShort(this.macStyle), n.writeShort(this.lowestRecPPEM), n.writeShort(this.fontDirectionHint), n.writeShort(r), n.writeShort(this.glyphDataFormat), n.data;
  }, e;
}(), Lu = function() {
  function l(e, r) {
    var n, s, a, o, f, c, m, A, b, S, g, B, F, O, I, N, J;
    switch (this.platformID = e.readUInt16(), this.encodingID = e.readShort(), this.offset = r + e.readInt(), b = e.pos, e.pos = this.offset, this.format = e.readUInt16(), this.length = e.readUInt16(), this.language = e.readUInt16(), this.isUnicode = this.platformID === 3 && this.encodingID === 1 && this.format === 4 || this.platformID === 0 && this.format === 4, this.codeMap = {}, this.format) {
      case 0:
        for (c = 0; c < 256; ++c) this.codeMap[c] = e.readByte();
        break;
      case 4:
        for (g = e.readUInt16(), S = g / 2, e.pos += 6, a = function() {
          var et, ct;
          for (ct = [], c = et = 0; 0 <= S ? et < S : et > S; c = 0 <= S ? ++et : --et) ct.push(e.readUInt16());
          return ct;
        }(), e.pos += 2, F = function() {
          var et, ct;
          for (ct = [], c = et = 0; 0 <= S ? et < S : et > S; c = 0 <= S ? ++et : --et) ct.push(e.readUInt16());
          return ct;
        }(), m = function() {
          var et, ct;
          for (ct = [], c = et = 0; 0 <= S ? et < S : et > S; c = 0 <= S ? ++et : --et) ct.push(e.readUInt16());
          return ct;
        }(), A = function() {
          var et, ct;
          for (ct = [], c = et = 0; 0 <= S ? et < S : et > S; c = 0 <= S ? ++et : --et) ct.push(e.readUInt16());
          return ct;
        }(), s = (this.length - e.pos + this.offset) / 2, f = function() {
          var et, ct;
          for (ct = [], c = et = 0; 0 <= s ? et < s : et > s; c = 0 <= s ? ++et : --et) ct.push(e.readUInt16());
          return ct;
        }(), c = I = 0, J = a.length; I < J; c = ++I) for (O = a[c], n = N = B = F[c]; B <= O ? N <= O : N >= O; n = B <= O ? ++N : --N) A[c] === 0 ? o = n + m[c] : (o = f[A[c] / 2 + (n - B) - (S - c)] || 0) !== 0 && (o += m[c]), this.codeMap[n] = 65535 & o;
    }
    e.pos = b;
  }
  return l.encode = function(e, r) {
    var n, s, a, o, f, c, m, A, b, S, g, B, F, O, I, N, J, et, ct, bt, nt, dt, z, at, M, k, D, R, ot, st, ht, X, Nt, rt, xt, E, x, q, U, V, K, ft, it, ut, Lt, jt;
    switch (R = new Mn(), o = Object.keys(e).sort(function(Ft, Rt) {
      return Ft - Rt;
    }), r) {
      case "macroman":
        for (F = 0, O = function() {
          var Ft = [];
          for (B = 0; B < 256; ++B) Ft.push(0);
          return Ft;
        }(), N = {
          0: 0
        }, a = {}, ot = 0, Nt = o.length; ot < Nt; ot++) N[it = e[s = o[ot]]] == null && (N[it] = ++F), a[s] = {
          old: e[s],
          new: N[e[s]]
        }, O[s] = N[e[s]];
        return R.writeUInt16(1), R.writeUInt16(0), R.writeUInt32(12), R.writeUInt16(0), R.writeUInt16(262), R.writeUInt16(0), R.write(O), {
          charMap: a,
          subtable: R.data,
          maxGlyphID: F + 1
        };
      case "unicode":
        for (k = [], b = [], J = 0, N = {}, n = {}, I = m = null, st = 0, rt = o.length; st < rt; st++) N[ct = e[s = o[st]]] == null && (N[ct] = ++J), n[s] = {
          old: ct,
          new: N[ct]
        }, f = N[ct] - s, I != null && f === m || (I && b.push(I), k.push(s), m = f), I = s;
        for (I && b.push(I), b.push(65535), k.push(65535), at = 2 * (z = k.length), dt = 2 * Math.pow(Math.log(z) / Math.LN2, 2), S = Math.log(dt / 2) / Math.LN2, nt = 2 * z - dt, c = [], bt = [], g = [], B = ht = 0, xt = k.length; ht < xt; B = ++ht) {
          if (M = k[B], A = b[B], M === 65535) {
            c.push(0), bt.push(0);
            break;
          }
          if (M - (D = n[M].new) >= 32768) for (c.push(0), bt.push(2 * (g.length + z - B)), s = X = M; M <= A ? X <= A : X >= A; s = M <= A ? ++X : --X) g.push(n[s].new);
          else c.push(D - M), bt.push(0);
        }
        for (R.writeUInt16(3), R.writeUInt16(1), R.writeUInt32(12), R.writeUInt16(4), R.writeUInt16(16 + 8 * z + 2 * g.length), R.writeUInt16(0), R.writeUInt16(at), R.writeUInt16(dt), R.writeUInt16(S), R.writeUInt16(nt), K = 0, E = b.length; K < E; K++) s = b[K], R.writeUInt16(s);
        for (R.writeUInt16(0), ft = 0, x = k.length; ft < x; ft++) s = k[ft], R.writeUInt16(s);
        for (ut = 0, q = c.length; ut < q; ut++) f = c[ut], R.writeUInt16(f);
        for (Lt = 0, U = bt.length; Lt < U; Lt++) et = bt[Lt], R.writeUInt16(et);
        for (jt = 0, V = g.length; jt < V; jt++) F = g[jt], R.writeUInt16(F);
        return {
          charMap: n,
          subtable: R.data,
          maxGlyphID: J + 1
        };
    }
  }, l;
}(), Uu = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "cmap", e.prototype.parse = function(r) {
    var n, s, a;
    for (r.pos = this.offset, this.version = r.readUInt16(), a = r.readUInt16(), this.tables = [], this.unicode = null, s = 0; 0 <= a ? s < a : s > a; s = 0 <= a ? ++s : --s) n = new Lu(r, this.offset), this.tables.push(n), n.isUnicode && this.unicode == null && (this.unicode = n);
    return !0;
  }, e.encode = function(r, n) {
    var s, a;
    return n == null && (n = "macroman"), s = Lu.encode(r, n), (a = new Mn()).writeUInt16(0), a.writeUInt16(1), s.table = a.data.concat(s.subtable), s;
  }, e;
}(), dc = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "hhea", e.prototype.parse = function(r) {
    return r.pos = this.offset, this.version = r.readInt(), this.ascender = r.readShort(), this.decender = r.readShort(), this.lineGap = r.readShort(), this.advanceWidthMax = r.readShort(), this.minLeftSideBearing = r.readShort(), this.minRightSideBearing = r.readShort(), this.xMaxExtent = r.readShort(), this.caretSlopeRise = r.readShort(), this.caretSlopeRun = r.readShort(), this.caretOffset = r.readShort(), r.pos += 8, this.metricDataFormat = r.readShort(), this.numberOfMetrics = r.readUInt16();
  }, e;
}(), pc = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "OS/2", e.prototype.parse = function(r) {
    if (r.pos = this.offset, this.version = r.readUInt16(), this.averageCharWidth = r.readShort(), this.weightClass = r.readUInt16(), this.widthClass = r.readUInt16(), this.type = r.readShort(), this.ySubscriptXSize = r.readShort(), this.ySubscriptYSize = r.readShort(), this.ySubscriptXOffset = r.readShort(), this.ySubscriptYOffset = r.readShort(), this.ySuperscriptXSize = r.readShort(), this.ySuperscriptYSize = r.readShort(), this.ySuperscriptXOffset = r.readShort(), this.ySuperscriptYOffset = r.readShort(), this.yStrikeoutSize = r.readShort(), this.yStrikeoutPosition = r.readShort(), this.familyClass = r.readShort(), this.panose = function() {
      var n, s;
      for (s = [], n = 0; n < 10; ++n) s.push(r.readByte());
      return s;
    }(), this.charRange = function() {
      var n, s;
      for (s = [], n = 0; n < 4; ++n) s.push(r.readInt());
      return s;
    }(), this.vendorID = r.readString(4), this.selection = r.readShort(), this.firstCharIndex = r.readShort(), this.lastCharIndex = r.readShort(), this.version > 0 && (this.ascent = r.readShort(), this.descent = r.readShort(), this.lineGap = r.readShort(), this.winAscent = r.readShort(), this.winDescent = r.readShort(), this.codePageRange = function() {
      var n, s;
      for (s = [], n = 0; n < 2; n = ++n) s.push(r.readInt());
      return s;
    }(), this.version > 1)) return this.xHeight = r.readShort(), this.capHeight = r.readShort(), this.defaultChar = r.readShort(), this.breakChar = r.readShort(), this.maxContext = r.readShort();
  }, e;
}(), gc = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "post", e.prototype.parse = function(r) {
    var n, s, a;
    switch (r.pos = this.offset, this.format = r.readInt(), this.italicAngle = r.readInt(), this.underlinePosition = r.readShort(), this.underlineThickness = r.readShort(), this.isFixedPitch = r.readInt(), this.minMemType42 = r.readInt(), this.maxMemType42 = r.readInt(), this.minMemType1 = r.readInt(), this.maxMemType1 = r.readInt(), this.format) {
      case 65536:
        break;
      case 131072:
        var o;
        for (s = r.readUInt16(), this.glyphNameIndex = [], o = 0; 0 <= s ? o < s : o > s; o = 0 <= s ? ++o : --o) this.glyphNameIndex.push(r.readUInt16());
        for (this.names = [], a = []; r.pos < this.offset + this.length; ) n = r.readByte(), a.push(this.names.push(r.readString(n)));
        return a;
      case 151552:
        return s = r.readUInt16(), this.offsets = r.read(s);
      case 196608:
        break;
      case 262144:
        return this.map = function() {
          var f, c, m;
          for (m = [], o = f = 0, c = this.file.maxp.numGlyphs; 0 <= c ? f < c : f > c; o = 0 <= c ? ++f : --f) m.push(r.readUInt32());
          return m;
        }.call(this);
    }
  }, e;
}(), mc = function(e, r) {
  this.raw = e, this.length = e.length, this.platformID = r.platformID, this.encodingID = r.encodingID, this.languageID = r.languageID;
}, vc = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "name", e.prototype.parse = function(r) {
    var n, s, a, o, f, c, m, A, b, S, g;
    for (r.pos = this.offset, r.readShort(), n = r.readShort(), c = r.readShort(), s = [], o = 0; 0 <= n ? o < n : o > n; o = 0 <= n ? ++o : --o) s.push({
      platformID: r.readShort(),
      encodingID: r.readShort(),
      languageID: r.readShort(),
      nameID: r.readShort(),
      length: r.readShort(),
      offset: this.offset + c + r.readShort()
    });
    for (m = {}, o = b = 0, S = s.length; b < S; o = ++b) a = s[o], r.pos = a.offset, A = r.readString(a.length), f = new mc(A, a), m[g = a.nameID] == null && (m[g] = []), m[a.nameID].push(f);
    this.strings = m, this.copyright = m[0], this.fontFamily = m[1], this.fontSubfamily = m[2], this.uniqueSubfamily = m[3], this.fontName = m[4], this.version = m[5];
    try {
      this.postscriptName = m[6][0].raw.replace(/[\x00-\x19\x80-\xff]/g, "");
    } catch (B) {
      this.postscriptName = m[4][0].raw.replace(/[\x00-\x19\x80-\xff]/g, "");
    }
    return this.trademark = m[7], this.manufacturer = m[8], this.designer = m[9], this.description = m[10], this.vendorUrl = m[11], this.designerUrl = m[12], this.license = m[13], this.licenseUrl = m[14], this.preferredFamily = m[15], this.preferredSubfamily = m[17], this.compatibleFull = m[18], this.sampleText = m[19];
  }, e;
}(), bc = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "maxp", e.prototype.parse = function(r) {
    return r.pos = this.offset, this.version = r.readInt(), this.numGlyphs = r.readUInt16(), this.maxPoints = r.readUInt16(), this.maxContours = r.readUInt16(), this.maxCompositePoints = r.readUInt16(), this.maxComponentContours = r.readUInt16(), this.maxZones = r.readUInt16(), this.maxTwilightPoints = r.readUInt16(), this.maxStorage = r.readUInt16(), this.maxFunctionDefs = r.readUInt16(), this.maxInstructionDefs = r.readUInt16(), this.maxStackElements = r.readUInt16(), this.maxSizeOfInstructions = r.readUInt16(), this.maxComponentElements = r.readUInt16(), this.maxComponentDepth = r.readUInt16();
  }, e;
}(), yc = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "hmtx", e.prototype.parse = function(r) {
    var n, s, a, o, f, c, m;
    for (r.pos = this.offset, this.metrics = [], n = 0, c = this.file.hhea.numberOfMetrics; 0 <= c ? n < c : n > c; n = 0 <= c ? ++n : --n) this.metrics.push({
      advance: r.readUInt16(),
      lsb: r.readInt16()
    });
    for (a = this.file.maxp.numGlyphs - this.file.hhea.numberOfMetrics, this.leftSideBearings = function() {
      var A, b;
      for (b = [], n = A = 0; 0 <= a ? A < a : A > a; n = 0 <= a ? ++A : --A) b.push(r.readInt16());
      return b;
    }(), this.widths = function() {
      var A, b, S, g;
      for (g = [], A = 0, b = (S = this.metrics).length; A < b; A++) o = S[A], g.push(o.advance);
      return g;
    }.call(this), s = this.widths[this.widths.length - 1], m = [], n = f = 0; 0 <= a ? f < a : f > a; n = 0 <= a ? ++f : --f) m.push(this.widths.push(s));
    return m;
  }, e.prototype.forGlyph = function(r) {
    return r in this.metrics ? this.metrics[r] : {
      advance: this.metrics[this.metrics.length - 1].advance,
      lsb: this.leftSideBearings[r - this.metrics.length]
    };
  }, e;
}(), Hu = [].slice, wc = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "glyf", e.prototype.parse = function() {
    return this.cache = {};
  }, e.prototype.glyphFor = function(r) {
    var n, s, a, o, f, c, m, A, b, S;
    return r in this.cache ? this.cache[r] : (o = this.file.loca, n = this.file.contents, s = o.indexOf(r), (a = o.lengthOf(r)) === 0 ? this.cache[r] = null : (n.pos = this.offset + s, f = (c = new Mn(n.read(a))).readShort(), A = c.readShort(), S = c.readShort(), m = c.readShort(), b = c.readShort(), this.cache[r] = f === -1 ? new Lc(c, A, S, m, b) : new Nc(c, f, A, S, m, b), this.cache[r]));
  }, e.prototype.encode = function(r, n, s) {
    var a, o, f, c, m;
    for (f = [], o = [], c = 0, m = n.length; c < m; c++) a = r[n[c]], o.push(f.length), a && (f = f.concat(a.encode(s)));
    return o.push(f.length), {
      table: f,
      offsets: o
    };
  }, e;
}(), Nc = function() {
  function l(e, r, n, s, a, o) {
    this.raw = e, this.numberOfContours = r, this.xMin = n, this.yMin = s, this.xMax = a, this.yMax = o, this.compound = !1;
  }
  return l.prototype.encode = function() {
    return this.raw.data;
  }, l;
}(), Lc = function() {
  function l(e, r, n, s, a) {
    var o, f;
    for (this.raw = e, this.xMin = r, this.yMin = n, this.xMax = s, this.yMax = a, this.compound = !0, this.glyphIDs = [], this.glyphOffsets = [], o = this.raw; f = o.readShort(), this.glyphOffsets.push(o.pos), this.glyphIDs.push(o.readUInt16()), 32 & f; ) o.pos += 1 & f ? 4 : 2, 128 & f ? o.pos += 8 : 64 & f ? o.pos += 4 : 8 & f && (o.pos += 2);
  }
  return l.prototype.encode = function() {
    var e, r, n;
    for (r = new Mn(Hu.call(this.raw.data)), e = 0, n = this.glyphIDs.length; e < n; ++e) r.pos = this.glyphOffsets[e];
    return r.data;
  }, l;
}(), Ac = function(l) {
  function e() {
    return e.__super__.constructor.apply(this, arguments);
  }
  return rn(e, Rr), e.prototype.tag = "loca", e.prototype.parse = function(r) {
    var n, s;
    return r.pos = this.offset, n = this.file.head.indexToLocFormat, this.offsets = n === 0 ? function() {
      var a, o;
      for (o = [], s = 0, a = this.length; s < a; s += 2) o.push(2 * r.readUInt16());
      return o;
    }.call(this) : function() {
      var a, o;
      for (o = [], s = 0, a = this.length; s < a; s += 4) o.push(r.readUInt32());
      return o;
    }.call(this);
  }, e.prototype.indexOf = function(r) {
    return this.offsets[r];
  }, e.prototype.lengthOf = function(r) {
    return this.offsets[r + 1] - this.offsets[r];
  }, e.prototype.encode = function(r, n) {
    for (var s = new Uint32Array(this.offsets.length), a = 0, o = 0, f = 0; f < s.length; ++f) if (s[f] = a, o < n.length && n[o] == f) {
      ++o, s[f] = a;
      var c = this.offsets[f], m = this.offsets[f + 1] - c;
      m > 0 && (a += m);
    }
    for (var A = new Array(4 * s.length), b = 0; b < s.length; ++b) A[4 * b + 3] = 255 & s[b], A[4 * b + 2] = (65280 & s[b]) >> 8, A[4 * b + 1] = (16711680 & s[b]) >> 16, A[4 * b] = (4278190080 & s[b]) >> 24;
    return A;
  }, e;
}(), xc = function() {
  function l(e) {
    this.font = e, this.subset = {}, this.unicodes = {}, this.next = 33;
  }
  return l.prototype.generateCmap = function() {
    var e, r, n, s, a;
    for (r in s = this.font.cmap.tables[0].codeMap, e = {}, a = this.subset) n = a[r], e[r] = s[n];
    return e;
  }, l.prototype.glyphsFor = function(e) {
    var r, n, s, a, o, f, c;
    for (s = {}, o = 0, f = e.length; o < f; o++) s[a = e[o]] = this.font.glyf.glyphFor(a);
    for (a in r = [], s) (n = s[a]) != null && n.compound && r.push.apply(r, n.glyphIDs);
    if (r.length > 0) for (a in c = this.glyphsFor(r)) n = c[a], s[a] = n;
    return s;
  }, l.prototype.encode = function(e, r) {
    var n, s, a, o, f, c, m, A, b, S, g, B, F, O, I;
    for (s in n = Uu.encode(this.generateCmap(), "unicode"), o = this.glyphsFor(e), g = {
      0: 0
    }, I = n.charMap) g[(c = I[s]).old] = c.new;
    for (B in S = n.maxGlyphID, o) B in g || (g[B] = S++);
    return A = function(N) {
      var J, et;
      for (J in et = {}, N) et[N[J]] = J;
      return et;
    }(g), b = Object.keys(A).sort(function(N, J) {
      return N - J;
    }), F = function() {
      var N, J, et;
      for (et = [], N = 0, J = b.length; N < J; N++) f = b[N], et.push(A[f]);
      return et;
    }(), a = this.font.glyf.encode(o, F, g), m = this.font.loca.encode(a.offsets, F), O = {
      cmap: this.font.cmap.raw(),
      glyf: a.table,
      loca: m,
      hmtx: this.font.hmtx.raw(),
      hhea: this.font.hhea.raw(),
      maxp: this.font.maxp.raw(),
      post: this.font.post.raw(),
      name: this.font.name.raw(),
      head: this.font.head.encode(r)
    }, this.font.os2.exists && (O["OS/2"] = this.font.os2.raw()), this.font.directory.encode(O);
  }, l;
}();
Wt.API.PDFObject = function() {
  var l;
  function e() {
  }
  return l = function(n, s) {
    return (Array(s + 1).join("0") + n).slice(-s);
  }, e.convert = function(r) {
    var n, s, a, o;
    if (Array.isArray(r)) return "[" + function() {
      var f, c, m;
      for (m = [], f = 0, c = r.length; f < c; f++) n = r[f], m.push(e.convert(n));
      return m;
    }().join(" ") + "]";
    if (typeof r == "string") return "/" + r;
    if (r != null && r.isString) return "(" + r + ")";
    if (r instanceof Date) return "(D:" + l(r.getUTCFullYear(), 4) + l(r.getUTCMonth(), 2) + l(r.getUTCDate(), 2) + l(r.getUTCHours(), 2) + l(r.getUTCMinutes(), 2) + l(r.getUTCSeconds(), 2) + "Z)";
    if ({}.toString.call(r) === "[object Object]") {
      for (s in a = ["<<"], r) o = r[s], a.push("/" + s + " " + e.convert(o));
      return a.push(">>"), a.join(`
`);
    }
    return "" + r;
  }, e;
}();
const Sc = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AcroForm: rc,
  AcroFormAppearance: Et,
  AcroFormButton: Te,
  AcroFormCheckBox: ha,
  AcroFormChoiceField: ei,
  AcroFormComboBox: ni,
  AcroFormEditBox: la,
  AcroFormListBox: ri,
  AcroFormPasswordField: fa,
  AcroFormPushButton: ca,
  AcroFormRadioButton: ii,
  AcroFormTextField: On,
  GState: pa,
  ShadingPattern: Cn,
  TilingPattern: ti,
  default: Wt,
  jsPDF: Wt
}, Symbol.toStringTag, { value: "Module" }));
export {
  fe as _,
  Sc as j
};
//# sourceMappingURL=jspdf.es.min-5bdvrvjk.js.map
