const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const sourcePath = path.join(rootDir, 'docs', 'CinemaFlow-系统汇报.md');
const outputDir = path.join(rootDir, 'output', 'pdf');
const diagramDir = path.join(outputDir, 'diagrams');
const outputMarkdownPath = path.join(outputDir, 'CinemaFlow-report-pdf.md');

const diagramTitles = [
  '云端部署形态',
  '核心业务链路',
  'Flask 单体 B/S 架构',
  '前后端分离架构',
  '完整 ER 图',
  '核心资料 ER 图',
  '用户行为 ER 图',
  '媒体与审计 ER 图',
  '状态流设计'
];

fs.mkdirSync(diagramDir, { recursive: true });

let markdown = fs.readFileSync(sourcePath, 'utf8');

markdown = markdown.replace(
  /^# CinemaFlow 电影库管理系统汇报[\s\S]*?## 0\. 云端部署与在线访问（重点展示）/,
  '## 0. 云端部署与在线访问（重点展示）'
);

markdown = markdown.replace(/^(#{2,6})(\s+)/gm, (_, hashes, gap) => `${hashes.slice(1)}${gap}`);
markdown = markdown.replace(/^(#{1,5})\s+\d+(?:\.\d+)*\.?\s+/gm, '$1 ');
markdown = markdown.replace(/\n## 完整 ER 图\s*\n+```mermaid/g, '\n```mermaid');
markdown = `\\clearpage\n\n${markdown}`;

let diagramIndex = 0;
markdown = markdown.replace(/```mermaid\s*([\s\S]*?)```/g, (_, code) => {
  diagramIndex += 1;
  const baseName = `report-diagram-${String(diagramIndex).padStart(2, '0')}`;
  const mmdPath = path.join(diagramDir, `${baseName}.mmd`);
  const imagePath = `output/pdf/diagrams/${baseName}.png`;
  const title = diagramTitles[diagramIndex - 1] ?? `系统图 ${diagramIndex}`;
  const printableCode = code
    .trim()
    .replace(/(\w+)\[\/api\/([^\]]+)\]/g, '$1["/api/$2"]');

  fs.writeFileSync(mmdPath, `${printableCode}\n`, 'utf8');

  if (title === '完整 ER 图') {
    return [
      '',
      '\\clearpage',
      '\\begin{landscape}',
      '\\phantomsection',
      '\\addcontentsline{toc}{subsection}{完整 ER 图}',
      '{\\sffamily\\bfseries\\large\\color{cfInk}完整 ER 图\\par}',
      '\\vspace{0.35cm}',
      '\\begin{center}',
      '\\centering',
      `\\includegraphics[width=0.98\\linewidth,height=0.86\\textheight,keepaspectratio]{${imagePath}}`,
      `\\captionof{figure}{${title}}`,
      '\\end{center}',
      '\\end{landscape}',
      '\\clearpage',
      ''
    ].join('\n');
  }

  return [
    '',
    '\\begin{center}',
    '\\centering',
    `\\includegraphics[width=0.96\\linewidth,height=0.56\\textheight,keepaspectratio]{${imagePath}}`,
    `\\captionof{figure}{${title}}`,
    '\\end{center}',
    ''
  ].join('\n');
});

markdown = markdown.replace(/!\[([^\]]+)\]\(screenshots\/([^)]+)\)/g, (_, alt, filename) => {
  return [
    '',
    '\\begin{center}',
    '\\centering',
    `\\includegraphics[width=0.94\\linewidth,height=0.34\\textheight,keepaspectratio]{docs/screenshots/${filename}}`,
    `\\captionof{figure}{${alt}}`,
    '\\end{center}',
    ''
  ].join('\n');
});

markdown = markdown.replace(/\n# 4\. 数据库设计/g, '\n\\clearpage\n\n# 4. 数据库设计');
markdown = markdown.replace(/\n# 8\. 页面截图与功能说明/g, '\n\\clearpage\n\n# 8. 页面截图与功能说明');
markdown = markdown.replace(/\n# 9\. 系统问题与总结/g, '\n\\clearpage\n\n# 9. 系统问题与总结');

fs.writeFileSync(outputMarkdownPath, markdown.trimEnd() + '\n', 'utf8');

console.log(`Prepared ${diagramIndex} Mermaid diagrams.`);
console.log(outputMarkdownPath);
