import { IsString, IsNumber } from 'class-validator';

export class ConfirmRecordDto {
  @IsString()
  draftId!: string;

  @IsNumber()
  calories!: number;

  @IsNumber()
  protein!: number;

  @IsNumber()
  fat!: number;

  @IsNumber()
  carbs!: number;
}

