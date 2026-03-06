import {
  BadRequestException,
  Controller,
  Get,
  Module,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { imageUploadOptions } from '../common/upload.util';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get()
  list(
    @CurrentUser() user: { sub: string },
    @Query('kind') kind?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.uploadService.list(user.sub, {
      kind,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  upload(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.uploadService.save(user.sub, file.filename, 'general');
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  uploadAvatar(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    return this.uploadService.save(user.sub, file.filename, 'avatar');
  }
}

@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
