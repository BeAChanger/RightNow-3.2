import { OpenClawModule } from "./openclaw/openclaw.module";
import { AgentModule } from "./agent/agent.module";
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiCoachModule } from './ai-coach/ai-coach.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { CheckinsModule } from './checkins/checkins.module';
import { EvolutionModule } from './evolution/evolution.module';
import { FitnessPlanModule } from './fitness-plan/fitness-plan.module';
import { FriendshipsModule } from './friendships/friendships.module';
import { ImageGenModule } from './image-gen/image-gen.module';
import { DietModule } from './diet/diet.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { TodosModule } from './todos/todos.module';
import { TrainingModule } from './training/training.module';
import { TrainingSessionModule } from './training-session/training-session.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { WeightModule } from './weight/weight.module';
import { EvolutionStageModule } from './evolution-stage/evolution-stage.module';
import { WechatModule } from './wechat/wechat.module';
import { PromptsModule } from './prompts/prompts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AiCoachModule,
    AuthModule,
    UsersModule,
    WeightModule,
    TrainingModule,
    TrainingSessionModule,
    TodosModule,
    CheckinsModule,
    UploadModule,
    EvolutionModule,
    PostsModule,
    FriendshipsModule,
    ChatModule,
  AgentModule,
  OpenClawModule,
    ImageGenModule,
    DietModule,
    FitnessPlanModule,
    EvolutionStageModule,
    WechatModule,
    PromptsModule,
  ],
})
export class AppModule {}
