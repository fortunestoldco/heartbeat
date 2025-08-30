require('@testing-library/jest-dom')

// Mock environment variables
process.env.NEXT_PUBLIC_SALT = 'test-salt-key'
process.env.MASTER_PASSWORD_HASH = 'test-hash'
process.env.DOCUMENT_PATH = '/tmp/document.txt'
process.env.SMTP_HOST = 'test-smtp.com'
process.env.SMTP_PORT = '587'
process.env.SMTP_USER = 'test@test.com'
process.env.SMTP_PASS = 'test-pass'
process.env.EMAIL_DISTRIBUTION_LIST = 'test1@test.com,test2@test.com'
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid'
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token'
process.env.TWILIO_PHONE_NUMBER = '+1234567890'
process.env.EMERGENCY_CONTACT_PHONE = '+1987654321'

// Mock global fetch
global.fetch = jest.fn()

// Mock geolocation
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
  },
  writable: true,
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock crypto for Node.js environment
const mockCrypto = {
  subtle: {
    generateKey: jest.fn().mockResolvedValue({
      publicKey: { algorithm: { name: 'ECDSA', namedCurve: 'P-384' } },
      privateKey: { algorithm: { name: 'ECDSA', namedCurve: 'P-384' } }
    }),
    sign: jest.fn().mockResolvedValue(new ArrayBuffer(48)),
    verify: jest.fn().mockResolvedValue(true),
    digest: jest.fn().mockResolvedValue(new ArrayBuffer(48)),
    exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(48)),
    importKey: jest.fn().mockResolvedValue({ algorithm: { name: 'ECDSA', namedCurve: 'P-384' } })
  },
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  }
}

if (!global.crypto) {
  global.crypto = mockCrypto
} else {
  // Ensure crypto.subtle exists even if crypto is defined
  global.crypto.subtle = global.crypto.subtle || mockCrypto.subtle
  global.crypto.getRandomValues = global.crypto.getRandomValues || mockCrypto.getRandomValues
}

// Mock @noble/post-quantum library
jest.mock('@noble/post-quantum/ml-kem', () => ({
  ml_kem768: {
    keygen: jest.fn(() => ({
      publicKey: new Uint8Array(1184),
      secretKey: new Uint8Array(2400)
    })),
    encaps: jest.fn((publicKey) => ({
      ciphertext: new Uint8Array(1088),
      sharedSecret: new Uint8Array(32)
    })),
    decaps: jest.fn((ciphertext, secretKey) => new Uint8Array(32))
  }
}))

jest.mock('@noble/post-quantum/ml-dsa', () => ({
  ml_dsa65: {
    keygen: jest.fn(() => ({
      publicKey: new Uint8Array(1952),
      secretKey: new Uint8Array(4032)
    })),
    sign: jest.fn((secretKey, message) => new Uint8Array(3309)),
    verify: jest.fn((publicKey, message, signature) => {
      // Realistic verification: check if key and signature have expected properties
      return publicKey && publicKey.length === 1952 && signature && signature.length === 3309
    })
  }
}))

// Mock TextEncoder and TextDecoder
if (!global.TextEncoder) {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      return new Uint8Array(str.split('').map(c => c.charCodeAt(0)))
    }
  }
}

if (!global.TextDecoder) {
  global.TextDecoder = class TextDecoder {
    decode(bytes) {
      return String.fromCharCode(...bytes)
    }
  }
}

// Mock btoa and atob
if (!global.btoa) {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64')
}

if (!global.atob) {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary')
}