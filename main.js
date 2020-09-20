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
  return dataDarks[y] && x in dataDarks[y];
}

function writable(x, y) {
  return inBounds(x, y) && !dataDarks[y][x];
}

function getDXY() {
  return vertical ? [0, 1] : [1, 0];
}

function* getRowCol(x, y) {
  const [dx, dy] = getDXY();

  for (; writable(x - dx, y - dy); x -= dx, y -= dy) { }
  for (; writable(x, y); x += dx, y += dy)
    yield [x, y];
}

let focus;
function updateFocus(x, y, newVertical) {
  if (focus) {
    [...getRowCol(...focus)].forEach(xy => getTD(...xy).style.background = '');
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

/**
 * 
 * @param {boolean[][]} darks 
 */
function reload(darks) {
  const cols = darks[0].map((_, x) => darks.map(row => row[x]));
  let i = 0, f;

  table.removeChild(table.firstElementChild);
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
}  

/**
 * @returns string
 */
function cellValue(x, y) {
  if (dataDarks[y][x]) return null;
  const input = getTD(x, y).firstElementChild;
  return input.value;
}

/**
 * 
 * @param {MouseEvent} e 
 */
function onClick(e) {
  const target = /** @type {HTMLElement} **/ (e.target);
  const td = target.closest('td');
  if (!td) return;

  const x = td.cellIndex, y = td.parentElement.rowIndex;
  if (dataDarks[y][x]) return;

  updateFocus(x, y, vertical);
}

/**
 * 
 * @param {InputEvent} e 
 */
function onInput(e) {
  const input = /** @type {HTMLInputElement} **/ (e.target);
  if (input.value.length > 1) {
    input.value = input.value.slice(-1);
  }
  const td = input.closest('td');

  let x = td.cellIndex, y = td.parentElement.rowIndex;

  doc.update({[`${x}_${y}`]: input.value})

  const [dx, dy] = getDXY();

  while (inBounds(x, y) && cellValue(x, y)) {
    x += dx;
    y += dy;
  }

  if (writable(x, y)) {
    updateFocus(x, y, vertical);
  }
}

let vertical;
let dataDarks;
const table = $('grid');

const urlParams = new URLSearchParams(window.location.search);
const databaseId = urlParams.get('id');
if (!databaseId) { alert('TODO puzzle creation'); } //TODO
const doc = db.collection("puzzles").doc(databaseId);

function updateChars(doc) {
  if (doc.metadata.hasPendingWrites) return;
  
  const data = doc.data();
  for (const key in data) {
    if (!/\d+_\d+/.test(key)) continue;
    const [x, y] = key.split('_').map(Number);
    getTD(x, y).firstElementChild.value = data[key];
  }
}

async function load() {
  const darksReq = await doc.get();
  const {darks} = darksReq.data();
  dataDarks = darks.trim().split('_')
    .map(row => row.split('').map(c => c == '@'));

  reload(dataDarks);

  doc.onSnapshot(updateChars)

  table.onclick = onClick;
  table.oninput = onInput;

  $('hint').onclick = () => {
    updateFocus(...focus, !vertical);
  }
}
load()
