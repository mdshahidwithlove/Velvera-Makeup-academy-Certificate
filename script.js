// ==========================================================================
// VELVÉRA MAKEUP ACADEMY - CERTIFICATE GENERATOR ENGINE
// ==========================================================================

// Global state variables
let currentScale = 0.70;
let qrGenerator = null;
let bulkQueue = [];
let studentPhotoData = null; // Stores Base64 string of student avatar

// DOM Elements cache
const els = {
    // Inputs
    studentName: document.getElementById('student-name'),
    courseSelect: document.getElementById('course-select'),
    courseCustom: document.getElementById('course-custom'),
    customCourseGroup: document.getElementById('custom-course-group'),
    certGrade: document.getElementById('cert-grade'),
    certDate: document.getElementById('cert-date'),
    certNumber: document.getElementById('cert-number'),
    toggleISO: document.getElementById('toggle-iso'),
    toggleAccreditation: document.getElementById('toggle-accreditation'),
    director1: document.getElementById('director-1'),
    director2: document.getElementById('director-2'),
    certTheme: document.getElementById('cert-theme'),
    csvRawText: document.getElementById('csv-raw-text'),
    csvFileInput: document.getElementById('csv-file-input'),
    csvZone: document.getElementById('csv-zone'),
    
    // Viewport Cert Elements
    certCard: document.getElementById('certificate-to-print'),
    viewStudentName: document.getElementById('view-student-name'),
    viewCourseName: document.getElementById('view-course-name'),
    viewGradeWrapper: document.getElementById('view-grade-wrapper'),
    viewGrade: document.getElementById('view-grade'),
    viewDate: document.getElementById('view-date'),
    viewId: document.getElementById('view-id'),
    viewSignature1: document.getElementById('view-signature-1'),
    viewDirector1: document.getElementById('view-director-1'),
    stampISO: document.getElementById('stamp-iso'),
    stampAccreditation: document.getElementById('stamp-accreditation'),
    qrCanvas: document.getElementById('qr-canvas'),
    
    // Utilities
    zoomValue: document.getElementById('zoom-value'),
    toastNotif: document.getElementById('toast-notif'),
    toastMessage: document.getElementById('toast-message'),
    
    // Tab containers
    panelSingle: document.getElementById('panel-single'),
    panelBulk: document.getElementById('panel-bulk'),
    tabSingle: document.getElementById('tab-single'),
    tabBulk: document.getElementById('tab-bulk'),
    bulkCount: document.getElementById('bulk-count'),
    bulkTableBody: document.getElementById('bulk-table-body'),
    bulkListSection: document.getElementById('bulk-list-section')
};

// Initialize App directly since script is loaded at the bottom of <body>
// Set default date to today
const today = new Date().toISOString().split('T')[0];
els.certDate.value = today;

// Initialize QR Code generator using qrious library FIRST
qrGenerator = new QRious({
    element: els.qrCanvas,
    size: 150,
    background: '#ffffff',
    foreground: '#000000',
    level: 'H'
});

// Auto-generate starting certificate ID
// This calls updateCertificatePreview() which requires qrGenerator to be initialized
regenerateCertID();

// Setup live form update event listeners
const inputsToSync = [
    els.studentName, els.courseSelect, els.courseCustom,
    els.certGrade, els.certDate, els.certNumber,
    els.director1, els.director2
];

inputsToSync.forEach(input => {
    input.addEventListener('input', updateCertificatePreview);
});

// Setup CSV Drag and Drop
setupDragAndDrop();

// Watch window resize to handle mobile fluid layout
window.addEventListener('resize', () => {
    fitToWidth();
});

// Initial scaling and rendering
fitToWidth();
updateCertificatePreview();

// Toggle visibility of Custom Course Name input
function toggleCustomCourse() {
    if (els.courseSelect.value === 'CUSTOM') {
        els.customCourseGroup.style.display = 'flex';
    } else {
        els.customCourseGroup.style.display = 'none';
    }
    updateCertificatePreview();
}

