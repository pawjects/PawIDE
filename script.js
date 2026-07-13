// --- PWA Installation & Service Worker Logic ---
let deferredPrompt;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PawIDE SW Registered', reg.scope))
            .catch(err => console.error('SW Registration Failed', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show the install button if PWA criteria is met
    const installBtn = document.getElementById('btn-install');
    if(installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.addEventListener('click', async () => {
            installBtn.classList.add('hidden');
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            deferredPrompt = null;
        });
    }
});

// --- Core Application Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const monacoContainer = document.getElementById('monaco-container');
    const previewFrame = document.getElementById('preview-frame');
    const consoleWrapper = document.getElementById('console-wrapper');
    const consoleOutput = document.getElementById('console-output');
    const typingIndicator = document.getElementById('typing-indicator');
    const notificationContainer = document.getElementById('notification-container');
    const settingsModal = document.getElementById('settings-modal');
    const settingsBox = document.getElementById('settings-box');
    
    const defaultCode = {
        html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>PawIDE Project</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <div class="card">\n    <h1>PawIDE Workspace</h1>\n    <p>Build the future, line by line.</p>\n    <button id="actionBtn">Initialize</button>\n  </div>\n  <script src="script.js"><\/script>\n</body>\n</html>`,
        css: `body {\n  font-family: system-ui, sans-serif;\n  background: #000000;\n  color: #e2e2e2;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n}\n\n.card {\n  text-align: center;\n  background: #111111;\n  padding: 2.5rem;\n  border-radius: 16px;\n  border: 1px solid #2a2a2a;\n  box-shadow: 0 20px 40px rgba(0,0,0,0.5);\n}\n\nh1 { color: #00d4ff; margin-top: 0; }\n\nbutton {\n  background: rgba(0, 212, 255, 0.1);\n  color: #00d4ff;\n  border: 1px solid #00d4ff;\n  padding: 10px 24px;\n  border-radius: 20px;\n  cursor: pointer;\n  font-weight: 600;\n  transition: 0.2s;\n}\nbutton:hover {\n  background: #00d4ff;\n  color: #000;\n}`,
        js: `document.getElementById('actionBtn').addEventListener('click', function() {\n  console.log('PawIDE Initialized Successfully!');\n  this.textContent = 'System Active';\n  this.style.background = '#00e676';\n  this.style.color = '#000';\n  this.style.borderColor = '#00e676';\n});`
    };

    let files = JSON.parse(localStorage.getItem('paw-ide-data')) || { ...defaultCode };
    let currentFile = 'html';
    let editorInstance = null;
    let models = {};
    let saveTimeout = null;
    
    // Load Settings
    let settings = JSON.parse(localStorage.getItem('paw-settings')) || { fontSize: 14, wordWrap: false, autoRun: true };
    const sFontSize = document.getElementById('setting-fontsize');
    const sWordWrap = document.getElementById('setting-wordwrap');
    const sAutoRun = document.getElementById('setting-autorun');

    function showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ${message}`;
        notificationContainer.appendChild(notif);
        requestAnimationFrame(() => notif.classList.add('show'));
        setTimeout(() => { notif.classList.remove('show'); setTimeout(() => notif.remove(), 300); }, 2500);
    }

    // Monaco AMD Loader Config
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
    require(['vs/editor/editor.main'], function() {
        models.html = monaco.editor.createModel(files.html, "html");
        models.css = monaco.editor.createModel(files.css, "css");
        models.js = monaco.editor.createModel(files.js, "javascript");

        // AMOLED Material Theme
        monaco.editor.defineTheme('pawAmoled', {
            base: 'vs-dark', inherit: true,
            rules: [{ background: '000000' }],
            colors: {
                'editor.background': '#000000',
                'editor.lineHighlightBackground': '#111111',
                'editorLineNumber.foreground': '#555555',
                'editorIndentGuide.background': '#222222',
                'editorWidget.background': '#111111',
                'editorWidget.border': '#2a2a2a'
            }
        });

        editorInstance = monaco.editor.create(monacoContainer, {
            model: models[currentFile],
            theme: 'pawAmoled',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: settings.fontSize,
            wordWrap: settings.wordWrap ? "on" : "off",
            minimap: { enabled: false }, // Disabled for mobile performance
            automaticLayout: true,
            padding: { top: 20, bottom: 20 },
            scrollBeyondLastLine: false,
            roundedSelection: true,
            smoothScrolling: true,
            cursorBlinking: "smooth"
        });

        editorInstance.onDidChangeModelContent(() => {
            files[currentFile] = editorInstance.getValue();
            typingIndicator.classList.remove('hidden');
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                localStorage.setItem('paw-ide-data', JSON.stringify(files));
                if(settings.autoRun) updatePreview(false);
                typingIndicator.classList.add('hidden');
            }, 800);
        });

        editorInstance.addAction({
            id: 'save-code', label: 'Save Workspace',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: () => { localStorage.setItem('paw-ide-data', JSON.stringify(files)); showNotification("Saved to Device"); }
        });

        // Hide Splash Screen
        setTimeout(() => {
            splashScreen.style.opacity = '0';
            setTimeout(() => splashScreen.style.display = 'none', 400);
            updatePreview(true); 
            applySettingsUI();
        }, 1200);
    });

    // Preview Engine
    function updatePreview(manual = false) {
        if (manual) showNotification("Compiling...");
        
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

    // Console Message Listener
    window.addEventListener('message', (e) => {
        if(e.data && e.data.source === 'paw-preview') appendConsole(e.data.type, e.data.message);
    });

    function appendConsole(type, msg) {
        const div = document.createElement('div');
        div.className = `console-log log-${type}`;
        div.style.color = type === 'error' ? 'var(--error)' : type === 'warn' ? 'var(--warn)' : 'var(--text-main)';
        div.textContent = `> ${msg}`;
        consoleOutput.appendChild(div);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Topbar Actions
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

    // Editor Tab Switching
    document.querySelectorAll('.editor-tabs .tab').forEach(el => el.addEventListener('click', () => {
        if (!editorInstance) return;
        currentFile = el.dataset.file;
        editorInstance.setModel(models[currentFile]);
        document.querySelectorAll('.editor-tabs .tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
    }));

    // Preview Tab Switching
    document.querySelectorAll('.preview-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.preview-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if(tab.dataset.view === 'preview') {
                previewFrame.classList.remove('hidden'); consoleWrapper.classList.add('hidden');
            } else {
                previewFrame.classList.add('hidden'); consoleWrapper.classList.remove('hidden');
            }
        });
    });

    // Settings Modal Logic (Fixes Applied)
    function applySettingsUI() { 
        sFontSize.value = settings.fontSize; 
        sWordWrap.checked = settings.wordWrap; 
        sAutoRun.checked = settings.autoRun; 
    }
    
    const openSettingsBtn = document.getElementById('btn-settings');
    const closeSettingsBtn = document.getElementById('close-settings');

    const openSettings = () => settingsModal.classList.remove('hidden');
    const closeSettings = () => settingsModal.classList.add('hidden');

    openSettingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    
    // Close modal if clicking outside the modal box
    settingsModal.addEventListener('click', (e) => {
        if (!settingsBox.contains(e.target)) {
            closeSettings();
        }
    });

    // Apply settings on change
    [sFontSize, sWordWrap, sAutoRun].forEach(el => el.addEventListener('change', () => {
        settings = { fontSize: parseInt(sFontSize.value), wordWrap: sWordWrap.checked, autoRun: sAutoRun.checked };
        localStorage.setItem('paw-settings', JSON.stringify(settings));
        if (editorInstance) {
            editorInstance.updateOptions({ fontSize: settings.fontSize, wordWrap: settings.wordWrap ? "on" : "off" });
        }
    }));

    // Smart Split View Resizing
    const resizer = document.getElementById('resizer-2');
    const editorSec = document.querySelector('.editor-section');
    let isResizing = false;

    const startResize = () => { isResizing = true; resizer.classList.add('dragging'); };
    const stopResize = () => { if(isResizing) { isResizing = false; resizer.classList.remove('dragging'); if(editorInstance) editorInstance.layout(); } };

    resizer.addEventListener('mousedown', startResize);
    resizer.addEventListener('touchstart', startResize, {passive: true});
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchend', stopResize);

    const handleDrag = (clientX, clientY) => {
        if (!isResizing) return;
        const isPortrait = window.innerWidth <= 900 && window.innerHeight > window.innerWidth;
        
        if (isPortrait) {
            const topOffset = document.querySelector('.topbar').offsetHeight;
            let percentage = ((clientY - topOffset) / (window.innerHeight - topOffset)) * 100;
            if(percentage > 10 && percentage < 90) editorSec.style.flexBasis = `${percentage}%`;
        } else {
            const sidebarW = document.querySelector('.sidebar').offsetWidth;
            let percentage = ((clientX - sidebarW) / (window.innerWidth - sidebarW)) * 100;
            if(percentage > 10 && percentage < 90) editorSec.style.flexBasis = `${percentage}%`;
        }
    };

    document.addEventListener('mousemove', (e) => handleDrag(e.clientX, e.clientY));
    document.addEventListener('touchmove', (e) => { if(isResizing) handleDrag(e.touches[0].clientX, e.touches[0].clientY); }, {passive: true});
    window.addEventListener('resize', () => { if(editorInstance) setTimeout(() => editorInstance.layout(), 150); });
});
