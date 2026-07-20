const axios = require('axios');

const STATE_FILE_PATH = '/Airtable/_backup_state.json';

async function readBackupState(DROPBOX_ACCESS_TOKEN) {
    try {
        const response = await axios({
            method: 'post',
            url: 'https://content.dropboxapi.com/2/files/download',
            headers: {
                'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                'Dropbox-API-Arg': JSON.stringify({ path: STATE_FILE_PATH }),
            },
            responseType: 'text',
        });
        return JSON.parse(response.data);
    } catch {
        return null;
    }
}

async function writeBackupState(DROPBOX_ACCESS_TOKEN, state) {
    await axios({
        method: 'post',
        url: 'https://content.dropboxapi.com/2/files/upload',
        headers: {
            'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
            'Dropbox-API-Arg': JSON.stringify({ path: STATE_FILE_PATH, mode: 'overwrite' }),
            'Content-Type': 'application/octet-stream',
        },
        data: JSON.stringify(state, null, 2),
    });
}

async function backupAirtable() {
    try {
        const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
        const BASE_ID = 'appOQXbopTwn0SdnL';
        const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

        console.log("Testing Airtable authentication...");
        console.log("Token starts with:", AIRTABLE_PAT ? AIRTABLE_PAT.substring(0, 10) + '...' : 'TOKEN MISSING!');

        const now = new Date();
        const year = now.getFullYear();
        const monthName = now.toLocaleString('default', { month: 'long' });
        const day = String(now.getDate()).padStart(2, '0');
        const monthNum = String(now.getMonth() + 1).padStart(2, '0');
        const dateStamp = `${day}${monthNum}${year}`;
        const dayFolderName = `${day}-${monthNum}-${year}`;

        // Read last backup state for incremental backup
        const backupState = await readBackupState(DROPBOX_ACCESS_TOKEN);
        const lastBackupTime = backupState?.lastBackupTime || null;

        if (lastBackupTime) {
            console.log(`Incremental backup, only fetching records modified since: ${lastBackupTime}`);
        } else {
            console.log('No previous backup state found, running full backup');
        }

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

        let totalRecordsBacked = 0;

        for (const table of tables) {
            console.log(`Backing up table: ${table.name}...`);

            const url = `https://api.airtable.com/v0/${BASE_ID}/${table.id}`;

            let allRecords = [];
            let offset = null;
            do {
                const params = { ...(offset ? { offset } : {}) };
                if (lastBackupTime) {
                    params.filterByFormula = `IS_AFTER(LAST_MODIFIED_TIME(), '${lastBackupTime}')`;
                }

                const pageResponse = await axios.get(url, {
                    headers: {
                        Authorization: `Bearer ${AIRTABLE_PAT}`,
                        'Content-Type': 'application/json'
                    },
                    params
                });
                allRecords = allRecords.concat(pageResponse.data.records);
                offset = pageResponse.data.offset || null;
            } while (offset);

            console.log(`  → ${allRecords.length} records fetched`);

            if (allRecords.length === 0) {
                console.log(`  ↳ No changes since last backup, skipping upload`);
                continue;
            }

            totalRecordsBacked += allRecords.length;

            const folderPath = `/Airtable/${year}/${monthName}/${dayFolderName}`;
            const fileName = `zelim_backup_${table.name.toLowerCase().replace(/\s+/g, '_')}_${dateStamp}.json`;
            const fullPath = `${folderPath}/${fileName}`;

            await axios({
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
                data: JSON.stringify(allRecords, null, 2)
            });

            console.log(`✓ Successfully backed up ${table.name}`);
        }

        // Persist the timestamp so the next run is incremental
        await writeBackupState(DROPBOX_ACCESS_TOKEN, { lastBackupTime: now.toISOString() });

        console.log(`SUCCESS: Backup complete. ${totalRecordsBacked} records backed up.`);
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
