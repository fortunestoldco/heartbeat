# Heartbeat

A comprehensive Next.js personal security application that uses mesh networking to verify user location and requires password entry for any deviation from normal patterns. A pre-configured document is automatically distributed based on user location when security protocols are triggered. The system provides identical responses for both correct and incorrect PIN entries to avoid giving any indication that the security tool has been activated.

## 🔐 Quantum-Ready Cryptography

Heartbeat features **dual-mode cryptographic protection** to ensure security against both classical and quantum computing threats:

### Standard Mode (Default)
- **ECC P-384**: Elliptic Curve Cryptography with 384-bit keys
- **SHA-384**: Secure Hash Algorithm for data integrity
- **ECDSA**: Digital signatures with P-384 curve
- **384-bit tokens**: Cryptographically secure random token generation
- **Current protection**: Strong against classical computing attacks

### Advanced Data Protection Mode
When enabled, all cryptographic operations switch to **NIST-standardized post-quantum algorithms**:

#### Key Encapsulation Mechanism (KEM)
- **Kyber-768 (ML-KEM-768)**: NIST-standardized lattice-based encryption
- **1184-byte public keys**, **2400-byte private keys**
- **32-byte shared secrets** for symmetric encryption
- **Quantum-resistant**: Secure against Shor's algorithm

#### Digital Signatures
- **Dilithium-3 (ML-DSA-65)**: Primary signature algorithm
  - **1952-byte public keys**, **4032-byte private keys**
  - **3309-byte signatures**
  - **128-bit security level** (equivalent to AES-128)
- **Falcon-512**: Backup signature algorithm
  - **897-byte public keys**, **1281-byte private keys** 
  - **690-byte signatures**
  - **Compact signatures** for bandwidth-constrained environments

#### Hybrid Encryption Workflow
1. **Key Generation**: All three algorithms generate key pairs simultaneously
2. **Message Encryption**:
   - Kyber encapsulates a random shared secret
   - Shared secret encrypts the actual message data
   - Dilithium signs the encrypted payload
   - Falcon provides backup signature capability
3. **Message Decryption**:
   - Dilithium signature verified first (authentication)
   - Kyber decapsulates the shared secret
   - Shared secret decrypts the message data
   - Full cryptographic chain validation

#### Mesh Network Integration
- **Post-quantum heartbeats**: All mesh communications use Dilithium signatures
- **Authenticated channels**: Kyber key exchange for each mesh connection
- **Fallback protection**: ECC P-384 backup if post-quantum operations fail
- **Real-time switching**: Seamless transition between crypto modes

## Features

### Core Security
- **Dual Daily Check-ins**: Required at 12:00 AM and 12:00 PM
- **Countdown Timer**: Real-time display of time remaining until next deadline
- **Secure Password Verification**: Encrypted password storage and verification
- **Emergency Alert System**: Automatic email notifications when failsafe is triggered
- **Location-Based Alerts**: Optional phone alerts with GPS coordinates (Twilio + Google Geolocation)

### Intelligent Location Monitoring

#### Learning Engine (30-Day Adaptive Period)
- **Location Pattern Recognition**: Builds mathematical models of user's frequent locations
  - **Gaussian clustering** of visited coordinates with confidence intervals
  - **Time-based location mapping** (e.g., home at night, work during day)
  - **Route corridor analysis** with deviation tolerance calculations
  - **Location familiarity scoring** using visit frequency and duration
- **Movement Analysis**: Real-time kinematic monitoring
  - **Speed pattern recognition**: Normal walking/driving/transit speeds for the user
  - **Acceleration analysis**: Detects sudden movement changes indicating potential coercion
  - **Route consistency**: Compares current path against historical route patterns
  - **Temporal movement patterns**: Time-of-day movement expectations

#### Anomaly Detection Algorithms
- **Location-based Anomalies**:
  - **Distance-from-known-locations**: Calculates minimum distance to any learned location
  - **Time-inappropriate locations**: Being at work at 3 AM, being at home during work hours
  - **Impossible movement**: Teleportation detection (>500km in <1 hour)
  - **Location accuracy analysis**: Detects GPS spoofing via accuracy degradation
