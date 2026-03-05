import { Module } from '@nestjs/common';
import { AdminAuditModule } from './admin-audit.module';
import { AdminAuthModule } from './admin-auth.module';
import { AdminKnowledgeModule } from './admin-knowledge.module';
import { AdminPromptsModule } from './admin-prompts.module';
import { AdminUsersModule } from './admin-users.module';

@Module({
  imports: [
    AdminAuditModule,
    AdminAuthModule,
    AdminUsersModule,
    AdminKnowledgeModule,
    AdminPromptsModule,
  ],
})
export class AdminModule {}
