import { z } from "zod";
import { REGISTERABLE_USER_ROLES } from "@/types/user";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
  email: z.string().trim().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(REGISTERABLE_USER_ROLES),
});
