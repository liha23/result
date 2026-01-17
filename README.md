# GGSIPU Result Viewer

A full-stack web application that acts as a wrapper/proxy to fetch student results from the **official GGSIPU portal** (https://examweb.ggsipu.ac.in/web/login.jsp) and calculate CGPA/SGPA with visualizations.

## Features

- **Real GGSIPU Portal Integration**: Directly fetches results from the official GGSIPU examination portal
- **CAPTCHA Handling**: Fetches and displays actual CAPTCHA from GGSIPU portal
- **Session Management**: Maintains session cookies for authenticated requests
- **Smart HTML Parsing**: Uses Cheerio to intelligently parse result tables from GGSIPU's HTML structure
- **CGPA/SGPA Calculation**: Automatically calculates semester-wise SGPA and overall CGPA
- **Credit System**: Uses official IPU subject credits from CSV database (13,200+ subjects)
- **Visualizations**: 
  - Semester-wise SGPA bar chart
  - Subject-wise performance line chart
  - CGPA indicator with visual progress bar
- **Detailed Results**: Shows internal and external marks separately for each subject
- **Responsive Design**: Mobile-friendly UI with modern styling
- **Demo Mode**: Test the interface without connecting to GGSIPU portal

## Tech Stack

- **Backend**: Node.js + Express.js
- **HTML Parsing**: Cheerio (for parsing GGSIPU result pages)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js
- **HTTP Client**: Axios (with cookie management for session handling)

## Project Structure

```
/
├── server.js                                          # Express backend server with GGSIPU integration
├── package.json                                       # Node.js dependencies
├── ipu_all_subjects_all_years_all_branches.csv       # Subject credits database
├── public/                                            # Frontend files
│   ├── index.html                                    # Main HTML file
│   ├── css/
│   │   └── style.css                                 # Styling
│   └── js/
│       └── app.js                                    # Frontend JavaScript
└── README.md                                          # This file
```

## Grading Scheme

The application uses the following grading scheme:

| Marks Range | Grade Point |
|-------------|-------------|
| 90-100      | 10          |
| 75-89       | 9           |
| 65-74       | 8           |
| 55-64       | 7           |
| 50-54       | 6           |
| 45-49       | 5           |
| 40-44       | 4           |
| Below 40    | 0           |

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd result
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## Usage

### Testing with Demo Mode
1. **Open the application** in your web browser
2. **Click "View Demo Results"** button to see the interface with sample data
3. View demo student results with calculated CGPA/SGPA

### Using with Real GGSIPU Credentials
1. **Open the application** in your web browser
2. **Wait for CAPTCHA to load** from GGSIPU portal (or click refresh icon)
3. **Enter your GGSIPU credentials**:
   - Enrollment Number (e.g., 11015603123)
   - Password (e.g., VIJAY KUMAR)
   - CAPTCHA text (as shown in the image)
4. **Click "Login & Fetch Results"**
5. **View your results** with:
   - Student information from GGSIPU portal
   - Overall CGPA (calculated)
   - Semester-wise SGPA (calculated)
   - Subject-wise marks (internal + external from portal)
   - Visual charts and graphs

### Example Test Credentials
For development/testing purposes:
```
Enrollment Number: 11015603123
Password: VIJAY KUMAR
CAPTCHA: [Enter the text shown in CAPTCHA image]
```

**Note**: CAPTCHA must be entered correctly each time as it changes with every request.

## API Endpoints

### GET /api/captcha
Fetches CAPTCHA image directly from the GGSIPU portal (https://examweb.ggsipu.ac.in/web/captcha.jsp) and returns it as base64. Establishes and maintains session cookies for subsequent requests.

**Query Parameters:**
- `sessionId` (optional): Existing session ID, or a new one will be generated

**Response:**
```json
{
  "success": true,
  "sessionId": "1234567890",
  "captcha": "data:image/jpeg;base64,..."
}
```

### POST /api/login
Authenticates user with GGSIPU portal, fetches complete result data, parses HTML using Cheerio, and calculates CGPA/SGPA.

**Process:**
1. Submits login form to `https://examweb.ggsipu.ac.in/web/studentlogin.do`
2. Maintains session cookies
3. Fetches result page from GGSIPU
4. Parses HTML tables to extract marks
5. Maps subject codes to credits from CSV
6. Calculates grade points and CGPA/SGPA

**Request Body:**
```json
{
  "enrollmentNo": "11015603123",
  "password": "password",
  "captcha": "ABC123",
  "sessionId": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "studentName": "Student Name",
    "enrollmentNo": "11015603123",
    "programme": "B.Tech CSE",
    "cgpa": "8.75",
    "totalCredits": 120,
    "semesters": [
      {
        "semester": 1,
        "sgpa": "8.50",
        "subjects": [...]
      }
    ]
  }
}
```

### GET /api/demo
Returns mock result data for testing the interface without connecting to GGSIPU portal.

**Response:**
```json
{
  "success": true,
  "data": {
    "studentName": "VIJAY KUMAR",
    "enrollmentNo": "11015603123",
    "programme": "B.Tech - Computer Science & Engineering",
    "cgpa": "9.25",
    "totalCredits": 59,
    "semesters": [...]
  }
}
```

### GET /api/test-connection
Tests connectivity to the GGSIPU portal. Useful for debugging deployment issues.

**Response:**
```json
{
  "success": true,
  "status": 200,
  "message": "Successfully connected to GGSIPU portal",
  "hasLoginForm": true,
  "responseLength": 5432
}
```

## How It Works

### 1. CAPTCHA Fetching
- Backend connects to `https://examweb.ggsipu.ac.in/web/login.jsp`
- Establishes session with GGSIPU portal
- Fetches CAPTCHA from `https://examweb.ggsipu.ac.in/web/captcha.jsp`
- Returns CAPTCHA as base64 image to frontend
- Maintains session ID for subsequent requests

### 2. Authentication & Result Fetching
- Submits login credentials to GGSIPU portal with session cookies
- Multiple form field names tried for compatibility
- Checks response for error messages
- Tries multiple result page URLs to find the correct one
- Downloads complete result HTML

### 3. HTML Parsing
- Uses Cheerio library for robust HTML parsing
- Intelligently identifies table headers (Subject Code, Name, Internal, External, Total)
- Extracts student information from various possible locations
- Parses each semester's result table
- Handles different table structures and formats

### 4. Grade Calculation
- Maps subject codes to credits from CSV database
- Calculates grade points based on total marks
- Computes SGPA for each semester
- Computes overall CGPA across all semesters

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to complete deployment

### Deploy to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Railway will automatically detect Node.js and deploy
4. Set environment variable if needed: `PORT=3000`

### Deploy to Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Deploy

### Deploy to Heroku

1. Install Heroku CLI
2. Login:
   ```bash
   heroku login
   ```

3. Create app:
   ```bash
   heroku create your-app-name
   ```

4. Deploy:
   ```bash
   git push heroku main
   ```

## Environment Variables

The application uses the following environment variable:

- `PORT` - Server port (default: 3000)

You can set this in a `.env` file for local development:
```
PORT=3000
```

## CGPA/SGPA Calculation

### SGPA Calculation
**SGPA** (Semester Grade Point Average) for each semester:
```
SGPA = Σ(Grade Points × Credits) / Σ(Credits)
```

### CGPA Calculation
**CGPA** (Cumulative Grade Point Average) across all semesters:
```
CGPA = Σ(All Grade Points × Credits) / Σ(All Credits)
```

The application automatically:
1. Maps subject codes to credits from the CSV file
2. Calculates grade points based on total marks
3. Computes SGPA for each semester
4. Computes overall CGPA

## Important Notes

- **Real GGSIPU Portal Integration**: This application connects to the actual GGSIPU examination portal (examweb.ggsipu.ac.in)
- **CORS Bypass**: The backend proxy is essential to bypass CORS restrictions from GGSIPU portal
- **Session Management**: Sessions are maintained in-memory using cookies. For production deployments with multiple servers, use Redis or database-backed sessions
- **HTML Parsing**: Uses Cheerio library to intelligently parse GGSIPU result pages. Handles various table structures and formats
- **Connectivity**: The application requires network access to GGSIPU portal. Use demo mode if portal is inaccessible
- **Credit Mapping**: 13,200+ subject codes mapped to credits from official CSV. Defaults to 3 credits with warning if code not found
- **Security**: Do not commit sensitive credentials to version control
- **Rate Limiting**: Be mindful of request rates to GGSIPU portal to avoid being blocked
- **Development**: Use `npm run dev` for development with auto-restart on file changes
- **Testing**: Use `/api/test-connection` endpoint to verify GGSIPU portal connectivity
- **Security**: Do not commit sensitive credentials to version control
- **Testing**: Test credentials are for development purposes only
- **Rate Limiting**: Be mindful of request rates to GGSIPU portal
- **Development**: Use `npm run dev` for development with auto-restart on file changes

## Troubleshooting

### Captcha not loading
- Check network connectivity
- Ensure GGSIPU portal is accessible
- Refresh the page and try again

### Login fails
- Verify credentials are correct
- Ensure CAPTCHA is entered correctly
- Try refreshing the CAPTCHA and logging in again

### Results not displaying
- Check browser console for errors
- Verify backend server is running
- Check if GGSIPU portal structure has changed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is for educational purposes only. Use responsibly and in accordance with GGSIPU's terms of service.

## Disclaimer

This application is not officially affiliated with GGSIPU. It is an independent project created for educational purposes to help students view their results more conveniently.

## Support

For issues and questions, please open an issue on the GitHub repository.
