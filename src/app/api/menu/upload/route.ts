import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v2 as cloudinary } from "cloudinary";
import { assertTenantAccess } from "@/lib/tenant";
import { rateLimit } from "@/lib/ratelimit";

// ─── Config ───────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE      = 3 * 1024 * 1024; // 3 MB post-compresión

// ─── Validación de magic bytes (firma real del archivo) ───────────────────────
// Evita que un atacante cambie la extensión/MIME para subir archivos maliciosos.

function detectImageType(buffer: Buffer): string | null {
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) return "image/png";
  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return "image/webp";
  return null;
}

// ─── Cloudinary (si hay credenciales configuradas) ────────────────────────────

function getCloudinaryConfig(): boolean {
  const name   = process.env.CLOUDINARY_CLOUD_NAME;
  const key    = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || !key || !secret) return false;
  cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret });
  return true;
}

async function uploadToCloudinary(buffer: Buffer, tenantId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const folder = `haloo/${tenantId}/products`;
    cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", format: "webp", quality: "auto:good" },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Sin resultado de Cloudinary"));
        resolve(result.secure_url);
      }
    ).end(buffer);
  });
}

// ─── POST /api/menu/upload ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Sin restaurante asociado." }, { status: 403 });
    }

    // ── Rate limiting: 30 uploads por tenant por hora (protege Cloudinary) ───
    const rl = rateLimit(`upload:${tenantId}`, 30, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Límite de subida de imágenes alcanzado. Espera un momento." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
        }
      );
    }

    await assertTenantAccess(session.user.id, tenantId);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. El cliente debe enviar JPEG, PNG o WebP." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera los 3 MB. Verifica la compresión del cliente." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ── Validar magic bytes — no confiar solo en el MIME del cliente ──────────
    const detectedType = detectImageType(buffer);
    if (!detectedType || !ALLOWED_TYPES.includes(detectedType)) {
      return NextResponse.json(
        { error: "El contenido del archivo no corresponde a una imagen válida." },
        { status: 400 }
      );
    }

    // ── 1. Cloudinary (producción) ─────────────────────────────────────────
    if (getCloudinaryConfig()) {
      const url = await uploadToCloudinary(buffer, tenantId);
      return NextResponse.json({ url });
    }

    // ── Producción sin Cloudinary: el filesystem es read-only en serverless ─
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Almacenamiento de imágenes no configurado. Configura las variables CLOUDINARY_* en el entorno." },
        { status: 503 }
      );
    }

    // ── 2. Fallback: sistema de archivos local (solo desarrollo) ──────────
    const ext = detectedType === "image/webp" ? "webp" : detectedType === "image/png" ? "png" : "jpg";
    const bytes  = crypto.getRandomValues(new Uint8Array(8));
    const randId = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    const filename  = `${tenantId}-${Date.now()}-${randId}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "products");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/products/${filename}` });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    console.error("[menu/upload POST]", error);
    return NextResponse.json({ error: "Error al procesar la imagen." }, { status: 500 });
  }
}
