const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const docsDir = path.join(__dirname, 'docs');
const assetsDir = path.join(__dirname, 'assets');

app.use('/assets', express.static(assetsDir));
app.use(express.static(docsDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(docsDir, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`PawIDE static server running at http://${HOST}:${PORT}`);
});
