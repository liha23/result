// Global state
let sessionId = null;
let resultData = null;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const resultsSection = document.getElementById('resultsSection');
const loginForm = document.getElementById('loginForm');
const captchaImage = document.getElementById('captchaImage');
const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
const loginError = document.getElementById('loginError');
const loadingOverlay = document.getElementById('loadingOverlay');
const backBtn = document.getElementById('backBtn');
const demoBtn = document.getElementById('demoBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCaptcha();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    refreshCaptchaBtn.addEventListener('click', loadCaptcha);
    backBtn.addEventListener('click', backToLogin);
    demoBtn.addEventListener('click', handleDemo);
}

// Load captcha image
async function loadCaptcha() {
    try {
        showLoading();
        const response = await fetch(`/api/captcha?sessionId=${sessionId || ''}`);
        const data = await response.json();
        
        if (data.success) {
            sessionId = data.sessionId;
            captchaImage.src = data.captcha;
        } else {
            showError('Failed to load captcha');
        }
    } catch (error) {
        console.error('Captcha error:', error);
        showError('Failed to load captcha');
    } finally {
        hideLoading();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const enrollmentNo = document.getElementById('enrollmentNo').value;
    const password = document.getElementById('password').value;
    const captcha = document.getElementById('captcha').value;
    
    if (!enrollmentNo || !password || !captcha) {
        showError('Please fill all fields');
        return;
    }
    
    try {
        showLoading();
        hideError();
        
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                enrollmentNo,
                password,
                captcha,
                sessionId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultData = data.data;
            displayResults();
        } else {
            showError(data.error || 'Login failed');
            loadCaptcha(); // Refresh captcha on error
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

// Handle demo mode
async function handleDemo() {
    try {
        showLoading();
        hideError();
        
        const response = await fetch('/api/demo');
        const data = await response.json();
        
        if (data.success) {
            resultData = data.data;
            displayResults();
        } else {
            showError('Failed to load demo data');
        }
    } catch (error) {
        console.error('Demo error:', error);
        showError('Failed to load demo data');
    } finally {
        hideLoading();
    }
}

// Display results
function displayResults() {
    // Hide login, show results
    loginSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    
    // Display student info
    document.getElementById('studentName').textContent = resultData.studentName || 'N/A';
    document.getElementById('studentEnrollment').textContent = resultData.enrollmentNo || 'N/A';
    document.getElementById('studentProgramme').textContent = resultData.programme || 'N/A';
    
    // Display CGPA
    const cgpa = parseFloat(resultData.cgpa);
    document.getElementById('cgpaValue').textContent = cgpa.toFixed(2);
    document.getElementById('totalCredits').textContent = resultData.totalCredits || 0;
    
    // Update CGPA bar
    const cgpaBar = document.getElementById('cgpaBar');
    const cgpaPercentage = (cgpa / 10) * 100;
    cgpaBar.style.width = cgpaPercentage + '%';
    
    // Display semester results
    displaySemesterResults();
    
    // Display charts
    displayCharts();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Display semester results
function displaySemesterResults() {
    const container = document.getElementById('semesterResults');
    container.innerHTML = '';
    
    resultData.semesters.forEach((semester, index) => {
        const semesterCard = document.createElement('div');
        semesterCard.className = 'card semester-card';
        
        const semesterHeader = document.createElement('div');
        semesterHeader.className = 'semester-header';
        semesterHeader.innerHTML = `
            <h3>Semester ${semester.semester}</h3>
            <span class="sgpa-badge">SGPA: ${semester.sgpa}</span>
        `;
        
        const table = document.createElement('table');
        table.className = 'results-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Subject Code</th>
                    <th>Subject Name</th>
                    <th>Internal</th>
                    <th>External</th>
                    <th>Total</th>
                    <th>Credits</th>
                    <th>Grade Point</th>
                </tr>
            </thead>
            <tbody>
                ${semester.subjects.map(subject => `
                    <tr>
                        <td>${subject.code}</td>
                        <td>${subject.name}</td>
                        <td>${subject.internal}</td>
                        <td>${subject.external}</td>
                        <td><strong>${subject.total}</strong></td>
                        <td>${subject.credits}</td>
                        <td>
                            <span class="grade-badge ${getGradeClass(subject.gradePoint)}">
                                ${subject.gradePoint}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        semesterCard.appendChild(semesterHeader);
        semesterCard.appendChild(table);
        container.appendChild(semesterCard);
    });
}

// Get grade class for styling
function getGradeClass(gradePoint) {
    if (gradePoint === 10) return 'grade-o';
    if (gradePoint === 9) return 'grade-a';
    if (gradePoint === 8) return 'grade-b';
    if (gradePoint >= 6) return 'grade-c';
    if (gradePoint >= 4) return 'grade-d';
    return 'grade-f';
}

// Display charts
function displayCharts() {
    displaySGPAChart();
    displaySubjectChart();
}

// Display SGPA chart
function displaySGPAChart() {
    const ctx = document.getElementById('sgpaChart').getContext('2d');
    
    const labels = resultData.semesters.map(sem => `Sem ${sem.semester}`);
    const data = resultData.semesters.map(sem => parseFloat(sem.sgpa));
    
    // Destroy existing chart if any
    if (window.sgpaChart && typeof window.sgpaChart.destroy === 'function') {
        window.sgpaChart.destroy();
    }
    
    window.sgpaChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'SGPA',
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Display subject performance chart
function displaySubjectChart() {
    const ctx = document.getElementById('subjectChart').getContext('2d');
    
    // Get all subjects from all semesters
    const allSubjects = [];
    resultData.semesters.forEach(semester => {
        semester.subjects.forEach(subject => {
            allSubjects.push({
                label: `${subject.code}`,
                value: subject.gradePoint
            });
        });
    });
    
    // Limit to first 10 subjects for better visualization
    const subjects = allSubjects.slice(0, 10);
    const labels = subjects.map(s => s.label);
    const data = subjects.map(s => s.value);
    
    // Destroy existing chart if any
    if (window.subjectChart && typeof window.subjectChart.destroy === 'function') {
        window.subjectChart.destroy();
    }
    
    window.subjectChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Grade Points',
                data: data,
                backgroundColor: 'rgba(118, 75, 162, 0.2)',
                borderColor: 'rgba(118, 75, 162, 1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: 'rgba(118, 75, 162, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Back to login
function backToLogin() {
    resultsSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    
    // Reset form
    loginForm.reset();
    loadCaptcha();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show/hide loading
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// Show/hide error
function showError(message) {
    loginError.textContent = message;
    loginError.classList.add('show');
}

function hideError() {
    loginError.textContent = '';
    loginError.classList.remove('show');
}
