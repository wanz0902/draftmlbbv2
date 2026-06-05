const https = require('https');
const fs = require('fs');

const url = 'https://upload.wikimedia.org/wikipedia/id/3/36/Onic_Esports_Logo.png';

https.get(url, (res) => {
  if (res.statusCode === 200) {
    const file = fs.createWriteStream('./public/onic.png');
    res.pipe(file);
    file.on('finish', () => console.log('Downloaded'));
  } else {
    console.log('Failed:', res.statusCode);
  }
}).on('error', (e) => console.log('Error:', e.message));
