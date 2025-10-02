import { z } from 'zod';

/**
 * Validation middleware factory
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Where to get data from ('body', 'query', 'params')
 */
export const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const data = req[source];
            const validated = schema.parse(data);
            req[source] = validated;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(err => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            next(error);
        }
    };
};

// Auth validation schemas
export const signupSchema = z.object({
    email: z.string()
        .email('Invalid email format')
        .min(3, 'Email must be at least 3 characters')
        .max(100, 'Email too long'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password too long'),
    fullName: z.string()
        .min(2, 'Full name must be at least 2 characters')
        .max(50, 'Full name too long')
        .trim(),
});

export const loginSchema = z.object({
    email: z.string()
        .email('Invalid email format')
        .min(3, 'Email required'),
    password: z.string()
        .min(1, 'Password required'),
});

export const updateProfileSchema = z.object({
    profilePic: z.string()
        .url('Invalid image URL')
        .optional()
        .or(z.string().startsWith('data:image/', 'Invalid base64 image')),
});

// Message validation schemas
export const sendMessageSchema = z.object({
    text: z.string()
        .min(1, 'Message cannot be empty')
        .max(5000, 'Message too long')
        .trim()
        .optional(),
    image: z.string()
        .url('Invalid image URL')
        .optional()
        .or(z.string().startsWith('data:image/', 'Invalid base64 image')),
}).refine(
    data => data.text || data.image,
    { message: 'Either text or image must be provided' }
);

export const userIdParamSchema = z.object({
    id: z.string()
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
});

// Query parameter schemas
export const paginationSchema = z.object({
    limit: z.string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 50)
        .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
    cursor: z.string()
        .optional(),
});

export default {
    validate,
    signupSchema,
    loginSchema,
    updateProfileSchema,
    sendMessageSchema,
    userIdParamSchema,
    paginationSchema,
};
