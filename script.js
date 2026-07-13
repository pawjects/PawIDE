// ==========================================
// PWA Core: Service Worker & Installation
// ==========================================
let deferredPrompt;

const initPWA = async () => {
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('./sw.js');
            console.log('PawIDE PWA: Service Worker Registered', reg.scope);
        } catch (err) {
            console.error('PawIDE PWA: Service Worker Registration Failed', err);
        }
    }

    // Capture the native install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        const installBtn = document.getElementById('btn-install');
        if (installBtn) {
            installBtn.classList.remove('hidden');
            
            // Handle Install Click
            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                installBtn.classList.add('hidden');
                
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User installation choice: ${outcome}`);
                
                deferredPrompt = null;
            }, { once: true });
        }
    });
};

// ==========================================
// Application UI & Logic Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initPWA(); // Fire PWA logic

    const splashScreen = document.getElementById('splash-screen');
    const monacoContainer = document.getElementById('monaco-container');
    const previewFrame = document.getElementById('preview-frame');
    const consoleOutput = document.getElementById('console-output');
    const typingIndicator = document.getElementById('typing-indicator');
    const notificationContainer = document.getElementById('notification-container');
    
    const settingsModal = document.getElementById('settings-modal');
    const commandPalette = document.getElementById('command-palette');
    const cmdInput = document.getElementById('cmd-input');
    
    const defaultCode = {
        html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>PawIDE Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="card">\n    <h1>PawIDE Workspace</h1>\n    <p>Build the future, line by line.</p>\n    <button id="actionBtn">Initialize</button>\n  </div>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
        css: `body {\n  font-family: system-ui, sans-serif;\n  background: #000000;\n  color: #e2e2e2;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.card {\n  text-align: center;\n  background: #111111;\n  padding: 2.5rem;\n  border-radius: 16px;\n  border: 1px solid #2a2a2a;\n  box-shadow: 0 20px 40px rgba(0,0,0,0.5);\n}\n\nh1 { color: #00d4ff; margin-top: 0; }\n\nbutton {\n  background: rgba(0, 212, 255, 0.1);\n  color: #00d4ff;\n  border: 1px solid #00d4ff;\n  padding: 10px 24px;\n  border-radius: 20px;\n  cursor: pointer;\n  font-weight: 600;\n  transition: 0.2s;\n}\nbutton:hover {\n  background: #00d4ff;\n  color: #000;\n}`,
        js: `document.getElementById('actionBtn').addEventListener('click', function() {\n  console.log('PawIDE Initialized Successfully!');\n  this.textContent = 'System Active';\n  this.style.background = '#00e676';\n  this.style.color = '#000';\n  this.style.borderColor = '#00e676';\n});`
    };

    let files = JSON.parse(localStorage.getItem('paw-ide-data')) || { ...defaultCode };
    let currentFile = 'html';
    let editorInstance = null;
    let saveTimeout = null;
    let errorCount = 0, warnCount = 0;
    
    let settings = JSON.parse(localStorage.getItem('paw-settings')) || { fontSize: 14, wordWrap: false, minimap: true, autoRun: true };
    const sFontSize = document.getElementById('setting-fontsize');
    const sWordWrap = document.getElementById('setting-wordwrap');
    const sMinimap = document.getElementById('setting-minimap');
    const sAutoRun = document.getElementById('setting-autorun');

    const showNotification = (message) => {
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ${message}`;
        notificationContainer.appendChild(notif);
        requestAnimationFrame(() => notif.classList.add('show'));
        setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 300); }, 2500);
    };

    // Monaco Editor AMD Initialization
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
    require(['vs/editor/editor.main'], () => {
        monaco.editor.defineTheme('pawAmoled', {
            base: 'vs-dark', inherit: true,
            rules: [{ background: '000000' }],
            colors: {
                'editor.background': '#000000',
                'editor.lineHighlightBackground': '#111111',
                'editorLineNumber.foreground': '#555555',
                'editorIndentGuide.background': '#222222'
            }
        });

        editorInstance = monaco.editor.create(monacoContainer, {
            value: files[currentFile],
            language: currentFile === 'js' ? 'javascript' : currentFile,
            theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'pawAmoled' : 'vs',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: settings.fontSize,
            wordWrap: settings.wordWrap ? "on" : "off",
            minimap: { enabled: settings.minimap },
            automaticLayout: true,
            padding: { top: 20, bottom: 20 },
            roundedSelection: true,
            cursorBlinking: "smooth"
        });

        editorInstance.onDidChangeModelContent(() => {
            files[currentFile] = editorInstance.getValue();
            typingIndicator.classList.remove('hidden');
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                localStorage.setItem('paw-ide-data', JSON.stringify(files));
                if(settings.autoRun) updatePreview();
                typingIndicator.classList.add('hidden');
            }, 800);
            updateStatusBar();
        });
        
        editorInstance.onDidChangeCursorPosition(updateStatusBar);

        editorInstance.addAction({
            id: 'save-code', label: 'Save Workspace',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: () => { localStorage.setItem('paw-ide-data', JSON.stringify(files)); showNotification("Saved to Device"); }
        });

        setTimeout(() => {
            splashScreen.style.opacity = '0';
            setTimeout(() => splashScreen.style.display = 'none', 400);
            updatePreview(); 
            applySettingsUI();
        }, 1200);
    });

    const updatePreview = () => {
        errorCount = 0; warnCount = 0;
        document.getElementById('status-error').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg> 0 Errors`;
        document.getElementById('status-warn').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg> 0 Warnings`;

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
    };

    window.addEventListener('message', (e) => {
        if(e.data && e.data.source === 'paw-preview') appendConsole(e.data.type, e.data.message);
    });

    const appendConsole = (type, msg) => {
        const div = document.createElement('div');
        div.className = `console-log log-${type}`;
        div.style.color = type === 'error' ? 'var(--error)' : type === 'warn' ? 'var(--warn)' : 'var(--text-main)';
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
    };

    const updateStatusBar = () => {
        if(!editorInstance) return;
        const pos = editorInstance.getPosition();
        if(pos) document.getElementById('status-line').textContent = `Ln ${pos.lineNumber}, Col ${pos.column}`;
    };

    // --- User Actions ---
    document.getElementById('btn-run').addEventListener('click', () => { showNotification("Compiling..."); updatePreview(); });
    
    document.getElementById('btn-download').addEventListener('click', () => {
        const download = (filename, text) => {
            const el = document.createElement('a');
            el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            el.setAttribute('download', filename);
            el.style.display = 'none';
            document.body.appendChild(el);
            el.click();
            document.body.removeChild(el);
        };
        download('index.html', files.html);
        setTimeout(() => download('style.css', files.css), 200);
        setTimeout(() => download('script.js', files.js), 400);
        showNotification("Source Exported");
    });

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
        if (editorInstance) setTimeout(() => editorInstance.layout(), 150);
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        const root = document.documentElement;
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        if (editorInstance) monaco.editor.setTheme(next === 'dark' ? 'pawAmoled' : 'vs');
        showNotification(`${next.charAt(0).toUpperCase() + next.slice(1)} Mode`);
    });

    // File Tabs
    document.querySelectorAll('.editor-tabs .tab, .file-item').forEach(el => {
        el.addEventListener('click', () => {
            if (!editorInstance) return;
            currentFile = el.dataset.file;
            const lang = currentFile === 'js' ? 'javascript' : currentFile;
            monaco.editor.setModelLanguage(editorInstance.getModel(), lang);
            editorInstance.setValue(files[currentFile]);
            
            document.querySelectorAll('.editor-tabs .tab, .file-item').forEach(t => t.classList.remove('active'));
            document.querySelector(`.editor-tabs .tab[data-file="${currentFile}"]`).classList.add('active');
            document.querySelector(`.file-item[data-file="${currentFile}"]`).classList.add('active');
            document.getElementById('status-lang').textContent = { html: 'HTML', css: 'CSS', js: 'JavaScript' }[currentFile];
            updateStatusBar();
        });
    });

    // Sidebar & Explorer
    const explorerBtn = document.querySelector('.sidebar-btn[data-panel="explorer"]');
    const panelExplorer = document.querySelector('.panel-explorer');
    explorerBtn.addEventListener('click', () => {
        const isHidden = window.getComputedStyle(panelExplorer).display === 'none';
        panelExplorer.style.display = isHidden ? 'flex' : 'none';
        explorerBtn.classList.toggle('active', isHidden);
        if (editorInstance) setTimeout(() => editorInstance.layout(), 150);
    });

    document.querySelectorAll('.preview-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.preview-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const cw = document.getElementById('console-wrapper');
            if(tab.dataset.view === 'preview') {
                previewFrame.classList.remove('hidden'); cw.classList.add('hidden');
            } else {
                previewFrame.classList.add('hidden'); cw.classList.remove('hidden');
                document.getElementById('console-badge').classList.add('hidden'); 
                document.getElementById('console-badge').textContent = '0';
            }
        });
    });

    // Command Palette
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            commandPalette.classList.toggle('hidden');
            if(!commandPalette.classList.contains('hidden')) { cmdInput.focus(); cmdInput.value = ''; filterCommands(''); }
        }
        if (e.key === 'Escape') {
            commandPalette.classList.add('hidden');
            settingsModal.classList.add('hidden');
            if(editorInstance) editorInstance.focus();
        }
    });

    const cmdItems = document.querySelectorAll('.cmd-item');
    cmdInput.addEventListener('input', (e) => filterCommands(e.target.value.toLowerCase()));
    function filterCommands(query) {
        cmdItems.forEach(item => item.style.display = item.textContent.toLowerCase().includes(query) ? 'flex' : 'none');
    }

    cmdItems.forEach(item => {
        item.addEventListener('click', () => {
            commandPalette.classList.add('hidden');
            switch(item.dataset.action) {
                case 'run': updatePreview(true); break;
                case 'save': localStorage.setItem('paw-ide-data', JSON.stringify(files)); showNotification("Workspace saved"); break;
                case 'download': document.getElementById('btn-download').click(); break;
                case 'settings': settingsModal.classList.remove('hidden'); break;
                case 'theme': document.getElementById('theme-toggle').click(); break;
                case 'clear': 
                    files = { ...defaultCode }; 
                    editorInstance.setValue(files[currentFile]); 
                    localStorage.setItem('paw-ide-data', JSON.stringify(files)); 
                    updatePreview(); 
                    showNotification("Workspace Reset"); 
                    break;
            }
            if(editorInstance) editorInstance.focus();
        });
    });

    commandPalette.addEventListener('click', (e) => {
        if (e.target === commandPalette) commandPalette.classList.add('hidden');
    });

    // Settings Modal
    function applySettingsUI() { 
        sFontSize.value = settings.fontSize; sWordWrap.checked = settings.wordWrap; 
        sMinimap.checked = settings.minimap; sAutoRun.checked = settings.autoRun; 
    }
    
    document.getElementById('btn-settings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
    document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

    [sFontSize, sWordWrap, sMinimap, sAutoRun].forEach(el => el.addEventListener('change', () => {
        settings = { fontSize: parseInt(sFontSize.value), wordWrap: sWordWrap.checked, minimap: sMinimap.checked, autoRun: sAutoRun.checked };
        localStorage.setItem('paw-settings', JSON.stringify(settings));
        if (editorInstance) {
            editorInstance.updateOptions({ fontSize: settings.fontSize, wordWrap: settings.wordWrap ? "on" : "off", minimap: { enabled: settings.minimap } });
        }
    }));

    // Resizers
    const resizer1 = document.getElementById('resizer-1');
    const resizer2 = document.getElementById('resizer-2');
    const editorSec = document.querySelector('.editor-section');
    let isResizing1 = false, isResizing2 = false;

    resizer1.addEventListener('mousedown', () => { isResizing1 = true; resizer1.classList.add('dragging'); });
    resizer2.addEventListener('mousedown', () => { isResizing2 = true; resizer2.classList.add('dragging'); });
    resizer2.addEventListener('touchstart', () => { isResizing2 = true; resizer2.classList.add('dragging'); }, {passive: true});

    const stopResize = () => { 
        isResizing1 = isResizing2 = false; 
        resizer1.classList.remove('dragging'); resizer2.classList.remove('dragging');
        if(editorInstance) editorInstance.layout(); 
    };
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchend', stopResize);

    const handleDrag = (clientX, clientY) => {
        if (isResizing1) {
            let newWidth = clientX - 60; 
            if(newWidth > 150 && newWidth < 400) panelExplorer.style.width = `${newWidth}px`;
        }
        if (isResizing2) {
            const isPortrait = window.innerWidth <= 900 && window.innerHeight > window.innerWidth;
            if (isPortrait) {
                const topOffset = document.querySelector('.topbar').offsetHeight;
                let pct = ((clientY - topOffset) / (window.innerHeight - topOffset)) * 100;
                if(pct > 10 && pct < 90) editorSec.style.flexBasis = `${pct}%`;
            } else {
                const sidebarW = document.querySelector('.sidebar').offsetWidth;
                const expW = window.getComputedStyle(panelExplorer).display === 'none' ? 0 : panelExplorer.offsetWidth;
                const offset = sidebarW + expW;
                let pct = ((clientX - offset) / (window.innerWidth - offset)) * 100;
                if(pct > 10 && pct < 90) editorSec.style.flexBasis = `${pct}%`;
            }
        }
    };

    document.addEventListener('mousemove', (e) => handleDrag(e.clientX, e.clientY));
    document.addEventListener('touchmove', (e) => { handleDrag(e.touches[0].clientX, e.touches[0].clientY); }, {passive: true});
    window.addEventListener('resize', () => { if(editorInstance) setTimeout(() => editorInstance.layout(), 150); });
});