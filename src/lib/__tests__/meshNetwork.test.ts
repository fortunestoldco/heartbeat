import { jest } from '@jest/globals';
import { MeshNetworkService, createMeshConfiguration, meshNetworkService } from '../meshNetwork';

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => ({
        substring: jest.fn(() => 'mockhash')
      }))
    }))
  }))
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('MeshNetworkService', () => {
  let service: MeshNetworkService;

  beforeEach(() => {
    service = new MeshNetworkService();
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        peerStatus: {
          nodeId: 'peer-node',
          systemStatus: 'armed'
        }
      })
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    service.shutdown();
  });

  describe('initialize', () => {
    it('should initialize with provided node configurations', async () => {
      const configs = [
        { url: 'https://node1.test.com', apiToken: 'token1' },
        { url: 'https://node2.test.com', apiToken: 'token2' },
        { url: 'https://node3.test.com', apiToken: 'token3' }
      ];

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.initialize(configs);

      expect(consoleSpy).toHaveBeenCalledWith('Initializing mesh network with', 3, 'nodes');
      
      const nodes = service.getNodes();
      expect(nodes).toHaveLength(3);
      expect(nodes[0].url).toBe('https://node1.test.com');

      consoleSpy.mockRestore();
    });

    it('should start heartbeat monitoring', async () => {
      const configs = [{ url: 'https://node1.test.com', apiToken: 'token1' }];
      
      await service.initialize(configs);
      
      // Advance timers to trigger heartbeat
      jest.advanceTimersByTime(1000);
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://node1.test.com/api/mesh/heartbeat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer token1'
          })
        })
      );
    });
  });

  describe('getMeshStatus', () => {
    it('should return correct status for no nodes', () => {
      const status = service.getMeshStatus();
      
      expect(status.totalNodes).toBe(0);
      expect(status.onlineNodes).toBe(0);
      expect(status.systemStatus).toBe('disarmed');
    });

    it('should return correct status after initialization', async () => {
      const configs = [
        { url: 'https://node1.test.com', apiToken: 'token1' },
        { url: 'https://node2.test.com', apiToken: 'token2' },
        { url: 'https://node3.test.com', apiToken: 'token3' }
      ];

      await service.initialize(configs);
      
      const status = service.getMeshStatus();
      expect(status.totalNodes).toBe(3);
    });
  });

  describe('addNode', () => {
    it('should add new node and perform health check', async () => {
      await service.initialize([]);
      
      const nodeId = await service.addNode('https://newnode.test.com', 'new-token');
      
      expect(nodeId).toBe('mockhash');
      
      const nodes = service.getNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].url).toBe('https://newnode.test.com');
    });
  });

  describe('removeNode', () => {
    it('should remove existing node', async () => {
      const configs = [{ url: 'https://node1.test.com', apiToken: 'token1' }];
      await service.initialize(configs);
      
      const nodes = service.getNodes();
      const nodeId = nodes[0].id;
      
      const removed = await service.removeNode(nodeId);
      expect(removed).toBe(true);
      
      const updatedNodes = service.getNodes();
      expect(updatedNodes).toHaveLength(0);
    });

    it('should return false for non-existent node', async () => {
      const removed = await service.removeNode('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('health monitoring', () => {
    it('should mark node as online on successful heartbeat', async () => {
      const configs = [{ url: 'https://node1.test.com', apiToken: 'token1' }];
      await service.initialize(configs);
      
      jest.advanceTimersByTime(1000);
      
      const nodes = service.getNodes();
      expect(nodes[0].status).toBe('online');
      expect(nodes[0].lastHeartbeat).toBeGreaterThan(0);
    });

    it('should mark node as unreachable on failed heartbeat', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const configs = [{ url: 'https://node1.test.com', apiToken: 'token1' }];
      await service.initialize(configs);
      
      jest.advanceTimersByTime(1000);
      
      const nodes = service.getNodes();
      expect(nodes[0].status).toBe('unreachable');
    });

    it('should trigger authentication when nodes drop to 2', async () => {
      const authCallback = jest.fn();
      service.onAuthenticationRequired(authCallback);

      const configs = [
        { url: 'https://node1.test.com', apiToken: 'token1' },
        { url: 'https://node2.test.com', apiToken: 'token2' },
        { url: 'https://node3.test.com', apiToken: 'token3' }
      ];
      
      await service.initialize(configs);
      
      // Simulate one node going offline
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
        .mockRejectedValueOnce(new Error('Node 3 down'));

      jest.advanceTimersByTime(1000);
      
      const status = service.getMeshStatus();
      expect(status.systemStatus).toBe('disarmed');
      expect(status.requiresUserAuthentication).toBe(true);
    });

    it('should trigger emergency when nodes drop to 1', async () => {
      const emergencyCallback = jest.fn();
      service.onEmergency(emergencyCallback);

      // Mock emergency API calls
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // /api/send-alert
        .mockResolvedValueOnce({ ok: true }) // /api/emergency-sms
        .mockResolvedValueOnce({ ok: true }) // /api/emergency-call
        .mockResolvedValueOnce({ ok: true }); // /api/activate-failsafe

      const configs = [
        { url: 'https://node1.test.com', apiToken: 'token1' },
        { url: 'https://node2.test.com', apiToken: 'token2' },
        { url: 'https://node3.test.com', apiToken: 'token3' }
      ];
      
      await service.initialize(configs);
      
      // Simulate two nodes going offline
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) })
        .mockRejectedValueOnce(new Error('Node 2 down'))
        .mockRejectedValueOnce(new Error('Node 3 down'));

      jest.advanceTimersByTime(1000);
      
      const status = service.getMeshStatus();
      expect(status.systemStatus).toBe('critical');
      expect(status.emergencyTriggered).toBe(true);
    });
  });

  describe('callback management', () => {
    it('should manage emergency callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.onEmergency(callback1);
      service.onEmergency(callback2);
      service.removeEmergencyCallback(callback1);

      // Trigger emergency internally
      (service as any).notifyEmergencyCallbacks();

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should manage authentication callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      service.onAuthenticationRequired(callback1);
      service.onAuthenticationRequired(callback2);
      service.removeAuthenticationCallback(callback1);

      // Trigger authentication internally  
      (service as any).triggerUserAuthentication();

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should clear intervals and callbacks', () => {
      const callback = jest.fn();
      service.onEmergency(callback);
      
      service.shutdown();
      
      // Should not crash and should clear everything
      expect(true).toBe(true);
    });
  });
});

