export declare class FileEntity {
    id: string;
    ownerId: string | null;
    filename: string;
    mime: string | null;
    size: string | null;
    s3Key: string;
    s3VersionId: string | null;
    status: 'pending' | 'scanning' | 'ready' | 'infected' | 'failed';
    scanResult: string | null;
    scannedAt: Date | null;
    retentionPolicy: string | null;
    retentionExpiresAt: Date | null;
    createdAt: Date;
}
