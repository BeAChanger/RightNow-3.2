import { Module } from '@nestjs/common';
import { DietModule } from '../diet/diet.module';
import { TrainingSessionModule } from '../training-session/training-session.module';
import { TodosModule } from '../todos/todos.module';
import { UsersModule } from '../users/users.module';

import { AgentRpcController, AgentBindingController } from './agent.controller';
import { AgentServiceGuard } from './agent-service.guard';
import { AgentBindingService } from './agent-binding.service';
import { AgentRpcService } from './agent-rpc.service';
import { AgentAuditService } from './agent-audit.service';
import { ToolRegistry } from './tools/tool-registry';

import { userTools } from './tools/user.tools';
import { dietTools } from './tools/diet.tools';
import { trainingTools } from './tools/training.tools';
import { todoTools } from './tools/todo.tools';
import { memoryTools } from './tools/memory.tools';
import { knowledgeTools } from './tools/knowledge.tools';

import { DietService } from '../diet/diet.service';
import { TrainingSessionService } from '../training-session/training-session.service';
import { TodosService } from '../todos/todos.module';
import { UsersService } from '../users/users.module';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [DietModule, TrainingSessionModule, TodosModule, UsersModule],
  controllers: [AgentRpcController, AgentBindingController],
  providers: [
    AgentServiceGuard,
    AgentBindingService,
    AgentRpcService,
    AgentAuditService,
    ToolRegistry,
    {
      provide: 'AGENT_TOOL_INIT',
      inject: [ToolRegistry, DietService, TrainingSessionService, TodosService, UsersService, PrismaService, ConfigService],
      useFactory(
        registry: ToolRegistry,
        diet: DietService,
        training: TrainingSessionService,
        todos: TodosService,
        users: UsersService,
        prisma: PrismaService,
        config: ConfigService,
      ) {
        // Register all P0 + P1 tools
        for (const tool of userTools(users, prisma)) {
          registry.register(tool);
        }
        for (const tool of dietTools(diet)) {
          registry.register(tool);
        }
        for (const tool of trainingTools(training, prisma)) {
          registry.register(tool);
        }
        for (const tool of todoTools(todos)) {
          registry.register(tool);
        }
        for (const tool of memoryTools(prisma)) {
          registry.register(tool);
        }
        for (const tool of knowledgeTools(config)) {
          registry.register(tool);
        }
        // Register auth.bind (handled specially in RPC dispatcher)
        registry.register({
          name: 'auth.bind',
          write: true,
          run: async () => ({ message: 'use RPC dispatch' }),
        });
        return 'ok';
      },
    },
  ],
})
export class AgentModule {}
