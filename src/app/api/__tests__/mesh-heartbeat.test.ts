import { jest } from '@jest/globals';
import { POST } from '../mesh/heartbeat/route';
import { NextRequest } from 'next/server';

// Mock the meshNetwork module
jest.mock('@/lib/meshNetwork', () => ({
  meshNetworkService: {
    getNodes: jest.fn(),
    getMeshStatus: jest.fn()
  }
}));

import { meshNetworkService } from '@/lib/meshNetwork';

describe('/api/mesh/heartbeat', () => {
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      headers: new Headers(),
      json: jest.fn()
    };

    (meshNetworkService.getNodes as jest.Mock).mockReturnValue([
      {
        id: 'test-node-id',
        url: 'https://test-node.com',
        apiToken: 'valid-token',
        status: 'online'
      }
    ]);

    (meshNetworkService.getMeshStatus as jest.Mock).mockReturnValue({
      systemStatus: 'armed',
      onlineNodes: 3,
      totalNodes: 3
    });
  });

  describe('POST', () => {
    it('should reject request without authorization header', async () => {
      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should reject request with invalid authorization format', async () => {
      mockRequest.headers!.set('authorization', 'Invalid format');

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should reject request with missing payload fields', async () => {
      mockRequest.headers!.set('authorization', 'Bearer valid-token');
      (mockRequest.json as jest.Mock).mockResolvedValue({
        nodeId: 'test-node-id'
        // Missing timestamp and status
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid heartbeat payload');
    });

    it('should reject request with invalid node credentials', async () => {
      mockRequest.headers!.set('authorization', 'Bearer invalid-token');
      (mockRequest.json as jest.Mock).mockResolvedValue({
        nodeId: 'test-node-id',
        timestamp: Date.now(),
        status: 'online'
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should accept valid heartbeat and return peer status', async () => {
      mockRequest.headers!.set('authorization', 'Bearer valid-token');
      (mockRequest.json as jest.Mock).mockResolvedValue({
        nodeId: 'test-node-id',
        timestamp: Date.now(),
        status: 'online'
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.peerStatus).toBeDefined();
      expect(data.peerStatus.nodeId).toBe('local');
      expect(data.peerStatus.systemStatus).toBe('armed');
    });

    it('should handle JSON parsing errors', async () => {
      mockRequest.headers!.set('authorization', 'Bearer valid-token');
      (mockRequest.json as jest.Mock).mockRejectedValue(new Error('Invalid JSON'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');

      consoleSpy.mockRestore();
    });

    it('should validate node exists in mesh configuration', async () => {
      mockRequest.headers!.set('authorization', 'Bearer valid-token');
      (mockRequest.json as jest.Mock).mockResolvedValue({
        nodeId: 'unknown-node-id',
        timestamp: Date.now(),
        status: 'online'
      });

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid node credentials');
    });
  });
});