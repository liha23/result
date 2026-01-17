# Testing Guide - GGSIPU Result Viewer

This guide explains how to test the GGSIPU Result Viewer application.

## Prerequisites

1. Node.js installed (v14 or higher)
2. All dependencies installed (`npm install`)
3. Server running (`npm start`)

## Testing Methods

### 1. Demo Mode Testing (Recommended for Development)

Demo mode allows you to test the full interface without connecting to the GGSIPU portal.

**Steps:**
1. Start the server: `npm start`
2. Open browser to `http://localhost:3000`
3. Click the **"View Demo Results"** button
4. You will see sample results with:
   - Student Name: VIJAY KUMAR
   - Enrollment: 11015603123
   - CGPA: 9.25
   - 4 semesters with complete subject details

**What This Tests:**
- ✅ Frontend UI and styling
- ✅ CGPA/SGPA calculation logic
- ✅ Grade point assignments
- ✅ Credit mapping from CSV
- ✅ Chart rendering (if Chart.js loads)
- ✅ Responsive design
- ✅ Navigation between sections

### 2. Connectivity Testing

Test if your deployment can reach the GGSIPU portal.

**Steps:**
1. Open browser to `http://localhost:3000/api/test-connection`
2. Check the JSON response

**Expected Response (Success):**
```json
{
  "success": true,
  "status": 200,
  "message": "Successfully connected to GGSIPU portal",
  "hasLoginForm": true,
  "responseLength": 5432
}
```

**Expected Response (Failure):**
```json
{
  "success": false,
  "error": "connect ETIMEDOUT...",
  "message": "Could not connect to GGSIPU portal. This may be expected in restricted environments."
}
```

**What This Tests:**
- ✅ Network connectivity to examweb.ggsipu.ac.in
- ✅ HTTPS/SSL configuration
- ✅ Firewall/proxy settings
- ✅ DNS resolution

### 3. CAPTCHA Testing

Test if CAPTCHA images can be fetched from GGSIPU portal.

**Steps:**
1. Start the server: `npm start`
2. Open browser to `http://localhost:3000`
3. Wait for CAPTCHA image to appear (or show error)
4. Click the refresh button (↻) to get a new CAPTCHA

**Expected Behavior:**
- CAPTCHA image loads from GGSIPU portal
- Refresh button gets a new CAPTCHA
- Each CAPTCHA is unique
- Session ID is maintained

**Troubleshooting:**
- "Failed to load captcha" → Portal not accessible from your environment
- Use demo mode instead
- Check firewall/network settings

**What This Tests:**
- ✅ Connection to GGSIPU portal
- ✅ Session management
- ✅ Cookie handling
- ✅ Image conversion and display

### 4. Live Authentication Testing

Test with real GGSIPU credentials (requires actual access to portal).

**Test Credentials (Example):**
```
Enrollment Number: 11015603123
Password: VIJAY KUMAR
CAPTCHA: [Enter the text shown in image]
```

**Steps:**
1. Start the server: `npm start`
2. Open browser to `http://localhost:3000`
3. Wait for CAPTCHA to load
4. Enter enrollment number: `11015603123`
5. Enter password: `VIJAY KUMAR`
6. Enter CAPTCHA text exactly as shown
7. Click "Login & Fetch Results"

**Expected Behavior (Success):**
- Loading indicator appears
- Results page displays with:
  - Student information from GGSIPU
  - Calculated CGPA/SGPA
  - All semester results
  - Subject-wise marks (internal + external)
  - Grade points and credits
  - Visual charts

**Expected Behavior (Failure):**
- "Invalid credentials or captcha" → Wrong password or CAPTCHA
- "Could not fetch result page" → Portal structure changed
- "Network error" → Connection lost

**What This Tests:**
- ✅ Complete authentication flow
- ✅ Session maintenance
- ✅ Form submission to GGSIPU
- ✅ Result page fetching
- ✅ HTML parsing with Cheerio
- ✅ Credit mapping
- ✅ CGPA/SGPA calculation
- ✅ Data display

### 5. HTML Parsing Testing

Test if the application can parse GGSIPU result HTML correctly.

**What Gets Parsed:**
- Student Name
- Enrollment Number
- Programme/Course
- Semester tables
- Subject codes (e.g., ES-101, ETCS-102)
- Subject names
- Internal marks
- External marks
- Total marks

