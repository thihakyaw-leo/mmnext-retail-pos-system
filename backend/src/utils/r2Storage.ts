/**
 * Cloudflare R2 File Storage Utility
 * Handles uploads, deletes, and URL generation for R2 storage.
 */
import { Env } from '../types/env.js';

interface UploadOptions {
    contentType?: string;
    cacheControl?: string;
    metadata?: Record<string, any>;
    uploadedBy?: string;
    uploadedAt?: string;
}

export class R2StorageService {
    private bucket: R2Bucket;
    private customDomain: string | null;

    constructor(env: Env) {
        this.bucket = env.R2;

        // Check for custom domain in environment (add to env type if needed)
        this.customDomain = (env as any).R2_DOMAIN || null;
    }

    /**
     * Upload a file to R2
     * @param key - The file path/key in the bucket (e.g., "uploads/images/cat.jpg")
     * @param fileData - Can be a string (base64), ArrayBuffer, or ReadableStream
     * @param options - Optional upload settings
     */
    async uploadFile(key: string, fileData: string | ArrayBuffer | ReadableStream, options: UploadOptions = {}): Promise<{ success: boolean; url?: string; error?: string }> {
        try {
            const { contentType, cacheControl, metadata } = options;

            const uploadOptions: any = {
                httpMetadata: {
                    contentType: contentType || 'application/octet-stream',
                },
            };

            if (cacheControl) {
                uploadOptions.httpMetadata.cacheControl = cacheControl;
            }

            if (metadata) {
                uploadOptions.customMetadata = metadata;
            }

            await this.bucket.put(key, fileData, uploadOptions);

            const url = this.generateUrl(key);

            return {
                success: true,
                url,
            };
        } catch (error: any) {
            console.error('[R2StorageService] Upload error:', error);
            return {
                success: false,
                error: error.message || 'Failed to upload to R2',
            };
        }
    }

    /**
     * Delete a single file from R2
     */
    async deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
        try {
            await this.bucket.delete(key);
            return { success: true };
        } catch (error: any) {
            console.error('[R2StorageService] Delete error:', error);
            return {
                success: false,
                error: error.message || 'Failed to delete from R2',
            };
        }
    }

    /**
     * Delete multiple files from R2
     */
    async deleteFiles(keys: string[]): Promise<{ success: boolean; error?: string }> {
        try {
            await Promise.all(keys.map(key => this.bucket.delete(key)));
            return { success: true };
        } catch (error: any) {
            console.error('[R2StorageService] Batch delete error:', error);
            return {
                success: false,
                error: error.message || 'Failed to delete files from R2',
            };
        }
    }

    /**
     * Get file metadata from R2
     */
    async getFile(key: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const file = await this.bucket.get(key);
            if (!file) {
                return {
                    success: false,
                    error: 'File not found',
                };
            }
            return {
                success: true,
                data: file
            };
        } catch (error: any) {
            console.error('[R2StorageService] Get error:', error);
            return {
                success: false,
                error: error.message || 'Failed to get file from R2',
            };
        }
    }

    /**
     * Generate URL for a file
     * Uses custom domain if configured, otherwise uses default R2 URL
     */
    generateUrl(key: string): string {
        if (!key) return '';
        
        // If a custom domain is configured, use it
        if (this.customDomain) {
            return `https://${this.customDomain}/${key}`;
        }
        
        // Use the backend's media streaming route
        return `/api/media/${key}`;
    }

    /**
     * Extract filename from a key
     * e.g., "uploads/images/cat.jpg" -> "cat.jpg"
     */
    getFilenameFromKey(key: string): string {
        return key.split('/').pop() || key;
    }

    /**
     * Extract directory path from a key
     * e.g., "uploads/images/cat.jpg" -> "uploads/images/"
     */
    getDirectoryFromKey(key: string): string {
        const parts = key.split('/');
        parts.pop();
        return parts.length ? `${parts.join('/')}/` : '';
    }
}
