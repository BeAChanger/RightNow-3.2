import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get()
  getMyGroups(@CurrentUser('id') userId: string) {
    return this.groupsService.getMyGroups(userId);
  }

  @Post()
  createGroup(
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; avatar?: string; description?: string },
  ) {
    return this.groupsService.createGroup(userId, body.name, body.avatar, body.description);
  }

  @Get(':id')
  getGroup(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.getGroup(id, userId);
  }

  @Patch(':id')
  updateGroup(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { name?: string; avatar?: string; description?: string },
  ) {
    return this.groupsService.updateGroup(id, userId, body);
  }

  @Delete(':id')
  deleteGroup(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.deleteGroup(id, userId);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { userId: string },
  ) {
    return this.groupsService.addMember(id, userId, body.userId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.groupsService.removeMember(id, userId, targetUserId);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.groupsService.getMessages(id, userId, page ? +page : 1, limit ? +limit : 50);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { content: string; type?: string },
  ) {
    return this.groupsService.sendMessage(id, userId, body.content, body.type);
  }
}
