const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Store session cookies for each user session
// NOTE: In-memory storage will lose data on restart. For production,
// consider using Redis or a database-backed session store.
const sessions = new Map();

// Load credits from CSV file
let creditsMap = {};
function loadCredits() {
    try {
        const csvPath = path.join(__dirname, 'ipu_all_subjects_all_years_all_branches.csv');
        const csvData = fs.readFileSync(csvPath, 'utf8');
        const lines = csvData.split('\n');
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const [code, credits] = line.split(',');
                if (code && credits) {
                    creditsMap[code.trim()] = parseInt(credits.trim());
                }
            }
        }
        console.log(`Loaded ${Object.keys(creditsMap).length} subject credits`);
    } catch (error) {
        console.error('Error loading credits:', error.message);
    }
}

loadCredits();

// Helper function to create axios instance with cookies
function createAxiosInstance(sessionId) {
    const cookies = sessions.get(sessionId) || '';
    
    // SSL certificate validation - configurable via environment variable
    // Only disable in development or if GGSIPU portal has SSL issues
    const rejectUnauthorized = process.env.REJECT_UNAUTHORIZED !== 'false';
    
    return axios.create({
        headers: {
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': 'https://examweb.ggsipu.ac.in/web/login.jsp'
        },
        maxRedirects: 5,
        validateStatus: () => true,
        timeout: 30000,
        httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: rejectUnauthorized
        })
    });
}

// Helper function to extract and store cookies
function storeCookies(sessionId, response) {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
        const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');
        const existingCookies = sessions.get(sessionId) || '';
        sessions.set(sessionId, existingCookies ? `${existingCookies}; ${cookies}` : cookies);
    }
}

// API Routes

// GET /api/captcha - Fetch CAPTCHA image from GGSIPU
app.get('/api/captcha', async (req, res) => {
    try {
        const sessionId = req.query.sessionId || Date.now().toString();
        
        // First, get the login page to establish session
        const axiosInstance = createAxiosInstance(sessionId);
        const loginPageResponse = await axiosInstance.get('https://examweb.ggsipu.ac.in/web/login.jsp');
        storeCookies(sessionId, loginPageResponse);
        
        // Then fetch the captcha from CaptchaServlet
        const captchaResponse = await axiosInstance.get(
            'https://examweb.ggsipu.ac.in/web/CaptchaServlet',
            { responseType: 'arraybuffer' }
        );
        storeCookies(sessionId, captchaResponse);
        
        // Convert image to base64
        const base64Image = Buffer.from(captchaResponse.data, 'binary').toString('base64');
        
        res.json({
            success: true,
            sessionId: sessionId,
            captcha: `data:image/jpeg;base64,${base64Image}`
        });
    } catch (error) {
        console.error('Captcha error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch captcha'
        });
    }
});

