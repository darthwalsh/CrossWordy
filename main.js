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

//TODO load from database
const dataDarks = `
...@@
...@.
...@.
.....
@@.@.`.trim().split('\n')
  .map(row => row.split('').map(c => c == '@'));

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
  let i = 0;

  const table = $('grid');
  table.removeChild(table.firstElementChild);
  const tbody = create(table, 'tbody')
  for (const [y, row] of darks.entries()) {
    const tr = create(tbody, 'tr');
    for (const [x, b] of row.entries()) {
      const td = create(tr, 'td');
      if (b) {
        td.classList.add('dark');
      }
      create(td, 'div');

      if (isNum(x, darks[y]) || isNum(y, cols[x])) {
        const span = create(td, 'span');
        span.innerText = ++i;
      }
    }
  }

  document.documentElement.style.setProperty("--grid-width", darks[0].length);
}  


reload(dataDarks);
