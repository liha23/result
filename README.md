# GGSIPU Result Viewer

A full-stack web application that acts as a wrapper/proxy to fetch student results from the GGSIPU portal and calculate CGPA/SGPA with visualizations.

## Features

- **Result Fetching**: Fetches student results from GGSIPU portal via backend proxy
- **CAPTCHA Handling**: Displays and handles CAPTCHA verification
- **CGPA/SGPA Calculation**: Automatically calculates semester-wise SGPA and overall CGPA
- **Credit System**: Uses official IPU subject credits from CSV database
- **Visualizations**: 
  - Semester-wise SGPA bar chart
  - Subject-wise performance line chart
  - CGPA indicator with visual bar
- **Detailed Results**: Shows internal and external marks separately for each subject
- **Responsive Design**: Mobile-friendly UI with modern styling

## Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js
- **HTTP Client**: Axios (for backend API calls)

## Project Structure

```
/
├── server.js                                          # Express backend server
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

1. **Open the application** in your web browser
2. **Enter your credentials**:
   - Enrollment Number
   - Password
   - CAPTCHA (displayed on screen)
3. **Click "Login & Fetch Results"**
4. **View your results** with:
   - Student information
   - Overall CGPA
   - Semester-wise SGPA
   - Subject-wise marks (internal + external)
   - Visual charts and graphs

## API Endpoints

### GET /api/captcha
Fetches CAPTCHA image from GGSIPU portal and returns it as base64.

**Response:**
```json
{
  "success": true,
  "sessionId": "1234567890",
  "captcha": "data:image/jpeg;base64,..."
}
```

### POST /api/login
Authenticates user and fetches complete result data.

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

- **CORS Bypass**: The backend proxy is essential to bypass CORS restrictions from GGSIPU portal
- **Session Management**: Sessions are maintained in memory for each user request
- **Security**: Do not commit sensitive credentials to version control
- **Testing**: Test credentials are for development purposes only
- **Rate Limiting**: Be mindful of request rates to GGSIPU portal

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
