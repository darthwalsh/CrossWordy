"use strict";

const firebaseConfig = {
  apiKey: "AIzaSyD5dGDgA23L_4tlJqZeuWEMuKoq4IBe0yE",
  projectId: "last-walk",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function $(id) {
  return document.getElementById(id);
}

/**
 * @param {HTMLElement} parent
 * @param {string} name
 * @param {Object.<string, string>} attributes
 */
function create(parent, name, attributes = {}) {
  const node = document.createElement(name);
  parent.appendChild(node);
  for (const prop in attributes) {
    node.setAttribute(prop, attributes[prop]);
  }
  return node;
}

/** @returns {HTMLTableDataCellElement} */
function getTD(x, y) {
  return document.querySelectorAll(`tbody tr:nth-child(${y + 1}) td:nth-child(${x + 1})`)[0];
}

function inBounds(x, y) {
  return darks[y] && x in darks[y];
}

function writable(x, y) {
  return inBounds(x, y) && !darks[y][x];
}

function getDXY(vert = vertical) {
  return vert ? [0, 1] : [1, 0];
}

/** @returns {[number, number]} */
function getXY(td) {
  return [td.cellIndex, td.parentElement.rowIndex];
}

/** @returns {Generator<[number, number], undefined, any>} */
function* getRowCol(x, y, vert = vertical) {
  const [dx, dy] = getDXY(vert);

  for (; writable(x - dx, y - dy); x -= dx, y -= dy) {}
  for (; writable(x, y); x += dx, y += dy) yield [x, y];
}

/** @returns {string} */
function getClueNum(x, y, vert = vertical) {
  const it = getRowCol(x, y, vert);
  const first = it.next().value;
  return getTD(...first).firstElementChild.nextElementSibling.innerText;
}

let focus = [0, 0];
function updateFocus(x, y, newVertical, {noRebus = false} = {}) {
  if (focus) {
    [...getRowCol(...focus)].forEach(xy => getTD(...xy).classList.remove("sameWord"));
    getTD(...focus).classList.remove("focused");
  }

  if (noRebus) {
    $("rebus").checked = false;
  } else if (x != focus[0] || y != focus[1]) {
    $("rebus").checked = cellValue(x, y).length > 1;
  }

  focus = [x, y];
  vertical = newVertical;
  const rowCol = [...getRowCol(...focus)];
  rowCol.forEach(xy => getTD(...xy).classList.add("sameWord"));

  const td = getTD(...focus);
  td.classList.add("focused");
  td.firstElementChild.select();

  const clue = $("clue");
  const clueNum = getClueNum(...focus, vertical);
  clue.innerText = (vertical ? dClues : aClues).get(clueNum) || "[flip]";
  rewriteClueLinks(clue);

  const cluebar = $("cluebar");
  const scale = n => {
    clue.style.setProperty("--font-scale", n);
    return clue.scrollHeight <= cluebar.clientHeight;
  };
  const ratio = binarySet(1, 0.1, scale); // precision / perf tradeoff
  scale(ratio);
}

/** @param {HTMLElement} e */
function rewriteClueLinks(e) {
  let text = e.innerText;
  /** @type {RegExpExecArray} */
  let m;
  while (m = /(\d+)-(.*?)(Across|Down)/.exec(text)) {
    const [_, n, extra, dir] = m;

    e.removeChild(e.lastChild);
    e.append(text.slice(0, m.index));
    
    const a = create(e, "a", {href: "#"});
    a.innerText = n + '-';
    a.onclick = el => {
      const loc = clueNumLocs.get(+n);
      if (loc) {
        const [x, y] = loc;
        updateFocus(x, y, dir.toLowerCase() === "down");
      }

      el.preventDefault();
    }

    text = text.slice(m.index + n.length + 1);
    if (!extra) {
      a.innerText += dir;
      text = text.slice(dir.length);
    }

    e.append(text);
  }
}

/**
 *
 * @param {number} hi
 * @param {number} epsilon
 * @param {function(int): boolean} ok
 */
function binarySet(hi, epsilon, ok) {
  if (ok(hi)) return hi;
  while (!ok(hi / 2)) hi /= 2;

  let lo = hi / 2;
  while (hi - lo > epsilon) {
    let mid = (hi + lo) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 *
 * @param {number} i
 * @param {boolean[]} row
 */
function isNum(i, row) {
  if (row[i]) return false;
  if (i > 0 && !row[i - 1]) return false;
  if (i == row.length - 1 || row[i + 1]) return false;
  return true;
}

let cellInputCount = 0;
function drawFromDB() {
  const tbody = $("grid");

  const cols = darks[0].map((_, x) => darks.map(row => row[x]));
  let i = 0,
    f;

  cellInputCount = 0;
  for (const [y, row] of darks.entries()) {
    const tr = create(tbody, "tr");
    for (const [x, b] of row.entries()) {
      const td = create(tr, "td");
      const input = create(td, "input");
      if (b) {
        td.classList.add("dark");
        input.style.display = "none";
      } else {
        ++cellInputCount;
      }
      if (circles[y][x]) {
        td.classList.add("circle");
      }

      if (isNum(x, darks[y]) || isNum(y, cols[x])) {
        const span = create(td, "span");
        if (!i) {
          f = [x, y];
        }
        span.innerText = ++i;
        clueNumLocs.set(i, [x, y]);
      }
    }
  }

  document.documentElement.style.setProperty("--grid-width", darks[0].length);
  document.documentElement.style.setProperty("--grid-height", darks.length);
  updateFocus(...f, false);

  tbody.onclick = onClick;
  tbody.oninput = onInput;
  tbody.onkeydown = onKeydown;
  tbody.onkeyup = onKeyup;

  $("rebus").oninput = () => updateFocus(...focus, vertical);
  $("share").onclick = onShare;
  $("hideClues").onclick = hideCluesOnClick;

  window.addEventListener("keydown", ev => {
    if (ev.ctrlKey & (ev.key === "s")) {
      ev.preventDefault();
      onShare();
    }
  });

  $("sol-check").onmousedown = onCheck;
  $("sol-check").onmouseup = doneWithCheck;

  $("sol-whats-wrong").onmousedown = onWhatsWrong;
  $("sol-whats-wrong").onmouseup = doneWithCheck;
}

function onShare() {
  sharesDoc.update({focus, vertical, bustCache: Date.now()});
  updateFocus(...focus, vertical);
}

function doneWithCheck() {
  for (const [x, y] of allCellValues()) {
    getTD(x, y).classList.remove("solWrong");
    getTD(x, y).classList.remove("solCorrect");
  }
}

function onCheck() {
  const name = [...incorrectCells()].length ? "solWrong" : "solCorrect";
  for (const [x, y] of allCellValues()) {
    getTD(x, y).classList.add(name);
  }

  $("sol-whats-wrong").style.display = "initial";
}

function onWhatsWrong() {
  for (const [x, y] of incorrectCells()) {
    getTD(x, y).classList.add("solWrong");
  }
}

/** @returns {Generator<[number, number, string], undefined, any>} */
function* incorrectCells() {
  for (const cell of allCellValues()) {
    const [x, y, c] = cell;
    if (solution[y][x].toLocaleUpperCase() != c.toLocaleUpperCase()) yield cell;
  }
}

/**
 *
 * @param {HTMLElement} parent
 * @param {Map<string, string>} clues
 * @param {Map<string, HTMLLIElement} map
 * @param {boolean} v
 */
function drawClues(parent, clues, map, v) {
  const ol = create(parent, "ol");
  for (const [n, text] of clues.entries()) {
    const li = create(ol, "li", {value: +n});
    li.innerText = text;
    rewriteClueLinks(li);
    map.set(n, li);
  }
  ol.onclick = e => {
    if (window.getSelection().toString()) return;

    /** @type {HTMLLIElement} */
    const target = e.target;
    if (target.parentElement !== ol) return;

    const loc = clueNumLocs.get(target.value);
    if (!loc) return;
    const [x, y] = loc;
    updateFocus(x, y, v);
  };
}

/** @type {HTMLStyleElement} */
const hideCluesCSS = create(document.head, "style");
function hideCluesOnClick() {
  cluesHidden = !cluesHidden;

  /** @type {HTMLImageElement} **/
  const hideClues = $("hideClues");
  hideClues.src = cluesHidden ? "img/eye-close-up.svg" : "img/closed-eye.svg";
  hideClues.title = cluesHidden ? "Show clues" : "Hide clues";

  if (cluesHidden) {
    hideCluesCSS.sheet.insertRule(".wordDone { display: none }");
  } else {
    while (hideCluesCSS.sheet.cssRules.length) {
      hideCluesCSS.sheet.deleteRule(0);
    }
  }
}

/** @returns {string} */
function cellValue(x, y) {
  if (darks[y][x]) return null;
  const input = getTD(x, y).firstElementChild;
  return input.value;
}

/** @returns {Generator<[number, number, string], undefined, any>} */
function* allCellValues() {
  for (let y = 0; y < darks.length; ++y)
    for (let x = 0; x < darks[0].length; ++x) {
      const s = cellValue(x, y);
      if (s === null) continue;

      yield [x, y, s];
    }
}

function isRebus() {
  return $("rebus").checked;
}

const measurer = $("measurer");
function measureText(s) {
  measurer.innerText = s;
  return measurer.clientWidth;
}

/** @param {HTMLInputElement} input */
function updateCellPresentation(input) {
  const {value} = input;
  if (value.length <= 1) {
    input.style.setProperty("--font-scale", "");
  } else {
    const ratio = Math.min(1, 15 / measureText(value));
    input.style.setProperty("--font-scale", ratio);
  }

  const xy = getXY(input.closest("td"));
  for (const v of [true, false]) {
    const clueDomMap = v ? dClueDOM : aClueDOM;
    const clueDom = clueDomMap.get(getClueNum(...xy, v));
    if (!clueDom) continue;

    const cells = [...getRowCol(...xy, v)];
    if (cells.every(xy => cellValue(...xy))) {
      clueDom.classList.add("wordDone");
    } else {
      clueDom.classList.remove("wordDone");
    }
  }
}

/**
 * @param {MouseEvent} e
 */
function onClick(e) {
  /** @type {HTMLElement} **/
  const target = e.target;
  const td = target.closest("td");
  if (!td) return;

  const [x, y] = getXY(td);
  if (darks[y][x]) return;

  let newVert = vertical;
  if (focus[0] == x && focus[1] == y) {
    newVert = !newVert;
  }

  updateFocus(x, y, newVert);
}

/**
 * @param {InputEvent} e
 */
function onInput(e) {
  /** @type {HTMLInputElement} **/
  const input = e.target;
  if (input.value.length > 1 && !isRebus()) {
    input.value = input.value.slice(-1);
  }
  const td = input.closest("td");

  let [x, y] = getXY(td);
  updateDbCell(input);

  updateCellPresentation(input);
  if (isRebus()) return;

  const [dx, dy] = getDXY();
  while (inBounds(x, y) && cellValue(x, y)) {
    x += dx;
    y += dy;
  }

  if (writable(x, y)) {
    updateFocus(x, y, vertical);
  }
}

/** @type {Object.<string, {dx?: number, dy?: number, del?: boolean, steps?: number}} */
const special = {
  ArrowLeft: {dx: -1},
  ArrowRight: {dx: 1},
  ArrowUp: {dy: -1},
  ArrowDown: {dy: 1},
  End: {steps: Infinity},
  Home: {steps: -Infinity},

  Backspace: {del: true, steps: -1},
  Clear: {del: true, dx: 0},
  Delete: {del: true, steps: 1},
};

/**
 * @param {KeyboardEvent} e
 *
 * @description Semantics of del are a little complicated:
 *  If the cell has text in it, the cell is only cleared.
 *  But if the cell is empty, the cursor first moves, then that cell is cleared.
 */
function onKeydown(e) {
  if (isRebus()) return;

  /** @type {HTMLInputElement} **/
  const input = e.target;
  const td = input.closest("td");
  if (!td) return;

  let [x, y] = getXY(td);

  if (e.key === " ") {
    updateFocus(x, y, !vertical);
    return false;
  }
  if (!(e.key in special)) return;
  let {dx = 0, dy = 0, del = false, steps = 0} = special[e.key];

  if (del && cellValue(x, y)) {
    input.value = "";
    updateDbCell(input);
    updateCellPresentation(input);
    del = false;
    steps = 0;
  }
  if (steps) {
    [dx, dy] = getDXY();
    if (steps < 0) {
      [dx, dy, steps] = [-dx, -dy, -steps];
    }

    while (inBounds(x + dx, y + dy) && writable(x + dx, y + dy) && steps) {
      x += dx;
      y += dy;
      --steps;
    }
    updateFocus(x, y, vertical, {noRebus: true});
  } else {
    if (inBounds(x + dx, y + dy) && writable(x + dx, y + dy)) {
      updateFocus(x + dx, y + dy, vertical, {noRebus: true});
    }
  }

  if (del) {
    const nextTD = getTD(...focus);
    const nextInput = nextTD.firstElementChild;

    nextInput.value = "";
    updateDbCell(nextInput);
    updateCellPresentation(nextInput);
  }

  return false;
}

/**
 *
 * @param {KeyboardEvent} e
 */
function onKeyup(e) {
  if (e.key !== "Tab") return;

  /** @type {HTMLInputElement} **/
  const input = e.target;
  const td = input.closest("td");
  if (!td) return;

  updateFocus(...getXY(td), vertical, {noRebus: true});
}

let vertical = false;
/** @type {boolean[][]} */
let darks, circles;
/** @type {string[][]} */
let solution;
/** @type {Map<string, string>} */
let aClues = new Map();
/** @type {Map<string, string>} */
let dClues = new Map();
/** @type {Map<string, HTMLLIElement} */
let aClueDOM = new Map();
/** @type {Map<string, HTMLLIElement} */
let dClueDOM = new Map();
/** @type {Map<number, [number, number]} */
let clueNumLocs = new Map();
let puzzleDoc, cellsDoc, sharesDoc;

let cluesHidden = false;

let startTime = -1;
let oldData = {};
function updateChars(snapshot) {
  const data = snapshot.data();

  if (Object.keys(data).length == 0) {
    startTime = -1;
  } else if (startTime === -1) {
    startTime = Date.now();
  }

  const filled = Object.values(data).filter(s => s).length;
  if (filled == cellInputCount) {
    const diff = (Date.now() - startTime) / 1000;
    const min = Math.floor(diff / 60);
    const sec = Math.round(diff - 60 * min);

    const time = $("time");
    time.innerText = `${min}:${String(sec).padStart(2, "0")}`;
    time.style.display = "initial";

    if (solution) $("sol-check").style.display = "initial";
  } else {
    time.style.display = "none";
  }

  if (snapshot.metadata.hasPendingWrites) {
    oldData = data;
    return;
  }

  for (const key in data) {
    if (!/\d+_\d+/.test(key)) continue;
    const [x, y] = key.split("_").map(Number);
    const td = getTD(x, y);
    const input = td.firstElementChild;
    input.value = data[key];
    updateCellPresentation(input);

    if (oldData[key] !== data[key]) {
      tempAddClass(td, "remoteChanged", 1000);
    }
  }
  oldData = data;
}

function tempAddClass(el, className, ms) {
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), ms);
}

let firstShare = true;
function updateShares(snapshot) {
  if (firstShare) {
    firstShare = false;
    return;
  }
  const {focus, vertical} = snapshot.data();
  const cells = [...getRowCol(...focus, vertical)];

  cells.forEach(xy => tempAddClass(getTD(...xy), "shared", 3000));
}

function parseClues(s) {
  return new Map(
    s.split(/\n+/g).map(line => {
      const [n, ...rest] = line.split(" ");
      return [n, rest.join(" ")];
    })
  );
}

async function play() {
  puzzleDoc = db.collection("puzzles").doc(databaseId);
  const darksReq = await puzzleDoc.get();
  const {darkString, across = "", down = "", title = "", solution: sol = ""} = darksReq.data();
  darks = darkString
    .trim()
    .split("_")
    .map(row => row.split("").map(c => c == "@"));
  circles = darkString
    .trim()
    .split("_")
    .map(row => row.split("").map(c => c == "O"));

  solution = sol ? sol.split("\n").map(row => row.split("\t")) : null;

  if (across) {
    aClues = parseClues(across);
    dClues = parseClues(down);
    drawClues($("aclues"), aClues, aClueDOM, false);
    drawClues($("dclues"), dClues, dClueDOM, true);
  } else {
    $("clues").innerHTML = "";
  }

  if (title) {
    $("title").innerText = title;
  }

  drawFromDB();

  $("clue").onclick = () => {
    if (window.getSelection().toString()) return;
    updateFocus(...focus, !vertical);
  };

  cellsDoc = puzzleDoc.collection("live").doc("cells");
  cellsDoc.onSnapshot(updateChars);

  sharesDoc = puzzleDoc.collection("live").doc("shares");
  sharesDoc.onSnapshot(updateShares);
}

/**
 * @param {HTMLInputElement} input
 */
function updateDbCell(input) {
  cellsDoc.update({[getXY(input.closest("td")).join("_")]: input.value});
}

function drawCreateGrid(size) {
  const tbody = $("grid");
  tbody.innerHTML = "";

  if (!size) {
    size = `${darks[0].length} ${darks.length}`;
  }

  let [ws, hs, a] = size.split(" ");
  if (a) {
    const span = create(tbody, "span");
    span.style.color = "darkred";
    span.innerText = '"W H" or "W" (e.g. "5 7")';
    return;
  }

  if (!hs) hs = ws;
  const [w, h] = [ws, hs].map(Number);
  if (!w || !h) {
    const span = create(tbody, "span");
    span.style.color = "darkred";
    span.innerText = '"W H" or "W" (e.g. "5 7")';
    return;
  }

  darks = Array(h)
    .fill()
    .map((_, y) =>
      Array(w)
        .fill()
        .map((_, x) => Boolean(darks[y] && darks[y][x]))
    );
  circles = Array(h)
    .fill()
    .map((_, y) =>
      Array(w)
        .fill()
        .map((_, x) => Boolean(circles[y] && circles[y][x]))
    );

  const cols = darks[0].map((_, x) => darks.map(row => row[x]));
  let i = 0;

  for (const [y, row] of darks.entries()) {
    const tr = create(tbody, "tr");
    for (const [x, b] of row.entries()) {
      const td = create(tr, "td");

      if (b) {
        td.classList.add("dark");
      }
      if (circles[y][x]) {
        td.classList.add("circle");
      }

      if (isNum(x, darks[y]) || isNum(y, cols[x])) {
        const span = create(td, "span");
        span.innerText = ++i;
      }
    }
  }

  clueIds.forEach(c => validateClues($(c)));

  document.documentElement.style.setProperty("--grid-width", darks[0].length);
  document.documentElement.style.setProperty("--grid-height", darks.length);
  tbody.onclick = addOnClick;
}

/**
 * @param {MouseEvent} e
 */
function addOnClick(e) {
  /** @type {HTMLElement} **/
  const target = e.target;
  const td = target.closest("td");
  if (!td) return;

  const [x, y] = getXY(td);
  if (darks[y][x]) {
    darks[y][x] = false;
    circles[y][x] = true;
  } else if (circles[y][x]) {
    circles[y][x] = false;
  } else {
    darks[y][x] = true;
  }

  drawCreateGrid();
}

async function publishPuzzle() {
  const darkString = darks
    .map((row, y) => row.map((b, x) => (b ? "@" : circles[y][x] ? "O" : ".")).join(""))
    .join("_");
  const across = $("aclues").value.replace(/\n+/g, "\n");
  const down = $("dclues").value.replace(/\n+/g, "\n");

  let title = $("title").innerText;
  if (title == "CrossWordy") {
    title = "";
  }

  const solutionText = solution ? solution.map(row => row.join("\t")).join("\n") : "";
  const ref = await db.collection("puzzles").add({
    darkString,
    across,
    down,
    title,
    solution: solutionText,
  });

  await ref.collection("live").doc("shares").set({});
  await ref.collection("live").doc("cells").set({});

  window.location = `?id=${ref.id}`;
}

/**
 * @param {HTMLTextAreaElement} textArea
 */
function validateClues(textArea) {
  const formattedValue = (textArea.value || "")
    .replace(/\n+/g, "\n")
    .replace(/\n(?!\d+ )/g, " ")
    .replace(/\n/g, "\n\n");

  if (formattedValue != textArea.value) {
    textArea.value = formattedValue;
    textArea.style.height = textArea.scrollHeight + 20 + "px";
  }

  const h3 = textArea.previousElementSibling;
  h3.innerText = h3.innerText.split(" ")[0];

  if (!textArea.value) {
    h3.style.background = "orange";
    h3.innerText += ` missing!`;
    return;
  }

  h3.style.background = "red";

  let dx = 0,
    dy = 0;
  if (textArea.id == "aclues") dx = 1;
  else dy = 1;

  const expected = new Set();
  for (let y = 0; y < darks.length; ++y)
    for (let x = 0; x < darks[0].length; ++x) {
      const [s1, s2] = [...getTD(x, y).childNodes].filter(e => e.tagName == "SPAN");
      if (!s1) continue;
      if (s2) {
        console.warn("multiple child span? ignoring!");
      }
      const n = s1.innerText;
      if (!writable(x - dx, y - dy)) expected.add(n);
    }

  const clues = parseClues(textArea.value);
  let prev = -1;
  for (const n of [...clues.keys()].sort((a, b) => a - b)) {
    const clue = clues.get(n);
    if (!expected.has(n)) {
      h3.innerText += ` clue '${n}' not expected`;
      return;
    }

    if (!clue) {
      h3.innerText += ` clue '${n}' empty`;
      return;
    }
    expected.delete(n);

    if (+n < prev) {
      h3.innerText += ` clue '${n}' out of order`;
      return;
    }
    prev = +n;
  }
  if (expected.size) {
    h3.innerText += ` clues '${[...expected].join(" ")}' not present`;
    return;
  }

  h3.style.background = "green";
}

function onUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.readAsArrayBuffer(file);
  reader.onloadend = evt => fromUpload(evt.target.result);
}

