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

### 5. Emergency Document Setup

#### Document Configuration
```bash
# Create emergency document directory
mkdir -p /secure/documents

# Create your emergency document (example)
cat > /secure/documents/document.txt << 'EOF'
EMERGENCY SECURITY PROTOCOL ACTIVATED

This message indicates that the Heartbeat security system has detected:
- Unauthorized access attempt
- Location anomaly requiring intervention  
- Mesh network compromise

Immediate Actions Required:
1. Verify user safety and location
2. Check for signs of coercion or duress
3. Contact emergency services if needed
4. Review system logs for security events

System Details:
- Timestamp: [GENERATED_AUTOMATICALLY]
- Location: [GPS_COORDINATES_IF_AVAILABLE]
- Trigger: [SPECIFIC_SECURITY_EVENT]

This is an automated security system. Treat all alerts seriously.
EOF

# Set DOCUMENT_PATH environment variable
echo "DOCUMENT_PATH=/secure/documents/document.txt" >> .env.local
```

### 6. Development Server Startup

#### Start Development Mode
```bash
npm run dev
```

#### Access Application
- **URL**: http://localhost:3000
- **Registration**: Complete user setup with location permissions
- **Testing**: Use browser dev tools to simulate location changes

#### Development Features
- **Hot reloading**: Automatic updates during development  
- **Console logging**: Detailed debug information
- **Mock mesh network**: Single-node operation for testing
- **Location simulation**: Manual coordinate input for testing

## Production Deployment Guide

### Multi-Node Deployment Strategy

#### Infrastructure Requirements
Deploy to **exactly 3 different hosting providers** to ensure maximum resilience:

**Recommended Provider Distribution**:
- **Node 1**: AWS (us-east-1) - Primary node with highest availability
- **Node 2**: Google Cloud (us-central1) - Secondary with different infrastructure
- **Node 3**: Microsoft Azure (East US) - Tertiary with different network backbone

**Alternative Providers**: DigitalOcean, Linode, Vultr, Heroku, Vercel

### Node 1 Deployment (AWS Example)

#### 1. AWS Setup
```bash
# Install AWS CLI and configure
aws configure
aws sts get-caller-identity  # Verify credentials

# Create EC2 instance or use Elastic Beanstalk
aws ec2 run-instances --image-id ami-0abcdef1234567890 --instance-type t3.medium
```

#### 2. Application Deployment
```bash
# Clone repository
git clone <repository-url>
cd heartbeat

# Install dependencies
npm ci --production

# Build application
npm run build

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with production values

# Start with PM2 for process management
npm install -g pm2
pm2 start npm --name "heartbeat-node1" -- start
pm2 startup  # Configure auto-restart
pm2 save
```

#### 3. Domain Configuration
```bash
# Configure DNS A record
# node1.yourdomain.com → [AWS_INSTANCE_IP]

# Install SSL certificate (Let's Encrypt recommended)
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d node1.yourdomain.com
```

### Node 2 Deployment (Google Cloud Example)

#### 1. Google Cloud Setup
```bash
# Install gcloud CLI
gcloud auth login
gcloud projects list

# Create Compute Engine instance
gcloud compute instances create heartbeat-node2 \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud
```

#### 2. Deploy and Configure
```bash
# SSH to instance
gcloud compute ssh heartbeat-node2 --zone=us-central1-a

# Same deployment steps as Node 1
git clone <repository-url>
cd heartbeat
npm ci --production
npm run build

# Configure unique environment variables
# MESH_NODE_2_URL=https://node2.yourdomain.com
# Different MESH_NODE_2_TOKEN from Node 1

pm2 start npm --name "heartbeat-node2" -- start
```

### Node 3 Deployment (Azure Example)

#### 1. Azure Setup
```bash
# Install Azure CLI
az login
az account list

# Create resource group and VM
az group create --name heartbeat-rg --location eastus
az vm create \
    --resource-group heartbeat-rg \
    --name heartbeat-node3 \
    --image Ubuntu2204 \
    --size Standard_B2s \
    --generate-ssh-keys
```

