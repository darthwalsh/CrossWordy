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
    node.setAttribute(prop, attributes[prop])
  }
  return node;
}

/**
 * 
 * @param {number} x 
 * @param {number} y 
 * @returns {HTMLElement}
 */
function getTD(x, y) {
  return document.querySelectorAll(`tbody tr:nth-child(${y + 1}) td:nth-child(${x + 1})`)[0];
}

function inBounds(x, y) {
  return darks[y] && x in darks[y];
}

function writable(x, y) {
  return inBounds(x, y) && !darks[y][x];
}

function getDXY() {
  return vertical ? [0, 1] : [1, 0];
}

function getXY(td) {
  return [td.cellIndex, td.parentElement.rowIndex];
}

function* getRowCol(x, y) {
  const [dx, dy] = getDXY();

  for (; writable(x - dx, y - dy); x -= dx, y -= dy) { }
  for (; writable(x, y); x += dx, y += dy)
    yield [x, y];
}

let focus = [0, 0];
function updateFocus(x, y, newVertical) {
  if (focus) {
    [...getRowCol(...focus)].forEach(xy => getTD(...xy).style.background = '');
    getTD(...focus).style.background = ''
  }

  if (x != focus[0] || y != focus[1]) {
    $('rebus').checked = cellValue(x, y).length > 1;
  }

  focus = [x, y];
  vertical = newVertical;
  [...getRowCol(...focus)].forEach(xy => getTD(...xy).style.background = '#A4ABFF');

  const td = getTD(...focus);
  td.style.background = 'yellow';
  td.firstElementChild.select();
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

function drawFromDB() {
  const table = $('grid');

  const cols = darks[0].map((_, x) => darks.map(row => row[x]));
  let i = 0, f;

  const tbody = create(table, 'tbody')
  for (const [y, row] of darks.entries()) {
    const tr = create(tbody, 'tr');
    for (const [x, b] of row.entries()) {
      const td = create(tr, 'td');
      const input = create(td, 'input');
      if (b) {
        td.classList.add('dark');
        input.style.display = 'none';
      }
      if (circles[y][x]) {
        td.classList.add('circle');
      }

      if (isNum(x, darks[y]) || isNum(y, cols[x])) {
        const span = create(td, 'span');
        if (!i) {
          f = [x, y];
        }
        span.innerText = ++i;
      }
    }
  }

  document.documentElement.style.setProperty("--grid-width", darks[0].length);
  updateFocus(...f, false);

  table.onclick = onClick;
  table.oninput = onInput;
  table.onkeydown = onKeydown;

  $('rebus').oninput = _ => updateFocus(...focus, vertical)
}  

/**
 * @returns string
 */
function cellValue(x, y) {
  if (darks[y][x]) return null;
  const input = getTD(x, y).firstElementChild;
  return input.value;
}

function isRebus() {
  return $('rebus').checked;
}

const measurer = $('measurer')
function measureText(s) {
  measurer.innerText = s;
  return measurer.clientWidth;
}

/** @param {HTMLInputElement} input */
function scaleInput(input) {
  if (input.value.length <= 1) {
    input.style.setProperty('--font-scale', '');
  } else {
    const ratio = Math.min(1, 15 / measureText(input.value));
    input.style.setProperty('--font-scale', ratio);
  }
}

/**
 * @param {MouseEvent} e 
 */
function onClick(e) {
  const target = /** @type {HTMLElement} **/ (e.target);
  const td = target.closest('td');
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
  const input = /** @type {HTMLInputElement} **/ (e.target);
  if (input.value.length > 1 && !isRebus()) {
    input.value = input.value.slice(-1);
  }
  const td = input.closest('td');

  let [x, y] = getXY(td);
  doc.update({[`${x}_${y}`]: input.value});

  scaleInput(input);
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
  " ": {del: true, dx: 0},
  Clear: {del: true, dx: 0},
  Delete: {del: true, steps: 1},
}

/**
 * 
 * @param {KeyboardEvent} e 
 */
function onKeydown(e) {
  if (isRebus()) return;

  const input = /** @type {HTMLInputElement} **/ (e.target);
  const td = input.closest('td');
  if (!td) return;

  if (!(e.key in special)) return;
  let {dx=0, dy=0, del=false, steps=0} = special[e.key];
  let [x, y] = getXY(td);


  if (del) {
    input.value = '';
    doc.update({[getXY(td).join('_')]: input.value})
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
    updateFocus(x, y, vertical);
  } else {
    if (inBounds(x + dx, y + dy) && writable(x + dx, y + dy)) {
      updateFocus(x + dx, y + dy, vertical);
    }
  }
  return false;
}

let vertical = false;
/** @type {boolean[][]} */
let darks
let circles;
let doc;

function updateChars(doc) {
  if (doc.metadata.hasPendingWrites) return;
  
  const data = doc.data();
  for (const key in data) {
    if (!/\d+_\d+/.test(key)) continue;
    const [x, y] = key.split('_').map(Number);
    const input = getTD(x, y).firstElementChild;
    input.value = data[key];
    scaleInput(input);
  }
}

async function play() {
  doc = db.collection("puzzles").doc(databaseId);
  const darksReq = await doc.get();
  const {darkString} = darksReq.data();
  darks = darkString.trim().split('_')
    .map(row => row.split('').map(c => c == '@'));
  circles = darkString.trim().split('_')
    .map(row => row.split('').map(c => c == 'O'));

  drawFromDB();

  $('clue').onclick = () => {
    updateFocus(...focus, !vertical);
  };

  doc.onSnapshot(updateChars);
}


function drawGrid(size) {
  const table = $('grid');
  table.innerHTML = '';

  if (!size) {
    size = `${darks[0].length} ${darks.length}`;
  }

  let [ws, hs, a] = size.split(' ');
  if (a) {
    const span = create(table, 'span');
    span.style.color = 'darkred';
    span.innerText = '"W H" or "W" (e.g. "5 7")';
    return;
  }

  if (!hs) hs = ws;
  const [w, h] = [ws, hs].map(Number);
  if (!w || !h) {
    const span = create(table, 'span');
    span.style.color = 'darkred';
    span.innerText = '"W H" or "W" (e.g. "5 7")';
    return;
  }

  darks = Array(h).fill().map((_, y) => Array(w).fill().map((_, x) => 
    Boolean(darks[y] && darks[y][x])));
  circles = Array(h).fill().map((_, y) => Array(w).fill().map((_, x) => 
    Boolean(circles[y] && circles[y][x])));
  
  const cols = darks[0].map((_, x) => darks.map(row => row[x]));
  let i = 0;

  const tbody = create(table, 'tbody')
  for (const [y, row] of darks.entries()) {
    const tr = create(tbody, 'tr');
    for (const [x, b] of row.entries()) {
      const td = create(tr, 'td');

      if (b) {
        td.classList.add('dark');
      }
      if (circles[y][x]) {
        td.classList.add('circle');
      }

      if (isNum(x, darks[y]) || isNum(y, cols[x])) {
        const span = create(td, 'span');
        span.innerText = ++i;
      }
    }
  }

  document.documentElement.style.setProperty("--grid-width", darks[0].length);
  table.onclick = addOnClick;  
}


/**
 * @param {MouseEvent} e 
 */
function addOnClick(e) {
  const target = /** @type {HTMLElement} **/ (e.target);
  const td = target.closest('td');
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

  drawGrid();
}

async function publishPuzzle() {
  const ref = await db.collection("puzzles").add({
    darkString: darks.map((row, y) => row.map((b, x) => 
      b ? '@' : circles[y][x] ? 'O' : '.'
    ).join('')).join('_'),
  });

  window.location = `?id=${ref.id}`;
}

async function createPuzzle() {
  darks = [[]];
  circles = [[]];
  drawGrid('3 2');

  const clue = $('clue');
  clue.innerHTML = '';
  const input = create(clue, 'input');
  input.placeholder = 'W H';
  input.oninput = () => drawGrid(input.value);

  const button = create(clue, 'button');
  button.innerText = 'GO';
  button.onclick = publishPuzzle;
}

const urlParams = new URLSearchParams(window.location.search);
const databaseId = urlParams.get('id');
if (databaseId) {
  play();
} else {
  createPuzzle();
}

// TODO add deletion timeout mechanism?
