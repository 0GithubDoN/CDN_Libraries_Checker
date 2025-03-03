// DOM Elements
const urlInput = document.getElementById('urlInput');
const corsCheck = document.getElementById('corsCheck');
const contentTypeCheck = document.getElementById('contentTypeCheck');
const sslCheck = document.getElementById('sslCheck');
const responseTimeCheck = document.getElementById('responseTimeCheck');
const timeoutRange = document.getElementById('timeoutRange');
const timeoutValue = document.getElementById('timeoutValue');
const resultsContainer = document.getElementById('resultsContainer');
const validateButton = document.getElementById('validateButton');
const clearButton = document.getElementById('clearButton');
const fileUpload = document.getElementById('fileUpload');
const fileList = document.getElementById('fileList');
const exportJson = document.getElementById('exportJson');
const exportCsv = document.getElementById('exportCsv');
const copyAll = document.getElementById('copyAll');
const checkAllBtn = document.getElementById('checkAllBtn');
const processFilesBtn = document.getElementById('processFilesBtn');
const processingResults = document.getElementById('processingResults');

// Tab Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanes = document.querySelectorAll('.tab-pane');

// Constants
const VALID_CONTENT_TYPES = [
    'application/javascript',
    'text/javascript',
    'application/x-javascript',
    'text/css',
];

const CDN_DOMAINS = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'cdn.skypack.dev',
    'cdn.tailwindcss.com',
    'cdn.datatables.net',
    'cdn.plot.ly',
    'cdn.auth0.com',
    'cdn.materialdesignicons.com',
    'cdn.ckeditor.com',
    'cdn.tiny.cloud',
    'cdn.quilljs.com',
    'cdn.rawgit.com',
    'cdn.statically.io',
    'cdn.bootcdn.net',
    'cdn.socket.io',
    'cdn.stripe.com',
    'cdn.segment.com',
    'cdn.shopify.com',
    'cdn.firebase.com',
    'cdn.paddle.com',
    'cdn.plyr.io',
    'cdn.carbonads.com',
    'cdn.polyfill.io'
];

// Store validation results
let validationResults = [];

// Store uploaded files
let uploadedFiles = new Map(); // Map<filename, FileData>

// Tab Handling
const switchTab = (tabId) => {
    tabButtons.forEach(button => {
        if (button.dataset.tab === tabId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    tabPanes.forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
};

// Initialize tab events
tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
});

// Utility Functions
const isValidCdnUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return CDN_DOMAINS.some(domain => urlObj.hostname.includes(domain)) ||
               urlObj.hostname.includes('cdn.') ||
               urlObj.hostname.includes('.cdn.') ||
               urlObj.hostname.includes('-cdn.');
    } catch {
        return false;
    }
};