#### 2. Complete Deployment
```bash
# SSH to Azure VM
ssh azureuser@[AZURE_VM_IP]

# Deploy application (same process)
git clone <repository-url>
cd heartbeat
npm ci --production
npm run build
pm2 start npm --name "heartbeat-node3" -- start
```

### Mesh Network Initialization

#### 1. Configure Cross-Node Communication
Each node needs all other node URLs in its environment:

**Node 1 .env.local**:
```env
MESH_NODE_1_URL=https://node1.yourdomain.com
MESH_NODE_2_URL=https://node2.yourdomain.com  
MESH_NODE_3_URL=https://node3.yourdomain.com
```

**Node 2 & 3**: Same URLs, different tokens

#### 2. Start Mesh Network
```bash
# On each node, restart to initialize mesh
pm2 restart heartbeat-node1  # On Node 1
pm2 restart heartbeat-node2  # On Node 2  
pm2 restart heartbeat-node3  # On Node 3
```

#### 3. Verify Mesh Status
```bash
# Check mesh health on any node
curl https://node1.yourdomain.com/api/mesh/status
curl https://node2.yourdomain.com/api/mesh/status  
curl https://node3.yourdomain.com/api/mesh/status

# Expected response:
{
  "totalNodes": 3,
  "onlineNodes": 3,
  "systemStatus": "armed",
  "requiresUserAuthentication": false,
  "emergencyTriggered": false
}
```

### Production Build Process

#### 1. Build Optimization
```bash
# Production build with optimizations
npm run build

# Verify build output
ls -la .next/standalone  # Check for standalone build
ls -la .next/static      # Verify static assets
```

#### 2. Production Server Configuration
```bash
# Production startup script
npm start
# Or with PM2 for process management
pm2 start npm --name "heartbeat" -- start

# Monitor logs
pm2 logs heartbeat
tail -f /var/log/heartbeat.log
```

#### 3. Health Monitoring
```bash
# Set up basic health monitoring
curl -f http://localhost:3000/api/health || echo "Service down"

# Advanced monitoring with response time
curl -w "%{time_total}" -o /dev/null -s http://localhost:3000/api/mesh/status
```

## Advanced Configuration

### Post-Quantum Cryptography Setup

#### Enable Advanced Data Protection
```javascript
// Access the post-quantum crypto service (browser console or API)
import { postQuantumCrypto } from '/src/lib/postQuantumCrypto';

// Enable post-quantum protection
await postQuantumCrypto.enableAdvancedDataProtection();

// Verify activation
const securityInfo = await postQuantumCrypto.getSecurityInfo();
console.log('Crypto mode:', securityInfo.mode);  // Should be "advanced"
console.log('Algorithms:', securityInfo.algorithms);  // ["Kyber-768", "Dilithium-3", "Falcon-512"]
```

#### Post-Quantum Key Management
```javascript
// Export public keys for mesh communication
const publicKeys = await postQuantumCrypto.exportPublicKeys();
console.log('Kyber public key:', publicKeys.kyber);
console.log('Dilithium public key:', publicKeys.dilithium);
console.log('Falcon public key:', publicKeys.falcon);

// Generate quantum-safe tokens
const secureToken = await generateSecurePostQuantumToken();
console.log('512-bit quantum-safe token:', secureToken);  // 128 hex characters
```

### Location Monitoring Configuration

#### Fine-tune Anomaly Detection
```javascript
// Access location settings
const settings = {
  enabled: true,
  trackingInterval: 5,        // Seconds between location updates
  anomalyDetection: true,
  sensitivityLevel: 'medium', // 'low' | 'medium' | 'high' | 'maximum'
  learningPeriodDays: 30,     // Days to learn patterns
  pinChallengeThreshold: 0.5, // Confidence threshold for PIN challenges
  emergencyThreshold: 0.9     // Confidence threshold for emergency alerts
};
```

