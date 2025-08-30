import crypto from 'crypto';

export interface MeshNode {
  id: string;
  url: string;
  status: 'online' | 'offline' | 'unreachable';
  lastHeartbeat: number;
  latency: number;
  apiToken: string;
}

export interface MeshStatus {
  totalNodes: number;
  onlineNodes: number;
  systemStatus: 'armed' | 'disarmed' | 'critical';
  requiresUserAuthentication: boolean;
  emergencyTriggered: boolean;
}

class MeshNetworkService {
  private nodes: Map<string, MeshNode> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;
  private systemStatus: MeshStatus['systemStatus'] = 'disarmed';
  private emergencyCallbacks: Set<() => void> = new Set();
  private authenticationCallbacks: Set<() => void> = new Set();
  
  private readonly HEARTBEAT_INTERVAL = 1000; // 1 second
  private readonly HEARTBEAT_TIMEOUT = 3000; // 3 seconds
  private readonly MIN_NODES_ARMED = 3;

  async initialize(nodeConfigs: { url: string; apiToken: string }[]): Promise<void> {
    console.log('Initializing mesh network with', nodeConfigs.length, 'nodes');
    
    // Add configured nodes
    for (let i = 0; i < nodeConfigs.length; i++) {
      const config = nodeConfigs[i];
      const nodeId = this.generateNodeId(config.url);
      
      const node: MeshNode = {
        id: nodeId,
        url: config.url,
        status: 'offline',
        lastHeartbeat: 0,
        latency: 0,
        apiToken: config.apiToken
      };
      
      this.nodes.set(nodeId, node);
    }

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();
    
    // Initial status check
    await this.performHealthCheck();
  }

  private generateNodeId(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex').substring(0, 8);
  }

