import { Module, OnModuleDestroy } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { typeOrmRootAsyncOptions } from '../database/typeorm.config'
import { Message } from '../entities/message.entity'
import { MailMessage } from '../entities/mail-message.entity'
import { FileEntity } from '../entities/file.entity'
import { Task } from '../entities/task.entity'
import { EmailWorkerService } from './email.worker'
import { SearchWorkerService } from './search.worker'
import { SearchService } from '../search/search.service'
import { QueuesModule } from '../queues/queues.module'
import { RedisModule } from '../redis/redis.module'
import { NotificationWorkerService } from './notification.worker'
import { FilesModule } from '../files/files.module'
import { FilesLifecycleWorker } from './files-lifecycle.worker'
import { FileScanWorker } from './file-scan.worker'
import { CalendarReminderWorker } from './calendar-reminder.worker'
import { CalendarEvent } from '../entities/calendar-event.entity'
import { NotificationPreferencesEntity } from '../entities/notification-preferences.entity'
import { User } from '../entities/user.entity'
import { MailerModule } from '../mailer/mailer.module'
import { AnalyticsAggregatorWorker } from './analytics-aggregator.worker'
import { WorkflowExecutorWorker } from './workflow-executor.worker'
import { TaskAssignee } from '../entities/task-assignee.entity'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(typeOrmRootAsyncOptions),
    TypeOrmModule.forFeature([Message, MailMessage, FileEntity, Task, TaskAssignee, CalendarEvent, NotificationPreferencesEntity, User]),
    QueuesModule,
    RedisModule,
    FilesModule,
    MailerModule,
  ],
  providers: [
    EmailWorkerService,
    SearchWorkerService,
    NotificationWorkerService,
    SearchService,
    FilesLifecycleWorker,
    CalendarReminderWorker,
    AnalyticsAggregatorWorker,
    WorkflowExecutorWorker,
    FileScanWorker,
  ],
})
export class WorkersModule implements OnModuleDestroy {
  async onModuleDestroy() {}
}
