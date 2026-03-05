import { IsString, IsOptional } from 'class-validator';

export class AnalyzeTextDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

