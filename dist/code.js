"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // src/model.ts
  var HEX = /^#[\da-f]{6}$/i;
  function validHex(value) {
    return typeof value === "string" && HEX.test(value);
  }
  function toHex(c) {
    return "#" + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function toRGB(hex) {
    if (!validHex(hex)) throw Error("\u989C\u8272\u5FC5\u987B\u662F #RRGGBB \u683C\u5F0F");
    return { r: parseInt(hex.slice(1, 3), 16) / 255, g: parseInt(hex.slice(3, 5), 16) / 255, b: parseInt(hex.slice(5, 7), 16) / 255 };
  }
  function uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  var presets = [
    ["\u7ECF\u5178\u84DD", "#2563EB", "#F8FAFC", "#FFFFFF", "#172033"],
    ["\u5348\u591C\u84DD", "#60A5FA", "#0F172A", "#1E293B", "#F1F5F9"],
    ["\u68EE\u6797", "#16856B", "#F1F8F4", "#FFFFFF", "#163C31"],
    ["\u8584\u8377", "#0D9488", "#ECFDF5", "#FFFFFF", "#134E4A"],
    ["\u7D2B\u7F57\u5170", "#7C3AED", "#F5F3FF", "#FFFFFF", "#2E1065"],
    ["\u85B0\u8863\u8349", "#A78BFA", "#1E1730", "#302444", "#F5F3FF"],
    ["\u73AB\u7470", "#E11D48", "#FFF1F2", "#FFFFFF", "#4C0519"],
    ["\u6A31\u82B1", "#DB2777", "#FDF2F8", "#FFFFFF", "#500724"],
    ["\u6696\u6A59", "#EA580C", "#FFF7ED", "#FFFFFF", "#431407"],
    ["\u7425\u73C0", "#D97706", "#FFFBEB", "#FFFFFF", "#451A03"],
    ["\u6D77\u6D0B", "#0284C7", "#F0F9FF", "#FFFFFF", "#082F49"],
    ["\u51B0\u5DDD", "#0891B2", "#ECFEFF", "#FFFFFF", "#164E63"],
    ["\u9752\u67E0", "#4D7C0F", "#F7FEE7", "#FFFFFF", "#1A2E05"],
    ["\u6A44\u6984", "#65743A", "#F7F8F0", "#FFFFFF", "#293214"],
    ["\u5496\u5561", "#916345", "#FAF5F0", "#FFFFFF", "#38251B"],
    ["\u6C99\u4E18", "#A17843", "#FBF7EF", "#FFFFFF", "#40301E"],
    ["\u77F3\u58A8", "#52525B", "#FAFAFA", "#FFFFFF", "#18181B"],
    ["\u6781\u591C", "#A1A1AA", "#09090B", "#18181B", "#FAFAFA"],
    ["\u975B\u9752", "#4F46E5", "#EEF2FF", "#FFFFFF", "#1E1B4B"],
    ["\u73CA\u745A", "#E76F51", "#FFF5F1", "#FFFFFF", "#4A261D"],
    ["\u8461\u8404", "#9333EA", "#FAF5FF", "#FFFFFF", "#3B0764"],
    ["\u6DF1\u6D77", "#22D3EE", "#083344", "#164E63", "#ECFEFF"],
    ["\u9152\u7EA2", "#BE123C", "#FFF1F2", "#FFFFFF", "#4C0519"],
    ["\u677E\u67CF", "#34D399", "#052E26", "#064E3B", "#ECFDF5"]
  ];
  function emptyLibrary() {
    return { version: 1, tokens: [], mappings: [], themes: [] };
  }
  function role(source, roles) {
    const { r, g, b } = toRGB(source);
    const hi = Math.max(r, g, b), lo = Math.min(r, g, b), lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (hi - lo > 0.18) return "accent";
    if (roles.includes("\u6587\u5B57") && lum < 0.65) return "text";
    if (lum > 0.95) return "surface";
    if (lum > 0.82) return "background";
    if (lum < 0.3) return "text";
    return "border";
  }
  function extendLibrary(lib, colors) {
    const next = structuredCloneSafe(lib);
    for (const color of colors) if (!next.mappings.some((m) => m.source === color.source)) {
      const baseId = "c" + color.source.slice(1).toLowerCase();
      let id = baseId;
      let suffix = 1;
      while (next.tokens.some((t) => t.id === id)) id = baseId + "-" + suffix++;
      const semantic = role(color.source, color.roles);
      next.tokens.push({ id, name: { accent: "\u54C1\u724C / \u5F3A\u8C03", text: "\u6587\u5B57 / \u4E3B\u8981", surface: "\u8868\u9762 / \u5361\u7247", background: "\u80CC\u666F / \u753B\u5E03", border: "\u8FB9\u6846 / \u6B21\u8981" }[semantic] + " " + color.source });
      next.mappings.push({ source: color.source, tokenId: id });
      for (const theme of next.themes) {
        const preset = presets.find((p) => p[0] === theme.name);
        theme.colors[id] = preset ? { accent: preset[1], background: preset[2], surface: preset[3], text: preset[4], border: mix(preset[3], preset[4], 0.2) }[semantic] : color.source;
      }
    }
    if (!next.themes.length) next.themes = presets.map((p) => ({ id: uid(), name: p[0], colors: Object.fromEntries(next.tokens.map((t) => {
      var _a;
      const c = ((_a = next.mappings.find((m) => m.tokenId === t.id)) == null ? void 0 : _a.source) || "#000000";
      const cr = colors.find((v) => v.source === c);
      const kind = role(c, (cr == null ? void 0 : cr.roles) || []);
      return [t.id, { accent: p[1], background: p[2], surface: p[3], text: p[4], border: mix(p[3], p[4], 0.2) }[kind]];
    })) }));
    return next;
  }
  function mix(a, b, k) {
    const x = toRGB(a), y = toRGB(b);
    return toHex({ r: x.r * (1 - k) + y.r * k, g: x.g * (1 - k) + y.g * k, b: x.b * (1 - k) + y.b * k });
  }
  function structuredCloneSafe(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function replacement(lib, theme, source) {
    const map = lib.mappings.find((m) => m.source === source);
    return map ? theme.colors[map.tokenId] : void 0;
  }
  function validateLibrary(value) {
    if (!value || typeof value !== "object") throw Error("JSON \u5FC5\u987B\u662F\u4E3B\u9898\u5E93\u5BF9\u8C61");
    const v = value;
    if (v.version !== 1 || !Array.isArray(v.tokens) || !Array.isArray(v.mappings) || !Array.isArray(v.themes)) throw Error("\u4E0D\u652F\u6301\u7684 JSON \u683C\u5F0F\u6216\u7248\u672C");
    if (v.tokens.length > 1e3 || v.mappings.length > 2e3 || v.themes.length > 200) throw Error("\u6700\u591A 1000 \u4E2A Token\u30012000 \u4E2A\u6620\u5C04\u548C 200 \u5957\u4E3B\u9898");
    const ids = /* @__PURE__ */ new Set(), names = /* @__PURE__ */ new Set();
    const clean = { version: 1, tokens: [], mappings: [], themes: [] };
    function str(s, max) {
      return typeof s === "string" && s.trim().length > 0 && s.length <= max;
    }
    for (const t of v.tokens) {
      if (!t || !str(t.id, 80) || !str(t.name, 100) || ids.has(t.id) || ["__proto__", "constructor", "prototype"].includes(t.id)) throw Error("Token ID \u91CD\u590D\u6216\u540D\u79F0\u65E0\u6548");
      ids.add(t.id);
      clean.tokens.push({ id: t.id, name: t.name.trim() });
    }
    for (const m of v.mappings) {
      if (!m || !validHex(m.source) || !ids.has(m.tokenId) || names.has(m.source.toUpperCase())) throw Error("\u6E90\u989C\u8272\u6620\u5C04\u65E0\u6548\u6216\u91CD\u590D");
      names.add(m.source.toUpperCase());
      clean.mappings.push({ source: m.source.toUpperCase(), tokenId: m.tokenId });
    }
    const themeIds = /* @__PURE__ */ new Set();
    for (const t of v.themes) {
      if (!t || !str(t.id, 80) || themeIds.has(t.id) || !str(t.name, 80) || !t.colors || typeof t.colors !== "object" || Array.isArray(t.colors)) throw Error("\u4E3B\u9898 ID \u6216\u540D\u79F0\u65E0\u6548");
      themeIds.add(t.id);
      const colors = {};
      for (const token of clean.tokens) {
        if (!Object.prototype.hasOwnProperty.call(t.colors, token.id) || !validHex(t.colors[token.id])) throw Error("\u6BCF\u5957\u4E3B\u9898\u5FC5\u987B\u5305\u542B\u6240\u6709 Token \u7684 #RRGGBB \u989C\u8272");
        colors[token.id] = t.colors[token.id].toUpperCase();
      }
      clean.themes.push({ id: t.id, name: t.name.trim(), colors });
    }
    return clean;
  }

  // src/engine.ts
  var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  var copy = (x) => structuredCloneSafe(x);
  function bound(value) {
    if (!value || typeof value !== "object") return false;
    const b = value.boundVariables;
    return !!b && Object.keys(b).length > 0;
  }
  function scanFrame(frame, mixed) {
    const slots = [], issues = [], colorMap = /* @__PURE__ */ new Map();
    let nodes = 0;
    const issue = (node, reason) => issues.push({ node: node.name, reason });
    function collect(slot) {
      if (slots.length >= 5e4) throw Error("\u989C\u8272\u5C5E\u6027\u8FC7\u591A\uFF0C\u8BF7\u7F29\u5C0F\u6240\u9009 Frame");
      slots.push(slot);
      for (const item of slot.original) {
        if (item.type === "SOLID" || item.type === "DROP_SHADOW" || item.type === "INNER_SHADOW" || item.type === "NOISE") {
          if (bound(item)) continue;
          const itemColors = [item.color];
          if (item.type === "NOISE" && item.noiseType === "DUOTONE") itemColors.push(item.secondaryColor);
          for (const color of itemColors) {
            const source = toHex(color), role2 = slot.property === "effects" ? "\u6548\u679C" : slot.node.type === "TEXT" && (slot.property === "fills" || slot.property === "range") ? "\u6587\u5B57" : slot.property === "strokes" ? "\u63CF\u8FB9" : "\u586B\u5145";
            const entry = colorMap.get(source) || { source, count: 0, roles: [] };
            entry.count++;
            if (!entry.roles.includes(role2)) entry.roles.push(role2);
            colorMap.set(source, entry);
          }
        }
      }
    }
    function visit(node, path) {
      if (++nodes > 1e4) throw Error("Frame \u8D85\u8FC7 10000 \u4E2A\u56FE\u5C42\uFF0C\u8BF7\u62C6\u5206\u540E\u626B\u63CF");
      if (node.locked) {
        issue(node, "\u9501\u5B9A\u56FE\u5C42\u53CA\u5176\u5B50\u56FE\u5C42\u5DF2\u8DF3\u8FC7");
        return;
      }
      if (["INSTANCE", "COMPONENT", "COMPONENT_SET"].includes(node.type)) {
        issue(node, "\u7EC4\u4EF6\u5B9E\u4F8B / \u6BCD\u7248\u6574\u4F53\u8DF3\u8FC7\uFF0C\u4FDD\u7559\u8986\u76D6\u548C\u7EC4\u4EF6\u7ED3\u6784");
        return;
      }
      for (const property of ["fills", "strokes", "effects"]) {
        if (!(property in node)) continue;
        const n = node;
        const value = n[property];
        const style = property === "fills" ? n.fillStyleId : property === "strokes" ? n.strokeStyleId : n.effectStyleId;
        if (value === mixed && node.type === "TEXT" && property === "fills") {
          for (const segment of node.getStyledTextSegments(["fills", "fillStyleId"])) {
            if (segment.fillStyleId) {
              issue(node, "\u6587\u5B57\u533A\u95F4\u7ED1\u5B9A\u5171\u4EAB\u6837\u5F0F\uFF0C\u5DF2\u8DF3\u8FC7");
              continue;
            }
            addPaintSlot(node, "range", segment.fills, path + ":range:" + segment.start, () => node.getRangeFills(segment.start, segment.end), (v) => node.setRangeFills(segment.start, segment.end, v), segment.start, segment.end);
          }
          continue;
        }
        if (typeof value === "symbol") {
          issue(node, property + " \u4E3A\u6DF7\u5408\u5C5E\u6027\uFF0C\u65E0\u6CD5\u5B89\u5168\u4FEE\u6539");
          continue;
        }
        if (style) {
          issue(node, property + " \u7ED1\u5B9A\u5171\u4EAB\u6837\u5F0F\uFF0C\u5DF2\u8DF3\u8FC7\uFF08\u4E0D\u4F1A\u5206\u79BB\u6837\u5F0F\uFF09");
          continue;
        }
        if (property === "effects") {
          const effects = value;
          if (effects.some((e) => bound(e))) issue(node, "\u53D8\u91CF\u7ED1\u5B9A\u6548\u679C\u5DF2\u4FDD\u7559");
          if (effects.some((e) => (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW" || e.type === "NOISE") && !bound(e))) {
            const original = copy(effects);
            collect({ node, key: path + ":effects", property, original, expected: copy(original), read: () => n.effects, write: (v) => {
              n.effects = v;
            } });
          }
        } else addPaintSlot(node, property, value, path + ":" + property, () => n[property], (v) => {
          n[property] = v;
        });
      }
      if ("children" in node) node.children.forEach((child, index) => visit(child, path + "/" + index));
    }
    function addPaintSlot(node, property, paints, key, read, write, start, end) {
      if (paints.some((p) => p.type !== "SOLID")) issue(node, property + " \u4E2D\u7684\u6E10\u53D8 / \u56FE\u7247 / \u89C6\u9891\u4FDD\u6301\u539F\u6837");
      if (paints.some((p) => bound(p))) issue(node, property + " \u4E2D\u7684\u53D8\u91CF\u7ED1\u5B9A\u989C\u8272\u5DF2\u4FDD\u7559");
      if (!paints.some((p) => p.type === "SOLID" && !bound(p))) return;
      const original = copy(paints);
      collect({ node, key, property, start, end, original, expected: copy(original), read, write });
    }
    visit(frame, "root");
    return { frame, slots, issues, colors: [...colorMap.values()].sort((a, b) => b.count - a.count), nodes };
  }
  function themedValue(value, lib, theme) {
    return value.map((item) => {
      if ((item.type === "SOLID" || item.type === "DROP_SHADOW" || item.type === "INNER_SHADOW" || item.type === "NOISE") && !bound(item)) {
        const target = replacement(lib, theme, toHex(item.color));
        const result = copy(item);
        if (target && target !== toHex(item.color)) Object.assign(result, { color: __spreadValues(__spreadValues({}, item.color), toRGB(target)) });
        if (item.type === "NOISE" && item.noiseType === "DUOTONE") {
          const secondary = replacement(lib, theme, toHex(item.secondaryColor));
          if (secondary && secondary !== toHex(item.secondaryColor)) Object.assign(result, { secondaryColor: __spreadValues(__spreadValues({}, item.secondaryColor), toRGB(secondary)) });
        }
        return result;
      }
      return copy(item);
    });
  }
  function plan(scan2, lib, theme, baseline) {
    const originalByKey = new Map((baseline || scan2).slots.map((s) => [s.key, s.original]));
    return scan2.slots.flatMap((slot) => {
      if (slot.node.removed) throw Error("\u56FE\u5C42\u5DF2\u5220\u9664\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF");
      if (!same(slot.read(), slot.expected)) throw Error("\u626B\u63CF\u540E\u989C\u8272\u88AB\u5916\u90E8\u4FEE\u6539\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF\u540E\u518D\u5E94\u7528");
      const base = originalByKey.get(slot.key);
      if (!base) throw Error("\u590D\u5236\u56FE\u5C42\u7ED3\u6784\u4E0D\u5339\u914D\uFF0C\u5DF2\u505C\u6B62");
      const after = themedValue(base, lib, theme), before = copy(slot.read());
      return same(before, after) ? [] : [{ slot, before, after }];
    });
  }
  async function prepareFonts(patches, load) {
    const fonts = /* @__PURE__ */ new Map();
    for (const p of patches) if (p.slot.node.type === "TEXT") for (const font of p.slot.node.getRangeAllFontNames(0, p.slot.node.characters.length)) fonts.set(font.family + "\0" + font.style, font);
    for (const font of fonts.values()) await load(font);
  }
  function execute(patches) {
    for (const p of patches) if (p.slot.node.removed || !same(p.slot.read(), p.before)) throw Error("\u5E94\u7528\u524D\u56FE\u5C42\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF");
    const done = [];
    try {
      for (const p of patches) {
        p.slot.write(copy(p.after));
        done.push(p);
        p.slot.expected = copy(p.after);
      }
    } catch (error) {
      let failed = false;
      for (const p of done.reverse()) try {
        p.slot.write(copy(p.before));
        p.slot.expected = copy(p.before);
      } catch (e) {
        failed = true;
      }
      throw Error(failed ? "\u5199\u5165\u5931\u8D25\u4E14\u90E8\u5206\u56DE\u6EDA\u88AB Figma \u62D2\u7EDD\uFF0C\u8BF7\u7ACB\u5373\u4F7F\u7528 Figma \u64A4\u9500" : `\u5199\u5165\u5931\u8D25\uFF0C\u5DF2\u56DE\u6EDA\uFF1A${String(error)}`);
    }
  }
  function reversePatches(patches) {
    for (const p of patches) if (p.slot.node.removed || !same(p.slot.read(), p.after)) throw Error("\u64CD\u4F5C\u540E\u56FE\u5C42\u989C\u8272\u5DF2\u6539\u53D8\uFF0C\u62D2\u7EDD\u8986\u76D6\uFF1B\u8BF7\u4F7F\u7528 Figma \u5386\u53F2\u6216\u91CD\u65B0\u626B\u63CF");
    return patches.map((p) => ({ slot: p.slot, before: copy(p.after), after: copy(p.before) }));
  }
  var fingerprintFields = ["name", "type", "visible", "locked", "opacity", "blendMode", "x", "y", "width", "height", "rotation", "relativeTransform", "constraints", "layoutAlign", "layoutGrow", "layoutPositioning", "layoutMode", "layoutWrap", "primaryAxisSizingMode", "counterAxisSizingMode", "primaryAxisAlignItems", "counterAxisAlignItems", "counterAxisAlignContent", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "itemSpacing", "counterAxisSpacing", "strokesIncludedInLayout", "itemReverseZIndex", "minWidth", "maxWidth", "minHeight", "maxHeight", "layoutSizingHorizontal", "layoutSizingVertical", "clipsContent", "isMask", "maskType", "cornerRadius", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius", "cornerSmoothing", "fills", "fillStyleId", "strokes", "strokeStyleId", "strokeWeight", "strokeAlign", "strokeCap", "strokeJoin", "dashPattern", "effects", "effectStyleId", "characters", "fontName", "fontSize", "textStyleId", "textAlignHorizontal", "textAlignVertical", "textAutoResize", "lineHeight", "letterSpacing", "textCase", "textDecoration", "paragraphSpacing", "paragraphIndent", "componentProperties", "variantProperties", "reactions", "boundVariables", "exportSettings", "vectorPaths", "vectorNetwork", "arcData", "booleanOperation", "strokeTopWeight", "strokeBottomWeight", "strokeLeftWeight", "strokeRightWeight", "strokeMiterLimit", "backgrounds", "backgroundStyleId", "layoutGrids", "gridStyleId", "overflowDirection", "numberOfFixedChildren", "textTruncation", "maxLines", "hyperlink", "listSpacing", "hangingPunctuation", "hangingList", "autoRename", "description", "explicitVariableModes"];
  function fingerprint(node) {
    var _a;
    const data = { id: node.id, parent: (_a = node.parent) == null ? void 0 : _a.id };
    for (const key of fingerprintFields) try {
      if (key in node) {
        const v = node[key];
        data[key] = typeof v === "symbol" ? "MIXED" : v;
      }
    } catch (e) {
      data[key] = "UNREADABLE";
    }
    if (node.type === "TEXT") data.runs = node.getStyledTextSegments(["fills", "fillStyleId", "fontName", "fontSize", "textStyleId", "textCase", "textDecoration", "letterSpacing", "lineHeight", "hyperlink", "listOptions", "indentation"]);
    if (typeof node.getPluginDataKeys === "function") data.pluginData = Object.fromEntries(node.getPluginDataKeys().map((k) => [k, node.getPluginData(k)]));
    if ("children" in node) data.children = node.children.map(fingerprint);
    return JSON.stringify(data);
  }

  // src/code.ts
  figma.showUI(__html__, { width: 1040, height: 760, themeColors: true });
  var STORE = "frame-skin-library-v1";
  var library = emptyLibrary();
  var scan = null;
  var pageId = "";
  var guard = "";
  var busy = false;
  var undo = [];
  var fixturePassed = false;
  var send = (type, data = {}) => figma.ui.postMessage(__spreadValues({ type }, data));
  var errorText = (e) => e instanceof Error ? e.message : String(e);
  function selectedFrame() {
    const selection = figma.currentPage.selection;
    if (selection.length !== 1 || selection[0].type !== "FRAME") throw Error("\u8BF7\u53EA\u9009\u62E9\u4E00\u4E2A Frame\uFF08\u4E0D\u63A5\u53D7\u7EC4\u4EF6\u6216\u5B9E\u4F8B\uFF09");
    let p = selection[0];
    while (p && p.type !== "PAGE") {
      if ("locked" in p && p.locked || ["INSTANCE", "COMPONENT", "COMPONENT_SET"].includes(p.type)) throw Error("\u6240\u9009 Frame \u4F4D\u4E8E\u9501\u5B9A\u56FE\u5C42\u6216\u7EC4\u4EF6\u5185\u90E8\uFF0C\u4E0D\u80FD\u5B89\u5168\u4FEE\u6539");
      p = p.parent;
    }
    return selection[0];
  }
  function ensure() {
    if (!scan || scan.frame.removed || figma.currentPage.id !== pageId || selectedFrame().id !== scan.frame.id) throw Error("\u9009\u62E9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF\u5F53\u524D Frame");
    if (fingerprint(scan.frame) !== guard) throw Error("Frame \u5728\u626B\u63CF\u540E\u53D1\u751F\u7F16\u8F91\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF\u4EE5\u907F\u514D\u8986\u76D6");
    return scan;
  }
  function selectedTheme(id) {
    const theme = library.themes.find((t) => t.id === id);
    if (!theme) throw Error("\u4E3B\u9898\u4E0D\u5B58\u5728");
    return theme;
  }
  async function saveLibrary(value) {
    const checked = validateLibrary(value);
    await figma.clientStorage.setAsync(STORE, checked);
    library = checked;
  }
  async function doScan() {
    const frame = selectedFrame(), page = figma.currentPage.id;
    const result = scanFrame(frame, figma.mixed);
    const initial = fingerprint(frame);
    let thumbnail;
    try {
      thumbnail = await frame.exportAsync({ format: "PNG", constraint: { type: "WIDTH", value: 640 } });
    } catch (e) {
    }
    if (figma.currentPage.id !== page || selectedFrame().id !== frame.id || fingerprint(frame) !== initial) throw Error("\u626B\u63CF\u671F\u95F4 Frame \u53D1\u751F\u53D8\u5316\uFF0C\u8BF7\u91CD\u8BD5");
    const next = extendLibrary(library, result.colors);
    await saveLibrary(next);
    if (figma.currentPage.id !== page || selectedFrame().id !== frame.id || fingerprint(frame) !== initial) throw Error("\u4FDD\u5B58\u671F\u95F4\u9009\u62E9\u6216 Frame \u53D1\u751F\u53D8\u5316\uFF0C\u8BF7\u91CD\u8BD5");
    scan = result;
    pageId = page;
    guard = initial;
    undo = [];
    send("scan", { name: frame.name, nodes: result.nodes, slots: result.slots.length, colors: result.colors, issues: result.issues, thumbnail, library, fixturePassed });
  }
  async function apply(id) {
    const s = ensure(), theme = selectedTheme(id), patches = plan(s, library, theme);
    await prepareFonts(patches, (f) => figma.loadFontAsync(f));
    ensure();
    if (!patches.length) {
      send("notice", { message: "\u6CA1\u6709\u9700\u8981\u66FF\u6362\u7684\u989C\u8272\uFF0C\u5F53\u524D\u989C\u8272\u4E0E\u4E3B\u9898\u4E00\u81F4\u3002" });
      return;
    }
    figma.commitUndo();
    execute(patches);
    figma.commitUndo();
    guard = fingerprint(s.frame);
    undo.push({ kind: "apply", patches });
    if (undo.length > 20) undo.shift();
    send("done", { message: `\u5DF2\u5E94\u7528\u300C${theme.name}\u300D\uFF0C\u4FEE\u6539 ${patches.length} \u5904\u989C\u8272\u5C5E\u6027\uFF1B\u5E03\u5C40\u4E0E\u900F\u660E\u5EA6\u4FDD\u7559\u3002`, canUndo: true });
  }
  async function batch(ids) {
    var _a;
    if (!fixturePassed) throw Error("\u8BF7\u5148\u8FD0\u884C\u300C\u6D4B\u8BD5 Frame \u9A8C\u8BC1\u300D\uFF0C\u901A\u8FC7\u540E\u624D\u53EF\u6279\u91CF\u751F\u6210");
    const s = ensure();
    if (((_a = s.frame.parent) == null ? void 0 : _a.type) !== "PAGE") throw Error("\u6279\u91CF\u590D\u5236\u4EC5\u652F\u6301\u9875\u9762\u9876\u5C42 Frame\uFF0C\u8BF7\u5148\u5C06\u6807\u51C6 Frame \u653E\u5230\u9875\u9762\u9876\u5C42");
    if (!Array.isArray(ids) || !ids.length || ids.length > 40 || new Set(ids).size !== ids.length) throw Error("\u8BF7\u9009\u62E9 1\u201340 \u5957\u4E0D\u540C\u4E3B\u9898");
    if (ids.length * s.nodes > 1e5) throw Error("\u672C\u6B21\u6279\u91CF\u8D85\u8FC7 100000 \u4E2A\u56FE\u5C42\uFF0C\u8BF7\u51CF\u5C11\u4E3B\u9898\u6570\u91CF");
    const themes = ids.map(selectedTheme);
    const preflight = themes.flatMap((t) => plan(s, library, t));
    await prepareFonts(preflight, (f) => figma.loadFontAsync(f));
    ensure();
    const page = figma.currentPage, created = [];
    figma.commitUndo();
    try {
      const columns = Math.min(4, themes.length), gap = 80;
      const initialX = Math.max(s.frame.x + s.frame.width, ...page.children.map((n) => n.x + n.width)) + gap;
      for (let i = 0; i < themes.length; i++) {
        ensure();
        const clone = s.frame.clone();
        created.push(clone);
        clone.name = `${s.frame.name} \xB7 ${themes[i].name}`;
        clone.x = initialX + i % columns * (s.frame.width + gap);
        clone.y = s.frame.y + Math.floor(i / columns) * (s.frame.height + gap);
        const target = scanFrame(clone, figma.mixed);
        execute(plan(target, library, themes[i], s));
      }
    } catch (e) {
      for (const f of created) if (!f.removed) f.remove();
      throw e;
    }
    figma.commitUndo();
    undo.push({ kind: "batch", frames: created, fingerprints: created.map(fingerprint) });
    if (undo.length > 20) undo.shift();
    send("done", { message: `\u5DF2\u751F\u6210 ${created.length} \u4E2A\u4E3B\u9898 Frame\uFF0C\u539F\u59CB Frame \u4FDD\u6301\u4E0D\u53D8\u3002`, canUndo: true });
  }
  async function undoLast() {
    const s = ensure(), last = undo[undo.length - 1];
    if (!last) throw Error("\u6CA1\u6709\u53EF\u64A4\u9500\u7684\u63D2\u4EF6\u64CD\u4F5C");
    if (last.kind === "apply") {
      const patches = reversePatches(last.patches);
      await prepareFonts(patches, (f) => figma.loadFontAsync(f));
      ensure();
      figma.commitUndo();
      execute(patches);
      figma.commitUndo();
      guard = fingerprint(s.frame);
    } else {
      if (last.frames.some((f, i) => f.removed || fingerprint(f) !== last.fingerprints[i])) throw Error("\u751F\u6210\u7684 Frame \u5DF2\u88AB\u7F16\u8F91\u6216\u79FB\u52A8\uFF0C\u4E3A\u9632\u6B62\u4E22\u5931\u4FEE\u6539\uFF0C\u62D2\u7EDD\u5220\u9664\uFF1B\u8BF7\u4F7F\u7528 Figma \u64A4\u9500\u5386\u53F2");
      figma.commitUndo();
      last.frames.forEach((f) => f.remove());
      figma.commitUndo();
    }
    undo.pop();
    send("done", { message: "\u5DF2\u64A4\u9500\u4E0A\u4E00\u6B21\u63D2\u4EF6\u64CD\u4F5C\u3002", canUndo: undo.length > 0 });
  }
  async function testFixture() {
    const page = figma.currentPage;
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    if (figma.currentPage.id !== page.id) throw Error("\u9875\u9762\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u8BD5");
    const f = figma.createFrame();
    f.name = "Frame Skin \xB7 \u6D4B\u8BD5 Frame";
    f.resize(360, 420);
    f.x = Math.max(0, ...page.children.filter((n) => n !== f).map((n) => n.x + n.width)) + 100;
    f.layoutMode = "VERTICAL";
    f.primaryAxisSizingMode = "FIXED";
    f.counterAxisSizingMode = "FIXED";
    f.paddingTop = 24;
    f.paddingBottom = 24;
    f.paddingLeft = 24;
    f.paddingRight = 24;
    f.itemSpacing = 16;
    f.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.9 }];
    f.cornerRadius = 20;
    const label = figma.createText();
    label.fontName = { family: "Inter", style: "Regular" };
    label.characters = "Frame Skin \xB7 Color test";
    label.fontSize = 20;
    label.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
    f.appendChild(label);
    const card = figma.createRectangle();
    card.resize(280, 100);
    card.cornerRadius = 12;
    card.opacity = 0.8;
    card.fills = [{ type: "SOLID", color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 0.7 }];
    card.strokes = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
    card.effects = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 4 }, radius: 8, visible: true, blendMode: "NORMAL" }];
    f.appendChild(card);
    const mixed = figma.createText();
    mixed.characters = "Mixed text colors";
    mixed.fontSize = 14;
    mixed.setRangeFills(0, 5, [{ type: "SOLID", color: { r: 0.2, g: 0.4, b: 0.8 } }]);
    mixed.setRangeFills(5, mixed.characters.length, [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }]);
    mixed.setRangeFontName(0, 5, { family: "Inter", style: "Bold" });
    f.appendChild(mixed);
    const gradient = figma.createRectangle();
    gradient.resize(280, 40);
    gradient.fills = [{ type: "GRADIENT_LINEAR", gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [{ position: 0, color: { r: 1, g: 0, b: 0, a: 1 } }, { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }] }];
    f.appendChild(gradient);
    const locked = figma.createRectangle();
    locked.resize(280, 24);
    locked.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }];
    f.appendChild(locked);
    locked.locked = true;
    try {
      const original = fingerprint(f), test = scanFrame(f, figma.mixed), lib = extendLibrary(emptyLibrary(), test.colors);
      const theme = { id: "test", name: "Validation", colors: Object.fromEntries(lib.tokens.map((t, i) => [t.id, ["#123456", "#ABCDEF", "#297AC4", "#789012", "#F0E1D2"][i % 5]])) };
      const patches = plan(test, lib, theme);
      await prepareFonts(patches, (font) => figma.loadFontAsync(font));
      if (figma.currentPage.id !== page.id) throw Error("\u6D4B\u8BD5\u671F\u95F4\u9875\u9762\u5DF2\u53D8\u5316");
      execute(patches);
      if (!patches.length || !test.slots.every((slot) => same(slot.read(), themedValue(slot.original, lib, theme)))) throw Error("\u989C\u8272\u66FF\u6362\u65AD\u8A00\u5931\u8D25");
      if (!test.issues.some((i) => i.reason.includes("\u6E10\u53D8")) || !test.issues.some((i) => i.reason.includes("\u9501\u5B9A"))) throw Error("\u517C\u5BB9\u6027\u68C0\u67E5\u65AD\u8A00\u5931\u8D25");
      execute(reversePatches(patches));
      if (fingerprint(f) !== original) throw Error("\u8FD8\u539F\u540E\u51E0\u4F55\u3001\u6587\u5B57\u6216\u989C\u8272\u5C5E\u6027\u65AD\u8A00\u5931\u8D25");
      fixturePassed = true;
      figma.currentPage.selection = [f];
      figma.viewport.scrollAndZoomIntoView([f]);
      await doScan();
      send("done", { message: `\u6D4B\u8BD5\u901A\u8FC7\uFF1A${test.slots.length} \u4E2A\u989C\u8272\u5C5E\u6027\u66FF\u6362\u51C6\u786E\uFF0C\u64A4\u9500\u540E\u5168\u90E8\u5C5E\u6027\u4E00\u81F4\uFF1B\u6E10\u53D8\u548C\u9501\u5B9A\u5C42\u5DF2\u8DF3\u8FC7\u3002\u73B0\u5728\u53EF\u9009\u62E9\u6807\u51C6 Frame \u626B\u63CF\u5E76\u6279\u91CF\u751F\u6210\u3002`, canUndo: false, fixturePassed: true });
    } catch (e) {
      if (!f.removed) f.remove();
      throw e;
    }
  }
  figma.on("selectionchange", () => {
    if (scan && (figma.currentPage.id !== pageId || figma.currentPage.selection.length !== 1 || figma.currentPage.selection[0].id !== scan.frame.id)) send("stale", { message: "\u9009\u62E9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u626B\u63CF\u5F53\u524D Frame\u3002" });
  });
  figma.on("currentpagechange", () => {
    scan = null;
    undo = [];
    send("stale", { message: "\u9875\u9762\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u626B\u63CF\u3002" });
  });
  var ready = (async () => {
    try {
      const stored = await figma.clientStorage.getAsync(STORE);
      if (stored) library = validateLibrary(stored);
    } catch (e) {
      send("error", { message: "\u672C\u5730\u4E3B\u9898\u5E93\u8BFB\u53D6\u5931\u8D25\uFF1A" + errorText(e) + "\u3002\u53EF\u901A\u8FC7 JSON \u5BFC\u5165\u6062\u590D\uFF1B\u672A\u81EA\u52A8\u8986\u76D6\u5B58\u50A8\u3002" });
    }
    send("init", { library });
  })();
  figma.ui.onmessage = async (message) => {
    if (!message || typeof message !== "object") return;
    const m = message;
    if (busy) {
      send("error", { message: "\u6B63\u5728\u5904\u7406\u4E0A\u4E00\u9879\u64CD\u4F5C\uFF0C\u8BF7\u7A0D\u5019" });
      return;
    }
    busy = true;
    send("busy", { busy: true });
    try {
      await ready;
      if (m.type === "scan") {
        if (m.library) await saveLibrary(m.library);
        await doScan();
      } else if (m.type === "save") {
        await saveLibrary(m.library);
        send("saved", { library });
      } else if (m.type === "apply") {
        await saveLibrary(m.library);
        send("saved", { library });
        await apply(m.themeId);
      } else if (m.type === "batch") {
        await saveLibrary(m.library);
        send("saved", { library });
        await batch(m.themeIds);
      } else if (m.type === "undo") await undoLast();
      else if (m.type === "test") await testFixture();
      else throw Error("\u4E0D\u652F\u6301\u7684\u64CD\u4F5C");
    } catch (e) {
      send("error", { message: errorText(e) });
    } finally {
      busy = false;
      send("busy", { busy: false });
    }
  };
})();
