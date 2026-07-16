// ===== API CONFIGURATION =====
var API_BASE = '';
if (API_BASE === '') {
    var _host = window.location.host;
    if (_host === 'lll-scanly.pages.dev') {
        API_BASE = 'https://lll-scanly-api.onrender.com';
    } else if (_host === 'localhost' || _host.startsWith('localhost:')) {
        API_BASE = 'http://localhost:4000';
    }
}

// ===== KEEPALIVE =====
var keepaliveInterval = setInterval(function() {
    fetch(API_BASE + '/api/health').catch(function() { /* ignore */ });
}, 240000);

// ===== LANGUAGE SELECTOR =====
var languageSelector = null;

function safeT(key) {
    return languageSelector ? languageSelector.t(key) : key;
}

function initLanguageSelector() {
    var cls = (function() {
        function LanguageSelector() {
            this.currentLang = 'en';
            this.select = document.getElementById('langSelector');
            if (this.select) {
                this.select.value = this.currentLang;
                this.select.addEventListener('change', (function(e) {
                    this.setLanguage(e.target.value);
                }).bind(this));
            }
            this.applyLanguage();
        }

        LanguageSelector.prototype.setLanguage = function(lang) {
            this.currentLang = lang;
            this.applyLanguage();
        };

        LanguageSelector.prototype.t = function(key) {
            var translations = window.translations;
            if (!translations) return key;
            var langData = translations[this.currentLang] || translations.en;
            var keys = key.split('.');
            var value = langData;
            for (var i = 0; i < keys.length; i++) {
                if (value && value[keys[i]] !== undefined) {
                    value = value[keys[i]];
                } else {
                    if (this.currentLang !== 'en') {
                        var enData = translations.en;
                        value = enData;
                        for (var j = i; j < keys.length; j++) {
                            if (value && value[keys[j]] !== undefined) {
                                value = value[keys[j]];
                            } else {
                                return key;
                            }
                        }
                        return value;
                    }
                    return key;
                }
            }
            return value;
        };

        LanguageSelector.prototype.applyLanguage = function() {
            var translations = window.translations;
            if (!translations) return;
            var langData = translations[this.currentLang] || translations.en;

            document.querySelectorAll('[data-i18n]').forEach((function(el) {
                var key = el.getAttribute('data-i18n');
                var value = langData;
                var keys = key.split('.');
                for (var i = 0; i < keys.length; i++) {
                    if (value && value[keys[i]] !== undefined) {
                        value = value[keys[i]];
                    } else {
                        if (this.currentLang !== 'en') {
                            value = translations.en;
                            for (var j = i; j < keys.length; j++) {
                                if (value && value[keys[j]] !== undefined) {
                                    value = value[keys[j]];
                                } else {
                                    value = key;
                                    break;
                                }
                            }
                        } else {
                            value = key;
                        }
                        break;
                    }
                }
                if (typeof value === 'string' && value.includes('<')) {
                    el.innerHTML = value;
                } else {
                    el.textContent = value;
                }
            }).bind(this));

            document.querySelectorAll('[data-i18n-placeholder]').forEach((function(el) {
                var key = el.getAttribute('data-i18n-placeholder');
                var value = langData;
                var keys = key.split('.');
                for (var i = 0; i < keys.length; i++) {
                    if (value && value[keys[i]] !== undefined) {
                        value = value[keys[i]];
                    } else {
                        if (this.currentLang !== 'en') {
                            value = translations.en;
                            for (var j = i; j < keys.length; j++) {
                                if (value && value[keys[j]] !== undefined) {
                                    value = value[keys[j]];
                                } else {
                                    value = key;
                                    break;
                                }
                            }
                        } else {
                            value = key;
                        }
                        break;
                    }
                }
                el.placeholder = value;
            }).bind(this));

            document.querySelectorAll('[data-i18n-title]').forEach((function(el) {
                var key = el.getAttribute('data-i18n-title');
                var value = langData;
                var keys = key.split('.');
                for (var i = 0; i < keys.length; i++) {
                    if (value && value[keys[i]] !== undefined) {
                        value = value[keys[i]];
                    } else {
                        if (this.currentLang !== 'en') {
                            value = translations.en;
                            for (var j = i; j < keys.length; j++) {
                                if (value && value[keys[j]] !== undefined) {
                                    value = value[keys[j]];
                                } else {
                                    value = key;
                                    break;
                                }
                            }
                        } else {
                            value = key;
                        }
                        break;
                    }
                }
                el.title = value;
            }).bind(this));

            var splashTagline = document.getElementById('splashTagline');
            if (splashTagline) {
                splashTagline.textContent = langData.splashTagline || '';
            }

            var splashHint = document.querySelector('.splash-hint');
            if (splashHint) {
                splashHint.textContent = langData.splashHint || '';
            }

            if (this.select) {
                this.select.value = this.currentLang;
            }

            if (typeof retranslateReport === 'function') {
                retranslateReport();
            }

            if (typeof retranslateTerminal === 'function') {
                retranslateTerminal();
            }

            if (mainInterface && mainInterface.classList.contains('active')) {
                stopTypewriter();
                setTimeout(function() {
                    startTypewriter();
                }, 200);
            }

            var tipsKeys = ['tipAcceptedUrls', 'tipScanModes', 'tipWhatWeCheck'];
            for (var t = 0; t < tipsKeys.length; t++) {
                var tipEl = document.getElementById(tipsKeys[t]);
                if (tipEl) {
                    var tipValue = langData[tipsKeys[t]] || '';
                    tipEl.innerHTML = tipValue;
                }
            }
        };

        return LanguageSelector;
    })();

    languageSelector = new cls();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguageSelector);
} else {
    initLanguageSelector();
}

// ===== SPLASH SCREEN =====
const splash = document.getElementById('splash');
const splashInner = document.querySelector('.splash-inner');
const mainInterface = document.getElementById('mainInterface');
const monsterContainer = document.getElementById('monster');
const mouth = document.getElementById('mouth');

// ===== TYPEWRITER SETUP =====
var typewriterContainer = document.getElementById('typewriterContainer');
var typewriterCursor = document.getElementById('typewriterCursor');
var lineElements = [
    document.getElementById('typewriterLine1'),
    document.getElementById('typewriterLine2'),
    document.getElementById('typewriterLine3')
];
var typewriterTimeout = null;
var typewriterRunning = false;

function getTypewriterLines() {
    if (!languageSelector) return ['', '', ''];
    return [
        languageSelector.t('typewriterLine1'),
        languageSelector.t('typewriterLine2'),
        languageSelector.t('typewriterLine3')
    ];
}

function startTypewriter() {
    if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
    }
    typewriterRunning = true;
    typewriterLineIndex = 0;
    typewriterCharIndex = 0;
    for (var i = 0; i < lineElements.length; i++) {
        lineElements[i].textContent = '';
    }
    typewriterCursor.classList.remove('hidden');
    
    typewriterContainer.classList.add('visible');
    
    function typeNextChar() {
        if (!typewriterRunning) return;
        if (typewriterLineIndex >= getTypewriterLines().length) {
            typewriterRunning = false;
            return;
        }
        
        var line = getTypewriterLines()[typewriterLineIndex];
        
        if (typewriterCharIndex < line.length) {
            lineElements[typewriterLineIndex].textContent += line.charAt(typewriterCharIndex);
            typewriterCharIndex++;
            var speed = 25 + Math.random() * 15;
            typewriterTimeout = setTimeout(typeNextChar, speed);
        } else {
            typewriterLineIndex++;
            typewriterCharIndex = 0;
            var delay = 300;
            typewriterTimeout = setTimeout(typeNextChar, delay);
        }
    }
    
    typewriterTimeout = setTimeout(typeNextChar, 1000);
}

function stopTypewriter() {
    typewriterRunning = false;
    if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
    }
    typewriterLineIndex = 0;
    typewriterCharIndex = 0;
    for (var i = 0; i < lineElements.length; i++) {
        lineElements[i].textContent = getTypewriterLines()[i] || '';
    }
    typewriterCursor.classList.add('hidden');
}

