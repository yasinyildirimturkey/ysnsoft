const https = require('https');

const req = https.get('https://ysnsoft.com', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('\n--- HEADERS ---');
    console.log('HSTS:', res.headers['strict-transport-security']);
    console.log('Status code:', res.statusCode);

    console.log('\n--- MIXED CONTENT CHECK (HTTP resources) ---');
    const matches = body.match(/http:\/\/[^\s"'><]+/g) || [];
    const realHttpResources = matches.filter(url => !url.includes('schema.org') && !url.includes('w3.org'));
    console.log('Total HTTP references (excluding schema.org/w3.org):', realHttpResources.length);
    realHttpResources.forEach(u => console.log(' -', u));
  });
});

req.on('socket', (socket) => {
  socket.on('secureConnect', () => {
    const cert = socket.getPeerCertificate();
    console.log('--- CERTIFICATE INFO ---');
    console.log('Subject:', cert.subject);
    console.log('Issuer:', cert.issuer);
    console.log('Valid from:', cert.valid_from);
    console.log('Valid to:', cert.valid_to);
    console.log('Days remaining:', Math.round((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24)));
    console.log('SANs:', cert.subjectaltname);
    console.log('Authorized:', socket.authorized);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});
