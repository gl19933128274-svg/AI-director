import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { userService, CreateUserDto, LoginDto } from '../service';
import { ValidationError, AuthError, UserError } from '../errors';

const prisma = new PrismaClient();

describe('User Service', () => {
  // 测试用户数据
  const testUser: CreateUserDto = {
    email: 'test@example.com',
    password: 'password123',
    nickname: '测试用户',
  };

  // 清理测试数据
  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await userService.register(testUser);

      expect(result.user.email).toBe(testUser.email);
      expect(result.user.nickname).toBe(testUser.nickname);
      expect(result.user.role).toBe('user');
      expect(result.user.memberLevel).toBe('free');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw error if email is invalid', async () => {
      await expect(userService.register({
        ...testUser,
        email: 'invalid-email',
      })).rejects.toThrow(ValidationError);
    });

    it('should throw error if password is too short', async () => {
      await expect(userService.register({
        ...testUser,
        password: 'short',
      })).rejects.toThrow(ValidationError);
    });

    it('should throw error if email already exists', async () => {
      await userService.register(testUser);

      await expect(userService.register(testUser)).rejects.toThrow(UserError);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      await userService.register(testUser);

      const loginDto: LoginDto = {
        email: testUser.email,
        password: testUser.password,
      };

      const result = await userService.login(loginDto);

      expect(result.user.email).toBe(testUser.email);
      expect(result.accessToken).toBeDefined();
    });

    it('should throw error with incorrect password', async () => {
      await userService.register(testUser);

      const loginDto: LoginDto = {
        email: testUser.email,
        password: 'wrongpassword',
      };

      await expect(userService.login(loginDto)).rejects.toThrow(AuthError);
    });

    it('should throw error if user does not exist', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await expect(userService.login(loginDto)).rejects.toThrow(AuthError);
    });
  });

  describe('getUserById', () => {
    it('should get user by id', async () => {
      const registerResult = await userService.register(testUser);
      const user = await userService.getUserById(registerResult.user.id);

      expect(user.id).toBe(registerResult.user.id);
      expect(user.email).toBe(testUser.email);
    });

    it('should throw error if user does not exist', async () => {
      await expect(userService.getUserById('non-existent-id')).rejects.toThrow(AuthError);
    });
  });

  describe('updateUser', () => {
    it('should update user nickname', async () => {
      const registerResult = await userService.register(testUser);
      const updatedUser = await userService.updateUser(registerResult.user.id, {
        nickname: '新昵称',
      });

      expect(updatedUser.nickname).toBe('新昵称');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const registerResult = await userService.register(testUser);

      await userService.changePassword(
        registerResult.user.id,
        testUser.password,
        'newpassword123'
      );

      // 验证新密码可以登录
      const loginResult = await userService.login({
        email: testUser.email,
        password: 'newpassword123',
      });

      expect(loginResult.user.email).toBe(testUser.email);
    });

    it('should throw error with wrong old password', async () => {
      const registerResult = await userService.register(testUser);

      await expect(userService.changePassword(
        registerResult.user.id,
        'wrongpassword',
        'newpassword123'
      )).rejects.toThrow(ValidationError);
    });
  });

  describe('upgradeMembership', () => {
    it('should upgrade membership to pro', async () => {
      const registerResult = await userService.register(testUser);
      const upgradedUser = await userService.upgradeMembership(
        registerResult.user.id,
        'pro'
      );

      expect(upgradedUser.memberLevel).toBe('pro');
    });
  });
});
