const axios = require('axios');
const { Dropbox } = require('dropbox');

const AIRTABLE_BASE_ID = 'appOQXbopTwn0SdnL';
const AIRTABLE_TABLE_ID = 'tblo0gVrtd422UQgd';

async function backupAirtable() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const monthName = now.toLocaleString('default', { month: 'long' });
    
    const day = String(now.getDate()).padStart(2, '0');
    const monthNum = String(now.getMonth() + 1).padStart(2, '0');
    const dateStamp = `${day}${monthNum}${year}`;
    const dayFolderName = `${day}-${monthNum}-${year}`;
    
    // Folder Path: /Airtable/2026/January/12-01-2026/
    const folderPath = `/Airtable/${year}/${monthName}/${dayFolderName}`;
    
    // Filename: zelim_maintenanceportal_backup_airtable_2026_January_12012026.json
    const fileName = `zelim_maintenanceportal_backup_airtable_${year}_${monthName}_${dateStamp}.json`;

    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

    console.log(`--- Fetching Airtable Data ---`);
    const res = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_PAT}` } }
    );

    await dbx.filesUpload({
      path: `${folderPath}/${fileName}`,
      contents: JSON.stringify(res.data, null, 2),
      mode: 'overwrite'
    });
    
    console.log(`SUCCESS: File ${fileName} saved to ${folderPath}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
backupAirtable();