- **Movement-based Anomalies**:
  - **Erratic movement patterns**: Rapid direction changes, looping, unusual stops
  - **Speed anomalies**: Sustained impossible speeds for detected transport mode
  - **Route deviation**: Significant departure from known route corridors
  - **Consecutive high-speed alerts**: Multiple speed violations in short timeframes

#### Real-time Processing
- **1-second location updates** when movement detected
- **Multi-factor anomaly scoring**: Combines location, temporal, movement, and technical factors
- **Confidence thresholds**: Low (0.3), Medium (0.5), High (0.7), Critical (0.9)
- **Graduated response system**:
  - **Low confidence**: Logging only
  - **Medium confidence**: Background monitoring increase
  - **High confidence**: PIN challenge required (10-minute timeout)
  - **Critical confidence**: Immediate emergency protocol activation

#### Anti-Spoofing Measures
- **Location source prioritization**: WiFi > Cell > GPS (ascending spoof difficulty)
- **Accuracy degradation detection**: Sudden drops in location accuracy
- **Technical validation**: Checks for impossible location updates
- **Cross-validation**: Multiple location sources when available
- **Velocity validation**: Compares reported movement with physical constraints

### Mesh Network Redundancy

#### Distributed Architecture Requirements
- **Minimum 3 server instances** required for full operational security
- **Different hosting providers** mandatory (AWS + Google Cloud + Azure, etc.)
- **Geographic distribution** recommended for maximum resilience
- **Independent infrastructure** to prevent correlated failures

#### Mesh Communication Protocol
- **1-second heartbeat intervals** between all nodes
- **3-second timeout** for heartbeat responses
- **Cryptographic authentication**: Every heartbeat signed with ECC P-384 or Dilithium
- **Mutual verification**: Bidirectional health monitoring
- **Status synchronization**: Real-time sharing of user states and security events

#### Graduated Failover System
- **3+ Nodes Online (ARMED)**:
  - System fully operational
  - All security features active
  - Normal operation mode
  - Location tracking and anomaly detection active
- **2 Nodes Online (DISARMED)**:
  - System enters degraded mode
  - **Automatic PIN challenges** issued to all users
  - **10-minute response timeout** for user authentication
  - **Failed authentication** → immediate emergency protocols
  - Location monitoring continues but system considered compromised
- **1 Node Online (CRITICAL)**:
  - **Immediate emergency activation**
  - **Email alerts** sent to distribution list
  - **SMS alerts** sent via Twilio
  - **Voice calls** with TTS location coordinates
  - **Document distribution** activated
  - System assumes hostile takeover in progress
- **0 Nodes Online (TOTAL FAILURE)**:
  - **All emergency protocols activated**
  - **Multiple communication channels** attempt contact
  - **Pre-positioned emergency contacts** notified
  - **Document distribution** via all available channels

#### Server Takedown Protection
- **Impossible to disable** all instances without triggering alerts
- **Real-time monitoring** prevents silent server shutdowns
- **Authenticated shutdown commands** required (prevents unauthorized shutdowns)
- **Cross-node verification** for legitimate maintenance
- **Emergency escalation** on unexpected node loss
- **Automatic recovery**: Nodes rejoin mesh automatically when restored

### User Interface
- **Responsive Design**: Clean, modern Material Design interface
- **Persistent State**: Tracks check-in history and system status
- **Real-time Notifications**: Live updates on system and location status

## Security Architecture

### Authentication & Password Security
- **Master Password System**:
  - **SHA-256 hashing** with user-specific salt
  - **One-strike policy**: Single incorrect password triggers immediate failsafe
  - **No password recovery**: System designed for permanent protection
  - **Salt storage**: Client-side salt prevents rainbow table attacks
- **PIN Challenge System**:
  - **10-minute timeout** for PIN entry
  - **Cryptographically secure** 6-digit PIN generation
  - **Automatic expiration**: Challenges expire to prevent replay attacks
  - **Anomaly-triggered**: Issued automatically by location anomaly detection
  - **Multi-attempt protection**: Multiple failed PINs trigger emergency protocols

### Location Security Implementation

