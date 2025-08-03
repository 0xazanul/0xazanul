// Configuration file for LinkedIn Email Extractor
// You need to obtain these values from your Easyleadz extension

const config = {
    // Easyleadz credentials - MUST be updated with your actual values
    easyleadz: {
        // Get these from your browser's DevTools when Easyleadz extension is active
        utoken: '', // Example: '688f7a22bc19a25107629ab9'
        session: '', // Example: '5c179f730924a868bbd191c0cd80c53f688f7a21b2d881754233377'
        nonceValue: '', // Example: 'mI4DwthFYmcefl7V'
        encryptedUserToken: '' // Example: 'eyJjaXBoZXJ0ZXh0IjoiUVVYMmZUb0...'
    },

    // File paths
    files: {
        inputCSV: 'input_websites.csv',
        outputCSV: 'output_results.csv'
    },

    // Browser settings
    browser: {
        headless: false, // Set to true for headless mode
        slowMo: 1000, // Delay between actions in milliseconds
        timeout: 30000 // Page load timeout
    },

    // Search settings
    search: {
        roles: ['CEO', 'CTO', 'CISO', 'Chief Executive Officer', 'Chief Technology Officer', 'Chief Information Security Officer'],
        maxProfilesPerRole: 2,
        delayBetweenSearches: 3000, // Milliseconds
        delayBetweenProfiles: 2000
    },

    // Session settings
    session: {
        profileDir: './profiles/linkedin_session'
    }
};

module.exports = config;