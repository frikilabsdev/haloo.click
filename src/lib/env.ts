import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL:          z.string().min(1, "DATABASE_URL es requerida"),
  AUTH_SECRET:           z.string().min(32, "AUTH_SECRET debe tener al menos 32 caracteres"),
  NEXTAUTH_URL:          z.string().url().optional(),
  APP_URL:               z.string().url().optional(),
  NODE_ENV:              z.enum(["development", "production", "test"]).default("development"),
  // Cloudinary (opcional)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY:    z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // WhatsApp del administrador (con código de país, sin +)
  ADMIN_WHATSAPP:        z.string().default("529711260809"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`[env] Variables de entorno inválidas o faltantes:\n${issues}`);
  }
  return result.data;
}

export const env = validateEnv();
