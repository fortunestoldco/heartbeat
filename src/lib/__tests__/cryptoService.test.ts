import { eccCrypto, signMeshHeartbeat, verifyMeshHeartbeat, generateSecureApiToken } from '../cryptoService';

describe('ECCCryptoService', () => {
  describe('generateKeyPair', () => {
    it('should generate P-384 ECC key pair', async () => {
      const keyPair = await eccCrypto.generateKeyPair();
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      
      const keyInfo = eccCrypto.getKeyInfo();
      expect(keyInfo?.curve).toBe('P-384');
      expect(keyInfo?.keySize).toBe(384);
      expect(keyInfo?.algorithm).toBe('ECDSA');
    });
  });

  describe('signData and verifySignature', () => {
    it('should sign and verify data correctly', async () => {
      const testData = 'test security data';
      
      const signedData = await eccCrypto.signData(testData);
      
      expect(signedData.data).toBe(testData);
      expect(signedData.signature).toBeDefined();
      expect(signedData.timestamp).toBeGreaterThan(0);
      
      const isValid = await eccCrypto.verifySignature(signedData);
      expect(isValid).toBe(true);
    });

    it('should fail verification for tampered data', async () => {
      const testData = 'original data';
      const signedData = await eccCrypto.signData(testData);
      
      // Tamper with the data
      signedData.data = 'tampered data';
      
      const isValid = await eccCrypto.verifySignature(signedData);
      expect(isValid).toBe(false);
    });
  });

  describe('secureHash', () => {
    it('should generate SHA-384 hash', async () => {
      const testData = 'test data for hashing';
      const hash = await eccCrypto.secureHash(testData);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(96); // SHA-384 produces 48 bytes = 96 hex chars
    });

    it('should produce consistent hashes', async () => {
      const testData = 'consistent data';
      const hash1 = await eccCrypto.secureHash(testData);
      const hash2 = await eccCrypto.secureHash(testData);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate 384-bit secure tokens', async () => {
      const token = await eccCrypto.generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(96); // 48 bytes = 96 hex chars = 384 bits
    });

    it('should generate unique tokens', async () => {
      const token1 = await eccCrypto.generateSecureToken();
      const token2 = await eccCrypto.generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('key import/export', () => {
    it('should export and import public keys', async () => {
      await eccCrypto.generateKeyPair();
      
      const exportedKey = await eccCrypto.exportPublicKey();
      expect(exportedKey).toBeDefined();
      expect(typeof exportedKey).toBe('string');
      
      const importedKey = await eccCrypto.importPublicKey(exportedKey);
      expect(importedKey).toBeDefined();
    });
  });
});

describe('Mesh Network Crypto Functions', () => {
  describe('signMeshHeartbeat', () => {
    it('should sign mesh heartbeat data', async () => {
      const nodeId = 'test-node-123';
      const status = { online: true, timestamp: Date.now() };
      
      const signedHeartbeat = await signMeshHeartbeat(nodeId, status);
      
      expect(signedHeartbeat.data).toContain(nodeId);
      expect(signedHeartbeat.signature).toBeDefined();
      expect(signedHeartbeat.timestamp).toBeGreaterThan(0);
    });
  });

  describe('generateSecureApiToken', () => {
    it('should generate secure API tokens for mesh communication', async () => {
      const token = await generateSecureApiToken();
      
      expect(token).toBeDefined();
      expect(token.length).toBe(96); // 384-bit token
      expect(token).toMatch(/^[a-f0-9]+$/); // Hex format
    });
  });
});