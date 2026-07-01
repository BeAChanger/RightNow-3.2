import { Module } from '@nestjs/common';
import { OpenClawClient } from './openclaw.client';
import { OpenClawProvisioningService } from './openclaw-provisioning.service';

@Module({
  providers: [OpenClawClient, OpenClawProvisioningService],
  exports: [OpenClawClient, OpenClawProvisioningService],
})
export class OpenClawModule {}
