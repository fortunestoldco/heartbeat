import { NextResponse } from 'next/server';
import { meshNetworkService } from '@/lib/meshNetwork';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { nodeId, timestamp, status } = await request.json();

    // Validate the token and nodeId (simplified validation)
    if (!nodeId || !timestamp || !status) {
      return NextResponse.json(
        { error: 'Invalid heartbeat payload' },
        { status: 400 }
      );
    }

    // Verify token against configured nodes
    const nodes = meshNetworkService.getNodes();
    const authenticatedNode = nodes.find(node => 
      node.id === nodeId && node.apiToken === token
    );

    if (!authenticatedNode) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid node credentials' },
        { status: 401 }
      );
    }

    // Process heartbeat
    const meshStatus = meshNetworkService.getMeshStatus();
    
    // Return our status to the requesting node
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      peerStatus: {
        nodeId: 'local',
        systemStatus: meshStatus.systemStatus,
        onlineNodes: meshStatus.onlineNodes,
        totalNodes: meshStatus.totalNodes
      }
    });

  } catch (error) {
    console.error('Mesh heartbeat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}