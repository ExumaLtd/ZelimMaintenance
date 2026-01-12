const axios = require('axios');
const { Dropbox } = require('dropbox');

async function backupVercel() {
    try {
        const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
        // Your specific Project ID
        const PROJECT_ID = 'prj_PNyJLvXl1OjOSonBDPedp7xSK5tq'; 
        // Your specific Team ID to authorize access to the Exuma team scope
        const TEAM_ID = 'team_OCp7mDUAqlZkK0Uheh0mYbPb'; 

        const now = new Date();
        const year = now.getFullYear();
        const monthName = now.toLocaleString('default', { month: 'long' });
        const day = String(now.getDate()).padStart(2, '0');
        const monthNum = String(now.getMonth() + 1).padStart(2, '0');
        const dateStamp = `${day}${monthNum}${year}`;
        const dayFolderName = `${day}-${monthNum}-${year}`;

        const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

        console.log("Fetching Environment Variables from Vercel...");

        // Fetch Environment Variables from Vercel API with the required teamId parameter
        const envResponse = await axios.get(
            `https://api.vercel.com/v9/projects/${PROJECT_ID}/env${TEAM_ID ? `?teamId=${TEAM_ID}` : ''}`,
            { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
        );

        const backupData = {
            project: "Zelim Maintenance Portal",
            backup_time: now.toISOString(),
            environment_variables: envResponse.data.envs,
            note: "This file contains the secret keys and IDs required to run the portal."
        };

        const folderPath = `/Vercel/${year}/${monthName}/${dayFolderName}`;
        const fileName = `zelim_project_config_backup_${dateStamp}.json`;

        await dbx.filesUpload({
            path: `${folderPath}/${fileName}`,
            contents: JSON.stringify(backupData, null, 2),
            mode: 'overwrite'
        });

        console.log('SUCCESS: Vercel config and env vars backed up to Dropbox.');
    } catch (e) {
        console.error('VERCEL BACKUP FAILED:', e.response ? e.response.data : e.message);
        process.exit(1);
    }
}

backupVercel();