#### Location Data Management
```javascript
// View current location profile
const profile = await getUserLocationProfile('user-id');
console.log('Learning status:', profile.isLearningComplete);
console.log('Known locations:', profile.locationPatterns.length);
console.log('Known routes:', profile.routePatterns.length);

// Manual location pattern training
await addLocationPattern({
  name: 'Home',
  latitude: 40.7128,
  longitude: -74.0060,
  radius: 100,  // meters
  timeWindows: [{ start: 18, end: 8 }]  // 6 PM to 8 AM
});
```

### Mesh Network Management

#### Node Health Monitoring
```bash
# Real-time mesh status monitoring
watch -n 1 'curl -s https://node1.yourdomain.com/api/mesh/status | jq'

# Individual node diagnostics
curl https://node1.yourdomain.com/api/mesh/diagnostics
curl https://node2.yourdomain.com/api/mesh/diagnostics  
curl https://node3.yourdomain.com/api/mesh/diagnostics
```

#### Emergency Response Testing
```bash
# Test emergency email system (development only)
curl -X POST http://localhost:3000/api/send-alert \
  -H "Content-Type: application/json" \
  -d '{"reason":"test","priority":"low","details":{"test":true}}'

# Test SMS system (development only)  
curl -X POST http://localhost:3000/api/emergency-sms \
  -H "Content-Type: application/json" \
  -d '{"reason":"test","message":"Test SMS alert"}'

# Test voice call system (development only)
curl -X POST http://localhost:3000/api/emergency-call \
  -H "Content-Type: application/json" \
  -d '{"reason":"test","message":"Test voice alert"}'
```

## API Reference

### Core Endpoints

#### User Registration
```
POST /api/register-user
Content-Type: application/json

{
  "locationPermissionGranted": boolean
}

Response:
{
  "success": boolean,
  "userId": string,
  "message": string
}
```

#### Mesh Network Status
```
GET /api/mesh/status

Response:
{
  "totalNodes": number,
  "onlineNodes": number,
  "systemStatus": "armed" | "disarmed" | "critical",
  "requiresUserAuthentication": boolean,
  "emergencyTriggered": boolean,
  "nodes": Array<{
    "id": string,
    "url": string,
    "status": "online" | "offline" | "unreachable",
    "lastHeartbeat": number,
    "latency": number
  }>
}
```

#### Mesh Heartbeat (Internal)
```
POST /api/mesh/heartbeat
Authorization: Bearer <mesh-token>
Content-Type: application/json

Standard Mode:
{
  "nodeId": string,
  "signedData": {
    "data": string,
    "signature": ArrayBuffer,
    "timestamp": number
  },
  "cryptoMode": "ecc",
  "timestamp": number
}

Post-Quantum Mode:
{
  "nodeId": string,
  "statusData": string,
  "postQuantumSignature": {
    "signature": Uint8Array,
    "algorithm": "dilithium",
    "timestamp": number
  },
  "publicKeys": {
    "kyber": string,
    "dilithium": string,
    "falcon": string
  },
  "cryptoMode": "post-quantum",
  "timestamp": number
}
```

### Security Endpoints

#### Emergency Alert
```
POST /api/send-alert
Content-Type: application/json

{
  "reason": string,
  "priority": "low" | "medium" | "high" | "critical",
  "details": object,
  "location"?: {
    "latitude": number,
    "longitude": number
  }
}
```

#### PIN Challenge Verification
```
POST /api/verify-pin
Content-Type: application/json

{
  "userId": string,
  "challengeId": string,
  "pin": string
}

Response:
{
  "success": boolean,
  "message": string,
  "emergencyTriggered"?: boolean
}
```

## Troubleshooting Guide

### Common Issues

#### Mesh Network Not Connecting
1. **Check DNS resolution**:
   ```bash
   nslookup node1.yourdomain.com
   nslookup node2.yourdomain.com
   nslookup node3.yourdomain.com
   ```

