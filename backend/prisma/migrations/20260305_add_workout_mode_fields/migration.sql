-- AlterTable
ALTER TABLE "TrainingRecord" ADD COLUMN "conversationId" TEXT,
ADD COLUMN "workoutMode" BOOLEAN NOT NULL DEFAULT false;