const extractUrls = (input) => {
    const urlPattern = /(?:src=['"]([^'"]+)['"])|(?:href=['"]([^'"]+)['"])|(?:https?:\/\/[^\s<>"']+)/g;
    const matches = [...input.matchAll(urlPattern)];
    const urls = [...new Set(matches.map(match => match[1] || match[2] || match[0]).filter(Boolean))];
    
    const validUrls = urls.filter(url => {
        if (url.startsWith('./') || url.startsWith('../') || url.startsWith('/') || !url.includes('://')) {
            return false;
        }
        return isValidCdnUrl(url);
    });

    return {
        total: urls.length,
        valid: validUrls.length,
        urls: validUrls
    };
};

// Version checking APIs
const VERSION_APIS = {
    'jsdelivr': {
        getLatestVersion: async (packageName) => {
            try {
                const response = await axios.get(`https://data.jsdelivr.com/v1/package/npm/${packageName}`);
                return response.data.tags.latest;
            } catch (error) {
                return null;
            }
        },
        parseUrl: (url) => {
            // Support for both JS and CSS files
            const npmMatch = url.match(/\/npm\/([@a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)@([0-9.]+)/i);
            if (npmMatch) {
                return { name: npmMatch[1], version: npmMatch[2] };
            }
            
            // Support for CSS files (e.g., @fortawesome/fontawesome-free/css/all.css)
            const cssMatch = url.match(/\/npm\/([@a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)@([0-9.]+).*\.css$/i);
            if (cssMatch) {
                return { name: cssMatch[1], version: cssMatch[2] };
            }
            
            return null;
        },
        updateUrl: (url, newVersion) => {
            return url.replace(/@[\d.]+/, `@${newVersion}`);
        }
    },
    'cdnjs': {
        getLatestVersion: async (packageName) => {
            try {
                const response = await axios.get(`https://api.cdnjs.com/libraries/${packageName}`);
                return response.data.version;
            } catch (error) {
                return null;
            }
        },
        parseUrl: (url) => {
            // Support for both JS and CSS files
            const match = url.match(/\/ajax\/libs\/([a-z0-9-]+)\/([0-9.]+)/i);
            if (match) {
                return { name: match[1], version: match[2] };
            }
            
            // Support for specific file paths
            const fileMatch = url.match(/\/ajax\/libs\/([a-z0-9-]+)\/([0-9.]+)\/(.*?)\.(js|css)$/i);
            if (fileMatch) {
                return { name: fileMatch[1], version: fileMatch[2] };
            }
            
            return null;
        },
        updateUrl: (url, newVersion) => {
            return url.replace(/\/[\d.]+\//, `/${newVersion}/`);
        }
    },
    'unpkg': {
        getLatestVersion: async (packageName) => {
            try {
                const response = await axios.get(`https://unpkg.com/${packageName}/package.json`);
                return response.data.version;
            } catch (error) {
                return null;
            }
        },
        parseUrl: (url) => {
            // Support for both JS and CSS files
            const mainMatch = url.match(/\/([^@]+)@([0-9.]+)/i);
            if (mainMatch) {
                return { name: mainMatch[1], version: mainMatch[2] };
            }
            
            // Support for specific file paths
            const fileMatch = url.match(/\/([^@]+)@([0-9.]+)\/(.*?)\.(js|css)$/i);
            if (fileMatch) {
                return { name: fileMatch[1], version: fileMatch[2] };
            }
            
            return null;
        },
        updateUrl: (url, newVersion) => {
            return url.replace(/@[\d.]+/, `@${newVersion}`);
        }
    },
    'google': {
        getLatestVersion: async (packageName) => {
            // Google CDN doesn't provide a version API
            // We could potentially scrape their CDN directory, but it's not recommended
            return null;
        },
        parseUrl: (url) => {
            const match = url.match(/\/([^\/]+)\/([0-9.]+)\//i);
            return match ? { name: match[1], version: match[2] } : null;
        },
        updateUrl: (url, newVersion) => {
            return url.replace(/\/[\d.]+\//, `/${newVersion}/`);
        }
    },
    'bootstrapcdn': {
        getLatestVersion: async () => {
            try {
                const response = await axios.get('https://api.github.com/repos/twbs/bootstrap/releases/latest');
                return response.data.tag_name.replace('v', '');
            } catch (error) {
                return null;
            }
        },
        parseUrl: (url) => {
            const match = url.match(/\/bootstrap\/([0-9.]+)\//i);
            return match ? { name: 'bootstrap', version: match[1] } : null;
        },
        updateUrl: (url, newVersion) => {
            return url.replace(/\/[\d.]+\//, `/${newVersion}/`);
        }
    }
};

const checkForUpdates = async (url) => {
    try {
        let provider, packageInfo;
        
        // Determine the CDN provider
        if (url.includes('jsdelivr.net')) {
            provider = VERSION_APIS.jsdelivr;
        } else if (url.includes('cdnjs.cloudflare.com')) {
            provider = VERSION_APIS.cdnjs;
        } else if (url.includes('unpkg.com')) {
            provider = VERSION_APIS.unpkg;
        } else if (url.includes('ajax.googleapis.com')) {
            provider = VERSION_APIS.google;
        } else if (url.includes('bootstrapcdn.com')) {
            provider = VERSION_APIS.bootstrapcdn;
        }

        if (provider) {
            packageInfo = provider.parseUrl(url);
            if (packageInfo) {
                const latestVersion = await provider.getLatestVersion(packageInfo.name);
                if (latestVersion && latestVersion !== packageInfo.version) {
                    return {
                        currentVersion: packageInfo.version,
                        latestVersion: latestVersion,
                        updateUrl: provider.updateUrl(url, latestVersion),
                        type: url.toLowerCase().endsWith('.css') ? 'CSS' : 'JavaScript'
                    };
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Error checking for updates:', error);
        return null;
    }
};

// Dark mode functionality
const darkModeToggle = document.getElementById('darkModeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

// Check for saved dark mode preference
if (localStorage.getItem('darkMode') === 'true' || 
    (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
}

// Toggle dark mode
darkModeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    sunIcon.classList.toggle('hidden');
    moonIcon.classList.toggle('hidden');
    
    // Save preference
    localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
});

// Update card styles for dark mode
function createResultCard(url, status, details, responseTime) {
    const card = document.createElement('div');
    card.className = 'card p-4 mb-4 fade-in';
    
    let statusClass = '';
    let statusText = '';
    
    switch(status) {
        case 'success':
            statusClass = 'text-green-500 dark:text-green-400';
            statusText = 'Valid';
            break;
        case 'error':
            statusClass = 'text-red-500 dark:text-red-400';
            statusText = 'Invalid';
            break;
        case 'warning':
            statusClass = 'text-yellow-500 dark:text-yellow-400';
            statusText = 'Warning';
            break;
    }
    
    card.innerHTML = `
        <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">${url}</h3>
            <span class="px-3 py-1 rounded-full text-sm font-medium ${statusClass}">${statusText}</span>
        </div>
        <div class="mt-2 text-gray-600 dark:text-gray-400">${details}</div>
        ${responseTime ? `<div class="mt-2 text-sm text-gray-500 dark:text-gray-500">Response time: ${responseTime}ms</div>` : ''}
    `;
    
    return card;
}

// File Handling Functions
const handleFileUpload = async (files) => {
    for (const file of files) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const urlsInfo = extractUrls(content);
            
            if (urlsInfo.urls.length) {
                uploadedFiles.set(file.name, {
                    content,
                    urls: urlsInfo.urls,
                    file,
                    totalUrls: urlsInfo.total
                });
                
                updateFileList();
                processFilesBtn.disabled = false;
            }
        };
        reader.readAsText(file);
    }
};

const updateFileList = () => {
    fileList.innerHTML = '';
    
    for (const [filename, data] of uploadedFiles) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="ri-file-text-line text-blue-500"></i>
                <div>
                    <div class="font-medium">${filename}</div>
                    <div class="text-sm text-gray-500">
                        Found ${data.urls.length} CDN URLs out of ${data.totalUrls} total URLs
                    </div>
                </div>
            </div>
            <button 
                onclick="removeFile('${filename}')"
                class="text-red-500 hover:text-red-600 transition-colors"
                title="Remove file"
            >
                <i class="ri-delete-bin-line"></i>
            </button>
        `;
        fileList.appendChild(fileItem);
    }
};

const processAndUpdateFiles = async () => {
    processFilesBtn.disabled = true;
    processFilesBtn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Processing...';
    processingResults.innerHTML = '';
    
    let totalUpdates = 0;
    let processedFiles = 0;
    
    for (const [filename, data] of uploadedFiles) {
        let updatedContent = data.content;
        let fileUpdated = false;
        let fileUpdates = 0;
        let updateDetails = [];
        
        const fileProgress = document.createElement('div');
        fileProgress.className = 'mb-4 p-4 bg-gray-50 rounded-lg';
        fileProgress.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="font-medium">${filename}</span>
                <span class="text-blue-600">Processing...</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full transition-all" style="width: 0%"></div>
            </div>
        `;
        processingResults.appendChild(fileProgress);
        
        const progressBar = fileProgress.querySelector('.bg-blue-600');
        const statusText = fileProgress.querySelector('.text-blue-600');
        
        for (let i = 0; i < data.urls.length; i++) {
            const url = data.urls[i];
            const progress = ((i + 1) / data.urls.length) * 100;
            progressBar.style.width = `${progress}%`;
            
            const updateInfo = await checkForUpdates(url);
            if (updateInfo) {
                updatedContent = updatedContent.replace(
                    new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    updateInfo.updateUrl
                );
                fileUpdated = true;
                fileUpdates++;
                totalUpdates++;
                
                // Store update details
                updateDetails.push({
                    url: url,
                    newUrl: updateInfo.updateUrl,
                    currentVersion: updateInfo.currentVersion,
                    latestVersion: updateInfo.latestVersion,
                    type: updateInfo.type
                });
            }
        }
        
        if (fileUpdated) {
            const blob = new Blob([updatedContent], { type: 'text/plain' });
            const downloadUrl = URL.createObjectURL(blob);
            
            // Create update details HTML
            const updateDetailsHtml = updateDetails.map(detail => `
                <div class="mt-2 p-2 bg-blue-50 rounded-lg">
                    <div class="flex items-center gap-2 mb-1">
                        <i class="${detail.type === 'CSS' ? 'ri-css3-fill text-blue-500' : 'ri-javascript-fill text-yellow-500'}"></i>
                        <span class="text-sm font-medium">${detail.type} Update</span>
                    </div>
                    <div class="text-sm text-gray-600 break-all">${detail.url}</div>
                    <div class="flex items-center gap-2 mt-1 text-sm">
                        <span class="text-gray-600">v${detail.currentVersion}</span>
                        <i class="ri-arrow-right-line text-gray-400"></i>
                        <span class="text-blue-600 font-semibold">v${detail.latestVersion}</span>
                    </div>
                </div>
            `).join('');
            
            fileProgress.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <span class="font-medium">${filename}</span>
                    <span class="text-green-600">Updated ${fileUpdates} URLs</span>
                </div>
                <div class="mt-4">
                    <div class="text-sm font-medium text-gray-700 mb-2">Update Details:</div>
                    ${updateDetailsHtml}
                </div>
                <div class="flex justify-end mt-4">
                    <a href="${downloadUrl}" download="updated_${filename}" 
                       class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        <i class="ri-download-line"></i> Download Updated File
                    </a>
                </div>
            `;
        } else {
            fileProgress.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-medium">${filename}</span>
                    <span class="text-gray-600">No updates needed</span>
                </div>
            `;
        }
        
        processedFiles++;
    }
    
    processFilesBtn.disabled = false;
    processFilesBtn.innerHTML = '<i class="ri-code-box-line"></i> Process & Update Files';
    showToast(`Updated ${totalUpdates} URLs in ${processedFiles} files`);
};

// Main Validation Function
const validateUrls = async () => {
    const urlsInfo = extractUrls(urlInput.value);
    if (!urlsInfo.urls.length) {
        showToast('Please enter at least one valid CDN URL');
        return;
    }

    if (urlsInfo.total > urlsInfo.valid) {
        showToast(`Found ${urlsInfo.valid} valid CDN URLs out of ${urlsInfo.total} total URLs`);
    }

    resultsContainer.innerHTML = '';
    validateButton.disabled = true;
    validateButton.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Validating...';
    validationResults = [];

    const timeout = timeoutRange.value * 1000;

    for (const url of urlsInfo.urls) {
        try {
            const startTime = performance.now();
            const response = await axios.get(url, { timeout });
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            let details = ['Resource accessible'];

            if (corsCheck.checked) {
                details.push('CORS enabled');
            }

            if (contentTypeCheck.checked) {
                const contentType = response.headers['content-type'];
                if (VALID_CONTENT_TYPES.some(type => contentType?.includes(type))) {
                    details.push(`Valid content type: ${contentType}`);
                } else {
                    throw new Error(`Invalid content type: ${contentType}`);
                }
            }

            if (sslCheck.checked) {
                if (url.startsWith('https://')) {
                    details.push('SSL verified');
                } else {
                    throw new Error('SSL not enabled');
                }
            }

            resultsContainer.innerHTML += createResultCard(
                url, 
                'success', 
                details.join(' • '),
                responseTimeCheck.checked ? responseTime : null
            );
        } catch (error) {
            resultsContainer.innerHTML += createResultCard(
                url, 
                'error', 
                error.message || 'Failed to access resource'
            );
        }
    }

    validateButton.disabled = false;
    validateButton.innerHTML = '<i class="ri-check-double-line"></i> Validate URLs';
    showToast('Validation complete!');
};

// Toast Notification
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.5s reverse';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

// Export Functions
const exportToJson = () => {
    const blob = new Blob([JSON.stringify(validationResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cdn-validation-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const exportToCsv = () => {
    const headers = ['URL', 'Status', 'Details', 'Response Time', 'Timestamp'];
    const csvContent = [
        headers.join(','),
        ...validationResults.map(result => [
            result.url,
            result.status,
            result.details.replace(/,/g, ';'),
            result.responseTime || '',
            result.timestamp
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cdn-validation-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Event Listeners
validateButton?.addEventListener('click', validateUrls);
clearButton?.addEventListener('click', () => {
    urlInput.value = '';
    resultsContainer.innerHTML = '';
    validationResults = [];
    showToast('Cleared all data');
});

// File Upload Events
fileUpload?.addEventListener('change', (e) => handleFileUpload(e.target.files));
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.target.closest('#fileUpload')) {
        handleFileUpload(e.dataTransfer.files);
    }
});

// Export Events
exportJson?.addEventListener('click', exportToJson);
exportCsv?.addEventListener('click', exportToCsv);
copyAll?.addEventListener('click', () => {
    const text = validationResults
        .map(r => `${r.url} - ${r.status} - ${r.details}`)
        .join('\n');
    navigator.clipboard.writeText(text);
    showToast('Copied all results to clipboard');
});

// Timeout Range Event
timeoutRange?.addEventListener('input', (e) => {
    timeoutValue.textContent = `${e.target.value}s`;
});

// Initialize tooltips and other UI enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Add input animations
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('scale-105');
        });
        input.addEventListener('blur', () => {
            input.parentElement.classList.remove('scale-105');
        });
    });
});

// Global functions for HTML onclick handlers
window.checkUrlUpdate = async (url) => {
    const card = document.querySelector(`[data-url="${url}"]`);
    const updateStatus = card.querySelector('.update-status');
    
    updateStatus.innerHTML = `
        <div class="text-sm text-blue-600">
            <i class="ri-loader-4-line animate-spin"></i> Checking for updates...
        </div>
    `;
    
    const updateInfo = await checkForUpdates(url);
    
    if (updateInfo) {
        updateStatus.innerHTML = `
            <div class="flex items-center justify-between mt-2 p-2 bg-blue-50 rounded-lg">
                <div class="text-sm">
                    <span class="text-gray-600">Current: v${updateInfo.currentVersion}</span>
                    <i class="ri-arrow-right-line mx-2 text-gray-400"></i>
                    <span class="text-blue-600 font-semibold">Latest: v${updateInfo.latestVersion}</span>
                </div>
                <button 
                    onclick="updateUrl('${url}', '${updateInfo.updateUrl}')"
                    class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                    Update
                </button>
            </div>
        `;
    } else {
        updateStatus.innerHTML = `
            <div class="text-sm text-green-600">
                <i class="ri-check-line"></i> Already using the latest version
            </div>
        `;
    }
};

window.updateUrl = (oldUrl, newUrl) => {
    urlInput.value = urlInput.value.replace(oldUrl, newUrl);
    
    const card = document.querySelector(`[data-url="${oldUrl}"]`);
    card.setAttribute('data-url', newUrl);
    const urlDisplay = card.querySelector('.text-gray-600.break-all');
    urlDisplay.textContent = newUrl;
    
    const updateStatus = card.querySelector('.update-status');
    updateStatus.innerHTML = `
        <div class="text-sm text-green-600">
            <i class="ri-check-line"></i> Updated to latest version
        </div>
    `;
    
    showToast('URL updated to latest version');
};

window.removeFile = (filename) => {
    uploadedFiles.delete(filename);
    updateFileList();
    processFilesBtn.disabled = uploadedFiles.size === 0;
};

// Check and update all URLs
const checkAllUrls = async () => {
    const cards = document.querySelectorAll('[data-url]');
    if (!cards.length) {
        showToast('No URLs to check');
        return;
    }

    checkAllBtn.disabled = true;
    checkAllBtn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Checking...';
    
    let updatedCount = 0;
    const totalUrls = cards.length;
    
    for (const card of cards) {
        const url = card.getAttribute('data-url');
        const updateStatus = card.querySelector('.update-status');
        
        updateStatus.innerHTML = `
            <div class="text-sm text-blue-600">
                <i class="ri-loader-4-line animate-spin"></i> Checking for updates...
            </div>
        `;
        
        const updateInfo = await checkForUpdates(url);
        
        if (updateInfo) {
            updateStatus.innerHTML = `
                <div class="flex items-center justify-between mt-2 p-2 bg-blue-50 rounded-lg">
                    <div class="text-sm">
                        <span class="text-gray-600">Current: v${updateInfo.currentVersion}</span>
                        <i class="ri-arrow-right-line mx-2 text-gray-400"></i>
                        <span class="text-blue-600 font-semibold">Latest: v${updateInfo.latestVersion}</span>
                    </div>
                    <button 
                        onclick="updateUrl('${url}', '${updateInfo.updateUrl}')"
                        class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                    >
                        Update
                    </button>
                </div>
            `;
            updatedCount++;
        } else {
            updateStatus.innerHTML = `
                <div class="text-sm text-green-600">
                    <i class="ri-check-line"></i> Already using the latest version
                </div>
            `;
        }
    }
    
    checkAllBtn.disabled = false;
    checkAllBtn.innerHTML = '<i class="ri-refresh-line"></i> Check & Update All';
    showToast(`Found ${updatedCount} updates out of ${totalUrls} URLs`);
};

// Additional Event Listeners
checkAllBtn?.addEventListener('click', checkAllUrls);
processFilesBtn?.addEventListener('click', processAndUpdateFiles); 