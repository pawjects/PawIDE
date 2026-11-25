// ==========================================
// PWA Registration & Install Prompt
// ==========================================
let deferredPrompt = null;

const initPWA = async () => {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('./sw.js');
        } catch (err) {
            console.warn('Service Worker registration skipped:', err);
        }
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        const installBtn = document.getElementById('btn-install');
        if (installBtn) {
            installBtn.classList.remove('hidden');
            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                installBtn.classList.add('hidden');
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                deferredPrompt = null;
            }, { once: true });
        }
    });
};

// ==========================================
// Default Starter Project
// ==========================================
const DEFAULT_FILES = {
    'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stopwatch</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="shell">
    <p class="label">Elapsed Time</p>
    <div id="readout" class="readout">00:00.00</div>
    <div class="controls">
      <button id="toggleBtn" class="primary">Start</button>
      <button id="lapBtn" disabled>Lap</button>
      <button id="resetBtn" disabled>Reset</button>
    </div>
    <ol id="laps" class="laps"></ol>
  </main>
  <script src="script.js"><\/script>
</body>
</html>`,
    'style.css': `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f8f9fb;
  color: #181b20;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 24px;
}

.shell {
  width: 100%;
  max-width: 360px;
  background: #ffffff;
  border: 1px solid #e2e5ec;
  border-radius: 10px;
  padding: 28px;
}

.label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 6px;
}

.readout {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 40px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
}

.controls {
  display: flex;
  gap: 8px;
}

button {
  flex: 1;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #d5dae3;
  background: #ffffff;
  color: #181b20;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #f3f5f8;
}

button:disabled {
  opacity: 0.45;
  cursor: default;
}

button.primary {
  background: #181b20;
  border-color: #181b20;
  color: #ffffff;
}

button.primary:hover:not(:disabled) {
  background: #2c313a;
}

.laps {
  list-style: none;
  margin-top: 18px;
  border-top: 1px solid #eceff4;
}

.laps:empty {
  display: none;
}

.laps li {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eceff4;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-variant-numeric: tabular-nums;
  color: #4b5563;
}`,
    'script.js': `const readout = document.getElementById('readout');
const toggleBtn = document.getElementById('toggleBtn');
const lapBtn = document.getElementById('lapBtn');
const resetBtn = document.getElementById('resetBtn');
const lapsList = document.getElementById('laps');

let running = false;
let elapsedMs = 0;
let startedAt = 0;
let frameId = null;
let lapCount = 0;

