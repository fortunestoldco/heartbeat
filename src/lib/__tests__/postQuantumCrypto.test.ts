import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  postQuantumCrypto, 
  encryptMeshMessage, 
  decryptMeshMessage,
  generateSecurePostQuantumToken 
} from '../postQuantumCrypto';

describe('PostQuantumCryptoService', () => {
  beforeEach(async () => {
    await postQuantumCrypto.disableAdvancedDataProtection();
  });

  afterEach(async () => {
    await postQuantumCrypto.disableAdvancedDataProtection();
  });

  describe('Advanced Data Protection Mode', () => {
    it('should start disabled', () => {
      expect(postQuantumCrypto.isAdvancedModeEnabled()).toBe(false);
    });

    it('should enable advanced data protection', async () => {
      await postQuantumCrypto.enableAdvancedDataProtection();
      expect(postQuantumCrypto.isAdvancedModeEnabled()).toBe(true);
    });

    it('should disable advanced data protection', async () => {
      await postQuantumCrypto.enableAdvancedDataProtection();
      await postQuantumCrypto.disableAdvancedDataProtection();
      expect(postQuantumCrypto.isAdvancedModeEnabled()).toBe(false);
    });
  });

  describe('Kyber Key Encapsulation', () => {
    beforeEach(async () => {
      await postQuantumCrypto.enableAdvancedDataProtection();
    });

    it('should generate Kyber key pair', async () => {
      const keyPair = await postQuantumCrypto.generateKyberKeyPair();
      
      expect(keyPair.algorithm).toBe('kyber');
      expect(keyPair.keySize).toBe(768);
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBeGreaterThan(0);
      expect(keyPair.privateKey.length).toBeGreaterThan(0);
    });

    it('should encapsulate and decapsulate secrets', async () => {
      const keyPair = await postQuantumCrypto.generateKyberKeyPair();
      
      const encapsulation = await postQuantumCrypto.encapsulateSecret(keyPair.publicKey);
      expect(encapsulation.ciphertext).toBeInstanceOf(Uint8Array);
      expect(encapsulation.sharedSecret).toBeInstanceOf(Uint8Array);
      
      const decapsulatedSecret = await postQuantumCrypto.decapsulateSecret(encapsulation.ciphertext);
      expect(decapsulatedSecret).toEqual(encapsulation.sharedSecret);
    });

    it('should fail encapsulation when not in advanced mode', async () => {
      await postQuantumCrypto.disableAdvancedDataProtection();
      const mockPublicKey = new Uint8Array(32);
      
      await expect(postQuantumCrypto.encapsulateSecret(mockPublicKey))
        .rejects.toThrow('Advanced data protection not enabled');
    });
  });

  describe('Dilithium Digital Signatures', () => {
    beforeEach(async () => {
      await postQuantumCrypto.enableAdvancedDataProtection();
    });

    it('should generate Dilithium key pair', async () => {
      const keyPair = await postQuantumCrypto.generateDilithiumKeyPair();
      
      expect(keyPair.algorithm).toBe('dilithium');
      expect(keyPair.keySize).toBe(65);
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
    });

    it('should sign and verify data with Dilithium', async () => {
      const keyPair = await postQuantumCrypto.generateDilithiumKeyPair();
      const testData = new TextEncoder().encode('test message for signing');
      
      const signature = await postQuantumCrypto.signWithDilithium(testData);
      expect(signature.algorithm).toBe('dilithium');
      expect(signature.signature).toBeInstanceOf(Uint8Array);
      expect(signature.timestamp).toBeGreaterThan(0);
      
      const isValid = await postQuantumCrypto.verifyDilithiumSignature(
        testData, 
        signature, 
        keyPair.publicKey
      );
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong public key', async () => {
      await postQuantumCrypto.generateDilithiumKeyPair();
      const testData = new TextEncoder().encode('test message');
      const signature = await postQuantumCrypto.signWithDilithium(testData);
      
      const wrongPublicKey = new Uint8Array(signature.signature.length);
      crypto.getRandomValues(wrongPublicKey);
      
      const isValid = await postQuantumCrypto.verifyDilithiumSignature(
        testData, 
        signature, 
        wrongPublicKey
      );
      expect(isValid).toBe(false);
    });
  });

  describe('Falcon Signatures', () => {
    beforeEach(async () => {
      await postQuantumCrypto.enableAdvancedDataProtection();
    });

    it('should generate Falcon key pair', async () => {
      const keyPair = await postQuantumCrypto.generateFalconKeyPair();
      
      expect(keyPair.algorithm).toBe('falcon');
      expect(keyPair.keySize).toBe(512);
      expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keyPair.publicKey.length).toBe(897);
      expect(keyPair.privateKey.length).toBe(1281);
    });

    it('should sign and verify data with Falcon', async () => {
      const keyPair = await postQuantumCrypto.generateFalconKeyPair();
      const testData = new TextEncoder().encode('test message for falcon signing');
      
      const signature = await postQuantumCrypto.signWithFalcon(testData);
      expect(signature.algorithm).toBe('falcon');
      expect(signature.signature).toBeInstanceOf(Uint8Array);
      expect(signature.signature.length).toBe(690);
      
      const isValid = await postQuantumCrypto.verifyFalconSignature(
        testData, 
        signature, 
        keyPair.publicKey
      );
      expect(isValid).toBe(true);
    });
  });

  describe('Hybrid Encryption', () => {
    beforeEach(async () => {
      await postQuantumCrypto.enableAdvancedDataProtection();
    });

    it('should encrypt and decrypt data without recipient key', async () => {
      const testData = 'sensitive information to protect';
      
      const encrypted = await postQuantumCrypto.encryptData(testData);
      expect(encrypted.encryptedData).toBeInstanceOf(Uint8Array);
      expect(encrypted.signature.algorithm).toBe('dilithium');
      expect(encrypted.encapsulation).toBeUndefined();
      
      const dilithiumKeyPair = await postQuantumCrypto.generateDilithiumKeyPair();
      const decrypted = await postQuantumCrypto.decryptData(
        encrypted.encryptedData,
        encrypted.signature,
        dilithiumKeyPair.publicKey
      );
      expect(decrypted).toBe(testData);
    });

    it('should encrypt and decrypt data with recipient key', async () => {
      const testData = 'secret mesh message';
      const kyberKeyPair = await postQuantumCrypto.generateKyberKeyPair();
      
      const encrypted = await postQuantumCrypto.encryptData(testData, kyberKeyPair.publicKey);
      expect(encrypted.encryptedData).toBeInstanceOf(Uint8Array);
      expect(encrypted.signature.algorithm).toBe('dilithium');
      expect(encrypted.encapsulation).toBeDefined();
      
      const dilithiumKeyPair = await postQuantumCrypto.generateDilithiumKeyPair();
      const decrypted = await postQuantumCrypto.decryptData(
        encrypted.encryptedData,
        encrypted.signature,
        dilithiumKeyPair.publicKey,
        encrypted.encapsulation
      );
      expect(decrypted).toBe(testData);
    });

    it('should fail decryption with invalid signature', async () => {
      const testData = 'test data';
      const encrypted = await postQuantumCrypto.encryptData(testData);
      
      const wrongPublicKey = new Uint8Array(100); // Wrong size to trigger verification failure
      crypto.getRandomValues(wrongPublicKey);
      
      await expect(postQuantumCrypto.decryptData(
        encrypted.encryptedData,
        encrypted.signature,
        wrongPublicKey
      )).rejects.toThrow('Invalid signature - data may be tampered');
    });
  });

  describe('Public Key Export', () => {
    beforeEach(async () => {
      await postQuantumCrypto.enableAdvancedDataProtection();
    });

    it('should export all public keys', async () => {
      const publicKeys = await postQuantumCrypto.exportPublicKeys();
      
      expect(typeof publicKeys.kyber).toBe('string');
      expect(typeof publicKeys.dilithium).toBe('string');
      expect(typeof publicKeys.falcon).toBe('string');
      expect(publicKeys.kyber.length).toBeGreaterThan(0);
      expect(publicKeys.dilithium.length).toBeGreaterThan(0);
      expect(publicKeys.falcon.length).toBeGreaterThan(0);
    });

    it('should fail export when not fully initialized', async () => {
      await postQuantumCrypto.disableAdvancedDataProtection();
      
      await expect(postQuantumCrypto.exportPublicKeys())
        .rejects.toThrow('Advanced data protection not fully initialized');
    });
  });

  describe('Security Info', () => {
    it('should return standard mode info when disabled', async () => {
      const info = await postQuantumCrypto.getSecurityInfo();
      
      expect(info.mode).toBe('standard');
      expect(info.algorithms).toEqual(['ECC P-384', 'SHA-384']);
      expect(info.keyInfo.curve).toBe('P-384');
    });

    it('should return advanced mode info when enabled', async () => {
      await postQuantumCrypto.enableAdvancedDataProtection();
      const info = await postQuantumCrypto.getSecurityInfo();
      
      expect(info.mode).toBe('advanced');
      expect(info.algorithms).toEqual(['Kyber-768', 'Dilithium-3', 'Falcon-512']);
      expect(info.keyInfo.kyber).toBeDefined();
      expect(info.keyInfo.dilithium).toBeDefined();
      expect(info.keyInfo.falcon).toBeDefined();
    });
  });
});

