// ===== SPLASH SCREEN =====
const splash = document.getElementById('splash');
const splashInner = document.querySelector('.splash-inner');
const mainInterface = document.getElementById('mainInterface');
const monsterContainer = document.getElementById('monster');
const mouth = document.getElementById('mouth');

// ===== TYPEWRITER SETUP =====
var typewriterLines = [
    'Drop your website URL below',
    'Scanly checks for broken links, missing images, and more',
    'Your report will be ready shortly'
];
var typewriterContainer = document.getElementById('typewriterContainer');
var typewriterCursor = document.getElementById('typewriterCursor');
var lineElements = [
    document.getElementById('typewriterLine1'),
    document.getElementById('typewriterLine2'),
    document.getElementById('typewriterLine3')
];
var typewriterTimeout = null;

function startTypewriter() {
    // Clear any existing typewriter
    if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
    }
    for (var i = 0; i < lineElements.length; i++) {
        lineElements[i].textContent = '';
    }
    typewriterCursor.classList.remove('hidden');
    
    // Show the container
    typewriterContainer.classList.add('visible');
    
    var lineIndex = 0;
    var charIndex = 0;
    
    function typeNextChar() {
        if (lineIndex >= typewriterLines.length) {
            // All done - cursor keeps blinking
            return;
        }
        
        var line = typewriterLines[lineIndex];
        
        if (charIndex < line.length) {
            // Type next character
            lineElements[lineIndex].textContent += line.charAt(charIndex);
            charIndex++;
            var speed = 25 + Math.random() * 15; // 25-40ms per char (slightly slower, readable)
            typewriterTimeout = setTimeout(typeNextChar, speed);
        } else {
            // Move to next line
            lineIndex++;
            charIndex = 0;
            var delay = 300; // pause between lines
            typewriterTimeout = setTimeout(typeNextChar, delay);
        }
    }
    
    // Start after 1 second delay (earlier start)
    typewriterTimeout = setTimeout(typeNextChar, 1000);
}

// ===== SPLASH SCREEN =====
splash.addEventListener('click', function() {
    // Prevent multiple clicks
    if (splash.classList.contains('eaten')) {
        return;
    }
    
    // 1. Add eaten class to trigger zoom-into-mouth animation on splash
    splash.classList.add('eaten');
    
    // 2. Make the monster gulp
    monsterContainer.classList.add('gulp');
    
    // 3. After zoom animation completes, hide splash
    setTimeout(function() {
        // Hide splash (triggers 0.8s fade out)
        splash.classList.add('hidden');
        splash.classList.remove('eaten');
        monsterContainer.classList.remove('gulp');
        
        // Wait for splash to fully fade out before showing main scene
        setTimeout(function() {
            mainInterface.classList.add('active');
            
            // Start typewriter after scene appears
            setTimeout(function() {
                startTypewriter();
            }, 300);
        }, 800);
    }, 600);
});

// ===== DOM REFS =====
const scanBtn = document.getElementById('scanBtn');
const urlInput = document.getElementById('urlInput');
const clearBtn = document.getElementById('clearBtn');
const stopBtn = document.getElementById('stopBtn');
const pupils = document.getElementById('pupils');
const loadingState = document.getElementById('loadingState');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');

// Report view refs
const reportView = document.getElementById('reportView');
const reportDocument = document.getElementById('reportDocument');
const reportUrl = document.getElementById('reportUrl');
const reportErrorCount = document.getElementById('reportErrorCount');
const reportWarningCount = document.getElementById('reportWarningCount');
const reportPassedCount = document.getElementById('reportPassedCount');
const reportIssuesList = document.getElementById('reportIssuesList');
const scanAgainButton = document.getElementById('scanAgainButton');

// ===== EYE TRACKING (Moves the whole pupils layer) =====
document.addEventListener('mousemove', function(e) {
    var container = document.getElementById('monster');
    
    // Get the center of the monster container
    var rect = container.getBoundingClientRect();
    var containerCenterX = rect.left + rect.width / 2;
    var containerCenterY = rect.top + rect.height / 2;
    
    // Calculate angle between center and mouse
    var angle = Math.atan2(e.clientY - containerCenterY, e.clientX - containerCenterX);
    
    // Limit how far the eyes can move
    var maxMove = 20;
    
    var x = Math.cos(angle) * maxMove;
    var y = Math.sin(angle) * maxMove;
    
    // Apply the movement
    pupils.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
});

