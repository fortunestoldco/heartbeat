# Failsafe Security System

A Next.js web application designed as a personal security failsafe system. Users must check in twice daily (12:00 AM and 12:00 PM) by entering a secure password. Missing a deadline or entering an incorrect password triggers automated document distribution.

## Features

- **Dual Daily Check-ins**: Required at 12:00 AM and 12:00 PM
- **Countdown Timer**: Real-time display of time remaining until next deadline
- **Secure Password Verification**: Encrypted password storage and verification
- **Emergency Alert System**: Automatic email notifications when failsafe is triggered
- **Location-Based Alerts**: Optional phone alerts with GPS coordinates (Twilio + Google Geolocation)
- **Responsive Design**: Clean, modern Material Design interface
- **Persistent State**: Tracks check-in history and system status

## Security Features

- Password encryption using SHA-256 with salt
- One-strike policy: Single incorrect password triggers failsafe
- Automatic deadline monitoring
- Emergency document distribution via email
- Optional location tracking and phone alerts with TTS coordinates
- System lockdown on trigger

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env.local`:
```env
# Email Configuration (Required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_DISTRIBUTION_LIST=emergency@example.com,security@example.com

# Security Configuration (Required)
MASTER_PASSWORD_HASH=your-password-hash
DOCUMENT_PATH=/path/to/emergency-document.txt
NEXT_PUBLIC_SALT=your-unique-salt-key

# Location Services (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
ALERT_PHONE_NUMBER=+1987654321
GOOGLE_GEOLOCATION_API_KEY=your-google-api-key
```

3. Generate your password hash:
```javascript
// Run this in browser console or Node.js to generate hash for your password
const CryptoJS = require('crypto-js');
const password = 'your-secure-password';
const salt = 'your-unique-salt-key';
const hash = CryptoJS.SHA256(password + salt).toString();
console.log('Your password hash:', hash);
```

4. Configure the emergency document at the specified path

5. Start the development server:
```bash
npm run dev
```

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

## Important Notes

- This system is designed for legitimate personal security purposes
- Configure email settings properly for emergency notifications to work
- Test the system thoroughly before relying on it
- Keep backup access methods available
- Regularly verify emergency contact information

## Location Services

When an incorrect password is entered, the system can optionally:

1. **Get User Location**: Uses browser geolocation API (GPS fallback if WiFi unavailable)
2. **Make Alert Call**: Calls a designated number via Twilio
3. **Speak Coordinates**: Uses Text-to-Speech to relay exact coordinates
4. **Anti-Spoofing**: Prefers WiFi-based location over GPS to prevent spoofing

Location alerts are disabled in development mode and only trigger on incorrect password entry.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SMTP_HOST` | Email server hostname | Yes |
| `SMTP_PORT` | Email server port | Yes |
| `SMTP_USER` | Email username | Yes |
| `SMTP_PASS` | Email password/app password | Yes |
| `EMAIL_DISTRIBUTION_LIST` | Comma-separated email list | Yes |
| `MASTER_PASSWORD_HASH` | SHA-256 hash of password | Yes |
| `DOCUMENT_PATH` | Path to emergency document | Yes |
| `NEXT_PUBLIC_SALT` | Salt for password hashing | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | No |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | No |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | No |
| `ALERT_PHONE_NUMBER` | Number to call for alerts | No |
| `GOOGLE_GEOLOCATION_API_KEY` | Google Geolocation API key | No |

## License

This project is provided as-is for educational and legitimate security purposes only.