// POST /api/login - Handle login and return result data
app.post('/api/login', async (req, res) => {
    try {
        const { enrollmentNo, password, captcha, sessionId } = req.body;
        
        if (!enrollmentNo || !password || !captcha || !sessionId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        const axiosInstance = createAxiosInstance(sessionId);
        
        // Submit login form - try common form field names
        const formData = {
            enrollmentNo: enrollmentNo,
            enrolmentNo: enrollmentNo, // Alternative spelling
            password: password,
            captcha: captcha,
            captchaText: captcha, // Alternative field name
            submit: 'Submit',
            Submit: 'Submit'
        };
        
        const loginResponse = await axiosInstance.post(
            'https://examweb.ggsipu.ac.in/web/studentlogin.do',
            new URLSearchParams(formData).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Origin': 'https://examweb.ggsipu.ac.in',
                    'Referer': 'https://examweb.ggsipu.ac.in/web/login.jsp'
                }
            }
        );
        
        storeCookies(sessionId, loginResponse);
        
        console.log('Login response status:', loginResponse.status);
        console.log('Login response URL:', loginResponse.request?.res?.responseUrl);
        
        // Check if login was successful
        const responseText = loginResponse.data.toLowerCase();
        if (responseText.includes('invalid') || 
            responseText.includes('incorrect') ||
            responseText.includes('wrong') ||
            responseText.includes('failed')) {
            return res.json({
                success: false,
                error: 'Invalid credentials or captcha. Please try again.'
            });
        }
        
        // Try to fetch result page - try multiple possible URLs
        let resultResponse;
        const resultUrls = [
            'https://examweb.ggsipu.ac.in/web/view-result.do',
            'https://examweb.ggsipu.ac.in/web/viewResult.do',
            'https://examweb.ggsipu.ac.in/web/result.do',
            'https://examweb.ggsipu.ac.in/web/viewstudentresult.do'
        ];
        
        for (const url of resultUrls) {
            try {
                resultResponse = await axiosInstance.get(url);
                storeCookies(sessionId, resultResponse);
                
                if (resultResponse.status === 200 && resultResponse.data.includes('table')) {
                    console.log('Successfully fetched results from:', url);
                    break;
                }
            } catch (err) {
                console.log(`Failed to fetch from ${url}:`, err.message);
                continue;
            }
        }
        
        if (!resultResponse || resultResponse.status !== 200) {
            return res.json({
                success: false,
                error: 'Could not fetch result page. Please try again.'
            });
        }
        
        // Parse the result HTML
        const resultData = parseResultHTML(resultResponse.data);
        
        if (!resultData || resultData.semesters.length === 0) {
            return res.json({
                success: false,
                error: 'Could not fetch result data'
            });
        }
        
        // Calculate CGPA/SGPA
        const calculatedResults = calculateGrades(resultData);
        
        res.json({
            success: true,
            data: calculatedResults
        });
        
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Login failed: ' + error.message
        });
    }
});