2. **Verify SSL certificates**:
   ```bash
   curl -I https://node1.yourdomain.com
   curl -I https://node2.yourdomain.com
   curl -I https://node3.yourdomain.com
   ```

3. **Check API token authentication**:
   ```bash
   curl -H "Authorization: Bearer $MESH_NODE_1_TOKEN" \
        https://node1.yourdomain.com/api/mesh/status
   ```

#### Location Services Not Working
1. **Check browser permissions**:
   - Navigate to browser settings → Privacy & Security → Location
   - Ensure site has location access granted

2. **Test geolocation API**:
   ```javascript
   navigator.geolocation.getCurrentPosition(
     position => console.log('Location:', position.coords),
     error => console.error('Location error:', error),
     { enableHighAccuracy: true, timeout: 10000 }
   );
   ```

3. **Verify location database**:
   ```javascript
   const profile = await getUserLocationProfile('your-user-id');
   console.log('Location tracking enabled:', profile.settings.enabled);
   ```

#### Emergency Alerts Not Sending
1. **Test SMTP configuration**:
   ```bash
   # Test SMTP connectivity
   telnet smtp.gmail.com 587
   # Should connect successfully
   ```

2. **Verify Twilio credentials**:
   ```bash
   # Test Twilio API
   curl -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID" \
        -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
   ```

3. **Check email distribution list**:
   ```javascript
   const emails = process.env.EMAIL_DISTRIBUTION_LIST.split(',');
   console.log('Alert recipients:', emails);
   ```

### Performance Optimization

#### Database Performance
- **Location history cleanup**: Implement periodic cleanup of old location data
- **Index optimization**: Add indexes for frequently queried location data
- **Batch operations**: Group location updates for better performance

#### Network Performance  
- **Heartbeat optimization**: Compress heartbeat payloads for bandwidth efficiency
- **CDN integration**: Use CDN for static assets to reduce server load
- **Connection pooling**: Implement HTTP connection reuse for mesh communications

#### Memory Management
- **Location data retention**: Limit historical data to prevent memory leaks
- **Garbage collection**: Regular cleanup of expired challenges and events
- **Cache optimization**: Implement intelligent caching for location patterns

## Security Considerations

### Threat Model

#### Protected Against
- **Physical coercion**: Location-based anomaly detection
- **Server takedowns**: Mesh network redundancy  
- **Credential theft**: One-strike password policy
- **Location spoofing**: Multi-source location verification
- **Network attacks**: Cryptographic authentication
- **Quantum computing**: Post-quantum cryptography option

#### Not Protected Against
- **Complete network isolation**: Requires internet connectivity
- **Simultaneous multi-provider outages**: Extremely low probability events
- **Physical device compromise**: Assumes trusted user device
- **Social engineering**: Depends on user following emergency protocols

### Operational Security

#### Regular Maintenance
- **Monthly token rotation**: Update mesh API tokens regularly
- **Certificate renewal**: Automate SSL certificate updates
- **Software updates**: Keep dependencies current for security patches
- **Backup testing**: Regularly test emergency alert systems

#### Monitoring and Logging
- **Audit logs**: Enable comprehensive logging for security events
- **Performance monitoring**: Track mesh network health and response times
- **Anomaly analysis**: Review false positive rates and adjust thresholds
- **Emergency response testing**: Monthly test of alert systems

### Privacy Protection

#### Data Minimization
- **Local storage**: Location data stored locally on user device
- **Encrypted transmission**: All mesh communications encrypted
- **Limited retention**: Automatic cleanup of old location data
- **User control**: Full user control over location tracking settings

#### Compliance Considerations
- **GDPR compliance**: User consent and data deletion capabilities
- **Data sovereignty**: Location data never leaves user's device
- **Audit trail**: Comprehensive logging for compliance requirements
- **Right to deletion**: User can clear all stored location data

## Testing and Quality Assurance

