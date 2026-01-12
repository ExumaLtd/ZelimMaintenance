const axios = require('axios');
const { Dropbox } = require('dropbox');

async function backupAirtable() {
    try {
        const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
        // Updated with your specific Base ID from the screenshot
        const BASE_ID = 'appOQXbopTwn0SdnL'; 

        const now = new Date();
        const year = now.getFullYear();
        const monthName = now.toLocaleString('default', { month: 'long' });
        const day = String(now.getDate()).padStart(2, '0');
        const monthNum = String(now.getMonth() + 1).padStart(2, '0');
        const dateStamp = `${day}${monthNum}${year}`;
        const dayFolderName = `${day}-${monthNum}-${year}`;

        const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

        console.log("Fetching list of all tables from Airtable...");
        
        // 1. Get the schema (list of all tables currently in the base)
        const schemaResponse = await axios.get(
            `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
            { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
        );

        const tables = schemaResponse.data.tables;

        // 2. Loop through every table found and upload to Dropbox
        for (const table of tables) {
            console.log(`Backing up table: ${table.name}...`);
            
            const recordsResponse = await axios.get(
                `https://api.airtable.com/v0/${BASE_ID}/${table.id}`,
                { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
            );

            const folderPath = `/Airtable/${year}/${monthName}/${dayFolderName}`;
            // Sanitizes table name for filename (e.g., "Swift Units" becomes "swift_units")
            const fileName = `zelim_backup_${table.name.toLowerCase().replace(/\s+/g, '_')}_${dateStamp}.json`;

            await dbx.filesUpload({
                path: `${folderPath}/${fileName}`,
                contents: JSON.stringify(recordsResponse.data.records, null, 2),
                mode: 'overwrite'
            });
        }

        console.log('SUCCESS: All tables (including future ones) backed up to Dropbox.');
    } catch (e) {
        console.error('BACKUP FAILED:', e.response ? e.response.data : e.message);
        process.exit(1);
    }
}

backupAirtable();