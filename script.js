document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
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
    
    // Settings Elements
    const sFontSize = document.getElementById('setting-fontsize');
    const sWordWrap = document.getElementById('setting-wordwrap');
    const sMinimap = document.getElementById('setting-minimap');
    const sAutoRun = document.getElementById('setting-autorun');
    
    // --- State & Config ---
    const defaultCode = {
        html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Paw IDE App</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="container">\n    <h1>Welcome to Paw IDE 🚀</h1>\n    <p>Edit HTML, CSS, and JS to see live updates.</p>\n    <button id="clickMe">Click Me</button>\n  </div>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
        css: `body {\n  font-family: 'Inter', sans-serif;\n  background: #0a0a0f;\n  color: #fff;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.container {\n  text-align: center;\n  background: rgba(255,255,255,0.05);\n  padding: 2rem;\n  border-radius: 12px;\n  border: 1px solid rgba(255,255,255,0.1);\n  box-shadow: 0 10px 30px rgba(0,240,255,0.1);\n}\n\nh1 {\n  color: #00f0ff;\n}\n\nbutton {\n  background: #7000ff;\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 6px;\n  cursor: pointer;\n  font-weight: bold;\n  transition: 0.2s;\n}\n\nbutton:hover {\n  background: #8b33ff;\n}`,
        js: `document.getElementById('clickMe').addEventListener('click', () => {\n  console.log('Button clicked!');\n  alert('Hello from Paw IDE!');\n});`
    };

    let files = { ...defaultCode };
    let currentFile = 'html';
    let editorInstance = null;
    let models = {};
    let saveTimeout = null;
    let errorCount = 0;
    let warnCount = 0;
    
    let settings = JSON.parse(localStorage.getItem('paw-settings')) || {
        fontSize: 14,
        wordWrap: false,
        minimap: true,
        autoRun: true
    };

    // --- Load Shared Code from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('share')) {
        try {
            const decoded = JSON.parse(decodeURIComponent(atob(urlParams.get('share'))));
            files = { ...defaultCode, ...decoded }; // Merge just in case
            window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
            showNotification("Shared project loaded");
        } catch (e) {
            console.error("Failed to parse shared code", e);
            files = JSON.parse(localStorage.getItem('paw-ide-data')) || { ...defaultCode };
        }
    } else {
        files = JSON.parse(localStorage.getItem('paw-ide-data')) || { ...defaultCode };
    }

    // --- Notifications ---
    function showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2" width="16" height="16">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            ${message}
        `;
        notificationContainer.appendChild(notif);
        
        requestAnimationFrame(() => notif.classList.add('show'));
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    // --- Monaco Editor Setup ---
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        models.html = monaco.editor.createModel(files.html, "html");
        models.css = monaco.editor.createModel(files.css, "css");
        models.js = monaco.editor.createModel(files.js, "javascript");

        const themeStr = document.documentElement.getAttribute('data-theme');
        monaco.editor.defineTheme('pawDark', {
            base: 'vs-dark',
            inherit: true,
            rules: [{ background: '0a0a0f' }],
            colors: {
                'editor.background': '#0a0a0f',
                'editor.lineHighlightBackground': '#1c1c24',
                'editorLineNumber.foreground': '#4f4f66'
            }
        });

        editorInstance = monaco.editor.create(monacoContainer, {
            model: models[currentFile],
            theme: themeStr === 'dark' ? 'pawDark' : 'vs',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: settings.fontSize,
            wordWrap: settings.wordWrap ? "on" : "off",
            minimap: { enabled: settings.minimap },
            automaticLayout: true,
            padding: { top: 15 },
            scrollBeyondLastLine: false,
            roundedSelection: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: true
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
            updatePreview(true);
            applySettingsUI();
        }, 1200);
    });

    // --- Preview & Console ---
    function updatePreview(manual = false) {
        if (manual) showNotification("Running Project...");
        
        errorCount = 0; warnCount = 0;
        document.getElementById('status-error').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> 0 Errors`;
        document.getElementById('status-warn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> 0 Warnings`;

        const consoleCaptureScript = `
            <script>
                (function() {
                    const sendMsg = (type, args) => {
                        const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
                        window.parent.postMessage({ source: 'paw-preview', type, message: msg }, '*');
                    };
                    const originalLog = console.log;
                    const originalErr = console.error;
                    const originalWarn = console.warn;
                    console.log = function(...args) { sendMsg('log', args); originalLog.apply(console, args); };
                    console.error = function(...args) { sendMsg('error', args); originalErr.apply(console, args); };
                    console.warn = function(...args) { sendMsg('warn', args); originalWarn.apply(console, args); };
                    window.onerror = function(msg, url, line) { sendMsg('error', [msg + ' (Line: ' + line + ')']); return false; };
                })();
            <\/script>
        `;

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
            document.getElementById('status-error').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span style="color:var(--error)">${errorCount} Errors</span>`;
        } else if (type === 'warn') {
            warnCount++;
            document.getElementById('status-warn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--warn)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> <span style="color:var(--warn)">${warnCount} Warnings</span>`;
        }
    }

    // --- Core Features (Buttons) ---
    document.getElementById('btn-run').addEventListener('click', () => updatePreview(true));
    
    document.getElementById('btn-export').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(files, null, 2));
        const a = document.createElement('a');
        a.href = dataStr; a.download = "paw_project.json";
        document.body.appendChild(a); a.click(); a.remove();
        showNotification("Project Exported");
    });

    document.getElementById('btn-share').addEventListener('click', () => {
        const encodedData = btoa(encodeURIComponent(JSON.stringify(files)));
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encodedData}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            showNotification("Share Link Copied to Clipboard!");
        }).catch(() => {
            showNotification("Failed to copy link.");
        });
    });

    // --- Settings Menu System ---
    function applySettingsUI() {
        sFontSize.value = settings.fontSize;
        sWordWrap.checked = settings.wordWrap;
        sMinimap.checked = settings.minimap;
        sAutoRun.checked = settings.autoRun;
    }

    function saveAndApplySettings() {
        settings = {
            fontSize: parseInt(sFontSize.value),
            wordWrap: sWordWrap.checked,
            minimap: sMinimap.checked,
            autoRun: sAutoRun.checked
        };
        localStorage.setItem('paw-settings', JSON.stringify(settings));
        
        if (editorInstance) {
            editorInstance.updateOptions({
                fontSize: settings.fontSize,
                wordWrap: settings.wordWrap ? "on" : "off",
                minimap: { enabled: settings.minimap }
            });
        }
        showNotification("Settings Applied");
    }

    document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
    document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
    
    // Listen for settings changes
    [sFontSize, sWordWrap, sMinimap, sAutoRun].forEach(el => {
        el.addEventListener('change', saveAndApplySettings);
    });

    // --- Basic UI Operations ---
    function switchTab(fileType) {
        if (!editorInstance) return;
        currentFile = fileType;
        editorInstance.setModel(models[fileType]);
        document.querySelectorAll('.editor-tabs .tab, .file-item').forEach(t => t.classList.remove('active'));
        document.querySelector(`.editor-tabs .tab[data-file="${fileType}"]`).classList.add('active');
        document.querySelector(`.file-item[data-file="${fileType}"]`).classList.add('active');
        const langMap = { html: 'HTML', css: 'CSS', js: 'JavaScript' };
        document.getElementById('status-lang').textContent = langMap[fileType];
        updateStatusBar();
    }

    document.querySelectorAll('.editor-tabs .tab, .file-item').forEach(el => {
        el.addEventListener('click', () => switchTab(el.dataset.file));
    });

    document.querySelectorAll('.preview-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.preview-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if(tab.dataset.view === 'preview') {
                previewFrame.classList.remove('hidden'); consoleWrapper.classList.add('hidden');
            } else {
                previewFrame.classList.add('hidden'); consoleWrapper.classList.remove('hidden');
                document.getElementById('console-badge').classList.add('hidden');
                document.getElementById('console-badge').textContent = '0';
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

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const root = document.documentElement;
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        if (editorInstance) monaco.editor.setTheme(next === 'dark' ? 'pawDark' : 'vs');
        showNotification(`${next.charAt(0).toUpperCase() + next.slice(1)} Mode Enabled`);
    });

    function updateStatusBar() {
        if(!editorInstance) return;
        const pos = editorInstance.getPosition();
        if(pos) document.getElementById('status-line').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    }

    // Command Palette Logic
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            commandPalette.classList.toggle('hidden');
            if(!commandPalette.classList.contains('hidden')) { cmdInput.focus(); cmdInput.value = ''; filterCommands(''); }
        }
        if (e.key === 'Escape') {
            if(!commandPalette.classList.contains('hidden')) commandPalette.classList.add('hidden');
            if(!settingsModal.classList.contains('hidden')) settingsModal.classList.add('hidden');
            if(editorInstance) editorInstance.focus();
        }
    });

    const cmdItems = document.querySelectorAll('.cmd-item');
    cmdInput.addEventListener('input', (e) => filterCommands(e.target.value.toLowerCase()));
    function filterCommands(query) {
        cmdItems.forEach(item => { item.style.display = item.textContent.toLowerCase().includes(query) ? 'flex' : 'none'; });
    }

    cmdItems.forEach(item => {
        item.addEventListener('click', () => {
            commandPalette.classList.add('hidden');
            switch(item.dataset.action) {
                case 'run': updatePreview(true); break;
                case 'save': localStorage.setItem('paw-ide-data', JSON.stringify(files)); showNotification("Workspace saved"); break;
                case 'share': document.getElementById('btn-share').click(); break;
                case 'settings': settingsModal.classList.remove('hidden'); break;
                case 'theme': document.getElementById('theme-toggle').click(); break;
                case 'clear': 
                    files = { ...defaultCode }; models.html.setValue(files.html); models.css.setValue(files.css); models.js.setValue(files.js); 
                    localStorage.setItem('paw-ide-data', JSON.stringify(files)); updatePreview(true); showNotification("Workspace Reset"); break;
            }
            if(editorInstance) editorInstance.focus();
        });
    });
    
    // Resizer Logic (Sidebar to Workspace)
    const resizer1 = document.getElementById('resizer-1');
    const panelExplorer = document.querySelector('.panel-explorer');
    let isResizing1 = false;
    resizer1.addEventListener('mousedown', () => { isResizing1 = true; document.body.style.cursor = 'col-resize'; resizer1.classList.add('dragging'); });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing1) return;
        let newWidth = e.clientX - 50; 
        if(newWidth > 150 && newWidth < 400) { panelExplorer.style.width = `${newWidth}px`; if(editorInstance) editorInstance.layout(); }
    });
    document.addEventListener('mouseup', () => {
        if(isResizing1) { isResizing1 = false; document.body.style.cursor = 'default'; resizer1.classList.remove('dragging'); if(editorInstance) editorInstance.layout(); }
    });
    window.addEventListener('resize', () => { if(editorInstance) setTimeout(() => editorInstance.layout(), 100); });
});
