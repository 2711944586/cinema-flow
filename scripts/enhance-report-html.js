const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, '..', 'docs', 'CinemaFlow-系统汇报.html');
let html = fs.readFileSync(reportPath, 'utf8');

html = html.replace(
  /<pre class="mermaid"><code>([\s\S]*?)<\/code><\/pre>/g,
  (_, code) => `<pre class="mermaid">${decodeHtml(code).trim()}</pre>`
);

const mermaidBootstrap = `
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
</script>
`;

if (!html.includes('mermaid.initialize')) {
  html = html.replace('</body>', `${mermaidBootstrap}\n</body>`);
}

fs.writeFileSync(reportPath, html);

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