// ===== SPLASH SCREEN =====
splash.addEventListener('click', function() {
    if (splash.classList.contains('eaten')) {
        return;
    }
    
    splash.classList.add('eaten');
    monsterContainer.classList.add('gulp');
    
    setTimeout(function() {
        splash.classList.add('hidden');
        splash.classList.remove('eaten');
        monsterContainer.classList.remove('gulp');
        
        setTimeout(function() {
            mainInterface.classList.add('active');
            if (scanModeIndicator) scanModeIndicator.style.display = 'flex';
            
            setTimeout(function() {
                startTypewriter();
            }, 300);
        }, 800);
    }, 600);
});

// ===== DOM REFS =====
const scanBtn = document.getElementById('scanBtn');
const urlInput = document.getElementById('urlInput');
const tipsBtn = document.getElementById('tipsBtn');
const tipsOverlay = document.getElementById('tipsOverlay');
const tipsClose = document.getElementById('tipsClose');
const clearBtn = document.getElementById('clearBtn');
const stopBtn = document.getElementById('stopBtn');
const pupils = document.getElementById('pupils');
const loadingState = document.getElementById('loadingState');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const scanModeIndicator = document.getElementById('scanModeIndicator');
const terminalView = document.getElementById('terminalView');
const terminalOutput = document.getElementById('terminalOutput');
const terminalStatus = document.getElementById('terminalStatus');
const terminalLoading = document.getElementById('terminalLoading');
const closeTerminal = document.getElementById('closeTerminal');

var progressAnimFrame = null;
var progressAnimActive = false;

// Report view refs
const reportView = document.getElementById('reportView');
const reportDocument = document.getElementById('reportDocument');
const reportUrl = document.getElementById('reportUrl');
const docScanInfo = document.getElementById('docScanInfo');
const reportErrorCount = document.getElementById('reportErrorCount');
const reportWarningCount = document.getElementById('reportWarningCount');
const reportPassedCount = document.getElementById('reportPassedCount');
const reportIssuesList = document.getElementById('reportIssuesList');
const scanAgainButton = document.getElementById('scanAgainButton');
const pageSelector = document.getElementById('pageSelector');
const pageSelect = document.getElementById('pageSelect');
const pageSelectorStats = document.getElementById('pageSelectorStats');
const downloadFormat = document.getElementById('downloadFormat');
const downloadBtn = document.getElementById('downloadBtn');

// ===== TIPS MODAL =====
function openTips() {
    if (tipsOverlay) {
        tipsOverlay.classList.add('active');
    }
}

function closeTips() {
    if (tipsOverlay) {
        tipsOverlay.classList.remove('active');
    }
}

if (tipsBtn) {
    tipsBtn.addEventListener('click', openTips);
}
if (tipsClose) {
    tipsClose.addEventListener('click', closeTips);
}
if (tipsOverlay) {
    tipsOverlay.addEventListener('click', function(e) {
        if (e.target === tipsOverlay) {
            closeTips();
        }
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && tipsOverlay && tipsOverlay.classList.contains('active')) {
        closeTips();
    }
});

// ===== EYE TRACKING =====
document.addEventListener('mousemove', function(e) {
    var container = document.getElementById('monster');
    
    var rect = container.getBoundingClientRect();
    var containerCenterX = rect.left + rect.width / 2;
    var containerCenterY = rect.top + rect.height / 2;
    
    var angle = Math.atan2(e.clientY - containerCenterY, e.clientX - containerCenterX);
    
    var maxMove = 20;
    
    var x = Math.cos(angle) * maxMove;
    var y = Math.sin(angle) * maxMove;
    
    pupils.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
});

// ===== SCAN FLOW =====
scanBtn.addEventListener('click', startScan);
urlInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') startScan();
});

// Scan mode selector - only Quick Scan is available
// Deep Scan and Custom Scan are disabled for this deployment

// Terminal stop button
var terminalStopBtn = document.getElementById('terminalStopBtn');
if (terminalStopBtn) {
    terminalStopBtn.addEventListener('click', stopScan);
}

clearBtn.addEventListener('click', function() {
    urlInput.value = '';
    clearBtn.classList.remove('visible');
    urlInput.focus();
});

stopBtn.addEventListener('click', stopScan);

// Terminal expand/collapse button
const terminalExpandBtn = document.getElementById('terminalExpandBtn');

terminalExpandBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (terminalOutput.classList.contains('expanded')) {
        terminalOutput.classList.remove('expanded');
        terminalExpandBtn.classList.remove('expanded');
        terminalExpandBtn.title = 'Expand all lines';
        updateLineDepths();
    } else {
        terminalOutput.classList.add('expanded');
        terminalExpandBtn.classList.add('expanded');
        terminalExpandBtn.title = 'Collapse';
        var allLines = terminalOutput.querySelectorAll('.terminal-line');
        for (var i = 0; i < allLines.length; i++) {
            allLines[i].classList.remove('depth-1', 'depth-2', 'depth-3', 'depth-4', 'depth-5', 'depth-6', 'depth-7', 'depth-8', 'depth-9', 'depth-fade', 'depth-hidden');
            allLines[i].style.display = '';
            allLines[i].style.maxHeight = '';
            allLines[i].style.margin = '';
            allLines[i].style.padding = '';
            allLines[i].style.overflow = '';
        }
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
});

scanAgainButton.addEventListener('click', resetToIdle);

downloadBtn.addEventListener('click', function() {
    console.log('[download] currentScanId:', currentScanId, 'lastScanResult:', lastScanResult);
    if (!currentScanId || !lastScanResult) {
        console.warn('[download] Cannot download: missing scanId or result');
        return;
    }
    
    downloadBtn.disabled = true;
    downloadBtn.textContent = safeT('downloading') || 'Downloading...';
    
    var format = downloadFormat.value;
    var lang = languageSelector.currentLang || 'en';
    
    if (format === 'csv') {
        var downloadUrl = API_BASE + '/api/download?format=csv&scanId=' + encodeURIComponent(currentScanId) + '&lang=' + encodeURIComponent(lang);
        console.log('[download] Fetching CSV:', downloadUrl);
        
        fetch(downloadUrl)
            .then(function(response) {
                console.log('[download] Response status:', response.status);
                if (!response.ok) {
                    return response.text().then(function(text) {
                        throw new Error('HTTP ' + response.status + ': ' + text);
                    });
                }
                return response.blob();
            })
            .then(function(blob) {
                console.log('[download] Blob size:', blob.size);
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'scanly-report-' + currentScanId + '.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch(function(err) {
                console.error('[download] Failed:', err);
                alert('Download failed: ' + err.message);
            })
            .finally(function() {
                downloadBtn.disabled = false;
                downloadBtn.textContent = safeT('downloadReport') || 'Download Report';
            });
    } else if (format === 'pdf') {
        console.log('[download] Using client-side PDF generation');
        downloadPdfClient();
    }
});

window.addEventListener('beforeunload', function() {
    if (scanBtn.disabled && currentScanId) {
        navigator.sendBeacon(API_BASE + '/api/stop', JSON.stringify({ scanId: currentScanId }));
    }
});

urlInput.addEventListener('input', function() {
    if (urlInput.value.length > 0) {
        clearBtn.classList.add('visible');
    } else {
        clearBtn.classList.remove('visible');
    }
});

var currentScanId = null;
var progressPollInterval = null;
var terminalPollInterval = null;
var lastEventIndex = 0;
var typewriterLineIndex = 0;
var typewriterCharIndex = 0;
var lastScanResult = null;

