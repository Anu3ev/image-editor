import { c as Ma, g as Zu } from "./main-C-4719Cz.js";
import { _ as qa } from "./jspdf.es.min-5bdvrvjk.js";
var un = {}, ln = {}, fr, hn;
function J() {
  if (hn) return fr;
  hn = 1;
  var n = function(r) {
    return r && r.Math === Math && r;
  };
  return fr = // eslint-disable-next-line es/no-global-this -- safe
  n(typeof globalThis == "object" && globalThis) || n(typeof window == "object" && window) || // eslint-disable-next-line no-restricted-globals -- safe
  n(typeof self == "object" && self) || n(typeof Ma == "object" && Ma) || n(typeof fr == "object" && fr) || // eslint-disable-next-line no-new-func -- fallback
  /* @__PURE__ */ function() {
    return this;
  }() || Function("return this")(), fr;
}
var Qr = {}, Zr, fn;
function re() {
  return fn || (fn = 1, Zr = function(n) {
    try {
      return !!n();
    } catch (e) {
      return !0;
    }
  }), Zr;
}
var Jr, cn;
function we() {
  if (cn) return Jr;
  cn = 1;
  var n = re();
  return Jr = !n(function() {
    return Object.defineProperty({}, 1, {
      get: function() {
        return 7;
      }
    })[1] !== 7;
  }), Jr;
}
var et, vn;
function Ir() {
  if (vn) return et;
  vn = 1;
  var n = re();
  return et = !n(function() {
    var e = function() {
    }.bind();
    return typeof e != "function" || e.hasOwnProperty("prototype");
  }), et;
}
var rt, gn;
function oe() {
  if (gn) return rt;
  gn = 1;
  var n = Ir(), e = Function.prototype.call;
  return rt = n ? e.bind(e) : function() {
    return e.apply(e, arguments);
  }, rt;
}
var tt = {}, dn;
function Gl() {
  if (dn) return tt;
  dn = 1;
  var n = {}.propertyIsEnumerable, e = Object.getOwnPropertyDescriptor, r = e && !n.call({
    1: 2
  }, 1);
  return tt.f = r ? function(i) {
    var a = e(this, i);
    return !!a && a.enumerable;
  } : n, tt;
}
var it, pn;
function ja() {
  return pn || (pn = 1, it = function(n, e) {
    return {
      enumerable: !(n & 1),
      configurable: !(n & 2),
      writable: !(n & 4),
      value: e
    };
  }), it;
}
var at, yn;
function te() {
  if (yn) return at;
  yn = 1;
  var n = Ir(), e = Function.prototype, r = e.call, t = n && e.bind.bind(r, r);
  return at = n ? t : function(i) {
    return function() {
      return r.apply(i, arguments);
    };
  }, at;
}
var nt, mn;
function Ze() {
  if (mn) return nt;
  mn = 1;
  var n = te(), e = n({}.toString), r = n("".slice);
  return nt = function(t) {
    return r(e(t), 8, -1);
  }, nt;
}
var st, bn;
function Ju() {
  if (bn) return st;
  bn = 1;
  var n = te(), e = re(), r = Ze(), t = Object, i = n("".split);
  return st = e(function() {
    return !t("z").propertyIsEnumerable(0);
  }) ? function(a) {
    return r(a) === "String" ? i(a, "") : t(a);
  } : t, st;
}
var ot, xn;
function Je() {
  return xn || (xn = 1, ot = function(n) {
    return n == null;
  }), ot;
}
var ut, On;
function Pe() {
  if (On) return ut;
  On = 1;
  var n = Je(), e = TypeError;
  return ut = function(r) {
    if (n(r)) throw new e("Can't call method on " + r);
    return r;
  }, ut;
}
var lt, Tn;
function gr() {
  if (Tn) return lt;
  Tn = 1;
  var n = Ju(), e = Pe();
  return lt = function(r) {
    return n(e(r));
  }, lt;
}
var ht, Sn;
function ie() {
  if (Sn) return ht;
  Sn = 1;
  var n = typeof document == "object" && document.all;
  return ht = typeof n == "undefined" && n !== void 0 ? function(e) {
    return typeof e == "function" || e === n;
  } : function(e) {
    return typeof e == "function";
  }, ht;
}
var ft, En;
function Ae() {
  if (En) return ft;
  En = 1;
  var n = ie();
  return ft = function(e) {
    return typeof e == "object" ? e !== null : n(e);
  }, ft;
}
var ct, Rn;
function er() {
  if (Rn) return ct;
  Rn = 1;
  var n = J(), e = ie(), r = function(i) {
    return e(i) ? i : void 0;
  };
  return ct = function(t, i) {
    return arguments.length < 2 ? r(n[t]) : n[t] && n[t][i];
  }, ct;
}
var vt, Cn;
function Nr() {
  if (Cn) return vt;
  Cn = 1;
  var n = te();
  return vt = n({}.isPrototypeOf), vt;
}
var gt, wn;
function dr() {
  if (wn) return gt;
  wn = 1;
  var n = J(), e = n.navigator, r = e && e.userAgent;
  return gt = r ? String(r) : "", gt;
}
var dt, Pn;
function Ba() {
  if (Pn) return dt;
  Pn = 1;
  var n = J(), e = dr(), r = n.process, t = n.Deno, i = r && r.versions || t && t.version, a = i && i.v8, s, o;
  return a && (s = a.split("."), o = s[0] > 0 && s[0] < 4 ? 1 : +(s[0] + s[1])), !o && e && (s = e.match(/Edge\/(\d+)/), (!s || s[1] >= 74) && (s = e.match(/Chrome\/(\d+)/), s && (o = +s[1]))), dt = o, dt;
}
var pt, An;
function el() {
  if (An) return pt;
  An = 1;
  var n = Ba(), e = re(), r = J(), t = r.String;
  return pt = !!Object.getOwnPropertySymbols && !e(function() {
    var i = Symbol("symbol detection");
    return !t(i) || !(Object(i) instanceof Symbol) || // Chrome 38-40 symbols are not inherited from DOM collections prototypes to instances
    !Symbol.sham && n && n < 41;
  }), pt;
}
var yt, In;
function rl() {
  if (In) return yt;
  In = 1;
  var n = el();
  return yt = n && !Symbol.sham && typeof Symbol.iterator == "symbol", yt;
}
var mt, Nn;
function tl() {
  if (Nn) return mt;
  Nn = 1;
  var n = er(), e = ie(), r = Nr(), t = rl(), i = Object;
  return mt = t ? function(a) {
    return typeof a == "symbol";
  } : function(a) {
    var s = n("Symbol");
    return e(s) && r(s.prototype, i(a));
  }, mt;
}
var bt, _n;
function _r() {
  if (_n) return bt;
  _n = 1;
  var n = String;
  return bt = function(e) {
    try {
      return n(e);
    } catch (r) {
      return "Object";
    }
  }, bt;
}
var xt, Mn;
function Ue() {
  if (Mn) return xt;
  Mn = 1;
  var n = ie(), e = _r(), r = TypeError;
  return xt = function(t) {
    if (n(t)) return t;
    throw new r(e(t) + " is not a function");
  }, xt;
}
var Ot, qn;
function ar() {
  if (qn) return Ot;
  qn = 1;
  var n = Ue(), e = Je();
  return Ot = function(r, t) {
    var i = r[t];
    return e(i) ? void 0 : n(i);
  }, Ot;
}
var Tt, Dn;
function $l() {
  if (Dn) return Tt;
  Dn = 1;
  var n = oe(), e = ie(), r = Ae(), t = TypeError;
  return Tt = function(i, a) {
    var s, o;
    if (a === "string" && e(s = i.toString) && !r(o = n(s, i)) || e(s = i.valueOf) && !r(o = n(s, i)) || a !== "string" && e(s = i.toString) && !r(o = n(s, i))) return o;
    throw new t("Can't convert object to primitive value");
  }, Tt;
}
var St = { exports: {} }, Et, Vn;
function De() {
  return Vn || (Vn = 1, Et = !1), Et;
}
var Rt, kn;
function Fa() {
  if (kn) return Rt;
  kn = 1;
  var n = J(), e = Object.defineProperty;
  return Rt = function(r, t) {
    try {
      e(n, r, {
        value: t,
        configurable: !0,
        writable: !0
      });
    } catch (i) {
      n[r] = t;
    }
    return t;
  }, Rt;
}
var Ln;
function Ua() {
  if (Ln) return St.exports;
  Ln = 1;
  var n = De(), e = J(), r = Fa(), t = "__core-js_shared__", i = St.exports = e[t] || r(t, {});
  return (i.versions || (i.versions = [])).push({
    version: "3.41.0",
    mode: n ? "pure" : "global",
    copyright: "© 2014-2025 Denis Pushkarev (zloirock.ru)",
    license: "https://github.com/zloirock/core-js/blob/v3.41.0/LICENSE",
    source: "https://github.com/zloirock/core-js"
  }), St.exports;
}
var Ct, jn;
function Ga() {
  if (jn) return Ct;
  jn = 1;
  var n = Ua();
  return Ct = function(e, r) {
    return n[e] || (n[e] = r || {});
  }, Ct;
}
var wt, Bn;
function Mr() {
  if (Bn) return wt;
  Bn = 1;
  var n = Pe(), e = Object;
  return wt = function(r) {
    return e(n(r));
  }, wt;
}
var Pt, Fn;
function Ie() {
  if (Fn) return Pt;
  Fn = 1;
  var n = te(), e = Mr(), r = n({}.hasOwnProperty);
  return Pt = Object.hasOwn || function(i, a) {
    return r(e(i), a);
  }, Pt;
}
var At, Un;
function il() {
  if (Un) return At;
  Un = 1;
  var n = te(), e = 0, r = Math.random(), t = n(1 .toString);
  return At = function(i) {
    return "Symbol(" + (i === void 0 ? "" : i) + ")_" + t(++e + r, 36);
  }, At;
}
var It, Gn;
function se() {
  if (Gn) return It;
  Gn = 1;
  var n = J(), e = Ga(), r = Ie(), t = il(), i = el(), a = rl(), s = n.Symbol, o = e("wks"), u = a ? s.for || s : s && s.withoutSetter || t;
  return It = function(l) {
    return r(o, l) || (o[l] = i && r(s, l) ? s[l] : u("Symbol." + l)), o[l];
  }, It;
}
var Nt, $n;
function Hl() {
  if ($n) return Nt;
  $n = 1;
  var n = oe(), e = Ae(), r = tl(), t = ar(), i = $l(), a = se(), s = TypeError, o = a("toPrimitive");
  return Nt = function(u, l) {
    if (!e(u) || r(u)) return u;
    var h = t(u, o), c;
    if (h) {
      if (l === void 0 && (l = "default"), c = n(h, u, l), !e(c) || r(c)) return c;
      throw new s("Can't convert object to primitive value");
    }
    return l === void 0 && (l = "number"), i(u, l);
  }, Nt;
}
var _t, Hn;
function al() {
  if (Hn) return _t;
  Hn = 1;
  var n = Hl(), e = tl();
  return _t = function(r) {
    var t = n(r, "string");
    return e(t) ? t : t + "";
  }, _t;
}
var Mt, zn;
function qr() {
  if (zn) return Mt;
  zn = 1;
  var n = J(), e = Ae(), r = n.document, t = e(r) && e(r.createElement);
  return Mt = function(i) {
    return t ? r.createElement(i) : {};
  }, Mt;
}
var qt, Wn;
function nl() {
  if (Wn) return qt;
  Wn = 1;
  var n = we(), e = re(), r = qr();
  return qt = !n && !e(function() {
    return Object.defineProperty(r("div"), "a", {
      get: function() {
        return 7;
      }
    }).a !== 7;
  }), qt;
}
var Yn;
function Dr() {
  if (Yn) return Qr;
  Yn = 1;
  var n = we(), e = oe(), r = Gl(), t = ja(), i = gr(), a = al(), s = Ie(), o = nl(), u = Object.getOwnPropertyDescriptor;
  return Qr.f = n ? u : function(h, c) {
    if (h = i(h), c = a(c), o) try {
      return u(h, c);
    } catch (v) {
    }
    if (s(h, c)) return t(!e(r.f, h, c), h[c]);
  }, Qr;
}
var Dt = {}, Vt, Xn;
function sl() {
  if (Xn) return Vt;
  Xn = 1;
  var n = we(), e = re();
  return Vt = n && e(function() {
    return Object.defineProperty(function() {
    }, "prototype", {
      value: 42,
      writable: !1
    }).prototype !== 42;
  }), Vt;
}
var kt, Kn;
function le() {
  if (Kn) return kt;
  Kn = 1;
  var n = Ae(), e = String, r = TypeError;
  return kt = function(t) {
    if (n(t)) return t;
    throw new r(e(t) + " is not an object");
  }, kt;
}
var Qn;
function We() {
  if (Qn) return Dt;
  Qn = 1;
  var n = we(), e = nl(), r = sl(), t = le(), i = al(), a = TypeError, s = Object.defineProperty, o = Object.getOwnPropertyDescriptor, u = "enumerable", l = "configurable", h = "writable";
  return Dt.f = n ? r ? function(v, f, g) {
    if (t(v), f = i(f), t(g), typeof v == "function" && f === "prototype" && "value" in g && h in g && !g[h]) {
      var d = o(v, f);
      d && d[h] && (v[f] = g.value, g = {
        configurable: l in g ? g[l] : d[l],
        enumerable: u in g ? g[u] : d[u],
        writable: !1
      });
    }
    return s(v, f, g);
  } : s : function(v, f, g) {
    if (t(v), f = i(f), t(g), e) try {
      return s(v, f, g);
    } catch (d) {
    }
    if ("get" in g || "set" in g) throw new a("Accessors not supported");
    return "value" in g && (v[f] = g.value), v;
  }, Dt;
}
var Lt, Zn;
function pr() {
  if (Zn) return Lt;
  Zn = 1;
  var n = we(), e = We(), r = ja();
  return Lt = n ? function(t, i, a) {
    return e.f(t, i, r(1, a));
  } : function(t, i, a) {
    return t[i] = a, t;
  }, Lt;
}
var jt = { exports: {} }, Bt, Jn;
function Vr() {
  if (Jn) return Bt;
  Jn = 1;
  var n = we(), e = Ie(), r = Function.prototype, t = n && Object.getOwnPropertyDescriptor, i = e(r, "name"), a = i && function() {
  }.name === "something", s = i && (!n || n && t(r, "name").configurable);
  return Bt = {
    EXISTS: i,
    PROPER: a,
    CONFIGURABLE: s
  }, Bt;
}
var Ft, es;
function $a() {
  if (es) return Ft;
  es = 1;
  var n = te(), e = ie(), r = Ua(), t = n(Function.toString);
  return e(r.inspectSource) || (r.inspectSource = function(i) {
    return t(i);
  }), Ft = r.inspectSource, Ft;
}
var Ut, rs;
function zl() {
  if (rs) return Ut;
  rs = 1;
  var n = J(), e = ie(), r = n.WeakMap;
  return Ut = e(r) && /native code/.test(String(r)), Ut;
}
var Gt, ts;
function Ha() {
  if (ts) return Gt;
  ts = 1;
  var n = Ga(), e = il(), r = n("keys");
  return Gt = function(t) {
    return r[t] || (r[t] = e(t));
  }, Gt;
}
var $t, is;
function za() {
  return is || (is = 1, $t = {}), $t;
}
var Ht, as;
function kr() {
  if (as) return Ht;
  as = 1;
  var n = zl(), e = J(), r = Ae(), t = pr(), i = Ie(), a = Ua(), s = Ha(), o = za(), u = "Object already initialized", l = e.TypeError, h = e.WeakMap, c, v, f, g = function(y) {
    return f(y) ? v(y) : c(y, {});
  }, d = function(y) {
    return function(b) {
      var T;
      if (!r(b) || (T = v(b)).type !== y)
        throw new l("Incompatible receiver, " + y + " required");
      return T;
    };
  };
  if (n || a.state) {
    var p = a.state || (a.state = new h());
    p.get = p.get, p.has = p.has, p.set = p.set, c = function(y, b) {
      if (p.has(y)) throw new l(u);
      return b.facade = y, p.set(y, b), b;
    }, v = function(y) {
      return p.get(y) || {};
    }, f = function(y) {
      return p.has(y);
    };
  } else {
    var m = s("state");
    o[m] = !0, c = function(y, b) {
      if (i(y, m)) throw new l(u);
      return b.facade = y, t(y, m, b), b;
    }, v = function(y) {
      return i(y, m) ? y[m] : {};
    }, f = function(y) {
      return i(y, m);
    };
  }
  return Ht = {
    set: c,
    get: v,
    has: f,
    enforce: g,
    getterFor: d
  }, Ht;
}
var ns;
function ol() {
  if (ns) return jt.exports;
  ns = 1;
  var n = te(), e = re(), r = ie(), t = Ie(), i = we(), a = Vr().CONFIGURABLE, s = $a(), o = kr(), u = o.enforce, l = o.get, h = String, c = Object.defineProperty, v = n("".slice), f = n("".replace), g = n([].join), d = i && !e(function() {
    return c(function() {
    }, "length", {
      value: 8
    }).length !== 8;
  }), p = String(String).split("String"), m = jt.exports = function(x, y, b) {
    v(h(y), 0, 7) === "Symbol(" && (y = "[" + f(h(y), /^Symbol\(([^)]*)\).*$/, "$1") + "]"), b && b.getter && (y = "get " + y), b && b.setter && (y = "set " + y), (!t(x, "name") || a && x.name !== y) && (i ? c(x, "name", {
      value: y,
      configurable: !0
    }) : x.name = y), d && b && t(b, "arity") && x.length !== b.arity && c(x, "length", {
      value: b.arity
    });
    try {
      b && t(b, "constructor") && b.constructor ? i && c(x, "prototype", {
        writable: !1
      }) : x.prototype && (x.prototype = void 0);
    } catch (E) {
    }
    var T = u(x);
    return t(T, "source") || (T.source = g(p, typeof y == "string" ? y : "")), x;
  };
  return Function.prototype.toString = m(function() {
    return r(this) && l(this).source || s(this);
  }, "toString"), jt.exports;
}
var zt, ss;
function rr() {
  if (ss) return zt;
  ss = 1;
  var n = ie(), e = We(), r = ol(), t = Fa();
  return zt = function(i, a, s, o) {
    o || (o = {});
    var u = o.enumerable, l = o.name !== void 0 ? o.name : a;
    if (n(s) && r(s, l, o), o.global)
      u ? i[a] = s : t(a, s);
    else {
      try {
        o.unsafe ? i[a] && (u = !0) : delete i[a];
      } catch (h) {
      }
      u ? i[a] = s : e.f(i, a, {
        value: s,
        enumerable: !1,
        configurable: !o.nonConfigurable,
        writable: !o.nonWritable
      });
    }
    return i;
  }, zt;
}
var Wt = {}, Yt, os;
function Wl() {
  if (os) return Yt;
  os = 1;
  var n = Math.ceil, e = Math.floor;
  return Yt = Math.trunc || function(t) {
    var i = +t;
    return (i > 0 ? e : n)(i);
  }, Yt;
}
var Xt, us;
function Lr() {
  if (us) return Xt;
  us = 1;
  var n = Wl();
  return Xt = function(e) {
    var r = +e;
    return r !== r || r === 0 ? 0 : n(r);
  }, Xt;
}
var Kt, ls;
function Yl() {
  if (ls) return Kt;
  ls = 1;
  var n = Lr(), e = Math.max, r = Math.min;
  return Kt = function(t, i) {
    var a = n(t);
    return a < 0 ? e(a + i, 0) : r(a, i);
  }, Kt;
}
var Qt, hs;
function nr() {
  if (hs) return Qt;
  hs = 1;
  var n = Lr(), e = Math.min;
  return Qt = function(r) {
    var t = n(r);
    return t > 0 ? e(t, 9007199254740991) : 0;
  }, Qt;
}
var Zt, fs;
function Wa() {
  if (fs) return Zt;
  fs = 1;
  var n = nr();
  return Zt = function(e) {
    return n(e.length);
  }, Zt;
}
var Jt, cs;
function ul() {
  if (cs) return Jt;
  cs = 1;
  var n = gr(), e = Yl(), r = Wa(), t = function(a) {
    return function(s, o, u) {
      var l = n(s), h = r(l);
      if (h === 0) return !a && -1;
      var c = e(u, h), v;
      if (a && o !== o) {
        for (; h > c; )
          if (v = l[c++], v !== v) return !0;
      } else for (; h > c; c++)
        if ((a || c in l) && l[c] === o) return a || c || 0;
      return !a && -1;
    };
  };
  return Jt = {
    // `Array.prototype.includes` method
    // https://tc39.es/ecma262/#sec-array.prototype.includes
    includes: t(!0),
    // `Array.prototype.indexOf` method
    // https://tc39.es/ecma262/#sec-array.prototype.indexof
    indexOf: t(!1)
  }, Jt;
}
var ei, vs;
function ll() {
  if (vs) return ei;
  vs = 1;
  var n = te(), e = Ie(), r = gr(), t = ul().indexOf, i = za(), a = n([].push);
  return ei = function(s, o) {
    var u = r(s), l = 0, h = [], c;
    for (c in u) !e(i, c) && e(u, c) && a(h, c);
    for (; o.length > l; ) e(u, c = o[l++]) && (~t(h, c) || a(h, c));
    return h;
  }, ei;
}
var ri, gs;
function Ya() {
  return gs || (gs = 1, ri = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"]), ri;
}
var ds;
function Xl() {
  if (ds) return Wt;
  ds = 1;
  var n = ll(), e = Ya(), r = e.concat("length", "prototype");
  return Wt.f = Object.getOwnPropertyNames || function(i) {
    return n(i, r);
  }, Wt;
}
var ti = {}, ps;
function Kl() {
  return ps || (ps = 1, ti.f = Object.getOwnPropertySymbols), ti;
}
var ii, ys;
function Ql() {
  if (ys) return ii;
  ys = 1;
  var n = er(), e = te(), r = Xl(), t = Kl(), i = le(), a = e([].concat);
  return ii = n("Reflect", "ownKeys") || function(o) {
    var u = r.f(i(o)), l = t.f;
    return l ? a(u, l(o)) : u;
  }, ii;
}
var ai, ms;
function Zl() {
  if (ms) return ai;
  ms = 1;
  var n = Ie(), e = Ql(), r = Dr(), t = We();
  return ai = function(i, a, s) {
    for (var o = e(a), u = t.f, l = r.f, h = 0; h < o.length; h++) {
      var c = o[h];
      !n(i, c) && !(s && n(s, c)) && u(i, c, l(a, c));
    }
  }, ai;
}
var ni, bs;
function hl() {
  if (bs) return ni;
  bs = 1;
  var n = re(), e = ie(), r = /#|\.prototype\./, t = function(l, h) {
    var c = a[i(l)];
    return c === o ? !0 : c === s ? !1 : e(h) ? n(h) : !!h;
  }, i = t.normalize = function(u) {
    return String(u).replace(r, ".").toLowerCase();
  }, a = t.data = {}, s = t.NATIVE = "N", o = t.POLYFILL = "P";
  return ni = t, ni;
}
var si, xs;
function he() {
  if (xs) return si;
  xs = 1;
  var n = J(), e = Dr().f, r = pr(), t = rr(), i = Fa(), a = Zl(), s = hl();
  return si = function(o, u) {
    var l = o.target, h = o.global, c = o.stat, v, f, g, d, p, m;
    if (h ? f = n : c ? f = n[l] || i(l, {}) : f = n[l] && n[l].prototype, f) for (g in u) {
      if (p = u[g], o.dontCallGetSet ? (m = e(f, g), d = m && m.value) : d = f[g], v = s(h ? g : l + (c ? "." : "#") + g, o.forced), !v && d !== void 0) {
        if (typeof p == typeof d) continue;
        a(p, d);
      }
      (o.sham || d && d.sham) && r(p, "sham", !0), t(f, g, p, o);
    }
  }, si;
}
var oi, Os;
function fl() {
  if (Os) return oi;
  Os = 1;
  var n = J(), e = dr(), r = Ze(), t = function(a) {
    return e.slice(0, a.length) === a;
  };
  return oi = function() {
    return t("Bun/") ? "BUN" : t("Cloudflare-Workers") ? "CLOUDFLARE" : t("Deno/") ? "DENO" : t("Node.js/") ? "NODE" : n.Bun && typeof Bun.version == "string" ? "BUN" : n.Deno && typeof Deno.version == "object" ? "DENO" : r(n.process) === "process" ? "NODE" : n.window && n.document ? "BROWSER" : "REST";
  }(), oi;
}
var ui, Ts;
function jr() {
  if (Ts) return ui;
  Ts = 1;
  var n = fl();
  return ui = n === "NODE", ui;
}
var li, Ss;
function Jl() {
  if (Ss) return li;
  Ss = 1;
  var n = te(), e = Ue();
  return li = function(r, t, i) {
    try {
      return n(e(Object.getOwnPropertyDescriptor(r, t)[i]));
    } catch (a) {
    }
  }, li;
}
var hi, Es;
function eh() {
  if (Es) return hi;
  Es = 1;
  var n = Ae();
  return hi = function(e) {
    return n(e) || e === null;
  }, hi;
}
var fi, Rs;
function rh() {
  if (Rs) return fi;
  Rs = 1;
  var n = eh(), e = String, r = TypeError;
  return fi = function(t) {
    if (n(t)) return t;
    throw new r("Can't set " + e(t) + " as a prototype");
  }, fi;
}
var ci, Cs;
function cl() {
  if (Cs) return ci;
  Cs = 1;
  var n = Jl(), e = Ae(), r = Pe(), t = rh();
  return ci = Object.setPrototypeOf || ("__proto__" in {} ? function() {
    var i = !1, a = {}, s;
    try {
      s = n(Object.prototype, "__proto__", "set"), s(a, []), i = a instanceof Array;
    } catch (o) {
    }
    return function(u, l) {
      return r(u), t(l), e(u) && (i ? s(u, l) : u.__proto__ = l), u;
    };
  }() : void 0), ci;
}
var vi, ws;
function Br() {
  if (ws) return vi;
  ws = 1;
  var n = We().f, e = Ie(), r = se(), t = r("toStringTag");
  return vi = function(i, a, s) {
    i && !s && (i = i.prototype), i && !e(i, t) && n(i, t, {
      configurable: !0,
      value: a
    });
  }, vi;
}
var gi, Ps;
function th() {
  if (Ps) return gi;
  Ps = 1;
  var n = ol(), e = We();
  return gi = function(r, t, i) {
    return i.get && n(i.get, t, {
      getter: !0
    }), i.set && n(i.set, t, {
      setter: !0
    }), e.f(r, t, i);
  }, gi;
}
var di, As;
function ih() {
  if (As) return di;
  As = 1;
  var n = er(), e = th(), r = se(), t = we(), i = r("species");
  return di = function(a) {
    var s = n(a);
    t && s && !s[i] && e(s, i, {
      configurable: !0,
      get: function() {
        return this;
      }
    });
  }, di;
}
var pi, Is;
function ah() {
  if (Is) return pi;
  Is = 1;
  var n = Nr(), e = TypeError;
  return pi = function(r, t) {
    if (n(t, r)) return r;
    throw new e("Incorrect invocation");
  }, pi;
}
var yi, Ns;
function nh() {
  if (Ns) return yi;
  Ns = 1;
  var n = se(), e = n("toStringTag"), r = {};
  return r[e] = "z", yi = String(r) === "[object z]", yi;
}
var mi, _s;
function Xa() {
  if (_s) return mi;
  _s = 1;
  var n = nh(), e = ie(), r = Ze(), t = se(), i = t("toStringTag"), a = Object, s = r(/* @__PURE__ */ function() {
    return arguments;
  }()) === "Arguments", o = function(l, h) {
    try {
      return l[h];
    } catch (c) {
    }
  };
  return mi = n ? r : function(u) {
    var l, h, c;
    return u === void 0 ? "Undefined" : u === null ? "Null" : typeof (h = o(l = a(u), i)) == "string" ? h : s ? r(l) : (c = r(l)) === "Object" && e(l.callee) ? "Arguments" : c;
  }, mi;
}
var bi, Ms;
function sh() {
  if (Ms) return bi;
  Ms = 1;
  var n = te(), e = re(), r = ie(), t = Xa(), i = er(), a = $a(), s = function() {
  }, o = i("Reflect", "construct"), u = /^\s*(?:class|function)\b/, l = n(u.exec), h = !u.test(s), c = function(g) {
    if (!r(g)) return !1;
    try {
      return o(s, [], g), !0;
    } catch (d) {
      return !1;
    }
  }, v = function(g) {
    if (!r(g)) return !1;
    switch (t(g)) {
      case "AsyncFunction":
      case "GeneratorFunction":
      case "AsyncGeneratorFunction":
        return !1;
    }
    try {
      return h || !!l(u, a(g));
    } catch (d) {
      return !0;
    }
  };
  return v.sham = !0, bi = !o || e(function() {
    var f;
    return c(c.call) || !c(Object) || !c(function() {
      f = !0;
    }) || f;
  }) ? v : c, bi;
}
var xi, qs;
function oh() {
  if (qs) return xi;
  qs = 1;
  var n = sh(), e = _r(), r = TypeError;
  return xi = function(t) {
    if (n(t)) return t;
    throw new r(e(t) + " is not a constructor");
  }, xi;
}
var Oi, Ds;
function vl() {
  if (Ds) return Oi;
  Ds = 1;
  var n = le(), e = oh(), r = Je(), t = se(), i = t("species");
  return Oi = function(a, s) {
    var o = n(a).constructor, u;
    return o === void 0 || r(u = n(o)[i]) ? s : e(u);
  }, Oi;
}
var Ti, Vs;
function gl() {
  if (Vs) return Ti;
  Vs = 1;
  var n = Ir(), e = Function.prototype, r = e.apply, t = e.call;
  return Ti = typeof Reflect == "object" && Reflect.apply || (n ? t.bind(r) : function() {
    return t.apply(r, arguments);
  }), Ti;
}
var Si, ks;
function Fr() {
  if (ks) return Si;
  ks = 1;
  var n = Ze(), e = te();
  return Si = function(r) {
    if (n(r) === "Function") return e(r);
  }, Si;
}
var Ei, Ls;
function Ka() {
  if (Ls) return Ei;
  Ls = 1;
  var n = Fr(), e = Ue(), r = Ir(), t = n(n.bind);
  return Ei = function(i, a) {
    return e(i), a === void 0 ? i : r ? t(i, a) : function() {
      return i.apply(a, arguments);
    };
  }, Ei;
}
var Ri, js;
function dl() {
  if (js) return Ri;
  js = 1;
  var n = er();
  return Ri = n("document", "documentElement"), Ri;
}
var Ci, Bs;
function uh() {
  if (Bs) return Ci;
  Bs = 1;
  var n = te();
  return Ci = n([].slice), Ci;
}
var wi, Fs;
function lh() {
  if (Fs) return wi;
  Fs = 1;
  var n = TypeError;
  return wi = function(e, r) {
    if (e < r) throw new n("Not enough arguments");
    return e;
  }, wi;
}
var Pi, Us;
function pl() {
  if (Us) return Pi;
  Us = 1;
  var n = dr();
  return Pi = /(?:ipad|iphone|ipod).*applewebkit/i.test(n), Pi;
}
var Ai, Gs;
function yl() {
  if (Gs) return Ai;
  Gs = 1;
  var n = J(), e = gl(), r = Ka(), t = ie(), i = Ie(), a = re(), s = dl(), o = uh(), u = qr(), l = lh(), h = pl(), c = jr(), v = n.setImmediate, f = n.clearImmediate, g = n.process, d = n.Dispatch, p = n.Function, m = n.MessageChannel, x = n.String, y = 0, b = {}, T = "onreadystatechange", E, O, N, D;
  a(function() {
    E = n.location;
  });
  var P = function(C) {
    if (i(b, C)) {
      var L = b[C];
      delete b[C], L();
    }
  }, M = function(C) {
    return function() {
      P(C);
    };
  }, A = function(C) {
    P(C.data);
  }, V = function(C) {
    n.postMessage(x(C), E.protocol + "//" + E.host);
  };
  return (!v || !f) && (v = function(C) {
    l(arguments.length, 1);
    var L = t(C) ? C : p(C), I = o(arguments, 1);
    return b[++y] = function() {
      e(L, void 0, I);
    }, O(y), y;
  }, f = function(C) {
    delete b[C];
  }, c ? O = function(C) {
    g.nextTick(M(C));
  } : d && d.now ? O = function(C) {
    d.now(M(C));
  } : m && !h ? (N = new m(), D = N.port2, N.port1.onmessage = A, O = r(D.postMessage, D)) : n.addEventListener && t(n.postMessage) && !n.importScripts && E && E.protocol !== "file:" && !a(V) ? (O = V, n.addEventListener("message", A, !1)) : T in u("script") ? O = function(C) {
    s.appendChild(u("script"))[T] = function() {
      s.removeChild(this), P(C);
    };
  } : O = function(C) {
    setTimeout(M(C), 0);
  }), Ai = {
    set: v,
    clear: f
  }, Ai;
}
var Ii, $s;
function hh() {
  if ($s) return Ii;
  $s = 1;
  var n = J(), e = we(), r = Object.getOwnPropertyDescriptor;
  return Ii = function(t) {
    if (!e) return n[t];
    var i = r(n, t);
    return i && i.value;
  }, Ii;
}
var Ni, Hs;
function ml() {
  if (Hs) return Ni;
  Hs = 1;
  var n = function() {
    this.head = null, this.tail = null;
  };
  return n.prototype = {
    add: function(r) {
      var t = {
        item: r,
        next: null
      }, i = this.tail;
      i ? i.next = t : this.head = t, this.tail = t;
    },
    get: function() {
      var r = this.head;
      if (r) {
        var t = this.head = r.next;
        return t === null && (this.tail = null), r.item;
      }
    }
  }, Ni = n, Ni;
}
var _i, zs;
function fh() {
  if (zs) return _i;
  zs = 1;
  var n = dr();
  return _i = /ipad|iphone|ipod/i.test(n) && typeof Pebble != "undefined", _i;
}
var Mi, Ws;
function ch() {
  if (Ws) return Mi;
  Ws = 1;
  var n = dr();
  return Mi = /web0s(?!.*chrome)/i.test(n), Mi;
}
var qi, Ys;
function vh() {
  if (Ys) return qi;
  Ys = 1;
  var n = J(), e = hh(), r = Ka(), t = yl().set, i = ml(), a = pl(), s = fh(), o = ch(), u = jr(), l = n.MutationObserver || n.WebKitMutationObserver, h = n.document, c = n.process, v = n.Promise, f = e("queueMicrotask"), g, d, p, m, x;
  if (!f) {
    var y = new i(), b = function() {
      var E, O;
      for (u && (E = c.domain) && E.exit(); O = y.get(); ) try {
        O();
      } catch (N) {
        throw y.head && g(), N;
      }
      E && E.enter();
    };
    !a && !u && !o && l && h ? (d = !0, p = h.createTextNode(""), new l(b).observe(p, {
      characterData: !0
    }), g = function() {
      p.data = d = !d;
    }) : !s && v && v.resolve ? (m = v.resolve(void 0), m.constructor = v, x = r(m.then, m), g = function() {
      x(b);
    }) : u ? g = function() {
      c.nextTick(b);
    } : (t = r(t, n), g = function() {
      t(b);
    }), f = function(E) {
      y.head || g(), y.add(E);
    };
  }
  return qi = f, qi;
}
var Di, Xs;
function gh() {
  return Xs || (Xs = 1, Di = function(n, e) {
    try {
      arguments.length === 1 ? console.error(n) : console.error(n, e);
    } catch (r) {
    }
  }), Di;
}
var Vi, Ks;
function Qa() {
  return Ks || (Ks = 1, Vi = function(n) {
    try {
      return {
        error: !1,
        value: n()
      };
    } catch (e) {
      return {
        error: !0,
        value: e
      };
    }
  }), Vi;
}
var ki, Qs;
function yr() {
  if (Qs) return ki;
  Qs = 1;
  var n = J();
  return ki = n.Promise, ki;
}
var Li, Zs;
function mr() {
  if (Zs) return Li;
  Zs = 1;
  var n = J(), e = yr(), r = ie(), t = hl(), i = $a(), a = se(), s = fl(), o = De(), u = Ba(), l = e && e.prototype, h = a("species"), c = !1, v = r(n.PromiseRejectionEvent), f = t("Promise", function() {
    var g = i(e), d = g !== String(e);
    if (!d && u === 66 || o && !(l.catch && l.finally)) return !0;
    if (!u || u < 51 || !/native code/.test(g)) {
      var p = new e(function(y) {
        y(1);
      }), m = function(b) {
        b(function() {
        }, function() {
        });
      }, x = p.constructor = {};
      if (x[h] = m, c = p.then(function() {
      }) instanceof m, !c) return !0;
    }
    return !d && (s === "BROWSER" || s === "DENO") && !v;
  });
  return Li = {
    CONSTRUCTOR: f,
    REJECTION_EVENT: v,
    SUBCLASSING: c
  }, Li;
}
var ji = {}, Js;
function br() {
  if (Js) return ji;
  Js = 1;
  var n = Ue(), e = TypeError, r = function(i) {
    var a, s;
    this.promise = new i(function(o, u) {
      if (a !== void 0 || s !== void 0) throw new e("Bad Promise constructor");
      a = o, s = u;
    }), this.resolve = n(a), this.reject = n(s);
  };
  return ji.f = function(t) {
    return new r(t);
  }, ji;
}
var eo;
function dh() {
  if (eo) return ln;
  eo = 1;
  var n = he(), e = De(), r = jr(), t = J(), i = oe(), a = rr(), s = cl(), o = Br(), u = ih(), l = Ue(), h = ie(), c = Ae(), v = ah(), f = vl(), g = yl().set, d = vh(), p = gh(), m = Qa(), x = ml(), y = kr(), b = yr(), T = mr(), E = br(), O = "Promise", N = T.CONSTRUCTOR, D = T.REJECTION_EVENT, P = T.SUBCLASSING, M = y.getterFor(O), A = y.set, V = b && b.prototype, w = b, C = V, L = t.TypeError, I = t.document, j = t.process, _ = E.f, k = _, B = !!(I && I.createEvent && t.dispatchEvent), H = "unhandledrejection", Y = "rejectionhandled", K = 0, z = 1, pe = 2, ye = 1, _e = 2, me, be, xe, Me, qe = function(R) {
    var F;
    return c(R) && h(F = R.then) ? F : !1;
  }, fe = function(R, F) {
    var G = F.value, $ = F.state === z, Z = $ ? R.ok : R.fail, ke = R.resolve, Le = R.reject, Se = R.domain, Ee, ur, lr;
    try {
      Z ? ($ || (F.rejection === _e && Sr(F), F.rejection = ye), Z === !0 ? Ee = G : (Se && Se.enter(), Ee = Z(G), Se && (Se.exit(), lr = !0)), Ee === R.promise ? Le(new L("Promise-chain cycle")) : (ur = qe(Ee)) ? i(ur, Ee, ke, Le) : ke(Ee)) : Le(G);
    } catch (hr) {
      Se && !lr && Se.exit(), Le(hr);
    }
  }, Oe = function(R, F) {
    R.notified || (R.notified = !0, d(function() {
      for (var G = R.reactions, $; $ = G.get(); )
        fe($, R);
      R.notified = !1, F && !R.rejection && Tr(R);
    }));
  }, Ge = function(R, F, G) {
    var $, Z;
    B ? ($ = I.createEvent("Event"), $.promise = F, $.reason = G, $.initEvent(R, !1, !0), t.dispatchEvent($)) : $ = {
      promise: F,
      reason: G
    }, !D && (Z = t["on" + R]) ? Z($) : R === H && p("Unhandled promise rejection", G);
  }, Tr = function(R) {
    i(g, t, function() {
      var F = R.facade, G = R.value, $ = or(R), Z;
      if ($ && (Z = m(function() {
        r ? j.emit("unhandledRejection", G, F) : Ge(H, F, G);
      }), R.rejection = r || or(R) ? _e : ye, Z.error))
        throw Z.value;
    });
  }, or = function(R) {
    return R.rejection !== ye && !R.parent;
  }, Sr = function(R) {
    i(g, t, function() {
      var F = R.facade;
      r ? j.emit("rejectionHandled", F) : Ge(Y, F, R.value);
    });
  }, ge = function(R, F, G) {
    return function($) {
      R(F, $, G);
    };
  }, ce = function(R, F, G) {
    R.done || (R.done = !0, G && (R = G), R.value = F, R.state = pe, Oe(R, !0));
  }, Te = function(R, F, G) {
    if (!R.done) {
      R.done = !0, G && (R = G);
      try {
        if (R.facade === F) throw new L("Promise can't be resolved itself");
        var $ = qe(F);
        $ ? d(function() {
          var Z = {
            done: !1
          };
          try {
            i($, F, ge(Te, Z, R), ge(ce, Z, R));
          } catch (ke) {
            ce(Z, ke, R);
          }
        }) : (R.value = F, R.state = z, Oe(R, !1));
      } catch (Z) {
        ce({
          done: !1
        }, Z, R);
      }
    }
  };
  if (N && (w = function(R) {
    v(this, C), l(R), i(me, this);
    var F = M(this);
    try {
      R(ge(Te, F), ge(ce, F));
    } catch (G) {
      ce(F, G);
    }
  }, C = w.prototype, me = function(R) {
    A(this, {
      type: O,
      done: !1,
      notified: !1,
      parent: !1,
      reactions: new x(),
      rejection: !1,
      state: K,
      value: null
    });
  }, me.prototype = a(C, "then", function(R, F) {
    var G = M(this), $ = _(f(this, w));
    return G.parent = !0, $.ok = h(R) ? R : !0, $.fail = h(F) && F, $.domain = r ? j.domain : void 0, G.state === K ? G.reactions.add($) : d(function() {
      fe($, G);
    }), $.promise;
  }), be = function() {
    var R = new me(), F = M(R);
    this.promise = R, this.resolve = ge(Te, F), this.reject = ge(ce, F);
  }, E.f = _ = function(R) {
    return R === w || R === xe ? new be(R) : k(R);
  }, !e && h(b) && V !== Object.prototype)) {
    Me = V.then, P || a(V, "then", function(R, F) {
      var G = this;
      return new w(function($, Z) {
        i(Me, G, $, Z);
      }).then(R, F);
    }, {
      unsafe: !0
    });
    try {
      delete V.constructor;
    } catch (Q) {
    }
    s && s(V, C);
  }
  return n({
    global: !0,
    constructor: !0,
    wrap: !0,
    forced: N
  }, {
    Promise: w
  }), o(w, O, !1, !0), u(O), ln;
}
var ro = {}, Bi, to;
function xr() {
  return to || (to = 1, Bi = {}), Bi;
}
var Fi, io;
function ph() {
  if (io) return Fi;
  io = 1;
  var n = se(), e = xr(), r = n("iterator"), t = Array.prototype;
  return Fi = function(i) {
    return i !== void 0 && (e.Array === i || t[r] === i);
  }, Fi;
}
var Ui, ao;
function bl() {
  if (ao) return Ui;
  ao = 1;
  var n = Xa(), e = ar(), r = Je(), t = xr(), i = se(), a = i("iterator");
  return Ui = function(s) {
    if (!r(s)) return e(s, a) || e(s, "@@iterator") || t[n(s)];
  }, Ui;
}
var Gi, no;
function yh() {
  if (no) return Gi;
  no = 1;
  var n = oe(), e = Ue(), r = le(), t = _r(), i = bl(), a = TypeError;
  return Gi = function(s, o) {
    var u = arguments.length < 2 ? i(s) : o;
    if (e(u)) return r(n(u, s));
    throw new a(t(s) + " is not iterable");
  }, Gi;
}
var $i, so;
function mh() {
  if (so) return $i;
  so = 1;
  var n = oe(), e = le(), r = ar();
  return $i = function(t, i, a) {
    var s, o;
    e(t);
    try {
      if (s = r(t, "return"), !s) {
        if (i === "throw") throw a;
        return a;
      }
      s = n(s, t);
    } catch (u) {
      o = !0, s = u;
    }
    if (i === "throw") throw a;
    if (o) throw s;
    return e(s), a;
  }, $i;
}
var Hi, oo;
function xl() {
  if (oo) return Hi;
  oo = 1;
  var n = Ka(), e = oe(), r = le(), t = _r(), i = ph(), a = Wa(), s = Nr(), o = yh(), u = bl(), l = mh(), h = TypeError, c = function(g, d) {
    this.stopped = g, this.result = d;
  }, v = c.prototype;
  return Hi = function(f, g, d) {
    var p = d && d.that, m = !!(d && d.AS_ENTRIES), x = !!(d && d.IS_RECORD), y = !!(d && d.IS_ITERATOR), b = !!(d && d.INTERRUPTED), T = n(g, p), E, O, N, D, P, M, A, V = function(L) {
      return E && l(E, "normal", L), new c(!0, L);
    }, w = function(L) {
      return m ? (r(L), b ? T(L[0], L[1], V) : T(L[0], L[1])) : b ? T(L, V) : T(L);
    };
    if (x)
      E = f.iterator;
    else if (y)
      E = f;
    else {
      if (O = u(f), !O) throw new h(t(f) + " is not iterable");
      if (i(O)) {
        for (N = 0, D = a(f); D > N; N++)
          if (P = w(f[N]), P && s(v, P)) return P;
        return new c(!1);
      }
      E = o(f, O);
    }
    for (M = x ? f.next : E.next; !(A = e(M, E)).done; ) {
      try {
        P = w(A.value);
      } catch (C) {
        l(E, "throw", C);
      }
      if (typeof P == "object" && P && s(v, P)) return P;
    }
    return new c(!1);
  }, Hi;
}
var zi, uo;
function bh() {
  if (uo) return zi;
  uo = 1;
  var n = se(), e = n("iterator"), r = !1;
  try {
    var t = 0, i = {
      next: function() {
        return {
          done: !!t++
        };
      },
      return: function() {
        r = !0;
      }
    };
    i[e] = function() {
      return this;
    }, Array.from(i, function() {
      throw 2;
    });
  } catch (a) {
  }
  return zi = function(a, s) {
    try {
      if (!s && !r) return !1;
    } catch (l) {
      return !1;
    }
    var o = !1;
    try {
      var u = {};
      u[e] = function() {
        return {
          next: function() {
            return {
              done: o = !0
            };
          }
        };
      }, a(u);
    } catch (l) {
    }
    return o;
  }, zi;
}
var Wi, lo;
function Ol() {
  if (lo) return Wi;
  lo = 1;
  var n = yr(), e = bh(), r = mr().CONSTRUCTOR;
  return Wi = r || !e(function(t) {
    n.all(t).then(void 0, function() {
    });
  }), Wi;
}
var ho;
function xh() {
  if (ho) return ro;
  ho = 1;
  var n = he(), e = oe(), r = Ue(), t = br(), i = Qa(), a = xl(), s = Ol();
  return n({
    target: "Promise",
    stat: !0,
    forced: s
  }, {
    all: function(u) {
      var l = this, h = t.f(l), c = h.resolve, v = h.reject, f = i(function() {
        var g = r(l.resolve), d = [], p = 0, m = 1;
        a(u, function(x) {
          var y = p++, b = !1;
          m++, e(g, l, x).then(function(T) {
            b || (b = !0, d[y] = T, --m || c(d));
          }, v);
        }), --m || c(d);
      });
      return f.error && v(f.value), h.promise;
    }
  }), ro;
}
var fo = {}, co;
function Oh() {
  if (co) return fo;
  co = 1;
  var n = he(), e = De(), r = mr().CONSTRUCTOR, t = yr(), i = er(), a = ie(), s = rr(), o = t && t.prototype;
  if (n({
    target: "Promise",
    proto: !0,
    forced: r,
    real: !0
  }, {
    catch: function(h) {
      return this.then(void 0, h);
    }
  }), !e && a(t)) {
    var u = i("Promise").prototype.catch;
    o.catch !== u && s(o, "catch", u, {
      unsafe: !0
    });
  }
  return fo;
}
var vo = {}, go;
function Th() {
  if (go) return vo;
  go = 1;
  var n = he(), e = oe(), r = Ue(), t = br(), i = Qa(), a = xl(), s = Ol();
  return n({
    target: "Promise",
    stat: !0,
    forced: s
  }, {
    race: function(u) {
      var l = this, h = t.f(l), c = h.reject, v = i(function() {
        var f = r(l.resolve);
        a(u, function(g) {
          e(f, l, g).then(h.resolve, c);
        });
      });
      return v.error && c(v.value), h.promise;
    }
  }), vo;
}
var po = {}, yo;
function Sh() {
  if (yo) return po;
  yo = 1;
  var n = he(), e = br(), r = mr().CONSTRUCTOR;
  return n({
    target: "Promise",
    stat: !0,
    forced: r
  }, {
    reject: function(i) {
      var a = e.f(this), s = a.reject;
      return s(i), a.promise;
    }
  }), po;
}
var mo = {}, Yi, bo;
function Eh() {
  if (bo) return Yi;
  bo = 1;
  var n = le(), e = Ae(), r = br();
  return Yi = function(t, i) {
    if (n(t), e(i) && i.constructor === t) return i;
    var a = r.f(t), s = a.resolve;
    return s(i), a.promise;
  }, Yi;
}
var xo;
function Rh() {
  if (xo) return mo;
  xo = 1;
  var n = he(), e = er(), r = De(), t = yr(), i = mr().CONSTRUCTOR, a = Eh(), s = e("Promise"), o = r && !i;
  return n({
    target: "Promise",
    stat: !0,
    forced: r || i
  }, {
    resolve: function(l) {
      return a(o && this === s ? t : this, l);
    }
  }), mo;
}
var Oo;
function Ch() {
  return Oo || (Oo = 1, dh(), xh(), Oh(), Th(), Sh(), Rh()), un;
}
Ch();
function To(n, e, r, t, i, a, s) {
  try {
    var o = n[a](s), u = o.value;
  } catch (l) {
    return void r(l);
  }
  o.done ? e(u) : Promise.resolve(u).then(t, i);
}
function Fe(n) {
  return function() {
    var e = this, r = arguments;
    return new Promise(function(t, i) {
      var a = n.apply(e, r);
      function s(u) {
        To(a, t, i, s, o, "next", u);
      }
      function o(u) {
        To(a, t, i, s, o, "throw", u);
      }
      s(void 0);
    });
  };
}
var So = {}, Eo = {}, Xi, Ro;
function Ve() {
  if (Ro) return Xi;
  Ro = 1;
  var n = Xa(), e = String;
  return Xi = function(r) {
    if (n(r) === "Symbol") throw new TypeError("Cannot convert a Symbol value to a string");
    return e(r);
  }, Xi;
}
var Ki, Co;
function Tl() {
  if (Co) return Ki;
  Co = 1;
  var n = le();
  return Ki = function() {
    var e = n(this), r = "";
    return e.hasIndices && (r += "d"), e.global && (r += "g"), e.ignoreCase && (r += "i"), e.multiline && (r += "m"), e.dotAll && (r += "s"), e.unicode && (r += "u"), e.unicodeSets && (r += "v"), e.sticky && (r += "y"), r;
  }, Ki;
}
var Qi, wo;
function Sl() {
  if (wo) return Qi;
  wo = 1;
  var n = re(), e = J(), r = e.RegExp, t = n(function() {
    var s = r("a", "y");
    return s.lastIndex = 2, s.exec("abcd") !== null;
  }), i = t || n(function() {
    return !r("a", "y").sticky;
  }), a = t || n(function() {
    var s = r("^r", "gy");
    return s.lastIndex = 2, s.exec("str") !== null;
  });
  return Qi = {
    BROKEN_CARET: a,
    MISSED_STICKY: i,
    UNSUPPORTED_Y: t
  }, Qi;
}
var Zi = {}, Ji, Po;
function wh() {
  if (Po) return Ji;
  Po = 1;
  var n = ll(), e = Ya();
  return Ji = Object.keys || function(t) {
    return n(t, e);
  }, Ji;
}
var Ao;
function Ph() {
  if (Ao) return Zi;
  Ao = 1;
  var n = we(), e = sl(), r = We(), t = le(), i = gr(), a = wh();
  return Zi.f = n && !e ? Object.defineProperties : function(o, u) {
    t(o);
    for (var l = i(u), h = a(u), c = h.length, v = 0, f; c > v; ) r.f(o, f = h[v++], l[f]);
    return o;
  }, Zi;
}
var ea, Io;
function Ur() {
  if (Io) return ea;
  Io = 1;
  var n = le(), e = Ph(), r = Ya(), t = za(), i = dl(), a = qr(), s = Ha(), o = ">", u = "<", l = "prototype", h = "script", c = s("IE_PROTO"), v = function() {
  }, f = function(y) {
    return u + h + o + y + u + "/" + h + o;
  }, g = function(y) {
    y.write(f("")), y.close();
    var b = y.parentWindow.Object;
    return y = null, b;
  }, d = function() {
    var y = a("iframe"), b = "java" + h + ":", T;
    return y.style.display = "none", i.appendChild(y), y.src = String(b), T = y.contentWindow.document, T.open(), T.write(f("document.F=Object")), T.close(), T.F;
  }, p, m = function() {
    try {
      p = new ActiveXObject("htmlfile");
    } catch (b) {
    }
    m = typeof document != "undefined" ? document.domain && p ? g(p) : d() : g(p);
    for (var y = r.length; y--; ) delete m[l][r[y]];
    return m();
  };
  return t[c] = !0, ea = Object.create || function(y, b) {
    var T;
    return y !== null ? (v[l] = n(y), T = new v(), v[l] = null, T[c] = y) : T = m(), b === void 0 ? T : e.f(T, b);
  }, ea;
}
var ra, No;
function Ah() {
  if (No) return ra;
  No = 1;
  var n = re(), e = J(), r = e.RegExp;
  return ra = n(function() {
    var t = r(".", "s");
    return !(t.dotAll && t.test(`
`) && t.flags === "s");
  }), ra;
}
var ta, _o;
function Ih() {
  if (_o) return ta;
  _o = 1;
  var n = re(), e = J(), r = e.RegExp;
  return ta = n(function() {
    var t = r("(?<a>b)", "g");
    return t.exec("b").groups.a !== "b" || "b".replace(t, "$<a>c") !== "bc";
  }), ta;
}
var ia, Mo;
function Za() {
  if (Mo) return ia;
  Mo = 1;
  var n = oe(), e = te(), r = Ve(), t = Tl(), i = Sl(), a = Ga(), s = Ur(), o = kr().get, u = Ah(), l = Ih(), h = a("native-string-replace", String.prototype.replace), c = RegExp.prototype.exec, v = c, f = e("".charAt), g = e("".indexOf), d = e("".replace), p = e("".slice), m = function() {
    var T = /a/, E = /b*/g;
    return n(c, T, "a"), n(c, E, "a"), T.lastIndex !== 0 || E.lastIndex !== 0;
  }(), x = i.BROKEN_CARET, y = /()??/.exec("")[1] !== void 0, b = m || y || x || u || l;
  return b && (v = function(E) {
    var O = this, N = o(O), D = r(E), P = N.raw, M, A, V, w, C, L, I;
    if (P)
      return P.lastIndex = O.lastIndex, M = n(v, P, D), O.lastIndex = P.lastIndex, M;
    var j = N.groups, _ = x && O.sticky, k = n(t, O), B = O.source, H = 0, Y = D;
    if (_ && (k = d(k, "y", ""), g(k, "g") === -1 && (k += "g"), Y = p(D, O.lastIndex), O.lastIndex > 0 && (!O.multiline || O.multiline && f(D, O.lastIndex - 1) !== `
`) && (B = "(?: " + B + ")", Y = " " + Y, H++), A = new RegExp("^(?:" + B + ")", k)), y && (A = new RegExp("^" + B + "$(?!\\s)", k)), m && (V = O.lastIndex), w = n(c, _ ? A : O, Y), _ ? w ? (w.input = p(w.input, H), w[0] = p(w[0], H), w.index = O.lastIndex, O.lastIndex += w[0].length) : O.lastIndex = 0 : m && w && (O.lastIndex = O.global ? w.index + w[0].length : V), y && w && w.length > 1 && n(h, w[0], A, function() {
      for (C = 1; C < arguments.length - 2; C++)
        arguments[C] === void 0 && (w[C] = void 0);
    }), w && j)
      for (w.groups = L = s(null), C = 0; C < j.length; C++)
        I = j[C], L[I[0]] = w[I[1]];
    return w;
  }), ia = v, ia;
}
var qo;
function Nh() {
  if (qo) return Eo;
  qo = 1;
  var n = he(), e = Za();
  return n({
    target: "RegExp",
    proto: !0,
    forced: /./.exec !== e
  }, {
    exec: e
  }), Eo;
}
var aa, Do;
function Ja() {
  if (Do) return aa;
  Do = 1, Nh();
  var n = oe(), e = rr(), r = Za(), t = re(), i = se(), a = pr(), s = i("species"), o = RegExp.prototype;
  return aa = function(u, l, h, c) {
    var v = i(u), f = !t(function() {
      var m = {};
      return m[v] = function() {
        return 7;
      }, ""[u](m) !== 7;
    }), g = f && !t(function() {
      var m = !1, x = /a/;
      return u === "split" && (x = {}, x.constructor = {}, x.constructor[s] = function() {
        return x;
      }, x.flags = "", x[v] = /./[v]), x.exec = function() {
        return m = !0, null;
      }, x[v](""), !m;
    });
    if (!f || !g || h) {
      var d = /./[v], p = l(v, ""[u], function(m, x, y, b, T) {
        var E = x.exec;
        return E === r || E === o.exec ? f && !T ? {
          done: !0,
          value: n(d, x, y, b)
        } : {
          done: !0,
          value: n(m, y, x, b)
        } : {
          done: !1
        };
      });
      e(String.prototype, u, p[0]), e(o, v, p[1]);
    }
    c && a(o[v], "sham", !0);
  }, aa;
}
var na, Vo;
function _h() {
  if (Vo) return na;
  Vo = 1;
  var n = te(), e = Lr(), r = Ve(), t = Pe(), i = n("".charAt), a = n("".charCodeAt), s = n("".slice), o = function(l) {
    return function(h, c) {
      var v = r(t(h)), f = e(c), g = v.length, d, p;
      return f < 0 || f >= g ? l ? "" : void 0 : (d = a(v, f), d < 55296 || d > 56319 || f + 1 === g || (p = a(v, f + 1)) < 56320 || p > 57343 ? l ? i(v, f) : d : l ? s(v, f, f + 2) : (d - 55296 << 10) + (p - 56320) + 65536);
    };
  };
  return na = {
    // `String.prototype.codePointAt` method
    // https://tc39.es/ecma262/#sec-string.prototype.codepointat
    codeAt: o(!1),
    // `String.prototype.at` method
    // https://github.com/mathiasbynens/String.prototype.at
    charAt: o(!0)
  }, na;
}
var sa, ko;
function en() {
  if (ko) return sa;
  ko = 1;
  var n = _h().charAt;
  return sa = function(e, r, t) {
    return r + (t ? n(e, r).length : 1);
  }, sa;
}
var oa, Lo;
function rn() {
  if (Lo) return oa;
  Lo = 1;
  var n = oe(), e = le(), r = ie(), t = Ze(), i = Za(), a = TypeError;
  return oa = function(s, o) {
    var u = s.exec;
    if (r(u)) {
      var l = n(u, s, o);
      return l !== null && e(l), l;
    }
    if (t(s) === "RegExp") return n(i, s, o);
    throw new a("RegExp#exec called on incompatible receiver");
  }, oa;
}
var jo;
function Mh() {
  if (jo) return So;
  jo = 1;
  var n = oe(), e = Ja(), r = le(), t = Je(), i = nr(), a = Ve(), s = Pe(), o = ar(), u = en(), l = rn();
  return e("match", function(h, c, v) {
    return [
      // `String.prototype.match` method
      // https://tc39.es/ecma262/#sec-string.prototype.match
      function(g) {
        var d = s(this), p = t(g) ? void 0 : o(g, h);
        return p ? n(p, g, d) : new RegExp(g)[h](a(d));
      },
      // `RegExp.prototype[@@match]` method
      // https://tc39.es/ecma262/#sec-regexp.prototype-@@match
      function(f) {
        var g = r(this), d = a(f), p = v(c, g, d);
        if (p.done) return p.value;
        if (!g.global) return l(g, d);
        var m = g.unicode;
        g.lastIndex = 0;
        for (var x = [], y = 0, b; (b = l(g, d)) !== null; ) {
          var T = a(b[0]);
          x[y] = T, T === "" && (g.lastIndex = u(d, i(g.lastIndex), m)), y++;
        }
        return y === 0 ? null : x;
      }
    ];
  }), So;
}
Mh();
var Bo = {}, ua, Fo;
function qh() {
  if (Fo) return ua;
  Fo = 1;
  var n = te(), e = Mr(), r = Math.floor, t = n("".charAt), i = n("".replace), a = n("".slice), s = /\$([$&'`]|\d{1,2}|<[^>]*>)/g, o = /\$([$&'`]|\d{1,2})/g;
  return ua = function(u, l, h, c, v, f) {
    var g = h + u.length, d = c.length, p = o;
    return v !== void 0 && (v = e(v), p = s), i(f, p, function(m, x) {
      var y;
      switch (t(x, 0)) {
        case "$":
          return "$";
        case "&":
          return u;
        case "`":
          return a(l, 0, h);
        case "'":
          return a(l, g);
        case "<":
          y = v[a(x, 1, -1)];
          break;
        default:
          var b = +x;
          if (b === 0) return m;
          if (b > d) {
            var T = r(b / 10);
            return T === 0 ? m : T <= d ? c[T - 1] === void 0 ? t(x, 1) : c[T - 1] + t(x, 1) : m;
          }
          y = c[b - 1];
      }
      return y === void 0 ? "" : y;
    });
  }, ua;
}
var Uo;
function Dh() {
  if (Uo) return Bo;
  Uo = 1;
  var n = gl(), e = oe(), r = te(), t = Ja(), i = re(), a = le(), s = ie(), o = Je(), u = Lr(), l = nr(), h = Ve(), c = Pe(), v = en(), f = ar(), g = qh(), d = rn(), p = se(), m = p("replace"), x = Math.max, y = Math.min, b = r([].concat), T = r([].push), E = r("".indexOf), O = r("".slice), N = function(V) {
    return V === void 0 ? V : String(V);
  }, D = function() {
    return "a".replace(/./, "$0") === "$0";
  }(), P = function() {
    return /./[m] ? /./[m]("a", "$0") === "" : !1;
  }(), M = !i(function() {
    var A = /./;
    return A.exec = function() {
      var V = [];
      return V.groups = {
        a: "7"
      }, V;
    }, "".replace(A, "$<a>") !== "7";
  });
  return t("replace", function(A, V, w) {
    var C = P ? "$" : "$0";
    return [
      // `String.prototype.replace` method
      // https://tc39.es/ecma262/#sec-string.prototype.replace
      function(I, j) {
        var _ = c(this), k = o(I) ? void 0 : f(I, m);
        return k ? e(k, I, _, j) : e(V, h(_), I, j);
      },
      // `RegExp.prototype[@@replace]` method
      // https://tc39.es/ecma262/#sec-regexp.prototype-@@replace
      function(L, I) {
        var j = a(this), _ = h(L);
        if (typeof I == "string" && E(I, C) === -1 && E(I, "$<") === -1) {
          var k = w(V, j, _, I);
          if (k.done) return k.value;
        }
        var B = s(I);
        B || (I = h(I));
        var H = j.global, Y;
        H && (Y = j.unicode, j.lastIndex = 0);
        for (var K = [], z; z = d(j, _), !(z === null || (T(K, z), !H)); ) {
          var pe = h(z[0]);
          pe === "" && (j.lastIndex = v(_, l(j.lastIndex), Y));
        }
        for (var ye = "", _e = 0, me = 0; me < K.length; me++) {
          z = K[me];
          for (var be = h(z[0]), xe = x(y(u(z.index), _.length), 0), Me = [], qe, fe = 1; fe < z.length; fe++) T(Me, N(z[fe]));
          var Oe = z.groups;
          if (B) {
            var Ge = b([be], Me, xe, _);
            Oe !== void 0 && T(Ge, Oe), qe = h(n(I, void 0, Ge));
          } else
            qe = g(be, _, xe, Me, Oe, I);
          xe >= _e && (ye += O(_, _e, xe) + qe, _e = xe + be.length);
        }
        return ye + O(_, _e);
      }
    ];
  }, !M || !D || P), Bo;
}
Dh();
var Go = {}, la, $o;
function Vh() {
  if ($o) return la;
  $o = 1;
  var n = Ae(), e = Ze(), r = se(), t = r("match");
  return la = function(i) {
    var a;
    return n(i) && ((a = i[t]) !== void 0 ? !!a : e(i) === "RegExp");
  }, la;
}
var ha, Ho;
function tn() {
  if (Ho) return ha;
  Ho = 1;
  var n = Vh(), e = TypeError;
  return ha = function(r) {
    if (n(r))
      throw new e("The method doesn't accept regular expressions");
    return r;
  }, ha;
}
var fa, zo;
function an() {
  if (zo) return fa;
  zo = 1;
  var n = se(), e = n("match");
  return fa = function(r) {
    var t = /./;
    try {
      "/./"[r](t);
    } catch (i) {
      try {
        return t[e] = !1, "/./"[r](t);
      } catch (a) {
      }
    }
    return !1;
  }, fa;
}
var Wo;
function kh() {
  if (Wo) return Go;
  Wo = 1;
  var n = he(), e = Fr(), r = Dr().f, t = nr(), i = Ve(), a = tn(), s = Pe(), o = an(), u = De(), l = e("".slice), h = Math.min, c = o("startsWith"), v = !u && !c && !!function() {
    var f = r(String.prototype, "startsWith");
    return f && !f.writable;
  }();
  return n({
    target: "String",
    proto: !0,
    forced: !v && !c
  }, {
    startsWith: function(g) {
      var d = i(s(this));
      a(g);
      var p = t(h(arguments.length > 1 ? arguments[1] : void 0, d.length)), m = i(g);
      return l(d, p, p + m.length) === m;
    }
  }), Go;
}
kh();
var ca, Yo;
function Lh() {
  if (Yo) return ca;
  Yo = 1;
  var n = se(), e = Ur(), r = We().f, t = n("unscopables"), i = Array.prototype;
  return i[t] === void 0 && r(i, t, {
    configurable: !0,
    value: e(null)
  }), ca = function(a) {
    i[t][a] = !0;
  }, ca;
}
var va, Xo;
function jh() {
  if (Xo) return va;
  Xo = 1;
  var n = re();
  return va = !n(function() {
    function e() {
    }
    return e.prototype.constructor = null, Object.getPrototypeOf(new e()) !== e.prototype;
  }), va;
}
var ga, Ko;
function El() {
  if (Ko) return ga;
  Ko = 1;
  var n = Ie(), e = ie(), r = Mr(), t = Ha(), i = jh(), a = t("IE_PROTO"), s = Object, o = s.prototype;
  return ga = i ? s.getPrototypeOf : function(u) {
    var l = r(u);
    if (n(l, a)) return l[a];
    var h = l.constructor;
    return e(h) && l instanceof h ? h.prototype : l instanceof s ? o : null;
  }, ga;
}
var da, Qo;
function Rl() {
  if (Qo) return da;
  Qo = 1;
  var n = re(), e = ie(), r = Ae(), t = Ur(), i = El(), a = rr(), s = se(), o = De(), u = s("iterator"), l = !1, h, c, v;
  [].keys && (v = [].keys(), "next" in v ? (c = i(i(v)), c !== Object.prototype && (h = c)) : l = !0);
  var f = !r(h) || n(function() {
    var g = {};
    return h[u].call(g) !== g;
  });
  return f ? h = {} : o && (h = t(h)), e(h[u]) || a(h, u, function() {
    return this;
  }), da = {
    IteratorPrototype: h,
    BUGGY_SAFARI_ITERATORS: l
  }, da;
}
var pa, Zo;
function Bh() {
  if (Zo) return pa;
  Zo = 1;
  var n = Rl().IteratorPrototype, e = Ur(), r = ja(), t = Br(), i = xr(), a = function() {
    return this;
  };
  return pa = function(s, o, u, l) {
    var h = o + " Iterator";
    return s.prototype = e(n, {
      next: r(+!l, u)
    }), t(s, h, !1, !0), i[h] = a, s;
  }, pa;
}
var ya, Jo;
function Fh() {
  if (Jo) return ya;
  Jo = 1;
  var n = he(), e = oe(), r = De(), t = Vr(), i = ie(), a = Bh(), s = El(), o = cl(), u = Br(), l = pr(), h = rr(), c = se(), v = xr(), f = Rl(), g = t.PROPER, d = t.CONFIGURABLE, p = f.IteratorPrototype, m = f.BUGGY_SAFARI_ITERATORS, x = c("iterator"), y = "keys", b = "values", T = "entries", E = function() {
    return this;
  };
  return ya = function(O, N, D, P, M, A, V) {
    a(D, N, P);
    var w = function(z) {
      if (z === M && _) return _;
      if (!m && z && z in I) return I[z];
      switch (z) {
        case y:
          return function() {
            return new D(this, z);
          };
        case b:
          return function() {
            return new D(this, z);
          };
        case T:
          return function() {
            return new D(this, z);
          };
      }
      return function() {
        return new D(this);
      };
    }, C = N + " Iterator", L = !1, I = O.prototype, j = I[x] || I["@@iterator"] || M && I[M], _ = !m && j || w(M), k = N === "Array" && I.entries || j, B, H, Y;
    if (k && (B = s(k.call(new O())), B !== Object.prototype && B.next && (!r && s(B) !== p && (o ? o(B, p) : i(B[x]) || h(B, x, E)), u(B, C, !0, !0), r && (v[C] = E))), g && M === b && j && j.name !== b && (!r && d ? l(I, "name", b) : (L = !0, _ = function() {
      return e(j, this);
    })), M)
      if (H = {
        values: w(b),
        keys: A ? _ : w(y),
        entries: w(T)
      }, V) for (Y in H)
        (m || L || !(Y in I)) && h(I, Y, H[Y]);
      else n({
        target: N,
        proto: !0,
        forced: m || L
      }, H);
    return (!r || V) && I[x] !== _ && h(I, x, _, {
      name: M
    }), v[N] = _, H;
  }, ya;
}
var ma, eu;
function Uh() {
  return eu || (eu = 1, ma = function(n, e) {
    return {
      value: n,
      done: e
    };
  }), ma;
}
var ba, ru;
function Cl() {
  if (ru) return ba;
  ru = 1;
  var n = gr(), e = Lh(), r = xr(), t = kr(), i = We().f, a = Fh(), s = Uh(), o = De(), u = we(), l = "Array Iterator", h = t.set, c = t.getterFor(l);
  ba = a(Array, "Array", function(f, g) {
    h(this, {
      type: l,
      target: n(f),
      // target
      index: 0,
      // next index
      kind: g
      // kind
    });
  }, function() {
    var f = c(this), g = f.target, d = f.index++;
    if (!g || d >= g.length)
      return f.target = null, s(void 0, !0);
    switch (f.kind) {
      case "keys":
        return s(d, !1);
      case "values":
        return s(g[d], !1);
    }
    return s([d, g[d]], !1);
  }, "values");
  var v = r.Arguments = r.Array;
  if (e("keys"), e("values"), e("entries"), !o && u && v.name !== "values") try {
    i(v, "name", {
      value: "values"
    });
  } catch (f) {
  }
  return ba;
}
Cl();
var tu = {}, xa, iu;
function Gh() {
  return iu || (iu = 1, xa = {
    CSSRuleList: 0,
    CSSStyleDeclaration: 0,
    CSSValueList: 0,
    ClientRectList: 0,
    DOMRectList: 0,
    DOMStringList: 0,
    DOMTokenList: 1,
    DataTransferItemList: 0,
    FileList: 0,
    HTMLAllCollection: 0,
    HTMLCollection: 0,
    HTMLFormElement: 0,
    HTMLSelectElement: 0,
    MediaList: 0,
    MimeTypeArray: 0,
    NamedNodeMap: 0,
    NodeList: 1,
    PaintRequestList: 0,
    Plugin: 0,
    PluginArray: 0,
    SVGLengthList: 0,
    SVGNumberList: 0,
    SVGPathSegList: 0,
    SVGPointList: 0,
    SVGStringList: 0,
    SVGTransformList: 0,
    SourceBufferList: 0,
    StyleSheetList: 0,
    TextTrackCueList: 0,
    TextTrackList: 0,
    TouchList: 0
  }), xa;
}
var Oa, au;
function $h() {
  if (au) return Oa;
  au = 1;
  var n = qr(), e = n("span").classList, r = e && e.constructor && e.constructor.prototype;
  return Oa = r === Object.prototype ? void 0 : r, Oa;
}
var nu;
function Hh() {
  if (nu) return tu;
  nu = 1;
  var n = J(), e = Gh(), r = $h(), t = Cl(), i = pr(), a = Br(), s = se(), o = s("iterator"), u = t.values, l = function(v, f) {
    if (v) {
      if (v[o] !== u) try {
        i(v, o, u);
      } catch (d) {
        v[o] = u;
      }
      if (a(v, f, !0), e[f]) {
        for (var g in t)
          if (v[g] !== t[g]) try {
            i(v, g, t[g]);
          } catch (d) {
            v[g] = t[g];
          }
      }
    }
  };
  for (var h in e)
    l(n[h] && n[h].prototype, h);
  return l(r, "DOMTokenList"), tu;
}
Hh();
function zh(n, e) {
  if (qa(n) != "object" || !n) return n;
  var r = n[Symbol.toPrimitive];
  if (r !== void 0) {
    var t = r.call(n, e);
    if (qa(t) != "object") return t;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (e === "string" ? String : Number)(n);
}
function Wh(n) {
  var e = zh(n, "string");
  return qa(e) == "symbol" ? e : e + "";
}
function nn(n, e, r) {
  return (e = Wh(e)) in n ? Object.defineProperty(n, e, {
    value: r,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : n[e] = r, n;
}
var su = {}, Ta, ou;
function Yh() {
  if (ou) return Ta;
  ou = 1;
  var n = Ue(), e = Mr(), r = Ju(), t = Wa(), i = TypeError, a = "Reduce of empty array with no initial value", s = function(u) {
    return function(l, h, c, v) {
      var f = e(l), g = r(f), d = t(f);
      if (n(h), d === 0 && c < 2) throw new i(a);
      var p = u ? d - 1 : 0, m = u ? -1 : 1;
      if (c < 2) for (; ; ) {
        if (p in g) {
          v = g[p], p += m;
          break;
        }
        if (p += m, u ? p < 0 : d <= p)
          throw new i(a);
      }
      for (; u ? p >= 0 : d > p; p += m) p in g && (v = h(v, g[p], p, f));
      return v;
    };
  };
  return Ta = {
    // `Array.prototype.reduce` method
    // https://tc39.es/ecma262/#sec-array.prototype.reduce
    left: s(!1),
    // `Array.prototype.reduceRight` method
    // https://tc39.es/ecma262/#sec-array.prototype.reduceright
    right: s(!0)
  }, Ta;
}
var Sa, uu;
function wl() {
  if (uu) return Sa;
  uu = 1;
  var n = re();
  return Sa = function(e, r) {
    var t = [][e];
    return !!t && n(function() {
      t.call(null, r || function() {
        return 1;
      }, 1);
    });
  }, Sa;
}
var lu;
function Xh() {
  if (lu) return su;
  lu = 1;
  var n = he(), e = Yh().left, r = wl(), t = Ba(), i = jr(), a = !i && t > 79 && t < 83, s = a || !r("reduce");
  return n({
    target: "Array",
    proto: !0,
    forced: s
  }, {
    reduce: function(u) {
      var l = arguments.length;
      return e(this, u, l, l > 1 ? arguments[1] : void 0);
    }
  }), su;
}
Xh();
var hu = {}, fu;
function Kh() {
  if (fu) return hu;
  fu = 1;
  var n = he(), e = Fr(), r = Dr().f, t = nr(), i = Ve(), a = tn(), s = Pe(), o = an(), u = De(), l = e("".slice), h = Math.min, c = o("endsWith"), v = !u && !c && !!function() {
    var f = r(String.prototype, "endsWith");
    return f && !f.writable;
  }();
  return n({
    target: "String",
    proto: !0,
    forced: !v && !c
  }, {
    endsWith: function(g) {
      var d = i(s(this));
      a(g);
      var p = arguments.length > 1 ? arguments[1] : void 0, m = d.length, x = p === void 0 ? m : h(t(p), m), y = i(g);
      return l(d, x - y.length, x) === y;
    }
  }), hu;
}
Kh();
var cu = {}, vu;
function Qh() {
  if (vu) return cu;
  vu = 1;
  var n = oe(), e = te(), r = Ja(), t = le(), i = Je(), a = Pe(), s = vl(), o = en(), u = nr(), l = Ve(), h = ar(), c = rn(), v = Sl(), f = re(), g = v.UNSUPPORTED_Y, d = 4294967295, p = Math.min, m = e([].push), x = e("".slice), y = !f(function() {
    var T = /(?:)/, E = T.exec;
    T.exec = function() {
      return E.apply(this, arguments);
    };
    var O = "ab".split(T);
    return O.length !== 2 || O[0] !== "a" || O[1] !== "b";
  }), b = "abbc".split(/(b)*/)[1] === "c" || // eslint-disable-next-line regexp/no-empty-group -- required for testing
  "test".split(/(?:)/, -1).length !== 4 || "ab".split(/(?:ab)*/).length !== 2 || ".".split(/(.?)(.?)/).length !== 4 || // eslint-disable-next-line regexp/no-empty-capturing-group, regexp/no-empty-group -- required for testing
  ".".split(/()()/).length > 1 || "".split(/.?/).length;
  return r("split", function(T, E, O) {
    var N = "0".split(void 0, 0).length ? function(D, P) {
      return D === void 0 && P === 0 ? [] : n(E, this, D, P);
    } : E;
    return [
      // `String.prototype.split` method
      // https://tc39.es/ecma262/#sec-string.prototype.split
      function(P, M) {
        var A = a(this), V = i(P) ? void 0 : h(P, T);
        return V ? n(V, P, A, M) : n(N, l(A), P, M);
      },
      // `RegExp.prototype[@@split]` method
      // https://tc39.es/ecma262/#sec-regexp.prototype-@@split
      //
      // NOTE: This cannot be properly polyfilled in engines that don't support
      // the 'y' flag.
      function(D, P) {
        var M = t(this), A = l(D);
        if (!b) {
          var V = O(N, M, A, P, N !== E);
          if (V.done) return V.value;
        }
        var w = s(M, RegExp), C = M.unicode, L = (M.ignoreCase ? "i" : "") + (M.multiline ? "m" : "") + (M.unicode ? "u" : "") + (g ? "g" : "y"), I = new w(g ? "^(?:" + M.source + ")" : M, L), j = P === void 0 ? d : P >>> 0;
        if (j === 0) return [];
        if (A.length === 0) return c(I, A) === null ? [A] : [];
        for (var _ = 0, k = 0, B = []; k < A.length; ) {
          I.lastIndex = g ? 0 : k;
          var H = c(I, g ? x(A, k) : A), Y;
          if (H === null || (Y = p(u(I.lastIndex + (g ? k : 0)), A.length)) === _)
            k = o(A, k, C);
          else {
            if (m(B, x(A, _, k)), B.length === j) return B;
            for (var K = 1; K <= H.length - 1; K++)
              if (m(B, H[K]), B.length === j) return B;
            k = _ = Y;
          }
        }
        return m(B, x(A, _)), B;
      }
    ];
  }, b || !y, g), cu;
}
Qh();
var cr = { exports: {} }, Ke = { exports: {} }, Zh = Ke.exports, gu;
function Jh() {
  return gu || (gu = 1, function() {
    var n, e, r, t, i, a;
    typeof performance != "undefined" && performance !== null && performance.now ? Ke.exports = function() {
      return performance.now();
    } : typeof process != "undefined" && process !== null && process.hrtime ? (Ke.exports = function() {
      return (n() - i) / 1e6;
    }, e = process.hrtime, n = function() {
      var o;
      return o = e(), o[0] * 1e9 + o[1];
    }, t = n(), a = process.uptime() * 1e9, i = t - a) : Date.now ? (Ke.exports = function() {
      return Date.now() - r;
    }, r = Date.now()) : (Ke.exports = function() {
      return (/* @__PURE__ */ new Date()).getTime() - r;
    }, r = (/* @__PURE__ */ new Date()).getTime());
  }.call(Zh)), Ke.exports;
}
var du;
function ef() {
  if (du) return cr.exports;
  du = 1;
  for (var n = Jh(), e = typeof window == "undefined" ? Ma : window, r = ["moz", "webkit"], t = "AnimationFrame", i = e["request" + t], a = e["cancel" + t] || e["cancelRequest" + t], s = 0; !i && s < r.length; s++)
    i = e[r[s] + "Request" + t], a = e[r[s] + "Cancel" + t] || e[r[s] + "CancelRequest" + t];
  if (!i || !a) {
    var o = 0, u = 0, l = [], h = 1e3 / 60;
    i = function(v) {
      if (l.length === 0) {
        var f = n(), g = Math.max(0, h - (f - o));
        o = g + f, setTimeout(function() {
          var d = l.slice(0);
          l.length = 0;
          for (var p = function() {
            if (!d[m].cancelled)
              try {
                d[m].callback(o);
              } catch (y) {
                setTimeout(function() {
                  throw y;
                }, 0);
              }
          }, m = 0; m < d.length; m++)
            p();
        }, Math.round(g));
      }
      return l.push({
        handle: ++u,
        callback: v,
        cancelled: !1
      }), u;
    }, a = function(v) {
      for (var f = 0; f < l.length; f++)
        l[f].handle === v && (l[f].cancelled = !0);
    };
  }
  return cr.exports = function(c) {
    return i.call(e, c);
  }, cr.exports.cancel = function() {
    a.apply(e, arguments);
  }, cr.exports.polyfill = function(c) {
    c || (c = e), c.requestAnimationFrame = i, c.cancelAnimationFrame = a;
  }, cr.exports;
}
var rf = ef();
const Ea = /* @__PURE__ */ Zu(rf);
var pu = {}, Ra, yu;
function Pl() {
  return yu || (yu = 1, Ra = `	
\v\f\r                　\u2028\u2029\uFEFF`), Ra;
}
var Ca, mu;
function tf() {
  if (mu) return Ca;
  mu = 1;
  var n = te(), e = Pe(), r = Ve(), t = Pl(), i = n("".replace), a = RegExp("^[" + t + "]+"), s = RegExp("(^|[^" + t + "])[" + t + "]+$"), o = function(l) {
    return function(h) {
      var c = r(e(h));
      return l & 1 && (c = i(c, a, "")), l & 2 && (c = i(c, s, "$1")), c;
    };
  };
  return Ca = {
    // `String.prototype.{ trimLeft, trimStart }` methods
    // https://tc39.es/ecma262/#sec-string.prototype.trimstart
    start: o(1),
    // `String.prototype.{ trimRight, trimEnd }` methods
    // https://tc39.es/ecma262/#sec-string.prototype.trimend
    end: o(2),
    // `String.prototype.trim` method
    // https://tc39.es/ecma262/#sec-string.prototype.trim
    trim: o(3)
  }, Ca;
}
var wa, bu;
function af() {
  if (bu) return wa;
  bu = 1;
  var n = Vr().PROPER, e = re(), r = Pl(), t = "​᠎";
  return wa = function(i) {
    return e(function() {
      return !!r[i]() || t[i]() !== t || n && r[i].name !== i;
    });
  }, wa;
}
var xu;
function nf() {
  if (xu) return pu;
  xu = 1;
  var n = he(), e = tf().trim, r = af();
  return n({
    target: "String",
    proto: !0,
    forced: r("trim")
  }, {
    trim: function() {
      return e(this);
    }
  }), pu;
}
nf();
var Pa, Ou;
function sf() {
  return Ou || (Ou = 1, Pa = function(n) {
    this.ok = !1, this.alpha = 1, n.charAt(0) == "#" && (n = n.substr(1, 6)), n = n.replace(/ /g, ""), n = n.toLowerCase();
    var e = {
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
      rebeccapurple: "663399",
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
    };
    n = e[n] || n;
    for (var r = [{
      re: /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*((?:\d?\.)?\d)\)$/,
      example: ["rgba(123, 234, 45, 0.8)", "rgba(255,234,245,1.0)"],
      process: function(l) {
        return [parseInt(l[1]), parseInt(l[2]), parseInt(l[3]), parseFloat(l[4])];
      }
    }, {
      re: /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/,
      example: ["rgb(123, 234, 45)", "rgb(255,234,245)"],
      process: function(l) {
        return [parseInt(l[1]), parseInt(l[2]), parseInt(l[3])];
      }
    }, {
      re: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
      example: ["#00ff00", "336699"],
      process: function(l) {
        return [parseInt(l[1], 16), parseInt(l[2], 16), parseInt(l[3], 16)];
      }
    }, {
      re: /^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
      example: ["#fb0", "f0f"],
      process: function(l) {
        return [parseInt(l[1] + l[1], 16), parseInt(l[2] + l[2], 16), parseInt(l[3] + l[3], 16)];
      }
    }], t = 0; t < r.length; t++) {
      var i = r[t].re, a = r[t].process, s = i.exec(n);
      if (s) {
        var o = a(s);
        this.r = o[0], this.g = o[1], this.b = o[2], o.length > 3 && (this.alpha = o[3]), this.ok = !0;
      }
    }
    this.r = this.r < 0 || isNaN(this.r) ? 0 : this.r > 255 ? 255 : this.r, this.g = this.g < 0 || isNaN(this.g) ? 0 : this.g > 255 ? 255 : this.g, this.b = this.b < 0 || isNaN(this.b) ? 0 : this.b > 255 ? 255 : this.b, this.alpha = this.alpha < 0 ? 0 : this.alpha > 1 || isNaN(this.alpha) ? 1 : this.alpha, this.toRGB = function() {
      return "rgb(" + this.r + ", " + this.g + ", " + this.b + ")";
    }, this.toRGBA = function() {
      return "rgba(" + this.r + ", " + this.g + ", " + this.b + ", " + this.alpha + ")";
    }, this.toHex = function() {
      var u = this.r.toString(16), l = this.g.toString(16), h = this.b.toString(16);
      return u.length == 1 && (u = "0" + u), l.length == 1 && (l = "0" + l), h.length == 1 && (h = "0" + h), "#" + u + l + h;
    }, this.getHelpXML = function() {
      for (var u = new Array(), l = 0; l < r.length; l++)
        for (var h = r[l].example, c = 0; c < h.length; c++)
          u[u.length] = h[c];
      for (var v in e)
        u[u.length] = v;
      var f = document.createElement("ul");
      f.setAttribute("id", "rgbcolor-examples");
      for (var l = 0; l < u.length; l++)
        try {
          var g = document.createElement("li"), d = new RGBColor(u[l]), p = document.createElement("div");
          p.style.cssText = "margin: 3px; border: 1px solid black; background:" + d.toHex() + "; color:" + d.toHex(), p.appendChild(document.createTextNode("test"));
          var m = document.createTextNode(" " + u[l] + " -> " + d.toRGB() + " -> " + d.toHex());
          g.appendChild(p), g.appendChild(m), f.appendChild(g);
        } catch (y) {
        }
      return f;
    };
  }), Pa;
}
var of = sf();
const Da = /* @__PURE__ */ Zu(of);
var Tu = {}, Su;
function uf() {
  if (Su) return Tu;
  Su = 1;
  var n = he(), e = Fr(), r = ul().indexOf, t = wl(), i = e([].indexOf), a = !!i && 1 / i([1], 1, -0) < 0, s = a || !t("indexOf");
  return n({
    target: "Array",
    proto: !0,
    forced: s
  }, {
    indexOf: function(u) {
      var l = arguments.length > 1 ? arguments[1] : void 0;
      return a ? i(this, u, l) || 0 : r(this, u, l);
    }
  }), Tu;
}
uf();
var Eu = {}, Ru;
function lf() {
  if (Ru) return Eu;
  Ru = 1;
  var n = he(), e = te(), r = tn(), t = Pe(), i = Ve(), a = an(), s = e("".indexOf);
  return n({
    target: "String",
    proto: !0,
    forced: !a("includes")
  }, {
    includes: function(u) {
      return !!~s(i(t(this)), i(r(u)), arguments.length > 1 ? arguments[1] : void 0);
    }
  }), Eu;
}
lf();
var Cu = {}, Aa, wu;
function hf() {
  if (wu) return Aa;
  wu = 1;
  var n = Ze();
  return Aa = Array.isArray || function(r) {
    return n(r) === "Array";
  }, Aa;
}
var Pu;
function ff() {
  if (Pu) return Cu;
  Pu = 1;
  var n = he(), e = te(), r = hf(), t = e([].reverse), i = [1, 2];
  return n({
    target: "Array",
    proto: !0,
    forced: String(i) === String(i.reverse())
  }, {
    reverse: function() {
      return r(this) && (this.length = this.length), t(this);
    }
  }), Cu;
}
ff();
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
var Al = function(e, r) {
  return (Al = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function(t, i) {
    t.__proto__ = i;
  } || function(t, i) {
    for (var a in i) Object.prototype.hasOwnProperty.call(i, a) && (t[a] = i[a]);
  })(e, r);
};
function Il(n, e) {
  if (typeof e != "function" && e !== null) throw new TypeError("Class extends value " + String(e) + " is not a constructor or null");
  function r() {
    this.constructor = n;
  }
  Al(n, e), n.prototype = e === null ? Object.create(e) : (r.prototype = e.prototype, new r());
}
function cf(n) {
  var e = "";
  Array.isArray(n) || (n = [n]);
  for (var r = 0; r < n.length; r++) {
    var t = n[r];
    if (t.type === S.CLOSE_PATH) e += "z";
    else if (t.type === S.HORIZ_LINE_TO) e += (t.relative ? "h" : "H") + t.x;
    else if (t.type === S.VERT_LINE_TO) e += (t.relative ? "v" : "V") + t.y;
    else if (t.type === S.MOVE_TO) e += (t.relative ? "m" : "M") + t.x + " " + t.y;
    else if (t.type === S.LINE_TO) e += (t.relative ? "l" : "L") + t.x + " " + t.y;
    else if (t.type === S.CURVE_TO) e += (t.relative ? "c" : "C") + t.x1 + " " + t.y1 + " " + t.x2 + " " + t.y2 + " " + t.x + " " + t.y;
    else if (t.type === S.SMOOTH_CURVE_TO) e += (t.relative ? "s" : "S") + t.x2 + " " + t.y2 + " " + t.x + " " + t.y;
    else if (t.type === S.QUAD_TO) e += (t.relative ? "q" : "Q") + t.x1 + " " + t.y1 + " " + t.x + " " + t.y;
    else if (t.type === S.SMOOTH_QUAD_TO) e += (t.relative ? "t" : "T") + t.x + " " + t.y;
    else {
      if (t.type !== S.ARC) throw new Error('Unexpected command type "' + t.type + '" at index ' + r + ".");
      e += (t.relative ? "a" : "A") + t.rX + " " + t.rY + " " + t.xRot + " " + +t.lArcFlag + " " + +t.sweepFlag + " " + t.x + " " + t.y;
    }
  }
  return e;
}
function Va(n, e) {
  var r = n[0], t = n[1];
  return [r * Math.cos(e) - t * Math.sin(e), r * Math.sin(e) + t * Math.cos(e)];
}
function Ce() {
  for (var n = [], e = 0; e < arguments.length; e++) n[e] = arguments[e];
  for (var r = 0; r < n.length; r++) if (typeof n[r] != "number") throw new Error("assertNumbers arguments[" + r + "] is not a number. " + typeof n[r] + " == typeof " + n[r]);
  return !0;
}
var $e = Math.PI;
function Ia(n, e, r) {
  n.lArcFlag = n.lArcFlag === 0 ? 0 : 1, n.sweepFlag = n.sweepFlag === 0 ? 0 : 1;
  var t = n.rX, i = n.rY, a = n.x, s = n.y;
  t = Math.abs(n.rX), i = Math.abs(n.rY);
  var o = Va([(e - a) / 2, (r - s) / 2], -n.xRot / 180 * $e), u = o[0], l = o[1], h = Math.pow(u, 2) / Math.pow(t, 2) + Math.pow(l, 2) / Math.pow(i, 2);
  1 < h && (t *= Math.sqrt(h), i *= Math.sqrt(h)), n.rX = t, n.rY = i;
  var c = Math.pow(t, 2) * Math.pow(l, 2) + Math.pow(i, 2) * Math.pow(u, 2), v = (n.lArcFlag !== n.sweepFlag ? 1 : -1) * Math.sqrt(Math.max(0, (Math.pow(t, 2) * Math.pow(i, 2) - c) / c)), f = t * l / i * v, g = -i * u / t * v, d = Va([f, g], n.xRot / 180 * $e);
  n.cX = d[0] + (e + a) / 2, n.cY = d[1] + (r + s) / 2, n.phi1 = Math.atan2((l - g) / i, (u - f) / t), n.phi2 = Math.atan2((-l - g) / i, (-u - f) / t), n.sweepFlag === 0 && n.phi2 > n.phi1 && (n.phi2 -= 2 * $e), n.sweepFlag === 1 && n.phi2 < n.phi1 && (n.phi2 += 2 * $e), n.phi1 *= 180 / $e, n.phi2 *= 180 / $e;
}
function Au(n, e, r) {
  Ce(n, e, r);
  var t = n * n + e * e - r * r;
  if (0 > t) return [];
  if (t === 0) return [[n * r / (n * n + e * e), e * r / (n * n + e * e)]];
  var i = Math.sqrt(t);
  return [[(n * r + e * i) / (n * n + e * e), (e * r - n * i) / (n * n + e * e)], [(n * r - e * i) / (n * n + e * e), (e * r + n * i) / (n * n + e * e)]];
}
var ne, je = Math.PI / 180;
function Iu(n, e, r) {
  return (1 - r) * n + r * e;
}
function Nu(n, e, r, t) {
  return n + Math.cos(t / 180 * $e) * e + Math.sin(t / 180 * $e) * r;
}
function _u(n, e, r, t) {
  var i = 1e-6, a = e - n, s = r - e, o = 3 * a + 3 * (t - r) - 6 * s, u = 6 * (s - a), l = 3 * a;
  return Math.abs(o) < i ? [-l / u] : function(h, c, v) {
    var f = h * h / 4 - c;
    if (f < -1e-6) return [];
    if (f <= v) return [-h / 2];
    var g = Math.sqrt(f);
    return [-h / 2 - g, -h / 2 + g];
  }(u / o, l / o, i);
}
function Mu(n, e, r, t, i) {
  var a = 1 - i;
  return n * (a * a * a) + e * (3 * a * a * i) + r * (3 * a * i * i) + t * (i * i * i);
}
(function(n) {
  function e() {
    return i(function(o, u, l) {
      return o.relative && (o.x1 !== void 0 && (o.x1 += u), o.y1 !== void 0 && (o.y1 += l), o.x2 !== void 0 && (o.x2 += u), o.y2 !== void 0 && (o.y2 += l), o.x !== void 0 && (o.x += u), o.y !== void 0 && (o.y += l), o.relative = !1), o;
    });
  }
  function r() {
    var o = NaN, u = NaN, l = NaN, h = NaN;
    return i(function(c, v, f) {
      return c.type & S.SMOOTH_CURVE_TO && (c.type = S.CURVE_TO, o = isNaN(o) ? v : o, u = isNaN(u) ? f : u, c.x1 = c.relative ? v - o : 2 * v - o, c.y1 = c.relative ? f - u : 2 * f - u), c.type & S.CURVE_TO ? (o = c.relative ? v + c.x2 : c.x2, u = c.relative ? f + c.y2 : c.y2) : (o = NaN, u = NaN), c.type & S.SMOOTH_QUAD_TO && (c.type = S.QUAD_TO, l = isNaN(l) ? v : l, h = isNaN(h) ? f : h, c.x1 = c.relative ? v - l : 2 * v - l, c.y1 = c.relative ? f - h : 2 * f - h), c.type & S.QUAD_TO ? (l = c.relative ? v + c.x1 : c.x1, h = c.relative ? f + c.y1 : c.y1) : (l = NaN, h = NaN), c;
    });
  }
  function t() {
    var o = NaN, u = NaN;
    return i(function(l, h, c) {
      if (l.type & S.SMOOTH_QUAD_TO && (l.type = S.QUAD_TO, o = isNaN(o) ? h : o, u = isNaN(u) ? c : u, l.x1 = l.relative ? h - o : 2 * h - o, l.y1 = l.relative ? c - u : 2 * c - u), l.type & S.QUAD_TO) {
        o = l.relative ? h + l.x1 : l.x1, u = l.relative ? c + l.y1 : l.y1;
        var v = l.x1, f = l.y1;
        l.type = S.CURVE_TO, l.x1 = ((l.relative ? 0 : h) + 2 * v) / 3, l.y1 = ((l.relative ? 0 : c) + 2 * f) / 3, l.x2 = (l.x + 2 * v) / 3, l.y2 = (l.y + 2 * f) / 3;
      } else o = NaN, u = NaN;
      return l;
    });
  }
  function i(o) {
    var u = 0, l = 0, h = NaN, c = NaN;
    return function(v) {
      if (isNaN(h) && !(v.type & S.MOVE_TO)) throw new Error("path must start with moveto");
      var f = o(v, u, l, h, c);
      return v.type & S.CLOSE_PATH && (u = h, l = c), v.x !== void 0 && (u = v.relative ? u + v.x : v.x), v.y !== void 0 && (l = v.relative ? l + v.y : v.y), v.type & S.MOVE_TO && (h = u, c = l), f;
    };
  }
  function a(o, u, l, h, c, v) {
    return Ce(o, u, l, h, c, v), i(function(f, g, d, p) {
      var m = f.x1, x = f.x2, y = f.relative && !isNaN(p), b = f.x !== void 0 ? f.x : y ? 0 : g, T = f.y !== void 0 ? f.y : y ? 0 : d;
      function E(H) {
        return H * H;
      }
      f.type & S.HORIZ_LINE_TO && u !== 0 && (f.type = S.LINE_TO, f.y = f.relative ? 0 : d), f.type & S.VERT_LINE_TO && l !== 0 && (f.type = S.LINE_TO, f.x = f.relative ? 0 : g), f.x !== void 0 && (f.x = f.x * o + T * l + (y ? 0 : c)), f.y !== void 0 && (f.y = b * u + f.y * h + (y ? 0 : v)), f.x1 !== void 0 && (f.x1 = f.x1 * o + f.y1 * l + (y ? 0 : c)), f.y1 !== void 0 && (f.y1 = m * u + f.y1 * h + (y ? 0 : v)), f.x2 !== void 0 && (f.x2 = f.x2 * o + f.y2 * l + (y ? 0 : c)), f.y2 !== void 0 && (f.y2 = x * u + f.y2 * h + (y ? 0 : v));
      var O = o * h - u * l;
      if (f.xRot !== void 0 && (o !== 1 || u !== 0 || l !== 0 || h !== 1)) if (O === 0) delete f.rX, delete f.rY, delete f.xRot, delete f.lArcFlag, delete f.sweepFlag, f.type = S.LINE_TO;
      else {
        var N = f.xRot * Math.PI / 180, D = Math.sin(N), P = Math.cos(N), M = 1 / E(f.rX), A = 1 / E(f.rY), V = E(P) * M + E(D) * A, w = 2 * D * P * (M - A), C = E(D) * M + E(P) * A, L = V * h * h - w * u * h + C * u * u, I = w * (o * h + u * l) - 2 * (V * l * h + C * o * u), j = V * l * l - w * o * l + C * o * o, _ = (Math.atan2(I, L - j) + Math.PI) % Math.PI / 2, k = Math.sin(_), B = Math.cos(_);
        f.rX = Math.abs(O) / Math.sqrt(L * E(B) + I * k * B + j * E(k)), f.rY = Math.abs(O) / Math.sqrt(L * E(k) - I * k * B + j * E(B)), f.xRot = 180 * _ / Math.PI;
      }
      return f.sweepFlag !== void 0 && 0 > O && (f.sweepFlag = +!f.sweepFlag), f;
    });
  }
  function s() {
    return function(o) {
      var u = {};
      for (var l in o) u[l] = o[l];
      return u;
    };
  }
  n.ROUND = function(o) {
    function u(l) {
      return Math.round(l * o) / o;
    }
    return o === void 0 && (o = 1e13), Ce(o), function(l) {
      return l.x1 !== void 0 && (l.x1 = u(l.x1)), l.y1 !== void 0 && (l.y1 = u(l.y1)), l.x2 !== void 0 && (l.x2 = u(l.x2)), l.y2 !== void 0 && (l.y2 = u(l.y2)), l.x !== void 0 && (l.x = u(l.x)), l.y !== void 0 && (l.y = u(l.y)), l.rX !== void 0 && (l.rX = u(l.rX)), l.rY !== void 0 && (l.rY = u(l.rY)), l;
    };
  }, n.TO_ABS = e, n.TO_REL = function() {
    return i(function(o, u, l) {
      return o.relative || (o.x1 !== void 0 && (o.x1 -= u), o.y1 !== void 0 && (o.y1 -= l), o.x2 !== void 0 && (o.x2 -= u), o.y2 !== void 0 && (o.y2 -= l), o.x !== void 0 && (o.x -= u), o.y !== void 0 && (o.y -= l), o.relative = !0), o;
    });
  }, n.NORMALIZE_HVZ = function(o, u, l) {
    return o === void 0 && (o = !0), u === void 0 && (u = !0), l === void 0 && (l = !0), i(function(h, c, v, f, g) {
      if (isNaN(f) && !(h.type & S.MOVE_TO)) throw new Error("path must start with moveto");
      return u && h.type & S.HORIZ_LINE_TO && (h.type = S.LINE_TO, h.y = h.relative ? 0 : v), l && h.type & S.VERT_LINE_TO && (h.type = S.LINE_TO, h.x = h.relative ? 0 : c), o && h.type & S.CLOSE_PATH && (h.type = S.LINE_TO, h.x = h.relative ? f - c : f, h.y = h.relative ? g - v : g), h.type & S.ARC && (h.rX === 0 || h.rY === 0) && (h.type = S.LINE_TO, delete h.rX, delete h.rY, delete h.xRot, delete h.lArcFlag, delete h.sweepFlag), h;
    });
  }, n.NORMALIZE_ST = r, n.QT_TO_C = t, n.INFO = i, n.SANITIZE = function(o) {
    o === void 0 && (o = 0), Ce(o);
    var u = NaN, l = NaN, h = NaN, c = NaN;
    return i(function(v, f, g, d, p) {
      var m = Math.abs, x = !1, y = 0, b = 0;
      if (v.type & S.SMOOTH_CURVE_TO && (y = isNaN(u) ? 0 : f - u, b = isNaN(l) ? 0 : g - l), v.type & (S.CURVE_TO | S.SMOOTH_CURVE_TO) ? (u = v.relative ? f + v.x2 : v.x2, l = v.relative ? g + v.y2 : v.y2) : (u = NaN, l = NaN), v.type & S.SMOOTH_QUAD_TO ? (h = isNaN(h) ? f : 2 * f - h, c = isNaN(c) ? g : 2 * g - c) : v.type & S.QUAD_TO ? (h = v.relative ? f + v.x1 : v.x1, c = v.relative ? g + v.y1 : v.y2) : (h = NaN, c = NaN), v.type & S.LINE_COMMANDS || v.type & S.ARC && (v.rX === 0 || v.rY === 0 || !v.lArcFlag) || v.type & S.CURVE_TO || v.type & S.SMOOTH_CURVE_TO || v.type & S.QUAD_TO || v.type & S.SMOOTH_QUAD_TO) {
        var T = v.x === void 0 ? 0 : v.relative ? v.x : v.x - f, E = v.y === void 0 ? 0 : v.relative ? v.y : v.y - g;
        y = isNaN(h) ? v.x1 === void 0 ? y : v.relative ? v.x : v.x1 - f : h - f, b = isNaN(c) ? v.y1 === void 0 ? b : v.relative ? v.y : v.y1 - g : c - g;
        var O = v.x2 === void 0 ? 0 : v.relative ? v.x : v.x2 - f, N = v.y2 === void 0 ? 0 : v.relative ? v.y : v.y2 - g;
        m(T) <= o && m(E) <= o && m(y) <= o && m(b) <= o && m(O) <= o && m(N) <= o && (x = !0);
      }
      return v.type & S.CLOSE_PATH && m(f - d) <= o && m(g - p) <= o && (x = !0), x ? [] : v;
    });
  }, n.MATRIX = a, n.ROTATE = function(o, u, l) {
    u === void 0 && (u = 0), l === void 0 && (l = 0), Ce(o, u, l);
    var h = Math.sin(o), c = Math.cos(o);
    return a(c, h, -h, c, u - u * c + l * h, l - u * h - l * c);
  }, n.TRANSLATE = function(o, u) {
    return u === void 0 && (u = 0), Ce(o, u), a(1, 0, 0, 1, o, u);
  }, n.SCALE = function(o, u) {
    return u === void 0 && (u = o), Ce(o, u), a(o, 0, 0, u, 0, 0);
  }, n.SKEW_X = function(o) {
    return Ce(o), a(1, 0, Math.atan(o), 1, 0, 0);
  }, n.SKEW_Y = function(o) {
    return Ce(o), a(1, Math.atan(o), 0, 1, 0, 0);
  }, n.X_AXIS_SYMMETRY = function(o) {
    return o === void 0 && (o = 0), Ce(o), a(-1, 0, 0, 1, o, 0);
  }, n.Y_AXIS_SYMMETRY = function(o) {
    return o === void 0 && (o = 0), Ce(o), a(1, 0, 0, -1, 0, o);
  }, n.A_TO_C = function() {
    return i(function(o, u, l) {
      return S.ARC === o.type ? function(h, c, v) {
        var f, g, d, p;
        h.cX || Ia(h, c, v);
        for (var m = Math.min(h.phi1, h.phi2), x = Math.max(h.phi1, h.phi2) - m, y = Math.ceil(x / 90), b = new Array(y), T = c, E = v, O = 0; O < y; O++) {
          var N = Iu(h.phi1, h.phi2, O / y), D = Iu(h.phi1, h.phi2, (O + 1) / y), P = D - N, M = 4 / 3 * Math.tan(P * je / 4), A = [Math.cos(N * je) - M * Math.sin(N * je), Math.sin(N * je) + M * Math.cos(N * je)], V = A[0], w = A[1], C = [Math.cos(D * je), Math.sin(D * je)], L = C[0], I = C[1], j = [L + M * Math.sin(D * je), I - M * Math.cos(D * je)], _ = j[0], k = j[1];
          b[O] = {
            relative: h.relative,
            type: S.CURVE_TO
          };
          var B = function(Y, K) {
            var z = Va([Y * h.rX, K * h.rY], h.xRot), pe = z[0], ye = z[1];
            return [h.cX + pe, h.cY + ye];
          };
          f = B(V, w), b[O].x1 = f[0], b[O].y1 = f[1], g = B(_, k), b[O].x2 = g[0], b[O].y2 = g[1], d = B(L, I), b[O].x = d[0], b[O].y = d[1], h.relative && (b[O].x1 -= T, b[O].y1 -= E, b[O].x2 -= T, b[O].y2 -= E, b[O].x -= T, b[O].y -= E), T = (p = [b[O].x, b[O].y])[0], E = p[1];
        }
        return b;
      }(o, o.relative ? 0 : u, o.relative ? 0 : l) : o;
    });
  }, n.ANNOTATE_ARCS = function() {
    return i(function(o, u, l) {
      return o.relative && (u = 0, l = 0), S.ARC === o.type && Ia(o, u, l), o;
    });
  }, n.CLONE = s, n.CALCULATE_BOUNDS = function() {
    var o = function(f) {
      var g = {};
      for (var d in f) g[d] = f[d];
      return g;
    }, u = e(), l = t(), h = r(), c = i(function(v, f, g) {
      var d = h(l(u(o(v))));
      function p(k) {
        k > c.maxX && (c.maxX = k), k < c.minX && (c.minX = k);
      }
      function m(k) {
        k > c.maxY && (c.maxY = k), k < c.minY && (c.minY = k);
      }
      if (d.type & S.DRAWING_COMMANDS && (p(f), m(g)), d.type & S.HORIZ_LINE_TO && p(d.x), d.type & S.VERT_LINE_TO && m(d.y), d.type & S.LINE_TO && (p(d.x), m(d.y)), d.type & S.CURVE_TO) {
        p(d.x), m(d.y);
        for (var x = 0, y = _u(f, d.x1, d.x2, d.x); x < y.length; x++)
          0 < (_ = y[x]) && 1 > _ && p(Mu(f, d.x1, d.x2, d.x, _));
        for (var b = 0, T = _u(g, d.y1, d.y2, d.y); b < T.length; b++)
          0 < (_ = T[b]) && 1 > _ && m(Mu(g, d.y1, d.y2, d.y, _));
      }
      if (d.type & S.ARC) {
        p(d.x), m(d.y), Ia(d, f, g);
        for (var E = d.xRot / 180 * Math.PI, O = Math.cos(E) * d.rX, N = Math.sin(E) * d.rX, D = -Math.sin(E) * d.rY, P = Math.cos(E) * d.rY, M = d.phi1 < d.phi2 ? [d.phi1, d.phi2] : -180 > d.phi2 ? [d.phi2 + 360, d.phi1 + 360] : [d.phi2, d.phi1], A = M[0], V = M[1], w = function(B) {
          var H = B[0], Y = B[1], K = 180 * Math.atan2(Y, H) / Math.PI;
          return K < A ? K + 360 : K;
        }, C = 0, L = Au(D, -O, 0).map(w); C < L.length; C++)
          (_ = L[C]) > A && _ < V && p(Nu(d.cX, O, D, _));
        for (var I = 0, j = Au(P, -N, 0).map(w); I < j.length; I++) {
          var _;
          (_ = j[I]) > A && _ < V && m(Nu(d.cY, N, P, _));
        }
      }
      return v;
    });
    return c.minX = 1 / 0, c.maxX = -1 / 0, c.minY = 1 / 0, c.maxY = -1 / 0, c;
  };
})(ne || (ne = {}));
var Re, Nl = function() {
  function n() {
  }
  return n.prototype.round = function(e) {
    return this.transform(ne.ROUND(e));
  }, n.prototype.toAbs = function() {
    return this.transform(ne.TO_ABS());
  }, n.prototype.toRel = function() {
    return this.transform(ne.TO_REL());
  }, n.prototype.normalizeHVZ = function(e, r, t) {
    return this.transform(ne.NORMALIZE_HVZ(e, r, t));
  }, n.prototype.normalizeST = function() {
    return this.transform(ne.NORMALIZE_ST());
  }, n.prototype.qtToC = function() {
    return this.transform(ne.QT_TO_C());
  }, n.prototype.aToC = function() {
    return this.transform(ne.A_TO_C());
  }, n.prototype.sanitize = function(e) {
    return this.transform(ne.SANITIZE(e));
  }, n.prototype.translate = function(e, r) {
    return this.transform(ne.TRANSLATE(e, r));
  }, n.prototype.scale = function(e, r) {
    return this.transform(ne.SCALE(e, r));
  }, n.prototype.rotate = function(e, r, t) {
    return this.transform(ne.ROTATE(e, r, t));
  }, n.prototype.matrix = function(e, r, t, i, a, s) {
    return this.transform(ne.MATRIX(e, r, t, i, a, s));
  }, n.prototype.skewX = function(e) {
    return this.transform(ne.SKEW_X(e));
  }, n.prototype.skewY = function(e) {
    return this.transform(ne.SKEW_Y(e));
  }, n.prototype.xSymmetry = function(e) {
    return this.transform(ne.X_AXIS_SYMMETRY(e));
  }, n.prototype.ySymmetry = function(e) {
    return this.transform(ne.Y_AXIS_SYMMETRY(e));
  }, n.prototype.annotateArcs = function() {
    return this.transform(ne.ANNOTATE_ARCS());
  }, n;
}(), vf = function(e) {
  return e === " " || e === "	" || e === "\r" || e === `
`;
}, qu = function(e) {
  return 48 <= e.charCodeAt(0) && e.charCodeAt(0) <= 57;
}, gf = function(n) {
  function e() {
    var r = n.call(this) || this;
    return r.curNumber = "", r.curCommandType = -1, r.curCommandRelative = !1, r.canParseCommandOrComma = !0, r.curNumberHasExp = !1, r.curNumberHasExpDigits = !1, r.curNumberHasDecimal = !1, r.curArgs = [], r;
  }
  return Il(e, n), e.prototype.finish = function(r) {
    if (r === void 0 && (r = []), this.parse(" ", r), this.curArgs.length !== 0 || !this.canParseCommandOrComma) throw new SyntaxError("Unterminated command at the path end.");
    return r;
  }, e.prototype.parse = function(r, t) {
    var i = this;
    t === void 0 && (t = []);
    for (var a = function(v) {
      t.push(v), i.curArgs.length = 0, i.canParseCommandOrComma = !0;
    }, s = 0; s < r.length; s++) {
      var o = r[s], u = !(this.curCommandType !== S.ARC || this.curArgs.length !== 3 && this.curArgs.length !== 4 || this.curNumber.length !== 1 || this.curNumber !== "0" && this.curNumber !== "1"), l = qu(o) && (this.curNumber === "0" && o === "0" || u);
      if (!qu(o) || l)
        if (o !== "e" && o !== "E")
          if (o !== "-" && o !== "+" || !this.curNumberHasExp || this.curNumberHasExpDigits)
            if (o !== "." || this.curNumberHasExp || this.curNumberHasDecimal || u) {
              if (this.curNumber && this.curCommandType !== -1) {
                var h = Number(this.curNumber);
                if (isNaN(h)) throw new SyntaxError("Invalid number ending at " + s);
                if (this.curCommandType === S.ARC) {
                  if (this.curArgs.length === 0 || this.curArgs.length === 1) {
                    if (0 > h) throw new SyntaxError('Expected positive number, got "' + h + '" at index "' + s + '"');
                  } else if ((this.curArgs.length === 3 || this.curArgs.length === 4) && this.curNumber !== "0" && this.curNumber !== "1") throw new SyntaxError('Expected a flag, got "' + this.curNumber + '" at index "' + s + '"');
                }
                this.curArgs.push(h), this.curArgs.length === df[this.curCommandType] && (S.HORIZ_LINE_TO === this.curCommandType ? a({
                  type: S.HORIZ_LINE_TO,
                  relative: this.curCommandRelative,
                  x: h
                }) : S.VERT_LINE_TO === this.curCommandType ? a({
                  type: S.VERT_LINE_TO,
                  relative: this.curCommandRelative,
                  y: h
                }) : this.curCommandType === S.MOVE_TO || this.curCommandType === S.LINE_TO || this.curCommandType === S.SMOOTH_QUAD_TO ? (a({
                  type: this.curCommandType,
                  relative: this.curCommandRelative,
                  x: this.curArgs[0],
                  y: this.curArgs[1]
                }), S.MOVE_TO === this.curCommandType && (this.curCommandType = S.LINE_TO)) : this.curCommandType === S.CURVE_TO ? a({
                  type: S.CURVE_TO,
                  relative: this.curCommandRelative,
                  x1: this.curArgs[0],
                  y1: this.curArgs[1],
                  x2: this.curArgs[2],
                  y2: this.curArgs[3],
                  x: this.curArgs[4],
                  y: this.curArgs[5]
                }) : this.curCommandType === S.SMOOTH_CURVE_TO ? a({
                  type: S.SMOOTH_CURVE_TO,
                  relative: this.curCommandRelative,
                  x2: this.curArgs[0],
                  y2: this.curArgs[1],
                  x: this.curArgs[2],
                  y: this.curArgs[3]
                }) : this.curCommandType === S.QUAD_TO ? a({
                  type: S.QUAD_TO,
                  relative: this.curCommandRelative,
                  x1: this.curArgs[0],
                  y1: this.curArgs[1],
                  x: this.curArgs[2],
                  y: this.curArgs[3]
                }) : this.curCommandType === S.ARC && a({
                  type: S.ARC,
                  relative: this.curCommandRelative,
                  rX: this.curArgs[0],
                  rY: this.curArgs[1],
                  xRot: this.curArgs[2],
                  lArcFlag: this.curArgs[3],
                  sweepFlag: this.curArgs[4],
                  x: this.curArgs[5],
                  y: this.curArgs[6]
                })), this.curNumber = "", this.curNumberHasExpDigits = !1, this.curNumberHasExp = !1, this.curNumberHasDecimal = !1, this.canParseCommandOrComma = !0;
              }
              if (!vf(o)) if (o === "," && this.canParseCommandOrComma) this.canParseCommandOrComma = !1;
              else if (o !== "+" && o !== "-" && o !== ".")
                if (l) this.curNumber = o, this.curNumberHasDecimal = !1;
                else {
                  if (this.curArgs.length !== 0) throw new SyntaxError("Unterminated command at index " + s + ".");
                  if (!this.canParseCommandOrComma) throw new SyntaxError('Unexpected character "' + o + '" at index ' + s + ". Command cannot follow comma");
                  if (this.canParseCommandOrComma = !1, o !== "z" && o !== "Z")
                    if (o === "h" || o === "H") this.curCommandType = S.HORIZ_LINE_TO, this.curCommandRelative = o === "h";
                    else if (o === "v" || o === "V") this.curCommandType = S.VERT_LINE_TO, this.curCommandRelative = o === "v";
                    else if (o === "m" || o === "M") this.curCommandType = S.MOVE_TO, this.curCommandRelative = o === "m";
                    else if (o === "l" || o === "L") this.curCommandType = S.LINE_TO, this.curCommandRelative = o === "l";
                    else if (o === "c" || o === "C") this.curCommandType = S.CURVE_TO, this.curCommandRelative = o === "c";
                    else if (o === "s" || o === "S") this.curCommandType = S.SMOOTH_CURVE_TO, this.curCommandRelative = o === "s";
                    else if (o === "q" || o === "Q") this.curCommandType = S.QUAD_TO, this.curCommandRelative = o === "q";
                    else if (o === "t" || o === "T") this.curCommandType = S.SMOOTH_QUAD_TO, this.curCommandRelative = o === "t";
                    else {
                      if (o !== "a" && o !== "A") throw new SyntaxError('Unexpected character "' + o + '" at index ' + s + ".");
                      this.curCommandType = S.ARC, this.curCommandRelative = o === "a";
                    }
                  else t.push({
                    type: S.CLOSE_PATH
                  }), this.canParseCommandOrComma = !0, this.curCommandType = -1;
                }
              else this.curNumber = o, this.curNumberHasDecimal = o === ".";
            } else this.curNumber += o, this.curNumberHasDecimal = !0;
          else this.curNumber += o;
        else this.curNumber += o, this.curNumberHasExp = !0;
      else this.curNumber += o, this.curNumberHasExpDigits = this.curNumberHasExp;
    }
    return t;
  }, e.prototype.transform = function(r) {
    return Object.create(this, {
      parse: {
        value: function(i, a) {
          a === void 0 && (a = []);
          for (var s = 0, o = Object.getPrototypeOf(this).parse.call(this, i); s < o.length; s++) {
            var u = o[s], l = r(u);
            Array.isArray(l) ? a.push.apply(a, l) : a.push(l);
          }
          return a;
        }
      }
    });
  }, e;
}(Nl), S = function(n) {
  function e(r) {
    var t = n.call(this) || this;
    return t.commands = typeof r == "string" ? e.parse(r) : r, t;
  }
  return Il(e, n), e.prototype.encode = function() {
    return e.encode(this.commands);
  }, e.prototype.getBounds = function() {
    var r = ne.CALCULATE_BOUNDS();
    return this.transform(r), r;
  }, e.prototype.transform = function(r) {
    for (var t = [], i = 0, a = this.commands; i < a.length; i++) {
      var s = r(a[i]);
      Array.isArray(s) ? t.push.apply(t, s) : t.push(s);
    }
    return this.commands = t, this;
  }, e.encode = function(r) {
    return cf(r);
  }, e.parse = function(r) {
    var t = new gf(), i = [];
    return t.parse(r, i), t.finish(i), i;
  }, e.CLOSE_PATH = 1, e.MOVE_TO = 2, e.HORIZ_LINE_TO = 4, e.VERT_LINE_TO = 8, e.LINE_TO = 16, e.CURVE_TO = 32, e.SMOOTH_CURVE_TO = 64, e.QUAD_TO = 128, e.SMOOTH_QUAD_TO = 256, e.ARC = 512, e.LINE_COMMANDS = e.LINE_TO | e.HORIZ_LINE_TO | e.VERT_LINE_TO, e.DRAWING_COMMANDS = e.HORIZ_LINE_TO | e.VERT_LINE_TO | e.LINE_TO | e.CURVE_TO | e.SMOOTH_CURVE_TO | e.QUAD_TO | e.SMOOTH_QUAD_TO | e.ARC, e;
}(Nl), df = ((Re = {})[S.MOVE_TO] = 2, Re[S.LINE_TO] = 2, Re[S.HORIZ_LINE_TO] = 1, Re[S.VERT_LINE_TO] = 1, Re[S.CLOSE_PATH] = 0, Re[S.QUAD_TO] = 4, Re[S.SMOOTH_QUAD_TO] = 2, Re[S.CURVE_TO] = 6, Re[S.SMOOTH_CURVE_TO] = 4, Re[S.ARC] = 7, Re), Du = {}, Na, Vu;
function pf() {
  if (Vu) return Na;
  Vu = 1;
  var n = oe(), e = Ie(), r = Nr(), t = Tl(), i = RegExp.prototype;
  return Na = function(a) {
    var s = a.flags;
    return s === void 0 && !("flags" in i) && !e(a, "flags") && r(i, a) ? n(t, a) : s;
  }, Na;
}
var ku;
function yf() {
  if (ku) return Du;
  ku = 1;
  var n = Vr().PROPER, e = rr(), r = le(), t = Ve(), i = re(), a = pf(), s = "toString", o = RegExp.prototype, u = o[s], l = i(function() {
    return u.call({
      source: "a",
      flags: "b"
    }) !== "/a/b";
  }), h = n && u.name !== s;
  return (l || h) && e(o, s, function() {
    var v = r(this), f = t(v.source), g = t(a(v));
    return "/" + f + "/" + g;
  }, {
    unsafe: !0
  }), Du;
}
yf();
function Ar(n) {
  "@babel/helpers - typeof";
  return typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? Ar = function(r) {
    return typeof r;
  } : Ar = function(r) {
    return r && typeof Symbol == "function" && r.constructor === Symbol && r !== Symbol.prototype ? "symbol" : typeof r;
  }, Ar(n);
}
function mf(n, e) {
  if (!(n instanceof e))
    throw new TypeError("Cannot call a class as a function");
}
var bf = [512, 512, 456, 512, 328, 456, 335, 512, 405, 328, 271, 456, 388, 335, 292, 512, 454, 405, 364, 328, 298, 271, 496, 456, 420, 388, 360, 335, 312, 292, 273, 512, 482, 454, 428, 405, 383, 364, 345, 328, 312, 298, 284, 271, 259, 496, 475, 456, 437, 420, 404, 388, 374, 360, 347, 335, 323, 312, 302, 292, 282, 273, 265, 512, 497, 482, 468, 454, 441, 428, 417, 405, 394, 383, 373, 364, 354, 345, 337, 328, 320, 312, 305, 298, 291, 284, 278, 271, 265, 259, 507, 496, 485, 475, 465, 456, 446, 437, 428, 420, 412, 404, 396, 388, 381, 374, 367, 360, 354, 347, 341, 335, 329, 323, 318, 312, 307, 302, 297, 292, 287, 282, 278, 273, 269, 265, 261, 512, 505, 497, 489, 482, 475, 468, 461, 454, 447, 441, 435, 428, 422, 417, 411, 405, 399, 394, 389, 383, 378, 373, 368, 364, 359, 354, 350, 345, 341, 337, 332, 328, 324, 320, 316, 312, 309, 305, 301, 298, 294, 291, 287, 284, 281, 278, 274, 271, 268, 265, 262, 259, 257, 507, 501, 496, 491, 485, 480, 475, 470, 465, 460, 456, 451, 446, 442, 437, 433, 428, 424, 420, 416, 412, 408, 404, 400, 396, 392, 388, 385, 381, 377, 374, 370, 367, 363, 360, 357, 354, 350, 347, 344, 341, 338, 335, 332, 329, 326, 323, 320, 318, 315, 312, 310, 307, 304, 302, 299, 297, 294, 292, 289, 287, 285, 282, 280, 278, 275, 273, 271, 269, 267, 265, 263, 261, 259], xf = [9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24];
function Of(n, e, r, t, i) {
  if (typeof n == "string" && (n = document.getElementById(n)), !n || Ar(n) !== "object" || !("getContext" in n))
    throw new TypeError("Expecting canvas with `getContext` method in processCanvasRGB(A) calls!");
  var a = n.getContext("2d");
  try {
    return a.getImageData(e, r, t, i);
  } catch (s) {
    throw new Error("unable to access image data: " + s);
  }
}
function Tf(n, e, r, t, i, a) {
  if (!(isNaN(a) || a < 1)) {
    a |= 0;
    var s = Of(n, e, r, t, i);
    s = Sf(s, e, r, t, i, a), n.getContext("2d").putImageData(s, e, r);
  }
}
function Sf(n, e, r, t, i, a) {
  for (var s = n.data, o = 2 * a + 1, u = t - 1, l = i - 1, h = a + 1, c = h * (h + 1) / 2, v = new Lu(), f = v, g, d = 1; d < o; d++)
    f = f.next = new Lu(), d === h && (g = f);
  f.next = v;
  for (var p = null, m = null, x = 0, y = 0, b = bf[a], T = xf[a], E = 0; E < i; E++) {
    f = v;
    for (var O = s[y], N = s[y + 1], D = s[y + 2], P = s[y + 3], M = 0; M < h; M++)
      f.r = O, f.g = N, f.b = D, f.a = P, f = f.next;
    for (var A = 0, V = 0, w = 0, C = 0, L = h * O, I = h * N, j = h * D, _ = h * P, k = c * O, B = c * N, H = c * D, Y = c * P, K = 1; K < h; K++) {
      var z = y + ((u < K ? u : K) << 2), pe = s[z], ye = s[z + 1], _e = s[z + 2], me = s[z + 3], be = h - K;
      k += (f.r = pe) * be, B += (f.g = ye) * be, H += (f.b = _e) * be, Y += (f.a = me) * be, A += pe, V += ye, w += _e, C += me, f = f.next;
    }
    p = v, m = g;
    for (var xe = 0; xe < t; xe++) {
      var Me = Y * b >>> T;
      if (s[y + 3] = Me, Me !== 0) {
        var qe = 255 / Me;
        s[y] = (k * b >>> T) * qe, s[y + 1] = (B * b >>> T) * qe, s[y + 2] = (H * b >>> T) * qe;
      } else
        s[y] = s[y + 1] = s[y + 2] = 0;
      k -= L, B -= I, H -= j, Y -= _, L -= p.r, I -= p.g, j -= p.b, _ -= p.a;
      var fe = xe + a + 1;
      fe = x + (fe < u ? fe : u) << 2, A += p.r = s[fe], V += p.g = s[fe + 1], w += p.b = s[fe + 2], C += p.a = s[fe + 3], k += A, B += V, H += w, Y += C, p = p.next;
      var Oe = m, Ge = Oe.r, Tr = Oe.g, or = Oe.b, Sr = Oe.a;
      L += Ge, I += Tr, j += or, _ += Sr, A -= Ge, V -= Tr, w -= or, C -= Sr, m = m.next, y += 4;
    }
    x += t;
  }
  for (var ge = 0; ge < t; ge++) {
    y = ge << 2;
    var ce = s[y], Te = s[y + 1], Q = s[y + 2], R = s[y + 3], F = h * ce, G = h * Te, $ = h * Q, Z = h * R, ke = c * ce, Le = c * Te, Se = c * Q, Ee = c * R;
    f = v;
    for (var ur = 0; ur < h; ur++)
      f.r = ce, f.g = Te, f.b = Q, f.a = R, f = f.next;
    for (var lr = t, hr = 0, Wr = 0, Yr = 0, Xr = 0, Er = 1; Er <= a; Er++) {
      y = lr + ge << 2;
      var Rr = h - Er;
      ke += (f.r = ce = s[y]) * Rr, Le += (f.g = Te = s[y + 1]) * Rr, Se += (f.b = Q = s[y + 2]) * Rr, Ee += (f.a = R = s[y + 3]) * Rr, Xr += ce, hr += Te, Wr += Q, Yr += R, f = f.next, Er < l && (lr += t);
    }
    y = ge, p = v, m = g;
    for (var Kr = 0; Kr < i; Kr++) {
      var ve = y << 2;
      s[ve + 3] = R = Ee * b >>> T, R > 0 ? (R = 255 / R, s[ve] = (ke * b >>> T) * R, s[ve + 1] = (Le * b >>> T) * R, s[ve + 2] = (Se * b >>> T) * R) : s[ve] = s[ve + 1] = s[ve + 2] = 0, ke -= F, Le -= G, Se -= $, Ee -= Z, F -= p.r, G -= p.g, $ -= p.b, Z -= p.a, ve = ge + ((ve = Kr + h) < l ? ve : l) * t << 2, ke += Xr += p.r = s[ve], Le += hr += p.g = s[ve + 1], Se += Wr += p.b = s[ve + 2], Ee += Yr += p.a = s[ve + 3], p = p.next, F += ce = m.r, G += Te = m.g, $ += Q = m.b, Z += R = m.a, Xr -= ce, hr -= Te, Wr -= Q, Yr -= R, m = m.next, y += t;
    }
  }
  return n;
}
var Lu = (
  /**
   * Set properties.
   */
  function n() {
    mf(this, n), this.r = 0, this.g = 0, this.b = 0, this.a = 0, this.next = null;
  }
);
function Ef() {
  var {
    DOMParser: n
  } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, e = {
    window: null,
    ignoreAnimation: !0,
    ignoreMouse: !0,
    DOMParser: n,
    createCanvas(r, t) {
      return new OffscreenCanvas(r, t);
    },
    createImage(r) {
      return Fe(function* () {
        var t = yield fetch(r), i = yield t.blob(), a = yield createImageBitmap(i);
        return a;
      })();
    }
  };
  return (typeof DOMParser != "undefined" || typeof n == "undefined") && Reflect.deleteProperty(e, "DOMParser"), e;
}
function Rf(n) {
  var {
    DOMParser: e,
    canvas: r,
    fetch: t
  } = n;
  return {
    window: null,
    ignoreAnimation: !0,
    ignoreMouse: !0,
    DOMParser: e,
    fetch: t,
    createCanvas: r.createCanvas,
    createImage: r.loadImage
  };
}
var Lc = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  offscreen: Ef,
  node: Rf
});
function sr(n) {
  return n.replace(/(?!\u3000)\s+/gm, " ");
}
function Cf(n) {
  return n.replace(/^[\n \t]+/, "");
}
function wf(n) {
  return n.replace(/[\n \t]+$/, "");
}
function de(n) {
  var e = (n || "").match(/-?(\d+(?:\.\d*(?:[eE][+-]?\d+)?)?|\.\d+)(?=\D|$)/gm) || [];
  return e.map(parseFloat);
}
var Pf = /^[A-Z-]+$/;
function Af(n) {
  return Pf.test(n) ? n.toLowerCase() : n;
}
function _l(n) {
  var e = /url\(('([^']+)'|"([^"]+)"|([^'")]+))\)/.exec(n) || [];
  return e[2] || e[3] || e[4];
}
function If(n) {
  if (!n.startsWith("rgb"))
    return n;
  var e = 3, r = n.replace(/\d+(\.\d+)?/g, (t, i) => e-- && i ? String(Math.round(parseFloat(t))) : t);
  return r;
}
var Nf = /(\[[^\]]+\])/g, _f = /(#[^\s+>~.[:]+)/g, Mf = /(\.[^\s+>~.[:]+)/g, qf = /(::[^\s+>~.[:]+|:first-line|:first-letter|:before|:after)/gi, Df = /(:[\w-]+\([^)]*\))/gi, Vf = /(:[^\s+>~.[:]+)/g, kf = /([^\s+>~.[:]+)/g;
function Ye(n, e) {
  var r = e.exec(n);
  return r ? [n.replace(e, " "), r.length] : [n, 0];
}
function Lf(n) {
  var e = [0, 0, 0], r = n.replace(/:not\(([^)]*)\)/g, "     $1 ").replace(/{[\s\S]*/gm, " "), t = 0;
  return [r, t] = Ye(r, Nf), e[1] += t, [r, t] = Ye(r, _f), e[0] += t, [r, t] = Ye(r, Mf), e[1] += t, [r, t] = Ye(r, qf), e[2] += t, [r, t] = Ye(r, Df), e[1] += t, [r, t] = Ye(r, Vf), e[1] += t, r = r.replace(/[*\s+>~]/g, " ").replace(/[#.]/g, " "), [r, t] = Ye(r, kf), e[2] += t, e.join("");
}
var ir = 1e-8;
function ju(n) {
  return Math.sqrt(Math.pow(n[0], 2) + Math.pow(n[1], 2));
}
function ka(n, e) {
  return (n[0] * e[0] + n[1] * e[1]) / (ju(n) * ju(e));
}
function Bu(n, e) {
  return (n[0] * e[1] < n[1] * e[0] ? -1 : 1) * Math.acos(ka(n, e));
}
function Fu(n) {
  return n * n * n;
}
function Uu(n) {
  return 3 * n * n * (1 - n);
}
function Gu(n) {
  return 3 * n * (1 - n) * (1 - n);
}
function $u(n) {
  return (1 - n) * (1 - n) * (1 - n);
}
function Hu(n) {
  return n * n;
}
function zu(n) {
  return 2 * n * (1 - n);
}
function Wu(n) {
  return (1 - n) * (1 - n);
}
class q {
  constructor(e, r, t) {
    this.document = e, this.name = r, this.value = t, this.isNormalizedColor = !1;
  }
  static empty(e) {
    return new q(e, "EMPTY", "");
  }
  split() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : " ", {
      document: r,
      name: t
    } = this;
    return sr(this.getString()).trim().split(e).map((i) => new q(r, t, i));
  }
  hasValue(e) {
    var {
      value: r
    } = this;
    return r !== null && r !== "" && (e || r !== 0) && typeof r != "undefined";
  }
  isString(e) {
    var {
      value: r
    } = this, t = typeof r == "string";
    return !t || !e ? t : e.test(r);
  }
  isUrlDefinition() {
    return this.isString(/^url\(/);
  }
  isPixels() {
    if (!this.hasValue())
      return !1;
    var e = this.getString();
    switch (!0) {
      case e.endsWith("px"):
      case /^[0-9]+$/.test(e):
        return !0;
      default:
        return !1;
    }
  }
  setValue(e) {
    return this.value = e, this;
  }
  getValue(e) {
    return typeof e == "undefined" || this.hasValue() ? this.value : e;
  }
  getNumber(e) {
    if (!this.hasValue())
      return typeof e == "undefined" ? 0 : parseFloat(e);
    var {
      value: r
    } = this, t = parseFloat(r);
    return this.isString(/%$/) && (t /= 100), t;
  }
  getString(e) {
    return typeof e == "undefined" || this.hasValue() ? typeof this.value == "undefined" ? "" : String(this.value) : String(e);
  }
  getColor(e) {
    var r = this.getString(e);
    return this.isNormalizedColor || (this.isNormalizedColor = !0, r = If(r), this.value = r), r;
  }
  getDpi() {
    return 96;
  }
  getRem() {
    return this.document.rootEmSize;
  }
  getEm() {
    return this.document.emSize;
  }
  getUnits() {
    return this.getString().replace(/[0-9.-]/g, "");
  }
  getPixels(e) {
    var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
    if (!this.hasValue())
      return 0;
    var [t, i] = typeof e == "boolean" ? [void 0, e] : [e], {
      viewPort: a
    } = this.document.screen;
    switch (!0) {
      case this.isString(/vmin$/):
        return this.getNumber() / 100 * Math.min(a.computeSize("x"), a.computeSize("y"));
      case this.isString(/vmax$/):
        return this.getNumber() / 100 * Math.max(a.computeSize("x"), a.computeSize("y"));
      case this.isString(/vw$/):
        return this.getNumber() / 100 * a.computeSize("x");
      case this.isString(/vh$/):
        return this.getNumber() / 100 * a.computeSize("y");
      case this.isString(/rem$/):
        return this.getNumber() * this.getRem();
      case this.isString(/em$/):
        return this.getNumber() * this.getEm();
      case this.isString(/ex$/):
        return this.getNumber() * this.getEm() / 2;
      case this.isString(/px$/):
        return this.getNumber();
      case this.isString(/pt$/):
        return this.getNumber() * this.getDpi() * (1 / 72);
      case this.isString(/pc$/):
        return this.getNumber() * 15;
      case this.isString(/cm$/):
        return this.getNumber() * this.getDpi() / 2.54;
      case this.isString(/mm$/):
        return this.getNumber() * this.getDpi() / 25.4;
      case this.isString(/in$/):
        return this.getNumber() * this.getDpi();
      case (this.isString(/%$/) && i):
        return this.getNumber() * this.getEm();
      case this.isString(/%$/):
        return this.getNumber() * a.computeSize(t);
      default: {
        var s = this.getNumber();
        return r && s < 1 ? s * a.computeSize(t) : s;
      }
    }
  }
  getMilliseconds() {
    return this.hasValue() ? this.isString(/ms$/) ? this.getNumber() : this.getNumber() * 1e3 : 0;
  }
  getRadians() {
    if (!this.hasValue())
      return 0;
    switch (!0) {
      case this.isString(/deg$/):
        return this.getNumber() * (Math.PI / 180);
      case this.isString(/grad$/):
        return this.getNumber() * (Math.PI / 200);
      case this.isString(/rad$/):
        return this.getNumber();
      default:
        return this.getNumber() * (Math.PI / 180);
    }
  }
  getDefinition() {
    var e = this.getString(), r = /#([^)'"]+)/.exec(e);
    return r && (r = r[1]), r || (r = e), this.document.definitions[r];
  }
  getFillStyleDefinition(e, r) {
    var t = this.getDefinition();
    if (!t)
      return null;
    if (typeof t.createGradient == "function")
      return t.createGradient(this.document.ctx, e, r);
    if (typeof t.createPattern == "function") {
      if (t.getHrefAttribute().hasValue()) {
        var i = t.getAttribute("patternTransform");
        t = t.getHrefAttribute().getDefinition(), i.hasValue() && t.getAttribute("patternTransform", !0).setValue(i.value);
      }
      return t.createPattern(this.document.ctx, e, r);
    }
    return null;
  }
  getTextBaseline() {
    return this.hasValue() ? q.textBaselineMapping[this.getString()] : null;
  }
  addOpacity(e) {
    for (var r = this.getColor(), t = r.length, i = 0, a = 0; a < t && (r[a] === "," && i++, i !== 3); a++)
      ;
    if (e.hasValue() && this.isString() && i !== 3) {
      var s = new Da(r);
      s.ok && (s.alpha = e.getNumber(), r = s.toRGBA());
    }
    return new q(this.document, this.name, r);
  }
}
q.textBaselineMapping = {
  baseline: "alphabetic",
  "before-edge": "top",
  "text-before-edge": "top",
  middle: "middle",
  central: "middle",
  "after-edge": "bottom",
  "text-after-edge": "bottom",
  ideographic: "ideographic",
  alphabetic: "alphabetic",
  hanging: "hanging",
  mathematical: "alphabetic"
};
class jf {
  constructor() {
    this.viewPorts = [];
  }
  clear() {
    this.viewPorts = [];
  }
  setCurrent(e, r) {
    this.viewPorts.push({
      width: e,
      height: r
    });
  }
  removeCurrent() {
    this.viewPorts.pop();
  }
  getCurrent() {
    var {
      viewPorts: e
    } = this;
    return e[e.length - 1];
  }
  get width() {
    return this.getCurrent().width;
  }
  get height() {
    return this.getCurrent().height;
  }
  computeSize(e) {
    return typeof e == "number" ? e : e === "x" ? this.width : e === "y" ? this.height : Math.sqrt(Math.pow(this.width, 2) + Math.pow(this.height, 2)) / Math.sqrt(2);
  }
}
class ee {
  constructor(e, r) {
    this.x = e, this.y = r;
  }
  static parse(e) {
    var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, [t = r, i = r] = de(e);
    return new ee(t, i);
  }
  static parseScale(e) {
    var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1, [t = r, i = t] = de(e);
    return new ee(t, i);
  }
  static parsePath(e) {
    for (var r = de(e), t = r.length, i = [], a = 0; a < t; a += 2)
      i.push(new ee(r[a], r[a + 1]));
    return i;
  }
  angleTo(e) {
    return Math.atan2(e.y - this.y, e.x - this.x);
  }
  applyTransform(e) {
    var {
      x: r,
      y: t
    } = this, i = r * e[0] + t * e[2] + e[4], a = r * e[1] + t * e[3] + e[5];
    this.x = i, this.y = a;
  }
}
class Bf {
  constructor(e) {
    this.screen = e, this.working = !1, this.events = [], this.eventElements = [], this.onClick = this.onClick.bind(this), this.onMouseMove = this.onMouseMove.bind(this);
  }
  isWorking() {
    return this.working;
  }
  start() {
    if (!this.working) {
      var {
        screen: e,
        onClick: r,
        onMouseMove: t
      } = this, i = e.ctx.canvas;
      i.onclick = r, i.onmousemove = t, this.working = !0;
    }
  }
  stop() {
    if (this.working) {
      var e = this.screen.ctx.canvas;
      this.working = !1, e.onclick = null, e.onmousemove = null;
    }
  }
  hasEvents() {
    return this.working && this.events.length > 0;
  }
  runEvents() {
    if (this.working) {
      var {
        screen: e,
        events: r,
        eventElements: t
      } = this, {
        style: i
      } = e.ctx.canvas;
      i && (i.cursor = ""), r.forEach((a, s) => {
        for (var {
          run: o
        } = a, u = t[s]; u; )
          o(u), u = u.parent;
      }), this.events = [], this.eventElements = [];
    }
  }
  checkPath(e, r) {
    if (!(!this.working || !r)) {
      var {
        events: t,
        eventElements: i
      } = this;
      t.forEach((a, s) => {
        var {
          x: o,
          y: u
        } = a;
        !i[s] && r.isPointInPath && r.isPointInPath(o, u) && (i[s] = e);
      });
    }
  }
  checkBoundingBox(e, r) {
    if (!(!this.working || !r)) {
      var {
        events: t,
        eventElements: i
      } = this;
      t.forEach((a, s) => {
        var {
          x: o,
          y: u
        } = a;
        !i[s] && r.isPointInBox(o, u) && (i[s] = e);
      });
    }
  }
  mapXY(e, r) {
    for (var {
      window: t,
      ctx: i
    } = this.screen, a = new ee(e, r), s = i.canvas; s; )
      a.x -= s.offsetLeft, a.y -= s.offsetTop, s = s.offsetParent;
    return t.scrollX && (a.x += t.scrollX), t.scrollY && (a.y += t.scrollY), a;
  }
  onClick(e) {
    var {
      x: r,
      y: t
    } = this.mapXY(e.clientX, e.clientY);
    this.events.push({
      type: "onclick",
      x: r,
      y: t,
      run(i) {
        i.onClick && i.onClick();
      }
    });
  }
  onMouseMove(e) {
    var {
      x: r,
      y: t
    } = this.mapXY(e.clientX, e.clientY);
    this.events.push({
      type: "onmousemove",
      x: r,
      y: t,
      run(i) {
        i.onMouseMove && i.onMouseMove();
      }
    });
  }
}
var Ml = typeof window != "undefined" ? window : null, ql = typeof fetch != "undefined" ? fetch.bind(void 0) : null;
class Gr {
  constructor(e) {
    var {
      fetch: r = ql,
      window: t = Ml
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    this.ctx = e, this.FRAMERATE = 30, this.MAX_VIRTUAL_PIXELS = 3e4, this.CLIENT_WIDTH = 800, this.CLIENT_HEIGHT = 600, this.viewPort = new jf(), this.mouse = new Bf(this), this.animations = [], this.waits = [], this.frameDuration = 0, this.isReadyLock = !1, this.isFirstRender = !0, this.intervalId = null, this.window = t, this.fetch = r;
  }
  wait(e) {
    this.waits.push(e);
  }
  ready() {
    return this.readyPromise ? this.readyPromise : Promise.resolve();
  }
  isReady() {
    if (this.isReadyLock)
      return !0;
    var e = this.waits.every((r) => r());
    return e && (this.waits = [], this.resolveReady && this.resolveReady()), this.isReadyLock = e, e;
  }
  setDefaults(e) {
    e.strokeStyle = "rgba(0,0,0,0)", e.lineCap = "butt", e.lineJoin = "miter", e.miterLimit = 4;
  }
  setViewBox(e) {
    var {
      document: r,
      ctx: t,
      aspectRatio: i,
      width: a,
      desiredWidth: s,
      height: o,
      desiredHeight: u,
      minX: l = 0,
      minY: h = 0,
      refX: c,
      refY: v,
      clip: f = !1,
      clipX: g = 0,
      clipY: d = 0
    } = e, p = sr(i).replace(/^defer\s/, ""), [m, x] = p.split(" "), y = m || "xMidYMid", b = x || "meet", T = a / s, E = o / u, O = Math.min(T, E), N = Math.max(T, E), D = s, P = u;
    b === "meet" && (D *= O, P *= O), b === "slice" && (D *= N, P *= N);
    var M = new q(r, "refX", c), A = new q(r, "refY", v), V = M.hasValue() && A.hasValue();
    if (V && t.translate(-O * M.getPixels("x"), -O * A.getPixels("y")), f) {
      var w = O * g, C = O * d;
      t.beginPath(), t.moveTo(w, C), t.lineTo(a, C), t.lineTo(a, o), t.lineTo(w, o), t.closePath(), t.clip();
    }
    if (!V) {
      var L = b === "meet" && O === E, I = b === "slice" && N === E, j = b === "meet" && O === T, _ = b === "slice" && N === T;
      y.startsWith("xMid") && (L || I) && t.translate(a / 2 - D / 2, 0), y.endsWith("YMid") && (j || _) && t.translate(0, o / 2 - P / 2), y.startsWith("xMax") && (L || I) && t.translate(a - D, 0), y.endsWith("YMax") && (j || _) && t.translate(0, o - P);
    }
    switch (!0) {
      case y === "none":
        t.scale(T, E);
        break;
      case b === "meet":
        t.scale(O, O);
        break;
      case b === "slice":
        t.scale(N, N);
        break;
    }
    t.translate(-l, -h);
  }
  start(e) {
    var {
      enableRedraw: r = !1,
      ignoreMouse: t = !1,
      ignoreAnimation: i = !1,
      ignoreDimensions: a = !1,
      ignoreClear: s = !1,
      forceRedraw: o,
      scaleWidth: u,
      scaleHeight: l,
      offsetX: h,
      offsetY: c
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, {
      FRAMERATE: v,
      mouse: f
    } = this, g = 1e3 / v;
    if (this.frameDuration = g, this.readyPromise = new Promise((y) => {
      this.resolveReady = y;
    }), this.isReady() && this.render(e, a, s, u, l, h, c), !!r) {
      var d = Date.now(), p = d, m = 0, x = () => {
        d = Date.now(), m = d - p, m >= g && (p = d - m % g, this.shouldUpdate(i, o) && (this.render(e, a, s, u, l, h, c), f.runEvents())), this.intervalId = Ea(x);
      };
      t || f.start(), this.intervalId = Ea(x);
    }
  }
  stop() {
    this.intervalId && (Ea.cancel(this.intervalId), this.intervalId = null), this.mouse.stop();
  }
  shouldUpdate(e, r) {
    if (!e) {
      var {
        frameDuration: t
      } = this, i = this.animations.reduce((a, s) => s.update(t) || a, !1);
      if (i)
        return !0;
    }
    return !!(typeof r == "function" && r() || !this.isReadyLock && this.isReady() || this.mouse.hasEvents());
  }
  render(e, r, t, i, a, s, o) {
    var {
      CLIENT_WIDTH: u,
      CLIENT_HEIGHT: l,
      viewPort: h,
      ctx: c,
      isFirstRender: v
    } = this, f = c.canvas;
    h.clear(), f.width && f.height ? h.setCurrent(f.width, f.height) : h.setCurrent(u, l);
    var g = e.getStyle("width"), d = e.getStyle("height");
    !r && (v || typeof i != "number" && typeof a != "number") && (g.hasValue() && (f.width = g.getPixels("x"), f.style && (f.style.width = "".concat(f.width, "px"))), d.hasValue() && (f.height = d.getPixels("y"), f.style && (f.style.height = "".concat(f.height, "px"))));
    var p = f.clientWidth || f.width, m = f.clientHeight || f.height;
    if (r && g.hasValue() && d.hasValue() && (p = g.getPixels("x"), m = d.getPixels("y")), h.setCurrent(p, m), typeof s == "number" && e.getAttribute("x", !0).setValue(s), typeof o == "number" && e.getAttribute("y", !0).setValue(o), typeof i == "number" || typeof a == "number") {
      var x = de(e.getAttribute("viewBox").getString()), y = 0, b = 0;
      if (typeof i == "number") {
        var T = e.getStyle("width");
        T.hasValue() ? y = T.getPixels("x") / i : isNaN(x[2]) || (y = x[2] / i);
      }
      if (typeof a == "number") {
        var E = e.getStyle("height");
        E.hasValue() ? b = E.getPixels("y") / a : isNaN(x[3]) || (b = x[3] / a);
      }
      y || (y = b), b || (b = y), e.getAttribute("width", !0).setValue(i), e.getAttribute("height", !0).setValue(a);
      var O = e.getStyle("transform", !0, !0);
      O.setValue("".concat(O.getString(), " scale(").concat(1 / y, ", ").concat(1 / b, ")"));
    }
    t || c.clearRect(0, 0, p, m), e.render(c), v && (this.isFirstRender = !1);
  }
}
Gr.defaultWindow = Ml;
Gr.defaultFetch = ql;
var {
  defaultFetch: Ff
} = Gr, Uf = typeof DOMParser != "undefined" ? DOMParser : null;
class _a {
  constructor() {
    var {
      fetch: e = Ff,
      DOMParser: r = Uf
    } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    this.fetch = e, this.DOMParser = r;
  }
  parse(e) {
    var r = this;
    return Fe(function* () {
      return e.startsWith("<") ? r.parseFromString(e) : r.load(e);
    })();
  }
  parseFromString(e) {
    var r = new this.DOMParser();
    try {
      return this.checkDocument(r.parseFromString(e, "image/svg+xml"));
    } catch (t) {
      return this.checkDocument(r.parseFromString(e, "text/xml"));
    }
  }
  checkDocument(e) {
    var r = e.getElementsByTagName("parsererror")[0];
    if (r)
      throw new Error(r.textContent);
    return e;
  }
  load(e) {
    var r = this;
    return Fe(function* () {
      var t = yield r.fetch(e), i = yield t.text();
      return r.parseFromString(i);
    })();
  }
}
class Gf {
  constructor(e, r) {
    this.type = "translate", this.point = null, this.point = ee.parse(r);
  }
  apply(e) {
    var {
      x: r,
      y: t
    } = this.point;
    e.translate(r || 0, t || 0);
  }
  unapply(e) {
    var {
      x: r,
      y: t
    } = this.point;
    e.translate(-1 * r || 0, -1 * t || 0);
  }
  applyToPoint(e) {
    var {
      x: r,
      y: t
    } = this.point;
    e.applyTransform([1, 0, 0, 1, r || 0, t || 0]);
  }
}
class $f {
  constructor(e, r, t) {
    this.type = "rotate", this.angle = null, this.originX = null, this.originY = null, this.cx = 0, this.cy = 0;
    var i = de(r);
    this.angle = new q(e, "angle", i[0]), this.originX = t[0], this.originY = t[1], this.cx = i[1] || 0, this.cy = i[2] || 0;
  }
  apply(e) {
    var {
      cx: r,
      cy: t,
      originX: i,
      originY: a,
      angle: s
    } = this, o = r + i.getPixels("x"), u = t + a.getPixels("y");
    e.translate(o, u), e.rotate(s.getRadians()), e.translate(-o, -u);
  }
  unapply(e) {
    var {
      cx: r,
      cy: t,
      originX: i,
      originY: a,
      angle: s
    } = this, o = r + i.getPixels("x"), u = t + a.getPixels("y");
    e.translate(o, u), e.rotate(-1 * s.getRadians()), e.translate(-o, -u);
  }
  applyToPoint(e) {
    var {
      cx: r,
      cy: t,
      angle: i
    } = this, a = i.getRadians();
    e.applyTransform([
      1,
      0,
      0,
      1,
      r || 0,
      t || 0
      // this.p.y
    ]), e.applyTransform([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]), e.applyTransform([
      1,
      0,
      0,
      1,
      -r || 0,
      -t || 0
      // -this.p.y
    ]);
  }
}
class Hf {
  constructor(e, r, t) {
    this.type = "scale", this.scale = null, this.originX = null, this.originY = null;
    var i = ee.parseScale(r);
    (i.x === 0 || i.y === 0) && (i.x = ir, i.y = ir), this.scale = i, this.originX = t[0], this.originY = t[1];
  }
  apply(e) {
    var {
      scale: {
        x: r,
        y: t
      },
      originX: i,
      originY: a
    } = this, s = i.getPixels("x"), o = a.getPixels("y");
    e.translate(s, o), e.scale(r, t || r), e.translate(-s, -o);
  }
  unapply(e) {
    var {
      scale: {
        x: r,
        y: t
      },
      originX: i,
      originY: a
    } = this, s = i.getPixels("x"), o = a.getPixels("y");
    e.translate(s, o), e.scale(1 / r, 1 / t || r), e.translate(-s, -o);
  }
  applyToPoint(e) {
    var {
      x: r,
      y: t
    } = this.scale;
    e.applyTransform([r || 0, 0, 0, t || 0, 0, 0]);
  }
}
class Dl {
  constructor(e, r, t) {
    this.type = "matrix", this.matrix = [], this.originX = null, this.originY = null, this.matrix = de(r), this.originX = t[0], this.originY = t[1];
  }
  apply(e) {
    var {
      originX: r,
      originY: t,
      matrix: i
    } = this, a = r.getPixels("x"), s = t.getPixels("y");
    e.translate(a, s), e.transform(i[0], i[1], i[2], i[3], i[4], i[5]), e.translate(-a, -s);
  }
  unapply(e) {
    var {
      originX: r,
      originY: t,
      matrix: i
    } = this, a = i[0], s = i[2], o = i[4], u = i[1], l = i[3], h = i[5], c = 0, v = 0, f = 1, g = 1 / (a * (l * f - h * v) - s * (u * f - h * c) + o * (u * v - l * c)), d = r.getPixels("x"), p = t.getPixels("y");
    e.translate(d, p), e.transform(g * (l * f - h * v), g * (h * c - u * f), g * (o * v - s * f), g * (a * f - o * c), g * (s * h - o * l), g * (o * u - a * h)), e.translate(-d, -p);
  }
  applyToPoint(e) {
    e.applyTransform(this.matrix);
  }
}
class Vl extends Dl {
  constructor(e, r, t) {
    super(e, r, t), this.type = "skew", this.angle = null, this.angle = new q(e, "angle", r);
  }
}
class zf extends Vl {
  constructor(e, r, t) {
    super(e, r, t), this.type = "skewX", this.matrix = [1, 0, Math.tan(this.angle.getRadians()), 1, 0, 0];
  }
}
class Wf extends Vl {
  constructor(e, r, t) {
    super(e, r, t), this.type = "skewY", this.matrix = [1, Math.tan(this.angle.getRadians()), 0, 1, 0, 0];
  }
}
function Yf(n) {
  return sr(n).trim().replace(/\)([a-zA-Z])/g, ") $1").replace(/\)(\s?,\s?)/g, ") ").split(/\s(?=[a-z])/);
}
function Xf(n) {
  var [e, r] = n.split("(");
  return [e.trim(), r.trim().replace(")", "")];
}
class Qe {
  constructor(e, r, t) {
    this.document = e, this.transforms = [];
    var i = Yf(r);
    i.forEach((a) => {
      if (a !== "none") {
        var [s, o] = Xf(a), u = Qe.transformTypes[s];
        typeof u != "undefined" && this.transforms.push(new u(this.document, o, t));
      }
    });
  }
  static fromElement(e, r) {
    var t = r.getStyle("transform", !1, !0), [i, a = i] = r.getStyle("transform-origin", !1, !0).split(), s = [i, a];
    return t.hasValue() ? new Qe(e, t.getString(), s) : null;
  }
  apply(e) {
    for (var {
      transforms: r
    } = this, t = r.length, i = 0; i < t; i++)
      r[i].apply(e);
  }
  unapply(e) {
    for (var {
      transforms: r
    } = this, t = r.length, i = t - 1; i >= 0; i--)
      r[i].unapply(e);
  }
  // TODO: applyToPoint unused ... remove?
  applyToPoint(e) {
    for (var {
      transforms: r
    } = this, t = r.length, i = 0; i < t; i++)
      r[i].applyToPoint(e);
  }
}
Qe.transformTypes = {
  translate: Gf,
  rotate: $f,
  scale: Hf,
  matrix: Dl,
  skewX: zf,
  skewY: Wf
};
class X {
  constructor(e, r) {
    var t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !1;
    if (this.document = e, this.node = r, this.captureTextNodes = t, this.attributes = /* @__PURE__ */ Object.create(null), this.styles = /* @__PURE__ */ Object.create(null), this.stylesSpecificity = /* @__PURE__ */ Object.create(null), this.animationFrozen = !1, this.animationFrozenValue = "", this.parent = null, this.children = [], !(!r || r.nodeType !== 1)) {
      if (Array.from(r.attributes).forEach((o) => {
        var u = Af(o.nodeName);
        this.attributes[u] = new q(e, u, o.value);
      }), this.addStylesFromStyleDefinition(), this.getAttribute("style").hasValue()) {
        var i = this.getAttribute("style").getString().split(";").map((o) => o.trim());
        i.forEach((o) => {
          if (o) {
            var [u, l] = o.split(":").map((h) => h.trim());
            this.styles[u] = new q(e, u, l);
          }
        });
      }
      var {
        definitions: a
      } = e, s = this.getAttribute("id");
      s.hasValue() && (a[s.getString()] || (a[s.getString()] = this)), Array.from(r.childNodes).forEach((o) => {
        if (o.nodeType === 1)
          this.addChild(o);
        else if (t && (o.nodeType === 3 || o.nodeType === 4)) {
          var u = e.createTextNode(o);
          u.getText().length > 0 && this.addChild(u);
        }
      });
    }
  }
  getAttribute(e) {
    var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, t = this.attributes[e];
    if (!t && r) {
      var i = new q(this.document, e, "");
      return this.attributes[e] = i, i;
    }
    return t || q.empty(this.document);
  }
  getHrefAttribute() {
    for (var e in this.attributes)
      if (e === "href" || e.endsWith(":href"))
        return this.attributes[e];
    return q.empty(this.document);
  }
  getStyle(e) {
    var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !1, i = this.styles[e];
    if (i)
      return i;
    var a = this.getAttribute(e);
    if (a != null && a.hasValue())
      return this.styles[e] = a, a;
    if (!t) {
      var {
        parent: s
      } = this;
      if (s) {
        var o = s.getStyle(e);
        if (o != null && o.hasValue())
          return o;
      }
    }
    if (r) {
      var u = new q(this.document, e, "");
      return this.styles[e] = u, u;
    }
    return i || q.empty(this.document);
  }
  render(e) {
    if (!(this.getStyle("display").getString() === "none" || this.getStyle("visibility").getString() === "hidden")) {
      if (e.save(), this.getStyle("mask").hasValue()) {
        var r = this.getStyle("mask").getDefinition();
        r && (this.applyEffects(e), r.apply(e, this));
      } else if (this.getStyle("filter").getValue("none") !== "none") {
        var t = this.getStyle("filter").getDefinition();
        t && (this.applyEffects(e), t.apply(e, this));
      } else
        this.setContext(e), this.renderChildren(e), this.clearContext(e);
      e.restore();
    }
  }
  setContext(e) {
  }
  applyEffects(e) {
    var r = Qe.fromElement(this.document, this);
    r && r.apply(e);
    var t = this.getStyle("clip-path", !1, !0);
    if (t.hasValue()) {
      var i = t.getDefinition();
      i && i.apply(e);
    }
  }
  clearContext(e) {
  }
  renderChildren(e) {
    this.children.forEach((r) => {
      r.render(e);
    });
  }
  addChild(e) {
    var r = e instanceof X ? e : this.document.createElement(e);
    r.parent = this, X.ignoreChildTypes.includes(r.type) || this.children.push(r);
  }
  matchesSelector(e) {
    var r, {
      node: t
    } = this;
    if (typeof t.matches == "function")
      return t.matches(e);
    var i = (r = t.getAttribute) === null || r === void 0 ? void 0 : r.call(t, "class");
    return !i || i === "" ? !1 : i.split(" ").some((a) => ".".concat(a) === e);
  }
  addStylesFromStyleDefinition() {
    var {
      styles: e,
      stylesSpecificity: r
    } = this.document;
    for (var t in e)
      if (!t.startsWith("@") && this.matchesSelector(t)) {
        var i = e[t], a = r[t];
        if (i)
          for (var s in i) {
            var o = this.stylesSpecificity[s];
            typeof o == "undefined" && (o = "000"), a >= o && (this.styles[s] = i[s], this.stylesSpecificity[s] = a);
          }
      }
  }
  removeStyles(e, r) {
    var t = r.reduce((i, a) => {
      var s = e.getStyle(a);
      if (!s.hasValue())
        return i;
      var o = s.getString();
      return s.setValue(""), [...i, [a, o]];
    }, []);
    return t;
  }
  restoreStyles(e, r) {
    r.forEach((t) => {
      var [i, a] = t;
      e.getStyle(i, !0).setValue(a);
    });
  }
  isFirstChild() {
    var e;
    return ((e = this.parent) === null || e === void 0 ? void 0 : e.children.indexOf(this)) === 0;
  }
}
X.ignoreChildTypes = ["title"];
class Kf extends X {
  constructor(e, r, t) {
    super(e, r, t);
  }
}
function Qf(n) {
  var e = n.trim();
  return /^('|")/.test(e) ? e : '"'.concat(e, '"');
}
function Zf(n) {
  return typeof process == "undefined" ? n : n.trim().split(",").map(Qf).join(",");
}
function Jf(n) {
  if (!n)
    return "";
  var e = n.trim().toLowerCase();
  switch (e) {
    case "normal":
    case "italic":
    case "oblique":
    case "inherit":
    case "initial":
    case "unset":
      return e;
    default:
      return /^oblique\s+(-|)\d+deg$/.test(e) ? e : "";
  }
}
function ec(n) {
  if (!n)
    return "";
  var e = n.trim().toLowerCase();
  switch (e) {
    case "normal":
    case "bold":
    case "lighter":
    case "bolder":
    case "inherit":
    case "initial":
    case "unset":
      return e;
    default:
      return /^[\d.]+$/.test(e) ? e : "";
  }
}
class ue {
  constructor(e, r, t, i, a, s) {
    var o = s ? typeof s == "string" ? ue.parse(s) : s : {};
    this.fontFamily = a || o.fontFamily, this.fontSize = i || o.fontSize, this.fontStyle = e || o.fontStyle, this.fontWeight = t || o.fontWeight, this.fontVariant = r || o.fontVariant;
  }
  static parse() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "", r = arguments.length > 1 ? arguments[1] : void 0, t = "", i = "", a = "", s = "", o = "", u = sr(e).trim().split(" "), l = {
      fontSize: !1,
      fontStyle: !1,
      fontWeight: !1,
      fontVariant: !1
    };
    return u.forEach((h) => {
      switch (!0) {
        case (!l.fontStyle && ue.styles.includes(h)):
          h !== "inherit" && (t = h), l.fontStyle = !0;
          break;
        case (!l.fontVariant && ue.variants.includes(h)):
          h !== "inherit" && (i = h), l.fontStyle = !0, l.fontVariant = !0;
          break;
        case (!l.fontWeight && ue.weights.includes(h)):
          h !== "inherit" && (a = h), l.fontStyle = !0, l.fontVariant = !0, l.fontWeight = !0;
          break;
        case !l.fontSize:
          h !== "inherit" && ([s] = h.split("/")), l.fontStyle = !0, l.fontVariant = !0, l.fontWeight = !0, l.fontSize = !0;
          break;
        default:
          h !== "inherit" && (o += h);
      }
    }), new ue(t, i, a, s, o, r);
  }
  toString() {
    return [
      Jf(this.fontStyle),
      this.fontVariant,
      ec(this.fontWeight),
      this.fontSize,
      // Wrap fontFamily only on nodejs and only for canvas.ctx
      Zf(this.fontFamily)
    ].join(" ").trim();
  }
}
ue.styles = "normal|italic|oblique|inherit";
ue.variants = "normal|small-caps|inherit";
ue.weights = "normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900|inherit";
class Ne {
  constructor() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Number.NaN, r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Number.NaN, t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Number.NaN, i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : Number.NaN;
    this.x1 = e, this.y1 = r, this.x2 = t, this.y2 = i, this.addPoint(e, r), this.addPoint(t, i);
  }
  get x() {
    return this.x1;
  }
  get y() {
    return this.y1;
  }
  get width() {
    return this.x2 - this.x1;
  }
  get height() {
    return this.y2 - this.y1;
  }
  addPoint(e, r) {
    typeof e != "undefined" && ((isNaN(this.x1) || isNaN(this.x2)) && (this.x1 = e, this.x2 = e), e < this.x1 && (this.x1 = e), e > this.x2 && (this.x2 = e)), typeof r != "undefined" && ((isNaN(this.y1) || isNaN(this.y2)) && (this.y1 = r, this.y2 = r), r < this.y1 && (this.y1 = r), r > this.y2 && (this.y2 = r));
  }
  addX(e) {
    this.addPoint(e, null);
  }
  addY(e) {
    this.addPoint(null, e);
  }
  addBoundingBox(e) {
    if (e) {
      var {
        x1: r,
        y1: t,
        x2: i,
        y2: a
      } = e;
      this.addPoint(r, t), this.addPoint(i, a);
    }
  }
  sumCubic(e, r, t, i, a) {
    return Math.pow(1 - e, 3) * r + 3 * Math.pow(1 - e, 2) * e * t + 3 * (1 - e) * Math.pow(e, 2) * i + Math.pow(e, 3) * a;
  }
  bezierCurveAdd(e, r, t, i, a) {
    var s = 6 * r - 12 * t + 6 * i, o = -3 * r + 9 * t - 9 * i + 3 * a, u = 3 * t - 3 * r;
    if (o === 0) {
      if (s === 0)
        return;
      var l = -u / s;
      0 < l && l < 1 && (e ? this.addX(this.sumCubic(l, r, t, i, a)) : this.addY(this.sumCubic(l, r, t, i, a)));
      return;
    }
    var h = Math.pow(s, 2) - 4 * u * o;
    if (!(h < 0)) {
      var c = (-s + Math.sqrt(h)) / (2 * o);
      0 < c && c < 1 && (e ? this.addX(this.sumCubic(c, r, t, i, a)) : this.addY(this.sumCubic(c, r, t, i, a)));
      var v = (-s - Math.sqrt(h)) / (2 * o);
      0 < v && v < 1 && (e ? this.addX(this.sumCubic(v, r, t, i, a)) : this.addY(this.sumCubic(v, r, t, i, a)));
    }
  }
  // from http://blog.hackers-cafe.net/2009/06/how-to-calculate-bezier-curves-bounding.html
  addBezierCurve(e, r, t, i, a, s, o, u) {
    this.addPoint(e, r), this.addPoint(o, u), this.bezierCurveAdd(!0, e, t, a, o), this.bezierCurveAdd(!1, r, i, s, u);
  }
  addQuadraticCurve(e, r, t, i, a, s) {
    var o = e + 0.6666666666666666 * (t - e), u = r + 2 / 3 * (i - r), l = o + 1 / 3 * (a - e), h = u + 1 / 3 * (s - r);
    this.addBezierCurve(e, r, o, l, u, h, a, s);
  }
  isPointInBox(e, r) {
    var {
      x1: t,
      y1: i,
      x2: a,
      y2: s
    } = this;
    return t <= e && e <= a && i <= r && r <= s;
  }
}
class U extends S {
  constructor(e) {
    super(e.replace(/([+\-.])\s+/gm, "$1").replace(/[^MmZzLlHhVvCcSsQqTtAae\d\s.,+-].*/g, "")), this.control = null, this.start = null, this.current = null, this.command = null, this.commands = this.commands, this.i = -1, this.previousCommand = null, this.points = [], this.angles = [];
  }
  reset() {
    this.i = -1, this.command = null, this.previousCommand = null, this.start = new ee(0, 0), this.control = new ee(0, 0), this.current = new ee(0, 0), this.points = [], this.angles = [];
  }
  isEnd() {
    var {
      i: e,
      commands: r
    } = this;
    return e >= r.length - 1;
  }
  next() {
    var e = this.commands[++this.i];
    return this.previousCommand = this.command, this.command = e, e;
  }
  getPoint() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "x", r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "y", t = new ee(this.command[e], this.command[r]);
    return this.makeAbsolute(t);
  }
  getAsControlPoint(e, r) {
    var t = this.getPoint(e, r);
    return this.control = t, t;
  }
  getAsCurrentPoint(e, r) {
    var t = this.getPoint(e, r);
    return this.current = t, t;
  }
  getReflectedControlPoint() {
    var e = this.previousCommand.type;
    if (e !== S.CURVE_TO && e !== S.SMOOTH_CURVE_TO && e !== S.QUAD_TO && e !== S.SMOOTH_QUAD_TO)
      return this.current;
    var {
      current: {
        x: r,
        y: t
      },
      control: {
        x: i,
        y: a
      }
    } = this, s = new ee(2 * r - i, 2 * t - a);
    return s;
  }
  makeAbsolute(e) {
    if (this.command.relative) {
      var {
        x: r,
        y: t
      } = this.current;
      e.x += r, e.y += t;
    }
    return e;
  }
  addMarker(e, r, t) {
    var {
      points: i,
      angles: a
    } = this;
    t && a.length > 0 && !a[a.length - 1] && (a[a.length - 1] = i[i.length - 1].angleTo(t)), this.addMarkerAngle(e, r ? r.angleTo(e) : null);
  }
  addMarkerAngle(e, r) {
    this.points.push(e), this.angles.push(r);
  }
  getMarkerPoints() {
    return this.points;
  }
  getMarkerAngles() {
    for (var {
      angles: e
    } = this, r = e.length, t = 0; t < r; t++)
      if (!e[t]) {
        for (var i = t + 1; i < r; i++)
          if (e[i]) {
            e[t] = e[i];
            break;
          }
      }
    return e;
  }
}
class tr extends X {
  constructor() {
    super(...arguments), this.modifiedEmSizeStack = !1;
  }
  calculateOpacity() {
    for (var e = 1, r = this; r; ) {
      var t = r.getStyle("opacity", !1, !0);
      t.hasValue(!0) && (e *= t.getNumber()), r = r.parent;
    }
    return e;
  }
  setContext(e) {
    var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
    if (!r) {
      var t = this.getStyle("fill"), i = this.getStyle("fill-opacity"), a = this.getStyle("stroke"), s = this.getStyle("stroke-opacity");
      if (t.isUrlDefinition()) {
        var o = t.getFillStyleDefinition(this, i);
        o && (e.fillStyle = o);
      } else if (t.hasValue()) {
        t.getString() === "currentColor" && t.setValue(this.getStyle("color").getColor());
        var u = t.getColor();
        u !== "inherit" && (e.fillStyle = u === "none" ? "rgba(0,0,0,0)" : u);
      }
      if (i.hasValue()) {
        var l = new q(this.document, "fill", e.fillStyle).addOpacity(i).getColor();
        e.fillStyle = l;
      }
      if (a.isUrlDefinition()) {
        var h = a.getFillStyleDefinition(this, s);
        h && (e.strokeStyle = h);
      } else if (a.hasValue()) {
        a.getString() === "currentColor" && a.setValue(this.getStyle("color").getColor());
        var c = a.getString();
        c !== "inherit" && (e.strokeStyle = c === "none" ? "rgba(0,0,0,0)" : c);
      }
      if (s.hasValue()) {
        var v = new q(this.document, "stroke", e.strokeStyle).addOpacity(s).getString();
        e.strokeStyle = v;
      }
      var f = this.getStyle("stroke-width");
      if (f.hasValue()) {
        var g = f.getPixels();
        e.lineWidth = g || ir;
      }
      var d = this.getStyle("stroke-linecap"), p = this.getStyle("stroke-linejoin"), m = this.getStyle("stroke-miterlimit"), x = this.getStyle("stroke-dasharray"), y = this.getStyle("stroke-dashoffset");
      if (d.hasValue() && (e.lineCap = d.getString()), p.hasValue() && (e.lineJoin = p.getString()), m.hasValue() && (e.miterLimit = m.getNumber()), x.hasValue() && x.getString() !== "none") {
        var b = de(x.getString());
        typeof e.setLineDash != "undefined" ? e.setLineDash(b) : typeof e.webkitLineDash != "undefined" ? e.webkitLineDash = b : typeof e.mozDash != "undefined" && !(b.length === 1 && b[0] === 0) && (e.mozDash = b);
        var T = y.getPixels();
        typeof e.lineDashOffset != "undefined" ? e.lineDashOffset = T : typeof e.webkitLineDashOffset != "undefined" ? e.webkitLineDashOffset = T : typeof e.mozDashOffset != "undefined" && (e.mozDashOffset = T);
      }
    }
    if (this.modifiedEmSizeStack = !1, typeof e.font != "undefined") {
      var E = this.getStyle("font"), O = this.getStyle("font-style"), N = this.getStyle("font-variant"), D = this.getStyle("font-weight"), P = this.getStyle("font-size"), M = this.getStyle("font-family"), A = new ue(O.getString(), N.getString(), D.getString(), P.hasValue() ? "".concat(P.getPixels(!0), "px") : "", M.getString(), ue.parse(E.getString(), e.font));
      O.setValue(A.fontStyle), N.setValue(A.fontVariant), D.setValue(A.fontWeight), P.setValue(A.fontSize), M.setValue(A.fontFamily), e.font = A.toString(), P.isPixels() && (this.document.emSize = P.getPixels(), this.modifiedEmSizeStack = !0);
    }
    r || (this.applyEffects(e), e.globalAlpha = this.calculateOpacity());
  }
  clearContext(e) {
    super.clearContext(e), this.modifiedEmSizeStack && this.document.popEmSize();
  }
}
class W extends tr {
  constructor(e, r, t) {
    super(e, r, t), this.type = "path", this.pathParser = null, this.pathParser = new U(this.getAttribute("d").getString());
  }
  path(e) {
    var {
      pathParser: r
    } = this, t = new Ne();
    for (r.reset(), e && e.beginPath(); !r.isEnd(); )
      switch (r.next().type) {
        case U.MOVE_TO:
          this.pathM(e, t);
          break;
        case U.LINE_TO:
          this.pathL(e, t);
          break;
        case U.HORIZ_LINE_TO:
          this.pathH(e, t);
          break;
        case U.VERT_LINE_TO:
          this.pathV(e, t);
          break;
        case U.CURVE_TO:
          this.pathC(e, t);
          break;
        case U.SMOOTH_CURVE_TO:
          this.pathS(e, t);
          break;
        case U.QUAD_TO:
          this.pathQ(e, t);
          break;
        case U.SMOOTH_QUAD_TO:
          this.pathT(e, t);
          break;
        case U.ARC:
          this.pathA(e, t);
          break;
        case U.CLOSE_PATH:
          this.pathZ(e, t);
          break;
      }
    return t;
  }
  getBoundingBox(e) {
    return this.path();
  }
  getMarkers() {
    var {
      pathParser: e
    } = this, r = e.getMarkerPoints(), t = e.getMarkerAngles(), i = r.map((a, s) => [a, t[s]]);
    return i;
  }
  renderChildren(e) {
    this.path(e), this.document.screen.mouse.checkPath(this, e);
    var r = this.getStyle("fill-rule");
    e.fillStyle !== "" && (r.getString("inherit") !== "inherit" ? e.fill(r.getString()) : e.fill()), e.strokeStyle !== "" && (this.getAttribute("vector-effect").getString() === "non-scaling-stroke" ? (e.save(), e.setTransform(1, 0, 0, 1, 0, 0), e.stroke(), e.restore()) : e.stroke());
    var t = this.getMarkers();
    if (t) {
      var i = t.length - 1, a = this.getStyle("marker-start"), s = this.getStyle("marker-mid"), o = this.getStyle("marker-end");
      if (a.isUrlDefinition()) {
        var u = a.getDefinition(), [l, h] = t[0];
        u.render(e, l, h);
      }
      if (s.isUrlDefinition())
        for (var c = s.getDefinition(), v = 1; v < i; v++) {
          var [f, g] = t[v];
          c.render(e, f, g);
        }
      if (o.isUrlDefinition()) {
        var d = o.getDefinition(), [p, m] = t[i];
        d.render(e, p, m);
      }
    }
  }
  static pathM(e) {
    var r = e.getAsCurrentPoint();
    return e.start = e.current, {
      point: r
    };
  }
  pathM(e, r) {
    var {
      pathParser: t
    } = this, {
      point: i
    } = W.pathM(t), {
      x: a,
      y: s
    } = i;
    t.addMarker(i), r.addPoint(a, s), e && e.moveTo(a, s);
  }
  static pathL(e) {
    var {
      current: r
    } = e, t = e.getAsCurrentPoint();
    return {
      current: r,
      point: t
    };
  }
  pathL(e, r) {
    var {
      pathParser: t
    } = this, {
      current: i,
      point: a
    } = W.pathL(t), {
      x: s,
      y: o
    } = a;
    t.addMarker(a, i), r.addPoint(s, o), e && e.lineTo(s, o);
  }
  static pathH(e) {
    var {
      current: r,
      command: t
    } = e, i = new ee((t.relative ? r.x : 0) + t.x, r.y);
    return e.current = i, {
      current: r,
      point: i
    };
  }
  pathH(e, r) {
    var {
      pathParser: t
    } = this, {
      current: i,
      point: a
    } = W.pathH(t), {
      x: s,
      y: o
    } = a;
    t.addMarker(a, i), r.addPoint(s, o), e && e.lineTo(s, o);
  }
  static pathV(e) {
    var {
      current: r,
      command: t
    } = e, i = new ee(r.x, (t.relative ? r.y : 0) + t.y);
    return e.current = i, {
      current: r,
      point: i
    };
  }
  pathV(e, r) {
    var {
      pathParser: t
    } = this, {
      current: i,
      point: a
    } = W.pathV(t), {
      x: s,
      y: o
    } = a;
    t.addMarker(a, i), r.addPoint(s, o), e && e.lineTo(s, o);
  }
  static pathC(e) {
    var {
      current: r
    } = e, t = e.getPoint("x1", "y1"), i = e.getAsControlPoint("x2", "y2"), a = e.getAsCurrentPoint();
    return {
      current: r,
      point: t,
      controlPoint: i,
      currentPoint: a
    };
  }
  pathC(e, r) {
    var {
      pathParser: t
    } = this, {
      current: i,
      point: a,
      controlPoint: s,
      currentPoint: o
    } = W.pathC(t);
    t.addMarker(o, s, a), r.addBezierCurve(i.x, i.y, a.x, a.y, s.x, s.y, o.x, o.y), e && e.bezierCurveTo(a.x, a.y, s.x, s.y, o.x, o.y);
  }
  static pathS(e) {
    var {
      current: r
    } = e, t = e.getReflectedControlPoint(), i = e.getAsControlPoint("x2", "y2"), a = e.getAsCurrentPoint();
    return {
      current: r,
      point: t,
      controlPoint: i,
      currentPoint: a
    };
  }
  pathS(e, r) {
    var {
      pathParser: t
    } = this, {
      current: i,
      point: a,
      controlPoint: s,
      currentPoint: o
    } = W.pathS(t);
    t.addMarker(o, s, a), r.addBezierCurve(i.x, i.y, a.x, a.y, s.x, s.y, o.x, o.y), e && e.bezierCurveTo(a.x, a.y, s.x, s.y, o.x, o.y);
  }
  static pathQ(e) {
    var {
      current: r
    } = e, t = e.getAsControlPoint("x1", "y1"), i = e.getAsCurrentPoint();
    return {
      current: r,
      controlPoint: t,
      currentPoint: i
    };
  }
  pathQ(e, r) {
    var {
      pathParser: t
    } = this, {
      current: i,
      controlPoint: a,
      currentPoint: s
    } = W.pathQ(t);
    t.addMarker(s, a, a), r.addQuadraticCurve(i.x, i.y, a.x, a.y, s.x, s.y), e && e.quadraticCurveTo(a.x, a.y, s.x, s.y);
  }
  static pathT(e) {
    var {
      current: r
    } = e, t = e.getReflectedControlPoint();
    e.control = t;
    var i = e.getAsCurrentPoint();
    return {
      current: r,
      controlPoint: t,
      currentPoint: i
    };
  }
  pathT(e, r) {
    var {
      pathParser: t
    } = this, {
      current: i,
      controlPoint: a,
      currentPoint: s
    } = W.pathT(t);
    t.addMarker(s, a, a), r.addQuadraticCurve(i.x, i.y, a.x, a.y, s.x, s.y), e && e.quadraticCurveTo(a.x, a.y, s.x, s.y);
  }
  static pathA(e) {
    var {
      current: r,
      command: t
    } = e, {
      rX: i,
      rY: a,
      xRot: s,
      lArcFlag: o,
      sweepFlag: u
    } = t, l = s * (Math.PI / 180), h = e.getAsCurrentPoint(), c = new ee(Math.cos(l) * (r.x - h.x) / 2 + Math.sin(l) * (r.y - h.y) / 2, -Math.sin(l) * (r.x - h.x) / 2 + Math.cos(l) * (r.y - h.y) / 2), v = Math.pow(c.x, 2) / Math.pow(i, 2) + Math.pow(c.y, 2) / Math.pow(a, 2);
    v > 1 && (i *= Math.sqrt(v), a *= Math.sqrt(v));
    var f = (o === u ? -1 : 1) * Math.sqrt((Math.pow(i, 2) * Math.pow(a, 2) - Math.pow(i, 2) * Math.pow(c.y, 2) - Math.pow(a, 2) * Math.pow(c.x, 2)) / (Math.pow(i, 2) * Math.pow(c.y, 2) + Math.pow(a, 2) * Math.pow(c.x, 2)));
    isNaN(f) && (f = 0);
    var g = new ee(f * i * c.y / a, f * -a * c.x / i), d = new ee((r.x + h.x) / 2 + Math.cos(l) * g.x - Math.sin(l) * g.y, (r.y + h.y) / 2 + Math.sin(l) * g.x + Math.cos(l) * g.y), p = Bu([1, 0], [(c.x - g.x) / i, (c.y - g.y) / a]), m = [(c.x - g.x) / i, (c.y - g.y) / a], x = [(-c.x - g.x) / i, (-c.y - g.y) / a], y = Bu(m, x);
    return ka(m, x) <= -1 && (y = Math.PI), ka(m, x) >= 1 && (y = 0), {
      currentPoint: h,
      rX: i,
      rY: a,
      sweepFlag: u,
      xAxisRotation: l,
      centp: d,
      a1: p,
      ad: y
    };
  }
  pathA(e, r) {
    var {
      pathParser: t
    } = this, {
      currentPoint: i,
      rX: a,
      rY: s,
      sweepFlag: o,
      xAxisRotation: u,
      centp: l,
      a1: h,
      ad: c
    } = W.pathA(t), v = 1 - o ? 1 : -1, f = h + v * (c / 2), g = new ee(l.x + a * Math.cos(f), l.y + s * Math.sin(f));
    if (t.addMarkerAngle(g, f - v * Math.PI / 2), t.addMarkerAngle(i, f - v * Math.PI), r.addPoint(i.x, i.y), e && !isNaN(h) && !isNaN(c)) {
      var d = a > s ? a : s, p = a > s ? 1 : a / s, m = a > s ? s / a : 1;
      e.translate(l.x, l.y), e.rotate(u), e.scale(p, m), e.arc(0, 0, d, h, h + c, !!(1 - o)), e.scale(1 / p, 1 / m), e.rotate(-u), e.translate(-l.x, -l.y);
    }
  }
  static pathZ(e) {
    e.current = e.start;
  }
  pathZ(e, r) {
    W.pathZ(this.pathParser), e && r.x1 !== r.x2 && r.y1 !== r.y2 && e.closePath();
  }
}
class kl extends W {
  constructor(e, r, t) {
    super(e, r, t), this.type = "glyph", this.horizAdvX = this.getAttribute("horiz-adv-x").getNumber(), this.unicode = this.getAttribute("unicode").getString(), this.arabicForm = this.getAttribute("arabic-form").getString();
  }
}
class ze extends tr {
  constructor(e, r, t) {
    super(e, r, new.target === ze ? !0 : t), this.type = "text", this.x = 0, this.y = 0, this.measureCache = -1;
  }
  setContext(e) {
    var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
    super.setContext(e, r);
    var t = this.getStyle("dominant-baseline").getTextBaseline() || this.getStyle("alignment-baseline").getTextBaseline();
    t && (e.textBaseline = t);
  }
  initializeCoordinates() {
    this.x = 0, this.y = 0, this.leafTexts = [], this.textChunkStart = 0, this.minX = Number.POSITIVE_INFINITY, this.maxX = Number.NEGATIVE_INFINITY;
  }
  getBoundingBox(e) {
    if (this.type !== "text")
      return this.getTElementBoundingBox(e);
    this.initializeCoordinates(), this.adjustChildCoordinatesRecursive(e);
    var r = null;
    return this.children.forEach((t, i) => {
      var a = this.getChildBoundingBox(e, this, this, i);
      r ? r.addBoundingBox(a) : r = a;
    }), r;
  }
  getFontSize() {
    var {
      document: e,
      parent: r
    } = this, t = ue.parse(e.ctx.font).fontSize, i = r.getStyle("font-size").getNumber(t);
    return i;
  }
  getTElementBoundingBox(e) {
    var r = this.getFontSize();
    return new Ne(this.x, this.y - r, this.x + this.measureText(e), this.y);
  }
  getGlyph(e, r, t) {
    var i = r[t], a = null;
    if (e.isArabic) {
      var s = r.length, o = r[t - 1], u = r[t + 1], l = "isolated";
      if ((t === 0 || o === " ") && t < s - 1 && u !== " " && (l = "terminal"), t > 0 && o !== " " && t < s - 1 && u !== " " && (l = "medial"), t > 0 && o !== " " && (t === s - 1 || u === " ") && (l = "initial"), typeof e.glyphs[i] != "undefined") {
        var h = e.glyphs[i];
        a = h instanceof kl ? h : h[l];
      }
    } else
      a = e.glyphs[i];
    return a || (a = e.missingGlyph), a;
  }
  getText() {
    return "";
  }
  getTextFromNode(e) {
    var r = e || this.node, t = Array.from(r.parentNode.childNodes), i = t.indexOf(r), a = t.length - 1, s = sr(
      // textNode.value
      // || textNode.text
      r.textContent || ""
    );
    return i === 0 && (s = Cf(s)), i === a && (s = wf(s)), s;
  }
  renderChildren(e) {
    if (this.type !== "text") {
      this.renderTElementChildren(e);
      return;
    }
    this.initializeCoordinates(), this.adjustChildCoordinatesRecursive(e), this.children.forEach((t, i) => {
      this.renderChild(e, this, this, i);
    });
    var {
      mouse: r
    } = this.document.screen;
    r.isWorking() && r.checkBoundingBox(this, this.getBoundingBox(e));
  }
  renderTElementChildren(e) {
    var {
      document: r,
      parent: t
    } = this, i = this.getText(), a = t.getStyle("font-family").getDefinition();
    if (a) {
      for (var {
        unitsPerEm: s
      } = a.fontFace, o = ue.parse(r.ctx.font), u = t.getStyle("font-size").getNumber(o.fontSize), l = t.getStyle("font-style").getString(o.fontStyle), h = u / s, c = a.isRTL ? i.split("").reverse().join("") : i, v = de(t.getAttribute("dx").getString()), f = c.length, g = 0; g < f; g++) {
        var d = this.getGlyph(a, c, g);
        e.translate(this.x, this.y), e.scale(h, -h);
        var p = e.lineWidth;
        e.lineWidth = e.lineWidth * s / u, l === "italic" && e.transform(1, 0, 0.4, 1, 0, 0), d.render(e), l === "italic" && e.transform(1, 0, -0.4, 1, 0, 0), e.lineWidth = p, e.scale(1 / h, -1 / h), e.translate(-this.x, -this.y), this.x += u * (d.horizAdvX || a.horizAdvX) / s, typeof v[g] != "undefined" && !isNaN(v[g]) && (this.x += v[g]);
      }
      return;
    }
    var {
      x: m,
      y: x
    } = this;
    e.fillStyle && e.fillText(i, m, x), e.strokeStyle && e.strokeText(i, m, x);
  }
  applyAnchoring() {
    if (!(this.textChunkStart >= this.leafTexts.length)) {
      var e = this.leafTexts[this.textChunkStart], r = e.getStyle("text-anchor").getString("start"), t = !1, i = 0;
      r === "start" || r === "end" && t ? i = e.x - this.minX : r === "end" || r === "start" && t ? i = e.x - this.maxX : i = e.x - (this.minX + this.maxX) / 2;
      for (var a = this.textChunkStart; a < this.leafTexts.length; a++)
        this.leafTexts[a].x += i;
      this.minX = Number.POSITIVE_INFINITY, this.maxX = Number.NEGATIVE_INFINITY, this.textChunkStart = this.leafTexts.length;
    }
  }
  adjustChildCoordinatesRecursive(e) {
    this.children.forEach((r, t) => {
      this.adjustChildCoordinatesRecursiveCore(e, this, this, t);
    }), this.applyAnchoring();
  }
  adjustChildCoordinatesRecursiveCore(e, r, t, i) {
    var a = t.children[i];
    a.children.length > 0 ? a.children.forEach((s, o) => {
      r.adjustChildCoordinatesRecursiveCore(e, r, a, o);
    }) : this.adjustChildCoordinates(e, r, t, i);
  }
  adjustChildCoordinates(e, r, t, i) {
    var a = t.children[i];
    if (typeof a.measureText != "function")
      return a;
    e.save(), a.setContext(e, !0);
    var s = a.getAttribute("x"), o = a.getAttribute("y"), u = a.getAttribute("dx"), l = a.getAttribute("dy"), h = a.getStyle("font-family").getDefinition(), c = !!h && h.isRTL;
    i === 0 && (s.hasValue() || s.setValue(a.getInheritedAttribute("x")), o.hasValue() || o.setValue(a.getInheritedAttribute("y")), u.hasValue() || u.setValue(a.getInheritedAttribute("dx")), l.hasValue() || l.setValue(a.getInheritedAttribute("dy")));
    var v = a.measureText(e);
    return c && (r.x -= v), s.hasValue() ? (r.applyAnchoring(), a.x = s.getPixels("x"), u.hasValue() && (a.x += u.getPixels("x"))) : (u.hasValue() && (r.x += u.getPixels("x")), a.x = r.x), r.x = a.x, c || (r.x += v), o.hasValue() ? (a.y = o.getPixels("y"), l.hasValue() && (a.y += l.getPixels("y"))) : (l.hasValue() && (r.y += l.getPixels("y")), a.y = r.y), r.y = a.y, r.leafTexts.push(a), r.minX = Math.min(r.minX, a.x, a.x + v), r.maxX = Math.max(r.maxX, a.x, a.x + v), a.clearContext(e), e.restore(), a;
  }
  getChildBoundingBox(e, r, t, i) {
    var a = t.children[i];
    if (typeof a.getBoundingBox != "function")
      return null;
    var s = a.getBoundingBox(e);
    return s ? (a.children.forEach((o, u) => {
      var l = r.getChildBoundingBox(e, r, a, u);
      s.addBoundingBox(l);
    }), s) : null;
  }
  renderChild(e, r, t, i) {
    var a = t.children[i];
    a.render(e), a.children.forEach((s, o) => {
      r.renderChild(e, r, a, o);
    });
  }
  measureText(e) {
    var {
      measureCache: r
    } = this;
    if (~r)
      return r;
    var t = this.getText(), i = this.measureTargetText(e, t);
    return this.measureCache = i, i;
  }
  measureTargetText(e, r) {
    if (!r.length)
      return 0;
    var {
      parent: t
    } = this, i = t.getStyle("font-family").getDefinition();
    if (i) {
      for (var a = this.getFontSize(), s = i.isRTL ? r.split("").reverse().join("") : r, o = de(t.getAttribute("dx").getString()), u = s.length, l = 0, h = 0; h < u; h++) {
        var c = this.getGlyph(i, s, h);
        l += (c.horizAdvX || i.horizAdvX) * a / i.fontFace.unitsPerEm, typeof o[h] != "undefined" && !isNaN(o[h]) && (l += o[h]);
      }
      return l;
    }
    if (!e.measureText)
      return r.length * 10;
    e.save(), this.setContext(e, !0);
    var {
      width: v
    } = e.measureText(r);
    return this.clearContext(e), e.restore(), v;
  }
  /**
   * Inherits positional attributes from {@link TextElement} parent(s). Attributes
   * are only inherited from a parent to its first child.
   * @param name - The attribute name.
   * @returns The attribute value or null.
   */
  getInheritedAttribute(e) {
    for (var r = this; r instanceof ze && r.isFirstChild(); ) {
      var t = r.parent.getAttribute(e);
      if (t.hasValue(!0))
        return t.getValue("0");
      r = r.parent;
    }
    return null;
  }
}
class $r extends ze {
  constructor(e, r, t) {
    super(e, r, new.target === $r ? !0 : t), this.type = "tspan", this.text = this.children.length > 0 ? "" : this.getTextFromNode();
  }
  getText() {
    return this.text;
  }
}
class rc extends $r {
  constructor() {
    super(...arguments), this.type = "textNode";
  }
}
class Or extends tr {
  constructor() {
    super(...arguments), this.type = "svg", this.root = !1;
  }
  setContext(e) {
    var r, {
      document: t
    } = this, {
      screen: i,
      window: a
    } = t, s = e.canvas;
    if (i.setDefaults(e), s.style && typeof e.font != "undefined" && a && typeof a.getComputedStyle != "undefined") {
      e.font = a.getComputedStyle(s).getPropertyValue("font");
      var o = new q(t, "fontSize", ue.parse(e.font).fontSize);
      o.hasValue() && (t.rootEmSize = o.getPixels("y"), t.emSize = t.rootEmSize);
    }
    this.getAttribute("x").hasValue() || this.getAttribute("x", !0).setValue(0), this.getAttribute("y").hasValue() || this.getAttribute("y", !0).setValue(0);
    var {
      width: u,
      height: l
    } = i.viewPort;
    this.getStyle("width").hasValue() || this.getStyle("width", !0).setValue("100%"), this.getStyle("height").hasValue() || this.getStyle("height", !0).setValue("100%"), this.getStyle("color").hasValue() || this.getStyle("color", !0).setValue("black");
    var h = this.getAttribute("refX"), c = this.getAttribute("refY"), v = this.getAttribute("viewBox"), f = v.hasValue() ? de(v.getString()) : null, g = !this.root && this.getStyle("overflow").getValue("hidden") !== "visible", d = 0, p = 0, m = 0, x = 0;
    f && (d = f[0], p = f[1]), this.root || (u = this.getStyle("width").getPixels("x"), l = this.getStyle("height").getPixels("y"), this.type === "marker" && (m = d, x = p, d = 0, p = 0)), i.viewPort.setCurrent(u, l), this.node && (!this.parent || ((r = this.node.parentNode) === null || r === void 0 ? void 0 : r.nodeName) === "foreignObject") && this.getStyle("transform", !1, !0).hasValue() && !this.getStyle("transform-origin", !1, !0).hasValue() && this.getStyle("transform-origin", !0, !0).setValue("50% 50%"), super.setContext(e), e.translate(this.getAttribute("x").getPixels("x"), this.getAttribute("y").getPixels("y")), f && (u = f[2], l = f[3]), t.setViewBox({
      ctx: e,
      aspectRatio: this.getAttribute("preserveAspectRatio").getString(),
      width: i.viewPort.width,
      desiredWidth: u,
      height: i.viewPort.height,
      desiredHeight: l,
      minX: d,
      minY: p,
      refX: h.getValue(),
      refY: c.getValue(),
      clip: g,
      clipX: m,
      clipY: x
    }), f && (i.viewPort.removeCurrent(), i.viewPort.setCurrent(u, l));
  }
  clearContext(e) {
    super.clearContext(e), this.document.screen.viewPort.removeCurrent();
  }
  /**
   * Resize SVG to fit in given size.
   * @param width
   * @param height
   * @param preserveAspectRatio
   */
  resize(e) {
    var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e, t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !1, i = this.getAttribute("width", !0), a = this.getAttribute("height", !0), s = this.getAttribute("viewBox"), o = this.getAttribute("style"), u = i.getNumber(0), l = a.getNumber(0);
    if (t)
      if (typeof t == "string")
        this.getAttribute("preserveAspectRatio", !0).setValue(t);
      else {
        var h = this.getAttribute("preserveAspectRatio");
        h.hasValue() && h.setValue(h.getString().replace(/^\s*(\S.*\S)\s*$/, "$1"));
      }
    if (i.setValue(e), a.setValue(r), s.hasValue() || s.setValue("0 0 ".concat(u || e, " ").concat(l || r)), o.hasValue()) {
      var c = this.getStyle("width"), v = this.getStyle("height");
      c.hasValue() && c.setValue("".concat(e, "px")), v.hasValue() && v.setValue("".concat(r, "px"));
    }
  }
}
class Ll extends W {
  constructor() {
    super(...arguments), this.type = "rect";
  }
  path(e) {
    var r = this.getAttribute("x").getPixels("x"), t = this.getAttribute("y").getPixels("y"), i = this.getStyle("width", !1, !0).getPixels("x"), a = this.getStyle("height", !1, !0).getPixels("y"), s = this.getAttribute("rx"), o = this.getAttribute("ry"), u = s.getPixels("x"), l = o.getPixels("y");
    if (s.hasValue() && !o.hasValue() && (l = u), o.hasValue() && !s.hasValue() && (u = l), u = Math.min(u, i / 2), l = Math.min(l, a / 2), e) {
      var h = 4 * ((Math.sqrt(2) - 1) / 3);
      e.beginPath(), a > 0 && i > 0 && (e.moveTo(r + u, t), e.lineTo(r + i - u, t), e.bezierCurveTo(r + i - u + h * u, t, r + i, t + l - h * l, r + i, t + l), e.lineTo(r + i, t + a - l), e.bezierCurveTo(r + i, t + a - l + h * l, r + i - u + h * u, t + a, r + i - u, t + a), e.lineTo(r + u, t + a), e.bezierCurveTo(r + u - h * u, t + a, r, t + a - l + h * l, r, t + a - l), e.lineTo(r, t + l), e.bezierCurveTo(r, t + l - h * l, r + u - h * u, t, r + u, t), e.closePath());
    }
    return new Ne(r, t, r + i, t + a);
  }
  getMarkers() {
    return null;
  }
}
class tc extends W {
  constructor() {
    super(...arguments), this.type = "circle";
  }
  path(e) {
    var r = this.getAttribute("cx").getPixels("x"), t = this.getAttribute("cy").getPixels("y"), i = this.getAttribute("r").getPixels();
    return e && i > 0 && (e.beginPath(), e.arc(r, t, i, 0, Math.PI * 2, !1), e.closePath()), new Ne(r - i, t - i, r + i, t + i);
  }
  getMarkers() {
    return null;
  }
}
class ic extends W {
  constructor() {
    super(...arguments), this.type = "ellipse";
  }
  path(e) {
    var r = 4 * ((Math.sqrt(2) - 1) / 3), t = this.getAttribute("rx").getPixels("x"), i = this.getAttribute("ry").getPixels("y"), a = this.getAttribute("cx").getPixels("x"), s = this.getAttribute("cy").getPixels("y");
    return e && t > 0 && i > 0 && (e.beginPath(), e.moveTo(a + t, s), e.bezierCurveTo(a + t, s + r * i, a + r * t, s + i, a, s + i), e.bezierCurveTo(a - r * t, s + i, a - t, s + r * i, a - t, s), e.bezierCurveTo(a - t, s - r * i, a - r * t, s - i, a, s - i), e.bezierCurveTo(a + r * t, s - i, a + t, s - r * i, a + t, s), e.closePath()), new Ne(a - t, s - i, a + t, s + i);
  }
  getMarkers() {
    return null;
  }
}
class ac extends W {
  constructor() {
    super(...arguments), this.type = "line";
  }
  getPoints() {
    return [new ee(this.getAttribute("x1").getPixels("x"), this.getAttribute("y1").getPixels("y")), new ee(this.getAttribute("x2").getPixels("x"), this.getAttribute("y2").getPixels("y"))];
  }
  path(e) {
    var [{
      x: r,
      y: t
    }, {
      x: i,
      y: a
    }] = this.getPoints();
    return e && (e.beginPath(), e.moveTo(r, t), e.lineTo(i, a)), new Ne(r, t, i, a);
  }
  getMarkers() {
    var [e, r] = this.getPoints(), t = e.angleTo(r);
    return [[e, t], [r, t]];
  }
}
class jl extends W {
  constructor(e, r, t) {
    super(e, r, t), this.type = "polyline", this.points = [], this.points = ee.parsePath(this.getAttribute("points").getString());
  }
  path(e) {
    var {
      points: r
    } = this, [{
      x: t,
      y: i
    }] = r, a = new Ne(t, i);
    return e && (e.beginPath(), e.moveTo(t, i)), r.forEach((s) => {
      var {
        x: o,
        y: u
      } = s;
      a.addPoint(o, u), e && e.lineTo(o, u);
    }), a;
  }
  getMarkers() {
    var {
      points: e
    } = this, r = e.length - 1, t = [];
    return e.forEach((i, a) => {
      a !== r && t.push([i, i.angleTo(e[a + 1])]);
    }), t.length > 0 && t.push([e[e.length - 1], t[t.length - 1][1]]), t;
  }
}
class nc extends jl {
  constructor() {
    super(...arguments), this.type = "polygon";
  }
  path(e) {
    var r = super.path(e), [{
      x: t,
      y: i
    }] = this.points;
    return e && (e.lineTo(t, i), e.closePath()), r;
  }
}
class sc extends X {
  constructor() {
    super(...arguments), this.type = "pattern";
  }
  createPattern(e, r, t) {
    var i = this.getStyle("width").getPixels("x", !0), a = this.getStyle("height").getPixels("y", !0), s = new Or(this.document, null);
    s.attributes.viewBox = new q(this.document, "viewBox", this.getAttribute("viewBox").getValue()), s.attributes.width = new q(this.document, "width", "".concat(i, "px")), s.attributes.height = new q(this.document, "height", "".concat(a, "px")), s.attributes.transform = new q(this.document, "transform", this.getAttribute("patternTransform").getValue()), s.children = this.children;
    var o = this.document.createCanvas(i, a), u = o.getContext("2d"), l = this.getAttribute("x"), h = this.getAttribute("y");
    l.hasValue() && h.hasValue() && u.translate(l.getPixels("x", !0), h.getPixels("y", !0)), t.hasValue() ? this.styles["fill-opacity"] = t : Reflect.deleteProperty(this.styles, "fill-opacity");
    for (var c = -1; c <= 1; c++)
      for (var v = -1; v <= 1; v++)
        u.save(), s.attributes.x = new q(this.document, "x", c * o.width), s.attributes.y = new q(this.document, "y", v * o.height), s.render(u), u.restore();
    var f = e.createPattern(o, "repeat");
    return f;
  }
}
class oc extends X {
  constructor() {
    super(...arguments), this.type = "marker";
  }
  render(e, r, t) {
    if (r) {
      var {
        x: i,
        y: a
      } = r, s = this.getAttribute("orient").getString("auto"), o = this.getAttribute("markerUnits").getString("strokeWidth");
      e.translate(i, a), s === "auto" && e.rotate(t), o === "strokeWidth" && e.scale(e.lineWidth, e.lineWidth), e.save();
      var u = new Or(this.document, null);
      u.type = this.type, u.attributes.viewBox = new q(this.document, "viewBox", this.getAttribute("viewBox").getValue()), u.attributes.refX = new q(this.document, "refX", this.getAttribute("refX").getValue()), u.attributes.refY = new q(this.document, "refY", this.getAttribute("refY").getValue()), u.attributes.width = new q(this.document, "width", this.getAttribute("markerWidth").getValue()), u.attributes.height = new q(this.document, "height", this.getAttribute("markerHeight").getValue()), u.attributes.overflow = new q(this.document, "overflow", this.getAttribute("overflow").getValue()), u.attributes.fill = new q(this.document, "fill", this.getAttribute("fill").getColor("black")), u.attributes.stroke = new q(this.document, "stroke", this.getAttribute("stroke").getValue("none")), u.children = this.children, u.render(e), e.restore(), o === "strokeWidth" && e.scale(1 / e.lineWidth, 1 / e.lineWidth), s === "auto" && e.rotate(-t), e.translate(-i, -a);
    }
  }
}
class uc extends X {
  constructor() {
    super(...arguments), this.type = "defs";
  }
  render() {
  }
}
class sn extends tr {
  constructor() {
    super(...arguments), this.type = "g";
  }
  getBoundingBox(e) {
    var r = new Ne();
    return this.children.forEach((t) => {
      r.addBoundingBox(t.getBoundingBox(e));
    }), r;
  }
}
class Bl extends X {
  constructor(e, r, t) {
    super(e, r, t), this.attributesToInherit = ["gradientUnits"], this.stops = [];
    var {
      stops: i,
      children: a
    } = this;
    a.forEach((s) => {
      s.type === "stop" && i.push(s);
    });
  }
  getGradientUnits() {
    return this.getAttribute("gradientUnits").getString("objectBoundingBox");
  }
  createGradient(e, r, t) {
    var i = this;
    this.getHrefAttribute().hasValue() && (i = this.getHrefAttribute().getDefinition(), this.inheritStopContainer(i));
    var {
      stops: a
    } = i, s = this.getGradient(e, r);
    if (!s)
      return this.addParentOpacity(t, a[a.length - 1].color);
    if (a.forEach((p) => {
      s.addColorStop(p.offset, this.addParentOpacity(t, p.color));
    }), this.getAttribute("gradientTransform").hasValue()) {
      var {
        document: o
      } = this, {
        MAX_VIRTUAL_PIXELS: u,
        viewPort: l
      } = o.screen, [h] = l.viewPorts, c = new Ll(o, null);
      c.attributes.x = new q(o, "x", -u / 3), c.attributes.y = new q(o, "y", -u / 3), c.attributes.width = new q(o, "width", u), c.attributes.height = new q(o, "height", u);
      var v = new sn(o, null);
      v.attributes.transform = new q(o, "transform", this.getAttribute("gradientTransform").getValue()), v.children = [c];
      var f = new Or(o, null);
      f.attributes.x = new q(o, "x", 0), f.attributes.y = new q(o, "y", 0), f.attributes.width = new q(o, "width", h.width), f.attributes.height = new q(o, "height", h.height), f.children = [v];
      var g = o.createCanvas(h.width, h.height), d = g.getContext("2d");
      return d.fillStyle = s, f.render(d), d.createPattern(g, "no-repeat");
    }
    return s;
  }
  inheritStopContainer(e) {
    this.attributesToInherit.forEach((r) => {
      !this.getAttribute(r).hasValue() && e.getAttribute(r).hasValue() && this.getAttribute(r, !0).setValue(e.getAttribute(r).getValue());
    });
  }
  addParentOpacity(e, r) {
    if (e.hasValue()) {
      var t = new q(this.document, "color", r);
      return t.addOpacity(e).getColor();
    }
    return r;
  }
}
class lc extends Bl {
  constructor(e, r, t) {
    super(e, r, t), this.type = "linearGradient", this.attributesToInherit.push("x1", "y1", "x2", "y2");
  }
  getGradient(e, r) {
    var t = this.getGradientUnits() === "objectBoundingBox", i = t ? r.getBoundingBox(e) : null;
    if (t && !i)
      return null;
    !this.getAttribute("x1").hasValue() && !this.getAttribute("y1").hasValue() && !this.getAttribute("x2").hasValue() && !this.getAttribute("y2").hasValue() && (this.getAttribute("x1", !0).setValue(0), this.getAttribute("y1", !0).setValue(0), this.getAttribute("x2", !0).setValue(1), this.getAttribute("y2", !0).setValue(0));
    var a = t ? i.x + i.width * this.getAttribute("x1").getNumber() : this.getAttribute("x1").getPixels("x"), s = t ? i.y + i.height * this.getAttribute("y1").getNumber() : this.getAttribute("y1").getPixels("y"), o = t ? i.x + i.width * this.getAttribute("x2").getNumber() : this.getAttribute("x2").getPixels("x"), u = t ? i.y + i.height * this.getAttribute("y2").getNumber() : this.getAttribute("y2").getPixels("y");
    return a === o && s === u ? null : e.createLinearGradient(a, s, o, u);
  }
}
class hc extends Bl {
  constructor(e, r, t) {
    super(e, r, t), this.type = "radialGradient", this.attributesToInherit.push("cx", "cy", "r", "fx", "fy", "fr");
  }
  getGradient(e, r) {
    var t = this.getGradientUnits() === "objectBoundingBox", i = r.getBoundingBox(e);
    if (t && !i)
      return null;
    this.getAttribute("cx").hasValue() || this.getAttribute("cx", !0).setValue("50%"), this.getAttribute("cy").hasValue() || this.getAttribute("cy", !0).setValue("50%"), this.getAttribute("r").hasValue() || this.getAttribute("r", !0).setValue("50%");
    var a = t ? i.x + i.width * this.getAttribute("cx").getNumber() : this.getAttribute("cx").getPixels("x"), s = t ? i.y + i.height * this.getAttribute("cy").getNumber() : this.getAttribute("cy").getPixels("y"), o = a, u = s;
    this.getAttribute("fx").hasValue() && (o = t ? i.x + i.width * this.getAttribute("fx").getNumber() : this.getAttribute("fx").getPixels("x")), this.getAttribute("fy").hasValue() && (u = t ? i.y + i.height * this.getAttribute("fy").getNumber() : this.getAttribute("fy").getPixels("y"));
    var l = t ? (i.width + i.height) / 2 * this.getAttribute("r").getNumber() : this.getAttribute("r").getPixels(), h = this.getAttribute("fr").getPixels();
    return e.createRadialGradient(o, u, h, a, s, l);
  }
}
class fc extends X {
  constructor(e, r, t) {
    super(e, r, t), this.type = "stop";
    var i = Math.max(0, Math.min(1, this.getAttribute("offset").getNumber())), a = this.getStyle("stop-opacity"), s = this.getStyle("stop-color", !0);
    s.getString() === "" && s.setValue("#000"), a.hasValue() && (s = s.addOpacity(a)), this.offset = i, this.color = s.getColor();
  }
}
class on extends X {
  constructor(e, r, t) {
    super(e, r, t), this.type = "animate", this.duration = 0, this.initialValue = null, this.initialUnits = "", this.removed = !1, this.frozen = !1, e.screen.animations.push(this), this.begin = this.getAttribute("begin").getMilliseconds(), this.maxDuration = this.begin + this.getAttribute("dur").getMilliseconds(), this.from = this.getAttribute("from"), this.to = this.getAttribute("to"), this.values = new q(e, "values", null);
    var i = this.getAttribute("values");
    i.hasValue() && this.values.setValue(i.getString().split(";"));
  }
  getProperty() {
    var e = this.getAttribute("attributeType").getString(), r = this.getAttribute("attributeName").getString();
    return e === "CSS" ? this.parent.getStyle(r, !0) : this.parent.getAttribute(r, !0);
  }
  calcValue() {
    var {
      initialUnits: e
    } = this, {
      progress: r,
      from: t,
      to: i
    } = this.getProgress(), a = t.getNumber() + (i.getNumber() - t.getNumber()) * r;
    return e === "%" && (a *= 100), "".concat(a).concat(e);
  }
  update(e) {
    var {
      parent: r
    } = this, t = this.getProperty();
    if (this.initialValue || (this.initialValue = t.getString(), this.initialUnits = t.getUnits()), this.duration > this.maxDuration) {
      var i = this.getAttribute("fill").getString("remove");
      if (this.getAttribute("repeatCount").getString() === "indefinite" || this.getAttribute("repeatDur").getString() === "indefinite")
        this.duration = 0;
      else if (i === "freeze" && !this.frozen)
        this.frozen = !0, r.animationFrozen = !0, r.animationFrozenValue = t.getString();
      else if (i === "remove" && !this.removed)
        return this.removed = !0, t.setValue(r.animationFrozen ? r.animationFrozenValue : this.initialValue), !0;
      return !1;
    }
    this.duration += e;
    var a = !1;
    if (this.begin < this.duration) {
      var s = this.calcValue(), o = this.getAttribute("type");
      if (o.hasValue()) {
        var u = o.getString();
        s = "".concat(u, "(").concat(s, ")");
      }
      t.setValue(s), a = !0;
    }
    return a;
  }
  getProgress() {
    var {
      document: e,
      values: r
    } = this, t = {
      progress: (this.duration - this.begin) / (this.maxDuration - this.begin)
    };
    if (r.hasValue()) {
      var i = t.progress * (r.getValue().length - 1), a = Math.floor(i), s = Math.ceil(i);
      t.from = new q(e, "from", parseFloat(r.getValue()[a])), t.to = new q(e, "to", parseFloat(r.getValue()[s])), t.progress = (i - a) / (s - a);
    } else
      t.from = this.from, t.to = this.to;
    return t;
  }
}
class cc extends on {
  constructor() {
    super(...arguments), this.type = "animateColor";
  }
  calcValue() {
    var {
      progress: e,
      from: r,
      to: t
    } = this.getProgress(), i = new Da(r.getColor()), a = new Da(t.getColor());
    if (i.ok && a.ok) {
      var s = i.r + (a.r - i.r) * e, o = i.g + (a.g - i.g) * e, u = i.b + (a.b - i.b) * e;
      return "rgb(".concat(Math.floor(s), ", ").concat(Math.floor(o), ", ").concat(Math.floor(u), ")");
    }
    return this.getAttribute("from").getColor();
  }
}
class vc extends on {
  constructor() {
    super(...arguments), this.type = "animateTransform";
  }
  calcValue() {
    var {
      progress: e,
      from: r,
      to: t
    } = this.getProgress(), i = de(r.getString()), a = de(t.getString()), s = i.map((o, u) => {
      var l = a[u];
      return o + (l - o) * e;
    }).join(" ");
    return s;
  }
}
class gc extends X {
  constructor(e, r, t) {
    super(e, r, t), this.type = "font", this.glyphs = /* @__PURE__ */ Object.create(null), this.horizAdvX = this.getAttribute("horiz-adv-x").getNumber();
    var {
      definitions: i
    } = e, {
      children: a
    } = this;
    for (var s of a)
      switch (s.type) {
        case "font-face": {
          this.fontFace = s;
          var o = s.getStyle("font-family");
          o.hasValue() && (i[o.getString()] = this);
          break;
        }
        case "missing-glyph":
          this.missingGlyph = s;
          break;
        case "glyph": {
          var u = s;
          u.arabicForm ? (this.isRTL = !0, this.isArabic = !0, typeof this.glyphs[u.unicode] == "undefined" && (this.glyphs[u.unicode] = /* @__PURE__ */ Object.create(null)), this.glyphs[u.unicode][u.arabicForm] = u) : this.glyphs[u.unicode] = u;
          break;
        }
      }
  }
  render() {
  }
}
class dc extends X {
  constructor(e, r, t) {
    super(e, r, t), this.type = "font-face", this.ascent = this.getAttribute("ascent").getNumber(), this.descent = this.getAttribute("descent").getNumber(), this.unitsPerEm = this.getAttribute("units-per-em").getNumber();
  }
}
class pc extends W {
  constructor() {
    super(...arguments), this.type = "missing-glyph", this.horizAdvX = 0;
  }
}
class yc extends ze {
  constructor() {
    super(...arguments), this.type = "tref";
  }
  getText() {
    var e = this.getHrefAttribute().getDefinition();
    if (e) {
      var r = e.children[0];
      if (r)
        return r.getText();
    }
    return "";
  }
}
class mc extends ze {
  constructor(e, r, t) {
    super(e, r, t), this.type = "a";
    var {
      childNodes: i
    } = r, a = i[0], s = i.length > 0 && Array.from(i).every((o) => o.nodeType === 3);
    this.hasText = s, this.text = s ? this.getTextFromNode(a) : "";
  }
  getText() {
    return this.text;
  }
  renderChildren(e) {
    if (this.hasText) {
      super.renderChildren(e);
      var {
        document: r,
        x: t,
        y: i
      } = this, {
        mouse: a
      } = r.screen, s = new q(r, "fontSize", ue.parse(r.ctx.font).fontSize);
      a.isWorking() && a.checkBoundingBox(this, new Ne(t, i - s.getPixels("y"), t + this.measureText(e), i));
    } else if (this.children.length > 0) {
      var o = new sn(this.document, null);
      o.children = this.children, o.parent = this, o.render(e);
    }
  }
  onClick() {
    var {
      window: e
    } = this.document;
    e && e.open(this.getHrefAttribute().getString());
  }
  onMouseMove() {
    var e = this.document.ctx;
    e.canvas.style.cursor = "pointer";
  }
}
function Yu(n, e) {
  var r = Object.keys(n);
  if (Object.getOwnPropertySymbols) {
    var t = Object.getOwnPropertySymbols(n);
    e && (t = t.filter(function(i) {
      return Object.getOwnPropertyDescriptor(n, i).enumerable;
    })), r.push.apply(r, t);
  }
  return r;
}
function Cr(n) {
  for (var e = 1; e < arguments.length; e++) {
    var r = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Yu(Object(r), !0).forEach(function(t) {
      nn(n, t, r[t]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(n, Object.getOwnPropertyDescriptors(r)) : Yu(Object(r)).forEach(function(t) {
      Object.defineProperty(n, t, Object.getOwnPropertyDescriptor(r, t));
    });
  }
  return n;
}
class bc extends ze {
  constructor(e, r, t) {
    super(e, r, t), this.type = "textPath", this.textWidth = 0, this.textHeight = 0, this.pathLength = -1, this.glyphInfo = null, this.letterSpacingCache = [], this.measuresCache = /* @__PURE__ */ new Map([["", 0]]);
    var i = this.getHrefAttribute().getDefinition();
    this.text = this.getTextFromNode(), this.dataArray = this.parsePathData(i);
  }
  getText() {
    return this.text;
  }
  path(e) {
    var {
      dataArray: r
    } = this;
    e && e.beginPath(), r.forEach((t) => {
      var {
        type: i,
        points: a
      } = t;
      switch (i) {
        case U.LINE_TO:
          e && e.lineTo(a[0], a[1]);
          break;
        case U.MOVE_TO:
          e && e.moveTo(a[0], a[1]);
          break;
        case U.CURVE_TO:
          e && e.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
          break;
        case U.QUAD_TO:
          e && e.quadraticCurveTo(a[0], a[1], a[2], a[3]);
          break;
        case U.ARC: {
          var [s, o, u, l, h, c, v, f] = a, g = u > l ? u : l, d = u > l ? 1 : u / l, p = u > l ? l / u : 1;
          e && (e.translate(s, o), e.rotate(v), e.scale(d, p), e.arc(0, 0, g, h, h + c, !!(1 - f)), e.scale(1 / d, 1 / p), e.rotate(-v), e.translate(-s, -o));
          break;
        }
        case U.CLOSE_PATH:
          e && e.closePath();
          break;
      }
    });
  }
  renderChildren(e) {
    this.setTextData(e), e.save();
    var r = this.parent.getStyle("text-decoration").getString(), t = this.getFontSize(), {
      glyphInfo: i
    } = this, a = e.fillStyle;
    r === "underline" && e.beginPath(), i.forEach((s, o) => {
      var {
        p0: u,
        p1: l,
        rotation: h,
        text: c
      } = s;
      e.save(), e.translate(u.x, u.y), e.rotate(h), e.fillStyle && e.fillText(c, 0, 0), e.strokeStyle && e.strokeText(c, 0, 0), e.restore(), r === "underline" && (o === 0 && e.moveTo(u.x, u.y + t / 8), e.lineTo(l.x, l.y + t / 5));
    }), r === "underline" && (e.lineWidth = t / 20, e.strokeStyle = a, e.stroke(), e.closePath()), e.restore();
  }
  getLetterSpacingAt() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
    return this.letterSpacingCache[e] || 0;
  }
  findSegmentToFitChar(e, r, t, i, a, s, o, u, l) {
    var h = s, c = this.measureText(e, u);
    u === " " && r === "justify" && t < i && (c += (i - t) / a), l > -1 && (h += this.getLetterSpacingAt(l));
    var v = this.textHeight / 20, f = this.getEquidistantPointOnPath(h, v, 0), g = this.getEquidistantPointOnPath(h + c, v, 0), d = {
      p0: f,
      p1: g
    }, p = f && g ? Math.atan2(g.y - f.y, g.x - f.x) : 0;
    if (o) {
      var m = Math.cos(Math.PI / 2 + p) * o, x = Math.cos(-p) * o;
      d.p0 = Cr(Cr({}, f), {}, {
        x: f.x + m,
        y: f.y + x
      }), d.p1 = Cr(Cr({}, g), {}, {
        x: g.x + m,
        y: g.y + x
      });
    }
    return h += c, {
      offset: h,
      segment: d,
      rotation: p
    };
  }
  measureText(e, r) {
    var {
      measuresCache: t
    } = this, i = r || this.getText();
    if (t.has(i))
      return t.get(i);
    var a = this.measureTargetText(e, i);
    return t.set(i, a), a;
  }
  // This method supposes what all custom fonts already loaded.
  // If some font will be loaded after this method call, <textPath> will not be rendered correctly.
  // You need to call this method manually to update glyphs cache.
  setTextData(e) {
    if (!this.glyphInfo) {
      var r = this.getText(), t = r.split(""), i = r.split(" ").length - 1, a = this.parent.getAttribute("dx").split().map((b) => b.getPixels("x")), s = this.parent.getAttribute("dy").getPixels("y"), o = this.parent.getStyle("text-anchor").getString("start"), u = this.getStyle("letter-spacing"), l = this.parent.getStyle("letter-spacing"), h = 0;
      !u.hasValue() || u.getValue() === "inherit" ? h = l.getPixels() : u.hasValue() && u.getValue() !== "initial" && u.getValue() !== "unset" && (h = u.getPixels());
      var c = [], v = r.length;
      this.letterSpacingCache = c;
      for (var f = 0; f < v; f++)
        c.push(typeof a[f] != "undefined" ? a[f] : h);
      var g = c.reduce((b, T, E) => E === 0 ? 0 : b + T || 0, 0), d = this.measureText(e), p = Math.max(d + g, 0);
      this.textWidth = d, this.textHeight = this.getFontSize(), this.glyphInfo = [];
      var m = this.getPathLength(), x = this.getStyle("startOffset").getNumber(0) * m, y = 0;
      (o === "middle" || o === "center") && (y = -p / 2), (o === "end" || o === "right") && (y = -p), y += x, t.forEach((b, T) => {
        var {
          offset: E,
          segment: O,
          rotation: N
        } = this.findSegmentToFitChar(e, o, p, m, i, y, s, b, T);
        y = E, !(!O.p0 || !O.p1) && this.glyphInfo.push({
          // transposeX: midpoint.x,
          // transposeY: midpoint.y,
          text: t[T],
          p0: O.p0,
          p1: O.p1,
          rotation: N
        });
      });
    }
  }
  parsePathData(e) {
    if (this.pathLength = -1, !e)
      return [];
    var r = [], {
      pathParser: t
    } = e;
    for (t.reset(); !t.isEnd(); ) {
      var {
        current: i
      } = t, a = i ? i.x : 0, s = i ? i.y : 0, o = t.next(), u = o.type, l = [];
      switch (o.type) {
        case U.MOVE_TO:
          this.pathM(t, l);
          break;
        case U.LINE_TO:
          u = this.pathL(t, l);
          break;
        case U.HORIZ_LINE_TO:
          u = this.pathH(t, l);
          break;
        case U.VERT_LINE_TO:
          u = this.pathV(t, l);
          break;
        case U.CURVE_TO:
          this.pathC(t, l);
          break;
        case U.SMOOTH_CURVE_TO:
          u = this.pathS(t, l);
          break;
        case U.QUAD_TO:
          this.pathQ(t, l);
          break;
        case U.SMOOTH_QUAD_TO:
          u = this.pathT(t, l);
          break;
        case U.ARC:
          l = this.pathA(t);
          break;
        case U.CLOSE_PATH:
          W.pathZ(t);
          break;
      }
      o.type !== U.CLOSE_PATH ? r.push({
        type: u,
        points: l,
        start: {
          x: a,
          y: s
        },
        pathLength: this.calcLength(a, s, u, l)
      }) : r.push({
        type: U.CLOSE_PATH,
        points: [],
        pathLength: 0
      });
    }
    return r;
  }
  pathM(e, r) {
    var {
      x: t,
      y: i
    } = W.pathM(e).point;
    r.push(t, i);
  }
  pathL(e, r) {
    var {
      x: t,
      y: i
    } = W.pathL(e).point;
    return r.push(t, i), U.LINE_TO;
  }
  pathH(e, r) {
    var {
      x: t,
      y: i
    } = W.pathH(e).point;
    return r.push(t, i), U.LINE_TO;
  }
  pathV(e, r) {
    var {
      x: t,
      y: i
    } = W.pathV(e).point;
    return r.push(t, i), U.LINE_TO;
  }
  pathC(e, r) {
    var {
      point: t,
      controlPoint: i,
      currentPoint: a
    } = W.pathC(e);
    r.push(t.x, t.y, i.x, i.y, a.x, a.y);
  }
  pathS(e, r) {
    var {
      point: t,
      controlPoint: i,
      currentPoint: a
    } = W.pathS(e);
    return r.push(t.x, t.y, i.x, i.y, a.x, a.y), U.CURVE_TO;
  }
  pathQ(e, r) {
    var {
      controlPoint: t,
      currentPoint: i
    } = W.pathQ(e);
    r.push(t.x, t.y, i.x, i.y);
  }
  pathT(e, r) {
    var {
      controlPoint: t,
      currentPoint: i
    } = W.pathT(e);
    return r.push(t.x, t.y, i.x, i.y), U.QUAD_TO;
  }
  pathA(e) {
    var {
      rX: r,
      rY: t,
      sweepFlag: i,
      xAxisRotation: a,
      centp: s,
      a1: o,
      ad: u
    } = W.pathA(e);
    return i === 0 && u > 0 && (u -= 2 * Math.PI), i === 1 && u < 0 && (u += 2 * Math.PI), [s.x, s.y, r, t, o, u, a, i];
  }
  calcLength(e, r, t, i) {
    var a = 0, s = null, o = null, u = 0;
    switch (t) {
      case U.LINE_TO:
        return this.getLineLength(e, r, i[0], i[1]);
      case U.CURVE_TO:
        for (a = 0, s = this.getPointOnCubicBezier(0, e, r, i[0], i[1], i[2], i[3], i[4], i[5]), u = 0.01; u <= 1; u += 0.01)
          o = this.getPointOnCubicBezier(u, e, r, i[0], i[1], i[2], i[3], i[4], i[5]), a += this.getLineLength(s.x, s.y, o.x, o.y), s = o;
        return a;
      case U.QUAD_TO:
        for (a = 0, s = this.getPointOnQuadraticBezier(0, e, r, i[0], i[1], i[2], i[3]), u = 0.01; u <= 1; u += 0.01)
          o = this.getPointOnQuadraticBezier(u, e, r, i[0], i[1], i[2], i[3]), a += this.getLineLength(s.x, s.y, o.x, o.y), s = o;
        return a;
      case U.ARC: {
        a = 0;
        var l = i[4], h = i[5], c = i[4] + h, v = Math.PI / 180;
        if (Math.abs(l - c) < v && (v = Math.abs(l - c)), s = this.getPointOnEllipticalArc(i[0], i[1], i[2], i[3], l, 0), h < 0)
          for (u = l - v; u > c; u -= v)
            o = this.getPointOnEllipticalArc(i[0], i[1], i[2], i[3], u, 0), a += this.getLineLength(s.x, s.y, o.x, o.y), s = o;
        else
          for (u = l + v; u < c; u += v)
            o = this.getPointOnEllipticalArc(i[0], i[1], i[2], i[3], u, 0), a += this.getLineLength(s.x, s.y, o.x, o.y), s = o;
        return o = this.getPointOnEllipticalArc(i[0], i[1], i[2], i[3], c, 0), a += this.getLineLength(s.x, s.y, o.x, o.y), a;
      }
    }
    return 0;
  }
  getPointOnLine(e, r, t, i, a) {
    var s = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : r, o = arguments.length > 6 && arguments[6] !== void 0 ? arguments[6] : t, u = (a - t) / (i - r + ir), l = Math.sqrt(e * e / (1 + u * u));
    i < r && (l *= -1);
    var h = u * l, c = null;
    if (i === r)
      c = {
        x: s,
        y: o + h
      };
    else if ((o - t) / (s - r + ir) === u)
      c = {
        x: s + l,
        y: o + h
      };
    else {
      var v = 0, f = 0, g = this.getLineLength(r, t, i, a);
      if (g < ir)
        return null;
      var d = (s - r) * (i - r) + (o - t) * (a - t);
      d /= g * g, v = r + d * (i - r), f = t + d * (a - t);
      var p = this.getLineLength(s, o, v, f), m = Math.sqrt(e * e - p * p);
      l = Math.sqrt(m * m / (1 + u * u)), i < r && (l *= -1), h = u * l, c = {
        x: v + l,
        y: f + h
      };
    }
    return c;
  }
  getPointOnPath(e) {
    var r = this.getPathLength(), t = 0, i = null;
    if (e < -5e-5 || e - 5e-5 > r)
      return null;
    var {
      dataArray: a
    } = this;
    for (var s of a) {
      if (s && (s.pathLength < 5e-5 || t + s.pathLength + 5e-5 < e)) {
        t += s.pathLength;
        continue;
      }
      var o = e - t, u = 0;
      switch (s.type) {
        case U.LINE_TO:
          i = this.getPointOnLine(o, s.start.x, s.start.y, s.points[0], s.points[1], s.start.x, s.start.y);
          break;
        case U.ARC: {
          var l = s.points[4], h = s.points[5], c = s.points[4] + h;
          if (u = l + o / s.pathLength * h, h < 0 && u < c || h >= 0 && u > c)
            break;
          i = this.getPointOnEllipticalArc(s.points[0], s.points[1], s.points[2], s.points[3], u, s.points[6]);
          break;
        }
        case U.CURVE_TO:
          u = o / s.pathLength, u > 1 && (u = 1), i = this.getPointOnCubicBezier(u, s.start.x, s.start.y, s.points[0], s.points[1], s.points[2], s.points[3], s.points[4], s.points[5]);
          break;
        case U.QUAD_TO:
          u = o / s.pathLength, u > 1 && (u = 1), i = this.getPointOnQuadraticBezier(u, s.start.x, s.start.y, s.points[0], s.points[1], s.points[2], s.points[3]);
          break;
      }
      if (i)
        return i;
      break;
    }
    return null;
  }
  getLineLength(e, r, t, i) {
    return Math.sqrt((t - e) * (t - e) + (i - r) * (i - r));
  }
  getPathLength() {
    return this.pathLength === -1 && (this.pathLength = this.dataArray.reduce((e, r) => r.pathLength > 0 ? e + r.pathLength : e, 0)), this.pathLength;
  }
  getPointOnCubicBezier(e, r, t, i, a, s, o, u, l) {
    var h = u * Fu(e) + s * Uu(e) + i * Gu(e) + r * $u(e), c = l * Fu(e) + o * Uu(e) + a * Gu(e) + t * $u(e);
    return {
      x: h,
      y: c
    };
  }
  getPointOnQuadraticBezier(e, r, t, i, a, s, o) {
    var u = s * Hu(e) + i * zu(e) + r * Wu(e), l = o * Hu(e) + a * zu(e) + t * Wu(e);
    return {
      x: u,
      y: l
    };
  }
  getPointOnEllipticalArc(e, r, t, i, a, s) {
    var o = Math.cos(s), u = Math.sin(s), l = {
      x: t * Math.cos(a),
      y: i * Math.sin(a)
    };
    return {
      x: e + (l.x * o - l.y * u),
      y: r + (l.x * u + l.y * o)
    };
  }
  // TODO need some optimisations. possibly build cache only for curved segments?
  buildEquidistantCache(e, r) {
    var t = this.getPathLength(), i = r || 0.25, a = e || t / 100;
    if (!this.equidistantCache || this.equidistantCache.step !== a || this.equidistantCache.precision !== i) {
      this.equidistantCache = {
        step: a,
        precision: i,
        points: []
      };
      for (var s = 0, o = 0; o <= t; o += i) {
        var u = this.getPointOnPath(o), l = this.getPointOnPath(o + i);
        !u || !l || (s += this.getLineLength(u.x, u.y, l.x, l.y), s >= a && (this.equidistantCache.points.push({
          x: u.x,
          y: u.y,
          distance: o
        }), s -= a));
      }
    }
  }
  getEquidistantPointOnPath(e, r, t) {
    if (this.buildEquidistantCache(r, t), e < 0 || e - this.getPathLength() > 5e-5)
      return null;
    var i = Math.round(e / this.getPathLength() * (this.equidistantCache.points.length - 1));
    return this.equidistantCache.points[i] || null;
  }
}
var xc = /^\s*data:(([^/,;]+\/[^/,;]+)(?:;([^,;=]+=[^,;=]+))?)?(?:;(base64))?,(.*)$/i;
class Oc extends tr {
  constructor(e, r, t) {
    super(e, r, t), this.type = "image", this.loaded = !1;
    var i = this.getHrefAttribute().getString();
    if (i) {
      var a = i.endsWith(".svg") || /^\s*data:image\/svg\+xml/i.test(i);
      e.images.push(this), a ? this.loadSvg(i) : this.loadImage(i), this.isSvg = a;
    }
  }
  loadImage(e) {
    var r = this;
    return Fe(function* () {
      try {
        var t = yield r.document.createImage(e);
        r.image = t;
      } catch (i) {
        console.error('Error while loading image "'.concat(e, '":'), i);
      }
      r.loaded = !0;
    })();
  }
  loadSvg(e) {
    var r = this;
    return Fe(function* () {
      var t = xc.exec(e);
      if (t) {
        var i = t[5];
        t[4] === "base64" ? r.image = atob(i) : r.image = decodeURIComponent(i);
      } else
        try {
          var a = yield r.document.fetch(e), s = yield a.text();
          r.image = s;
        } catch (o) {
          console.error('Error while loading image "'.concat(e, '":'), o);
        }
      r.loaded = !0;
    })();
  }
  renderChildren(e) {
    var {
      document: r,
      image: t,
      loaded: i
    } = this, a = this.getAttribute("x").getPixels("x"), s = this.getAttribute("y").getPixels("y"), o = this.getStyle("width").getPixels("x"), u = this.getStyle("height").getPixels("y");
    if (!(!i || !t || !o || !u)) {
      if (e.save(), e.translate(a, s), this.isSvg) {
        var l = r.canvg.forkString(e, this.image, {
          ignoreMouse: !0,
          ignoreAnimation: !0,
          ignoreDimensions: !0,
          ignoreClear: !0,
          offsetX: 0,
          offsetY: 0,
          scaleWidth: o,
          scaleHeight: u
        });
        l.document.documentElement.parent = this, l.render();
      } else {
        var h = this.image;
        r.setViewBox({
          ctx: e,
          aspectRatio: this.getAttribute("preserveAspectRatio").getString(),
          width: o,
          desiredWidth: h.width,
          height: u,
          desiredHeight: h.height
        }), this.loaded && (typeof h.complete == "undefined" || h.complete) && e.drawImage(h, 0, 0);
      }
      e.restore();
    }
  }
  getBoundingBox() {
    var e = this.getAttribute("x").getPixels("x"), r = this.getAttribute("y").getPixels("y"), t = this.getStyle("width").getPixels("x"), i = this.getStyle("height").getPixels("y");
    return new Ne(e, r, e + t, r + i);
  }
}
class Tc extends tr {
  constructor() {
    super(...arguments), this.type = "symbol";
  }
  render(e) {
  }
}
class Sc {
  constructor(e) {
    this.document = e, this.loaded = !1, e.fonts.push(this);
  }
  load(e, r) {
    var t = this;
    return Fe(function* () {
      try {
        var {
          document: i
        } = t, a = yield i.canvg.parser.load(r), s = a.getElementsByTagName("font");
        Array.from(s).forEach((o) => {
          var u = i.createElement(o);
          i.definitions[e] = u;
        });
      } catch (o) {
        console.error('Error while loading font "'.concat(r, '":'), o);
      }
      t.loaded = !0;
    })();
  }
}
class Fl extends X {
  constructor(e, r, t) {
    super(e, r, t), this.type = "style";
    var i = sr(
      Array.from(r.childNodes).map((s) => s.textContent).join("").replace(/(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)|(^[\s]*\/\/.*)/gm, "").replace(/@import.*;/g, "")
      // remove imports
    ), a = i.split("}");
    a.forEach((s) => {
      var o = s.trim();
      if (o) {
        var u = o.split("{"), l = u[0].split(","), h = u[1].split(";");
        l.forEach((c) => {
          var v = c.trim();
          if (v) {
            var f = e.styles[v] || {};
            if (h.forEach((p) => {
              var m = p.indexOf(":"), x = p.substr(0, m).trim(), y = p.substr(m + 1, p.length - m).trim();
              x && y && (f[x] = new q(e, x, y));
            }), e.styles[v] = f, e.stylesSpecificity[v] = Lf(v), v === "@font-face") {
              var g = f["font-family"].getString().replace(/"|'/g, ""), d = f.src.getString().split(",");
              d.forEach((p) => {
                if (p.indexOf('format("svg")') > 0) {
                  var m = _l(p);
                  m && new Sc(e).load(g, m);
                }
              });
            }
          }
        });
      }
    });
  }
}
Fl.parseExternalUrl = _l;
class Ec extends tr {
  constructor() {
    super(...arguments), this.type = "use";
  }
  setContext(e) {
    super.setContext(e);
    var r = this.getAttribute("x"), t = this.getAttribute("y");
    r.hasValue() && e.translate(r.getPixels("x"), 0), t.hasValue() && e.translate(0, t.getPixels("y"));
  }
  path(e) {
    var {
      element: r
    } = this;
    r && r.path(e);
  }
  renderChildren(e) {
    var {
      document: r,
      element: t
    } = this;
    if (t) {
      var i = t;
      if (t.type === "symbol" && (i = new Or(r, null), i.attributes.viewBox = new q(r, "viewBox", t.getAttribute("viewBox").getString()), i.attributes.preserveAspectRatio = new q(r, "preserveAspectRatio", t.getAttribute("preserveAspectRatio").getString()), i.attributes.overflow = new q(r, "overflow", t.getAttribute("overflow").getString()), i.children = t.children, t.styles.opacity = new q(r, "opacity", this.calculateOpacity())), i.type === "svg") {
        var a = this.getStyle("width", !1, !0), s = this.getStyle("height", !1, !0);
        a.hasValue() && (i.attributes.width = new q(r, "width", a.getString())), s.hasValue() && (i.attributes.height = new q(r, "height", s.getString()));
      }
      var o = i.parent;
      i.parent = this, i.render(e), i.parent = o;
    }
  }
  getBoundingBox(e) {
    var {
      element: r
    } = this;
    return r ? r.getBoundingBox(e) : null;
  }
  elementTransform() {
    var {
      document: e,
      element: r
    } = this;
    return Qe.fromElement(e, r);
  }
  get element() {
    return this.cachedElement || (this.cachedElement = this.getHrefAttribute().getDefinition()), this.cachedElement;
  }
}
function wr(n, e, r, t, i, a) {
  return n[r * t * 4 + e * 4 + a];
}
function Pr(n, e, r, t, i, a, s) {
  n[r * t * 4 + e * 4 + a] = s;
}
function ae(n, e, r) {
  var t = n[e];
  return t * r;
}
function Be(n, e, r, t) {
  return e + Math.cos(n) * r + Math.sin(n) * t;
}
class Ul extends X {
  constructor(e, r, t) {
    super(e, r, t), this.type = "feColorMatrix";
    var i = de(this.getAttribute("values").getString());
    switch (this.getAttribute("type").getString("matrix")) {
      // http://www.w3.org/TR/SVG/filters.html#feColorMatrixElement
      case "saturate": {
        var a = i[0];
        i = [0.213 + 0.787 * a, 0.715 - 0.715 * a, 0.072 - 0.072 * a, 0, 0, 0.213 - 0.213 * a, 0.715 + 0.285 * a, 0.072 - 0.072 * a, 0, 0, 0.213 - 0.213 * a, 0.715 - 0.715 * a, 0.072 + 0.928 * a, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1];
        break;
      }
      case "hueRotate": {
        var s = i[0] * Math.PI / 180;
        i = [Be(s, 0.213, 0.787, -0.213), Be(s, 0.715, -0.715, -0.715), Be(s, 0.072, -0.072, 0.928), 0, 0, Be(s, 0.213, -0.213, 0.143), Be(s, 0.715, 0.285, 0.14), Be(s, 0.072, -0.072, -0.283), 0, 0, Be(s, 0.213, -0.213, -0.787), Be(s, 0.715, -0.715, 0.715), Be(s, 0.072, 0.928, 0.072), 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1];
        break;
      }
      case "luminanceToAlpha":
        i = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2125, 0.7154, 0.0721, 0, 0, 0, 0, 0, 0, 1];
        break;
    }
    this.matrix = i, this.includeOpacity = this.getAttribute("includeOpacity").hasValue();
  }
  apply(e, r, t, i, a) {
    for (var {
      includeOpacity: s,
      matrix: o
    } = this, u = e.getImageData(0, 0, i, a), l = 0; l < a; l++)
      for (var h = 0; h < i; h++) {
        var c = wr(u.data, h, l, i, a, 0), v = wr(u.data, h, l, i, a, 1), f = wr(u.data, h, l, i, a, 2), g = wr(u.data, h, l, i, a, 3), d = ae(o, 0, c) + ae(o, 1, v) + ae(o, 2, f) + ae(o, 3, g) + ae(o, 4, 1), p = ae(o, 5, c) + ae(o, 6, v) + ae(o, 7, f) + ae(o, 8, g) + ae(o, 9, 1), m = ae(o, 10, c) + ae(o, 11, v) + ae(o, 12, f) + ae(o, 13, g) + ae(o, 14, 1), x = ae(o, 15, c) + ae(o, 16, v) + ae(o, 17, f) + ae(o, 18, g) + ae(o, 19, 1);
        s && (d = 0, p = 0, m = 0, x *= g / 255), Pr(u.data, h, l, i, a, 0, d), Pr(u.data, h, l, i, a, 1, p), Pr(u.data, h, l, i, a, 2, m), Pr(u.data, h, l, i, a, 3, x);
      }
    e.clearRect(0, 0, i, a), e.putImageData(u, 0, 0);
  }
}
class Hr extends X {
  constructor() {
    super(...arguments), this.type = "mask";
  }
  apply(e, r) {
    var {
      document: t
    } = this, i = this.getAttribute("x").getPixels("x"), a = this.getAttribute("y").getPixels("y"), s = this.getStyle("width").getPixels("x"), o = this.getStyle("height").getPixels("y");
    if (!s && !o) {
      var u = new Ne();
      this.children.forEach((g) => {
        u.addBoundingBox(g.getBoundingBox(e));
      }), i = Math.floor(u.x1), a = Math.floor(u.y1), s = Math.floor(u.width), o = Math.floor(u.height);
    }
    var l = this.removeStyles(r, Hr.ignoreStyles), h = t.createCanvas(i + s, a + o), c = h.getContext("2d");
    t.screen.setDefaults(c), this.renderChildren(c), new Ul(t, {
      nodeType: 1,
      childNodes: [],
      attributes: [{
        nodeName: "type",
        value: "luminanceToAlpha"
      }, {
        nodeName: "includeOpacity",
        value: "true"
      }]
    }).apply(c, 0, 0, i + s, a + o);
    var v = t.createCanvas(i + s, a + o), f = v.getContext("2d");
    t.screen.setDefaults(f), r.render(f), f.globalCompositeOperation = "destination-in", f.fillStyle = c.createPattern(h, "no-repeat"), f.fillRect(0, 0, i + s, a + o), e.fillStyle = f.createPattern(v, "no-repeat"), e.fillRect(0, 0, i + s, a + o), this.restoreStyles(r, l);
  }
  render(e) {
  }
}
Hr.ignoreStyles = ["mask", "transform", "clip-path"];
var Xu = () => {
};
class Rc extends X {
  constructor() {
    super(...arguments), this.type = "clipPath";
  }
  apply(e) {
    var {
      document: r
    } = this, t = Reflect.getPrototypeOf(e), {
      beginPath: i,
      closePath: a
    } = e;
    t && (t.beginPath = Xu, t.closePath = Xu), Reflect.apply(i, e, []), this.children.forEach((s) => {
      if (typeof s.path != "undefined") {
        var o = typeof s.elementTransform != "undefined" ? s.elementTransform() : null;
        o || (o = Qe.fromElement(r, s)), o && o.apply(e), s.path(e), t && (t.closePath = a), o && o.unapply(e);
      }
    }), Reflect.apply(a, e, []), e.clip(), t && (t.beginPath = i, t.closePath = a);
  }
  render(e) {
  }
}
class zr extends X {
  constructor() {
    super(...arguments), this.type = "filter";
  }
  apply(e, r) {
    var {
      document: t,
      children: i
    } = this, a = r.getBoundingBox(e);
    if (a) {
      var s = 0, o = 0;
      i.forEach((m) => {
        var x = m.extraFilterDistance || 0;
        s = Math.max(s, x), o = Math.max(o, x);
      });
      var u = Math.floor(a.width), l = Math.floor(a.height), h = u + 2 * s, c = l + 2 * o;
      if (!(h < 1 || c < 1)) {
        var v = Math.floor(a.x), f = Math.floor(a.y), g = this.removeStyles(r, zr.ignoreStyles), d = t.createCanvas(h, c), p = d.getContext("2d");
        t.screen.setDefaults(p), p.translate(-v + s, -f + o), r.render(p), i.forEach((m) => {
          typeof m.apply == "function" && m.apply(p, 0, 0, h, c);
        }), e.drawImage(d, 0, 0, h, c, v - s, f - o, h, c), this.restoreStyles(r, g);
      }
    }
  }
  render(e) {
  }
}
zr.ignoreStyles = ["filter", "transform", "clip-path"];
class Cc extends X {
  constructor(e, r, t) {
    super(e, r, t), this.type = "feDropShadow", this.addStylesFromStyleDefinition();
  }
  apply(e, r, t, i, a) {
  }
}
class wc extends X {
  constructor() {
    super(...arguments), this.type = "feMorphology";
  }
  apply(e, r, t, i, a) {
  }
}
class Pc extends X {
  constructor() {
    super(...arguments), this.type = "feComposite";
  }
  apply(e, r, t, i, a) {
  }
}
class Ac extends X {
  constructor(e, r, t) {
    super(e, r, t), this.type = "feGaussianBlur", this.blurRadius = Math.floor(this.getAttribute("stdDeviation").getNumber()), this.extraFilterDistance = this.blurRadius;
  }
  apply(e, r, t, i, a) {
    var {
      document: s,
      blurRadius: o
    } = this, u = s.window ? s.window.document.body : null, l = e.canvas;
    l.id = s.getUniqueId(), u && (l.style.display = "none", u.appendChild(l)), Tf(l, r, t, i, a, o), u && u.removeChild(l);
  }
}
class Ic extends X {
  constructor() {
    super(...arguments), this.type = "title";
  }
}
class Nc extends X {
  constructor() {
    super(...arguments), this.type = "desc";
  }
}
var _c = {
  svg: Or,
  rect: Ll,
  circle: tc,
  ellipse: ic,
  line: ac,
  polyline: jl,
  polygon: nc,
  path: W,
  pattern: sc,
  marker: oc,
  defs: uc,
  linearGradient: lc,
  radialGradient: hc,
  stop: fc,
  animate: on,
  animateColor: cc,
  animateTransform: vc,
  font: gc,
  "font-face": dc,
  "missing-glyph": pc,
  glyph: kl,
  text: ze,
  tspan: $r,
  tref: yc,
  a: mc,
  textPath: bc,
  image: Oc,
  g: sn,
  symbol: Tc,
  style: Fl,
  use: Ec,
  mask: Hr,
  clipPath: Rc,
  filter: zr,
  feDropShadow: Cc,
  feMorphology: wc,
  feComposite: Pc,
  feColorMatrix: Ul,
  feGaussianBlur: Ac,
  title: Ic,
  desc: Nc
};
function Ku(n, e) {
  var r = Object.keys(n);
  if (Object.getOwnPropertySymbols) {
    var t = Object.getOwnPropertySymbols(n);
    e && (t = t.filter(function(i) {
      return Object.getOwnPropertyDescriptor(n, i).enumerable;
    })), r.push.apply(r, t);
  }
  return r;
}
function Mc(n) {
  for (var e = 1; e < arguments.length; e++) {
    var r = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Ku(Object(r), !0).forEach(function(t) {
      nn(n, t, r[t]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(n, Object.getOwnPropertyDescriptors(r)) : Ku(Object(r)).forEach(function(t) {
      Object.defineProperty(n, t, Object.getOwnPropertyDescriptor(r, t));
    });
  }
  return n;
}
function qc(n, e) {
  var r = document.createElement("canvas");
  return r.width = n, r.height = e, r;
}
function Dc(n) {
  return La.apply(this, arguments);
}
function La() {
  return La = Fe(function* (n) {
    var e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, r = document.createElement("img");
    return e && (r.crossOrigin = "Anonymous"), new Promise((t, i) => {
      r.onload = () => {
        t(r);
      }, r.onerror = (a, s, o, u, l) => {
        i(l);
      }, r.src = n;
    });
  }), La.apply(this, arguments);
}
class He {
  constructor(e) {
    var {
      rootEmSize: r = 12,
      emSize: t = 12,
      createCanvas: i = He.createCanvas,
      createImage: a = He.createImage,
      anonymousCrossOrigin: s
    } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    this.canvg = e, this.definitions = /* @__PURE__ */ Object.create(null), this.styles = /* @__PURE__ */ Object.create(null), this.stylesSpecificity = /* @__PURE__ */ Object.create(null), this.images = [], this.fonts = [], this.emSizeStack = [], this.uniqueId = 0, this.screen = e.screen, this.rootEmSize = r, this.emSize = t, this.createCanvas = i, this.createImage = this.bindCreateImage(a, s), this.screen.wait(this.isImagesLoaded.bind(this)), this.screen.wait(this.isFontsLoaded.bind(this));
  }
  bindCreateImage(e, r) {
    return typeof r == "boolean" ? (t, i) => e(t, typeof i == "boolean" ? i : r) : e;
  }
  get window() {
    return this.screen.window;
  }
  get fetch() {
    return this.screen.fetch;
  }
  get ctx() {
    return this.screen.ctx;
  }
  get emSize() {
    var {
      emSizeStack: e
    } = this;
    return e[e.length - 1];
  }
  set emSize(e) {
    var {
      emSizeStack: r
    } = this;
    r.push(e);
  }
  popEmSize() {
    var {
      emSizeStack: e
    } = this;
    e.pop();
  }
  getUniqueId() {
    return "canvg".concat(++this.uniqueId);
  }
  isImagesLoaded() {
    return this.images.every((e) => e.loaded);
  }
  isFontsLoaded() {
    return this.fonts.every((e) => e.loaded);
  }
  createDocumentElement(e) {
    var r = this.createElement(e.documentElement);
    return r.root = !0, r.addStylesFromStyleDefinition(), this.documentElement = r, r;
  }
  createElement(e) {
    var r = e.nodeName.replace(/^[^:]+:/, ""), t = He.elementTypes[r];
    return typeof t != "undefined" ? new t(this, e) : new Kf(this, e);
  }
  createTextNode(e) {
    return new rc(this, e);
  }
  setViewBox(e) {
    this.screen.setViewBox(Mc({
      document: this
    }, e));
  }
}
He.createCanvas = qc;
He.createImage = Dc;
He.elementTypes = _c;
function Qu(n, e) {
  var r = Object.keys(n);
  if (Object.getOwnPropertySymbols) {
    var t = Object.getOwnPropertySymbols(n);
    e && (t = t.filter(function(i) {
      return Object.getOwnPropertyDescriptor(n, i).enumerable;
    })), r.push.apply(r, t);
  }
  return r;
}
function Xe(n) {
  for (var e = 1; e < arguments.length; e++) {
    var r = arguments[e] != null ? arguments[e] : {};
    e % 2 ? Qu(Object(r), !0).forEach(function(t) {
      nn(n, t, r[t]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(n, Object.getOwnPropertyDescriptors(r)) : Qu(Object(r)).forEach(function(t) {
      Object.defineProperty(n, t, Object.getOwnPropertyDescriptor(r, t));
    });
  }
  return n;
}
class vr {
  /**
   * Main constructor.
   * @param ctx - Rendering context.
   * @param svg - SVG Document.
   * @param options - Rendering options.
   */
  constructor(e, r) {
    var t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    this.parser = new _a(t), this.screen = new Gr(e, t), this.options = t;
    var i = new He(this, t), a = i.createDocumentElement(r);
    this.document = i, this.documentElement = a;
  }
  /**
   * Create Canvg instance from SVG source string or URL.
   * @param ctx - Rendering context.
   * @param svg - SVG source string or URL.
   * @param options - Rendering options.
   * @returns Canvg instance.
   */
  static from(e, r) {
    var t = arguments;
    return Fe(function* () {
      var i = t.length > 2 && t[2] !== void 0 ? t[2] : {}, a = new _a(i), s = yield a.parse(r);
      return new vr(e, s, i);
    })();
  }
  /**
   * Create Canvg instance from SVG source string.
   * @param ctx - Rendering context.
   * @param svg - SVG source string.
   * @param options - Rendering options.
   * @returns Canvg instance.
   */
  static fromString(e, r) {
    var t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, i = new _a(t), a = i.parseFromString(r);
    return new vr(e, a, t);
  }
  /**
   * Create new Canvg instance with inherited options.
   * @param ctx - Rendering context.
   * @param svg - SVG source string or URL.
   * @param options - Rendering options.
   * @returns Canvg instance.
   */
  fork(e, r) {
    var t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    return vr.from(e, r, Xe(Xe({}, this.options), t));
  }
  /**
   * Create new Canvg instance with inherited options.
   * @param ctx - Rendering context.
   * @param svg - SVG source string.
   * @param options - Rendering options.
   * @returns Canvg instance.
   */
  forkString(e, r) {
    var t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    return vr.fromString(e, r, Xe(Xe({}, this.options), t));
  }
  /**
   * Document is ready promise.
   * @returns Ready promise.
   */
  ready() {
    return this.screen.ready();
  }
  /**
   * Document is ready value.
   * @returns Is ready or not.
   */
  isReady() {
    return this.screen.isReady();
  }
  /**
   * Render only first frame, ignoring animations and mouse.
   * @param options - Rendering options.
   */
  render() {
    var e = arguments, r = this;
    return Fe(function* () {
      var t = e.length > 0 && e[0] !== void 0 ? e[0] : {};
      r.start(Xe({
        enableRedraw: !0,
        ignoreAnimation: !0,
        ignoreMouse: !0
      }, t)), yield r.ready(), r.stop();
    })();
  }
  /**
   * Start rendering.
   * @param options - Render options.
   */
  start() {
    var e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, {
      documentElement: r,
      screen: t,
      options: i
    } = this;
    t.start(r, Xe(Xe({
      enableRedraw: !0
    }, i), e));
  }
  /**
   * Stop rendering.
   */
  stop() {
    this.screen.stop();
  }
  /**
   * Resize SVG to fit in given size.
   * @param width
   * @param height
   * @param preserveAspectRatio
   */
  resize(e) {
    var r = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e, t = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !1;
    this.documentElement.resize(e, r, t);
  }
}
export {
  mc as AElement,
  cc as AnimateColorElement,
  on as AnimateElement,
  vc as AnimateTransformElement,
  Ne as BoundingBox,
  Fu as CB1,
  Uu as CB2,
  Gu as CB3,
  $u as CB4,
  vr as Canvg,
  tc as CircleElement,
  Rc as ClipPathElement,
  uc as DefsElement,
  Nc as DescElement,
  He as Document,
  X as Element,
  ic as EllipseElement,
  Ul as FeColorMatrixElement,
  Pc as FeCompositeElement,
  Cc as FeDropShadowElement,
  Ac as FeGaussianBlurElement,
  wc as FeMorphologyElement,
  zr as FilterElement,
  ue as Font,
  gc as FontElement,
  dc as FontFaceElement,
  sn as GElement,
  kl as GlyphElement,
  Bl as GradientElement,
  Oc as ImageElement,
  ac as LineElement,
  lc as LinearGradientElement,
  oc as MarkerElement,
  Hr as MaskElement,
  Dl as Matrix,
  pc as MissingGlyphElement,
  Bf as Mouse,
  ir as PSEUDO_ZERO,
  _a as Parser,
  W as PathElement,
  U as PathParser,
  sc as PatternElement,
  ee as Point,
  nc as PolygonElement,
  jl as PolylineElement,
  q as Property,
  Hu as QB1,
  zu as QB2,
  Wu as QB3,
  hc as RadialGradientElement,
  Ll as RectElement,
  tr as RenderedElement,
  $f as Rotate,
  Or as SVGElement,
  Sc as SVGFontLoader,
  Hf as Scale,
  Gr as Screen,
  Vl as Skew,
  zf as SkewX,
  Wf as SkewY,
  fc as StopElement,
  Fl as StyleElement,
  Tc as SymbolElement,
  yc as TRefElement,
  $r as TSpanElement,
  ze as TextElement,
  bc as TextPathElement,
  Ic as TitleElement,
  Qe as Transform,
  Gf as Translate,
  Kf as UnknownElement,
  Ec as UseElement,
  jf as ViewPort,
  sr as compressSpaces,
  vr as default,
  Lf as getSelectorSpecificity,
  Af as normalizeAttributeName,
  If as normalizeColor,
  _l as parseExternalUrl,
  Lc as presets,
  de as toNumbers,
  Cf as trimLeft,
  wf as trimRight,
  ju as vectorMagnitude,
  Bu as vectorsAngle,
  ka as vectorsRatio
};
//# sourceMappingURL=index.es-mJZV2KGW.js.map