  private startHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEARTBEAT_INTERVAL);
  }

  private async performHealthCheck(): Promise<void> {
    const healthCheckPromises = Array.from(this.nodes.values()).map(node => 
      this.checkNodeHealth(node)
    );

    await Promise.allSettled(healthCheckPromises);
    await this.updateSystemStatus();
  }

  private async checkNodeHealth(node: MeshNode): Promise<void> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HEARTBEAT_TIMEOUT);

      const response = await fetch(`${node.url}/api/mesh/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${node.apiToken}`,
        },
        body: JSON.stringify({
          nodeId: node.id,
          timestamp: Date.now(),
          status: this.getLocalStatus()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const responseData = await response.json();
        
        node.status = 'online';
        node.lastHeartbeat = Date.now();
        node.latency = Date.now() - startTime;
        
        // Process peer's status information
        if (responseData.peerStatus) {
          await this.processPeerStatus(responseData.peerStatus);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`Node ${node.id} health check failed:`, error);
      
      node.status = 'unreachable';
      node.latency = Date.now() - startTime;
      
      // Mark as offline if we haven't heard from it recently
      if (Date.now() - node.lastHeartbeat > this.HEARTBEAT_TIMEOUT * 2) {
        node.status = 'offline';
      }
    }
  }

  private async updateSystemStatus(): Promise<void> {
    const totalNodes = this.nodes.size;
    const onlineNodes = Array.from(this.nodes.values()).filter(n => n.status === 'online').length;
    
    const previousStatus = this.systemStatus;
    
    if (onlineNodes >= this.MIN_NODES_ARMED) {
      this.systemStatus = 'armed';
    } else if (onlineNodes === 2) {
      this.systemStatus = 'disarmed';
      
      // Trigger user authentication request
      if (previousStatus === 'armed') {
        console.warn('Mesh network degraded: 2 nodes remaining, requesting user authentication');
        this.triggerUserAuthentication();
      }
    } else if (onlineNodes === 1) {
      this.systemStatus = 'critical';
      
      // Trigger emergency procedures
      if (previousStatus !== 'critical') {
        console.error('CRITICAL: Only 1 node remaining, triggering emergency procedures');
        await this.triggerEmergency();
      }
    } else {
      this.systemStatus = 'critical';
      
      // All nodes down - trigger emergency
      if (previousStatus !== 'critical') {
        console.error('CRITICAL: All nodes down, triggering emergency procedures');
        await this.triggerEmergency();
      }
    }

    // Log status changes
    if (previousStatus !== this.systemStatus) {
      console.log(`Mesh status changed: ${previousStatus} -> ${this.systemStatus} (${onlineNodes}/${totalNodes} nodes)`);
    }
  }

  private getLocalStatus(): any {
    return {
      nodeId: this.generateNodeId('local'),
      timestamp: Date.now(),
      systemStatus: this.systemStatus,
      activeUsers: this.getActiveUsersCount(),
      challenges: this.getActiveChallengesCount()
    };
  }

  private async processPeerStatus(peerStatus: any): Promise<void> {
    // Process information from peer nodes
    // This could include syncing user states, challenge status, etc.
    console.debug('Processing peer status:', peerStatus);
  }

  private triggerUserAuthentication(): void {
    // Notify all registered authentication callbacks
    this.authenticationCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Authentication callback error:', error);
      }
    });
  }

  private async triggerEmergency(): Promise<void> {
    console.error('EMERGENCY TRIGGERED: Sending alerts and activating failsafes');
    
    // Trigger all emergency procedures
    await Promise.allSettled([
      this.sendEmergencyAlerts(),
      this.activateFailsafeMeasures(),
      this.notifyEmergencyCallbacks()
    ]);
  }

  private async sendEmergencyAlerts(): Promise<void> {
    try {
      // Send email alerts
      await fetch('/api/send-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'mesh_network_failure',
          priority: 'critical',
          details: {
            onlineNodes: Array.from(this.nodes.values()).filter(n => n.status === 'online').length,
            totalNodes: this.nodes.size,
            timestamp: Date.now()
          }
        }),
      });

      // Send SMS via Twilio
      await fetch('/api/emergency-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'mesh_network_failure',
          message: `FAILSAFE EMERGENCY: Mesh network compromised. ${Array.from(this.nodes.values()).filter(n => n.status === 'online').length}/${this.nodes.size} nodes online.`,
          timestamp: Date.now()
        }),
      });

      // Send voice call via Twilio
      await fetch('/api/emergency-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'mesh_network_failure',
          message: 'Failsafe emergency alert. Mesh network has been compromised. Please check system status immediately.',
          timestamp: Date.now()
        }),
      });

      console.log('Emergency alerts sent successfully');
    } catch (error) {
      console.error('Failed to send emergency alerts:', error);
    }
  }

  private async activateFailsafeMeasures(): Promise<void> {
    try {
      // Activate local emergency protocols
      await fetch('/api/activate-failsafe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'mesh_network_failure',
          timestamp: Date.now(),
          remainingNodes: Array.from(this.nodes.values()).filter(n => n.status === 'online').length
        }),
      });

      console.log('Failsafe measures activated');
    } catch (error) {
      console.error('Failed to activate failsafe measures:', error);
    }
  }

  private notifyEmergencyCallbacks(): void {
    this.emergencyCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Emergency callback error:', error);
      }
    });
  }

  // Public API methods
  
  getMeshStatus(): MeshStatus {
    const totalNodes = this.nodes.size;
    const onlineNodes = Array.from(this.nodes.values()).filter(n => n.status === 'online').length;
    
    return {
      totalNodes,
      onlineNodes,
      systemStatus: this.systemStatus,
      requiresUserAuthentication: this.systemStatus === 'disarmed' && onlineNodes === 2,
      emergencyTriggered: this.systemStatus === 'critical'
    };
  }

  getNodes(): MeshNode[] {
    return Array.from(this.nodes.values());
  }

  onEmergency(callback: () => void): void {
    this.emergencyCallbacks.add(callback);
  }

  onAuthenticationRequired(callback: () => void): void {
    this.authenticationCallbacks.add(callback);
  }

  removeEmergencyCallback(callback: () => void): void {
    this.emergencyCallbacks.delete(callback);
  }

  removeAuthenticationCallback(callback: () => void): void {
    this.authenticationCallbacks.delete(callback);
  }

  async addNode(url: string, apiToken: string): Promise<string> {
    const nodeId = this.generateNodeId(url);
    
    const node: MeshNode = {
      id: nodeId,
      url,
      status: 'offline',
      lastHeartbeat: 0,
      latency: 0,
      apiToken
    };
    
    this.nodes.set(nodeId, node);
    
    // Immediate health check for new node
    await this.checkNodeHealth(node);
    await this.updateSystemStatus();
    
    console.log(`Added new mesh node: ${nodeId} (${url})`);
    return nodeId;
  }

  async removeNode(nodeId: string): Promise<boolean> {
    const removed = this.nodes.delete(nodeId);
    
    if (removed) {
      await this.updateSystemStatus();
      console.log(`Removed mesh node: ${nodeId}`);
    }
    
    return removed;
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    
    this.emergencyCallbacks.clear();
    this.authenticationCallbacks.clear();
    
    console.log('Mesh network service shut down');
  }

  // Helper methods for status reporting
  private getActiveUsersCount(): number {
    // This would be implemented to return actual active user count
    return 0;
  }

  private getActiveChallengesCount(): number {
    // This would be implemented to return actual active challenges count
    return 0;
  }
}

export const meshNetworkService = new MeshNetworkService();

// Environment variable configuration helper
export function createMeshConfiguration(): { url: string; apiToken: string }[] {
  const config = [];
  
  // Read from environment variables
  for (let i = 1; i <= 3; i++) {
    const url = process.env[`MESH_NODE_${i}_URL`];
    const token = process.env[`MESH_NODE_${i}_TOKEN`];
    
    if (url && token) {
      config.push({ url, apiToken: token });
    }
  }
  
  return config;
}