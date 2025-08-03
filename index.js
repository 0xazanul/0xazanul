const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs');

const CSVManager = require('./csvManager');
const LinkedInSearcher = require('./linkedinSearcher');
const EmailExtractor = require('./emailExtractor');
const config = require('./config');

class LinkedInEmailExtractor {
    constructor() {
        this.csvManager = new CSVManager(config.files.inputCSV, config.files.outputCSV);
        this.emailExtractor = new EmailExtractor(config.easyleadz);
        this.context = null;
        this.page = null;
        this.linkedinSearcher = null;
        
        // Ensure session directory exists
        this.ensureSessionDirectory();
    }

    // Ensure session directory exists
    ensureSessionDirectory() {
        const sessionDir = config.session.profileDir;
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
            console.log(`[INFO] Created session directory: ${sessionDir}`);
        }
    }

    // Initialize browser and setup
    async initialize() {
        try {
            console.log('[INFO] Launching Chrome with saved LinkedIn session...');
            
            this.context = await chromium.launchPersistentContext(config.session.profileDir, {
                channel: 'chrome',
                headless: config.browser.headless,
                viewport: null,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            this.page = await this.context.newPage();
            this.linkedinSearcher = new LinkedInSearcher(this.page);

            // Set user agent to avoid detection
            await this.page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            console.log('[SUCCESS] Browser initialized successfully');
            return true;
        } catch (error) {
            console.error('[ERROR] Failed to initialize browser:', error.message);
            return false;
        }
    }

    // Process a single website
    async processWebsite(website, index) {
        console.log(`\n[INFO] Processing website ${index + 1}: ${website}`);
        
        try {
            // Step 1: Search for LinkedIn profiles
            const profiles = await this.linkedinSearcher.findExecutiveProfiles(website);
            
            if (profiles.length === 0) {
                console.log(`[WARNING] No LinkedIn profiles found for ${website}`);
                await this.csvManager.markAsFailed(website, 'No profiles found');
                return;
            }

            // Step 2: Add LinkedIn profiles to CSV in real-time
            for (const profile of profiles) {
                await this.csvManager.addLinkedInProfile(website, profile.url, profile.role);
                console.log(`[SUCCESS] Added ${profile.role} profile for ${website}`);
                
                // Step 3: Extract email from LinkedIn profile
                if (this.emailExtractor.encryptedUserToken && this.emailExtractor.session) {
                    try {
                        const emails = await this.emailExtractor.extractEmailFromLinkedIn(profile.url, this.page);
                        
                        if (emails.length > 0) {
                            for (const email of emails) {
                                await this.csvManager.addEmail(website, email);
                                console.log(`[SUCCESS] Added email ${email} for ${website}`);
                            }
                        } else {
                            console.log(`[INFO] No emails found for profile: ${profile.url}`);
                        }
                    } catch (error) {
                        console.error(`[ERROR] Email extraction failed for ${profile.url}:`, error.message);
                    }
                } else {
                    console.log('[WARNING] Easyleadz credentials not configured. Skipping email extraction.');
                }

                // Delay between profile processing
                await this.delay(config.search.delayBetweenProfiles);
            }

        } catch (error) {
            console.error(`[ERROR] Failed to process ${website}:`, error.message);
            await this.csvManager.markAsFailed(website, error.message);
        }
    }

    // Main execution method
    async run() {
        try {
            console.log('[INFO] Starting LinkedIn Email Extractor...');
            
            // Initialize browser
            if (!(await this.initialize())) {
                throw new Error('Failed to initialize browser');
            }

            // Load CSV data
            await this.csvManager.readCSV();
            const websites = this.csvManager.getData();

            console.log(`[INFO] Processing ${websites.length} websites...`);

            // Process each website
            for (let i = 0; i < websites.length; i++) {
                const website = websites[i].website;
                
                await this.processWebsite(website, i);
                
                // Delay between websites to avoid rate limiting
                if (i < websites.length - 1) {
                    console.log(`[INFO] Waiting ${config.search.delayBetweenSearches}ms before next website...`);
                    await this.delay(config.search.delayBetweenSearches);
                }
            }

            console.log('[SUCCESS] All websites processed successfully!');
            console.log(`[INFO] Results saved to: ${config.files.outputCSV}`);

        } catch (error) {
            console.error('[ERROR] Main execution failed:', error.message);
        } finally {
            await this.cleanup();
        }
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cleanup resources
    async cleanup() {
        try {
            if (this.context) {
                await this.context.close();
                console.log('[INFO] Browser context closed');
            }
        } catch (error) {
            console.error('[ERROR] Cleanup failed:', error.message);
        }
    }

    // Setup Easyleadz credentials interactively
    async setupCredentials() {
        console.log('\n[SETUP] Easyleadz Credentials Configuration');
        console.log('You need to obtain these values from your browser when Easyleadz extension is active:');
        console.log('1. Open DevTools (F12)');
        console.log('2. Go to Network tab');
        console.log('3. Use Easyleadz extension on any LinkedIn profile');
        console.log('4. Look for requests to show_email.php');
        console.log('5. Copy the required values and update config.js');
        console.log('\nRequired values:');
        console.log('- utoken: Found in chrome.storage.local');
        console.log('- session: Found in show_email.php request');
        console.log('- nonceValue: From extension JavaScript');
        console.log('- encryptedUserToken: User-Token header value');
        
        return false;
    }
}

// Run the automation
async function main() {
    const extractor = new LinkedInEmailExtractor();
    
    // Check if Easyleadz credentials are configured
    if (!config.easyleadz.encryptedUserToken || !config.easyleadz.session) {
        console.log('[WARNING] Easyleadz credentials not configured.');
        console.log('[INFO] The script will find LinkedIn profiles but skip email extraction.');
        console.log('[INFO] To enable email extraction, update the credentials in config.js');
        console.log('\nPress Enter to continue with profile search only, or Ctrl+C to exit and configure credentials...');
        
        // In a real implementation, you might want to wait for user input
        // For automation purposes, we'll continue without email extraction
    }

    await extractor.run();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
if (require.main === module) {
    main().catch(error => {
        console.error('[FATAL] Application failed:', error);
        process.exit(1);
    });
}

module.exports = LinkedInEmailExtractor;