// Generate a random high-quality Certificate ID
function regenerateCertID() {
    const prefix = 'VMA';
    const dateObj = new Date(els.certDate.value || new Date());
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString(10);
    
    const generatedID = `${prefix}-${year}${month}${day}-${randomHex}`;
    els.certNumber.value = generatedID;
    updateCertificatePreview();
}

// Update the certificate preview canvas in real-time
function updateCertificatePreview() {
    // Sync Student Name
    els.viewStudentName.textContent = els.studentName.value.trim() || 'THEEPIREDDY LASYA REDDY';
    
    // Sync Course Name
    if (els.courseSelect.value === 'CUSTOM') {
        els.viewCourseName.textContent = els.courseCustom.value.trim() || 'Advanced Course Title';
    } else {
        els.viewCourseName.textContent = els.courseSelect.value;
    }
    
    // Sync Grade (Hide if blank)
    const grade = els.certGrade.value.trim();
    if (grade) {
        els.viewGrade.textContent = grade;
        els.viewGradeWrapper.style.display = 'block';
    } else {
        els.viewGradeWrapper.style.display = 'none';
    }
    
    // Format and Sync Issue Date
    const rawDate = els.certDate.value;
    if (rawDate) {
        // Special match for framed June 2024 date
        const dateObj = new Date(rawDate);
        const monthOptions = { month: 'long' };
        const formattedMonth = dateObj.toLocaleDateString('en-US', monthOptions).toUpperCase();
        const formattedYear = dateObj.getFullYear();
        els.viewDate.textContent = `${formattedMonth}, ${formattedYear}`;
    } else {
        els.viewDate.textContent = 'JUNE, 2024';
    }
    
    // Sync Certificate ID
    const certID = els.certNumber.value.trim() || 'VMA-XXXX-XXXX';
    els.viewId.textContent = certID;
    
    // Sync Signatures & Titles
    els.viewSignature1.textContent = els.director1.value.trim() || 'Lasya Reddy';
    els.viewDirector1.textContent = els.director2.value.trim() || 'Founder & Master Educator';
    
    // Toggles
    els.stampISO.style.display = els.toggleISO.checked ? 'flex' : 'none';
    els.stampAccreditation.style.display = els.toggleAccreditation.checked ? 'flex' : 'none';
    
    // Generate a clean, professional verification URL using the actual domain.
    // Encodes certificate data into URL parameters so mobile scanners can verify statelessly.
    const nParam = encodeURIComponent(els.viewStudentName.textContent);
    const cParam = encodeURIComponent(els.viewCourseName.textContent);
    const dParam = encodeURIComponent(els.certDate.value);
    
    // Automatically use the deployed Vercel domain or fallback if opened locally
    let baseUrl = window.location.origin;
    if (!baseUrl || baseUrl === 'null' || baseUrl.includes('file://')) {
        baseUrl = 'https://velverabeautysalon.com';
    }
    // Remove trailing slash if exists
    baseUrl = baseUrl.replace(/\/$/, '');
    
    const verificationLink = `${baseUrl}/verify.html?id=${encodeURIComponent(certID)}&n=${nParam}&c=${cParam}&d=${dParam}`;

    // Force dark charcoal QR code for maximum contrast on white background
    qrGenerator.set({
        background: '#ffffff',
        foreground: '#000000',
        value: verificationLink
    });
}

// Switch between Single mode and Bulk mode
function switchTab(mode) {
    if (mode === 'single') {
        els.tabSingle.classList.add('active');
        els.tabBulk.classList.remove('active');
        els.panelSingle.style.display = 'flex';
        els.panelBulk.style.display = 'none';
    } else {
        els.tabSingle.classList.remove('active');
        els.tabBulk.classList.add('active');
        els.panelSingle.style.display = 'none';
        els.panelBulk.style.display = 'flex';
    }
}