#### Browser Geolocation Integration
- **High-accuracy positioning**: `enableHighAccuracy: true` for GPS precision
- **Real-time tracking**: Continuous monitoring when movement detected
- **Permission management**: Graceful handling of denied location access
- **Fallback mechanisms**: Multiple location source prioritization

#### Mathematical Anomaly Models
- **Haversine distance calculations** for precise geographic measurements
- **Gaussian distribution analysis** for location familiarity scoring
- **Time-series analysis** for movement pattern recognition
- **Velocity vector analysis** for movement direction and speed validation
- **Confidence interval calculations** for statistical anomaly detection

#### Database Schema (LocalStorage)
```typescript
interface LocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  source: 'wifi' | 'cell' | 'mixed' | 'gps';
  speed?: number;
  heading?: number;
}

interface UserLocationProfile {
  userId: string;
  learningStartDate: number;
  isLearningComplete: boolean;
  locationPatterns: LocationPattern[];
  routePatterns: RoutePattern[];
  movementProfile: MovementProfile;
  anomalyHistory: AnomalyEvent[];
}
```

### Network Security Protocol

#### Cryptographic Chain of Trust
- **Node identity verification**: SHA-384 hash-based node IDs from URLs
- **Message signing**: Every mesh communication cryptographically signed
- **Timestamp validation**: Prevents replay attacks with time-based validation
- **Token-based authentication**: Unique API tokens per mesh node
- **Public key distribution**: Secure exchange of verification keys

#### Mesh Network State Machine
```
INITIALIZATION → HEALTH_CHECK → STATUS_EVALUATION → ACTION_EXECUTION
     ↓               ↓              ↓                    ↓
Node Setup → Heartbeat Send → Count Online Nodes → Trigger Responses
     ↑               ↑              ↑                    ↑
     └─── CONTINUOUS MONITORING LOOP (1-second cycle) ────┘
```

#### Network Partition Handling
- **Split-brain prevention**: Nodes cannot operate independently without losing security
- **Quorum requirements**: Minimum 3 nodes prevents false consensus
- **Byzantine fault tolerance**: System secure against malicious node compromise
- **Automatic reintegration**: Nodes rejoin seamlessly when connectivity restored

### Emergency Response Protocols

#### Multi-Channel Alert System
- **Email Distribution**: 
  - **SMTP integration** with configurable mail servers
  - **HTML and text formats** for maximum compatibility
  - **Emergency document attachment** with critical information
  - **Delivery confirmation** tracking when possible
- **SMS Alerts via Twilio**:
  - **Immediate notification** with location coordinates
  - **Message threading** for conversation continuity
  - **Delivery status tracking** and retry logic
  - **International number support** for global deployment
- **Voice Call System**:
  - **Text-to-Speech (TTS)** coordinate readout
  - **Emergency contact calling** with pre-recorded messages
  - **Call logging** for audit trails
  - **Retry mechanisms** for failed calls

#### Location-Based Emergency Features
- **GPS coordinate extraction** from browser geolocation
- **Google Geolocation API** fallback for enhanced accuracy
- **Coordinate formatting**: Decimal degrees for emergency services
- **Map link generation**: Google Maps URLs in emergency communications
- **Address resolution**: Reverse geocoding when API keys available

#### Document Distribution System
- **Configurable document path**: Any file type supported
- **Automatic attachment**: Emergency documents sent with alerts
- **Multi-format support**: PDF, text, images, etc.
- **Version control**: Document timestamps for audit trails
- **Secure transmission**: Documents encrypted in transit

## Complete Setup Guide

### Prerequisites
- **Node.js 18+**: Required for Next.js 14.x compatibility
- **npm or yarn**: Package manager for dependency installation
- **3+ server instances**: Different hosting providers (AWS, Google Cloud, Azure, etc.)
- **SMTP email account**: Gmail App Passwords recommended for reliability
- **Twilio account**: Required for SMS and voice call functionality
- **Domain names**: Stable DNS for each mesh node (avoid IP addresses)

### 1. Installation

#### Clone and Install Dependencies
```bash
git clone <repository-url>
cd heartbeat
npm install
```

#### Verify Installation
```bash
npm run build  # Verify build succeeds
npm run lint   # Check code quality
npm test       # Run test suite (must pass 100%)
```

