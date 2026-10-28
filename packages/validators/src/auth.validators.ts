import { z } from 'zod';

export interface IPasswordRule {
  id: string;
  label: string; // shown in the checklist
  message: string; // shown as the validation error
  test: (value: string) => boolean;
}

export const passwordRules: IPasswordRule[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    message: 'Password must be at least 8 characters',
    test: (v) => v.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    message: 'Must contain at least one uppercase letter',
    test: (v) => /[A-Z]/.test(v),
  },
  {
    id: 'number',
    label: 'One number',
    message: 'Must contain at least one number',
    test: (v) => /[0-9]/.test(v),
  },
  {
    id: 'special',
    label: 'One special character',
    message: 'Must contain at least one special character',
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

export const passwordSchema = z.string().superRefine((value, ctx) => {
  for (const rule of passwordRules) {
    if (!rule.test(value)) {
      ctx.addIssue({ code: 'custom', message: rule.message });
    }
  }
});

export const signInSchema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signUpSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
    email: z.email('Invalid email'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email'),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
