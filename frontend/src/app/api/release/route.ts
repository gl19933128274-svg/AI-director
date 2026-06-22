import { NextRequest } from 'next/server';
import {
  getReleaseStatus,
  setTrafficPercent,
  activateKillSwitch,
  deactivateKillSwitch,
  enableFeature,
  disableFeature,
  isUserInRelease,
  addToAllowlist,
  removeFromAllowlist,
  addToBlocklist,
  removeFromBlocklist,
  generateRequestId,
  logInfo,
  logError,
  logWarn
} from '@/services/releaseControl';
import { FeatureFlags } from '@/services/releaseControl';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('user_id');

  logInfo(requestId, 'RELEASE_GET_REQUEST', 'release-control', 'started', {
    action,
    userId
  });

  try {
    if (action === 'user_check') {
      if (!userId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'INVALID_PARAMS', message: 'user_id is required' },
            request_id: requestId
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const inRelease = isUserInRelease(userId);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user_id: userId,
            in_release: inRelease
          },
          request_id: requestId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      const status = getReleaseStatus();
      
      return new Response(
        JSON.stringify({
          success: true,
          data: status,
          request_id: requestId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RELEASE_GET_ERROR',
          message: errorMessage,
          request_id: requestId
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();
    const { action } = body;

    logInfo(requestId, 'RELEASE_POST_REQUEST', 'release-control', 'started', {
      action
    });

    switch (action) {
      case 'set_traffic': {
        const { percent } = body;
        if (typeof percent !== 'number' || percent < 0 || percent > 100) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_PARAMS', message: 'percent must be between 0 and 100' },
              request_id: requestId
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        setTrafficPercent(percent);
        logInfo(requestId, 'RELEASE_TRAFFIC_SET', 'release-control', 'success', { percent });
        
        return new Response(
          JSON.stringify({
            success: true,
            data: { trafficPercent: percent },
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'kill_switch': {
        const { activate, reason } = body;
        
        if (activate) {
          activateKillSwitch(reason || 'Manual activation');
          logWarn(requestId, 'RELEASE_KILL_SWITCH_ON', 'release-control', 
            'Kill switch activated', { reason });
        } else {
          deactivateKillSwitch();
          logInfo(requestId, 'RELEASE_KILL_SWITCH_OFF', 'release-control', 
            'Kill switch deactivated', {});
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            data: { killSwitch: activate },
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'enable_feature': {
        const { feature } = body;
        if (!feature || !Object.keys(getReleaseStatus().features).includes(feature)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_PARAMS', message: 'Invalid feature name' },
              request_id: requestId
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        enableFeature(feature as keyof FeatureFlags);
        logInfo(requestId, 'RELEASE_FEATURE_ENABLE', 'release-control', 'success', { feature });
        
        return new Response(
          JSON.stringify({
            success: true,
            data: { feature, enabled: true },
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'disable_feature': {
        const { feature } = body;
        if (!feature || !Object.keys(getReleaseStatus().features).includes(feature)) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_PARAMS', message: 'Invalid feature name' },
              request_id: requestId
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        disableFeature(feature as keyof FeatureFlags);
        logInfo(requestId, 'RELEASE_FEATURE_DISABLE', 'release-control', 'success', { feature });
        
        return new Response(
          JSON.stringify({
            success: true,
            data: { feature, enabled: false },
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'add_allowlist': {
        const { user_id } = body;
        if (!user_id) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_PARAMS', message: 'user_id is required' },
              request_id: requestId
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        addToAllowlist(user_id);
        logInfo(requestId, 'RELEASE_ALLOWLIST_ADD', 'release-control', 'success', { userId: user_id });
        
        return new Response(
          JSON.stringify({
            success: true,
            data: { user_id, added: true },
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'remove_allowlist': {
        const { user_id } = body;
        if (!user_id) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_PARAMS', message: 'user_id is required' },
              request_id: requestId
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        removeFromAllowlist(user_id);
        logInfo(requestId, 'RELEASE_ALLOWLIST_REMOVE', 'release-control', 'success', { userId: user_id });
        
        return new Response(
          JSON.stringify({
            success: true,
            data: { user_id, removed: true },
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'add_blocklist': {
        const { user_id } = body;
        if (!user_id) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_PARAMS', message: 'user_id is required' },
              request_id: requestId
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        addToBlocklist(user_id);
        logInfo(requestId, 'RELEASE_BLOCKLIST_ADD', 'release-control', 'success', { userId: user_id });
        
        return new Response(
          JSON.stringify({
            success: true,
            data: { user_id, added: true },
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      case 'remove_blocklist': {
        const { user_id } = body;
        if (!user_id) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { code: 'INVALID_PARAMS', message: 'user_id is required' },
              request_id: requestId
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        removeFromBlocklist(user_id);
        logInfo(requestId, 'RELEASE_BLOCKLIST_REMOVE', 'release-control', 'success', { userId: user_id });
        
        return new Response(
          JSON.stringify({
            success: true,
            data: { user_id, removed: true },
            request_id: requestId
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'INVALID_ACTION', message: 'Unknown action' },
            request_id: requestId
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RELEASE_POST_ERROR',
          message: errorMessage,
          request_id: requestId
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}