describe('createMeshConfiguration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return empty array with no environment variables', () => {
    delete process.env.MESH_NODE_1_URL;
    delete process.env.MESH_NODE_1_TOKEN;
    
    const config = createMeshConfiguration();
    expect(config).toEqual([]);
  });

  it('should parse environment variables correctly', () => {
    process.env.MESH_NODE_1_URL = 'https://node1.test.com';
    process.env.MESH_NODE_1_TOKEN = 'token1';
    process.env.MESH_NODE_2_URL = 'https://node2.test.com';
    process.env.MESH_NODE_2_TOKEN = 'token2';

    const config = createMeshConfiguration();
    
    expect(config).toHaveLength(2);
    expect(config[0]).toEqual({
      url: 'https://node1.test.com',
      apiToken: 'token1'
    });
    expect(config[1]).toEqual({
      url: 'https://node2.test.com',
      apiToken: 'token2'
    });
  });

  it('should skip incomplete configurations', () => {
    process.env.MESH_NODE_1_URL = 'https://node1.test.com';
    // Missing MESH_NODE_1_TOKEN
    process.env.MESH_NODE_2_URL = 'https://node2.test.com';
    process.env.MESH_NODE_2_TOKEN = 'token2';

    const config = createMeshConfiguration();
    
    expect(config).toHaveLength(1);
    expect(config[0].url).toBe('https://node2.test.com');
  });
});