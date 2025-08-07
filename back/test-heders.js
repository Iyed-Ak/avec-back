// test-headers.js
const axios = require('axios');

async function testSecurityHeaders() {
  try {
    const response = await axios.get('http://localhost:3000/');
    
    console.log('🛡️ Headers de Sécurité:');
    console.log('X-Frame-Options:', response.headers['x-frame-options']);
    console.log('X-Content-Type-Options:', response.headers['x-content-type-options']);
    console.log('X-XSS-Protection:', response.headers['x-xss-protection']);
    console.log('Content-Security-Policy:', response.headers['content-security-policy']);
    console.log('Referrer-Policy:', response.headers['referrer-policy']);
    console.log('X-Powered-By:', response.headers['x-powered-by'] || 'MASQUÉ ✅');
    
  } catch (error) {
    console.error('Erreur test:', error.message);
  }
}

testSecurityHeaders();