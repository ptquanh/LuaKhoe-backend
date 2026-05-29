import { Module } from '@nestjs/common';

import { ForumModule } from '@modules/forum/forum.module';
import { SystemConfigModule } from '@modules/system-config/system-config.module';

import { AdminForumController } from './controllers/admin-forum.controller';
import { AdminSystemConfigsController } from './controllers/admin-system-configs.controller';
import { AdminForumService } from './services/admin-forum.service';
import { AdminSystemConfigsService } from './services/admin-system-configs.service';

@Module({
  imports: [SystemConfigModule, ForumModule],
  controllers: [AdminSystemConfigsController, AdminForumController],
  providers: [AdminSystemConfigsService, AdminForumService],
  exports: [AdminSystemConfigsService, AdminForumService],
})
export class AdminModule {}
