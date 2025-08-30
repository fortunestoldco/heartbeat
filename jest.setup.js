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
if (!global.crypto) {
  const nodeCrypto = require('crypto')
  global.crypto = {
    subtle: nodeCrypto.webcrypto?.subtle || {
      generateKey: jest.fn().mockResolvedValue({
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key'
      }),
      sign: jest.fn().mockResolvedValue(new ArrayBuffer(48)),
      verify: jest.fn().mockResolvedValue(true),
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(48)),
      exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(48)),
      importKey: jest.fn().mockResolvedValue('mock-imported-key')
    },
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  }
}