"use strict";

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

let vertical;

//(database) load data from database
const dataDarks = `
...@@
...@.
...@.
.....
@@...`.trim().split('\n')
  .map(row => row.split('').map(c => c == '@'));

const table = $('grid');

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
      if (b) {
        td.classList.add('dark');
      }
      create(td, 'input');

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
  //TODO(database) the source of truth should be the database, not the DOM
  const input = getTD(x, y).firstElementChild;
  return input.value;
}

reload(dataDarks);

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
table.onclick = onClick;

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
  const [dx, dy] = getDXY();

  while (inBounds(x, y) && cellValue(x, y)) {
    x += dx;
    y += dy;
  }

  if (writable(x, y)) {
    updateFocus(x, y, vertical);
  }
}
table.oninput = onInput;

$('hint').onclick = () => {
  updateFocus(...focus, !vertical);
}