// Helper function to parse result HTML using cheerio
function parseResultHTML(html) {
    const result = {
        studentName: '',
        enrollmentNo: '',
        programme: '',
        semesters: []
    };
    
    try {
        const $ = cheerio.load(html);
        
        // Extract student information - adjust selectors based on actual GGSIPU HTML structure
        // Common patterns in GGSIPU portal:
        // Look for text containing "Student Name:", "Enrollment No:", etc.
        
        // Method 1: Try to find by label text
        $('td, th, span, div').each(function() {
            const text = $(this).text().trim();
            
            if (text.match(/student\s+name/i)) {
                const nextCell = $(this).next();
                if (nextCell.length) {
                    result.studentName = nextCell.text().trim();
                }
            }
            
            if (text.match(/enrol(l)?ment\s+no/i)) {
                const nextCell = $(this).next();
                if (nextCell.length) {
                    result.enrollmentNo = nextCell.text().trim();
                }
            }
            
            if (text.match(/programme/i)) {
                const nextCell = $(this).next();
                if (nextCell.length) {
                    result.programme = nextCell.text().trim();
                }
            }
        });
        
        // Parse result tables
        // GGSIPU typically has tables with semester results
        let semesterNumber = 1;
        
        $('table').each(function() {
            const table = $(this);
            const subjects = [];
            
            // Look for header row to identify column positions
            let codeCol = -1, nameCol = -1, internalCol = -1, externalCol = -1, totalCol = -1;
            
            table.find('tr').each(function(rowIndex) {
                const row = $(this);
                const cells = row.find('td, th');
                
                // First row might be header
                if (rowIndex === 0) {
                    cells.each(function(colIndex) {
                        const headerText = $(this).text().trim().toLowerCase();
                        
                        if (headerText.includes('code') || headerText.includes('sub') && headerText.includes('no')) {
                            codeCol = colIndex;
                        }
                        if (headerText.includes('subject') && headerText.includes('name')) {
                            nameCol = colIndex;
                        }
                        if (headerText.includes('internal') || headerText.includes('int') || headerText.includes('mid')) {
                            internalCol = colIndex;
                        }
                        if (headerText.includes('external') || headerText.includes('ext') || headerText.includes('end')) {
                            externalCol = colIndex;
                        }
                        if (headerText.includes('total') || headerText.includes('grand')) {
                            totalCol = colIndex;
                        }
                    });
                } else {
                    // Data rows
                    if (cells.length >= 4) {
                        const cellValues = [];
                        cells.each(function() {
                            cellValues.push($(this).text().trim());
                        });
                        
                        // Try to identify subject code (usually pattern like ES-101, ETCS-101, etc.)
                        let subjectCode = '';
                        let subjectName = '';
                        let internal = 0;
                        let external = 0;
                        let total = 0;
                        
                        // If we identified columns from header
                        if (codeCol >= 0 && codeCol < cellValues.length) {
                            subjectCode = cellValues[codeCol];
                        }
                        if (nameCol >= 0 && nameCol < cellValues.length) {
                            subjectName = cellValues[nameCol];
                        }
                        if (internalCol >= 0 && internalCol < cellValues.length) {
                            internal = parseInt(cellValues[internalCol]) || 0;
                        }
                        if (externalCol >= 0 && externalCol < cellValues.length) {
                            external = parseInt(cellValues[externalCol]) || 0;
                        }
                        if (totalCol >= 0 && totalCol < cellValues.length) {
                            total = parseInt(cellValues[totalCol]) || 0;
                        }
                        
                        // Fallback: Try to detect by pattern if columns not identified
                        if (!subjectCode || !subjectName) {
                            for (let i = 0; i < cellValues.length; i++) {
                                const val = cellValues[i];
                                // Subject code pattern: letters-numbers or similar
                                if (val.match(/^[A-Z]{2,4}-?\d{3}$/i)) {
                                    subjectCode = val;
                                    if (i + 1 < cellValues.length) {
                                        subjectName = cellValues[i + 1];
                                    }
                                    break;
                                }
                            }
                        }
                        
                        // If we have at least a code and some marks
                        if (subjectCode && subjectCode.match(/[A-Z]/i)) {
                            // Calculate total if not provided
                            if (!total && (internal || external)) {
                                total = internal + external;
                            }
                            
                            if (total > 0) {
                                subjects.push({
                                    code: subjectCode,
                                    name: subjectName || 'Unknown Subject',
                                    internal: internal,
                                    external: external,
                                    total: total
                                });
                            }
                        }
                    }
                }
            });
            
            // If we found subjects in this table, add as a semester
            if (subjects.length > 0) {
                result.semesters.push({
                    semester: semesterNumber,
                    subjects: subjects
                });
                semesterNumber++;
            }
        });
        
    } catch (error) {
        console.error('Parse error:', error.message);
    }
    
    return result;
}

// Helper function to calculate grade points based on marks
function getGradePoint(marks) {
    if (marks >= 90) return 10;
    if (marks >= 75) return 9;
    if (marks >= 65) return 8;
    if (marks >= 55) return 7;
    if (marks >= 50) return 6;
    if (marks >= 45) return 5;
    if (marks >= 40) return 4;
    return 0;
}

// Helper function to calculate CGPA/SGPA
function calculateGrades(resultData) {
    let totalCredits = 0;
    let totalGradePoints = 0;
    
    resultData.semesters.forEach(semester => {
        let semesterCredits = 0;
        let semesterGradePoints = 0;
        
        semester.subjects.forEach(subject => {
            const gradePoint = getGradePoint(subject.total);
            const credits = creditsMap[subject.code];
            
            // Use default credits if not found in CSV, and log warning
            if (!credits) {
                console.warn(`Subject code ${subject.code} not found in CSV, using default 3 credits`);
                subject.credits = 3;
            } else {
                subject.credits = credits;
            }
            
            subject.gradePoint = gradePoint;
            
            semesterGradePoints += gradePoint * subject.credits;
            semesterCredits += subject.credits;
        });
        
        semester.sgpa = semesterCredits > 0 ? (semesterGradePoints / semesterCredits).toFixed(2) : '0.00';
        semester.totalCredits = semesterCredits;
        
        totalCredits += semesterCredits;
        totalGradePoints += semesterGradePoints;
    });
    
    resultData.cgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
    resultData.totalCredits = totalCredits;
    
    return resultData;
}