// ===== SCAN FLOW =====
scanBtn.addEventListener('click', startScan);
urlInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') startScan();
});

clearBtn.addEventListener('click', function() {
    urlInput.value = '';
    clearBtn.classList.remove('visible');
    urlInput.focus();
});

stopBtn.addEventListener('click', stopScan);

scanAgainButton.addEventListener('click', resetToIdle);

window.addEventListener('beforeunload', function() {
    if (scanBtn.disabled) {
        navigator.sendBeacon('/api/stop', JSON.stringify({}));
    }
});

// Show/hide clear button based on input value
urlInput.addEventListener('input', function() {
    if (urlInput.value.length > 0) {
        clearBtn.classList.add('visible');
    } else {
        clearBtn.classList.remove('visible');
    }
});

function startScan() {
    if (scanBtn.disabled) {
        return;
    }

    var url = urlInput.value.trim();
    if (!url) {
        urlInput.focus();
        return;
    }

    // Validate URL
    try {
        new URL(url);
    } catch (err) {
        urlInput.style.borderColor = '#dc2626';
        setTimeout(function() { urlInput.style.borderColor = ''; }, 2000);
        return;
    }

    // Set scanning state
    setScanningState(true);
    reportView.classList.remove('active');

    fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanUrl: url, maxPages: 1, timeout: 60000 }),
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
        if (result.error) {
            setErrorState(result.error);
            return;
        }

        displayResults(result);
        setMonsterState(result);
        scanAgainButton.style.display = 'inline-block';
    })
    .catch(function(err) {
        if (err.message === 'Scan aborted by user') {
            resetToIdle();
            return;
        }
        setErrorState('Failed to connect to Scanly server');
    })
    .finally(function() {
        setScanningState(false);
    });
}

