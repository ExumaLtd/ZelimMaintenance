const { Dropbox } = require('dropbox');

async function backupVercel() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const monthName = now.toLocaleString('default', { month: 'long' });
    
    const day = String(now.getDate()).padStart(2, '0');
    const monthNum = String(now.getMonth() + 1).padStart(2, '0');
    const dateStamp = `${day}${monthNum}${year}`;
    const dayFolderName = `${day}-${monthNum}-${year}`;
    
    // Folder Path: /Vercel/2026/January/12-01-2026/
    const folderPath = `/Vercel/${year}/${monthName}/${dayFolderName}`;
    
    // Filename: zelim_maintenanceportal_backup_vercel_2026_January_12012026.json
    const fileName = `zelim_maintenanceportal_backup_vercel_${year}_${monthName}_${dateStamp}.json`;

    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

    const snapshot = {
      project: "Zelim Maintenance Portal",
      backup_time: now.toISOString(),
      status: "Production Live"
    };

    await dbx.filesUpload({
      path: `${folderPath}/${fileName}`,
      contents: JSON.stringify(snapshot, null, 2),
      mode: 'overwrite'
    });
    
    console.log(`SUCCESS: File ${fileName} saved to ${folderPath}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
backupVercel();