// Wizard Step Navigation
function goToStep(stepNumber) {
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
        const stepPane = document.getElementById(`wizard-step-${i}`);
        if (stepPane) stepPane.style.display = 'none';
        
        const dot = document.getElementById(`step-dot-${i}`);
        if (dot) dot.classList.remove('active');
    }
    
    // Show current step
    const activePane = document.getElementById(`wizard-step-${stepNumber}`);
    if (activePane) activePane.style.display = 'block';
    
    // Light up dots up to current step
    for (let i = 1; i <= stepNumber; i++) {
        const dot = document.getElementById(`step-dot-${i}`);
        if (dot) dot.classList.add('active');
    }
}

// Apply theme changes to the preview certificate container
function changeTheme() {
    els.certCard.className = `certificate-container theme-${els.certTheme.value}`;
    
    // Auto-update SVG corner colors dynamically
    updateCornerImages();

    updateCertificatePreview();
}

// Zoom adjust functions for desktop viewport fitting
function applyZoom() {
    els.certCard.style.transform = `scale(${currentScale})`;
    els.zoomValue.textContent = `Zoom: ${Math.round(currentScale * 100)}%`;
    
    // Dynamically adjust wrapper height to avoid large vertical whitespaces on mobile/scaled screens
    const scaledHeight = 794 * currentScale;
    const container = document.querySelector('.certificate-scaler-container');
    if (container) {
        container.style.height = `${scaledHeight}px`;
    }
}

function adjustZoom(factor) {
    currentScale = Math.max(0.15, Math.min(1.2, currentScale + factor));
    applyZoom();
}

function fitToWidth() {
    const workspace = document.querySelector('.preview-workspace');
    if (!workspace) return;
    const workspaceWidth = workspace.clientWidth - 32; // Padding buffer
    currentScale = workspaceWidth / 1123;
    currentScale = Math.max(0.15, Math.min(1.0, currentScale)); // Support down to 15% zoom for small mobile screens
    applyZoom();
}

// Handle window resize for zooming
window.addEventListener('resize', fitToWidth);

// ==========================================
// 100% Bulletproof Fix for html2canvas SVGs
// ==========================================
const CORNER_PATHS = {
    tl: `<path d="M 5 5 C 40 5, 70 15, 95 50 C 85 30, 60 15, 30 20 C 20 50, 10 70, 5 95 C 10 60, 5 30, 5 5" fill="COLOR" opacity="0.6"/><path d="M 15 15 C 35 15, 60 25, 75 55 C 65 35, 45 25, 25 30 C 20 50, 10 65, 15 85 C 20 60, 15 35, 15 15" fill="none" stroke="COLOR" stroke-width="1"/><circle cx="45" cy="45" r="1.5" fill="COLOR"/><circle cx="60" cy="30" r="1" fill="COLOR"/><circle cx="30" cy="60" r="1" fill="COLOR"/>`,
    tr: `<path d="M 95 5 C 60 5, 30 15, 5 50 C 15 30, 40 15, 70 20 C 80 50, 90 70, 95 95 C 90 60, 95 30, 95 5" fill="COLOR" opacity="0.6"/><path d="M 85 15 C 65 15, 40 25, 25 55 C 35 35, 55 25, 75 30 C 80 50, 90 65, 85 85 C 80 60, 85 35, 85 15" fill="none" stroke="COLOR" stroke-width="1"/><circle cx="55" cy="45" r="1.5" fill="COLOR"/><circle cx="40" cy="30" r="1" fill="COLOR"/><circle cx="70" cy="60" r="1" fill="COLOR"/>`,
    bl: `<path d="M 5 95 C 40 95, 70 85, 95 50 C 85 70, 60 85, 30 80 C 20 50, 10 30, 5 5 C 10 40, 5 70, 5 95" fill="COLOR" opacity="0.6"/><path d="M 15 85 C 35 85, 60 75, 75 45 C 65 65, 45 75, 25 70 C 20 50, 10 35, 15 15 C 20 40, 15 65, 15 85" fill="none" stroke="COLOR" stroke-width="1"/><circle cx="45" cy="55" r="1.5" fill="COLOR"/><circle cx="60" cy="70" r="1" fill="COLOR"/><circle cx="30" cy="40" r="1" fill="COLOR"/>`,
    br: `<path d="M 95 95 C 60 95, 30 85, 5 50 C 15 70, 40 85, 70 80 C 80 50, 90 30, 95 5 C 90 40, 95 70, 95 95" fill="COLOR" opacity="0.6"/><path d="M 85 85 C 65 85, 40 75, 25 45 C 35 65, 55 75, 75 70 C 80 50, 90 35, 85 15 C 80 40, 85 65, 85 85" fill="none" stroke="COLOR" stroke-width="1"/><circle cx="55" cy="55" r="1.5" fill="COLOR"/><circle cx="40" cy="70" r="1" fill="COLOR"/><circle cx="70" cy="40" r="1" fill="COLOR"/>`
};

