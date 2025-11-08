export declare enum NodeEnv {
    Development = "development",
    Production = "production",
    Test = "test"
}
export declare class EnvironmentVariables {
    NODE_ENV?: NodeEnv;
    PORT?: number;
    DB_HOST: string;
    DB_PORT: number;
    DB_USER: string;
    DB_PASS: string;
    DB_NAME: string;
    REDIS_URL?: string;
    MINIO_ENDPOINT?: string;
    MINIO_PORT?: number;
    MINIO_ACCESS_KEY?: string;
    MINIO_SECRET_KEY?: string;
    MINIO_BUCKET?: string;
    MINIO_USE_SSL?: boolean;
    ZINC_URL?: string;
    ZINC_USER?: string;
    ZINC_PASS?: string;
    ZINC_INDEX_PREFIX?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: number;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    SMTP_SECURE?: boolean;
    MAIL_FROM?: string;
    S3_SECONDARY_ENABLED?: boolean;
    S3_SECONDARY_ENDPOINT?: string;
    S3_SECONDARY_PORT?: number;
    S3_SECONDARY_ACCESS_KEY?: string;
    S3_SECONDARY_SECRET_KEY?: string;
    S3_SECONDARY_BUCKET?: string;
    S3_SECONDARY_USE_SSL?: boolean;
    VAPID_PUBLIC_KEY?: string;
    VAPID_PRIVATE_KEY?: string;
    VAPID_SUBJECT?: string;
    CORS_ORIGIN?: string;
    RATE_LIMIT_WINDOW_MS?: number;
    RATE_LIMIT_MAX?: number;
    EMAIL_WORKER_CONCURRENCY?: number;
    SEARCH_WORKER_CONCURRENCY?: number;
    NOTIFICATION_WORKER_CONCURRENCY?: number;
    JWT_ACCESS_SECRET?: string;
    JWT_REFRESH_SECRET?: string;
    JWT_ACCESS_TTL?: number;
    JWT_REFRESH_TTL?: number;
    COOKIE_DOMAIN?: string;
    ICS_FEED_SECRET?: string;
    TYPEORM_LOGGING?: boolean;
    TYPEORM_SLOW_QUERY_THRESHOLD_MS?: number;
    TYPEORM_SLOW_QUERY_LOG_FILE?: string;
}
export declare function validate(config: Record<string, unknown>): EnvironmentVariables;
