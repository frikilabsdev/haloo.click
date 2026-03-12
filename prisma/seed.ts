/**
 * Seed de prueba — restaurante demo con categorías, productos y opciones.
 * Ejecutar: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: "postgresql://postgres:postgres@localhost:5432/postgres",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── Limpiar datos previos del demo ─────────────────────────────────────────
  await prisma.tenantUser.deleteMany({ where: { tenant: { slug: "demo-tacos" } } });
  await prisma.tenant.deleteMany({ where: { slug: "demo-tacos" } });
  await prisma.user.deleteMany({ where: { email: "demo@haloo.click" } });

  // ── Usuario dueño ──────────────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: "demo@haloo.click",
      password: await hash("demo1234", 12),
      name: "Demo Owner",
    },
  });

  // ── Tenant activo ──────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      slug: "demo-tacos",
      name: "Tacos El Compa",
      type: "tacos",
      description: "Los mejores tacos de la colonia desde 1995.",
      phone: "+52 55 1234 5678",
      whatsappNumber: "+525512345678",
      status: "ACTIVE",
      plan: "BASIC",
      address: "Av. Insurgentes Sur 123, Col. Roma",
      whatsappMessageTemplate: "Hola! Quiero hacer un pedido:\n{items}\n\nTotal: {total}\n\nDatos de entrega:\nNombre: {name}\nDirección: {address}\nPago: {payment}",
    },
  });

  // ── Relación owner ─────────────────────────────────────────────────────────
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: user.id, role: "OWNER" },
  });

  // ── Horarios ───────────────────────────────────────────────────────────────
  const days = [
    { day: 0, open: "09:00", close: "22:00", active: false }, // Domingo
    { day: 1, open: "09:00", close: "22:00", active: true  },
    { day: 2, open: "09:00", close: "22:00", active: true  },
    { day: 3, open: "09:00", close: "22:00", active: true  },
    { day: 4, open: "09:00", close: "23:00", active: true  },
    { day: 5, open: "09:00", close: "23:00", active: true  },
    { day: 6, open: "10:00", close: "23:00", active: true  }, // Sábado
  ];
  await prisma.schedule.createMany({
    data: days.map(d => ({
      tenantId: tenant.id, dayOfWeek: d.day,
      openTime: d.open, closeTime: d.close, isActive: d.active,
    })),
  });

  // ── Config pagos ───────────────────────────────────────────────────────────
  await prisma.paymentConfig.create({
    data: {
      tenantId: tenant.id,
      cashEnabled: true,
      transferEnabled: true,
      cardEnabled: true,
      bankName: "BBVA",
      clabe: "012180001234567890",
      accountHolder: "Tacos El Compa SA de CV",
    },
  });

  // ── Zonas de entrega ───────────────────────────────────────────────────────
  await prisma.deliveryZone.createMany({
    data: [
      { tenantId: tenant.id, name: "Roma / Condesa",    cost: 35,  isActive: true },
      { tenantId: tenant.id, name: "Centro Histórico",  cost: 55,  isActive: true },
      { tenantId: tenant.id, name: "Polanco",           cost: 65,  isActive: true },
      { tenantId: tenant.id, name: "Coyoacán",          cost: 75,  isActive: true },
      { tenantId: tenant.id, name: "Recoger en local",  cost: 0,   isFree: true, isActive: true },
    ],
  });

  // ── CATEGORÍA 1: Tacos ─────────────────────────────────────────────────────
  const catTacos = await prisma.category.create({
    data: { tenantId: tenant.id, name: "Tacos", description: "Tortilla de maíz hecha a mano", position: 0, isActive: true },
  });

  // Taco pastor
  const pastor = await prisma.product.create({
    data: {
      tenantId: tenant.id, categoryId: catTacos.id,
      name: "Tacos al Pastor",
      description: "Carne adobada con piña, cilantro y cebolla. La receta de siempre.",
      basePrice: 22, position: 0, isActive: true, isAvailable: true,
    },
  });
  await prisma.productImage.createMany({
    data: [
      { productId: pastor.id, url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80", position: 0 },
      { productId: pastor.id, url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80", position: 1 },
    ],
  });
  // ── Complementos compartidos (biblioteca del tenant) ─────────────────────
  // "Salsa" se comparte entre pastor y bistec — solo se crea una vez
  const gSalsa = await prisma.optionGroup.create({
    data: { tenantId: tenant.id, name: "Salsa", required: true, multiple: false, min: 1, max: 1, position: 0 },
  });
  await prisma.option.createMany({
    data: [
      { optionGroupId: gSalsa.id, name: "Verde (suave)",    price: 0, position: 0 },
      { optionGroupId: gSalsa.id, name: "Roja (picante)",   price: 0, position: 1 },
      { optionGroupId: gSalsa.id, name: "Habanero (fuego)", price: 0, position: 2 },
    ],
  });

  const gCantidad = await prisma.optionGroup.create({
    data: { tenantId: tenant.id, name: "¿Cuántos tacos?", required: true, multiple: false, min: 1, max: 1, position: 1 },
  });
  await prisma.option.createMany({
    data: [
      { optionGroupId: gCantidad.id, name: "1 taco",  price: 0,  position: 0 },
      { optionGroupId: gCantidad.id, name: "3 tacos", price: 44, position: 1 },
      { optionGroupId: gCantidad.id, name: "5 tacos", price: 88, position: 2 },
    ],
  });

  const gExtras = await prisma.optionGroup.create({
    data: { tenantId: tenant.id, name: "Extras", required: false, multiple: true, position: 2 },
  });
  await prisma.option.createMany({
    data: [
      { optionGroupId: gExtras.id, name: "Doble carne",   price: 15, position: 0 },
      { optionGroupId: gExtras.id, name: "Queso fundido", price: 12, position: 1 },
      { optionGroupId: gExtras.id, name: "Aguacate",      price: 10, position: 2 },
    ],
  });

  // Asignar complementos al pastor
  await prisma.productComplement.createMany({
    data: [
      { productId: pastor.id, optionGroupId: gCantidad.id, position: 0 },
      { productId: pastor.id, optionGroupId: gExtras.id,   position: 1 },
      { productId: pastor.id, optionGroupId: gSalsa.id,    position: 2 },
    ],
  });

  // Taco bistec — comparte "Salsa" de la biblioteca
  const bistec = await prisma.product.create({
    data: {
      tenantId: tenant.id, categoryId: catTacos.id,
      name: "Tacos de Bistec",
      description: "Carne de res asada al comal con especias y limón.",
      basePrice: 25, position: 1, isActive: true, isAvailable: true,
    },
  });
  await prisma.productImage.create({
    data: { productId: bistec.id, url: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&q=80", position: 0 },
  });
  // Bistec usa el mismo complemento "Salsa" — sin duplicar
  await prisma.productComplement.create({
    data: { productId: bistec.id, optionGroupId: gSalsa.id, position: 0 },
  });

  // Quesadilla (sin imagen)
  await prisma.product.create({
    data: {
      tenantId: tenant.id, categoryId: catTacos.id,
      name: "Quesadilla de Huitlacoche",
      description: "Tortilla de maíz azul con quesillo oaxaqueño y huitlacoche. Producto de temporada.",
      basePrice: 38, position: 2, isActive: true, isAvailable: false,
    },
  });

  // ── CATEGORÍA 2: Tortas ────────────────────────────────────────────────────
  const catTortas = await prisma.category.create({
    data: { tenantId: tenant.id, name: "Tortas", position: 1, isActive: true },
  });

  const tortaCubana = await prisma.product.create({
    data: {
      tenantId: tenant.id, categoryId: catTortas.id,
      name: "Torta Cubana",
      description: "Milanesa, jamón, queso, chorizo, pierna y todos los ingredientes en un bolillo crujiente.",
      basePrice: 85, position: 0, isActive: true, isAvailable: true,
    },
  });
  await prisma.productImage.create({
    data: { productId: tortaCubana.id, url: "https://images.unsplash.com/photo-1512152272829-e3139592d56f?w=600&q=80", position: 0 },
  });

  const gTortaTamano = await prisma.optionGroup.create({
    data: { tenantId: tenant.id, name: "Tamaño", required: true, multiple: false, position: 3 },
  });
  await prisma.option.createMany({
    data: [
      { optionGroupId: gTortaTamano.id, name: "Chica",  price: 0,  position: 0 },
      { optionGroupId: gTortaTamano.id, name: "Grande", price: 20, position: 1 },
    ],
  });

  const gTortaIngredientes = await prisma.optionGroup.create({
    data: { tenantId: tenant.id, name: "Personalizar", required: false, multiple: true, position: 4 },
  });
  await prisma.option.createMany({
    data: [
      { optionGroupId: gTortaIngredientes.id, name: "Sin cebolla",    price: 0,  position: 0 },
      { optionGroupId: gTortaIngredientes.id, name: "Sin jalapeño",   price: 0,  position: 1 },
      { optionGroupId: gTortaIngredientes.id, name: "Extra aguacate", price: 15, position: 2 },
    ],
  });

  await prisma.productComplement.createMany({
    data: [
      { productId: tortaCubana.id, optionGroupId: gTortaTamano.id,      position: 0 },
      { productId: tortaCubana.id, optionGroupId: gTortaIngredientes.id, position: 1 },
    ],
  });

  // ── CATEGORÍA 3: Bebidas ───────────────────────────────────────────────────
  const catBebidas = await prisma.category.create({
    data: { tenantId: tenant.id, name: "Bebidas", position: 2, isActive: true },
  });

  await prisma.product.createMany({
    data: [
      { tenantId: tenant.id, categoryId: catBebidas.id, name: "Agua de Jamaica",    description: "Fresca y natural, preparada en casa.", basePrice: 18, position: 0 },
      { tenantId: tenant.id, categoryId: catBebidas.id, name: "Agua de Horchata",   description: "Arroz con canela, receta de la abuela.",   basePrice: 18, position: 1 },
      { tenantId: tenant.id, categoryId: catBebidas.id, name: "Michelada",          description: "Cerveza, clamato, limón y chamoy.",           basePrice: 65, position: 2 },
      { tenantId: tenant.id, categoryId: catBebidas.id, name: "Refresco de lata",   description: "Coca-Cola, Pepsi, Sprite o Fanta.",            basePrice: 25, position: 3 },
    ],
  });

  // ── CATEGORÍA 4: Extras ────────────────────────────────────────────────────
  const catExtras = await prisma.category.create({
    data: { tenantId: tenant.id, name: "Extras", position: 3, isActive: true },
  });

  await prisma.product.createMany({
    data: [
      { tenantId: tenant.id, categoryId: catExtras.id, name: "Guacamole con totopos", description: "Aguacate fresco, jitomate, cilantro y limón.", basePrice: 45, position: 0 },
      { tenantId: tenant.id, categoryId: catExtras.id, name: "Frijoles de la olla",   description: "Frijol negro con epazote, porción generosa.",  basePrice: 25, position: 1 },
    ],
  });

  console.log("\n✅ Seed completado:");
  console.log(`   Restaurante: ${tenant.name}`);
  console.log(`   URL menú:    http://localhost:3002/${tenant.slug}`);
  console.log(`   Login demo:  demo@haloo.click / demo1234`);
}

main()
  .catch(e => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