### Test Suite Overview
Heartbeat includes comprehensive unit and integration tests covering all security-critical functionality:

#### Test Categories
- **Unit Tests**: Individual function testing with 100% coverage requirement
- **Integration Tests**: End-to-end workflow testing 
- **Security Tests**: Cryptographic operation validation
- **Location Tests**: Anomaly detection algorithm verification
- **Mesh Network Tests**: Distributed system behavior validation

#### Running Tests
```bash
# Run all tests (must pass 100%)
npm test

# Run specific test suites  
npm test -- src/lib/__tests__/postQuantumCrypto.test.ts
npm test -- src/lib/__tests__/anomalyDetection.test.ts
npm test -- src/lib/__tests__/meshNetwork.test.ts

# Run tests with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

#### Test Requirements
- **100% pass rate**: All tests must pass before deployment
- **Security validation**: Cryptographic operations must validate correctly
- **Anomaly detection**: Location algorithms must detect test scenarios
- **Mesh resilience**: Network failure scenarios must trigger proper responses
- **Emergency protocols**: Alert systems must activate under test conditions

### Code Quality Standards

#### TypeScript Requirements
- **Strict mode enabled**: Full type safety enforcement
- **No any types**: Explicit typing for all functions and variables
- **Interface definitions**: Complete type definitions for all data structures
- **Generic constraints**: Proper type parameter constraints

#### Linting and Formatting
```bash
# Check code quality
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Type checking
npm run type-check  # If configured
```

## Important Notes and Warnings

### Security Warnings
- **This system is designed for legitimate personal security purposes only**
- **Never use for illegal surveillance or unauthorized monitoring**
- **Test all emergency systems before deploying in production**
- **Regularly verify emergency contact information and response procedures**
- **Ensure emergency documents contain accurate and helpful information**

### Operational Requirements
- **Internet connectivity required**: System cannot operate offline
- **Browser permissions essential**: Location access must be granted for full functionality  
- **Emergency contacts must be reliable**: Ensure 24/7 availability of emergency recipients
- **Document security**: Protect emergency documents from unauthorized access
- **Regular testing**: Monthly verification of all emergency alert systems

### Legal and Ethical Considerations
- **Obtain proper consent**: Ensure all monitored users consent to location tracking
- **Comply with local laws**: Location tracking laws vary by jurisdiction
- **Data protection**: Follow applicable privacy regulations (GDPR, CCPA, etc.)
- **Emergency services coordination**: Inform local emergency services if using automated alerts
- **Documentation requirements**: Maintain records for legal compliance

### Technical Limitations
- **Single device**: Designed for one primary user device
- **Browser dependency**: Requires modern browser with geolocation support
- **Network latency**: Mesh communication depends on internet connectivity quality
- **Location accuracy**: Limited by device GPS and network-based positioning accuracy
- **Battery impact**: Continuous location tracking may impact device battery life

## Support and Maintenance

### Monitoring Checklist
- [ ] **Daily**: Check mesh network status via `/api/mesh/status`
- [ ] **Weekly**: Verify all emergency alert systems function correctly
- [ ] **Monthly**: Test complete emergency response workflow
- [ ] **Quarterly**: Rotate mesh network API tokens
- [ ] **Annually**: Review and update emergency contacts and procedures

### Log Analysis
```bash
# Monitor application logs
tail -f logs/heartbeat.log

# Monitor mesh network communications
grep "mesh" logs/heartbeat.log | tail -50

# Monitor security events  
grep -E "(anomaly|emergency|challenge)" logs/heartbeat.log | tail -20

# Monitor performance metrics
grep "latency\|response_time" logs/heartbeat.log | tail -10
```

### Backup and Recovery
- **Configuration backup**: Regularly backup `.env.local` file securely
- **Document backup**: Maintain copies of emergency documents
- **Key backup**: Securely store mesh network tokens offline
- **Recovery procedures**: Documented steps for system restoration
- **Test recovery**: Regularly test backup and recovery procedures

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