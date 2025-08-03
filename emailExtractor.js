const crypto = require("crypto");

class EmailExtractor {
    constructor(config) {
        this.utoken = config.utoken || null;
        this.session = config.session || null;
        this.nonceValue = config.nonceValue || null;
        this.encryptedUserToken = config.encryptedUserToken || null;
    }

    // Decrypt the PEM data from Easyleadz API
    decryptPem(pemBase64, nonce) {
        try {
            const parsed = JSON.parse(Buffer.from(pemBase64, "base64").toString("utf8"));
            const salt = Buffer.from(parsed.salt, "hex");
            const iv = Buffer.from(parsed.iv, "hex");
            const ciphertext = Buffer.from(parsed.ciphertext, "base64");
            const iterations = parsed.iterations || 999;

            const key = crypto.pbkdf2Sync(nonce, salt, iterations, 32, "sha512");

            const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
            let decrypted = decipher.update(ciphertext, undefined, "utf8");
            decrypted += decipher.final("utf8");

            return decrypted;
        } catch (error) {
            console.error('[ERROR] Failed to decrypt PEM:', error.message);
            return null;
        }
    }

    // Extract emails from LinkedIn profile using Easyleadz API
    async extractEmailFromLinkedIn(linkedinUrl, page) {
        try {
            if (!this.encryptedUserToken || !this.session || !this.nonceValue) {
                console.log('[WARNING] Easyleadz credentials not configured. Please set up your tokens.');
                return [];
            }

            console.log(`[INFO] Extracting email from: ${linkedinUrl}`);

            // Navigate to a proxy page to make the API call
            await page.goto('about:blank');

            // Make API request using page.evaluate to use browser context
            const result = await page.evaluate(async (url, userToken, session) => {
                try {
                    const response = await fetch('https://app.easyleadz.com/api/v5/show_email.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'User-Token': userToken,
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: new URLSearchParams({
                            url: url,
                            scode: session
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`API request failed: ${response.status}`);
                    }

                    const data = await response.json();
                    return data;
                } catch (error) {
                    return { error: error.message };
                }
            }, linkedinUrl, this.encryptedUserToken, this.session);

            if (result.error) {
                console.error(`[ERROR] API request failed: ${result.error}`);
                return [];
            }

            if (result.pem) {
                const decrypted = this.decryptPem(result.pem, this.nonceValue);
                if (decrypted) {
                    // Extract emails from decrypted data
                    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                    const emails = decrypted.match(emailRegex) || [];
                    console.log(`[SUCCESS] Found emails: ${emails.join(', ')}`);
                    return emails;
                }
            }

            console.log('[INFO] No emails found for this profile');
            return [];
        } catch (error) {
            console.error(`[ERROR] Failed to extract email: ${error.message}`);
            return [];
        }
    }

    // Update configuration at runtime
    updateConfig(config) {
        if (config.utoken) this.utoken = config.utoken;
        if (config.session) this.session = config.session;
        if (config.nonceValue) this.nonceValue = config.nonceValue;
        if (config.encryptedUserToken) this.encryptedUserToken = config.encryptedUserToken;
    }
}

module.exports = EmailExtractor;