const axios = require('axios');
const { Dropbox } = require('dropbox');

async function backupAirtable() {
    try {
        const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
        // Base ID confirmed from your logs and settings
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
        
        // 1. Get the schema (This part is currently working)
        const schemaResponse = await axios.get(
            `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
            { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
        );

        const tables = schemaResponse.data.tables;

        // 2. Loop through every table found and upload to Dropbox
        for (const table of tables) {
            console.log(`Backing up table: ${table.name}...`);
            
            // AMENDED: Using encodeURIComponent(table.name) instead of table.id 
            // to resolve the 401 error during record fetching.
            const recordsResponse = await axios.get(
                `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table.name)}`,
                { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
            );

            const folderPath = `/Airtable/${year}/${monthName}/${dayFolderName}`;
            const fileName = `zelim_backup_${table.name.toLowerCase().replace(/\s+/g, '_')}_${dateStamp}.json`;

            await dbx.filesUpload({
                path: `${folderPath}/${fileName}`,
                contents: JSON.stringify(recordsResponse.data.records, null, 2),
                mode: 'overwrite'
            });
        }

        console.log('SUCCESS: All tables (including future ones) backed up to Dropbox.');
    } catch (e) {
        // AMENDED: Improved error logging to catch the exact response from Airtable
        if (e.response && e.response.data) {
            console.error('BACKUP FAILED:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.error('BACKUP FAILED:', e.message);
        }
        process.exit(1);
    }
}

backupAirtable();