function startScan() {
    console.log('startScan called');
    
    if (scanBtn.disabled) {
        console.log('Scan button disabled, returning');
        return;
    }

    var url = urlInput.value.trim();
    if (!url) {
        console.log('No URL provided');
        urlInput.focus();
        return;
    }

    try {
        new URL(url);
    } catch (err) {
        console.log('Invalid URL');
        urlInput.style.borderColor = '#dc2626';
        setTimeout(function() { urlInput.style.borderColor = ''; }, 2000);
        return;
    }

    // Only Quick Scan is available on this deployment
    var scanMode = 'quick';
    var maxPages = 1;
    var maxDepth = 5;

    console.log('Showing terminal view');
    setScanningState(true);
    reportView.classList.remove('active');

    // Hide main interface, show terminal view
    mainInterface.style.cssText = 'display: none !important; animation: none !important;';
    terminalView.style.cssText = 'display: flex !important; opacity: 1 !important;';
    terminalOutput.innerHTML = '';
    terminalStatus.textContent = safeT('terminalInitializing');
    lastEventIndex = 0;
    
    console.log('Main interface display:', mainInterface.style.display);
    console.log('Terminal view display:', terminalView.style.display);

    var fetchTimeout = setTimeout(function() {
        setErrorState('Server is sleeping, please try again...');
    }, 45000);

    fetch(API_BASE + '/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            scanUrl: url, 
            maxPages: maxPages, 
            maxDepth: maxDepth,
            timeout: 60000,
            scanMode: scanMode
        }),
    })
    .then(async function(response) { 
        clearTimeout(fetchTimeout);
        console.log('[scan fetch] status:', response.status);
        if (response.status === 429) {
            console.log('[scan fetch] 429 detected');
            try {
                await response.json();
                showBusyModal(safeT('serverBusy'));
            } catch(e) {
                console.log('[scan fetch] json parse failed:', e);
                showBusyModal(safeT('serverBusy'));
            }
            return null;
        }
        var data = await response.json();
        if (data.error) {
            setErrorState(data.error);
            return null;
        }
        return data;
    })
    .then(function(result) {
        clearTimeout(fetchTimeout);
        if (!result) return;
        currentScanId = result.scanId;
        startProgressPolling();
        startTerminalPolling();
        pollForResult();
    })
    .catch(function(err) {
        clearTimeout(fetchTimeout);
        if (err.message === 'Scan aborted by user') {
            resetToIdle();
            return;
        }
        setErrorState(safeT('connectError'));
    });
}

function stopScan() {
    var stopTimeout = setTimeout(function() {
        stopProgressPolling();
        stopTerminalPolling();
        progressFill.style.width = '100%';
        loadingState.classList.remove('active');
        terminalView.style.cssText = 'display: none !important; opacity: 0 !important;';
        mainInterface.style.cssText = 'display: flex !important; animation: none !important;';
        mainInterface.classList.add('active');
        scanBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        urlInput.disabled = false;
        showReportView();
        scanAgainButton.style.display = 'inline-block';
        if (terminalLoading) terminalLoading.style.display = 'none';
        reportUrl.textContent = urlInput.value.trim();
        reportErrorCount.textContent = '1';
        reportWarningCount.textContent = '0';
        reportPassedCount.textContent = '0';
        reportIssuesList.innerHTML = '\x3Cdiv class="error-card"\x3E\x3Ch4>' + safeT('scanFailed') + '\x3C/h4\x3E\x3Cp>Stop request timed out, but scan may still be running. Please try again.</p\x3E\x3C/div>';
    }, 10000);

    fetch(API_BASE + '/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId: currentScanId }),
    })
    .then(function() {
        clearTimeout(stopTimeout);
        stopProgressPolling();
        stopTerminalPolling();
        progressFill.style.width = '100%';
        loadingState.classList.remove('active');
        terminalView.style.cssText = 'display: none !important; opacity: 0 !important;';
        mainInterface.style.cssText = 'display: flex !important; animation: none !important;';
        mainInterface.classList.add('active');
        scanBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        urlInput.disabled = false;
        showReportView();
        scanAgainButton.style.display = 'inline-block';
        if (terminalLoading) terminalLoading.style.display = 'none';
        reportUrl.textContent = urlInput.value.trim();
        reportErrorCount.textContent = '1';
        reportWarningCount.textContent = '0';
        reportPassedCount.textContent = '0';
        reportIssuesList.innerHTML = '\x3Cdiv class="error-card"\x3E\x3Ch4>' + safeT('scanFailed') + '\x3C/h4\x3E\x3Cp>' + safeT('scanAborted') + '\x3C/p\x3E\x3C/div>';
    })
    .catch(function() {
        clearTimeout(stopTimeout);
        stopProgressPolling();
        stopTerminalPolling();
        progressFill.style.width = '100%';
        loadingState.classList.remove('active');
        terminalView.style.cssText = 'display: none !important; opacity: 0 !important;';
        mainInterface.style.cssText = 'display: flex !important; animation: none !important;';
        mainInterface.classList.add('active');
        scanBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        urlInput.disabled = false;
        showReportView();
        scanAgainButton.style.display = 'inline-block';
        if (terminalLoading) terminalLoading.style.display = 'none';
        reportUrl.textContent = urlInput.value.trim();
        reportErrorCount.textContent = '1';
        reportWarningCount.textContent = '0';
        reportPassedCount.textContent = '0';
        reportIssuesList.innerHTML = '\x3Cdiv class="error-card"\x3E\x3Ch4>' + safeT('scanFailed') + '\x3C/h4\x3E\x3Cp>' + safeT('scanAborted') + '\x3C/p\x3E\x3C/div>';
    });
}

function setScanningState(scanning) {
    scanBtn.disabled = scanning;

    if (scanning) {
        monsterContainer.className = 'monster-container';
        progressBar.classList.add('visible');
        scanBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        urlInput.disabled = true;
        clearBtn.classList.remove('visible');
        startProgressPolling();
    } else {
        monsterContainer.className = 'monster-container';
        progressBar.classList.remove('visible');
        progressFill.style.width = '0%';
        stopProgressPolling();
        scanBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        urlInput.disabled = false;
        if (urlInput.value.length > 0) {
            clearBtn.classList.add('visible');
        }
    }
}

// ===== LOADING PHRASES (REMOVED) =====
// Loading phrases and thought icons removed per user request

function startProgressPolling() {
    var startTime = Date.now();
    var animDuration = 20000;
    var lastRealProgress = 0;
    var scanDone = false;
    progressAnimActive = true;
    
    function animateProgress() {
        if (!progressAnimActive || scanDone) return;
        var elapsed = Date.now() - startTime;
        var progress = Math.min((elapsed / animDuration) * 100, 95);
        progressFill.style.width = progress + '%';
        
        if (progress < 95 && progressAnimActive && !scanDone) {
            progressAnimFrame = requestAnimationFrame(animateProgress);
        }
    }
    progressAnimFrame = requestAnimationFrame(animateProgress);
    
    progressPollInterval = setInterval(function() {
        var controller = new AbortController();
        var timer = setTimeout(function() { controller.abort(); }, 5000);
        var scanIdParam = currentScanId ? '?scanId=' + encodeURIComponent(currentScanId) : '';
        fetch(API_BASE + '/api/progress' + scanIdParam, { signal: controller.signal })
            .then(function(response) { clearTimeout(timer); return response.json(); })
            .then(function(data) {
                if (data.isScanning) {
                    if (progressAnimActive && data.progress > 0) {
                        progressAnimActive = false;
                        if (progressAnimFrame) cancelAnimationFrame(progressAnimFrame);
                        progressFill.style.width = data.progress + '%';
                        lastRealProgress = data.progress;
                    } else if (!progressAnimActive) {
                        if (data.progress > lastRealProgress) {
                            lastRealProgress = data.progress;
                            progressFill.style.width = data.progress + '%';
                        }
                    }
                } else if (!scanDone) {
                    scanDone = true;
                    stopProgressAnimation();
                }
            })
            .catch(function(err) {
                console.error('Failed to fetch progress:', err);
            });
    }, 500);
}

function stopProgressAnimation() {
    if (progressPollInterval) {
        clearInterval(progressPollInterval);
        progressPollInterval = null;
    }
}

function stopProgressPolling() {
    if (progressPollInterval) {
        clearInterval(progressPollInterval);
        progressPollInterval = null;
    }
    if (progressAnimFrame) {
        cancelAnimationFrame(progressAnimFrame);
        progressAnimFrame = null;
    }
    progressAnimActive = false;
}

function startTerminalPolling() {
    terminalPollInterval = setInterval(function() {
        if (!currentScanId) return;
        var controller = new AbortController();
        var timer = setTimeout(function() { controller.abort(); }, 5000);
        
        fetch(API_BASE + '/api/events?scanId=' + encodeURIComponent(currentScanId) + '&since=' + lastEventIndex, { signal: controller.signal })
            .then(function(response) { clearTimeout(timer); return response.json(); })
            .then(function(data) {
                if (data.events && data.events.length > 0) {
                    data.events.forEach(function(event) {
                        appendTerminalLine(event);
                        lastEventIndex++;
                    });
                    
                    // Auto-scroll to bottom after a brief delay
                    setTimeout(function() {
                        terminalOutput.scrollTop = terminalOutput.scrollHeight;
                    }, 100);
                }
            })
            .catch(function(err) {
                console.error('Failed to fetch events:', err);
            });
    }, 100);
}

