/**
 * Seed demo — London Pizza
 * Ejecutar: npx tsx prisma/seed-pizza.ts
 *
 * Estructura del menú basada en imagen real:
 * - Pizzas 1 Ingrediente (IND $100 / MED $155 / FAM $230)
 * - Pizzas 2 Ingredientes (IND $110 / MED $175 / FAM $255)
 * - Pizzas 4 Ingredientes (IND $120 / MED $185 / FAM $270)
 * - Pizzas 6 Ingredientes (IND $130 / MED $210 / FAM $310)
 * - Bebidas
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: "postgresql://postgres:postgres@localhost:5432/postgres",
});
const prisma = new PrismaClient({ adapter });

// Imágenes de Unsplash para cada pizza (pizza específica → foto temática)
const PIZZA_IMAGES: Record<string, string> = {
  "4 Quesos":       "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80",
  "Vegetariana":    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80",
  "Milan":          "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600&q=80",
  "Turin":          "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80",
  "Toscana":        "https://images.unsplash.com/photo-1548369937-47519962c11a?w=600&q=80",
  "Big-Ben":        "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80",
  "Manchester":     "https://images.unsplash.com/photo-1604917621956-10dfa7cce2e7?w=600&q=80",
  "Carnes Frías":   "https://images.unsplash.com/photo-1555072956-7758afb20e8f?w=600&q=80",
  "London":         "https://images.unsplash.com/photo-1520201163981-8cc95007dd2a?w=600&q=80",
  "Cyrcus":         "https://images.unsplash.com/photo-1593504049359-74330189a345?w=600&q=80",
};

async function main() {
  console.log("🌱 Iniciando seed London Pizza...");

  // ── Limpiar datos previos ──────────────────────────────────────────────────
  await prisma.tenantUser.deleteMany({ where: { tenant: { slug: "demo-pizza" } } });
  await prisma.tenant.deleteMany({ where: { slug: "demo-pizza" } });
  await prisma.user.deleteMany({ where: { email: "pizza@haloo.click" } });

  // ── Usuario dueño ─────────────────────────────────────────────────────────
  const user = await prisma.user.create({
    data: {
      email: "pizza@haloo.click",
      password: await hash("pizza1234", 12),
      name: "London Pizza Owner",
    },
  });

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      slug:        "demo-pizza",
      name:        "London Pizza",
      type:        "pizza",
      description: "Las mejores pizzas artesanales de la ciudad. Masa fresca, ingredientes premium, horneadas al momento.",
      phone:       "+52 33 9876 5432",
      whatsappNumber: "+523398765432",
      status:      "ACTIVE",
      plan:        "BASIC",
      address:     "Av. Vallarta 4567, Col. Americana",
      logo:        "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80",
      coverImage:  "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=1200&q=80",
      whatsappMessageTemplate: "¡Hola London Pizza! Quiero hacer un pedido:\n{items}\n\nTotal: {total}\n\nDatos de entrega:\nNombre: {name}\nDirección: {address}\nPago: {payment}",
    },
  });

  // ── Relación owner ────────────────────────────────────────────────────────
  await prisma.tenantUser.create({
    data: { tenantId: tenant.id, userId: user.id, role: "OWNER" },
  });

  // ── Horarios ──────────────────────────────────────────────────────────────
  await prisma.schedule.createMany({
    data: [
      { tenantId: tenant.id, dayOfWeek: 0, openTime: "12:00", closeTime: "23:00", isActive: true  }, // Dom
      { tenantId: tenant.id, dayOfWeek: 1, openTime: "13:00", closeTime: "22:00", isActive: true  },
      { tenantId: tenant.id, dayOfWeek: 2, openTime: "13:00", closeTime: "22:00", isActive: true  },
      { tenantId: tenant.id, dayOfWeek: 3, openTime: "13:00", closeTime: "22:00", isActive: true  },
      { tenantId: tenant.id, dayOfWeek: 4, openTime: "13:00", closeTime: "23:00", isActive: true  },
      { tenantId: tenant.id, dayOfWeek: 5, openTime: "12:00", closeTime: "23:30", isActive: true  }, // Sáb
      { tenantId: tenant.id, dayOfWeek: 6, openTime: "12:00", closeTime: "23:30", isActive: true  }, // Dom
    ],
  });

  // ── Config pagos ──────────────────────────────────────────────────────────
  await prisma.paymentConfig.create({
    data: {
      tenantId:      tenant.id,
      cashEnabled:   true,
      transferEnabled: true,
      cardEnabled:   false,
      bankName:      "Banorte",
      clabe:         "072320001234567890",
      accountHolder: "London Pizza SA de CV",
    },
  });

  // ── Zonas de entrega ──────────────────────────────────────────────────────
  await prisma.deliveryZone.createMany({
    data: [
      { tenantId: tenant.id, name: "Americana / Vallarta",   cost: 30,  isActive: true },
      { tenantId: tenant.id, name: "Chapultepec / Lafayette", cost: 40,  isActive: true },
      { tenantId: tenant.id, name: "Providencia",            cost: 50,  isActive: true },
      { tenantId: tenant.id, name: "Tlaquepaque",            cost: 65,  isActive: true },
      { tenantId: tenant.id, name: "Zapopan Centro",         cost: 70,  isActive: true },
      { tenantId: tenant.id, name: "Recoger en local",       cost: 0,   isFree: true, isActive: true },
    ],
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Complemento compartido: "Extras" — todas las pizzas usan el mismo
  // ══════════════════════════════════════════════════════════════════════════
  const gPizzaExtras = await prisma.optionGroup.create({
    data: { tenantId: tenant.id, name: "Extras", required: false, multiple: true, position: 0 },
  });
  await prisma.option.createMany({
    data: [
      { optionGroupId: gPizzaExtras.id, name: "Extra queso",     price: 20, position: 0 },
      { optionGroupId: gPizzaExtras.id, name: "Orilla de queso", price: 30, position: 1 },
      { optionGroupId: gPizzaExtras.id, name: "Sin cebolla",     price: 0,  position: 2 },
      { optionGroupId: gPizzaExtras.id, name: "Sin jalapeño",    price: 0,  position: 3 },
    ],
  });

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER — crea grupo de tamaño + asigna extras compartidos a un producto
  // ══════════════════════════════════════════════════════════════════════════
  // Los tamaños de pizza varían por categoría (precios distintos), por lo que
  // cada producto tiene su propio grupo de Tamaño en la biblioteca.
  async function addSizeAndExtras(
    productId: string,
    medExtra: number,
    famExtra: number,
    extrasGroupId?: string, // grupo de extras compartido entre pizzas
  ) {
    // Tamaño — precio varía por pizza, grupo individual
    const gSize = await prisma.optionGroup.create({
      data: { tenantId: tenant.id, name: "Tamaño", required: true, multiple: false, position: 0 },
    });
    await prisma.option.createMany({
      data: [
        { optionGroupId: gSize.id, name: "Individual", price: 0,        position: 0 },
        { optionGroupId: gSize.id, name: "Mediana",    price: medExtra,  position: 1 },
        { optionGroupId: gSize.id, name: "Familiar",   price: famExtra,  position: 2 },
      ],
    });

    // Asignar Tamaño al producto
    await prisma.productComplement.create({
      data: { productId, optionGroupId: gSize.id, position: 0 },
    });

    // Extras — se reutiliza si ya fue creado
    const gid = extrasGroupId!;
    await prisma.productComplement.create({
      data: { productId, optionGroupId: gid, position: 1 },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORÍA 1 — Pizzas 1 Ingrediente (base IND $100)
  // ══════════════════════════════════════════════════════════════════════════
  const cat1 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Pizzas 1 Ingrediente",
      description: "Clásicas. Individual $100 · Mediana $155 · Familiar $230",
      position: 0, isActive: true,
    },
  });

  const pizzas1: Array<{ name: string; desc: string }> = [
    { name: "4 Quesos",    desc: "Mozarela, manchego, gouda y queso crema sobre salsa base." },
    { name: "Vegetariana", desc: "Pimiento, champiñones, cebolla, aceituna y jitomate cherry." },
  ];

  for (let i = 0; i < pizzas1.length; i++) {
    const { name, desc } = pizzas1[i];
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id, categoryId: cat1.id,
        name, description: desc,
        basePrice: 100, position: i, isActive: true, isAvailable: true,
      },
    });
    if (PIZZA_IMAGES[name]) {
      await prisma.productImage.create({
        data: { productId: product.id, url: PIZZA_IMAGES[name], position: 0 },
      });
    }
    await addSizeAndExtras(product.id, 55, 130, gPizzaExtras.id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORÍA 2 — Pizzas 2 Ingredientes (base IND $110)
  // ══════════════════════════════════════════════════════════════════════════
  const cat2 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Pizzas 2 Ingredientes",
      description: "Combinaciones populares. Individual $110 · Mediana $175 · Familiar $255",
      position: 1, isActive: true,
    },
  });

  const pizzas2: Array<{ name: string; desc: string }> = [
    { name: "Milan",      desc: "Pepperoni y champiñones sobre salsa roja y mozarela." },
    { name: "Turin",      desc: "Jamón y piña en almíbar, clásica y equilibrada." },
    { name: "Toscana",    desc: "Salchicha italiana y pimiento morrón asado." },
  ];

  for (let i = 0; i < pizzas2.length; i++) {
    const { name, desc } = pizzas2[i];
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id, categoryId: cat2.id,
        name, description: desc,
        basePrice: 110, position: i, isActive: true, isAvailable: true,
      },
    });
    if (PIZZA_IMAGES[name]) {
      await prisma.productImage.create({
        data: { productId: product.id, url: PIZZA_IMAGES[name], position: 0 },
      });
    }
    await addSizeAndExtras(product.id, 65, 145, gPizzaExtras.id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORÍA 3 — Pizzas 4 Ingredientes (base IND $120)
  // ══════════════════════════════════════════════════════════════════════════
  const cat3 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Pizzas 4 Ingredientes",
      description: "Para los que quieren todo. Individual $120 · Mediana $185 · Familiar $270",
      position: 2, isActive: true,
    },
  });

  const pizzas4: Array<{ name: string; desc: string }> = [
    { name: "Big-Ben",    desc: "Pepperoni, jamón, champiñones y aceitunas negras. La más pedida." },
    { name: "Manchester", desc: "Pollo, tocino, cebolla caramelizada y jalapeño." },
  ];

  for (let i = 0; i < pizzas4.length; i++) {
    const { name, desc } = pizzas4[i];
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id, categoryId: cat3.id,
        name, description: desc,
        basePrice: 120, position: i, isActive: true, isAvailable: true,
      },
    });
    if (PIZZA_IMAGES[name]) {
      await prisma.productImage.create({
        data: { productId: product.id, url: PIZZA_IMAGES[name], position: 0 },
      });
    }
    await addSizeAndExtras(product.id, 65, 150, gPizzaExtras.id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORÍA 4 — Pizzas 6 Ingredientes (base IND $130)
  // ══════════════════════════════════════════════════════════════════════════
  const cat4 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Pizzas 6 Ingredientes",
      description: "Experiencia completa. Individual $130 · Mediana $210 · Familiar $310",
      position: 3, isActive: true,
    },
  });

  const pizzas6: Array<{ name: string; desc: string; available?: boolean }> = [
    { name: "Carnes Frías",  desc: "Salami, jamón, pepperoni, mortadela, tocino y pollo. Para carnívoros." },
    { name: "London",        desc: "Nuestra estrella: pepperoni, chorizo, jamón, champiñones, pimiento y aceitunas." },
    { name: "Cyrcus",        desc: "Pizza de temporada: ingredientes especiales que rotan cada semana.", available: false },
  ];

  for (let i = 0; i < pizzas6.length; i++) {
    const { name, desc, available = true } = pizzas6[i];
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id, categoryId: cat4.id,
        name, description: desc,
        basePrice: 130, position: i, isActive: true, isAvailable: available,
      },
    });
    if (PIZZA_IMAGES[name]) {
      await prisma.productImage.create({
        data: { productId: product.id, url: PIZZA_IMAGES[name], position: 0 },
      });
    }
    await addSizeAndExtras(product.id, 80, 180, gPizzaExtras.id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORÍA 5 — Bebidas
  // ══════════════════════════════════════════════════════════════════════════
  const cat5 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Bebidas",
      position: 4, isActive: true,
    },
  });

  await prisma.product.createMany({
    data: [
      { tenantId: tenant.id, categoryId: cat5.id, name: "Refresco de lata",   description: "Coca-Cola, Pepsi, Sprite o Fanta.",           basePrice: 25, position: 0, isActive: true, isAvailable: true },
      { tenantId: tenant.id, categoryId: cat5.id, name: "Agua mineral",       description: "Agua Mineragua o Topo Chico, 600 ml.",         basePrice: 20, position: 1, isActive: true, isAvailable: true },
      { tenantId: tenant.id, categoryId: cat5.id, name: "Jugo natural",       description: "Naranja, zanahoria o limón, 500 ml.",           basePrice: 35, position: 2, isActive: true, isAvailable: true },
      { tenantId: tenant.id, categoryId: cat5.id, name: "Cerveza XX Lager",   description: "Botella fría 355 ml.",                          basePrice: 45, position: 3, isActive: true, isAvailable: true },
    ],
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORÍA 6 — Complementos
  // ══════════════════════════════════════════════════════════════════════════
  const cat6 = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: "Complementos",
      position: 5, isActive: true,
    },
  });

  await prisma.product.createMany({
    data: [
      { tenantId: tenant.id, categoryId: cat6.id, name: "Palitos de ajo",    description: "Pan artesanal con mantequilla de ajo y orégano.",   basePrice: 45, position: 0, isActive: true, isAvailable: true },
      { tenantId: tenant.id, categoryId: cat6.id, name: "Alitas BBQ (8 pz)", description: "Alitas horneadas con salsa BBQ o búfalo.",          basePrice: 95, position: 1, isActive: true, isAvailable: true },
      { tenantId: tenant.id, categoryId: cat6.id, name: "Ensalada César",    description: "Lechuga romana, crutones, parmesano y aderezo.",    basePrice: 65, position: 2, isActive: true, isAvailable: true },
      { tenantId: tenant.id, categoryId: cat6.id, name: "Salsa adicional",   description: "Ranch, BBQ, habanero o ajo. 60 ml.",                basePrice: 15, position: 3, isActive: true, isAvailable: true },
    ],
  });

  console.log("\n✅ Seed London Pizza completado:");
  console.log(`   Restaurante: ${tenant.name}`);
  console.log(`   URL menú:    http://localhost:3002/${tenant.slug}`);
  console.log(`   Login demo:  pizza@haloo.click / pizza1234`);
}

main()
  .catch(e => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
