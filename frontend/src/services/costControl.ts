/**
 * 成本监控系统（Cost Control System）
 * 
 * 功能：
 * 1. 记录每一次AI调用成本
 * 2. 成本统计（用户/每日/项目）
 * 3. 成本上限控制（单用户每日最大成本限制）
 * 4. 超过阈值自动拒绝或切换mock模式
 */

export interface CostRecord {
  id: string;
  user_id: string;
  request_id: string;
  task_id?: string;
  model_id: string;
  input_tokens?: number;
  input_image_size?: number;
  output_video_duration?: number;
  estimated_cost: number;
  status: 'success' | 'failed' | 'pending';
  created_at: string;
}

export interface UserDailyCost {
  user_id: string;
  date: string;
  total_cost: number;
  call_count: number;
  models: Record<string, number>;
}

export interface CostLimitConfig {
  dailyLimitPerUser: number;
  monthlyLimitPerUser: number;
  fallbackToMock: boolean;
  notifyOnExceed: boolean;
}

export interface CostStats {
  totalCost: number;
  todayCost: number;
  yesterdayCost: number;
  weeklyCost: number;
  monthlyCost: number;
  topUsers: { user_id: string; cost: number; count: number }[];
  modelDistribution: Record<string, number>;
}

const DEFAULT_CONFIG: CostLimitConfig = {
  dailyLimitPerUser: 5.0,
  monthlyLimitPerUser: 100.0,
  fallbackToMock: true,
  notifyOnExceed: true
};

let costConfig: CostLimitConfig = { ...DEFAULT_CONFIG };
const costRecords: CostRecord[] = [];
const userDailyCosts = new Map<string, UserDailyCost>();

export function initCostConfig(customConfig?: Partial<CostLimitConfig>): void {
  costConfig = { ...DEFAULT_CONFIG, ...customConfig };
}

export function getCostConfig(): CostLimitConfig {
  return costConfig;
}

export function generateCostId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 6);
  return `cost-${timestamp}-${random}`;
}

export function recordCost(
  userId: string,
  requestId: string,
  modelId: string,
  inputTokens: number,
  inputImageSize: number,
  outputVideoDuration: number,
  estimatedCost: number,
  status: 'success' | 'failed' | 'pending',
  taskId?: string
): CostRecord {
  const record: CostRecord = {
    id: generateCostId(),
    user_id: userId,
    request_id: requestId,
    task_id: taskId,
    model_id: modelId,
    input_tokens: inputTokens,
    input_image_size: inputImageSize,
    output_video_duration: outputVideoDuration,
    estimated_cost: estimatedCost,
    status,
    created_at: new Date().toISOString()
  };
  
  costRecords.push(record);
  
  updateUserDailyCost(userId, estimatedCost, modelId);
  
  return record;
}

function updateUserDailyCost(userId: string, cost: number, modelId: string): void {
  const today = new Date().toISOString().split('T')[0];
  const key = `${userId}-${today}`;
  
  let dailyCost = userDailyCosts.get(key);
  if (!dailyCost) {
    dailyCost = {
      user_id: userId,
      date: today,
      total_cost: 0,
      call_count: 0,
      models: {}
    };
  }
  
  dailyCost.total_cost += cost;
  dailyCost.call_count += 1;
  dailyCost.models[modelId] = (dailyCost.models[modelId] || 0) + cost;
  
  userDailyCosts.set(key, dailyCost);
}

export function getUserDailyCost(userId: string, date?: string): number {
  const targetDate = date || new Date().toISOString().split('T')[0];
  const key = `${userId}-${targetDate}`;
  const dailyCost = userDailyCosts.get(key);
  return dailyCost ? dailyCost.total_cost : 0;
}