function stopScan() {
    fetch('/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    })
    .then(function() {
        resetToIdle();
    })
    .catch(function() {
        resetToIdle();
    });
}

function setScanningState(scanning) {
    scanBtn.disabled = scanning;

    if (scanning) {
        monsterContainer.className = 'monster-container';
        loadingState.classList.add('active');
        progressBar.classList.add('visible');
        scanBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        urlInput.disabled = true;
        clearBtn.classList.remove('visible');
        startProgressPolling();
    } else {
        monsterContainer.className = 'monster-container';
        loadingState.classList.remove('active');
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

// ===== LOADING PHRASES (Timeline-based) =====
var loadingPhrases = {
    early: [
        "That's a big one!",
        "Let me take a bite",
        "Ooh, a website!"
    ],
    mid: [
        "That's a cool website",
        "Love this!",
        "Crunching through the code"
    ],
    late: [
        "Looking real good",
        "Almost halfway there",
        "Give me a minute!"
    ],
    almost: [
        "Burp... almost done!",
        "Just about finished!",
        "Final checks"
    ]
};

var previousPhrase = '';

function getPhraseForProgress(progress) {
    var pool;
    
    // After 75%, cycle through ALL phrases to indicate it's still working on a large site
    if (progress >= 75) {
        // Combine all phrase pools for variety in the final stretch
        var allPhrases = loadingPhrases.early.concat(loadingPhrases.mid, loadingPhrases.late, loadingPhrases.almost);
        pool = allPhrases;
    } else if (progress < 15) {
        pool = loadingPhrases.early;
    } else if (progress < 45) {
        pool = loadingPhrases.mid;
    } else {
        pool = loadingPhrases.late;
    }
    
    // Pick a random phrase different from the previous one
    var phrase;
    if (pool.length === 1) {
        phrase = pool[0];
    } else {
        do {
            phrase = pool[Math.floor(Math.random() * pool.length)];
        } while (phrase === previousPhrase);
    }
    previousPhrase = phrase;
    return phrase;
}

var progressPollInterval = null;
var thoughtIconInterval = null;

// Available thought icons
var thoughtIcons = [
    'images/brilliant.svg',
    'images/fueling.svg',
    'images/marking.svg',
    'images/searching.svg',
    'images/thinking.svg',
    'images/wondering.svg'
];
var lastThoughtIndex = -1;

function createThoughtIcon() {
    var container = document.getElementById('thoughtIcons');
    if (!container) return;
    
    // Select next icon (loop through all without repeating consecutively)
    var nextIndex;
    if (thoughtIcons.length === 1) {
        nextIndex = 0;
    } else {
        do {
            nextIndex = Math.floor(Math.random() * thoughtIcons.length);
        } while (nextIndex === lastThoughtIndex);
    }
    lastThoughtIndex = nextIndex;
    
    // Create icon element
    var icon = document.createElement('img');
    icon.src = thoughtIcons[nextIndex];
    icon.className = 'thought-icon';
    icon.alt = 'thinking';
    
    // Random position near the top of the monster (where the head would be)
    var randomX = 20 + Math.random() * 60; // 20-80% from left
    var randomY = 5 + Math.random() * 20; // 5-25% from top
    
    icon.style.left = randomX + '%';
    icon.style.top = randomY + '%';
    
    // Add to container
    container.appendChild(icon);
    
    // Remove after animation completes (34 seconds to match CSS animation)
    setTimeout(function() {
        if (icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
    }, 34000);
}

function startThoughtIcons() {
    // Create the first icon quickly (after 3 seconds), then wait for full cycle
    function scheduleNextIcon(isFirst) {
        var delay;
        if (isFirst) {
            // First icon appears quickly
            delay = 3000;
        } else {
            // Wait for 30s pause + 30s visible = 60s total cycle
            delay = 60000;
        }
        
        thoughtIconInterval = setTimeout(function() {
            if (progressPollInterval) { // Only create icons while scanning
                createThoughtIcon();
                // After creating one, schedule the next (only after this one completes)
                scheduleNextIcon(false);
            }
        }, delay);
    }
    scheduleNextIcon(true);
}

function stopThoughtIcons() {
    if (thoughtIconInterval) {
        clearTimeout(thoughtIconInterval);
        thoughtIconInterval = null;
    }
    // Clear any existing icons
    var container = document.getElementById('thoughtIcons');
    if (container) {
        container.innerHTML = '';
    }
}

function startProgressPolling() {
    var phraseEl = document.getElementById('loadingPhrase');
    var lastPhraseUpdate = 0;
    var phraseUpdateInterval = 8000; // Update phrase every 8 seconds for a very relaxed, calm pace
    
    // Start thought icons
    startThoughtIcons();
    
    // Poll for real progress from server
    progressPollInterval = setInterval(function() {
        fetch('/api/progress')
            .then(function(response) { return response.json(); })
            .then(function(data) {
                if (data.isScanning) {
                    // Update progress bar with real progress
                    progressFill.style.width = data.progress + '%';
                    
                    // Update loading phrase based on real progress (with slower, more aesthetic timing)
                    var now = Date.now();
                    if (now - lastPhraseUpdate > phraseUpdateInterval) {
                        var newPhrase = getPhraseForProgress(data.progress);
                        if (phraseEl.textContent !== newPhrase) {
                            phraseEl.style.opacity = '0';
                            setTimeout(function() {
                                phraseEl.textContent = newPhrase;
                                phraseEl.style.opacity = '1';
                            }, 800); // Very slow, smooth fade transition
                        }
                        lastPhraseUpdate = now;
                    }
                }
            })
            .catch(function(err) {
                console.error('Failed to fetch progress:', err);
            });
    }, 500); // Poll every 500ms
}

function stopProgressPolling() {
    if (progressPollInterval) {
        clearInterval(progressPollInterval);
        progressPollInterval = null;
    }
    stopThoughtIcons();
}

function setMonsterState(result) {
    stopProgressPolling();
    progressFill.style.width = '100%';

    setTimeout(function() {
        monsterContainer.className = 'monster-container';
    }, 300);
}

function showReportView() {
    // Hide the monster/input scene, show the report view
    mainInterface.classList.remove('active');
    reportView.classList.add('active');
    // Re-trigger scroll-out animation by removing/adding class
    reportDocument.style.animation = 'none';
    void reportDocument.offsetHeight; // force reflow
    reportDocument.style.animation = '';
}

function hideReportView() {
    reportView.classList.remove('active');
    mainInterface.classList.add('active');
}

function setErrorState(message) {
    stopProgressPolling();
    progressFill.style.width = '100%';

    loadingState.classList.remove('active');

    showReportView();
    scanAgainButton.style.display = 'inline-block';

    reportUrl.textContent = urlInput.value.trim();
    reportErrorCount.textContent = '1';
    reportWarningCount.textContent = '0';
    reportPassedCount.textContent = '0';

    reportIssuesList.innerHTML = '\x3Cdiv class="error-card">\x3Ch4>Scan Failed\x3C/h4>\x3Cp>' + escapeHtml(message) + '\x3C/p>\x3C/div>';
}

function displayResults(result) {
    stopProgressPolling();
    progressFill.style.width = '100%';

    showReportView();

    var errors = result.summary.errors;
    var warnings = result.summary.warnings;
    var info = result.summary.info;

    // Update website info
    reportUrl.textContent = urlInput.value.trim();

    // Update summary counts
    reportErrorCount.textContent = errors;
    reportWarningCount.textContent = warnings;
    reportPassedCount.textContent = info;

    // Render issues by section
    reportIssuesList.innerHTML = '';

    var issues = result.issues || [];
    
    // Group issues by type
    var issuesByType = {};
    for (var i = 0; i < issues.length; i++) {
        var issue = issues[i];
        var type = issue.type || 'other';
        if (!issuesByType[type]) {
            issuesByType[type] = [];
        }
        issuesByType[type].push(issue);
    }

    // Create sections for each issue type
    var typeNames = {
        'missing-alt': 'Missing Alt Text',
        'broken-link': 'Broken Links',
        'empty-picture': 'Empty Images',
        'empty-button': 'Empty Buttons',
        'format': 'Formatting Issues',
        'error-render': 'Render Errors'
    };

    var typeDescriptions = {
        'missing-alt': 'Images without alternative text for accessibility',
        'broken-link': 'Links that lead to non-existent pages',
        'empty-picture': 'Image elements without source or dimensions',
        'empty-button': 'Buttons without text or accessible labels',
        'format': 'HTML structure and formatting problems',
        'error-render': 'JavaScript errors that prevented rendering'
    };

    for (var type in issuesByType) {
        var typeIssues = issuesByType[type];
        var isError = typeIssues[0].severity === 'error';
        
        var section = document.createElement('div');
        section.className = 'issue-section';

        // Section header
        var header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = 
            '\x3Cdiv class="section-icon ' + (isError ? 'error' : 'warning') + '"\x3E' + (isError ? '!' : '?') + '\x3C/div\x3E' +
            '\x3Cdiv class="section-title"\x3E' + (typeNames[type] || type) + '\x3C/div\x3E' +
            '\x3Cdiv class="section-count"\x3E' + typeIssues.length + ' ' + (typeIssues.length === 1 ? 'issue' : 'issues') + '\x3C/div\x3E';
        section.appendChild(header);

        // Section description
        var desc = document.createElement('div');
        desc.className = 'section-description';
        desc.textContent = typeDescriptions[type] || 'Issues found on this page';
        section.appendChild(desc);

        // Issue items
        for (var j = 0; j < typeIssues.length; j++) {
            var issue = typeIssues[j];
            var item = document.createElement('div');
            item.className = 'issue-item ' + issue.severity;

            var issueTitle = issue.message;
            var issueLocation = issue.element || issue.url || '';
            var issueFix = issue.suggestion || '';

            item.innerHTML = 
                '\x3Cdiv class="issue-header"\x3E' +
                    '\x3Cdiv class="issue-number"\x3E' + (j + 1) + '.\x3C/div\x3E' +
                    '\x3Cdiv class="issue-title"\x3E' + escapeHtml(issueTitle) + '\x3C/div\x3E' +
                '\x3C/div\x3E' +
                (issueLocation ? '\x3Cdiv class="issue-details"\x3E\x3Cdiv class="issue-location"\x3E' + escapeHtml(issueLocation) + '\x3C/div\x3E\x3C/div\x3E' : '') +
                (issueFix ? '\x3Cdiv class="issue-details"\x3E\x3Cdiv class="issue-fix"\x3E\x3Cstrong>Fix:\x3C/strong> ' + escapeHtml(issueFix) + '\x3C/div\x3E\x3C/div\x3E' : '');

            section.appendChild(item);
        }

        reportIssuesList.appendChild(section);
    }

    // JS errors section
    if (result.jsErrors && result.jsErrors.length > 0) {
        var section = document.createElement('div');
        section.className = 'issue-section';

        var header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = 
            '\x3Cdiv class="section-icon error"\x3E!\x3C/div\x3E' +
            '\x3Cdiv class="section-title"\x3EJavaScript Errors\x3C/div\x3E' +
            '\x3Cdiv class="section-count"\x3E' + result.jsErrors.length + ' ' + (result.jsErrors.length === 1 ? 'error' : 'errors') + '\x3C/div\x3E';
        section.appendChild(header);

        var desc = document.createElement('div');
        desc.className = 'section-description';
        desc.textContent = 'JavaScript errors that occurred during page load';
        section.appendChild(desc);

        for (var j = 0; j < Math.min(result.jsErrors.length, 20); j++) {
            var item = document.createElement('div');
            item.className = 'issue-item error';
            item.innerHTML = 
                '\x3Cdiv class="issue-header"\x3E' +
                    '\x3Cdiv class="issue-number"\x3E' + (j + 1) + '.\x3C/div\x3E' +
                    '\x3Cdiv class="issue-title"\x3E' + escapeHtml(result.jsErrors[j]) + '\x3C/div\x3E' +
                '\x3C/div\x3E';
            section.appendChild(item);
        }

        reportIssuesList.appendChild(section);
    }

    // Failed resources section
    if (result.failedResponses && result.failedResponses.length > 0) {
        var section = document.createElement('div');
        section.className = 'issue-section';

        var header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = 
            '\x3Cdiv class="section-icon error"\x3E!\x3C/div\x3E' +
            '\x3Cdiv class="section-title"\x3EFailed Resources\x3C/div\x3E' +
            '\x3Cdiv class="section-count"\x3E' + result.failedResponses.length + ' ' + (result.failedResponses.length === 1 ? 'resource' : 'resources') + '\x3C/div\x3E';
        section.appendChild(header);

        var desc = document.createElement('div');
        desc.className = 'section-description';
        desc.textContent = 'Resources that failed to load (HTTP errors)';
        section.appendChild(desc);

        for (var k = 0; k < Math.min(result.failedResponses.length, 20); k++) {
            var resp = result.failedResponses[k];
            var item = document.createElement('div');
            item.className = 'issue-item error';
            item.innerHTML = 
                '\x3Cdiv class="issue-header"\x3E' +
                    '\x3Cdiv class="issue-number"\x3E' + (k + 1) + '.\x3C/div\x3E' +
                    '\x3Cdiv class="issue-title"\x3E' + escapeHtml(resp.url) + ' (HTTP ' + resp.status + ')\x3C/div\x3E' +
                '\x3C/div\x3E';
            section.appendChild(item);
        }

        reportIssuesList.appendChild(section);
    }

    // Success message if no issues
    if (!result.issues || result.issues.length === 0) {
        if ((!result.jsErrors || result.jsErrors.length === 0) && (!result.failedResponses || result.failedResponses.length === 0)) {
            var successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            successDiv.innerHTML = '\x3Ch3\x3E✓ Everything looks good!\x3C/h3\x3E\x3Cp\x3ENo issues found on this page.\x3C/p\x3E';
            reportIssuesList.appendChild(successDiv);
        }
    }
}

function resetToIdle() {
    hideReportView();
    scanAgainButton.style.display = 'none';
    urlInput.value = '';
    urlInput.disabled = false;
    scanBtn.disabled = false;
    stopBtn.style.display = 'none';
    clearBtn.classList.remove('visible');
    monsterContainer.className = 'monster-container';
    progressBar.classList.remove('visible');
    progressFill.style.width = '0%';
    urlInput.focus();
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