function stopTerminalPolling() {
    if (terminalPollInterval) {
        clearInterval(terminalPollInterval);
        terminalPollInterval = null;
    }
}

function updateLineDepths() {
    if (terminalOutput.classList.contains('expanded')) return;
    
    var allLines = terminalOutput.querySelectorAll('.terminal-line');
    var totalLines = allLines.length;
    var maxVisible = 10;
    var startIdx = Math.max(0, totalLines - maxVisible);
    
    for (var i = 0; i < allLines.length; i++) {
        // Clear all depth classes and inline styles
        allLines[i].classList.remove('depth-1', 'depth-2', 'depth-3', 'depth-4', 'depth-5', 'depth-6', 'depth-7', 'depth-8', 'depth-9', 'depth-fade', 'depth-hidden');
        allLines[i].style.display = '';
        allLines[i].style.maxHeight = '';
        allLines[i].style.margin = '';
        allLines[i].style.padding = '';
        allLines[i].style.overflow = '';
        
        // Position from the newest line (0 = newest)
        var posFromNewest = totalLines - i - 1;
        
        if (posFromNewest < maxVisible) {
            // Among the visible 10 newest lines: slight depth for visual hierarchy
            if (posFromNewest === 9) {
                allLines[i].classList.add('depth-9');
            } else if (posFromNewest === 8) {
                allLines[i].classList.add('depth-8');
            } else if (posFromNewest === 7) {
                allLines[i].classList.add('depth-7');
            } else if (posFromNewest === 6) {
                allLines[i].classList.add('depth-6');
            } else if (posFromNewest === 5) {
                allLines[i].classList.add('depth-5');
            } else if (posFromNewest === 4) {
                allLines[i].classList.add('depth-4');
            } else if (posFromNewest === 3) {
                allLines[i].classList.add('depth-3');
            } else if (posFromNewest === 2) {
                allLines[i].classList.add('depth-2');
            } else if (posFromNewest === 1) {
                allLines[i].classList.add('depth-1');
            }
            // posFromNewest === 0 = newest line, no class needed
        } else if (posFromNewest === maxVisible) {
            // 11th line (one beyond the 10 visible): small and lighter
            allLines[i].classList.add('depth-fade');
        } else {
            // 12th+ lines: gradually hidden
            allLines[i].classList.add('depth-hidden');
        }
    }
}

function appendTerminalLine(event) {
    var line = document.createElement('div');
    line.className = 'terminal-line ' + event.type + ' entering';
    
    var timestamp = new Date(event.timestamp || Date.now()).toLocaleTimeString(languageSelector.currentLang === 'ja' ? 'ja-JP' : languageSelector.currentLang === 'zh' ? 'zh-CN' : languageSelector.currentLang === 'zh-TW' ? 'zh-TW' : languageSelector.currentLang === 'ko' ? 'ko-KR' : languageSelector.currentLang === 'ms' ? 'ms-MY' : 'en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    var prefixMap = {
        'crawl': 'crawl',
        'scan': 'scan',
        'check': 'check',
        'issue': 'issue',
        'complete': 'terminalComplete',
        'error': 'terminalError',
        'system': 'system'
    };
    var prefixKey = prefixMap[event.type] || 'scan';
    var prefixText = safeT(prefixKey);
    var prefix = '[' + prefixText + ']';
    
    line.textContent = '[' + timestamp + '] ' + prefix + ' ' + event.message;
    line.setAttribute('data-event-type', event.type);
    line.setAttribute('data-event-message', event.message || '');
    terminalOutput.appendChild(line);
    
    // Remove 'entering' class after animation completes so smooth depth transitions take over
    line.addEventListener('animationend', function onAnimEnd() {
        line.classList.remove('entering');
        line.removeEventListener('animationend', onAnimEnd);
    });
    
    // Update depth classes for smooth aging
    updateLineDepths();
    
    // Auto-scroll to keep newest lines visible
    requestAnimationFrame(function() {
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    });
    
    // Update terminal status
    if (event.type === 'scan') {
        terminalStatus.textContent = event.message;
    } else if (event.type === 'complete') {
        terminalStatus.textContent = safeT('terminalComplete');
    } else if (event.type === 'error') {
        terminalStatus.textContent = safeT('terminalError') + event.message;
    }
}

var resultPollTimeout = null;

function pollForResult() {
    resultPollTimeout = setTimeout(function checkResult() {
        if (!currentScanId) return;
        var controller = new AbortController();
        var timer = setTimeout(function() { controller.abort(); }, 5000);
        
        fetch(API_BASE + '/api/result?scanId=' + encodeURIComponent(currentScanId), { signal: controller.signal })
            .then(function(response) { clearTimeout(timer); return response.json(); })
            .then(function(result) {
                console.log('[pollForResult] result:', result);
                if (result && result.error) {
                    setErrorState(result.error);
                    return;
                }
                if (result && (result.issues || result.summary || result.jsErrors || result.failedResponses)) {
                    console.log('[pollForResult] Results detected, switching to report view');
                    displayResults(result);
                    setMonsterState(result);
                    scanAgainButton.style.display = 'inline-block';
                    if (terminalLoading) terminalLoading.style.display = 'none';
                    return;
                }
                console.log('[pollForResult] No results yet, polling again...');
                resultPollTimeout = setTimeout(checkResult, 500);
            })
            .catch(function(err) {
                console.error('Failed to fetch result:', err);
                resultPollTimeout = setTimeout(checkResult, 1000);
            });
    }, 500);
}

function setMonsterState(result) {
    stopProgressPolling();
    progressFill.style.width = '100%';

    setTimeout(function() {
        monsterContainer.className = 'monster-container';
    }, 300);
}

function showReportView() {
    console.log('[showReportView] switching to report');
    mainInterface.classList.remove('active');
    terminalView.style.cssText = 'display: none !important; opacity: 0 !important;';
    reportView.classList.add('active');
    reportDocument.style.animation = 'none';
    void reportDocument.offsetHeight;
    reportDocument.style.animation = '';
    
    if (scanModeIndicator) scanModeIndicator.style.display = 'none';
    
    var downloadBar = document.querySelector('.download-bar');
    if (downloadBar) {
        downloadBar.style.display = 'flex';
    }
    if (scanAgainButton) {
        scanAgainButton.style.display = 'inline-block';
    }
}

function hideReportView() {
    reportView.classList.remove('active');
    mainInterface.classList.add('active');
}

function setErrorState(message) {
    stopProgressPolling();
    progressFill.style.width = '100%';

    showReportView();
    scanAgainButton.style.display = 'inline-block';
    if (terminalLoading) terminalLoading.style.display = 'none';

    reportUrl.textContent = urlInput.value.trim();
    reportErrorCount.textContent = '1';
    reportWarningCount.textContent = '0';
    reportPassedCount.textContent = '0';

    reportIssuesList.innerHTML = '\x3Cdiv class="error-card">\x3Ch4>' + safeT('scanFailed') + '\x3C/h4>\x3Cp>' + escapeHtml(message) + '\x3C/p>\x3C/div>';
}