export function getUserMonthlyCost(userId: string): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${userId}-${year}-${month}`;
  
  let total = 0;
  for (const [key, dailyCost] of userDailyCosts) {
    if (key.startsWith(prefix)) {
      total += dailyCost.total_cost;
    }
  }
  
  return total;
}

export function checkUserCostLimit(userId: string): {
  withinLimit: boolean;
  dailyCost: number;
  dailyLimit: number;
  monthlyCost: number;
  monthlyLimit: number;
  shouldFallback: boolean;
} {
  const dailyCost = getUserDailyCost(userId);
  const monthlyCost = getUserMonthlyCost(userId);
  
  const dailyWithinLimit = dailyCost < costConfig.dailyLimitPerUser;
  const monthlyWithinLimit = monthlyCost < costConfig.monthlyLimitPerUser;
  
  const withinLimit = dailyWithinLimit && monthlyWithinLimit;
  const shouldFallback = !withinLimit && costConfig.fallbackToMock;
  
  return {
    withinLimit,
    dailyCost,
    dailyLimit: costConfig.dailyLimitPerUser,
    monthlyCost,
    monthlyLimit: costConfig.monthlyLimitPerUser,
    shouldFallback
  };
}

export function getUserCostHistory(userId: string, days: number = 7): UserDailyCost[] {
  const result: UserDailyCost[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const key = `${userId}-${dateStr}`;
    const dailyCost = userDailyCosts.get(key);
    
    if (dailyCost) {
      result.push(dailyCost);
    } else {
      result.push({
        user_id: userId,
        date: dateStr,
        total_cost: 0,
        call_count: 0,
        models: {}
      });
    }
  }
  
  return result;
}

export function getDailyCost(date?: string): number {
  const targetDate = date || new Date().toISOString().split('T')[0];
  let total = 0;
  
  for (const [key, dailyCost] of userDailyCosts) {
    if (key.endsWith(targetDate)) {
      total += dailyCost.total_cost;
    }
  }
  
  return total;
}

export function getCostStats(days: number = 7): CostStats {
  const today = new Date().toISOString().split('T')[0];
  
  const todayCost = getDailyCost(today);
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayCost = getDailyCost(yesterday.toISOString().split('T')[0]);
  
  let weeklyCost = 0;
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    weeklyCost += getDailyCost(date.toISOString().split('T')[0]);
  }
  
  let monthlyCost = 0;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}`;
  for (const [key, dailyCost] of userDailyCosts) {
    if (key.includes(prefix)) {
      monthlyCost += dailyCost.total_cost;
    }
  }
  
  const totalCost = costRecords.reduce((sum, r) => sum + r.estimated_cost, 0);
  
  const userCostMap = new Map<string, { cost: number; count: number }>();
  const modelCostMap = new Map<string, number>();
  
  for (const record of costRecords) {
    const userStats = userCostMap.get(record.user_id) || { cost: 0, count: 0 };
    userStats.cost += record.estimated_cost;
    userStats.count += 1;
    userCostMap.set(record.user_id, userStats);
    
    modelCostMap.set(record.model_id, (modelCostMap.get(record.model_id) || 0) + record.estimated_cost);
  }
  
  const topUsers = Array.from(userCostMap.entries())
    .map(([user_id, { cost, count }]) => ({ user_id, cost, count }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);
  
  const modelDistribution: Record<string, number> = {};
  modelCostMap.forEach((cost, model) => {
    modelDistribution[model] = cost;
  });
  
  return {
    totalCost,
    todayCost,
    yesterdayCost,
    weeklyCost,
    monthlyCost,
    topUsers,
    modelDistribution
  };
}

export function getRecordsByUserId(userId: string, limit: number = 50): CostRecord[] {
  return costRecords
    .filter(r => r.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export function getRecordsByDate(date: string): CostRecord[] {
  return costRecords
    .filter(r => r.created_at.startsWith(date))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getRecordsByRequestId(requestId: string): CostRecord[] {
  return costRecords.filter(r => r.request_id === requestId);
}

export function clearCostRecords(): void {
  costRecords.length = 0;
  userDailyCosts.clear();
}

export default {
  initCostConfig,
  getCostConfig,
  recordCost,
  getUserDailyCost,
  getUserMonthlyCost,
  checkUserCostLimit,
  getUserCostHistory,
  getDailyCost,
  getCostStats,
  getRecordsByUserId,
  getRecordsByDate,
  getRecordsByRequestId,
  clearCostRecords
};