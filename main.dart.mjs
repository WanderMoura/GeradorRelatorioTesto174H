// Compiles a dart2wasm-generated main module from `source` which can then
// instantiatable via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm modules from `bytes` which is then
// instantiatable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export async function instantiate(modulePromise, importObjectPromise) {
  var moduleOrCompiledApp = await modulePromise;
  if (!(moduleOrCompiledApp instanceof CompiledApp)) {
    moduleOrCompiledApp = new CompiledApp(moduleOrCompiledApp);
  }
  const instantiatedApp = await moduleOrCompiledApp.instantiate(await importObjectPromise);
  return instantiatedApp.instantiatedModule;
}

// DEPRECATED: Please use `compile` or `compileStreaming` to get a compiled app,
// use `instantiate` method to get an instantiated app and then call
// `invokeMain` to invoke the main function.
export const invoke = (moduleInstance, ...args) => {
  moduleInstance.exports.$invokeMain(args);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredWasm` is a JS function that takes a module name matching a
  //   wasm file produced by the dart2wasm compiler and returns the bytes to
  //   load the module. These bytes can be in either a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`.
  // `loadDynamicModule` is a JS function that takes two string names matching,
  //   in order, a wasm file produced by the dart2wasm compiler during dynamic
  //   module compilation and a corresponding js file produced by the same
  //   compilation. It should return a JS Array containing 2 elements. The first
  //   should be the bytes for the wasm module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The second
  //   should be the result of using the JS 'import' API on the js file path.
  async instantiate(additionalImports, {loadDeferredWasm, loadDynamicModule} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            _3: (o, t) => typeof o === t,
      _4: (o, c) => o instanceof c,
      _5: o => Object.keys(o),
      _7: (o,s,v) => o[s] = v,
      _8: (o, a) => o + a,
      _35: () => new Array(),
      _36: x0 => new Array(x0),
      _38: x0 => x0.length,
      _40: (x0,x1) => x0[x1],
      _41: (x0,x1,x2) => { x0[x1] = x2 },
      _42: (x0,x1) => x0.push(x1),
      _43: x0 => new Promise(x0),
      _45: (x0,x1,x2) => new DataView(x0,x1,x2),
      _47: x0 => new Int8Array(x0),
      _48: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      _49: x0 => new Uint8Array(x0),
      _51: x0 => new Uint8ClampedArray(x0),
      _53: x0 => new Int16Array(x0),
      _55: x0 => new Uint16Array(x0),
      _57: x0 => new Int32Array(x0),
      _59: x0 => new Uint32Array(x0),
      _61: x0 => new Float32Array(x0),
      _63: x0 => new Float64Array(x0),
      _64: (x0,x1,x2,x3,x4,x5) => x0.call(x1,x2,x3,x4,x5),
      _65: (x0,x1,x2) => x0.call(x1,x2),
      _69: () => Symbol("jsBoxedDartObjectProperty"),
      _70: (decoder, codeUnits) => decoder.decode(codeUnits),
      _71: () => new TextDecoder("utf-8", {fatal: true}),
      _72: () => new TextDecoder("utf-8", {fatal: false}),
      _73: (s) => +s,
      _74: x0 => new Uint8Array(x0),
      _75: (x0,x1,x2) => x0.set(x1,x2),
      _76: (x0,x1) => x0.transferFromImageBitmap(x1),
      _77: x0 => x0.arrayBuffer(),
      _78: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._78(f,arguments.length,x0) }),
      _79: x0 => new window.FinalizationRegistry(x0),
      _80: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _81: (x0,x1) => x0.unregister(x1),
      _82: (x0,x1,x2) => x0.slice(x1,x2),
      _83: (x0,x1) => x0.decode(x1),
      _84: (x0,x1) => x0.segment(x1),
      _85: () => new TextDecoder(),
      _87: x0 => x0.buffer,
      _88: x0 => x0.wasmMemory,
      _89: () => globalThis.window._flutter_skwasmInstance,
      _90: x0 => x0.rasterStartMilliseconds,
      _91: x0 => x0.rasterEndMilliseconds,
      _92: x0 => x0.imageBitmaps,
      _196: x0 => x0.stopPropagation(),
      _197: x0 => x0.preventDefault(),
      _199: x0 => x0.remove(),
      _200: (x0,x1) => x0.append(x1),
      _201: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _246: x0 => x0.unlock(),
      _247: x0 => x0.getReader(),
      _248: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _249: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _250: (x0,x1) => x0.item(x1),
      _251: x0 => x0.next(),
      _252: x0 => x0.now(),
      _253: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._253(f,arguments.length,x0) }),
      _254: (x0,x1) => x0.addListener(x1),
      _255: (x0,x1) => x0.removeListener(x1),
      _256: (x0,x1) => x0.matchMedia(x1),
      _257: (x0,x1) => x0.revokeObjectURL(x1),
      _258: x0 => x0.close(),
      _259: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      _260: x0 => new window.ImageDecoder(x0),
      _261: x0 => ({frameIndex: x0}),
      _262: (x0,x1) => x0.decode(x1),
      _263: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._263(f,arguments.length,x0) }),
      _264: (x0,x1) => x0.getModifierState(x1),
      _265: (x0,x1) => x0.removeProperty(x1),
      _266: (x0,x1) => x0.prepend(x1),
      _267: x0 => new Intl.Locale(x0),
      _268: x0 => x0.disconnect(),
      _269: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._269(f,arguments.length,x0) }),
      _270: (x0,x1) => x0.getAttribute(x1),
      _271: (x0,x1) => x0.contains(x1),
      _272: (x0,x1) => x0.querySelector(x1),
      _273: x0 => x0.blur(),
      _274: x0 => x0.hasFocus(),
      _275: (x0,x1,x2) => x0.insertBefore(x1,x2),
      _276: (x0,x1) => x0.hasAttribute(x1),
      _277: (x0,x1) => x0.getModifierState(x1),
      _278: (x0,x1) => x0.createTextNode(x1),
      _279: (x0,x1) => x0.appendChild(x1),
      _280: (x0,x1) => x0.removeAttribute(x1),
      _281: x0 => x0.getBoundingClientRect(),
      _282: (x0,x1) => x0.observe(x1),
      _283: x0 => x0.disconnect(),
      _284: (x0,x1) => x0.closest(x1),
      _707: () => globalThis.window.flutterConfiguration,
      _709: x0 => x0.assetBase,
      _714: x0 => x0.canvasKitMaximumSurfaces,
      _715: x0 => x0.debugShowSemanticsNodes,
      _716: x0 => x0.hostElement,
      _717: x0 => x0.multiViewEnabled,
      _718: x0 => x0.nonce,
      _720: x0 => x0.fontFallbackBaseUrl,
      _730: x0 => x0.console,
      _731: x0 => x0.devicePixelRatio,
      _732: x0 => x0.document,
      _733: x0 => x0.history,
      _734: x0 => x0.innerHeight,
      _735: x0 => x0.innerWidth,
      _736: x0 => x0.location,
      _737: x0 => x0.navigator,
      _738: x0 => x0.visualViewport,
      _739: x0 => x0.performance,
      _741: x0 => x0.URL,
      _743: (x0,x1) => x0.getComputedStyle(x1),
      _744: x0 => x0.screen,
      _745: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._745(f,arguments.length,x0) }),
      _746: (x0,x1) => x0.requestAnimationFrame(x1),
      _751: (x0,x1) => x0.warn(x1),
      _753: (x0,x1) => x0.debug(x1),
      _754: x0 => globalThis.parseFloat(x0),
      _755: () => globalThis.window,
      _756: () => globalThis.Intl,
      _757: () => globalThis.Symbol,
      _758: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      _760: x0 => x0.clipboard,
      _761: x0 => x0.maxTouchPoints,
      _762: x0 => x0.vendor,
      _763: x0 => x0.language,
      _764: x0 => x0.platform,
      _765: x0 => x0.userAgent,
      _766: (x0,x1) => x0.vibrate(x1),
      _767: x0 => x0.languages,
      _768: x0 => x0.documentElement,
      _769: (x0,x1) => x0.querySelector(x1),
      _772: (x0,x1) => x0.createElement(x1),
      _775: (x0,x1) => x0.createEvent(x1),
      _776: x0 => x0.activeElement,
      _779: x0 => x0.head,
      _780: x0 => x0.body,
      _782: (x0,x1) => { x0.title = x1 },
      _785: x0 => x0.visibilityState,
      _786: () => globalThis.document,
      _787: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._787(f,arguments.length,x0) }),
      _788: (x0,x1) => x0.dispatchEvent(x1),
      _796: x0 => x0.target,
      _798: x0 => x0.timeStamp,
      _799: x0 => x0.type,
      _801: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      _807: x0 => x0.baseURI,
      _808: x0 => x0.firstChild,
      _812: x0 => x0.parentElement,
      _814: (x0,x1) => { x0.textContent = x1 },
      _815: x0 => x0.parentNode,
      _816: x0 => x0.nextSibling,
      _817: (x0,x1) => x0.removeChild(x1),
      _818: x0 => x0.isConnected,
      _826: x0 => x0.clientHeight,
      _827: x0 => x0.clientWidth,
      _828: x0 => x0.offsetHeight,
      _829: x0 => x0.offsetWidth,
      _830: x0 => x0.id,
      _831: (x0,x1) => { x0.id = x1 },
      _834: (x0,x1) => { x0.spellcheck = x1 },
      _835: x0 => x0.tagName,
      _836: x0 => x0.style,
      _838: (x0,x1) => x0.querySelectorAll(x1),
      _839: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _840: (x0,x1) => { x0.tabIndex = x1 },
      _841: x0 => x0.tabIndex,
      _842: (x0,x1) => x0.focus(x1),
      _843: x0 => x0.scrollTop,
      _844: (x0,x1) => { x0.scrollTop = x1 },
      _845: x0 => x0.scrollLeft,
      _846: (x0,x1) => { x0.scrollLeft = x1 },
      _847: x0 => x0.classList,
      _849: (x0,x1) => { x0.className = x1 },
      _851: (x0,x1) => x0.getElementsByClassName(x1),
      _852: x0 => x0.click(),
      _853: (x0,x1) => x0.attachShadow(x1),
      _856: x0 => x0.computedStyleMap(),
      _857: (x0,x1) => x0.get(x1),
      _863: (x0,x1) => x0.getPropertyValue(x1),
      _864: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      _865: x0 => x0.offsetLeft,
      _866: x0 => x0.offsetTop,
      _867: x0 => x0.offsetParent,
      _869: (x0,x1) => { x0.name = x1 },
      _870: x0 => x0.content,
      _871: (x0,x1) => { x0.content = x1 },
      _875: (x0,x1) => { x0.src = x1 },
      _876: x0 => x0.naturalWidth,
      _877: x0 => x0.naturalHeight,
      _881: (x0,x1) => { x0.crossOrigin = x1 },
      _883: (x0,x1) => { x0.decoding = x1 },
      _884: x0 => x0.decode(),
      _889: (x0,x1) => { x0.nonce = x1 },
      _894: (x0,x1) => { x0.width = x1 },
      _896: (x0,x1) => { x0.height = x1 },
      _899: (x0,x1) => x0.getContext(x1),
      _960: x0 => x0.width,
      _961: x0 => x0.height,
      _963: (x0,x1) => x0.fetch(x1),
      _964: x0 => x0.status,
      _966: x0 => x0.body,
      _967: x0 => x0.arrayBuffer(),
      _969: x0 => x0.text(),
      _970: x0 => x0.read(),
      _971: x0 => x0.value,
      _972: x0 => x0.done,
      _979: x0 => x0.name,
      _980: x0 => x0.x,
      _981: x0 => x0.y,
      _984: x0 => x0.top,
      _985: x0 => x0.right,
      _986: x0 => x0.bottom,
      _987: x0 => x0.left,
      _997: x0 => x0.height,
      _998: x0 => x0.width,
      _999: x0 => x0.scale,
      _1000: (x0,x1) => { x0.value = x1 },
      _1003: (x0,x1) => { x0.placeholder = x1 },
      _1005: (x0,x1) => { x0.name = x1 },
      _1006: x0 => x0.selectionDirection,
      _1007: x0 => x0.selectionStart,
      _1008: x0 => x0.selectionEnd,
      _1011: x0 => x0.value,
      _1013: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1014: x0 => x0.readText(),
      _1015: (x0,x1) => x0.writeText(x1),
      _1017: x0 => x0.altKey,
      _1018: x0 => x0.code,
      _1019: x0 => x0.ctrlKey,
      _1020: x0 => x0.key,
      _1021: x0 => x0.keyCode,
      _1022: x0 => x0.location,
      _1023: x0 => x0.metaKey,
      _1024: x0 => x0.repeat,
      _1025: x0 => x0.shiftKey,
      _1026: x0 => x0.isComposing,
      _1028: x0 => x0.state,
      _1029: (x0,x1) => x0.go(x1),
      _1031: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      _1032: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      _1033: x0 => x0.pathname,
      _1034: x0 => x0.search,
      _1035: x0 => x0.hash,
      _1039: x0 => x0.state,
      _1042: (x0,x1) => x0.createObjectURL(x1),
      _1044: x0 => new Blob(x0),
      _1046: x0 => new MutationObserver(x0),
      _1047: (x0,x1,x2) => x0.observe(x1,x2),
      _1048: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1048(f,arguments.length,x0,x1) }),
      _1051: x0 => x0.attributeName,
      _1052: x0 => x0.type,
      _1053: x0 => x0.matches,
      _1054: x0 => x0.matches,
      _1058: x0 => x0.relatedTarget,
      _1060: x0 => x0.clientX,
      _1061: x0 => x0.clientY,
      _1062: x0 => x0.offsetX,
      _1063: x0 => x0.offsetY,
      _1066: x0 => x0.button,
      _1067: x0 => x0.buttons,
      _1068: x0 => x0.ctrlKey,
      _1072: x0 => x0.pointerId,
      _1073: x0 => x0.pointerType,
      _1074: x0 => x0.pressure,
      _1075: x0 => x0.tiltX,
      _1076: x0 => x0.tiltY,
      _1077: x0 => x0.getCoalescedEvents(),
      _1080: x0 => x0.deltaX,
      _1081: x0 => x0.deltaY,
      _1082: x0 => x0.wheelDeltaX,
      _1083: x0 => x0.wheelDeltaY,
      _1084: x0 => x0.deltaMode,
      _1091: x0 => x0.changedTouches,
      _1094: x0 => x0.clientX,
      _1095: x0 => x0.clientY,
      _1098: x0 => x0.data,
      _1101: (x0,x1) => { x0.disabled = x1 },
      _1103: (x0,x1) => { x0.type = x1 },
      _1104: (x0,x1) => { x0.max = x1 },
      _1105: (x0,x1) => { x0.min = x1 },
      _1106: x0 => x0.value,
      _1107: (x0,x1) => { x0.value = x1 },
      _1108: x0 => x0.disabled,
      _1109: (x0,x1) => { x0.disabled = x1 },
      _1111: (x0,x1) => { x0.placeholder = x1 },
      _1112: (x0,x1) => { x0.name = x1 },
      _1115: (x0,x1) => { x0.autocomplete = x1 },
      _1116: x0 => x0.selectionDirection,
      _1117: x0 => x0.selectionStart,
      _1119: x0 => x0.selectionEnd,
      _1122: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      _1123: (x0,x1) => x0.add(x1),
      _1126: (x0,x1) => { x0.noValidate = x1 },
      _1127: (x0,x1) => { x0.method = x1 },
      _1128: (x0,x1) => { x0.action = x1 },
      _1129: (x0,x1) => new OffscreenCanvas(x0,x1),
      _1135: (x0,x1) => x0.getContext(x1),
      _1137: x0 => x0.convertToBlob(),
      _1154: x0 => x0.orientation,
      _1155: x0 => x0.width,
      _1156: x0 => x0.height,
      _1157: (x0,x1) => x0.lock(x1),
      _1176: x0 => new ResizeObserver(x0),
      _1179: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1179(f,arguments.length,x0,x1) }),
      _1187: x0 => x0.length,
      _1188: x0 => x0.iterator,
      _1189: x0 => x0.Segmenter,
      _1190: x0 => x0.v8BreakIterator,
      _1191: (x0,x1) => new Intl.Segmenter(x0,x1),
      _1194: x0 => x0.language,
      _1195: x0 => x0.script,
      _1196: x0 => x0.region,
      _1214: x0 => x0.done,
      _1215: x0 => x0.value,
      _1216: x0 => x0.index,
      _1220: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      _1221: (x0,x1) => x0.adoptText(x1),
      _1222: x0 => x0.first(),
      _1223: x0 => x0.next(),
      _1224: x0 => x0.current(),
      _1238: x0 => x0.hostElement,
      _1239: x0 => x0.viewConstraints,
      _1240: x0 => x0.initialData,
      _1242: x0 => x0.maxHeight,
      _1243: x0 => x0.maxWidth,
      _1244: x0 => x0.minHeight,
      _1245: x0 => x0.minWidth,
      _1246: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1246(f,arguments.length,x0) }),
      _1247: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1247(f,arguments.length,x0) }),
      _1248: (x0,x1) => ({addView: x0,removeView: x1}),
      _1251: x0 => x0.loader,
      _1252: () => globalThis._flutter,
      _1253: (x0,x1) => x0.didCreateEngineInitializer(x1),
      _1254: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1254(f,arguments.length,x0) }),
      _1255: f => finalizeWrapper(f, function() { return dartInstance.exports._1255(f,arguments.length) }),
      _1256: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      _1259: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1259(f,arguments.length,x0) }),
      _1260: x0 => ({runApp: x0}),
      _1262: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1262(f,arguments.length,x0,x1) }),
      _1263: x0 => x0.length,
      _1264: () => globalThis.window.ImageDecoder,
      _1265: x0 => x0.tracks,
      _1267: x0 => x0.completed,
      _1269: x0 => x0.image,
      _1275: x0 => x0.displayWidth,
      _1276: x0 => x0.displayHeight,
      _1277: x0 => x0.duration,
      _1280: x0 => x0.ready,
      _1281: x0 => x0.selectedTrack,
      _1282: x0 => x0.repetitionCount,
      _1283: x0 => x0.frameCount,
      _1326: x0 => x0.requestFullscreen(),
      _1327: x0 => x0.exitFullscreen(),
      _1328: x0 => x0.createRange(),
      _1329: (x0,x1) => x0.selectNode(x1),
      _1330: x0 => x0.getSelection(),
      _1331: x0 => x0.removeAllRanges(),
      _1332: (x0,x1) => x0.addRange(x1),
      _1333: (x0,x1) => x0.createElement(x1),
      _1334: (x0,x1) => x0.append(x1),
      _1335: (x0,x1,x2) => x0.insertRule(x1,x2),
      _1336: (x0,x1) => x0.add(x1),
      _1337: x0 => x0.preventDefault(),
      _1338: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1338(f,arguments.length,x0) }),
      _1339: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1340: () => globalThis.window.navigator.userAgent,
      _1341: (x0,x1) => x0.get(x1),
      _1342: x0 => x0.text(),
      _1344: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      _1345: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      _1346: (x0,x1) => x0.createElement(x1),
      _1347: (x0,x1,x2) => x0.setAttribute(x1,x2),
      _1353: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1354: (x0,x1) => x0.canShare(x1),
      _1355: (x0,x1) => x0.share(x1),
      _1356: x0 => ({url: x0}),
      _1357: (x0,x1,x2) => ({files: x0,title: x1,text: x2}),
      _1358: (x0,x1) => ({files: x0,text: x1}),
      _1359: (x0,x1) => ({files: x0,title: x1}),
      _1360: x0 => ({files: x0}),
      _1361: (x0,x1) => ({title: x0,text: x1}),
      _1362: x0 => ({text: x0}),
      _1363: x0 => x0.click(),
      _1364: x0 => x0.remove(),
      _1365: () => ({}),
      _1366: (x0,x1,x2) => new File(x0,x1,x2),
      _1367: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1367(f,arguments.length,x0) }),
      _1368: (x0,x1,x2) => globalThis.jsConnect(x0,x1,x2),
      _1369: (x0,x1) => globalThis.jsSend(x0,x1),
      _1370: x0 => globalThis.jsDisconnect(x0),
      _1371: (x0,x1,x2) => x0.call(x1,x2),
      _1372: (x0,x1,x2,x3,x4,x5) => x0.call(x1,x2,x3,x4,x5),
      _1373: (x0,x1,x2,x3) => x0.call(x1,x2,x3),
      _1374: (x0,x1,x2,x3,x4) => x0.call(x1,x2,x3,x4),
      _1375: x0 => x0.call(),
      _1376: (x0,x1) => x0.append(x1),
      _1377: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1377(f,arguments.length,x0) }),
      _1378: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1378(f,arguments.length,x0) }),
      _1380: (x0,x1,x2,x3,x4,x5,x6) => x0.call(x1,x2,x3,x4,x5,x6),
      _1381: x0 => ({audio: x0}),
      _1382: (x0,x1) => x0.getUserMedia(x1),
      _1383: x0 => x0.getAudioTracks(),
      _1384: x0 => x0.stop(),
      _1385: (x0,x1) => x0.removeTrack(x1),
      _1386: x0 => x0.close(),
      _1387: (x0,x1) => x0.warn(x1),
      _1388: x0 => x0.getSettings(),
      _1389: x0 => ({sampleRate: x0}),
      _1390: x0 => new AudioContext(x0),
      _1391: () => new AudioContext(),
      _1392: x0 => x0.suspend(),
      _1393: x0 => x0.resume(),
      _1394: (x0,x1) => x0.connect(x1),
      _1395: x0 => globalThis.URL.createObjectURL(x0),
      _1396: (x0,x1) => x0.createMediaStreamSource(x1),
      _1397: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1397(f,arguments.length,x0) }),
      _1398: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1398(f,arguments.length,x0) }),
      _1399: (x0,x1) => x0.addModule(x1),
      _1400: x0 => ({parameterData: x0}),
      _1401: (x0,x1,x2) => new AudioWorkletNode(x0,x1,x2),
      _1402: x0 => x0.enumerateDevices(),
      _1403: x0 => globalThis.URL.revokeObjectURL(x0),
      _1404: x0 => x0.pause(),
      _1405: x0 => x0.resume(),
      _1406: x0 => x0.disconnect(),
      _1407: x0 => x0.stop(),
      _1408: (x0,x1,x2) => ({mimeType: x0,audioBitsPerSecond: x1,bitsPerSecond: x2}),
      _1409: (x0,x1) => new MediaRecorder(x0,x1),
      _1410: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1410(f,arguments.length,x0) }),
      _1411: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1411(f,arguments.length,x0) }),
      _1412: (x0,x1) => x0.start(x1),
      _1413: x0 => ({type: x0}),
      _1414: (x0,x1) => new Blob(x0,x1),
      _1415: (x0,x1) => globalThis.jsFixWebmDuration(x0,x1),
      _1416: x0 => x0.createAnalyser(),
      _1417: (x0,x1) => x0.getFloatFrequencyData(x1),
      _1418: x0 => globalThis.MediaRecorder.isTypeSupported(x0),
      _1419: x0 => x0.decode(),
      _1420: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1421: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _1422: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1422(f,arguments.length,x0) }),
      _1423: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1423(f,arguments.length,x0) }),
      _1424: x0 => x0.send(),
      _1425: () => new XMLHttpRequest(),
      _1426: x0 => globalThis.Wakelock.toggle(x0),
      _1427: () => globalThis.Wakelock.enabled(),
      _1428: (x0,x1) => x0.createMediaElementSource(x1),
      _1429: x0 => x0.createStereoPanner(),
      _1430: x0 => x0.load(),
      _1431: x0 => x0.play(),
      _1432: x0 => x0.pause(),
      _1433: (x0,x1) => x0.query(x1),
      _1434: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1434(f,arguments.length,x0) }),
      _1435: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1435(f,arguments.length,x0) }),
      _1436: (x0,x1,x2) => ({enableHighAccuracy: x0,timeout: x1,maximumAge: x2}),
      _1437: (x0,x1,x2,x3) => x0.getCurrentPosition(x1,x2,x3),
      _1438: (x0,x1) => x0.clearWatch(x1),
      _1439: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1439(f,arguments.length,x0) }),
      _1440: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1440(f,arguments.length,x0) }),
      _1441: (x0,x1,x2,x3) => x0.watchPosition(x1,x2,x3),
      _1442: (x0,x1) => x0.getItem(x1),
      _1443: (x0,x1) => x0.removeItem(x1),
      _1444: (x0,x1,x2) => x0.setItem(x1,x2),
      _1445: x0 => ({frequency: x0}),
      _1446: x0 => new Accelerometer(x0),
      _1447: x0 => x0.start(),
      _1448: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1448(f,arguments.length,x0) }),
      _1449: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1449(f,arguments.length,x0) }),
      _1450: x0 => new Gyroscope(x0),
      _1451: x0 => x0.start(),
      _1452: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1452(f,arguments.length,x0) }),
      _1453: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1453(f,arguments.length,x0) }),
      _1454: x0 => new LinearAccelerationSensor(x0),
      _1455: x0 => x0.start(),
      _1456: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1456(f,arguments.length,x0) }),
      _1457: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1457(f,arguments.length,x0) }),
      _1458: x0 => new Magnetometer(x0),
      _1459: x0 => x0.start(),
      _1460: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1460(f,arguments.length,x0) }),
      _1461: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1461(f,arguments.length,x0) }),
      _1462: x0 => ({name: x0}),
      _1463: x0 => ({video: x0}),
      _1464: x0 => x0.getVideoTracks(),
      _1465: () => globalThis.Notification.requestPermission(),
      _1466: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1466(f,arguments.length,x0) }),
      _1467: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1467(f,arguments.length,x0) }),
      _1468: (x0,x1,x2) => x0.getCurrentPosition(x1,x2),
      _1471: (x0,x1) => x0.querySelector(x1),
      _1472: (x0,x1) => x0.item(x1),
      _1473: () => new FileReader(),
      _1475: (x0,x1) => x0.readAsArrayBuffer(x1),
      _1476: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1476(f,arguments.length,x0) }),
      _1477: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      _1478: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1478(f,arguments.length,x0) }),
      _1479: (x0,x1,x2) => x0.addEventListener(x1,x2),
      _1480: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1480(f,arguments.length,x0) }),
      _1481: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1481(f,arguments.length,x0) }),
      _1482: (x0,x1) => x0.removeChild(x1),
      _1483: x0 => new Blob(x0),
      _1484: (x0,x1,x2) => x0.slice(x1,x2),
      _1485: x0 => x0.deviceMemory,
      _1486: x0 => x0.getBattery(),
      _1487: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1487(f,arguments.length,x0) }),
      _1489: (x0,x1) => x0.matchMedia(x1),
      _1492: x0 => x0.pyodide,
      _1493: x0 => x0.multiView,
      _1495: x0 => x0.webSocketEndpoint,
      _1496: x0 => x0.routeUrlStrategy,
      _1501: () => globalThis.flet,
      _1502: (x0,x1,x2,x3) => x0.call(x1,x2,x3),
      _1503: (x0,x1,x2,x3,x4) => x0.call(x1,x2,x3,x4),
      _1506: x0 => x0.call(),
      _1507: Date.now,
      _1509: s => new Date(s * 1000).getTimezoneOffset() * 60,
      _1510: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      _1511: () => {
        let stackString = new Error().stack.toString();
        let frames = stackString.split('\n');
        let drop = 2;
        if (frames[0] === 'Error') {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      _1512: () => typeof dartUseDateNowForTicks !== "undefined",
      _1513: () => 1000 * performance.now(),
      _1514: () => Date.now(),
      _1515: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      _1516: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      _1517: () => new WeakMap(),
      _1518: (map, o) => map.get(o),
      _1519: (map, o, v) => map.set(o, v),
      _1520: x0 => new WeakRef(x0),
      _1521: x0 => x0.deref(),
      _1522: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1522(f,arguments.length,x0) }),
      _1523: x0 => new FinalizationRegistry(x0),
      _1524: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      _1525: (x0,x1,x2) => x0.register(x1,x2),
      _1526: (x0,x1) => x0.unregister(x1),
      _1528: () => globalThis.WeakRef,
      _1529: () => globalThis.FinalizationRegistry,
      _1531: s => JSON.stringify(s),
      _1532: s => printToConsole(s),
      _1533: (o, p, r) => o.replaceAll(p, () => r),
      _1534: (o, p, r) => o.replace(p, () => r),
      _1535: Function.prototype.call.bind(String.prototype.toLowerCase),
      _1536: s => s.toUpperCase(),
      _1537: s => s.trim(),
      _1538: s => s.trimLeft(),
      _1539: s => s.trimRight(),
      _1540: (string, times) => string.repeat(times),
      _1541: Function.prototype.call.bind(String.prototype.indexOf),
      _1542: (s, p, i) => s.lastIndexOf(p, i),
      _1543: (string, token) => string.split(token),
      _1544: Object.is,
      _1545: o => o instanceof Array,
      _1546: (a, i) => a.push(i),
      _1547: (a, i) => a.splice(i, 1)[0],
      _1548: (a, i, v) => a.splice(i, 0, v),
      _1549: (a, l) => a.length = l,
      _1550: a => a.pop(),
      _1551: (a, i) => a.splice(i, 1),
      _1552: (a, s) => a.join(s),
      _1553: (a, s, e) => a.slice(s, e),
      _1554: (a, s, e) => a.splice(s, e),
      _1555: (a, b) => a == b ? 0 : (a > b ? 1 : -1),
      _1556: a => a.length,
      _1557: (a, l) => a.length = l,
      _1558: (a, i) => a[i],
      _1559: (a, i, v) => a[i] = v,
      _1561: o => {
        if (o instanceof ArrayBuffer) return 0;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 1;
        }
        return 2;
      },
      _1562: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      _1564: o => o instanceof Uint8Array,
      _1565: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      _1566: o => o instanceof Int8Array,
      _1567: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      _1568: o => o instanceof Uint8ClampedArray,
      _1569: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      _1570: o => o instanceof Uint16Array,
      _1571: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      _1572: o => o instanceof Int16Array,
      _1573: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      _1574: o => o instanceof Uint32Array,
      _1575: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      _1576: o => o instanceof Int32Array,
      _1577: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      _1579: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      _1580: o => o instanceof Float32Array,
      _1581: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      _1582: o => o instanceof Float64Array,
      _1583: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      _1584: (t, s) => t.set(s),
      _1585: l => new DataView(new ArrayBuffer(l)),
      _1586: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      _1587: o => o.byteLength,
      _1588: o => o.buffer,
      _1589: o => o.byteOffset,
      _1590: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      _1591: (b, o) => new DataView(b, o),
      _1592: (b, o, l) => new DataView(b, o, l),
      _1593: Function.prototype.call.bind(DataView.prototype.getUint8),
      _1594: Function.prototype.call.bind(DataView.prototype.setUint8),
      _1595: Function.prototype.call.bind(DataView.prototype.getInt8),
      _1596: Function.prototype.call.bind(DataView.prototype.setInt8),
      _1597: Function.prototype.call.bind(DataView.prototype.getUint16),
      _1598: Function.prototype.call.bind(DataView.prototype.setUint16),
      _1599: Function.prototype.call.bind(DataView.prototype.getInt16),
      _1600: Function.prototype.call.bind(DataView.prototype.setInt16),
      _1601: Function.prototype.call.bind(DataView.prototype.getUint32),
      _1602: Function.prototype.call.bind(DataView.prototype.setUint32),
      _1603: Function.prototype.call.bind(DataView.prototype.getInt32),
      _1604: Function.prototype.call.bind(DataView.prototype.setInt32),
      _1605: Function.prototype.call.bind(DataView.prototype.getBigUint64),
      _1607: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      _1608: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      _1609: Function.prototype.call.bind(DataView.prototype.getFloat32),
      _1610: Function.prototype.call.bind(DataView.prototype.setFloat32),
      _1611: Function.prototype.call.bind(DataView.prototype.getFloat64),
      _1612: Function.prototype.call.bind(DataView.prototype.setFloat64),
      _1625: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      _1626: (handle) => clearTimeout(handle),
      _1627: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      _1628: (handle) => clearInterval(handle),
      _1629: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      _1630: () => Date.now(),
      _1631: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      _1632: (x0,x1) => x0.exec(x1),
      _1633: (x0,x1) => x0.test(x1),
      _1634: x0 => x0.pop(),
      _1636: o => o === undefined,
      _1638: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      _1640: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      _1641: o => o instanceof RegExp,
      _1642: (l, r) => l === r,
      _1643: o => o,
      _1644: o => o,
      _1645: o => o,
      _1646: b => !!b,
      _1647: o => o.length,
      _1649: (o, i) => o[i],
      _1650: f => f.dartFunction,
      _1651: () => ({}),
      _1652: () => [],
      _1654: () => globalThis,
      _1655: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      _1656: (o, p) => p in o,
      _1657: (o, p) => o[p],
      _1658: (o, p, v) => o[p] = v,
      _1659: (o, m, a) => o[m].apply(o, a),
      _1661: o => String(o),
      _1662: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      _1663: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1663(f,arguments.length,x0) }),
      _1664: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1664(f,arguments.length,x0,x1) }),
      _1665: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      _1666: o => [o],
      _1667: (o0, o1) => [o0, o1],
      _1668: (o0, o1, o2) => [o0, o1, o2],
      _1669: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      _1670: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1671: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1672: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1673: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1674: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1675: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1676: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1677: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1678: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      _1679: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      _1680: x0 => new ArrayBuffer(x0),
      _1681: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      _1682: x0 => x0.input,
      _1683: x0 => x0.index,
      _1684: x0 => x0.groups,
      _1685: x0 => x0.flags,
      _1686: x0 => x0.multiline,
      _1687: x0 => x0.ignoreCase,
      _1688: x0 => x0.unicode,
      _1689: x0 => x0.dotAll,
      _1690: (x0,x1) => { x0.lastIndex = x1 },
      _1691: (o, p) => p in o,
      _1692: (o, p) => o[p],
      _1693: (o, p, v) => o[p] = v,
      _1694: (o, p) => delete o[p],
      _1695: (x0,x1) => x0.end(x1),
      _1696: (x0,x1) => x0.item(x1),
      _1697: (x0,x1) => x0.appendChild(x1),
      _1700: (x0,x1,x2) => x0.setRequestHeader(x1,x2),
      _1701: f => finalizeWrapper(f, function(x0,x1) { return dartInstance.exports._1701(f,arguments.length,x0,x1) }),
      _1702: x0 => ({xhrSetup: x0}),
      _1703: x0 => new Hls(x0),
      _1704: (x0,x1) => x0.loadSource(x1),
      _1705: (x0,x1) => x0.attachMedia(x1),
      _1706: (x0,x1) => x0.canPlayType(x1),
      _1707: () => globalThis.Hls.isSupported(),
      _1708: () => new XMLHttpRequest(),
      _1709: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      _1712: x0 => x0.send(),
      _1714: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1714(f,arguments.length,x0) }),
      _1715: f => finalizeWrapper(f, function(x0) { return dartInstance.exports._1715(f,arguments.length,x0) }),
      _1720: (x0,x1) => new WebSocket(x0,x1),
      _1721: (x0,x1) => x0.send(x1),
      _1722: (x0,x1,x2) => x0.close(x1,x2),
      _1724: x0 => x0.close(),
      _1726: (x0,x1) => x0.append(x1),
      _1728: () => new AbortController(),
      _1729: x0 => x0.abort(),
      _1730: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      _1731: (x0,x1) => globalThis.fetch(x0,x1),
      _1732: f => finalizeWrapper(f, function(x0,x1,x2) { return dartInstance.exports._1732(f,arguments.length,x0,x1,x2) }),
      _1733: (x0,x1) => x0.forEach(x1),
      _1734: x0 => x0.getReader(),
      _1735: x0 => x0.cancel(),
      _1736: x0 => x0.read(),
      _1737: (x0,x1,x2,x3) => ({method: x0,headers: x1,body: x2,credentials: x3}),
      _1738: (x0,x1,x2) => x0.fetch(x1,x2),
      _1739: (x0,x1) => x0.key(x1),
      _1740: x0 => x0.random(),
      _1741: (x0,x1) => x0.getRandomValues(x1),
      _1742: () => globalThis.crypto,
      _1743: () => globalThis.Math,
      _1752: Function.prototype.call.bind(Number.prototype.toString),
      _1753: Function.prototype.call.bind(BigInt.prototype.toString),
      _1754: Function.prototype.call.bind(Number.prototype.toString),
      _1755: (d, digits) => d.toFixed(digits),
      _1759: () => globalThis.document,
      _1760: () => globalThis.window,
      _1765: (x0,x1) => { x0.height = x1 },
      _1767: (x0,x1) => { x0.width = x1 },
      _1770: x0 => x0.head,
      _1771: x0 => x0.classList,
      _1775: (x0,x1) => { x0.innerText = x1 },
      _1776: x0 => x0.style,
      _1778: x0 => x0.sheet,
      _1779: x0 => x0.src,
      _1780: (x0,x1) => { x0.src = x1 },
      _1781: x0 => x0.naturalWidth,
      _1782: x0 => x0.naturalHeight,
      _1789: x0 => x0.offsetX,
      _1790: x0 => x0.offsetY,
      _1791: x0 => x0.button,
      _1798: x0 => x0.status,
      _1799: (x0,x1) => { x0.responseType = x1 },
      _1801: x0 => x0.response,
      _1850: (x0,x1) => { x0.responseType = x1 },
      _1851: x0 => x0.response,
      _1911: (x0,x1) => { x0.draggable = x1 },
      _1927: x0 => x0.style,
      _2284: (x0,x1) => { x0.target = x1 },
      _2286: (x0,x1) => { x0.download = x1 },
      _2311: (x0,x1) => { x0.href = x1 },
      _2404: (x0,x1) => { x0.src = x1 },
      _2499: x0 => x0.videoWidth,
      _2500: x0 => x0.videoHeight,
      _2512: (x0,x1) => { x0.kind = x1 },
      _2514: (x0,x1) => { x0.src = x1 },
      _2516: (x0,x1) => { x0.srclang = x1 },
      _2518: (x0,x1) => { x0.label = x1 },
      _2529: x0 => x0.error,
      _2531: (x0,x1) => { x0.src = x1 },
      _2536: (x0,x1) => { x0.crossOrigin = x1 },
      _2539: (x0,x1) => { x0.preload = x1 },
      _2540: x0 => x0.buffered,
      _2543: x0 => x0.currentTime,
      _2544: (x0,x1) => { x0.currentTime = x1 },
      _2545: x0 => x0.duration,
      _2546: x0 => x0.paused,
      _2549: x0 => x0.playbackRate,
      _2550: (x0,x1) => { x0.playbackRate = x1 },
      _2559: (x0,x1) => { x0.loop = x1 },
      _2561: (x0,x1) => { x0.controls = x1 },
      _2562: x0 => x0.volume,
      _2563: (x0,x1) => { x0.volume = x1 },
      _2564: x0 => x0.muted,
      _2565: (x0,x1) => { x0.muted = x1 },
      _2570: x0 => x0.textTracks,
      _2580: x0 => x0.code,
      _2581: x0 => x0.message,
      _2615: (x0,x1) => x0[x1],
      _2617: x0 => x0.length,
      _2632: (x0,x1) => { x0.mode = x1 },
      _2634: x0 => x0.activeCues,
      _2655: x0 => x0.length,
      _2851: (x0,x1) => { x0.accept = x1 },
      _2865: x0 => x0.files,
      _2891: (x0,x1) => { x0.multiple = x1 },
      _2909: (x0,x1) => { x0.type = x1 },
      _3158: x0 => x0.src,
      _3159: (x0,x1) => { x0.src = x1 },
      _3161: (x0,x1) => { x0.type = x1 },
      _3165: (x0,x1) => { x0.async = x1 },
      _3167: (x0,x1) => { x0.defer = x1 },
      _3179: (x0,x1) => { x0.charset = x1 },
      _3628: () => globalThis.window,
      _3688: x0 => x0.navigator,
      _3692: x0 => x0.screen,
      _3695: x0 => x0.innerHeight,
      _3699: x0 => x0.screenLeft,
      _3703: x0 => x0.outerHeight,
      _3951: x0 => x0.sessionStorage,
      _3952: x0 => x0.localStorage,
      _4055: x0 => x0.geolocation,
      _4058: x0 => x0.mediaDevices,
      _4060: x0 => x0.permissions,
      _4061: x0 => x0.maxTouchPoints,
      _4068: x0 => x0.appCodeName,
      _4069: x0 => x0.appName,
      _4070: x0 => x0.appVersion,
      _4071: x0 => x0.platform,
      _4072: x0 => x0.product,
      _4073: x0 => x0.productSub,
      _4074: x0 => x0.userAgent,
      _4075: x0 => x0.vendor,
      _4076: x0 => x0.vendorSub,
      _4078: x0 => x0.language,
      _4079: x0 => x0.languages,
      _4080: x0 => x0.onLine,
      _4085: x0 => x0.hardwareConcurrency,
      _4125: x0 => x0.data,
      _4162: (x0,x1) => { x0.onmessage = x1 },
      _4282: x0 => x0.length,
      _4499: x0 => x0.readyState,
      _4508: x0 => x0.protocol,
      _4512: (x0,x1) => { x0.binaryType = x1 },
      _4515: x0 => x0.code,
      _4516: x0 => x0.reason,
      _5666: x0 => x0.destination,
      _5670: x0 => x0.state,
      _5671: x0 => x0.audioWorklet,
      _5773: (x0,x1) => { x0.fftSize = x1 },
      _5774: x0 => x0.frequencyBinCount,
      _5776: (x0,x1) => { x0.minDecibels = x1 },
      _5778: (x0,x1) => { x0.maxDecibels = x1 },
      _5780: (x0,x1) => { x0.smoothingTimeConstant = x1 },
      _6034: x0 => x0.port,
      _6173: x0 => x0.type,
      _6214: x0 => x0.signal,
      _6226: x0 => x0.length,
      _6275: x0 => x0.firstChild,
      _6286: () => globalThis.document,
      _6345: x0 => x0.documentElement,
      _6366: x0 => x0.body,
      _6368: x0 => x0.head,
      _6696: x0 => x0.id,
      _6697: (x0,x1) => { x0.id = x1 },
      _6721: (x0,x1) => { x0.innerHTML = x1 },
      _6724: x0 => x0.children,
      _8042: x0 => x0.value,
      _8044: x0 => x0.done,
      _8224: x0 => x0.size,
      _8225: x0 => x0.type,
      _8228: (x0,x1) => { x0.type = x1 },
      _8231: x0 => x0.name,
      _8237: x0 => x0.length,
      _8242: x0 => x0.result,
      _8611: x0 => x0.mimeType,
      _8612: x0 => x0.state,
      _8616: (x0,x1) => { x0.onstop = x1 },
      _8618: (x0,x1) => { x0.ondataavailable = x1 },
      _8643: x0 => x0.data,
      _8732: x0 => x0.url,
      _8734: x0 => x0.status,
      _8736: x0 => x0.statusText,
      _8737: x0 => x0.headers,
      _8738: x0 => x0.body,
      _9020: x0 => x0.matches,
      _9033: x0 => x0.width,
      _9034: x0 => x0.height,
      _9125: x0 => x0.state,
      _9525: x0 => x0.active,
      _9784: x0 => x0.sampleRate,
      _9796: x0 => x0.channelCount,
      _9858: x0 => x0.deviceId,
      _9859: x0 => x0.kind,
      _9860: x0 => x0.label,
      _10435: x0 => x0.coords,
      _10436: x0 => x0.timestamp,
      _10438: x0 => x0.accuracy,
      _10439: x0 => x0.latitude,
      _10440: x0 => x0.longitude,
      _10441: x0 => x0.altitude,
      _10442: x0 => x0.altitudeAccuracy,
      _10443: x0 => x0.heading,
      _10444: x0 => x0.speed,
      _10445: x0 => x0.code,
      _10446: x0 => x0.message,
      _10854: (x0,x1) => { x0.border = x1 },
      _11132: (x0,x1) => { x0.display = x1 },
      _11296: (x0,x1) => { x0.height = x1 },
      _11986: (x0,x1) => { x0.width = x1 },
      _12277: x0 => x0.charging,
      _12280: x0 => x0.level,
      _12282: (x0,x1) => { x0.onchargingchange = x1 },
      _12354: x0 => x0.name,
      _12355: x0 => x0.message,
      _13072: () => globalThis.console,
      _13096: x0 => x0.x,
      _13097: x0 => x0.y,
      _13098: x0 => x0.z,
      _13099: (x0,x1) => { x0.onreading = x1 },
      _13100: (x0,x1) => { x0.onerror = x1 },
      _13101: x0 => x0.x,
      _13102: x0 => x0.y,
      _13103: x0 => x0.z,
      _13104: (x0,x1) => { x0.onreading = x1 },
      _13105: (x0,x1) => { x0.onerror = x1 },
      _13106: x0 => x0.x,
      _13107: x0 => x0.y,
      _13108: x0 => x0.z,
      _13109: (x0,x1) => { x0.onreading = x1 },
      _13110: (x0,x1) => { x0.onerror = x1 },
      _13111: x0 => x0.x,
      _13112: x0 => x0.y,
      _13113: x0 => x0.z,
      _13114: (x0,x1) => { x0.onreading = x1 },
      _13115: (x0,x1) => { x0.onerror = x1 },
      _13116: x0 => x0.error,
      _13117: x0 => x0.name,
      _13118: x0 => x0.message,

    };

    const baseImports = {
      dart2wasm: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      S: new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
