import { Global, Module } from '@nestjs/common'
import { ConfigService, ConfigModule } from '@nestjs/config'
import { Queue } from 'bullmq'

export const EMAIL_QUEUE = Symbol('EMAIL_QUEUE')
export const SEARCH_QUEUE = Symbol('SEARCH_QUEUE')
export const NOTIFICATION_QUEUE = Symbol('NOTIFICATION_QUEUE')
export const DEAD_QUEUE = Symbol('DEAD_QUEUE')
export const FILESCAN_QUEUE = Symbol('FILESCAN_QUEUE')

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'
        return new Queue('email', { connection: { url } })
      },
    },
    {
      provide: SEARCH_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'
        return new Queue('search', { connection: { url } })
      },
    },
    {
      provide: NOTIFICATION_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'
        return new Queue('notification', { connection: { url } })
      },
    },
    {
      provide: DEAD_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'
        return new Queue('dead', { connection: { url } })
      },
    },
    {
      provide: FILESCAN_QUEUE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'
        return new Queue('filescan', { connection: { url } })
      },
    },
  ],
  exports: [EMAIL_QUEUE, SEARCH_QUEUE, NOTIFICATION_QUEUE, DEAD_QUEUE, FILESCAN_QUEUE],
})
export class QueuesModule {}
