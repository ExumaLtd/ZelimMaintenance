const axios = require('axios');
const { Dropbox } = require('dropbox');

async function backupAirtable() {
    try {
        const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
        const BASE_ID = 'appOQXbopTwn0SdnL'; 

        console.log("Testing Airtable authentication...");
        console.log("Token starts with:", AIRTABLE_PAT ? AIRTABLE_PAT.substring(0, 10) + '...' : 'TOKEN MISSING!');
        console.log("Base ID:", BASE_ID);

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
            { 
                headers: { 
                    Authorization: `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                },
                validateStatus: false // Don't throw on any status
            }
        );

        console.log("Schema response status:", schemaResponse.status);
        
        if (schemaResponse.status !== 200) {
            console.error("Schema fetch failed:", JSON.stringify(schemaResponse.data, null, 2));
            process.exit(1);
        }

        const tables = schemaResponse.data.tables;
        console.log(`Found ${tables.length} tables to backup`);

        for (const table of tables) {
            console.log(`Backing up table: ${table.name} (ID: ${table.id})...`);
            
            const url = `https://api.airtable.com/v0/${BASE_ID}/${table.id}`;
            console.log(`Fetching from: ${url}`);
            
            const recordsResponse = await axios.get(url, {
                headers: { 
                    Authorization: `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                },
                validateStatus: false
            });

            console.log(`Records response status: ${recordsResponse.status}`);
            
            if (recordsResponse.status !== 200) {
                console.error(`Failed to fetch records for ${table.name}`);
                console.error('Response:', JSON.stringify(recordsResponse.data, null, 2));
                throw new Error(`Failed to backup table ${table.name}`);
            }

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
            console.error('Headers:', JSON.stringify(e.response.headers, null, 2));
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
        }
        process.exit(1);
    }
}

backupAirtable();