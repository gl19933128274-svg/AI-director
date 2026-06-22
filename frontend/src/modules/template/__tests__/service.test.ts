import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient, MemberLevel } from '@prisma/client';
import { templateService, CreateTemplateDto } from '../service';
import { ValidationError, TemplateError } from '../errors';

const prisma = new PrismaClient();

describe('Template Service', () => {
  beforeEach(async () => {
    await prisma.template.deleteMany({});
  });

  afterEach(async () => {
    await prisma.template.deleteMany({});
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create a template successfully', async () => {
      const dto: CreateTemplateDto = {
        name: '电影风格模板',
        description: '适合电影级别的视频生成',
        config: {
          scene: {
            style: 'cinematic',
            aspectRatio: '16:9',
          },
          shots: [
            { type: 'wide', duration: 3 },
            { type: 'closeup', duration: 2 },
          ],
        },
        requiredLevel: 'pro',
      };

      const template = await templateService.create(dto);

      expect(template.name).toBe(dto.name);
      expect(template.description).toBe(dto.description);
      expect(template.requiredLevel).toBe('pro');
      expect((template.config as any).scene.style).toBe('cinematic');
    });

    it('should throw error if name is too short', async () => {
      const dto: CreateTemplateDto = {
        name: 'a',
        config: {},
      };

      await expect(templateService.create(dto)).rejects.toThrow(ValidationError);
    });

    it('should throw error if config is invalid', async () => {
      const dto: any = {
        name: '测试模板',
        config: 'invalid',
      };

      await expect(templateService.create(dto)).rejects.toThrow(ValidationError);
    });
  });

  describe('getById', () => {
    it('should get template by id', async () => {
      const dto: CreateTemplateDto = {
        name: '测试模板',
        config: {},
      };
      const created = await templateService.create(dto);

      const template = await templateService.getById(created.id);

      expect(template).not.toBeNull();
      expect(template?.name).toBe(dto.name);
    });

    it('should return null if template does not exist', async () => {
      const template = await templateService.getById('non-existent-id');
      expect(template).toBeNull();
    });
  });

  describe('getTemplates', () => {
    it('should get templates with pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await templateService.create({
          name: `模板 ${i}`,
          config: {},
          requiredLevel: i % 2 === 0 ? 'free' : 'pro',
        });
      }

      const result = await templateService.getTemplates({ page: 1, limit: 3 });

      expect(result.templates.length).toBe(3);
      expect(result.total).toBe(5);
    });

    it('should filter by requiredLevel', async () => {
      await templateService.create({ name: 'Free模板', config: {}, requiredLevel: 'free' });
      await templateService.create({ name: 'Pro模板', config: {}, requiredLevel: 'pro' });

      const result = await templateService.getTemplates({ requiredLevel: 'free' });

      expect(result.total).toBe(1);
      expect(result.templates[0].name).toBe('Free模板');
    });
  });

  describe('update', () => {
    it('should update template successfully', async () => {
      const created = await templateService.create({
        name: '原始名称',
        config: {},
      });

      const updated = await templateService.update(created.id, {
        name: '更新后的名称',
        description: '更新后的描述',
      });

      expect(updated.name).toBe('更新后的名称');
      expect(updated.description).toBe('更新后的描述');
    });

    it('should throw error if template does not exist', async () => {
      await expect(templateService.update('non-existent-id', { name: 'new name' }))
        .rejects.toThrow(TemplateError);
    });
  });

  describe('delete', () => {
    it('should delete template successfully', async () => {
      const created = await templateService.create({
        name: '测试模板',
        config: {},
      });

      await templateService.delete(created.id);

      const template = await templateService.getById(created.id);
      expect(template).toBeNull();
    });

    it('should throw error if template does not exist', async () => {
      await expect(templateService.delete('non-existent-id')).rejects.toThrow(TemplateError);
    });
  });

  describe('checkAccess', () => {
    it('should return true if user has access', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'pro',
        },
      });

      const template = await templateService.create({
        name: 'Pro模板',
        config: {},
        requiredLevel: 'pro',
      });

      const hasAccess = await templateService.checkAccess(user.id, template.id);
      expect(hasAccess).toBe(true);

      await prisma.user.delete({ where: { id: user.id } });
    });

    it('should return false if user does not have access', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed',
          nickname: '测试用户',
          memberLevel: 'free',
        },
      });

      const template = await templateService.create({
        name: 'Pro模板',
        config: {},
        requiredLevel: 'pro',
      });

      const hasAccess = await templateService.checkAccess(user.id, template.id);
      expect(hasAccess).toBe(false);

      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('applyTemplate', () => {
    it('should merge template config with input data', async () => {
      const template = await templateService.create({
        name: '测试模板',
        config: {
          scene: { style: 'cinematic', aspectRatio: '16:9' },
          shots: [
            { type: 'wide', duration: 3 },
          ],
        },
      });

      const result = await templateService.applyTemplate(template.id, {
        scene: { duration: 60 },
        shots: [
          { type: 'closeup' },
        ],
      });

      expect(result.scene.style).toBe('cinematic');
      expect(result.scene.duration).toBe(60);
      expect(result.shots[0].type).toBe('closeup');
      expect(result.shots[0].duration).toBe(3);
    });
  });
});