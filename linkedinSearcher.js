class LinkedInSearcher {
    constructor(page) {
        this.page = page;
        this.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    }

    // Extract domain name from website URL
    getDomainFromWebsite(website) {
        try {
            let domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '');
            domain = domain.split('/')[0];
            return domain;
        } catch (error) {
            return website;
        }
    }

    // Generate Google search queries for finding LinkedIn profiles
    generateSearchQueries(domain, role) {
        const baseQueries = [
            `site:linkedin.com/in/ "${role}" "${domain}"`,
            `site:linkedin.com/in/ intitle:"${role}" "${domain}"`,
            `site:linkedin.com/in/ "${role}" "@${domain}"`,
            `"${role}" "${domain}" site:linkedin.com`,
            `"${role}" site:linkedin.com "${domain.split('.')[0]}"`,
            `intitle:"${role}" site:linkedin.com/in/ "${domain}"`
        ];
        
        return baseQueries;
    }

    // Search for LinkedIn profiles using Google
    async searchLinkedInProfiles(website, roles = ['CEO', 'CTO', 'CISO']) {
        const domain = this.getDomainFromWebsite(website);
        const foundProfiles = [];

        console.log(`[INFO] Searching LinkedIn profiles for domain: ${domain}`);

        for (const role of roles) {
            console.log(`[INFO] Searching for ${role} at ${domain}`);
            
            const queries = this.generateSearchQueries(domain, role);
            
            for (const query of queries) {
                try {
                    const profiles = await this.performGoogleSearch(query, role);
                    foundProfiles.push(...profiles);
                    
                    // Add delay to avoid being rate limited
                    await this.delay(2000 + Math.random() * 3000);
                    
                    // Break if we found profiles for this role
                    if (profiles.length > 0) {
                        break;
                    }
                } catch (error) {
                    console.error(`[ERROR] Search failed for query: ${query}`, error.message);
                    await this.delay(5000); // Longer delay on error
                }
            }
        }

        return foundProfiles;
    }

    // Perform Google search and extract LinkedIn profile URLs
    async performGoogleSearch(query, role) {
        try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
            console.log(`[INFO] Searching: ${query}`);
            
            await this.page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Wait for search results
            await this.page.waitForSelector('div[data-ved]', { timeout: 10000 });
            
            // Extract LinkedIn profile URLs from search results
            const profiles = await this.page.evaluate((searchRole) => {
                const results = [];
                const searchResults = document.querySelectorAll('div[data-ved] a[href*="linkedin.com/in/"]');
                
                for (const link of searchResults) {
                    const url = link.href;
                    const text = link.textContent || '';
                    
                    // Basic validation to ensure it's a profile URL
                    if (url.includes('linkedin.com/in/') && !url.includes('dir/') && !url.includes('search/')) {
                        results.push({
                            url: url,
                            role: searchRole,
                            text: text.trim()
                        });
                    }
                }
                
                return results.slice(0, 3); // Limit to top 3 results per role
            }, role);

            console.log(`[SUCCESS] Found ${profiles.length} potential ${role} profiles`);
            return profiles;
            
        } catch (error) {
            console.error(`[ERROR] Google search failed: ${error.message}`);
            return [];
        }
    }

    // Verify if LinkedIn profile is relevant to the domain
    async verifyProfile(profileUrl, domain) {
        try {
            console.log(`[INFO] Verifying profile: ${profileUrl}`);
            
            await this.page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Wait for profile content to load
            await this.delay(3000);
            
            // Extract profile information
            const profileInfo = await this.page.evaluate((targetDomain) => {
                const profileText = document.body.textContent.toLowerCase();
                const domainName = targetDomain.split('.')[0].toLowerCase();
                
                // Check if domain or company name appears in profile
                const isDomainMentioned = profileText.includes(domainName) || 
                                        profileText.includes(targetDomain.toLowerCase());
                
                // Extract current position
                const headlineElement = document.querySelector('[data-generated-suggestion-target]') || 
                                      document.querySelector('div.text-body-medium');
                const headline = headlineElement ? headlineElement.textContent.trim() : '';
                
                return {
                    isDomainMentioned,
                    headline,
                    profileText: profileText.substring(0, 500) // First 500 chars for context
                };
            }, domain);

            return profileInfo.isDomainMentioned;
            
        } catch (error) {
            console.error(`[ERROR] Profile verification failed: ${error.message}`);
            return false;
        }
    }

    // Main method to find and verify LinkedIn profiles
    async findExecutiveProfiles(website) {
        const profiles = await this.searchLinkedInProfiles(website);
        const verifiedProfiles = [];
        const domain = this.getDomainFromWebsite(website);

        for (const profile of profiles) {
            try {
                // For rate limiting, we'll trust Google search results
                // In production, you might want to verify each profile
                console.log(`[INFO] Found ${profile.role} profile: ${profile.url}`);
                verifiedProfiles.push(profile);
                
                // Add delay between profile checks
                await this.delay(1000);
                
            } catch (error) {
                console.error(`[ERROR] Failed to process profile ${profile.url}: ${error.message}`);
            }
        }

        return verifiedProfiles;
    }

    // Handle potential captcha or rate limiting
    async handleCaptcha() {
        try {
            // Check if there's a captcha on the page
            const captchaExists = await this.page.$('div[id*="captcha"]');
            if (captchaExists) {
                console.log('[WARNING] Captcha detected. Waiting 30 seconds...');
                await this.delay(30000);
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    }
}

module.exports = LinkedInSearcher;