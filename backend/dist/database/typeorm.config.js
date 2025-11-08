"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmRootAsyncOptions = void 0;
const config_1 = require("@nestjs/config");
const typeorm_naming_strategies_1 = require("typeorm-naming-strategies");
const typeorm_logger_1 = require("./typeorm-logger");
exports.typeOrmRootAsyncOptions = {
    inject: [config_1.ConfigService],
    useFactory: (config) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get('DB_PORT'),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
        namingStrategy: new typeorm_naming_strategies_1.SnakeNamingStrategy(),
        migrations: ['dist/migrations/*.js'],
        migrationsRun: false,
        logging: (String(config.get('TYPEORM_LOGGING') ?? 'false').toLowerCase() === 'true')
            ? ['error', 'warn', 'query']
            : ['error', 'warn'],
        maxQueryExecutionTime: (String(config.get('TYPEORM_LOGGING') ?? 'false').toLowerCase() === 'true')
            ? Number(config.get('TYPEORM_SLOW_QUERY_THRESHOLD_MS') ?? 200)
            : undefined,
        logger: (String(config.get('TYPEORM_LOGGING') ?? 'false').toLowerCase() === 'true')
            ? new typeorm_logger_1.TypeOrmFileLogger(Number(config.get('TYPEORM_SLOW_QUERY_THRESHOLD_MS') ?? 200), config.get('TYPEORM_SLOW_QUERY_LOG_FILE') ?? 'logs/slow-queries.log')
            : 'advanced-console',
    }),
};
//# sourceMappingURL=typeorm.config.js.map