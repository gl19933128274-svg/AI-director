import { NextRequest, NextResponse } from 'next/server';
import { createResponse, createErrorResponse, logRequest, ERROR_CODES, logStep } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  const { request_id: requestId, trace_id: traceId } = logRequest('GET', '/api/video-proxy');
  
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return createErrorResponse(new Error('url 参数不能为空'), ERROR_CODES.PARAM_ERROR, { 
        request_id: requestId, 
        trace_id: traceId 
      });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return createErrorResponse(new Error('无效的URL'), ERROR_CODES.PARAM_ERROR, { 
        request_id: requestId, 
        trace_id: traceId 
      });
    }

    logStep(requestId, traceId, 'video_proxy', 'start', undefined, `proxying: ${url.substring(0, 50)}...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AI-Director/1.0.0'
      }
    });

    if (!response.ok) {
      logStep(requestId, traceId, 'video_proxy', 'error', undefined, `fetch failed: ${response.status}`);
      return createErrorResponse(new Error(`视频获取失败: ${response.status}`), ERROR_CODES.STORAGE_ERROR, { 
        request_id: requestId, 
        trace_id: traceId 
      });
    }

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = response.headers.get('Content-Length');
    
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=3600');

    logStep(requestId, traceId, 'video_proxy', 'success', undefined, `content_type=${contentType}, length=${contentLength}`);
    
    return new NextResponse(response.body, {
      status: 200,
      headers
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep(requestId, traceId, 'video_proxy', 'error', undefined, errorMessage);
    
    return createErrorResponse(error instanceof Error ? error : new Error('视频代理失败'), ERROR_CODES.STORAGE_ERROR, { 
      request_id: requestId, 
      trace_id: traceId 
    });
  }
}