describe('Mesh Communication Functions', () => {
  beforeEach(async () => {
    await postQuantumCrypto.enableAdvancedDataProtection();
  });

  afterEach(async () => {
    await postQuantumCrypto.disableAdvancedDataProtection();
  });

  it('should encrypt and decrypt mesh messages', async () => {
    const message = 'secure mesh heartbeat data';
    const kyberKeyPair = await postQuantumCrypto.generateKyberKeyPair();
    
    const encrypted = await encryptMeshMessage(message, kyberKeyPair.publicKey);
    expect(encrypted.encryptedData).toBeInstanceOf(Uint8Array);
    expect(encrypted.encapsulation).toBeDefined();
    expect(encrypted.signature.algorithm).toBe('dilithium');
    
    const dilithiumKeyPair = await postQuantumCrypto.generateDilithiumKeyPair();
    const decrypted = await decryptMeshMessage(
      encrypted.encryptedData,
      encrypted.signature,
      dilithiumKeyPair.publicKey,
      encrypted.encapsulation
    );
    expect(decrypted).toBe(message);
  });

  it('should generate secure post-quantum tokens', async () => {
    const token1 = await generateSecurePostQuantumToken();
    const token2 = await generateSecurePostQuantumToken();
    
    expect(typeof token1).toBe('string');
    expect(typeof token2).toBe('string');
    expect(token1.length).toBe(128); // 64 bytes * 2 hex chars
    expect(token2.length).toBe(128);
    expect(token1).not.toBe(token2);
    expect(/^[a-f0-9]+$/i.test(token1)).toBe(true);
  });
});