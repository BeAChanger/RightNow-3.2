import { Module } from '@nestjs/common';
import { TrainingSessionController } from './training-session.controller';
import { TrainingSessionService } from './training-session.service';
import { TodosModule } from '../todos/todos.module';

@Module({
  imports: [TodosModule],
  controllers: [TrainingSessionController],
  providers: [TrainingSessionService],
  exports: [TrainingSessionService]
})
export class TrainingSessionModule {}