function showBusyModal(message) {
    console.log('[showBusyModal] called with:', message);
    var busyOverlay = document.getElementById('busyOverlay');
    var busyMessage = document.getElementById('busyMessage');
    var busyClose = document.getElementById('busyClose');
    var terminalView = document.getElementById('terminalView');
    var mainInterface = document.getElementById('mainInterface');
    console.log('[showBusyModal] overlay:', !!busyOverlay, 'message:', !!busyMessage);
    if (!busyOverlay || !busyMessage) return;
    busyMessage.textContent = message;
    if (terminalView) {
        terminalView.style.display = 'none';
    }
    busyOverlay.style.display = 'flex';
    function restoreView() {
        busyOverlay.style.display = 'none';
        if (terminalView) {
            terminalView.style.display = 'none';
        }
        if (mainInterface) {
            mainInterface.style.display = 'flex';
        }
        stopProgressPolling();
        stopTerminalPolling();
        progressFill.style.width = '0%';
        var progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.classList.remove('visible');
        }
        if (scanBtn) {
            scanBtn.style.display = 'inline-block';
            scanBtn.disabled = false;
        }
        if (stopBtn) stopBtn.style.display = 'none';
        if (urlInput) {
            urlInput.disabled = false;
            urlInput.value = '';
        }
        currentScanId = null;
        lastEventIndex = 0;
        if (mainInterface) {
            mainInterface.classList.add('active');
        }
    }
    if (busyClose) {
        busyClose.onclick = restoreView;
    }
    busyOverlay.onclick = function(e) {
        if (e.target === busyOverlay) {
            restoreView();
        }
    };
}

