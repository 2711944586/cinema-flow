const fs = require('fs');
const path = require('path');

const texPath = path.join(__dirname, '..', 'output', 'pdf', 'CinemaFlow-系统汇报.tex');
let tex = fs.readFileSync(texPath, 'utf8');

tex = tex.replace(/,\s*\n\s*pdfcreator=\{LaTeX via pandoc\}/g, '');
tex = tex.replace(/\n\\usepackage\{lmodern\}/g, '');

fs.writeFileSync(texPath, tex, 'utf8');
console.log(texPath);
