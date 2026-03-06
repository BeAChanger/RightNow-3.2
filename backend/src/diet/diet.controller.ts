import { Controller } from '@nestjs/common';
import { DietService } from './diet.service';

@Controller('diet')
export class DietController {
  constructor(private readonly dietService: DietService) {}
}
