const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class CSVManager {
    constructor(inputFile, outputFile) {
        this.inputFile = inputFile;
        this.outputFile = outputFile;
        this.data = [];
        this.csvWriter = null;
        this.initializeWriter();
    }

    // Initialize CSV writer
    initializeWriter() {
        this.csvWriter = createCsvWriter({
            path: this.outputFile,
            header: [
                { id: 'website', title: 'Website' },
                { id: 'linkedinProfiles', title: 'LinkedIn Profiles' },
                { id: 'mail', title: 'Mail' },
                { id: 'status', title: 'Status' }
            ]
        });
    }

    // Read CSV file and return data
    async readCSV() {
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(this.inputFile)
                .pipe(csv())
                .on('data', (data) => {
                    results.push({
                        website: data.Website || data.website,
                        linkedinProfiles: data['LinkedIn Profiles'] || data.linkedinProfiles || '',
                        mail: data.Mail || data.mail || '',
                        status: data.Status || data.status || 'Pending'
                    });
                })
                .on('end', () => {
                    this.data = results;
                    console.log(`[INFO] Loaded ${results.length} websites from CSV`);
                    resolve(results);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }

    // Update a specific row with new data
    async updateRow(index, updates) {
        if (index >= 0 && index < this.data.length) {
            // Update the data in memory
            this.data[index] = { ...this.data[index], ...updates };
            
            // Write the updated data to the output file
            await this.writeCSV();
            
            console.log(`[INFO] Updated row ${index + 1}: ${this.data[index].website}`);
            return true;
        }
        return false;
    }

    // Add LinkedIn profile to a specific website
    async addLinkedInProfile(website, profile, role) {
        const index = this.data.findIndex(row => 
            row.website.toLowerCase().includes(website.toLowerCase()) ||
            website.toLowerCase().includes(row.website.toLowerCase())
        );
        
        if (index !== -1) {
            const existingProfiles = this.data[index].linkedinProfiles || '';
            const profileEntry = `${role}: ${profile}`;
            
            const newProfiles = existingProfiles 
                ? `${existingProfiles}; ${profileEntry}`
                : profileEntry;
            
            await this.updateRow(index, { 
                linkedinProfiles: newProfiles,
                status: 'LinkedIn Found'
            });
            
            return index;
        }
        return -1;
    }

    // Add email to a specific website
    async addEmail(website, email) {
        const index = this.data.findIndex(row => 
            row.website.toLowerCase().includes(website.toLowerCase()) ||
            website.toLowerCase().includes(row.website.toLowerCase())
        );
        
        if (index !== -1) {
            const existingEmails = this.data[index].mail || '';
            const newEmails = existingEmails 
                ? `${existingEmails}; ${email}`
                : email;
            
            await this.updateRow(index, { 
                mail: newEmails,
                status: 'Complete'
            });
            
            return index;
        }
        return -1;
    }

    // Write current data to CSV file
    async writeCSV() {
        try {
            await this.csvWriter.writeRecords(this.data);
            return true;
        } catch (error) {
            console.error('[ERROR] Failed to write CSV:', error.message);
            return false;
        }
    }

    // Get all data
    getData() {
        return this.data;
    }

    // Get website at specific index
    getWebsite(index) {
        return index >= 0 && index < this.data.length ? this.data[index] : null;
    }

    // Get total count
    getCount() {
        return this.data.length;
    }

    // Mark website as failed
    async markAsFailed(website, reason) {
        const index = this.data.findIndex(row => 
            row.website.toLowerCase().includes(website.toLowerCase()) ||
            website.toLowerCase().includes(row.website.toLowerCase())
        );
        
        if (index !== -1) {
            await this.updateRow(index, { 
                status: `Failed: ${reason}`
            });
            return index;
        }
        return -1;
    }
}

module.exports = CSVManager;