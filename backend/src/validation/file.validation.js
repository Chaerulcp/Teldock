const { z } = require('zod');

const MAX_FILE_NAME_LENGTH = 500;
const MAX_SHARE_DURATION_SECONDS = 31_536_000;
const MAX_DOWNLOAD_LIMIT = 1_000_000;
const MAX_SELECTED_FILES = 100;
const MAX_TAGS_PER_FILE = 100;
const MAX_PASSWORD_BYTES = 72;

const fileIdSchema = z.string().uuid();
const folderIdSchema = z.union([fileIdSchema, z.literal('root'), z.literal(''), z.null()]);

const shareFileSchema = z
    .object({
        expiresIn: z.coerce.number().int().positive().max(MAX_SHARE_DURATION_SECONDS).optional(),
        downloadLimit: z.coerce.number().int().positive().max(MAX_DOWNLOAD_LIMIT).optional(),
        password: z
            .string()
            .min(1)
            .refine(
                (value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES,
                `Password must not exceed ${MAX_PASSWORD_BYTES} bytes`,
            )
            .optional(),
        allowPreview: z.boolean().optional(),
    })
    .strict();

const updateFileSchema = z
    .object({
        displayFilename: z.string().trim().min(1).max(MAX_FILE_NAME_LENGTH).optional(),
        folderId: folderIdSchema.optional(),
        isFavorite: z.boolean().optional(),
    })
    .strict()
    .refine(
        (data) => data.displayFilename !== undefined || data.folderId !== undefined || data.isFavorite !== undefined,
        'Provide at least one file property to update',
    );

const setFileTagsSchema = z
    .object({
        tagIds: z
            .array(fileIdSchema)
            .max(MAX_TAGS_PER_FILE)
            .refine((tagIds) => new Set(tagIds).size === tagIds.length, 'Tag IDs must be unique'),
    })
    .strict();

const bulkActionSchema = z
    .object({
        action: z.enum(['delete', 'move']),
        fileIds: z
            .array(fileIdSchema)
            .min(1)
            .max(MAX_SELECTED_FILES)
            .refine((fileIds) => new Set(fileIds).size === fileIds.length, 'File IDs must be unique'),
        folderId: folderIdSchema.optional(),
    })
    .strict();

module.exports = {
    bulkActionSchema,
    setFileTagsSchema,
    shareFileSchema,
    updateFileSchema,
};
