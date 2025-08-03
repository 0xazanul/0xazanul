# LinkedIn Email Extractor Setup Instructions

## Overview
This tool automatically finds LinkedIn profiles of company executives (CEO, CTO, CISO) using Google dorking and extracts their email addresses using the Easyleadz API.

## Prerequisites

1. **Node.js** (version 14 or higher)
2. **Google Chrome** browser installed
3. **Easyleadz Chrome Extension** (for email extraction)
4. **Active Easyleadz account** (for email extraction)

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Chrome Browser for Patchright
```bash
npx patchright install chrome
```

### 3. Setup Chrome Session Directory
The script will automatically create the session directory at `./profiles/linkedin_session`

### 4. Configure LinkedIn Session (Optional but Recommended)
1. Manually log into LinkedIn in Chrome
2. The script will use your existing LinkedIn session from the profiles directory

### 5. Configure Easyleadz Credentials (For Email Extraction)

#### Step 5a: Install Easyleadz Extension
1. Install the Easyleadz Chrome extension
2. Log into your Easyleadz account

#### Step 5b: Extract Required Credentials
1. Open Chrome DevTools (F12)
2. Go to the **Network** tab
3. Visit any LinkedIn profile
4. Use the Easyleadz extension to show email
5. Look for a request to `show_email.php`
6. Extract the following values:

**From Request Headers:**
- `User-Token`: Copy this value for `encryptedUserToken`

**From Request Payload:**
- `scode`: Copy this value for `session`

**From Chrome Extension Storage:**
1. Go to DevTools → Application → Storage → Local Storage
2. Find the Easyleadz extension storage
3. Copy `utoken` value

**From Extension Source Code:**
1. Use the Chrome Extension Source Viewer to view Easyleadz code
2. Find the `nonceValue` in the JavaScript files

#### Step 5c: Update Configuration
Edit `config.js` and update the `easyleadz` section:

```javascript
easyleadz: {
    utoken: 'your_utoken_here',
    session: 'your_session_here', 
    nonceValue: 'your_nonce_here',
    encryptedUserToken: 'your_encrypted_token_here'
}
```

## Usage

### 1. Prepare Input CSV
The script reads from `input_websites.csv`. Format:
```csv
Website,LinkedIn Profiles,Mail,Status
https://fal.ai/,,,
https://jitty.com/,,,
```

### 2. Run the Script
```bash
npm start
```

### 3. Monitor Output
The script will:
1. Search for LinkedIn profiles using Google dorking
2. Add found profiles to the output CSV in real-time
3. Extract emails using Easyleadz API
4. Update the CSV with email addresses

### 4. Check Results
Results are saved to `output_results.csv` with format:
```csv
Website,LinkedIn Profiles,Mail,Status
https://fal.ai/,CEO: https://linkedin.com/in/profile1,email@domain.com,Complete
```

## Configuration Options

### Browser Settings (`config.js`)
- `headless`: Set to `true` for headless browser mode
- `slowMo`: Delay between browser actions
- `timeout`: Page load timeout

### Search Settings
- `roles`: Executive roles to search for
- `maxProfilesPerRole`: Maximum profiles per role
- `delayBetweenSearches`: Delay between website searches
- `delayBetweenProfiles`: Delay between profile processing

## Troubleshooting

### Common Issues

1. **"No LinkedIn profiles found"**
   - The company might not have public executive profiles
   - Try searching manually to verify

2. **"Easyleadz credentials not configured"**
   - Update the credentials in `config.js`
   - Ensure your Easyleadz account is active

3. **Rate limiting or captcha**
   - Increase delays in configuration
   - The script includes automatic delays to avoid rate limiting

4. **Browser launch failed**
   - Ensure Chrome is installed
   - Run `npx patchright install chrome`

### Debug Mode
Set browser headless to `false` in `config.js` to see what the browser is doing.

## Important Notes

### Rate Limiting
- The script includes delays to avoid rate limiting
- Google may show captchas if too many requests are made
- Easyleadz API has usage limits

### Legal Considerations
- Ensure compliance with LinkedIn's Terms of Service
- Respect data privacy regulations (GDPR, CCPA, etc.)
- Only use for legitimate business purposes

### Data Accuracy
- Not all executives may have public LinkedIn profiles
- Email extraction depends on Easyleadz data availability
- Results should be verified manually

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify your Easyleadz credentials are current
3. Ensure your input CSV is properly formatted
4. Try running with a smaller dataset first