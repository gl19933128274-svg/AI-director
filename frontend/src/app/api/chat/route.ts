import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 检查是否启用真实 AI（运行时计算，支持测试动态修改）
 */
function isRealAIEnabled(): boolean {
  return process.env.USE_REAL_AI === 'true';
}

/**
 * Mock 响应生成器 - 用于开发测试
 * 根据用户场景描述动态生成相关分镜
 */
function generateMockResponse(prompt: string): { content: string; model: string } {
  console.log('[MOCK] 生成模拟响应:', prompt.slice(0, 80), '...');
  
  // 根据关键词返回不同的模拟响应
  if (prompt.includes('分镜') || prompt.includes('镜头') || prompt.includes('脚本')) {
    // 分析用户描述，生成相关分镜
    const shots = generateMockShots(prompt);
    return {
      content: JSON.stringify({ shots }),
      model: 'mock-hunyuan-pro'
    };
  }
  
  if (prompt.includes('视频') || prompt.includes('创作') || prompt.includes('生成')) {
    return {
      content: '{"shots": [{"num": 1, "desc": "开场镜头，展示主题氛围", "duration": 3, "camera": "推镜头", "lighting": "柔和灯光"}, {"num": 2, "desc": "中景展示核心内容", "duration": 4, "camera": "移镜头", "lighting": "自然光"}, {"num": 3, "desc": "结尾镜头，强化主题", "duration": 3, "camera": "拉镜头", "lighting": "专业灯光"}]}',
      model: 'mock-hunyuan-pro'
    };
  }
  
  // 默认响应
  return {
    content: '{"shots": [{"num": 1, "desc": "开场镜头", "duration": 3, "camera": "推镜头", "lighting": "柔和灯光"}, {"num": 2, "desc": "主体展示", "duration": 4, "camera": "移镜头", "lighting": "自然光"}, {"num": 3, "desc": "结尾镜头", "duration": 3, "camera": "拉镜头", "lighting": "专业灯光"}]}',
    model: 'mock-hunyuan-pro'
  };
}

/**
 * 从AI响应中提取JSON内容（处理markdown代码块格式）
 */
function extractJsonFromResponse(content: string): string {
  // 尝试提取 markdown 代码块中的 JSON
  const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // 尝试提取普通代码块
  const plainCodeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/i);
  if (plainCodeBlockMatch) {
    return plainCodeBlockMatch[1].trim();
  }
  
  // 如果没有代码块，尝试找到第一个 { 到最后一个 } 的内容
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
    return content.substring(jsonStart, jsonEnd + 1);
  }
  
  return content;
}

/**
 * 根据用户描述生成模拟分镜
 */
function generateMockShots(prompt: string): Array<{
  num: number;
  desc: string;
  duration: number;
  camera: string;
  lighting: string;
}> {
  // 分析用户描述中的关键词
  const hasFashion = prompt.includes('服装') || prompt.includes('模特') || prompt.includes('穿搭') || prompt.includes('时尚');
  const hasProduct = prompt.includes('产品') || prompt.includes('商品') || prompt.includes('展示');
  const hasPerson = prompt.includes('男模') || prompt.includes('女模') || prompt.includes('人物') || prompt.includes('模特');
  const hasScene = prompt.includes('场景') || prompt.includes('环境') || prompt.includes('背景');
  const hasHighEnd = prompt.includes('高端') || prompt.includes('高级感') || prompt.includes('奢华');
  
  // 根据分析结果生成不同的分镜
  if (hasFashion && hasPerson && hasHighEnd) {
    // 高端时尚模特穿搭场景
    return [
      { num: 1, desc: '开场特写：男模脸部轮廓，眼神坚定望向镜头，展现自信气质', duration: 3, camera: '特写镜头', lighting: '侧逆光，突出轮廓' },
      { num: 2, desc: '中景：男模穿着高端服装走步入场，展示整体穿搭效果', duration: 4, camera: '跟镜头', lighting: '专业摄影棚灯光' },
      { num: 3, desc: '特写：服装面料质感展示，细腻的纹理和精致的剪裁', duration: 3, camera: '推镜头', lighting: '柔光箱打亮' },
      { num: 4, desc: '全景：男模在高级感场景中摆姿势，展现时尚大片氛围', duration: 4, camera: '拉镜头', lighting: '电影感光影' },
      { num: 5, desc: '收尾：男模自信微笑，品牌logo渐入', duration: 2, camera: '固定镜头', lighting: '柔和收尾光' },
    ];
  } else if (hasProduct && hasScene) {
    // 产品场景展示
    return [
      { num: 1, desc: '开场：产品从阴影中缓缓出现，神秘氛围', duration: 3, camera: '推镜头', lighting: '明暗对比' },
      { num: 2, desc: '产品360度旋转展示，多角度展现设计细节', duration: 4, camera: '环绕镜头', lighting: '均匀布光' },
      { num: 3, desc: '产品在真实场景中的使用展示', duration: 4, camera: '移镜头', lighting: '自然光' },
      { num: 4, desc: '特写：产品核心功能展示', duration: 3, camera: '特写镜头', lighting: '重点打光' },
      { num: 5, desc: '结尾：产品与品牌信息同框', duration: 2, camera: '拉镜头', lighting: '柔和整体光' },
    ];
  } else {
    // 默认分镜
    return [
      { num: 1, desc: '开场特写镜头，展示核心元素', duration: 3, camera: '推镜头', lighting: '柔和灯光' },
      { num: 2, desc: '中景展示主要内容', duration: 4, camera: '移镜头', lighting: '自然光' },
      { num: 3, desc: '全景展示整体场景', duration: 3, camera: '拉镜头', lighting: '专业灯光' },
    ];
  }
}

