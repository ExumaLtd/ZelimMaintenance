const axios = require('axios');

async function backupAirtable() {
    try {
        const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
        const BASE_ID = 'appOQXbopTwn0SdnL'; 
        const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

        console.log("Testing Airtable authentication...");
        console.log("Token starts with:", AIRTABLE_PAT ? AIRTABLE_PAT.substring(0, 10) + '...' : 'TOKEN MISSING!');

        // --- START OF YOUR NAMING LOGIC ---
        const now = new Date();
        const year = now.getFullYear();
        const monthName = now.toLocaleString('default', { month: 'long' });
        const day = String(now.getDate()).padStart(2, '0');
        const monthNum = String(now.getMonth() + 1).padStart(2, '0');
        const dateStamp = `${day}${monthNum}${year}`;
        const dayFolderName = `${day}-${monthNum}-${year}`;
        // --- END OF YOUR NAMING LOGIC ---

        console.log("Fetching list of all tables from Airtable...");
        
        const schemaResponse = await axios.get(
            `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`,
            { 
                headers: { 
                    Authorization: `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const tables = schemaResponse.data.tables;
        console.log(`Found ${tables.length} tables to backup`);

        for (const table of tables) {
            console.log(`Backing up table: ${table.name}...`);
            
            const url = `https://api.airtable.com/v0/${BASE_ID}/${table.id}`;
            const recordsResponse = await axios.get(url, {
                headers: { 
                    Authorization: `Bearer ${AIRTABLE_PAT}`,
                    'Content-Type': 'application/json'
                }
            });

            // These variables use your exact naming logic from above
            const folderPath = `/Airtable/${year}/${monthName}/${dayFolderName}`;
            const fileName = `zelim_backup_${table.name.toLowerCase().replace(/\s+/g, '_')}_${dateStamp}.json`;
            const fullPath = `${folderPath}/${fileName}`;

            // "Direct Upload" method to bypass Dropbox library limitations
            const dropboxResponse = await axios({
                method: 'post',
                url: 'https://content.dropboxapi.com/2/files/upload',
                headers: {
                    'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                    'Dropbox-API-Arg': JSON.stringify({
                        path: fullPath,
                        mode: 'overwrite',
                        autorename: true,
                        mute: false,
                        strict_conflict: false
                    }),
                    'Content-Type': 'application/octet-stream'
                },
                data: JSON.stringify(recordsResponse.data.records, null, 2)
            });
            
            console.log(`✓ Successfully backed up ${table.name} (Status: ${dropboxResponse.status})`);
        }

        console.log('SUCCESS: All tables backed up to Dropbox.');
    } catch (e) {
        console.error('BACKUP FAILED');
        if (e.response && e.response.data) {
            console.error('Error Detail:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.error('Error message:', e.message);
        }
        process.exit(1);
    }
}

backupAirtable();