function fromUpload(buffer) {
  const puz = Puz.decode(buffer);
  const {
    grid,
    clues,
    meta: {title, description},
  } = puz;
  const circleSet = new Set(puz.circles);

  if (description) {
    alert("WARNING! Include PDF!\n" + description);
  }

  const w = grid[0].length,
    h = grid.length,
    wh = `${w} ${h}`;
  $("w_h").value = wh;

  darks = grid.map(row => row.map(c => c == "."));
  circles = darks.map((row, y) => row.map((_, x) => circleSet.has(w * y + x)));

  solution = grid.map(row => row.map(c => c.solution || c));

  drawCreateGrid(wh);

  for (const k in clues) {
    const textArea = $(k[0] + "clues"); // i.e. 'aclues'
    textArea.value = clues[k]
      .map((s, i) => i + " " + s)
      .join("\n")
      .trim();
    validateClues(textArea);
  }

  const titleAfterYear = title.replace(/.*\d{4} */, "");
  $("title").innerText = titleAfterYear || "CrossWordy";
}

const clueIds = ["aclues", "dclues"];
async function createPuzzle() {
  darks = [[]];
  circles = [[]];
  drawCreateGrid("8 8");

  const upload = create(document.getElementsByTagName("h1")[0], "input", {
    type: "file",
    accept: ".puz",
  });

  upload.onchange = onUpload;
  $("topleft").style.display = "none";

  const clue = $("clue");
  clue.innerHTML = "";
  const input = create(clue, "input", {id: "w_h"});
  input.placeholder = "W H";
  input.oninput = () => drawCreateGrid(input.value);

  const format = create($("clues"), "button");
  format.innerText = "FORMAT";
  format.onclick = () => clueIds.forEach(c => validateClues($(c)));

  for (const cId of clueIds) {
    const parent = $(cId).parentElement;
    parent.removeChild($(cId));
    const textArea = create(parent, "textarea", {id: cId});
    // Could be helpful to run validateClues() for the oninput event, but makes it impossible to type normally
  }

  const button = create($("cluebar"), "button", {id: "goButton"});
  button.innerText = "GO";
  button.onclick = publishPuzzle;

  $("title").contentEditable = "true";
}

const urlParams = new URLSearchParams(window.location.search);
const databaseId = urlParams.get("id");
if (databaseId) {
  play();
} else {
  createPuzzle();
}

// TODO add deletion timeout mechanism?

/*
Debugging snippet!

for (const [x, y, c] of allCellValues()) {
  var inp = getTD(x, y).firstElementChild;
  inp.value = solution[y][x];
  onInput({target: inp})
}
*/
