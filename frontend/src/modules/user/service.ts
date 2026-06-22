import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, User as PrismaUser } from '@prisma/client';
import { UserError, ValidationError, AuthError } from './errors';

const prisma = new PrismaClient();

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '1h';
const REFRESH_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 12;

// 角色类型
export type UserRole = 'user' | 'creator' | 'admin';

// 会员等级类型
export type MemberLevel = 'free' | 'pro' | 'studio';

// 用户DTO
export interface CreateUserDto {
  email: string;
  password: string;
  nickname: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateUserDto {
  nickname?: string;
  avatar?: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  nickname: string;
  avatar?: string;
  role: UserRole;
  memberLevel: MemberLevel;
  credits: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// 转换用户对象
function toUser(prismaUser: PrismaUser): User {
  return {
    id: prismaUser.id,
    email: prismaUser.email,
    phone: prismaUser.phone,
    nickname: prismaUser.nickname,
    avatar: prismaUser.avatar,
    role: prismaUser.role as UserRole,
    memberLevel: prismaUser.memberLevel as MemberLevel,
    credits: prismaUser.credits,
    emailVerified: prismaUser.emailVerified,
    phoneVerified: prismaUser.phoneVerified,
    createdAt: prismaUser.createdAt,
    updatedAt: prismaUser.updatedAt,
  };
}

// 生成JWT
function generateTokens(userId: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
}

// 验证JWT
export function verifyToken(token: string): { userId: string } {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    throw new AuthError('无效的token');
  }
}

// 用户服务
export const userService = {
  // 用户注册
  async register(dto: CreateUserDto): Promise<AuthResponse> {
    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
      throw new ValidationError('邮箱格式不正确', 'email');
    }

    // 验证密码强度
    if (dto.password.length < 8) {
      throw new ValidationError('密码至少需要8位', 'password');
    }

    // 验证昵称
    if (!dto.nickname || dto.nickname.length < 2) {
      throw new ValidationError('昵称至少需要2个字符', 'nickname');
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new UserError('该邮箱已被注册', 409, 'email');
    }

    // 检查手机号是否已存在
    if (dto.phone) {
      const phoneUser = await prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneUser) {
        throw new UserError('该手机号已被注册', 409, 'phone');
      }
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        nickname: dto.nickname,
        phone: dto.phone,
      },
    });

    // 生成token
    const { accessToken, refreshToken } = generateTokens(user.id);

    return {
      user: toUser(user),
      accessToken,
      refreshToken,
    };
  },

  // 用户登录
  async login(dto: LoginDto): Promise<AuthResponse> {
    // 查找用户
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new AuthError('邮箱或密码错误');
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthError('邮箱或密码错误');
    }

    // 生成token
    const { accessToken, refreshToken } = generateTokens(user.id);

    return {
      user: toUser(user),
      accessToken,
      refreshToken,
    };
  },

  // 获取用户信息
  async getUserById(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AuthError('用户不存在');
    }
    return toUser(user);
  },

  // 更新用户信息
  async updateUser(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return toUser(user);
  },

  // 修改密码
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AuthError('用户不存在');
    }

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new ValidationError('旧密码不正确', 'oldPassword');
    }

    // 验证新密码强度
    if (newPassword.length < 8) {
      throw new ValidationError('新密码至少需要8位', 'newPassword');
    }

    // 更新密码
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },

  // 升级会员
  async upgradeMembership(userId: string, level: MemberLevel): Promise<User> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { memberLevel: level },
    });

    // 创建订阅记录
    await prisma.subscription.create({
      data: {
        userId,
        level,
        startDate: new Date(),
      },
    });

    return toUser(user);
  },

  // 检查会员权限
  async checkMembership(userId: string, requiredLevel: MemberLevel): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return false;
    }

    const levelOrder: Record<MemberLevel, number> = {
      free: 1,
      pro: 2,
      studio: 3,
    };

    return levelOrder[user.memberLevel] >= levelOrder[requiredLevel];
  },
};

export default userService;