/**
 * POST /api/chat
 * 代理调用腾讯云混元 ChatCompletions 接口（支持 Mock 模式）
 *
 * 说明：
 *   1. 混元对外协议与 OpenAI Chat Completions 高度兼容（路径 /v1/chat/completions，body 字段一致）
 *   2. 鉴权使用 Header: `Authorization: Bearer <HUNYUAN_API_KEY>`
 *   3. Key 仅在服务端使用，绝不暴露到前端
 *   4. 通过 useRealAI() 环境变量控制是否调用真实 API
 *
 * 请求体：
 *   {
 *     messages: Array<{ role, content }>,
 *     model?: string,         // 默认 hunyuan-pro
 *     temperature?: number,   // 默认 0.7
 *     maxTokens?: number      // 默认 1024
 *   }
 *
 * 响应：
 *   200 { content: string, model: string, usage?: object, isMock?: boolean }
 *   400 { error: string }     // 参数错误
 *   502 { error: string }     // 上游调用失败
 *   503 { error: string }     // 未配置 API Key（仅当 useRealAI()=true 时）
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.HUNYUAN_API_KEY;
  
  // 如果启用真实 AI 但未配置 Key，返回 503
  if (isRealAIEnabled() && !apiKey) {
    return NextResponse.json(
      { error: 'HUNYUAN_API_KEY is not configured on the server.' },
      { status: 503 }
    );
  }
  
  // 如果未启用真实 AI，直接返回 Mock 响应
  if (!isRealAIEnabled()) {
    let body: ChatRequestBody;
    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    
    const userMessage = body.messages?.find(m => m.role === 'user')?.content || '';
    const mockResponse = generateMockResponse(userMessage);
    
    console.log('[MOCK] 返回模拟响应');
    return NextResponse.json({
      content: mockResponse.content,
      model: mockResponse.model,
      usage: null,
      isMock: true
    });
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json(
      { error: 'messages must be a non-empty array.' },
      { status: 400 }
    );
  }

  // 简单的入参校验，避免无意义的垃圾请求打到混元
  for (const m of messages) {
    if (
      !m ||
      typeof m.content !== 'string' ||
      !['system', 'user', 'assistant'].includes(m.role)
    ) {
      return NextResponse.json(
        { error: 'Each message must have a valid role and string content.' },
        { status: 400 }
      );
    }
  }

  const model = body.model || 'hunyuan-pro';
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.7;
  const maxTokens = typeof body.maxTokens === 'number' ? body.maxTokens : 1024;

  // 腾讯云混元 ChatCompletions 端点
  // 兼容模式（与 OpenAI 协议一致），通过 Authorization: Bearer 鉴权
  const endpoint = 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions';

  console.log('[混元API] 准备调用真实API');
  console.log('[混元API] 端点:', endpoint);
  console.log('[混元API] 模型:', model);
  console.log('[混元API] 消息数量:', messages.length);
  console.log('[混元API] API Key前缀:', apiKey ? apiKey.slice(0, 10) + '...' : '未配置');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    console.log('[混元API] 响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[混元API] 请求失败:', response.status, errorText);
      return NextResponse.json(
        {
          error: `Hunyuan request failed with status ${response.status}.`,
          detail: errorText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: Record<string, unknown>;
    };

    console.log('[混元API] 请求成功');
    let content = data?.choices?.[0]?.message?.content ?? '';
    
    // 如果请求包含分镜相关关键词，尝试提取JSON内容
    const requestContent = messages.map(m => m.content).join('');
    if (requestContent.includes('分镜') || requestContent.includes('镜头') || requestContent.includes('脚本') || 
        requestContent.includes('storyboard') || requestContent.includes('shot')) {
      content = extractJsonFromResponse(content);
      console.log('[混元API] 已提取JSON内容:', content.slice(0, 100), '...');
    }
    
    return NextResponse.json({
      content,
      model: data?.model ?? model,
      usage: data?.usage ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[混元API] 异常:', message);
    return NextResponse.json(
      { error: `Failed to call Hunyuan: ${message}` },
      { status: 502 }
    );
  }
}

/**
 * GET /api/chat
 * 健康检查 / 配置探测，**不会泄露任何 Key**
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    apiKeyConfigured: Boolean(process.env.HUNYUAN_API_KEY),
    useRealAI: isRealAIEnabled(),
    defaultModel: isRealAIEnabled() ? 'hunyuan-pro' : 'mock-hunyuan-pro',
  });
}