### 2. Environment Configuration

Create `.env.local` in the project root with the following configuration:
```env
# ============================================================================
# EMAIL CONFIGURATION (Required)
# ============================================================================
SMTP_HOST=smtp.gmail.com                    # Gmail SMTP server
SMTP_PORT=587                               # Standard SMTP port with STARTTLS
SMTP_USER=your-email@gmail.com              # Your Gmail address
SMTP_PASS=your-app-password                 # Gmail App Password (NOT regular password)
EMAIL_DISTRIBUTION_LIST=emergency@example.com,security@example.com,backup@example.com

# ============================================================================
# SECURITY CONFIGURATION (Required)
# ============================================================================
MASTER_PASSWORD_HASH=your-password-hash     # SHA-256 hash of your master password
DOCUMENT_PATH=/path/to/document.txt         # Path to emergency document (PDF/TXT/etc)
NEXT_PUBLIC_SALT=your-unique-salt-key       # Cryptographic salt for password hashing

# ============================================================================
# TWILIO SERVICES (Required for SMS/Voice Alerts)
# ============================================================================
TWILIO_ACCOUNT_SID=your-twilio-account-sid  # Twilio Account SID from console
TWILIO_AUTH_TOKEN=your-twilio-auth-token    # Twilio Auth Token from console  
TWILIO_PHONE_NUMBER=+1234567890             # Your Twilio phone number
EMERGENCY_CONTACT_PHONE=+1234567890         # Emergency contact to call/text

# ============================================================================
# MESH NETWORK CONFIGURATION (Required for Production)
# Deploy to exactly 3 different hosting providers for maximum security
# ============================================================================
MESH_NODE_1_URL=https://node1.yourdomain.com     # First mesh node (e.g., AWS)
MESH_NODE_1_TOKEN=secure-api-token-1              # Unique 384-bit token for node 1
MESH_NODE_2_URL=https://node2.yourdomain.com     # Second mesh node (e.g., Google Cloud)
MESH_NODE_2_TOKEN=secure-api-token-2              # Unique 384-bit token for node 2  
MESH_NODE_3_URL=https://node3.yourdomain.com     # Third mesh node (e.g., Azure)
MESH_NODE_3_TOKEN=secure-api-token-3              # Unique 384-bit token for node 3

# ============================================================================
# OPTIONAL SERVICES (Enhanced Features)
# ============================================================================
GOOGLE_GEOLOCATION_API_KEY=your-google-api-key   # For enhanced location accuracy
ALERT_PHONE_NUMBER=999                            # Legacy alert number (optional)
```

### 3. Password Hash Generation

#### Generate Your Master Password Hash
```javascript
// Method 1: Browser Console (Recommended)
const password = 'your-ultra-secure-master-password';
const salt = 'your-unique-salt-key';  // Same as NEXT_PUBLIC_SALT above
const hash = require('crypto').createHash('sha256').update(password + salt).digest('hex');
console.log('MASTER_PASSWORD_HASH:', hash);
```

```bash
# Method 2: Command Line (Alternative)
echo -n "your-passwordyour-salt" | shasum -a 256 | cut -d' ' -f1
```

#### Security Best Practices for Password
- **Minimum 20 characters** with mixed case, numbers, symbols
- **Unique password**: Never used elsewhere
- **Memorizable**: No digital storage of the actual password
- **Salt uniqueness**: Generate unique salt per installation
- **Hash verification**: Test hash before deployment

### 4. Mesh Network Token Generation

#### Generate Secure API Tokens
```javascript
// Generate 384-bit (48-byte) secure tokens for mesh authentication
const crypto = require('crypto');
for (let i = 1; i <= 3; i++) {
  const token = crypto.randomBytes(48).toString('hex');
  console.log(`MESH_NODE_${i}_TOKEN=${token}`);
}
```

#### Token Security Requirements
- **384-bit minimum**: Equivalent to ECC P-384 security level
- **Cryptographically random**: Use crypto.randomBytes() only
- **Unique per node**: Never reuse tokens across nodes
- **Secure storage**: Environment variables only, never in code
- **Regular rotation**: Monthly token rotation recommended

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