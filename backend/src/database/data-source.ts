import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { SnakeNamingStrategy } from 'typeorm-naming-strategies'
import { TypeOrmFileLogger } from './typeorm-logger'

const PORT = Number(process.env.DB_PORT ?? 5432)
const IS_TS = !!process.env.TS_NODE || process.env.NODE_ENV === 'development'
const TYPEORM_LOGGING = String(process.env.TYPEORM_LOGGING ?? 'false').toLowerCase() === 'true'
const SLOW_MS = Number(process.env.TYPEORM_SLOW_QUERY_THRESHOLD_MS ?? 200)
const SLOW_LOG_FILE = process.env.TYPEORM_SLOW_QUERY_LOG_FILE ?? 'logs/slow-queries.log'

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: isNaN(PORT) ? 5432 : PORT,
  username: process.env.DB_USER ?? 'epop',
  password: process.env.DB_PASS ?? 'epop',
  database: process.env.DB_NAME ?? 'epop',
  entities: [IS_TS ? 'src/**/*.entity.ts' : 'dist/**/*.entity.js'],
  migrations: [IS_TS ? 'src/migrations/*.ts' : 'dist/migrations/*.js'],
  namingStrategy: new SnakeNamingStrategy(),
  logging: TYPEORM_LOGGING ? ['error', 'warn', 'query'] : ['error', 'warn'],
  maxQueryExecutionTime: TYPEORM_LOGGING ? SLOW_MS : undefined,
  logger: TYPEORM_LOGGING ? new TypeOrmFileLogger(SLOW_MS, SLOW_LOG_FILE) : 'advanced-console',
})

export default AppDataSource
