const axios = require('axios');

async function backupVercel() {
    try {
        const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
        const PROJECT_ID = 'prj_PNyJLvXl1OjOSonBDPedp7xSK5tq'; 
        const TEAM_ID = 'team_OCp7mDUAqlZkK0Uheh0mYbPb'; 
        const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

        // --- START OF YOUR NAMING LOGIC ---
        const now = new Date();
        const year = now.getFullYear();
        const monthName = now.toLocaleString('default', { month: 'long' });
        const day = String(now.getDate()).padStart(2, '0');
        const monthNum = String(now.getMonth() + 1).padStart(2, '0');
        const dateStamp = `${day}${monthNum}${year}`;
        const dayFolderName = `${day}-${monthNum}-${year}`;
        // --- END OF YOUR NAMING LOGIC ---

        console.log("Fetching Environment Variables from Vercel...");

        // Fetch Environment Variables from Vercel API
        const envResponse = await axios.get(
            `https://api.vercel.com/v9/projects/${PROJECT_ID}/env${TEAM_ID ? `?teamId=${TEAM_ID}` : ''}`,
            { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
        );

        // Strip values and back up only key names, targets and types.
        // Secret values must never be written to Dropbox.
        const safeEnvs = envResponse.data.envs.map(({ key, target, type, createdAt, updatedAt }) => ({
            key, target, type, createdAt, updatedAt
        }));

        const backupData = {
            project: "Zelim Maintenance Portal",
            backup_time: now.toISOString(),
            environment_variables: safeEnvs,
            note: "Variable names and metadata only. Values are intentionally excluded."
        };

        const folderPath = `/Vercel/${year}/${monthName}/${dayFolderName}`;
        const fileName = `zelim_project_config_backup_${dateStamp}.json`;
        const fullPath = `${folderPath}/${fileName}`;

        console.log(`Uploading Vercel backup to: ${fullPath}`);

        // Direct upload to Dropbox Content API (fixes the 400 error)
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
            data: JSON.stringify(backupData, null, 2)
        });

        console.log(`✓ SUCCESS: Vercel config backed up (Status: ${dropboxResponse.status})`);
    } catch (e) {
        console.error('VERCEL BACKUP FAILED');
        if (e.response && e.response.data) {
            console.error('Error Detail:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.error('Error message:', e.message);
        }
        process.exit(1);
    }
}

backupVercel();