# Heartbeat

A comprehensive Next.js personal security application that uses mesh networking to verify user location and requires password entry for any deviation from normal patterns. A pre-configured document is automatically distributed based on user location when security protocols are triggered. The system provides identical responses for both correct and incorrect PIN entries to avoid giving any indication that the security tool has been activated.

## 🔐 Quantum-Ready Cryptography

Heartbeat features **dual-mode cryptographic protection**:

- **Standard Mode**: ECC P-384 cryptography with SHA-384 hashing
- **Advanced Data Protection**: Post-quantum cryptography using:
  - **Kyber-768** (ML-KEM) for key encapsulation
  - **Dilithium-3** (ML-DSA-65) for digital signatures  
  - **Falcon-512** for backup signatures
  - Future-proof against quantum computing threats

## Features

### Core Security
- **Dual Daily Check-ins**: Required at 12:00 AM and 12:00 PM
- **Countdown Timer**: Real-time display of time remaining until next deadline
- **Secure Password Verification**: Encrypted password storage and verification
- **Emergency Alert System**: Automatic email notifications when failsafe is triggered
- **Location-Based Alerts**: Optional phone alerts with GPS coordinates (Twilio + Google Geolocation)

### Intelligent Location Monitoring
- **Learning Mode**: 30-day learning period to establish user's normal patterns
- **Route Pattern Detection**: Learns user's regular routes and locations
- **Anomaly Detection**: Detects unusual movements, impossible speeds, and location spoofing
- **Real-time Movement Analysis**: Monitors speed, trajectory, and movement patterns
- **Ad-hoc PIN Challenges**: Requires PIN entry when unusual movements are detected
- **Location Spoofing Detection**: Identifies potential GPS manipulation attempts

### Mesh Network Redundancy
- **Distributed Architecture**: Requires exactly 3 server instances on different hosting providers for full operation
- **Authenticated Communication**: Secure token-based mesh communication with 1-second heartbeats
- **Server Takedown Protection**: Any server takedown attempt immediately triggers security protocols
- **Automatic Failover**: Triggers PIN challenges when servers go offline (2 nodes), emergency alerts when critical (1 node)
- **Emergency Protocols**: Impossible to disable all instances without triggering immediate alerts
- **Real-time Health Monitoring**: Continuous monitoring prevents silent takedowns

### User Interface
- **Responsive Design**: Clean, modern Material Design interface
- **Persistent State**: Tracks check-in history and system status
- **Real-time Notifications**: Live updates on system and location status

## Security Features

### Password & Authentication
- Password encryption using SHA-256 with salt
- One-strike policy: Single incorrect password triggers failsafe
- Automatic deadline monitoring
- Multi-factor authentication via location patterns
- 10-minute PIN challenge timeout

### Location Security
- Intelligent movement pattern learning
- Real-time anomaly detection (impossible speeds, erratic patterns)
- Anti-spoofing measures (accuracy analysis, technical validation)
- Location-based authentication challenges
- Route deviation detection

### Network Security
- Distributed mesh architecture prevents single points of failure
- Authenticated API token communication between nodes
- Automatic failover and emergency escalation
- Real-time health monitoring with 1-second heartbeats
- Graduated response system (PIN challenge → Emergency alerts)

### Emergency Response
- Emergency document distribution via email
- SMS and voice call alerts via Twilio
- Location tracking and phone alerts with TTS coordinates
- System lockdown on trigger
- Immediate escalation on network compromise

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
DOCUMENT_PATH=/path/to/document.txt
NEXT_PUBLIC_SALT=your-unique-salt-key

# Twilio Services (Required for alerts)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
EMERGENCY_CONTACT_PHONE=+1234567890

# Mesh Network Configuration (Required for production)
MESH_NODE_1_URL=https://node1.yourdomain.com
MESH_NODE_1_TOKEN=secure-api-token-1
MESH_NODE_2_URL=https://node2.yourdomain.com  
MESH_NODE_2_TOKEN=secure-api-token-2
MESH_NODE_3_URL=https://node3.yourdomain.com
MESH_NODE_3_TOKEN=secure-api-token-3

# Optional Services
GOOGLE_GEOLOCATION_API_KEY=your-google-api-key
ALERT_PHONE_NUMBER=999
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

## Mesh Network Deployment

For production deployment, set up 3 or more instances of the application across different servers/providers:

1. **Deploy to multiple servers**: Use different hosting providers for maximum redundancy
2. **Configure unique tokens**: Generate secure API tokens for each node
3. **Set up DNS**: Configure stable domain names for each node
4. **Initialize mesh**: Each instance will automatically join the mesh network on startup
5. **Monitor status**: Check `/api/mesh/status` endpoint for network health

### Mesh Network Behavior

- **3+ Nodes Online**: System fully armed and operational
- **2 Nodes Online**: System disarmed, triggers PIN challenges for users  
- **1 Node Online**: Critical state, immediate emergency alerts sent
- **0 Nodes Online**: All emergency protocols activated

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SMTP_HOST` | Email server hostname | Yes |
| `SMTP_PORT` | Email server port | Yes |
| `SMTP_USER` | Email username | Yes |
| `SMTP_PASS` | Email password/app password | Yes |
| `EMAIL_DISTRIBUTION_LIST` | Comma-separated email list | Yes |
| `MASTER_PASSWORD_HASH` | SHA-256 hash of password | Yes |
| `DOCUMENT_PATH` | Path to document | Yes |
| `NEXT_PUBLIC_SALT` | Salt for password hashing | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Yes* |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Yes* |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Yes* |
| `EMERGENCY_CONTACT_PHONE` | Emergency contact number | Yes* |
| `MESH_NODE_1_URL` | First mesh node URL | Yes* |
| `MESH_NODE_1_TOKEN` | First mesh node API token | Yes* |
| `MESH_NODE_2_URL` | Second mesh node URL | Yes* |
| `MESH_NODE_2_TOKEN` | Second mesh node API token | Yes* |
| `MESH_NODE_3_URL` | Third mesh node URL | Yes* |
| `MESH_NODE_3_TOKEN` | Third mesh node API token | Yes* |
| `GOOGLE_GEOLOCATION_API_KEY` | Google Geolocation API key | No |
| `ALERT_PHONE_NUMBER` | Legacy alert number | No |

*Required for full production operation

## License

This project is provided as-is for educational and legitimate security purposes only.