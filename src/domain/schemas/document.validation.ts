import { z } from 'zod';

export const articleSchema = z.object({
  content: z.string().nonempty('Content is required'),
  language: z.string()
    .min(2, 'Language must be at least 2 characters'),
  root_cause: z.string().nonempty('Root cause is required'),
  metadata: z.record(z.any()).optional(),
});

export const documentsPayloadSchema = z.object({
  articles: z.array(articleSchema)
    .min(1, 'At least one article is required')
});

export type TDocumentsPayload = z.infer<typeof documentsPayloadSchema>;
