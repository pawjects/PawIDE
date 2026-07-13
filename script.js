if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const monacoContainer = document.getElementById('monaco-container');
    const previewFrame = document.getElementById('preview-frame');
    const consoleWrapper = document.getElementById('console-wrapper');
    const consoleOutput = document.getElementById('console-output');
    const typingIndicator = document.getElementById('typing-indicator');
    const notificationContainer = document.getElementById('notification-container');
    const commandPalette = document.getElementById('command-palette');
    const cmdInput = document.getElementById('cmd-input');
    const settingsModal = document.getElementById('settings-modal');
    
    const defaultCode = {
        html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Paw IDE App</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="container">\n    <h1>Welcome to Paw IDE 🚀</h1>\n    <p>Edit HTML, CSS, and JS to see live updates.</p>\n    <button id="clickMe">Click Me</button>\n  </div>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
        css: `body {\n  font-family: 'Inter', sans-serif;\n  background: #1e1e1e;\n  color: #cccccc;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.container {\n  text-align: center;\n  background: rgba(255,255,255,0.05);\n  padding: 2rem;\n  border-radius: 12px;\n  border: 1px solid rgba(255,255,255,0.1);\n}\n\nh1 { color: #007acc; }\n\nbutton {\n  background: #007acc;\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 6px;\n  cursor: pointer;\n  font-weight: bold;\n  transition: 0.2s;\n}\nbutton:hover { background: #0098ff; }`,
        js: `document.getElementById('clickMe').addEventListener('click', () => {\n  console.log('Button clicked!');\n  alert('Hello from Paw IDE!');\n});`
    };

    let files = JSON.parse(localStorage.getItem('paw-ide-data')) || { ...defaultCode };
    let currentFile = 'html';
    let editorInstance = null;
    let models = {};
    let saveTimeout = null;
    let errorCount = 0;
    let warnCount = 0;
    
    let settings = JSON.parse(localStorage.getItem('paw-settings')) || { fontSize: 14, wordWrap: false, minimap: true, autoRun: true };

    function showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ${message}`;
        notificationContainer.appendChild(notif);
        requestAnimationFrame(() => notif.classList.add('show'));
        setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 300); }, 3000);
    }

    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        models.html = monaco.editor.createModel(files.html, "html");
        models.css = monaco.editor.createModel(files.css, "css");
        models.js = monaco.editor.createModel(files.js, "javascript");

        monaco.editor.defineTheme('pawDark', {
            base: 'vs-dark', inherit: true,
            rules: [{ background: '1e1e1e' }],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.lineHighlightBackground': '#2a2d2e',
                'editorLineNumber.foreground': '#858585',
                'editorIndentGuide.background': '#404040'
            }
        });

        editorInstance = monaco.editor.create(monacoContainer, {
            model: models[currentFile],
            theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'pawDark' : 'vs',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: settings.fontSize,
            wordWrap: settings.wordWrap ? "on" : "off",
            minimap: { enabled: settings.minimap },
            automaticLayout: true,
            padding: { top: 15 },
            scrollBeyondLastLine: false,
            roundedSelection: true,
            formatOnPaste: true
        });

        editorInstance.onDidChangeModelContent(() => {
            files[currentFile] = editorInstance.getValue();
            typingIndicator.classList.remove('hidden');
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                localStorage.setItem('paw-ide-data', JSON.stringify(files));
                if(settings.autoRun) updatePreview(false);
                typingIndicator.classList.add('hidden');
            }, 1000);
            updateStatusBar();
        });
        
        editorInstance.onDidChangeCursorPosition(updateStatusBar);

        editorInstance.addAction({
            id: 'save-code', label: 'Save Code',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: () => { localStorage.setItem('paw-ide-data', JSON.stringify(files)); showNotification("Workspace saved"); }
        });
        
        editorInstance.addAction({
            id: 'run-code', label: 'Run Code',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
            run: () => updatePreview(true)
        });

        setTimeout(() => {
            splashScreen.style.opacity = '0';
            setTimeout(() => splashScreen.style.display = 'none', 500);
            updatePreview(true); applySettingsUI();
        }, 1000);
    });

    function updatePreview(manual = false) {
        if (manual) showNotification("Running Project...");
        errorCount = 0; warnCount = 0;
        document.getElementById('status-error').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> 0 Errors`;
        document.getElementById('status-warn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> 0 Warnings`;

        const consoleCaptureScript = `<script>
            (function() {
                const sendMsg = (type, args) => {
                    const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
                    window.parent.postMessage({ source: 'paw-preview', type, message: msg }, '*');
                };
                const oLog = console.log, oErr = console.error, oWarn = console.warn;
                console.log = function(...args) { sendMsg('log', args); oLog.apply(console, args); };
                console.error = function(...args) { sendMsg('error', args); oErr.apply(console, args); };
                console.warn = function(...args) { sendMsg('warn', args); oWarn.apply(console, args); };
                window.onerror = function(msg, url, line) { sendMsg('error', [msg + ' (Line: ' + line + ')']); return false; };
            })();
        <\/script>`;

        let combinedSource = files.html.replace('</head>', `<style>${files.css}</style></head>`);
        const scriptTagRegex = /<script\s+src=["']script\.js["']><\/script>/i;
        if(scriptTagRegex.test(combinedSource)) combinedSource = combinedSource.replace(scriptTagRegex, `<script>${files.js}<\/script>`);
        else combinedSource = combinedSource.replace('</body>', `<script>${files.js}<\/script></body>`);
        combinedSource = combinedSource.replace('<head>', '<head>' + consoleCaptureScript);

        previewFrame.srcdoc = combinedSource;
    }

    window.addEventListener('message', (e) => {
        if(e.data && e.data.source === 'paw-preview') appendConsole(e.data.type, e.data.message);
    });

    function appendConsole(type, msg) {
        const div = document.createElement('div');
        div.className = `console-log log-${type}`;
        div.textContent = `> ${msg}`;
        consoleOutput.appendChild(div);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;

        const badge = document.getElementById('console-badge');
        badge.textContent = parseInt(badge.textContent) + 1;
        badge.classList.remove('hidden');

        if(type === 'error') {
            errorCount++;
            document.getElementById('status-error').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg> <span style="color:var(--error)">${errorCount} Errors</span>`;
        } else if (type === 'warn') {
            warnCount++;
            document.getElementById('status-warn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--warn)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg> <span style="color:var(--warn)">${warnCount} Warnings</span>`;
        }
    }

    // --- Buttons & Core Logic ---
    document.getElementById('btn-run').addEventListener('click', () => updatePreview(true));
    
    document.getElementById('btn-download').addEventListener('click', () => {
        const download = (filename, text) => {
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        };
        // Browser might ask to allow multiple downloads
        download('index.html', files.html);
        setTimeout(() => download('style.css', files.css), 300);
        setTimeout(() => download('script.js', files.js), 600);
        showNotification("Source files downloading...");
    });

    // Toggle Preview Logic
    let previewVisible = true;
    document.getElementById('btn-toggle-preview').addEventListener('click', () => {
        previewVisible = !previewVisible;
        const previewSection = document.querySelector('.preview-section');
        const editorSection = document.querySelector('.editor-section');
        const coreResizer = document.querySelector('.core-resizer');
        
        if (!previewVisible) {
            previewSection.classList.add('hidden');
            coreResizer.classList.add('hidden');
            editorSection.classList.add('maximized');
        } else {
            previewSection.classList.remove('hidden');
            coreResizer.classList.remove('hidden');
            editorSection.classList.remove('maximized');
            editorSection.style.flexBasis = '50%';
        }
        if (editorInstance) setTimeout(() => editorInstance.layout(), 100);
    });

    // Tabs & Basic UI
    function switchTab(fileType) {
        if (!editorInstance) return;
        currentFile = fileType;
        editorInstance.setModel(models[fileType]);
        document.querySelectorAll('.editor-tabs .tab, .file-item').forEach(t => t.classList.remove('active'));
        document.querySelector(`.editor-tabs .tab[data-file="${fileType}"]`).classList.add('active');
        document.querySelector(`.file-item[data-file="${fileType}"]`).classList.add('active');
        document.getElementById('status-lang').textContent = { html: 'HTML', css: 'CSS', js: 'JavaScript' }[fileType];
        updateStatusBar();
    }
    document.querySelectorAll('.editor-tabs .tab, .file-item').forEach(el => el.addEventListener('click', () => switchTab(el.dataset.file)));

    document.querySelectorAll('.preview-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.preview-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if(tab.dataset.view === 'preview') {
                previewFrame.classList.remove('hidden'); consoleWrapper.classList.add('hidden');
            } else {
                previewFrame.classList.add('hidden'); consoleWrapper.classList.remove('hidden');
                document.getElementById('console-badge').classList.add('hidden'); document.getElementById('console-badge').textContent = '0';
            }
        });
    });

    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('preview-wrapper').className = `preview-wrapper device-${btn.dataset.device}`;
        });
    });

    // Smart Resizer Logic
    const resizer2 = document.getElementById('resizer-2');
    const editorSec = document.querySelector('.editor-section');
    let isResizing2 = false;

    resizer2.addEventListener('mousedown', () => { isResizing2 = true; resizer2.classList.add('dragging'); });
    resizer2.addEventListener('touchstart', () => { isResizing2 = true; resizer2.classList.add('dragging'); }, {passive: true});

    const finishResize = () => { if(isResizing2) { isResizing2 = false; resizer2.classList.remove('dragging'); if(editorInstance) editorInstance.layout(); } };
    document.addEventListener('mouseup', finishResize);
    document.addEventListener('touchend', finishResize);

    document.addEventListener('mousemove', (e) => handleDrag(e.clientX, e.clientY));
    document.addEventListener('touchmove', (e) => { if(isResizing2) handleDrag(e.touches[0].clientX, e.touches[0].clientY); }, {passive: true});

    function handleDrag(clientX, clientY) {
        if (!isResizing2) return;
        const isPortrait = window.innerWidth <= 900 && window.innerHeight > window.innerWidth;
        
        if (isPortrait) {
            // Dragging vertically
            const topOffset = document.querySelector('.topbar').offsetHeight + (window.innerWidth <= 900 ? 50 : 0);
            let percentage = ((clientY - topOffset) / (window.innerHeight - topOffset)) * 100;
            if(percentage > 10 && percentage < 90) editorSec.style.flexBasis = `${percentage}%`;
        } else {
            // Dragging horizontally
            const sidebarW = document.querySelector('.sidebar').offsetWidth;
            const expW = document.querySelector('.panel-explorer').offsetWidth;
            const isExpHidden = window.getComputedStyle(document.querySelector('.panel-explorer')).display === 'none';
            const offset = sidebarW + (isExpHidden ? 0 : expW);
            let percentage = ((clientX - offset) / (window.innerWidth - offset)) * 100;
            if(percentage > 10 && percentage < 90) editorSec.style.flexBasis = `${percentage}%`;
        }
    }

    function updateStatusBar() {
        if(!editorInstance) return;
        const pos = editorInstance.getPosition();
        if(pos) document.getElementById('status-line').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    }

    // Settings
    function applySettingsUI() { sFontSize.value = settings.fontSize; sWordWrap.checked = settings.wordWrap; sMinimap.checked = settings.minimap; sAutoRun.checked = settings.autoRun; }
    document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
    document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
    [sFontSize, sWordWrap, sMinimap, sAutoRun].forEach(el => el.addEventListener('change', () => {
        settings = { fontSize: parseInt(sFontSize.value), wordWrap: sWordWrap.checked, minimap: sMinimap.checked, autoRun: sAutoRun.checked };
        localStorage.setItem('paw-settings', JSON.stringify(settings));
        if (editorInstance) editorInstance.updateOptions({ fontSize: settings.fontSize, wordWrap: settings.wordWrap ? "on" : "off", minimap: { enabled: settings.minimap } });
    }));
    
    window.addEventListener('resize', () => { if(editorInstance) setTimeout(() => editorInstance.layout(), 100); });
});
