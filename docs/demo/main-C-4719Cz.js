var Ya = Object.defineProperty, Wa = Object.defineProperties;
var za = Object.getOwnPropertyDescriptors;
var us = Object.getOwnPropertySymbols;
var Xi = Object.prototype.hasOwnProperty, Gi = Object.prototype.propertyIsEnumerable;
var L = Math.pow, Ui = (a, t, e) => t in a ? Ya(a, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : a[t] = e, J = (a, t) => {
  for (var e in t || (t = {}))
    Xi.call(t, e) && Ui(a, e, t[e]);
  if (us)
    for (var e of us(t))
      Gi.call(t, e) && Ui(a, e, t[e]);
  return a;
}, Zi = (a, t) => Wa(a, za(t));
var gs = (a, t) => {
  var e = {};
  for (var s in a)
    Xi.call(a, s) && t.indexOf(s) < 0 && (e[s] = a[s]);
  if (a != null && us)
    for (var s of us(a))
      t.indexOf(s) < 0 && Gi.call(a, s) && (e[s] = a[s]);
  return e;
};
var R = (a, t, e) => new Promise((s, r) => {
  var i = (h) => {
    try {
      o(e.next(h));
    } catch (l) {
      r(l);
    }
  }, n = (h) => {
    try {
      o(e.throw(h));
    } catch (l) {
      r(l);
    }
  }, o = (h) => h.done ? s(h.value) : Promise.resolve(h.value).then(i, n);
  o((e = e.apply(a, t)).next());
});
function b(a, t, e) {
  return (t = function(s) {
    var r = function(i, n) {
      if (typeof i != "object" || !i) return i;
      var o = i[Symbol.toPrimitive];
      if (o !== void 0) {
        var h = o.call(i, n);
        if (typeof h != "object") return h;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (n === "string" ? String : Number)(i);
    }(s, "string");
    return typeof r == "symbol" ? r : r + "";
  }(t)) in a ? Object.defineProperty(a, t, { value: e, enumerable: !0, configurable: !0, writable: !0 }) : a[t] = e, a;
}
function Ki(a, t) {
  var e = Object.keys(a);
  if (Object.getOwnPropertySymbols) {
    var s = Object.getOwnPropertySymbols(a);
    t && (s = s.filter(function(r) {
      return Object.getOwnPropertyDescriptor(a, r).enumerable;
    })), e.push.apply(e, s);
  }
  return e;
}
function y(a) {
  for (var t = 1; t < arguments.length; t++) {
    var e = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Ki(Object(e), !0).forEach(function(s) {
      b(a, s, e[s]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(a, Object.getOwnPropertyDescriptors(e)) : Ki(Object(e)).forEach(function(s) {
      Object.defineProperty(a, s, Object.getOwnPropertyDescriptor(e, s));
    });
  }
  return a;
}
function H(a, t) {
  if (a == null) return {};
  var e, s, r = function(n, o) {
    if (n == null) return {};
    var h = {};
    for (var l in n) if ({}.hasOwnProperty.call(n, l)) {
      if (o.indexOf(l) >= 0) continue;
      h[l] = n[l];
    }
    return h;
  }(a, t);
  if (Object.getOwnPropertySymbols) {
    var i = Object.getOwnPropertySymbols(a);
    for (s = 0; s < i.length; s++) e = i[s], t.indexOf(e) >= 0 || {}.propertyIsEnumerable.call(a, e) && (r[e] = a[e]);
  }
  return r;
}
function ie(a, t) {
  return t || (t = a.slice(0)), Object.freeze(Object.defineProperties(a, { raw: { value: Object.freeze(t) } }));
}
class qi {
  constructor() {
    b(this, "browserShadowBlurConstant", 1), b(this, "DPI", 96), b(this, "devicePixelRatio", typeof window != "undefined" ? window.devicePixelRatio : 1), b(this, "perfLimitSizeTotal", 2097152), b(this, "maxCacheSideLimit", 4096), b(this, "minCacheSideLimit", 256), b(this, "disableStyleCopyPaste", !1), b(this, "enableGLFiltering", !0), b(this, "textureSize", 4096), b(this, "forceGLPutImageData", !1), b(this, "cachesBoundsOfCurve", !1), b(this, "fontPaths", {}), b(this, "NUM_FRACTION_DIGITS", 4);
  }
}
const N = new class extends qi {
  constructor(a) {
    super(), this.configure(a);
  }
  configure() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    Object.assign(this, a);
  }
  addFonts() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    this.fontPaths = y(y({}, this.fontPaths), a);
  }
  removeFonts() {
    (arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : []).forEach((a) => {
      delete this.fontPaths[a];
    });
  }
  clearFonts() {
    this.fontPaths = {};
  }
  restoreDefaults(a) {
    const t = new qi(), e = (a == null ? void 0 : a.reduce((s, r) => (s[r] = t[r], s), {})) || t;
    this.configure(e);
  }
}(), Xt = function(a) {
  for (var t = arguments.length, e = new Array(t > 1 ? t - 1 : 0), s = 1; s < t; s++) e[s - 1] = arguments[s];
  return console[a]("fabric", ...e);
};
class It extends Error {
  constructor(t, e) {
    super("fabric: ".concat(t), e);
  }
}
class di extends It {
  constructor(t) {
    super("".concat(t, " 'options.signal' is in 'aborted' state"));
  }
}
class Ha {
}
class Va extends Ha {
  testPrecision(t, e) {
    const s = "precision ".concat(e, ` float;
void main(){}`), r = t.createShader(t.FRAGMENT_SHADER);
    return !!r && (t.shaderSource(r, s), t.compileShader(r), !!t.getShaderParameter(r, t.COMPILE_STATUS));
  }
  queryWebGL(t) {
    const e = t.getContext("webgl");
    e && (this.maxTextureSize = e.getParameter(e.MAX_TEXTURE_SIZE), this.GLPrecision = ["highp", "mediump", "lowp"].find((s) => this.testPrecision(e, s)), e.getExtension("WEBGL_lose_context").loseContext(), Xt("log", "WebGL: max texture size ".concat(this.maxTextureSize)));
  }
  isSupported(t) {
    return !!this.maxTextureSize && this.maxTextureSize >= t;
  }
}
const Ua = {};
let Qi;
const Pt = () => Qi || (Qi = { document, window, isTouchSupported: "ontouchstart" in window || "ontouchstart" in document || window && window.navigator && window.navigator.maxTouchPoints > 0, WebGLProbe: new Va(), dispose() {
}, copyPasteData: Ua }), Fe = () => Pt().document, hr = () => Pt().window, Rn = () => {
  var a;
  return Math.max((a = N.devicePixelRatio) !== null && a !== void 0 ? a : hr().devicePixelRatio, 1);
}, Ze = new class {
  constructor() {
    b(this, "charWidthsCache", {}), b(this, "boundsOfCurveCache", {});
  }
  getFontCache(a) {
    let { fontFamily: t, fontStyle: e, fontWeight: s } = a;
    t = t.toLowerCase(), this.charWidthsCache[t] || (this.charWidthsCache[t] = {});
    const r = this.charWidthsCache[t], i = "".concat(e.toLowerCase(), "_").concat((s + "").toLowerCase());
    return r[i] || (r[i] = {}), r[i];
  }
  clearFontCache(a) {
    (a = (a || "").toLowerCase()) ? this.charWidthsCache[a] && delete this.charWidthsCache[a] : this.charWidthsCache = {};
  }
  limitDimsByArea(a) {
    const { perfLimitSizeTotal: t } = N, e = Math.sqrt(t * a);
    return [Math.floor(e), Math.floor(t / e)];
  }
}(), Hr = "6.5.3";
function ve() {
}
const ee = Math.PI / 2, Gt = 2 * Math.PI, fi = Math.PI / 180, lt = Object.freeze([1, 0, 0, 1, 0, 0]), pi = 16, $t = 0.4477152502, P = "center", B = "left", dt = "top", Vr = "bottom", Z = "right", at = "none", mi = /\r?\n/, Bn = "moving", lr = "scaling", Yn = "rotating", vi = "rotate", Wn = "skewing", ts = "resizing", zn = "modifyPoly", Xa = "modifyPath", zs = "changed", cr = "scale", ct = "scaleX", vt = "scaleY", Ne = "skewX", Re = "skewY", Q = "fill", ht = "stroke", Hs = "modified", Se = "json", Mr = "svg", D = new class {
  constructor() {
    this[Se] = /* @__PURE__ */ new Map(), this[Mr] = /* @__PURE__ */ new Map();
  }
  has(a) {
    return this[Se].has(a);
  }
  getClass(a) {
    const t = this[Se].get(a);
    if (!t) throw new It("No class registered for ".concat(a));
    return t;
  }
  setClass(a, t) {
    t ? this[Se].set(t, a) : (this[Se].set(a.type, a), this[Se].set(a.type.toLowerCase(), a));
  }
  getSVGClass(a) {
    return this[Mr].get(a);
  }
  setSVGClass(a, t) {
    this[Mr].set(t != null ? t : a.type.toLowerCase(), a);
  }
}(), Vs = new class extends Array {
  remove(a) {
    const t = this.indexOf(a);
    t > -1 && this.splice(t, 1);
  }
  cancelAll() {
    const a = this.splice(0);
    return a.forEach((t) => t.abort()), a;
  }
  cancelByCanvas(a) {
    if (!a) return [];
    const t = this.filter((e) => {
      var s;
      return e.target === a || typeof e.target == "object" && ((s = e.target) === null || s === void 0 ? void 0 : s.canvas) === a;
    });
    return t.forEach((e) => e.abort()), t;
  }
  cancelByTarget(a) {
    if (!a) return [];
    const t = this.filter((e) => e.target === a);
    return t.forEach((e) => e.abort()), t;
  }
}();
class Ga {
  constructor() {
    b(this, "__eventListeners", {});
  }
  on(t, e) {
    if (this.__eventListeners || (this.__eventListeners = {}), typeof t == "object") return Object.entries(t).forEach((s) => {
      let [r, i] = s;
      this.on(r, i);
    }), () => this.off(t);
    if (e) {
      const s = t;
      return this.__eventListeners[s] || (this.__eventListeners[s] = []), this.__eventListeners[s].push(e), () => this.off(s, e);
    }
    return () => !1;
  }
  once(t, e) {
    if (typeof t == "object") {
      const s = [];
      return Object.entries(t).forEach((r) => {
        let [i, n] = r;
        s.push(this.once(i, n));
      }), () => s.forEach((r) => r());
    }
    if (e) {
      const s = this.on(t, function() {
        for (var r = arguments.length, i = new Array(r), n = 0; n < r; n++) i[n] = arguments[n];
        e.call(this, ...i), s();
      });
      return s;
    }
    return () => !1;
  }
  _removeEventListener(t, e) {
    if (this.__eventListeners[t]) if (e) {
      const s = this.__eventListeners[t], r = s.indexOf(e);
      r > -1 && s.splice(r, 1);
    } else this.__eventListeners[t] = [];
  }
  off(t, e) {
    if (this.__eventListeners) if (t === void 0) for (const s in this.__eventListeners) this._removeEventListener(s);
    else typeof t == "object" ? Object.entries(t).forEach((s) => {
      let [r, i] = s;
      this._removeEventListener(r, i);
    }) : this._removeEventListener(t, e);
  }
  fire(t, e) {
    var s;
    if (!this.__eventListeners) return;
    const r = (s = this.__eventListeners[t]) === null || s === void 0 ? void 0 : s.concat();
    if (r) for (let i = 0; i < r.length; i++) r[i].call(this, e || {});
  }
}
const he = (a, t) => {
  const e = a.indexOf(t);
  return e !== -1 && a.splice(e, 1), a;
}, Ot = (a) => {
  if (a === 0) return 1;
  switch (Math.abs(a) / ee) {
    case 1:
    case 3:
      return 0;
    case 2:
      return -1;
  }
  return Math.cos(a);
}, jt = (a) => {
  if (a === 0) return 0;
  const t = a / ee, e = Math.sign(a);
  switch (t) {
    case 1:
      return e;
    case 2:
      return 0;
    case 3:
      return -e;
  }
  return Math.sin(a);
};
class _ {
  constructor() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0, e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
    typeof t == "object" ? (this.x = t.x, this.y = t.y) : (this.x = t, this.y = e);
  }
  add(t) {
    return new _(this.x + t.x, this.y + t.y);
  }
  addEquals(t) {
    return this.x += t.x, this.y += t.y, this;
  }
  scalarAdd(t) {
    return new _(this.x + t, this.y + t);
  }
  scalarAddEquals(t) {
    return this.x += t, this.y += t, this;
  }
  subtract(t) {
    return new _(this.x - t.x, this.y - t.y);
  }
  subtractEquals(t) {
    return this.x -= t.x, this.y -= t.y, this;
  }
  scalarSubtract(t) {
    return new _(this.x - t, this.y - t);
  }
  scalarSubtractEquals(t) {
    return this.x -= t, this.y -= t, this;
  }
  multiply(t) {
    return new _(this.x * t.x, this.y * t.y);
  }
  scalarMultiply(t) {
    return new _(this.x * t, this.y * t);
  }
  scalarMultiplyEquals(t) {
    return this.x *= t, this.y *= t, this;
  }
  divide(t) {
    return new _(this.x / t.x, this.y / t.y);
  }
  scalarDivide(t) {
    return new _(this.x / t, this.y / t);
  }
  scalarDivideEquals(t) {
    return this.x /= t, this.y /= t, this;
  }
  eq(t) {
    return this.x === t.x && this.y === t.y;
  }
  lt(t) {
    return this.x < t.x && this.y < t.y;
  }
  lte(t) {
    return this.x <= t.x && this.y <= t.y;
  }
  gt(t) {
    return this.x > t.x && this.y > t.y;
  }
  gte(t) {
    return this.x >= t.x && this.y >= t.y;
  }
  lerp(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0.5;
    return e = Math.max(Math.min(1, e), 0), new _(this.x + (t.x - this.x) * e, this.y + (t.y - this.y) * e);
  }
  distanceFrom(t) {
    const e = this.x - t.x, s = this.y - t.y;
    return Math.sqrt(e * e + s * s);
  }
  midPointFrom(t) {
    return this.lerp(t);
  }
  min(t) {
    return new _(Math.min(this.x, t.x), Math.min(this.y, t.y));
  }
  max(t) {
    return new _(Math.max(this.x, t.x), Math.max(this.y, t.y));
  }
  toString() {
    return "".concat(this.x, ",").concat(this.y);
  }
  setXY(t, e) {
    return this.x = t, this.y = e, this;
  }
  setX(t) {
    return this.x = t, this;
  }
  setY(t) {
    return this.y = t, this;
  }
  setFromPoint(t) {
    return this.x = t.x, this.y = t.y, this;
  }
  swap(t) {
    const e = this.x, s = this.y;
    this.x = t.x, this.y = t.y, t.x = e, t.y = s;
  }
  clone() {
    return new _(this.x, this.y);
  }
  rotate(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : yi;
    const s = jt(t), r = Ot(t), i = this.subtract(e);
    return new _(i.x * r - i.y * s, i.x * s + i.y * r).add(e);
  }
  transform(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 && arguments[1];
    return new _(t[0] * this.x + t[2] * this.y + (e ? 0 : t[4]), t[1] * this.x + t[3] * this.y + (e ? 0 : t[5]));
  }
}
const yi = new _(0, 0), Rs = (a) => !!a && Array.isArray(a._objects);
function Hn(a) {
  class t extends a {
    constructor() {
      super(...arguments), b(this, "_objects", []);
    }
    _onObjectAdded(s) {
    }
    _onObjectRemoved(s) {
    }
    _onStackOrderChanged(s) {
    }
    add() {
      for (var s = arguments.length, r = new Array(s), i = 0; i < s; i++) r[i] = arguments[i];
      const n = this._objects.push(...r);
      return r.forEach((o) => this._onObjectAdded(o)), n;
    }
    insertAt(s) {
      for (var r = arguments.length, i = new Array(r > 1 ? r - 1 : 0), n = 1; n < r; n++) i[n - 1] = arguments[n];
      return this._objects.splice(s, 0, ...i), i.forEach((o) => this._onObjectAdded(o)), this._objects.length;
    }
    remove() {
      const s = this._objects, r = [];
      for (var i = arguments.length, n = new Array(i), o = 0; o < i; o++) n[o] = arguments[o];
      return n.forEach((h) => {
        const l = s.indexOf(h);
        l !== -1 && (s.splice(l, 1), r.push(h), this._onObjectRemoved(h));
      }), r;
    }
    forEachObject(s) {
      this.getObjects().forEach((r, i, n) => s(r, i, n));
    }
    getObjects() {
      for (var s = arguments.length, r = new Array(s), i = 0; i < s; i++) r[i] = arguments[i];
      return r.length === 0 ? [...this._objects] : this._objects.filter((n) => n.isType(...r));
    }
    item(s) {
      return this._objects[s];
    }
    isEmpty() {
      return this._objects.length === 0;
    }
    size() {
      return this._objects.length;
    }
    contains(s, r) {
      return !!this._objects.includes(s) || !!r && this._objects.some((i) => i instanceof t && i.contains(s, !0));
    }
    complexity() {
      return this._objects.reduce((s, r) => s += r.complexity ? r.complexity() : 0, 0);
    }
    sendObjectToBack(s) {
      return !(!s || s === this._objects[0]) && (he(this._objects, s), this._objects.unshift(s), this._onStackOrderChanged(s), !0);
    }
    bringObjectToFront(s) {
      return !(!s || s === this._objects[this._objects.length - 1]) && (he(this._objects, s), this._objects.push(s), this._onStackOrderChanged(s), !0);
    }
    sendObjectBackwards(s, r) {
      if (!s) return !1;
      const i = this._objects.indexOf(s);
      if (i !== 0) {
        const n = this.findNewLowerIndex(s, i, r);
        return he(this._objects, s), this._objects.splice(n, 0, s), this._onStackOrderChanged(s), !0;
      }
      return !1;
    }
    bringObjectForward(s, r) {
      if (!s) return !1;
      const i = this._objects.indexOf(s);
      if (i !== this._objects.length - 1) {
        const n = this.findNewUpperIndex(s, i, r);
        return he(this._objects, s), this._objects.splice(n, 0, s), this._onStackOrderChanged(s), !0;
      }
      return !1;
    }
    moveObjectTo(s, r) {
      return s !== this._objects[r] && (he(this._objects, s), this._objects.splice(r, 0, s), this._onStackOrderChanged(s), !0);
    }
    findNewLowerIndex(s, r, i) {
      let n;
      if (i) {
        n = r;
        for (let o = r - 1; o >= 0; --o) if (s.isOverlapping(this._objects[o])) {
          n = o;
          break;
        }
      } else n = r - 1;
      return n;
    }
    findNewUpperIndex(s, r, i) {
      let n;
      if (i) {
        n = r;
        for (let o = r + 1; o < this._objects.length; ++o) if (s.isOverlapping(this._objects[o])) {
          n = o;
          break;
        }
      } else n = r + 1;
      return n;
    }
    collectObjects(s) {
      let { left: r, top: i, width: n, height: o } = s, { includeIntersecting: h = !0 } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      const l = [], c = new _(r, i), u = c.add(new _(n, o));
      for (let g = this._objects.length - 1; g >= 0; g--) {
        const d = this._objects[g];
        d.selectable && d.visible && (h && d.intersectsWithRect(c, u) || d.isContainedWithinRect(c, u) || h && d.containsPoint(c) || h && d.containsPoint(u)) && l.push(d);
      }
      return l;
    }
  }
  return t;
}
class Vn extends Ga {
  _setOptions() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    for (const e in t) this.set(e, t[e]);
  }
  _setObject(t) {
    for (const e in t) this._set(e, t[e]);
  }
  set(t, e) {
    return typeof t == "object" ? this._setObject(t) : this._set(t, e), this;
  }
  _set(t, e) {
    this[t] = e;
  }
  toggle(t) {
    const e = this.get(t);
    return typeof e == "boolean" && this.set(t, !e), this;
  }
  get(t) {
    return this[t];
  }
}
function Ke(a) {
  return hr().requestAnimationFrame(a);
}
function Un(a) {
  return hr().cancelAnimationFrame(a);
}
let Za = 0;
const se = () => Za++, _t = () => {
  const a = Fe().createElement("canvas");
  if (!a || a.getContext === void 0) throw new It("Failed to create `canvas` element");
  return a;
}, Xn = () => Fe().createElement("img"), Dt = (a) => {
  const t = _t();
  return t.width = a.width, t.height = a.height, t;
}, bi = (a, t, e) => a.toDataURL("image/".concat(t), e), X = (a) => a * fi, re = (a) => a / fi, Gn = (a) => a.every((t, e) => t === lt[e]), st = (a, t, e) => new _(a).transform(t, e), gt = (a) => {
  const t = 1 / (a[0] * a[3] - a[1] * a[2]), e = [t * a[3], -t * a[1], -t * a[2], t * a[0], 0, 0], { x: s, y: r } = new _(a[4], a[5]).transform(e, !0);
  return e[4] = -s, e[5] = -r, e;
}, U = (a, t, e) => [a[0] * t[0] + a[2] * t[1], a[1] * t[0] + a[3] * t[1], a[0] * t[2] + a[2] * t[3], a[1] * t[2] + a[3] * t[3], e ? 0 : a[0] * t[4] + a[2] * t[5] + a[4], e ? 0 : a[1] * t[4] + a[3] * t[5] + a[5]], ur = (a, t) => a.reduceRight((e, s) => s && e ? U(s, e, t) : s || e, void 0) || lt.concat(), Zn = (a) => {
  let [t, e] = a;
  return Math.atan2(e, t);
}, ye = (a) => {
  const t = Zn(a), e = Math.pow(a[0], 2) + Math.pow(a[1], 2), s = Math.sqrt(e), r = (a[0] * a[3] - a[2] * a[1]) / s, i = Math.atan2(a[0] * a[2] + a[1] * a[3], e);
  return { angle: re(t), scaleX: s, scaleY: r, skewX: re(i), skewY: 0, translateX: a[4] || 0, translateY: a[5] || 0 };
}, Be = function(a) {
  return [1, 0, 0, 1, a, arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0];
};
function Ye() {
  let { angle: a = 0 } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, { x: t = 0, y: e = 0 } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const s = X(a), r = Ot(s), i = jt(s);
  return [r, i, -i, r, t ? t - (r * t - i * e) : 0, e ? e - (i * t + r * e) : 0];
}
const gr = function(a) {
  return [a, 0, 0, arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : a, 0, 0];
}, Kn = (a) => Math.tan(X(a)), _i = (a) => [1, 0, Kn(a), 1, 0, 0], Ci = (a) => [1, Kn(a), 0, 1, 0, 0], is = (a) => {
  let { scaleX: t = 1, scaleY: e = 1, flipX: s = !1, flipY: r = !1, skewX: i = 0, skewY: n = 0 } = a, o = gr(s ? -t : t, r ? -e : e);
  return i && (o = U(o, _i(i), !0)), n && (o = U(o, Ci(n), !0)), o;
}, qn = (a) => {
  const { translateX: t = 0, translateY: e = 0, angle: s = 0 } = a;
  let r = Be(t, e);
  s && (r = U(r, Ye({ angle: s })));
  const i = is(a);
  return Gn(i) || (r = U(r, i)), r;
}, qe = function(a) {
  let { signal: t, crossOrigin: e = null } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  return new Promise(function(s, r) {
    if (t && t.aborted) return r(new di("loadImage"));
    const i = Xn();
    let n;
    t && (n = function(h) {
      i.src = "", r(h);
    }, t.addEventListener("abort", n, { once: !0 }));
    const o = function() {
      i.onload = i.onerror = null, n && (t == null || t.removeEventListener("abort", n)), s(i);
    };
    a ? (i.onload = o, i.onerror = function() {
      n && (t == null || t.removeEventListener("abort", n)), r(new It("Error loading ".concat(i.src)));
    }, e && (i.crossOrigin = e), i.src = a) : o();
  });
}, ke = function(a) {
  let { signal: t, reviver: e = ve } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  return new Promise((s, r) => {
    const i = [];
    t && t.addEventListener("abort", r, { once: !0 }), Promise.all(a.map((n) => D.getClass(n.type).fromObject(n, { signal: t }).then((o) => (e(n, o), i.push(o), o)))).then(s).catch((n) => {
      i.forEach((o) => {
        o.dispose && o.dispose();
      }), r(n);
    }).finally(() => {
      t && t.removeEventListener("abort", r);
    });
  });
}, ns = function(a) {
  let { signal: t } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  return new Promise((e, s) => {
    const r = [];
    t && t.addEventListener("abort", s, { once: !0 });
    const i = Object.values(a).map((o) => o && o.type && D.has(o.type) ? ke([o], { signal: t }).then((h) => {
      let [l] = h;
      return r.push(l), l;
    }) : o), n = Object.keys(a);
    Promise.all(i).then((o) => o.reduce((h, l, c) => (h[n[c]] = l, h), {})).then(e).catch((o) => {
      r.forEach((h) => {
        h.dispose && h.dispose();
      }), s(o);
    }).finally(() => {
      t && t.removeEventListener("abort", s);
    });
  });
}, _e = function(a) {
  return (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : []).reduce((t, e) => (e in a && (t[e] = a[e]), t), {});
}, wi = (a, t) => Object.keys(a).reduce((e, s) => (t(a[s], s, a) && (e[s] = a[s]), e), {}), $i = { aliceblue: "#F0F8FF", antiquewhite: "#FAEBD7", aqua: "#0FF", aquamarine: "#7FFFD4", azure: "#F0FFFF", beige: "#F5F5DC", bisque: "#FFE4C4", black: "#000", blanchedalmond: "#FFEBCD", blue: "#00F", blueviolet: "#8A2BE2", brown: "#A52A2A", burlywood: "#DEB887", cadetblue: "#5F9EA0", chartreuse: "#7FFF00", chocolate: "#D2691E", coral: "#FF7F50", cornflowerblue: "#6495ED", cornsilk: "#FFF8DC", crimson: "#DC143C", cyan: "#0FF", darkblue: "#00008B", darkcyan: "#008B8B", darkgoldenrod: "#B8860B", darkgray: "#A9A9A9", darkgrey: "#A9A9A9", darkgreen: "#006400", darkkhaki: "#BDB76B", darkmagenta: "#8B008B", darkolivegreen: "#556B2F", darkorange: "#FF8C00", darkorchid: "#9932CC", darkred: "#8B0000", darksalmon: "#E9967A", darkseagreen: "#8FBC8F", darkslateblue: "#483D8B", darkslategray: "#2F4F4F", darkslategrey: "#2F4F4F", darkturquoise: "#00CED1", darkviolet: "#9400D3", deeppink: "#FF1493", deepskyblue: "#00BFFF", dimgray: "#696969", dimgrey: "#696969", dodgerblue: "#1E90FF", firebrick: "#B22222", floralwhite: "#FFFAF0", forestgreen: "#228B22", fuchsia: "#F0F", gainsboro: "#DCDCDC", ghostwhite: "#F8F8FF", gold: "#FFD700", goldenrod: "#DAA520", gray: "#808080", grey: "#808080", green: "#008000", greenyellow: "#ADFF2F", honeydew: "#F0FFF0", hotpink: "#FF69B4", indianred: "#CD5C5C", indigo: "#4B0082", ivory: "#FFFFF0", khaki: "#F0E68C", lavender: "#E6E6FA", lavenderblush: "#FFF0F5", lawngreen: "#7CFC00", lemonchiffon: "#FFFACD", lightblue: "#ADD8E6", lightcoral: "#F08080", lightcyan: "#E0FFFF", lightgoldenrodyellow: "#FAFAD2", lightgray: "#D3D3D3", lightgrey: "#D3D3D3", lightgreen: "#90EE90", lightpink: "#FFB6C1", lightsalmon: "#FFA07A", lightseagreen: "#20B2AA", lightskyblue: "#87CEFA", lightslategray: "#789", lightslategrey: "#789", lightsteelblue: "#B0C4DE", lightyellow: "#FFFFE0", lime: "#0F0", limegreen: "#32CD32", linen: "#FAF0E6", magenta: "#F0F", maroon: "#800000", mediumaquamarine: "#66CDAA", mediumblue: "#0000CD", mediumorchid: "#BA55D3", mediumpurple: "#9370DB", mediumseagreen: "#3CB371", mediumslateblue: "#7B68EE", mediumspringgreen: "#00FA9A", mediumturquoise: "#48D1CC", mediumvioletred: "#C71585", midnightblue: "#191970", mintcream: "#F5FFFA", mistyrose: "#FFE4E1", moccasin: "#FFE4B5", navajowhite: "#FFDEAD", navy: "#000080", oldlace: "#FDF5E6", olive: "#808000", olivedrab: "#6B8E23", orange: "#FFA500", orangered: "#FF4500", orchid: "#DA70D6", palegoldenrod: "#EEE8AA", palegreen: "#98FB98", paleturquoise: "#AFEEEE", palevioletred: "#DB7093", papayawhip: "#FFEFD5", peachpuff: "#FFDAB9", peru: "#CD853F", pink: "#FFC0CB", plum: "#DDA0DD", powderblue: "#B0E0E6", purple: "#800080", rebeccapurple: "#639", red: "#F00", rosybrown: "#BC8F8F", royalblue: "#4169E1", saddlebrown: "#8B4513", salmon: "#FA8072", sandybrown: "#F4A460", seagreen: "#2E8B57", seashell: "#FFF5EE", sienna: "#A0522D", silver: "#C0C0C0", skyblue: "#87CEEB", slateblue: "#6A5ACD", slategray: "#708090", slategrey: "#708090", snow: "#FFFAFA", springgreen: "#00FF7F", steelblue: "#4682B4", tan: "#D2B48C", teal: "#008080", thistle: "#D8BFD8", tomato: "#FF6347", turquoise: "#40E0D0", violet: "#EE82EE", wheat: "#F5DEB3", white: "#FFF", whitesmoke: "#F5F5F5", yellow: "#FF0", yellowgreen: "#9ACD32" }, Tr = (a, t, e) => (e < 0 && (e += 1), e > 1 && (e -= 1), e < 1 / 6 ? a + 6 * (t - a) * e : e < 0.5 ? t : e < 2 / 3 ? a + (t - a) * (2 / 3 - e) * 6 : a), Ji = (a, t, e, s) => {
  a /= 255, t /= 255, e /= 255;
  const r = Math.max(a, t, e), i = Math.min(a, t, e);
  let n, o;
  const h = (r + i) / 2;
  if (r === i) n = o = 0;
  else {
    const l = r - i;
    switch (o = h > 0.5 ? l / (2 - r - i) : l / (r + i), r) {
      case a:
        n = (t - e) / l + (t < e ? 6 : 0);
        break;
      case t:
        n = (e - a) / l + 2;
        break;
      case e:
        n = (a - t) / l + 4;
    }
    n /= 6;
  }
  return [Math.round(360 * n), Math.round(100 * o), Math.round(100 * h), s];
}, tn = function() {
  let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "1";
  return parseFloat(a) / (a.endsWith("%") ? 100 : 1);
}, ds = (a) => Math.min(Math.round(a), 255).toString(16).toUpperCase().padStart(2, "0"), en = (a) => {
  let [t, e, s, r = 1] = a;
  const i = Math.round(0.3 * t + 0.59 * e + 0.11 * s);
  return [i, i, i, r];
};
class Y {
  constructor(t) {
    if (b(this, "isUnrecognised", !1), t) if (t instanceof Y) this.setSource([...t._source]);
    else if (Array.isArray(t)) {
      const [e, s, r, i = 1] = t;
      this.setSource([e, s, r, i]);
    } else this.setSource(this._tryParsingColor(t));
    else this.setSource([0, 0, 0, 1]);
  }
  _tryParsingColor(t) {
    return (t = t.toLowerCase()) in $i && (t = $i[t]), t === "transparent" ? [255, 255, 255, 0] : Y.sourceFromHex(t) || Y.sourceFromRgb(t) || Y.sourceFromHsl(t) || (this.isUnrecognised = !0) && [0, 0, 0, 1];
  }
  getSource() {
    return this._source;
  }
  setSource(t) {
    this._source = t;
  }
  toRgb() {
    const [t, e, s] = this.getSource();
    return "rgb(".concat(t, ",").concat(e, ",").concat(s, ")");
  }
  toRgba() {
    return "rgba(".concat(this.getSource().join(","), ")");
  }
  toHsl() {
    const [t, e, s] = Ji(...this.getSource());
    return "hsl(".concat(t, ",").concat(e, "%,").concat(s, "%)");
  }
  toHsla() {
    const [t, e, s, r] = Ji(...this.getSource());
    return "hsla(".concat(t, ",").concat(e, "%,").concat(s, "%,").concat(r, ")");
  }
  toHex() {
    return this.toHexa().slice(0, 6);
  }
  toHexa() {
    const [t, e, s, r] = this.getSource();
    return "".concat(ds(t)).concat(ds(e)).concat(ds(s)).concat(ds(Math.round(255 * r)));
  }
  getAlpha() {
    return this.getSource()[3];
  }
  setAlpha(t) {
    return this._source[3] = t, this;
  }
  toGrayscale() {
    return this.setSource(en(this.getSource())), this;
  }
  toBlackWhite(t) {
    const [e, , , s] = en(this.getSource()), r = e < (t || 127) ? 0 : 255;
    return this.setSource([r, r, r, s]), this;
  }
  overlayWith(t) {
    t instanceof Y || (t = new Y(t));
    const e = this.getSource(), s = t.getSource(), [r, i, n] = e.map((o, h) => Math.round(0.5 * o + 0.5 * s[h]));
    return this.setSource([r, i, n, e[3]]), this;
  }
  static fromRgb(t) {
    return Y.fromRgba(t);
  }
  static fromRgba(t) {
    return new Y(Y.sourceFromRgb(t));
  }
  static sourceFromRgb(t) {
    const e = t.match(/^rgba?\(\s*(\d{0,3}(?:\.\d+)?%?)\s*[\s|,]\s*(\d{0,3}(?:\.\d+)?%?)\s*[\s|,]\s*(\d{0,3}(?:\.\d+)?%?)\s*(?:\s*[,/]\s*(\d{0,3}(?:\.\d+)?%?)\s*)?\)$/i);
    if (e) {
      const [s, r, i] = e.slice(1, 4).map((n) => {
        const o = parseFloat(n);
        return n.endsWith("%") ? Math.round(2.55 * o) : o;
      });
      return [s, r, i, tn(e[4])];
    }
  }
  static fromHsl(t) {
    return Y.fromHsla(t);
  }
  static fromHsla(t) {
    return new Y(Y.sourceFromHsl(t));
  }
  static sourceFromHsl(t) {
    const e = t.match(/^hsla?\(\s*([+-]?\d{0,3}(?:\.\d+)?(?:deg|turn|rad)?)\s*[\s|,]\s*(\d{0,3}(?:\.\d+)?%?)\s*[\s|,]\s*(\d{0,3}(?:\.\d+)?%?)\s*(?:\s*[,/]\s*(\d*(?:\.\d+)?%?)\s*)?\)$/i);
    if (!e) return;
    const s = (Y.parseAngletoDegrees(e[1]) % 360 + 360) % 360 / 360, r = parseFloat(e[2]) / 100, i = parseFloat(e[3]) / 100;
    let n, o, h;
    if (r === 0) n = o = h = i;
    else {
      const l = i <= 0.5 ? i * (r + 1) : i + r - i * r, c = 2 * i - l;
      n = Tr(c, l, s + 1 / 3), o = Tr(c, l, s), h = Tr(c, l, s - 1 / 3);
    }
    return [Math.round(255 * n), Math.round(255 * o), Math.round(255 * h), tn(e[4])];
  }
  static fromHex(t) {
    return new Y(Y.sourceFromHex(t));
  }
  static sourceFromHex(t) {
    if (t.match(/^#?(([0-9a-f]){3,4}|([0-9a-f]{2}){3,4})$/i)) {
      const e = t.slice(t.indexOf("#") + 1);
      let s;
      s = e.length <= 4 ? e.split("").map((h) => h + h) : e.match(/.{2}/g);
      const [r, i, n, o = 255] = s.map((h) => parseInt(h, 16));
      return [r, i, n, o / 255];
    }
  }
  static parseAngletoDegrees(t) {
    const e = t.toLowerCase(), s = parseFloat(e);
    return e.includes("rad") ? re(s) : e.includes("turn") ? 360 * s : s;
  }
}
const z = (a, t) => parseFloat(Number(a).toFixed(t)), nt = function(a) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : pi;
  const e = /\D{0,2}$/.exec(a), s = parseFloat(a), r = N.DPI;
  switch (e == null ? void 0 : e[0]) {
    case "mm":
      return s * r / 25.4;
    case "cm":
      return s * r / 2.54;
    case "in":
      return s * r;
    case "pt":
      return s * r / 72;
    case "pc":
      return s * r / 72 * 12;
    case "em":
      return s * t;
    default:
      return s;
  }
}, Si = (a) => {
  const [t, e] = a.trim().split(" "), [s, r] = (i = t) && i !== at ? [i.slice(1, 4), i.slice(5, 8)] : i === at ? [i, i] : ["Mid", "Mid"];
  var i;
  return { meetOrSlice: e || "meet", alignX: s, alignY: r };
}, es = (a) => "matrix(" + a.map((t) => z(t, N.NUM_FRACTION_DIGITS)).join(" ") + ")", ss = function(a, t) {
  let e, s, r = !(arguments.length > 2 && arguments[2] !== void 0) || arguments[2];
  if (t) if (t.toLive) e = "url(#SVGID_".concat(t.id, ")");
  else {
    const i = new Y(t), n = i.getAlpha();
    e = i.toRgb(), n !== 1 && (s = n.toString());
  }
  else e = "none";
  return r ? "".concat(a, ": ").concat(e, "; ").concat(s ? "".concat(a, "-opacity: ").concat(s, "; ") : "") : "".concat(a, '="').concat(e, '" ').concat(s ? "".concat(a, '-opacity="').concat(s, '" ') : "");
}, bt = (a) => !!a && a.toLive !== void 0, sn = (a) => !!a && typeof a.toObject == "function", rn = (a) => !!a && a.offsetX !== void 0 && "source" in a, le = (a) => !!a && "multiSelectionStacking" in a;
function Qn(a) {
  const t = a && xt(a);
  let e = 0, s = 0;
  if (!a || !t) return { left: e, top: s };
  let r = a;
  const i = t.documentElement, n = t.body || { scrollLeft: 0, scrollTop: 0 };
  for (; r && (r.parentNode || r.host) && (r = r.parentNode || r.host, r === t ? (e = n.scrollLeft || i.scrollLeft || 0, s = n.scrollTop || i.scrollTop || 0) : (e += r.scrollLeft || 0, s += r.scrollTop || 0), r.nodeType !== 1 || r.style.position !== "fixed"); ) ;
  return { left: e, top: s };
}
const xt = (a) => a.ownerDocument || null, $n = (a) => {
  var t;
  return ((t = a.ownerDocument) === null || t === void 0 ? void 0 : t.defaultView) || null;
}, Jn = function(a, t, e) {
  let { width: s, height: r } = e, i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 1;
  a.width = s, a.height = r, i > 1 && (a.setAttribute("width", (s * i).toString()), a.setAttribute("height", (r * i).toString()), t.scale(i, i));
}, Ur = (a, t) => {
  let { width: e, height: s } = t;
  e && (a.style.width = typeof e == "number" ? "".concat(e, "px") : e), s && (a.style.height = typeof s == "number" ? "".concat(s, "px") : s);
};
function nn(a) {
  return a.onselectstart !== void 0 && (a.onselectstart = () => !1), a.style.userSelect = at, a;
}
class to {
  constructor(t) {
    b(this, "_originalCanvasStyle", void 0), b(this, "lower", void 0);
    const e = this.createLowerCanvas(t);
    this.lower = { el: e, ctx: e.getContext("2d") };
  }
  createLowerCanvas(t) {
    const e = (s = t) && s.getContext !== void 0 ? t : t && Fe().getElementById(t) || _t();
    var s;
    if (e.hasAttribute("data-fabric")) throw new It("Trying to initialize a canvas that has already been initialized. Did you forget to dispose the canvas?");
    return this._originalCanvasStyle = e.style.cssText, e.setAttribute("data-fabric", "main"), e.classList.add("lower-canvas"), e;
  }
  cleanupDOM(t) {
    let { width: e, height: s } = t;
    const { el: r } = this.lower;
    r.classList.remove("lower-canvas"), r.removeAttribute("data-fabric"), r.setAttribute("width", "".concat(e)), r.setAttribute("height", "".concat(s)), r.style.cssText = this._originalCanvasStyle || "", this._originalCanvasStyle = void 0;
  }
  setDimensions(t, e) {
    const { el: s, ctx: r } = this.lower;
    Jn(s, r, t, e);
  }
  setCSSDimensions(t) {
    Ur(this.lower.el, t);
  }
  calcOffset() {
    return function(t) {
      var e;
      const s = t && xt(t), r = { left: 0, top: 0 };
      if (!s) return r;
      const i = ((e = $n(t)) === null || e === void 0 ? void 0 : e.getComputedStyle(t, null)) || {};
      r.left += parseInt(i.borderLeftWidth, 10) || 0, r.top += parseInt(i.borderTopWidth, 10) || 0, r.left += parseInt(i.paddingLeft, 10) || 0, r.top += parseInt(i.paddingTop, 10) || 0;
      let n = { left: 0, top: 0 };
      const o = s.documentElement;
      t.getBoundingClientRect !== void 0 && (n = t.getBoundingClientRect());
      const h = Qn(t);
      return { left: n.left + h.left - (o.clientLeft || 0) + r.left, top: n.top + h.top - (o.clientTop || 0) + r.top };
    }(this.lower.el);
  }
  dispose() {
    Pt().dispose(this.lower.el), delete this.lower;
  }
}
const Ka = { backgroundVpt: !0, backgroundColor: "", overlayVpt: !0, overlayColor: "", includeDefaultValues: !0, svgViewportTransformation: !0, renderOnAddRemove: !0, skipOffscreen: !0, enableRetinaScaling: !0, imageSmoothingEnabled: !0, controlsAboveOverlay: !1, allowTouchScrolling: !1, viewportTransform: [...lt] };
class os extends Hn(Vn) {
  get lowerCanvasEl() {
    var t;
    return (t = this.elements.lower) === null || t === void 0 ? void 0 : t.el;
  }
  get contextContainer() {
    var t;
    return (t = this.elements.lower) === null || t === void 0 ? void 0 : t.ctx;
  }
  static getDefaults() {
    return os.ownDefaults;
  }
  constructor(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    super(), Object.assign(this, this.constructor.getDefaults()), this.set(e), this.initElements(t), this._setDimensionsImpl({ width: this.width || this.elements.lower.el.width || 0, height: this.height || this.elements.lower.el.height || 0 }), this.skipControlsDrawing = !1, this.viewportTransform = [...this.viewportTransform], this.calcViewportBoundaries();
  }
  initElements(t) {
    this.elements = new to(t);
  }
  add() {
    const t = super.add(...arguments);
    return arguments.length > 0 && this.renderOnAddRemove && this.requestRenderAll(), t;
  }
  insertAt(t) {
    for (var e = arguments.length, s = new Array(e > 1 ? e - 1 : 0), r = 1; r < e; r++) s[r - 1] = arguments[r];
    const i = super.insertAt(t, ...s);
    return s.length > 0 && this.renderOnAddRemove && this.requestRenderAll(), i;
  }
  remove() {
    const t = super.remove(...arguments);
    return t.length > 0 && this.renderOnAddRemove && this.requestRenderAll(), t;
  }
  _onObjectAdded(t) {
    t.canvas && t.canvas !== this && (Xt("warn", `Canvas is trying to add an object that belongs to a different canvas.
Resulting to default behavior: removing object from previous canvas and adding to new canvas`), t.canvas.remove(t)), t._set("canvas", this), t.setCoords(), this.fire("object:added", { target: t }), t.fire("added", { target: this });
  }
  _onObjectRemoved(t) {
    t._set("canvas", void 0), this.fire("object:removed", { target: t }), t.fire("removed", { target: this });
  }
  _onStackOrderChanged() {
    this.renderOnAddRemove && this.requestRenderAll();
  }
  getRetinaScaling() {
    return this.enableRetinaScaling ? Rn() : 1;
  }
  calcOffset() {
    return this._offset = this.elements.calcOffset();
  }
  getWidth() {
    return this.width;
  }
  getHeight() {
    return this.height;
  }
  setWidth(t, e) {
    return this.setDimensions({ width: t }, e);
  }
  setHeight(t, e) {
    return this.setDimensions({ height: t }, e);
  }
  _setDimensionsImpl(t) {
    let { cssOnly: e = !1, backstoreOnly: s = !1 } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    if (!e) {
      const r = y({ width: this.width, height: this.height }, t);
      this.elements.setDimensions(r, this.getRetinaScaling()), this.hasLostContext = !0, this.width = r.width, this.height = r.height;
    }
    s || this.elements.setCSSDimensions(t), this.calcOffset();
  }
  setDimensions(t, e) {
    this._setDimensionsImpl(t, e), e && e.cssOnly || this.requestRenderAll();
  }
  getZoom() {
    return this.viewportTransform[0];
  }
  setViewportTransform(t) {
    this.viewportTransform = t, this.calcViewportBoundaries(), this.renderOnAddRemove && this.requestRenderAll();
  }
  zoomToPoint(t, e) {
    const s = t, r = [...this.viewportTransform], i = st(t, gt(r));
    r[0] = e, r[3] = e;
    const n = st(i, r);
    r[4] += s.x - n.x, r[5] += s.y - n.y, this.setViewportTransform(r);
  }
  setZoom(t) {
    this.zoomToPoint(new _(0, 0), t);
  }
  absolutePan(t) {
    const e = [...this.viewportTransform];
    return e[4] = -t.x, e[5] = -t.y, this.setViewportTransform(e);
  }
  relativePan(t) {
    return this.absolutePan(new _(-t.x - this.viewportTransform[4], -t.y - this.viewportTransform[5]));
  }
  getElement() {
    return this.elements.lower.el;
  }
  clearContext(t) {
    t.clearRect(0, 0, this.width, this.height);
  }
  getContext() {
    return this.elements.lower.ctx;
  }
  clear() {
    this.remove(...this.getObjects()), this.backgroundImage = void 0, this.overlayImage = void 0, this.backgroundColor = "", this.overlayColor = "", this.clearContext(this.getContext()), this.fire("canvas:cleared"), this.renderOnAddRemove && this.requestRenderAll();
  }
  renderAll() {
    this.cancelRequestedRender(), this.destroyed || this.renderCanvas(this.getContext(), this._objects);
  }
  renderAndReset() {
    this.nextRenderHandle = 0, this.renderAll();
  }
  requestRenderAll() {
    this.nextRenderHandle || this.disposed || this.destroyed || (this.nextRenderHandle = Ke(() => this.renderAndReset()));
  }
  calcViewportBoundaries() {
    const t = this.width, e = this.height, s = gt(this.viewportTransform), r = st({ x: 0, y: 0 }, s), i = st({ x: t, y: e }, s), n = r.min(i), o = r.max(i);
    return this.vptCoords = { tl: n, tr: new _(o.x, n.y), bl: new _(n.x, o.y), br: o };
  }
  cancelRequestedRender() {
    this.nextRenderHandle && (Un(this.nextRenderHandle), this.nextRenderHandle = 0);
  }
  drawControls(t) {
  }
  renderCanvas(t, e) {
    if (this.destroyed) return;
    const s = this.viewportTransform, r = this.clipPath;
    this.calcViewportBoundaries(), this.clearContext(t), t.imageSmoothingEnabled = this.imageSmoothingEnabled, t.patternQuality = "best", this.fire("before:render", { ctx: t }), this._renderBackground(t), t.save(), t.transform(s[0], s[1], s[2], s[3], s[4], s[5]), this._renderObjects(t, e), t.restore(), this.controlsAboveOverlay || this.skipControlsDrawing || this.drawControls(t), r && (r._set("canvas", this), r.shouldCache(), r._transformDone = !0, r.renderCache({ forClipping: !0 }), this.drawClipPathOnCanvas(t, r)), this._renderOverlay(t), this.controlsAboveOverlay && !this.skipControlsDrawing && this.drawControls(t), this.fire("after:render", { ctx: t }), this.__cleanupTask && (this.__cleanupTask(), this.__cleanupTask = void 0);
  }
  drawClipPathOnCanvas(t, e) {
    const s = this.viewportTransform;
    t.save(), t.transform(...s), t.globalCompositeOperation = "destination-in", e.transform(t), t.scale(1 / e.zoomX, 1 / e.zoomY), t.drawImage(e._cacheCanvas, -e.cacheTranslationX, -e.cacheTranslationY), t.restore();
  }
  _renderObjects(t, e) {
    for (let s = 0, r = e.length; s < r; ++s) e[s] && e[s].render(t);
  }
  _renderBackgroundOrOverlay(t, e) {
    const s = this["".concat(e, "Color")], r = this["".concat(e, "Image")], i = this.viewportTransform, n = this["".concat(e, "Vpt")];
    if (!s && !r) return;
    const o = bt(s);
    if (s) {
      if (t.save(), t.beginPath(), t.moveTo(0, 0), t.lineTo(this.width, 0), t.lineTo(this.width, this.height), t.lineTo(0, this.height), t.closePath(), t.fillStyle = o ? s.toLive(t) : s, n && t.transform(...i), o) {
        t.transform(1, 0, 0, 1, s.offsetX || 0, s.offsetY || 0);
        const h = s.gradientTransform || s.patternTransform;
        h && t.transform(...h);
      }
      t.fill(), t.restore();
    }
    if (r) {
      t.save();
      const { skipOffscreen: h } = this;
      this.skipOffscreen = n, n && t.transform(...i), r.render(t), this.skipOffscreen = h, t.restore();
    }
  }
  _renderBackground(t) {
    this._renderBackgroundOrOverlay(t, "background");
  }
  _renderOverlay(t) {
    this._renderBackgroundOrOverlay(t, "overlay");
  }
  getCenter() {
    return { top: this.height / 2, left: this.width / 2 };
  }
  getCenterPoint() {
    return new _(this.width / 2, this.height / 2);
  }
  centerObjectH(t) {
    return this._centerObject(t, new _(this.getCenterPoint().x, t.getCenterPoint().y));
  }
  centerObjectV(t) {
    return this._centerObject(t, new _(t.getCenterPoint().x, this.getCenterPoint().y));
  }
  centerObject(t) {
    return this._centerObject(t, this.getCenterPoint());
  }
  viewportCenterObject(t) {
    return this._centerObject(t, this.getVpCenter());
  }
  viewportCenterObjectH(t) {
    return this._centerObject(t, new _(this.getVpCenter().x, t.getCenterPoint().y));
  }
  viewportCenterObjectV(t) {
    return this._centerObject(t, new _(t.getCenterPoint().x, this.getVpCenter().y));
  }
  getVpCenter() {
    return st(this.getCenterPoint(), gt(this.viewportTransform));
  }
  _centerObject(t, e) {
    t.setXY(e, P, P), t.setCoords(), this.renderOnAddRemove && this.requestRenderAll();
  }
  toDatalessJSON(t) {
    return this.toDatalessObject(t);
  }
  toObject(t) {
    return this._toObjectMethod("toObject", t);
  }
  toJSON() {
    return this.toObject();
  }
  toDatalessObject(t) {
    return this._toObjectMethod("toDatalessObject", t);
  }
  _toObjectMethod(t, e) {
    const s = this.clipPath, r = s && !s.excludeFromExport ? this._toObject(s, t, e) : null;
    return y(y(y({ version: Hr }, _e(this, e)), {}, { objects: this._objects.filter((i) => !i.excludeFromExport).map((i) => this._toObject(i, t, e)) }, this.__serializeBgOverlay(t, e)), r ? { clipPath: r } : null);
  }
  _toObject(t, e, s) {
    let r;
    this.includeDefaultValues || (r = t.includeDefaultValues, t.includeDefaultValues = !1);
    const i = t[e](s);
    return this.includeDefaultValues || (t.includeDefaultValues = !!r), i;
  }
  __serializeBgOverlay(t, e) {
    const s = {}, r = this.backgroundImage, i = this.overlayImage, n = this.backgroundColor, o = this.overlayColor;
    return bt(n) ? n.excludeFromExport || (s.background = n.toObject(e)) : n && (s.background = n), bt(o) ? o.excludeFromExport || (s.overlay = o.toObject(e)) : o && (s.overlay = o), r && !r.excludeFromExport && (s.backgroundImage = this._toObject(r, t, e)), i && !i.excludeFromExport && (s.overlayImage = this._toObject(i, t, e)), s;
  }
  toSVG() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, e = arguments.length > 1 ? arguments[1] : void 0;
    t.reviver = e;
    const s = [];
    return this._setSVGPreamble(s, t), this._setSVGHeader(s, t), this.clipPath && s.push('<g clip-path="url(#'.concat(this.clipPath.clipPathId, `)" >
`)), this._setSVGBgOverlayColor(s, "background"), this._setSVGBgOverlayImage(s, "backgroundImage", e), this._setSVGObjects(s, e), this.clipPath && s.push(`</g>
`), this._setSVGBgOverlayColor(s, "overlay"), this._setSVGBgOverlayImage(s, "overlayImage", e), s.push("</svg>"), s.join("");
  }
  _setSVGPreamble(t, e) {
    e.suppressPreamble || t.push('<?xml version="1.0" encoding="', e.encoding || "UTF-8", `" standalone="no" ?>
`, '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ', `"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
`);
  }
  _setSVGHeader(t, e) {
    const s = e.width || "".concat(this.width), r = e.height || "".concat(this.height), i = N.NUM_FRACTION_DIGITS, n = e.viewBox;
    let o;
    if (n) o = 'viewBox="'.concat(n.x, " ").concat(n.y, " ").concat(n.width, " ").concat(n.height, '" ');
    else if (this.svgViewportTransformation) {
      const h = this.viewportTransform;
      o = 'viewBox="'.concat(z(-h[4] / h[0], i), " ").concat(z(-h[5] / h[3], i), " ").concat(z(this.width / h[0], i), " ").concat(z(this.height / h[3], i), '" ');
    } else o = 'viewBox="0 0 '.concat(this.width, " ").concat(this.height, '" ');
    t.push("<svg ", 'xmlns="http://www.w3.org/2000/svg" ', 'xmlns:xlink="http://www.w3.org/1999/xlink" ', 'version="1.1" ', 'width="', s, '" ', 'height="', r, '" ', o, `xml:space="preserve">
`, "<desc>Created with Fabric.js ", Hr, `</desc>
`, `<defs>
`, this.createSVGFontFacesMarkup(), this.createSVGRefElementsMarkup(), this.createSVGClipPathMarkup(e), `</defs>
`);
  }
  createSVGClipPathMarkup(t) {
    const e = this.clipPath;
    return e ? (e.clipPathId = "CLIPPATH_".concat(se()), '<clipPath id="'.concat(e.clipPathId, `" >
`).concat(e.toClipPathSVG(t.reviver), `</clipPath>
`)) : "";
  }
  createSVGRefElementsMarkup() {
    return ["background", "overlay"].map((t) => {
      const e = this["".concat(t, "Color")];
      if (bt(e)) {
        const s = this["".concat(t, "Vpt")], r = this.viewportTransform, i = { isType: () => !1, width: this.width / (s ? r[0] : 1), height: this.height / (s ? r[3] : 1) };
        return e.toSVG(i, { additionalTransform: s ? es(r) : "" });
      }
    }).join("");
  }
  createSVGFontFacesMarkup() {
    const t = [], e = {}, s = N.fontPaths;
    this._objects.forEach(function i(n) {
      t.push(n), Rs(n) && n._objects.forEach(i);
    }), t.forEach((i) => {
      if (!(n = i) || typeof n._renderText != "function") return;
      var n;
      const { styles: o, fontFamily: h } = i;
      !e[h] && s[h] && (e[h] = !0, o && Object.values(o).forEach((l) => {
        Object.values(l).forEach((c) => {
          let { fontFamily: u = "" } = c;
          !e[u] && s[u] && (e[u] = !0);
        });
      }));
    });
    const r = Object.keys(e).map((i) => `		@font-face {
			font-family: '`.concat(i, `';
			src: url('`).concat(s[i], `');
		}
`)).join("");
    return r ? `	<style type="text/css"><![CDATA[
`.concat(r, `]]></style>
`) : "";
  }
  _setSVGObjects(t, e) {
    this.forEachObject((s) => {
      s.excludeFromExport || this._setSVGObject(t, s, e);
    });
  }
  _setSVGObject(t, e, s) {
    t.push(e.toSVG(s));
  }
  _setSVGBgOverlayImage(t, e, s) {
    const r = this[e];
    r && !r.excludeFromExport && r.toSVG && t.push(r.toSVG(s));
  }
  _setSVGBgOverlayColor(t, e) {
    const s = this["".concat(e, "Color")];
    if (s) if (bt(s)) {
      const r = s.repeat || "", i = this.width, n = this.height, o = this["".concat(e, "Vpt")] ? es(gt(this.viewportTransform)) : "";
      t.push('<rect transform="'.concat(o, " translate(").concat(i / 2, ",").concat(n / 2, ')" x="').concat(s.offsetX - i / 2, '" y="').concat(s.offsetY - n / 2, '" width="').concat(r !== "repeat-y" && r !== "no-repeat" || !rn(s) ? i : s.source.width, '" height="').concat(r !== "repeat-x" && r !== "no-repeat" || !rn(s) ? n : s.source.height, '" fill="url(#SVGID_').concat(s.id, `)"></rect>
`));
    } else t.push('<rect x="0" y="0" width="100%" height="100%" ', 'fill="', s, '"', `></rect>
`);
  }
  loadFromJSON(t, e) {
    let { signal: s } = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    if (!t) return Promise.reject(new It("`json` is undefined"));
    const r = typeof t == "string" ? JSON.parse(t) : t, { objects: i = [], backgroundImage: n, background: o, overlayImage: h, overlay: l, clipPath: c } = r, u = this.renderOnAddRemove;
    return this.renderOnAddRemove = !1, Promise.all([ke(i, { reviver: e, signal: s }), ns({ backgroundImage: n, backgroundColor: o, overlayImage: h, overlayColor: l, clipPath: c }, { signal: s })]).then((g) => {
      let [d, f] = g;
      return this.clear(), this.add(...d), this.set(r), this.set(f), this.renderOnAddRemove = u, this;
    });
  }
  clone(t) {
    const e = this.toObject(t);
    return this.cloneWithoutData().loadFromJSON(e);
  }
  cloneWithoutData() {
    const t = Dt(this);
    return new this.constructor(t);
  }
  toDataURL() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    const { format: e = "png", quality: s = 1, multiplier: r = 1, enableRetinaScaling: i = !1 } = t, n = r * (i ? this.getRetinaScaling() : 1);
    return bi(this.toCanvasElement(n, t), e, s);
  }
  toCanvasElement() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 1, { width: e, height: s, left: r, top: i, filter: n } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const o = (e || this.width) * t, h = (s || this.height) * t, l = this.getZoom(), c = this.width, u = this.height, g = this.skipControlsDrawing, d = l * t, f = this.viewportTransform, p = [d, 0, 0, d, (f[4] - (r || 0)) * t, (f[5] - (i || 0)) * t], m = this.enableRetinaScaling, v = Dt({ width: o, height: h }), C = n ? this._objects.filter((w) => n(w)) : this._objects;
    return this.enableRetinaScaling = !1, this.viewportTransform = p, this.width = o, this.height = h, this.skipControlsDrawing = !0, this.calcViewportBoundaries(), this.renderCanvas(v.getContext("2d"), C), this.viewportTransform = f, this.width = c, this.height = u, this.calcViewportBoundaries(), this.enableRetinaScaling = m, this.skipControlsDrawing = g, v;
  }
  dispose() {
    return !this.disposed && this.elements.cleanupDOM({ width: this.width, height: this.height }), Vs.cancelByCanvas(this), this.disposed = !0, new Promise((t, e) => {
      const s = () => {
        this.destroy(), t(!0);
      };
      s.kill = e, this.__cleanupTask && this.__cleanupTask.kill("aborted"), this.destroyed ? t(!1) : this.nextRenderHandle ? this.__cleanupTask = s : s();
    });
  }
  destroy() {
    this.destroyed = !0, this.cancelRequestedRender(), this.forEachObject((t) => t.dispose()), this._objects = [], this.backgroundImage && this.backgroundImage.dispose(), this.backgroundImage = void 0, this.overlayImage && this.overlayImage.dispose(), this.overlayImage = void 0, this.elements.dispose();
  }
  toString() {
    return "#<Canvas (".concat(this.complexity(), "): { objects: ").concat(this._objects.length, " }>");
  }
}
b(os, "ownDefaults", Ka);
const qa = ["touchstart", "touchmove", "touchend"], eo = (a) => {
  const t = Qn(a.target), e = function(s) {
    const r = s.changedTouches;
    return r && r[0] ? r[0] : s;
  }(a);
  return new _(e.clientX + t.left, e.clientY + t.top);
}, Us = (a) => qa.includes(a.type) || a.pointerType === "touch", Xr = (a) => {
  a.preventDefault(), a.stopPropagation();
}, Lt = (a) => {
  let t = 0, e = 0, s = 0, r = 0;
  for (let i = 0, n = a.length; i < n; i++) {
    const { x: o, y: h } = a[i];
    (o > s || !i) && (s = o), (o < t || !i) && (t = o), (h > r || !i) && (r = h), (h < e || !i) && (e = h);
  }
  return { left: t, top: e, width: s - t, height: r - e };
}, Qa = ["translateX", "translateY", "scaleX", "scaleY"], so = (a, t) => Ie(a, U(t, a.calcOwnMatrix())), Ie = (a, t) => {
  const e = ye(t), { translateX: s, translateY: r, scaleX: i, scaleY: n } = e, o = H(e, Qa), h = new _(s, r);
  a.flipX = !1, a.flipY = !1, Object.assign(a, o), a.set({ scaleX: i, scaleY: n }), a.setPositionByOrigin(h, P, P);
}, ro = (a) => {
  a.scaleX = 1, a.scaleY = 1, a.skewX = 0, a.skewY = 0, a.flipX = !1, a.flipY = !1, a.rotate(0);
}, xi = (a) => ({ scaleX: a.scaleX, scaleY: a.scaleY, skewX: a.skewX, skewY: a.skewY, angle: a.angle, left: a.left, flipX: a.flipX, flipY: a.flipY, top: a.top }), dr = (a, t, e) => {
  const s = a / 2, r = t / 2, i = [new _(-s, -r), new _(s, -r), new _(-s, r), new _(s, r)].map((o) => o.transform(e)), n = Lt(i);
  return new _(n.width, n.height);
}, as = function() {
  let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : lt;
  return U(gt(arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : lt), a);
}, Ht = function(a) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : lt, e = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : lt;
  return a.transform(as(t, e));
}, io = function(a) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : lt, e = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : lt;
  return a.transform(as(t, e), !0);
}, Gr = (a, t, e) => {
  const s = as(t, e);
  return Ie(a, U(s, a.calcOwnMatrix())), s;
}, Mi = (a, t) => {
  var e;
  const { transform: { target: s } } = t;
  (e = s.canvas) === null || e === void 0 || e.fire("object:".concat(a), y(y({}, t), {}, { target: s })), s.fire(a, t);
}, $a = { left: -0.5, top: -0.5, center: 0, bottom: 0.5, right: 0.5 }, K = (a) => typeof a == "string" ? $a[a] : a - 0.5, Xs = "not-allowed";
function no(a) {
  return K(a.originX) === K(P) && K(a.originY) === K(P);
}
function on(a) {
  return 0.5 - K(a);
}
const Tt = (a, t) => a[t], Ti = (a, t, e, s) => ({ e: a, transform: t, pointer: new _(e, s) });
function oo(a, t) {
  const e = a.getTotalAngle() + re(Math.atan2(t.y, t.x)) + 360;
  return Math.round(e % 360 / 45);
}
function fr(a, t, e, s, r) {
  var i;
  let { target: n, corner: o } = a;
  const h = n.controls[o], l = ((i = n.canvas) === null || i === void 0 ? void 0 : i.getZoom()) || 1, c = n.padding / l, u = function(g, d, f, p) {
    const m = g.getRelativeCenterPoint(), v = f !== void 0 && p !== void 0 ? g.translateToGivenOrigin(m, P, P, f, p) : new _(g.left, g.top);
    return (g.angle ? d.rotate(-X(g.angle), m) : d).subtract(v);
  }(n, new _(s, r), t, e);
  return u.x >= c && (u.x -= c), u.x <= -c && (u.x += c), u.y >= c && (u.y -= c), u.y <= c && (u.y += c), u.x -= h.offsetX, u.y -= h.offsetY, u;
}
const ao = (a, t, e, s) => {
  const { target: r, offsetX: i, offsetY: n } = t, o = e - i, h = s - n, l = !Tt(r, "lockMovementX") && r.left !== o, c = !Tt(r, "lockMovementY") && r.top !== h;
  return l && r.set(B, o), c && r.set(dt, h), (l || c) && Mi(Bn, Ti(a, t, e, s)), l || c;
};
class ho {
  getSvgStyles(t) {
    const e = this.fillRule ? this.fillRule : "nonzero", s = this.strokeWidth ? this.strokeWidth : "0", r = this.strokeDashArray ? this.strokeDashArray.join(" ") : at, i = this.strokeDashOffset ? this.strokeDashOffset : "0", n = this.strokeLineCap ? this.strokeLineCap : "butt", o = this.strokeLineJoin ? this.strokeLineJoin : "miter", h = this.strokeMiterLimit ? this.strokeMiterLimit : "4", l = this.opacity !== void 0 ? this.opacity : "1", c = this.visible ? "" : " visibility: hidden;", u = t ? "" : this.getSvgFilter(), g = ss(Q, this.fill);
    return [ss(ht, this.stroke), "stroke-width: ", s, "; ", "stroke-dasharray: ", r, "; ", "stroke-linecap: ", n, "; ", "stroke-dashoffset: ", i, "; ", "stroke-linejoin: ", o, "; ", "stroke-miterlimit: ", h, "; ", g, "fill-rule: ", e, "; ", "opacity: ", l, ";", u, c].join("");
  }
  getSvgFilter() {
    return this.shadow ? "filter: url(#SVGID_".concat(this.shadow.id, ");") : "";
  }
  getSvgCommons() {
    return [this.id ? 'id="'.concat(this.id, '" ') : "", this.clipPath ? 'clip-path="url(#'.concat(this.clipPath.clipPathId, ')" ') : ""].join("");
  }
  getSvgTransform(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "";
    const s = t ? this.calcTransformMatrix() : this.calcOwnMatrix(), r = 'transform="'.concat(es(s));
    return "".concat(r).concat(e, '" ');
  }
  _toSVG(t) {
    return [""];
  }
  toSVG(t) {
    return this._createBaseSVGMarkup(this._toSVG(t), { reviver: t });
  }
  toClipPathSVG(t) {
    return "	" + this._createBaseClipPathSVGMarkup(this._toSVG(t), { reviver: t });
  }
  _createBaseClipPathSVGMarkup(t) {
    let { reviver: e, additionalTransform: s = "" } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const r = [this.getSvgTransform(!0, s), this.getSvgCommons()].join(""), i = t.indexOf("COMMON_PARTS");
    return t[i] = r, e ? e(t.join("")) : t.join("");
  }
  _createBaseSVGMarkup(t) {
    let { noStyle: e, reviver: s, withShadow: r, additionalTransform: i } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const n = e ? "" : 'style="'.concat(this.getSvgStyles(), '" '), o = r ? 'style="'.concat(this.getSvgFilter(), '" ') : "", h = this.clipPath, l = this.strokeUniform ? 'vector-effect="non-scaling-stroke" ' : "", c = h && h.absolutePositioned, u = this.stroke, g = this.fill, d = this.shadow, f = [], p = t.indexOf("COMMON_PARTS");
    let m;
    h && (h.clipPathId = "CLIPPATH_".concat(se()), m = '<clipPath id="'.concat(h.clipPathId, `" >
`).concat(h.toClipPathSVG(s), `</clipPath>
`)), c && f.push("<g ", o, this.getSvgCommons(), ` >
`), f.push("<g ", this.getSvgTransform(!1), c ? "" : o + this.getSvgCommons(), ` >
`);
    const v = [n, l, e ? "" : this.addPaintOrder(), " ", i ? 'transform="'.concat(i, '" ') : ""].join("");
    return t[p] = v, bt(g) && f.push(g.toSVG(this)), bt(u) && f.push(u.toSVG(this)), d && f.push(d.toSVG(this)), h && f.push(m), f.push(t.join("")), f.push(`</g>
`), c && f.push(`</g>
`), s ? s(f.join("")) : f.join("");
  }
  addPaintOrder() {
    return this.paintFirst !== Q ? ' paint-order="'.concat(this.paintFirst, '" ') : "";
  }
}
function pr(a) {
  return new RegExp("^(" + a.join("|") + ")\\b", "i");
}
var an;
const Mt = String.raw(an || (an = ie(["(?:[-+]?(?:d*.d+|d+.?)(?:[eE][-+]?d+)?)"], ["(?:[-+]?(?:\\d*\\.\\d+|\\d+\\.?)(?:[eE][-+]?\\d+)?)"]))), Zr = "http://www.w3.org/2000/svg", Ja = new RegExp("(normal|italic)?\\s*(normal|small-caps)?\\s*(normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900)?\\s*(" + Mt + "(?:px|cm|mm|em|pt|pc|in)*)(?:\\/(normal|" + Mt + "))?\\s+(.*)"), th = { cx: B, x: B, r: "radius", cy: dt, y: dt, display: "visible", visibility: "visible", transform: "transformMatrix", "fill-opacity": "fillOpacity", "fill-rule": "fillRule", "font-family": "fontFamily", "font-size": "fontSize", "font-style": "fontStyle", "font-weight": "fontWeight", "letter-spacing": "charSpacing", "paint-order": "paintFirst", "stroke-dasharray": "strokeDashArray", "stroke-dashoffset": "strokeDashOffset", "stroke-linecap": "strokeLineCap", "stroke-linejoin": "strokeLineJoin", "stroke-miterlimit": "strokeMiterLimit", "stroke-opacity": "strokeOpacity", "stroke-width": "strokeWidth", "text-decoration": "textDecoration", "text-anchor": "textAnchor", opacity: "opacity", "clip-path": "clipPath", "clip-rule": "clipRule", "vector-effect": "strokeUniform", "image-rendering": "imageSmoothing" }, Or = "font-size", jr = "clip-path", eh = pr(["path", "circle", "polygon", "polyline", "ellipse", "rect", "line", "image", "text"]), sh = pr(["symbol", "image", "marker", "pattern", "view", "svg"]), hn = pr(["symbol", "g", "a", "svg", "clipPath", "defs"]), ln = new RegExp("^\\s*(" + Mt + "+)\\s*,?\\s*(" + Mt + "+)\\s*,?\\s*(" + Mt + "+)\\s*,?\\s*(" + Mt + "+)\\s*$"), rh = new _(1, 0), lo = new _(), Oi = (a, t) => a.rotate(t), Gs = (a, t) => new _(t).subtract(a), Zs = (a) => a.distanceFrom(lo), Ks = (a, t) => Math.atan2(je(a, t), uo(a, t)), co = (a) => Ks(rh, a), mr = (a) => a.eq(lo) ? a : a.scalarDivide(Zs(a)), ji = function(a) {
  let t = !(arguments.length > 1 && arguments[1] !== void 0) || arguments[1];
  return mr(new _(-a.y, a.x).scalarMultiply(t ? 1 : -1));
}, je = (a, t) => a.x * t.y - a.y * t.x, uo = (a, t) => a.x * t.x + a.y * t.y, Kr = (a, t, e) => {
  if (a.eq(t) || a.eq(e)) return !0;
  const s = je(t, e), r = je(t, a), i = je(e, a);
  return s >= 0 ? r >= 0 && i <= 0 : !(r <= 0 && i >= 0);
}, cn = "(-?\\d+(?:\\.\\d*)?(?:px)?(?:\\s?|$))?", un = new RegExp("(?:\\s|^)" + cn + cn + "(" + Mt + "?(?:px)?)?(?:\\s?|$)(?:$|\\s)");
class Vt {
  constructor(t) {
    const e = typeof t == "string" ? Vt.parseShadow(t) : t;
    Object.assign(this, Vt.ownDefaults, e), this.id = se();
  }
  static parseShadow(t) {
    const e = t.trim(), [, s = 0, r = 0, i = 0] = (un.exec(e) || []).map((n) => parseFloat(n) || 0);
    return { color: (e.replace(un, "") || "rgb(0,0,0)").trim(), offsetX: s, offsetY: r, blur: i };
  }
  toString() {
    return [this.offsetX, this.offsetY, this.blur, this.color].join("px ");
  }
  toSVG(t) {
    const e = Oi(new _(this.offsetX, this.offsetY), X(-t.angle)), s = new Y(this.color);
    let r = 40, i = 40;
    return t.width && t.height && (r = 100 * z((Math.abs(e.x) + this.blur) / t.width, N.NUM_FRACTION_DIGITS) + 20, i = 100 * z((Math.abs(e.y) + this.blur) / t.height, N.NUM_FRACTION_DIGITS) + 20), t.flipX && (e.x *= -1), t.flipY && (e.y *= -1), '<filter id="SVGID_'.concat(this.id, '" y="-').concat(i, '%" height="').concat(100 + 2 * i, '%" x="-').concat(r, '%" width="').concat(100 + 2 * r, `%" >
	<feGaussianBlur in="SourceAlpha" stdDeviation="`).concat(z(this.blur ? this.blur / 2 : 0, N.NUM_FRACTION_DIGITS), `"></feGaussianBlur>
	<feOffset dx="`).concat(z(e.x, N.NUM_FRACTION_DIGITS), '" dy="').concat(z(e.y, N.NUM_FRACTION_DIGITS), `" result="oBlur" ></feOffset>
	<feFlood flood-color="`).concat(s.toRgb(), '" flood-opacity="').concat(s.getAlpha(), `"/>
	<feComposite in2="oBlur" operator="in" />
	<feMerge>
		<feMergeNode></feMergeNode>
		<feMergeNode in="SourceGraphic"></feMergeNode>
	</feMerge>
</filter>
`);
  }
  toObject() {
    const t = { color: this.color, blur: this.blur, offsetX: this.offsetX, offsetY: this.offsetY, affectStroke: this.affectStroke, nonScaling: this.nonScaling, type: this.constructor.type }, e = Vt.ownDefaults;
    return this.includeDefaultValues ? t : wi(t, (s, r) => s !== e[r]);
  }
  static fromObject(t) {
    return R(this, null, function* () {
      return new this(t);
    });
  }
}
b(Vt, "ownDefaults", { color: "rgb(0,0,0)", blur: 0, offsetX: 0, offsetY: 0, affectStroke: !1, includeDefaultValues: !0, nonScaling: !1 }), b(Vt, "type", "shadow"), D.setClass(Vt, "shadow");
const be = (a, t, e) => Math.max(a, Math.min(t, e)), ih = [dt, B, ct, vt, "flipX", "flipY", "originX", "originY", "angle", "opacity", "globalCompositeOperation", "shadow", "visible", Ne, Re], Zt = [Q, ht, "strokeWidth", "strokeDashArray", "width", "height", "paintFirst", "strokeUniform", "strokeLineCap", "strokeDashOffset", "strokeLineJoin", "strokeMiterLimit", "backgroundColor", "clipPath"], nh = { top: 0, left: 0, width: 0, height: 0, angle: 0, flipX: !1, flipY: !1, scaleX: 1, scaleY: 1, minScaleLimit: 0, skewX: 0, skewY: 0, originX: B, originY: dt, strokeWidth: 1, strokeUniform: !1, padding: 0, opacity: 1, paintFirst: Q, fill: "rgb(0,0,0)", fillRule: "nonzero", stroke: null, strokeDashArray: null, strokeDashOffset: 0, strokeLineCap: "butt", strokeLineJoin: "miter", strokeMiterLimit: 4, globalCompositeOperation: "source-over", backgroundColor: "", shadow: null, visible: !0, includeDefaultValues: !0, excludeFromExport: !1, objectCaching: !0, clipPath: void 0, inverted: !1, absolutePositioned: !1, centeredRotation: !0, centeredScaling: !1, dirty: !0 }, Dr = (a, t, e, s) => (a < Math.abs(t) ? (a = t, s = e / 4) : s = t === 0 && a === 0 ? e / Gt * Math.asin(1) : e / Gt * Math.asin(t / a), { a, c: t, p: e, s }), gn = (a, t, e, s, r) => a * Math.pow(2, 10 * (s -= 1)) * Math.sin((s * r - t) * Gt / e), go = (a, t, e, s) => -e * Math.cos(a / s * ee) + e + t, qr = (a, t, e, s) => (a /= s) < 1 / 2.75 ? e * (7.5625 * a * a) + t : a < 2 / 2.75 ? e * (7.5625 * (a -= 1.5 / 2.75) * a + 0.75) + t : a < 2.5 / 2.75 ? e * (7.5625 * (a -= 2.25 / 2.75) * a + 0.9375) + t : e * (7.5625 * (a -= 2.625 / 2.75) * a + 0.984375) + t, dn = (a, t, e, s) => e - qr(s - a, 0, e, s) + t;
var oh = Object.freeze({ __proto__: null, defaultEasing: go, easeInBack: function(a, t, e, s) {
  let r = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 1.70158;
  return e * (a /= s) * a * ((r + 1) * a - r) + t;
}, easeInBounce: dn, easeInCirc: (a, t, e, s) => -e * (Math.sqrt(1 - (a /= s) * a) - 1) + t, easeInCubic: (a, t, e, s) => e * L(a / s, 3) + t, easeInElastic: (a, t, e, s) => {
  const r = e;
  let i = 0;
  if (a === 0) return t;
  if ((a /= s) === 1) return t + e;
  i || (i = 0.3 * s);
  const { a: n, s: o, p: h } = Dr(r, e, i, 1.70158);
  return -gn(n, o, h, a, s) + t;
}, easeInExpo: (a, t, e, s) => a === 0 ? t : e * L(2, 10 * (a / s - 1)) + t, easeInOutBack: function(a, t, e, s) {
  let r = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 1.70158;
  return (a /= s / 2) < 1 ? e / 2 * (a * a * ((1 + (r *= 1.525)) * a - r)) + t : e / 2 * ((a -= 2) * a * ((1 + (r *= 1.525)) * a + r) + 2) + t;
}, easeInOutBounce: (a, t, e, s) => a < s / 2 ? 0.5 * dn(2 * a, 0, e, s) + t : 0.5 * qr(2 * a - s, 0, e, s) + 0.5 * e + t, easeInOutCirc: (a, t, e, s) => (a /= s / 2) < 1 ? -e / 2 * (Math.sqrt(1 - L(a, 2)) - 1) + t : e / 2 * (Math.sqrt(1 - (a -= 2) * a) + 1) + t, easeInOutCubic: (a, t, e, s) => (a /= s / 2) < 1 ? e / 2 * L(a, 3) + t : e / 2 * (L(a - 2, 3) + 2) + t, easeInOutElastic: (a, t, e, s) => {
  const r = e;
  let i = 0;
  if (a === 0) return t;
  if ((a /= s / 2) === 2) return t + e;
  i || (i = s * (0.3 * 1.5));
  const { a: n, s: o, p: h, c: l } = Dr(r, e, i, 1.70158);
  return a < 1 ? -0.5 * gn(n, o, h, a, s) + t : n * Math.pow(2, -10 * (a -= 1)) * Math.sin((a * s - o) * Gt / h) * 0.5 + l + t;
}, easeInOutExpo: (a, t, e, s) => a === 0 ? t : a === s ? t + e : (a /= s / 2) < 1 ? e / 2 * L(2, 10 * (a - 1)) + t : e / 2 * -(L(2, -10 * --a) + 2) + t, easeInOutQuad: (a, t, e, s) => (a /= s / 2) < 1 ? e / 2 * L(a, 2) + t : -e / 2 * (--a * (a - 2) - 1) + t, easeInOutQuart: (a, t, e, s) => (a /= s / 2) < 1 ? e / 2 * L(a, 4) + t : -e / 2 * ((a -= 2) * L(a, 3) - 2) + t, easeInOutQuint: (a, t, e, s) => (a /= s / 2) < 1 ? e / 2 * L(a, 5) + t : e / 2 * (L(a - 2, 5) + 2) + t, easeInOutSine: (a, t, e, s) => -e / 2 * (Math.cos(Math.PI * a / s) - 1) + t, easeInQuad: (a, t, e, s) => e * (a /= s) * a + t, easeInQuart: (a, t, e, s) => e * (a /= s) * L(a, 3) + t, easeInQuint: (a, t, e, s) => e * L(a / s, 5) + t, easeInSine: (a, t, e, s) => -e * Math.cos(a / s * ee) + e + t, easeOutBack: function(a, t, e, s) {
  let r = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : 1.70158;
  return e * ((a = a / s - 1) * a * ((r + 1) * a + r) + 1) + t;
}, easeOutBounce: qr, easeOutCirc: (a, t, e, s) => e * Math.sqrt(1 - (a = a / s - 1) * a) + t, easeOutCubic: (a, t, e, s) => e * (L(a / s - 1, 3) + 1) + t, easeOutElastic: (a, t, e, s) => {
  const r = e;
  let i = 0;
  if (a === 0) return t;
  if ((a /= s) === 1) return t + e;
  i || (i = 0.3 * s);
  const { a: n, s: o, p: h, c: l } = Dr(r, e, i, 1.70158);
  return n * L(2, -10 * a) * Math.sin((a * s - o) * Gt / h) + l + t;
}, easeOutExpo: (a, t, e, s) => a === s ? t + e : e * -(L(2, -10 * a / s) + 1) + t, easeOutQuad: (a, t, e, s) => -e * (a /= s) * (a - 2) + t, easeOutQuart: (a, t, e, s) => -e * ((a = a / s - 1) * L(a, 3) - 1) + t, easeOutQuint: (a, t, e, s) => e * (L(a / s - 1, 5) + 1) + t, easeOutSine: (a, t, e, s) => e * Math.sin(a / s * ee) + t });
const ah = () => !1;
class Di {
  constructor(t) {
    let { startValue: e, byValue: s, duration: r = 500, delay: i = 0, easing: n = go, onStart: o = ve, onChange: h = ve, onComplete: l = ve, abort: c = ah, target: u } = t;
    b(this, "_state", "pending"), b(this, "durationProgress", 0), b(this, "valueProgress", 0), this.tick = this.tick.bind(this), this.duration = r, this.delay = i, this.easing = n, this._onStart = o, this._onChange = h, this._onComplete = l, this._abort = c, this.target = u, this.startValue = e, this.byValue = s, this.value = this.startValue, this.endValue = Object.freeze(this.calculate(this.duration).value);
  }
  get state() {
    return this._state;
  }
  isDone() {
    return this._state === "aborted" || this._state === "completed";
  }
  start() {
    const t = (e) => {
      this._state === "pending" && (this.startTime = e || +/* @__PURE__ */ new Date(), this._state = "running", this._onStart(), this.tick(this.startTime));
    };
    this.register(), this.delay > 0 ? setTimeout(() => Ke(t), this.delay) : Ke(t);
  }
  tick(t) {
    const e = (t || +/* @__PURE__ */ new Date()) - this.startTime, s = Math.min(e, this.duration);
    this.durationProgress = s / this.duration;
    const { value: r, valueProgress: i } = this.calculate(s);
    this.value = Object.freeze(r), this.valueProgress = i, this._state !== "aborted" && (this._abort(this.value, this.valueProgress, this.durationProgress) ? (this._state = "aborted", this.unregister()) : e >= this.duration ? (this.durationProgress = this.valueProgress = 1, this._onChange(this.endValue, this.valueProgress, this.durationProgress), this._state = "completed", this._onComplete(this.endValue, this.valueProgress, this.durationProgress), this.unregister()) : (this._onChange(this.value, this.valueProgress, this.durationProgress), Ke(this.tick)));
  }
  register() {
    Vs.push(this);
  }
  unregister() {
    Vs.remove(this);
  }
  abort() {
    this._state = "aborted", this.unregister();
  }
}
const hh = ["startValue", "endValue"];
class lh extends Di {
  constructor(t) {
    let { startValue: e = 0, endValue: s = 100 } = t;
    super(y(y({}, H(t, hh)), {}, { startValue: e, byValue: s - e }));
  }
  calculate(t) {
    const e = this.easing(t, this.startValue, this.byValue, this.duration);
    return { value: e, valueProgress: Math.abs((e - this.startValue) / this.byValue) };
  }
}
const ch = ["startValue", "endValue"];
class uh extends Di {
  constructor(t) {
    let { startValue: e = [0], endValue: s = [100] } = t;
    super(y(y({}, H(t, ch)), {}, { startValue: e, byValue: s.map((r, i) => r - e[i]) }));
  }
  calculate(t) {
    const e = this.startValue.map((s, r) => this.easing(t, s, this.byValue[r], this.duration, r));
    return { value: e, valueProgress: Math.abs((e[0] - this.startValue[0]) / this.byValue[0]) };
  }
}
const gh = ["startValue", "endValue", "easing", "onChange", "onComplete", "abort"], dh = (a, t, e, s) => t + e * (1 - Math.cos(a / s * ee)), Ar = (a) => a && ((t, e, s) => a(new Y(t).toRgba(), e, s));
class fh extends Di {
  constructor(t) {
    let { startValue: e, endValue: s, easing: r = dh, onChange: i, onComplete: n, abort: o } = t, h = H(t, gh);
    const l = new Y(e).getSource(), c = new Y(s).getSource();
    super(y(y({}, h), {}, { startValue: l, byValue: c.map((u, g) => u - l[g]), easing: r, onChange: Ar(i), onComplete: Ar(n), abort: Ar(o) }));
  }
  calculate(t) {
    const [e, s, r, i] = this.startValue.map((o, h) => this.easing(t, o, this.byValue[h], this.duration, h)), n = [...[e, s, r].map(Math.round), be(0, i, 1)];
    return { value: n, valueProgress: n.map((o, h) => this.byValue[h] !== 0 ? Math.abs((o - this.startValue[h]) / this.byValue[h]) : 0).find((o) => o !== 0) || 0 };
  }
}
function Ai(a) {
  const t = ((e) => Array.isArray(e.startValue) || Array.isArray(e.endValue))(a) ? new uh(a) : new lh(a);
  return t.start(), t;
}
function fo(a) {
  const t = new fh(a);
  return t.start(), t;
}
class V {
  constructor(t) {
    this.status = t, this.points = [];
  }
  includes(t) {
    return this.points.some((e) => e.eq(t));
  }
  append() {
    for (var t = arguments.length, e = new Array(t), s = 0; s < t; s++) e[s] = arguments[s];
    return this.points = this.points.concat(e.filter((r) => !this.includes(r))), this;
  }
  static isPointContained(t, e, s) {
    let r = arguments.length > 3 && arguments[3] !== void 0 && arguments[3];
    if (e.eq(s)) return t.eq(e);
    if (e.x === s.x) return t.x === e.x && (r || t.y >= Math.min(e.y, s.y) && t.y <= Math.max(e.y, s.y));
    if (e.y === s.y) return t.y === e.y && (r || t.x >= Math.min(e.x, s.x) && t.x <= Math.max(e.x, s.x));
    {
      const i = Gs(e, s), n = Gs(e, t).divide(i);
      return r ? Math.abs(n.x) === Math.abs(n.y) : n.x === n.y && n.x >= 0 && n.x <= 1;
    }
  }
  static isPointInPolygon(t, e) {
    const s = new _(t).setX(Math.min(t.x - 1, ...e.map((i) => i.x)));
    let r = 0;
    for (let i = 0; i < e.length; i++) {
      const n = this.intersectSegmentSegment(e[i], e[(i + 1) % e.length], t, s);
      if (n.includes(t)) return !0;
      r += +(n.status === "Intersection");
    }
    return r % 2 == 1;
  }
  static intersectLineLine(t, e, s, r) {
    let i = !(arguments.length > 4 && arguments[4] !== void 0) || arguments[4], n = !(arguments.length > 5 && arguments[5] !== void 0) || arguments[5];
    const o = e.x - t.x, h = e.y - t.y, l = r.x - s.x, c = r.y - s.y, u = t.x - s.x, g = t.y - s.y, d = l * g - c * u, f = o * g - h * u, p = c * o - l * h;
    if (p !== 0) {
      const m = d / p, v = f / p;
      return (i || 0 <= m && m <= 1) && (n || 0 <= v && v <= 1) ? new V("Intersection").append(new _(t.x + m * o, t.y + m * h)) : new V();
    }
    if (d === 0 || f === 0) {
      const m = i || n || V.isPointContained(t, s, r) || V.isPointContained(e, s, r) || V.isPointContained(s, t, e) || V.isPointContained(r, t, e);
      return new V(m ? "Coincident" : void 0);
    }
    return new V("Parallel");
  }
  static intersectSegmentLine(t, e, s, r) {
    return V.intersectLineLine(t, e, s, r, !1, !0);
  }
  static intersectSegmentSegment(t, e, s, r) {
    return V.intersectLineLine(t, e, s, r, !1, !1);
  }
  static intersectLinePolygon(t, e, s) {
    let r = !(arguments.length > 3 && arguments[3] !== void 0) || arguments[3];
    const i = new V(), n = s.length;
    for (let o, h, l, c = 0; c < n; c++) {
      if (o = s[c], h = s[(c + 1) % n], l = V.intersectLineLine(t, e, o, h, r, !1), l.status === "Coincident") return l;
      i.append(...l.points);
    }
    return i.points.length > 0 && (i.status = "Intersection"), i;
  }
  static intersectSegmentPolygon(t, e, s) {
    return V.intersectLinePolygon(t, e, s, !1);
  }
  static intersectPolygonPolygon(t, e) {
    const s = new V(), r = t.length, i = [];
    for (let n = 0; n < r; n++) {
      const o = t[n], h = t[(n + 1) % r], l = V.intersectSegmentPolygon(o, h, e);
      l.status === "Coincident" ? (i.push(l), s.append(o, h)) : s.append(...l.points);
    }
    return i.length > 0 && i.length === t.length ? new V("Coincident") : (s.points.length > 0 && (s.status = "Intersection"), s);
  }
  static intersectPolygonRectangle(t, e, s) {
    const r = e.min(s), i = e.max(s), n = new _(i.x, r.y), o = new _(r.x, i.y);
    return V.intersectPolygonPolygon(t, [r, n, i, o]);
  }
}
class ph extends Vn {
  getX() {
    return this.getXY().x;
  }
  setX(t) {
    this.setXY(this.getXY().setX(t));
  }
  getY() {
    return this.getXY().y;
  }
  setY(t) {
    this.setXY(this.getXY().setY(t));
  }
  getRelativeX() {
    return this.left;
  }
  setRelativeX(t) {
    this.left = t;
  }
  getRelativeY() {
    return this.top;
  }
  setRelativeY(t) {
    this.top = t;
  }
  getXY() {
    const t = this.getRelativeXY();
    return this.group ? st(t, this.group.calcTransformMatrix()) : t;
  }
  setXY(t, e, s) {
    this.group && (t = st(t, gt(this.group.calcTransformMatrix()))), this.setRelativeXY(t, e, s);
  }
  getRelativeXY() {
    return new _(this.left, this.top);
  }
  setRelativeXY(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : this.originX, s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : this.originY;
    this.setPositionByOrigin(t, e, s);
  }
  isStrokeAccountedForInDimensions() {
    return !1;
  }
  getCoords() {
    const { tl: t, tr: e, br: s, bl: r } = this.aCoords || (this.aCoords = this.calcACoords()), i = [t, e, s, r];
    if (this.group) {
      const n = this.group.calcTransformMatrix();
      return i.map((o) => st(o, n));
    }
    return i;
  }
  intersectsWithRect(t, e) {
    return V.intersectPolygonRectangle(this.getCoords(), t, e).status === "Intersection";
  }
  intersectsWithObject(t) {
    const e = V.intersectPolygonPolygon(this.getCoords(), t.getCoords());
    return e.status === "Intersection" || e.status === "Coincident" || t.isContainedWithinObject(this) || this.isContainedWithinObject(t);
  }
  isContainedWithinObject(t) {
    return this.getCoords().every((e) => t.containsPoint(e));
  }
  isContainedWithinRect(t, e) {
    const { left: s, top: r, width: i, height: n } = this.getBoundingRect();
    return s >= t.x && s + i <= e.x && r >= t.y && r + n <= e.y;
  }
  isOverlapping(t) {
    return this.intersectsWithObject(t) || this.isContainedWithinObject(t) || t.isContainedWithinObject(this);
  }
  containsPoint(t) {
    return V.isPointInPolygon(t, this.getCoords());
  }
  isOnScreen() {
    if (!this.canvas) return !1;
    const { tl: t, br: e } = this.canvas.vptCoords;
    return !!this.getCoords().some((s) => s.x <= e.x && s.x >= t.x && s.y <= e.y && s.y >= t.y) || !!this.intersectsWithRect(t, e) || this.containsPoint(t.midPointFrom(e));
  }
  isPartiallyOnScreen() {
    if (!this.canvas) return !1;
    const { tl: t, br: e } = this.canvas.vptCoords;
    return this.intersectsWithRect(t, e) ? !0 : this.getCoords().every((s) => (s.x >= e.x || s.x <= t.x) && (s.y >= e.y || s.y <= t.y)) && this.containsPoint(t.midPointFrom(e));
  }
  getBoundingRect() {
    return Lt(this.getCoords());
  }
  getScaledWidth() {
    return this._getTransformedDimensions().x;
  }
  getScaledHeight() {
    return this._getTransformedDimensions().y;
  }
  scale(t) {
    this._set(ct, t), this._set(vt, t), this.setCoords();
  }
  scaleToWidth(t) {
    const e = this.getBoundingRect().width / this.getScaledWidth();
    return this.scale(t / this.width / e);
  }
  scaleToHeight(t) {
    const e = this.getBoundingRect().height / this.getScaledHeight();
    return this.scale(t / this.height / e);
  }
  getCanvasRetinaScaling() {
    var t;
    return ((t = this.canvas) === null || t === void 0 ? void 0 : t.getRetinaScaling()) || 1;
  }
  getTotalAngle() {
    return this.group ? re(Zn(this.calcTransformMatrix())) : this.angle;
  }
  getViewportTransform() {
    var t;
    return ((t = this.canvas) === null || t === void 0 ? void 0 : t.viewportTransform) || lt.concat();
  }
  calcACoords() {
    const t = Ye({ angle: this.angle }), { x: e, y: s } = this.getRelativeCenterPoint(), r = Be(e, s), i = U(r, t), n = this._getTransformedDimensions(), o = n.x / 2, h = n.y / 2;
    return { tl: st({ x: -o, y: -h }, i), tr: st({ x: o, y: -h }, i), bl: st({ x: -o, y: h }, i), br: st({ x: o, y: h }, i) };
  }
  setCoords() {
    this.aCoords = this.calcACoords();
  }
  transformMatrixKey() {
    let t = arguments.length > 0 && arguments[0] !== void 0 && arguments[0], e = [];
    return !t && this.group && (e = this.group.transformMatrixKey(t)), e.push(this.top, this.left, this.width, this.height, this.scaleX, this.scaleY, this.angle, this.strokeWidth, this.skewX, this.skewY, +this.flipX, +this.flipY, K(this.originX), K(this.originY)), e;
  }
  calcTransformMatrix() {
    let t = arguments.length > 0 && arguments[0] !== void 0 && arguments[0], e = this.calcOwnMatrix();
    if (t || !this.group) return e;
    const s = this.transformMatrixKey(t), r = this.matrixCache;
    return r && r.key.every((i, n) => i === s[n]) ? r.value : (this.group && (e = U(this.group.calcTransformMatrix(!1), e)), this.matrixCache = { key: s, value: e }, e);
  }
  calcOwnMatrix() {
    const t = this.transformMatrixKey(!0), e = this.ownMatrixCache;
    if (e && e.key === t) return e.value;
    const s = this.getRelativeCenterPoint(), r = { angle: this.angle, translateX: s.x, translateY: s.y, scaleX: this.scaleX, scaleY: this.scaleY, skewX: this.skewX, skewY: this.skewY, flipX: this.flipX, flipY: this.flipY }, i = qn(r);
    return this.ownMatrixCache = { key: t, value: i }, i;
  }
  _getNonTransformedDimensions() {
    return new _(this.width, this.height).scalarAdd(this.strokeWidth);
  }
  _calculateCurrentDimensions(t) {
    return this._getTransformedDimensions(t).transform(this.getViewportTransform(), !0).scalarAdd(2 * this.padding);
  }
  _getTransformedDimensions() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    const e = y({ scaleX: this.scaleX, scaleY: this.scaleY, skewX: this.skewX, skewY: this.skewY, width: this.width, height: this.height, strokeWidth: this.strokeWidth }, t), s = e.strokeWidth;
    let r = s, i = 0;
    this.strokeUniform && (r = 0, i = s);
    const n = e.width + r, o = e.height + r;
    let h;
    return h = e.skewX === 0 && e.skewY === 0 ? new _(n * e.scaleX, o * e.scaleY) : dr(n, o, is(e)), h.scalarAdd(i);
  }
  translateToGivenOrigin(t, e, s, r, i) {
    let n = t.x, o = t.y;
    const h = K(r) - K(e), l = K(i) - K(s);
    if (h || l) {
      const c = this._getTransformedDimensions();
      n += h * c.x, o += l * c.y;
    }
    return new _(n, o);
  }
  translateToCenterPoint(t, e, s) {
    if (e === P && s === P) return t;
    const r = this.translateToGivenOrigin(t, e, s, P, P);
    return this.angle ? r.rotate(X(this.angle), t) : r;
  }
  translateToOriginPoint(t, e, s) {
    const r = this.translateToGivenOrigin(t, P, P, e, s);
    return this.angle ? r.rotate(X(this.angle), t) : r;
  }
  getCenterPoint() {
    const t = this.getRelativeCenterPoint();
    return this.group ? st(t, this.group.calcTransformMatrix()) : t;
  }
  getRelativeCenterPoint() {
    return this.translateToCenterPoint(new _(this.left, this.top), this.originX, this.originY);
  }
  getPointByOrigin(t, e) {
    return this.translateToOriginPoint(this.getRelativeCenterPoint(), t, e);
  }
  setPositionByOrigin(t, e, s) {
    const r = this.translateToCenterPoint(t, e, s), i = this.translateToOriginPoint(r, this.originX, this.originY);
    this.set({ left: i.x, top: i.y });
  }
  _getLeftTopCoords() {
    return this.translateToOriginPoint(this.getRelativeCenterPoint(), B, dt);
  }
}
const mh = ["type"], vh = ["extraParam"];
let Nt = class Bs extends ph {
  static getDefaults() {
    return Bs.ownDefaults;
  }
  get type() {
    const t = this.constructor.type;
    return t === "FabricObject" ? "object" : t.toLowerCase();
  }
  set type(t) {
    Xt("warn", "Setting type has no effect", t);
  }
  constructor(t) {
    super(), b(this, "_cacheContext", null), Object.assign(this, Bs.ownDefaults), this.setOptions(t);
  }
  _createCacheCanvas() {
    this._cacheCanvas = _t(), this._cacheContext = this._cacheCanvas.getContext("2d"), this._updateCacheCanvas(), this.dirty = !0;
  }
  _limitCacheSize(t) {
    const e = t.width, s = t.height, r = N.maxCacheSideLimit, i = N.minCacheSideLimit;
    if (e <= r && s <= r && e * s <= N.perfLimitSizeTotal) return e < i && (t.width = i), s < i && (t.height = i), t;
    const n = e / s, [o, h] = Ze.limitDimsByArea(n), l = be(i, o, r), c = be(i, h, r);
    return e > l && (t.zoomX /= e / l, t.width = l, t.capped = !0), s > c && (t.zoomY /= s / c, t.height = c, t.capped = !0), t;
  }
  _getCacheCanvasDimensions() {
    const t = this.getTotalObjectScaling(), e = this._getTransformedDimensions({ skewX: 0, skewY: 0 }), s = e.x * t.x / this.scaleX, r = e.y * t.y / this.scaleY;
    return { width: Math.ceil(s + 2), height: Math.ceil(r + 2), zoomX: t.x, zoomY: t.y, x: s, y: r };
  }
  _updateCacheCanvas() {
    const t = this._cacheCanvas, e = this._cacheContext, { width: s, height: r, zoomX: i, zoomY: n, x: o, y: h } = this._limitCacheSize(this._getCacheCanvasDimensions()), l = s !== t.width || r !== t.height, c = this.zoomX !== i || this.zoomY !== n;
    if (!t || !e) return !1;
    if (l || c) {
      s !== t.width || r !== t.height ? (t.width = s, t.height = r) : (e.setTransform(1, 0, 0, 1, 0, 0), e.clearRect(0, 0, t.width, t.height));
      const u = o / 2, g = h / 2;
      return this.cacheTranslationX = Math.round(t.width / 2 - u) + u, this.cacheTranslationY = Math.round(t.height / 2 - g) + g, e.translate(this.cacheTranslationX, this.cacheTranslationY), e.scale(i, n), this.zoomX = i, this.zoomY = n, !0;
    }
    return !1;
  }
  setOptions() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    this._setOptions(t);
  }
  transform(t) {
    const e = this.group && !this.group._transformDone || this.group && this.canvas && t === this.canvas.contextTop, s = this.calcTransformMatrix(!e);
    t.transform(s[0], s[1], s[2], s[3], s[4], s[5]);
  }
  getObjectScaling() {
    if (!this.group) return new _(Math.abs(this.scaleX), Math.abs(this.scaleY));
    const t = ye(this.calcTransformMatrix());
    return new _(Math.abs(t.scaleX), Math.abs(t.scaleY));
  }
  getTotalObjectScaling() {
    const t = this.getObjectScaling();
    if (this.canvas) {
      const e = this.canvas.getZoom(), s = this.getCanvasRetinaScaling();
      return t.scalarMultiply(e * s);
    }
    return t;
  }
  getObjectOpacity() {
    let t = this.opacity;
    return this.group && (t *= this.group.getObjectOpacity()), t;
  }
  _constrainScale(t) {
    return Math.abs(t) < this.minScaleLimit ? t < 0 ? -this.minScaleLimit : this.minScaleLimit : t === 0 ? 1e-4 : t;
  }
  _set(t, e) {
    t !== ct && t !== vt || (e = this._constrainScale(e)), t === ct && e < 0 ? (this.flipX = !this.flipX, e *= -1) : t === "scaleY" && e < 0 ? (this.flipY = !this.flipY, e *= -1) : t !== "shadow" || !e || e instanceof Vt || (e = new Vt(e));
    const s = this[t] !== e;
    return this[t] = e, s && this.constructor.cacheProperties.includes(t) && (this.dirty = !0), this.parent && (this.dirty || s && this.constructor.stateProperties.includes(t)) && this.parent._set("dirty", !0), this;
  }
  isNotVisible() {
    return this.opacity === 0 || !this.width && !this.height && this.strokeWidth === 0 || !this.visible;
  }
  render(t) {
    this.isNotVisible() || this.canvas && this.canvas.skipOffscreen && !this.group && !this.isOnScreen() || (t.save(), this._setupCompositeOperation(t), this.drawSelectionBackground(t), this.transform(t), this._setOpacity(t), this._setShadow(t), this.shouldCache() ? (this.renderCache(), this.drawCacheOnCanvas(t)) : (this._removeCacheCanvas(), this.drawObject(t, !1, {}), this.dirty = !1), t.restore());
  }
  drawSelectionBackground(t) {
  }
  renderCache(t) {
    if (t = t || {}, this._cacheCanvas && this._cacheContext || this._createCacheCanvas(), this.isCacheDirty() && this._cacheContext) {
      const { zoomX: e, zoomY: s, cacheTranslationX: r, cacheTranslationY: i } = this, { width: n, height: o } = this._cacheCanvas;
      this.drawObject(this._cacheContext, t.forClipping, { zoomX: e, zoomY: s, cacheTranslationX: r, cacheTranslationY: i, width: n, height: o, parentClipPaths: [] }), this.dirty = !1;
    }
  }
  _removeCacheCanvas() {
    this._cacheCanvas = void 0, this._cacheContext = null;
  }
  hasStroke() {
    return this.stroke && this.stroke !== "transparent" && this.strokeWidth !== 0;
  }
  hasFill() {
    return this.fill && this.fill !== "transparent";
  }
  needsItsOwnCache() {
    return !!(this.paintFirst === ht && this.hasFill() && this.hasStroke() && this.shadow) || !!this.clipPath;
  }
  shouldCache() {
    return this.ownCaching = this.needsItsOwnCache() || this.objectCaching && (!this.parent || !this.parent.isOnACache()), this.ownCaching;
  }
  willDrawShadow() {
    return !!this.shadow && (this.shadow.offsetX !== 0 || this.shadow.offsetY !== 0);
  }
  drawClipPathOnCache(t, e, s) {
    t.save(), e.inverted ? t.globalCompositeOperation = "destination-out" : t.globalCompositeOperation = "destination-in", t.setTransform(1, 0, 0, 1, 0, 0), t.drawImage(s, 0, 0), t.restore();
  }
  drawObject(t, e, s) {
    const r = this.fill, i = this.stroke;
    e ? (this.fill = "black", this.stroke = "", this._setClippingProperties(t)) : this._renderBackground(t), this._render(t), this._drawClipPath(t, this.clipPath, s), this.fill = r, this.stroke = i;
  }
  createClipPathLayer(t, e) {
    const s = Dt(e), r = s.getContext("2d");
    if (r.translate(e.cacheTranslationX, e.cacheTranslationY), r.scale(e.zoomX, e.zoomY), t._cacheCanvas = s, e.parentClipPaths.forEach((i) => {
      i.transform(r);
    }), e.parentClipPaths.push(t), t.absolutePositioned) {
      const i = gt(this.calcTransformMatrix());
      r.transform(i[0], i[1], i[2], i[3], i[4], i[5]);
    }
    return t.transform(r), t.drawObject(r, !0, e), s;
  }
  _drawClipPath(t, e, s) {
    if (!e) return;
    e._transformDone = !0;
    const r = this.createClipPathLayer(e, s);
    this.drawClipPathOnCache(t, e, r);
  }
  drawCacheOnCanvas(t) {
    t.scale(1 / this.zoomX, 1 / this.zoomY), t.drawImage(this._cacheCanvas, -this.cacheTranslationX, -this.cacheTranslationY);
  }
  isCacheDirty() {
    let t = arguments.length > 0 && arguments[0] !== void 0 && arguments[0];
    if (this.isNotVisible()) return !1;
    const e = this._cacheCanvas, s = this._cacheContext;
    return !(!e || !s || t || !this._updateCacheCanvas()) || !!(this.dirty || this.clipPath && this.clipPath.absolutePositioned) && (e && s && !t && (s.save(), s.setTransform(1, 0, 0, 1, 0, 0), s.clearRect(0, 0, e.width, e.height), s.restore()), !0);
  }
  _renderBackground(t) {
    if (!this.backgroundColor) return;
    const e = this._getNonTransformedDimensions();
    t.fillStyle = this.backgroundColor, t.fillRect(-e.x / 2, -e.y / 2, e.x, e.y), this._removeShadow(t);
  }
  _setOpacity(t) {
    this.group && !this.group._transformDone ? t.globalAlpha = this.getObjectOpacity() : t.globalAlpha *= this.opacity;
  }
  _setStrokeStyles(t, e) {
    const s = e.stroke;
    s && (t.lineWidth = e.strokeWidth, t.lineCap = e.strokeLineCap, t.lineDashOffset = e.strokeDashOffset, t.lineJoin = e.strokeLineJoin, t.miterLimit = e.strokeMiterLimit, bt(s) ? s.gradientUnits === "percentage" || s.gradientTransform || s.patternTransform ? this._applyPatternForTransformedGradient(t, s) : (t.strokeStyle = s.toLive(t), this._applyPatternGradientTransform(t, s)) : t.strokeStyle = e.stroke);
  }
  _setFillStyles(t, e) {
    let { fill: s } = e;
    s && (bt(s) ? (t.fillStyle = s.toLive(t), this._applyPatternGradientTransform(t, s)) : t.fillStyle = s);
  }
  _setClippingProperties(t) {
    t.globalAlpha = 1, t.strokeStyle = "transparent", t.fillStyle = "#000000";
  }
  _setLineDash(t, e) {
    e && e.length !== 0 && t.setLineDash(e);
  }
  _setShadow(t) {
    if (!this.shadow) return;
    const e = this.shadow, s = this.canvas, r = this.getCanvasRetinaScaling(), [i, , , n] = (s == null ? void 0 : s.viewportTransform) || lt, o = i * r, h = n * r, l = e.nonScaling ? new _(1, 1) : this.getObjectScaling();
    t.shadowColor = e.color, t.shadowBlur = e.blur * N.browserShadowBlurConstant * (o + h) * (l.x + l.y) / 4, t.shadowOffsetX = e.offsetX * o * l.x, t.shadowOffsetY = e.offsetY * h * l.y;
  }
  _removeShadow(t) {
    this.shadow && (t.shadowColor = "", t.shadowBlur = t.shadowOffsetX = t.shadowOffsetY = 0);
  }
  _applyPatternGradientTransform(t, e) {
    if (!bt(e)) return { offsetX: 0, offsetY: 0 };
    const s = e.gradientTransform || e.patternTransform, r = -this.width / 2 + e.offsetX || 0, i = -this.height / 2 + e.offsetY || 0;
    return e.gradientUnits === "percentage" ? t.transform(this.width, 0, 0, this.height, r, i) : t.transform(1, 0, 0, 1, r, i), s && t.transform(s[0], s[1], s[2], s[3], s[4], s[5]), { offsetX: r, offsetY: i };
  }
  _renderPaintInOrder(t) {
    this.paintFirst === ht ? (this._renderStroke(t), this._renderFill(t)) : (this._renderFill(t), this._renderStroke(t));
  }
  _render(t) {
  }
  _renderFill(t) {
    this.fill && (t.save(), this._setFillStyles(t, this), this.fillRule === "evenodd" ? t.fill("evenodd") : t.fill(), t.restore());
  }
  _renderStroke(t) {
    if (this.stroke && this.strokeWidth !== 0) {
      if (this.shadow && !this.shadow.affectStroke && this._removeShadow(t), t.save(), this.strokeUniform) {
        const e = this.getObjectScaling();
        t.scale(1 / e.x, 1 / e.y);
      }
      this._setLineDash(t, this.strokeDashArray), this._setStrokeStyles(t, this), t.stroke(), t.restore();
    }
  }
  _applyPatternForTransformedGradient(t, e) {
    var s;
    const r = this._limitCacheSize(this._getCacheCanvasDimensions()), i = this.getCanvasRetinaScaling(), n = r.x / this.scaleX / i, o = r.y / this.scaleY / i, h = Dt({ width: Math.ceil(n), height: Math.ceil(o) }), l = h.getContext("2d");
    l && (l.beginPath(), l.moveTo(0, 0), l.lineTo(n, 0), l.lineTo(n, o), l.lineTo(0, o), l.closePath(), l.translate(n / 2, o / 2), l.scale(r.zoomX / this.scaleX / i, r.zoomY / this.scaleY / i), this._applyPatternGradientTransform(l, e), l.fillStyle = e.toLive(t), l.fill(), t.translate(-this.width / 2 - this.strokeWidth / 2, -this.height / 2 - this.strokeWidth / 2), t.scale(i * this.scaleX / r.zoomX, i * this.scaleY / r.zoomY), t.strokeStyle = (s = l.createPattern(h, "no-repeat")) !== null && s !== void 0 ? s : "");
  }
  _findCenterFromElement() {
    return new _(this.left + this.width / 2, this.top + this.height / 2);
  }
  clone(t) {
    const e = this.toObject(t);
    return this.constructor.fromObject(e);
  }
  cloneAsImage(t) {
    const e = this.toCanvasElement(t);
    return new (D.getClass("image"))(e);
  }
  toCanvasElement() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    const e = xi(this), s = this.group, r = this.shadow, i = Math.abs, n = t.enableRetinaScaling ? Rn() : 1, o = (t.multiplier || 1) * n, h = t.canvasProvider || ((C) => new os(C, { enableRetinaScaling: !1, renderOnAddRemove: !1, skipOffscreen: !1 }));
    delete this.group, t.withoutTransform && ro(this), t.withoutShadow && (this.shadow = null), t.viewportTransform && Gr(this, this.getViewportTransform()), this.setCoords();
    const l = _t(), c = this.getBoundingRect(), u = this.shadow, g = new _();
    if (u) {
      const C = u.blur, w = u.nonScaling ? new _(1, 1) : this.getObjectScaling();
      g.x = 2 * Math.round(i(u.offsetX) + C) * i(w.x), g.y = 2 * Math.round(i(u.offsetY) + C) * i(w.y);
    }
    const d = c.width + g.x, f = c.height + g.y;
    l.width = Math.ceil(d), l.height = Math.ceil(f);
    const p = h(l);
    t.format === "jpeg" && (p.backgroundColor = "#fff"), this.setPositionByOrigin(new _(p.width / 2, p.height / 2), P, P);
    const m = this.canvas;
    p._objects = [this], this.set("canvas", p), this.setCoords();
    const v = p.toCanvasElement(o || 1, t);
    return this.set("canvas", m), this.shadow = r, s && (this.group = s), this.set(e), this.setCoords(), p._objects = [], p.destroy(), v;
  }
  toDataURL() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    return bi(this.toCanvasElement(t), t.format || "png", t.quality || 1);
  }
  isType() {
    for (var t = arguments.length, e = new Array(t), s = 0; s < t; s++) e[s] = arguments[s];
    return e.includes(this.constructor.type) || e.includes(this.type);
  }
  complexity() {
    return 1;
  }
  toJSON() {
    return this.toObject();
  }
  rotate(t) {
    const { centeredRotation: e, originX: s, originY: r } = this;
    if (e) {
      const { x: i, y: n } = this.getRelativeCenterPoint();
      this.originX = P, this.originY = P, this.left = i, this.top = n;
    }
    if (this.set("angle", t), e) {
      const { x: i, y: n } = this.translateToOriginPoint(this.getRelativeCenterPoint(), s, r);
      this.left = i, this.top = n, this.originX = s, this.originY = r;
    }
  }
  setOnGroup() {
  }
  _setupCompositeOperation(t) {
    this.globalCompositeOperation && (t.globalCompositeOperation = this.globalCompositeOperation);
  }
  dispose() {
    Vs.cancelByTarget(this), this.off(), this._set("canvas", void 0), this._cacheCanvas && Pt().dispose(this._cacheCanvas), this._cacheCanvas = void 0, this._cacheContext = null;
  }
  animate(t, e) {
    return Object.entries(t).reduce((s, r) => {
      let [i, n] = r;
      return s[i] = this._animate(i, n, e), s;
    }, {});
  }
  _animate(t, e) {
    let s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    const r = t.split("."), i = this.constructor.colorProperties.includes(r[r.length - 1]), { abort: n, startValue: o, onChange: h, onComplete: l } = s, c = y(y({}, s), {}, { target: this, startValue: o != null ? o : r.reduce((u, g) => u[g], this), endValue: e, abort: n == null ? void 0 : n.bind(this), onChange: (u, g, d) => {
      r.reduce((f, p, m) => (m === r.length - 1 && (f[p] = u), f[p]), this), h && h(u, g, d);
    }, onComplete: (u, g, d) => {
      this.setCoords(), l && l(u, g, d);
    } });
    return i ? fo(c) : Ai(c);
  }
  isDescendantOf(t) {
    const { parent: e, group: s } = this;
    return e === t || s === t || !!e && e.isDescendantOf(t) || !!s && s !== e && s.isDescendantOf(t);
  }
  getAncestors() {
    const t = [];
    let e = this;
    do
      e = e.parent, e && t.push(e);
    while (e);
    return t;
  }
  findCommonAncestors(t) {
    if (this === t) return { fork: [], otherFork: [], common: [this, ...this.getAncestors()] };
    const e = this.getAncestors(), s = t.getAncestors();
    if (e.length === 0 && s.length > 0 && this === s[s.length - 1]) return { fork: [], otherFork: [t, ...s.slice(0, s.length - 1)], common: [this] };
    for (let r, i = 0; i < e.length; i++) {
      if (r = e[i], r === t) return { fork: [this, ...e.slice(0, i)], otherFork: [], common: e.slice(i) };
      for (let n = 0; n < s.length; n++) {
        if (this === s[n]) return { fork: [], otherFork: [t, ...s.slice(0, n)], common: [this, ...e] };
        if (r === s[n]) return { fork: [this, ...e.slice(0, i)], otherFork: [t, ...s.slice(0, n)], common: e.slice(i) };
      }
    }
    return { fork: [this, ...e], otherFork: [t, ...s], common: [] };
  }
  hasCommonAncestors(t) {
    const e = this.findCommonAncestors(t);
    return e && !!e.common.length;
  }
  isInFrontOf(t) {
    if (this === t) return;
    const e = this.findCommonAncestors(t);
    if (e.fork.includes(t)) return !0;
    if (e.otherFork.includes(this)) return !1;
    const s = e.common[0] || this.canvas;
    if (!s) return;
    const r = e.fork.pop(), i = e.otherFork.pop(), n = s._objects.indexOf(r), o = s._objects.indexOf(i);
    return n > -1 && n > o;
  }
  toObject() {
    const t = (arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : []).concat(Bs.customProperties, this.constructor.customProperties || []);
    let e;
    const s = N.NUM_FRACTION_DIGITS, { clipPath: r, fill: i, stroke: n, shadow: o, strokeDashArray: h, left: l, top: c, originX: u, originY: g, width: d, height: f, strokeWidth: p, strokeLineCap: m, strokeDashOffset: v, strokeLineJoin: C, strokeUniform: w, strokeMiterLimit: S, scaleX: x, scaleY: M, angle: O, flipX: T, flipY: j, opacity: I, visible: A, backgroundColor: E, fillRule: k, paintFirst: F, globalCompositeOperation: et, skewX: G, skewY: ut } = this;
    r && !r.excludeFromExport && (e = r.toObject(t.concat("inverted", "absolutePositioned")));
    const W = (Ft) => z(Ft, s), At = y(y({}, _e(this, t)), {}, { type: this.constructor.type, version: Hr, originX: u, originY: g, left: W(l), top: W(c), width: W(d), height: W(f), fill: sn(i) ? i.toObject() : i, stroke: sn(n) ? n.toObject() : n, strokeWidth: W(p), strokeDashArray: h && h.concat(), strokeLineCap: m, strokeDashOffset: v, strokeLineJoin: C, strokeUniform: w, strokeMiterLimit: W(S), scaleX: W(x), scaleY: W(M), angle: W(O), flipX: T, flipY: j, opacity: W(I), shadow: o && o.toObject(), visible: A, backgroundColor: E, fillRule: k, paintFirst: F, globalCompositeOperation: et, skewX: W(G), skewY: W(ut) }, e ? { clipPath: e } : null);
    return this.includeDefaultValues ? At : this._removeDefaultValues(At);
  }
  toDatalessObject(t) {
    return this.toObject(t);
  }
  _removeDefaultValues(t) {
    const e = this.constructor.getDefaults(), s = Object.keys(e).length > 0 ? e : Object.getPrototypeOf(this);
    return wi(t, (r, i) => {
      if (i === B || i === dt || i === "type") return !0;
      const n = s[i];
      return r !== n && !(Array.isArray(r) && Array.isArray(n) && r.length === 0 && n.length === 0);
    });
  }
  toString() {
    return "#<".concat(this.constructor.type, ">");
  }
  static _fromObject(t) {
    let e = H(t, mh), s = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, { extraParam: r } = s, i = H(s, vh);
    return ns(e, i).then((n) => r ? (delete n[r], new this(e[r], n)) : new this(n));
  }
  static fromObject(t, e) {
    return this._fromObject(t, e);
  }
};
b(Nt, "stateProperties", ih), b(Nt, "cacheProperties", Zt), b(Nt, "ownDefaults", nh), b(Nt, "type", "FabricObject"), b(Nt, "colorProperties", [Q, ht, "backgroundColor"]), b(Nt, "customProperties", []), D.setClass(Nt), D.setClass(Nt, "object");
const ne = (a, t, e) => (s, r, i, n) => {
  const o = t(s, r, i, n);
  return o && Mi(a, y(y({}, Ti(s, r, i, n)), e)), o;
};
function Ce(a) {
  return (t, e, s, r) => {
    const { target: i, originX: n, originY: o } = e, h = i.getRelativeCenterPoint(), l = i.translateToOriginPoint(h, n, o), c = a(t, e, s, r);
    return i.setPositionByOrigin(l, e.originX, e.originY), c;
  };
}
const Qr = ne(ts, Ce((a, t, e, s) => {
  const r = fr(t, t.originX, t.originY, e, s);
  if (K(t.originX) === K(P) || K(t.originX) === K(Z) && r.x < 0 || K(t.originX) === K(B) && r.x > 0) {
    const { target: i } = t, n = i.strokeWidth / (i.strokeUniform ? i.scaleX : 1), o = no(t) ? 2 : 1, h = i.width, l = Math.abs(r.x * o / i.scaleX) - n;
    return i.set("width", Math.max(l, 1)), h !== i.width;
  }
  return !1;
}));
function po(a, t, e, s, r) {
  s = s || {};
  const i = this.sizeX || s.cornerSize || r.cornerSize, n = this.sizeY || s.cornerSize || r.cornerSize, o = s.transparentCorners !== void 0 ? s.transparentCorners : r.transparentCorners, h = o ? ht : Q, l = !o && (s.cornerStrokeColor || r.cornerStrokeColor);
  let c, u = t, g = e;
  a.save(), a.fillStyle = s.cornerColor || r.cornerColor || "", a.strokeStyle = s.cornerStrokeColor || r.cornerStrokeColor || "", i > n ? (c = i, a.scale(1, n / i), g = e * i / n) : n > i ? (c = n, a.scale(i / n, 1), u = t * n / i) : c = i, a.beginPath(), a.arc(u, g, c / 2, 0, Gt, !1), a[h](), l && a.stroke(), a.restore();
}
function mo(a, t, e, s, r) {
  s = s || {};
  const i = this.sizeX || s.cornerSize || r.cornerSize, n = this.sizeY || s.cornerSize || r.cornerSize, o = s.transparentCorners !== void 0 ? s.transparentCorners : r.transparentCorners, h = o ? ht : Q, l = !o && (s.cornerStrokeColor || r.cornerStrokeColor), c = i / 2, u = n / 2;
  a.save(), a.fillStyle = s.cornerColor || r.cornerColor || "", a.strokeStyle = s.cornerStrokeColor || r.cornerStrokeColor || "", a.translate(t, e);
  const g = r.getTotalAngle();
  a.rotate(X(g)), a["".concat(h, "Rect")](-c, -u, i, n), l && a.strokeRect(-c, -u, i, n), a.restore();
}
class pt {
  constructor(t) {
    b(this, "visible", !0), b(this, "actionName", cr), b(this, "angle", 0), b(this, "x", 0), b(this, "y", 0), b(this, "offsetX", 0), b(this, "offsetY", 0), b(this, "sizeX", 0), b(this, "sizeY", 0), b(this, "touchSizeX", 0), b(this, "touchSizeY", 0), b(this, "cursorStyle", "crosshair"), b(this, "withConnection", !1), Object.assign(this, t);
  }
  shouldActivate(t, e, s, r) {
    var i;
    let { tl: n, tr: o, br: h, bl: l } = r;
    return ((i = e.canvas) === null || i === void 0 ? void 0 : i.getActiveObject()) === e && e.isControlVisible(t) && V.isPointInPolygon(s, [n, o, h, l]);
  }
  getActionHandler(t, e, s) {
    return this.actionHandler;
  }
  getMouseDownHandler(t, e, s) {
    return this.mouseDownHandler;
  }
  getMouseUpHandler(t, e, s) {
    return this.mouseUpHandler;
  }
  cursorStyleHandler(t, e, s) {
    return e.cursorStyle;
  }
  getActionName(t, e, s) {
    return e.actionName;
  }
  getVisibility(t, e) {
    var s, r;
    return (s = (r = t._controlsVisibility) === null || r === void 0 ? void 0 : r[e]) !== null && s !== void 0 ? s : this.visible;
  }
  setVisibility(t, e, s) {
    this.visible = t;
  }
  positionHandler(t, e, s, r) {
    return new _(this.x * t.x + this.offsetX, this.y * t.y + this.offsetY).transform(e);
  }
  calcCornerCoords(t, e, s, r, i, n) {
    const o = ur([Be(s, r), Ye({ angle: t }), gr((i ? this.touchSizeX : this.sizeX) || e, (i ? this.touchSizeY : this.sizeY) || e)]);
    return { tl: new _(-0.5, -0.5).transform(o), tr: new _(0.5, -0.5).transform(o), br: new _(0.5, 0.5).transform(o), bl: new _(-0.5, 0.5).transform(o) };
  }
  render(t, e, s, r, i) {
    ((r = r || {}).cornerStyle || i.cornerStyle) === "circle" ? po.call(this, t, e, s, r, i) : mo.call(this, t, e, s, r, i);
  }
}
const vo = (a, t, e) => e.lockRotation ? Xs : t.cursorStyle, yo = ne(Yn, Ce((a, t, e, s) => {
  let { target: r, ex: i, ey: n, theta: o, originX: h, originY: l } = t;
  const c = r.translateToOriginPoint(r.getRelativeCenterPoint(), h, l);
  if (Tt(r, "lockRotation")) return !1;
  const u = Math.atan2(n - c.y, i - c.x), g = Math.atan2(s - c.y, e - c.x);
  let d = re(g - u + o);
  if (r.snapAngle && r.snapAngle > 0) {
    const p = r.snapAngle, m = r.snapThreshold || p, v = Math.ceil(d / p) * p, C = Math.floor(d / p) * p;
    Math.abs(d - C) < m ? d = C : Math.abs(d - v) < m && (d = v);
  }
  d < 0 && (d = 360 + d), d %= 360;
  const f = r.angle !== d;
  return r.angle = d, f;
}));
function bo(a, t) {
  const e = t.canvas, s = a[e.uniScaleKey];
  return e.uniformScaling && !s || !e.uniformScaling && s;
}
function _o(a, t, e) {
  const s = Tt(a, "lockScalingX"), r = Tt(a, "lockScalingY");
  if (s && r || !t && (s || r) && e || s && t === "x" || r && t === "y") return !0;
  const { width: i, height: n, strokeWidth: o } = a;
  return i === 0 && o === 0 && t !== "y" || n === 0 && o === 0 && t !== "x";
}
const yh = ["e", "se", "s", "sw", "w", "nw", "n", "ne", "e"], Me = (a, t, e) => {
  const s = bo(a, e);
  if (_o(e, t.x !== 0 && t.y === 0 ? "x" : t.x === 0 && t.y !== 0 ? "y" : "", s)) return Xs;
  const r = oo(e, t);
  return "".concat(yh[r], "-resize");
};
function Ei(a, t, e, s) {
  let r = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {};
  const i = t.target, n = r.by, o = bo(a, i);
  let h, l, c, u, g, d;
  if (_o(i, n, o)) return !1;
  if (t.gestureScale) l = t.scaleX * t.gestureScale, c = t.scaleY * t.gestureScale;
  else {
    if (h = fr(t, t.originX, t.originY, e, s), g = n !== "y" ? Math.sign(h.x || t.signX || 1) : 1, d = n !== "x" ? Math.sign(h.y || t.signY || 1) : 1, t.signX || (t.signX = g), t.signY || (t.signY = d), Tt(i, "lockScalingFlip") && (t.signX !== g || t.signY !== d)) return !1;
    if (u = i._getTransformedDimensions(), o && !n) {
      const m = Math.abs(h.x) + Math.abs(h.y), { original: v } = t, C = m / (Math.abs(u.x * v.scaleX / i.scaleX) + Math.abs(u.y * v.scaleY / i.scaleY));
      l = v.scaleX * C, c = v.scaleY * C;
    } else l = Math.abs(h.x * i.scaleX / u.x), c = Math.abs(h.y * i.scaleY / u.y);
    no(t) && (l *= 2, c *= 2), t.signX !== g && n !== "y" && (t.originX = on(t.originX), l *= -1, t.signX = g), t.signY !== d && n !== "x" && (t.originY = on(t.originY), c *= -1, t.signY = d);
  }
  const f = i.scaleX, p = i.scaleY;
  return n ? (n === "x" && i.set(ct, l), n === "y" && i.set(vt, c)) : (!Tt(i, "lockScalingX") && i.set(ct, l), !Tt(i, "lockScalingY") && i.set(vt, c)), f !== i.scaleX || p !== i.scaleY;
}
const Ue = ne(lr, Ce((a, t, e, s) => Ei(a, t, e, s))), Co = ne(lr, Ce((a, t, e, s) => Ei(a, t, e, s, { by: "x" }))), wo = ne(lr, Ce((a, t, e, s) => Ei(a, t, e, s, { by: "y" }))), bh = ["target", "ex", "ey", "skewingSide"], Er = { x: { counterAxis: "y", scale: ct, skew: Ne, lockSkewing: "lockSkewingX", origin: "originX", flip: "flipX" }, y: { counterAxis: "x", scale: vt, skew: Re, lockSkewing: "lockSkewingY", origin: "originY", flip: "flipY" } }, _h = ["ns", "nesw", "ew", "nwse"], So = (a, t, e) => {
  if (t.x !== 0 && Tt(e, "lockSkewingY") || t.y !== 0 && Tt(e, "lockSkewingX")) return Xs;
  const s = oo(e, t) % 4;
  return "".concat(_h[s], "-resize");
};
function xo(a, t, e, s, r) {
  const { target: i } = e, { counterAxis: n, origin: o, lockSkewing: h, skew: l, flip: c } = Er[a];
  if (Tt(i, h)) return !1;
  const { origin: u, flip: g } = Er[n], d = K(e[u]) * (i[g] ? -1 : 1), f = -Math.sign(d) * (i[c] ? -1 : 1), p = 0.5 * -((i[l] === 0 && fr(e, P, P, s, r)[a] > 0 || i[l] > 0 ? 1 : -1) * f) + 0.5;
  return ne(Wn, Ce((v, C, w, S) => function(x, M, O) {
    let { target: T, ex: j, ey: I, skewingSide: A } = M, E = H(M, bh);
    const { skew: k } = Er[x], F = O.subtract(new _(j, I)).divide(new _(T.scaleX, T.scaleY))[x], et = T[k], G = E[k], ut = Math.tan(X(G)), W = x === "y" ? T._getTransformedDimensions({ scaleX: 1, scaleY: 1, skewX: 0 }).x : T._getTransformedDimensions({ scaleX: 1, scaleY: 1 }).y, At = 2 * F * A / Math.max(W, 1) + ut, Ft = re(Math.atan(At));
    T.set(k, Ft);
    const ls = et !== T[k];
    if (ls && x === "y") {
      const { skewX: Sr, scaleX: We } = T, qt = T._getTransformedDimensions({ skewY: et }), cs = T._getTransformedDimensions(), ae = Sr !== 0 ? qt.x / cs.x : 1;
      ae !== 1 && T.set(ct, ae * We);
    }
    return ls;
  }(a, C, new _(w, S))))(t, y(y({}, e), {}, { [o]: p, skewingSide: f }), s, r);
}
const Mo = (a, t, e, s) => xo("x", a, t, e, s), To = (a, t, e, s) => xo("y", a, t, e, s);
function vr(a, t) {
  return a[t.canvas.altActionKey];
}
const Xe = (a, t, e) => {
  const s = vr(a, e);
  return t.x === 0 ? s ? Ne : vt : t.y === 0 ? s ? Re : ct : "";
}, ge = (a, t, e) => vr(a, e) ? So(0, t, e) : Me(a, t, e), $r = (a, t, e, s) => vr(a, t.target) ? To(a, t, e, s) : Co(a, t, e, s), Jr = (a, t, e, s) => vr(a, t.target) ? Mo(a, t, e, s) : wo(a, t, e, s), ki = () => ({ ml: new pt({ x: -0.5, y: 0, cursorStyleHandler: ge, actionHandler: $r, getActionName: Xe }), mr: new pt({ x: 0.5, y: 0, cursorStyleHandler: ge, actionHandler: $r, getActionName: Xe }), mb: new pt({ x: 0, y: 0.5, cursorStyleHandler: ge, actionHandler: Jr, getActionName: Xe }), mt: new pt({ x: 0, y: -0.5, cursorStyleHandler: ge, actionHandler: Jr, getActionName: Xe }), tl: new pt({ x: -0.5, y: -0.5, cursorStyleHandler: Me, actionHandler: Ue }), tr: new pt({ x: 0.5, y: -0.5, cursorStyleHandler: Me, actionHandler: Ue }), bl: new pt({ x: -0.5, y: 0.5, cursorStyleHandler: Me, actionHandler: Ue }), br: new pt({ x: 0.5, y: 0.5, cursorStyleHandler: Me, actionHandler: Ue }), mtr: new pt({ x: 0, y: -0.5, actionHandler: yo, cursorStyleHandler: vo, offsetY: -40, withConnection: !0, actionName: vi }) }), Oo = () => ({ mr: new pt({ x: 0.5, y: 0, actionHandler: Qr, cursorStyleHandler: ge, actionName: ts }), ml: new pt({ x: -0.5, y: 0, actionHandler: Qr, cursorStyleHandler: ge, actionName: ts }) }), jo = () => y(y({}, ki()), Oo());
class Le extends Nt {
  static getDefaults() {
    return y(y({}, super.getDefaults()), Le.ownDefaults);
  }
  constructor(t) {
    super(), Object.assign(this, this.constructor.createControls(), Le.ownDefaults), this.setOptions(t);
  }
  static createControls() {
    return { controls: ki() };
  }
  _updateCacheCanvas() {
    const t = this.canvas;
    if (this.noScaleCache && t && t._currentTransform) {
      const e = t._currentTransform, s = e.target, r = e.action;
      if (this === s && r && r.startsWith(cr)) return !1;
    }
    return super._updateCacheCanvas();
  }
  getActiveControl() {
    const t = this.__corner;
    return t ? { key: t, control: this.controls[t], coord: this.oCoords[t] } : void 0;
  }
  findControl(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 && arguments[1];
    if (!this.hasControls || !this.canvas) return;
    this.__corner = void 0;
    const s = Object.entries(this.oCoords);
    for (let r = s.length - 1; r >= 0; r--) {
      const [i, n] = s[r], o = this.controls[i];
      if (o.shouldActivate(i, this, t, e ? n.touchCorner : n.corner)) return this.__corner = i, { key: i, control: o, coord: this.oCoords[i] };
    }
  }
  calcOCoords() {
    const t = this.getViewportTransform(), e = this.getCenterPoint(), s = Be(e.x, e.y), r = Ye({ angle: this.getTotalAngle() - (this.group && this.flipX ? 180 : 0) }), i = U(s, r), n = U(t, i), o = U(n, [1 / t[0], 0, 0, 1 / t[3], 0, 0]), h = this.group ? ye(this.calcTransformMatrix()) : void 0;
    h && (h.scaleX = Math.abs(h.scaleX), h.scaleY = Math.abs(h.scaleY));
    const l = this._calculateCurrentDimensions(h), c = {};
    return this.forEachControl((u, g) => {
      const d = u.positionHandler(l, o, this, u);
      c[g] = Object.assign(d, this._calcCornerCoords(u, d));
    }), c;
  }
  _calcCornerCoords(t, e) {
    const s = this.getTotalAngle();
    return { corner: t.calcCornerCoords(s, this.cornerSize, e.x, e.y, !1, this), touchCorner: t.calcCornerCoords(s, this.touchCornerSize, e.x, e.y, !0, this) };
  }
  setCoords() {
    super.setCoords(), this.canvas && (this.oCoords = this.calcOCoords());
  }
  forEachControl(t) {
    for (const e in this.controls) t(this.controls[e], e, this);
  }
  drawSelectionBackground(t) {
    if (!this.selectionBackgroundColor || this.canvas && this.canvas._activeObject !== this) return;
    t.save();
    const e = this.getRelativeCenterPoint(), s = this._calculateCurrentDimensions(), r = this.getViewportTransform();
    t.translate(e.x, e.y), t.scale(1 / r[0], 1 / r[3]), t.rotate(X(this.angle)), t.fillStyle = this.selectionBackgroundColor, t.fillRect(-s.x / 2, -s.y / 2, s.x, s.y), t.restore();
  }
  strokeBorders(t, e) {
    t.strokeRect(-e.x / 2, -e.y / 2, e.x, e.y);
  }
  _drawBorders(t, e) {
    let s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    const r = y({ hasControls: this.hasControls, borderColor: this.borderColor, borderDashArray: this.borderDashArray }, s);
    t.save(), t.strokeStyle = r.borderColor, this._setLineDash(t, r.borderDashArray), this.strokeBorders(t, e), r.hasControls && this.drawControlsConnectingLines(t, e), t.restore();
  }
  _renderControls(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const { hasBorders: s, hasControls: r } = this, i = y({ hasBorders: s, hasControls: r }, e), n = this.getViewportTransform(), o = i.hasBorders, h = i.hasControls, l = U(n, this.calcTransformMatrix()), c = ye(l);
    t.save(), t.translate(c.translateX, c.translateY), t.lineWidth = this.borderScaleFactor, this.group === this.parent && (t.globalAlpha = this.isMoving ? this.borderOpacityWhenMoving : 1), this.flipX && (c.angle -= 180), t.rotate(X(this.group ? c.angle : this.angle)), o && this.drawBorders(t, c, e), h && this.drawControls(t, e), t.restore();
  }
  drawBorders(t, e, s) {
    let r;
    if (s && s.forActiveSelection || this.group) {
      const i = dr(this.width, this.height, is(e)), n = this.isStrokeAccountedForInDimensions() ? yi : (this.strokeUniform ? new _().scalarAdd(this.canvas ? this.canvas.getZoom() : 1) : new _(e.scaleX, e.scaleY)).scalarMultiply(this.strokeWidth);
      r = i.add(n).scalarAdd(this.borderScaleFactor).scalarAdd(2 * this.padding);
    } else r = this._calculateCurrentDimensions().scalarAdd(this.borderScaleFactor);
    this._drawBorders(t, r, s);
  }
  drawControlsConnectingLines(t, e) {
    let s = !1;
    t.beginPath(), this.forEachControl((r, i) => {
      r.withConnection && r.getVisibility(this, i) && (s = !0, t.moveTo(r.x * e.x, r.y * e.y), t.lineTo(r.x * e.x + r.offsetX, r.y * e.y + r.offsetY));
    }), s && t.stroke();
  }
  drawControls(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    t.save();
    const s = this.getCanvasRetinaScaling(), { cornerStrokeColor: r, cornerDashArray: i, cornerColor: n } = this, o = y({ cornerStrokeColor: r, cornerDashArray: i, cornerColor: n }, e);
    t.setTransform(s, 0, 0, s, 0, 0), t.strokeStyle = t.fillStyle = o.cornerColor, this.transparentCorners || (t.strokeStyle = o.cornerStrokeColor), this._setLineDash(t, o.cornerDashArray), this.forEachControl((h, l) => {
      if (h.getVisibility(this, l)) {
        const c = this.oCoords[l];
        h.render(t, c.x, c.y, o, this);
      }
    }), t.restore();
  }
  isControlVisible(t) {
    return this.controls[t] && this.controls[t].getVisibility(this, t);
  }
  setControlVisible(t, e) {
    this._controlsVisibility || (this._controlsVisibility = {}), this._controlsVisibility[t] = e;
  }
  setControlsVisibility() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    Object.entries(t).forEach((e) => {
      let [s, r] = e;
      return this.setControlVisible(s, r);
    });
  }
  clearContextTop(t) {
    if (!this.canvas) return;
    const e = this.canvas.contextTop;
    if (!e) return;
    const s = this.canvas.viewportTransform;
    e.save(), e.transform(s[0], s[1], s[2], s[3], s[4], s[5]), this.transform(e);
    const r = this.width + 4, i = this.height + 4;
    return e.clearRect(-r / 2, -i / 2, r, i), t || e.restore(), e;
  }
  onDeselect(t) {
    return !1;
  }
  onSelect(t) {
    return !1;
  }
  shouldStartDragging(t) {
    return !1;
  }
  onDragStart(t) {
    return !1;
  }
  canDrop(t) {
    return !1;
  }
  renderDragSourceEffect(t) {
  }
  renderDropTargetEffect(t) {
  }
}
function Do(a, t) {
  return t.forEach((e) => {
    Object.getOwnPropertyNames(e.prototype).forEach((s) => {
      s !== "constructor" && Object.defineProperty(a.prototype, s, Object.getOwnPropertyDescriptor(e.prototype, s) || /* @__PURE__ */ Object.create(null));
    });
  }), a;
}
b(Le, "ownDefaults", { noScaleCache: !0, lockMovementX: !1, lockMovementY: !1, lockRotation: !1, lockScalingX: !1, lockScalingY: !1, lockSkewingX: !1, lockSkewingY: !1, lockScalingFlip: !1, cornerSize: 13, touchCornerSize: 24, transparentCorners: !0, cornerColor: "rgb(178,204,255)", cornerStrokeColor: "", cornerStyle: "rect", cornerDashArray: null, hasControls: !0, borderColor: "rgb(178,204,255)", borderDashArray: null, borderOpacityWhenMoving: 0.4, borderScaleFactor: 1, hasBorders: !0, selectionBackgroundColor: "", selectable: !0, evented: !0, perPixelTargetFind: !1, activeOn: "down", hoverCursor: null, moveCursor: null });
class rt extends Le {
}
Do(rt, [ho]), D.setClass(rt), D.setClass(rt, "object");
const Ao = (a, t, e, s) => {
  const r = 2 * (s = Math.round(s)) + 1, { data: i } = a.getImageData(t - s, e - s, r, r);
  for (let n = 3; n < i.length; n += 4)
    if (i[n] > 0) return !1;
  return !0;
};
class Eo {
  constructor(t) {
    this.options = t, this.strokeProjectionMagnitude = this.options.strokeWidth / 2, this.scale = new _(this.options.scaleX, this.options.scaleY), this.strokeUniformScalar = this.options.strokeUniform ? new _(1 / this.options.scaleX, 1 / this.options.scaleY) : new _(1, 1);
  }
  createSideVector(t, e) {
    const s = Gs(t, e);
    return this.options.strokeUniform ? s.multiply(this.scale) : s;
  }
  projectOrthogonally(t, e, s) {
    return this.applySkew(t.add(this.calcOrthogonalProjection(t, e, s)));
  }
  isSkewed() {
    return this.options.skewX !== 0 || this.options.skewY !== 0;
  }
  applySkew(t) {
    const e = new _(t);
    return e.y += e.x * Math.tan(X(this.options.skewY)), e.x += e.y * Math.tan(X(this.options.skewX)), e;
  }
  scaleUnitVector(t, e) {
    return t.multiply(this.strokeUniformScalar).scalarMultiply(e);
  }
}
const Ch = new _();
class De extends Eo {
  static getOrthogonalRotationFactor(t, e) {
    const s = e ? Ks(t, e) : co(t);
    return Math.abs(s) < ee ? -1 : 1;
  }
  constructor(t, e, s, r) {
    super(r), b(this, "AB", void 0), b(this, "AC", void 0), b(this, "alpha", void 0), b(this, "bisector", void 0), this.A = new _(t), this.B = new _(e), this.C = new _(s), this.AB = this.createSideVector(this.A, this.B), this.AC = this.createSideVector(this.A, this.C), this.alpha = Ks(this.AB, this.AC), this.bisector = mr(Oi(this.AB.eq(Ch) ? this.AC : this.AB, this.alpha / 2));
  }
  calcOrthogonalProjection(t, e) {
    let s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : this.strokeProjectionMagnitude;
    const r = this.createSideVector(t, e), i = ji(r), n = De.getOrthogonalRotationFactor(i, this.bisector);
    return this.scaleUnitVector(i, s * n);
  }
  projectBevel() {
    const t = [];
    return (this.alpha % Gt == 0 ? [this.B] : [this.B, this.C]).forEach((e) => {
      t.push(this.projectOrthogonally(this.A, e)), t.push(this.projectOrthogonally(this.A, e, -this.strokeProjectionMagnitude));
    }), t;
  }
  projectMiter() {
    const t = [], e = Math.abs(this.alpha), s = 1 / Math.sin(e / 2), r = this.scaleUnitVector(this.bisector, -this.strokeProjectionMagnitude * s), i = this.options.strokeUniform ? Zs(this.scaleUnitVector(this.bisector, this.options.strokeMiterLimit)) : this.options.strokeMiterLimit;
    return Zs(r) / this.strokeProjectionMagnitude <= i && t.push(this.applySkew(this.A.add(r))), t.push(...this.projectBevel()), t;
  }
  projectRoundNoSkew(t, e) {
    const s = [], r = new _(De.getOrthogonalRotationFactor(this.bisector), De.getOrthogonalRotationFactor(new _(this.bisector.y, this.bisector.x)));
    return [new _(1, 0).scalarMultiply(this.strokeProjectionMagnitude).multiply(this.strokeUniformScalar).multiply(r), new _(0, 1).scalarMultiply(this.strokeProjectionMagnitude).multiply(this.strokeUniformScalar).multiply(r)].forEach((i) => {
      Kr(i, t, e) && s.push(this.A.add(i));
    }), s;
  }
  projectRoundWithSkew(t, e) {
    const s = [], { skewX: r, skewY: i, scaleX: n, scaleY: o, strokeUniform: h } = this.options, l = new _(Math.tan(X(r)), Math.tan(X(i))), c = this.strokeProjectionMagnitude, u = h ? c / o / Math.sqrt(1 / L(o, 2) + 1 / L(n, 2) * L(l.y, 2)) : c / Math.sqrt(1 + L(l.y, 2)), g = new _(Math.sqrt(Math.max(L(c, 2) - L(u, 2), 0)), u), d = h ? c / Math.sqrt(1 + L(l.x, 2) * L(1 / o, 2) / L(1 / n + 1 / n * l.x * l.y, 2)) : c / Math.sqrt(1 + L(l.x, 2) / L(1 + l.x * l.y, 2)), f = new _(d, Math.sqrt(Math.max(L(c, 2) - L(d, 2), 0)));
    return [f, f.scalarMultiply(-1), g, g.scalarMultiply(-1)].map((p) => this.applySkew(h ? p.multiply(this.strokeUniformScalar) : p)).forEach((p) => {
      Kr(p, t, e) && s.push(this.applySkew(this.A).add(p));
    }), s;
  }
  projectRound() {
    const t = [];
    t.push(...this.projectBevel());
    const e = this.alpha % Gt == 0, s = this.applySkew(this.A), r = t[e ? 0 : 2].subtract(s), i = t[e ? 1 : 0].subtract(s), n = e ? this.applySkew(this.AB.scalarMultiply(-1)) : this.applySkew(this.bisector.multiply(this.strokeUniformScalar).scalarMultiply(-1)), o = je(r, n) > 0, h = o ? r : i, l = o ? i : r;
    return this.isSkewed() ? t.push(...this.projectRoundWithSkew(h, l)) : t.push(...this.projectRoundNoSkew(h, l)), t;
  }
  projectPoints() {
    switch (this.options.strokeLineJoin) {
      case "miter":
        return this.projectMiter();
      case "round":
        return this.projectRound();
      default:
        return this.projectBevel();
    }
  }
  project() {
    return this.projectPoints().map((t) => ({ originPoint: this.A, projectedPoint: t, angle: this.alpha, bisector: this.bisector }));
  }
}
class fn extends Eo {
  constructor(t, e, s) {
    super(s), this.A = new _(t), this.T = new _(e);
  }
  calcOrthogonalProjection(t, e) {
    let s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : this.strokeProjectionMagnitude;
    const r = this.createSideVector(t, e);
    return this.scaleUnitVector(ji(r), s);
  }
  projectButt() {
    return [this.projectOrthogonally(this.A, this.T, this.strokeProjectionMagnitude), this.projectOrthogonally(this.A, this.T, -this.strokeProjectionMagnitude)];
  }
  projectRound() {
    const t = [];
    if (!this.isSkewed() && this.A.eq(this.T)) {
      const e = new _(1, 1).scalarMultiply(this.strokeProjectionMagnitude).multiply(this.strokeUniformScalar);
      t.push(this.applySkew(this.A.add(e)), this.applySkew(this.A.subtract(e)));
    } else t.push(...new De(this.A, this.T, this.T, this.options).projectRound());
    return t;
  }
  projectSquare() {
    const t = [];
    if (this.A.eq(this.T)) {
      const e = new _(1, 1).scalarMultiply(this.strokeProjectionMagnitude).multiply(this.strokeUniformScalar);
      t.push(this.A.add(e), this.A.subtract(e));
    } else {
      const e = this.calcOrthogonalProjection(this.A, this.T, this.strokeProjectionMagnitude), s = this.scaleUnitVector(mr(this.createSideVector(this.A, this.T)), -this.strokeProjectionMagnitude), r = this.A.add(s);
      t.push(r.add(e), r.subtract(e));
    }
    return t.map((e) => this.applySkew(e));
  }
  projectPoints() {
    switch (this.options.strokeLineCap) {
      case "round":
        return this.projectRound();
      case "square":
        return this.projectSquare();
      default:
        return this.projectButt();
    }
  }
  project() {
    return this.projectPoints().map((t) => ({ originPoint: this.A, projectedPoint: t }));
  }
}
const ko = function(a, t) {
  let e = arguments.length > 2 && arguments[2] !== void 0 && arguments[2];
  const s = [];
  if (a.length === 0) return s;
  const r = a.reduce((i, n) => (i[i.length - 1].eq(n) || i.push(new _(n)), i), [new _(a[0])]);
  if (r.length === 1) e = !0;
  else if (!e) {
    const i = r[0], n = ((o, h) => {
      for (let l = o.length - 1; l >= 0; l--) if (h(o[l], l, o)) return l;
      return -1;
    })(r, (o) => !o.eq(i));
    r.splice(n + 1);
  }
  return r.forEach((i, n, o) => {
    let h, l;
    n === 0 ? (l = o[1], h = e ? i : o[o.length - 1]) : n === o.length - 1 ? (h = o[n - 1], l = e ? i : o[0]) : (h = o[n - 1], l = o[n + 1]), e && o.length === 1 ? s.push(...new fn(i, i, t).project()) : !e || n !== 0 && n !== o.length - 1 ? s.push(...new De(i, h, l, t).project()) : s.push(...new fn(i, n === 0 ? l : h, t).project());
  }), s;
}, Ii = (a) => {
  const t = {};
  return Object.keys(a).forEach((e) => {
    t[e] = {}, Object.keys(a[e]).forEach((s) => {
      t[e][s] = y({}, a[e][s]);
    });
  }), t;
}, Io = (a) => a.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/</g, "&lt;").replace(/>/g, "&gt;"), yr = (a) => {
  const t = [];
  for (let e, s = 0; s < a.length; s++) (e = wh(a, s)) !== !1 && t.push(e);
  return t;
}, wh = (a, t) => {
  const e = a.charCodeAt(t);
  if (isNaN(e)) return "";
  if (e < 55296 || e > 57343) return a.charAt(t);
  if (55296 <= e && e <= 56319) {
    if (a.length <= t + 1) throw "High surrogate without following low surrogate";
    const r = a.charCodeAt(t + 1);
    if (56320 > r || r > 57343) throw "High surrogate without following low surrogate";
    return a.charAt(t) + a.charAt(t + 1);
  }
  if (t === 0) throw "Low surrogate without preceding high surrogate";
  const s = a.charCodeAt(t - 1);
  if (55296 > s || s > 56319) throw "Low surrogate without preceding high surrogate";
  return !1;
};
var Sh = Object.freeze({ __proto__: null, capitalize: function(a) {
  let t = arguments.length > 1 && arguments[1] !== void 0 && arguments[1];
  return "".concat(a.charAt(0).toUpperCase()).concat(t ? a.slice(1) : a.slice(1).toLowerCase());
}, escapeXml: Io, graphemeSplit: yr });
const br = function(a, t) {
  let e = arguments.length > 2 && arguments[2] !== void 0 && arguments[2];
  return a.fill !== t.fill || a.stroke !== t.stroke || a.strokeWidth !== t.strokeWidth || a.fontSize !== t.fontSize || a.fontFamily !== t.fontFamily || a.fontWeight !== t.fontWeight || a.fontStyle !== t.fontStyle || a.textBackgroundColor !== t.textBackgroundColor || a.deltaY !== t.deltaY || e && (a.overline !== t.overline || a.underline !== t.underline || a.linethrough !== t.linethrough);
}, Lo = (a, t) => {
  const e = t.split(`
`), s = [];
  let r = -1, i = {};
  a = Ii(a);
  for (let n = 0; n < e.length; n++) {
    const o = yr(e[n]);
    if (a[n]) for (let h = 0; h < o.length; h++) {
      r++;
      const l = a[n][h];
      l && Object.keys(l).length > 0 && (br(i, l, !0) ? s.push({ start: r, end: r + 1, style: l }) : s[s.length - 1].end++), i = l || {};
    }
    else r += o.length, i = {};
  }
  return s;
}, Po = (a, t) => {
  if (!Array.isArray(a)) return Ii(a);
  const e = t.split(mi), s = {};
  let r = -1, i = 0;
  for (let n = 0; n < e.length; n++) {
    const o = yr(e[n]);
    for (let h = 0; h < o.length; h++) r++, a[i] && a[i].start <= r && r < a[i].end && (s[n] = s[n] || {}, s[n][h] = y({}, a[i].style), r === a[i].end - 1 && i++);
  }
  return s;
}, oe = ["display", "transform", Q, "fill-opacity", "fill-rule", "opacity", ht, "stroke-dasharray", "stroke-linecap", "stroke-dashoffset", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke-width", "id", "paint-order", "vector-effect", "instantiated_by_use", "clip-path"];
function pn(a, t) {
  const e = a.nodeName, s = a.getAttribute("class"), r = a.getAttribute("id"), i = "(?![a-zA-Z\\-]+)";
  let n;
  if (n = new RegExp("^" + e, "i"), t = t.replace(n, ""), r && t.length && (n = new RegExp("#" + r + i, "i"), t = t.replace(n, "")), s && t.length) {
    const o = s.split(" ");
    for (let h = o.length; h--; ) n = new RegExp("\\." + o[h] + i, "i"), t = t.replace(n, "");
  }
  return t.length === 0;
}
function xh(a, t) {
  let e = !0;
  const s = pn(a, t.pop());
  return s && t.length && (e = function(r, i) {
    let n, o = !0;
    for (; r.parentElement && r.parentElement.nodeType === 1 && i.length; ) o && (n = i.pop()), o = pn(r = r.parentElement, n);
    return i.length === 0;
  }(a, t)), s && e && t.length === 0;
}
const Mh = (a) => {
  var t;
  return (t = th[a]) !== null && t !== void 0 ? t : a;
}, Th = new RegExp("(".concat(Mt, ")"), "gi"), Oh = (a) => a.replace(Th, " $1 ").replace(/,/gi, " ").replace(/\s+/gi, " ");
var mn, vn, yn, bn, _n, Cn, wn;
const ot = "(".concat(Mt, ")"), jh = String.raw(mn || (mn = ie(["(skewX)(", ")"], ["(skewX)\\(", "\\)"])), ot), Dh = String.raw(vn || (vn = ie(["(skewY)(", ")"], ["(skewY)\\(", "\\)"])), ot), Ah = String.raw(yn || (yn = ie(["(rotate)(", "(?: ", " ", ")?)"], ["(rotate)\\(", "(?: ", " ", ")?\\)"])), ot, ot, ot), Eh = String.raw(bn || (bn = ie(["(scale)(", "(?: ", ")?)"], ["(scale)\\(", "(?: ", ")?\\)"])), ot, ot), kh = String.raw(_n || (_n = ie(["(translate)(", "(?: ", ")?)"], ["(translate)\\(", "(?: ", ")?\\)"])), ot, ot), Ih = String.raw(Cn || (Cn = ie(["(matrix)(", " ", " ", " ", " ", " ", ")"], ["(matrix)\\(", " ", " ", " ", " ", " ", "\\)"])), ot, ot, ot, ot, ot, ot), Li = "(?:".concat(Ih, "|").concat(kh, "|").concat(Ah, "|").concat(Eh, "|").concat(jh, "|").concat(Dh, ")"), Lh = "(?:".concat(Li, "*)"), Ph = String.raw(wn || (wn = ie(["^s*(?:", "?)s*$"], ["^\\s*(?:", "?)\\s*$"])), Lh), Fh = new RegExp(Ph), Nh = new RegExp(Li), Rh = new RegExp(Li, "g");
function qs(a) {
  const t = [];
  if (!(a = Oh(a).replace(/\s*([()])\s*/gi, "$1")) || a && !Fh.test(a)) return [...lt];
  for (const e of a.matchAll(Rh)) {
    const s = Nh.exec(e[0]);
    if (!s) continue;
    let r = lt;
    const i = s.filter((f) => !!f), [, n, ...o] = i, [h, l, c, u, g, d] = o.map((f) => parseFloat(f));
    switch (n) {
      case "translate":
        r = Be(h, l);
        break;
      case vi:
        r = Ye({ angle: h }, { x: l, y: c });
        break;
      case cr:
        r = gr(h, l);
        break;
      case Ne:
        r = _i(h);
        break;
      case Re:
        r = Ci(h);
        break;
      case "matrix":
        r = [h, l, c, u, g, d];
    }
    t.push(r);
  }
  return ur(t);
}
function Bh(a, t, e, s) {
  const r = Array.isArray(t);
  let i, n = t;
  if (a !== Q && a !== ht || t !== at) {
    if (a === "strokeUniform") return t === "non-scaling-stroke";
    if (a === "strokeDashArray") n = t === at ? null : t.replace(/,/g, " ").split(/\s+/).map(parseFloat);
    else if (a === "transformMatrix") n = e && e.transformMatrix ? U(e.transformMatrix, qs(t)) : qs(t);
    else if (a === "visible") n = t !== at && t !== "hidden", e && e.visible === !1 && (n = !1);
    else if (a === "opacity") n = parseFloat(t), e && e.opacity !== void 0 && (n *= e.opacity);
    else if (a === "textAnchor") n = t === "start" ? B : t === "end" ? Z : P;
    else if (a === "charSpacing") i = nt(t, s) / s * 1e3;
    else if (a === "paintFirst") {
      const o = t.indexOf(Q), h = t.indexOf(ht);
      n = Q, (o > -1 && h > -1 && h < o || o === -1 && h > -1) && (n = ht);
    } else {
      if (a === "href" || a === "xlink:href" || a === "font" || a === "id") return t;
      if (a === "imageSmoothing") return t === "optimizeQuality";
      i = r ? t.map(nt) : nt(t, s);
    }
  } else n = "";
  return !r && isNaN(i) ? n : i;
}
function Yh(a, t) {
  const e = a.match(Ja);
  if (!e) return;
  const s = e[1], r = e[3], i = e[4], n = e[5], o = e[6];
  s && (t.fontStyle = s), r && (t.fontWeight = isNaN(parseFloat(r)) ? r : parseFloat(r)), i && (t.fontSize = nt(i)), o && (t.fontFamily = o), n && (t.lineHeight = n === "normal" ? 1 : n);
}
function ti(a, t) {
  a.replace(/;\s*$/, "").split(";").forEach((e) => {
    if (!e) return;
    const [s, r] = e.split(":");
    t[s.trim().toLowerCase()] = r.trim();
  });
}
function Wh(a) {
  const t = {}, e = a.getAttribute("style");
  return e && (typeof e == "string" ? ti(e, t) : function(s, r) {
    Object.entries(s).forEach((i) => {
      let [n, o] = i;
      o !== void 0 && (r[n.toLowerCase()] = o);
    });
  }(e, t)), t;
}
const zh = { stroke: "strokeOpacity", fill: "fillOpacity" };
function Kt(a, t, e) {
  if (!a) return {};
  let s, r = {}, i = pi;
  a.parentNode && hn.test(a.parentNode.nodeName) && (r = Kt(a.parentElement, t, e), r.fontSize && (s = i = nt(r.fontSize)));
  const n = y(y(y({}, t.reduce((l, c) => {
    const u = a.getAttribute(c);
    return u && (l[c] = u), l;
  }, {})), function(l) {
    let c = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, u = {};
    for (const g in c) xh(l, g.split(" ")) && (u = y(y({}, u), c[g]));
    return u;
  }(a, e)), Wh(a));
  n[jr] && a.setAttribute(jr, n[jr]), n[Or] && (s = nt(n[Or], i), n[Or] = "".concat(s));
  const o = {};
  for (const l in n) {
    const c = Mh(l), u = Bh(c, n[l], r, s);
    o[c] = u;
  }
  o && o.font && Yh(o.font, o);
  const h = y(y({}, r), o);
  return hn.test(a.nodeName) ? h : function(l) {
    const c = rt.getDefaults();
    return Object.entries(zh).forEach((u) => {
      let [g, d] = u;
      if (l[d] === void 0 || l[g] === "") return;
      if (l[g] === void 0) {
        if (!c[g]) return;
        l[g] = c[g];
      }
      if (l[g].indexOf("url(") === 0) return;
      const f = new Y(l[g]);
      l[g] = f.setAlpha(z(f.getAlpha() * l[d], 2)).toRgba();
    }), l;
  }(h);
}
const Hh = ["left", "top", "width", "height", "visible"], Fo = ["rx", "ry"];
class St extends rt {
  static getDefaults() {
    return y(y({}, super.getDefaults()), St.ownDefaults);
  }
  constructor(t) {
    super(), Object.assign(this, St.ownDefaults), this.setOptions(t), this._initRxRy();
  }
  _initRxRy() {
    const { rx: t, ry: e } = this;
    t && !e ? this.ry = t : e && !t && (this.rx = e);
  }
  _render(t) {
    const { width: e, height: s } = this, r = -e / 2, i = -s / 2, n = this.rx ? Math.min(this.rx, e / 2) : 0, o = this.ry ? Math.min(this.ry, s / 2) : 0, h = n !== 0 || o !== 0;
    t.beginPath(), t.moveTo(r + n, i), t.lineTo(r + e - n, i), h && t.bezierCurveTo(r + e - $t * n, i, r + e, i + $t * o, r + e, i + o), t.lineTo(r + e, i + s - o), h && t.bezierCurveTo(r + e, i + s - $t * o, r + e - $t * n, i + s, r + e - n, i + s), t.lineTo(r + n, i + s), h && t.bezierCurveTo(r + $t * n, i + s, r, i + s - $t * o, r, i + s - o), t.lineTo(r, i + o), h && t.bezierCurveTo(r, i + $t * o, r + $t * n, i, r + n, i), t.closePath(), this._renderPaintInOrder(t);
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    return super.toObject([...Fo, ...t]);
  }
  _toSVG() {
    const { width: t, height: e, rx: s, ry: r } = this;
    return ["<rect ", "COMMON_PARTS", 'x="'.concat(-t / 2, '" y="').concat(-e / 2, '" rx="').concat(s, '" ry="').concat(r, '" width="').concat(t, '" height="').concat(e, `" />
`)];
  }
  static fromElement(t, e, s) {
    return R(this, null, function* () {
      const r = Kt(t, this.ATTRIBUTE_NAMES, s), { left: i = 0, top: n = 0, width: o = 0, height: h = 0, visible: l = !0 } = r, c = H(r, Hh);
      return new this(y(y(y({}, e), c), {}, { left: i, top: n, width: o, height: h, visible: !!(l && o && h) }));
    });
  }
}
b(St, "type", "Rect"), b(St, "cacheProperties", [...Zt, ...Fo]), b(St, "ownDefaults", { rx: 0, ry: 0 }), b(St, "ATTRIBUTE_NAMES", [...oe, "x", "y", "rx", "ry", "width", "height"]), D.setClass(St), D.setSVGClass(St);
const Wt = "initialization", Qs = "added", Pi = "removed", $s = "imperative", No = (a, t) => {
  const { strokeUniform: e, strokeWidth: s, width: r, height: i, group: n } = t, o = n && n !== a ? as(n.calcTransformMatrix(), a.calcTransformMatrix()) : null, h = o ? t.getRelativeCenterPoint().transform(o) : t.getRelativeCenterPoint(), l = !t.isStrokeAccountedForInDimensions(), c = e && l ? io(new _(s, s), void 0, a.calcTransformMatrix()) : yi, u = !e && l ? s : 0, g = dr(r + u, i + u, ur([o, t.calcOwnMatrix()], !0)).add(c).scalarDivide(2);
  return [h.subtract(g), h.add(g)];
};
class _r {
  calcLayoutResult(t, e) {
    if (this.shouldPerformLayout(t)) return this.calcBoundingBox(e, t);
  }
  shouldPerformLayout(t) {
    let { type: e, prevStrategy: s, strategy: r } = t;
    return e === Wt || e === $s || !!s && r !== s;
  }
  shouldLayoutClipPath(t) {
    let { type: e, target: { clipPath: s } } = t;
    return e !== Wt && s && !s.absolutePositioned;
  }
  getInitialSize(t, e) {
    return e.size;
  }
  calcBoundingBox(t, e) {
    const { type: s, target: r } = e;
    if (s === $s && e.overrides) return e.overrides;
    if (t.length === 0) return;
    const { left: i, top: n, width: o, height: h } = Lt(t.map((u) => No(r, u)).reduce((u, g) => u.concat(g), [])), l = new _(o, h), c = new _(i, n).add(l.scalarDivide(2));
    if (s === Wt) {
      const u = this.getInitialSize(e, { size: l, center: c });
      return { center: c, relativeCorrection: new _(0, 0), size: u };
    }
    return { center: c.transform(r.calcOwnMatrix()), size: l };
  }
}
b(_r, "type", "strategy");
class ei extends _r {
  shouldPerformLayout(t) {
    return !0;
  }
}
b(ei, "type", "fit-content"), D.setClass(ei);
const Vh = ["strategy"], Uh = ["target", "strategy", "bubbles", "prevStrategy"], Ro = "layoutManager";
class rs {
  constructor() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : new ei();
    b(this, "strategy", void 0), this.strategy = t, this._subscriptions = /* @__PURE__ */ new Map();
  }
  performLayout(t) {
    const e = y(y({ bubbles: !0, strategy: this.strategy }, t), {}, { prevStrategy: this._prevLayoutStrategy, stopPropagation() {
      this.bubbles = !1;
    } });
    this.onBeforeLayout(e);
    const s = this.getLayoutResult(e);
    s && this.commitLayout(e, s), this.onAfterLayout(e, s), this._prevLayoutStrategy = e.strategy;
  }
  attachHandlers(t, e) {
    const { target: s } = e;
    return [Hs, Bn, ts, Yn, lr, Wn, zs, zn, Xa].map((r) => t.on(r, (i) => this.performLayout(r === Hs ? { type: "object_modified", trigger: r, e: i, target: s } : { type: "object_modifying", trigger: r, e: i, target: s })));
  }
  subscribe(t, e) {
    this.unsubscribe(t, e);
    const s = this.attachHandlers(t, e);
    this._subscriptions.set(t, s);
  }
  unsubscribe(t, e) {
    (this._subscriptions.get(t) || []).forEach((s) => s()), this._subscriptions.delete(t);
  }
  unsubscribeTargets(t) {
    t.targets.forEach((e) => this.unsubscribe(e, t));
  }
  subscribeTargets(t) {
    t.targets.forEach((e) => this.subscribe(e, t));
  }
  onBeforeLayout(t) {
    const { target: e, type: s } = t, { canvas: r } = e;
    if (s === Wt || s === Qs ? this.subscribeTargets(t) : s === Pi && this.unsubscribeTargets(t), e.fire("layout:before", { context: t }), r && r.fire("object:layout:before", { target: e, context: t }), s === $s && t.deep) {
      const i = H(t, Vh);
      e.forEachObject((n) => n.layoutManager && n.layoutManager.performLayout(y(y({}, i), {}, { bubbles: !1, target: n })));
    }
  }
  getLayoutResult(t) {
    const { target: e, strategy: s, type: r } = t, i = s.calcLayoutResult(t, e.getObjects());
    if (!i) return;
    const n = r === Wt ? new _() : e.getRelativeCenterPoint(), { center: o, correction: h = new _(), relativeCorrection: l = new _() } = i, c = n.subtract(o).add(h).transform(r === Wt ? lt : gt(e.calcOwnMatrix()), !0).add(l);
    return { result: i, prevCenter: n, nextCenter: o, offset: c };
  }
  commitLayout(t, e) {
    const { target: s } = t, { result: { size: r }, nextCenter: i } = e;
    var n, o;
    s.set({ width: r.x, height: r.y }), this.layoutObjects(t, e), t.type === Wt ? s.set({ left: (n = t.x) !== null && n !== void 0 ? n : i.x + r.x * K(s.originX), top: (o = t.y) !== null && o !== void 0 ? o : i.y + r.y * K(s.originY) }) : (s.setPositionByOrigin(i, P, P), s.setCoords(), s.set("dirty", !0));
  }
  layoutObjects(t, e) {
    const { target: s } = t;
    s.forEachObject((r) => {
      r.group === s && this.layoutObject(t, e, r);
    }), t.strategy.shouldLayoutClipPath(t) && this.layoutObject(t, e, s.clipPath);
  }
  layoutObject(t, e, s) {
    let { offset: r } = e;
    s.set({ left: s.left + r.x, top: s.top + r.y });
  }
  onAfterLayout(t, e) {
    const { target: s, strategy: r, bubbles: i, prevStrategy: n } = t, o = H(t, Uh), { canvas: h } = s;
    s.fire("layout:after", { context: t, result: e }), h && h.fire("object:layout:after", { context: t, result: e, target: s });
    const l = s.parent;
    i && l != null && l.layoutManager && ((o.path || (o.path = [])).push(s), l.layoutManager.performLayout(y(y({}, o), {}, { target: l }))), s.set("dirty", !0);
  }
  dispose() {
    const { _subscriptions: t } = this;
    t.forEach((e) => e.forEach((s) => s())), t.clear();
  }
  toObject() {
    return { type: Ro, strategy: this.strategy.constructor.type };
  }
  toJSON() {
    return this.toObject();
  }
}
D.setClass(rs, Ro);
const Xh = ["type", "objects", "layoutManager"];
class Gh extends rs {
  performLayout() {
  }
}
class mt extends Hn(rt) {
  static getDefaults() {
    return y(y({}, super.getDefaults()), mt.ownDefaults);
  }
  constructor() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    super(), b(this, "_activeObjects", []), b(this, "__objectSelectionTracker", void 0), b(this, "__objectSelectionDisposer", void 0), Object.assign(this, mt.ownDefaults), this.setOptions(e), this.groupInit(t, e);
  }
  groupInit(t, e) {
    var s;
    this._objects = [...t], this.__objectSelectionTracker = this.__objectSelectionMonitor.bind(this, !0), this.__objectSelectionDisposer = this.__objectSelectionMonitor.bind(this, !1), this.forEachObject((r) => {
      this.enterGroup(r, !1);
    }), this.layoutManager = (s = e.layoutManager) !== null && s !== void 0 ? s : new rs(), this.layoutManager.performLayout({ type: Wt, target: this, targets: [...t], x: e.left, y: e.top });
  }
  canEnterGroup(t) {
    return t === this || this.isDescendantOf(t) ? (Xt("error", "Group: circular object trees are not supported, this call has no effect"), !1) : this._objects.indexOf(t) === -1 || (Xt("error", "Group: duplicate objects are not supported inside group, this call has no effect"), !1);
  }
  _filterObjectsBeforeEnteringGroup(t) {
    return t.filter((e, s, r) => this.canEnterGroup(e) && r.indexOf(e) === s);
  }
  add() {
    for (var t = arguments.length, e = new Array(t), s = 0; s < t; s++) e[s] = arguments[s];
    const r = this._filterObjectsBeforeEnteringGroup(e), i = super.add(...r);
    return this._onAfterObjectsChange(Qs, r), i;
  }
  insertAt(t) {
    for (var e = arguments.length, s = new Array(e > 1 ? e - 1 : 0), r = 1; r < e; r++) s[r - 1] = arguments[r];
    const i = this._filterObjectsBeforeEnteringGroup(s), n = super.insertAt(t, ...i);
    return this._onAfterObjectsChange(Qs, i), n;
  }
  remove() {
    const t = super.remove(...arguments);
    return this._onAfterObjectsChange(Pi, t), t;
  }
  _onObjectAdded(t) {
    this.enterGroup(t, !0), this.fire("object:added", { target: t }), t.fire("added", { target: this });
  }
  _onObjectRemoved(t, e) {
    this.exitGroup(t, e), this.fire("object:removed", { target: t }), t.fire("removed", { target: this });
  }
  _onAfterObjectsChange(t, e) {
    this.layoutManager.performLayout({ type: t, targets: e, target: this });
  }
  _onStackOrderChanged() {
    this._set("dirty", !0);
  }
  _set(t, e) {
    const s = this[t];
    return super._set(t, e), t === "canvas" && s !== e && (this._objects || []).forEach((r) => {
      r._set(t, e);
    }), this;
  }
  _shouldSetNestedCoords() {
    return this.subTargetCheck;
  }
  removeAll() {
    return this._activeObjects = [], this.remove(...this._objects);
  }
  __objectSelectionMonitor(t, e) {
    let { target: s } = e;
    const r = this._activeObjects;
    if (t) r.push(s), this._set("dirty", !0);
    else if (r.length > 0) {
      const i = r.indexOf(s);
      i > -1 && (r.splice(i, 1), this._set("dirty", !0));
    }
  }
  _watchObject(t, e) {
    t && this._watchObject(!1, e), t ? (e.on("selected", this.__objectSelectionTracker), e.on("deselected", this.__objectSelectionDisposer)) : (e.off("selected", this.__objectSelectionTracker), e.off("deselected", this.__objectSelectionDisposer));
  }
  enterGroup(t, e) {
    t.group && t.group.remove(t), t._set("parent", this), this._enterGroup(t, e);
  }
  _enterGroup(t, e) {
    e && Ie(t, U(gt(this.calcTransformMatrix()), t.calcTransformMatrix())), this._shouldSetNestedCoords() && t.setCoords(), t._set("group", this), t._set("canvas", this.canvas), this._watchObject(!0, t);
    const s = this.canvas && this.canvas.getActiveObject && this.canvas.getActiveObject();
    s && (s === t || t.isDescendantOf(s)) && this._activeObjects.push(t);
  }
  exitGroup(t, e) {
    this._exitGroup(t, e), t._set("parent", void 0), t._set("canvas", void 0);
  }
  _exitGroup(t, e) {
    t._set("group", void 0), e || (Ie(t, U(this.calcTransformMatrix(), t.calcTransformMatrix())), t.setCoords()), this._watchObject(!1, t);
    const s = this._activeObjects.length > 0 ? this._activeObjects.indexOf(t) : -1;
    s > -1 && this._activeObjects.splice(s, 1);
  }
  shouldCache() {
    const t = rt.prototype.shouldCache.call(this);
    if (t) {
      for (let e = 0; e < this._objects.length; e++) if (this._objects[e].willDrawShadow()) return this.ownCaching = !1, !1;
    }
    return t;
  }
  willDrawShadow() {
    if (super.willDrawShadow()) return !0;
    for (let t = 0; t < this._objects.length; t++) if (this._objects[t].willDrawShadow()) return !0;
    return !1;
  }
  isOnACache() {
    return this.ownCaching || !!this.parent && this.parent.isOnACache();
  }
  drawObject(t, e, s) {
    this._renderBackground(t);
    for (let i = 0; i < this._objects.length; i++) {
      var r;
      const n = this._objects[i];
      (r = this.canvas) !== null && r !== void 0 && r.preserveObjectStacking && n.group !== this ? (t.save(), t.transform(...gt(this.calcTransformMatrix())), n.render(t), t.restore()) : n.group === this && n.render(t);
    }
    this._drawClipPath(t, this.clipPath, s);
  }
  setCoords() {
    super.setCoords(), this._shouldSetNestedCoords() && this.forEachObject((t) => t.setCoords());
  }
  triggerLayout() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    this.layoutManager.performLayout(y({ target: this, type: $s }, t));
  }
  render(t) {
    this._transformDone = !0, super.render(t), this._transformDone = !1;
  }
  __serializeObjects(t, e) {
    const s = this.includeDefaultValues;
    return this._objects.filter(function(r) {
      return !r.excludeFromExport;
    }).map(function(r) {
      const i = r.includeDefaultValues;
      r.includeDefaultValues = s;
      const n = r[t || "toObject"](e);
      return r.includeDefaultValues = i, n;
    });
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    const e = this.layoutManager.toObject();
    return y(y(y({}, super.toObject(["subTargetCheck", "interactive", ...t])), e.strategy !== "fit-content" || this.includeDefaultValues ? { layoutManager: e } : {}), {}, { objects: this.__serializeObjects("toObject", t) });
  }
  toString() {
    return "#<Group: (".concat(this.complexity(), ")>");
  }
  dispose() {
    this.layoutManager.unsubscribeTargets({ targets: this.getObjects(), target: this }), this._activeObjects = [], this.forEachObject((t) => {
      this._watchObject(!1, t), t.dispose();
    }), super.dispose();
  }
  _createSVGBgRect(t) {
    if (!this.backgroundColor) return "";
    const e = St.prototype._toSVG.call(this), s = e.indexOf("COMMON_PARTS");
    e[s] = 'for="group" ';
    const r = e.join("");
    return t ? t(r) : r;
  }
  _toSVG(t) {
    const e = ["<g ", "COMMON_PARTS", ` >
`], s = this._createSVGBgRect(t);
    s && e.push("		", s);
    for (let r = 0; r < this._objects.length; r++) e.push("		", this._objects[r].toSVG(t));
    return e.push(`</g>
`), e;
  }
  getSvgStyles() {
    const t = this.opacity !== void 0 && this.opacity !== 1 ? "opacity: ".concat(this.opacity, ";") : "", e = this.visible ? "" : " visibility: hidden;";
    return [t, this.getSvgFilter(), e].join("");
  }
  toClipPathSVG(t) {
    const e = [], s = this._createSVGBgRect(t);
    s && e.push("	", s);
    for (let r = 0; r < this._objects.length; r++) e.push("	", this._objects[r].toClipPathSVG(t));
    return this._createBaseClipPathSVGMarkup(e, { reviver: t });
  }
  static fromObject(t, e) {
    let { type: s, objects: r = [], layoutManager: i } = t, n = H(t, Xh);
    return Promise.all([ke(r, e), ns(n, e)]).then((o) => {
      let [h, l] = o;
      const c = new this(h, y(y(y({}, n), l), {}, { layoutManager: new Gh() }));
      if (i) {
        const u = D.getClass(i.type), g = D.getClass(i.strategy);
        c.layoutManager = new u(new g());
      } else c.layoutManager = new rs();
      return c.layoutManager.subscribeTargets({ type: Wt, target: c, targets: c.getObjects() }), c.setCoords(), c;
    });
  }
}
b(mt, "type", "Group"), b(mt, "ownDefaults", { strokeWidth: 0, subTargetCheck: !1, interactive: !1 }), D.setClass(mt);
const Bo = (a, t) => Math.min(t.width / a.width, t.height / a.height), Yo = (a, t) => Math.max(t.width / a.width, t.height / a.height), si = "\\s*,?\\s*", He = "".concat(si, "(").concat(Mt, ")"), Zh = "".concat(He).concat(He).concat(He).concat(si, "([01])").concat(si, "([01])").concat(He).concat(He), Kh = { m: "l", M: "L" }, qh = (a, t, e, s, r, i, n, o, h, l, c) => {
  const u = Ot(a), g = jt(a), d = Ot(t), f = jt(t), p = e * r * d - s * i * f + n, m = s * r * d + e * i * f + o;
  return ["C", l + h * (-e * r * g - s * i * u), c + h * (-s * r * g + e * i * u), p + h * (e * r * f + s * i * d), m + h * (s * r * f - e * i * d), p, m];
}, Sn = (a, t, e, s) => {
  const r = Math.atan2(t, a), i = Math.atan2(s, e);
  return i >= r ? i - r : 2 * Math.PI - (r - i);
};
function ri(a, t, e, s, r, i, n, o) {
  let h;
  if (N.cachesBoundsOfCurve && (h = [...arguments].join(), Ze.boundsOfCurveCache[h])) return Ze.boundsOfCurveCache[h];
  const l = Math.sqrt, c = Math.abs, u = [], g = [[0, 0], [0, 0]];
  let d = 6 * a - 12 * e + 6 * r, f = -3 * a + 9 * e - 9 * r + 3 * n, p = 3 * e - 3 * a;
  for (let S = 0; S < 2; ++S) {
    if (S > 0 && (d = 6 * t - 12 * s + 6 * i, f = -3 * t + 9 * s - 9 * i + 3 * o, p = 3 * s - 3 * t), c(f) < 1e-12) {
      if (c(d) < 1e-12) continue;
      const j = -p / d;
      0 < j && j < 1 && u.push(j);
      continue;
    }
    const x = d * d - 4 * p * f;
    if (x < 0) continue;
    const M = l(x), O = (-d + M) / (2 * f);
    0 < O && O < 1 && u.push(O);
    const T = (-d - M) / (2 * f);
    0 < T && T < 1 && u.push(T);
  }
  let m = u.length;
  const v = m, C = zo(a, t, e, s, r, i, n, o);
  for (; m--; ) {
    const { x: S, y: x } = C(u[m]);
    g[0][m] = S, g[1][m] = x;
  }
  g[0][v] = a, g[1][v] = t, g[0][v + 1] = n, g[1][v + 1] = o;
  const w = [new _(Math.min(...g[0]), Math.min(...g[1])), new _(Math.max(...g[0]), Math.max(...g[1]))];
  return N.cachesBoundsOfCurve && (Ze.boundsOfCurveCache[h] = w), w;
}
const Qh = (a, t, e) => {
  let [s, r, i, n, o, h, l, c] = e;
  const u = ((g, d, f, p, m, v, C) => {
    if (f === 0 || p === 0) return [];
    let w = 0, S = 0, x = 0;
    const M = Math.PI, O = C * fi, T = jt(O), j = Ot(O), I = 0.5 * (-j * g - T * d), A = 0.5 * (-j * d + T * g), E = L(f, 2), k = L(p, 2), F = L(A, 2), et = L(I, 2), G = E * k - E * F - k * et;
    let ut = Math.abs(f), W = Math.abs(p);
    if (G < 0) {
      const Qt = Math.sqrt(1 - G / (E * k));
      ut *= Qt, W *= Qt;
    } else x = (m === v ? -1 : 1) * Math.sqrt(G / (E * F + k * et));
    const At = x * ut * A / W, Ft = -x * W * I / ut, ls = j * At - T * Ft + 0.5 * g, Sr = T * At + j * Ft + 0.5 * d;
    let We = Sn(1, 0, (I - At) / ut, (A - Ft) / W), qt = Sn((I - At) / ut, (A - Ft) / W, (-I - At) / ut, (-A - Ft) / W);
    v === 0 && qt > 0 ? qt -= 2 * M : v === 1 && qt < 0 && (qt += 2 * M);
    const cs = Math.ceil(Math.abs(qt / M * 2)), ae = [], ze = qt / cs, Ba = 8 / 3 * Math.sin(ze / 4) * Math.sin(ze / 4) / Math.sin(ze / 2);
    let xr = We + ze;
    for (let Qt = 0; Qt < cs; Qt++) ae[Qt] = qh(We, xr, j, T, ut, W, ls, Sr, Ba, w, S), w = ae[Qt][5], S = ae[Qt][6], We = xr, xr += ze;
    return ae;
  })(l - a, c - t, r, i, o, h, n);
  for (let g = 0, d = u.length; g < d; g++) u[g][1] += a, u[g][2] += t, u[g][3] += a, u[g][4] += t, u[g][5] += a, u[g][6] += t;
  return u;
}, Wo = (a) => {
  let t = 0, e = 0, s = 0, r = 0;
  const i = [];
  let n, o = 0, h = 0;
  for (const l of a) {
    const c = [...l];
    let u;
    switch (c[0]) {
      case "l":
        c[1] += t, c[2] += e;
      case "L":
        t = c[1], e = c[2], u = ["L", t, e];
        break;
      case "h":
        c[1] += t;
      case "H":
        t = c[1], u = ["L", t, e];
        break;
      case "v":
        c[1] += e;
      case "V":
        e = c[1], u = ["L", t, e];
        break;
      case "m":
        c[1] += t, c[2] += e;
      case "M":
        t = c[1], e = c[2], s = c[1], r = c[2], u = ["M", t, e];
        break;
      case "c":
        c[1] += t, c[2] += e, c[3] += t, c[4] += e, c[5] += t, c[6] += e;
      case "C":
        o = c[3], h = c[4], t = c[5], e = c[6], u = ["C", c[1], c[2], o, h, t, e];
        break;
      case "s":
        c[1] += t, c[2] += e, c[3] += t, c[4] += e;
      case "S":
        n === "C" ? (o = 2 * t - o, h = 2 * e - h) : (o = t, h = e), t = c[3], e = c[4], u = ["C", o, h, c[1], c[2], t, e], o = u[3], h = u[4];
        break;
      case "q":
        c[1] += t, c[2] += e, c[3] += t, c[4] += e;
      case "Q":
        o = c[1], h = c[2], t = c[3], e = c[4], u = ["Q", o, h, t, e];
        break;
      case "t":
        c[1] += t, c[2] += e;
      case "T":
        n === "Q" ? (o = 2 * t - o, h = 2 * e - h) : (o = t, h = e), t = c[1], e = c[2], u = ["Q", o, h, t, e];
        break;
      case "a":
        c[6] += t, c[7] += e;
      case "A":
        Qh(t, e, c).forEach((g) => i.push(g)), t = c[6], e = c[7];
        break;
      case "z":
      case "Z":
        t = s, e = r, u = ["Z"];
    }
    u ? (i.push(u), n = u[0]) : n = "";
  }
  return i;
}, Js = (a, t, e, s) => Math.sqrt(L(e - a, 2) + L(s - t, 2)), zo = (a, t, e, s, r, i, n, o) => (h) => {
  const l = L(h, 3), c = ((d) => 3 * L(d, 2) * (1 - d))(h), u = ((d) => 3 * d * L(1 - d, 2))(h), g = ((d) => L(1 - d, 3))(h);
  return new _(n * l + r * c + e * u + a * g, o * l + i * c + s * u + t * g);
}, Ho = (a) => L(a, 2), Vo = (a) => 2 * a * (1 - a), Uo = (a) => L(1 - a, 2), $h = (a, t, e, s, r, i, n, o) => (h) => {
  const l = Ho(h), c = Vo(h), u = Uo(h), g = 3 * (u * (e - a) + c * (r - e) + l * (n - r)), d = 3 * (u * (s - t) + c * (i - s) + l * (o - i));
  return Math.atan2(d, g);
}, Jh = (a, t, e, s, r, i) => (n) => {
  const o = Ho(n), h = Vo(n), l = Uo(n);
  return new _(r * o + e * h + a * l, i * o + s * h + t * l);
}, tl = (a, t, e, s, r, i) => (n) => {
  const o = 1 - n, h = 2 * (o * (e - a) + n * (r - e)), l = 2 * (o * (s - t) + n * (i - s));
  return Math.atan2(l, h);
}, xn = (a, t, e) => {
  let s = new _(t, e), r = 0;
  for (let i = 1; i <= 100; i += 1) {
    const n = a(i / 100);
    r += Js(s.x, s.y, n.x, n.y), s = n;
  }
  return r;
}, el = (a, t) => {
  let e, s = 0, r = 0, i = { x: a.x, y: a.y }, n = y({}, i), o = 0.01, h = 0;
  const l = a.iterator, c = a.angleFinder;
  for (; r < t && o > 1e-4; ) n = l(s), h = s, e = Js(i.x, i.y, n.x, n.y), e + r > t ? (s -= o, o /= 2) : (i = n, s += o, r += e);
  return y(y({}, n), {}, { angle: c(h) });
}, Fi = (a) => {
  let t, e, s = 0, r = 0, i = 0, n = 0, o = 0;
  const h = [];
  for (const l of a) {
    const c = { x: r, y: i, command: l[0], length: 0 };
    switch (l[0]) {
      case "M":
        e = c, e.x = n = r = l[1], e.y = o = i = l[2];
        break;
      case "L":
        e = c, e.length = Js(r, i, l[1], l[2]), r = l[1], i = l[2];
        break;
      case "C":
        t = zo(r, i, l[1], l[2], l[3], l[4], l[5], l[6]), e = c, e.iterator = t, e.angleFinder = $h(r, i, l[1], l[2], l[3], l[4], l[5], l[6]), e.length = xn(t, r, i), r = l[5], i = l[6];
        break;
      case "Q":
        t = Jh(r, i, l[1], l[2], l[3], l[4]), e = c, e.iterator = t, e.angleFinder = tl(r, i, l[1], l[2], l[3], l[4]), e.length = xn(t, r, i), r = l[3], i = l[4];
        break;
      case "Z":
        e = c, e.destX = n, e.destY = o, e.length = Js(r, i, n, o), r = n, i = o;
    }
    s += e.length, h.push(e);
  }
  return h.push({ length: s, x: r, y: i }), h;
}, Xo = function(a, t) {
  let e = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Fi(a), s = 0;
  for (; t - e[s].length > 0 && s < e.length - 2; ) t -= e[s].length, s++;
  const r = e[s], i = t / r.length, n = a[s];
  switch (r.command) {
    case "M":
      return { x: r.x, y: r.y, angle: 0 };
    case "Z":
      return y(y({}, new _(r.x, r.y).lerp(new _(r.destX, r.destY), i)), {}, { angle: Math.atan2(r.destY - r.y, r.destX - r.x) });
    case "L":
      return y(y({}, new _(r.x, r.y).lerp(new _(n[1], n[2]), i)), {}, { angle: Math.atan2(n[2] - r.y, n[1] - r.x) });
    case "C":
    case "Q":
      return el(r, t);
  }
}, sl = new RegExp("[mzlhvcsqta][^mzlhvcsqta]*", "gi"), Mn = new RegExp(Zh, "g"), rl = new RegExp(Mt, "gi"), il = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7 }, Go = (a) => {
  var t;
  const e = [], s = (t = a.match(sl)) !== null && t !== void 0 ? t : [];
  for (const r of s) {
    const i = r[0];
    if (i === "z" || i === "Z") {
      e.push([i]);
      continue;
    }
    const n = il[i.toLowerCase()];
    let o = [];
    if (i === "a" || i === "A") {
      Mn.lastIndex = 0;
      for (let h = null; h = Mn.exec(r); ) o.push(...h.slice(1));
    } else o = r.match(rl) || [];
    for (let h = 0; h < o.length; h += n) {
      const l = new Array(n), c = Kh[i];
      l[0] = h > 0 && c ? c : i;
      for (let u = 0; u < n; u++) l[u + 1] = parseFloat(o[h + u]);
      e.push(l);
    }
  }
  return e;
}, nl = function(a) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, e = new _(a[0]), s = new _(a[1]), r = 1, i = 0;
  const n = [], o = a.length, h = o > 2;
  let l;
  for (h && (r = a[2].x < s.x ? -1 : a[2].x === s.x ? 0 : 1, i = a[2].y < s.y ? -1 : a[2].y === s.y ? 0 : 1), n.push(["M", e.x - r * t, e.y - i * t]), l = 1; l < o; l++) {
    if (!e.eq(s)) {
      const c = e.midPointFrom(s);
      n.push(["Q", e.x, e.y, c.x, c.y]);
    }
    e = a[l], l + 1 < a.length && (s = a[l + 1]);
  }
  return h && (r = e.x > a[l - 2].x ? 1 : e.x === a[l - 2].x ? 0 : -1, i = e.y > a[l - 2].y ? 1 : e.y === a[l - 2].y ? 0 : -1), n.push(["L", e.x + r * t, e.y + i * t]), n;
}, Zo = (a, t) => a.map((e) => e.map((s, r) => r === 0 || t === void 0 ? s : z(s, t)).join(" ")).join(" ");
function tr(a, t) {
  const e = a.style;
  e && t && (typeof t == "string" ? e.cssText += ";" + t : Object.entries(t).forEach((s) => {
    let [r, i] = s;
    return e.setProperty(r, i);
  }));
}
const ol = (a, t) => Math.floor(Math.random() * (t - a + 1)) + a;
function Ko(a) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const e = t.onComplete || ve, s = new (hr()).XMLHttpRequest(), r = t.signal, i = function() {
    s.abort();
  }, n = function() {
    r && r.removeEventListener("abort", i), s.onerror = s.ontimeout = ve;
  };
  if (r && r.aborted) throw new di("request");
  return r && r.addEventListener("abort", i, { once: !0 }), s.onreadystatechange = function() {
    s.readyState === 4 && (n(), e(s), s.onreadystatechange = ve);
  }, s.onerror = s.ontimeout = n, s.open("get", a, !0), s.send(), s;
}
const Ys = (a, t) => {
  let e = a._findCenterFromElement();
  a.transformMatrix && (((s) => {
    if (s.transformMatrix) {
      const { scaleX: r, scaleY: i, angle: n, skewX: o } = ye(s.transformMatrix);
      s.flipX = !1, s.flipY = !1, s.set(ct, r), s.set(vt, i), s.angle = n, s.skewX = o, s.skewY = 0;
    }
  })(a), e = e.transform(a.transformMatrix)), delete a.transformMatrix, t && (a.scaleX *= t.scaleX, a.scaleY *= t.scaleY, a.cropX = t.cropX, a.cropY = t.cropY, e.x += t.offsetLeft, e.y += t.offsetTop, a.width = t.width, a.height = t.height), a.setPositionByOrigin(e, P, P);
};
var hs = Object.freeze({ __proto__: null, addTransformToObject: so, animate: Ai, animateColor: fo, applyTransformToObject: Ie, calcAngleBetweenVectors: Ks, calcDimensionsMatrix: is, calcPlaneChangeMatrix: as, calcVectorRotation: co, cancelAnimFrame: Un, capValue: be, composeMatrix: qn, copyCanvasElement: (a) => {
  var t;
  const e = Dt(a);
  return (t = e.getContext("2d")) === null || t === void 0 || t.drawImage(a, 0, 0), e;
}, cos: Ot, createCanvasElement: _t, createImage: Xn, createRotateMatrix: Ye, createScaleMatrix: gr, createSkewXMatrix: _i, createSkewYMatrix: Ci, createTranslateMatrix: Be, createVector: Gs, crossProduct: je, degreesToRadians: X, dotProduct: uo, ease: oh, enlivenObjectEnlivables: ns, enlivenObjects: ke, findScaleToCover: Yo, findScaleToFit: Bo, getBoundsOfCurve: ri, getOrthonormalVector: ji, getPathSegmentsInfo: Fi, getPointOnPath: Xo, getPointer: eo, getRandomInt: ol, getRegularPolygonPath: (a, t) => {
  const e = 2 * Math.PI / a;
  let s = -ee;
  a % 2 == 0 && (s += e / 2);
  const r = new Array(a + 1);
  for (let i = 0; i < a; i++) {
    const n = i * e + s, { x: o, y: h } = new _(Ot(n), jt(n)).scalarMultiply(t);
    r[i] = [i === 0 ? "M" : "L", o, h];
  }
  return r[a] = ["Z"], r;
}, getSmoothPathFromPoints: nl, getSvgAttributes: (a) => {
  const t = ["instantiated_by_use", "style", "id", "class"];
  switch (a) {
    case "linearGradient":
      return t.concat(["x1", "y1", "x2", "y2", "gradientUnits", "gradientTransform"]);
    case "radialGradient":
      return t.concat(["gradientUnits", "gradientTransform", "cx", "cy", "r", "fx", "fy", "fr"]);
    case "stop":
      return t.concat(["offset", "stop-color", "stop-opacity"]);
  }
  return t;
}, getUnitVector: mr, groupSVGElements: (a, t) => a && a.length === 1 ? a[0] : new mt(a, t), hasStyleChanged: br, invertTransform: gt, isBetweenVectors: Kr, isIdentityMatrix: Gn, isTouchEvent: Us, isTransparent: Ao, joinPath: Zo, loadImage: qe, magnitude: Zs, makeBoundingBoxFromPoints: Lt, makePathSimpler: Wo, matrixToSVG: es, mergeClipPaths: (a, t) => {
  var e;
  let s = a, r = t;
  s.inverted && !r.inverted && (s = t, r = a), Gr(r, (e = r.group) === null || e === void 0 ? void 0 : e.calcTransformMatrix(), s.calcTransformMatrix());
  const i = s.inverted && r.inverted;
  return i && (s.inverted = r.inverted = !1), new mt([s], { clipPath: r, inverted: i });
}, multiplyTransformMatrices: U, multiplyTransformMatrixArray: ur, parsePath: Go, parsePreserveAspectRatioAttribute: Si, parseUnit: nt, pick: _e, projectStrokeOnPoints: ko, qrDecompose: ye, radiansToDegrees: re, removeFromArray: he, removeTransformFromObject: (a, t) => {
  const e = gt(t), s = U(e, a.calcOwnMatrix());
  Ie(a, s);
}, removeTransformMatrixForSvgParsing: Ys, request: Ko, requestAnimFrame: Ke, resetObjectTransform: ro, rotatePoint: (a, t, e) => a.rotate(e, t), rotateVector: Oi, saveObjectTransform: xi, sendObjectToPlane: Gr, sendPointToPlane: Ht, sendVectorToPlane: io, setStyle: tr, sin: jt, sizeAfterTransform: dr, string: Sh, stylesFromArray: Po, stylesToArray: Lo, toDataURL: bi, toFixed: z, transformPath: (a, t, e) => (e && (t = U(t, [1, 0, 0, 1, -e.x, -e.y])), a.map((s) => {
  const r = [...s];
  for (let i = 1; i < s.length - 1; i += 2) {
    const { x: n, y: o } = st({ x: s[i], y: s[i + 1] }, t);
    r[i] = n, r[i + 1] = o;
  }
  return r;
})), transformPoint: st });
class al extends to {
  constructor(t) {
    let { allowTouchScrolling: e = !1, containerClass: s = "" } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    super(t), b(this, "upper", void 0), b(this, "container", void 0);
    const { el: r } = this.lower, i = this.createUpperCanvas();
    this.upper = { el: i, ctx: i.getContext("2d") }, this.applyCanvasStyle(r, { allowTouchScrolling: e }), this.applyCanvasStyle(i, { allowTouchScrolling: e, styles: { position: "absolute", left: "0", top: "0" } });
    const n = this.createContainerElement();
    n.classList.add(s), r.parentNode && r.parentNode.replaceChild(n, r), n.append(r, i), this.container = n;
  }
  createUpperCanvas() {
    const { el: t } = this.lower, e = _t();
    return e.className = t.className, e.classList.remove("lower-canvas"), e.classList.add("upper-canvas"), e.setAttribute("data-fabric", "top"), e.style.cssText = t.style.cssText, e.setAttribute("draggable", "true"), e;
  }
  createContainerElement() {
    const t = Fe().createElement("div");
    return t.setAttribute("data-fabric", "wrapper"), tr(t, { position: "relative" }), nn(t), t;
  }
  applyCanvasStyle(t, e) {
    const { styles: s, allowTouchScrolling: r } = e;
    tr(t, y(y({}, s), {}, { "touch-action": r ? "manipulation" : at })), nn(t);
  }
  setDimensions(t, e) {
    super.setDimensions(t, e);
    const { el: s, ctx: r } = this.upper;
    Jn(s, r, t, e);
  }
  setCSSDimensions(t) {
    super.setCSSDimensions(t), Ur(this.upper.el, t), Ur(this.container, t);
  }
  cleanupDOM(t) {
    const e = this.container, { el: s } = this.lower, { el: r } = this.upper;
    super.cleanupDOM(t), e.removeChild(r), e.removeChild(s), e.parentNode && e.parentNode.replaceChild(s, e);
  }
  dispose() {
    super.dispose(), Pt().dispose(this.upper.el), delete this.upper, delete this.container;
  }
}
class Cr extends os {
  constructor() {
    super(...arguments), b(this, "targets", []), b(this, "_hoveredTargets", []), b(this, "_objectsToRender", void 0), b(this, "_currentTransform", null), b(this, "_groupSelector", null), b(this, "contextTopDirty", !1);
  }
  static getDefaults() {
    return y(y({}, super.getDefaults()), Cr.ownDefaults);
  }
  get upperCanvasEl() {
    var t;
    return (t = this.elements.upper) === null || t === void 0 ? void 0 : t.el;
  }
  get contextTop() {
    var t;
    return (t = this.elements.upper) === null || t === void 0 ? void 0 : t.ctx;
  }
  get wrapperEl() {
    return this.elements.container;
  }
  initElements(t) {
    this.elements = new al(t, { allowTouchScrolling: this.allowTouchScrolling, containerClass: this.containerClass }), this._createCacheCanvas();
  }
  _onObjectAdded(t) {
    this._objectsToRender = void 0, super._onObjectAdded(t);
  }
  _onObjectRemoved(t) {
    this._objectsToRender = void 0, t === this._activeObject && (this.fire("before:selection:cleared", { deselected: [t] }), this._discardActiveObject(), this.fire("selection:cleared", { deselected: [t] }), t.fire("deselected", { target: t })), t === this._hoveredTarget && (this._hoveredTarget = void 0, this._hoveredTargets = []), super._onObjectRemoved(t);
  }
  _onStackOrderChanged() {
    this._objectsToRender = void 0, super._onStackOrderChanged();
  }
  _chooseObjectsToRender() {
    const t = this._activeObject;
    return !this.preserveObjectStacking && t ? this._objects.filter((e) => !e.group && e !== t).concat(t) : this._objects;
  }
  renderAll() {
    this.cancelRequestedRender(), this.destroyed || (!this.contextTopDirty || this._groupSelector || this.isDrawingMode || (this.clearContext(this.contextTop), this.contextTopDirty = !1), this.hasLostContext && (this.renderTopLayer(this.contextTop), this.hasLostContext = !1), !this._objectsToRender && (this._objectsToRender = this._chooseObjectsToRender()), this.renderCanvas(this.getContext(), this._objectsToRender));
  }
  renderTopLayer(t) {
    t.save(), this.isDrawingMode && this._isCurrentlyDrawing && (this.freeDrawingBrush && this.freeDrawingBrush._render(), this.contextTopDirty = !0), this.selection && this._groupSelector && (this._drawSelection(t), this.contextTopDirty = !0), t.restore();
  }
  renderTop() {
    const t = this.contextTop;
    this.clearContext(t), this.renderTopLayer(t), this.fire("after:render", { ctx: t });
  }
  setTargetFindTolerance(t) {
    t = Math.round(t), this.targetFindTolerance = t;
    const e = this.getRetinaScaling(), s = Math.ceil((2 * t + 1) * e);
    this.pixelFindCanvasEl.width = this.pixelFindCanvasEl.height = s, this.pixelFindContext.scale(e, e);
  }
  isTargetTransparent(t, e, s) {
    const r = this.targetFindTolerance, i = this.pixelFindContext;
    this.clearContext(i), i.save(), i.translate(-e + r, -s + r), i.transform(...this.viewportTransform);
    const n = t.selectionBackgroundColor;
    t.selectionBackgroundColor = "", t.render(i), t.selectionBackgroundColor = n, i.restore();
    const o = Math.round(r * this.getRetinaScaling());
    return Ao(i, o, o, o);
  }
  _isSelectionKeyPressed(t) {
    const e = this.selectionKey;
    return !!e && (Array.isArray(e) ? !!e.find((s) => !!s && t[s] === !0) : t[e]);
  }
  _shouldClearSelection(t, e) {
    const s = this.getActiveObjects(), r = this._activeObject;
    return !!(!e || e && r && s.length > 1 && s.indexOf(e) === -1 && r !== e && !this._isSelectionKeyPressed(t) || e && !e.evented || e && !e.selectable && r && r !== e);
  }
  _shouldCenterTransform(t, e, s) {
    if (!t) return;
    let r;
    return e === cr || e === ct || e === vt || e === ts ? r = this.centeredScaling || t.centeredScaling : e === vi && (r = this.centeredRotation || t.centeredRotation), r ? !s : s;
  }
  _getOriginFromCorner(t, e) {
    const s = { x: t.originX, y: t.originY };
    return e && (["ml", "tl", "bl"].includes(e) ? s.x = Z : ["mr", "tr", "br"].includes(e) && (s.x = B), ["tl", "mt", "tr"].includes(e) ? s.y = Vr : ["bl", "mb", "br"].includes(e) && (s.y = dt)), s;
  }
  _setupCurrentTransform(t, e, s) {
    var r;
    const i = e.group ? Ht(this.getScenePoint(t), void 0, e.group.calcTransformMatrix()) : this.getScenePoint(t), { key: n = "", control: o } = e.getActiveControl() || {}, h = s && o ? (r = o.getActionHandler(t, e, o)) === null || r === void 0 ? void 0 : r.bind(o) : ao, l = ((d, f, p, m) => {
      if (!f || !d) return "drag";
      const v = m.controls[f];
      return v.getActionName(p, v, m);
    })(s, n, t, e), c = t[this.centeredKey], u = this._shouldCenterTransform(e, l, c) ? { x: P, y: P } : this._getOriginFromCorner(e, n), g = { target: e, action: l, actionHandler: h, actionPerformed: !1, corner: n, scaleX: e.scaleX, scaleY: e.scaleY, skewX: e.skewX, skewY: e.skewY, offsetX: i.x - e.left, offsetY: i.y - e.top, originX: u.x, originY: u.y, ex: i.x, ey: i.y, lastX: i.x, lastY: i.y, theta: X(e.angle), width: e.width, height: e.height, shiftKey: t.shiftKey, altKey: c, original: y(y({}, xi(e)), {}, { originX: u.x, originY: u.y }) };
    this._currentTransform = g, this.fire("before:transform", { e: t, transform: g });
  }
  setCursor(t) {
    this.upperCanvasEl.style.cursor = t;
  }
  _drawSelection(t) {
    const { x: e, y: s, deltaX: r, deltaY: i } = this._groupSelector, n = new _(e, s).transform(this.viewportTransform), o = new _(e + r, s + i).transform(this.viewportTransform), h = this.selectionLineWidth / 2;
    let l = Math.min(n.x, o.x), c = Math.min(n.y, o.y), u = Math.max(n.x, o.x), g = Math.max(n.y, o.y);
    this.selectionColor && (t.fillStyle = this.selectionColor, t.fillRect(l, c, u - l, g - c)), this.selectionLineWidth && this.selectionBorderColor && (t.lineWidth = this.selectionLineWidth, t.strokeStyle = this.selectionBorderColor, l += h, c += h, u -= h, g -= h, rt.prototype._setLineDash.call(this, t, this.selectionDashArray), t.strokeRect(l, c, u - l, g - c));
  }
  findTarget(t) {
    if (this.skipTargetFind) return;
    const e = this.getViewportPoint(t), s = this._activeObject, r = this.getActiveObjects();
    if (this.targets = [], s && r.length >= 1) {
      if (s.findControl(e, Us(t)) || r.length > 1 && this.searchPossibleTargets([s], e)) return s;
      if (s === this.searchPossibleTargets([s], e)) {
        if (this.preserveObjectStacking) {
          const i = this.targets;
          this.targets = [];
          const n = this.searchPossibleTargets(this._objects, e);
          return t[this.altSelectionKey] && n && n !== s ? (this.targets = i, s) : n;
        }
        return s;
      }
    }
    return this.searchPossibleTargets(this._objects, e);
  }
  _pointIsInObjectSelectionArea(t, e) {
    let s = t.getCoords();
    const r = this.getZoom(), i = t.padding / r;
    if (i) {
      const [n, o, h, l] = s, c = Math.atan2(o.y - n.y, o.x - n.x), u = Ot(c) * i, g = jt(c) * i, d = u + g, f = u - g;
      s = [new _(n.x - f, n.y - d), new _(o.x + d, o.y - f), new _(h.x + f, h.y + d), new _(l.x - d, l.y + f)];
    }
    return V.isPointInPolygon(e, s);
  }
  _checkTarget(t, e) {
    return !!(t && t.visible && t.evented && this._pointIsInObjectSelectionArea(t, Ht(e, void 0, this.viewportTransform)) && (!this.perPixelTargetFind && !t.perPixelTargetFind || t.isEditing || !this.isTargetTransparent(t, e.x, e.y)));
  }
  _searchPossibleTargets(t, e) {
    let s = t.length;
    for (; s--; ) {
      const r = t[s];
      if (this._checkTarget(r, e)) {
        if (Rs(r) && r.subTargetCheck) {
          const i = this._searchPossibleTargets(r._objects, e);
          i && this.targets.push(i);
        }
        return r;
      }
    }
  }
  searchPossibleTargets(t, e) {
    const s = this._searchPossibleTargets(t, e);
    if (s && Rs(s) && s.interactive && this.targets[0]) {
      const r = this.targets;
      for (let i = r.length - 1; i > 0; i--) {
        const n = r[i];
        if (!Rs(n) || !n.interactive) return n;
      }
      return r[0];
    }
    return s;
  }
  getViewportPoint(t) {
    return this._pointer ? this._pointer : this.getPointer(t, !0);
  }
  getScenePoint(t) {
    return this._absolutePointer ? this._absolutePointer : this.getPointer(t);
  }
  getPointer(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 && arguments[1];
    const s = this.upperCanvasEl, r = s.getBoundingClientRect();
    let i = eo(t), n = r.width || 0, o = r.height || 0;
    n && o || (dt in r && Vr in r && (o = Math.abs(r.top - r.bottom)), Z in r && B in r && (n = Math.abs(r.right - r.left))), this.calcOffset(), i.x = i.x - this._offset.left, i.y = i.y - this._offset.top, e || (i = Ht(i, void 0, this.viewportTransform));
    const h = this.getRetinaScaling();
    h !== 1 && (i.x /= h, i.y /= h);
    const l = n === 0 || o === 0 ? new _(1, 1) : new _(s.width / n, s.height / o);
    return i.multiply(l);
  }
  _setDimensionsImpl(t, e) {
    this._resetTransformEventData(), super._setDimensionsImpl(t, e), this._isCurrentlyDrawing && this.freeDrawingBrush && this.freeDrawingBrush._setBrushStyles(this.contextTop);
  }
  _createCacheCanvas() {
    this.pixelFindCanvasEl = _t(), this.pixelFindContext = this.pixelFindCanvasEl.getContext("2d", { willReadFrequently: !0 }), this.setTargetFindTolerance(this.targetFindTolerance);
  }
  getTopContext() {
    return this.elements.upper.ctx;
  }
  getSelectionContext() {
    return this.elements.upper.ctx;
  }
  getSelectionElement() {
    return this.elements.upper.el;
  }
  getActiveObject() {
    return this._activeObject;
  }
  getActiveObjects() {
    const t = this._activeObject;
    return le(t) ? t.getObjects() : t ? [t] : [];
  }
  _fireSelectionEvents(t, e) {
    let s = !1, r = !1;
    const i = this.getActiveObjects(), n = [], o = [];
    t.forEach((h) => {
      i.includes(h) || (s = !0, h.fire("deselected", { e, target: h }), o.push(h));
    }), i.forEach((h) => {
      t.includes(h) || (s = !0, h.fire("selected", { e, target: h }), n.push(h));
    }), t.length > 0 && i.length > 0 ? (r = !0, s && this.fire("selection:updated", { e, selected: n, deselected: o })) : i.length > 0 ? (r = !0, this.fire("selection:created", { e, selected: n })) : t.length > 0 && (r = !0, this.fire("selection:cleared", { e, deselected: o })), r && (this._objectsToRender = void 0);
  }
  setActiveObject(t, e) {
    const s = this.getActiveObjects(), r = this._setActiveObject(t, e);
    return this._fireSelectionEvents(s, e), r;
  }
  _setActiveObject(t, e) {
    const s = this._activeObject;
    return s !== t && !(!this._discardActiveObject(e, t) && this._activeObject) && !t.onSelect({ e }) && (this._activeObject = t, le(t) && s !== t && t.set("canvas", this), t.setCoords(), !0);
  }
  _discardActiveObject(t, e) {
    const s = this._activeObject;
    return !!s && !s.onDeselect({ e: t, object: e }) && (this._currentTransform && this._currentTransform.target === s && this.endCurrentTransform(t), le(s) && s === this._hoveredTarget && (this._hoveredTarget = void 0), this._activeObject = void 0, !0);
  }
  discardActiveObject(t) {
    const e = this.getActiveObjects(), s = this.getActiveObject();
    e.length && this.fire("before:selection:cleared", { e: t, deselected: [s] });
    const r = this._discardActiveObject(t);
    return this._fireSelectionEvents(e, t), r;
  }
  endCurrentTransform(t) {
    const e = this._currentTransform;
    this._finalizeCurrentTransform(t), e && e.target && (e.target.isMoving = !1), this._currentTransform = null;
  }
  _finalizeCurrentTransform(t) {
    const e = this._currentTransform, s = e.target, r = { e: t, target: s, transform: e, action: e.action };
    s._scaling && (s._scaling = !1), s.setCoords(), e.actionPerformed && (this.fire("object:modified", r), s.fire(Hs, r));
  }
  setViewportTransform(t) {
    super.setViewportTransform(t);
    const e = this._activeObject;
    e && e.setCoords();
  }
  destroy() {
    const t = this._activeObject;
    le(t) && (t.removeAll(), t.dispose()), delete this._activeObject, super.destroy(), this.pixelFindContext = null, this.pixelFindCanvasEl = void 0;
  }
  clear() {
    this.discardActiveObject(), this._activeObject = void 0, this.clearContext(this.contextTop), super.clear();
  }
  drawControls(t) {
    const e = this._activeObject;
    e && e._renderControls(t);
  }
  _toObject(t, e, s) {
    const r = this._realizeGroupTransformOnObject(t), i = super._toObject(t, e, s);
    return t.set(r), i;
  }
  _realizeGroupTransformOnObject(t) {
    const { group: e } = t;
    if (e && le(e) && this._activeObject === e) {
      const s = _e(t, ["angle", "flipX", "flipY", B, ct, vt, Ne, Re, dt]);
      return so(t, e.calcOwnMatrix()), s;
    }
    return {};
  }
  _setSVGObject(t, e, s) {
    const r = this._realizeGroupTransformOnObject(e);
    super._setSVGObject(t, e, s), e.set(r);
  }
}
b(Cr, "ownDefaults", { uniformScaling: !0, uniScaleKey: "shiftKey", centeredScaling: !1, centeredRotation: !1, centeredKey: "altKey", altActionKey: "shiftKey", selection: !0, selectionKey: "shiftKey", selectionColor: "rgba(100, 100, 255, 0.3)", selectionDashArray: [], selectionBorderColor: "rgba(255, 255, 255, 0.3)", selectionLineWidth: 1, selectionFullyContained: !1, hoverCursor: "move", moveCursor: "move", defaultCursor: "default", freeDrawingCursor: "crosshair", notAllowedCursor: "not-allowed", perPixelTargetFind: !1, targetFindTolerance: 0, skipTargetFind: !1, stopContextMenu: !1, fireRightClick: !1, fireMiddleClick: !1, enablePointerEvents: !1, containerClass: "canvas-container", preserveObjectStacking: !1 });
class hl {
  constructor(t) {
    b(this, "targets", []), b(this, "__disposer", void 0);
    const e = () => {
      const { hiddenTextarea: r } = t.getActiveObject() || {};
      r && r.focus();
    }, s = t.upperCanvasEl;
    s.addEventListener("click", e), this.__disposer = () => s.removeEventListener("click", e);
  }
  exitTextEditing() {
    this.target = void 0, this.targets.forEach((t) => {
      t.isEditing && t.exitEditing();
    });
  }
  add(t) {
    this.targets.push(t);
  }
  remove(t) {
    this.unregister(t), he(this.targets, t);
  }
  register(t) {
    this.target = t;
  }
  unregister(t) {
    t === this.target && (this.target = void 0);
  }
  onMouseMove(t) {
    var e;
    !((e = this.target) === null || e === void 0) && e.isEditing && this.target.updateSelectionOnMouseMove(t);
  }
  clear() {
    this.targets = [], this.target = void 0;
  }
  dispose() {
    this.clear(), this.__disposer(), delete this.__disposer;
  }
}
const ll = ["target", "oldTarget", "fireCanvas", "e"], ft = { passive: !1 }, xe = (a, t) => {
  const e = a.getViewportPoint(t), s = a.getScenePoint(t);
  return { viewportPoint: e, scenePoint: s, pointer: e, absolutePointer: s };
}, Jt = function(a) {
  for (var t = arguments.length, e = new Array(t > 1 ? t - 1 : 0), s = 1; s < t; s++) e[s - 1] = arguments[s];
  return a.addEventListener(...e);
}, yt = function(a) {
  for (var t = arguments.length, e = new Array(t > 1 ? t - 1 : 0), s = 1; s < t; s++) e[s - 1] = arguments[s];
  return a.removeEventListener(...e);
}, cl = { mouse: { in: "over", out: "out", targetIn: "mouseover", targetOut: "mouseout", canvasIn: "mouse:over", canvasOut: "mouse:out" }, drag: { in: "enter", out: "leave", targetIn: "dragenter", targetOut: "dragleave", canvasIn: "drag:enter", canvasOut: "drag:leave" } };
class ii extends Cr {
  constructor(t) {
    super(t, arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}), b(this, "_isClick", void 0), b(this, "textEditingManager", new hl(this)), ["_onMouseDown", "_onTouchStart", "_onMouseMove", "_onMouseUp", "_onTouchEnd", "_onResize", "_onMouseWheel", "_onMouseOut", "_onMouseEnter", "_onContextMenu", "_onDoubleClick", "_onDragStart", "_onDragEnd", "_onDragProgress", "_onDragOver", "_onDragEnter", "_onDragLeave", "_onDrop"].forEach((e) => {
      this[e] = this[e].bind(this);
    }), this.addOrRemove(Jt, "add");
  }
  _getEventPrefix() {
    return this.enablePointerEvents ? "pointer" : "mouse";
  }
  addOrRemove(t, e) {
    const s = this.upperCanvasEl, r = this._getEventPrefix();
    t($n(s), "resize", this._onResize), t(s, r + "down", this._onMouseDown), t(s, "".concat(r, "move"), this._onMouseMove, ft), t(s, "".concat(r, "out"), this._onMouseOut), t(s, "".concat(r, "enter"), this._onMouseEnter), t(s, "wheel", this._onMouseWheel), t(s, "contextmenu", this._onContextMenu), t(s, "dblclick", this._onDoubleClick), t(s, "dragstart", this._onDragStart), t(s, "dragend", this._onDragEnd), t(s, "dragover", this._onDragOver), t(s, "dragenter", this._onDragEnter), t(s, "dragleave", this._onDragLeave), t(s, "drop", this._onDrop), this.enablePointerEvents || t(s, "touchstart", this._onTouchStart, ft);
  }
  removeListeners() {
    this.addOrRemove(yt, "remove");
    const t = this._getEventPrefix(), e = xt(this.upperCanvasEl);
    yt(e, "".concat(t, "up"), this._onMouseUp), yt(e, "touchend", this._onTouchEnd, ft), yt(e, "".concat(t, "move"), this._onMouseMove, ft), yt(e, "touchmove", this._onMouseMove, ft), clearTimeout(this._willAddMouseDown);
  }
  _onMouseWheel(t) {
    this.__onMouseWheel(t);
  }
  _onMouseOut(t) {
    const e = this._hoveredTarget, s = y({ e: t }, xe(this, t));
    this.fire("mouse:out", y(y({}, s), {}, { target: e })), this._hoveredTarget = void 0, e && e.fire("mouseout", y({}, s)), this._hoveredTargets.forEach((r) => {
      this.fire("mouse:out", y(y({}, s), {}, { target: r })), r && r.fire("mouseout", y({}, s));
    }), this._hoveredTargets = [];
  }
  _onMouseEnter(t) {
    this._currentTransform || this.findTarget(t) || (this.fire("mouse:over", y({ e: t }, xe(this, t))), this._hoveredTarget = void 0, this._hoveredTargets = []);
  }
  _onDragStart(t) {
    this._isClick = !1;
    const e = this.getActiveObject();
    if (e && e.onDragStart(t)) {
      this._dragSource = e;
      const s = { e: t, target: e };
      return this.fire("dragstart", s), e.fire("dragstart", s), void Jt(this.upperCanvasEl, "drag", this._onDragProgress);
    }
    Xr(t);
  }
  _renderDragEffects(t, e, s) {
    let r = !1;
    const i = this._dropTarget;
    i && i !== e && i !== s && (i.clearContextTop(), r = !0), e == null || e.clearContextTop(), s !== e && (s == null || s.clearContextTop());
    const n = this.contextTop;
    n.save(), n.transform(...this.viewportTransform), e && (n.save(), e.transform(n), e.renderDragSourceEffect(t), n.restore(), r = !0), s && (n.save(), s.transform(n), s.renderDropTargetEffect(t), n.restore(), r = !0), n.restore(), r && (this.contextTopDirty = !0);
  }
  _onDragEnd(t) {
    const e = !!t.dataTransfer && t.dataTransfer.dropEffect !== at, s = e ? this._activeObject : void 0, r = { e: t, target: this._dragSource, subTargets: this.targets, dragSource: this._dragSource, didDrop: e, dropTarget: s };
    yt(this.upperCanvasEl, "drag", this._onDragProgress), this.fire("dragend", r), this._dragSource && this._dragSource.fire("dragend", r), delete this._dragSource, this._onMouseUp(t);
  }
  _onDragProgress(t) {
    const e = { e: t, target: this._dragSource, dragSource: this._dragSource, dropTarget: this._draggedoverTarget };
    this.fire("drag", e), this._dragSource && this._dragSource.fire("drag", e);
  }
  findDragTargets(t) {
    return this.targets = [], { target: this._searchPossibleTargets(this._objects, this.getViewportPoint(t)), targets: [...this.targets] };
  }
  _onDragOver(t) {
    const e = "dragover", { target: s, targets: r } = this.findDragTargets(t), i = this._dragSource, n = { e: t, target: s, subTargets: r, dragSource: i, canDrop: !1, dropTarget: void 0 };
    let o;
    this.fire(e, n), this._fireEnterLeaveEvents(s, n), s && (s.canDrop(t) && (o = s), s.fire(e, n));
    for (let h = 0; h < r.length; h++) {
      const l = r[h];
      l.canDrop(t) && (o = l), l.fire(e, n);
    }
    this._renderDragEffects(t, i, o), this._dropTarget = o;
  }
  _onDragEnter(t) {
    const { target: e, targets: s } = this.findDragTargets(t), r = { e: t, target: e, subTargets: s, dragSource: this._dragSource };
    this.fire("dragenter", r), this._fireEnterLeaveEvents(e, r);
  }
  _onDragLeave(t) {
    const e = { e: t, target: this._draggedoverTarget, subTargets: this.targets, dragSource: this._dragSource };
    this.fire("dragleave", e), this._fireEnterLeaveEvents(void 0, e), this._renderDragEffects(t, this._dragSource), this._dropTarget = void 0, this.targets = [], this._hoveredTargets = [];
  }
  _onDrop(t) {
    const { target: e, targets: s } = this.findDragTargets(t), r = this._basicEventHandler("drop:before", y({ e: t, target: e, subTargets: s, dragSource: this._dragSource }, xe(this, t)));
    r.didDrop = !1, r.dropTarget = void 0, this._basicEventHandler("drop", r), this.fire("drop:after", r);
  }
  _onContextMenu(t) {
    const e = this.findTarget(t), s = this.targets || [], r = this._basicEventHandler("contextmenu:before", { e: t, target: e, subTargets: s });
    return this.stopContextMenu && Xr(t), this._basicEventHandler("contextmenu", r), !1;
  }
  _onDoubleClick(t) {
    this._cacheTransformEventData(t), this._handleEvent(t, "dblclick"), this._resetTransformEventData();
  }
  getPointerId(t) {
    const e = t.changedTouches;
    return e ? e[0] && e[0].identifier : this.enablePointerEvents ? t.pointerId : -1;
  }
  _isMainEvent(t) {
    return t.isPrimary === !0 || t.isPrimary !== !1 && (t.type === "touchend" && t.touches.length === 0 || !t.changedTouches || t.changedTouches[0].identifier === this.mainTouchId);
  }
  _onTouchStart(t) {
    let e = !this.allowTouchScrolling;
    const s = this._activeObject;
    this.mainTouchId === void 0 && (this.mainTouchId = this.getPointerId(t)), this.__onMouseDown(t), (this.isDrawingMode || s && this._target === s) && (e = !0), e && t.preventDefault(), this._resetTransformEventData();
    const r = this.upperCanvasEl, i = this._getEventPrefix(), n = xt(r);
    Jt(n, "touchend", this._onTouchEnd, ft), e && Jt(n, "touchmove", this._onMouseMove, ft), yt(r, "".concat(i, "down"), this._onMouseDown);
  }
  _onMouseDown(t) {
    this.__onMouseDown(t), this._resetTransformEventData();
    const e = this.upperCanvasEl, s = this._getEventPrefix();
    yt(e, "".concat(s, "move"), this._onMouseMove, ft);
    const r = xt(e);
    Jt(r, "".concat(s, "up"), this._onMouseUp), Jt(r, "".concat(s, "move"), this._onMouseMove, ft);
  }
  _onTouchEnd(t) {
    if (t.touches.length > 0) return;
    this.__onMouseUp(t), this._resetTransformEventData(), delete this.mainTouchId;
    const e = this._getEventPrefix(), s = xt(this.upperCanvasEl);
    yt(s, "touchend", this._onTouchEnd, ft), yt(s, "touchmove", this._onMouseMove, ft), this._willAddMouseDown && clearTimeout(this._willAddMouseDown), this._willAddMouseDown = setTimeout(() => {
      Jt(this.upperCanvasEl, "".concat(e, "down"), this._onMouseDown), this._willAddMouseDown = 0;
    }, 400);
  }
  _onMouseUp(t) {
    this.__onMouseUp(t), this._resetTransformEventData();
    const e = this.upperCanvasEl, s = this._getEventPrefix();
    if (this._isMainEvent(t)) {
      const r = xt(this.upperCanvasEl);
      yt(r, "".concat(s, "up"), this._onMouseUp), yt(r, "".concat(s, "move"), this._onMouseMove, ft), Jt(e, "".concat(s, "move"), this._onMouseMove, ft);
    }
  }
  _onMouseMove(t) {
    const e = this.getActiveObject();
    !this.allowTouchScrolling && (!e || !e.shouldStartDragging(t)) && t.preventDefault && t.preventDefault(), this.__onMouseMove(t);
  }
  _onResize() {
    this.calcOffset(), this._resetTransformEventData();
  }
  _shouldRender(t) {
    const e = this.getActiveObject();
    return !!e != !!t || e && t && e !== t;
  }
  __onMouseUp(t) {
    var e;
    this._cacheTransformEventData(t), this._handleEvent(t, "up:before");
    const s = this._currentTransform, r = this._isClick, i = this._target, { button: n } = t;
    if (n) return (this.fireMiddleClick && n === 1 || this.fireRightClick && n === 2) && this._handleEvent(t, "up"), void this._resetTransformEventData();
    if (this.isDrawingMode && this._isCurrentlyDrawing) return void this._onMouseUpInDrawingMode(t);
    if (!this._isMainEvent(t)) return;
    let o, h, l = !1;
    if (s && (this._finalizeCurrentTransform(t), l = s.actionPerformed), !r) {
      const c = i === this._activeObject;
      this.handleSelection(t), l || (l = this._shouldRender(i) || !c && i === this._activeObject);
    }
    if (i) {
      const c = i.findControl(this.getViewportPoint(t), Us(t)), { key: u, control: g } = c || {};
      if (h = u, i.selectable && i !== this._activeObject && i.activeOn === "up") this.setActiveObject(i, t), l = !0;
      else if (g) {
        const d = g.getMouseUpHandler(t, i, g);
        d && (o = this.getScenePoint(t), d.call(g, t, s, o.x, o.y));
      }
      i.isMoving = !1;
    }
    if (s && (s.target !== i || s.corner !== h)) {
      const c = s.target && s.target.controls[s.corner], u = c && c.getMouseUpHandler(t, s.target, c);
      o = o || this.getScenePoint(t), u && u.call(c, t, s, o.x, o.y);
    }
    this._setCursorFromEvent(t, i), this._handleEvent(t, "up"), this._groupSelector = null, this._currentTransform = null, i && (i.__corner = void 0), l ? this.requestRenderAll() : r || (e = this._activeObject) !== null && e !== void 0 && e.isEditing || this.renderTop();
  }
  _basicEventHandler(t, e) {
    const { target: s, subTargets: r = [] } = e;
    this.fire(t, e), s && s.fire(t, e);
    for (let i = 0; i < r.length; i++) r[i] !== s && r[i].fire(t, e);
    return e;
  }
  _handleEvent(t, e) {
    const s = this._target, r = this.targets || [], i = y(y({ e: t, target: s, subTargets: r }, xe(this, t)), {}, { transform: this._currentTransform }, e === "up:before" || e === "up" ? { isClick: this._isClick, currentTarget: this.findTarget(t), currentSubTargets: this.targets } : {});
    this.fire("mouse:".concat(e), i), s && s.fire("mouse".concat(e), i);
    for (let n = 0; n < r.length; n++) r[n] !== s && r[n].fire("mouse".concat(e), i);
  }
  _onMouseDownInDrawingMode(t) {
    this._isCurrentlyDrawing = !0, this.getActiveObject() && (this.discardActiveObject(t), this.requestRenderAll());
    const e = this.getScenePoint(t);
    this.freeDrawingBrush && this.freeDrawingBrush.onMouseDown(e, { e: t, pointer: e }), this._handleEvent(t, "down");
  }
  _onMouseMoveInDrawingMode(t) {
    if (this._isCurrentlyDrawing) {
      const e = this.getScenePoint(t);
      this.freeDrawingBrush && this.freeDrawingBrush.onMouseMove(e, { e: t, pointer: e });
    }
    this.setCursor(this.freeDrawingCursor), this._handleEvent(t, "move");
  }
  _onMouseUpInDrawingMode(t) {
    const e = this.getScenePoint(t);
    this.freeDrawingBrush ? this._isCurrentlyDrawing = !!this.freeDrawingBrush.onMouseUp({ e: t, pointer: e }) : this._isCurrentlyDrawing = !1, this._handleEvent(t, "up");
  }
  __onMouseDown(t) {
    this._isClick = !0, this._cacheTransformEventData(t), this._handleEvent(t, "down:before");
    let e = this._target;
    const { button: s } = t;
    if (s) return (this.fireMiddleClick && s === 1 || this.fireRightClick && s === 2) && this._handleEvent(t, "down"), void this._resetTransformEventData();
    if (this.isDrawingMode) return void this._onMouseDownInDrawingMode(t);
    if (!this._isMainEvent(t) || this._currentTransform) return;
    let r = this._shouldRender(e), i = !1;
    if (this.handleMultiSelection(t, e) ? (e = this._activeObject, i = !0, r = !0) : this._shouldClearSelection(t, e) && this.discardActiveObject(t), this.selection && (!e || !e.selectable && !e.isEditing && e !== this._activeObject)) {
      const n = this.getScenePoint(t);
      this._groupSelector = { x: n.x, y: n.y, deltaY: 0, deltaX: 0 };
    }
    if (e) {
      const n = e === this._activeObject;
      e.selectable && e.activeOn === "down" && this.setActiveObject(e, t);
      const o = e.findControl(this.getViewportPoint(t), Us(t));
      if (e === this._activeObject && (o || !i)) {
        this._setupCurrentTransform(t, e, n);
        const h = o ? o.control : void 0, l = this.getScenePoint(t), c = h && h.getMouseDownHandler(t, e, h);
        c && c.call(h, t, this._currentTransform, l.x, l.y);
      }
    }
    r && (this._objectsToRender = void 0), this._handleEvent(t, "down"), r && this.requestRenderAll();
  }
  _resetTransformEventData() {
    this._target = this._pointer = this._absolutePointer = void 0;
  }
  _cacheTransformEventData(t) {
    this._resetTransformEventData(), this._pointer = this.getViewportPoint(t), this._absolutePointer = Ht(this._pointer, void 0, this.viewportTransform), this._target = this._currentTransform ? this._currentTransform.target : this.findTarget(t);
  }
  __onMouseMove(t) {
    if (this._isClick = !1, this._cacheTransformEventData(t), this._handleEvent(t, "move:before"), this.isDrawingMode) return void this._onMouseMoveInDrawingMode(t);
    if (!this._isMainEvent(t)) return;
    const e = this._groupSelector;
    if (e) {
      const s = this.getScenePoint(t);
      e.deltaX = s.x - e.x, e.deltaY = s.y - e.y, this.renderTop();
    } else if (this._currentTransform) this._transformObject(t);
    else {
      const s = this.findTarget(t);
      this._setCursorFromEvent(t, s), this._fireOverOutEvents(t, s);
    }
    this.textEditingManager.onMouseMove(t), this._handleEvent(t, "move"), this._resetTransformEventData();
  }
  _fireOverOutEvents(t, e) {
    const s = this._hoveredTarget, r = this._hoveredTargets, i = this.targets, n = Math.max(r.length, i.length);
    this.fireSyntheticInOutEvents("mouse", { e: t, target: e, oldTarget: s, fireCanvas: !0 });
    for (let o = 0; o < n; o++) this.fireSyntheticInOutEvents("mouse", { e: t, target: i[o], oldTarget: r[o] });
    this._hoveredTarget = e, this._hoveredTargets = this.targets.concat();
  }
  _fireEnterLeaveEvents(t, e) {
    const s = this._draggedoverTarget, r = this._hoveredTargets, i = this.targets, n = Math.max(r.length, i.length);
    this.fireSyntheticInOutEvents("drag", y(y({}, e), {}, { target: t, oldTarget: s, fireCanvas: !0 }));
    for (let o = 0; o < n; o++) this.fireSyntheticInOutEvents("drag", y(y({}, e), {}, { target: i[o], oldTarget: r[o] }));
    this._draggedoverTarget = t;
  }
  fireSyntheticInOutEvents(t, e) {
    let { target: s, oldTarget: r, fireCanvas: i, e: n } = e, o = H(e, ll);
    const { targetIn: h, targetOut: l, canvasIn: c, canvasOut: u } = cl[t], g = r !== s;
    if (r && g) {
      const d = y(y({}, o), {}, { e: n, target: r, nextTarget: s }, xe(this, n));
      i && this.fire(u, d), r.fire(l, d);
    }
    if (s && g) {
      const d = y(y({}, o), {}, { e: n, target: s, previousTarget: r }, xe(this, n));
      i && this.fire(c, d), s.fire(h, d);
    }
  }
  __onMouseWheel(t) {
    this._cacheTransformEventData(t), this._handleEvent(t, "wheel"), this._resetTransformEventData();
  }
  _transformObject(t) {
    const e = this.getScenePoint(t), s = this._currentTransform, r = s.target, i = r.group ? Ht(e, void 0, r.group.calcTransformMatrix()) : e;
    s.shiftKey = t.shiftKey, s.altKey = !!this.centeredKey && t[this.centeredKey], this._performTransformAction(t, s, i), s.actionPerformed && this.requestRenderAll();
  }
  _performTransformAction(t, e, s) {
    const { action: r, actionHandler: i, target: n } = e, o = !!i && i(t, e, s.x, s.y);
    o && n.setCoords(), r === "drag" && o && (e.target.isMoving = !0, this.setCursor(e.target.moveCursor || this.moveCursor)), e.actionPerformed = e.actionPerformed || o;
  }
  _setCursorFromEvent(t, e) {
    if (!e) return void this.setCursor(this.defaultCursor);
    let s = e.hoverCursor || this.hoverCursor;
    const r = le(this._activeObject) ? this._activeObject : null, i = (!r || e.group !== r) && e.findControl(this.getViewportPoint(t));
    if (i) {
      const n = i.control;
      this.setCursor(n.cursorStyleHandler(t, n, e));
    } else e.subTargetCheck && this.targets.concat().reverse().map((n) => {
      s = n.hoverCursor || s;
    }), this.setCursor(s);
  }
  handleMultiSelection(t, e) {
    const s = this._activeObject, r = le(s);
    if (s && this._isSelectionKeyPressed(t) && this.selection && e && e.selectable && (s !== e || r) && (r || !e.isDescendantOf(s) && !s.isDescendantOf(e)) && !e.onSelect({ e: t }) && !s.getActiveControl()) {
      if (r) {
        const i = s.getObjects();
        if (e === s) {
          const n = this.getViewportPoint(t);
          if (!(e = this.searchPossibleTargets(i, n) || this.searchPossibleTargets(this._objects, n)) || !e.selectable) return !1;
        }
        e.group === s ? (s.remove(e), this._hoveredTarget = e, this._hoveredTargets = [...this.targets], s.size() === 1 && this._setActiveObject(s.item(0), t)) : (s.multiSelectAdd(e), this._hoveredTarget = s, this._hoveredTargets = [...this.targets]), this._fireSelectionEvents(i, t);
      } else {
        s.isEditing && s.exitEditing();
        const i = new (D.getClass("ActiveSelection"))([], { canvas: this });
        i.multiSelectAdd(s, e), this._hoveredTarget = i, this._setActiveObject(i, t), this._fireSelectionEvents([s], t);
      }
      return !0;
    }
    return !1;
  }
  handleSelection(t) {
    if (!this.selection || !this._groupSelector) return !1;
    const { x: e, y: s, deltaX: r, deltaY: i } = this._groupSelector, n = new _(e, s), o = n.add(new _(r, i)), h = n.min(o), l = n.max(o).subtract(h), c = this.collectObjects({ left: h.x, top: h.y, width: l.x, height: l.y }, { includeIntersecting: !this.selectionFullyContained }), u = n.eq(o) ? c[0] ? [c[0]] : [] : c.length > 1 ? c.filter((g) => !g.onSelect({ e: t })).reverse() : c;
    if (u.length === 1) this.setActiveObject(u[0], t);
    else if (u.length > 1) {
      const g = D.getClass("ActiveSelection");
      this.setActiveObject(new g(u, { canvas: this }), t);
    }
    return this._groupSelector = null, !0;
  }
  clear() {
    this.textEditingManager.clear(), super.clear();
  }
  destroy() {
    this.removeListeners(), this.textEditingManager.dispose(), super.destroy();
  }
}
const qo = { x1: 0, y1: 0, x2: 0, y2: 0 }, ul = y(y({}, qo), {}, { r1: 0, r2: 0 }), Te = (a, t) => isNaN(a) && typeof t == "number" ? t : a, gl = /^(\d+\.\d+)%|(\d+)%$/;
function Qo(a) {
  return a && gl.test(a);
}
function $o(a, t) {
  const e = typeof a == "number" ? a : typeof a == "string" ? parseFloat(a) / (Qo(a) ? 100 : 1) : NaN;
  return be(0, Te(e, t), 1);
}
const dl = /\s*;\s*/, fl = /\s*:\s*/;
function pl(a, t) {
  let e, s;
  const r = a.getAttribute("style");
  if (r) {
    const n = r.split(dl);
    n[n.length - 1] === "" && n.pop();
    for (let o = n.length; o--; ) {
      const [h, l] = n[o].split(fl).map((c) => c.trim());
      h === "stop-color" ? e = l : h === "stop-opacity" && (s = l);
    }
  }
  const i = new Y(e || a.getAttribute("stop-color") || "rgb(0,0,0)");
  return { offset: $o(a.getAttribute("offset"), 0), color: i.toRgb(), opacity: Te(parseFloat(s || a.getAttribute("stop-opacity") || ""), 1) * i.getAlpha() * t };
}
function ml(a, t) {
  const e = [], s = a.getElementsByTagName("stop"), r = $o(t, 1);
  for (let i = s.length; i--; ) e.push(pl(s[i], r));
  return e;
}
function Jo(a) {
  return a.nodeName === "linearGradient" || a.nodeName === "LINEARGRADIENT" ? "linear" : "radial";
}
function ta(a) {
  return a.getAttribute("gradientUnits") === "userSpaceOnUse" ? "pixels" : "percentage";
}
function Ct(a, t) {
  return a.getAttribute(t);
}
function vl(a, t) {
  return function(e, s) {
    let r, { width: i, height: n, gradientUnits: o } = s;
    return Object.keys(e).reduce((h, l) => {
      const c = e[l];
      return c === "Infinity" ? r = 1 : c === "-Infinity" ? r = 0 : (r = typeof c == "string" ? parseFloat(c) : c, typeof c == "string" && Qo(c) && (r *= 0.01, o === "pixels" && (l !== "x1" && l !== "x2" && l !== "r2" || (r *= i), l !== "y1" && l !== "y2" || (r *= n)))), h[l] = r, h;
    }, {});
  }(Jo(a) === "linear" ? function(e) {
    return { x1: Ct(e, "x1") || 0, y1: Ct(e, "y1") || 0, x2: Ct(e, "x2") || "100%", y2: Ct(e, "y2") || 0 };
  }(a) : function(e) {
    return { x1: Ct(e, "fx") || Ct(e, "cx") || "50%", y1: Ct(e, "fy") || Ct(e, "cy") || "50%", r1: 0, x2: Ct(e, "cx") || "50%", y2: Ct(e, "cy") || "50%", r2: Ct(e, "r") || "50%" };
  }(a), y(y({}, t), {}, { gradientUnits: ta(a) }));
}
class Ge {
  constructor(t) {
    const { type: e = "linear", gradientUnits: s = "pixels", coords: r = {}, colorStops: i = [], offsetX: n = 0, offsetY: o = 0, gradientTransform: h, id: l } = t || {};
    Object.assign(this, { type: e, gradientUnits: s, coords: y(y({}, e === "radial" ? ul : qo), r), colorStops: i, offsetX: n, offsetY: o, gradientTransform: h, id: l ? "".concat(l, "_").concat(se()) : se() });
  }
  addColorStop(t) {
    for (const e in t) {
      const s = new Y(t[e]);
      this.colorStops.push({ offset: parseFloat(e), color: s.toRgb(), opacity: s.getAlpha() });
    }
    return this;
  }
  toObject(t) {
    return y(y({}, _e(this, t)), {}, { type: this.type, coords: y({}, this.coords), colorStops: this.colorStops.map((e) => y({}, e)), offsetX: this.offsetX, offsetY: this.offsetY, gradientUnits: this.gradientUnits, gradientTransform: this.gradientTransform ? [...this.gradientTransform] : void 0 });
  }
  toSVG(t) {
    let { additionalTransform: e } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const s = [], r = this.gradientTransform ? this.gradientTransform.concat() : lt.concat(), i = this.gradientUnits === "pixels" ? "userSpaceOnUse" : "objectBoundingBox", n = this.colorStops.map((u) => y({}, u)).sort((u, g) => u.offset - g.offset);
    let o = -this.offsetX, h = -this.offsetY;
    var l;
    i === "objectBoundingBox" ? (o /= t.width, h /= t.height) : (o += t.width / 2, h += t.height / 2), (l = t) && typeof l._renderPathCommands == "function" && this.gradientUnits !== "percentage" && (o -= t.pathOffset.x, h -= t.pathOffset.y), r[4] -= o, r[5] -= h;
    const c = ['id="SVGID_'.concat(this.id, '"'), 'gradientUnits="'.concat(i, '"'), 'gradientTransform="'.concat(e ? e + " " : "").concat(es(r), '"'), ""].join(" ");
    if (this.type === "linear") {
      const { x1: u, y1: g, x2: d, y2: f } = this.coords;
      s.push("<linearGradient ", c, ' x1="', u, '" y1="', g, '" x2="', d, '" y2="', f, `">
`);
    } else if (this.type === "radial") {
      const { x1: u, y1: g, x2: d, y2: f, r1: p, r2: m } = this.coords, v = p > m;
      s.push("<radialGradient ", c, ' cx="', v ? u : d, '" cy="', v ? g : f, '" r="', v ? p : m, '" fx="', v ? d : u, '" fy="', v ? f : g, `">
`), v && (n.reverse(), n.forEach((w) => {
        w.offset = 1 - w.offset;
      }));
      const C = Math.min(p, m);
      if (C > 0) {
        const w = C / Math.max(p, m);
        n.forEach((S) => {
          S.offset += w * (1 - S.offset);
        });
      }
    }
    return n.forEach((u) => {
      let { color: g, offset: d, opacity: f } = u;
      s.push("<stop ", 'offset="', 100 * d + "%", '" style="stop-color:', g, f !== void 0 ? ";stop-opacity: " + f : ";", `"/>
`);
    }), s.push(this.type === "linear" ? "</linearGradient>" : "</radialGradient>", `
`), s.join("");
  }
  toLive(t) {
    const { x1: e, y1: s, x2: r, y2: i, r1: n, r2: o } = this.coords, h = this.type === "linear" ? t.createLinearGradient(e, s, r, i) : t.createRadialGradient(e, s, n, r, i, o);
    return this.colorStops.forEach((l) => {
      let { color: c, opacity: u, offset: g } = l;
      h.addColorStop(g, u !== void 0 ? new Y(c).setAlpha(u).toRgba() : c);
    }), h;
  }
  static fromObject(t) {
    return R(this, null, function* () {
      const { colorStops: e, gradientTransform: s } = t;
      return new this(y(y({}, t), {}, { colorStops: e ? e.map((r) => y({}, r)) : void 0, gradientTransform: s ? [...s] : void 0 }));
    });
  }
  static fromElement(t, e, s) {
    const r = ta(t), i = e._findCenterFromElement();
    return new this(y({ id: t.getAttribute("id") || void 0, type: Jo(t), coords: vl(t, { width: s.viewBoxWidth || s.width, height: s.viewBoxHeight || s.height }), colorStops: ml(t, s.opacity), gradientUnits: r, gradientTransform: qs(t.getAttribute("gradientTransform") || "") }, r === "pixels" ? { offsetX: e.width / 2 - i.x, offsetY: e.height / 2 - i.y } : { offsetX: 0, offsetY: 0 }));
  }
}
b(Ge, "type", "Gradient"), D.setClass(Ge, "gradient"), D.setClass(Ge, "linear"), D.setClass(Ge, "radial");
const yl = ["type", "source", "patternTransform"];
class Ws {
  get type() {
    return "pattern";
  }
  set type(t) {
    Xt("warn", "Setting type has no effect", t);
  }
  constructor(t) {
    b(this, "repeat", "repeat"), b(this, "offsetX", 0), b(this, "offsetY", 0), b(this, "crossOrigin", ""), this.id = se(), Object.assign(this, t);
  }
  isImageSource() {
    return !!this.source && typeof this.source.src == "string";
  }
  isCanvasSource() {
    return !!this.source && !!this.source.toDataURL;
  }
  sourceToString() {
    return this.isImageSource() ? this.source.src : this.isCanvasSource() ? this.source.toDataURL() : "";
  }
  toLive(t) {
    return this.source && (!this.isImageSource() || this.source.complete && this.source.naturalWidth !== 0 && this.source.naturalHeight !== 0) ? t.createPattern(this.source, this.repeat) : null;
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    const { repeat: e, crossOrigin: s } = this;
    return y(y({}, _e(this, t)), {}, { type: "pattern", source: this.sourceToString(), repeat: e, crossOrigin: s, offsetX: z(this.offsetX, N.NUM_FRACTION_DIGITS), offsetY: z(this.offsetY, N.NUM_FRACTION_DIGITS), patternTransform: this.patternTransform ? [...this.patternTransform] : null });
  }
  toSVG(t) {
    let { width: e, height: s } = t;
    const { source: r, repeat: i, id: n } = this, o = Te(this.offsetX / e, 0), h = Te(this.offsetY / s, 0), l = i === "repeat-y" || i === "no-repeat" ? 1 + Math.abs(o || 0) : Te(r.width / e, 0), c = i === "repeat-x" || i === "no-repeat" ? 1 + Math.abs(h || 0) : Te(r.height / s, 0);
    return ['<pattern id="SVGID_'.concat(n, '" x="').concat(o, '" y="').concat(h, '" width="').concat(l, '" height="').concat(c, '">'), '<image x="0" y="0" width="'.concat(r.width, '" height="').concat(r.height, '" xlink:href="').concat(this.sourceToString(), '"></image>'), "</pattern>", ""].join(`
`);
  }
  static fromObject(t, e) {
    return R(this, null, function* () {
      let { type: s, source: r, patternTransform: i } = t, n = H(t, yl);
      const o = yield qe(r, y(y({}, e), {}, { crossOrigin: n.crossOrigin }));
      return new this(y(y({}, n), {}, { patternTransform: i && i.slice(0), source: o }));
    });
  }
}
b(Ws, "type", "Pattern"), D.setClass(Ws), D.setClass(Ws, "pattern");
const bl = ["path", "left", "top"], _l = ["d"];
class ce extends rt {
  constructor(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, { path: s, left: r, top: i } = e, n = H(e, bl);
    super(), Object.assign(this, ce.ownDefaults), this.setOptions(n), this._setPath(t || [], !0), typeof r == "number" && this.set(B, r), typeof i == "number" && this.set(dt, i);
  }
  _setPath(t, e) {
    this.path = Wo(Array.isArray(t) ? t : Go(t)), this.setBoundingBox(e);
  }
  _findCenterFromElement() {
    const t = this._calcBoundsFromPath();
    return new _(t.left + t.width / 2, t.top + t.height / 2);
  }
  _renderPathCommands(t) {
    const e = -this.pathOffset.x, s = -this.pathOffset.y;
    t.beginPath();
    for (const r of this.path) switch (r[0]) {
      case "L":
        t.lineTo(r[1] + e, r[2] + s);
        break;
      case "M":
        t.moveTo(r[1] + e, r[2] + s);
        break;
      case "C":
        t.bezierCurveTo(r[1] + e, r[2] + s, r[3] + e, r[4] + s, r[5] + e, r[6] + s);
        break;
      case "Q":
        t.quadraticCurveTo(r[1] + e, r[2] + s, r[3] + e, r[4] + s);
        break;
      case "Z":
        t.closePath();
    }
  }
  _render(t) {
    this._renderPathCommands(t), this._renderPaintInOrder(t);
  }
  toString() {
    return "#<Path (".concat(this.complexity(), '): { "top": ').concat(this.top, ', "left": ').concat(this.left, " }>");
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    return y(y({}, super.toObject(t)), {}, { path: this.path.map((e) => e.slice()) });
  }
  toDatalessObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    const e = this.toObject(t);
    return this.sourcePath && (delete e.path, e.sourcePath = this.sourcePath), e;
  }
  _toSVG() {
    const t = Zo(this.path, N.NUM_FRACTION_DIGITS);
    return ["<path ", "COMMON_PARTS", 'd="'.concat(t, `" stroke-linecap="round" />
`)];
  }
  _getOffsetTransform() {
    const t = N.NUM_FRACTION_DIGITS;
    return " translate(".concat(z(-this.pathOffset.x, t), ", ").concat(z(-this.pathOffset.y, t), ")");
  }
  toClipPathSVG(t) {
    const e = this._getOffsetTransform();
    return "	" + this._createBaseClipPathSVGMarkup(this._toSVG(), { reviver: t, additionalTransform: e });
  }
  toSVG(t) {
    const e = this._getOffsetTransform();
    return this._createBaseSVGMarkup(this._toSVG(), { reviver: t, additionalTransform: e });
  }
  complexity() {
    return this.path.length;
  }
  setDimensions() {
    this.setBoundingBox();
  }
  setBoundingBox(t) {
    const { width: e, height: s, pathOffset: r } = this._calcDimensions();
    this.set({ width: e, height: s, pathOffset: r }), t && this.setPositionByOrigin(r, P, P);
  }
  _calcBoundsFromPath() {
    const t = [];
    let e = 0, s = 0, r = 0, i = 0;
    for (const n of this.path) switch (n[0]) {
      case "L":
        r = n[1], i = n[2], t.push({ x: e, y: s }, { x: r, y: i });
        break;
      case "M":
        r = n[1], i = n[2], e = r, s = i;
        break;
      case "C":
        t.push(...ri(r, i, n[1], n[2], n[3], n[4], n[5], n[6])), r = n[5], i = n[6];
        break;
      case "Q":
        t.push(...ri(r, i, n[1], n[2], n[1], n[2], n[3], n[4])), r = n[3], i = n[4];
        break;
      case "Z":
        r = e, i = s;
    }
    return Lt(t);
  }
  _calcDimensions() {
    const t = this._calcBoundsFromPath();
    return y(y({}, t), {}, { pathOffset: new _(t.left + t.width / 2, t.top + t.height / 2) });
  }
  static fromObject(t) {
    return this._fromObject(t, { extraParam: "path" });
  }
  static fromElement(t, e, s) {
    return R(this, null, function* () {
      const r = Kt(t, this.ATTRIBUTE_NAMES, s), { d: i } = r;
      return new this(i, y(y(y({}, H(r, _l)), e), {}, { left: void 0, top: void 0 }));
    });
  }
}
b(ce, "type", "Path"), b(ce, "cacheProperties", [...Zt, "path", "fillRule"]), b(ce, "ATTRIBUTE_NAMES", [...oe, "d"]), D.setClass(ce), D.setSVGClass(ce);
const Cl = ["left", "top", "radius"], ea = ["radius", "startAngle", "endAngle", "counterClockwise"];
class Et extends rt {
  static getDefaults() {
    return y(y({}, super.getDefaults()), Et.ownDefaults);
  }
  constructor(t) {
    super(), Object.assign(this, Et.ownDefaults), this.setOptions(t);
  }
  _set(t, e) {
    return super._set(t, e), t === "radius" && this.setRadius(e), this;
  }
  _render(t) {
    t.beginPath(), t.arc(0, 0, this.radius, X(this.startAngle), X(this.endAngle), this.counterClockwise), this._renderPaintInOrder(t);
  }
  getRadiusX() {
    return this.get("radius") * this.get(ct);
  }
  getRadiusY() {
    return this.get("radius") * this.get(vt);
  }
  setRadius(t) {
    this.radius = t, this.set({ width: 2 * t, height: 2 * t });
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    return super.toObject([...ea, ...t]);
  }
  _toSVG() {
    const t = (this.endAngle - this.startAngle) % 360;
    if (t === 0) return ["<circle ", "COMMON_PARTS", 'cx="0" cy="0" ', 'r="', "".concat(this.radius), `" />
`];
    {
      const { radius: e } = this, s = X(this.startAngle), r = X(this.endAngle), i = Ot(s) * e, n = jt(s) * e, o = Ot(r) * e, h = jt(r) * e, l = t > 180 ? 1 : 0, c = this.counterClockwise ? 0 : 1;
      return ['<path d="M '.concat(i, " ").concat(n, " A ").concat(e, " ").concat(e, " 0 ").concat(l, " ").concat(c, " ").concat(o, " ").concat(h, '" '), "COMMON_PARTS", ` />
`];
    }
  }
  static fromElement(t, e, s) {
    return R(this, null, function* () {
      const r = Kt(t, this.ATTRIBUTE_NAMES, s), { left: i = 0, top: n = 0, radius: o = 0 } = r;
      return new this(y(y({}, H(r, Cl)), {}, { radius: o, left: i - o, top: n - o }));
    });
  }
  static fromObject(t) {
    return super._fromObject(t);
  }
}
b(Et, "type", "Circle"), b(Et, "cacheProperties", [...Zt, ...ea]), b(Et, "ownDefaults", { radius: 0, startAngle: 0, endAngle: 360, counterClockwise: !1 }), b(Et, "ATTRIBUTE_NAMES", ["cx", "cy", "r", ...oe]), D.setClass(Et), D.setSVGClass(Et);
const wl = ["x1", "y1", "x2", "y2"], Sl = ["x1", "y1", "x2", "y2"], ni = ["x1", "x2", "y1", "y2"];
class ue extends rt {
  constructor() {
    let [t, e, s, r] = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [0, 0, 0, 0], i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    super(), Object.assign(this, ue.ownDefaults), this.setOptions(i), this.x1 = t, this.x2 = s, this.y1 = e, this.y2 = r, this._setWidthHeight();
    const { left: n, top: o } = i;
    typeof n == "number" && this.set(B, n), typeof o == "number" && this.set(dt, o);
  }
  _setWidthHeight() {
    const { x1: t, y1: e, x2: s, y2: r } = this;
    this.width = Math.abs(s - t), this.height = Math.abs(r - e);
    const { left: i, top: n, width: o, height: h } = Lt([{ x: t, y: e }, { x: s, y: r }]), l = new _(i + o / 2, n + h / 2);
    this.setPositionByOrigin(l, P, P);
  }
  _set(t, e) {
    return super._set(t, e), ni.includes(t) && this._setWidthHeight(), this;
  }
  _render(t) {
    t.beginPath();
    const e = this.calcLinePoints();
    t.moveTo(e.x1, e.y1), t.lineTo(e.x2, e.y2), t.lineWidth = this.strokeWidth;
    const s = t.strokeStyle;
    var r;
    bt(this.stroke) ? t.strokeStyle = this.stroke.toLive(t) : t.strokeStyle = (r = this.stroke) !== null && r !== void 0 ? r : t.fillStyle, this.stroke && this._renderStroke(t), t.strokeStyle = s;
  }
  _findCenterFromElement() {
    return new _((this.x1 + this.x2) / 2, (this.y1 + this.y2) / 2);
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    return y(y({}, super.toObject(t)), this.calcLinePoints());
  }
  _getNonTransformedDimensions() {
    const t = super._getNonTransformedDimensions();
    return this.strokeLineCap === "butt" && (this.width === 0 && (t.y -= this.strokeWidth), this.height === 0 && (t.x -= this.strokeWidth)), t;
  }
  calcLinePoints() {
    const { x1: t, x2: e, y1: s, y2: r, width: i, height: n } = this, o = t <= e ? -1 : 1, h = s <= r ? -1 : 1;
    return { x1: o * i / 2, x2: o * -i / 2, y1: h * n / 2, y2: h * -n / 2 };
  }
  _toSVG() {
    const { x1: t, x2: e, y1: s, y2: r } = this.calcLinePoints();
    return ["<line ", "COMMON_PARTS", 'x1="'.concat(t, '" y1="').concat(s, '" x2="').concat(e, '" y2="').concat(r, `" />
`)];
  }
  static fromElement(t, e, s) {
    return R(this, null, function* () {
      const r = Kt(t, this.ATTRIBUTE_NAMES, s), { x1: i = 0, y1: n = 0, x2: o = 0, y2: h = 0 } = r;
      return new this([i, n, o, h], H(r, wl));
    });
  }
  static fromObject(t) {
    let { x1: e, y1: s, x2: r, y2: i } = t, n = H(t, Sl);
    return this._fromObject(y(y({}, n), {}, { points: [e, s, r, i] }), { extraParam: "points" });
  }
}
b(ue, "type", "Line"), b(ue, "cacheProperties", [...Zt, ...ni]), b(ue, "ATTRIBUTE_NAMES", oe.concat(ni)), D.setClass(ue), D.setSVGClass(ue);
class te extends rt {
  static getDefaults() {
    return y(y({}, super.getDefaults()), te.ownDefaults);
  }
  constructor(t) {
    super(), Object.assign(this, te.ownDefaults), this.setOptions(t);
  }
  _render(t) {
    const e = this.width / 2, s = this.height / 2;
    t.beginPath(), t.moveTo(-e, s), t.lineTo(0, -s), t.lineTo(e, s), t.closePath(), this._renderPaintInOrder(t);
  }
  _toSVG() {
    const t = this.width / 2, e = this.height / 2;
    return ["<polygon ", "COMMON_PARTS", 'points="', "".concat(-t, " ").concat(e, ",0 ").concat(-e, ",").concat(t, " ").concat(e), '" />'];
  }
}
b(te, "type", "Triangle"), b(te, "ownDefaults", { width: 100, height: 100 }), D.setClass(te), D.setSVGClass(te);
const sa = ["rx", "ry"];
class Yt extends rt {
  static getDefaults() {
    return y(y({}, super.getDefaults()), Yt.ownDefaults);
  }
  constructor(t) {
    super(), Object.assign(this, Yt.ownDefaults), this.setOptions(t);
  }
  _set(t, e) {
    switch (super._set(t, e), t) {
      case "rx":
        this.rx = e, this.set("width", 2 * e);
        break;
      case "ry":
        this.ry = e, this.set("height", 2 * e);
    }
    return this;
  }
  getRx() {
    return this.get("rx") * this.get(ct);
  }
  getRy() {
    return this.get("ry") * this.get(vt);
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    return super.toObject([...sa, ...t]);
  }
  _toSVG() {
    return ["<ellipse ", "COMMON_PARTS", 'cx="0" cy="0" rx="'.concat(this.rx, '" ry="').concat(this.ry, `" />
`)];
  }
  _render(t) {
    t.beginPath(), t.save(), t.transform(1, 0, 0, this.ry / this.rx, 0, 0), t.arc(0, 0, this.rx, 0, Gt, !1), t.restore(), this._renderPaintInOrder(t);
  }
  static fromElement(t, e, s) {
    return R(this, null, function* () {
      const r = Kt(t, this.ATTRIBUTE_NAMES, s);
      return r.left = (r.left || 0) - r.rx, r.top = (r.top || 0) - r.ry, new this(r);
    });
  }
}
function xl(a) {
  if (!a) return [];
  const t = a.replace(/,/g, " ").trim().split(/\s+/), e = [];
  for (let s = 0; s < t.length; s += 2) e.push({ x: parseFloat(t[s]), y: parseFloat(t[s + 1]) });
  return e;
}
b(Yt, "type", "Ellipse"), b(Yt, "cacheProperties", [...Zt, ...sa]), b(Yt, "ownDefaults", { rx: 0, ry: 0 }), b(Yt, "ATTRIBUTE_NAMES", [...oe, "cx", "cy", "rx", "ry"]), D.setClass(Yt), D.setSVGClass(Yt);
const Ml = ["left", "top"], ra = { exactBoundingBox: !1 };
class wt extends rt {
  static getDefaults() {
    return y(y({}, super.getDefaults()), wt.ownDefaults);
  }
  constructor() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    super(), b(this, "strokeDiff", void 0), Object.assign(this, wt.ownDefaults), this.setOptions(e), this.points = t;
    const { left: s, top: r } = e;
    this.initialized = !0, this.setBoundingBox(!0), typeof s == "number" && this.set(B, s), typeof r == "number" && this.set(dt, r);
  }
  isOpen() {
    return !0;
  }
  _projectStrokeOnPoints(t) {
    return ko(this.points, t, this.isOpen());
  }
  _calcDimensions(t) {
    t = y({ scaleX: this.scaleX, scaleY: this.scaleY, skewX: this.skewX, skewY: this.skewY, strokeLineCap: this.strokeLineCap, strokeLineJoin: this.strokeLineJoin, strokeMiterLimit: this.strokeMiterLimit, strokeUniform: this.strokeUniform, strokeWidth: this.strokeWidth }, t || {});
    const e = this.exactBoundingBox ? this._projectStrokeOnPoints(t).map((l) => l.projectedPoint) : this.points;
    if (e.length === 0) return { left: 0, top: 0, width: 0, height: 0, pathOffset: new _(), strokeOffset: new _(), strokeDiff: new _() };
    const s = Lt(e), r = is(y(y({}, t), {}, { scaleX: 1, scaleY: 1 })), i = Lt(this.points.map((l) => st(l, r, !0))), n = new _(this.scaleX, this.scaleY);
    let o = s.left + s.width / 2, h = s.top + s.height / 2;
    return this.exactBoundingBox && (o -= h * Math.tan(X(this.skewX)), h -= o * Math.tan(X(this.skewY))), y(y({}, s), {}, { pathOffset: new _(o, h), strokeOffset: new _(i.left, i.top).subtract(new _(s.left, s.top)).multiply(n), strokeDiff: new _(s.width, s.height).subtract(new _(i.width, i.height)).multiply(n) });
  }
  _findCenterFromElement() {
    const t = Lt(this.points);
    return new _(t.left + t.width / 2, t.top + t.height / 2);
  }
  setDimensions() {
    this.setBoundingBox();
  }
  setBoundingBox(t) {
    const { left: e, top: s, width: r, height: i, pathOffset: n, strokeOffset: o, strokeDiff: h } = this._calcDimensions();
    this.set({ width: r, height: i, pathOffset: n, strokeOffset: o, strokeDiff: h }), t && this.setPositionByOrigin(new _(e + r / 2, s + i / 2), P, P);
  }
  isStrokeAccountedForInDimensions() {
    return this.exactBoundingBox;
  }
  _getNonTransformedDimensions() {
    return this.exactBoundingBox ? new _(this.width, this.height) : super._getNonTransformedDimensions();
  }
  _getTransformedDimensions() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (this.exactBoundingBox) {
      let n;
      if (Object.keys(t).some((o) => this.strokeUniform || this.constructor.layoutProperties.includes(o))) {
        var e, s;
        const { width: o, height: h } = this._calcDimensions(t);
        n = new _((e = t.width) !== null && e !== void 0 ? e : o, (s = t.height) !== null && s !== void 0 ? s : h);
      } else {
        var r, i;
        n = new _((r = t.width) !== null && r !== void 0 ? r : this.width, (i = t.height) !== null && i !== void 0 ? i : this.height);
      }
      return n.multiply(new _(t.scaleX || this.scaleX, t.scaleY || this.scaleY));
    }
    return super._getTransformedDimensions(t);
  }
  _set(t, e) {
    const s = this.initialized && this[t] !== e, r = super._set(t, e);
    return this.exactBoundingBox && s && ((t === ct || t === vt) && this.strokeUniform && this.constructor.layoutProperties.includes("strokeUniform") || this.constructor.layoutProperties.includes(t)) && this.setDimensions(), r;
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    return y(y({}, super.toObject(t)), {}, { points: this.points.map((e) => {
      let { x: s, y: r } = e;
      return { x: s, y: r };
    }) });
  }
  _toSVG() {
    const t = [], e = this.pathOffset.x, s = this.pathOffset.y, r = N.NUM_FRACTION_DIGITS;
    for (let i = 0, n = this.points.length; i < n; i++) t.push(z(this.points[i].x - e, r), ",", z(this.points[i].y - s, r), " ");
    return ["<".concat(this.constructor.type.toLowerCase(), " "), "COMMON_PARTS", 'points="'.concat(t.join(""), `" />
`)];
  }
  _render(t) {
    const e = this.points.length, s = this.pathOffset.x, r = this.pathOffset.y;
    if (e && !isNaN(this.points[e - 1].y)) {
      t.beginPath(), t.moveTo(this.points[0].x - s, this.points[0].y - r);
      for (let i = 0; i < e; i++) {
        const n = this.points[i];
        t.lineTo(n.x - s, n.y - r);
      }
      !this.isOpen() && t.closePath(), this._renderPaintInOrder(t);
    }
  }
  complexity() {
    return this.points.length;
  }
  static fromElement(t, e, s) {
    return R(this, null, function* () {
      return new this(xl(t.getAttribute("points")), y(y({}, H(Kt(t, this.ATTRIBUTE_NAMES, s), Ml)), e));
    });
  }
  static fromObject(t) {
    return this._fromObject(t, { extraParam: "points" });
  }
}
b(wt, "ownDefaults", ra), b(wt, "type", "Polyline"), b(wt, "layoutProperties", [Ne, Re, "strokeLineCap", "strokeLineJoin", "strokeMiterLimit", "strokeWidth", "strokeUniform", "points"]), b(wt, "cacheProperties", [...Zt, "points"]), b(wt, "ATTRIBUTE_NAMES", [...oe]), D.setClass(wt), D.setSVGClass(wt);
class fs extends wt {
  isOpen() {
    return !1;
  }
}
b(fs, "ownDefaults", ra), b(fs, "type", "Polygon"), D.setClass(fs), D.setSVGClass(fs);
const ia = ["fontSize", "fontWeight", "fontFamily", "fontStyle"], na = ["underline", "overline", "linethrough"], oa = [...ia, "lineHeight", "text", "charSpacing", "textAlign", "styles", "path", "pathStartOffset", "pathSide", "pathAlign"], aa = [...oa, ...na, "textBackgroundColor", "direction"], Tl = [...ia, ...na, ht, "strokeWidth", Q, "deltaY", "textBackgroundColor"], Ol = { _reNewline: mi, _reSpacesAndTabs: /[ \t\r]/g, _reSpaceAndTab: /[ \t\r]/, _reWords: /\S+/g, fontSize: 40, fontWeight: "normal", fontFamily: "Times New Roman", underline: !1, overline: !1, linethrough: !1, textAlign: B, fontStyle: "normal", lineHeight: 1.16, superscript: { size: 0.6, baseline: -0.35 }, subscript: { size: 0.6, baseline: 0.11 }, textBackgroundColor: "", stroke: null, shadow: null, path: void 0, pathStartOffset: 0, pathSide: B, pathAlign: "baseline", _fontSizeFraction: 0.222, offsets: { underline: 0.1, linethrough: -0.315, overline: -0.88 }, _fontSizeMult: 1.13, charSpacing: 0, deltaY: 0, direction: "ltr", CACHE_FONT_SIZE: 400, MIN_TEXT_WIDTH: 2 }, kt = "justify", er = "justify-left", Qe = "justify-right", $e = "justify-center";
class ha extends rt {
  isEmptyStyles(t) {
    if (!this.styles || t !== void 0 && !this.styles[t]) return !0;
    const e = t === void 0 ? this.styles : { line: this.styles[t] };
    for (const s in e) for (const r in e[s]) for (const i in e[s][r]) return !1;
    return !0;
  }
  styleHas(t, e) {
    if (!this.styles || e !== void 0 && !this.styles[e]) return !1;
    const s = e === void 0 ? this.styles : { 0: this.styles[e] };
    for (const r in s) for (const i in s[r]) if (s[r][i][t] !== void 0) return !0;
    return !1;
  }
  cleanStyle(t) {
    if (!this.styles) return !1;
    const e = this.styles;
    let s, r, i = 0, n = !0, o = 0;
    for (const h in e) {
      s = 0;
      for (const l in e[h]) {
        const c = e[h][l] || {};
        i++, c[t] !== void 0 ? (r ? c[t] !== r && (n = !1) : r = c[t], c[t] === this[t] && delete c[t]) : n = !1, Object.keys(c).length !== 0 ? s++ : delete e[h][l];
      }
      s === 0 && delete e[h];
    }
    for (let h = 0; h < this._textLines.length; h++) o += this._textLines[h].length;
    n && i === o && (this[t] = r, this.removeStyle(t));
  }
  removeStyle(t) {
    if (!this.styles) return;
    const e = this.styles;
    let s, r, i;
    for (r in e) {
      for (i in s = e[r], s) delete s[i][t], Object.keys(s[i]).length === 0 && delete s[i];
      Object.keys(s).length === 0 && delete e[r];
    }
  }
  _extendStyles(t, e) {
    const { lineIndex: s, charIndex: r } = this.get2DCursorLocation(t);
    this._getLineStyle(s) || this._setLineStyle(s);
    const i = wi(y(y({}, this._getStyleDeclaration(s, r)), e), (n) => n !== void 0);
    this._setStyleDeclaration(s, r, i);
  }
  getSelectionStyles(t, e, s) {
    const r = [];
    for (let i = t; i < (e || t); i++) r.push(this.getStyleAtPosition(i, s));
    return r;
  }
  getStyleAtPosition(t, e) {
    const { lineIndex: s, charIndex: r } = this.get2DCursorLocation(t);
    return e ? this.getCompleteStyleDeclaration(s, r) : this._getStyleDeclaration(s, r);
  }
  setSelectionStyles(t, e, s) {
    for (let r = e; r < (s || e); r++) this._extendStyles(r, t);
    this._forceClearCache = !0;
  }
  _getStyleDeclaration(t, e) {
    var s;
    const r = this.styles && this.styles[t];
    return r && (s = r[e]) !== null && s !== void 0 ? s : {};
  }
  getCompleteStyleDeclaration(t, e) {
    return y(y({}, _e(this, this.constructor._styleProperties)), this._getStyleDeclaration(t, e));
  }
  _setStyleDeclaration(t, e, s) {
    this.styles[t][e] = s;
  }
  _deleteStyleDeclaration(t, e) {
    delete this.styles[t][e];
  }
  _getLineStyle(t) {
    return !!this.styles[t];
  }
  _setLineStyle(t) {
    this.styles[t] = {};
  }
  _deleteLineStyle(t) {
    delete this.styles[t];
  }
}
b(ha, "_styleProperties", Tl);
const jl = /  +/g, Dl = /"/g;
function kr(a, t, e, s, r) {
  return "		".concat(function(i, n) {
    let { left: o, top: h, width: l, height: c } = n, u = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : N.NUM_FRACTION_DIGITS;
    const g = ss(Q, i, !1), [d, f, p, m] = [o, h, l, c].map((v) => z(v, u));
    return "<rect ".concat(g, ' x="').concat(d, '" y="').concat(f, '" width="').concat(p, '" height="').concat(m, '"></rect>');
  }(a, { left: t, top: e, width: s, height: r }), `
`);
}
const Al = ["textAnchor", "textDecoration", "dx", "dy", "top", "left", "fontSize", "strokeWidth"];
let Ir;
class it extends ha {
  static getDefaults() {
    return y(y({}, super.getDefaults()), it.ownDefaults);
  }
  constructor(t, e) {
    super(), b(this, "__charBounds", []), Object.assign(this, it.ownDefaults), this.setOptions(e), this.styles || (this.styles = {}), this.text = t, this.initialized = !0, this.path && this.setPathInfo(), this.initDimensions(), this.setCoords();
  }
  setPathInfo() {
    const t = this.path;
    t && (t.segmentsInfo = Fi(t.path));
  }
  _splitText() {
    const t = this._splitTextIntoLines(this.text);
    return this.textLines = t.lines, this._textLines = t.graphemeLines, this._unwrappedTextLines = t._unwrappedLines, this._text = t.graphemeText, t;
  }
  initDimensions() {
    this._splitText(), this._clearCache(), this.dirty = !0, this.path ? (this.width = this.path.width, this.height = this.path.height) : (this.width = this.calcTextWidth() || this.cursorWidth || this.MIN_TEXT_WIDTH, this.height = this.calcTextHeight()), this.textAlign.includes(kt) && this.enlargeSpaces();
  }
  enlargeSpaces() {
    let t, e, s, r, i, n, o;
    for (let h = 0, l = this._textLines.length; h < l; h++) if ((this.textAlign === kt || h !== l - 1 && !this.isEndOfWrapping(h)) && (r = 0, i = this._textLines[h], e = this.getLineWidth(h), e < this.width && (o = this.textLines[h].match(this._reSpacesAndTabs)))) {
      s = o.length, t = (this.width - e) / s;
      for (let c = 0; c <= i.length; c++) n = this.__charBounds[h][c], this._reSpaceAndTab.test(i[c]) ? (n.width += t, n.kernedWidth += t, n.left += r, r += t) : n.left += r;
    }
  }
  isEndOfWrapping(t) {
    return t === this._textLines.length - 1;
  }
  missingNewlineOffset(t) {
    return 1;
  }
  get2DCursorLocation(t, e) {
    const s = e ? this._unwrappedTextLines : this._textLines;
    let r;
    for (r = 0; r < s.length; r++) {
      if (t <= s[r].length) return { lineIndex: r, charIndex: t };
      t -= s[r].length + this.missingNewlineOffset(r, e);
    }
    return { lineIndex: r - 1, charIndex: s[r - 1].length < t ? s[r - 1].length : t };
  }
  toString() {
    return "#<Text (".concat(this.complexity(), '): { "text": "').concat(this.text, '", "fontFamily": "').concat(this.fontFamily, '" }>');
  }
  _getCacheCanvasDimensions() {
    const t = super._getCacheCanvasDimensions(), e = this.fontSize;
    return t.width += e * t.zoomX, t.height += e * t.zoomY, t;
  }
  _render(t) {
    const e = this.path;
    e && !e.isNotVisible() && e._render(t), this._setTextStyles(t), this._renderTextLinesBackground(t), this._renderTextDecoration(t, "underline"), this._renderText(t), this._renderTextDecoration(t, "overline"), this._renderTextDecoration(t, "linethrough");
  }
  _renderText(t) {
    this.paintFirst === ht ? (this._renderTextStroke(t), this._renderTextFill(t)) : (this._renderTextFill(t), this._renderTextStroke(t));
  }
  _setTextStyles(t, e, s) {
    if (t.textBaseline = "alphabetic", this.path) switch (this.pathAlign) {
      case P:
        t.textBaseline = "middle";
        break;
      case "ascender":
        t.textBaseline = dt;
        break;
      case "descender":
        t.textBaseline = Vr;
    }
    t.font = this._getFontDeclaration(e, s);
  }
  calcTextWidth() {
    let t = this.getLineWidth(0);
    for (let e = 1, s = this._textLines.length; e < s; e++) {
      const r = this.getLineWidth(e);
      r > t && (t = r);
    }
    return t;
  }
  _renderTextLine(t, e, s, r, i, n) {
    this._renderChars(t, e, s, r, i, n);
  }
  _renderTextLinesBackground(t) {
    if (!this.textBackgroundColor && !this.styleHas("textBackgroundColor")) return;
    const e = t.fillStyle, s = this._getLeftOffset();
    let r = this._getTopOffset();
    for (let i = 0, n = this._textLines.length; i < n; i++) {
      const o = this.getHeightOfLine(i);
      if (!this.textBackgroundColor && !this.styleHas("textBackgroundColor", i)) {
        r += o;
        continue;
      }
      const h = this._textLines[i].length, l = this._getLineLeftOffset(i);
      let c, u, g = 0, d = 0, f = this.getValueOfPropertyAt(i, 0, "textBackgroundColor");
      for (let p = 0; p < h; p++) {
        const m = this.__charBounds[i][p];
        u = this.getValueOfPropertyAt(i, p, "textBackgroundColor"), this.path ? (t.save(), t.translate(m.renderLeft, m.renderTop), t.rotate(m.angle), t.fillStyle = u, u && t.fillRect(-m.width / 2, -o / this.lineHeight * (1 - this._fontSizeFraction), m.width, o / this.lineHeight), t.restore()) : u !== f ? (c = s + l + d, this.direction === "rtl" && (c = this.width - c - g), t.fillStyle = f, f && t.fillRect(c, r, g, o / this.lineHeight), d = m.left, g = m.width, f = u) : g += m.kernedWidth;
      }
      u && !this.path && (c = s + l + d, this.direction === "rtl" && (c = this.width - c - g), t.fillStyle = u, t.fillRect(c, r, g, o / this.lineHeight)), r += o;
    }
    t.fillStyle = e, this._removeShadow(t);
  }
  _measureChar(t, e, s, r) {
    const i = Ze.getFontCache(e), n = this._getFontDeclaration(e), o = s + t, h = s && n === this._getFontDeclaration(r), l = e.fontSize / this.CACHE_FONT_SIZE;
    let c, u, g, d;
    if (s && i[s] !== void 0 && (g = i[s]), i[t] !== void 0 && (d = c = i[t]), h && i[o] !== void 0 && (u = i[o], d = u - g), c === void 0 || g === void 0 || u === void 0) {
      const f = function() {
        return Ir || (Ir = Dt({ width: 0, height: 0 }).getContext("2d")), Ir;
      }();
      this._setTextStyles(f, e, !0), c === void 0 && (d = c = f.measureText(t).width, i[t] = c), g === void 0 && h && s && (g = f.measureText(s).width, i[s] = g), h && u === void 0 && (u = f.measureText(o).width, i[o] = u, d = u - g);
    }
    return { width: c * l, kernedWidth: d * l };
  }
  getHeightOfChar(t, e) {
    return this.getValueOfPropertyAt(t, e, "fontSize");
  }
  measureLine(t) {
    const e = this._measureLine(t);
    return this.charSpacing !== 0 && (e.width -= this._getWidthOfCharSpacing()), e.width < 0 && (e.width = 0), e;
  }
  _measureLine(t) {
    let e, s, r = 0;
    const i = this.pathSide === Z, n = this.path, o = this._textLines[t], h = o.length, l = new Array(h);
    this.__charBounds[t] = l;
    for (let c = 0; c < h; c++) {
      const u = o[c];
      s = this._getGraphemeBox(u, t, c, e), l[c] = s, r += s.kernedWidth, e = u;
    }
    if (l[h] = { left: s ? s.left + s.width : 0, width: 0, kernedWidth: 0, height: this.fontSize, deltaY: 0 }, n && n.segmentsInfo) {
      let c = 0;
      const u = n.segmentsInfo[n.segmentsInfo.length - 1].length;
      switch (this.textAlign) {
        case B:
          c = i ? u - r : 0;
          break;
        case P:
          c = (u - r) / 2;
          break;
        case Z:
          c = i ? 0 : u - r;
      }
      c += this.pathStartOffset * (i ? -1 : 1);
      for (let g = i ? h - 1 : 0; i ? g >= 0 : g < h; i ? g-- : g++) s = l[g], c > u ? c %= u : c < 0 && (c += u), this._setGraphemeOnPath(c, s), c += s.kernedWidth;
    }
    return { width: r, numOfSpaces: 0 };
  }
  _setGraphemeOnPath(t, e) {
    const s = t + e.kernedWidth / 2, r = this.path, i = Xo(r.path, s, r.segmentsInfo);
    e.renderLeft = i.x - r.pathOffset.x, e.renderTop = i.y - r.pathOffset.y, e.angle = i.angle + (this.pathSide === Z ? Math.PI : 0);
  }
  _getGraphemeBox(t, e, s, r, i) {
    const n = this.getCompleteStyleDeclaration(e, s), o = r ? this.getCompleteStyleDeclaration(e, s - 1) : {}, h = this._measureChar(t, n, r, o);
    let l, c = h.kernedWidth, u = h.width;
    this.charSpacing !== 0 && (l = this._getWidthOfCharSpacing(), u += l, c += l);
    const g = { width: u, left: 0, height: n.fontSize, kernedWidth: c, deltaY: n.deltaY };
    if (s > 0 && !i) {
      const d = this.__charBounds[e][s - 1];
      g.left = d.left + d.width + h.kernedWidth - h.width;
    }
    return g;
  }
  getHeightOfLine(t) {
    if (this.__lineHeights[t]) return this.__lineHeights[t];
    let e = this.getHeightOfChar(t, 0);
    for (let s = 1, r = this._textLines[t].length; s < r; s++) e = Math.max(this.getHeightOfChar(t, s), e);
    return this.__lineHeights[t] = e * this.lineHeight * this._fontSizeMult;
  }
  calcTextHeight() {
    let t, e = 0;
    for (let s = 0, r = this._textLines.length; s < r; s++) t = this.getHeightOfLine(s), e += s === r - 1 ? t / this.lineHeight : t;
    return e;
  }
  _getLeftOffset() {
    return this.direction === "ltr" ? -this.width / 2 : this.width / 2;
  }
  _getTopOffset() {
    return -this.height / 2;
  }
  _renderTextCommon(t, e) {
    t.save();
    let s = 0;
    const r = this._getLeftOffset(), i = this._getTopOffset();
    for (let n = 0, o = this._textLines.length; n < o; n++) {
      const h = this.getHeightOfLine(n), l = h / this.lineHeight, c = this._getLineLeftOffset(n);
      this._renderTextLine(e, t, this._textLines[n], r + c, i + s + l, n), s += h;
    }
    t.restore();
  }
  _renderTextFill(t) {
    (this.fill || this.styleHas(Q)) && this._renderTextCommon(t, "fillText");
  }
  _renderTextStroke(t) {
    (this.stroke && this.strokeWidth !== 0 || !this.isEmptyStyles()) && (this.shadow && !this.shadow.affectStroke && this._removeShadow(t), t.save(), this._setLineDash(t, this.strokeDashArray), t.beginPath(), this._renderTextCommon(t, "strokeText"), t.closePath(), t.restore());
  }
  _renderChars(t, e, s, r, i, n) {
    const o = this.getHeightOfLine(n), h = this.textAlign.includes(kt), l = this.path, c = !h && this.charSpacing === 0 && this.isEmptyStyles(n) && !l, u = this.direction === "ltr", g = this.direction === "ltr" ? 1 : -1, d = e.direction;
    let f, p, m, v, C, w = "", S = 0;
    if (e.save(), d !== this.direction && (e.canvas.setAttribute("dir", u ? "ltr" : "rtl"), e.direction = u ? "ltr" : "rtl", e.textAlign = u ? B : Z), i -= o * this._fontSizeFraction / this.lineHeight, c) return this._renderChar(t, e, n, 0, s.join(""), r, i), void e.restore();
    for (let x = 0, M = s.length - 1; x <= M; x++) v = x === M || this.charSpacing || l, w += s[x], m = this.__charBounds[n][x], S === 0 ? (r += g * (m.kernedWidth - m.width), S += m.width) : S += m.kernedWidth, h && !v && this._reSpaceAndTab.test(s[x]) && (v = !0), v || (f = f || this.getCompleteStyleDeclaration(n, x), p = this.getCompleteStyleDeclaration(n, x + 1), v = br(f, p, !1)), v && (l ? (e.save(), e.translate(m.renderLeft, m.renderTop), e.rotate(m.angle), this._renderChar(t, e, n, x, w, -S / 2, 0), e.restore()) : (C = r, this._renderChar(t, e, n, x, w, C, i)), w = "", f = p, r += g * S, S = 0);
    e.restore();
  }
  _applyPatternGradientTransformText(t) {
    const e = this.width + this.strokeWidth, s = this.height + this.strokeWidth, r = Dt({ width: e, height: s }), i = r.getContext("2d");
    return r.width = e, r.height = s, i.beginPath(), i.moveTo(0, 0), i.lineTo(e, 0), i.lineTo(e, s), i.lineTo(0, s), i.closePath(), i.translate(e / 2, s / 2), i.fillStyle = t.toLive(i), this._applyPatternGradientTransform(i, t), i.fill(), i.createPattern(r, "no-repeat");
  }
  handleFiller(t, e, s) {
    let r, i;
    return bt(s) ? s.gradientUnits === "percentage" || s.gradientTransform || s.patternTransform ? (r = -this.width / 2, i = -this.height / 2, t.translate(r, i), t[e] = this._applyPatternGradientTransformText(s), { offsetX: r, offsetY: i }) : (t[e] = s.toLive(t), this._applyPatternGradientTransform(t, s)) : (t[e] = s, { offsetX: 0, offsetY: 0 });
  }
  _setStrokeStyles(t, e) {
    let { stroke: s, strokeWidth: r } = e;
    return t.lineWidth = r, t.lineCap = this.strokeLineCap, t.lineDashOffset = this.strokeDashOffset, t.lineJoin = this.strokeLineJoin, t.miterLimit = this.strokeMiterLimit, this.handleFiller(t, "strokeStyle", s);
  }
  _setFillStyles(t, e) {
    let { fill: s } = e;
    return this.handleFiller(t, "fillStyle", s);
  }
  _renderChar(t, e, s, r, i, n, o) {
    const h = this._getStyleDeclaration(s, r), l = this.getCompleteStyleDeclaration(s, r), c = t === "fillText" && l.fill, u = t === "strokeText" && l.stroke && l.strokeWidth;
    if (u || c) {
      if (e.save(), e.font = this._getFontDeclaration(l), h.textBackgroundColor && this._removeShadow(e), h.deltaY && (o += h.deltaY), c) {
        const g = this._setFillStyles(e, l);
        e.fillText(i, n - g.offsetX, o - g.offsetY);
      }
      if (u) {
        const g = this._setStrokeStyles(e, l);
        e.strokeText(i, n - g.offsetX, o - g.offsetY);
      }
      e.restore();
    }
  }
  setSuperscript(t, e) {
    this._setScript(t, e, this.superscript);
  }
  setSubscript(t, e) {
    this._setScript(t, e, this.subscript);
  }
  _setScript(t, e, s) {
    const r = this.get2DCursorLocation(t, !0), i = this.getValueOfPropertyAt(r.lineIndex, r.charIndex, "fontSize"), n = this.getValueOfPropertyAt(r.lineIndex, r.charIndex, "deltaY"), o = { fontSize: i * s.size, deltaY: n + i * s.baseline };
    this.setSelectionStyles(o, t, e);
  }
  _getLineLeftOffset(t) {
    const e = this.getLineWidth(t), s = this.width - e, r = this.textAlign, i = this.direction, n = this.isEndOfWrapping(t);
    let o = 0;
    return r === kt || r === $e && !n || r === Qe && !n || r === er && !n ? 0 : (r === P && (o = s / 2), r === Z && (o = s), r === $e && (o = s / 2), r === Qe && (o = s), i === "rtl" && (r === Z || r === kt || r === Qe ? o = 0 : r === B || r === er ? o = -s : r !== P && r !== $e || (o = -s / 2)), o);
  }
  _clearCache() {
    this._forceClearCache = !1, this.__lineWidths = [], this.__lineHeights = [], this.__charBounds = [];
  }
  getLineWidth(t) {
    if (this.__lineWidths[t] !== void 0) return this.__lineWidths[t];
    const { width: e } = this.measureLine(t);
    return this.__lineWidths[t] = e, e;
  }
  _getWidthOfCharSpacing() {
    return this.charSpacing !== 0 ? this.fontSize * this.charSpacing / 1e3 : 0;
  }
  getValueOfPropertyAt(t, e, s) {
    var r;
    return (r = this._getStyleDeclaration(t, e)[s]) !== null && r !== void 0 ? r : this[s];
  }
  _renderTextDecoration(t, e) {
    if (!this[e] && !this.styleHas(e)) return;
    let s = this._getTopOffset();
    const r = this._getLeftOffset(), i = this.path, n = this._getWidthOfCharSpacing(), o = this.offsets[e];
    for (let h = 0, l = this._textLines.length; h < l; h++) {
      const c = this.getHeightOfLine(h);
      if (!this[e] && !this.styleHas(e, h)) {
        s += c;
        continue;
      }
      const u = this._textLines[h], g = c / this.lineHeight, d = this._getLineLeftOffset(h);
      let f, p, m = 0, v = 0, C = this.getValueOfPropertyAt(h, 0, e), w = this.getValueOfPropertyAt(h, 0, Q);
      const S = s + g * (1 - this._fontSizeFraction);
      let x = this.getHeightOfChar(h, 0), M = this.getValueOfPropertyAt(h, 0, "deltaY");
      for (let T = 0, j = u.length; T < j; T++) {
        const I = this.__charBounds[h][T];
        f = this.getValueOfPropertyAt(h, T, e), p = this.getValueOfPropertyAt(h, T, Q);
        const A = this.getHeightOfChar(h, T), E = this.getValueOfPropertyAt(h, T, "deltaY");
        if (i && f && p) t.save(), t.fillStyle = w, t.translate(I.renderLeft, I.renderTop), t.rotate(I.angle), t.fillRect(-I.kernedWidth / 2, o * A + E, I.kernedWidth, this.fontSize / 15), t.restore();
        else if ((f !== C || p !== w || A !== x || E !== M) && v > 0) {
          let k = r + d + m;
          this.direction === "rtl" && (k = this.width - k - v), C && w && (t.fillStyle = w, t.fillRect(k, S + o * x + M, v, this.fontSize / 15)), m = I.left, v = I.width, C = f, w = p, x = A, M = E;
        } else v += I.kernedWidth;
      }
      let O = r + d + m;
      this.direction === "rtl" && (O = this.width - O - v), t.fillStyle = p, f && p && t.fillRect(O, S + o * x + M, v - n, this.fontSize / 15), s += c;
    }
    this._removeShadow(t);
  }
  _getFontDeclaration() {
    let { fontFamily: t = this.fontFamily, fontStyle: e = this.fontStyle, fontWeight: s = this.fontWeight, fontSize: r = this.fontSize } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, i = arguments.length > 1 ? arguments[1] : void 0;
    const n = t.includes("'") || t.includes('"') || t.includes(",") || it.genericFonts.includes(t.toLowerCase()) ? t : '"'.concat(t, '"');
    return [e, s, "".concat(i ? this.CACHE_FONT_SIZE : r, "px"), n].join(" ");
  }
  render(t) {
    this.visible && (this.canvas && this.canvas.skipOffscreen && !this.group && !this.isOnScreen() || (this._forceClearCache && this.initDimensions(), super.render(t)));
  }
  graphemeSplit(t) {
    return yr(t);
  }
  _splitTextIntoLines(t) {
    const e = t.split(this._reNewline), s = new Array(e.length), r = [`
`];
    let i = [];
    for (let n = 0; n < e.length; n++) s[n] = this.graphemeSplit(e[n]), i = i.concat(s[n], r);
    return i.pop(), { _unwrappedLines: s, lines: e, graphemeText: i, graphemeLines: s };
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    return y(y({}, super.toObject([...aa, ...t])), {}, { styles: Lo(this.styles, this.text) }, this.path ? { path: this.path.toObject() } : {});
  }
  set(t, e) {
    const { textLayoutProperties: s } = this.constructor;
    super.set(t, e);
    let r = !1, i = !1;
    if (typeof t == "object") for (const n in t) n === "path" && this.setPathInfo(), r = r || s.includes(n), i = i || n === "path";
    else r = s.includes(t), i = t === "path";
    return i && this.setPathInfo(), r && this.initialized && (this.initDimensions(), this.setCoords()), this;
  }
  complexity() {
    return 1;
  }
  static fromElement(t, e, s) {
    return R(this, null, function* () {
      const r = Kt(t, it.ATTRIBUTE_NAMES, s), i = y(y({}, e), r), { textAnchor: n = B, textDecoration: o = "", dx: h = 0, dy: l = 0, top: c = 0, left: u = 0, fontSize: g = pi, strokeWidth: d = 1 } = i, f = H(i, Al), p = new this((t.textContent || "").replace(/^\s+|\s+$|\n+/g, "").replace(/\s+/g, " "), y({ left: u + h, top: c + l, underline: o.includes("underline"), overline: o.includes("overline"), linethrough: o.includes("line-through"), strokeWidth: 0, fontSize: g }, f)), m = p.getScaledHeight() / p.height, v = ((p.height + p.strokeWidth) * p.lineHeight - p.height) * m, C = p.getScaledHeight() + v;
      let w = 0;
      return n === P && (w = p.getScaledWidth() / 2), n === Z && (w = p.getScaledWidth()), p.set({ left: p.left - w, top: p.top - (C - p.fontSize * (0.07 + p._fontSizeFraction)) / p.lineHeight, strokeWidth: d }), p;
    });
  }
  static fromObject(t) {
    return this._fromObject(y(y({}, t), {}, { styles: Po(t.styles || {}, t.text) }), { extraParam: "text" });
  }
}
b(it, "textLayoutProperties", oa), b(it, "cacheProperties", [...Zt, ...aa]), b(it, "ownDefaults", Ol), b(it, "type", "Text"), b(it, "genericFonts", ["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji", "fangsong"]), b(it, "ATTRIBUTE_NAMES", oe.concat("x", "y", "dx", "dy", "font-family", "font-style", "font-weight", "font-size", "letter-spacing", "text-decoration", "text-anchor")), Do(it, [class extends ho {
  _toSVG() {
    const a = this._getSVGLeftTopOffsets(), t = this._getSVGTextAndBg(a.textTop, a.textLeft);
    return this._wrapSVGTextAndBg(t);
  }
  toSVG(a) {
    return this._createBaseSVGMarkup(this._toSVG(), { reviver: a, noStyle: !0, withShadow: !0 });
  }
  _getSVGLeftTopOffsets() {
    return { textLeft: -this.width / 2, textTop: -this.height / 2, lineTop: this.getHeightOfLine(0) };
  }
  _wrapSVGTextAndBg(a) {
    let { textBgRects: t, textSpans: e } = a;
    const s = this.getSvgTextDecoration(this);
    return [t.join(""), '		<text xml:space="preserve" ', this.fontFamily ? 'font-family="'.concat(this.fontFamily.replace(Dl, "'"), '" ') : "", this.fontSize ? 'font-size="'.concat(this.fontSize, '" ') : "", this.fontStyle ? 'font-style="'.concat(this.fontStyle, '" ') : "", this.fontWeight ? 'font-weight="'.concat(this.fontWeight, '" ') : "", s ? 'text-decoration="'.concat(s, '" ') : "", this.direction === "rtl" ? 'direction="'.concat(this.direction, '" ') : "", 'style="', this.getSvgStyles(!0), '"', this.addPaintOrder(), " >", e.join(""), `</text>
`];
  }
  _getSVGTextAndBg(a, t) {
    const e = [], s = [];
    let r, i = a;
    this.backgroundColor && s.push(...kr(this.backgroundColor, -this.width / 2, -this.height / 2, this.width, this.height));
    for (let n = 0, o = this._textLines.length; n < o; n++) r = this._getLineLeftOffset(n), this.direction === "rtl" && (r += this.width), (this.textBackgroundColor || this.styleHas("textBackgroundColor", n)) && this._setSVGTextLineBg(s, n, t + r, i), this._setSVGTextLineText(e, n, t + r, i), i += this.getHeightOfLine(n);
    return { textSpans: e, textBgRects: s };
  }
  _createTextCharSpan(a, t, e, s) {
    const r = this.getSvgSpanStyles(t, a !== a.trim() || !!a.match(jl)), i = r ? 'style="'.concat(r, '"') : "", n = t.deltaY, o = n ? ' dy="'.concat(z(n, N.NUM_FRACTION_DIGITS), '" ') : "";
    return '<tspan x="'.concat(z(e, N.NUM_FRACTION_DIGITS), '" y="').concat(z(s, N.NUM_FRACTION_DIGITS), '" ').concat(o).concat(i, ">").concat(Io(a), "</tspan>");
  }
  _setSVGTextLineText(a, t, e, s) {
    const r = this.getHeightOfLine(t), i = this.textAlign.includes(kt), n = this._textLines[t];
    let o, h, l, c, u, g = "", d = 0;
    s += r * (1 - this._fontSizeFraction) / this.lineHeight;
    for (let f = 0, p = n.length - 1; f <= p; f++) u = f === p || this.charSpacing, g += n[f], l = this.__charBounds[t][f], d === 0 ? (e += l.kernedWidth - l.width, d += l.width) : d += l.kernedWidth, i && !u && this._reSpaceAndTab.test(n[f]) && (u = !0), u || (o = o || this.getCompleteStyleDeclaration(t, f), h = this.getCompleteStyleDeclaration(t, f + 1), u = br(o, h, !0)), u && (c = this._getStyleDeclaration(t, f), a.push(this._createTextCharSpan(g, c, e, s)), g = "", o = h, this.direction === "rtl" ? e -= d : e += d, d = 0);
  }
  _setSVGTextLineBg(a, t, e, s) {
    const r = this._textLines[t], i = this.getHeightOfLine(t) / this.lineHeight;
    let n, o = 0, h = 0, l = this.getValueOfPropertyAt(t, 0, "textBackgroundColor");
    for (let c = 0; c < r.length; c++) {
      const { left: u, width: g, kernedWidth: d } = this.__charBounds[t][c];
      n = this.getValueOfPropertyAt(t, c, "textBackgroundColor"), n !== l ? (l && a.push(...kr(l, e + h, s, o, i)), h = u, o = g, l = n) : o += d;
    }
    n && a.push(...kr(l, e + h, s, o, i));
  }
  _getSVGLineTopOffset(a) {
    let t, e = 0;
    for (t = 0; t < a; t++) e += this.getHeightOfLine(t);
    const s = this.getHeightOfLine(t);
    return { lineTop: e, offset: (this._fontSizeMult - this._fontSizeFraction) * s / (this.lineHeight * this._fontSizeMult) };
  }
  getSvgStyles(a) {
    return "".concat(super.getSvgStyles(a), " white-space: pre;");
  }
  getSvgSpanStyles(a, t) {
    const { fontFamily: e, strokeWidth: s, stroke: r, fill: i, fontSize: n, fontStyle: o, fontWeight: h, deltaY: l } = a, c = this.getSvgTextDecoration(a);
    return [r ? ss(ht, r) : "", s ? "stroke-width: ".concat(s, "; ") : "", e ? "font-family: ".concat(e.includes("'") || e.includes('"') ? e : "'".concat(e, "'"), "; ") : "", n ? "font-size: ".concat(n, "px; ") : "", o ? "font-style: ".concat(o, "; ") : "", h ? "font-weight: ".concat(h, "; ") : "", c && "text-decoration: ".concat(c, "; "), i ? ss(Q, i) : "", l ? "baseline-shift: ".concat(-l, "; ") : "", t ? "white-space: pre; " : ""].join("");
  }
  getSvgTextDecoration(a) {
    return ["overline", "underline", "line-through"].filter((t) => a[t.replace("-", "")]).join(" ");
  }
}]), D.setClass(it), D.setSVGClass(it);
class El {
  constructor(t) {
    b(this, "target", void 0), b(this, "__mouseDownInPlace", !1), b(this, "__dragStartFired", !1), b(this, "__isDraggingOver", !1), b(this, "__dragStartSelection", void 0), b(this, "__dragImageDisposer", void 0), b(this, "_dispose", void 0), this.target = t;
    const e = [this.target.on("dragenter", this.dragEnterHandler.bind(this)), this.target.on("dragover", this.dragOverHandler.bind(this)), this.target.on("dragleave", this.dragLeaveHandler.bind(this)), this.target.on("dragend", this.dragEndHandler.bind(this)), this.target.on("drop", this.dropHandler.bind(this))];
    this._dispose = () => {
      e.forEach((s) => s()), this._dispose = void 0;
    };
  }
  isPointerOverSelection(t) {
    const e = this.target, s = e.getSelectionStartFromPointer(t);
    return e.isEditing && s >= e.selectionStart && s <= e.selectionEnd && e.selectionStart < e.selectionEnd;
  }
  start(t) {
    return this.__mouseDownInPlace = this.isPointerOverSelection(t);
  }
  isActive() {
    return this.__mouseDownInPlace;
  }
  end(t) {
    const e = this.isActive();
    return e && !this.__dragStartFired && (this.target.setCursorByClick(t), this.target.initDelayedCursor(!0)), this.__mouseDownInPlace = !1, this.__dragStartFired = !1, this.__isDraggingOver = !1, e;
  }
  getDragStartSelection() {
    return this.__dragStartSelection;
  }
  setDragImage(t, e) {
    var s;
    let { selectionStart: r, selectionEnd: i } = e;
    const n = this.target, o = n.canvas, h = new _(n.flipX ? -1 : 1, n.flipY ? -1 : 1), l = n._getCursorBoundaries(r), c = new _(l.left + l.leftOffset, l.top + l.topOffset).multiply(h).transform(n.calcTransformMatrix()), u = o.getScenePoint(t).subtract(c), g = n.getCanvasRetinaScaling(), d = n.getBoundingRect(), f = c.subtract(new _(d.left, d.top)), p = o.viewportTransform, m = f.add(u).transform(p, !0), v = n.backgroundColor, C = Ii(n.styles);
    n.backgroundColor = "";
    const w = { stroke: "transparent", fill: "transparent", textBackgroundColor: "transparent" };
    n.setSelectionStyles(w, 0, r), n.setSelectionStyles(w, i, n.text.length), n.dirty = !0;
    const S = n.toCanvasElement({ enableRetinaScaling: o.enableRetinaScaling, viewportTransform: !0 });
    n.backgroundColor = v, n.styles = C, n.dirty = !0, tr(S, { position: "fixed", left: "".concat(-S.width, "px"), border: at, width: "".concat(S.width / g, "px"), height: "".concat(S.height / g, "px") }), this.__dragImageDisposer && this.__dragImageDisposer(), this.__dragImageDisposer = () => {
      S.remove();
    }, xt(t.target || this.target.hiddenTextarea).body.appendChild(S), (s = t.dataTransfer) === null || s === void 0 || s.setDragImage(S, m.x, m.y);
  }
  onDragStart(t) {
    this.__dragStartFired = !0;
    const e = this.target, s = this.isActive();
    if (s && t.dataTransfer) {
      const r = this.__dragStartSelection = { selectionStart: e.selectionStart, selectionEnd: e.selectionEnd }, i = e._text.slice(r.selectionStart, r.selectionEnd).join(""), n = y({ text: e.text, value: i }, r);
      t.dataTransfer.setData("text/plain", i), t.dataTransfer.setData("application/fabric", JSON.stringify({ value: i, styles: e.getSelectionStyles(r.selectionStart, r.selectionEnd, !0) })), t.dataTransfer.effectAllowed = "copyMove", this.setDragImage(t, n);
    }
    return e.abortCursorAnimation(), s;
  }
  canDrop(t) {
    if (this.target.editable && !this.target.getActiveControl() && !t.defaultPrevented) {
      if (this.isActive() && this.__dragStartSelection) {
        const e = this.target.getSelectionStartFromPointer(t), s = this.__dragStartSelection;
        return e < s.selectionStart || e > s.selectionEnd;
      }
      return !0;
    }
    return !1;
  }
  targetCanDrop(t) {
    return this.target.canDrop(t);
  }
  dragEnterHandler(t) {
    let { e } = t;
    const s = this.targetCanDrop(e);
    !this.__isDraggingOver && s && (this.__isDraggingOver = !0);
  }
  dragOverHandler(t) {
    const { e } = t, s = this.targetCanDrop(e);
    !this.__isDraggingOver && s ? this.__isDraggingOver = !0 : this.__isDraggingOver && !s && (this.__isDraggingOver = !1), this.__isDraggingOver && (e.preventDefault(), t.canDrop = !0, t.dropTarget = this.target);
  }
  dragLeaveHandler() {
    (this.__isDraggingOver || this.isActive()) && (this.__isDraggingOver = !1);
  }
  dropHandler(t) {
    var e;
    const { e: s } = t, r = s.defaultPrevented;
    this.__isDraggingOver = !1, s.preventDefault();
    let i = (e = s.dataTransfer) === null || e === void 0 ? void 0 : e.getData("text/plain");
    if (i && !r) {
      const n = this.target, o = n.canvas;
      let h = n.getSelectionStartFromPointer(s);
      const { styles: l } = s.dataTransfer.types.includes("application/fabric") ? JSON.parse(s.dataTransfer.getData("application/fabric")) : {}, c = i[Math.max(0, i.length - 1)], u = 0;
      if (this.__dragStartSelection) {
        const g = this.__dragStartSelection.selectionStart, d = this.__dragStartSelection.selectionEnd;
        h > g && h <= d ? h = g : h > d && (h -= d - g), n.removeChars(g, d), delete this.__dragStartSelection;
      }
      n._reNewline.test(c) && (n._reNewline.test(n._text[h]) || h === n._text.length) && (i = i.trimEnd()), t.didDrop = !0, t.dropTarget = n, n.insertChars(i, l, h), o.setActiveObject(n), n.enterEditing(s), n.selectionStart = Math.min(h + u, n._text.length), n.selectionEnd = Math.min(n.selectionStart + i.length, n._text.length), n.hiddenTextarea.value = n.text, n._updateTextarea(), n.hiddenTextarea.focus(), n.fire(zs, { index: h + u, action: "drop" }), o.fire("text:changed", { target: n }), o.contextTopDirty = !0, o.requestRenderAll();
    }
  }
  dragEndHandler(t) {
    let { e } = t;
    if (this.isActive() && this.__dragStartFired && this.__dragStartSelection) {
      var s;
      const r = this.target, i = this.target.canvas, { selectionStart: n, selectionEnd: o } = this.__dragStartSelection, h = ((s = e.dataTransfer) === null || s === void 0 ? void 0 : s.dropEffect) || at;
      h === at ? (r.selectionStart = n, r.selectionEnd = o, r._updateTextarea(), r.hiddenTextarea.focus()) : (r.clearContextTop(), h === "move" && (r.removeChars(n, o), r.selectionStart = r.selectionEnd = n, r.hiddenTextarea && (r.hiddenTextarea.value = r.text), r._updateTextarea(), r.fire(zs, { index: n, action: "dragend" }), i.fire("text:changed", { target: r }), i.requestRenderAll()), r.exitEditing());
    }
    this.__dragImageDisposer && this.__dragImageDisposer(), delete this.__dragImageDisposer, delete this.__dragStartSelection, this.__isDraggingOver = !1;
  }
  dispose() {
    this._dispose && this._dispose();
  }
}
const Tn = /[ \n\.,;!\?\-]/;
class kl extends it {
  constructor() {
    super(...arguments), b(this, "_currentCursorOpacity", 1);
  }
  initBehavior() {
    this._tick = this._tick.bind(this), this._onTickComplete = this._onTickComplete.bind(this), this.updateSelectionOnMouseMove = this.updateSelectionOnMouseMove.bind(this);
  }
  onDeselect(t) {
    return this.isEditing && this.exitEditing(), this.selected = !1, super.onDeselect(t);
  }
  _animateCursor(t) {
    let { toValue: e, duration: s, delay: r, onComplete: i } = t;
    return Ai({ startValue: this._currentCursorOpacity, endValue: e, duration: s, delay: r, onComplete: i, abort: () => !this.canvas || this.selectionStart !== this.selectionEnd, onChange: (n) => {
      this._currentCursorOpacity = n, this.renderCursorOrSelection();
    } });
  }
  _tick(t) {
    this._currentTickState = this._animateCursor({ toValue: 0, duration: this.cursorDuration / 2, delay: Math.max(t || 0, 100), onComplete: this._onTickComplete });
  }
  _onTickComplete() {
    var t;
    (t = this._currentTickCompleteState) === null || t === void 0 || t.abort(), this._currentTickCompleteState = this._animateCursor({ toValue: 1, duration: this.cursorDuration, onComplete: this._tick });
  }
  initDelayedCursor(t) {
    this.abortCursorAnimation(), this._tick(t ? 0 : this.cursorDelay);
  }
  abortCursorAnimation() {
    let t = !1;
    [this._currentTickState, this._currentTickCompleteState].forEach((e) => {
      e && !e.isDone() && (t = !0, e.abort());
    }), this._currentCursorOpacity = 1, t && this.clearContextTop();
  }
  restartCursorIfNeeded() {
    [this._currentTickState, this._currentTickCompleteState].some((t) => !t || t.isDone()) && this.initDelayedCursor();
  }
  selectAll() {
    return this.selectionStart = 0, this.selectionEnd = this._text.length, this._fireSelectionChanged(), this._updateTextarea(), this;
  }
  getSelectedText() {
    return this._text.slice(this.selectionStart, this.selectionEnd).join("");
  }
  findWordBoundaryLeft(t) {
    let e = 0, s = t - 1;
    if (this._reSpace.test(this._text[s])) for (; this._reSpace.test(this._text[s]); ) e++, s--;
    for (; /\S/.test(this._text[s]) && s > -1; ) e++, s--;
    return t - e;
  }
  findWordBoundaryRight(t) {
    let e = 0, s = t;
    if (this._reSpace.test(this._text[s])) for (; this._reSpace.test(this._text[s]); ) e++, s++;
    for (; /\S/.test(this._text[s]) && s < this._text.length; ) e++, s++;
    return t + e;
  }
  findLineBoundaryLeft(t) {
    let e = 0, s = t - 1;
    for (; !/\n/.test(this._text[s]) && s > -1; ) e++, s--;
    return t - e;
  }
  findLineBoundaryRight(t) {
    let e = 0, s = t;
    for (; !/\n/.test(this._text[s]) && s < this._text.length; ) e++, s++;
    return t + e;
  }
  searchWordBoundary(t, e) {
    const s = this._text;
    let r = t > 0 && this._reSpace.test(s[t]) && (e === -1 || !mi.test(s[t - 1])) ? t - 1 : t, i = s[r];
    for (; r > 0 && r < s.length && !Tn.test(i); ) r += e, i = s[r];
    return e === -1 && Tn.test(i) && r++, r;
  }
  selectWord(t) {
    t = t || this.selectionStart;
    const e = this.searchWordBoundary(t, -1), s = Math.max(e, this.searchWordBoundary(t, 1));
    this.selectionStart = e, this.selectionEnd = s, this._fireSelectionChanged(), this._updateTextarea(), this.renderCursorOrSelection();
  }
  selectLine(t) {
    t = t || this.selectionStart;
    const e = this.findLineBoundaryLeft(t), s = this.findLineBoundaryRight(t);
    return this.selectionStart = e, this.selectionEnd = s, this._fireSelectionChanged(), this._updateTextarea(), this;
  }
  enterEditing(t) {
    !this.isEditing && this.editable && (this.enterEditingImpl(), this.fire("editing:entered", t ? { e: t } : void 0), this._fireSelectionChanged(), this.canvas && (this.canvas.fire("text:editing:entered", { target: this, e: t }), this.canvas.requestRenderAll()));
  }
  enterEditingImpl() {
    this.canvas && (this.canvas.calcOffset(), this.canvas.textEditingManager.exitTextEditing()), this.isEditing = !0, this.initHiddenTextarea(), this.hiddenTextarea.focus(), this.hiddenTextarea.value = this.text, this._updateTextarea(), this._saveEditingProps(), this._setEditingProps(), this._textBeforeEdit = this.text, this._tick();
  }
  updateSelectionOnMouseMove(t) {
    if (this.getActiveControl()) return;
    const e = this.hiddenTextarea;
    xt(e).activeElement !== e && e.focus();
    const s = this.getSelectionStartFromPointer(t), r = this.selectionStart, i = this.selectionEnd;
    (s === this.__selectionStartOnMouseDown && r !== i || r !== s && i !== s) && (s > this.__selectionStartOnMouseDown ? (this.selectionStart = this.__selectionStartOnMouseDown, this.selectionEnd = s) : (this.selectionStart = s, this.selectionEnd = this.__selectionStartOnMouseDown), this.selectionStart === r && this.selectionEnd === i || (this._fireSelectionChanged(), this._updateTextarea(), this.renderCursorOrSelection()));
  }
  _setEditingProps() {
    this.hoverCursor = "text", this.canvas && (this.canvas.defaultCursor = this.canvas.moveCursor = "text"), this.borderColor = this.editingBorderColor, this.hasControls = this.selectable = !1, this.lockMovementX = this.lockMovementY = !0;
  }
  fromStringToGraphemeSelection(t, e, s) {
    const r = s.slice(0, t), i = this.graphemeSplit(r).length;
    if (t === e) return { selectionStart: i, selectionEnd: i };
    const n = s.slice(t, e);
    return { selectionStart: i, selectionEnd: i + this.graphemeSplit(n).length };
  }
  fromGraphemeToStringSelection(t, e, s) {
    const r = s.slice(0, t).join("").length;
    return t === e ? { selectionStart: r, selectionEnd: r } : { selectionStart: r, selectionEnd: r + s.slice(t, e).join("").length };
  }
  _updateTextarea() {
    if (this.cursorOffsetCache = {}, this.hiddenTextarea) {
      if (!this.inCompositionMode) {
        const t = this.fromGraphemeToStringSelection(this.selectionStart, this.selectionEnd, this._text);
        this.hiddenTextarea.selectionStart = t.selectionStart, this.hiddenTextarea.selectionEnd = t.selectionEnd;
      }
      this.updateTextareaPosition();
    }
  }
  updateFromTextArea() {
    if (!this.hiddenTextarea) return;
    this.cursorOffsetCache = {};
    const t = this.hiddenTextarea;
    this.text = t.value, this.set("dirty", !0), this.initDimensions(), this.setCoords();
    const e = this.fromStringToGraphemeSelection(t.selectionStart, t.selectionEnd, t.value);
    this.selectionEnd = this.selectionStart = e.selectionEnd, this.inCompositionMode || (this.selectionStart = e.selectionStart), this.updateTextareaPosition();
  }
  updateTextareaPosition() {
    if (this.selectionStart === this.selectionEnd) {
      const t = this._calcTextareaPosition();
      this.hiddenTextarea.style.left = t.left, this.hiddenTextarea.style.top = t.top;
    }
  }
  _calcTextareaPosition() {
    if (!this.canvas) return { left: "1px", top: "1px" };
    const t = this.inCompositionMode ? this.compositionStart : this.selectionStart, e = this._getCursorBoundaries(t), s = this.get2DCursorLocation(t), r = s.lineIndex, i = s.charIndex, n = this.getValueOfPropertyAt(r, i, "fontSize") * this.lineHeight, o = e.leftOffset, h = this.getCanvasRetinaScaling(), l = this.canvas.upperCanvasEl, c = l.width / h, u = l.height / h, g = c - n, d = u - n, f = new _(e.left + o, e.top + e.topOffset + n).transform(this.calcTransformMatrix()).transform(this.canvas.viewportTransform).multiply(new _(l.clientWidth / c, l.clientHeight / u));
    return f.x < 0 && (f.x = 0), f.x > g && (f.x = g), f.y < 0 && (f.y = 0), f.y > d && (f.y = d), f.x += this.canvas._offset.left, f.y += this.canvas._offset.top, { left: "".concat(f.x, "px"), top: "".concat(f.y, "px"), fontSize: "".concat(n, "px"), charHeight: n };
  }
  _saveEditingProps() {
    this._savedProps = { hasControls: this.hasControls, borderColor: this.borderColor, lockMovementX: this.lockMovementX, lockMovementY: this.lockMovementY, hoverCursor: this.hoverCursor, selectable: this.selectable, defaultCursor: this.canvas && this.canvas.defaultCursor, moveCursor: this.canvas && this.canvas.moveCursor };
  }
  _restoreEditingProps() {
    this._savedProps && (this.hoverCursor = this._savedProps.hoverCursor, this.hasControls = this._savedProps.hasControls, this.borderColor = this._savedProps.borderColor, this.selectable = this._savedProps.selectable, this.lockMovementX = this._savedProps.lockMovementX, this.lockMovementY = this._savedProps.lockMovementY, this.canvas && (this.canvas.defaultCursor = this._savedProps.defaultCursor || this.canvas.defaultCursor, this.canvas.moveCursor = this._savedProps.moveCursor || this.canvas.moveCursor), delete this._savedProps);
  }
  _exitEditing() {
    const t = this.hiddenTextarea;
    this.selected = !1, this.isEditing = !1, t && (t.blur && t.blur(), t.parentNode && t.parentNode.removeChild(t)), this.hiddenTextarea = null, this.abortCursorAnimation(), this.selectionStart !== this.selectionEnd && this.clearContextTop();
  }
  exitEditingImpl() {
    this._exitEditing(), this.selectionEnd = this.selectionStart, this._restoreEditingProps(), this._forceClearCache && (this.initDimensions(), this.setCoords());
  }
  exitEditing() {
    const t = this._textBeforeEdit !== this.text;
    return this.exitEditingImpl(), this.fire("editing:exited"), t && this.fire(Hs), this.canvas && (this.canvas.fire("text:editing:exited", { target: this }), t && this.canvas.fire("object:modified", { target: this })), this;
  }
  _removeExtraneousStyles() {
    for (const t in this.styles) this._textLines[t] || delete this.styles[t];
  }
  removeStyleFromTo(t, e) {
    const { lineIndex: s, charIndex: r } = this.get2DCursorLocation(t, !0), { lineIndex: i, charIndex: n } = this.get2DCursorLocation(e, !0);
    if (s !== i) {
      if (this.styles[s]) for (let o = r; o < this._unwrappedTextLines[s].length; o++) delete this.styles[s][o];
      if (this.styles[i]) for (let o = n; o < this._unwrappedTextLines[i].length; o++) {
        const h = this.styles[i][o];
        h && (this.styles[s] || (this.styles[s] = {}), this.styles[s][r + o - n] = h);
      }
      for (let o = s + 1; o <= i; o++) delete this.styles[o];
      this.shiftLineStyles(i, s - i);
    } else if (this.styles[s]) {
      const o = this.styles[s], h = n - r;
      for (let l = r; l < n; l++) delete o[l];
      for (const l in this.styles[s]) {
        const c = parseInt(l, 10);
        c >= n && (o[c - h] = o[l], delete o[l]);
      }
    }
  }
  shiftLineStyles(t, e) {
    const s = Object.assign({}, this.styles);
    for (const r in this.styles) {
      const i = parseInt(r, 10);
      i > t && (this.styles[i + e] = s[i], s[i - e] || delete this.styles[i]);
    }
  }
  insertNewlineStyleObject(t, e, s, r) {
    const i = {}, n = this._unwrappedTextLines[t].length, o = n === e;
    let h = !1;
    s || (s = 1), this.shiftLineStyles(t, s);
    const l = this.styles[t] ? this.styles[t][e === 0 ? e : e - 1] : void 0;
    for (const u in this.styles[t]) {
      const g = parseInt(u, 10);
      g >= e && (h = !0, i[g - e] = this.styles[t][u], o && e === 0 || delete this.styles[t][u]);
    }
    let c = !1;
    for (h && !o && (this.styles[t + s] = i, c = !0), (c || n > e) && s--; s > 0; ) r && r[s - 1] ? this.styles[t + s] = { 0: y({}, r[s - 1]) } : l ? this.styles[t + s] = { 0: y({}, l) } : delete this.styles[t + s], s--;
    this._forceClearCache = !0;
  }
  insertCharStyleObject(t, e, s, r) {
    this.styles || (this.styles = {});
    const i = this.styles[t], n = i ? y({}, i) : {};
    s || (s = 1);
    for (const h in n) {
      const l = parseInt(h, 10);
      l >= e && (i[l + s] = n[l], n[l - s] || delete i[l]);
    }
    if (this._forceClearCache = !0, r) {
      for (; s--; ) Object.keys(r[s]).length && (this.styles[t] || (this.styles[t] = {}), this.styles[t][e + s] = y({}, r[s]));
      return;
    }
    if (!i) return;
    const o = i[e ? e - 1 : 1];
    for (; o && s--; ) this.styles[t][e + s] = y({}, o);
  }
  insertNewStyleBlock(t, e, s) {
    const r = this.get2DCursorLocation(e, !0), i = [0];
    let n, o = 0;
    for (let h = 0; h < t.length; h++) t[h] === `
` ? (o++, i[o] = 0) : i[o]++;
    for (i[0] > 0 && (this.insertCharStyleObject(r.lineIndex, r.charIndex, i[0], s), s = s && s.slice(i[0] + 1)), o && this.insertNewlineStyleObject(r.lineIndex, r.charIndex + i[0], o), n = 1; n < o; n++) i[n] > 0 ? this.insertCharStyleObject(r.lineIndex + n, 0, i[n], s) : s && this.styles[r.lineIndex + n] && s[0] && (this.styles[r.lineIndex + n][0] = s[0]), s = s && s.slice(i[n] + 1);
    i[n] > 0 && this.insertCharStyleObject(r.lineIndex + n, 0, i[n], s);
  }
  removeChars(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : t + 1;
    this.removeStyleFromTo(t, e), this._text.splice(t, e - t), this.text = this._text.join(""), this.set("dirty", !0), this.initDimensions(), this.setCoords(), this._removeExtraneousStyles();
  }
  insertChars(t, e, s) {
    let r = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : s;
    r > s && this.removeStyleFromTo(s, r);
    const i = this.graphemeSplit(t);
    this.insertNewStyleBlock(i, s, e), this._text = [...this._text.slice(0, s), ...i, ...this._text.slice(r)], this.text = this._text.join(""), this.set("dirty", !0), this.initDimensions(), this.setCoords(), this._removeExtraneousStyles();
  }
  setSelectionStartEndWithShift(t, e, s) {
    s <= t ? (e === t ? this._selectionDirection = B : this._selectionDirection === Z && (this._selectionDirection = B, this.selectionEnd = t), this.selectionStart = s) : s > t && s < e ? this._selectionDirection === Z ? this.selectionEnd = s : this.selectionStart = s : (e === t ? this._selectionDirection = Z : this._selectionDirection === B && (this._selectionDirection = Z, this.selectionStart = e), this.selectionEnd = s);
  }
}
class Il extends kl {
  initHiddenTextarea() {
    const t = this.canvas && xt(this.canvas.getElement()) || Fe(), e = t.createElement("textarea");
    Object.entries({ autocapitalize: "off", autocorrect: "off", autocomplete: "off", spellcheck: "false", "data-fabric": "textarea", wrap: "off" }).map((n) => {
      let [o, h] = n;
      return e.setAttribute(o, h);
    });
    const { top: s, left: r, fontSize: i } = this._calcTextareaPosition();
    e.style.cssText = "position: absolute; top: ".concat(s, "; left: ").concat(r, "; z-index: -999; opacity: 0; width: 1px; height: 1px; font-size: 1px; padding-top: ").concat(i, ";"), (this.hiddenTextareaContainer || t.body).appendChild(e), Object.entries({ blur: "blur", keydown: "onKeyDown", keyup: "onKeyUp", input: "onInput", copy: "copy", cut: "copy", paste: "paste", compositionstart: "onCompositionStart", compositionupdate: "onCompositionUpdate", compositionend: "onCompositionEnd" }).map((n) => {
      let [o, h] = n;
      return e.addEventListener(o, this[h].bind(this));
    }), this.hiddenTextarea = e;
  }
  blur() {
    this.abortCursorAnimation();
  }
  onKeyDown(t) {
    if (!this.isEditing) return;
    const e = this.direction === "rtl" ? this.keysMapRtl : this.keysMap;
    if (t.keyCode in e) this[e[t.keyCode]](t);
    else {
      if (!(t.keyCode in this.ctrlKeysMapDown) || !t.ctrlKey && !t.metaKey) return;
      this[this.ctrlKeysMapDown[t.keyCode]](t);
    }
    t.stopImmediatePropagation(), t.preventDefault(), t.keyCode >= 33 && t.keyCode <= 40 ? (this.inCompositionMode = !1, this.clearContextTop(), this.renderCursorOrSelection()) : this.canvas && this.canvas.requestRenderAll();
  }
  onKeyUp(t) {
    !this.isEditing || this._copyDone || this.inCompositionMode ? this._copyDone = !1 : t.keyCode in this.ctrlKeysMapUp && (t.ctrlKey || t.metaKey) && (this[this.ctrlKeysMapUp[t.keyCode]](t), t.stopImmediatePropagation(), t.preventDefault(), this.canvas && this.canvas.requestRenderAll());
  }
  onInput(t) {
    const e = this.fromPaste;
    if (this.fromPaste = !1, t && t.stopPropagation(), !this.isEditing) return;
    const s = () => {
      this.updateFromTextArea(), this.fire(zs), this.canvas && (this.canvas.fire("text:changed", { target: this }), this.canvas.requestRenderAll());
    };
    if (this.hiddenTextarea.value === "") return this.styles = {}, void s();
    const r = this._splitTextIntoLines(this.hiddenTextarea.value).graphemeText, i = this._text.length, n = r.length, o = this.selectionStart, h = this.selectionEnd, l = o !== h;
    let c, u, g, d, f = n - i;
    const p = this.fromStringToGraphemeSelection(this.hiddenTextarea.selectionStart, this.hiddenTextarea.selectionEnd, this.hiddenTextarea.value), m = o > p.selectionStart;
    l ? (u = this._text.slice(o, h), f += h - o) : n < i && (u = m ? this._text.slice(h + f, h) : this._text.slice(o, o - f));
    const v = r.slice(p.selectionEnd - f, p.selectionEnd);
    if (u && u.length && (v.length && (c = this.getSelectionStyles(o, o + 1, !1), c = v.map(() => c[0])), l ? (g = o, d = h) : m ? (g = h - u.length, d = h) : (g = h, d = h + u.length), this.removeStyleFromTo(g, d)), v.length) {
      const { copyPasteData: C } = Pt();
      e && v.join("") === C.copiedText && !N.disableStyleCopyPaste && (c = C.copiedTextStyle), this.insertNewStyleBlock(v, o, c);
    }
    s();
  }
  onCompositionStart() {
    this.inCompositionMode = !0;
  }
  onCompositionEnd() {
    this.inCompositionMode = !1;
  }
  onCompositionUpdate(t) {
    let { target: e } = t;
    const { selectionStart: s, selectionEnd: r } = e;
    this.compositionStart = s, this.compositionEnd = r, this.updateTextareaPosition();
  }
  copy() {
    if (this.selectionStart === this.selectionEnd) return;
    const { copyPasteData: t } = Pt();
    t.copiedText = this.getSelectedText(), N.disableStyleCopyPaste ? t.copiedTextStyle = void 0 : t.copiedTextStyle = this.getSelectionStyles(this.selectionStart, this.selectionEnd, !0), this._copyDone = !0;
  }
  paste() {
    this.fromPaste = !0;
  }
  _getWidthBeforeCursor(t, e) {
    let s, r = this._getLineLeftOffset(t);
    return e > 0 && (s = this.__charBounds[t][e - 1], r += s.left + s.width), r;
  }
  getDownCursorOffset(t, e) {
    const s = this._getSelectionForOffset(t, e), r = this.get2DCursorLocation(s), i = r.lineIndex;
    if (i === this._textLines.length - 1 || t.metaKey || t.keyCode === 34) return this._text.length - s;
    const n = r.charIndex, o = this._getWidthBeforeCursor(i, n), h = this._getIndexOnLine(i + 1, o);
    return this._textLines[i].slice(n).length + h + 1 + this.missingNewlineOffset(i);
  }
  _getSelectionForOffset(t, e) {
    return t.shiftKey && this.selectionStart !== this.selectionEnd && e ? this.selectionEnd : this.selectionStart;
  }
  getUpCursorOffset(t, e) {
    const s = this._getSelectionForOffset(t, e), r = this.get2DCursorLocation(s), i = r.lineIndex;
    if (i === 0 || t.metaKey || t.keyCode === 33) return -s;
    const n = r.charIndex, o = this._getWidthBeforeCursor(i, n), h = this._getIndexOnLine(i - 1, o), l = this._textLines[i].slice(0, n), c = this.missingNewlineOffset(i - 1);
    return -this._textLines[i - 1].length + h - l.length + (1 - c);
  }
  _getIndexOnLine(t, e) {
    const s = this._textLines[t];
    let r, i, n = this._getLineLeftOffset(t), o = 0;
    for (let h = 0, l = s.length; h < l; h++) if (r = this.__charBounds[t][h].width, n += r, n > e) {
      i = !0;
      const c = n - r, u = n, g = Math.abs(c - e);
      o = Math.abs(u - e) < g ? h : h - 1;
      break;
    }
    return i || (o = s.length - 1), o;
  }
  moveCursorDown(t) {
    this.selectionStart >= this._text.length && this.selectionEnd >= this._text.length || this._moveCursorUpOrDown("Down", t);
  }
  moveCursorUp(t) {
    this.selectionStart === 0 && this.selectionEnd === 0 || this._moveCursorUpOrDown("Up", t);
  }
  _moveCursorUpOrDown(t, e) {
    const s = this["get".concat(t, "CursorOffset")](e, this._selectionDirection === Z);
    if (e.shiftKey ? this.moveCursorWithShift(s) : this.moveCursorWithoutShift(s), s !== 0) {
      const r = this.text.length;
      this.selectionStart = be(0, this.selectionStart, r), this.selectionEnd = be(0, this.selectionEnd, r), this.abortCursorAnimation(), this.initDelayedCursor(), this._fireSelectionChanged(), this._updateTextarea();
    }
  }
  moveCursorWithShift(t) {
    const e = this._selectionDirection === B ? this.selectionStart + t : this.selectionEnd + t;
    return this.setSelectionStartEndWithShift(this.selectionStart, this.selectionEnd, e), t !== 0;
  }
  moveCursorWithoutShift(t) {
    return t < 0 ? (this.selectionStart += t, this.selectionEnd = this.selectionStart) : (this.selectionEnd += t, this.selectionStart = this.selectionEnd), t !== 0;
  }
  moveCursorLeft(t) {
    this.selectionStart === 0 && this.selectionEnd === 0 || this._moveCursorLeftOrRight("Left", t);
  }
  _move(t, e, s) {
    let r;
    if (t.altKey) r = this["findWordBoundary".concat(s)](this[e]);
    else {
      if (!t.metaKey && t.keyCode !== 35 && t.keyCode !== 36) return this[e] += s === "Left" ? -1 : 1, !0;
      r = this["findLineBoundary".concat(s)](this[e]);
    }
    return r !== void 0 && this[e] !== r && (this[e] = r, !0);
  }
  _moveLeft(t, e) {
    return this._move(t, e, "Left");
  }
  _moveRight(t, e) {
    return this._move(t, e, "Right");
  }
  moveCursorLeftWithoutShift(t) {
    let e = !0;
    return this._selectionDirection = B, this.selectionEnd === this.selectionStart && this.selectionStart !== 0 && (e = this._moveLeft(t, "selectionStart")), this.selectionEnd = this.selectionStart, e;
  }
  moveCursorLeftWithShift(t) {
    return this._selectionDirection === Z && this.selectionStart !== this.selectionEnd ? this._moveLeft(t, "selectionEnd") : this.selectionStart !== 0 ? (this._selectionDirection = B, this._moveLeft(t, "selectionStart")) : void 0;
  }
  moveCursorRight(t) {
    this.selectionStart >= this._text.length && this.selectionEnd >= this._text.length || this._moveCursorLeftOrRight("Right", t);
  }
  _moveCursorLeftOrRight(t, e) {
    const s = "moveCursor".concat(t).concat(e.shiftKey ? "WithShift" : "WithoutShift");
    this._currentCursorOpacity = 1, this[s](e) && (this.abortCursorAnimation(), this.initDelayedCursor(), this._fireSelectionChanged(), this._updateTextarea());
  }
  moveCursorRightWithShift(t) {
    return this._selectionDirection === B && this.selectionStart !== this.selectionEnd ? this._moveRight(t, "selectionStart") : this.selectionEnd !== this._text.length ? (this._selectionDirection = Z, this._moveRight(t, "selectionEnd")) : void 0;
  }
  moveCursorRightWithoutShift(t) {
    let e = !0;
    return this._selectionDirection = Z, this.selectionStart === this.selectionEnd ? (e = this._moveRight(t, "selectionStart"), this.selectionEnd = this.selectionStart) : this.selectionStart = this.selectionEnd, e;
  }
}
const Lr = (a) => !!a.button;
class Ll extends Il {
  constructor() {
    super(...arguments), b(this, "draggableTextDelegate", void 0);
  }
  initBehavior() {
    this.on("mousedown", this._mouseDownHandler), this.on("mousedown:before", this._mouseDownHandlerBefore), this.on("mouseup", this.mouseUpHandler), this.on("mousedblclick", this.doubleClickHandler), this.on("tripleclick", this.tripleClickHandler), this.__lastClickTime = +/* @__PURE__ */ new Date(), this.__lastLastClickTime = +/* @__PURE__ */ new Date(), this.__lastPointer = {}, this.on("mousedown", this.onMouseDown), this.draggableTextDelegate = new El(this), super.initBehavior();
  }
  shouldStartDragging() {
    return this.draggableTextDelegate.isActive();
  }
  onDragStart(t) {
    return this.draggableTextDelegate.onDragStart(t);
  }
  canDrop(t) {
    return this.draggableTextDelegate.canDrop(t);
  }
  onMouseDown(t) {
    if (!this.canvas) return;
    this.__newClickTime = +/* @__PURE__ */ new Date();
    const e = t.pointer;
    this.isTripleClick(e) && (this.fire("tripleclick", t), Xr(t.e)), this.__lastLastClickTime = this.__lastClickTime, this.__lastClickTime = this.__newClickTime, this.__lastPointer = e, this.__lastSelected = this.selected && !this.getActiveControl();
  }
  isTripleClick(t) {
    return this.__newClickTime - this.__lastClickTime < 500 && this.__lastClickTime - this.__lastLastClickTime < 500 && this.__lastPointer.x === t.x && this.__lastPointer.y === t.y;
  }
  doubleClickHandler(t) {
    this.isEditing && this.selectWord(this.getSelectionStartFromPointer(t.e));
  }
  tripleClickHandler(t) {
    this.isEditing && this.selectLine(this.getSelectionStartFromPointer(t.e));
  }
  _mouseDownHandler(t) {
    let { e } = t;
    this.canvas && this.editable && !Lr(e) && !this.getActiveControl() && (this.draggableTextDelegate.start(e) || (this.canvas.textEditingManager.register(this), this.selected && (this.inCompositionMode = !1, this.setCursorByClick(e)), this.isEditing && (this.__selectionStartOnMouseDown = this.selectionStart, this.selectionStart === this.selectionEnd && this.abortCursorAnimation(), this.renderCursorOrSelection())));
  }
  _mouseDownHandlerBefore(t) {
    let { e } = t;
    this.canvas && this.editable && !Lr(e) && (this.selected = this === this.canvas._activeObject);
  }
  mouseUpHandler(t) {
    let { e, transform: s } = t;
    const r = this.draggableTextDelegate.end(e);
    if (this.canvas) {
      this.canvas.textEditingManager.unregister(this);
      const i = this.canvas._activeObject;
      if (i && i !== this) return;
    }
    !this.editable || this.group && !this.group.interactive || s && s.actionPerformed || Lr(e) || r || (this.__lastSelected && !this.getActiveControl() ? (this.selected = !1, this.__lastSelected = !1, this.enterEditing(e), this.selectionStart === this.selectionEnd ? this.initDelayedCursor(!0) : this.renderCursorOrSelection()) : this.selected = !0);
  }
  setCursorByClick(t) {
    const e = this.getSelectionStartFromPointer(t), s = this.selectionStart, r = this.selectionEnd;
    t.shiftKey ? this.setSelectionStartEndWithShift(s, r, e) : (this.selectionStart = e, this.selectionEnd = e), this.isEditing && (this._fireSelectionChanged(), this._updateTextarea());
  }
  getSelectionStartFromPointer(t) {
    const e = this.canvas.getScenePoint(t).transform(gt(this.calcTransformMatrix())).add(new _(-this._getLeftOffset(), -this._getTopOffset()));
    let s = 0, r = 0, i = 0;
    for (let l = 0; l < this._textLines.length && s <= e.y; l++) s += this.getHeightOfLine(l), i = l, l > 0 && (r += this._textLines[l - 1].length + this.missingNewlineOffset(l - 1));
    let n = Math.abs(this._getLineLeftOffset(i));
    const o = this._textLines[i].length, h = this.__charBounds[i];
    for (let l = 0; l < o; l++) {
      const c = n + h[l].kernedWidth;
      if (e.x <= c) {
        Math.abs(e.x - c) <= Math.abs(e.x - n) && r++;
        break;
      }
      n = c, r++;
    }
    return Math.min(this.flipX ? o - r : r, this._text.length);
  }
}
const ps = "moveCursorUp", ms = "moveCursorDown", vs = "moveCursorLeft", ys = "moveCursorRight", bs = "exitEditing", Pl = y({ selectionStart: 0, selectionEnd: 0, selectionColor: "rgba(17,119,255,0.3)", isEditing: !1, editable: !0, editingBorderColor: "rgba(102,153,255,0.25)", cursorWidth: 2, cursorColor: "", cursorDelay: 1e3, cursorDuration: 600, caching: !0, hiddenTextareaContainer: null, keysMap: { 9: bs, 27: bs, 33: ps, 34: ms, 35: ys, 36: vs, 37: vs, 38: ps, 39: ys, 40: ms }, keysMapRtl: { 9: bs, 27: bs, 33: ps, 34: ms, 35: vs, 36: ys, 37: ys, 38: ps, 39: vs, 40: ms }, ctrlKeysMapDown: { 65: "selectAll" }, ctrlKeysMapUp: { 67: "copy", 88: "cut" } }, { _selectionDirection: null, _reSpace: /\s|\r?\n/, inCompositionMode: !1 });
class zt extends Ll {
  static getDefaults() {
    return y(y({}, super.getDefaults()), zt.ownDefaults);
  }
  get type() {
    const t = super.type;
    return t === "itext" ? "i-text" : t;
  }
  constructor(t, e) {
    super(t, y(y({}, zt.ownDefaults), e)), this.initBehavior();
  }
  _set(t, e) {
    return this.isEditing && this._savedProps && t in this._savedProps ? (this._savedProps[t] = e, this) : (t === "canvas" && (this.canvas instanceof ii && this.canvas.textEditingManager.remove(this), e instanceof ii && e.textEditingManager.add(this)), super._set(t, e));
  }
  setSelectionStart(t) {
    t = Math.max(t, 0), this._updateAndFire("selectionStart", t);
  }
  setSelectionEnd(t) {
    t = Math.min(t, this.text.length), this._updateAndFire("selectionEnd", t);
  }
  _updateAndFire(t, e) {
    this[t] !== e && (this._fireSelectionChanged(), this[t] = e), this._updateTextarea();
  }
  _fireSelectionChanged() {
    this.fire("selection:changed"), this.canvas && this.canvas.fire("text:selection:changed", { target: this });
  }
  initDimensions() {
    this.isEditing && this.initDelayedCursor(), super.initDimensions();
  }
  getSelectionStyles() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.selectionStart || 0, e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : this.selectionEnd, s = arguments.length > 2 ? arguments[2] : void 0;
    return super.getSelectionStyles(t, e, s);
  }
  setSelectionStyles(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : this.selectionStart || 0, s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : this.selectionEnd;
    return super.setSelectionStyles(t, e, s);
  }
  get2DCursorLocation() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.selectionStart, e = arguments.length > 1 ? arguments[1] : void 0;
    return super.get2DCursorLocation(t, e);
  }
  render(t) {
    super.render(t), this.cursorOffsetCache = {}, this.renderCursorOrSelection();
  }
  toCanvasElement(t) {
    const e = this.isEditing;
    this.isEditing = !1;
    const s = super.toCanvasElement(t);
    return this.isEditing = e, s;
  }
  renderCursorOrSelection() {
    if (!this.isEditing) return;
    const t = this.clearContextTop(!0);
    if (!t) return;
    const e = this._getCursorBoundaries();
    this.selectionStart !== this.selectionEnd || this.inCompositionMode ? this.renderSelection(t, e) : this.renderCursor(t, e), this.canvas.contextTopDirty = !0, t.restore();
  }
  _getCursorBoundaries() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.selectionStart, e = arguments.length > 1 ? arguments[1] : void 0;
    const s = this._getLeftOffset(), r = this._getTopOffset(), i = this._getCursorBoundariesOffsets(t, e);
    return { left: s, top: r, leftOffset: i.left, topOffset: i.top };
  }
  _getCursorBoundariesOffsets(t, e) {
    return e ? this.__getCursorBoundariesOffsets(t) : this.cursorOffsetCache && "top" in this.cursorOffsetCache ? this.cursorOffsetCache : this.cursorOffsetCache = this.__getCursorBoundariesOffsets(t);
  }
  __getCursorBoundariesOffsets(t) {
    let e = 0, s = 0;
    const { charIndex: r, lineIndex: i } = this.get2DCursorLocation(t);
    for (let l = 0; l < i; l++) e += this.getHeightOfLine(l);
    const n = this._getLineLeftOffset(i), o = this.__charBounds[i][r];
    o && (s = o.left), this.charSpacing !== 0 && r === this._textLines[i].length && (s -= this._getWidthOfCharSpacing());
    const h = { top: e, left: n + (s > 0 ? s : 0) };
    return this.direction === "rtl" && (this.textAlign === Z || this.textAlign === kt || this.textAlign === Qe ? h.left *= -1 : this.textAlign === B || this.textAlign === er ? h.left = n - (s > 0 ? s : 0) : this.textAlign !== P && this.textAlign !== $e || (h.left = n - (s > 0 ? s : 0))), h;
  }
  renderCursorAt(t) {
    this._renderCursor(this.canvas.contextTop, this._getCursorBoundaries(t, !0), t);
  }
  renderCursor(t, e) {
    this._renderCursor(t, e, this.selectionStart);
  }
  getCursorRenderingData() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.selectionStart, e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : this._getCursorBoundaries(t);
    const s = this.get2DCursorLocation(t), r = s.lineIndex, i = s.charIndex > 0 ? s.charIndex - 1 : 0, n = this.getValueOfPropertyAt(r, i, "fontSize"), o = this.getObjectScaling().x * this.canvas.getZoom(), h = this.cursorWidth / o, l = this.getValueOfPropertyAt(r, i, "deltaY"), c = e.topOffset + (1 - this._fontSizeFraction) * this.getHeightOfLine(r) / this.lineHeight - n * (1 - this._fontSizeFraction);
    return { color: this.cursorColor || this.getValueOfPropertyAt(r, i, "fill"), opacity: this._currentCursorOpacity, left: e.left + e.leftOffset - h / 2, top: c + e.top + l, width: h, height: n };
  }
  _renderCursor(t, e, s) {
    const { color: r, opacity: i, left: n, top: o, width: h, height: l } = this.getCursorRenderingData(s, e);
    t.fillStyle = r, t.globalAlpha = i, t.fillRect(n, o, h, l);
  }
  renderSelection(t, e) {
    const s = { selectionStart: this.inCompositionMode ? this.hiddenTextarea.selectionStart : this.selectionStart, selectionEnd: this.inCompositionMode ? this.hiddenTextarea.selectionEnd : this.selectionEnd };
    this._renderSelection(t, s, e);
  }
  renderDragSourceEffect() {
    const t = this.draggableTextDelegate.getDragStartSelection();
    this._renderSelection(this.canvas.contextTop, t, this._getCursorBoundaries(t.selectionStart, !0));
  }
  renderDropTargetEffect(t) {
    const e = this.getSelectionStartFromPointer(t);
    this.renderCursorAt(e);
  }
  _renderSelection(t, e, s) {
    const r = e.selectionStart, i = e.selectionEnd, n = this.textAlign.includes(kt), o = this.get2DCursorLocation(r), h = this.get2DCursorLocation(i), l = o.lineIndex, c = h.lineIndex, u = o.charIndex < 0 ? 0 : o.charIndex, g = h.charIndex < 0 ? 0 : h.charIndex;
    for (let d = l; d <= c; d++) {
      const f = this._getLineLeftOffset(d) || 0;
      let p = this.getHeightOfLine(d), m = 0, v = 0, C = 0;
      if (d === l && (v = this.__charBounds[l][u].left), d >= l && d < c) C = n && !this.isEndOfWrapping(d) ? this.width : this.getLineWidth(d) || 5;
      else if (d === c) if (g === 0) C = this.__charBounds[c][g].left;
      else {
        const O = this._getWidthOfCharSpacing();
        C = this.__charBounds[c][g - 1].left + this.__charBounds[c][g - 1].width - O;
      }
      m = p, (this.lineHeight < 1 || d === c && this.lineHeight > 1) && (p /= this.lineHeight);
      let w = s.left + f + v, S = p, x = 0;
      const M = C - v;
      this.inCompositionMode ? (t.fillStyle = this.compositionColor || "black", S = 1, x = p) : t.fillStyle = this.selectionColor, this.direction === "rtl" && (this.textAlign === Z || this.textAlign === kt || this.textAlign === Qe ? w = this.width - w - M : this.textAlign === B || this.textAlign === er ? w = s.left + f - C : this.textAlign !== P && this.textAlign !== $e || (w = s.left + f - C)), t.fillRect(w, s.top + s.topOffset + x, M, S), s.topOffset += m;
    }
  }
  getCurrentCharFontSize() {
    const t = this._getCurrentCharIndex();
    return this.getValueOfPropertyAt(t.l, t.c, "fontSize");
  }
  getCurrentCharColor() {
    const t = this._getCurrentCharIndex();
    return this.getValueOfPropertyAt(t.l, t.c, Q);
  }
  _getCurrentCharIndex() {
    const t = this.get2DCursorLocation(this.selectionStart, !0), e = t.charIndex > 0 ? t.charIndex - 1 : 0;
    return { l: t.lineIndex, c: e };
  }
  dispose() {
    this.exitEditingImpl(), this.draggableTextDelegate.dispose(), super.dispose();
  }
}
b(zt, "ownDefaults", Pl), b(zt, "type", "IText"), D.setClass(zt), D.setClass(zt, "i-text");
class de extends zt {
  static getDefaults() {
    return y(y({}, super.getDefaults()), de.ownDefaults);
  }
  constructor(t, e) {
    super(t, y(y({}, de.ownDefaults), e));
  }
  static createControls() {
    return { controls: jo() };
  }
  initDimensions() {
    this.initialized && (this.isEditing && this.initDelayedCursor(), this._clearCache(), this.dynamicMinWidth = 0, this._styleMap = this._generateStyleMap(this._splitText()), this.dynamicMinWidth > this.width && this._set("width", this.dynamicMinWidth), this.textAlign.includes(kt) && this.enlargeSpaces(), this.height = this.calcTextHeight());
  }
  _generateStyleMap(t) {
    let e = 0, s = 0, r = 0;
    const i = {};
    for (let n = 0; n < t.graphemeLines.length; n++) t.graphemeText[r] === `
` && n > 0 ? (s = 0, r++, e++) : !this.splitByGrapheme && this._reSpaceAndTab.test(t.graphemeText[r]) && n > 0 && (s++, r++), i[n] = { line: e, offset: s }, r += t.graphemeLines[n].length, s += t.graphemeLines[n].length;
    return i;
  }
  styleHas(t, e) {
    if (this._styleMap && !this.isWrapping) {
      const s = this._styleMap[e];
      s && (e = s.line);
    }
    return super.styleHas(t, e);
  }
  isEmptyStyles(t) {
    if (!this.styles) return !0;
    let e, s = 0, r = t + 1, i = !1;
    const n = this._styleMap[t], o = this._styleMap[t + 1];
    n && (t = n.line, s = n.offset), o && (r = o.line, i = r === t, e = o.offset);
    const h = t === void 0 ? this.styles : { line: this.styles[t] };
    for (const l in h) for (const c in h[l]) {
      const u = parseInt(c, 10);
      if (u >= s && (!i || u < e)) for (const g in h[l][c]) return !1;
    }
    return !0;
  }
  _getStyleDeclaration(t, e) {
    if (this._styleMap && !this.isWrapping) {
      const s = this._styleMap[t];
      if (!s) return {};
      t = s.line, e = s.offset + e;
    }
    return super._getStyleDeclaration(t, e);
  }
  _setStyleDeclaration(t, e, s) {
    const r = this._styleMap[t];
    super._setStyleDeclaration(r.line, r.offset + e, s);
  }
  _deleteStyleDeclaration(t, e) {
    const s = this._styleMap[t];
    super._deleteStyleDeclaration(s.line, s.offset + e);
  }
  _getLineStyle(t) {
    const e = this._styleMap[t];
    return !!this.styles[e.line];
  }
  _setLineStyle(t) {
    const e = this._styleMap[t];
    super._setLineStyle(e.line);
  }
  _wrapText(t, e) {
    this.isWrapping = !0;
    const s = this.getGraphemeDataForRender(t), r = [];
    for (let i = 0; i < s.wordsData.length; i++) r.push(...this._wrapLine(i, e, s));
    return this.isWrapping = !1, r;
  }
  getGraphemeDataForRender(t) {
    const e = this.splitByGrapheme, s = e ? "" : " ";
    let r = 0;
    return { wordsData: t.map((i, n) => {
      let o = 0;
      const h = e ? this.graphemeSplit(i) : this.wordSplit(i);
      return h.length === 0 ? [{ word: [], width: 0 }] : h.map((l) => {
        const c = e ? [l] : this.graphemeSplit(l), u = this._measureWord(c, n, o);
        return r = Math.max(u, r), o += c.length + s.length, { word: c, width: u };
      });
    }), largestWordWidth: r };
  }
  _measureWord(t, e) {
    let s, r = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0, i = 0;
    for (let n = 0, o = t.length; n < o; n++)
      i += this._getGraphemeBox(t[n], e, n + r, s, !0).kernedWidth, s = t[n];
    return i;
  }
  wordSplit(t) {
    return t.split(this._wordJoiners);
  }
  _wrapLine(t, e, s) {
    let { largestWordWidth: r, wordsData: i } = s, n = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 0;
    const o = this._getWidthOfCharSpacing(), h = this.splitByGrapheme, l = [], c = h ? "" : " ";
    let u = 0, g = [], d = 0, f = 0, p = !0;
    e -= n;
    const m = Math.max(e, r, this.dynamicMinWidth), v = i[t];
    let C;
    for (d = 0, C = 0; C < v.length; C++) {
      const { word: w, width: S } = v[C];
      d += w.length, u += f + S - o, u > m && !p ? (l.push(g), g = [], u = S, p = !0) : u += o, p || h || g.push(c), g = g.concat(w), f = h ? 0 : this._measureWord([c], t, d), d++, p = !1;
    }
    return C && l.push(g), r + n > this.dynamicMinWidth && (this.dynamicMinWidth = r - o + n), l;
  }
  isEndOfWrapping(t) {
    return !this._styleMap[t + 1] || this._styleMap[t + 1].line !== this._styleMap[t].line;
  }
  missingNewlineOffset(t, e) {
    return this.splitByGrapheme && !e ? this.isEndOfWrapping(t) ? 1 : 0 : 1;
  }
  _splitTextIntoLines(t) {
    const e = super._splitTextIntoLines(t), s = this._wrapText(e.lines, this.width), r = new Array(s.length);
    for (let i = 0; i < s.length; i++) r[i] = s[i].join("");
    return e.lines = r, e.graphemeLines = s, e;
  }
  getMinWidth() {
    return Math.max(this.minWidth, this.dynamicMinWidth);
  }
  _removeExtraneousStyles() {
    const t = /* @__PURE__ */ new Map();
    for (const e in this._styleMap) {
      const s = parseInt(e, 10);
      if (this._textLines[s]) {
        const r = this._styleMap[e].line;
        t.set("".concat(r), !0);
      }
    }
    for (const e in this.styles) t.has(e) || delete this.styles[e];
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    return super.toObject(["minWidth", "splitByGrapheme", ...t]);
  }
}
b(de, "type", "Textbox"), b(de, "textLayoutProperties", [...zt.textLayoutProperties, "width"]), b(de, "ownDefaults", { minWidth: 20, dynamicMinWidth: 2, lockScalingFlip: !0, noScaleCache: !1, _wordJoiners: /[ \t\r]/, splitByGrapheme: !1 }), D.setClass(de);
class On extends _r {
  shouldPerformLayout(t) {
    return !!t.target.clipPath && super.shouldPerformLayout(t);
  }
  shouldLayoutClipPath() {
    return !1;
  }
  calcLayoutResult(t, e) {
    const { target: s } = t, { clipPath: r, group: i } = s;
    if (!r || !this.shouldPerformLayout(t)) return;
    const { width: n, height: o } = Lt(No(s, r)), h = new _(n, o);
    if (r.absolutePositioned)
      return { center: Ht(r.getRelativeCenterPoint(), void 0, i ? i.calcTransformMatrix() : void 0), size: h };
    {
      const l = r.getRelativeCenterPoint().transform(s.calcOwnMatrix(), !0);
      if (this.shouldPerformLayout(t)) {
        const { center: c = new _(), correction: u = new _() } = this.calcBoundingBox(e, t) || {};
        return { center: c.add(l), correction: u.subtract(l), size: h };
      }
      return { center: s.getRelativeCenterPoint().add(l), size: h };
    }
  }
}
b(On, "type", "clip-path"), D.setClass(On);
class jn extends _r {
  getInitialSize(t, e) {
    let { target: s } = t, { size: r } = e;
    return new _(s.width || r.x, s.height || r.y);
  }
}
b(jn, "type", "fixed"), D.setClass(jn);
class Fl extends rs {
  subscribeTargets(t) {
    const e = t.target;
    t.targets.reduce((s, r) => (r.parent && s.add(r.parent), s), /* @__PURE__ */ new Set()).forEach((s) => {
      s.layoutManager.subscribeTargets({ target: s, targets: [e] });
    });
  }
  unsubscribeTargets(t) {
    const e = t.target, s = e.getObjects();
    t.targets.reduce((r, i) => (i.parent && r.add(i.parent), r), /* @__PURE__ */ new Set()).forEach((r) => {
      !s.some((i) => i.parent === r) && r.layoutManager.unsubscribeTargets({ target: r, targets: [e] });
    });
  }
}
class q extends mt {
  static getDefaults() {
    return y(y({}, super.getDefaults()), q.ownDefaults);
  }
  constructor() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    super(), Object.assign(this, q.ownDefaults), this.setOptions(e);
    const { left: s, top: r, layoutManager: i } = e;
    this.groupInit(t, { left: s, top: r, layoutManager: i != null ? i : new Fl() });
  }
  _shouldSetNestedCoords() {
    return !0;
  }
  __objectSelectionMonitor() {
  }
  multiSelectAdd() {
    for (var t = arguments.length, e = new Array(t), s = 0; s < t; s++) e[s] = arguments[s];
    this.multiSelectionStacking === "selection-order" ? this.add(...e) : e.forEach((r) => {
      const i = this._objects.findIndex((o) => o.isInFrontOf(r)), n = i === -1 ? this.size() : i;
      this.insertAt(n, r);
    });
  }
  canEnterGroup(t) {
    return this.getObjects().some((e) => e.isDescendantOf(t) || t.isDescendantOf(e)) ? (Xt("error", "ActiveSelection: circular object trees are not supported, this call has no effect"), !1) : super.canEnterGroup(t);
  }
  enterGroup(t, e) {
    t.parent && t.parent === t.group ? t.parent._exitGroup(t) : t.group && t.parent !== t.group && t.group.remove(t), this._enterGroup(t, e);
  }
  exitGroup(t, e) {
    this._exitGroup(t, e), t.parent && t.parent._enterGroup(t, !0);
  }
  _onAfterObjectsChange(t, e) {
    super._onAfterObjectsChange(t, e);
    const s = /* @__PURE__ */ new Set();
    e.forEach((r) => {
      const { parent: i } = r;
      i && s.add(i);
    }), t === Pi ? s.forEach((r) => {
      r._onAfterObjectsChange(Qs, e);
    }) : s.forEach((r) => {
      r._set("dirty", !0);
    });
  }
  onDeselect() {
    return this.removeAll(), !1;
  }
  toString() {
    return "#<ActiveSelection: (".concat(this.complexity(), ")>");
  }
  shouldCache() {
    return !1;
  }
  isOnACache() {
    return !1;
  }
  _renderControls(t, e, s) {
    t.save(), t.globalAlpha = this.isMoving ? this.borderOpacityWhenMoving : 1;
    const r = y(y({ hasControls: !1 }, s), {}, { forActiveSelection: !0 });
    for (let i = 0; i < this._objects.length; i++) this._objects[i]._renderControls(t, r);
    super._renderControls(t, e), t.restore();
  }
}
b(q, "type", "ActiveSelection"), b(q, "ownDefaults", { multiSelectionStacking: "canvas-stacking" }), D.setClass(q), D.setClass(q, "activeSelection");
class Nl {
  constructor() {
    b(this, "resources", {});
  }
  applyFilters(t, e, s, r, i) {
    const n = i.getContext("2d");
    if (!n) return;
    n.drawImage(e, 0, 0, s, r);
    const o = { sourceWidth: s, sourceHeight: r, imageData: n.getImageData(0, 0, s, r), originalEl: e, originalImageData: n.getImageData(0, 0, s, r), canvasEl: i, ctx: n, filterBackend: this };
    t.forEach((l) => {
      l.applyTo(o);
    });
    const { imageData: h } = o;
    return h.width === s && h.height === r || (i.width = h.width, i.height = h.height), n.putImageData(h, 0, 0), o;
  }
}
class la {
  constructor() {
    let { tileSize: t = N.textureSize } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    b(this, "aPosition", new Float32Array([0, 0, 0, 1, 1, 0, 1, 1])), b(this, "resources", {}), this.tileSize = t, this.setupGLContext(t, t), this.captureGPUInfo();
  }
  setupGLContext(t, e) {
    this.dispose(), this.createWebGLCanvas(t, e);
  }
  createWebGLCanvas(t, e) {
    const s = Dt({ width: t, height: e }), r = s.getContext("webgl", { alpha: !0, premultipliedAlpha: !1, depth: !1, stencil: !1, antialias: !1 });
    r && (r.clearColor(0, 0, 0, 0), this.canvas = s, this.gl = r);
  }
  applyFilters(t, e, s, r, i, n) {
    const o = this.gl, h = i.getContext("2d");
    if (!o || !h) return;
    let l;
    n && (l = this.getCachedTexture(n, e));
    const c = { originalWidth: e.width || e.naturalWidth || 0, originalHeight: e.height || e.naturalHeight || 0, sourceWidth: s, sourceHeight: r, destinationWidth: s, destinationHeight: r, context: o, sourceTexture: this.createTexture(o, s, r, l ? void 0 : e), targetTexture: this.createTexture(o, s, r), originalTexture: l || this.createTexture(o, s, r, l ? void 0 : e), passes: t.length, webgl: !0, aPosition: this.aPosition, programCache: this.programCache, pass: 0, filterBackend: this, targetCanvas: i }, u = o.createFramebuffer();
    return o.bindFramebuffer(o.FRAMEBUFFER, u), t.forEach((g) => {
      g && g.applyTo(c);
    }), function(g) {
      const d = g.targetCanvas, f = d.width, p = d.height, m = g.destinationWidth, v = g.destinationHeight;
      f === m && p === v || (d.width = m, d.height = v);
    }(c), this.copyGLTo2D(o, c), o.bindTexture(o.TEXTURE_2D, null), o.deleteTexture(c.sourceTexture), o.deleteTexture(c.targetTexture), o.deleteFramebuffer(u), h.setTransform(1, 0, 0, 1, 0, 0), c;
  }
  dispose() {
    this.canvas && (this.canvas = null, this.gl = null), this.clearWebGLCaches();
  }
  clearWebGLCaches() {
    this.programCache = {}, this.textureCache = {};
  }
  createTexture(t, e, s, r, i) {
    const { NEAREST: n, TEXTURE_2D: o, RGBA: h, UNSIGNED_BYTE: l, CLAMP_TO_EDGE: c, TEXTURE_MAG_FILTER: u, TEXTURE_MIN_FILTER: g, TEXTURE_WRAP_S: d, TEXTURE_WRAP_T: f } = t, p = t.createTexture();
    return t.bindTexture(o, p), t.texParameteri(o, u, i || n), t.texParameteri(o, g, i || n), t.texParameteri(o, d, c), t.texParameteri(o, f, c), r ? t.texImage2D(o, 0, h, h, l, r) : t.texImage2D(o, 0, h, e, s, 0, h, l, null), p;
  }
  getCachedTexture(t, e, s) {
    const { textureCache: r } = this;
    if (r[t]) return r[t];
    {
      const i = this.createTexture(this.gl, e.width, e.height, e, s);
      return i && (r[t] = i), i;
    }
  }
  evictCachesForKey(t) {
    this.textureCache[t] && (this.gl.deleteTexture(this.textureCache[t]), delete this.textureCache[t]);
  }
  copyGLTo2D(t, e) {
    const s = t.canvas, r = e.targetCanvas, i = r.getContext("2d");
    if (!i) return;
    i.translate(0, r.height), i.scale(1, -1);
    const n = s.height - r.height;
    i.drawImage(s, 0, n, r.width, r.height, 0, 0, r.width, r.height);
  }
  copyGLTo2DPutImageData(t, e) {
    const s = e.targetCanvas.getContext("2d"), r = e.destinationWidth, i = e.destinationHeight, n = r * i * 4;
    if (!s) return;
    const o = new Uint8Array(this.imageBuffer, 0, n), h = new Uint8ClampedArray(this.imageBuffer, 0, n);
    t.readPixels(0, 0, r, i, t.RGBA, t.UNSIGNED_BYTE, o);
    const l = new ImageData(h, r, i);
    s.putImageData(l, 0, 0);
  }
  captureGPUInfo() {
    if (this.gpuInfo) return this.gpuInfo;
    const t = this.gl, e = { renderer: "", vendor: "" };
    if (!t) return e;
    const s = t.getExtension("WEBGL_debug_renderer_info");
    if (s) {
      const r = t.getParameter(s.UNMASKED_RENDERER_WEBGL), i = t.getParameter(s.UNMASKED_VENDOR_WEBGL);
      r && (e.renderer = r.toLowerCase()), i && (e.vendor = i.toLowerCase());
    }
    return this.gpuInfo = e, e;
  }
}
let Pr;
function Rl() {
  const { WebGLProbe: a } = Pt();
  return a.queryWebGL(_t()), N.enableGLFiltering && a.isSupported(N.textureSize) ? new la({ tileSize: N.textureSize }) : new Nl();
}
function Fr() {
  return !Pr && (!(arguments.length > 0 && arguments[0] !== void 0) || arguments[0]) && (Pr = Rl()), Pr;
}
const Bl = ["filters", "resizeFilter", "src", "crossOrigin", "type"], ca = ["cropX", "cropY"];
class tt extends rt {
  static getDefaults() {
    return y(y({}, super.getDefaults()), tt.ownDefaults);
  }
  constructor(t, e) {
    super(), b(this, "_lastScaleX", 1), b(this, "_lastScaleY", 1), b(this, "_filterScalingX", 1), b(this, "_filterScalingY", 1), this.filters = [], Object.assign(this, tt.ownDefaults), this.setOptions(e), this.cacheKey = "texture".concat(se()), this.setElement(typeof t == "string" ? (this.canvas && xt(this.canvas.getElement()) || Fe()).getElementById(t) : t, e);
  }
  getElement() {
    return this._element;
  }
  setElement(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    this.removeTexture(this.cacheKey), this.removeTexture("".concat(this.cacheKey, "_filtered")), this._element = t, this._originalElement = t, this._setWidthHeight(e), t.classList.add(tt.CSS_CANVAS), this.filters.length !== 0 && this.applyFilters(), this.resizeFilter && this.applyResizeFilters();
  }
  removeTexture(t) {
    const e = Fr(!1);
    e instanceof la && e.evictCachesForKey(t);
  }
  dispose() {
    super.dispose(), this.removeTexture(this.cacheKey), this.removeTexture("".concat(this.cacheKey, "_filtered")), this._cacheContext = null, ["_originalElement", "_element", "_filteredEl", "_cacheCanvas"].forEach((t) => {
      const e = this[t];
      e && Pt().dispose(e), this[t] = void 0;
    });
  }
  getCrossOrigin() {
    return this._originalElement && (this._originalElement.crossOrigin || null);
  }
  getOriginalSize() {
    const t = this.getElement();
    return t ? { width: t.naturalWidth || t.width, height: t.naturalHeight || t.height } : { width: 0, height: 0 };
  }
  _stroke(t) {
    if (!this.stroke || this.strokeWidth === 0) return;
    const e = this.width / 2, s = this.height / 2;
    t.beginPath(), t.moveTo(-e, -s), t.lineTo(e, -s), t.lineTo(e, s), t.lineTo(-e, s), t.lineTo(-e, -s), t.closePath();
  }
  toObject() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [];
    const e = [];
    return this.filters.forEach((s) => {
      s && e.push(s.toObject());
    }), y(y({}, super.toObject([...ca, ...t])), {}, { src: this.getSrc(), crossOrigin: this.getCrossOrigin(), filters: e }, this.resizeFilter ? { resizeFilter: this.resizeFilter.toObject() } : {});
  }
  hasCrop() {
    return !!this.cropX || !!this.cropY || this.width < this._element.width || this.height < this._element.height;
  }
  _toSVG() {
    const t = [], e = this._element, s = -this.width / 2, r = -this.height / 2;
    let i = [], n = [], o = "", h = "";
    if (!e) return [];
    if (this.hasCrop()) {
      const l = se();
      i.push('<clipPath id="imageCrop_' + l + `">
`, '	<rect x="' + s + '" y="' + r + '" width="' + this.width + '" height="' + this.height + `" />
`, `</clipPath>
`), o = ' clip-path="url(#imageCrop_' + l + ')" ';
    }
    if (this.imageSmoothing || (h = ' image-rendering="optimizeSpeed"'), t.push("	<image ", "COMMON_PARTS", 'xlink:href="'.concat(this.getSvgSrc(!0), '" x="').concat(s - this.cropX, '" y="').concat(r - this.cropY, '" width="').concat(e.width || e.naturalWidth, '" height="').concat(e.height || e.naturalHeight, '"').concat(h).concat(o, `></image>
`)), this.stroke || this.strokeDashArray) {
      const l = this.fill;
      this.fill = null, n = ['	<rect x="'.concat(s, '" y="').concat(r, '" width="').concat(this.width, '" height="').concat(this.height, '" style="').concat(this.getSvgStyles(), `" />
`)], this.fill = l;
    }
    return i = this.paintFirst !== Q ? i.concat(n, t) : i.concat(t, n), i;
  }
  getSrc(t) {
    const e = t ? this._element : this._originalElement;
    return e ? e.toDataURL ? e.toDataURL() : this.srcFromAttribute ? e.getAttribute("src") || "" : e.src : this.src || "";
  }
  getSvgSrc(t) {
    return this.getSrc(t);
  }
  setSrc(t) {
    let { crossOrigin: e, signal: s } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    return qe(t, { crossOrigin: e, signal: s }).then((r) => {
      e !== void 0 && this.set({ crossOrigin: e }), this.setElement(r);
    });
  }
  toString() {
    return '#<Image: { src: "'.concat(this.getSrc(), '" }>');
  }
  applyResizeFilters() {
    const t = this.resizeFilter, e = this.minimumScaleTrigger, s = this.getTotalObjectScaling(), r = s.x, i = s.y, n = this._filteredEl || this._originalElement;
    if (this.group && this.set("dirty", !0), !t || r > e && i > e) return this._element = n, this._filterScalingX = 1, this._filterScalingY = 1, this._lastScaleX = r, void (this._lastScaleY = i);
    const o = Dt(n), { width: h, height: l } = n;
    this._element = o, this._lastScaleX = t.scaleX = r, this._lastScaleY = t.scaleY = i, Fr().applyFilters([t], n, h, l, this._element), this._filterScalingX = o.width / this._originalElement.width, this._filterScalingY = o.height / this._originalElement.height;
  }
  applyFilters() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.filters || [];
    if (t = t.filter((i) => i && !i.isNeutralState()), this.set("dirty", !0), this.removeTexture("".concat(this.cacheKey, "_filtered")), t.length === 0) return this._element = this._originalElement, this._filteredEl = void 0, this._filterScalingX = 1, void (this._filterScalingY = 1);
    const e = this._originalElement, s = e.naturalWidth || e.width, r = e.naturalHeight || e.height;
    if (this._element === this._originalElement) {
      const i = Dt({ width: s, height: r });
      this._element = i, this._filteredEl = i;
    } else this._filteredEl && (this._element = this._filteredEl, this._filteredEl.getContext("2d").clearRect(0, 0, s, r), this._lastScaleX = 1, this._lastScaleY = 1);
    Fr().applyFilters(t, this._originalElement, s, r, this._element), this._originalElement.width === this._element.width && this._originalElement.height === this._element.height || (this._filterScalingX = this._element.width / this._originalElement.width, this._filterScalingY = this._element.height / this._originalElement.height);
  }
  _render(t) {
    t.imageSmoothingEnabled = this.imageSmoothing, this.isMoving !== !0 && this.resizeFilter && this._needsResize() && this.applyResizeFilters(), this._stroke(t), this._renderPaintInOrder(t);
  }
  drawCacheOnCanvas(t) {
    t.imageSmoothingEnabled = this.imageSmoothing, super.drawCacheOnCanvas(t);
  }
  shouldCache() {
    return this.needsItsOwnCache();
  }
  _renderFill(t) {
    const e = this._element;
    if (!e) return;
    const s = this._filterScalingX, r = this._filterScalingY, i = this.width, n = this.height, o = Math.max(this.cropX, 0), h = Math.max(this.cropY, 0), l = e.naturalWidth || e.width, c = e.naturalHeight || e.height, u = o * s, g = h * r, d = Math.min(i * s, l - u), f = Math.min(n * r, c - g), p = -i / 2, m = -n / 2, v = Math.min(i, l / s - o), C = Math.min(n, c / r - h);
    e && t.drawImage(e, u, g, d, f, p, m, v, C);
  }
  _needsResize() {
    const t = this.getTotalObjectScaling();
    return t.x !== this._lastScaleX || t.y !== this._lastScaleY;
  }
  _resetWidthHeight() {
    this.set(this.getOriginalSize());
  }
  _setWidthHeight() {
    let { width: t, height: e } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    const s = this.getOriginalSize();
    this.width = t || s.width, this.height = e || s.height;
  }
  parsePreserveAspectRatioAttribute() {
    const t = Si(this.preserveAspectRatio || ""), e = this.width, s = this.height, r = { width: e, height: s };
    let i, n = this._element.width, o = this._element.height, h = 1, l = 1, c = 0, u = 0, g = 0, d = 0;
    return !t || t.alignX === at && t.alignY === at ? (h = e / n, l = s / o) : (t.meetOrSlice === "meet" && (h = l = Bo(this._element, r), i = (e - n * h) / 2, t.alignX === "Min" && (c = -i), t.alignX === "Max" && (c = i), i = (s - o * l) / 2, t.alignY === "Min" && (u = -i), t.alignY === "Max" && (u = i)), t.meetOrSlice === "slice" && (h = l = Yo(this._element, r), i = n - e / h, t.alignX === "Mid" && (g = i / 2), t.alignX === "Max" && (g = i), i = o - s / l, t.alignY === "Mid" && (d = i / 2), t.alignY === "Max" && (d = i), n = e / h, o = s / l)), { width: n, height: o, scaleX: h, scaleY: l, offsetLeft: c, offsetTop: u, cropX: g, cropY: d };
  }
  static fromObject(t, e) {
    let { filters: s, resizeFilter: r, src: i, crossOrigin: n, type: o } = t, h = H(t, Bl);
    return Promise.all([qe(i, y(y({}, e), {}, { crossOrigin: n })), s && ke(s, e), r && ke([r], e), ns(h, e)]).then((l) => {
      let [c, u = [], [g] = [], d = {}] = l;
      return new this(c, y(y({}, h), {}, { src: i, filters: u, resizeFilter: g }, d));
    });
  }
  static fromURL(t) {
    let { crossOrigin: e = null, signal: s } = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, r = arguments.length > 2 ? arguments[2] : void 0;
    return qe(t, { crossOrigin: e, signal: s }).then((i) => new this(i, r));
  }
  static fromElement(e) {
    return R(this, arguments, function* (t) {
      let s = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, r = arguments.length > 2 ? arguments[2] : void 0;
      const i = Kt(t, this.ATTRIBUTE_NAMES, r);
      return this.fromURL(i["xlink:href"], s, i).catch((n) => (Xt("log", "Unable to parse Image", n), null));
    });
  }
}
function Nr(a) {
  if (!sh.test(a.nodeName)) return {};
  const t = a.getAttribute("viewBox");
  let e, s, r = 1, i = 1, n = 0, o = 0;
  const h = a.getAttribute("width"), l = a.getAttribute("height"), c = a.getAttribute("x") || 0, u = a.getAttribute("y") || 0, g = !(t && ln.test(t)), d = !h || !l || h === "100%" || l === "100%";
  let f = "", p = 0, m = 0;
  if (g && (c || u) && a.parentNode && a.parentNode.nodeName !== "#document" && (f = " translate(" + nt(c || "0") + " " + nt(u || "0") + ") ", e = (a.getAttribute("transform") || "") + f, a.setAttribute("transform", e), a.removeAttribute("x"), a.removeAttribute("y")), g && d) return { width: 0, height: 0 };
  const v = { width: 0, height: 0 };
  if (g) return v.width = nt(h), v.height = nt(l), v;
  const C = t.match(ln);
  n = -parseFloat(C[1]), o = -parseFloat(C[2]);
  const w = parseFloat(C[3]), S = parseFloat(C[4]);
  v.minX = n, v.minY = o, v.viewBoxWidth = w, v.viewBoxHeight = S, d ? (v.width = w, v.height = S) : (v.width = nt(h), v.height = nt(l), r = v.width / w, i = v.height / S);
  const x = Si(a.getAttribute("preserveAspectRatio") || "");
  if (x.alignX !== at && (x.meetOrSlice === "meet" && (i = r = r > i ? i : r), x.meetOrSlice === "slice" && (i = r = r > i ? r : i), p = v.width - w * r, m = v.height - S * r, x.alignX === "Mid" && (p /= 2), x.alignY === "Mid" && (m /= 2), x.alignX === "Min" && (p = 0), x.alignY === "Min" && (m = 0)), r === 1 && i === 1 && n === 0 && o === 0 && c === 0 && u === 0) return v;
  if ((c || u) && a.parentNode.nodeName !== "#document" && (f = " translate(" + nt(c || "0") + " " + nt(u || "0") + ") "), e = f + " matrix(" + r + " 0 0 " + i + " " + (n * r + p) + " " + (o * i + m) + ") ", a.nodeName === "svg") {
    for (s = a.ownerDocument.createElementNS(Zr, "g"); a.firstChild; ) s.appendChild(a.firstChild);
    a.appendChild(s);
  } else s = a, s.removeAttribute("x"), s.removeAttribute("y"), e = s.getAttribute("transform") + e;
  return s.setAttribute("transform", e), v;
}
b(tt, "type", "Image"), b(tt, "cacheProperties", [...Zt, ...ca]), b(tt, "ownDefaults", { strokeWidth: 0, srcFromAttribute: !1, minimumScaleTrigger: 0.5, cropX: 0, cropY: 0, imageSmoothing: !0 }), b(tt, "CSS_CANVAS", "canvas-img"), b(tt, "ATTRIBUTE_NAMES", [...oe, "x", "y", "width", "height", "preserveAspectRatio", "xlink:href", "crossOrigin", "image-rendering"]), D.setClass(tt), D.setSVGClass(tt);
const sr = (a) => a.tagName.replace("svg:", ""), Yl = pr(["pattern", "defs", "symbol", "metadata", "clipPath", "mask", "desc"]);
function ua(a, t) {
  let e, s, r, i, n = [];
  for (r = 0, i = t.length; r < i; r++) e = t[r], s = a.getElementsByTagNameNS("http://www.w3.org/2000/svg", e), n = n.concat(Array.from(s));
  return n;
}
const Wl = ["gradientTransform", "x1", "x2", "y1", "y2", "gradientUnits", "cx", "cy", "r", "fx", "fy"], Rr = "xlink:href";
function ga(a, t) {
  var e;
  const s = ((e = t.getAttribute(Rr)) === null || e === void 0 ? void 0 : e.slice(1)) || "", r = a.getElementById(s);
  if (r && r.getAttribute(Rr) && ga(a, r), r && (Wl.forEach((i) => {
    const n = r.getAttribute(i);
    !t.hasAttribute(i) && n && t.setAttribute(i, n);
  }), !t.children.length)) {
    const i = r.cloneNode(!0);
    for (; i.firstChild; ) t.appendChild(i.firstChild);
  }
  t.removeAttribute(Rr);
}
const zl = ["linearGradient", "radialGradient", "svg:linearGradient", "svg:radialGradient"];
function Hl(a) {
  const t = a.getElementsByTagName("style");
  let e, s;
  const r = {};
  for (e = 0, s = t.length; e < s; e++) {
    const i = (t[e].textContent || "").replace(/\/\*[\s\S]*?\*\//g, "");
    i.trim() !== "" && i.split("}").filter((n, o, h) => h.length > 1 && n.trim()).forEach((n) => {
      if ((n.match(/{/g) || []).length > 1 && n.trim().startsWith("@")) return;
      const o = n.split("{"), h = {}, l = o[1].trim().split(";").filter(function(c) {
        return c.trim();
      });
      for (e = 0, s = l.length; e < s; e++) {
        const c = l[e].split(":"), u = c[0].trim(), g = c[1].trim();
        h[u] = g;
      }
      (n = o[0].trim()).split(",").forEach((c) => {
        (c = c.replace(/^svg/i, "").trim()) !== "" && (r[c] = y(y({}, r[c] || {}), h));
      });
    });
  }
  return r;
}
const Dn = (a) => D.getSVGClass(sr(a).toLowerCase());
class Vl {
  constructor(t, e, s, r, i) {
    this.elements = t, this.options = e, this.reviver = s, this.regexUrl = /^url\(['"]?#([^'"]+)['"]?\)/g, this.doc = r, this.clipPaths = i, this.gradientDefs = function(n) {
      const o = ua(n, zl), h = {};
      let l = o.length;
      for (; l--; ) {
        const c = o[l];
        c.getAttribute("xlink:href") && ga(n, c);
        const u = c.getAttribute("id");
        u && (h[u] = c);
      }
      return h;
    }(r), this.cssRules = Hl(r);
  }
  parse() {
    return Promise.all(this.elements.map((t) => this.createObject(t)));
  }
  createObject(t) {
    return R(this, null, function* () {
      const e = Dn(t);
      if (e) {
        const s = yield e.fromElement(t, this.options, this.cssRules);
        return this.resolveGradient(s, t, Q), this.resolveGradient(s, t, ht), s instanceof tt && s._originalElement ? Ys(s, s.parsePreserveAspectRatioAttribute()) : Ys(s), yield this.resolveClipPath(s, t), this.reviver && this.reviver(t, s), s;
      }
      return null;
    });
  }
  extractPropertyDefinition(t, e, s) {
    const r = t[e], i = this.regexUrl;
    if (!i.test(r)) return;
    i.lastIndex = 0;
    const n = i.exec(r)[1];
    return i.lastIndex = 0, s[n];
  }
  resolveGradient(t, e, s) {
    const r = this.extractPropertyDefinition(t, s, this.gradientDefs);
    if (r) {
      const i = e.getAttribute(s + "-opacity"), n = Ge.fromElement(r, t, y(y({}, this.options), {}, { opacity: i }));
      t.set(s, n);
    }
  }
  resolveClipPath(t, e, s) {
    return R(this, null, function* () {
      const r = this.extractPropertyDefinition(t, "clipPath", this.clipPaths);
      if (r) {
        const i = gt(t.calcTransformMatrix()), n = r[0].parentElement;
        let o = e;
        for (; !s && o.parentElement && o.getAttribute("clip-path") !== t.clipPath; ) o = o.parentElement;
        o.parentElement.appendChild(n);
        const h = qs("".concat(o.getAttribute("transform") || "", " ").concat(n.getAttribute("originalTransform") || ""));
        n.setAttribute("transform", "matrix(".concat(h.join(","), ")"));
        const l = yield Promise.all(r.map((C) => Dn(C).fromElement(C, this.options, this.cssRules).then((w) => (Ys(w), w.fillRule = w.clipRule, delete w.clipRule, w)))), c = l.length === 1 ? l[0] : new mt(l), u = U(i, c.calcTransformMatrix());
        c.clipPath && (yield this.resolveClipPath(c, o, n.getAttribute("clip-path") ? o : void 0));
        const { scaleX: g, scaleY: d, angle: f, skewX: p, translateX: m, translateY: v } = ye(u);
        c.set({ flipX: !1, flipY: !1 }), c.set({ scaleX: g, scaleY: d, angle: f, skewX: p, skewY: 0 }), c.setPositionByOrigin(new _(m, v), P, P), t.clipPath = c;
      } else delete t.clipPath;
    });
  }
}
const An = (a) => eh.test(sr(a)), oi = () => ({ objects: [], elements: [], options: {}, allElements: [] });
function Ul(e, s) {
  return R(this, arguments, function* (a, t) {
    let { crossOrigin: r, signal: i } = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    if (i && i.aborted) return Xt("log", new di("parseSVGDocument")), oi();
    const n = a.documentElement;
    (function(g) {
      const d = ua(g, ["use", "svg:use"]), f = ["x", "y", "xlink:href", "href", "transform"];
      for (const p of d) {
        const m = p.attributes, v = {};
        for (const A of m) A.value && (v[A.name] = A.value);
        const C = (v["xlink:href"] || v.href || "").slice(1);
        if (C === "") return;
        const w = g.getElementById(C);
        if (w === null) return;
        let S = w.cloneNode(!0);
        const x = S.attributes, M = {};
        for (const A of x) A.value && (M[A.name] = A.value);
        const { x: O = 0, y: T = 0, transform: j = "" } = v, I = "".concat(j, " ").concat(M.transform || "", " translate(").concat(O, ", ").concat(T, ")");
        if (Nr(S), /^svg$/i.test(S.nodeName)) {
          const A = S.ownerDocument.createElementNS(Zr, "g");
          Object.entries(M).forEach((E) => {
            let [k, F] = E;
            return A.setAttributeNS(Zr, k, F);
          }), A.append(...S.childNodes), S = A;
        }
        for (const A of m) {
          if (!A) continue;
          const { name: E, value: k } = A;
          if (!f.includes(E)) if (E === "style") {
            const F = {};
            ti(k, F), Object.entries(M).forEach((G) => {
              let [ut, W] = G;
              F[ut] = W;
            }), ti(M.style || "", F);
            const et = Object.entries(F).map((G) => G.join(":")).join(";");
            S.setAttribute(E, et);
          } else !M[E] && S.setAttribute(E, k);
        }
        S.setAttribute("transform", I), S.setAttribute("instantiated_by_use", "1"), S.removeAttribute("id"), p.parentNode.replaceChild(S, p);
      }
    })(a);
    const o = Array.from(n.getElementsByTagName("*")), h = y(y({}, Nr(n)), {}, { crossOrigin: r, signal: i }), l = o.filter((g) => (Nr(g), An(g) && !function(d) {
      let f = d;
      for (; f && (f = f.parentElement); ) if (f && f.nodeName && Yl.test(sr(f)) && !f.getAttribute("instantiated_by_use")) return !0;
      return !1;
    }(g)));
    if (!l || l && !l.length) return y(y({}, oi()), {}, { options: h, allElements: o });
    const c = {};
    return o.filter((g) => sr(g) === "clipPath").forEach((g) => {
      g.setAttribute("originalTransform", g.getAttribute("transform") || "");
      const d = g.getAttribute("id");
      c[d] = Array.from(g.getElementsByTagName("*")).filter((f) => An(f));
    }), { objects: yield new Vl(l, h, t, a, c).parse(), elements: l, options: h, allElements: o };
  });
}
function Xl(a, t) {
  let e = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
  return new Promise((s, r) => {
    Ko(a.replace(/^\n\s*/, "").trim(), { onComplete: (i) => {
      const n = i.responseXML;
      n && s(n), r();
    }, signal: e.signal });
  }).then((s) => Ul(s, t, e)).catch(() => oi());
}
const da = zn, En = (a) => function(t, e, s) {
  const { points: r, pathOffset: i } = s;
  return new _(r[a]).subtract(i).transform(U(s.getViewportTransform(), s.calcTransformMatrix()));
}, fa = (a, t, e, s) => {
  const { target: r, pointIndex: i } = t, n = r, o = Ht(new _(e, s), void 0, n.calcOwnMatrix());
  return n.points[i] = o.add(n.pathOffset), n.setDimensions(), !0;
}, pa = (a, t) => function(e, s, r, i) {
  const n = s.target, o = new _(n.points[(a > 0 ? a : n.points.length) - 1]), h = o.subtract(n.pathOffset).transform(n.calcOwnMatrix()), l = t(e, y(y({}, s), {}, { pointIndex: a }), r, i), c = o.subtract(n.pathOffset).transform(n.calcOwnMatrix()).subtract(h);
  return n.left -= c.x, n.top -= c.y, l;
}, kn = (a) => ne(da, pa(a, fa)), ai = (a, t, e) => {
  const { path: s, pathOffset: r } = a, i = s[t];
  return new _(i[e] - r.x, i[e + 1] - r.y).transform(U(a.getViewportTransform(), a.calcTransformMatrix()));
};
function Gl(a, t, e) {
  const { commandIndex: s, pointIndex: r } = this;
  return ai(e, s, r);
}
function Zl(a, t, e, s) {
  const { target: r } = t, { commandIndex: i, pointIndex: n } = this, o = ((h, l, c, u, g) => {
    const { path: d, pathOffset: f } = h, p = d[(u > 0 ? u : d.length) - 1], m = new _(p[g], p[g + 1]), v = m.subtract(f).transform(h.calcOwnMatrix()), C = Ht(new _(l, c), void 0, h.calcOwnMatrix());
    d[u][g] = C.x + f.x, d[u][g + 1] = C.y + f.y, h.setDimensions();
    const w = m.subtract(h.pathOffset).transform(h.calcOwnMatrix()).subtract(v);
    return h.left -= w.x, h.top -= w.y, h.set("dirty", !0), !0;
  })(r, e, s, i, n);
  return Mi(this.actionName, y(y({}, Ti(a, t, e, s)), {}, { commandIndex: i, pointIndex: n })), o;
}
class ma extends pt {
  constructor(t) {
    super(t);
  }
  render(t, e, s, r, i) {
    const n = y(y({}, r), {}, { cornerColor: this.controlFill, cornerStrokeColor: this.controlStroke, transparentCorners: !this.controlFill });
    super.render(t, e, s, n, i);
  }
}
class Kl extends ma {
  constructor(t) {
    super(t);
  }
  render(t, e, s, r, i) {
    const { path: n } = i, { commandIndex: o, pointIndex: h, connectToCommandIndex: l, connectToPointIndex: c } = this;
    t.save(), t.strokeStyle = this.controlStroke, this.connectionDashArray && t.setLineDash(this.connectionDashArray);
    const [u] = n[o], g = ai(i, l, c);
    if (u === "Q") {
      const d = ai(i, o, h + 2);
      t.moveTo(d.x, d.y), t.lineTo(e, s);
    } else t.moveTo(e, s);
    t.lineTo(g.x, g.y), t.stroke(), t.restore(), super.render(t, e, s, r, i);
  }
}
const _s = (a, t, e, s, r, i) => new (e ? Kl : ma)(y(y({ commandIndex: a, pointIndex: t, actionName: "modifyPath", positionHandler: Gl, actionHandler: Zl, connectToCommandIndex: r, connectToPointIndex: i }, s), e ? s.controlPointStyle : s.pointStyle));
var ql = Object.freeze({ __proto__: null, changeWidth: Qr, createObjectDefaultControls: ki, createPathControls: function(a) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const e = {};
  let s = "M";
  return a.path.forEach((r, i) => {
    const n = r[0];
    switch (n !== "Z" && (e["c_".concat(i, "_").concat(n)] = _s(i, r.length - 2, !1, t)), n) {
      case "C":
        e["c_".concat(i, "_C_CP_1")] = _s(i, 1, !0, t, i - 1, /* @__PURE__ */ ((o) => o === "C" ? 5 : o === "Q" ? 3 : 1)(s)), e["c_".concat(i, "_C_CP_2")] = _s(i, 3, !0, t, i, 5);
        break;
      case "Q":
        e["c_".concat(i, "_Q_CP_1")] = _s(i, 1, !0, t, i, 3);
    }
    s = n;
  }), e;
}, createPolyActionHandler: kn, createPolyControls: function(a) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const e = {};
  for (let s = 0; s < (typeof a == "number" ? a : a.points.length); s++) e["p".concat(s)] = new pt(y({ actionName: da, positionHandler: En(s), actionHandler: kn(s) }, t));
  return e;
}, createPolyPositionHandler: En, createResizeControls: Oo, createTextboxDefaultControls: jo, dragHandler: ao, factoryPolyActionHandler: pa, getLocalPoint: fr, polyActionHandler: fa, renderCircleControl: po, renderSquareControl: mo, rotationStyleHandler: vo, rotationWithSnapping: yo, scaleCursorStyleHandler: Me, scaleOrSkewActionName: Xe, scaleSkewCursorStyleHandler: ge, scalingEqually: Ue, scalingX: Co, scalingXOrSkewingY: $r, scalingY: wo, scalingYOrSkewingX: Jr, skewCursorStyleHandler: So, skewHandlerX: Mo, skewHandlerY: To, wrapWithFireEvent: ne, wrapWithFixedAnchor: Ce });
const wr = (a) => a.webgl !== void 0, Ni = "precision highp float", Ql = `
    `.concat(Ni, `;
    varying vec2 vTexCoord;
    uniform sampler2D uTexture;
    void main() {
      gl_FragColor = texture2D(uTexture, vTexCoord);
    }`), $l = ["type"], Jl = ["type"], tc = new RegExp(Ni, "g");
class $ {
  get type() {
    return this.constructor.type;
  }
  constructor() {
    let t = H(arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, $l);
    Object.assign(this, this.constructor.defaults, t);
  }
  getFragmentSource() {
    return Ql;
  }
  getVertexSource() {
    return `
    attribute vec2 aPosition;
    varying vec2 vTexCoord;
    void main() {
      vTexCoord = aPosition;
      gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
    }`;
  }
  createProgram(t) {
    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : this.getFragmentSource(), s = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : this.getVertexSource();
    const { WebGLProbe: { GLPrecision: r = "highp" } } = Pt();
    r !== "highp" && (e = e.replace(tc, Ni.replace("highp", r)));
    const i = t.createShader(t.VERTEX_SHADER), n = t.createShader(t.FRAGMENT_SHADER), o = t.createProgram();
    if (!i || !n || !o) throw new It("Vertex, fragment shader or program creation error");
    if (t.shaderSource(i, s), t.compileShader(i), !t.getShaderParameter(i, t.COMPILE_STATUS)) throw new It("Vertex shader compile error for ".concat(this.type, ": ").concat(t.getShaderInfoLog(i)));
    if (t.shaderSource(n, e), t.compileShader(n), !t.getShaderParameter(n, t.COMPILE_STATUS)) throw new It("Fragment shader compile error for ".concat(this.type, ": ").concat(t.getShaderInfoLog(n)));
    if (t.attachShader(o, i), t.attachShader(o, n), t.linkProgram(o), !t.getProgramParameter(o, t.LINK_STATUS)) throw new It('Shader link error for "'.concat(this.type, '" ').concat(t.getProgramInfoLog(o)));
    const h = this.getUniformLocations(t, o) || {};
    return h.uStepW = t.getUniformLocation(o, "uStepW"), h.uStepH = t.getUniformLocation(o, "uStepH"), { program: o, attributeLocations: this.getAttributeLocations(t, o), uniformLocations: h };
  }
  getAttributeLocations(t, e) {
    return { aPosition: t.getAttribLocation(e, "aPosition") };
  }
  getUniformLocations(t, e) {
    const s = this.constructor.uniformLocations, r = {};
    for (let i = 0; i < s.length; i++) r[s[i]] = t.getUniformLocation(e, s[i]);
    return r;
  }
  sendAttributeData(t, e, s) {
    const r = e.aPosition, i = t.createBuffer();
    t.bindBuffer(t.ARRAY_BUFFER, i), t.enableVertexAttribArray(r), t.vertexAttribPointer(r, 2, t.FLOAT, !1, 0, 0), t.bufferData(t.ARRAY_BUFFER, s, t.STATIC_DRAW);
  }
  _setupFrameBuffer(t) {
    const e = t.context;
    if (t.passes > 1) {
      const s = t.destinationWidth, r = t.destinationHeight;
      t.sourceWidth === s && t.sourceHeight === r || (e.deleteTexture(t.targetTexture), t.targetTexture = t.filterBackend.createTexture(e, s, r)), e.framebufferTexture2D(e.FRAMEBUFFER, e.COLOR_ATTACHMENT0, e.TEXTURE_2D, t.targetTexture, 0);
    } else e.bindFramebuffer(e.FRAMEBUFFER, null), e.finish();
  }
  _swapTextures(t) {
    t.passes--, t.pass++;
    const e = t.targetTexture;
    t.targetTexture = t.sourceTexture, t.sourceTexture = e;
  }
  isNeutralState(t) {
    return !1;
  }
  applyTo(t) {
    wr(t) ? (this._setupFrameBuffer(t), this.applyToWebGL(t), this._swapTextures(t)) : this.applyTo2d(t);
  }
  applyTo2d(t) {
  }
  getCacheKey() {
    return this.type;
  }
  retrieveShader(t) {
    const e = this.getCacheKey();
    return t.programCache[e] || (t.programCache[e] = this.createProgram(t.context)), t.programCache[e];
  }
  applyToWebGL(t) {
    const e = t.context, s = this.retrieveShader(t);
    t.pass === 0 && t.originalTexture ? e.bindTexture(e.TEXTURE_2D, t.originalTexture) : e.bindTexture(e.TEXTURE_2D, t.sourceTexture), e.useProgram(s.program), this.sendAttributeData(e, s.attributeLocations, t.aPosition), e.uniform1f(s.uniformLocations.uStepW, 1 / t.sourceWidth), e.uniform1f(s.uniformLocations.uStepH, 1 / t.sourceHeight), this.sendUniformData(e, s.uniformLocations), e.viewport(0, 0, t.destinationWidth, t.destinationHeight), e.drawArrays(e.TRIANGLE_STRIP, 0, 4);
  }
  bindAdditionalTexture(t, e, s) {
    t.activeTexture(s), t.bindTexture(t.TEXTURE_2D, e), t.activeTexture(t.TEXTURE0);
  }
  unbindAdditionalTexture(t, e) {
    t.activeTexture(e), t.bindTexture(t.TEXTURE_2D, null), t.activeTexture(t.TEXTURE0);
  }
  sendUniformData(t, e) {
  }
  createHelpLayer(t) {
    if (!t.helpLayer) {
      const { sourceWidth: e, sourceHeight: s } = t, r = Dt({ width: e, height: s });
      t.helpLayer = r;
    }
  }
  toObject() {
    const t = Object.keys(this.constructor.defaults || {});
    return y({ type: this.type }, t.reduce((e, s) => (e[s] = this[s], e), {}));
  }
  toJSON() {
    return this.toObject();
  }
  static fromObject(t, e) {
    return R(this, null, function* () {
      return new this(H(t, Jl));
    });
  }
}
b($, "type", "BaseFilter"), b($, "uniformLocations", []);
const ec = { multiply: `gl_FragColor.rgb *= uColor.rgb;
`, screen: `gl_FragColor.rgb = 1.0 - (1.0 - gl_FragColor.rgb) * (1.0 - uColor.rgb);
`, add: `gl_FragColor.rgb += uColor.rgb;
`, difference: `gl_FragColor.rgb = abs(gl_FragColor.rgb - uColor.rgb);
`, subtract: `gl_FragColor.rgb -= uColor.rgb;
`, lighten: `gl_FragColor.rgb = max(gl_FragColor.rgb, uColor.rgb);
`, darken: `gl_FragColor.rgb = min(gl_FragColor.rgb, uColor.rgb);
`, exclusion: `gl_FragColor.rgb += uColor.rgb - 2.0 * (uColor.rgb * gl_FragColor.rgb);
`, overlay: `
    if (uColor.r < 0.5) {
      gl_FragColor.r *= 2.0 * uColor.r;
    } else {
      gl_FragColor.r = 1.0 - 2.0 * (1.0 - gl_FragColor.r) * (1.0 - uColor.r);
    }
    if (uColor.g < 0.5) {
      gl_FragColor.g *= 2.0 * uColor.g;
    } else {
      gl_FragColor.g = 1.0 - 2.0 * (1.0 - gl_FragColor.g) * (1.0 - uColor.g);
    }
    if (uColor.b < 0.5) {
      gl_FragColor.b *= 2.0 * uColor.b;
    } else {
      gl_FragColor.b = 1.0 - 2.0 * (1.0 - gl_FragColor.b) * (1.0 - uColor.b);
    }
    `, tint: `
    gl_FragColor.rgb *= (1.0 - uColor.a);
    gl_FragColor.rgb += uColor.rgb;
    ` };
class Cs extends $ {
  getCacheKey() {
    return "".concat(this.type, "_").concat(this.mode);
  }
  getFragmentSource() {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec4 uColor;
      varying vec2 vTexCoord;
      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        gl_FragColor = color;
        if (color.a > 0.0) {
          `.concat(ec[this.mode], `
        }
      }
      `);
  }
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    const s = new Y(this.color).getSource(), r = this.alpha, i = s[0] * r, n = s[1] * r, o = s[2] * r, h = 1 - r;
    for (let l = 0; l < e.length; l += 4) {
      const c = e[l], u = e[l + 1], g = e[l + 2];
      let d, f, p;
      switch (this.mode) {
        case "multiply":
          d = c * i / 255, f = u * n / 255, p = g * o / 255;
          break;
        case "screen":
          d = 255 - (255 - c) * (255 - i) / 255, f = 255 - (255 - u) * (255 - n) / 255, p = 255 - (255 - g) * (255 - o) / 255;
          break;
        case "add":
          d = c + i, f = u + n, p = g + o;
          break;
        case "difference":
          d = Math.abs(c - i), f = Math.abs(u - n), p = Math.abs(g - o);
          break;
        case "subtract":
          d = c - i, f = u - n, p = g - o;
          break;
        case "darken":
          d = Math.min(c, i), f = Math.min(u, n), p = Math.min(g, o);
          break;
        case "lighten":
          d = Math.max(c, i), f = Math.max(u, n), p = Math.max(g, o);
          break;
        case "overlay":
          d = i < 128 ? 2 * c * i / 255 : 255 - 2 * (255 - c) * (255 - i) / 255, f = n < 128 ? 2 * u * n / 255 : 255 - 2 * (255 - u) * (255 - n) / 255, p = o < 128 ? 2 * g * o / 255 : 255 - 2 * (255 - g) * (255 - o) / 255;
          break;
        case "exclusion":
          d = i + c - 2 * i * c / 255, f = n + u - 2 * n * u / 255, p = o + g - 2 * o * g / 255;
          break;
        case "tint":
          d = i + c * h, f = n + u * h, p = o + g * h;
      }
      e[l] = d, e[l + 1] = f, e[l + 2] = p;
    }
  }
  sendUniformData(t, e) {
    const s = new Y(this.color).getSource();
    s[0] = this.alpha * s[0] / 255, s[1] = this.alpha * s[1] / 255, s[2] = this.alpha * s[2] / 255, s[3] = this.alpha, t.uniform4fv(e.uColor, s);
  }
}
b(Cs, "defaults", { color: "#F95C63", mode: "multiply", alpha: 1 }), b(Cs, "type", "BlendColor"), b(Cs, "uniformLocations", ["uColor"]), D.setClass(Cs);
const sc = { multiply: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform sampler2D uImage;
    uniform vec4 uColor;
    varying vec2 vTexCoord;
    varying vec2 vTexCoord2;
    void main() {
      vec4 color = texture2D(uTexture, vTexCoord);
      vec4 color2 = texture2D(uImage, vTexCoord2);
      color.rgba *= color2.rgba;
      gl_FragColor = color;
    }
    `, mask: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform sampler2D uImage;
    uniform vec4 uColor;
    varying vec2 vTexCoord;
    varying vec2 vTexCoord2;
    void main() {
      vec4 color = texture2D(uTexture, vTexCoord);
      vec4 color2 = texture2D(uImage, vTexCoord2);
      color.a = color2.a;
      gl_FragColor = color;
    }
    ` }, rc = ["type", "image"];
class ws extends $ {
  getCacheKey() {
    return "".concat(this.type, "_").concat(this.mode);
  }
  getFragmentSource() {
    return sc[this.mode];
  }
  getVertexSource() {
    return `
    attribute vec2 aPosition;
    varying vec2 vTexCoord;
    varying vec2 vTexCoord2;
    uniform mat3 uTransformMatrix;
    void main() {
      vTexCoord = aPosition;
      vTexCoord2 = (uTransformMatrix * vec3(aPosition, 1.0)).xy;
      gl_Position = vec4(aPosition * 2.0 - 1.0, 0.0, 1.0);
    }
    `;
  }
  applyToWebGL(t) {
    const e = t.context, s = this.createTexture(t.filterBackend, this.image);
    this.bindAdditionalTexture(e, s, e.TEXTURE1), super.applyToWebGL(t), this.unbindAdditionalTexture(e, e.TEXTURE1);
  }
  createTexture(t, e) {
    return t.getCachedTexture(e.cacheKey, e.getElement());
  }
  calculateMatrix() {
    const t = this.image, { width: e, height: s } = t.getElement();
    return [1 / t.scaleX, 0, 0, 0, 1 / t.scaleY, 0, -t.left / e, -t.top / s, 1];
  }
  applyTo2d(t) {
    let { imageData: { data: e, width: s, height: r }, filterBackend: { resources: i } } = t;
    const n = this.image;
    i.blendImage || (i.blendImage = _t());
    const o = i.blendImage, h = o.getContext("2d");
    o.width !== s || o.height !== r ? (o.width = s, o.height = r) : h.clearRect(0, 0, s, r), h.setTransform(n.scaleX, 0, 0, n.scaleY, n.left, n.top), h.drawImage(n.getElement(), 0, 0, s, r);
    const l = h.getImageData(0, 0, s, r).data;
    for (let c = 0; c < e.length; c += 4) {
      const u = e[c], g = e[c + 1], d = e[c + 2], f = e[c + 3], p = l[c], m = l[c + 1], v = l[c + 2], C = l[c + 3];
      switch (this.mode) {
        case "multiply":
          e[c] = u * p / 255, e[c + 1] = g * m / 255, e[c + 2] = d * v / 255, e[c + 3] = f * C / 255;
          break;
        case "mask":
          e[c + 3] = C;
      }
    }
  }
  sendUniformData(t, e) {
    const s = this.calculateMatrix();
    t.uniform1i(e.uImage, 1), t.uniformMatrix3fv(e.uTransformMatrix, !1, s);
  }
  toObject() {
    return y(y({}, super.toObject()), {}, { image: this.image && this.image.toObject() });
  }
  static fromObject(t, e) {
    return R(this, null, function* () {
      let { type: s, image: r } = t, i = H(t, rc);
      return tt.fromObject(r, e).then((n) => new this(y(y({}, i), {}, { image: n })));
    });
  }
}
b(ws, "type", "BlendImage"), b(ws, "defaults", { mode: "multiply", alpha: 1 }), b(ws, "uniformLocations", ["uTransformMatrix", "uImage"]), D.setClass(ws);
class Ss extends $ {
  getFragmentSource() {
    return `
    precision highp float;
    uniform sampler2D uTexture;
    uniform vec2 uDelta;
    varying vec2 vTexCoord;
    const float nSamples = 15.0;
    vec3 v3offset = vec3(12.9898, 78.233, 151.7182);
    float random(vec3 scale) {
      /* use the fragment position for a different seed per-pixel */
      return fract(sin(dot(gl_FragCoord.xyz, scale)) * 43758.5453);
    }
    void main() {
      vec4 color = vec4(0.0);
      float total = 0.0;
      float offset = random(v3offset);
      for (float t = -nSamples; t <= nSamples; t++) {
        float percent = (t + offset - 0.5) / nSamples;
        float weight = 1.0 - abs(percent);
        color += texture2D(uTexture, vTexCoord + uDelta * percent) * weight;
        total += weight;
      }
      gl_FragColor = color / total;
    }
  `;
  }
  applyTo(t) {
    wr(t) ? (this.aspectRatio = t.sourceWidth / t.sourceHeight, t.passes++, this._setupFrameBuffer(t), this.horizontal = !0, this.applyToWebGL(t), this._swapTextures(t), this._setupFrameBuffer(t), this.horizontal = !1, this.applyToWebGL(t), this._swapTextures(t)) : this.applyTo2d(t);
  }
  applyTo2d(t) {
    t.imageData = this.simpleBlur(t);
  }
  simpleBlur(t) {
    let { ctx: e, imageData: s, filterBackend: { resources: r } } = t;
    const { width: i, height: n } = s;
    r.blurLayer1 || (r.blurLayer1 = _t(), r.blurLayer2 = _t());
    const o = r.blurLayer1, h = r.blurLayer2;
    o.width === i && o.height === n || (h.width = o.width = i, h.height = o.height = n);
    const l = o.getContext("2d"), c = h.getContext("2d"), u = 15, g = 0.06 * this.blur * 0.5;
    let d, f, p, m;
    for (l.putImageData(s, 0, 0), c.clearRect(0, 0, i, n), m = -15; m <= u; m++) d = (Math.random() - 0.5) / 4, f = m / u, p = g * f * i + d, c.globalAlpha = 1 - Math.abs(f), c.drawImage(o, p, d), l.drawImage(h, 0, 0), c.globalAlpha = 1, c.clearRect(0, 0, h.width, h.height);
    for (m = -15; m <= u; m++) d = (Math.random() - 0.5) / 4, f = m / u, p = g * f * n + d, c.globalAlpha = 1 - Math.abs(f), c.drawImage(o, d, p), l.drawImage(h, 0, 0), c.globalAlpha = 1, c.clearRect(0, 0, h.width, h.height);
    e.drawImage(o, 0, 0);
    const v = e.getImageData(0, 0, o.width, o.height);
    return l.globalAlpha = 1, l.clearRect(0, 0, o.width, o.height), v;
  }
  sendUniformData(t, e) {
    const s = this.chooseRightDelta();
    t.uniform2fv(e.uDelta, s);
  }
  isNeutralState() {
    return this.blur === 0;
  }
  chooseRightDelta() {
    let t = 1;
    const e = [0, 0];
    this.horizontal ? this.aspectRatio > 1 && (t = 1 / this.aspectRatio) : this.aspectRatio < 1 && (t = this.aspectRatio);
    const s = t * this.blur * 0.12;
    return this.horizontal ? e[0] = s : e[1] = s, e;
  }
}
b(Ss, "type", "Blur"), b(Ss, "defaults", { blur: 0 }), b(Ss, "uniformLocations", ["uDelta"]), D.setClass(Ss);
class xs extends $ {
  getFragmentSource() {
    return `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uBrightness;
  varying vec2 vTexCoord;
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    color.rgb += uBrightness;
    gl_FragColor = color;
  }
`;
  }
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    const s = Math.round(255 * this.brightness);
    for (let r = 0; r < e.length; r += 4) e[r] += s, e[r + 1] += s, e[r + 2] += s;
  }
  isNeutralState() {
    return this.brightness === 0;
  }
  sendUniformData(t, e) {
    t.uniform1f(e.uBrightness, this.brightness);
  }
}
b(xs, "type", "Brightness"), b(xs, "defaults", { brightness: 0 }), b(xs, "uniformLocations", ["uBrightness"]), D.setClass(xs);
const va = { matrix: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0], colorsOnly: !0 };
class Oe extends $ {
  getFragmentSource() {
    return `
  precision highp float;
  uniform sampler2D uTexture;
  varying vec2 vTexCoord;
  uniform mat4 uColorMatrix;
  uniform vec4 uConstants;
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    color *= uColorMatrix;
    color += uConstants;
    gl_FragColor = color;
  }`;
  }
  applyTo2d(t) {
    const e = t.imageData.data, s = this.matrix, r = this.colorsOnly;
    for (let i = 0; i < e.length; i += 4) {
      const n = e[i], o = e[i + 1], h = e[i + 2];
      if (e[i] = n * s[0] + o * s[1] + h * s[2] + 255 * s[4], e[i + 1] = n * s[5] + o * s[6] + h * s[7] + 255 * s[9], e[i + 2] = n * s[10] + o * s[11] + h * s[12] + 255 * s[14], !r) {
        const l = e[i + 3];
        e[i] += l * s[3], e[i + 1] += l * s[8], e[i + 2] += l * s[13], e[i + 3] = n * s[15] + o * s[16] + h * s[17] + l * s[18] + 255 * s[19];
      }
    }
  }
  sendUniformData(t, e) {
    const s = this.matrix, r = [s[0], s[1], s[2], s[3], s[5], s[6], s[7], s[8], s[10], s[11], s[12], s[13], s[15], s[16], s[17], s[18]], i = [s[4], s[9], s[14], s[19]];
    t.uniformMatrix4fv(e.uColorMatrix, !1, r), t.uniform4fv(e.uConstants, i);
  }
  toObject() {
    return y(y({}, super.toObject()), {}, { matrix: [...this.matrix] });
  }
}
function we(a, t) {
  var e;
  const s = (b(e = class extends Oe {
    toObject() {
      return { type: this.type, colorsOnly: this.colorsOnly };
    }
  }, "type", a), b(e, "defaults", { colorsOnly: !1, matrix: t }), e);
  return D.setClass(s, a), s;
}
b(Oe, "type", "ColorMatrix"), b(Oe, "defaults", va), b(Oe, "uniformLocations", ["uColorMatrix", "uConstants"]), D.setClass(Oe);
we("Brownie", [0.5997, 0.34553, -0.27082, 0, 0.186, -0.0377, 0.86095, 0.15059, 0, -0.1449, 0.24113, -0.07441, 0.44972, 0, -0.02965, 0, 0, 0, 1, 0]);
we("Vintage", [0.62793, 0.32021, -0.03965, 0, 0.03784, 0.02578, 0.64411, 0.03259, 0, 0.02926, 0.0466, -0.08512, 0.52416, 0, 0.02023, 0, 0, 0, 1, 0]);
we("Kodachrome", [1.12855, -0.39673, -0.03992, 0, 0.24991, -0.16404, 1.08352, -0.05498, 0, 0.09698, -0.16786, -0.56034, 1.60148, 0, 0.13972, 0, 0, 0, 1, 0]);
we("Technicolor", [1.91252, -0.85453, -0.09155, 0, 0.04624, -0.30878, 1.76589, -0.10601, 0, -0.27589, -0.2311, -0.75018, 1.84759, 0, 0.12137, 0, 0, 0, 1, 0]);
we("Polaroid", [1.438, -0.062, -0.062, 0, 0, -0.122, 1.378, -0.122, 0, 0, -0.016, -0.016, 1.483, 0, 0, 0, 0, 0, 1, 0]);
we("Sepia", [0.393, 0.769, 0.189, 0, 0, 0.349, 0.686, 0.168, 0, 0, 0.272, 0.534, 0.131, 0, 0, 0, 0, 0, 1, 0]);
we("BlackWhite", [1.5, 1.5, 1.5, 0, -1, 1.5, 1.5, 1.5, 0, -1, 1.5, 1.5, 1.5, 0, -1, 0, 0, 0, 1, 0]);
class In extends $ {
  constructor() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    super(t), this.subFilters = t.subFilters || [];
  }
  applyTo(t) {
    wr(t) && (t.passes += this.subFilters.length - 1), this.subFilters.forEach((e) => {
      e.applyTo(t);
    });
  }
  toObject() {
    return { type: this.type, subFilters: this.subFilters.map((t) => t.toObject()) };
  }
  isNeutralState() {
    return !this.subFilters.some((t) => !t.isNeutralState());
  }
  static fromObject(t, e) {
    return Promise.all((t.subFilters || []).map((s) => D.getClass(s.type).fromObject(s, e))).then((s) => new this({ subFilters: s }));
  }
}
b(In, "type", "Composed"), D.setClass(In);
class Ms extends $ {
  getFragmentSource() {
    return `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uContrast;
  varying vec2 vTexCoord;
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    float contrastF = 1.015 * (uContrast + 1.0) / (1.0 * (1.015 - uContrast));
    color.rgb = contrastF * (color.rgb - 0.5) + 0.5;
    gl_FragColor = color;
  }`;
  }
  isNeutralState() {
    return this.contrast === 0;
  }
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    const s = Math.floor(255 * this.contrast), r = 259 * (s + 255) / (255 * (259 - s));
    for (let i = 0; i < e.length; i += 4) e[i] = r * (e[i] - 128) + 128, e[i + 1] = r * (e[i + 1] - 128) + 128, e[i + 2] = r * (e[i + 2] - 128) + 128;
  }
  sendUniformData(t, e) {
    t.uniform1f(e.uContrast, this.contrast);
  }
}
b(Ms, "type", "Contrast"), b(Ms, "defaults", { contrast: 0 }), b(Ms, "uniformLocations", ["uContrast"]), D.setClass(Ms);
const ic = { Convolute_3_1: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uMatrix[9];
    uniform float uStepW;
    uniform float uStepH;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = vec4(0, 0, 0, 0);
      for (float h = 0.0; h < 3.0; h+=1.0) {
        for (float w = 0.0; w < 3.0; w+=1.0) {
          vec2 matrixPos = vec2(uStepW * (w - 1), uStepH * (h - 1));
          color += texture2D(uTexture, vTexCoord + matrixPos) * uMatrix[int(h * 3.0 + w)];
        }
      }
      gl_FragColor = color;
    }
    `, Convolute_3_0: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uMatrix[9];
    uniform float uStepW;
    uniform float uStepH;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = vec4(0, 0, 0, 1);
      for (float h = 0.0; h < 3.0; h+=1.0) {
        for (float w = 0.0; w < 3.0; w+=1.0) {
          vec2 matrixPos = vec2(uStepW * (w - 1.0), uStepH * (h - 1.0));
          color.rgb += texture2D(uTexture, vTexCoord + matrixPos).rgb * uMatrix[int(h * 3.0 + w)];
        }
      }
      float alpha = texture2D(uTexture, vTexCoord).a;
      gl_FragColor = color;
      gl_FragColor.a = alpha;
    }
    `, Convolute_5_1: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uMatrix[25];
    uniform float uStepW;
    uniform float uStepH;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = vec4(0, 0, 0, 0);
      for (float h = 0.0; h < 5.0; h+=1.0) {
        for (float w = 0.0; w < 5.0; w+=1.0) {
          vec2 matrixPos = vec2(uStepW * (w - 2.0), uStepH * (h - 2.0));
          color += texture2D(uTexture, vTexCoord + matrixPos) * uMatrix[int(h * 5.0 + w)];
        }
      }
      gl_FragColor = color;
    }
    `, Convolute_5_0: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uMatrix[25];
    uniform float uStepW;
    uniform float uStepH;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = vec4(0, 0, 0, 1);
      for (float h = 0.0; h < 5.0; h+=1.0) {
        for (float w = 0.0; w < 5.0; w+=1.0) {
          vec2 matrixPos = vec2(uStepW * (w - 2.0), uStepH * (h - 2.0));
          color.rgb += texture2D(uTexture, vTexCoord + matrixPos).rgb * uMatrix[int(h * 5.0 + w)];
        }
      }
      float alpha = texture2D(uTexture, vTexCoord).a;
      gl_FragColor = color;
      gl_FragColor.a = alpha;
    }
    `, Convolute_7_1: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uMatrix[49];
    uniform float uStepW;
    uniform float uStepH;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = vec4(0, 0, 0, 0);
      for (float h = 0.0; h < 7.0; h+=1.0) {
        for (float w = 0.0; w < 7.0; w+=1.0) {
          vec2 matrixPos = vec2(uStepW * (w - 3.0), uStepH * (h - 3.0));
          color += texture2D(uTexture, vTexCoord + matrixPos) * uMatrix[int(h * 7.0 + w)];
        }
      }
      gl_FragColor = color;
    }
    `, Convolute_7_0: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uMatrix[49];
    uniform float uStepW;
    uniform float uStepH;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = vec4(0, 0, 0, 1);
      for (float h = 0.0; h < 7.0; h+=1.0) {
        for (float w = 0.0; w < 7.0; w+=1.0) {
          vec2 matrixPos = vec2(uStepW * (w - 3.0), uStepH * (h - 3.0));
          color.rgb += texture2D(uTexture, vTexCoord + matrixPos).rgb * uMatrix[int(h * 7.0 + w)];
        }
      }
      float alpha = texture2D(uTexture, vTexCoord).a;
      gl_FragColor = color;
      gl_FragColor.a = alpha;
    }
    `, Convolute_9_1: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uMatrix[81];
    uniform float uStepW;
    uniform float uStepH;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = vec4(0, 0, 0, 0);
      for (float h = 0.0; h < 9.0; h+=1.0) {
        for (float w = 0.0; w < 9.0; w+=1.0) {
          vec2 matrixPos = vec2(uStepW * (w - 4.0), uStepH * (h - 4.0));
          color += texture2D(uTexture, vTexCoord + matrixPos) * uMatrix[int(h * 9.0 + w)];
        }
      }
      gl_FragColor = color;
    }
    `, Convolute_9_0: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uMatrix[81];
    uniform float uStepW;
    uniform float uStepH;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = vec4(0, 0, 0, 1);
      for (float h = 0.0; h < 9.0; h+=1.0) {
        for (float w = 0.0; w < 9.0; w+=1.0) {
          vec2 matrixPos = vec2(uStepW * (w - 4.0), uStepH * (h - 4.0));
          color.rgb += texture2D(uTexture, vTexCoord + matrixPos).rgb * uMatrix[int(h * 9.0 + w)];
        }
      }
      float alpha = texture2D(uTexture, vTexCoord).a;
      gl_FragColor = color;
      gl_FragColor.a = alpha;
    }
    ` };
class Ts extends $ {
  getCacheKey() {
    return "".concat(this.type, "_").concat(Math.sqrt(this.matrix.length), "_").concat(this.opaque ? 1 : 0);
  }
  getFragmentSource() {
    return ic[this.getCacheKey()];
  }
  applyTo2d(t) {
    const e = t.imageData, s = e.data, r = this.matrix, i = Math.round(Math.sqrt(r.length)), n = Math.floor(i / 2), o = e.width, h = e.height, l = t.ctx.createImageData(o, h), c = l.data, u = this.opaque ? 1 : 0;
    let g, d, f, p, m, v, C, w, S, x, M, O, T;
    for (M = 0; M < h; M++) for (x = 0; x < o; x++) {
      for (m = 4 * (M * o + x), g = 0, d = 0, f = 0, p = 0, T = 0; T < i; T++) for (O = 0; O < i; O++) C = M + T - n, v = x + O - n, C < 0 || C >= h || v < 0 || v >= o || (w = 4 * (C * o + v), S = r[T * i + O], g += s[w] * S, d += s[w + 1] * S, f += s[w + 2] * S, u || (p += s[w + 3] * S));
      c[m] = g, c[m + 1] = d, c[m + 2] = f, c[m + 3] = u ? s[m + 3] : p;
    }
    t.imageData = l;
  }
  sendUniformData(t, e) {
    t.uniform1fv(e.uMatrix, this.matrix);
  }
  toObject() {
    return y(y({}, super.toObject()), {}, { opaque: this.opaque, matrix: [...this.matrix] });
  }
}
b(Ts, "type", "Convolute"), b(Ts, "defaults", { opaque: !1, matrix: [0, 0, 0, 0, 1, 0, 0, 0, 0] }), b(Ts, "uniformLocations", ["uMatrix", "uOpaque", "uHalfSize", "uSize"]), D.setClass(Ts);
const ya = "Gamma";
class Os extends $ {
  getFragmentSource() {
    return `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec3 uGamma;
  varying vec2 vTexCoord;
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    vec3 correction = (1.0 / uGamma);
    color.r = pow(color.r, correction.r);
    color.g = pow(color.g, correction.g);
    color.b = pow(color.b, correction.b);
    gl_FragColor = color;
    gl_FragColor.rgb *= color.a;
  }
`;
  }
  constructor() {
    let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    super(t), this.gamma = t.gamma || this.constructor.defaults.gamma.concat();
  }
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    const s = this.gamma, r = 1 / s[0], i = 1 / s[1], n = 1 / s[2];
    this.rgbValues || (this.rgbValues = { r: new Uint8Array(256), g: new Uint8Array(256), b: new Uint8Array(256) });
    const o = this.rgbValues;
    for (let h = 0; h < 256; h++) o.r[h] = 255 * Math.pow(h / 255, r), o.g[h] = 255 * Math.pow(h / 255, i), o.b[h] = 255 * Math.pow(h / 255, n);
    for (let h = 0; h < e.length; h += 4) e[h] = o.r[e[h]], e[h + 1] = o.g[e[h + 1]], e[h + 2] = o.b[e[h + 2]];
  }
  sendUniformData(t, e) {
    t.uniform3fv(e.uGamma, this.gamma);
  }
  isNeutralState() {
    const { gamma: t } = this;
    return t[0] === 1 && t[1] === 1 && t[2] === 1;
  }
  toObject() {
    return { type: ya, gamma: this.gamma.concat() };
  }
}
b(Os, "type", ya), b(Os, "defaults", { gamma: [1, 1, 1] }), b(Os, "uniformLocations", ["uGamma"]), D.setClass(Os);
const nc = { average: `
    precision highp float;
    uniform sampler2D uTexture;
    varying vec2 vTexCoord;
    void main() {
      vec4 color = texture2D(uTexture, vTexCoord);
      float average = (color.r + color.b + color.g) / 3.0;
      gl_FragColor = vec4(average, average, average, color.a);
    }
    `, lightness: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform int uMode;
    varying vec2 vTexCoord;
    void main() {
      vec4 col = texture2D(uTexture, vTexCoord);
      float average = (max(max(col.r, col.g),col.b) + min(min(col.r, col.g),col.b)) / 2.0;
      gl_FragColor = vec4(average, average, average, col.a);
    }
    `, luminosity: `
    precision highp float;
    uniform sampler2D uTexture;
    uniform int uMode;
    varying vec2 vTexCoord;
    void main() {
      vec4 col = texture2D(uTexture, vTexCoord);
      float average = 0.21 * col.r + 0.72 * col.g + 0.07 * col.b;
      gl_FragColor = vec4(average, average, average, col.a);
    }
    ` };
class js extends $ {
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    for (let s, r = 0; r < e.length; r += 4) {
      const i = e[r], n = e[r + 1], o = e[r + 2];
      switch (this.mode) {
        case "average":
          s = (i + n + o) / 3;
          break;
        case "lightness":
          s = (Math.min(i, n, o) + Math.max(i, n, o)) / 2;
          break;
        case "luminosity":
          s = 0.21 * i + 0.72 * n + 0.07 * o;
      }
      e[r + 2] = e[r + 1] = e[r] = s;
    }
  }
  getCacheKey() {
    return "".concat(this.type, "_").concat(this.mode);
  }
  getFragmentSource() {
    return nc[this.mode];
  }
  sendUniformData(t, e) {
    t.uniform1i(e.uMode, 1);
  }
  isNeutralState() {
    return !1;
  }
}
b(js, "type", "Grayscale"), b(js, "defaults", { mode: "average" }), b(js, "uniformLocations", ["uMode"]), D.setClass(js);
const oc = y(y({}, va), {}, { rotation: 0 });
class Br extends Oe {
  calculateMatrix() {
    const t = this.rotation * Math.PI, e = Ot(t), s = jt(t), r = 1 / 3, i = Math.sqrt(r) * s, n = 1 - e;
    this.matrix = [e + n / 3, r * n - i, r * n + i, 0, 0, r * n + i, e + r * n, r * n - i, 0, 0, r * n - i, r * n + i, e + r * n, 0, 0, 0, 0, 0, 1, 0];
  }
  isNeutralState() {
    return this.rotation === 0;
  }
  applyTo(t) {
    this.calculateMatrix(), super.applyTo(t);
  }
  toObject() {
    return { type: this.type, rotation: this.rotation };
  }
}
b(Br, "type", "HueRotation"), b(Br, "defaults", oc), D.setClass(Br);
class Ds extends $ {
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    for (let s = 0; s < e.length; s += 4) e[s] = 255 - e[s], e[s + 1] = 255 - e[s + 1], e[s + 2] = 255 - e[s + 2], this.alpha && (e[s + 3] = 255 - e[s + 3]);
  }
  getFragmentSource() {
    return `
  precision highp float;
  uniform sampler2D uTexture;
  uniform int uInvert;
  uniform int uAlpha;
  varying vec2 vTexCoord;
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    if (uInvert == 1) {
      if (uAlpha == 1) {
        gl_FragColor = vec4(1.0 - color.r,1.0 -color.g,1.0 -color.b,1.0 -color.a);
      } else {
        gl_FragColor = vec4(1.0 - color.r,1.0 -color.g,1.0 -color.b,color.a);
      }
    } else {
      gl_FragColor = color;
    }
  }
`;
  }
  isNeutralState() {
    return !this.invert;
  }
  sendUniformData(t, e) {
    t.uniform1i(e.uInvert, Number(this.invert)), t.uniform1i(e.uAlpha, Number(this.alpha));
  }
}
b(Ds, "type", "Invert"), b(Ds, "defaults", { alpha: !1, invert: !0 }), b(Ds, "uniformLocations", ["uInvert", "uAlpha"]), D.setClass(Ds);
class As extends $ {
  getFragmentSource() {
    return `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uStepH;
  uniform float uNoise;
  uniform float uSeed;
  varying vec2 vTexCoord;
  float rand(vec2 co, float seed, float vScale) {
    return fract(sin(dot(co.xy * vScale ,vec2(12.9898 , 78.233))) * 43758.5453 * (seed + 0.01) / 2.0);
  }
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    color.rgb += (0.5 - rand(vTexCoord, uSeed, 0.1 / uStepH)) * uNoise;
    gl_FragColor = color;
  }
`;
  }
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    const s = this.noise;
    for (let r = 0; r < e.length; r += 4) {
      const i = (0.5 - Math.random()) * s;
      e[r] += i, e[r + 1] += i, e[r + 2] += i;
    }
  }
  sendUniformData(t, e) {
    t.uniform1f(e.uNoise, this.noise / 255), t.uniform1f(e.uSeed, Math.random());
  }
  isNeutralState() {
    return this.noise === 0;
  }
}
b(As, "type", "Noise"), b(As, "defaults", { noise: 0 }), b(As, "uniformLocations", ["uNoise", "uSeed"]), D.setClass(As);
class Es extends $ {
  applyTo2d(t) {
    let { imageData: { data: e, width: s, height: r } } = t;
    for (let i = 0; i < r; i += this.blocksize) for (let n = 0; n < s; n += this.blocksize) {
      const o = 4 * i * s + 4 * n, h = e[o], l = e[o + 1], c = e[o + 2], u = e[o + 3];
      for (let g = i; g < Math.min(i + this.blocksize, r); g++) for (let d = n; d < Math.min(n + this.blocksize, s); d++) {
        const f = 4 * g * s + 4 * d;
        e[f] = h, e[f + 1] = l, e[f + 2] = c, e[f + 3] = u;
      }
    }
  }
  isNeutralState() {
    return this.blocksize === 1;
  }
  getFragmentSource() {
    return `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uBlocksize;
  uniform float uStepW;
  uniform float uStepH;
  varying vec2 vTexCoord;
  void main() {
    float blockW = uBlocksize * uStepW;
    float blockH = uBlocksize * uStepH;
    int posX = int(vTexCoord.x / blockW);
    int posY = int(vTexCoord.y / blockH);
    float fposX = float(posX);
    float fposY = float(posY);
    vec2 squareCoords = vec2(fposX * blockW, fposY * blockH);
    vec4 color = texture2D(uTexture, squareCoords);
    gl_FragColor = color;
  }
`;
  }
  sendUniformData(t, e) {
    t.uniform1f(e.uBlocksize, this.blocksize);
  }
}
b(Es, "type", "Pixelate"), b(Es, "defaults", { blocksize: 4 }), b(Es, "uniformLocations", ["uBlocksize"]), D.setClass(Es);
class ks extends $ {
  getFragmentSource() {
    return `
precision highp float;
uniform sampler2D uTexture;
uniform vec4 uLow;
uniform vec4 uHigh;
varying vec2 vTexCoord;
void main() {
  gl_FragColor = texture2D(uTexture, vTexCoord);
  if(all(greaterThan(gl_FragColor.rgb,uLow.rgb)) && all(greaterThan(uHigh.rgb,gl_FragColor.rgb))) {
    gl_FragColor.a = 0.0;
  }
}
`;
  }
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    const s = 255 * this.distance, r = new Y(this.color).getSource(), i = [r[0] - s, r[1] - s, r[2] - s], n = [r[0] + s, r[1] + s, r[2] + s];
    for (let o = 0; o < e.length; o += 4) {
      const h = e[o], l = e[o + 1], c = e[o + 2];
      h > i[0] && l > i[1] && c > i[2] && h < n[0] && l < n[1] && c < n[2] && (e[o + 3] = 0);
    }
  }
  sendUniformData(t, e) {
    const s = new Y(this.color).getSource(), r = this.distance, i = [0 + s[0] / 255 - r, 0 + s[1] / 255 - r, 0 + s[2] / 255 - r, 1], n = [s[0] / 255 + r, s[1] / 255 + r, s[2] / 255 + r, 1];
    t.uniform4fv(e.uLow, i), t.uniform4fv(e.uHigh, n);
  }
}
b(ks, "type", "RemoveColor"), b(ks, "defaults", { color: "#FFFFFF", distance: 0.02, useAlpha: !1 }), b(ks, "uniformLocations", ["uLow", "uHigh"]), D.setClass(ks);
class Is extends $ {
  sendUniformData(t, e) {
    t.uniform2fv(e.uDelta, this.horizontal ? [1 / this.width, 0] : [0, 1 / this.height]), t.uniform1fv(e.uTaps, this.taps);
  }
  getFilterWindow() {
    const t = this.tempScale;
    return Math.ceil(this.lanczosLobes / t);
  }
  getCacheKey() {
    const t = this.getFilterWindow();
    return "".concat(this.type, "_").concat(t);
  }
  getFragmentSource() {
    const t = this.getFilterWindow();
    return this.generateShader(t);
  }
  getTaps() {
    const t = this.lanczosCreate(this.lanczosLobes), e = this.tempScale, s = this.getFilterWindow(), r = new Array(s);
    for (let i = 1; i <= s; i++) r[i - 1] = t(i * e);
    return r;
  }
  generateShader(t) {
    const e = new Array(t);
    for (let s = 1; s <= t; s++) e[s - 1] = "".concat(s, ".0 * uDelta");
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform vec2 uDelta;
      varying vec2 vTexCoord;
      uniform float uTaps[`.concat(t, `];
      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        float sum = 1.0;
        `).concat(e.map((s, r) => `
              color += texture2D(uTexture, vTexCoord + `.concat(s, ") * uTaps[").concat(r, "] + texture2D(uTexture, vTexCoord - ").concat(s, ") * uTaps[").concat(r, `];
              sum += 2.0 * uTaps[`).concat(r, `];
            `)).join(`
`), `
        gl_FragColor = color / sum;
      }
    `);
  }
  applyToForWebgl(t) {
    t.passes++, this.width = t.sourceWidth, this.horizontal = !0, this.dW = Math.round(this.width * this.scaleX), this.dH = t.sourceHeight, this.tempScale = this.dW / this.width, this.taps = this.getTaps(), t.destinationWidth = this.dW, super.applyTo(t), t.sourceWidth = t.destinationWidth, this.height = t.sourceHeight, this.horizontal = !1, this.dH = Math.round(this.height * this.scaleY), this.tempScale = this.dH / this.height, this.taps = this.getTaps(), t.destinationHeight = this.dH, super.applyTo(t), t.sourceHeight = t.destinationHeight;
  }
  applyTo(t) {
    wr(t) ? this.applyToForWebgl(t) : this.applyTo2d(t);
  }
  isNeutralState() {
    return this.scaleX === 1 && this.scaleY === 1;
  }
  lanczosCreate(t) {
    return (e) => {
      if (e >= t || e <= -t) return 0;
      if (e < 11920929e-14 && e > -11920929e-14) return 1;
      const s = (e *= Math.PI) / t;
      return Math.sin(e) / e * Math.sin(s) / s;
    };
  }
  applyTo2d(t) {
    const e = t.imageData, s = this.scaleX, r = this.scaleY;
    this.rcpScaleX = 1 / s, this.rcpScaleY = 1 / r;
    const i = e.width, n = e.height, o = Math.round(i * s), h = Math.round(n * r);
    let l;
    l = this.resizeType === "sliceHack" ? this.sliceByTwo(t, i, n, o, h) : this.resizeType === "hermite" ? this.hermiteFastResize(t, i, n, o, h) : this.resizeType === "bilinear" ? this.bilinearFiltering(t, i, n, o, h) : this.resizeType === "lanczos" ? this.lanczosResize(t, i, n, o, h) : new ImageData(o, h), t.imageData = l;
  }
  sliceByTwo(t, e, s, r, i) {
    const n = t.imageData, o = 0.5;
    let h = !1, l = !1, c = e * o, u = s * o;
    const g = t.filterBackend.resources;
    let d = 0, f = 0;
    const p = e;
    let m = 0;
    g.sliceByTwo || (g.sliceByTwo = _t());
    const v = g.sliceByTwo;
    (v.width < 1.5 * e || v.height < s) && (v.width = 1.5 * e, v.height = s);
    const C = v.getContext("2d");
    for (C.clearRect(0, 0, 1.5 * e, s), C.putImageData(n, 0, 0), r = Math.floor(r), i = Math.floor(i); !h || !l; ) e = c, s = u, r < Math.floor(c * o) ? c = Math.floor(c * o) : (c = r, h = !0), i < Math.floor(u * o) ? u = Math.floor(u * o) : (u = i, l = !0), C.drawImage(v, d, f, e, s, p, m, c, u), d = p, f = m, m += u;
    return C.getImageData(d, f, r, i);
  }
  lanczosResize(t, e, s, r, i) {
    const n = t.imageData.data, o = t.ctx.createImageData(r, i), h = o.data, l = this.lanczosCreate(this.lanczosLobes), c = this.rcpScaleX, u = this.rcpScaleY, g = 2 / this.rcpScaleX, d = 2 / this.rcpScaleY, f = Math.ceil(c * this.lanczosLobes / 2), p = Math.ceil(u * this.lanczosLobes / 2), m = {}, v = { x: 0, y: 0 }, C = { x: 0, y: 0 };
    return function w(S) {
      let x, M, O, T, j, I, A, E, k, F, et;
      for (v.x = (S + 0.5) * c, C.x = Math.floor(v.x), x = 0; x < i; x++) {
        for (v.y = (x + 0.5) * u, C.y = Math.floor(v.y), j = 0, I = 0, A = 0, E = 0, k = 0, M = C.x - f; M <= C.x + f; M++) if (!(M < 0 || M >= e)) {
          F = Math.floor(1e3 * Math.abs(M - v.x)), m[F] || (m[F] = {});
          for (let G = C.y - p; G <= C.y + p; G++) G < 0 || G >= s || (et = Math.floor(1e3 * Math.abs(G - v.y)), m[F][et] || (m[F][et] = l(Math.sqrt(Math.pow(F * g, 2) + Math.pow(et * d, 2)) / 1e3)), O = m[F][et], O > 0 && (T = 4 * (G * e + M), j += O, I += O * n[T], A += O * n[T + 1], E += O * n[T + 2], k += O * n[T + 3]));
        }
        T = 4 * (x * r + S), h[T] = I / j, h[T + 1] = A / j, h[T + 2] = E / j, h[T + 3] = k / j;
      }
      return ++S < r ? w(S) : o;
    }(0);
  }
  bilinearFiltering(t, e, s, r, i) {
    let n, o, h, l, c, u, g, d, f, p, m, v, C, w = 0;
    const S = this.rcpScaleX, x = this.rcpScaleY, M = 4 * (e - 1), O = t.imageData.data, T = t.ctx.createImageData(r, i), j = T.data;
    for (g = 0; g < i; g++) for (d = 0; d < r; d++) for (c = Math.floor(S * d), u = Math.floor(x * g), f = S * d - c, p = x * g - u, C = 4 * (u * e + c), m = 0; m < 4; m++) n = O[C + m], o = O[C + 4 + m], h = O[C + M + m], l = O[C + M + 4 + m], v = n * (1 - f) * (1 - p) + o * f * (1 - p) + h * p * (1 - f) + l * f * p, j[w++] = v;
    return T;
  }
  hermiteFastResize(t, e, s, r, i) {
    const n = this.rcpScaleX, o = this.rcpScaleY, h = Math.ceil(n / 2), l = Math.ceil(o / 2), c = t.imageData.data, u = t.ctx.createImageData(r, i), g = u.data;
    for (let d = 0; d < i; d++) for (let f = 0; f < r; f++) {
      const p = 4 * (f + d * r);
      let m = 0, v = 0, C = 0, w = 0, S = 0, x = 0, M = 0;
      const O = (d + 0.5) * o;
      for (let T = Math.floor(d * o); T < (d + 1) * o; T++) {
        const j = Math.abs(O - (T + 0.5)) / l, I = (f + 0.5) * n, A = j * j;
        for (let E = Math.floor(f * n); E < (f + 1) * n; E++) {
          let k = Math.abs(I - (E + 0.5)) / h;
          const F = Math.sqrt(A + k * k);
          F > 1 && F < -1 || (m = 2 * F * F * F - 3 * F * F + 1, m > 0 && (k = 4 * (E + T * e), M += m * c[k + 3], C += m, c[k + 3] < 255 && (m = m * c[k + 3] / 250), w += m * c[k], S += m * c[k + 1], x += m * c[k + 2], v += m));
        }
      }
      g[p] = w / v, g[p + 1] = S / v, g[p + 2] = x / v, g[p + 3] = M / C;
    }
    return u;
  }
}
b(Is, "type", "Resize"), b(Is, "defaults", { resizeType: "hermite", scaleX: 1, scaleY: 1, lanczosLobes: 3 }), b(Is, "uniformLocations", ["uDelta", "uTaps"]), D.setClass(Is);
class Ls extends $ {
  getFragmentSource() {
    return `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uSaturation;
  varying vec2 vTexCoord;
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    float rgMax = max(color.r, color.g);
    float rgbMax = max(rgMax, color.b);
    color.r += rgbMax != color.r ? (rgbMax - color.r) * uSaturation : 0.00;
    color.g += rgbMax != color.g ? (rgbMax - color.g) * uSaturation : 0.00;
    color.b += rgbMax != color.b ? (rgbMax - color.b) * uSaturation : 0.00;
    gl_FragColor = color;
  }
`;
  }
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    const s = -this.saturation;
    for (let r = 0; r < e.length; r += 4) {
      const i = e[r], n = e[r + 1], o = e[r + 2], h = Math.max(i, n, o);
      e[r] += h !== i ? (h - i) * s : 0, e[r + 1] += h !== n ? (h - n) * s : 0, e[r + 2] += h !== o ? (h - o) * s : 0;
    }
  }
  sendUniformData(t, e) {
    t.uniform1f(e.uSaturation, -this.saturation);
  }
  isNeutralState() {
    return this.saturation === 0;
  }
}
b(Ls, "type", "Saturation"), b(Ls, "defaults", { saturation: 0 }), b(Ls, "uniformLocations", ["uSaturation"]), D.setClass(Ls);
class Ps extends $ {
  getFragmentSource() {
    return `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uVibrance;
  varying vec2 vTexCoord;
  void main() {
    vec4 color = texture2D(uTexture, vTexCoord);
    float max = max(color.r, max(color.g, color.b));
    float avg = (color.r + color.g + color.b) / 3.0;
    float amt = (abs(max - avg) * 2.0) * uVibrance;
    color.r += max != color.r ? (max - color.r) * amt : 0.00;
    color.g += max != color.g ? (max - color.g) * amt : 0.00;
    color.b += max != color.b ? (max - color.b) * amt : 0.00;
    gl_FragColor = color;
  }
`;
  }
  applyTo2d(t) {
    let { imageData: { data: e } } = t;
    const s = -this.vibrance;
    for (let r = 0; r < e.length; r += 4) {
      const i = e[r], n = e[r + 1], o = e[r + 2], h = Math.max(i, n, o), l = (i + n + o) / 3, c = 2 * Math.abs(h - l) / 255 * s;
      e[r] += h !== i ? (h - i) * c : 0, e[r + 1] += h !== n ? (h - n) * c : 0, e[r + 2] += h !== o ? (h - o) * c : 0;
    }
  }
  sendUniformData(t, e) {
    t.uniform1f(e.uVibrance, -this.vibrance);
  }
  isNeutralState() {
    return this.vibrance === 0;
  }
}
b(Ps, "type", "Vibrance"), b(Ps, "defaults", { vibrance: 0 }), b(Ps, "uniformLocations", ["uVibrance"]), D.setClass(Ps);
var ac = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict", Ut = function() {
  for (var t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 21, e = "", s = crypto.getRandomValues(new Uint8Array(t |= 0)); t--; )
    e += ac[s[t] & 63];
  return e;
};
class Je {
  /**
   * Конструктор принимает редактор и опции.
   * @param params
   * @param params.editor – редактор, содержащий canvas
   * @param params.options — настройки редактора (см. defaults.js)
   * @param params.options.canvasDragging — включить перетаскивание канваса
   * @param params.options.mouseWheelZooming — включить зум колесом мыши
   * @param params.options.bringToFrontOnSelection — поднимать объект на передний план при выборе
   * @param params.options.copyObjectsByHotkey — копировать объекты по Ctrl+C
   * @param params.options.pasteImageFromClipboard — вставлять изображения и объекты из буфера обмена
   * @param params.options.undoRedoByHotKeys — отмена/повтор по Ctrl+Z/Ctrl+Y
   * @param params.options.selectAllByHotkey — выделение всех объектов по Ctrl+A
   * @param params.options.deleteObjectsByHotkey — удаление объектов по Delete
   * @param params.options.resetObjectFitByDoubleClick — сброс фита объекта по двойному клику
   * @param params.options.adaptCanvasToContainerOnResize — адаптировать канвас к размерам контейнера при изменении размеров окна
   */
  constructor({ editor: t, options: e = {} }) {
    this.isDragging = !1, this.lastMouseX = 0, this.lastMouseY = 0, this.isUndoRedoKeyPressed = !1, this.isSpacePressed = !1, this.canvasDragging = !1, this.mouseWheelZooming = !1, this.bringToFrontOnSelection = !1, this.resetObjectFitByDoubleClick = !1, this.copyObjectsByHotkey = !1, this.pasteImageFromClipboard = !1, this.undoRedoByHotKeys = !1, this.selectAllByHotkey = !1, this.deleteObjectsByHotkey = !1, this.adaptCanvasToContainerOnResize = !1, this.editor = t, this.canvas = t.canvas, this.options = e, this.handleContainerResizeBound = Je.debounce(this.handleContainerResize.bind(this), 500), this.handleCopyEventBound = this.handleCopyEvent.bind(this), this.handlePasteEventBound = this.handlePasteEvent.bind(this), this.handleUndoRedoEventBound = this.handleUndoRedoEvent.bind(this), this.handleUndoRedoKeyUpBound = this.handleUndoRedoKeyUp.bind(this), this.handleSelectAllEventBound = this.handleSelectAllEvent.bind(this), this.handleDeleteObjectsEventBound = this.handleDeleteObjectsEvent.bind(this), this.handleSpaceKeyDownBound = this.handleSpaceKeyDown.bind(this), this.handleSpaceKeyUpBound = this.handleSpaceKeyUp.bind(this), this.handleObjectModifiedHistoryBound = Je.debounce(this.handleObjectModifiedHistory.bind(this), 300), this.handleObjectRotatingHistoryBound = Je.debounce(this.handleObjectRotatingHistory.bind(this), 300), this.handleObjectAddedHistoryBound = this.handleObjectAddedHistory.bind(this), this.handleObjectRemovedHistoryBound = this.handleObjectRemovedHistory.bind(this), this.handleOverlayUpdateBound = this.handleOverlayUpdate.bind(this), this.handleCanvasDragStartBound = this.handleCanvasDragStart.bind(this), this.handleCanvasDraggingBound = this.handleCanvasDragging.bind(this), this.handleCanvasDragEndBound = this.handleCanvasDragEnd.bind(this), this.handleMouseWheelZoomBound = this.handleMouseWheelZoom.bind(this), this.handleBringToFrontBound = this.handleBringToFront.bind(this), this.handleResetObjectFitBound = this.handleResetObjectFit.bind(this), this.handleLockedSelectionBound = this._filterLockedSelection.bind(this), this.init();
  }
  /**
   * Инициализация всех обработчиков согласно опциям.
   */
  init() {
    const {
      adaptCanvasToContainerOnResize: t,
      canvasDragging: e,
      mouseWheelZooming: s,
      bringToFrontOnSelection: r,
      copyObjectsByHotkey: i,
      pasteImageFromClipboard: n,
      undoRedoByHotKeys: o,
      selectAllByHotkey: h,
      deleteObjectsByHotkey: l,
      resetObjectFitByDoubleClick: c
    } = this.options;
    e && (this.canvas.on("mouse:down", this.handleCanvasDragStartBound), this.canvas.on("mouse:move", this.handleCanvasDraggingBound), this.canvas.on("mouse:up", this.handleCanvasDragEndBound), document.addEventListener("keydown", this.handleSpaceKeyDownBound, { capture: !0 }), document.addEventListener("keyup", this.handleSpaceKeyUpBound, { capture: !0 })), s && this.canvas.on("mouse:wheel", this.handleMouseWheelZoomBound), r && (this.canvas.on("selection:created", this.handleBringToFrontBound), this.canvas.on("selection:updated", this.handleBringToFrontBound)), c && this.canvas.on("mouse:dblclick", this.handleResetObjectFitBound), t && window.addEventListener("resize", this.handleContainerResizeBound, { capture: !0 }), i && document.addEventListener("keydown", this.handleCopyEventBound, { capture: !0 }), n && document.addEventListener("paste", this.handlePasteEventBound, { capture: !0 }), o && (document.addEventListener("keydown", this.handleUndoRedoEventBound, { capture: !0 }), document.addEventListener("keyup", this.handleUndoRedoKeyUpBound, { capture: !0 })), h && document.addEventListener("keydown", this.handleSelectAllEventBound, { capture: !0 }), l && document.addEventListener("keydown", this.handleDeleteObjectsEventBound, { capture: !0 }), this.canvas.on("object:modified", this.handleObjectModifiedHistoryBound), this.canvas.on("object:rotating", this.handleObjectRotatingHistoryBound), this.canvas.on("object:added", this.handleObjectAddedHistoryBound), this.canvas.on("object:removed", this.handleObjectRemovedHistoryBound), this.canvas.on("object:added", this.handleOverlayUpdateBound), this.canvas.on("selection:created", this.handleOverlayUpdateBound), this.canvas.on("selection:created", this.handleLockedSelectionBound), this.canvas.on("selection:updated", this.handleLockedSelectionBound);
  }
  /**
   * При массовом выделении объектов удаляем из него залоченные.
   * @param params - параметры события
   * @param params.selected - массив выделенных объектов
   * @param params.e - событие указателя (опционально)
   */
  _filterLockedSelection({ selected: t, e }) {
    if (!(t != null && t.length) || !(e instanceof MouseEvent) || t.length === 1 || !t.some((n) => n.locked)) return;
    const r = t.filter((n) => !n.locked);
    if (r.length === 0) {
      this.canvas.discardActiveObject();
      return;
    }
    if (r.length === 1) {
      this.canvas.setActiveObject(r[0]);
      return;
    }
    const i = new q(r, {
      canvas: this.canvas
    });
    this.canvas.setActiveObject(i), this.canvas.requestRenderAll();
  }
  /**
   * Обработчики для сохранения состояния редактора в истории.
   * Срабатывают при изменении объектов (перемещение, изменение размера и т.д.).
   */
  handleObjectModifiedHistory() {
    this.editor.historyManager.skipHistory || this.editor.historyManager.saveState();
  }
  handleObjectRotatingHistory() {
    this.editor.historyManager.skipHistory || this.editor.historyManager.saveState();
  }
  handleObjectAddedHistory() {
    this.editor.historyManager.skipHistory || this.editor.historyManager.saveState();
  }
  handleObjectRemovedHistory() {
    this.editor.historyManager.skipHistory || this.editor.historyManager.saveState();
  }
  /**
   * Обновление overlayMask при добавлении объектов или выделении.
   */
  handleOverlayUpdate() {
    const { interactionBlocker: t } = this.editor;
    !t.isBlocked || !t.overlayMask || this.editor.interactionBlocker.refresh();
  }
  // --- Глобальные DOM-обработчики ---
  /**
   * Обработчик изменения размеров окна браузера.
   * Адаптирует канвас к размерам контейнера.
   */
  handleContainerResize() {
    this.editor.canvasManager.updateCanvasAndFitObjects();
  }
  /**
   * Обработчик для Ctrl+C (копирование).
   * @param event — объект события
   * @param event.ctrlKey — зажата ли клавиша Ctrl
   * @param event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param event.code — код клавиши
   */
  handleCopyEvent(t) {
    const { ctrlKey: e, metaKey: s, code: r } = t;
    !e && !s || r !== "KeyC" || (t.preventDefault(), this.editor.clipboardManager.copy());
  }
  /**
   * Обработчик вставки объекта или изображения из буфера обмена.
   * @param event — объект события
   */
  handlePasteEvent(t) {
    this.editor.clipboardManager.handlePasteEvent(t);
  }
  /**
   * Обработчик для отмены/повтора (Ctrl+Z/Ctrl+Y).
   * @param event — объект события
   * @param event.ctrlKey — зажата ли клавиша Ctrl
   * @param event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param event.code — код клавиши
   */
  handleUndoRedoEvent(t) {
    return R(this, null, function* () {
      const { ctrlKey: e, metaKey: s, code: r, repeat: i } = t;
      !e && !s || i || !/Mac/i.test(navigator.userAgent) && this.isUndoRedoKeyPressed || (r === "KeyZ" ? (t.preventDefault(), this.isUndoRedoKeyPressed = !0, yield this.editor.historyManager.undo()) : r === "KeyY" && (t.preventDefault(), this.isUndoRedoKeyPressed = !0, yield this.editor.historyManager.redo()));
    });
  }
  /**
   * Обработчик для отпускания клавиш Ctrl+Z/Ctrl+Y.
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleUndoRedoKeyUp({ code: t }) {
    ["KeyZ", "KeyY"].includes(t) && (this.isUndoRedoKeyPressed = !1);
  }
  /**
   * Обработчик для выделения всех объектов (Ctrl+A).
   * @param event — объект события
   * @param event.ctrlKey — зажата ли клавиша Ctrl
   * @param event.metaKey — зажата ли клавиша Cmd (для Mac)
   * @param event.code — код клавиши
   */
  handleSelectAllEvent(t) {
    const { ctrlKey: e, metaKey: s, code: r } = t;
    !e && !s || r !== "KeyA" || (t.preventDefault(), this.editor.selectionManager.selectAll());
  }
  /**
   * Обработчик для удаления объектов (Delete).
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleDeleteObjectsEvent(t) {
    t.code === "Delete" && (t.preventDefault(), this.editor.deletionManager.deleteSelectedObjects());
  }
  /**
   * Обработчик для нажатия пробела.
   * Отключает выделение объектов и делает курсор "grab" для перетаскивания канваса.
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleSpaceKeyDown(t) {
    if (t.code !== "Space") return;
    const { canvas: e, editor: s, isSpacePressed: r, isDragging: i } = this;
    r || i || (this.isSpacePressed = !0, t.preventDefault(), e.set({
      selection: !1,
      defaultCursor: "grab"
    }), e.setCursor("grab"), s.canvasManager.getObjects().forEach((n) => {
      n.set({
        selectable: !1,
        evented: !1
      });
    }));
  }
  /**
   * Обработчик для отпускания пробела.
   * Завершает перетаскивание канваса, если оно активно.
   * Включает выделение объектов и возвращает курсор в состояние "default".
   * @param event — объект события
   * @param event.code — код клавиши
   */
  handleSpaceKeyUp(t) {
    t.code === "Space" && (this.isSpacePressed = !1, this.isDragging && this.handleCanvasDragEnd(), this.canvas.set({
      defaultCursor: "default",
      selection: !0
    }), this.canvas.setCursor("default"), this.editor.canvasManager.getObjects().forEach((e) => {
      e.set({
        selectable: !0,
        evented: !0
      });
    }));
  }
  // --- Обработчики для событий canvas (Fabric) ---
  /**
   * Начало перетаскивания канваса (срабатывает при mouse:down и зажатом пробеле).
   * @param options - событие указателя
   * @param options.e — объект события (MouseEvent или TouchEvent)
   */
  handleCanvasDragStart({ e: t }) {
    !this.isSpacePressed || !(t instanceof MouseEvent) || (this.isDragging = !0, this.lastMouseX = t.clientX, this.lastMouseY = t.clientY, this.canvas.setCursor("grabbing"));
  }
  /**
   * Перетаскивание канваса (mouse:move).
   * @param options
   * @param options.e — объект события
   *
   * TODO: Надо как-то ограничить область перетаскивания, чтобы канвас не уходил сильно далеко за пределы экрана
   */
  handleCanvasDragging({ e: t }) {
    if (!this.isDragging || !this.isSpacePressed || !(t instanceof MouseEvent)) return;
    const e = this.canvas.viewportTransform;
    e[4] += t.clientX - this.lastMouseX, e[5] += t.clientY - this.lastMouseY, this.canvas.requestRenderAll(), this.lastMouseX = t.clientX, this.lastMouseY = t.clientY;
  }
  /**
   * Завершение перетаскивания канваса (mouse:up).
   * Сохраняет новое положение канваса.
   */
  handleCanvasDragEnd() {
    this.isDragging && (this.canvas.setViewportTransform(this.canvas.viewportTransform), this.isDragging = !1, this.isSpacePressed && (this.canvas.set("defaultCursor", "grab"), this.canvas.setCursor("grab")));
  }
  /**
   * Обработчик зума колесиком мыши. Работает при зажатом Ctrl или Cmd.
   * @param options
   * @param options.e - объект события
   */
  handleMouseWheelZoom({ e: t }) {
    if (!t.ctrlKey && !t.metaKey) return;
    const s = -t.deltaY * 1e-3;
    this.editor.transformManager.zoom(s), t.preventDefault(), t.stopPropagation();
  }
  /**
   * Обработчик, поднимающий выделенные объекты на передний план.
   * @param event - объект события выделения
   * @param event.selected - массив выбранных объектов
   */
  handleBringToFront({ selected: t }) {
    t != null && t.length && t.forEach((e) => {
      this.editor.layerManager.bringToFront(e);
    });
  }
  /**
   * Обработчик сброса объекта по двойному клику.
   * @param options - объект события fabric
   */
  handleResetObjectFit(t) {
    const e = t == null ? void 0 : t.target;
    e && this.editor.transformManager.resetObject(e);
  }
  /**
   * Метод для удаления всех слушателей
   */
  destroy() {
    window.removeEventListener("resize", this.handleContainerResizeBound, { capture: !0 }), document.removeEventListener("keydown", this.handleCopyEventBound, { capture: !0 }), document.removeEventListener("paste", this.handlePasteEventBound, { capture: !0 }), document.removeEventListener("keydown", this.handleUndoRedoEventBound, { capture: !0 }), document.removeEventListener("keyup", this.handleUndoRedoKeyUpBound, { capture: !0 }), document.removeEventListener("keydown", this.handleSelectAllEventBound, { capture: !0 }), document.removeEventListener("keydown", this.handleDeleteObjectsEventBound, { capture: !0 }), this.options.canvasDragging && (this.canvas.off("mouse:down", this.handleCanvasDragStartBound), this.canvas.off("mouse:move", this.handleCanvasDraggingBound), this.canvas.off("mouse:up", this.handleCanvasDragEndBound), document.removeEventListener("keydown", this.handleSpaceKeyDownBound, { capture: !0 }), document.removeEventListener("keyup", this.handleSpaceKeyUpBound, { capture: !0 })), this.options.mouseWheelZooming && this.canvas.off("mouse:wheel", this.handleMouseWheelZoomBound), this.options.bringToFrontOnSelection && (this.canvas.off("selection:created", this.handleBringToFrontBound), this.canvas.off("selection:updated", this.handleBringToFrontBound)), this.options.resetObjectFitByDoubleClick && this.canvas.off("mouse:dblclick", this.handleResetObjectFitBound), this.canvas.off("object:modified", this.handleObjectModifiedHistoryBound), this.canvas.off("object:rotating", this.handleObjectRotatingHistoryBound), this.canvas.off("object:added", this.handleObjectAddedHistoryBound), this.canvas.off("object:removed", this.handleObjectRemovedHistoryBound), this.canvas.off("object:added", this.handleOverlayUpdateBound), this.canvas.off("selection:created", this.handleOverlayUpdateBound), this.canvas.off("selection:created", this.handleLockedSelectionBound), this.canvas.off("selection:updated", this.handleLockedSelectionBound);
  }
  /**
   * Дебаунс для снижения частоты вызова функции.
   * @param fn — функция-обработчик
   * @param delay — задержка в миллисекундах
   * @returns новую обёртку-обработчик
   */
  static debounce(t, e) {
    let s = null;
    return function(...r) {
      s !== null && clearTimeout(s), s = setTimeout(() => {
        t.apply(this, r);
      }, e);
    };
  }
}
class hc {
  /**
   * Класс для динамической загрузки внешних модулей.
   */
  constructor() {
    this.cache = /* @__PURE__ */ new Map(), this.loaders = {
      jspdf: () => import("./jspdf.es.min-5bdvrvjk.js").then((t) => t.j)
    };
  }
  /**
   * Загружает модуль по имени и сохраняет промис в кеше.
   * @param name — строковый литерал, например 'jspdf'.
   * @returns Промис, который разрешается в загруженный модуль.
   */
  loadModule(t) {
    return this.loaders[t] ? (this.cache.has(t) || this.cache.set(t, this.loaders[t]()), this.cache.get(t)) : Promise.reject(new Error(`Unknown module "${t}"`));
  }
}
function lc(a) {
  return new Worker(
    "" + new URL("assets/worker-Cmho-Hr0.js", import.meta.url).href,
    {
      name: a == null ? void 0 : a.name
    }
  );
}
class cc {
  /**
   * @param scriptUrl — URL скрипта воркера.
   * По-умолчанию использует DefaultWorker из соседнего файла
   */
  constructor(t) {
    t ? this.worker = new Worker(t, { type: "module" }) : this.worker = new lc(), this._callbacks = /* @__PURE__ */ new Map(), this.worker.onmessage = this._handleMessage.bind(this);
  }
  /**
   * Обработчик сообщений от воркера
   * @param data
   * @param data.action - название действия
   * @param data.requestId - уникальный идентификатор запроса
   * @param data.success - успешность выполнения действия
   * @param data.data - данные, которые вернул воркер
   * @param data.error - ошибка, если она произошла
   * @returns
   */
  _handleMessage({ data: t }) {
    const { requestId: e, success: s, data: r, error: i } = t, n = this._callbacks.get(e);
    if (!n) {
      console.warn(`No callback found for requestId: ${e}`);
      return;
    }
    s ? n.resolve(r) : n.reject(new Error(i)), this._callbacks.delete(e);
  }
  /**
   * Универсальный метод отправки команды в воркер
   * @param action - название действия, которое нужно выполнить в воркере
   * @param payload - данные, которые нужно отправить в воркер
   * @param transferables - массив объектов, которые нужно передать в воркер
   * @returns Promise, который будет выполнен, когда воркер вернет ответ
   */
  post(t, e, s = []) {
    const r = `${t}:${Ut(8)}`;
    return new Promise((i, n) => {
      this._callbacks.set(r, { resolve: i, reject: n }), this.worker.postMessage({ action: t, payload: e, requestId: r }, s);
    });
  }
  /**
   * Завершает работу воркера
   */
  terminate() {
    this.worker.terminate();
  }
}
const Rt = 12, uc = 2, hi = 8, li = 20, gc = 100, ci = 20, ui = 8, dc = 100, gi = 32, Ri = 1, fc = "#2B2D33", Bi = "#3D8BF4", Yi = "#FFFFFF";
function Fs(a, t, e, s, r) {
  const i = Rt, n = uc;
  a.save(), a.translate(t, e), a.rotate(hs.degreesToRadians(r.angle)), a.fillStyle = Yi, a.strokeStyle = Bi, a.lineWidth = Ri, a.beginPath(), a.roundRect(-12 / 2, -12 / 2, i, i, n), a.fill(), a.stroke(), a.restore();
}
function Ln(a, t, e, s, r) {
  const i = hi, n = li, o = gc;
  a.save(), a.translate(t, e), a.rotate(hs.degreesToRadians(r.angle)), a.fillStyle = Yi, a.strokeStyle = Bi, a.lineWidth = Ri, a.beginPath(), a.roundRect(-8 / 2, -20 / 2, i, n, o), a.fill(), a.stroke(), a.restore();
}
function Pn(a, t, e, s, r) {
  const i = ci, n = ui, o = dc;
  a.save(), a.translate(t, e), a.rotate(hs.degreesToRadians(r.angle)), a.fillStyle = Yi, a.strokeStyle = Bi, a.lineWidth = Ri, a.beginPath(), a.roundRect(-20 / 2, -8 / 2, i, n, o), a.fill(), a.stroke(), a.restore();
}
const pc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTE4Ljc1IDQuMzc1djMuNzVhLjYyNS42MjUgMCAwIDEtLjYyNS42MjVoLTMuNzVhLjYyNS42MjUgMCAwIDEgMC0xLjI1aDIuMTRsLTIuMDc3LTEuOTAzLS4wMi0uMDE5YTYuMjUgNi4yNSAwIDEgMC0uMTMgOC45NjcuNjI2LjYyNiAwIDAgMSAuODYuOTA5QTcuNDU2IDcuNDU2IDAgMCAxIDEwIDE3LjVoLS4xMDNhNy41IDcuNSAwIDEgMSA1LjM5Ni0xMi44MTJMMTcuNSA2LjcwM1Y0LjM3NWEuNjI1LjYyNSAwIDAgMSAxLjI1IDBaIi8+PC9zdmc+", ba = new Image();
ba.src = pc;
function mc(a, t, e, s, r) {
  const n = gi / 2;
  a.save(), a.translate(t, e), a.rotate(hs.degreesToRadians(r.angle)), a.fillStyle = fc, a.beginPath(), a.arc(0, 0, n, 0, 2 * Math.PI), a.fill(), a.drawImage(ba, -16 / 2, -16 / 2, n, n), a.restore();
}
const vc = {
  // Угловые точки
  tl: {
    render: Fs,
    sizeX: Rt,
    sizeY: Rt,
    offsetX: 0,
    offsetY: 0
  },
  tr: {
    render: Fs,
    sizeX: Rt,
    sizeY: Rt,
    offsetX: 0,
    offsetY: 0
  },
  bl: {
    render: Fs,
    sizeX: Rt,
    sizeY: Rt,
    offsetX: 0,
    offsetY: 0
  },
  br: {
    render: Fs,
    sizeX: Rt,
    sizeY: Rt,
    offsetX: 0,
    offsetY: 0
  },
  // Середина вертикалей
  ml: {
    render: Ln,
    sizeX: hi,
    sizeY: li,
    offsetX: 0,
    offsetY: 0
  },
  mr: {
    render: Ln,
    sizeX: hi,
    sizeY: li,
    offsetX: 0,
    offsetY: 0
  },
  // Середина горизонталей
  mt: {
    render: Pn,
    sizeX: ci,
    sizeY: ui,
    offsetX: 0,
    offsetY: 0
  },
  mb: {
    render: Pn,
    sizeX: ci,
    sizeY: ui,
    offsetX: 0,
    offsetY: 0
  },
  // Специальный «rotate» контрол
  mtr: {
    render: mc,
    sizeX: gi,
    sizeY: gi,
    offsetX: 0,
    offsetY: -32
  }
};
class yc {
  static apply() {
    const t = ql.createObjectDefaultControls();
    Object.entries(vc).forEach(([e, s]) => {
      Object.assign(t[e], {
        render: s.render,
        sizeX: s.sizeX,
        sizeY: s.sizeY,
        offsetX: s.offsetX,
        offsetY: s.offsetY
      }), e === "mtr" && (t[e].cursorStyle = "grab", t[e].mouseDownHandler = (i, n, o, h) => {
        var c;
        (c = n.target.canvas) == null || c.setCursor("grabbing");
      });
    }), Le.ownDefaults.controls = t;
  }
}
const bc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNNi44NzUgMi41YS42MjUuNjI1IDAgMCAwLS42MjUuNjI0VjYuMjVIMy4xMjVhLjYyNS42MjUgMCAwIDAtLjYyNS42MjV2MTBjMCAuMzQ1LjI4LjYyNS42MjUuNjI1aDEwYy4zNDUgMCAuNjI1LS4yOC42MjUtLjYyNXYtMy4xMjZoMy4xMjVjLjM0NSAwIC42MjUtLjI4LjYyNS0uNjI1di0xMGEuNjI1LjYyNSAwIDAgMC0uNjI1LS42MjVoLTEwWm02Ljg3NSAxMGgyLjVWMy43NUg3LjV2Mi41aDUuNjI1Yy4zNDUgMCAuNjI1LjI4LjYyNS42MjV2NS42MjRabS0xMCAzLjc1VjcuNWg4Ljc1djguNzVIMy43NVoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==", _c = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMi41IDcuNWMwLS42OS41Ni0xLjI1IDEuMjUtMS4yNWgxMi41Yy42OSAwIDEuMjUuNTYgMS4yNSAxLjI1djguNzVjMCAuNjktLjU2IDEuMjUtMS4yNSAxLjI1SDMuNzVjLS42OSAwLTEuMjUtLjU2LTEuMjUtMS4yNVY3LjVabTEzLjc1IDBIMy43NXY4Ljc1aDEyLjVWNy41WiIgY2xpcC1ydWxlPSJldmVub2RkIi8+PHBhdGggZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTAgMS44NzVhMi4xODggMi4xODggMCAwIDAtMi4xODggMi4xODh2Mi44MTJhLjYyNS42MjUgMCAxIDEtMS4yNSAwVjQuMDYyYTMuNDM3IDMuNDM3IDAgMSAxIDYuODc1IDB2Mi44MTNhLjYyNS42MjUgMCAxIDEtMS4yNSAwVjQuMDYyQTIuMTg4IDIuMTg4IDAgMCAwIDEwIDEuODc2WiIgY2xpcC1ydWxlPSJldmVub2RkIi8+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEwIDEyLjgxM2EuOTM3LjkzNyAwIDEgMCAwLTEuODc1LjkzNy45MzcgMCAwIDAgMCAxLjg3NFoiLz48L3N2Zz4=", Cc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTE2LjI1IDYuMjVINy41VjQuMzc1YTIuNSAyLjUgMCAwIDEgMi41LTIuNWMxLjIgMCAyLjI4MS44NiAyLjUxMiAyYS42MjUuNjI1IDAgMCAwIDEuMjI2LS4yNWMtLjM1NC0xLjczOC0xLjkyNS0zLTMuNzM4LTNhMy43NTQgMy43NTQgMCAwIDAtMy43NSAzLjc1VjYuMjVoLTIuNUExLjI1IDEuMjUgMCAwIDAgMi41IDcuNXY4Ljc1YTEuMjUgMS4yNSAwIDAgMCAxLjI1IDEuMjVoMTIuNWExLjI1IDEuMjUgMCAwIDAgMS4yNS0xLjI1VjcuNWExLjI1IDEuMjUgMCAwIDAtMS4yNS0xLjI1Wm0wIDEwSDMuNzVWNy41aDEyLjV2OC43NVptLTUuMzEzLTQuMzc1YS45MzcuOTM3IDAgMSAxLTEuODc0IDAgLjkzNy45MzcgMCAwIDEgMS44NzQgMFoiLz48L3N2Zz4K", wc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTIuNSA4LjEyNSAxMCAxMi41bDcuNS00LjM3NUwxMCAzLjc1IDIuNSA4LjEyNVoiLz48cGF0aCBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik05LjY4NSAzLjIxYS42MjUuNjI1IDAgMCAxIC42MyAwbDcuNSA0LjM3NWEuNjI1LjYyNSAwIDAgMSAwIDEuMDhsLTcuNSA0LjM3NWEuNjI1LjYyNSAwIDAgMS0uNjMgMGwtNy41LTQuMzc1YS42MjUuNjI1IDAgMCAxIDAtMS4wOGw3LjUtNC4zNzVaTTMuNzQgOC4xMjUgMTAgMTEuNzc2bDYuMjYtMy42NTFMMTAgNC40NzQgMy43NCA4LjEyNVoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjxwYXRoIGZpbGw9IiNmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTUuNCA5LjQ2YS42MjUuNjI1IDAgMCAxIC42MyAwTDEwIDExLjc3NmwzLjk3LTIuMzE2YS42MjUuNjI1IDAgMCAxIC42MyAwbDMuMjE1IDEuODc1YS42MjUuNjI1IDAgMCAxIDAgMS4wOGwtNy41IDQuMzc1YS42MjUuNjI1IDAgMCAxLS42MyAwbC03LjUtNC4zNzVhLjYyNS42MjUgMCAwIDEgMC0xLjA4TDUuNCA5LjQ2Wm0tMS42NiAyLjQxNUwxMCAxNS41MjZsNi4yNi0zLjY1MS0xLjk3NC0xLjE1MS0zLjk3MSAyLjMxNmEuNjI1LjYyNSAwIDAgMS0uNjMgMGwtMy45Ny0yLjMxNi0xLjk3NSAxLjE1MVoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==", Sc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNOS42ODUgMy4yMWEuNjI1LjYyNSAwIDAgMSAuNjMgMGw3LjUgNC4zNzVhLjYyNS42MjUgMCAwIDEgMCAxLjA4bC03LjUgNC4zNzVhLjYyNS42MjUgMCAwIDEtLjYzIDBsLTcuNS00LjM3NWEuNjI1LjYyNSAwIDAgMSAwLTEuMDhsNy41LTQuMzc1Wk0zLjc0IDguMTI1IDEwIDExLjc3Nmw2LjI2LTMuNjUxTDEwIDQuNDc0IDMuNzQgOC4xMjVaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz48cGF0aCBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik01LjcxNCAxMCAxMCAxMi41bDQuMjg2LTIuNSAzLjIxNCAxLjg3NUwxMCAxNi4yNWwtNy41LTQuMzc1TDUuNzE0IDEwWiIgY2xpcC1ydWxlPSJldmVub2RkIi8+PHBhdGggZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNNS40IDkuNDZhLjYyNS42MjUgMCAwIDEgLjYzIDBMMTAgMTEuNzc2bDMuOTctMi4zMTZhLjYyNS42MjUgMCAwIDEgLjYzIDBsMy4yMTUgMS44NzVhLjYyNS42MjUgMCAwIDEgMCAxLjA4bC03LjUgNC4zNzVhLjYyNS42MjUgMCAwIDEtLjYzIDBsLTcuNS00LjM3NWEuNjI1LjYyNSAwIDAgMSAwLTEuMDhMNS40IDkuNDZabS0xLjY2IDIuNDE1TDEwIDE1LjUyNmw2LjI2LTMuNjUxLTEuOTc0LTEuMTUxLTMuOTcxIDIuMzE2YS42MjUuNjI1IDAgMCAxLS42MyAwbC0zLjk3LTIuMzE2LTEuOTc1IDEuMTUxWiIgY2xpcC1ydWxlPSJldmVub2RkIi8+PC9zdmc+", xc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZD0ibTIuNSA2LjI1IDcuNSA0LjM3NSA3LjUtNC4zNzVMMTAgMS44NzUgMi41IDYuMjVaIi8+PHBhdGggZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNOS42ODUgMS4zMzVhLjYyNS42MjUgMCAwIDEgLjYzIDBsNy41IDQuMzc1YS42MjUuNjI1IDAgMCAxIDAgMS4wOGwtNy41IDQuMzc1YS42MjUuNjI1IDAgMCAxLS42MyAwbC03LjUtNC4zNzVhLjYyNS42MjUgMCAwIDEgMC0xLjA4bDcuNS00LjM3NVpNMy43NCA2LjI1IDEwIDkuOTAxbDYuMjYtMy42NTFMMTAgMi41OTkgMy43NCA2LjI1WiIgY2xpcC1ydWxlPSJldmVub2RkIi8+PHBhdGggZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNNS40IDExLjMzNWEuNjI1LjYyNSAwIDAgMSAuNjMgMEwxMCAxMy42NTFsMy45Ny0yLjMxNmEuNjI1LjYyNSAwIDAgMSAuNjMgMGwzLjIxNSAxLjg3NWEuNjI1LjYyNSAwIDAgMSAwIDEuMDhsLTcuNSA0LjM3NWEuNjI1LjYyNSAwIDAgMS0uNjMgMGwtNy41LTQuMzc1YS42MjUuNjI1IDAgMCAxIDAtMS4wOEw1LjQgMTEuMzM1Wk0zLjc0IDEzLjc1IDEwIDE3LjQwMWw2LjI2LTMuNjUxLTEuOTc0LTEuMTUxLTMuOTcxIDIuMzE2YS42MjUuNjI1IDAgMCAxLS42MyAwbC0zLjk3LTIuMzE2TDMuNzQgMTMuNzVaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz48cGF0aCBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik01LjQgNy41ODVhLjYyNS42MjUgMCAwIDEgLjYzIDBMMTAgOS45MDFsMy45Ny0yLjMxNmEuNjI1LjYyNSAwIDAgMSAuNjMgMGwzLjIxNSAxLjg3NWEuNjI1LjYyNSAwIDAgMSAwIDEuMDhsLTcuNSA0LjM3NWEuNjI1LjYyNSAwIDAgMS0uNjMgMGwtNy41LTQuMzc1YS42MjUuNjI1IDAgMCAxIDAtMS4wOEw1LjQgNy41ODVaTTMuNzQgMTAgMTAgMTMuNjUxIDE2LjI2IDEwbC0xLjk3NC0xLjE1MS0zLjk3MSAyLjMxNmEuNjI1LjYyNSAwIDAgMS0uNjMgMGwtMy45Ny0yLjMxNkwzLjc0IDEwWiIgY2xpcC1ydWxlPSJldmVub2RkIi8+PC9zdmc+", Mc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMS45NiAxMy40MzVhLjYyNS42MjUgMCAwIDEgLjg1NS0uMjI1TDEwIDE3LjQwMWw3LjE4NS00LjE5YS42MjUuNjI1IDAgMCAxIC42MyAxLjA3OWwtNy41IDQuMzc1YS42MjUuNjI1IDAgMCAxLS42MyAwbC03LjUtNC4zNzVhLjYyNS42MjUgMCAwIDEtLjIyNS0uODU1Wk05LjY4NSAxLjMzNWEuNjI1LjYyNSAwIDAgMSAuNjMgMGw3LjUgNC4zNzVhLjYyNS42MjUgMCAwIDEgMCAxLjA4bC03LjUgNC4zNzVhLjYyNS42MjUgMCAwIDEtLjYzIDBsLTcuNS00LjM3NWEuNjI1LjYyNSAwIDAgMSAwLTEuMDhsNy41LTQuMzc1Wk0zLjc0IDYuMjUgMTAgOS45MDFsNi4yNi0zLjY1MUwxMCAyLjU5OSAzLjc0IDYuMjVaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz48cGF0aCBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Im01LjcxNCAxMS44NzUgNC4yODYgMi41IDQuMjg2LTIuNUwxNy41IDEzLjc1IDEwIDE4LjEyNSAyLjUgMTMuNzVsMy4yMTQtMS44NzVaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz48cGF0aCBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik01LjQgMTEuMzM1YS42MjUuNjI1IDAgMCAxIC42MyAwTDEwIDEzLjY1MWwzLjk3LTIuMzE2YS42MjUuNjI1IDAgMCAxIC42MyAwbDMuMjE1IDEuODc1YS42MjUuNjI1IDAgMCAxIDAgMS4wOGwtNy41IDQuMzc1YS42MjUuNjI1IDAgMCAxLS42MyAwbC03LjUtNC4zNzVhLjYyNS42MjUgMCAwIDEgMC0xLjA4TDUuNCAxMS4zMzVaTTMuNzQgMTMuNzUgMTAgMTcuNDAxbDYuMjYtMy42NTEtMS45NzQtMS4xNTEtMy45NzEgMi4zMTZhLjYyNS42MjUgMCAwIDEtLjYzIDBsLTMuOTctMi4zMTZMMy43NCAxMy43NVoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjxwYXRoIGZpbGw9IiNmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTUuNCA3LjU4NWEuNjI1LjYyNSAwIDAgMSAuNjMgMEwxMCA5LjkwMWwzLjk3LTIuMzE2YS42MjUuNjI1IDAgMCAxIC42MyAwbDMuMjE1IDEuODc1YS42MjUuNjI1IDAgMCAxIDAgMS4wOGwtNy41IDQuMzc1YS42MjUuNjI1IDAgMCAxLS42MyAwbC03LjUtNC4zNzVhLjYyNS42MjUgMCAwIDEgMC0xLjA4TDUuNCA3LjU4NVpNMy43NCAxMCAxMCAxMy42NTEgMTYuMjYgMTBsLTEuOTc0LTEuMTUxLTMuOTcxIDIuMzE2YS42MjUuNjI1IDAgMCAxLS42MyAwbC0zLjk3LTIuMzE2TDMuNzQgMTBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=", Tc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PHBhdGggZmlsbD0iI0VDNEU0MCIgZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNOC4xMjUgMS4yNUExLjg3NSAxLjg3NSAwIDAgMCA2LjI1IDMuMTI1di42MjVIMy4xMjVhLjYyNS42MjUgMCAwIDAgMCAxLjI1aC42MjV2MTEuMjVBMS4yNSAxLjI1IDAgMCAwIDUgMTcuNWgxMGExLjI1IDEuMjUgMCAwIDAgMS4yNS0xLjI1VjVoLjYyNWEuNjI1LjYyNSAwIDAgMCAwLTEuMjVIMTMuNzV2LS42MjVhMS44NzUgMS44NzUgMCAwIDAtMS44NzUtMS44NzVoLTMuNzVabTQuMzc1IDIuNXYtLjYyNWEuNjI1LjYyNSAwIDAgMC0uNjI1LS42MjVoLTMuNzVhLjYyNS42MjUgMCAwIDAtLjYyNS42MjV2LjYyNWg1Wk01IDE2LjI1VjVoMTB2MTEuMjVINVpNOC4xMjUgNy41Yy4zNDUgMCAuNjI1LjI4LjYyNS42MjV2NWEuNjI1LjYyNSAwIDEgMS0xLjI1IDB2LTVjMC0uMzQ1LjI4LS42MjUuNjI1LS42MjVabTQuMzc1IDUuNjI1di01YS42MjUuNjI1IDAgMCAwLTEuMjUgMHY1YS42MjUuNjI1IDAgMSAwIDEuMjUgMFoiIGNsaXAtcnVsZT0iZXZlbm9kZCIvPjwvc3ZnPg==", Ve = {
  style: {
    position: "absolute",
    display: "none",
    background: "#2B2D33",
    borderRadius: "8px",
    padding: "0 8px",
    height: "32px",
    gap: "10px",
    zIndex: 10,
    alignItems: "center"
  },
  btnStyle: {
    background: "transparent",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "20px",
    width: "20px",
    cursor: "pointer",
    transition: "background-color 0.2s ease, transform 0.1s ease",
    transform: "scale(1)"
  },
  btnHover: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: "50%",
    transform: "scale(1.1)"
  },
  toolbarClass: "fabric-editor-toolbar",
  btnClass: "fabric-editor-toolbar-btn",
  lockedActions: [{
    name: "Разблокировать",
    handle: "unlock"
  }],
  actions: [
    {
      name: "Создать копию",
      handle: "copyPaste"
    },
    {
      name: "Заблокировать",
      handle: "lock"
    },
    {
      name: "На передний план",
      handle: "bringToFront"
    },
    {
      name: "На задний план",
      handle: "sendToBack"
    },
    {
      name: "На один уровень вверх",
      handle: "bringForward"
    },
    {
      name: "На один уровень вниз",
      handle: "sendBackwards"
    },
    {
      name: "Удалить",
      handle: "delete"
    }
  ],
  offsetTop: 50,
  icons: {
    copyPaste: bc,
    delete: Tc,
    lock: _c,
    unlock: Cc,
    bringToFront: xc,
    sendToBack: Mc,
    bringForward: wc,
    sendBackwards: Sc
  },
  handlers: {
    copyPaste: (a) => R(void 0, null, function* () {
      yield a.clipboardManager.copy(), yield a.clipboardManager.paste();
    }),
    delete: (a) => {
      a.deletionManager.deleteSelectedObjects();
    },
    lock: (a) => {
      a.objectLockManager.lockObject();
    },
    unlock: (a) => {
      a.objectLockManager.unlockObject();
    },
    bringForward: (a) => {
      a.layerManager.bringForward();
    },
    bringToFront: (a) => {
      a.layerManager.bringToFront();
    },
    sendToBack: (a) => {
      a.layerManager.sendToBack();
    },
    sendBackwards: (a) => {
      a.layerManager.sendBackwards();
    }
  }
};
class Oc {
  constructor({ editor: t }) {
    this.currentTarget = null, this.currentLocked = !1, this.isTransforming = !1, this.editor = t, this.canvas = t.canvas, this.options = t.options, this._initToolbar();
  }
  _initToolbar() {
    if (!this.options.showToolbar) return;
    const t = this.options.toolbar || {};
    this.config = Zi(J(J({}, Ve), t), {
      style: J(J({}, Ve.style), t.style || {}),
      btnStyle: J(J({}, Ve.btnStyle), t.btnStyle || {}),
      icons: J(J({}, Ve.icons), t.icons || {}),
      handlers: J(J({}, Ve.handlers), t.handlers || {})
    }), this.currentTarget = null, this.currentLocked = !1, this.isTransforming = !1, this._onMouseDown = this._handleMouseDown.bind(this), this._onObjectMoving = this._startTransform.bind(this), this._onObjectScaling = this._startTransform.bind(this), this._onObjectRotating = this._startTransform.bind(this), this._onMouseUp = this._endTransform.bind(this), this._onObjectModified = this._endTransform.bind(this), this._onSelectionChange = this._updateToolbar.bind(this), this._onSelectionClear = () => {
      this.el.style.display = "none";
    }, this._createDOM(), this._bindEvents();
  }
  /**
   * Создаёт DOM элемент панели инструментов и добавляет его в canvas
   */
  _createDOM() {
    const { style: t } = this.config;
    this.el = document.createElement("div"), Object.assign(this.el.style, t), this.canvas.wrapperEl.appendChild(this.el), this._onBtnOver = (e) => {
      const r = e.target.closest("button");
      r && Object.assign(r.style, this.config.btnHover);
    }, this._onBtnOut = (e) => {
      const r = e.target.closest("button");
      r && Object.assign(r.style, this.config.btnStyle);
    }, this.el.addEventListener("mouseover", this._onBtnOver), this.el.addEventListener("mouseout", this._onBtnOut);
  }
  /**
   * Отрисовывает кнопки панели инструментов
   * @param actions - массив действий для отрисовки
   * @param actions[].name - название действия
   * @param actions[].handle - название обработчика
   */
  _renderButtons(t) {
    this.el.innerHTML = "";
    for (const e of t) {
      const { name: s, handle: r } = e, { icons: i = {}, btnStyle: n, handlers: o = {} } = this.config, h = document.createElement("button");
      h.innerHTML = i[r] ? `<img src="${i[r]}" title="${s}" />` : s, Object.assign(h.style, n), h.onclick = () => {
        var l;
        return (l = o[r]) == null ? void 0 : l.call(o, this.editor);
      }, this.el.appendChild(h);
    }
  }
  /**
   * Привязывает события к canvas
   */
  _bindEvents() {
    this.canvas.on("mouse:down", this._onMouseDown), this.canvas.on("object:moving", this._onObjectMoving), this.canvas.on("object:scaling", this._onObjectScaling), this.canvas.on("object:rotating", this._onObjectRotating), this.canvas.on("mouse:up", this._onMouseUp), this.canvas.on("object:modified", this._onObjectModified), this.canvas.on("selection:created", this._onSelectionChange), this.canvas.on("selection:updated", this._onSelectionChange), this.canvas.on("after:render", this._onSelectionChange), this.canvas.on("selection:cleared", this._onSelectionClear);
  }
  /**
   * На время трансформации скрываем тулбар
   */
  _handleMouseDown(t) {
    var e;
    (e = t.transform) != null && e.actionPerformed && this._startTransform();
  }
  /**
   * Начало трансформации объекта
   */
  _startTransform() {
    this.isTransforming = !0, this.el.style.display = "none";
  }
  /**
   * Завершение трансформации объекта
   */
  _endTransform() {
    this.isTransforming = !1, this._updatePos();
  }
  /**
   * Обновляет панель инструментов в зависимости от выделенного объекта и его состояния
   */
  _updateToolbar() {
    if (this.isTransforming) return;
    const t = this.canvas.getActiveObject();
    if (!t) {
      this.el.style.display = "none", this.currentTarget = null;
      return;
    }
    const e = !!t.locked;
    if (t !== this.currentTarget || e !== this.currentLocked) {
      this.currentTarget = t, this.currentLocked = e;
      const s = e ? this.config.lockedActions : this.config.actions;
      this._renderButtons(s != null ? s : []);
    }
    this._updatePos();
  }
  /**
   * Обновляет позицию панели инструментов в зависимости от положения выделенного объекта
   */
  _updatePos() {
    if (this.isTransforming) return;
    const t = this.canvas.getActiveObject();
    if (!t) {
      this.el.style.display = "none";
      return;
    }
    const { el: e, config: s, canvas: r } = this;
    t.setCoords();
    const i = r.getZoom(), [, , , , n, o] = r.viewportTransform, { x: h } = t.getCenterPoint(), { top: l, height: c } = t.getBoundingRect(), g = h * i + n - e.offsetWidth / 2, d = s.offsetTop || 0, f = (l + c) * i + o + d;
    Object.assign(e.style, {
      left: `${g}px`,
      top: `${f}px`,
      display: "flex"
    });
  }
  /**
   * Удаляет слушатели событий и DOM элемент панели инструментов
   */
  destroy() {
    this.el.removeEventListener("mouseover", this._onBtnOver), this.el.removeEventListener("mouseout", this._onBtnOut), this.canvas.off("mouse:down", this._onMouseDown), this.canvas.off("object:moving", this._onObjectMoving), this.canvas.off("object:scaling", this._onObjectScaling), this.canvas.off("object:rotating", this._onObjectRotating), this.canvas.off("mouse:up", this._onMouseUp), this.canvas.off("object:modified", this._onObjectModified), this.canvas.off("selection:created", this._onSelectionChange), this.canvas.off("selection:updated", this._onSelectionChange), this.canvas.off("after:render", this._onSelectionChange), this.canvas.off("selection:cleared", this._onSelectionClear), this.el.remove();
  }
}
class jc {
  constructor(t) {
    this.selfOptions = t || {}, this.pipes = {};
  }
  options(t) {
    return t && (this.selfOptions = t), this.selfOptions;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipe(t, e) {
    var s = e;
    if (typeof t == "string") {
      if (typeof s == "undefined")
        return this.pipes[t];
      this.pipes[t] = s;
    }
    if (t && t.name) {
      if (s = t, s.processor === this)
        return s;
      this.pipes[s.name] = s;
    }
    return s.processor = this, s;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  process(t, e) {
    var s = t;
    s.options = this.options();
    for (var r = e || t.pipe || "default", i; r; )
      typeof s.nextAfterChildren != "undefined" && (s.next = s.nextAfterChildren, s.nextAfterChildren = null), typeof r == "string" && (r = this.pipe(r)), r.process(s), i = r, r = null, s && s.next && (s = s.next, r = s.pipe || i);
    return s.hasResult ? s.result : void 0;
  }
}
class Yr {
  constructor(t) {
    this.name = t, this.filters = [];
  }
  process(t) {
    if (!this.processor)
      throw new Error("add this pipe to a processor before using it");
    for (var e = this.debug, s = this.filters.length, r = t, i = 0; i < s; i++) {
      var n = this.filters[i];
      if (e && this.log("filter: ".concat(n.filterName)), n(r), typeof r == "object" && r.exiting) {
        r.exiting = !1;
        break;
      }
    }
    !r.next && this.resultCheck && this.resultCheck(r);
  }
  log(t) {
    console.log("[jsondiffpatch] ".concat(this.name, " pipe, ").concat(t));
  }
  append() {
    return this.filters.push(...arguments), this;
  }
  prepend() {
    return this.filters.unshift(...arguments), this;
  }
  indexOf(t) {
    if (!t)
      throw new Error("a filter name is required");
    for (var e = 0; e < this.filters.length; e++) {
      var s = this.filters[e];
      if (s.filterName === t)
        return e;
    }
    throw new Error("filter not found: ".concat(t));
  }
  list() {
    return this.filters.map((t) => t.filterName);
  }
  after(t) {
    for (var e = this.indexOf(t), s = arguments.length, r = new Array(s > 1 ? s - 1 : 0), i = 1; i < s; i++)
      r[i - 1] = arguments[i];
    return this.filters.splice(e + 1, 0, ...r), this;
  }
  before(t) {
    for (var e = this.indexOf(t), s = arguments.length, r = new Array(s > 1 ? s - 1 : 0), i = 1; i < s; i++)
      r[i - 1] = arguments[i];
    return this.filters.splice(e, 0, ...r), this;
  }
  replace(t) {
    for (var e = this.indexOf(t), s = arguments.length, r = new Array(s > 1 ? s - 1 : 0), i = 1; i < s; i++)
      r[i - 1] = arguments[i];
    return this.filters.splice(e, 1, ...r), this;
  }
  remove(t) {
    var e = this.indexOf(t);
    return this.filters.splice(e, 1), this;
  }
  clear() {
    return this.filters.length = 0, this;
  }
  shouldHaveResult(t) {
    if (t === !1) {
      this.resultCheck = null;
      return;
    }
    if (!this.resultCheck)
      return this.resultCheck = (e) => {
        if (!e.hasResult) {
          console.log(e);
          var s = new Error("".concat(this.name, " failed"));
          throw s.noResult = !0, s;
        }
      }, this;
  }
}
class Wi {
  setResult(t) {
    return this.result = t, this.hasResult = !0, this;
  }
  exit() {
    return this.exiting = !0, this;
  }
  push(t, e) {
    return t.parent = this, typeof e != "undefined" && (t.childName = e), t.root = this.root || this, t.options = t.options || this.options, this.children ? (this.children[this.children.length - 1].next = t, this.children.push(t)) : (this.children = [t], this.nextAfterChildren = this.next || null, this.next = t), t.next = this, this;
  }
}
function Dc(a) {
  var t = /^\/(.*)\/([gimyu]*)$/.exec(a.toString());
  return new RegExp(t[1], t[2]);
}
function rr(a) {
  if (typeof a != "object")
    return a;
  if (a === null)
    return null;
  if (Array.isArray(a))
    return a.map(rr);
  if (a instanceof Date)
    return new Date(a.getTime());
  if (a instanceof RegExp)
    return Dc(a);
  var t = {};
  for (var e in a)
    Object.prototype.hasOwnProperty.call(a, e) && (t[e] = rr(a[e]));
  return t;
}
class fe extends Wi {
  constructor(t, e) {
    super(), this.left = t, this.right = e, this.pipe = "diff";
  }
  setResult(t) {
    if (this.options.cloneDiffValues && typeof t == "object") {
      var e = typeof this.options.cloneDiffValues == "function" ? this.options.cloneDiffValues : rr;
      typeof t[0] == "object" && (t[0] = e(t[0])), typeof t[1] == "object" && (t[1] = e(t[1]));
    }
    return super.setResult(t);
  }
}
class zi extends Wi {
  constructor(t, e) {
    super(), this.left = t, this.delta = e, this.pipe = "patch";
  }
}
class Hi extends Wi {
  constructor(t) {
    super(), this.delta = t, this.pipe = "reverse";
  }
}
var _a = function(t) {
  if (t.left === t.right) {
    t.setResult(void 0).exit();
    return;
  }
  if (typeof t.left == "undefined") {
    if (typeof t.right == "function")
      throw new Error("functions are not supported");
    t.setResult([t.right]).exit();
    return;
  }
  if (typeof t.right == "undefined") {
    t.setResult([t.left, 0, 0]).exit();
    return;
  }
  if (typeof t.left == "function" || typeof t.right == "function")
    throw new Error("functions are not supported");
  if (t.leftType = t.left === null ? "null" : typeof t.left, t.rightType = t.right === null ? "null" : typeof t.right, t.leftType !== t.rightType) {
    t.setResult([t.left, t.right]).exit();
    return;
  }
  if (t.leftType === "boolean" || t.leftType === "number") {
    t.setResult([t.left, t.right]).exit();
    return;
  }
  if (t.leftType === "object" && (t.leftIsArray = Array.isArray(t.left)), t.rightType === "object" && (t.rightIsArray = Array.isArray(t.right)), t.leftIsArray !== t.rightIsArray) {
    t.setResult([t.left, t.right]).exit();
    return;
  }
  t.left instanceof RegExp && (t.right instanceof RegExp ? t.setResult([t.left.toString(), t.right.toString()]).exit() : t.setResult([t.left, t.right]).exit());
};
_a.filterName = "trivial";
var Ca = function(t) {
  if (typeof t.delta == "undefined") {
    t.setResult(t.left).exit();
    return;
  }
  if (t.nested = !Array.isArray(t.delta), !t.nested) {
    var e = t.delta;
    if (e.length === 1) {
      t.setResult(e[0]).exit();
      return;
    }
    if (e.length === 2) {
      if (t.left instanceof RegExp) {
        var s = /^\/(.*)\/([gimyu]+)$/.exec(e[1]);
        if (s) {
          t.setResult(new RegExp(s[1], s[2])).exit();
          return;
        }
      }
      t.setResult(e[1]).exit();
      return;
    }
    e.length === 3 && e[2] === 0 && t.setResult(void 0).exit();
  }
};
Ca.filterName = "trivial";
var wa = function(t) {
  if (typeof t.delta == "undefined") {
    t.setResult(t.delta).exit();
    return;
  }
  if (t.nested = !Array.isArray(t.delta), !t.nested) {
    var e = t.delta;
    if (e.length === 1) {
      t.setResult([e[0], 0, 0]).exit();
      return;
    }
    if (e.length === 2) {
      t.setResult([e[1], e[0]]).exit();
      return;
    }
    e.length === 3 && e[2] === 0 && t.setResult([e[0]]).exit();
  }
};
wa.filterName = "trivial";
var Sa = (a) => {
  if (!(!a || !a.children)) {
    for (var t = a.children.length, e, s = a.result, r = 0; r < t; r++)
      e = a.children[r], typeof e.result != "undefined" && (s = s || {}, s[e.childName] = e.result);
    s && a.leftIsArray && (s._t = "a"), a.setResult(s).exit();
  }
};
Sa.filterName = "collectChildren";
var xa = (a) => {
  if (!(a.leftIsArray || a.leftType !== "object")) {
    var t = a.left, e = a.right, s, r, i = a.options.propertyFilter;
    for (s in t)
      Object.prototype.hasOwnProperty.call(t, s) && (i && !i(s, a) || (r = new fe(t[s], e[s]), a.push(r, s)));
    for (s in e)
      Object.prototype.hasOwnProperty.call(e, s) && (i && !i(s, a) || typeof t[s] == "undefined" && (r = new fe(void 0, e[s]), a.push(r, s)));
    if (!a.children || a.children.length === 0) {
      a.setResult(void 0).exit();
      return;
    }
    a.exit();
  }
};
xa.filterName = "objects";
var Ma = function(t) {
  if (t.nested) {
    var e = t.delta;
    if (!e._t) {
      var s = e, r, i;
      for (r in s)
        i = new zi(t.left[r], s[r]), t.push(i, r);
      t.exit();
    }
  }
};
Ma.filterName = "objects";
var Ta = function(t) {
  if (!(!t || !t.children)) {
    var e = t.delta;
    if (!e._t) {
      for (var s = t.left, r = t.children.length, i, n = 0; n < r; n++) {
        i = t.children[n];
        var o = i.childName;
        Object.prototype.hasOwnProperty.call(t.left, o) && i.result === void 0 ? delete s[o] : s[o] !== i.result && (s[o] = i.result);
      }
      t.setResult(s).exit();
    }
  }
};
Ta.filterName = "collectChildren";
var Oa = function(t) {
  if (t.nested) {
    var e = t.delta;
    if (!e._t) {
      var s = t.delta, r, i;
      for (r in s)
        i = new Hi(s[r]), t.push(i, r);
      t.exit();
    }
  }
};
Oa.filterName = "objects";
var ja = (a) => {
  if (!(!a || !a.children)) {
    var t = a.delta;
    if (!t._t) {
      for (var e = a.children.length, s, r = {}, i = 0; i < e; i++) {
        s = a.children[i];
        var n = s.childName;
        r[n] !== s.result && (r[n] = s.result);
      }
      a.setResult(r).exit();
    }
  }
};
ja.filterName = "collectChildren";
var Ac = function(t, e, s, r) {
  return t[s] === e[r];
}, Ec = function(t, e, s, r) {
  var i = t.length, n = e.length, o, h, l = new Array(i + 1);
  for (o = 0; o < i + 1; o++)
    for (l[o] = new Array(n + 1), h = 0; h < n + 1; h++)
      l[o][h] = 0;
  for (l.match = s, o = 1; o < i + 1; o++)
    for (h = 1; h < n + 1; h++)
      s(t, e, o - 1, h - 1, r) ? l[o][h] = l[o - 1][h - 1] + 1 : l[o][h] = Math.max(l[o - 1][h], l[o][h - 1]);
  return l;
}, kc = function(t, e, s, r) {
  for (var i = e.length, n = s.length, o = {
    sequence: [],
    indices1: [],
    indices2: []
  }; i !== 0 && n !== 0; ) {
    var h = t.match(e, s, i - 1, n - 1, r);
    if (h)
      o.sequence.unshift(e[i - 1]), o.indices1.unshift(i - 1), o.indices2.unshift(n - 1), --i, --n;
    else {
      var l = t[i][n - 1], c = t[i - 1][n];
      l > c ? --n : --i;
    }
  }
  return o;
}, Ic = function(t, e, s, r) {
  var i = r || {}, n = Ec(t, e, s || Ac, i);
  return kc(n, t, e, i);
};
const Lc = {
  get: Ic
};
var Pe = 3;
function Pc(a, t, e, s) {
  for (var r = 0; r < e; r++)
    for (var i = a[r], n = 0; n < s; n++) {
      var o = t[n];
      if (r !== n && i === o)
        return !0;
    }
}
function Ns(a, t, e, s, r) {
  var i = a[e], n = t[s];
  if (i === n)
    return !0;
  if (typeof i != "object" || typeof n != "object")
    return !1;
  var o = r.objectHash;
  if (!o)
    return r.matchByPosition && e === s;
  r.hashCache1 = r.hashCache1 || [];
  var h = r.hashCache1[e];
  if (typeof h == "undefined" && (r.hashCache1[e] = h = o(i, e)), typeof h == "undefined")
    return !1;
  r.hashCache2 = r.hashCache2 || [];
  var l = r.hashCache2[s];
  return typeof l == "undefined" && (r.hashCache2[s] = l = o(n, s)), typeof l == "undefined" ? !1 : h === l;
}
var Da = function(t) {
  if (t.leftIsArray) {
    var e = {
      objectHash: t.options && t.options.objectHash,
      matchByPosition: t.options && t.options.matchByPosition
    }, s = 0, r = 0, i, n, o, h = t.left, l = t.right, c = h.length, u = l.length, g;
    for (c > 0 && u > 0 && !e.objectHash && typeof e.matchByPosition != "boolean" && (e.matchByPosition = !Pc(h, l, c, u)); s < c && s < u && Ns(h, l, s, s, e); )
      i = s, g = new fe(h[i], l[i]), t.push(g, i), s++;
    for (; r + s < c && r + s < u && Ns(h, l, c - 1 - r, u - 1 - r, e); )
      n = c - 1 - r, o = u - 1 - r, g = new fe(h[n], l[o]), t.push(g, o), r++;
    var d;
    if (s + r === c) {
      if (c === u) {
        t.setResult(void 0).exit();
        return;
      }
      for (d = d || {
        _t: "a"
      }, i = s; i < u - r; i++)
        d[i] = [l[i]];
      t.setResult(d).exit();
      return;
    }
    if (s + r === u) {
      for (d = d || {
        _t: "a"
      }, i = s; i < c - r; i++)
        d["_".concat(i)] = [h[i], 0, 0];
      t.setResult(d).exit();
      return;
    }
    delete e.hashCache1, delete e.hashCache2;
    var f = h.slice(s, c - r), p = l.slice(s, u - r), m = Lc.get(f, p, Ns, e), v = [];
    for (d = d || {
      _t: "a"
    }, i = s; i < c - r; i++)
      m.indices1.indexOf(i - s) < 0 && (d["_".concat(i)] = [h[i], 0, 0], v.push(i));
    var C = !0;
    t.options && t.options.arrays && t.options.arrays.detectMove === !1 && (C = !1);
    var w = !1;
    t.options && t.options.arrays && t.options.arrays.includeValueOnMove && (w = !0);
    var S = v.length;
    for (i = s; i < u - r; i++) {
      var x = m.indices2.indexOf(i - s);
      if (x < 0) {
        var M = !1;
        if (C && S > 0) {
          for (var O = 0; O < S; O++)
            if (n = v[O], Ns(f, p, n - s, i - s, e)) {
              d["_".concat(n)].splice(1, 2, i, Pe), w || (d["_".concat(n)][0] = ""), o = i, g = new fe(h[n], l[o]), t.push(g, o), v.splice(O, 1), M = !0;
              break;
            }
        }
        M || (d[i] = [l[i]]);
      } else
        n = m.indices1[x] + s, o = m.indices2[x] + s, g = new fe(h[n], l[o]), t.push(g, o);
    }
    t.setResult(d).exit();
  }
};
Da.filterName = "arrays";
var Fn = {
  numerically(a, t) {
    return a - t;
  },
  numericallyBy(a) {
    return (t, e) => t[a] - e[a];
  }
}, Aa = function(t) {
  if (t.nested) {
    var e = t.delta;
    if (e._t === "a") {
      var s, r, i = e, n = t.left, o = [], h = [], l = [];
      for (s in i)
        if (s !== "_t")
          if (s[0] === "_") {
            var c = s;
            if (i[c][2] === 0 || i[c][2] === Pe)
              o.push(parseInt(s.slice(1), 10));
            else
              throw new Error("only removal or move can be applied at original array indices," + " invalid diff type: ".concat(i[c][2]));
          } else {
            var u = s;
            i[u].length === 1 ? h.push({
              index: parseInt(u, 10),
              value: i[u][0]
            }) : l.push({
              index: parseInt(u, 10),
              delta: i[u]
            });
          }
      for (o = o.sort(Fn.numerically), s = o.length - 1; s >= 0; s--) {
        r = o[s];
        var g = i["_".concat(r)], d = n.splice(r, 1)[0];
        g[2] === Pe && h.push({
          index: g[1],
          value: d
        });
      }
      h = h.sort(Fn.numericallyBy("index"));
      var f = h.length;
      for (s = 0; s < f; s++) {
        var p = h[s];
        n.splice(p.index, 0, p.value);
      }
      var m = l.length, v;
      if (m > 0)
        for (s = 0; s < m; s++) {
          var C = l[s];
          v = new zi(n[C.index], C.delta), t.push(v, C.index);
        }
      if (!t.children) {
        t.setResult(n).exit();
        return;
      }
      t.exit();
    }
  }
};
Aa.filterName = "arrays";
var Ea = function(t) {
  if (!(!t || !t.children)) {
    var e = t.delta;
    if (e._t === "a") {
      for (var s = t.left, r = t.children.length, i, n = 0; n < r; n++) {
        i = t.children[n];
        var o = i.childName;
        s[o] = i.result;
      }
      t.setResult(s).exit();
    }
  }
};
Ea.filterName = "arraysCollectChildren";
var ka = function(t) {
  if (!t.nested) {
    var e = t.delta;
    if (e[2] === Pe) {
      var s = e;
      t.newName = "_".concat(s[1]), t.setResult([s[0], parseInt(t.childName.substring(1), 10), Pe]).exit();
    }
    return;
  }
  var r = t.delta;
  if (r._t === "a") {
    var i = r, n, o;
    for (n in i)
      n !== "_t" && (o = new Hi(i[n]), t.push(o, n));
    t.exit();
  }
};
ka.filterName = "arrays";
var Fc = (a, t, e) => {
  if (typeof t == "string" && t[0] === "_")
    return parseInt(t.substring(1), 10);
  if (Array.isArray(e) && e[2] === 0)
    return "_".concat(t);
  var s = +t;
  for (var r in a) {
    var i = a[r];
    if (Array.isArray(i))
      if (i[2] === Pe) {
        var n = parseInt(r.substring(1), 10), o = i[1];
        if (o === +t)
          return n;
        n <= s && o > s ? s++ : n >= s && o < s && s--;
      } else if (i[2] === 0) {
        var h = parseInt(r.substring(1), 10);
        h <= s && s++;
      } else i.length === 1 && parseInt(r, 10) <= s && s--;
  }
  return s;
}, Ia = (a) => {
  if (!(!a || !a.children)) {
    var t = a.delta;
    if (t._t === "a") {
      for (var e = t, s = a.children.length, r, i = {
        _t: "a"
      }, n = 0; n < s; n++) {
        r = a.children[n];
        var o = r.newName;
        typeof o == "undefined" && (o = Fc(e, r.childName, r.result)), i[o] !== r.result && (i[o] = r.result);
      }
      a.setResult(i).exit();
    }
  }
};
Ia.filterName = "arraysCollectChildren";
var La = function(t) {
  t.left instanceof Date ? (t.right instanceof Date ? t.left.getTime() !== t.right.getTime() ? t.setResult([t.left, t.right]) : t.setResult(void 0) : t.setResult([t.left, t.right]), t.exit()) : t.right instanceof Date && t.setResult([t.left, t.right]).exit();
};
La.filterName = "dates";
var ir = 2, Nc = 60, Wr = null;
function Pa(a, t) {
  var e;
  if (!Wr) {
    var s;
    if (!((e = a == null ? void 0 : a.textDiff) === null || e === void 0) && e.diffMatchPatch)
      s = new a.textDiff.diffMatchPatch();
    else {
      if (!t)
        return null;
      var r = new Error("The diff-match-patch library was not provided. Pass the library in through the options or use the `jsondiffpatch/with-text-diffs` entry-point.");
      throw r.diff_match_patch_not_found = !0, r;
    }
    Wr = {
      diff: function(n, o) {
        return s.patch_toText(s.patch_make(n, o));
      },
      patch: function(n, o) {
        for (var h = s.patch_apply(s.patch_fromText(o), n), l = 0; l < h[1].length; l++)
          if (!h[1][l]) {
            var c = new Error("text patch failed");
            c.textPatchFailed = !0;
          }
        return h[0];
      }
    };
  }
  return Wr;
}
var Fa = function(t) {
  if (t.leftType === "string") {
    var e = t.left, s = t.right, r = t.options && t.options.textDiff && t.options.textDiff.minLength || Nc;
    if (e.length < r || s.length < r) {
      t.setResult([e, s]).exit();
      return;
    }
    var i = Pa(t.options);
    if (!i) {
      t.setResult([e, s]).exit();
      return;
    }
    var n = i.diff;
    t.setResult([n(e, s), 0, ir]).exit();
  }
};
Fa.filterName = "texts";
var Na = function(t) {
  if (!t.nested) {
    var e = t.delta;
    if (e[2] === ir) {
      var s = e, r = Pa(t.options, !0).patch;
      t.setResult(r(t.left, s[0])).exit();
    }
  }
};
Na.filterName = "texts";
var Rc = function(t) {
  var e, s, r, i, n = null, o = /^@@ +-(\d+),(\d+) +\+(\d+),(\d+) +@@$/, h, l = t.split(`
`);
  for (e = 0, s = l.length; e < s; e++) {
    r = l[e];
    var c = r.slice(0, 1);
    c === "@" ? (n = o.exec(r), h = e, l[h] = "@@ -" + n[3] + "," + n[4] + " +" + n[1] + "," + n[2] + " @@") : c === "+" ? (l[e] = "-" + l[e].slice(1), l[e - 1].slice(0, 1) === "+" && (i = l[e], l[e] = l[e - 1], l[e - 1] = i)) : c === "-" && (l[e] = "+" + l[e].slice(1));
  }
  return l.join(`
`);
}, Ra = function(t) {
  if (!t.nested) {
    var e = t.delta;
    if (e[2] === ir) {
      var s = e;
      t.setResult([Rc(s[0]), 0, ir]).exit();
    }
  }
};
Ra.filterName = "texts";
class Bc {
  constructor(t) {
    this.processor = new jc(t), this.processor.pipe(new Yr("diff").append(Sa, _a, La, Fa, xa, Da).shouldHaveResult()), this.processor.pipe(new Yr("patch").append(Ta, Ea, Ca, Na, Ma, Aa).shouldHaveResult()), this.processor.pipe(new Yr("reverse").append(ja, Ia, wa, Ra, Oa, ka).shouldHaveResult());
  }
  options(t) {
    return this.processor.options(t);
  }
  diff(t, e) {
    return this.processor.process(new fe(t, e));
  }
  patch(t, e) {
    return this.processor.process(new zi(t, e));
  }
  reverse(t) {
    return this.processor.process(new Hi(t));
  }
  unpatch(t, e) {
    return this.patch(t, this.reverse(e));
  }
  clone(t) {
    return rr(t);
  }
}
function Yc(a) {
  return new Bc(a);
}
var au = typeof globalThis != "undefined" ? globalThis : typeof window != "undefined" ? window : typeof global != "undefined" ? global : typeof self != "undefined" ? self : {};
function Wc(a) {
  return a && a.__esModule && Object.prototype.hasOwnProperty.call(a, "default") ? a.default : a;
}
var zr = { exports: {} }, Nn;
function zc() {
  return Nn || (Nn = 1, function(a) {
    var t = function() {
      this.Diff_Timeout = 1, this.Diff_EditCost = 4, this.Match_Threshold = 0.5, this.Match_Distance = 1e3, this.Patch_DeleteThreshold = 0.5, this.Patch_Margin = 4, this.Match_MaxBits = 32;
    }, e = -1, s = 1, r = 0;
    t.Diff = function(i, n) {
      return [i, n];
    }, t.prototype.diff_main = function(i, n, o, h) {
      typeof h == "undefined" && (this.Diff_Timeout <= 0 ? h = Number.MAX_VALUE : h = (/* @__PURE__ */ new Date()).getTime() + this.Diff_Timeout * 1e3);
      var l = h;
      if (i == null || n == null)
        throw new Error("Null input. (diff_main)");
      if (i == n)
        return i ? [new t.Diff(r, i)] : [];
      typeof o == "undefined" && (o = !0);
      var c = o, u = this.diff_commonPrefix(i, n), g = i.substring(0, u);
      i = i.substring(u), n = n.substring(u), u = this.diff_commonSuffix(i, n);
      var d = i.substring(i.length - u);
      i = i.substring(0, i.length - u), n = n.substring(0, n.length - u);
      var f = this.diff_compute_(i, n, c, l);
      return g && f.unshift(new t.Diff(r, g)), d && f.push(new t.Diff(r, d)), this.diff_cleanupMerge(f), f;
    }, t.prototype.diff_compute_ = function(i, n, o, h) {
      var l;
      if (!i)
        return [new t.Diff(s, n)];
      if (!n)
        return [new t.Diff(e, i)];
      var c = i.length > n.length ? i : n, u = i.length > n.length ? n : i, g = c.indexOf(u);
      if (g != -1)
        return l = [new t.Diff(s, c.substring(0, g)), new t.Diff(r, u), new t.Diff(s, c.substring(g + u.length))], i.length > n.length && (l[0][0] = l[2][0] = e), l;
      if (u.length == 1)
        return [new t.Diff(e, i), new t.Diff(s, n)];
      var d = this.diff_halfMatch_(i, n);
      if (d) {
        var f = d[0], p = d[1], m = d[2], v = d[3], C = d[4], w = this.diff_main(f, m, o, h), S = this.diff_main(p, v, o, h);
        return w.concat([new t.Diff(r, C)], S);
      }
      return o && i.length > 100 && n.length > 100 ? this.diff_lineMode_(i, n, h) : this.diff_bisect_(i, n, h);
    }, t.prototype.diff_lineMode_ = function(i, n, o) {
      var h = this.diff_linesToChars_(i, n);
      i = h.chars1, n = h.chars2;
      var l = h.lineArray, c = this.diff_main(i, n, !1, o);
      this.diff_charsToLines_(c, l), this.diff_cleanupSemantic(c), c.push(new t.Diff(r, ""));
      for (var u = 0, g = 0, d = 0, f = "", p = ""; u < c.length; ) {
        switch (c[u][0]) {
          case s:
            d++, p += c[u][1];
            break;
          case e:
            g++, f += c[u][1];
            break;
          case r:
            if (g >= 1 && d >= 1) {
              c.splice(u - g - d, g + d), u = u - g - d;
              for (var m = this.diff_main(f, p, !1, o), v = m.length - 1; v >= 0; v--)
                c.splice(u, 0, m[v]);
              u = u + m.length;
            }
            d = 0, g = 0, f = "", p = "";
            break;
        }
        u++;
      }
      return c.pop(), c;
    }, t.prototype.diff_bisect_ = function(i, n, o) {
      for (var h = i.length, l = n.length, c = Math.ceil((h + l) / 2), u = c, g = 2 * c, d = new Array(g), f = new Array(g), p = 0; p < g; p++)
        d[p] = -1, f[p] = -1;
      d[u + 1] = 0, f[u + 1] = 0;
      for (var m = h - l, v = m % 2 != 0, C = 0, w = 0, S = 0, x = 0, M = 0; M < c && !((/* @__PURE__ */ new Date()).getTime() > o); M++) {
        for (var O = -M + C; O <= M - w; O += 2) {
          var T = u + O, j;
          O == -M || O != M && d[T - 1] < d[T + 1] ? j = d[T + 1] : j = d[T - 1] + 1;
          for (var I = j - O; j < h && I < l && i.charAt(j) == n.charAt(I); )
            j++, I++;
          if (d[T] = j, j > h)
            w += 2;
          else if (I > l)
            C += 2;
          else if (v) {
            var A = u + m - O;
            if (A >= 0 && A < g && f[A] != -1) {
              var E = h - f[A];
              if (j >= E)
                return this.diff_bisectSplit_(i, n, j, I, o);
            }
          }
        }
        for (var k = -M + S; k <= M - x; k += 2) {
          var A = u + k, E;
          k == -M || k != M && f[A - 1] < f[A + 1] ? E = f[A + 1] : E = f[A - 1] + 1;
          for (var F = E - k; E < h && F < l && i.charAt(h - E - 1) == n.charAt(l - F - 1); )
            E++, F++;
          if (f[A] = E, E > h)
            x += 2;
          else if (F > l)
            S += 2;
          else if (!v) {
            var T = u + m - k;
            if (T >= 0 && T < g && d[T] != -1) {
              var j = d[T], I = u + j - T;
              if (E = h - E, j >= E)
                return this.diff_bisectSplit_(i, n, j, I, o);
            }
          }
        }
      }
      return [new t.Diff(e, i), new t.Diff(s, n)];
    }, t.prototype.diff_bisectSplit_ = function(i, n, o, h, l) {
      var c = i.substring(0, o), u = n.substring(0, h), g = i.substring(o), d = n.substring(h), f = this.diff_main(c, u, !1, l), p = this.diff_main(g, d, !1, l);
      return f.concat(p);
    }, t.prototype.diff_linesToChars_ = function(i, n) {
      var o = [], h = {};
      o[0] = "";
      function l(d) {
        for (var f = "", p = 0, m = -1, v = o.length; m < d.length - 1; ) {
          m = d.indexOf(`
`, p), m == -1 && (m = d.length - 1);
          var C = d.substring(p, m + 1);
          (h.hasOwnProperty ? h.hasOwnProperty(C) : h[C] !== void 0) ? f += String.fromCharCode(h[C]) : (v == c && (C = d.substring(p), m = d.length), f += String.fromCharCode(v), h[C] = v, o[v++] = C), p = m + 1;
        }
        return f;
      }
      var c = 4e4, u = l(i);
      c = 65535;
      var g = l(n);
      return {
        chars1: u,
        chars2: g,
        lineArray: o
      };
    }, t.prototype.diff_charsToLines_ = function(i, n) {
      for (var o = 0; o < i.length; o++) {
        for (var h = i[o][1], l = [], c = 0; c < h.length; c++)
          l[c] = n[h.charCodeAt(c)];
        i[o][1] = l.join("");
      }
    }, t.prototype.diff_commonPrefix = function(i, n) {
      if (!i || !n || i.charAt(0) != n.charAt(0))
        return 0;
      for (var o = 0, h = Math.min(i.length, n.length), l = h, c = 0; o < l; )
        i.substring(c, l) == n.substring(c, l) ? (o = l, c = o) : h = l, l = Math.floor((h - o) / 2 + o);
      return l;
    }, t.prototype.diff_commonSuffix = function(i, n) {
      if (!i || !n || i.charAt(i.length - 1) != n.charAt(n.length - 1))
        return 0;
      for (var o = 0, h = Math.min(i.length, n.length), l = h, c = 0; o < l; )
        i.substring(i.length - l, i.length - c) == n.substring(n.length - l, n.length - c) ? (o = l, c = o) : h = l, l = Math.floor((h - o) / 2 + o);
      return l;
    }, t.prototype.diff_commonOverlap_ = function(i, n) {
      var o = i.length, h = n.length;
      if (o == 0 || h == 0)
        return 0;
      o > h ? i = i.substring(o - h) : o < h && (n = n.substring(0, o));
      var l = Math.min(o, h);
      if (i == n)
        return l;
      for (var c = 0, u = 1; ; ) {
        var g = i.substring(l - u), d = n.indexOf(g);
        if (d == -1)
          return c;
        u += d, (d == 0 || i.substring(l - u) == n.substring(0, u)) && (c = u, u++);
      }
    }, t.prototype.diff_halfMatch_ = function(i, n) {
      if (this.Diff_Timeout <= 0)
        return null;
      var o = i.length > n.length ? i : n, h = i.length > n.length ? n : i;
      if (o.length < 4 || h.length * 2 < o.length)
        return null;
      var l = this;
      function c(w, S, x) {
        for (var M = w.substring(x, x + Math.floor(w.length / 4)), O = -1, T = "", j, I, A, E; (O = S.indexOf(M, O + 1)) != -1; ) {
          var k = l.diff_commonPrefix(w.substring(x), S.substring(O)), F = l.diff_commonSuffix(w.substring(0, x), S.substring(0, O));
          T.length < F + k && (T = S.substring(O - F, O) + S.substring(O, O + k), j = w.substring(0, x - F), I = w.substring(x + k), A = S.substring(0, O - F), E = S.substring(O + k));
        }
        return T.length * 2 >= w.length ? [j, I, A, E, T] : null;
      }
      var u = c(o, h, Math.ceil(o.length / 4)), g = c(o, h, Math.ceil(o.length / 2)), d;
      if (!u && !g)
        return null;
      g ? u ? d = u[4].length > g[4].length ? u : g : d = g : d = u;
      var f, p, m, v;
      i.length > n.length ? (f = d[0], p = d[1], m = d[2], v = d[3]) : (m = d[0], v = d[1], f = d[2], p = d[3]);
      var C = d[4];
      return [f, p, m, v, C];
    }, t.prototype.diff_cleanupSemantic = function(i) {
      for (var n = !1, o = [], h = 0, l = null, c = 0, u = 0, g = 0, d = 0, f = 0; c < i.length; )
        i[c][0] == r ? (o[h++] = c, u = d, g = f, d = 0, f = 0, l = i[c][1]) : (i[c][0] == s ? d += i[c][1].length : f += i[c][1].length, l && l.length <= Math.max(u, g) && l.length <= Math.max(d, f) && (i.splice(o[h - 1], 0, new t.Diff(e, l)), i[o[h - 1] + 1][0] = s, h--, h--, c = h > 0 ? o[h - 1] : -1, u = 0, g = 0, d = 0, f = 0, l = null, n = !0)), c++;
      for (n && this.diff_cleanupMerge(i), this.diff_cleanupSemanticLossless(i), c = 1; c < i.length; ) {
        if (i[c - 1][0] == e && i[c][0] == s) {
          var p = i[c - 1][1], m = i[c][1], v = this.diff_commonOverlap_(p, m), C = this.diff_commonOverlap_(m, p);
          v >= C ? (v >= p.length / 2 || v >= m.length / 2) && (i.splice(c, 0, new t.Diff(r, m.substring(0, v))), i[c - 1][1] = p.substring(0, p.length - v), i[c + 1][1] = m.substring(v), c++) : (C >= p.length / 2 || C >= m.length / 2) && (i.splice(c, 0, new t.Diff(r, p.substring(0, C))), i[c - 1][0] = s, i[c - 1][1] = m.substring(0, m.length - C), i[c + 1][0] = e, i[c + 1][1] = p.substring(C), c++), c++;
        }
        c++;
      }
    }, t.prototype.diff_cleanupSemanticLossless = function(i) {
      function n(C, w) {
        if (!C || !w)
          return 6;
        var S = C.charAt(C.length - 1), x = w.charAt(0), M = S.match(t.nonAlphaNumericRegex_), O = x.match(t.nonAlphaNumericRegex_), T = M && S.match(t.whitespaceRegex_), j = O && x.match(t.whitespaceRegex_), I = T && S.match(t.linebreakRegex_), A = j && x.match(t.linebreakRegex_), E = I && C.match(t.blanklineEndRegex_), k = A && w.match(t.blanklineStartRegex_);
        return E || k ? 5 : I || A ? 4 : M && !T && j ? 3 : T || j ? 2 : M || O ? 1 : 0;
      }
      for (var o = 1; o < i.length - 1; ) {
        if (i[o - 1][0] == r && i[o + 1][0] == r) {
          var h = i[o - 1][1], l = i[o][1], c = i[o + 1][1], u = this.diff_commonSuffix(h, l);
          if (u) {
            var g = l.substring(l.length - u);
            h = h.substring(0, h.length - u), l = g + l.substring(0, l.length - u), c = g + c;
          }
          for (var d = h, f = l, p = c, m = n(h, l) + n(l, c); l.charAt(0) === c.charAt(0); ) {
            h += l.charAt(0), l = l.substring(1) + c.charAt(0), c = c.substring(1);
            var v = n(h, l) + n(l, c);
            v >= m && (m = v, d = h, f = l, p = c);
          }
          i[o - 1][1] != d && (d ? i[o - 1][1] = d : (i.splice(o - 1, 1), o--), i[o][1] = f, p ? i[o + 1][1] = p : (i.splice(o + 1, 1), o--));
        }
        o++;
      }
    }, t.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/, t.whitespaceRegex_ = /\s/, t.linebreakRegex_ = /[\r\n]/, t.blanklineEndRegex_ = /\n\r?\n$/, t.blanklineStartRegex_ = /^\r?\n\r?\n/, t.prototype.diff_cleanupEfficiency = function(i) {
      for (var n = !1, o = [], h = 0, l = null, c = 0, u = !1, g = !1, d = !1, f = !1; c < i.length; )
        i[c][0] == r ? (i[c][1].length < this.Diff_EditCost && (d || f) ? (o[h++] = c, u = d, g = f, l = i[c][1]) : (h = 0, l = null), d = f = !1) : (i[c][0] == e ? f = !0 : d = !0, l && (u && g && d && f || l.length < this.Diff_EditCost / 2 && u + g + d + f == 3) && (i.splice(o[h - 1], 0, new t.Diff(e, l)), i[o[h - 1] + 1][0] = s, h--, l = null, u && g ? (d = f = !0, h = 0) : (h--, c = h > 0 ? o[h - 1] : -1, d = f = !1), n = !0)), c++;
      n && this.diff_cleanupMerge(i);
    }, t.prototype.diff_cleanupMerge = function(i) {
      i.push(new t.Diff(r, ""));
      for (var n = 0, o = 0, h = 0, l = "", c = "", u; n < i.length; )
        switch (i[n][0]) {
          case s:
            h++, c += i[n][1], n++;
            break;
          case e:
            o++, l += i[n][1], n++;
            break;
          case r:
            o + h > 1 ? (o !== 0 && h !== 0 && (u = this.diff_commonPrefix(c, l), u !== 0 && (n - o - h > 0 && i[n - o - h - 1][0] == r ? i[n - o - h - 1][1] += c.substring(0, u) : (i.splice(0, 0, new t.Diff(r, c.substring(0, u))), n++), c = c.substring(u), l = l.substring(u)), u = this.diff_commonSuffix(c, l), u !== 0 && (i[n][1] = c.substring(c.length - u) + i[n][1], c = c.substring(0, c.length - u), l = l.substring(0, l.length - u))), n -= o + h, i.splice(n, o + h), l.length && (i.splice(n, 0, new t.Diff(e, l)), n++), c.length && (i.splice(n, 0, new t.Diff(s, c)), n++), n++) : n !== 0 && i[n - 1][0] == r ? (i[n - 1][1] += i[n][1], i.splice(n, 1)) : n++, h = 0, o = 0, l = "", c = "";
            break;
        }
      i[i.length - 1][1] === "" && i.pop();
      var g = !1;
      for (n = 1; n < i.length - 1; )
        i[n - 1][0] == r && i[n + 1][0] == r && (i[n][1].substring(i[n][1].length - i[n - 1][1].length) == i[n - 1][1] ? (i[n][1] = i[n - 1][1] + i[n][1].substring(0, i[n][1].length - i[n - 1][1].length), i[n + 1][1] = i[n - 1][1] + i[n + 1][1], i.splice(n - 1, 1), g = !0) : i[n][1].substring(0, i[n + 1][1].length) == i[n + 1][1] && (i[n - 1][1] += i[n + 1][1], i[n][1] = i[n][1].substring(i[n + 1][1].length) + i[n + 1][1], i.splice(n + 1, 1), g = !0)), n++;
      g && this.diff_cleanupMerge(i);
    }, t.prototype.diff_xIndex = function(i, n) {
      var o = 0, h = 0, l = 0, c = 0, u;
      for (u = 0; u < i.length && (i[u][0] !== s && (o += i[u][1].length), i[u][0] !== e && (h += i[u][1].length), !(o > n)); u++)
        l = o, c = h;
      return i.length != u && i[u][0] === e ? c : c + (n - l);
    }, t.prototype.diff_prettyHtml = function(i) {
      for (var n = [], o = /&/g, h = /</g, l = />/g, c = /\n/g, u = 0; u < i.length; u++) {
        var g = i[u][0], d = i[u][1], f = d.replace(o, "&amp;").replace(h, "&lt;").replace(l, "&gt;").replace(c, "&para;<br>");
        switch (g) {
          case s:
            n[u] = '<ins style="background:#e6ffe6;">' + f + "</ins>";
            break;
          case e:
            n[u] = '<del style="background:#ffe6e6;">' + f + "</del>";
            break;
          case r:
            n[u] = "<span>" + f + "</span>";
            break;
        }
      }
      return n.join("");
    }, t.prototype.diff_text1 = function(i) {
      for (var n = [], o = 0; o < i.length; o++)
        i[o][0] !== s && (n[o] = i[o][1]);
      return n.join("");
    }, t.prototype.diff_text2 = function(i) {
      for (var n = [], o = 0; o < i.length; o++)
        i[o][0] !== e && (n[o] = i[o][1]);
      return n.join("");
    }, t.prototype.diff_levenshtein = function(i) {
      for (var n = 0, o = 0, h = 0, l = 0; l < i.length; l++) {
        var c = i[l][0], u = i[l][1];
        switch (c) {
          case s:
            o += u.length;
            break;
          case e:
            h += u.length;
            break;
          case r:
            n += Math.max(o, h), o = 0, h = 0;
            break;
        }
      }
      return n += Math.max(o, h), n;
    }, t.prototype.diff_toDelta = function(i) {
      for (var n = [], o = 0; o < i.length; o++)
        switch (i[o][0]) {
          case s:
            n[o] = "+" + encodeURI(i[o][1]);
            break;
          case e:
            n[o] = "-" + i[o][1].length;
            break;
          case r:
            n[o] = "=" + i[o][1].length;
            break;
        }
      return n.join("	").replace(/%20/g, " ");
    }, t.prototype.diff_fromDelta = function(i, n) {
      for (var o = [], h = 0, l = 0, c = n.split(/\t/g), u = 0; u < c.length; u++) {
        var g = c[u].substring(1);
        switch (c[u].charAt(0)) {
          case "+":
            try {
              o[h++] = new t.Diff(s, decodeURI(g));
            } catch (p) {
              throw new Error("Illegal escape in diff_fromDelta: " + g);
            }
            break;
          case "-":
          // Fall through.
          case "=":
            var d = parseInt(g, 10);
            if (isNaN(d) || d < 0)
              throw new Error("Invalid number in diff_fromDelta: " + g);
            var f = i.substring(l, l += d);
            c[u].charAt(0) == "=" ? o[h++] = new t.Diff(r, f) : o[h++] = new t.Diff(e, f);
            break;
          default:
            if (c[u])
              throw new Error("Invalid diff operation in diff_fromDelta: " + c[u]);
        }
      }
      if (l != i.length)
        throw new Error("Delta length (" + l + ") does not equal source text length (" + i.length + ").");
      return o;
    }, t.prototype.match_main = function(i, n, o) {
      if (i == null || n == null || o == null)
        throw new Error("Null input. (match_main)");
      return o = Math.max(0, Math.min(o, i.length)), i == n ? 0 : i.length ? i.substring(o, o + n.length) == n ? o : this.match_bitap_(i, n, o) : -1;
    }, t.prototype.match_bitap_ = function(i, n, o) {
      if (n.length > this.Match_MaxBits)
        throw new Error("Pattern too long for this browser.");
      var h = this.match_alphabet_(n), l = this;
      function c(j, I) {
        var A = j / n.length, E = Math.abs(o - I);
        return l.Match_Distance ? A + E / l.Match_Distance : E ? 1 : A;
      }
      var u = this.Match_Threshold, g = i.indexOf(n, o);
      g != -1 && (u = Math.min(c(0, g), u), g = i.lastIndexOf(n, o + n.length), g != -1 && (u = Math.min(c(0, g), u)));
      var d = 1 << n.length - 1;
      g = -1;
      for (var f, p, m = n.length + i.length, v, C = 0; C < n.length; C++) {
        for (f = 0, p = m; f < p; )
          c(C, o + p) <= u ? f = p : m = p, p = Math.floor((m - f) / 2 + f);
        m = p;
        var w = Math.max(1, o - p + 1), S = Math.min(o + p, i.length) + n.length, x = Array(S + 2);
        x[S + 1] = (1 << C) - 1;
        for (var M = S; M >= w; M--) {
          var O = h[i.charAt(M - 1)];
          if (C === 0 ? x[M] = (x[M + 1] << 1 | 1) & O : x[M] = (x[M + 1] << 1 | 1) & O | ((v[M + 1] | v[M]) << 1 | 1) | v[M + 1], x[M] & d) {
            var T = c(C, M - 1);
            if (T <= u)
              if (u = T, g = M - 1, g > o)
                w = Math.max(1, 2 * o - g);
              else
                break;
          }
        }
        if (c(C + 1, o) > u)
          break;
        v = x;
      }
      return g;
    }, t.prototype.match_alphabet_ = function(i) {
      for (var n = {}, o = 0; o < i.length; o++)
        n[i.charAt(o)] = 0;
      for (var o = 0; o < i.length; o++)
        n[i.charAt(o)] |= 1 << i.length - o - 1;
      return n;
    }, t.prototype.patch_addContext_ = function(i, n) {
      if (n.length != 0) {
        if (i.start2 === null)
          throw Error("patch not initialized");
        for (var o = n.substring(i.start2, i.start2 + i.length1), h = 0; n.indexOf(o) != n.lastIndexOf(o) && o.length < this.Match_MaxBits - this.Patch_Margin - this.Patch_Margin; )
          h += this.Patch_Margin, o = n.substring(i.start2 - h, i.start2 + i.length1 + h);
        h += this.Patch_Margin;
        var l = n.substring(i.start2 - h, i.start2);
        l && i.diffs.unshift(new t.Diff(r, l));
        var c = n.substring(i.start2 + i.length1, i.start2 + i.length1 + h);
        c && i.diffs.push(new t.Diff(r, c)), i.start1 -= l.length, i.start2 -= l.length, i.length1 += l.length + c.length, i.length2 += l.length + c.length;
      }
    }, t.prototype.patch_make = function(i, n, o) {
      var h, l;
      if (typeof i == "string" && typeof n == "string" && typeof o == "undefined")
        h = /** @type {string} */
        i, l = this.diff_main(
          h,
          /** @type {string} */
          n,
          !0
        ), l.length > 2 && (this.diff_cleanupSemantic(l), this.diff_cleanupEfficiency(l));
      else if (i && typeof i == "object" && typeof n == "undefined" && typeof o == "undefined")
        l = /** @type {!Array.<!diff_match_patch.Diff>} */
        i, h = this.diff_text1(l);
      else if (typeof i == "string" && n && typeof n == "object" && typeof o == "undefined")
        h = /** @type {string} */
        i, l = /** @type {!Array.<!diff_match_patch.Diff>} */
        n;
      else if (typeof i == "string" && typeof n == "string" && o && typeof o == "object")
        h = /** @type {string} */
        i, l = /** @type {!Array.<!diff_match_patch.Diff>} */
        o;
      else
        throw new Error("Unknown call format to patch_make.");
      if (l.length === 0)
        return [];
      for (var c = [], u = new t.patch_obj(), g = 0, d = 0, f = 0, p = h, m = h, v = 0; v < l.length; v++) {
        var C = l[v][0], w = l[v][1];
        switch (!g && C !== r && (u.start1 = d, u.start2 = f), C) {
          case s:
            u.diffs[g++] = l[v], u.length2 += w.length, m = m.substring(0, f) + w + m.substring(f);
            break;
          case e:
            u.length1 += w.length, u.diffs[g++] = l[v], m = m.substring(0, f) + m.substring(f + w.length);
            break;
          case r:
            w.length <= 2 * this.Patch_Margin && g && l.length != v + 1 ? (u.diffs[g++] = l[v], u.length1 += w.length, u.length2 += w.length) : w.length >= 2 * this.Patch_Margin && g && (this.patch_addContext_(u, p), c.push(u), u = new t.patch_obj(), g = 0, p = m, d = f);
            break;
        }
        C !== s && (d += w.length), C !== e && (f += w.length);
      }
      return g && (this.patch_addContext_(u, p), c.push(u)), c;
    }, t.prototype.patch_deepCopy = function(i) {
      for (var n = [], o = 0; o < i.length; o++) {
        var h = i[o], l = new t.patch_obj();
        l.diffs = [];
        for (var c = 0; c < h.diffs.length; c++)
          l.diffs[c] = new t.Diff(h.diffs[c][0], h.diffs[c][1]);
        l.start1 = h.start1, l.start2 = h.start2, l.length1 = h.length1, l.length2 = h.length2, n[o] = l;
      }
      return n;
    }, t.prototype.patch_apply = function(i, n) {
      if (i.length == 0)
        return [n, []];
      i = this.patch_deepCopy(i);
      var o = this.patch_addPadding(i);
      n = o + n + o, this.patch_splitMax(i);
      for (var h = 0, l = [], c = 0; c < i.length; c++) {
        var u = i[c].start2 + h, g = this.diff_text1(i[c].diffs), d, f = -1;
        if (g.length > this.Match_MaxBits ? (d = this.match_main(n, g.substring(0, this.Match_MaxBits), u), d != -1 && (f = this.match_main(n, g.substring(g.length - this.Match_MaxBits), u + g.length - this.Match_MaxBits), (f == -1 || d >= f) && (d = -1))) : d = this.match_main(n, g, u), d == -1)
          l[c] = !1, h -= i[c].length2 - i[c].length1;
        else {
          l[c] = !0, h = d - u;
          var p;
          if (f == -1 ? p = n.substring(d, d + g.length) : p = n.substring(d, f + this.Match_MaxBits), g == p)
            n = n.substring(0, d) + this.diff_text2(i[c].diffs) + n.substring(d + g.length);
          else {
            var m = this.diff_main(g, p, !1);
            if (g.length > this.Match_MaxBits && this.diff_levenshtein(m) / g.length > this.Patch_DeleteThreshold)
              l[c] = !1;
            else {
              this.diff_cleanupSemanticLossless(m);
              for (var v = 0, C, w = 0; w < i[c].diffs.length; w++) {
                var S = i[c].diffs[w];
                S[0] !== r && (C = this.diff_xIndex(m, v)), S[0] === s ? n = n.substring(0, d + C) + S[1] + n.substring(d + C) : S[0] === e && (n = n.substring(0, d + C) + n.substring(d + this.diff_xIndex(m, v + S[1].length))), S[0] !== e && (v += S[1].length);
              }
            }
          }
        }
      }
      return n = n.substring(o.length, n.length - o.length), [n, l];
    }, t.prototype.patch_addPadding = function(i) {
      for (var n = this.Patch_Margin, o = "", h = 1; h <= n; h++)
        o += String.fromCharCode(h);
      for (var h = 0; h < i.length; h++)
        i[h].start1 += n, i[h].start2 += n;
      var l = i[0], c = l.diffs;
      if (c.length == 0 || c[0][0] != r)
        c.unshift(new t.Diff(r, o)), l.start1 -= n, l.start2 -= n, l.length1 += n, l.length2 += n;
      else if (n > c[0][1].length) {
        var u = n - c[0][1].length;
        c[0][1] = o.substring(c[0][1].length) + c[0][1], l.start1 -= u, l.start2 -= u, l.length1 += u, l.length2 += u;
      }
      if (l = i[i.length - 1], c = l.diffs, c.length == 0 || c[c.length - 1][0] != r)
        c.push(new t.Diff(r, o)), l.length1 += n, l.length2 += n;
      else if (n > c[c.length - 1][1].length) {
        var u = n - c[c.length - 1][1].length;
        c[c.length - 1][1] += o.substring(0, u), l.length1 += u, l.length2 += u;
      }
      return o;
    }, t.prototype.patch_splitMax = function(i) {
      for (var n = this.Match_MaxBits, o = 0; o < i.length; o++)
        if (!(i[o].length1 <= n)) {
          var h = i[o];
          i.splice(o--, 1);
          for (var l = h.start1, c = h.start2, u = ""; h.diffs.length !== 0; ) {
            var g = new t.patch_obj(), d = !0;
            for (g.start1 = l - u.length, g.start2 = c - u.length, u !== "" && (g.length1 = g.length2 = u.length, g.diffs.push(new t.Diff(r, u))); h.diffs.length !== 0 && g.length1 < n - this.Patch_Margin; ) {
              var f = h.diffs[0][0], p = h.diffs[0][1];
              f === s ? (g.length2 += p.length, c += p.length, g.diffs.push(h.diffs.shift()), d = !1) : f === e && g.diffs.length == 1 && g.diffs[0][0] == r && p.length > 2 * n ? (g.length1 += p.length, l += p.length, d = !1, g.diffs.push(new t.Diff(f, p)), h.diffs.shift()) : (p = p.substring(0, n - g.length1 - this.Patch_Margin), g.length1 += p.length, l += p.length, f === r ? (g.length2 += p.length, c += p.length) : d = !1, g.diffs.push(new t.Diff(f, p)), p == h.diffs[0][1] ? h.diffs.shift() : h.diffs[0][1] = h.diffs[0][1].substring(p.length));
            }
            u = this.diff_text2(g.diffs), u = u.substring(u.length - this.Patch_Margin);
            var m = this.diff_text1(h.diffs).substring(0, this.Patch_Margin);
            m !== "" && (g.length1 += m.length, g.length2 += m.length, g.diffs.length !== 0 && g.diffs[g.diffs.length - 1][0] === r ? g.diffs[g.diffs.length - 1][1] += m : g.diffs.push(new t.Diff(r, m))), d || i.splice(++o, 0, g);
          }
        }
    }, t.prototype.patch_toText = function(i) {
      for (var n = [], o = 0; o < i.length; o++)
        n[o] = i[o];
      return n.join("");
    }, t.prototype.patch_fromText = function(i) {
      var n = [];
      if (!i)
        return n;
      for (var o = i.split(`
`), h = 0, l = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/; h < o.length; ) {
        var c = o[h].match(l);
        if (!c)
          throw new Error("Invalid patch string: " + o[h]);
        var u = new t.patch_obj();
        for (n.push(u), u.start1 = parseInt(c[1], 10), c[2] === "" ? (u.start1--, u.length1 = 1) : c[2] == "0" ? u.length1 = 0 : (u.start1--, u.length1 = parseInt(c[2], 10)), u.start2 = parseInt(c[3], 10), c[4] === "" ? (u.start2--, u.length2 = 1) : c[4] == "0" ? u.length2 = 0 : (u.start2--, u.length2 = parseInt(c[4], 10)), h++; h < o.length; ) {
          var g = o[h].charAt(0);
          try {
            var d = decodeURI(o[h].substring(1));
          } catch (f) {
            throw new Error("Illegal escape in patch_fromText: " + d);
          }
          if (g == "-")
            u.diffs.push(new t.Diff(e, d));
          else if (g == "+")
            u.diffs.push(new t.Diff(s, d));
          else if (g == " ")
            u.diffs.push(new t.Diff(r, d));
          else {
            if (g == "@")
              break;
            if (g !== "") throw new Error('Invalid patch mode "' + g + '" in: ' + d);
          }
          h++;
        }
      }
      return n;
    }, t.patch_obj = function() {
      this.diffs = [], this.start1 = null, this.start2 = null, this.length1 = 0, this.length2 = 0;
    }, t.patch_obj.prototype.toString = function() {
      var i, n;
      this.length1 === 0 ? i = this.start1 + ",0" : this.length1 == 1 ? i = this.start1 + 1 : i = this.start1 + 1 + "," + this.length1, this.length2 === 0 ? n = this.start2 + ",0" : this.length2 == 1 ? n = this.start2 + 1 : n = this.start2 + 1 + "," + this.length2;
      for (var o = ["@@ -" + i + " +" + n + ` @@
`], h, l = 0; l < this.diffs.length; l++) {
        switch (this.diffs[l][0]) {
          case s:
            h = "+";
            break;
          case e:
            h = "-";
            break;
          case r:
            h = " ";
            break;
        }
        o[l + 1] = h + encodeURI(this.diffs[l][1]) + `
`;
      }
      return o.join("").replace(/%20/g, " ");
    }, a.exports = t, a.exports.diff_match_patch = t, a.exports.DIFF_DELETE = e, a.exports.DIFF_INSERT = s, a.exports.DIFF_EQUAL = r;
  }(zr)), zr.exports;
}
var Hc = zc();
const Vc = /* @__PURE__ */ Wc(Hc);
class Uc {
  constructor({ editor: t }) {
    this.editor = t, this.canvas = t.canvas, this._historySuspendCount = 0, this.baseState = null, this.patches = [], this.currentIndex = 0, this.maxHistoryLength = t.options.maxHistoryLength, this.totalChangesCount = 0, this.baseStateChangesCount = 0, this._createDiffPatcher();
  }
  /** Проверка, нужно ли пропускать сохранение истории */
  get skipHistory() {
    return this._historySuspendCount > 0;
  }
  get lastPatch() {
    return this.patches[this.currentIndex - 1] || null;
  }
  _createDiffPatcher() {
    this.diffPatcher = Yc({
      objectHash(t) {
        const e = t;
        return [
          e.id,
          e.format,
          e.locked,
          e.left,
          e.top,
          e.width,
          e.height,
          e.flipX,
          e.flipY,
          e.scaleX,
          e.scaleY,
          e.angle,
          e.opacity
        ].join("-");
      },
      arrays: {
        detectMove: !0,
        includeValueOnMove: !1
      },
      textDiff: {
        diffMatchPatch: Vc,
        minLength: 60
      }
    });
  }
  /** Увеличить счётчик приостановки истории */
  suspendHistory() {
    this._historySuspendCount += 1;
  }
  /** Уменьшить счётчик приостановки истории */
  resumeHistory() {
    this._historySuspendCount = Math.max(0, this._historySuspendCount - 1);
  }
  /**
   * Проверяет, есть ли в редакторе несохранённые изменения
   */
  hasUnsavedChanges() {
    return this.totalChangesCount > 0;
  }
  /**
   * Получает текущую позицию в общей истории изменений
   */
  getCurrentChangePosition() {
    return this.baseStateChangesCount + this.currentIndex;
  }
  /**
   * Получаем полное состояние, применяя все диффы к базовому состоянию.
   */
  getFullState() {
    const { baseState: t, currentIndex: e, patches: s } = this;
    let r = JSON.parse(JSON.stringify(t));
    for (let i = 0; i < e; i += 1)
      r = this.diffPatcher.patch(r, s[i].diff);
    return console.log("getFullState state", r), r;
  }
  /**
   * Сохраняем текущее состояние в виде диффа от последнего сохранённого полного состояния.
   */
  saveState() {
    if (console.log("saveState"), this.skipHistory) return;
    console.time("saveState");
    const t = this.canvas.toDatalessObject([
      "selectable",
      "evented",
      "id",
      "format",
      "width",
      "height",
      "locked",
      "lockMovementX",
      "lockMovementY",
      "lockRotation",
      "lockScalingX",
      "lockScalingY",
      "lockSkewingX",
      "lockSkewingY"
    ]);
    if (console.timeEnd("saveState"), !this.baseState) {
      this.baseState = t, this.patches = [], this.currentIndex = 0, console.log("Базовое состояние сохранено.");
      return;
    }
    const e = this.getFullState(), s = this.diffPatcher.diff(e, t);
    if (!s) {
      console.log("Нет изменений для сохранения.");
      return;
    }
    console.log("baseState", this.baseState), this.currentIndex < this.patches.length && this.patches.splice(this.currentIndex), console.log("diff", s), this.totalChangesCount += 1, this.patches.push({ id: Ut(), diff: s }), this.currentIndex += 1, this.patches.length > this.maxHistoryLength && (this.baseState = this.diffPatcher.patch(this.baseState, this.patches[0].diff), this.patches.shift(), this.currentIndex -= 1, this.baseStateChangesCount += 1), console.log("Состояние сохранено. Текущий индекс истории:", this.currentIndex);
  }
  /**
   * Функция загрузки состояния в канвас.
   * @param fullState - полное состояние канваса
   * @fires editor:history-state-loaded
   */
  loadStateFromFullState(t) {
    return R(this, null, function* () {
      if (!t) return;
      console.log("loadStateFromFullState fullState", t);
      const { canvas: e, canvasManager: s, interactionBlocker: r } = this.editor, { width: i, height: n } = e;
      yield e.loadFromJSON(t);
      const o = e.getObjects().find((l) => l.id === "montage-area");
      o && (this.editor.montageArea = o, (i !== t.width || n !== t.height) && s.updateCanvasAndFitObjects());
      const h = e.getObjects().find((l) => l.id === "overlay-mask");
      h && (r.overlayMask = h, r.overlayMask.visible = !1), e.renderAll(), e.fire("editor:history-state-loaded", {
        fullState: t,
        currentIndex: this.currentIndex,
        totalChangesCount: this.totalChangesCount,
        baseStateChangesCount: this.baseStateChangesCount,
        patchesCount: this.patches.length,
        patches: this.patches
      });
    });
  }
  /**
   * Undo – отмена последнего действия, восстанавливая состояние по накопленным диффам.
   * @fires editor:undo
   */
  undo() {
    return R(this, null, function* () {
      if (!this.skipHistory) {
        if (this.currentIndex <= 0) {
          console.log("Нет предыдущих состояний для отмены.");
          return;
        }
        this.suspendHistory();
        try {
          this.currentIndex -= 1, this.totalChangesCount -= 1;
          const t = this.getFullState();
          yield this.loadStateFromFullState(t), console.log("Undo выполнен. Текущий индекс истории:", this.currentIndex), this.canvas.fire("editor:undo", {
            fullState: t,
            currentIndex: this.currentIndex,
            totalChangesCount: this.totalChangesCount,
            baseStateChangesCount: this.baseStateChangesCount,
            patchesCount: this.patches.length,
            patches: this.patches
          });
        } catch (t) {
          this.editor.errorManager.emitError({
            origin: "HistoryManager",
            method: "undo",
            code: "UNDO_ERROR",
            message: "Ошибка отмены действия",
            data: t
          });
        } finally {
          this.resumeHistory();
        }
      }
    });
  }
  /**
   * Redo – повтор ранее отменённого действия.
   * @fires editor:redo
   */
  redo() {
    return R(this, null, function* () {
      if (!this.skipHistory) {
        if (this.currentIndex >= this.patches.length) {
          console.log("Нет состояний для повтора.");
          return;
        }
        this.suspendHistory();
        try {
          this.currentIndex += 1, this.totalChangesCount += 1;
          const t = this.getFullState();
          console.log("fullState", t), yield this.loadStateFromFullState(t), console.log("Redo выполнен. Текущий индекс истории:", this.currentIndex), this.canvas.fire("editor:redo", {
            fullState: t,
            currentIndex: this.currentIndex,
            totalChangesCount: this.totalChangesCount,
            baseStateChangesCount: this.baseStateChangesCount,
            patchesCount: this.patches.length,
            patches: this.patches
          });
        } catch (t) {
          this.editor.errorManager.emitError({
            origin: "HistoryManager",
            method: "redo",
            code: "REDO_ERROR",
            message: "Ошибка повтора действия",
            data: t
          });
        } finally {
          this.resumeHistory();
        }
      }
    });
  }
}
const Xc = 0.1, Gc = 2, Zc = 0.1, Kc = 90, Ae = 16, Ee = 16, pe = 4096, me = 4096;
class Bt {
  constructor({ editor: t }) {
    this.editor = t, this.options = t.options, this._createdBlobUrls = [], this.acceptContentTypes = this.editor.options.acceptContentTypes, this.acceptFormats = this.getAllowedFormatsFromContentTypes();
  }
  /**
   * Импорт изображения
   * @param options
   * @param options.source - URL изображения или объект File
   * @param options.scale - Если изображение не вписывается в допустимые размеры, то как масштабировать:
   * 'image-contain' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'image-cover' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'scale-montage' - Обновляет backstore-резолюцию монтажной области (масштабирует
   * экспортный размер канваса под размер изображения)
   * @param options.withoutSave - Не сохранять в историю изменений
   * @returns возвращает Promise с объектом изображения или null в случае ошибки
   */
  importImage(t) {
    return R(this, null, function* () {
      const {
        source: e,
        scale: s = `image-${this.options.scaleType}`,
        withoutSave: r = !1
      } = t;
      if (!e) return null;
      const { canvas: i, montageArea: n, transformManager: o, historyManager: h, errorManager: l } = this.editor, c = yield this.getContentType(e), u = Bt.getFormatFromContentType(c), { acceptContentTypes: g, acceptFormats: d } = this;
      if (!this.isAllowedContentType(c)) {
        const f = `Неверный contentType для изображения: ${c}. Ожидается один из: ${this.acceptContentTypes.join(", ")}.`;
        return l.emitError({
          origin: "ImageManager",
          method: "importImage",
          code: "INVALID_CONTENT_TYPE",
          message: f,
          data: { source: e, format: u, contentType: c, acceptContentTypes: g, acceptFormats: d }
        }), null;
      }
      h.suspendHistory();
      try {
        let f, p;
        if (e instanceof File)
          f = URL.createObjectURL(e);
        else if (typeof e == "string") {
          const S = yield (yield fetch(e, { mode: "cors" })).blob();
          f = URL.createObjectURL(S);
        } else
          return l.emitError({
            origin: "ImageManager",
            method: "importImage",
            code: "INVALID_SOURCE_TYPE",
            message: "Неверный тип источника изображения. Ожидается URL или объект File.",
            data: { source: e, format: u, contentType: c, acceptContentTypes: g, acceptFormats: d }
          }), null;
        if (this._createdBlobUrls.push(f), u === "svg") {
          const w = yield Xl(f);
          p = hs.groupSVGElements(w.objects, w.options);
        } else
          p = yield tt.fromURL(f, { crossOrigin: "anonymous" });
        const { width: m, height: v } = p;
        if (p instanceof tt) {
          const w = p.getElement();
          let S = "";
          if (w instanceof HTMLImageElement ? S = w.src : w instanceof HTMLCanvasElement && (S = w.toDataURL()), v > me || m > pe) {
            const x = yield this.resizeImageToBoundaries(S, "max"), M = URL.createObjectURL(x);
            this._createdBlobUrls.push(M), p = yield tt.fromURL(M, { crossOrigin: "anonymous" });
          } else if (v < Ee || m < Ae) {
            const x = yield this.resizeImageToBoundaries(S, "min"), M = URL.createObjectURL(x);
            this._createdBlobUrls.push(M), p = yield tt.fromURL(M, { crossOrigin: "anonymous" });
          }
        }
        if (p.set("id", `${p.type}-${Ut()}`), p.set("format", u), s === "scale-montage")
          this.editor.canvasManager.scaleMontageAreaToImage({ object: p, withoutSave: !0 });
        else {
          const { width: w, height: S } = n, x = this.calculateScaleFactor({ imageObject: p, scaleType: s });
          s === "image-contain" && x < 1 ? o.fitObject({ object: p, type: "contain", withoutSave: !0 }) : s === "image-cover" && (m > w || v > S) && o.fitObject({ object: p, type: "cover", withoutSave: !0 });
        }
        i.add(p), i.centerObject(p), i.setActiveObject(p), i.renderAll(), h.resumeHistory(), r || h.saveState();
        const C = {
          image: p,
          format: u,
          contentType: c,
          scale: s,
          withoutSave: r,
          source: e
        };
        return i.fire("editor:image-imported", C), C;
      } catch (f) {
        return l.emitError({
          origin: "ImageManager",
          method: "importImage",
          code: "IMPORT_FAILED",
          message: `Ошибка импорта изображения: ${f.message}`,
          data: { source: e, format: u, contentType: c, scale: s, withoutSave: r }
        }), h.resumeHistory(), null;
      }
    });
  }
  /**
   * Функция для ресайза изображения до максимальных размеров,
   * если оно их превышает. Сохраняет пропорции.
   *
   * @param dataURL - dataURL изображения
   * @param size ('max | min') - максимальный или минимальный размер
   * @returns возвращает Promise с Blob-объектом уменьшенного изображения
   */
  resizeImageToBoundaries(t, e = "max") {
    return R(this, null, function* () {
      let s = `Размер изображения больше максимального размера канваса, поэтому оно будет уменьшено до максимальных размеров c сохранением пропорций: ${pe}x${me}`;
      e === "min" && (s = `Размер изображения меньше минимального размера канваса, поэтому оно будет увеличено до минимальных размеров c сохранением пропорций: ${Ae}x${Ee}`);
      const r = {
        dataURL: t,
        sizeType: e,
        maxWidth: pe,
        maxHeight: me,
        minWidth: Ae,
        minHeight: Ee
      };
      return this.editor.errorManager.emitWarning({
        origin: "ImageManager",
        method: "resizeImageToBoundaries",
        code: "IMAGE_RESIZE_WARNING",
        message: s,
        data: r
      }), this.editor.workerManager.post("resizeImage", r);
    });
  }
  /**
   * Экспорт изображения в файл – экспортируется содержимое монтажной области.
   * Независимо от текущего зума, экспортируется монтажная область в исходном масштабе. Можно экспортировать как base64.
   * @param options - опции
   * @param options.fileName - имя файла
   * @param options.contentType - тип контента
   * @param options.exportAsBase64 - экспортировать как base64
   * @param options.exportAsBlob - экспортировать как blob
   * @returns возвращает Promise с объектом файла или null в случае ошибки
   * @fires editor:canvas-exported
   */
  exportCanvasAsImageFile() {
    return R(this, arguments, function* (t = {}) {
      const {
        fileName: e = "image.png",
        contentType: s = "image/png",
        exportAsBase64: r = !1,
        exportAsBlob: i = !1
      } = t, { canvas: n, montageArea: o, workerManager: h } = this.editor;
      try {
        const l = s === "application/pdf", c = l ? "image/jpg" : s, u = Bt.getFormatFromContentType(c);
        o.setCoords();
        const { left: g, top: d, width: f, height: p } = o.getBoundingRect(), m = yield n.clone(["id", "format", "locked"]);
        ["image/jpg", "image/jpeg"].includes(c) && (m.backgroundColor = "#ffffff");
        const v = m.getObjects().find((j) => j.id === o.id);
        v && (v.visible = !1), m.viewportTransform = [1, 0, 0, 1, -g, -d], m.setDimensions({ width: f, height: p }, { backstoreOnly: !0 }), m.renderAll();
        const C = m.getObjects().filter((j) => j.format).every((j) => j.format === "svg");
        if (u === "svg" && C) {
          const j = m.toSVG();
          m.dispose();
          const A = {
            image: Bt._exportSVGStringAsFile(j, {
              exportAsBase64: r,
              exportAsBlob: i,
              fileName: e
            }),
            format: "svg",
            contentType: "image/svg+xml",
            fileName: e.replace(/\.[^/.]+$/, ".svg")
          };
          return n.fire("editor:canvas-exported", A), A;
        }
        const w = yield new Promise((j, I) => {
          m.getElement().toBlob((A) => {
            A ? j(A) : I(new Error("Failed to create Blob from canvas"));
          });
        });
        if (m.dispose(), i) {
          const j = {
            image: w,
            format: u,
            contentType: c,
            fileName: e
          };
          return n.fire("editor:canvas-exported", j), j;
        }
        const S = yield createImageBitmap(w), x = yield h.post(
          "toDataURL",
          { format: u, quality: 1, bitmap: S },
          [S]
        );
        if (l) {
          const I = f * 0.264583, A = p * 0.264583, E = (yield this.editor.moduleLoader.loadModule("jspdf")).jsPDF, k = new E({
            orientation: I > A ? "landscape" : "portrait",
            unit: "mm",
            format: [I, A]
          });
          if (k.addImage(String(x), "JPG", 0, 0, I, A), r) {
            const W = {
              image: k.output("datauristring"),
              format: "pdf",
              contentType: "application/pdf",
              fileName: e
            };
            return n.fire("editor:canvas-exported", W), W;
          }
          const F = k.output("blob"), G = {
            image: new File([F], e, { type: "application/pdf" }),
            format: "pdf",
            contentType: "application/pdf",
            fileName: e
          };
          return n.fire("editor:canvas-exported", G), G;
        }
        if (r) {
          const j = {
            image: x,
            format: u,
            contentType: c,
            fileName: e
          };
          return n.fire("editor:canvas-exported", j), j;
        }
        const M = u === "svg" && !C ? e.replace(/\.[^/.]+$/, ".png") : e, T = {
          image: new File([w], M, { type: c }),
          format: u,
          contentType: c,
          fileName: M
        };
        return n.fire("editor:canvas-exported", T), T;
      } catch (l) {
        return this.editor.errorManager.emitError({
          origin: "ImageManager",
          method: "exportCanvasAsImageFile",
          code: "IMAGE_EXPORT_FAILED",
          message: `Ошибка экспорта изображения: ${l.message}`,
          data: { contentType: s, fileName: e, exportAsBase64: r, exportAsBlob: i }
        }), null;
      }
    });
  }
  /**
   * Экспорт выбранного объекта в виде изображения или base64
   * @param options - опции
   * @param options.object - объект для экспорта
   * @param options.fileName - имя файла
   * @param options.contentType - тип контента
   * @param options.exportAsBase64 - экспортировать как base64
   * @param options.exportAsBlob - экспортировать как blob
   * @returns - возвращает Promise с объектом файла или null в случае ошибки
   * @fires editor:object-exported
   */
  exportObjectAsImageFile() {
    return R(this, arguments, function* (t = {}) {
      const {
        object: e,
        fileName: s = "image.png",
        contentType: r = "image/png",
        exportAsBase64: i = !1,
        exportAsBlob: n = !1
      } = t, { canvas: o, workerManager: h } = this.editor, l = e || o.getActiveObject();
      if (!l)
        return this.editor.errorManager.emitError({
          origin: "ImageManager",
          method: "exportObjectAsImageFile",
          code: "NO_OBJECT_SELECTED",
          message: "Не выбран объект для экспорта",
          data: { contentType: r, fileName: s, exportAsBase64: i, exportAsBlob: n }
        }), null;
      try {
        const c = Bt.getFormatFromContentType(r);
        if (c === "svg") {
          const p = l.toSVG(), m = Bt._exportSVGStringAsFile(p, {
            exportAsBase64: i,
            exportAsBlob: n,
            fileName: s
          }), v = {
            object: l,
            image: m,
            format: c,
            contentType: "image/svg+xml",
            fileName: s.replace(/\.[^/.]+$/, ".svg")
          };
          return o.fire("editor:object-exported", v), v;
        }
        if (i && l instanceof tt) {
          const p = yield createImageBitmap(l.getElement()), m = yield h.post(
            "toDataURL",
            {
              format: c,
              quality: 1,
              bitmap: p
            },
            [p]
          ), v = {
            object: l,
            image: m,
            format: c,
            contentType: r,
            fileName: s
          };
          return o.fire("editor:object-exported", v), v;
        }
        const u = l.toCanvasElement(), g = yield new Promise((p, m) => {
          u.toBlob((v) => {
            v ? p(v) : m(new Error("Failed to create Blob from canvas"));
          });
        });
        if (n) {
          const p = {
            object: l,
            image: g,
            format: c,
            contentType: r,
            fileName: s
          };
          return o.fire("editor:object-exported", p), p;
        }
        const d = new File([g], s, { type: r }), f = {
          object: l,
          image: d,
          format: c,
          contentType: r,
          fileName: s
        };
        return o.fire("editor:object-exported", f), f;
      } catch (c) {
        return this.editor.errorManager.emitError({
          origin: "ImageManager",
          method: "exportObjectAsImageFile",
          code: "IMAGE_EXPORT_FAILED",
          message: `Ошибка экспорта объекта: ${c.message}`,
          data: { contentType: r, fileName: s, exportAsBase64: i, exportAsBlob: n }
        }), null;
      }
    });
  }
  /**
   * Удаляет все созданные blobURL
   */
  revokeBlobUrls() {
    this._createdBlobUrls.forEach(URL.revokeObjectURL), this._createdBlobUrls = [];
  }
  /**
   * Получает список допустимых форматов изображений
   * @returns массив допустимых форматов изображений
   */
  getAllowedFormatsFromContentTypes() {
    return this.acceptContentTypes.map((t) => Bt.getFormatFromContentType(t)).filter((t) => t);
  }
  /**
   * Проверяет, является ли contentType допустимым типом изображения.
   * @returns true, если contentType допустим, иначе false
   */
  isAllowedContentType(t = "") {
    return this.acceptContentTypes.includes(t);
  }
  /**
   * Получает contentType изображения из источника
   * @param source - URL изображения или объект File
   * @returns MIME-тип изображения
   * @public
   */
  getContentType(t) {
    return R(this, null, function* () {
      return typeof t == "string" ? this.getContentTypeFromUrl(t) : t.type || "application/octet-stream";
    });
  }
  /**
   * Получает contentType изображения через HTTP HEAD запрос или анализ URL
   * @param src - URL изображения
   * @returns MIME-тип изображения
   * @public
   */
  getContentTypeFromUrl(t) {
    return R(this, null, function* () {
      if (t.startsWith("data:")) {
        const e = t.match(/^data:([^;]+)/);
        return e ? e[1] : "application/octet-stream";
      }
      try {
        const s = (yield fetch(t, { method: "HEAD" })).headers.get("content-type");
        if (s && s.startsWith("image/"))
          return s.split(";")[0];
      } catch (e) {
        console.warn("HEAD запрос неудачен, определяем тип по расширению:", e);
      }
      return this.getContentTypeFromExtension(t);
    });
  }
  /**
   * Определяет contentType по расширению файла в URL
   * @param url - URL файла
   * @returns MIME-тип
   * @public
   */
  getContentTypeFromExtension(t) {
    var e;
    try {
      const r = (e = new URL(t).pathname.split(".").pop()) == null ? void 0 : e.toLowerCase(), i = {};
      return this.acceptContentTypes.forEach((n) => {
        const o = Bt.getFormatFromContentType(n);
        o && (i[o] = n);
      }), r && i[r] || "application/octet-stream";
    } catch (s) {
      return console.warn("Не удалось определить расширение из URL:", t, s), "application/octet-stream";
    }
  }
  /**
   * Рассчитывает коэффициент масштабирования изображения.
   * @param options - опции
   * @param options.imageObject - объект изображения
   * @param options.scaleType - тип масштабирования ('contain' или 'cover')
   * @returns коэффициент масштабирования
   */
  calculateScaleFactor({
    imageObject: t,
    scaleType: e = "contain"
  }) {
    const { montageArea: s } = this.editor;
    if (!s || !t) return 1;
    const r = s.width, i = s.height, { width: n, height: o } = t;
    return e === "contain" || e === "image-contain" ? Math.min(r / n, i / o) : e === "cover" || e === "image-cover" ? Math.max(r / n, i / o) : 1;
  }
  /**
   * Преобразует SVG-строку в Blob, файл, или base64
   * @param svgString - SVG-строка
   * @param options - опции
   * @param options.exportAsBase64 - экспортировать как base64
   * @param options.exportAsBlob - экспортировать как blob
   * @param options.fileName - имя файла
   * @returns Blob, base64 или файл
   * @private
   * @static
   */
  static _exportSVGStringAsFile(t, {
    exportAsBase64: e,
    exportAsBlob: s,
    fileName: r = "image.svg"
  } = {}) {
    return s ? new Blob([t], { type: "image/svg+xml" }) : e ? `data:image/svg+xml;base64,${window.btoa(encodeURIComponent(t))}` : new File([t], r.replace(/\.[^/.]+$/, ".svg"), { type: "image/svg+xml" });
  }
  /**
   * Извлекает чистый формат (subtype) из contentType,
   * отбросив любую часть после «+» или «;»
   * @param contentType
   * @returns формат, например 'png', 'jpeg', 'svg'
   * @static
   */
  static getFormatFromContentType(t = "") {
    const e = t.match(/^[^/]+\/([^+;]+)/);
    return e ? e[1] : "";
  }
}
class qc {
  /**
   * @param options
   * @param options.editor – экземпляр редактора
   */
  constructor({ editor: t }) {
    this.editor = t;
  }
  /**
   * Устанавливаем внутреннюю ширину канваса (для экспорта)
   * @param width - ширина канваса
   * @param options
   * @param options.preserveProportional - Сохранить пропорции
   * @param options.withoutSave - Не сохранять состояние
   * @param options.adaptCanvasToContainer - Адаптировать канвас к контейнеру
   * @fires editor:resolution-width-changed
   */
  setResolutionWidth(t, { preserveProportional: e, withoutSave: s, adaptCanvasToContainer: r } = {}) {
    var f;
    if (!t) return;
    const {
      canvas: i,
      montageArea: n,
      options: { canvasBackstoreWidth: o }
    } = this.editor, { width: h, height: l } = n, c = Math.max(Math.min(Number(t), pe), Ae);
    if (!o || o === "auto" || r ? this.adaptCanvasToContainer() : o ? this.setCanvasBackstoreWidth(Number(o)) : this.setCanvasBackstoreWidth(c), n.set({ width: c }), (f = i.clipPath) == null || f.set({ width: c }), e) {
      const p = c / h, m = l * p;
      this.setResolutionHeight(m);
      return;
    }
    const { left: u, top: g } = this.getObjectDefaultCoords(n), d = i.getZoom();
    i.setViewportTransform([d, 0, 0, d, u, g]), this.centerMontageArea(), s || this.editor.historyManager.saveState(), i.fire("editor:resolution-width-changed", {
      width: c,
      preserveProportional: e,
      withoutSave: s,
      adaptCanvasToContainer: r
    });
  }
  /**
   * Устанавливаем внутреннюю высоту канваса (для экспорта)
   * @param height - высота канваса
   * @param options
   * @param options.preserveProportional - Сохранить пропорции
   * @param options.withoutSave - Не сохранять состояние
   * @param options.adaptCanvasToContainer - Адаптировать канвас к контейнеру
   * @fires editor:resolution-height-changed
   */
  setResolutionHeight(t, { preserveProportional: e, withoutSave: s, adaptCanvasToContainer: r } = {}) {
    var f;
    if (!t) return;
    const {
      canvas: i,
      montageArea: n,
      options: { canvasBackstoreHeight: o }
    } = this.editor, { width: h, height: l } = n, c = Math.max(Math.min(Number(t), me), Ee);
    if (!o || o === "auto" || r ? this.adaptCanvasToContainer() : o ? this.setCanvasBackstoreHeight(Number(o)) : this.setCanvasBackstoreHeight(c), n.set({ height: c }), (f = i.clipPath) == null || f.set({ height: c }), e) {
      const p = c / l, m = h * p;
      this.setResolutionWidth(m);
      return;
    }
    const { left: u, top: g } = this.getObjectDefaultCoords(n), d = i.getZoom();
    i.setViewportTransform([d, 0, 0, d, u, g]), this.centerMontageArea(), s || this.editor.historyManager.saveState(), i.fire("editor:resolution-height-changed", {
      height: c,
      preserveProportional: e,
      withoutSave: s,
      adaptCanvasToContainer: r
    });
  }
  /**
   * Центрирует монтажную область и ClipPath точно по центру канваса
   * и устанавливает правильный viewportTransform.
   */
  centerMontageArea() {
    var h;
    const { canvas: t, montageArea: e } = this.editor, s = t.getWidth(), r = t.getHeight(), i = t.getZoom(), n = new _(s / 2, r / 2);
    e.set({
      left: s / 2,
      top: r / 2
    }), (h = t.clipPath) == null || h.set({
      left: s / 2,
      top: r / 2
    }), t.renderAll();
    const o = t.viewportTransform;
    o[4] = s / 2 - n.x * i, o[5] = r / 2 - n.y * i, t.setViewportTransform(o), t.renderAll();
  }
  /**
   * Метод для получения координат объекта с учетом текущего зума
   * @param object - объект, координаты которого нужно получить
   * @returns координаты объекта
   */
  getObjectDefaultCoords(t) {
    const { canvas: e } = this.editor, s = t || e.getActiveObject();
    if (!s)
      return this.editor.errorManager.emitError({
        origin: "CanvasManager",
        method: "getObjectDefaultCoords",
        code: "NO_ACTIVE_OBJECT",
        message: "Не выбран объект для получения координат"
      }), { left: 0, top: 0 };
    const { width: r, height: i } = s, n = e.getZoom(), o = (r - r * n) / 2, h = (i - i * n) / 2;
    return { left: o, top: h };
  }
  /**
   * Устанавливаем ширину канваса в backstore (для экспорта)
   */
  setCanvasBackstoreWidth(t) {
    if (!t || typeof t != "number") return;
    const e = Math.max(Math.min(t, pe), Ae);
    this.editor.canvas.setDimensions({ width: e }, { backstoreOnly: !0 });
  }
  /**
   * Устанавливаем высоту канваса в backstore (для экспорта)
   * @param height
   */
  setCanvasBackstoreHeight(t) {
    if (!t || typeof t != "number") return;
    const e = Math.max(Math.min(t, me), Ee);
    this.editor.canvas.setDimensions({ height: e }, { backstoreOnly: !0 });
  }
  /**
   * Адаптирует размеры канваса к размерам контейнера редактора.
   * Устанавливает ширину и высоту канваса в зависимости от размеров контейнера
   * с учётом минимальных и максимальных значений.
   */
  adaptCanvasToContainer() {
    const { canvas: t } = this.editor, e = t.editorContainer, s = e.clientWidth, r = e.clientHeight, i = Math.max(Math.min(s, pe), Ae), n = Math.max(Math.min(r, me), Ee);
    console.log("adaptCanvasToContainer newWidth", i), console.log("adaptCanvasToContainer newHeight", n), t.setDimensions({ width: i, height: n }, { backstoreOnly: !0 });
  }
  /**
   * Обновляет размеры канваса и вписывает объекты в монтажную область.
   * Вызывается при изменении размеров контейнера редактора.
   * @fires editor:canvas-updated
   */
  updateCanvasAndFitObjects() {
    const {
      canvas: t,
      selectionManager: e,
      transformManager: s,
      montageArea: {
        width: r,
        height: i
      }
    } = this.editor;
    this.setResolutionWidth(r, { adaptCanvasToContainer: !0, withoutSave: !0 }), this.setResolutionHeight(i, { adaptCanvasToContainer: !0, withoutSave: !0 }), this.centerMontageArea(), e.selectAll(), s.fitObject({ fitAsOneObject: !0, withoutSave: !0 }), t.fire("editor:canvas-updated", {
      width: r,
      height: i
    });
  }
  /**
   * Заготовка.
   * Обновляет CSS-размеры канваса в зависимости от текущего зума, чтобы можно было скроллить вниз-вверх, влево-вправо.
   *
   * TODO: Сейчас изображение обрезается при зуме.
   * Нужно сделать зум по курсору мыши внутри монтажной области, и возможность перетаскивать канвас с зажатым пробелом.
   *
   * Метод нужно вызывать после zoomToPoint.
   *
   * @param zoom — текущее значение zoom (например, 1, 1.2, 2 и т.д.)
   */
  updateCssDimensionsForZoom(t) {
    const { canvas: e, montageArea: s } = this.editor, r = s.width * t, i = s.height * t, n = e.wrapperEl.parentNode;
    if (!(n instanceof HTMLElement)) return;
    const o = r <= n.clientWidth ? "100%" : r, h = i <= n.clientHeight ? "100%" : i;
    e.setDimensions(
      { width: o, height: h },
      { cssOnly: !0 }
    );
  }
  /**
   * Устанавливаем CSS ширину канваса для отображения
   * @param width
   * @fires editor:display-canvas-width-changed
   */
  setCanvasCSSWidth(t) {
    this.setDisplayDimension({
      element: "canvas",
      dimension: "width",
      value: t
    });
  }
  /**
   * Устанавливаем CSS высоту канваса для отображения
   * @param height
   * @fires editor:display-canvas-height-changed
   */
  setCanvasCSSHeight(t) {
    this.setDisplayDimension({
      element: "canvas",
      dimension: "height",
      value: t
    });
  }
  /**
   * Устанавливаем CSS ширину обертки канваса для отображения
   * @param width
   * @fires editor:display-wrapper-width-changed
   */
  setCanvasWrapperWidth(t) {
    this.setDisplayDimension({
      element: "wrapper",
      dimension: "width",
      value: t
    });
  }
  /**
   * Устанавливаем CSS высоту обертки канваса для отображения
   * @param height
   * @fires editor:display-wrapper-height-changed
   */
  setCanvasWrapperHeight(t) {
    this.setDisplayDimension({
      element: "wrapper",
      dimension: "height",
      value: t
    });
  }
  /**
   * Устанавливаем CSS ширину контейнера редактора для отображения
   * @param width
   * @fires editor:display-container-width-changed
   */
  setEditorContainerWidth(t) {
    this.setDisplayDimension({
      element: "container",
      dimension: "width",
      value: t
    });
  }
  /**
   * Устанавливаем CSS высоту контейнера редактора для отображения
   * @param height
   * @fires editor:display-container-height-changed
   */
  setEditorContainerHeight(t) {
    this.setDisplayDimension({
      element: "container",
      dimension: "height",
      value: t
    });
  }
  /**
   * Устанавливаем CSS ширину или высоту канваса для отображения
   * @param options
   * @param options.element - элемент, для которого устанавливаем размеры:
   * canvas (upper & lower), wrapper, container
   * @param options.dimension - размер, который нужно установить: width или height
   * @param options.value - значение размера (строка или число)
   * @fires editor:display-{element}-{dimension}-changed
   */
  setDisplayDimension({ element: t = "canvas", dimension: e, value: s } = {}) {
    if (!s) return;
    const { canvas: r, options: { editorContainer: i } } = this.editor, n = [];
    switch (t) {
      case "canvas":
        n.push(r.lowerCanvasEl, r.upperCanvasEl);
        break;
      case "wrapper":
        n.push(r.wrapperEl);
        break;
      case "container":
        n.push(i);
        break;
      default:
        n.push(r.lowerCanvasEl, r.upperCanvasEl);
    }
    const o = e === "width" ? "width" : "height";
    if (typeof s == "string") {
      n.forEach((l) => {
        l.style[o] = s;
      });
      return;
    }
    if (isNaN(s)) return;
    const h = `${s}px`;
    n.forEach((l) => {
      l.style[o] = h;
    }), r.fire(`editor:display-${t}-${o}-changed`, {
      element: t,
      value: s
    });
  }
  /**
   * Если изображение вписывается в допустимые значения, то масштабируем под него канвас
   * @param options
   * @param options.object - Объект с изображением, которое нужно масштабировать
   * @param options.withoutSave - Не сохранять состояние
   * @param options.preserveAspectRatio - Сохранять изначальные пропорции монтажной области
   * @fires editor:montage-area-scaled-to-image
   */
  scaleMontageAreaToImage({ object: t, preserveAspectRatio: e, withoutSave: s } = {}) {
    const {
      canvas: r,
      montageArea: i,
      transformManager: n,
      options: {
        montageAreaWidth: o,
        montageAreaHeight: h
      }
    } = this.editor, l = t || r.getActiveObject();
    if (!l || l.type !== "image" && l.format !== "svg") return;
    const { width: c, height: u } = l;
    let g = Math.min(c, pe), d = Math.min(u, me);
    if (e) {
      const {
        width: f,
        height: p
      } = i, m = c / f, v = u / p, C = Math.max(m, v);
      g = f * C, d = p * C;
    }
    this.setResolutionWidth(g, { withoutSave: !0 }), this.setResolutionHeight(d, { withoutSave: !0 }), (c > o || u > h) && n.calculateAndApplyDefaultZoom(), n.resetObject(l, { withoutSave: !0 }), r.centerObject(l), r.renderAll(), s || this.editor.historyManager.saveState(), r.fire("editor:montage-area-scaled-to-image", {
      object: l,
      width: g,
      height: d,
      preserveAspectRatio: e,
      withoutSave: s
    });
  }
  /**
   * Очистка холста
   * @fires editor:cleared
   */
  clearCanvas() {
    const { canvas: t, montageArea: e, historyManager: s } = this.editor;
    s.suspendHistory(), t.clear(), t.add(e), t.renderAll(), s.resumeHistory(), s.saveState(), t == null || t.fire("editor:cleared");
  }
  /**
   * Установка зума и масштаба для канваса и сброс трансформации всех объектов
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:default-scale-set
   */
  setDefaultScale({ withoutSave: t } = {}) {
    const {
      canvas: e,
      transformManager: s,
      historyManager: r,
      options: {
        montageAreaWidth: i,
        montageAreaHeight: n
      }
    } = this.editor;
    s.resetZoom(), this.setResolutionWidth(i, { withoutSave: !0 }), this.setResolutionHeight(n, { withoutSave: !0 }), e.renderAll(), s.resetObjects(), t || r.saveState(), e.fire("editor:default-scale-set");
  }
  /**
   * Получение всех объектов внутри монтажной области редактора
   * @returns массив объектов
   */
  getObjects() {
    const { canvas: t, montageArea: e, interactionBlocker: { overlayMask: s } } = this.editor;
    return t.getObjects().filter((i) => i.id !== e.id && i.id !== (s == null ? void 0 : s.id));
  }
}
class Qc {
  constructor({ editor: t }) {
    this.editor = t, this.options = t.options, this.minZoom = this.options.minZoom || Xc, this.maxZoom = this.options.maxZoom || Gc, this.defaultZoom = this.options.defaultScale, this.maxZoomFactor = this.options.maxZoomFactor;
  }
  /**
   * Метод рассчитывает и применяет зум по умолчанию для монтажной области редактора.
   * Зум рассчитывается исходя из размеров контейнера редактора и текущих размеров монтажной области.
   * Расчёт происходит таким образом, чтобы монтажная область визуально целиком помещалась в контейнер редактора.
   * Если scale не передан, то используется значение из options.defaultScale.
   * @param scale - Желаемый масштаб относительно размеров контейнера редактора.
   */
  calculateAndApplyDefaultZoom(t = this.options.defaultScale) {
    const { canvas: e } = this.editor, s = e.editorContainer, r = s.clientWidth, i = s.clientHeight, { width: n, height: o } = this.editor.montageArea, h = r / n * t, l = i / o * t;
    this.defaultZoom = Math.min(h, l);
    const { defaultZoom: c, maxZoomFactor: u, minZoom: g, maxZoom: d } = this;
    this.minZoom = Math.min(c / u, g), this.maxZoom = Math.max(c * u, d), this.setZoom();
  }
  /**
   * Увеличение/уменьшение масштаба
   * @param scale - Шаг зума
   * @param options - Координаты зума (по умолчанию центр канваса)
   * @param options.pointX - Координата X точки зума
   * @param options.pointY - Координата Y точки зума
   * @fires editor:zoom-changed
   * Если передавать координаты курсора, то нужно быть аккуратнее, так как юзер может выйти за пределы рабочей области
   */
  zoom(t = Zc, e = {}) {
    var g, d;
    if (!t) return;
    const { minZoom: s, maxZoom: r } = this, { canvas: i } = this.editor, n = i.getZoom(), o = i.getCenterPoint(), h = (g = e.pointX) != null ? g : o.x, l = (d = e.pointY) != null ? d : o.y, c = new _(h, l);
    let u = Number((n + Number(t)).toFixed(2));
    u > r && (u = r), u < s && (u = s), i.zoomToPoint(c, u), console.log({
      currentZoom: n,
      zoom: u,
      point: c
    }), i.fire("editor:zoom-changed", {
      currentZoom: i.getZoom(),
      zoom: u,
      point: c
    });
  }
  /**
   * Установка зума
   * @param zoom - Зум
   * @fires editor:zoom-changed
   */
  setZoom(t = this.defaultZoom) {
    const { minZoom: e, maxZoom: s } = this, { canvas: r } = this.editor, i = new _(r.getCenterPoint());
    let n = t;
    t > s && (n = s), t < e && (n = e), r.zoomToPoint(i, n), r.fire("editor:zoom-changed", {
      currentZoom: r.getZoom(),
      zoom: n,
      point: i
    });
  }
  /**
   * Сброс зума
   * @fires editor:zoom-changed
   */
  resetZoom() {
    const { canvas: t } = this.editor, e = new _(t.getCenterPoint());
    t.zoomToPoint(e, this.defaultZoom), this.editor.canvas.fire("editor:zoom-changed", {
      currentZoom: t.getZoom(),
      point: e
    });
  }
  /**
   * Поворот объекта на заданный угол
   * @param angle
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  rotate(t = Kc, { withoutSave: e } = {}) {
    const { canvas: s, historyManager: r } = this.editor, i = s.getActiveObject();
    if (!i) return;
    const n = i.angle + t;
    i.rotate(n), i.setCoords(), s.renderAll(), e || r.saveState(), s.fire("editor:object-rotated", {
      object: i,
      withoutSave: e,
      angle: n
    });
  }
  /**
   * Отразить по горизонтали
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-x
   */
  flipX({ withoutSave: t } = {}) {
    const { canvas: e, historyManager: s } = this.editor, r = e.getActiveObject();
    r && (r.flipX = !r.flipX, e.renderAll(), t || s.saveState(), e.fire("editor:object-flipped-x", {
      object: r,
      withoutSave: t
    }));
  }
  /**
   * Отразить по вертикали
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-y
   */
  flipY({ withoutSave: t } = {}) {
    const { canvas: e, historyManager: s } = this.editor, r = e.getActiveObject();
    r && (r.flipY = !r.flipY, e.renderAll(), t || s.saveState(), e.fire("editor:object-flipped-y", {
      object: r,
      withoutSave: t
    }));
  }
  /**
   * Установка прозрачности объекта
   * @param options
   * @param options.object - Объект, для которого нужно установить прозрачность
   * @param options.withoutSave - Не сохранять состояние
   * @param options.opacity - Прозрачность от 0 до 1
   * @fires editor:object-opacity-changed
   */
  setActiveObjectOpacity({
    object: t,
    opacity: e = 1,
    withoutSave: s
  } = {}) {
    const { canvas: r, historyManager: i } = this.editor, n = t || r.getActiveObject();
    n && (n instanceof q ? n.getObjects().forEach((o) => {
      o.set("opacity", e);
    }) : n.set("opacity", e), r.renderAll(), s || i.saveState(), r.fire("editor:object-opacity-changed", {
      object: n,
      opacity: e,
      withoutSave: s
    }));
  }
  /**
   * Масштабирование объекта
   * @param options
   * @param options.object - Объект с изображением, которое нужно масштабировать
   * @param options.type - Тип масштабирования
   * 'contain' - скейлит картинку, чтобы она вмещалась
   * 'cover' - скейлит картинку, чтобы она вписалась в размер канвас
   * @param options.withoutSave - Не сохранять состояние
   * @param options.fitAsOneObject - Масштабировать все объекты в активной группе как один объект
   * @fires editor:image-fitted
   */
  fitObject({
    object: t,
    type: e = this.options.scaleType,
    withoutSave: s,
    fitAsOneObject: r
  } = {}) {
    const { canvas: i, imageManager: n, historyManager: o } = this.editor, h = t || i.getActiveObject();
    if (h) {
      if (h.set("angle", 0), h instanceof q && !r) {
        const l = h.getObjects();
        i.discardActiveObject(), l.forEach((u) => {
          const g = n.calculateScaleFactor({ imageObject: u, scaleType: e });
          u.scale(g), i.centerObject(u);
        });
        const c = new q(l, { canvas: i });
        i.setActiveObject(c);
      } else {
        const l = n.calculateScaleFactor({
          imageObject: h,
          scaleType: e
        });
        h.scale(l), i.centerObject(h);
      }
      i.renderAll(), s || o.saveState(), i.fire("editor:object-fitted", {
        object: h,
        type: e,
        withoutSave: s,
        fitAsOneObject: r
      });
    }
  }
  /**
   * Установка дефолтного масштаба для всех объектов внутри монтажной области редактора
   */
  resetObjects() {
    this.editor.canvasManager.getObjects().forEach((t) => {
      this.resetObject(t);
    });
  }
  /**
   * Сброс масштаба объекта до дефолтного
   * @param object
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @param options.alwaysFitObject - вписывать объект в рабочую область даже если он меньше рабочей области
   * @fires editor:object-reset
   */
  resetObject(t, { alwaysFitObject: e = !1, withoutSave: s = !1 } = {}) {
    const {
      canvas: r,
      montageArea: i,
      imageManager: n,
      historyManager: o,
      options: { scaleType: h }
    } = this.editor, l = t || r.getActiveObject();
    if (!l || l.locked) return;
    if (o.suspendHistory(), l.type === "image" || l.format === "svg" || l.set({
      scaleX: 1,
      scaleY: 1,
      flipX: !1,
      flipY: !1,
      angle: 0
    }), e)
      this.fitObject({ object: l, withoutSave: !0, fitAsOneObject: !0 });
    else {
      const { width: u, height: g } = i, { width: d, height: f } = l, p = n.calculateScaleFactor({
        imageObject: l,
        scaleType: h
      });
      h === "contain" && p < 1 || h === "cover" && (d > u || f > g) ? this.fitObject({ object: l, withoutSave: !0, fitAsOneObject: !0 }) : l.set({ scaleX: 1, scaleY: 1 });
    }
    l.set({ flipX: !1, flipY: !1, angle: 0 }), r.centerObject(l), r.renderAll(), o.resumeHistory(), s || o.saveState(), r.fire("editor:object-reset", {
      object: l,
      withoutSave: s,
      alwaysFitObject: e
    });
  }
}
class $c {
  constructor({ editor: t }) {
    this.editor = t, this.isBlocked = !1, this.overlayMask = null, this._createOverlay();
  }
  /**
   * Создаёт overlay для блокировки монтажной области
   */
  _createOverlay() {
    const {
      historyManager: t,
      options: { overlayMaskColor: e = "rgba(0,0,0,0.5)" }
    } = this.editor;
    t.suspendHistory(), this.overlayMask = this.editor.shapeManager.addRectangle({
      fill: e,
      selectable: !1,
      evented: !0,
      hoverCursor: "not-allowed",
      hasBorders: !1,
      hasControls: !1,
      visible: !1,
      id: "overlay-mask"
    }, { withoutSelection: !0 }), t.resumeHistory();
  }
  /**
   * Обновляет размеры и позицию overlay, выносит его на передний план
   */
  refresh() {
    const { canvas: t, montageArea: e, historyManager: s } = this.editor;
    if (!e || !this.overlayMask) return;
    s.suspendHistory(), e.setCoords();
    const { left: r, top: i, width: n, height: o } = e.getBoundingRect();
    this.overlayMask.set({ left: r, top: i, width: n, height: o }), t.discardActiveObject(), this.editor.layerManager.bringToFront(this.overlayMask, { withoutSave: !0 }), s.resumeHistory();
  }
  /**
   * Выключает редактор:
   * - убирает все селекты, события мыши, скейл/драг–н–дроп
   * - делает все объекты не‑evented и не‑selectable
   * - делает видимым overlayMask поверх всех объектов в монтажной области
   */
  block() {
    if (this.isBlocked || !this.overlayMask) return;
    const { canvas: t, canvasManager: e, historyManager: s } = this.editor;
    s.suspendHistory(), this.isBlocked = !0, t.discardActiveObject(), t.selection = !1, t.skipTargetFind = !0, e.getObjects().forEach((r) => {
      r.evented = !1, r.selectable = !1;
    }), t.upperCanvasEl.style.pointerEvents = "none", t.lowerCanvasEl.style.pointerEvents = "none", this.overlayMask.visible = !0, this.refresh(), t.fire("editor:disabled"), s.resumeHistory();
  }
  /**
   * Включает редактор
   */
  unblock() {
    if (!this.isBlocked || !this.overlayMask) return;
    const { canvas: t, canvasManager: e, historyManager: s } = this.editor;
    s.suspendHistory(), this.isBlocked = !1, t.selection = !0, t.skipTargetFind = !1, e.getObjects().forEach((r) => {
      r.evented = !0, r.selectable = !0;
    }), t.upperCanvasEl.style.pointerEvents = "", t.lowerCanvasEl.style.pointerEvents = "", this.overlayMask.visible = !1, t.requestRenderAll(), t.fire("editor:enabled"), s.resumeHistory();
  }
}
class nr {
  constructor({ editor: t }) {
    this.editor = t;
  }
  /**
   * Поднять объект навверх по оси Z
   * @param object
   * @param options
   * @param options.withoutSave - Не сохранять действие в истории изменений
   * @fires editor:object-bring-to-front
   */
  bringToFront(t, { withoutSave: e } = {}) {
    const { canvas: s, historyManager: r } = this.editor;
    r.suspendHistory();
    const i = t || s.getActiveObject();
    i && (i instanceof q ? i.getObjects().forEach((n) => {
      s.bringObjectToFront(n);
    }) : s.bringObjectToFront(i), s.renderAll(), r.resumeHistory(), e || r.saveState(), s.fire("editor:object-bring-to-front", {
      object: i,
      withoutSave: e
    }));
  }
  /**
   * Поднять объект на один уровень вверх по оси Z
   * @param object
   * @param options
   * @param options.withoutSave - Не сохранять действие в истории изменений
   * @fires editor:object-bring-forward
   */
  bringForward(t, { withoutSave: e } = {}) {
    const { canvas: s, historyManager: r } = this.editor;
    r.suspendHistory();
    const i = t || s.getActiveObject();
    i && (i instanceof q ? nr._moveSelectionForward(s, i) : s.bringObjectForward(i), s.renderAll(), r.resumeHistory(), e || r.saveState(), s.fire("editor:object-bring-forward", {
      object: i,
      withoutSave: e
    }));
  }
  /**
   * Отправить объект на задний план по оси Z
   * @param object
   * @param options
   * @param options.withoutSave - Не сохранять действие в истории изменений
   * @fires editor:object-send-to-back
   */
  sendToBack(t, { withoutSave: e } = {}) {
    const {
      canvas: s,
      montageArea: r,
      historyManager: i,
      interactionBlocker: { overlayMask: n }
    } = this.editor;
    i.suspendHistory();
    const o = t || s.getActiveObject();
    if (o) {
      if (o instanceof q) {
        const h = o.getObjects();
        for (let l = h.length - 1; l >= 0; l -= 1)
          s.sendObjectToBack(h[l]);
      } else
        s.sendObjectToBack(o);
      s.sendObjectToBack(r), n && s.sendObjectToBack(n), s.renderAll(), i.resumeHistory(), e || i.saveState(), s.fire("editor:object-send-to-back", {
        object: o,
        withoutSave: e
      });
    }
  }
  /**
  * Отправить объект на один уровень ниже по оси Z
  * @param object
  * @param options
  * @param options.withoutSave - Не сохранять действие в истории изменений
  */
  sendBackwards(t, { withoutSave: e } = {}) {
    const {
      canvas: s,
      montageArea: r,
      historyManager: i,
      interactionBlocker: { overlayMask: n }
    } = this.editor;
    i.suspendHistory();
    const o = t || s.getActiveObject();
    o && (o instanceof q ? nr._moveSelectionBackwards(s, o) : s.sendObjectBackwards(o), s.sendObjectToBack(r), n && s.sendObjectToBack(n), s.renderAll(), i.resumeHistory(), e || i.saveState(), s.fire("editor:object-send-backwards", {
      object: o,
      withoutSave: e
    }));
  }
  /**
   * Сдвигает выделенные объекты на один уровень вверх относительно ближайшего верхнего объекта
   * @param canvas - экземпляр холста
   * @param activeSelection - активное выделение
   */
  static _moveSelectionForward(t, e) {
    const s = t.getObjects(), r = e.getObjects(), i = r.map((o) => s.indexOf(o));
    let n = -1;
    for (let o = 0; o < s.length; o += 1) {
      const h = s[o];
      if (!r.includes(h) && i.some((l) => o > l)) {
        n = o;
        break;
      }
    }
    n !== -1 && r.map((h) => ({ obj: h, index: s.indexOf(h) })).sort((h, l) => l.index - h.index).forEach((h) => {
      const l = s.indexOf(h.obj);
      l < n && (t.moveObjectTo(h.obj, n), n = l);
    });
  }
  /**
   * Сдвигает выделенные объекты на один уровень вниз относительно ближайшего нижнего объекта
   * @param canvas - экземпляр холста
   * @param activeSelection - активное выделение
   */
  static _moveSelectionBackwards(t, e) {
    const s = t.getObjects(), r = e.getObjects(), i = Math.min(...r.map((n) => s.indexOf(n)));
    for (let n = r.length - 1; n >= 0; n -= 1)
      t.moveObjectTo(r[n], i - 1);
  }
}
class Jc {
  /**
   * Менеджер фигур для редактора.
   * @param options - Опции и настройки менеджера фигур.
   * @param options.editor - Ссылка на экземпляр редактора.
   */
  constructor({ editor: t }) {
    this.editor = t;
  }
  /**
   * Добавление прямоугольника
   * @param shapeOptions
   * @param shapeOptions.id - Уникальный идентификатор фигуры
   * @param shapeOptions.left - Координата X
   * @param shapeOptions.top - Координата Y
   * @param shapeOptions.width - Ширина
   * @param shapeOptions.height - Высота
   * @param shapeOptions.fill - Цвет заливки
   * @param shapeOptions.rest - Остальные параметры
   *
   * @param flags - Флаги для управления поведением
   * @param flags.withoutSelection - Не выделять объект
   * @param flags.withoutAdding - Не добавлять объект в canvas
   */
  addRectangle(c = {}, { withoutSelection: h, withoutAdding: l } = {}) {
    var u = c, {
      id: t = `rect-${Ut()}`,
      left: e,
      top: s,
      width: r = 100,
      height: i = 100,
      fill: n = "blue"
    } = u, o = gs(u, [
      "id",
      "left",
      "top",
      "width",
      "height",
      "fill"
    ]);
    const { canvas: g } = this.editor, d = new St(J({
      id: t,
      left: e,
      top: s,
      width: r,
      height: i,
      fill: n
    }, o));
    return !e && !s && g.centerObject(d), l || (g.add(d), h || g.setActiveObject(d), g.renderAll()), d;
  }
  /**
   * Добавление круга
   * @param shapeOptions
   * @param shapeOptions.id - Уникальный идентификатор фигуры
   * @param shapeOptions.left - Координата X
   * @param shapeOptions.top - Координата Y
   * @param shapeOptions.radius - Радиус
   * @param shapeOptions.fill - Цвет заливки
   * @param shapeOptions.originX - Ориентация по X
   * @param shapeOptions.originY - Ориентация по Y
   * @param shapeOptions.rest - Остальные параметры
   *
   * @param flags - Флаги для управления поведением
   * @param flags.withoutSelection - Не выделять объект
   * @param flags.withoutAdding - Не добавлять объект в canvas
   */
  addCircle(l = {}, { withoutSelection: o, withoutAdding: h } = {}) {
    var c = l, {
      id: t = `circle-${Ut()}`,
      left: e,
      top: s,
      radius: r = 50,
      fill: i = "green"
    } = c, n = gs(c, [
      "id",
      "left",
      "top",
      "radius",
      "fill"
    ]);
    const { canvas: u } = this.editor, g = new Et(J({
      id: t,
      left: e,
      top: s,
      fill: i,
      radius: r
    }, n));
    return !e && !s && u.centerObject(g), h || (u.add(g), o || u.setActiveObject(g), u.renderAll()), g;
  }
  /**
   * Добавление треугольника
   * @param shapeOptions
   * @param shapeOptions.id - Уникальный идентификатор фигуры
   * @param shapeOptions.left - Координата X
   * @param shapeOptions.top - Координата Y
   * @param shapeOptions.width - Ширина
   * @param shapeOptions.height - Высота
   * @param shapeOptions.originX - Ориентация по X
   * @param shapeOptions.originY - Ориентация по Y
   * @param shapeOptions.fill - Цвет заливки
   * @param shapeOptions.rest - Остальные параметры
   *
   * @param flags - Флаги для управления поведением
   * @param flags.withoutSelection - Не выделять объект
   * @param flags.withoutAdding - Не добавлять объект в canvas
   */
  addTriangle(c = {}, { withoutSelection: h, withoutAdding: l } = {}) {
    var u = c, {
      id: t = `triangle-${Ut()}`,
      left: e,
      top: s,
      width: r = 100,
      height: i = 100,
      fill: n = "yellow"
    } = u, o = gs(u, [
      "id",
      "left",
      "top",
      "width",
      "height",
      "fill"
    ]);
    const { canvas: g } = this.editor, d = new te(J({
      id: t,
      left: e,
      top: s,
      fill: n,
      width: r,
      height: i
    }, o));
    return !e && !s && g.centerObject(d), l || (g.add(d), h || g.setActiveObject(d), g.renderAll()), d;
  }
}
class tu {
  /**
   * @param options
   * @param options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor: t }) {
    this.editor = t, this.clipboard = null;
  }
  /**
   * Копирование объекта
   * @fires editor:object-copied
   */
  copy() {
    const { canvas: t, errorManager: e } = this.editor, s = t.getActiveObject();
    if (!s) return;
    if (typeof ClipboardItem == "undefined" || !navigator.clipboard) {
      e.emitWarning({
        origin: "ClipboardManager",
        method: "copy",
        code: "CLIPBOARD_NOT_SUPPORTED",
        // eslint-disable-next-line max-len
        message: "ClipboardManager. navigator.clipboard не поддерживается в этом браузере или отсутствует соединение по HTTPS-протоколу."
      }), this._cloneAndFire(t, s);
      return;
    }
    if (s.type !== "image") {
      const g = `application/image-editor:${JSON.stringify(s.toObject(["format"]))}`;
      navigator.clipboard.writeText(g).catch((d) => {
        e.emitWarning({
          origin: "ClipboardManager",
          method: "copy",
          code: "CLIPBOARD_WRITE_TEXT_FAILED",
          message: `Ошибка записи текстового объекта в буфер обмена: ${d.message}`,
          data: d
        });
      }), this._cloneAndFire(t, s);
      return;
    }
    const i = s.toCanvasElement().toDataURL(), n = i.slice(5).split(";")[0], o = i.split(",")[1], h = atob(o), l = new Uint8Array(h.length);
    for (let g = 0; g < h.length; g += 1)
      l[g] = h.charCodeAt(g);
    const c = new Blob([l.buffer], { type: n }), u = new ClipboardItem({ [n]: c });
    navigator.clipboard.write([u]).catch((g) => {
      e.emitWarning({
        origin: "ClipboardManager",
        method: "copy",
        code: "CLIPBOARD_WRITE_IMAGE_FAILED",
        message: `Ошибка записи изображения в буфер обмена: ${g.message}`
      });
    }), this._cloneAndFire(t, s);
  }
  /**
   * Клонирует объект и вызывает событие 'editor:object-copied'.
   * @param canvas - экземпляр canvas
   * @param object - активный объект
   */
  _cloneAndFire(t, e) {
    e.clone(["format"]).then((s) => {
      this.clipboard = s, t.fire("editor:object-copied", { object: s });
    }).catch((s) => {
      this.editor.errorManager.emitError({
        origin: "ClipboardManager",
        method: "_cloneAndFire",
        code: "CLONE_FAILED",
        message: "Ошибка клонирования объекта",
        data: s
      });
    });
  }
  /**
   * Обработчик вставки объекта или изображения из буфера обмена.
   * @param event — объект события
   * @param event.clipboardData — данные из буфера обмена
   * @param event.clipboardData.items — элементы буфера обмена
   */
  handlePasteEvent({ clipboardData: t }) {
    var n;
    if (!((n = t == null ? void 0 : t.items) != null && n.length)) return;
    const { imageManager: e } = this.editor, { items: s } = t, r = s[s.length - 1];
    if (r.type !== "text/html") {
      const o = r.getAsFile();
      if (!o) return;
      const h = new FileReader();
      h.onload = (l) => {
        l.target && this.editor.imageManager.importImage({ source: l.target.result });
      }, h.readAsDataURL(o);
      return;
    }
    const i = t.getData("text/html");
    if (i) {
      const l = new DOMParser().parseFromString(i, "text/html").querySelector("img");
      if (l != null && l.src) {
        e.importImage({ source: l.src });
        return;
      }
    }
    this.paste();
  }
  /**
   * Вставка объекта
   * @fires editor:object-pasted
   */
  paste() {
    return R(this, null, function* () {
      const { canvas: t } = this.editor;
      if (!this.clipboard) return;
      const e = yield this.clipboard.clone(["format"]);
      t.discardActiveObject(), e.set({
        id: `${e.type}-${Ut()}`,
        left: e.left + 10,
        top: e.top + 10,
        evented: !0
      }), e instanceof q ? (e.canvas = t, e.forEachObject((s) => {
        t.add(s);
      })) : t.add(e), t.setActiveObject(e), t.requestRenderAll(), t.fire("editor:object-pasted", { object: e });
    });
  }
}
class or {
  constructor({ editor: t }) {
    this.editor = t;
  }
  /**
   * Блокирует объект (или группу объектов) на канвасе
   * @param options
   * @param options.object - объект, который нужно заблокировать
   * @param options.skipInnerObjects - не блокировать внутренние объекты
   * @param options.withoutSave - не сохранять состояние
   * @fires editor:object-locked
   */
  lockObject({ object: t, skipInnerObjects: e, withoutSave: s } = {}) {
    const { canvas: r, historyManager: i } = this.editor, n = t || r.getActiveObject();
    if (!n || n.locked) return;
    const o = {
      lockMovementX: !0,
      lockMovementY: !0,
      lockRotation: !0,
      lockScalingX: !0,
      lockScalingY: !0,
      lockSkewingX: !0,
      lockSkewingY: !0,
      locked: !0
    };
    n.set(o), !e && or._isGroupOrSelection(n) && n.getObjects().forEach((l) => {
      l.set(o);
    }), r.renderAll(), s || i.saveState(), r.fire("editor:object-locked", {
      object: n,
      skipInnerObjects: e,
      withoutSave: s
    });
  }
  /**
   * Разблокирует объект (или группу объектов) на канвасе
   * @param options
   * @param options.object - объект, который нужно разблокировать
   * @param options.withoutSave - не сохранять состояние в истории изменений
   * @fires editor:object-unlocked
   */
  unlockObject({ object: t, withoutSave: e } = {}) {
    const { canvas: s, historyManager: r } = this.editor, i = t || s.getActiveObject();
    if (!i) return;
    const n = {
      lockMovementX: !1,
      lockMovementY: !1,
      lockRotation: !1,
      lockScalingX: !1,
      lockScalingY: !1,
      lockSkewingX: !1,
      lockSkewingY: !1,
      locked: !1
    };
    i.set(n), or._isGroupOrSelection(i) && i.getObjects().forEach((o) => {
      o.set(n);
    }), s.renderAll(), e || r.saveState(), s.fire("editor:object-unlocked", {
      object: i,
      withoutSave: e
    });
  }
  static _isGroupOrSelection(t) {
    return t instanceof q || t instanceof mt;
  }
}
class eu {
  constructor({ editor: t }) {
    this.editor = t;
  }
  /**
   * Группировка объектов
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @param options.object - массив объектов для группировки
   * @fires editor:objects-grouped
   */
  group({
    object: t,
    withoutSave: e
  } = {}) {
    const { canvas: s, historyManager: r } = this.editor;
    r.suspendHistory();
    const i = t || s.getActiveObject();
    if (!i || !(i instanceof q)) return;
    const n = i.getObjects(), o = new mt(n);
    n.forEach((h) => s.remove(h)), o.set("id", `${o.type}-${Ut()}`), s.add(o), s.setActiveObject(o), s.renderAll(), r.resumeHistory(), e || r.saveState(), s.fire("editor:objects-grouped", {
      object: i,
      group: o,
      withoutSave: e
    });
  }
  /**
   * Разгруппировка объектов
   * @param options
   * @param options.object - объект для разгруппировки
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:objects-ungrouped
   */
  ungroup({
    object: t,
    withoutSave: e
  } = {}) {
    const { canvas: s, historyManager: r } = this.editor;
    r.suspendHistory();
    const i = t || s.getActiveObject();
    if (!(i instanceof mt)) return;
    const n = i.removeAll();
    s.remove(i), n.forEach((h) => s.add(h));
    const o = new q(n, {
      canvas: s
    });
    s.setActiveObject(o), s.renderAll(), r.resumeHistory(), e || r.saveState(), s.fire("editor:objects-ungrouped", {
      object: i,
      selection: o,
      withoutSave: e
    });
  }
}
class su {
  constructor({ editor: t }) {
    this.editor = t;
  }
  /**
   * Выделить все объекты
   * @fires editor:all-objects-selected
   */
  selectAll() {
    const { canvas: t, canvasManager: e, objectLockManager: s } = this.editor;
    t.discardActiveObject();
    const r = e.getObjects(), i = r.some((o) => o.locked), n = r.length > 1 ? new q(e.getObjects(), { canvas: t }) : r[0];
    i && s.lockObject({ object: n, skipInnerObjects: !0, withoutSave: !0 }), t.setActiveObject(n), t.requestRenderAll(), t.fire("editor:all-objects-selected", { selected: n });
  }
}
class ru {
  constructor({ editor: t }) {
    this.editor = t;
  }
  /**
   * Удалить выбранные объекты
   * @param options
   * @param options.objects - массив объектов для удаления
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:objects-deleted
   */
  deleteSelectedObjects({
    objects: t,
    withoutSave: e
  } = {}) {
    const { canvas: s, historyManager: r, groupingManager: i } = this.editor, n = (t || s.getActiveObjects()).filter((o) => !o.locked);
    n != null && n.length && (r.suspendHistory(), n.forEach((o) => {
      if (o.type === "group" && o.format !== "svg") {
        i.ungroup({ object: o, withoutSave: e }), this.deleteSelectedObjects();
        return;
      }
      s.remove(o);
    }), s.discardActiveObject(), s.renderAll(), r.resumeHistory(), e || r.saveState(), s.fire("editor:objects-deleted", {
      objects: n,
      withoutSave: e
    }));
  }
}
const iu = {
  IMAGE_MANAGER: {
    /**
     * Некорректный Content-Type изображения
     */
    INVALID_CONTENT_TYPE: "INVALID_CONTENT_TYPE",
    /**
     * Некорректный тип источника изображения
     */
    INVALID_SOURCE_TYPE: "INVALID_SOURCE_TYPE",
    /**
     * Ошибка при загрузке изображения
     */
    IMPORT_FAILED: "IMPORT_FAILED",
    /**
     * Предупреждение, что изображение слишком большое, и оно будет уменьшено
     */
    IMAGE_RESIZE_WARNING: "IMAGE_RESIZE_WARNING",
    /**
     * Не выбран объект для экспорта
     */
    NO_OBJECT_SELECTED: "NO_OBJECT_SELECTED",
    /**
     * Ошибка при экспорте изображения
     */
    IMAGE_EXPORT_FAILED: "IMAGE_EXPORT_FAILED"
  },
  /**
   * Коды ошибок и предупреждений для ClipboardManager.
   */
  CLIPBOARD_MANAGER: {
    /**
     * Буфер обмена не поддерживается в браузере или отсутствует HTTPS-соединение.
     */
    CLIPBOARD_NOT_SUPPORTED: "CLIPBOARD_NOT_SUPPORTED",
    /**
     * Ошибка записи текстового объекта в буфер обмена.
     */
    CLIPBOARD_WRITE_TEXT_FAILED: "CLIPBOARD_WRITE_TEXT_FAILED",
    /**
     * Ошибка записи изображения в буфер обмена.
     */
    CLIPBOARD_WRITE_IMAGE_FAILED: "CLIPBOARD_WRITE_IMAGE_FAILED",
    /**
     * Ошибка клонирования объекта.
     */
    CLONE_FAILED: "CLONE_FAILED"
  },
  /**
   * Коды ошибок и предупреждений для CanvasManager.
   */
  CANVAS_MANAGER: {
    /**
     * Ошибка при получении активного объекта.
     */
    NO_ACTIVE_OBJECT: "NO_ACTIVE_OBJECT"
  },
  HISTORY_MANAGER: {
    UNDO_ERROR: "UNDO_ERROR",
    REDO_ERROR: "REDO_ERROR"
  }
};
class ar {
  constructor({ editor: t }) {
    this._buffer = [], this.editor = t;
  }
  /**
   * Возвращает буфер с ошибками и предупреждениями
   */
  get buffer() {
    return this._buffer;
  }
  /**
   * Очищает буфер ошибок и предупреждений
   */
  cleanBuffer() {
    this._buffer.length = 0;
  }
  /**
   * Эмитит событие ошибки через fabricjs
   * @param options
   * @param options.origin — источник ошибки (по умолчанию 'ImageEditor')
   * @param options.method — метод, вызвавший ошибку (по умолчанию 'Unknown Method')
   * @param options.code — код ошибки (из errorCodes)
   * @param options.data — доп. данные (опционально)
   * @param options.message — текст ошибки (опционально, если не передан, то используется код ошибки)
   * @fires editor:error
   */
  emitError({ origin: t = "ImageEditor", method: e = "Unknown Method", code: s, data: r, message: i }) {
    if (!ar.isValidErrorCode(s)) {
      console.warn("Неизвестный код ошибки: ", { code: s, origin: t, method: e });
      return;
    }
    if (!s) return;
    const n = i || s;
    console.error(`${t}. ${e}. ${s}. ${n}`, r);
    const o = {
      code: s,
      origin: t,
      method: e,
      message: n,
      data: r
    };
    this._buffer.push(J({
      type: "editor:error"
    }, o)), this.editor.canvas.fire("editor:error", o);
  }
  /**
   * Эмитит предупреждение через fabricjs
   * @param options
   * @param options.origin — источник предупреждения (по умолчанию 'ImageEditor')
   * @param options.method — метод, вызвавший предупреждение (по умолчанию 'Unknown Method')
   * @param ptions.code — код предупреждения (из errorCodes)
   * @param options.data — доп. данные (опционально)
   * @param options.message — текст предупреждения (опционально, если не передан, то используется код предупреждения)
   * @fires editor:warning
   */
  emitWarning({ origin: t = "ImageEditor", method: e = "Unknown Method", code: s, message: r, data: i }) {
    if (!ar.isValidErrorCode(s)) {
      console.warn("Неизвестный код предупреждения: ", { code: s, origin: t, method: e });
      return;
    }
    const n = r || s;
    console.warn(`${t}. ${e}. ${s}. ${n}`, i);
    const o = {
      code: s,
      origin: t,
      method: e,
      message: n,
      data: i
    };
    this._buffer.push(J({
      type: "editor:warning"
    }, o)), this.editor.canvas.fire("editor:warning", o);
  }
  /**
   * Проверяет, является ли код ошибки или предупреждения допустимым
   * @param code - код ошибки или предупреждения
   * @returns true, если код допустим, иначе false
   */
  static isValidErrorCode(t) {
    return t ? Object.values(iu).some((e) => Object.values(e).includes(t)) : !1;
  }
}
class Vi {
  /**
   * Конструктор класса ImageEditor.
   * @param canvasId - идентификатор канваса, в котором будет создан редактор
   * @param options - опции и настройки редактора
   */
  constructor(t, e) {
    this.options = e, this.containerId = t, this.editorId = `${t}-${Ut()}`, this.clipboard = null, this.init();
  }
  /**
   * Инициализация редактора.
   * Создаёт все необходимые менеджеры и загружает начальное состояние.
   * @fires editor:ready
   */
  init() {
    return R(this, null, function* () {
      const {
        editorContainerWidth: t,
        editorContainerHeight: e,
        canvasWrapperWidth: s,
        canvasWrapperHeight: r,
        canvasCSSWidth: i,
        canvasCSSHeight: n,
        initialImage: o,
        initialStateJSON: h,
        scaleType: l,
        _onReadyCallback: c
      } = this.options;
      if (yc.apply(), this.canvas = new ii(this.containerId, this.options), this.moduleLoader = new hc(), this.workerManager = new cc(), this.errorManager = new ar({ editor: this }), this.historyManager = new Uc({ editor: this }), this.toolbar = new Oc({ editor: this }), this.transformManager = new Qc({ editor: this }), this.canvasManager = new qc({ editor: this }), this.imageManager = new Bt({ editor: this }), this.layerManager = new nr({ editor: this }), this.shapeManager = new Jc({ editor: this }), this.interactionBlocker = new $c({ editor: this }), this.clipboardManager = new tu({ editor: this }), this.objectLockManager = new or({ editor: this }), this.groupingManager = new eu({ editor: this }), this.selectionManager = new su({ editor: this }), this.deletionManager = new ru({ editor: this }), this._createMontageArea(), this._createClippingArea(), this.listeners = new Je({ editor: this, options: this.options }), this.canvasManager.setEditorContainerWidth(t), this.canvasManager.setEditorContainerHeight(e), this.canvasManager.setCanvasWrapperWidth(s), this.canvasManager.setCanvasWrapperHeight(r), this.canvasManager.setCanvasCSSWidth(i), this.canvasManager.setCanvasCSSHeight(n), o != null && o.source) {
        const {
          source: u,
          scale: g = `image-${l}`,
          withoutSave: d = !0
        } = o;
        yield this.imageManager.importImage({ source: u, scale: g, withoutSave: d });
      } else
        this.canvasManager.setDefaultScale({ withoutSave: !0 });
      h && this.historyManager.loadStateFromFullState(h), this.historyManager.saveState(), console.log("editor:ready"), this.canvas.fire("editor:ready", this), typeof c == "function" && c(this);
    });
  }
  /**
   * Создаёт монтажную область
   */
  _createMontageArea() {
    const {
      montageAreaWidth: t,
      montageAreaHeight: e
    } = this.options;
    this.montageArea = this.shapeManager.addRectangle({
      width: t,
      height: e,
      fill: Vi._createMosaicPattern(),
      stroke: null,
      strokeWidth: 0,
      selectable: !1,
      hasBorders: !1,
      hasControls: !1,
      evented: !1,
      id: "montage-area",
      originX: "center",
      originY: "center",
      objectCaching: !1,
      noScaleCache: !0
    }, { withoutSelection: !0 });
  }
  /**
   * Создаёт область клиппинга
   */
  _createClippingArea() {
    const {
      montageAreaWidth: t,
      montageAreaHeight: e
    } = this.options;
    this.canvas.clipPath = this.shapeManager.addRectangle({
      id: "area-clip",
      width: t,
      height: e,
      stroke: null,
      strokeWidth: 0,
      hasBorders: !1,
      hasControls: !1,
      selectable: !1,
      evented: !1,
      originX: "center",
      originY: "center"
    }, { withoutSelection: !0, withoutAdding: !0 });
  }
  /**
   * Метод для удаления редактора и всех слушателей.
   */
  destroy() {
    this.listeners.destroy(), this.toolbar.destroy(), this.canvas.dispose(), this.workerManager.worker.terminate(), this.imageManager.revokeBlobUrls(), this.errorManager.cleanBuffer();
  }
  /**
   * Создает паттерн мозаики.
   * @returns паттерн мозаики
   */
  static _createMosaicPattern() {
    const t = document.createElement("canvas");
    t.width = 20, t.height = 20;
    const e = t.getContext("2d");
    return e.fillStyle = "#ddd", e.fillRect(0, 0, 40, 40), e.fillStyle = "#ccc", e.fillRect(0, 0, 10, 10), e.fillRect(10, 10, 10, 10), new Ws({
      source: t,
      repeat: "repeat"
    });
  }
}
const nu = {
  /**
   * Опции редактора
   */
  preserveObjectStacking: !0,
  controlsAboveOverlay: !0,
  centeredRotation: !0,
  /*
   * Кастомные опции
   */
  montageAreaWidth: 512,
  montageAreaHeight: 512,
  canvasBackstoreWidth: "auto",
  canvasBackstoreHeight: "auto",
  canvasCSSWidth: "100%",
  canvasCSSHeight: "100%",
  canvasWrapperWidth: "100%",
  canvasWrapperHeight: "100%",
  editorContainerWidth: "fit-content",
  editorContainerHeight: "100%",
  maxHistoryLength: 50,
  scaleType: "contain",
  acceptContentTypes: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/svg+xml",
    "image/webp"
  ],
  showToolbar: !0,
  toolbar: {
    lockedActions: [{
      name: "Разблокировать",
      handle: "unlock"
    }],
    actions: [
      {
        name: "Создать копию",
        handle: "copyPaste"
      },
      {
        name: "Заблокировать",
        handle: "lock"
      },
      {
        name: "На передний план",
        handle: "bringToFront"
      },
      {
        name: "На задний план",
        handle: "sendToBack"
      },
      {
        name: "На один уровень вверх",
        handle: "bringForward"
      },
      {
        name: "На один уровень вниз",
        handle: "sendBackwards"
      },
      {
        name: "Удалить",
        handle: "delete"
      }
    ]
  },
  initialStateJSON: null,
  initialImage: null,
  defaultScale: 0.5,
  minZoom: 0.1,
  maxZoom: 2,
  maxZoomFactor: 2,
  zoomRatio: 0.1,
  overlayMaskColor: "rgba(136, 136, 136, 0.6)",
  /*
   * Настройки слушателей событий
   */
  adaptCanvasToContainerOnResize: !0,
  bringToFrontOnSelection: !1,
  mouseWheelZooming: !0,
  canvasDragging: !0,
  copyObjectsByHotkey: !0,
  pasteImageFromClipboard: !0,
  undoRedoByHotKeys: !0,
  selectAllByHotkey: !0,
  deleteObjectsByHotkey: !0,
  resetObjectFitByDoubleClick: !0
};
function hu(a, t = {}) {
  const e = J(J({}, nu), t), s = document.getElementById(a);
  if (!s)
    return Promise.reject(new Error(`Контейнер с ID "${a}" не найден.`));
  const r = document.createElement("canvas");
  return r.id = `${a}-canvas`, s.appendChild(r), e.editorContainer = s, new Promise((i) => {
    e._onReadyCallback = i;
    const n = new Vi(r.id, e);
    window[a] = n;
  });
}
export {
  au as c,
  Wc as g,
  hu as i
};
//# sourceMappingURL=main-C-4719Cz.js.map
