const { z } = require('zod');

const botTokenSchema = z.string().trim().min(20).max(200);
const chatIdSchema = z
    .string()
    .trim()
    .regex(/^-?\d{1,50}$/, 'Chat ID must be numeric');
const chatTypeSchema = z.enum(['channel', 'group', 'private']);
const usernameSchema = z.string().trim().min(1).max(100).optional();

const connectTelegramSchema = z.object({
    botToken: botTokenSchema,
    chatId: chatIdSchema,
    chatType: chatTypeSchema.optional(),
    username: usernameSchema,
});

const updateTelegramSchema = z
    .object({
        botToken: botTokenSchema.optional(),
        chatId: chatIdSchema.optional(),
        chatType: chatTypeSchema.optional(),
        username: usernameSchema,
    })
    .refine((data) => data.botToken !== undefined && data.chatId !== undefined, {
        message: 'Bot token and chat ID must be provided together',
    });

module.exports = {
    botTokenSchema,
    connectTelegramSchema,
    updateTelegramSchema,
};