function formatTime(ms) {
  const minutes = String(Math.floor(ms / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const centiseconds = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
  return minutes + ':' + seconds + '.' + centiseconds;
}

function tick() {
  const total = elapsedMs + (performance.now() - startedAt);
  readout.textContent = formatTime(total);
  frameId = requestAnimationFrame(tick);
}

toggleBtn.addEventListener('click', () => {
  if (!running) {
    running = true;
    startedAt = performance.now();
    toggleBtn.textContent = 'Pause';
    lapBtn.disabled = false;
    resetBtn.disabled = false;
    frameId = requestAnimationFrame(tick);
    console.log('Timer started');
  } else {
    running = false;
    elapsedMs += performance.now() - startedAt;
    cancelAnimationFrame(frameId);
    toggleBtn.textContent = 'Resume';
    lapBtn.disabled = true;
    console.log('Timer paused at', formatTime(elapsedMs));
  }
});

lapBtn.addEventListener('click', () => {
  const current = elapsedMs + (running ? performance.now() - startedAt : 0);
  lapCount += 1;
  const item = document.createElement('li');
  item.innerHTML = '<span>Lap ' + lapCount + '</span><span>' + formatTime(current) + '</span>';
  lapsList.prepend(item);
  console.log('Lap ' + lapCount + ':', formatTime(current));
});

resetBtn.addEventListener('click', () => {
  running = false;
  elapsedMs = 0;
  lapCount = 0;
  cancelAnimationFrame(frameId);
  readout.textContent = '00:00.00';
  toggleBtn.textContent = 'Start';
  lapBtn.disabled = true;
  resetBtn.disabled = true;
  lapsList.innerHTML = '';
});`
};

const STORAGE_FILES_KEY = 'pawide-workspace-v2';
const STORAGE_SETTINGS_KEY = 'pawide-settings-v2';
const STORAGE_THEME_KEY = 'pawide-theme';

function getLanguageFromFilename(name) {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'html' || ext === 'htm') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'js' || ext === 'mjs') return 'javascript';
    if (ext === 'json') return 'json';
    return 'plaintext';
}

function getLanguageLabel(lang) {
    const map = { html: 'HTML', css: 'CSS', javascript: 'JavaScript', json: 'JSON', plaintext: 'Plain Text' };
    return map[lang] || 'Plain Text';
}

function getFileBadge(lang) {
    const map = { html: '<>', css: '#', javascript: 'JS', json: '{}', plaintext: 'TX' };
    return map[lang] || 'TX';
}

function loadInitialFiles() {
    try {
        const saved = localStorage.getItem(STORAGE_FILES_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                return parsed;
            }
        }
        // Migrate legacy v1 data cleanly if it exists and is customized
        const legacy = localStorage.getItem('paw-ide-data');
        if (legacy) {
            const old = JSON.parse(legacy);
            if (old && old.html && !old.html.includes('PawIDE Workspace')) {
                return {
                    'index.html': old.html,
                    'style.css': old.css || '',
                    'script.js': old.js || ''
                };
            }
        }
    } catch (_) {
        // Ignore corrupt localStorage
    }
    return { ...DEFAULT_FILES };
}

function loadSettings() {
    const defaults = {
        fontSize: 14,
        tabSize: 2,
        lineNumbers: 'on',
        wordWrap: false,
        minimap: false,
        fontLigatures: true,
        autoRun: true
    };
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_SETTINGS_KEY));
        if (saved && typeof saved === 'object') {
            return { ...defaults, ...saved };
        }
    } catch (_) {}
    return defaults;
}

// ==========================================
// Main IDE Controller
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initPWA();

    // Restore persisted theme immediately
    const initialTheme = localStorage.getItem(STORAGE_THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', initialTheme);

    // State
    let files = loadInitialFiles();
    let savedSnapshot = { ...files };
    let openTabs = Object.keys(files);
    let currentFile = openTabs.includes('index.html') ? 'index.html' : openTabs[0];
    let settings = loadSettings();
    let editorInstance = null;
    const models = new Map();

    let saveTimeout = null;
    let errorCount = 0;
    let warnCount = 0;
    let consoleEntries = [];
    let consoleFilter = 'all';
    let previewVisible = true;
    let activeSidePanel = 'explorer';
    let searchCaseSensitive = false;
    let cmdSelectedIndex = 0;
    let resetConfirmPending = false;

    // Elements
    const monacoContainer = document.getElementById('monaco-container');
    const editorLoading = document.getElementById('editor-loading');
    const previewFrame = document.getElementById('preview-frame');
    const deviceFrame = document.getElementById('device-frame');
    const dragShield = document.getElementById('drag-shield');
    const consoleWrapper = document.getElementById('console-wrapper');
    const consoleOutput = document.getElementById('console-output');
    const consoleBadge = document.getElementById('console-badge');
    const consoleReplForm = document.getElementById('console-repl-form');
    const consoleReplInput = document.getElementById('console-repl-input');
    const notificationContainer = document.getElementById('notification-container');

    const sidePanel = document.getElementById('side-panel');
    const resizer1 = document.getElementById('resizer-1');
    const resizer2 = document.getElementById('resizer-2');
    const editorPane = document.querySelector('.editor-pane');
    const previewPane = document.querySelector('.preview-pane');

    const fileListEl = document.getElementById('file-list');
    const editorTabsEl = document.getElementById('editor-tabs');
    const folderToggle = document.getElementById('folder-toggle');
    const newFileRow = document.getElementById('new-file-row');
    const newFileInput = document.getElementById('new-file-input');
    const breadcrumbFile = document.getElementById('breadcrumb-file');
    const breadcrumbMeta = document.getElementById('breadcrumb-meta');
    const titlebarContext = document.getElementById('titlebar-context');

    const statusError = document.getElementById('status-error');
    const statusWarn = document.getElementById('status-warn');
    const statusSaveState = document.getElementById('status-save-state');
    const statusSelection = document.getElementById('status-selection');
    const statusLine = document.getElementById('status-line');
    const statusIndent = document.getElementById('status-indent');
    const statusWrap = document.getElementById('status-wrap');
    const statusLang = document.getElementById('status-lang');

    const settingsModal = document.getElementById('settings-modal');
    const commandPalette = document.getElementById('command-palette');
    const cmdInput = document.getElementById('cmd-input');
    const cmdList = document.getElementById('cmd-list');
    const btnResetWorkspace = document.getElementById('btn-reset-workspace');

    const searchInput = document.getElementById('search-input');
    const searchCaseBtn = document.getElementById('search-case-toggle');
    const searchMeta = document.getElementById('search-meta');
    const searchResultsEl = document.getElementById('search-results');

    // Settings inputs
    const sFontSize = document.getElementById('setting-fontsize');
    const sTabSize = document.getElementById('setting-tabsize');
    const sLineNumbers = document.getElementById('setting-linenumbers');
    const sWordWrap = document.getElementById('setting-wordwrap');
    const sMinimap = document.getElementById('setting-minimap');
    const sLigatures = document.getElementById('setting-ligatures');
    const sAutoRun = document.getElementById('setting-autorun');

    // Start collapsed on narrow viewports so editor has full space
    if (window.innerWidth <= 900) {
        sidePanel.classList.add('collapsed');
    }

    // ==========================================
    // Notifications
    // ==========================================
    const showNotification = (message) => {
        const el = document.createElement('div');
        el.className = 'notification';
        el.textContent = message;
        notificationContainer.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 180);
        }, 2100);
    };

    const isFileDirty = (filename) => files[filename] !== savedSnapshot[filename];

    const hasAnyDirtyFiles = () => Object.keys(files).some(isFileDirty);

    const persistWorkspace = (notify = false) => {
        localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
        savedSnapshot = { ...files };
        statusSaveState.textContent = 'Saved';
        renderExplorer();
        renderTabs();
        if (notify) showNotification('Workspace saved');
    };

    // ==========================================
    // File Explorer & Editor Tabs Rendering
    // ==========================================
    const renderExplorer = () => {
        fileListEl.innerHTML = '';
        const names = Object.keys(files);

        names.forEach((filename) => {
            const lang = getLanguageFromFilename(filename);
            const li = document.createElement('li');
            li.className = 'file-item' + (filename === currentFile ? ' active' : '');
            li.setAttribute('role', 'treeitem');
            li.dataset.file = filename;

            const badge = document.createElement('span');
            badge.className = `file-badge lang-${lang}`;
            badge.textContent = getFileBadge(lang);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.textContent = filename;

            li.appendChild(badge);
            li.appendChild(nameSpan);

            if (isFileDirty(filename)) {
                const dot = document.createElement('span');
                dot.className = 'dirty-dot';
                dot.title = 'Unsaved changes';
                li.appendChild(dot);
            }

            if (names.length > 1) {
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'file-delete-btn';
                delBtn.title = `Delete ${filename}`;
                delBtn.setAttribute('aria-label', `Delete ${filename}`);
                delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteFile(filename);
                });
                li.appendChild(delBtn);
            }

            li.addEventListener('click', () => openFile(filename));
            fileListEl.appendChild(li);
        });
    };

    const renderTabs = () => {
        editorTabsEl.innerHTML = '';
        openTabs.forEach((filename) => {
            if (!(filename in files)) return;
            const lang = getLanguageFromFilename(filename);
            const tab = document.createElement('div');
            tab.className = 'editor-tab' + (filename === currentFile ? ' active' : '');
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', filename === currentFile ? 'true' : 'false');
            tab.dataset.file = filename;

            const badge = document.createElement('span');
            badge.className = `file-badge lang-${lang}`;
            badge.textContent = getFileBadge(lang);

            const label = document.createElement('span');
            label.textContent = filename;

            tab.appendChild(badge);
            tab.appendChild(label);

            if (isFileDirty(filename)) {
                const dot = document.createElement('span');
                dot.className = 'dirty-dot';
                tab.appendChild(dot);
            }

            if (openTabs.length > 1) {
                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'tab-close';
                closeBtn.title = `Close ${filename}`;
                closeBtn.setAttribute('aria-label', `Close ${filename}`);
                closeBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>';
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeTab(filename);
                });
                tab.appendChild(closeBtn);
            }

            tab.addEventListener('click', () => openFile(filename));
            editorTabsEl.appendChild(tab);
        });
    };

    const getOrCreateModel = (filename) => {
        if (!window.monaco) return null;
        if (models.has(filename)) return models.get(filename);
        const lang = getLanguageFromFilename(filename);
        const model = monaco.editor.createModel(files[filename] ?? '', lang);
        model.updateOptions({ tabSize: settings.tabSize, insertSpaces: true });
        model.onDidChangeContent(() => {
            files[filename] = model.getValue();
            statusSaveState.textContent = hasAnyDirtyFiles() ? 'Unsaved' : 'Saved';
            updateBreadcrumb();
            renderExplorer();
            renderTabs();
            if (activeSidePanel === 'search' && searchInput.value.trim()) {
                runWorkspaceSearch();
            }
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
                if (settings.autoRun) updatePreview();
            }, 450);
        });
        models.set(filename, model);
        return model;
    };

    const openFile = (filename, jumpTo = null) => {
        if (!(filename in files)) return;
        currentFile = filename;
        if (!openTabs.includes(filename)) {
            openTabs.push(filename);
        }

        if (editorInstance && window.monaco) {
            const model = getOrCreateModel(filename);
            if (editorInstance.getModel() !== model) {
                editorInstance.setModel(model);
            }
            if (jumpTo) {
                editorInstance.revealLineInCenter(jumpTo.line);
                editorInstance.setPosition({ lineNumber: jumpTo.line, column: jumpTo.column || 1 });
                editorInstance.focus();
            }
        }

        renderExplorer();
        renderTabs();
        updateBreadcrumb();
        updateStatusBar();

        if (window.innerWidth <= 900 && !sidePanel.classList.contains('collapsed')) {
            sidePanel.classList.add('collapsed');
        }
    };

    const closeTab = (filename) => {
        if (openTabs.length <= 1) return;
        const idx = openTabs.indexOf(filename);
        if (idx === -1) return;
        openTabs.splice(idx, 1);
        if (currentFile === filename) {
            const nextFile = openTabs[Math.max(0, idx - 1)] || openTabs[0];
            openFile(nextFile);
        } else {
            renderTabs();
        }
    };

    const createFile = (rawName) => {
        const name = rawName.trim().replace(/[^a-zA-Z0-9._-]/g, '');
        if (!name) return;
        if (name in files) {
            openFile(name);
            return;
        }
        files[name] = '';
        savedSnapshot[name] = '';
        openTabs.push(name);
        localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
        openFile(name);
        if (editorInstance) editorInstance.focus();
    };

    const deleteFile = (filename) => {
        const keys = Object.keys(files);
        if (keys.length <= 1) return;
        delete files[filename];
        delete savedSnapshot[filename];
        if (models.has(filename)) {
            models.get(filename).dispose();
            models.delete(filename);
        }
        openTabs = openTabs.filter((t) => t !== filename);
        if (openTabs.length === 0) openTabs = [Object.keys(files)[0]];
        if (currentFile === filename) {
            openFile(openTabs[0]);
        } else {
            renderExplorer();
            renderTabs();
        }
        localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
        if (settings.autoRun) updatePreview();
    };

    // ==========================================
    // Statusbar & Breadcrumb Updates
    // ==========================================
    const updateBreadcrumb = () => {
        breadcrumbFile.textContent = currentFile;
        titlebarContext.textContent = `project-paw / ${currentFile}`;
        const content = files[currentFile] || '';
        const lineCount = content === '' ? 1 : content.split('\n').length;
        breadcrumbMeta.textContent = `${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`;
        statusLang.textContent = getLanguageLabel(getLanguageFromFilename(currentFile));
    };

    const updateStatusBar = () => {
        statusIndent.textContent = `Spaces: ${settings.tabSize}`;
        statusWrap.textContent = `Wrap: ${settings.wordWrap ? 'On' : 'Off'}`;
        if (!editorInstance) return;
        const pos = editorInstance.getPosition();
        if (pos) {
            statusLine.textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
        }
        const sel = editorInstance.getSelection();
        if (sel && !sel.isEmpty()) {
            const selectedText = editorInstance.getModel().getValueInRange(sel);
            statusSelection.textContent = `(${selectedText.length} selected)`;
        } else {
            statusSelection.textContent = '';
        }
    };

    const updateDiagnosticCounts = () => {
        statusError.textContent = `${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`;
        statusWarn.textContent = `${warnCount} ${warnCount === 1 ? 'warning' : 'warnings'}`;
        statusError.classList.toggle('has-error', errorCount > 0);
        statusWarn.classList.toggle('has-warn', warnCount > 0);
    };

    // ==========================================
    // Live Preview Builder & Console Capture
    // ==========================================
    const updatePreview = () => {
        errorCount = 0;
        warnCount = 0;
        updateDiagnosticCounts();

        const htmlEntry = files['index.html'] ?? Object.entries(files).find(([k]) => k.endsWith('.html'))?.[1] ?? '';

        const consoleBridge = `<script>
(function() {
  function serialize(val) {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'string') return val;
    if (val instanceof Error) return val.name + ': ' + val.message;
    try { return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val); }
    catch (_) { return String(val); }
  }
  function send(type, args) {
    window.parent.postMessage({
      source: 'paw-preview',
      type: type,
      message: Array.from(args).map(serialize).join(' ')
    }, '*');
  }
  const origLog = console.log;
  const origWarn = console.warn;
  const origErr = console.error;
  console.log = function() { send('log', arguments); origLog.apply(console, arguments); };
  console.warn = function() { send('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function() { send('error', arguments); origErr.apply(console, arguments); };
  window.addEventListener('error', function(e) {
    send('error', [e.message + (e.lineno ? ' (line ' + e.lineno + ')' : '')]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    send('error', ['Unhandled rejection:', e.reason]);
  });
  window.addEventListener('message', function(e) {
    if (e.data && e.data.source === 'paw-repl') {
      try {
        const res = (0, eval)(e.data.code);
        send('result', [res]);
      } catch (err) {
        send('error', [err]);
      }
    }
  });
})();
<\/script>`;

        let combined = htmlEntry || '<!DOCTYPE html><html><head></head><body></body></html>';

        // Inline any workspace CSS files referenced via <link href="...">
        const inlinedCss = new Set();
        combined = combined.replace(/<link\b[^>]*href=["'](?:\.\/)?([^"']+\.css)["'][^>]*>/gi, (match, href) => {
            if (href in files) {
                inlinedCss.add(href);
                return `<style data-file="${href}">\n${files[href]}\n</style>`;
            }
            return match;
        });

        // Fallback: if style.css exists and wasn't explicitly linked, inject before </head>
        if ('style.css' in files && !inlinedCss.has('style.css')) {
            if (/<\/head>/i.test(combined)) {
                combined = combined.replace(/<\/head>/i, `<style data-file="style.css">\n${files['style.css']}\n</style>\n</head>`);
            } else {
                combined = `<style>${files['style.css']}</style>` + combined;
            }
        }

        // Inline any workspace JS files referenced via <script src="...">
        const inlinedJs = new Set();
        combined = combined.replace(/<script\b[^>]*src=["'](?:\.\/)?([^"']+\.js)["'][^>]*><\/script>/gi, (match, src) => {
            if (src in files) {
                inlinedJs.add(src);
                return `<script data-file="${src}">\n${files[src]}\n<\/script>`;
            }
            return match;
        });

        if ('script.js' in files && !inlinedJs.has('script.js')) {
            if (/<\/body>/i.test(combined)) {
                combined = combined.replace(/<\/body>/i, `<script data-file="script.js">\n${files['script.js']}\n<\/script>\n</body>`);
            } else {
                combined += `<script>${files['script.js']}<\/script>`;
            }
        }

        if (/<head[^>]*>/i.test(combined)) {
            combined = combined.replace(/<head[^>]*>/i, (m) => m + '\n' + consoleBridge);
        } else {
            combined = consoleBridge + combined;
        }

        previewFrame.srcdoc = combined;
    };

    // ==========================================
    // Console Rendering & REPL
    // ==========================================
    const formatTimestamp = () => {
        const d = new Date();
        return d.toTimeString().slice(0, 8);
    };

    const renderConsole = () => {
        const visible = consoleFilter === 'all'
            ? consoleEntries
            : consoleEntries.filter((e) => e.type === consoleFilter);

        consoleOutput.innerHTML = '';
        if (visible.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'console-empty';
            empty.textContent = consoleEntries.length === 0
                ? 'No console output yet. Use console.log() or evaluate an expression below.'
                : `No ${consoleFilter} messages.`;
            consoleOutput.appendChild(empty);
            return;
        }

        const levelLabels = { log: 'LOG', warn: 'WARN', error: 'ERR', result: 'RES' };
        visible.forEach((entry) => {
            const row = document.createElement('div');
            row.className = `console-entry log-${entry.type}`;

            const time = document.createElement('span');
            time.className = 'console-time';
            time.textContent = entry.time;

            const level = document.createElement('span');
            level.className = 'console-level';
            level.textContent = levelLabels[entry.type] || 'LOG';

            const msg = document.createElement('span');
            msg.className = 'console-msg';
            msg.textContent = entry.message;

            row.appendChild(time);
            row.appendChild(level);
            row.appendChild(msg);
            consoleOutput.appendChild(row);
        });
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    };

    const appendConsole = (type, message) => {
        consoleEntries.push({ type, message, time: formatTimestamp() });
        if (consoleEntries.length > 300) consoleEntries.shift();

        if (type === 'error') errorCount += 1;
        if (type === 'warn') warnCount += 1;
        updateDiagnosticCounts();

        const isConsoleActive = !consoleWrapper.classList.contains('hidden');
        if (!isConsoleActive) {
            const currentCount = parseInt(consoleBadge.textContent || '0', 10) + 1;
            consoleBadge.textContent = String(currentCount);
            consoleBadge.classList.remove('hidden');
            consoleBadge.classList.toggle('has-errors', errorCount > 0);
        }

        renderConsole();
    };

    window.addEventListener('message', (e) => {
        if (e.data && e.data.source === 'paw-preview') {
            appendConsole(e.data.type, e.data.message);
        }
    });

    consoleReplForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = consoleReplInput.value.trim();
        if (!code) return;
        consoleReplInput.value = '';
        appendConsole('log', `> ${code}`);
        if (previewFrame.contentWindow) {
            previewFrame.contentWindow.postMessage({ source: 'paw-repl', code }, '*');
        }
    });

    // ==========================================
    // Monaco Editor Initialization & Themes
    // ==========================================
    const getMonacoThemeName = () =>
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'pawDark' : 'pawLight';

    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
    require(['vs/editor/editor.main'], () => {
        monaco.editor.defineTheme('pawDark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '677086', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'c678dd' },
                { token: 'string', foreground: '98c379' },
                { token: 'number', foreground: 'd19a66' },
                { token: 'tag', foreground: 'e06c75' },
                { token: 'attribute.name', foreground: 'd19a66' },
                { token: 'attribute.value', foreground: '98c379' },
                { token: 'delimiter', foreground: '8a92a6' },
                { token: 'type', foreground: 'e5c07b' },
                { token: 'identifier', foreground: 'd9dde6' }
            ],
            colors: {
                'editor.background': '#1c1e24',
                'editor.foreground': '#d9dde6',
                'editor.lineHighlightBackground': '#23262f',
                'editor.lineHighlightBorder': '#23262f',
                'editorLineNumber.foreground': '#525868',
                'editorLineNumber.activeForeground': '#9da5b8',
                'editor.selectionBackground': '#2e3f5c',
                'editor.inactiveSelectionBackground': '#263042',
                'editorIndentGuide.background': '#272a33',
                'editorIndentGuide.activeBackground': '#3b4050',
                'editorCursor.foreground': '#4c8bf5',
                'editorWidget.background': '#22252d',
                'editorWidget.border': '#353946',
                'scrollbarSlider.background': '#35394680',
                'scrollbarSlider.hoverBackground': '#4a5063a0'
            }
        });

        monaco.editor.defineTheme('pawLight', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '868e9c', fontStyle: 'italic' },
                { token: 'keyword', foreground: '7c3aed' },
                { token: 'string', foreground: '1a7f37' },
                { token: 'number', foreground: 'b45309' },
                { token: 'tag', foreground: 'c9372c' },
                { token: 'attribute.name', foreground: '9f6b00' },
                { token: 'attribute.value', foreground: '1a7f37' }
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#1c2026',
                'editor.lineHighlightBackground': '#f6f7f9',
                'editorLineNumber.foreground': '#9aa2b1',
                'editorLineNumber.activeForeground': '#3b4250',
                'editor.selectionBackground': '#dbeafe',
                'editorIndentGuide.background': '#eceff4',
                'editorIndentGuide.activeBackground': '#cfd5df',
                'editorCursor.foreground': '#2563eb'
            }
        });

        const initialModel = getOrCreateModel(currentFile);
        editorInstance = monaco.editor.create(monacoContainer, {
            model: initialModel,
            theme: getMonacoThemeName(),
            fontFamily: "'JetBrains Mono', monospace",
            fontLigatures: settings.fontLigatures,
            fontSize: settings.fontSize,
            lineHeight: 22,
            tabSize: settings.tabSize,
            lineNumbers: settings.lineNumbers,
            wordWrap: settings.wordWrap ? 'on' : 'off',
            minimap: { enabled: settings.minimap },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'all',
            padding: { top: 12, bottom: 16 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            guides: { indentation: true }
        });

        editorLoading.classList.add('hidden');

        editorInstance.onDidChangeCursorPosition(updateStatusBar);
        editorInstance.onDidChangeCursorSelection(updateStatusBar);

        editorInstance.addAction({
            id: 'paw-save',
            label: 'Save Workspace',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: () => persistWorkspace(true)
        });

        editorInstance.addAction({
            id: 'paw-run',
            label: 'Run Preview',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
            run: () => {
                updatePreview();
                showNotification('Preview refreshed');
            }
        });

        renderExplorer();
        renderTabs();
        updateBreadcrumb();
        updateStatusBar();
        applySettingsUI();
        updatePreview();
    });

    // ==========================================
    // Cross-File Search
    // ==========================================
    const runWorkspaceSearch = () => {
        const query = searchInput.value;
        searchResultsEl.innerHTML = '';

        if (!query) {
            searchMeta.textContent = 'Type to search workspace';
            return;
        }

        const needle = searchCaseSensitive ? query : query.toLowerCase();
        let totalMatches = 0;
        let matchedFiles = 0;

        Object.entries(files).forEach(([filename, content]) => {
            const lines = content.split('\n');
            const matches = [];

            lines.forEach((lineText, idx) => {
                const haystack = searchCaseSensitive ? lineText : lineText.toLowerCase();
                const col = haystack.indexOf(needle);
                if (col !== -1) {
                    matches.push({ line: idx + 1, column: col + 1, text: lineText, matchStart: col });
                }
            });

            if (matches.length > 0) {
                matchedFiles += 1;
                totalMatches += matches.length;

                const group = document.createElement('div');
                group.className = 'search-file-group';

                const header = document.createElement('div');
                header.className = 'search-file-header';
                const fileSpan = document.createElement('span');
                fileSpan.textContent = filename;
                const countSpan = document.createElement('span');
                countSpan.className = 'search-file-count';
                countSpan.textContent = String(matches.length);
                header.appendChild(fileSpan);
                header.appendChild(countSpan);
                group.appendChild(header);

                matches.slice(0, 30).forEach((m) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'search-match';

                    const num = document.createElement('span');
                    num.className = 'search-line-num';
                    num.textContent = String(m.line);

                    const snippet = document.createElement('span');
                    snippet.className = 'search-line-text';

                    const trimmedLead = m.text.length - m.text.trimStart().length;
                    const display = m.text.trimStart();
                    const relStart = Math.max(0, m.matchStart - trimmedLead);
                    const before = display.slice(0, relStart);
                    const hit = display.slice(relStart, relStart + query.length);
                    const after = display.slice(relStart + query.length);

                    snippet.appendChild(document.createTextNode(before));
                    const mark = document.createElement('span');
                    mark.className = 'search-highlight';
                    mark.textContent = hit;
                    snippet.appendChild(mark);
                    snippet.appendChild(document.createTextNode(after));

                    btn.appendChild(num);
                    btn.appendChild(snippet);
                    btn.addEventListener('click', () => openFile(filename, { line: m.line, column: m.column }));
                    group.appendChild(btn);
                });

                searchResultsEl.appendChild(group);
            }
        });

        searchMeta.textContent = totalMatches === 0
            ? 'No results found'
            : `${totalMatches} ${totalMatches === 1 ? 'result' : 'results'} in ${matchedFiles} ${matchedFiles === 1 ? 'file' : 'files'}`;
    };

    searchInput.addEventListener('input', runWorkspaceSearch);
    searchCaseBtn.addEventListener('click', () => {
        searchCaseSensitive = !searchCaseSensitive;
        searchCaseBtn.classList.toggle('active', searchCaseSensitive);
        searchCaseBtn.setAttribute('aria-pressed', String(searchCaseSensitive));
        runWorkspaceSearch();
    });

    // ==========================================
    // Workspace Actions & Controls
    // ==========================================
    const toggleSidebar = (forceOpen = null) => {
        const shouldOpen = forceOpen !== null ? forceOpen : sidePanel.classList.contains('collapsed');
        sidePanel.classList.toggle('collapsed', !shouldOpen);
        resizer1.classList.toggle('hidden', !shouldOpen);
        document.querySelectorAll('.activity-btn[data-panel]').forEach((btn) => {
            btn.classList.toggle('active', shouldOpen && btn.dataset.panel === activeSidePanel);
        });
        if (editorInstance) setTimeout(() => editorInstance.layout(), 60);
    };

    const switchSidePanel = (panelName) => {
        if (!sidePanel.classList.contains('collapsed') && activeSidePanel === panelName) {
            toggleSidebar(false);
            return;
        }
        activeSidePanel = panelName;
        toggleSidebar(true);
        document.getElementById('explorer-view').classList.toggle('active', panelName === 'explorer');
        document.getElementById('search-view').classList.toggle('active', panelName === 'search');
        if (panelName === 'search') {
            setTimeout(() => searchInput.focus(), 20);
        }
    };

    const togglePreview = () => {
        previewVisible = !previewVisible;
        previewPane.classList.toggle('hidden', !previewVisible);
        resizer2.classList.toggle('hidden', !previewVisible);
        editorPane.classList.toggle('maximized', !previewVisible);
        document.getElementById('btn-toggle-preview').classList.toggle('active', !previewVisible);
        if (editorInstance) setTimeout(() => editorInstance.layout(), 60);
    };

    const switchPaneTab = (viewName) => {
        document.querySelectorAll('.pane-tab').forEach((t) => {
            const active = t.dataset.view === viewName;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', String(active));
        });
        const isConsole = viewName === 'console';
        consoleWrapper.classList.toggle('hidden', !isConsole);
        document.getElementById('preview-toolbar').classList.toggle('hidden', isConsole);
        document.getElementById('console-toolbar').classList.toggle('hidden', !isConsole);
        if (isConsole) {
            consoleBadge.classList.add('hidden');
            consoleBadge.textContent = '0';
            if (!previewVisible) togglePreview();
        }
    };

    const toggleTheme = () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_THEME_KEY, next);
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', next === 'dark' ? '#141518' : '#f3f4f6');
        if (editorInstance && window.monaco) {
            monaco.editor.setTheme(getMonacoThemeName());
        }
        showNotification(`Switched to ${next} theme`);
    };

    const formatCurrentFile = () => {
        if (!editorInstance) return;
        const action = editorInstance.getAction('editor.action.formatDocument');
        if (action) {
            action.run();
            showNotification('Document formatted');
        }
    };

    const exportFiles = () => {
        Object.entries(files).forEach(([filename, text], idx) => {
            setTimeout(() => {
                const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, idx * 140);
        });
        showNotification(`Exported ${Object.keys(files).length} files`);
    };

    const resetWorkspace = () => {
        models.forEach((m) => m.dispose());
        models.clear();
        files = { ...DEFAULT_FILES };
        savedSnapshot = { ...DEFAULT_FILES };
        openTabs = Object.keys(files);
        currentFile = 'index.html';
        localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(files));
        openFile('index.html');
        updatePreview();
        statusSaveState.textContent = 'Saved';
        showNotification('Workspace reset to starter files');
    };

    // Wire Titlebar & Activity Buttons
    document.getElementById('btn-toggle-sidebar').addEventListener('click', () => toggleSidebar());
    document.getElementById('btn-run').addEventListener('click', () => {
        updatePreview();
        showNotification('Preview refreshed');
    });
    document.getElementById('btn-reload-preview').addEventListener('click', () => updatePreview());
    document.getElementById('btn-format').addEventListener('click', formatCurrentFile);
    document.getElementById('btn-toggle-preview').addEventListener('click', togglePreview);
    document.getElementById('btn-download').addEventListener('click', exportFiles);
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    document.querySelectorAll('.activity-btn[data-panel]').forEach((btn) => {
        btn.addEventListener('click', () => switchSidePanel(btn.dataset.panel));
    });

    // Folder collapse & New File inline input
    folderToggle.addEventListener('click', () => {
        const expanded = folderToggle.getAttribute('aria-expanded') === 'true';
        folderToggle.setAttribute('aria-expanded', String(!expanded));
        fileListEl.classList.toggle('collapsed', expanded);
    });

    document.getElementById('btn-new-file').addEventListener('click', () => {
        folderToggle.setAttribute('aria-expanded', 'true');
        fileListEl.classList.remove('collapsed');
        newFileRow.classList.remove('hidden');
        newFileInput.value = '';
        newFileInput.focus();
    });

    const commitNewFile = () => {
        if (newFileRow.classList.contains('hidden')) return;
        const val = newFileInput.value.trim();
        newFileInput.value = '';
        newFileRow.classList.add('hidden');
        if (val) createFile(val);
    };

    newFileInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitNewFile();
        } else if (e.key === 'Escape') {
            newFileInput.value = '';
            newFileRow.classList.add('hidden');
        }
    });
    newFileInput.addEventListener('blur', commitNewFile);

    // Preview & Console Pane Controls
    document.querySelectorAll('.pane-tab').forEach((tab) => {
        tab.addEventListener('click', () => switchPaneTab(tab.dataset.view));
    });

    document.querySelectorAll('.viewport-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.viewport-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            deviceFrame.className = `device-frame device-${btn.dataset.device}`;
        });
    });

    document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            consoleFilter = btn.dataset.filter;
            renderConsole();
        });
    });

    document.getElementById('btn-clear-console').addEventListener('click', () => {
        consoleEntries = [];
        errorCount = 0;
        warnCount = 0;
        updateDiagnosticCounts();
        renderConsole();
    });

    // Status Bar Quick Actions
    document.getElementById('status-diagnostics').addEventListener('click', () => switchPaneTab('console'));

    statusIndent.addEventListener('click', () => {
        settings.tabSize = settings.tabSize === 2 ? 4 : 2;
        applySettingsAndSave();
    });

    statusWrap.addEventListener('click', () => {
        settings.wordWrap = !settings.wordWrap;
        applySettingsAndSave();
    });

    // ==========================================
    // Settings Modal
    // ==========================================
    const applySettingsUI = () => {
        sFontSize.value = String(settings.fontSize);
        sTabSize.value = String(settings.tabSize);
        sLineNumbers.value = settings.lineNumbers;
        sWordWrap.checked = settings.wordWrap;
        sMinimap.checked = settings.minimap;
        sLigatures.checked = settings.fontLigatures;
        sAutoRun.checked = settings.autoRun;
    };

    const applySettingsAndSave = () => {
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
        applySettingsUI();
        if (editorInstance) {
            editorInstance.updateOptions({
                fontSize: settings.fontSize,
                lineNumbers: settings.lineNumbers,
                wordWrap: settings.wordWrap ? 'on' : 'off',
                minimap: { enabled: settings.minimap },
                fontLigatures: settings.fontLigatures
            });
            models.forEach((m) => m.updateOptions({ tabSize: settings.tabSize }));
        }
        updateStatusBar();
    };

    const openSettings = () => {
        resetConfirmPending = false;
        btnResetWorkspace.textContent = 'Reset Workspace';
        btnResetWorkspace.classList.remove('confirming');
        applySettingsUI();
        settingsModal.classList.remove('hidden');
    };

    const closeSettings = () => {
        settingsModal.classList.add('hidden');
        if (editorInstance) editorInstance.focus();
    };

    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('close-settings').addEventListener('click', closeSettings);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });

    [sFontSize, sTabSize, sLineNumbers, sWordWrap, sMinimap, sLigatures, sAutoRun].forEach((el) => {
        el.addEventListener('change', () => {
            settings = {
                fontSize: parseInt(sFontSize.value, 10),
                tabSize: parseInt(sTabSize.value, 10),
                lineNumbers: sLineNumbers.value,
                wordWrap: sWordWrap.checked,
                minimap: sMinimap.checked,
                fontLigatures: sLigatures.checked,
                autoRun: sAutoRun.checked
            };
            applySettingsAndSave();
        });
    });

    btnResetWorkspace.addEventListener('click', () => {
        if (!resetConfirmPending) {
            resetConfirmPending = true;
            btnResetWorkspace.textContent = 'Click again to confirm';
            btnResetWorkspace.classList.add('confirming');
            return;
        }
        resetConfirmPending = false;
        btnResetWorkspace.textContent = 'Reset Workspace';
        btnResetWorkspace.classList.remove('confirming');
        closeSettings();
        resetWorkspace();
    });

    // ==========================================
    // Command Palette (Keyboard Navigable)
    // ==========================================
    const COMMANDS = [
        { id: 'run', category: 'Preview', label: 'Run & Refresh Preview', shortcut: 'Ctrl+Enter', run: () => { updatePreview(); showNotification('Preview refreshed'); } },
        { id: 'save', category: 'File', label: 'Save Workspace', shortcut: 'Ctrl+S', run: () => persistWorkspace(true) },
        { id: 'new-file', category: 'File', label: 'New File', shortcut: '', run: () => { switchSidePanel('explorer'); document.getElementById('btn-new-file').click(); } },
        { id: 'format', category: 'Editor', label: 'Format Document', shortcut: 'Shift+Alt+F', run: formatCurrentFile },
        { id: 'toggle-wrap', category: 'Editor', label: 'Toggle Word Wrap', shortcut: '', run: () => { settings.wordWrap = !settings.wordWrap; applySettingsAndSave(); } },
        { id: 'toggle-minimap', category: 'Editor', label: 'Toggle Minimap', shortcut: '', run: () => { settings.minimap = !settings.minimap; applySettingsAndSave(); } },
        { id: 'toggle-sidebar', category: 'View', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', run: () => toggleSidebar() },
        { id: 'toggle-preview', category: 'View', label: 'Toggle Preview Pane', shortcut: 'Ctrl+\\', run: togglePreview },
        { id: 'focus-search', category: 'View', label: 'Search Across Files', shortcut: 'Ctrl+Shift+F', run: () => switchSidePanel('search') },
        { id: 'open-console', category: 'View', label: 'Open Console Panel', shortcut: '', run: () => switchPaneTab('console') },
        { id: 'theme', category: 'Preferences', label: 'Switch Dark / Light Theme', shortcut: '', run: toggleTheme },
        { id: 'settings', category: 'Preferences', label: 'Open Editor Settings', shortcut: 'Ctrl+,', run: openSettings },
        { id: 'download', category: 'File', label: 'Export Workspace Files', shortcut: '', run: exportFiles },
        { id: 'reset', category: 'Workspace', label: 'Reset Workspace to Starter', shortcut: '', run: resetWorkspace }
    ];

    let filteredCommands = [...COMMANDS];

    const renderCommandList = () => {
        cmdList.innerHTML = '';
        if (filteredCommands.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'cmd-empty';
            empty.textContent = 'No matching commands';
            cmdList.appendChild(empty);
            return;
        }
        filteredCommands.forEach((cmd, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cmd-item' + (idx === cmdSelectedIndex ? ' selected' : '');
            btn.setAttribute('role', 'option');
            btn.innerHTML = `<span><span class="cmd-item-cat">${cmd.category}:</span>${cmd.label}</span>` +
                (cmd.shortcut ? `<kbd class="cmd-shortcut">${cmd.shortcut}</kbd>` : '');
            btn.addEventListener('mouseenter', () => {
                cmdSelectedIndex = idx;
                cmdList.querySelectorAll('.cmd-item').forEach((el, i) => el.classList.toggle('selected', i === idx));
            });
            btn.addEventListener('click', () => executeCommand(cmd));
            cmdList.appendChild(btn);
        });
    };

    const openCommandPalette = () => {
        commandPalette.classList.remove('hidden');
        cmdInput.value = '';
        filteredCommands = [...COMMANDS];
        cmdSelectedIndex = 0;
        renderCommandList();
        cmdInput.focus();
    };

    const closeCommandPalette = () => {
        commandPalette.classList.add('hidden');
        if (editorInstance) editorInstance.focus();
    };

    const executeCommand = (cmd) => {
        closeCommandPalette();
        cmd.run();
    };

    document.getElementById('btn-command-palette').addEventListener('click', openCommandPalette);
    commandPalette.addEventListener('click', (e) => {
        if (e.target === commandPalette) closeCommandPalette();
    });

    cmdInput.addEventListener('input', () => {
        const q = cmdInput.value.trim().toLowerCase();
        filteredCommands = COMMANDS.filter((c) => `${c.category} ${c.label}`.toLowerCase().includes(q));
        cmdSelectedIndex = 0;
        renderCommandList();
    });

    cmdInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredCommands.length > 0) {
                cmdSelectedIndex = (cmdSelectedIndex + 1) % filteredCommands.length;
                renderCommandList();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredCommands.length > 0) {
                cmdSelectedIndex = (cmdSelectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
                renderCommandList();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[cmdSelectedIndex]) {
                executeCommand(filteredCommands[cmdSelectedIndex]);
            }
        }
    });

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && (e.key.toLowerCase() === 'k' || (e.shiftKey && e.key.toLowerCase() === 'p'))) {
            e.preventDefault();
            if (commandPalette.classList.contains('hidden')) openCommandPalette();
            else closeCommandPalette();
        } else if (mod && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            toggleSidebar();
        } else if (mod && e.key === '\\') {
            e.preventDefault();
            togglePreview();
        } else if (mod && e.key === ',') {
            e.preventDefault();
            openSettings();
        } else if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            switchSidePanel('search');
        } else if (mod && e.shiftKey && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            switchSidePanel('explorer');
        } else if (mod && e.key.toLowerCase() === 's') {
            e.preventDefault();
            persistWorkspace(true);
        } else if (e.key === 'Escape') {
            if (!commandPalette.classList.contains('hidden')) closeCommandPalette();
            if (!settingsModal.classList.contains('hidden')) closeSettings();
        }
    });

    // ==========================================
    // Precision Split Resizers (with iframe shield)
    // ==========================================
    let dragging = null;

    const startDrag = (target) => {
        dragging = target;
        target.classList.add('dragging');
        dragShield.classList.remove('hidden');
        document.body.style.userSelect = 'none';
    };

    const stopDrag = () => {
        if (!dragging) return;
        dragging.classList.remove('dragging');
        dragging = null;
        dragShield.classList.add('hidden');
        document.body.style.userSelect = '';
        if (editorInstance) editorInstance.layout();
    };

    resizer1.addEventListener('mousedown', () => startDrag(resizer1));
    resizer2.addEventListener('mousedown', () => startDrag(resizer2));
    resizer2.addEventListener('touchstart', () => startDrag(resizer2), { passive: true });

    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);

    const onPointerMove = (clientX, clientY) => {
        if (!dragging) return;
        if (dragging === resizer1) {
            const nextWidth = Math.min(380, Math.max(170, clientX - 44));
            sidePanel.style.width = `${nextWidth}px`;
            if (editorInstance) editorInstance.layout();
        } else if (dragging === resizer2) {
            const splitRect = document.getElementById('main-split-view').getBoundingClientRect();
            const isStacked = window.innerWidth <= 900;
            if (isStacked) {
                const pct = ((clientY - splitRect.top) / splitRect.height) * 100;
                if (pct > 18 && pct < 82) {
                    editorPane.style.flexBasis = `${pct}%`;
                    previewPane.style.flexBasis = `${100 - pct}%`;
                }
            } else {
                const pct = ((clientX - splitRect.left) / splitRect.width) * 100;
                if (pct > 20 && pct < 80) {
                    editorPane.style.flexBasis = `${pct}%`;
                    previewPane.style.flexBasis = `${100 - pct}%`;
                }
            }
            if (editorInstance) editorInstance.layout();
        }
    };

    document.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    document.addEventListener('touchmove', (e) => {
        if (e.touches[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('resize', () => {
        if (editorInstance) editorInstance.layout();
    });
});