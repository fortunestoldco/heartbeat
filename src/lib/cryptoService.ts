interface ECCKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

interface SignedData {
  data: string;
  signature: ArrayBuffer;
  timestamp: number;
}

class ECCCryptoService {
  private keyPair: ECCKeyPair | null = null;

  async generateKeyPair(): Promise<ECCKeyPair> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDSA',
          namedCurve: 'P-384'
        },
        true, // extractable
        ['sign', 'verify']
      );

      this.keyPair = {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      };

      console.log('ECC P-384 key pair generated successfully');
      return this.keyPair;
    } catch (error) {
      console.error('Failed to generate ECC key pair:', error);
      throw new Error('ECC key generation failed');
    }
  }

  async signData(data: string): Promise<SignedData> {
    if (!this.keyPair) {
      await this.generateKeyPair();
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const signature = await crypto.subtle.sign(
        {
          name: 'ECDSA',
          hash: 'SHA-384'
        },
        this.keyPair!.privateKey,
        dataBuffer
      );

      return {
        data,
        signature,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to sign data:', error);
      throw new Error('Data signing failed');
    }
  }

  async verifySignature(signedData: SignedData, publicKeyData?: CryptoKey): Promise<boolean> {
    try {
      const publicKey = publicKeyData || this.keyPair?.publicKey;
      
      if (!publicKey) {
        throw new Error('No public key available for verification');
      }

      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(signedData.data);

      const isValid = await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-384'
        },
        publicKey,
        signedData.signature,
        dataBuffer
      );

      return isValid;
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return false;
    }
  }

  async exportPublicKey(): Promise<string> {
    if (!this.keyPair) {
      await this.generateKeyPair();
    }

    try {
      const exported = await crypto.subtle.exportKey('spki', this.keyPair!.publicKey);
      const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
      return base64;
    } catch (error) {
      console.error('Failed to export public key:', error);
      throw new Error('Public key export failed');
    }
  }

  async importPublicKey(base64Key: string): Promise<CryptoKey> {
    try {
      const binaryString = atob(base64Key);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const publicKey = await crypto.subtle.importKey(
        'spki',
        bytes.buffer,
        {
          name: 'ECDSA',
          namedCurve: 'P-384'
        },
        true,
        ['verify']
      );

      return publicKey;
    } catch (error) {
      console.error('Failed to import public key:', error);
      throw new Error('Public key import failed');
    }
  }

  async secureHash(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      const hashBuffer = await crypto.subtle.digest('SHA-384', dataBuffer);
      const hashArray = new Uint8Array(hashBuffer);
      
      return Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Failed to hash data:', error);
      throw new Error('Secure hashing failed');
    }
  }

  async generateSecureToken(): Promise<string> {
    try {
      const tokenBytes = new Uint8Array(48); // 384 bits
      crypto.getRandomValues(tokenBytes);
      
      return Array.from(tokenBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Failed to generate secure token:', error);
      throw new Error('Token generation failed');
    }
  }

  getKeyInfo(): { curve: string; keySize: number; algorithm: string } | null {
    if (!this.keyPair) {
      return null;
    }

    return {
      curve: 'P-384',
      keySize: 384,
      algorithm: 'ECDSA'
    };
  }
}

export const eccCrypto = new ECCCryptoService();

// Convenience functions
export async function signMeshHeartbeat(nodeId: string, status: any): Promise<SignedData> {
  const data = JSON.stringify({ nodeId, status, timestamp: Date.now() });
  return eccCrypto.signData(data);
}

export async function verifyMeshHeartbeat(signedData: SignedData, publicKey: CryptoKey): Promise<boolean> {
  return eccCrypto.verifySignature(signedData, publicKey);
}

export async function generateSecureApiToken(): Promise<string> {
  return eccCrypto.generateSecureToken();
}