function displayResults(result) {
    console.log('[displayResults] called, result keys:', Object.keys(result || {}));
    stopProgressPolling();
    stopTerminalPolling();
    progressFill.style.width = '100%';

    showReportView();
    lastScanResult = result;

    var summary = result.summary || { errors: 0, warnings: 0, info: 0 };
    var errors = summary.errors;
    var warnings = summary.warnings;
    var info = summary.info;

    reportUrl.textContent = urlInput.value.trim();

    var pagesScanned = result.pagesScanned || 1;
    var scanModeRaw = result.scanMode || 'Quick Scan';
    var scanModeLabel;
    if (scanModeRaw === 'Quick Scan') scanModeLabel = languageSelector.t('quickScan');
    else if (scanModeRaw === 'Deep Scan') scanModeLabel = languageSelector.t('deepScan');
    else if (scanModeRaw === 'Custom Scan') scanModeLabel = languageSelector.t('customScan');
    else scanModeLabel = scanModeRaw;
    var pageLabel = pagesScanned === 1 ? languageSelector.t('pageLabel') : languageSelector.t('pagesLabel');
    docScanInfo.textContent = scanModeLabel + ' · ' + pagesScanned + ' ' + pageLabel;

    reportErrorCount.textContent = errors;
    reportWarningCount.textContent = warnings;
    reportPassedCount.textContent = info;

    var issues = result.issues || [];
    var pages = result.pages || [];

    // Setup page selector for multi-page scans
    if (pages.length > 1) {
        pageSelector.style.display = 'block';
        pageSelect.innerHTML = '';

        var allOption = document.createElement('option');
        allOption.value = '__all__';
        allOption.textContent = languageSelector.t('allPages') + ' (' + pages.length + ')';
        pageSelect.appendChild(allOption);

        for (var p = 0; p < pages.length; p++) {
            var opt = document.createElement('option');
            opt.value = p;
            var pageUrl = pages[p].url;
            var shortUrl = pageUrl.replace(/^https?:\/\//, '');
            var pathPart = shortUrl.split('/').slice(0, 3).join('/');
            if (pathPart.length > 50) pathPart = pathPart.substring(0, 50) + '...';
            opt.textContent = (p + 1) + '. ' + pathPart;
            pageSelect.appendChild(opt);
        }

        pageSelect.addEventListener('change', function() {
            renderPageView(result, this.value);
        });

        renderPageView(result, '__all__');
    } else {
        pageSelector.style.display = 'none';
        renderIssuesList(issues, errors, warnings, info);
    }
}

function renderPageView(result, selectedPage) {
    var pages = result.pages || [];

    if (selectedPage === '__all__') {
        pageSelectorStats.innerHTML = '';
        renderIssuesList(result.issues || [], result.summary.errors, result.summary.warnings, result.summary.info);
        return;
    }

    var pageIdx = parseInt(selectedPage, 10);
    var page = pages[pageIdx];
    if (!page) return;

    var shortUrl = page.url.replace(/^https?:\/\//, '');
    var pathPart = shortUrl.split('/').slice(0, 3).join('/');
    if (pathPart.length > 50) pathPart = pathPart.substring(0, 50) + '...';
    pageSelectorStats.innerHTML =
        '<span class="stat-item">' + pathPart + '</span>' +
        '<span class="stat-item error">' + languageSelector.t('errors') + ': ' + page.summary.errors + '</span>' +
        '<span class="stat-item warning">' + languageSelector.t('warnings') + ': ' + page.summary.warnings + '</span>' +
        '<span class="stat-item info">' + languageSelector.t('passed') + ': ' + page.summary.info + '</span>';

    renderIssuesList(page.issues || [], page.summary.errors, page.summary.warnings, page.summary.info);
}

function renderIssuesList(issues, errors, warnings, info) {
    reportIssuesList.innerHTML = '';

    var issuesByType = {};
    for (var i = 0; i < issues.length; i++) {
        var issue = issues[i];
        var type = issue.type || 'other';
        if (!issuesByType[type]) {
            issuesByType[type] = [];
        }
        issuesByType[type].push(issue);
    }

    var typeNames = {
        'missing-alt': languageSelector.t('issueTypes.missing-alt'),
        'broken-link': languageSelector.t('issueTypes.broken-link'),
        'empty-picture': languageSelector.t('issueTypes.empty-picture'),
        'empty-button': languageSelector.t('issueTypes.empty-button'),
        'format-mix': languageSelector.t('issueTypes.format-mix'),
        'unsupported-format': languageSelector.t('issueTypes.unsupported-format'),
        'error-render': languageSelector.t('issueTypes.error-render')
    };

    var typeDescriptions = {
        'missing-alt': languageSelector.t('issueDescriptions.missing-alt'),
        'broken-link': languageSelector.t('issueDescriptions.broken-link'),
        'empty-picture': languageSelector.t('issueDescriptions.empty-picture'),
        'empty-button': languageSelector.t('issueDescriptions.empty-button'),
        'format-mix': languageSelector.t('issueDescriptions.format-mix'),
        'unsupported-format': languageSelector.t('issueDescriptions.unsupported-format'),
        'error-render': languageSelector.t('issueDescriptions.error-render')
    };

    for (var type in issuesByType) {
        var typeIssues = issuesByType[type];
        var isError = typeIssues[0].severity === 'error';

        var section = document.createElement('div');
        section.className = 'issue-section';

        var header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML =
            '\x3Cdiv class="section-icon ' + (isError ? 'error' : 'warning') + '"\x3E' + (isError ? '!' : '?') + '\x3C/div\x3E' +
            '\x3Cdiv class="section-title" data-issue-type="' + type + '"\x3E' + (typeNames[type] || type) + '\x3C/div\x3E' +
            '\x3Cdiv class="section-count"\x3E' + typeIssues.length + ' ' + (typeIssues.length === 1 ? languageSelector.t('issueLabel') : languageSelector.t('issuesLabel')) + '\x3C/div\x3E';
        section.appendChild(header);

        var desc = document.createElement('div');
        desc.className = 'section-description';
        desc.setAttribute('data-issue-type', type);
        desc.textContent = typeDescriptions[type] || 'Issues found on this page';
        section.appendChild(desc);

        for (var j = 0; j < typeIssues.length; j++) {
            var issue = typeIssues[j];
            var item = document.createElement('div');
            item.className = 'issue-item ' + issue.severity;

            var issueTitle = issue.message;
            var issueLocation = issue.element || issue.url || '';
            var issueFix = issue.suggestion || '';

            // Translate message and suggestion
            var translated = translateIssueMessage(issue.type, issueTitle, issueFix);
            issueTitle = translated.message;
            issueFix = translated.suggestion;

            item.innerHTML =
                '\x3Cdiv class="issue-header"\x3E' +
                    '\x3Cdiv class="issue-number"\x3E' + (j + 1) + '.\x3C/div\x3E' +
                    '\x3Cdiv class="issue-title"\x3E' + escapeHtml(issueTitle) + '\x3C/div\x3E' +
                '\x3C/div\x3E' +
                (issueLocation ? '\x3Cdiv class="issue-details"\x3E\x3Cdiv class="issue-location"\x3E' + escapeHtml(issueLocation) + '\x3C/div\x3E\x3C/div\x3E' : '') +
                (issueFix ? '\x3Cdiv class="issue-details"\x3E\x3Cdiv class="issue-fix"\x3E\x3Cstrong data-i18n="fixLabel"\x3E' + languageSelector.t('fixLabel') + '\x3C/strong\x3E ' + escapeHtml(issueFix) + '\x3C/div\x3E\x3C/div\x3E' : '');

            section.appendChild(item);
        }

        reportIssuesList.appendChild(section);
    }

    if (!issues || issues.length === 0) {
        var successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = '\x3Ch3\x3E' + languageSelector.t('successTitle') + '\x3C/h3\x3E\x3Cp\x3E' + languageSelector.t('successMessage') + '\x3C/p\x3E';
        reportIssuesList.appendChild(successDiv);
    }
}

var retranslateReport = function() {
    if (!lastScanResult || !reportView.classList.contains('active')) return;

    var result = lastScanResult;
    var summary = result.summary || { errors: 0, warnings: 0, info: 0 };

    var pagesScanned = result.pagesScanned || 1;
    var scanModeRaw = result.scanMode || 'Quick Scan';
    var scanModeLabel;
    if (scanModeRaw === 'Quick Scan') scanModeLabel = languageSelector.t('quickScan');
    else if (scanModeRaw === 'Deep Scan') scanModeLabel = languageSelector.t('deepScan');
    else if (scanModeRaw === 'Custom Scan') scanModeLabel = languageSelector.t('customScan');
    else scanModeLabel = scanModeRaw;
    var pageLabel = pagesScanned === 1 ? languageSelector.t('pageLabel') : languageSelector.t('pagesLabel');
    if (docScanInfo) docScanInfo.textContent = scanModeLabel + ' · ' + pagesScanned + ' ' + pageLabel;

    if (reportErrorCount) reportErrorCount.textContent = summary.errors;
    if (reportWarningCount) reportWarningCount.textContent = summary.warnings;
    if (reportPassedCount) reportPassedCount.textContent = summary.info;

    var issues = result.issues || [];
    var pages = result.pages || [];

    if (pages.length > 1 && pageSelector) {
        pageSelector.style.display = 'block';
        pageSelect.innerHTML = '';

        var allOption = document.createElement('option');
        allOption.value = '__all__';
        allOption.textContent = languageSelector.t('allPages') + ' (' + pages.length + ')';
        pageSelect.appendChild(allOption);

        for (var p = 0; p < pages.length; p++) {
            var opt = document.createElement('option');
            opt.value = p;
            var pageUrl = pages[p].url;
            var shortUrl = pageUrl.replace(/^https?:\/\//, '');
            var pathPart = shortUrl.split('/').slice(0, 3).join('/');
            if (pathPart.length > 50) pathPart = pathPart.substring(0, 50) + '...';
            opt.textContent = (p + 1) + '. ' + pathPart;
            pageSelect.appendChild(opt);
        }

        var currentPage = pageSelect.value || '__all__';
        renderPageView(result, currentPage);
    } else {
        if (pageSelector) pageSelector.style.display = 'none';
        renderIssuesList(issues, summary.errors, summary.warnings, summary.info);
    }
};

function resetToIdle() {
    currentScanId = null;
    hideReportView();
    var downloadBar = document.querySelector('.download-bar');
    if (downloadBar) downloadBar.style.display = 'none';
    urlInput.value = '';
    urlInput.disabled = false;
    scanBtn.disabled = false;
    scanBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    clearBtn.classList.remove('visible');
    monsterContainer.className = 'monster-container';
    progressBar.classList.remove('visible');
    progressFill.style.width = '0%';
    terminalView.style.cssText = 'display: none !important; opacity: 0 !important;';
    terminalOutput.innerHTML = '';
    terminalOutput.classList.remove('expanded');
    if (terminalExpandBtn) {
        terminalExpandBtn.classList.remove('expanded');
        terminalExpandBtn.title = 'Expand all lines';
    }
    mainInterface.style.cssText = 'display: flex !important; animation: none !important;';
    mainInterface.classList.add('active');
    if (scanModeIndicator) scanModeIndicator.style.display = 'flex';
    urlInput.focus();
}

var retranslateTerminal = function() {
    if (!terminalOutput || !languageSelector) return;
    var lines = terminalOutput.querySelectorAll('.terminal-line');
    for (var i = 0; i < lines.length; i++) {
        var eventType = lines[i].getAttribute('data-event-type');
        var eventMessage = lines[i].getAttribute('data-event-message');
        if (!eventType) continue;
        
        var prefixMap = {
            'crawl': 'crawl',
            'scan': 'scan',
            'check': 'check',
            'issue': 'issue',
            'complete': 'terminalComplete',
            'error': 'terminalError',
            'system': 'system'
        };
        var prefixKey = prefixMap[eventType] || 'scan';
        var newPrefix = languageSelector.t(prefixKey);
        
        var timestamp = new Date().toLocaleTimeString(languageSelector.currentLang === 'ja' ? 'ja-JP' : languageSelector.currentLang === 'zh' ? 'zh-CN' : languageSelector.currentLang === 'zh-TW' ? 'zh-TW' : languageSelector.currentLang === 'ko' ? 'ko-KR' : languageSelector.currentLang === 'ms' ? 'ms-MY' : 'en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        var existingMatch = lines[i].textContent.match(/^\[([^\]]+)\]/);
        if (existingMatch) {
            var existingTimestamp = existingMatch[1];
            lines[i].textContent = '[' + existingTimestamp + '] [' + newPrefix + '] ' + (eventMessage || '');
        } else {
            lines[i].textContent = '[' + newPrefix + '] ' + (eventMessage || '');
        }
    }
    if (terminalStatus) {
        var statusText = terminalStatus.textContent;
        var completeText = languageSelector.t('terminalComplete');
        var errorText = languageSelector.t('terminalError');
        if (statusText === 'Complete!') {
            terminalStatus.textContent = completeText;
        } else if (statusText.indexOf(errorText) === 0) {
            var errMsg = statusText.substring(errorText.length);
            terminalStatus.textContent = errorText + errMsg;
        }
    }
};

function toggleScreenshot(img) {
    img.classList.toggle('expanded');
    var hint = img.nextElementSibling;
    if (hint && hint.className === 'screenshot-hint') {
        hint.textContent = img.classList.contains('expanded') ? languageSelector.t('screenshotHintExpanded') : languageSelector.t('screenshotHint');
    }
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    var s = String(str);
    s = s.replace(/&/g, '\x26amp;');
    s = s.replace(/</g, '\x26lt;');
    s = s.replace(/>/g, '\x26gt;');
    s = s.replace(/"/g, '\x26quot;');
    return s;
}

function translateIssueMessage(type, message, suggestion) {
    var keys = languageSelector.t('issueMessages');
    if (!keys) return { message: message, suggestion: suggestion };

    var msgKey = type + (type === 'poor-alt' ? '-generic' : '');
    var sugKey = type + '-suggestion';
    
    var translatedMsg = keys[msgKey] || message;
    var translatedSug = keys[sugKey] || suggestion;

    // Extract placeholder values from the ORIGINAL message (backend provides real values)
    var placeholders = {};
    if (message) {
        var urlMatch = message.match(/:?\s*(https?:\/\/[^\s)]+)/);
        if (urlMatch) placeholders.url = urlMatch[1];
        var statusMatch = message.match(/HTTP (\d+)/);
        if (statusMatch) placeholders.status = statusMatch[1];
        var formatMatch = message.match(/\.(\w+)/);
        if (formatMatch) {
            placeholders.format = formatMatch[1].toUpperCase();
        } else {
            // Try without dot: "Image uses PNG — ..."
            var formatMatch2 = message.match(/uses\s+([A-Z]+)/);
            if (formatMatch2) {
                placeholders.format = formatMatch2[1];
            }
        }
        var altMatch = message.match(/"([^"]+)"/);
        if (altMatch) placeholders.text = altMatch[1];
    }
    // Replace placeholders in the translated message
    for (var ph in placeholders) {
        translatedMsg = translatedMsg.replace(new RegExp('\\{\\{' + ph + '\\}\\}', 'g'), placeholders[ph]);
    }
    if (suggestion) {
        var urlMatch2 = suggestion.match(/<img src="([^"]+)"/);
        if (urlMatch2) translatedSug = translatedSug.replace(/\{\{src\}\}/g, urlMatch2[1]);
    }

    return { message: translatedMsg, suggestion: translatedSug };
}

// ===== CLIENT-SIDE HTML REPORT GENERATION =====
var reportHtmlTranslations = {
    en: { reportTitle: 'Website Scan Report', errors: 'Errors', warnings: 'Warnings', passed: 'Passed', total: 'Total', issuesFound: 'Issues Found', warningsOnly: 'Warnings Only', allClear: 'All Clear', generated: 'Generated', findings: 'Findings', severity: 'Severity', type: 'Type', message: 'Message', element: 'Element', url: 'URL', suggestion: 'Suggestion', jsErrors: 'JavaScript Errors', consoleErrors: 'Console Errors', failedResources: 'Failed Resources', noIssues: 'No issues found — everything looks good!', footer: 'Scanly — Website Content Checker', 'error': 'Error', 'warning': 'Warning', 'info': 'Info' },
    ja: { reportTitle: 'ウェブサイトスキャンレポート', errors: 'エラー', warnings: '警告', passed: '合格', total: '合計', issuesFound: '問題が見つかりました', warningsOnly: '警告のみ', allClear: 'クリア', generated: '生成日時', findings: '発見された問題', severity: '重大度', type: '種類', message: 'メッセージ', element: '要素', url: 'URL', suggestion: '修正案', jsErrors: 'JavaScriptエラー', consoleErrors: 'コンソールエラー', failedResources: '読み込み失敗リソース', noIssues: '問題はありませんでした！', footer: 'Scanly — ウェブサイトコンテンツチェッカー', 'error': 'エラー', 'warning': '警告', 'info': '情報' },
    zh: { reportTitle: '网站扫描报告', errors: '错误', warnings: '警告', passed: '通过', total: '总计', issuesFound: '发现问题', warningsOnly: '仅有警告', allClear: '全部通过', generated: '生成时间', findings: '发现的问题', severity: '严重程度', type: '类型', message: '消息', element: '元素', url: 'URL', suggestion: '建议', jsErrors: 'JavaScript 错误', consoleErrors: '控制台错误', failedResources: '加载失败的资源', noIssues: '没有问题！一切正常。', footer: 'Scanly — 网站内容检查器', 'error': '错误', 'warning': '警告', 'info': '信息' },
    'zh-TW': { reportTitle: '網站掃描報告', errors: '錯誤', warnings: '警告', passed: '通過', total: '總計', issuesFound: '發現問題', warningsOnly: '僅有警告', allClear: '全部通過', generated: '生成時間', findings: '發現的問題', severity: '嚴重程度', type: '類型', message: '訊息', element: '元素', url: 'URL', suggestion: '建議', jsErrors: 'JavaScript 錯誤', consoleErrors: '控制台錯誤', failedResources: '載入失敗的資源', noIssues: '沒有問題！一切正常。', footer: 'Scanly — 網站內容檢查器', 'error': '錯誤', 'warning': '警告', 'info': '資訊' },
    ko: { reportTitle: '웹사이트 스캔 보고서', errors: '오류', warnings: '경고', passed: '통과', total: '합계', issuesFound: '문제 발견', warningsOnly: '경고만 있음', allClear: '전체 통과', generated: '생성 시각', findings: '발견된 문제', severity: '중요도', type: '유형', message: '메시지', element: '요소', url: 'URL', suggestion: '제안', jsErrors: 'JavaScript 오류', consoleErrors: '콘솔 오류', failedResources: '로드 실패 리소스', noIssues: '문제가 없습니다! 모든 항목이 정상입니다.', footer: 'Scanly — 웹사이트 콘텐츠 체크러', 'error': '오류', 'warning': '경고', 'info': '정보' },
    ms: { reportTitle: 'Laporan Imbasan Laman Web', errors: 'Ralat', warnings: 'Amaran', passed: 'Lulus', total: 'Jumlah', issuesFound: 'Masalah Ditemui', warningsOnly: 'Amaran Sahaja', allClear: 'Semua Lulus', generated: 'Dijana', findings: 'Masalah Ditemui', severity: 'Tahap', type: 'Jenis', message: 'Mesej', element: 'Elemen', url: 'URL', suggestion: 'Cadangan', jsErrors: 'Ralat JavaScript', consoleErrors: 'Ralat Konsol', failedResources: 'Sumber Gagal Dimuat', noIssues: 'Tiada masalah ditemui — semuanya baik!', footer: 'Scanly — Pemeriksa Kandungan Laman Web', 'error': 'Ralat', 'warning': 'Amaran', 'info': 'Maklumat' }
};

function reportHtmlClient(result, lang) {
    lang = lang || 'en';
    var t = reportHtmlTranslations[lang] || reportHtmlTranslations.en;
    var issues = result.issues || [];
    var issuesHtml = issues.map(function(issue) {
        var severityClass = issue.severity || 'info';
        var severityLabel = t[issue.severity] || t['info'] || 'Info';
        return '<tr class="issue-row ' + severityClass + '">' +
            '<td><span class="badge badge-' + severityClass + '">' + severityLabel + '</span></td>' +
            '<td class="issue-type">' + escapeHtml(issue.type || '') + '</td>' +
            '<td class="issue-message">' + escapeHtml(issue.message || '') + '</td>' +
            '<td class="issue-element">' + escapeHtml(issue.element || '') + '</td>' +
            '<td class="issue-url"><a href="' + escapeHtml(issue.url) + '" target="_blank">' + escapeHtml(issue.url) + '</a></td>' +
            (issue.suggestion ? '<td class="issue-suggestion">' + escapeHtml(issue.suggestion) + '</td>' : '') +
            '</tr>';
    }).join('');

    var jsErrorsHtml = (result.jsErrors || []).map(function(err) {
        return '<tr><td class="error-type">' + t.jsErrors + '</td><td class="error-msg">' + escapeHtml(err) + '</td></tr>';
    }).join('');

    var consoleErrorsHtml = (result.consoleErrors || []).map(function(err) {
        return '<tr><td class="error-type">' + t.consoleErrors + '</td><td class="error-msg">' + escapeHtml(err) + '</td></tr>';
    }).join('');

    var failedResponsesHtml = (result.failedResponses || []).map(function(resp) {
        return '<tr><td class="error-type">' + t.failedResources + '</td><td class="error-msg">' + escapeHtml(resp.url) + ' (HTTP ' + resp.status + ')</td></tr>';
    }).join('');

    var summary = result.summary || { errors: 0, warnings: 0, info: 0, total: 0 };
    var errors = summary.errors || 0;
    var warnings = summary.warnings || 0;
    var info = summary.info || 0;
    var statusColor = errors > 0 ? '#dc2626' : warnings > 0 ? '#d97706' : '#16a34a';
    var statusText = errors > 0 ? t.issuesFound : warnings > 0 ? t.warningsOnly : t.allClear;
    var statusBg = errors > 0 ? '#fef2f2' : warnings > 0 ? '#fffbeb' : '#f0fdf4';
    var generatedDate = new Date().toLocaleString(lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : lang === 'zh-TW' ? 'zh-TW' : lang === 'ko' ? 'ko-KR' : lang === 'ms' ? 'ms-MY' : 'en-US');
    var generatedDateStr = 'Generated: ' + generatedDate;
    var footerDate = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : lang === 'zh-TW' ? 'zh-TW' : lang === 'ko' ? 'ko-KR' : lang === 'ms' ? 'ms-MY' : 'en-US');

    return '<!DOCTYPE html><html lang="' + lang + '"><head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>' + t.reportTitle + ' — ' + escapeHtml(result.url) + '</title>' +
        '<style>' +
        '@page { size: A4; margin: 0; }' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; background: #e5e5e5; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
        '.page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; position: relative; overflow: hidden; }' +
        '.accent-bar { height: 6px; background: linear-gradient(90deg, #111 0%, #333 100%); }' +
        '.report-header { padding: 32mm 20mm 8mm 20mm; display: flex; align-items: flex-start; justify-content: space-between; }' +
        '.header-left { display: flex; align-items: center; gap: 16px; }' +
        '.logo { width: 60px; height: 60px; border-radius: 6px; object-fit: contain; }' +
        '.brand h1 { font-size: 1.1rem; font-weight: 700; color: #111; letter-spacing: 2px; text-transform: uppercase; }' +
        '.brand .report-label { font-size: 0.7rem; color: #888; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }' +
        '.header-right { text-align: right; }' +
        '.stamp { display: inline-block; border: 2px solid #111; padding: 4px 14px; font-size: 0.65rem; font-weight: 700; letter-spacing: 3px; color: #111; margin-bottom: 8px; }' +
        '.meta { font-size: 0.72rem; color: #888; line-height: 1.6; }' +
        '.meta a { color: #2563eb; text-decoration: none; word-break: break-all; }' +
        '.divider { height: 1px; background: #e5e5e5; margin: 0 20mm; }' +
        '.summary-section { padding: 10mm 20mm; display: flex; gap: 8px; justify-content: center; }' +
        '.stat-card { flex: 1; max-width: 140px; text-align: center; padding: 10px 8px; border: 1px solid #e5e5e5; border-radius: 6px; background: #fafafa; }' +
        '.stat-card .number { font-size: 1.8rem; font-weight: 700; line-height: 1; }' +
        '.stat-card .label { font-size: 0.6rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }' +
        '.stat-card.total .number { color: #111; }' +
        '.stat-card.errors .number { color: #dc2626; }' +
        '.stat-card.warnings .number { color: #d97706; }' +
        '.stat-card.info .number { color: #0284c7; }' +
        '.status-banner { text-align: center; padding: 6px 20mm; font-size: 0.8rem; font-weight: 600; }' +
        '.content { padding: 6mm 20mm 10mm 20mm; }' +
        '.section-title { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #111; margin-bottom: 6px; padding-top: 6px; }' +
        'table { width: 100%; border-collapse: collapse; margin-bottom: 8mm; font-size: 0.75rem; table-layout: fixed; }' +
        'thead th { background: #f9fafb; padding: 8px 10px; text-align: left; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border-bottom: 2px solid #e5e5e5; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }' +
        'thead th:nth-child(1) { width: 8%; }' +
        'thead th:nth-child(2) { width: 12%; }' +
        'thead th:nth-child(3) { width: 16%; }' +
        'thead th:nth-child(4) { width: 20%; }' +
        'thead th:nth-child(5) { width: 28%; }' +
        'thead th:nth-child(6) { width: 16%; }' +
        'tbody td { padding: 8px 10px; border-top: 1px solid #f3f4f6; vertical-align: top; overflow: hidden; text-overflow: ellipsis; }' +
        'tbody tr.issue-row.error { border-left: 2px solid #dc2626; }' +
        'tbody tr.issue-row.warning { border-left: 2px solid #d97706; }' +
        'tbody tr.issue-row.info { border-left: 2px solid #06b6d4; }' +
        '.badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.5px; }' +
        '.badge-error { background: #fef2f2; color: #dc2626; }' +
        '.badge-warning { background: #fffbeb; color: #d97706; }' +
        '.badge-info { background: #ecfeff; color: #0284c7; }' +
        '.issue-type { color: #6b7280; font-family: monospace; font-size: 0.7rem; }' +
        '.issue-element { font-family: monospace; font-size: 0.68rem; color: #6b7280; word-break: break-word; overflow-wrap: break-word; }' +
        '.issue-url { color: #2563eb; word-break: break-word; overflow-wrap: break-word; }' +
        '.issue-suggestion { color: #16a34a; font-size: 0.7rem; }' +
        '.error-msg { color: #dc2626; word-break: break-word; overflow-wrap: break-word; font-size: 0.7rem; }' +
        '.no-issues { text-align: center; padding: 12mm 0; color: #16a34a; font-size: 0.85rem; font-weight: 500; }' +
        '.report-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 6mm 20mm; border-top: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: center; }' +
        '.report-footer .footer-left { font-size: 0.65rem; color: #aaa; letter-spacing: 0.5px; }' +
        '.report-footer .footer-right { font-size: 0.65rem; color: #aaa; }' +
        '</style></head><body>' +
        '<div class="page">' +
        '<div class="accent-bar"></div>' +
        '<div class="report-header">' +
        '<div class="header-left">' +
        '<img src="images/logo.webp" alt="Scanly" class="logo">' +
        '<div class="brand"><h1>Scanly</h1><div class="report-label">' + t.reportTitle + '</div></div>' +
        '</div>' +
        '<div class="header-right">' +
        '<div class="stamp">SCANLY</div>' +
        '<div class="meta"><a href="' + escapeHtml(result.url) + '" target="_blank">' + escapeHtml(result.url) + '</a><br>' + generatedDateStr + '</div>' +
        '</div></div>' +
        '<div class="divider"></div>' +
        '<div class="summary-section">' +
        '<div class="stat-card total"><div class="number">' + (summary.total || 0) + '</div><div class="label">' + t.total + '</div></div>' +
        '<div class="stat-card errors"><div class="number">' + errors + '</div><div class="label">' + t.errors + '</div></div>' +
        '<div class="stat-card warnings"><div class="number">' + warnings + '</div><div class="label">' + t.warnings + '</div></div>' +
        '<div class="stat-card info"><div class="number">' + info + '</div><div class="label">' + t.passed + '</div></div>' +
        '</div>' +
        '<div class="status-banner" style="color:' + statusColor + '; background:' + statusBg + ';">' + statusText + '</div>' +
        '<div class="content">' +
        (result.jsErrors && result.jsErrors.length > 0 ? '<div class="section-title" style="color:#dc2626;">' + t.jsErrors + ' (' + result.jsErrors.length + ')</div><table><thead><tr><th>' + t.type + '</th><th>' + t.message + '</th></tr></thead><tbody>' + jsErrorsHtml + '</tbody></table>' : '') +
        (result.consoleErrors && result.consoleErrors.length > 0 ? '<div class="section-title" style="color:#d97706;">' + t.consoleErrors + ' (' + result.consoleErrors.length + ')</div><table><thead><tr><th>' + t.type + '</th><th>' + t.message + '</th></tr></thead><tbody>' + consoleErrorsHtml + '</tbody></table>' : '') +
        (result.failedResponses && result.failedResponses.length > 0 ? '<div class="section-title" style="color:#0284c7;">' + t.failedResources + ' (' + result.failedResponses.length + ')</div><table><thead><tr><th>' + t.type + '</th><th>' + t.message + '</th></tr></thead><tbody>' + failedResponsesHtml + '</tbody></table>' : '') +
        (issues.length > 0 ? '<div class="section-title">' + t.findings + ' (' + issues.length + ')</div><table><thead><tr><th>' + t.severity + '</th><th>' + t.type + '</th><th>' + t.message + '</th><th>' + t.element + '</th><th>' + t.url + '</th><th>' + t.suggestion + '</th></tr></thead><tbody>' + issuesHtml + '</tbody></table>' : '<div class="no-issues">' + t.noIssues + '</div>') +
        '</div>' +
        '<div class="report-footer"><div class="footer-left">' + t.footer + '</div><div class="footer-right">' + footerDate + '</div></div>' +
        '</div></body></html>';
}

// ===== CLIENT-SIDE PDF DOWNLOAD VIA window.print() =====
function downloadPdfClient() {
    if (!lastScanResult) {
        alert('No scan result available');
        return;
    }

    downloadBtn.disabled = true;
    downloadBtn.textContent = safeT('downloading') || 'Downloading...';

    var lang = languageSelector ? (languageSelector.currentLang || 'en') : 'en';
    var html = reportHtmlClient(lastScanResult, lang);

    var printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        alert('Please allow popups to download PDF');
        downloadBtn.disabled = false;
        downloadBtn.textContent = safeT('downloadReport') || 'Download Report';
        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = function() {
        setTimeout(function() {
            printWindow.print();
            downloadBtn.disabled = false;
            downloadBtn.textContent = safeT('downloadReport') || 'Download Report';
        }, 500);
    };

    printWindow.onunload = function() {
        downloadBtn.disabled = false;
        downloadBtn.textContent = safeT('downloadReport') || 'Download Report';
    };

    // Fallback: re-enable button after 3 seconds in case onunload never fires
    setTimeout(function() {
        downloadBtn.disabled = false;
        downloadBtn.textContent = safeT('downloadReport') || 'Download Report';
    }, 3000);
}