// Demo endpoint for testing
app.get('/api/demo', (req, res) => {
    // Return mock result data
    const demoData = {
        studentName: 'VIJAY KUMAR',
        enrollmentNo: '11015603123',
        programme: 'B.Tech - Computer Science & Engineering',
        semesters: [
            {
                semester: 1,
                subjects: [
                    { code: 'ES-101', name: 'Engineering Physics', internal: 23, external: 67, total: 90 },
                    { code: 'ES-102', name: 'Engineering Chemistry', internal: 21, external: 60, total: 81 },
                    { code: 'ES-103', name: 'Mathematics-I', internal: 24, external: 70, total: 94 },
                    { code: 'ES-104', name: 'English', internal: 20, external: 58, total: 78 },
                    { code: 'ES-105', name: 'Engineering Graphics', internal: 18, external: 52, total: 70 }
                ]
            },
            {
                semester: 2,
                subjects: [
                    { code: 'ES-111', name: 'Mathematics-II', internal: 22, external: 65, total: 87 },
                    { code: 'ES-112', name: 'Basic Electronics', internal: 19, external: 55, total: 74 },
                    { code: 'ES-113', name: 'Programming in C', internal: 25, external: 71, total: 96 },
                    { code: 'ES-114', name: 'Environmental Studies', internal: 20, external: 60, total: 80 },
                    { code: 'ES-115', name: 'Workshop Practice', internal: 22, external: 63, total: 85 }
                ]
            },
            {
                semester: 3,
                subjects: [
                    { code: 'ES-121', name: 'Data Structures', internal: 24, external: 68, total: 92 },
                    { code: 'ES-122', name: 'Computer Organization', internal: 21, external: 59, total: 80 },
                    { code: 'ES-123', name: 'Digital Electronics', internal: 23, external: 66, total: 89 },
                    { code: 'ES-124', name: 'Mathematics-III', internal: 22, external: 64, total: 86 },
                    { code: 'ES-125', name: 'Operating Systems', internal: 25, external: 70, total: 95 }
                ]
            },
            {
                semester: 4,
                subjects: [
                    { code: 'ES-131', name: 'Database Management Systems', internal: 23, external: 65, total: 88 },
                    { code: 'ES-132', name: 'Computer Networks', internal: 24, external: 69, total: 93 },
                    { code: 'ES-133', name: 'Software Engineering', internal: 22, external: 62, total: 84 },
                    { code: 'ES-134', name: 'Theory of Computation', internal: 21, external: 58, total: 79 },
                    { code: 'ES-135', name: 'Microprocessors', internal: 20, external: 56, total: 76 }
                ]
            }
        ]
    };
    
    const calculatedResults = calculateGrades(demoData);
    res.json({
        success: true,
        data: calculatedResults
    });
});

// Test endpoint to check GGSIPU portal connectivity
app.get('/api/test-connection', async (req, res) => {
    try {
        const sessionId = Date.now().toString();
        const axiosInstance = createAxiosInstance(sessionId);
        
        console.log('Testing connection to GGSIPU portal...');
        
        const loginPageResponse = await axiosInstance.get('https://examweb.ggsipu.ac.in/web/login.jsp');
        
        res.json({
            success: true,
            status: loginPageResponse.status,
            message: 'Successfully connected to GGSIPU portal',
            hasLoginForm: loginPageResponse.data.includes('login') || loginPageResponse.data.includes('enrol'),
            responseLength: loginPageResponse.data.length
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            message: 'Could not connect to GGSIPU portal. This may be expected in restricted environments.'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Demo mode available at: http://localhost:${PORT}/api/demo`);
    console.log(`Test connection at: http://localhost:${PORT}/api/test-connection`);
});
