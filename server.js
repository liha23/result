const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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
    return axios.create({
        headers: {
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://examweb.ggsipu.ac.in/web/login.jsp'
        },
        maxRedirects: 5,
        validateStatus: () => true
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
        
        // Then fetch the captcha
        const captchaResponse = await axiosInstance.get(
            'https://examweb.ggsipu.ac.in/web/captcha.jsp',
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
        
        // Submit login form
        const loginResponse = await axiosInstance.post(
            'https://examweb.ggsipu.ac.in/web/studentlogin.do',
            new URLSearchParams({
                enrollmentNo: enrollmentNo,
                password: password,
                captcha: captcha,
                submit: 'Submit'
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        storeCookies(sessionId, loginResponse);
        
        // Check if login was successful
        if (loginResponse.data.includes('Invalid') || loginResponse.data.includes('incorrect')) {
            return res.json({
                success: false,
                error: 'Invalid credentials or captcha'
            });
        }
        
        // Try to fetch result page
        const resultResponse = await axiosInstance.get('https://examweb.ggsipu.ac.in/web/view-result.do');
        storeCookies(sessionId, resultResponse);
        
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

// Helper function to parse result HTML
function parseResultHTML(html) {
    // NOTE: This parser is a placeholder implementation. The actual GGSIPU result page
    // structure needs to be analyzed and proper HTML parsing implemented using libraries
    // like cheerio or jsdom. The current implementation attempts basic regex parsing
    // but may not work with the actual GGSIPU portal structure.
    const result = {
        studentName: '',
        enrollmentNo: '',
        programme: '',
        semesters: []
    };
    
    try {
        // Extract student info
        const nameMatch = html.match(/Student Name[:\s]*([^<\n]+)/i);
        if (nameMatch) result.studentName = nameMatch[1].trim();
        
        const enrolMatch = html.match(/Enrolment No[:\s]*([^<\n]+)/i);
        if (enrolMatch) result.enrollmentNo = enrolMatch[1].trim();
        
        const progMatch = html.match(/Programme[:\s]*([^<\n]+)/i);
        if (progMatch) result.programme = progMatch[1].trim();
        
        // Parse semester data from tables
        // This would need actual HTML parsing based on GGSIPU's result page structure
        // For development, we'll extract what we can
        
        // Look for semester tables
        const semesterPattern = /<table[^>]*>([\s\S]*?)<\/table>/gi;
        let semMatch;
        let semNumber = 1;
        
        while ((semMatch = semesterPattern.exec(html)) !== null) {
            const tableHTML = semMatch[1];
            
            // Look for subject rows
            const subjects = [];
            const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
            let rowMatch;
            
            while ((rowMatch = rowPattern.exec(tableHTML)) !== null) {
                const rowHTML = rowMatch[1];
                const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                const cells = [];
                let cellMatch;
                
                while ((cellMatch = cellPattern.exec(rowHTML)) !== null) {
                    const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
                    cells.push(cellText);
                }
                
                // If row has enough cells and looks like a subject row
                if (cells.length >= 4 && cells[0] && !cells[0].includes('S.No')) {
                    const subjectCode = cells[1] || '';
                    const subjectName = cells[2] || '';
                    const internalMarks = parseInt(cells[3]) || 0;
                    const externalMarks = parseInt(cells[4]) || 0;
                    const totalMarks = internalMarks + externalMarks;
                    
                    if (subjectCode && totalMarks > 0) {
                        subjects.push({
                            code: subjectCode,
                            name: subjectName,
                            internal: internalMarks,
                            external: externalMarks,
                            total: totalMarks
                        });
                    }
                }
            }
            
            if (subjects.length > 0) {
                result.semesters.push({
                    semester: semNumber,
                    subjects: subjects
                });
                semNumber++;
            }
        }
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log(`Demo mode available at: http://localhost:${PORT}/api/demo`);
});
