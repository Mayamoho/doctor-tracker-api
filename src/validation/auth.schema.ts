import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.email().max(160),
    // No minimum length here: the stored hash defines the real policy, and
    // echoing "too short" back would leak that the account exists.
    password: z.string().min(1, 'Password is required').max(128),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
