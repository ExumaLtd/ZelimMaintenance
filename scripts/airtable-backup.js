const axios = require('axios');
const { Dropbox } = require('dropbox');

async function backupAirtable() {
    try {
        const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
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
        
        const schemaResponse = await axios.get(
            `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
            { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
        );

        const tables = schemaResponse.data.tables;
        console.log(`Found ${tables.length} tables to backup`);

        for (const table of tables) {
            console.log(`Backing up table: ${table.name} (ID: ${table.id})...`);
            
            // Try using table.id instead of table.name
            const recordsResponse = await axios.get(
                `https://api.airtable.com/v0/${BASE_ID}/${table.id}`,
                { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
            );

            const folderPath = `/Airtable/${year}/${monthName}/${dayFolderName}`;
            const fileName = `zelim_backup_${table.name.toLowerCase().replace(/\s+/g, '_')}_${dateStamp}.json`;

            await dbx.filesUpload({
                path: `${folderPath}/${fileName}`,
                contents: JSON.stringify(recordsResponse.data.records, null, 2),
                mode: 'overwrite'
            });
            
            console.log(`✓ Successfully backed up ${table.name}`);
        }

        console.log('SUCCESS: All tables backed up to Dropbox.');
    } catch (e) {
        console.error('BACKUP FAILED');
        console.error('Error message:', e.message);
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Status text:', e.response.statusText);
            console.error('Response data:', JSON.stringify(e.response.data, null, 2));
            console.error('Request URL:', e.config?.url);
        }
        process.exit(1);
    }
}

backupAirtable();