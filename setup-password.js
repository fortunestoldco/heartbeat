const CryptoJS = require('crypto-js');

// Configuration
const password = process.argv[2] || 'defaultPassword123!';
const salt = process.env.NEXT_PUBLIC_SALT || 'failsafe-salt-key';

// Generate hash
const hash = CryptoJS.SHA256(password + salt).toString();

console.log('=================================');
console.log('FAILSAFE PASSWORD SETUP');
console.log('=================================');
console.log('Password:', password);
console.log('Salt:', salt);
console.log('Generated Hash:', hash);
console.log('=================================');
console.log('');
console.log('Add this hash to your .env.local file:');
console.log(`MASTER_PASSWORD_HASH=${hash}`);
console.log('');
console.log('Usage: node setup-password.js "your-secure-password"');