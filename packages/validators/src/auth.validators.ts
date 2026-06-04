import {z} from "zod"

export const signInSchema = z.object({
    email: z.email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
    name: z.string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name is too long"),
    email: z.email("Invalid email"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[0-9]/, "Must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export type SignUpForm = z.infer<typeof signUpSchema>;
export type SignInForm = z.infer<typeof signInSchema>;