**Validation:**
1. Check if all semesters are displayed
2. Verify subject codes match CSV
3. Verify internal + external = total
4. Check if grade points are correct (based on total marks)
5. Verify SGPA calculation per semester
6. Verify overall CGPA

**Manual Verification Formula:**
```
Grade Point = Based on total marks:
- 90-100: 10
- 75-89: 9
- 65-74: 8
- 55-64: 7
- 50-54: 6
- 45-49: 5
- 40-44: 4
- Below 40: 0

SGPA = Σ(Grade Points × Credits) / Σ(Credits)
CGPA = Σ(All Grade Points × Credits) / Σ(All Credits)
```

## Common Issues and Solutions

### Issue 1: "Failed to load captcha"
**Cause:** Cannot connect to GGSIPU portal
**Solution:** 
- Use demo mode for testing
- Check network/firewall settings
- Verify portal is accessible: `curl https://examweb.ggsipu.ac.in/web/login.jsp`

### Issue 2: "Invalid credentials or captcha"
**Cause:** Wrong password or CAPTCHA entered incorrectly
**Solution:**
- Verify credentials are correct
- CAPTCHA is case-sensitive
- Try refreshing CAPTCHA and retry
- Password might be in ALL CAPS or specific format

### Issue 3: "Could not fetch result data"
**Cause:** HTML structure changed or parsing failed
**Solution:**
- Check server logs for parsing errors
- GGSIPU might have updated their HTML structure
- May need to update Cheerio selectors in `parseResultHTML()`

### Issue 4: Charts not displaying
**Cause:** Chart.js CDN blocked or not loading
**Solution:**
- Check browser console for errors
- Charts are optional - core functionality still works
- Data tables show all information

### Issue 5: Wrong CGPA calculation
**Cause:** Subject credits not found in CSV
**Solution:**
- Check server logs for "not found in CSV" warnings
- Verify subject code format matches CSV
- Default 3 credits used if not found

## Testing Checklist

- [ ] Server starts without errors
- [ ] Home page loads correctly
- [ ] Demo mode works and shows results
- [ ] CAPTCHA loads (if portal accessible)
- [ ] CAPTCHA refresh works
- [ ] Login form accepts input
- [ ] Error messages display correctly
- [ ] Loading overlay shows during requests
- [ ] Results page displays all sections
- [ ] Student info displays correctly
- [ ] CGPA value is calculated and shown
- [ ] CGPA progress bar displays
- [ ] All semesters are shown
- [ ] All subjects are listed
- [ ] Internal/External marks display
- [ ] Grade points are correct
- [ ] Credits are mapped correctly
- [ ] SGPA per semester is correct
- [ ] Overall CGPA is correct
- [ ] Charts render (if Chart.js loads)
- [ ] Back to login button works
- [ ] Responsive design on mobile
- [ ] No console errors

## Production Testing

Before deploying to production:

1. **Test Demo Mode** - Ensure it works without portal access
2. **Test Connection Endpoint** - Verify portal connectivity from production server
3. **Test with Real Credentials** - If possible, test full flow
4. **Load Testing** - Test with multiple concurrent users
5. **Session Management** - Verify sessions are isolated
6. **Error Handling** - Test various error scenarios
7. **Logging** - Check logs for warnings/errors
8. **Mobile Testing** - Test on actual mobile devices
9. **Browser Compatibility** - Test on Chrome, Firefox, Safari, Edge
10. **Security** - Never commit real credentials

## Automated Testing

For continuous integration, you can test:

```bash
# Test server starts
npm start &
sleep 5
curl http://localhost:3000 | grep "GGSIPU Result Viewer"

# Test demo endpoint
curl http://localhost:3000/api/demo | grep "success"

# Test connection endpoint
curl http://localhost:3000/api/test-connection

# Stop server
pkill node
```

## Notes

- **Demo mode** is always available and doesn't require portal access
- **Real credentials** are needed for live testing
- **CAPTCHA** changes with each request and must be entered correctly
- **Session management** maintains state between requests
- **HTML parsing** is flexible and handles various formats
- **Credit mapping** uses 13,200+ subjects from CSV file

## Support

If you encounter issues:
1. Check server console logs
2. Check browser console for errors
3. Test with demo mode first
4. Verify portal connectivity with test endpoint
5. Review HTML parsing logic if portal structure changed