function updateCornerImages() {
    // Wait for a brief moment for CSS variables to apply from the new theme class
    setTimeout(() => {
        const computedStyle = getComputedStyle(els.certCard);
        const goldColor = computedStyle.getPropertyValue('--gold-solid').trim() || '#8b6508';
        
        ['tl', 'tr', 'bl', 'br'].forEach(pos => {
            const img = document.getElementById(`corner-${pos}`);
            if (img) {
                const svgStr = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${CORNER_PATHS[pos].replace(/COLOR/g, goldColor)}</svg>`;
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
            }
        });
    }, 10);
}

// Initial draw of SVG images
updateCornerImages();

// Watch window resize to fit canvas
window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) {
        fitToWidth();
    }
});

// Toast notification helper
function showToast(message) {
    els.toastMessage.textContent = message;
    els.toastNotif.classList.add('show');
    setTimeout(() => {
        els.toastNotif.classList.remove('show');
    }, 4000);
}

// Save certificate data to Local Storage Mock database
function saveCertificate(certData) {
    const dbKey = 'vma_certificates';
    let db = [];
    
    try {
        const stored = localStorage.getItem(dbKey);
        if (stored) {
            db = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to read database, creating fresh.", e);
    }
    
    // Check if certificate with matching ID already exists, update it or push new
    const existingIndex = db.findIndex(item => item.id === certData.id);
    if (existingIndex !== -1) {
        db[existingIndex] = certData;
    } else {
        db.push(certData);
    }
    
    localStorage.setItem(dbKey, JSON.stringify(db));
}

// Action: Generate and Save Current Single Form to Database
function generateAndSave() {
    const certID = els.certNumber.value.trim();
    const student = els.studentName.value.trim();
    
    if (!student) {
        showToast("Please enter a student name first!");
        return;
    }
    
    const course = els.courseSelect.value === 'CUSTOM' ? els.courseCustom.value.trim() : els.courseSelect.value;
    
    const certObj = {
        id: certID,
        name: student,
        course: course,
        grade: els.certGrade.value.trim() || 'Completed',
        date: els.certDate.value,
        director1: els.director1.value.trim(),
        director2: els.director2.value.trim(),
        theme: els.certTheme.value,
        iso: els.toggleISO.checked,
        accreditation: els.toggleAccreditation.checked,
        photo: studentPhotoData, // Store photo Base64 data string in record
        created_at: new Date().toISOString()
    };
    
    saveCertificate(certObj);
    showToast(`Certificate ${certID} for ${student} saved successfully!`);
}

// Action: Export as High-Resolution PDF
function exportAsPDF() {
    const certID = els.certNumber.value.trim();
    const student = els.studentName.value.trim() || 'student';
    
    // Configuration options for html2pdf
    const opt = {
        margin:       0,
        filename:     `Velvera_Certificate_${certID}_${student.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { 
            scale: 5, // Extremely high resolution scale for crisp text
            useCORS: true, 
            letterRendering: true,
            scrollY: 0,
            scrollX: 0,
            backgroundColor: els.certTheme.value === 'dark' ? '#111115' : '#faf9f6',
            onclone: function(clonedDoc) {
                // Safely modify the virtual cloned document for perfect rendering without affecting the live UI
                const clonedCard = clonedDoc.getElementById('certificate-to-print');
                if (clonedCard) {
                    clonedCard.style.transform = 'scale(1)';
                    clonedCard.style.margin = '0';
                    clonedCard.style.position = 'absolute';
                    clonedCard.style.top = '0';
                    clonedCard.style.left = '0';
                    
                    // Fix SVG html2canvas bugs by replacing currentColor/CSS-vars with explicit hex codes
                    const computedStyle = getComputedStyle(els.certCard);
                    const goldColor = computedStyle.getPropertyValue('--gold-solid').trim() || '#8b6508';
                    
                    const svgs = clonedCard.querySelectorAll('svg path, svg circle');
                    svgs.forEach(node => {
                        if (node.getAttribute('fill') === 'currentColor') node.setAttribute('fill', goldColor);
                        if (node.getAttribute('stroke') === 'currentColor') node.setAttribute('stroke', goldColor);
                    });
                    
                    const stamps = clonedCard.querySelectorAll('.stamp-icon');
                    stamps.forEach(stamp => {
                        stamp.style.fill = goldColor;
                    });
                }
                const clonedApp = clonedDoc.querySelector('.app-container');
                const clonedPreview = clonedDoc.querySelector('.preview-workspace');
                if (clonedApp) clonedApp.style.overflow = 'visible';
                if (clonedPreview) clonedPreview.style.overflow = 'visible';
            }
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    showToast("Generating PDF, please wait...");
    
    // CRITICAL FIX: Reset scaling on original element before capturing so bounding box isn't clipped
    const originalTransform = els.certCard.style.transform;
    els.certCard.style.transform = 'scale(1)';
    
    // Run HTML to PDF conversion
    html2pdf().set(opt).from(els.certCard).save().then(() => {
        els.certCard.style.transform = originalTransform;
        showToast("PDF Certificate downloaded successfully!");
        generateAndSave();
    }).catch(err => {
        els.certCard.style.transform = originalTransform;
        console.error("PDF generation failed", err);
        showToast("Error generating PDF. Try again.");
    });
}

// Action: Export as High-Resolution PNG
function exportAsPNG() {
    const certID = els.certNumber.value.trim();
    const student = els.studentName.value.trim() || 'student';
    
    showToast("Generating PNG, please wait...");
    
    // CRITICAL FIX: Reset scaling on original element before capturing
    const originalTransform = els.certCard.style.transform;
    els.certCard.style.transform = 'scale(1)';
    
    html2canvas(els.certCard, {
        scale: 4,
        useCORS: true,
        scrollY: 0,
        scrollX: 0,
        backgroundColor: els.certTheme.value === 'dark' ? '#111115' : '#faf9f6',
        onclone: function(clonedDoc) {
            const clonedCard = clonedDoc.getElementById('certificate-to-print');
            if (clonedCard) {
                clonedCard.style.transform = 'scale(1)';
                clonedCard.style.margin = '0';
                clonedCard.style.position = 'absolute';
                clonedCard.style.top = '0';
                clonedCard.style.left = '0';
                
                // Fix SVG html2canvas bugs by replacing currentColor/CSS-vars with explicit hex codes
                const computedStyle = getComputedStyle(els.certCard);
                const goldColor = computedStyle.getPropertyValue('--gold-solid').trim() || '#8b6508';
                
                const svgs = clonedCard.querySelectorAll('svg path, svg circle');
                svgs.forEach(node => {
                    if (node.getAttribute('fill') === 'currentColor') node.setAttribute('fill', goldColor);
                    if (node.getAttribute('stroke') === 'currentColor') node.setAttribute('stroke', goldColor);
                });
                
                const stamps = clonedCard.querySelectorAll('.stamp-icon');
                stamps.forEach(stamp => {
                    stamp.style.fill = goldColor;
                });
            }
            const clonedApp = clonedDoc.querySelector('.app-container');
            const clonedPreview = clonedDoc.querySelector('.preview-workspace');
            if (clonedApp) clonedApp.style.overflow = 'visible';
            if (clonedPreview) clonedPreview.style.overflow = 'visible';
        }
    }).then(canvas => {
        els.certCard.style.transform = originalTransform;
        
        const link = document.createElement('a');
        link.download = `Velvera_Certificate_${certID}_${student.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        showToast("PNG Certificate exported successfully!");
        generateAndSave();
    }).catch(err => {
        els.certCard.style.transform = originalTransform;
        console.error("PNG export failed", err);
        showToast("Error exporting PNG image.");
    });
}

// Open and test the public verification portal directly
function testVerificationPage() {
    const certID = els.certNumber.value.trim();
    
    // Save to database first to ensure it's verifiable
    generateAndSave();
    
    // Open verification page with parameter
    window.open(`verify.html?id=${encodeURIComponent(certID)}`, '_blank');
}


// ==========================================================================
// BULK BATCH GENERATION LOGIC
// ==========================================================================

function setupDragAndDrop() {
    const zone = els.csvZone;
    
    ['dragenter', 'dragover'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        zone.addEventListener(eventName, (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
        }, false);
    });
    
    zone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleCSVFile(files[0]);
        }
    }, false);
}

function triggerCSVFileInput() {
    els.csvFileInput.click();
}

function handleCSVFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        handleCSVFile(files[0]);
    }
}

function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        els.csvRawText.value = e.target.result;
        showToast(`Loaded ${file.name} successfully! Click Parse to load.`);
    };
    reader.readAsText(file);
}

// Parse comma separated bulk text
function parseRawCSV() {
    const text = els.csvRawText.value.trim();
    if (!text) {
        showToast("Please paste student text or drag a CSV file first!");
        return;
    }
    
    const lines = text.split('\n');
    bulkQueue = [];
    els.bulkTableBody.innerHTML = '';
    
    let count = 0;
    lines.forEach((line) => {
        if (!line.trim()) return;
        
        // Parse CSV fields: Name, Course, Grade, Date
        const columns = line.split(',');
        const name = columns[0] ? columns[0].trim() : '';
        const course = columns[1] ? columns[1].trim() : 'Professional Bridal Makeup Masterclass';
        const grade = columns[2] ? columns[2].trim() : 'Grade A+';
        const date = columns[3] ? columns[3].trim() : els.certDate.value;
        
        if (name) {
            count++;
            const studentObj = {
                id: `VMA-B${count}-${Date.now().toString().slice(-4)}`,
                name: name,
                course: course,
                grade: grade,
                date: date
            };
            bulkQueue.push(studentObj);
            
            // Append row to queue table
            const tr = document.createElement('tr');
            tr.id = `bulk-row-${count}`;
            tr.innerHTML = `
                <td><strong>${name}</strong></td>
                <td>${course}</td>
                <td>${grade}</td>
                <td><span class="bulk-status pending" id="bulk-status-${count}">Pending</span></td>
            `;
            els.bulkTableBody.appendChild(tr);
        }
    });
    
    if (bulkQueue.length > 0) {
        els.bulkCount.textContent = bulkQueue.length;
        els.bulkListSection.style.display = 'flex';
        showToast(`Parsed ${bulkQueue.length} student records successfully!`);
    } else {
        els.bulkListSection.style.display = 'none';
        showToast("No valid rows found. Format must be: Name, Course, Grade, Date");
    }
}

// Clear the parsed bulk list
function clearBulkQueue() {
    bulkQueue = [];
    els.bulkTableBody.innerHTML = '';
    els.bulkListSection.style.display = 'none';
    els.csvRawText.value = '';
    showToast("Bulk queue cleared.");
}

// Process bulk certificates queue sequentially to prevent browser download locks
async function processBulkCertificates() {
    if (bulkQueue.length === 0) {
        showToast("No students in queue!");
        return;
    }
    
    showToast(`Starting batch generation of ${bulkQueue.length} certificates. Please do not close this tab...`);
    
    // Save original forms state to restore afterwards
    const origName = els.studentName.value;
    const origCourseSel = els.courseSelect.value;
    const origCourseCust = els.courseCustom.value;
    const origGrade = els.certGrade.value;
    const origDate = els.certDate.value;
    const origNumber = els.certNumber.value;
    
    // Set custom course active so preview text updates correctly
    els.courseSelect.value = 'CUSTOM';
    
    // Process each student asynchronously
    for (let i = 0; i < bulkQueue.length; i++) {
        const student = bulkQueue[i];
        const index = i + 1;
        const statusSpan = document.getElementById(`bulk-status-${index}`);
        
        statusSpan.className = "bulk-status pending";
        statusSpan.textContent = "Generating...";
        statusSpan.style.background = "rgba(59, 130, 246, 0.15)";
        statusSpan.style.color = "#3b82f6";
        
        // Generate a real Certificate ID
        const dateObj = new Date(student.date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const uniqueID = `VMA-${year}${month}${day}-B${String(index).padStart(2, '0')}${Math.floor(100 + Math.random() * 900)}`;
        
        // Load into state inputs for live preview render capture
        els.studentName.value = student.name;
        els.courseCustom.value = student.course;
        els.certGrade.value = student.grade;
        els.certDate.value = student.date;
        els.certNumber.value = uniqueID;
        
        // Refresh preview frame DOM elements
        updateCertificatePreview();
        
        // Save student record to validation database
        const certObj = {
            id: uniqueID,
            name: student.name,
            course: student.course,
            grade: student.grade,
            date: student.date,
            director1: els.director1.value.trim(),
            director2: els.director2.value.trim(),
            theme: els.certTheme.value,
            iso: els.toggleISO.checked,
            accreditation: els.toggleAccreditation.checked,
            created_at: new Date().toISOString()
        };
        saveCertificate(certObj);
        
        // PDF Export config
        const originalTransform = els.certCard.style.transform;
        els.certCard.style.transform = 'scale(1)';
        
        const opt = {
            margin:       0,
            filename:     `Velvera_Cert_${uniqueID}_${student.name.replace(/\s+/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { scale: 4, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };
        
        // Wait for PDF to generate and download
        await new Promise((resolve) => {
            html2pdf().set(opt).from(els.certCard).save().then(() => {
                els.certCard.style.transform = originalTransform;
                
                statusSpan.className = "bulk-status done";
                statusSpan.textContent = "Done";
                statusSpan.style.background = "rgba(16, 185, 129, 0.15)";
                statusSpan.style.color = "#10b981";
                
                resolve();
            }).catch(err => {
                console.error("PDF generation failed in batch", err);
                els.certCard.style.transform = originalTransform;
                statusSpan.className = "bulk-status pending";
                statusSpan.textContent = "Failed";
                statusSpan.style.background = "rgba(239, 68, 68, 0.15)";
                statusSpan.style.color = "#ef4444";
                resolve(); // resolve anyway to continue batch run
            });
        });
        
        // Cool down pause of 1.2s to let browser handle physical downloads safely
        await new Promise(r => setTimeout(r, 1200));
    }
    
    // Restore initial state to Single Form view
    els.studentName.value = origName;
    els.courseSelect.value = origCourseSel;
    els.courseCustom.value = origCourseCust;
    els.certGrade.value = origGrade;
    els.certDate.value = origDate;
    els.certNumber.value = origNumber;
    toggleCustomCourse();
    updateCertificatePreview();
    
    showToast("Batch generation completed successfully!");
}

// Handle student photo upload and load as base64 string
function handleStudentPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if it is an image
    if (!file.type.startsWith('image/')) {
        showToast("Please upload a valid image file!");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        studentPhotoData = e.target.result;
        
        // Auto-enable layout switch for convenience when photo is uploaded
        const photoToggle = document.getElementById('toggle-photo-layout');
        if (photoToggle) photoToggle.checked = true;
        
        updateCertificatePreview();
        showToast("Student photograph uploaded successfully!");
    };
    reader.readAsDataURL(file);
}

// Clear the student photo and restore default silhouette
function clearStudentPhoto() {
    studentPhotoData = null;
    const input = document.getElementById('student-photo-input');
    if (input) input.value = '';
    
    // Auto-disable layout switch when photo is removed
    const photoToggle = document.getElementById('toggle-photo-layout');
    if (photoToggle) photoToggle.checked = false;
    
    updateCertificatePreview();
    showToast("Student photograph removed.");
}
