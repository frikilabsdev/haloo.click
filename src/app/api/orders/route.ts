import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTenantByUserId } from "@/lib/tenant";
import { generateOrderNumber } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

// ── GET /api/orders — Dashboard polling ───────────────────────────────────────

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const tenant = await getTenantByUserId(session.user.id);

    const orders = await prisma.order.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
        deliveryZone: { select: { name: true } },
      },
    });

    return NextResponse.json({ data: JSON.parse(JSON.stringify(orders)) });
  } catch (error) {
    console.error("[orders/GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

// ── Esquema de validación ─────────────────────────────────────────────────────
// Los precios del cliente (unitPrice, total, selectedOptions.price) se reciben
// pero NO se usan para calcular nada — solo se usan los precios de la DB.

const SelectedOptionSchema = z.object({
  optionGroupId:   z.string(),
  optionGroupName: z.string(),
  optionId:        z.string(),
  optionName:      z.string(),
  price:           z.number(), // ignorado en backend, se usa precio de DB
});

const CartItemSchema = z.object({
  productId:       z.string(),
  productName:     z.string(),
  unitPrice:       z.number().positive(), // ignorado en backend
  quantity:        z.number().int().positive(),
  selectedOptions: z.array(SelectedOptionSchema),
  notes:           z.string().optional(),
  total:           z.number().positive(), // ignorado en backend
});

const OrderSchema = z.object({
  tenantSlug:       z.string(),
  customerName:     z.string().min(2, "Ingresa tu nombre"),
  customerPhone:    z.string().min(8, "Teléfono inválido"),
  customerWhatsapp: z.string().optional(),
  deliveryType:     z.enum(["DELIVERY", "PICKUP"]),
  address:          z.string().optional(),
  addressRef:       z.string().optional(),
  housingType:      z.string().optional(),
  lat:              z.number().optional(),
  lng:              z.number().optional(),
  deliveryZoneId:   z.string().optional(),
  paymentMethod:    z.enum(["CASH", "TRANSFER", "CARD"]),
  notes:            z.string().optional(),
  items:            z.array(CartItemSchema).min(1, "El carrito está vacío"),
});

// ── POST /api/orders ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting: 20 pedidos por IP por hora ────────────────────────────
    const ip = getClientIp(request);
    const rl = rateLimit(`orders:${ip}`, 20, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Demasiados pedidos. Espera un momento antes de intentarlo de nuevo." },
        {
          status: 429,
          headers: {
            "Retry-After":          String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const body = await request.json();
    const parsed = OrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      tenantSlug, customerName, customerPhone, customerWhatsapp,
      deliveryType, address, addressRef, housingType, lat, lng,
      deliveryZoneId, paymentMethod, notes, items,
    } = parsed.data;

    // Verificar tenant activo
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { deliveryZones: true, schedules: true },
    });

    if (!tenant || tenant.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Restaurante no disponible." },
        { status: 404 }
      );
    }

    // Verificar horario de apertura (si hay schedules configurados)
    const activeSchedules = tenant.schedules.filter(s => s.isActive);
    if (activeSchedules.length > 0) {
      const now = new Date();
      const day = now.getDay();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const todaySchedule = activeSchedules.find(s => s.dayOfWeek === day);
      const isOpen = todaySchedule
        ? time >= todaySchedule.openTime && time <= todaySchedule.closeTime
        : false;
      if (!isOpen) {
        return NextResponse.json(
          { error: "El restaurante está cerrado en este momento." },
          { status: 400 }
        );
      }
    }

    // Validar productos: existencia, tenant y disponibilidad
    const productIds = [...new Set(items.map(i => i.productId))];
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: tenant.id },
      select: { id: true, basePrice: true, isAvailable: true, name: true },
    });

    if (dbProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: "Uno o más productos no existen." },
        { status: 400 }
      );
    }

    const unavailableProduct = dbProducts.find(p => !p.isAvailable);
    if (unavailableProduct) {
      return NextResponse.json(
        { error: `"${unavailableProduct.name}" no está disponible actualmente.` },
        { status: 400 }
      );
    }

    // Validar opciones: existencia, tenant, disponibilidad y obtener precio real de DB
    const allOptionIds = [
      ...new Set(items.flatMap(i => i.selectedOptions.map(o => o.optionId))),
    ];

    type DbOption = {
      id:          string;
      price:       Prisma.Decimal;
      isAvailable: boolean;
      name:        string;
      optionGroup: { isVariant: boolean };
    };

    let dbOptions: DbOption[] = [];
    if (allOptionIds.length > 0) {
      dbOptions = await prisma.option.findMany({
        where: { id: { in: allOptionIds }, optionGroup: { tenantId: tenant.id } },
        select: {
          id:          true,
          price:       true,
          isAvailable: true,
          name:        true,
          optionGroup: { select: { isVariant: true } },
        },
      });

      if (dbOptions.length !== allOptionIds.length) {
        return NextResponse.json(
          { error: "Una o más opciones seleccionadas no son válidas." },
          { status: 400 }
        );
      }

      const unavailableOption = dbOptions.find(o => !o.isAvailable);
      if (unavailableOption) {
        return NextResponse.json(
          { error: `La opción "${unavailableOption.name}" no está disponible actualmente.` },
          { status: 400 }
        );
      }
    }

    // ── Calcular precios desde DB (ignorar completamente los del cliente) ────
    const dbProductMap = new Map(dbProducts.map(p => [p.id, p]));
    const dbOptionMap  = new Map(dbOptions.map(o => [o.id, o]));

    type PricedItem = {
      productId:       string;
      productName:     string;
      quantity:        number;
      unitPrice:       Prisma.Decimal;
      itemTotal:       Prisma.Decimal;
      notes:           string | null;
      selectedOptions: Prisma.InputJsonValue;
    };

    const pricedItems: PricedItem[] = items.map(item => {
      const dbProduct  = dbProductMap.get(item.productId)!;
      const basePrice  = Number(dbProduct.basePrice);

      // Si hay una opción de grupo isVariant seleccionada, su precio reemplaza el basePrice
      const variantOption = item.selectedOptions
        .map(o => dbOptionMap.get(o.optionId))
        .find(o => o?.optionGroup.isVariant);
      const unitPrice = variantOption ? Number(variantOption.price) : basePrice;

      // Extras: opciones de grupos que NO son isVariant (suman al unitPrice)
      const extrasTotal = item.selectedOptions.reduce((sum, opt) => {
        const dbOpt = dbOptionMap.get(opt.optionId);
        return sum + (dbOpt && !dbOpt.optionGroup.isVariant ? Number(dbOpt.price) : 0);
      }, 0);

      // Reconstruir selectedOptions con precios de DB (no del cliente)
      const sanitizedOptions = item.selectedOptions.map(opt => {
        const dbOpt = dbOptionMap.get(opt.optionId);
        return {
          optionGroupId:   opt.optionGroupId,
          optionGroupName: opt.optionGroupName,
          optionId:        opt.optionId,
          optionName:      opt.optionName,
          // variantes: precio 0 (ya reflejado en unitPrice); extras: precio real de DB
          price: dbOpt?.optionGroup.isVariant ? 0 : Number(dbOpt?.price ?? 0),
        };
      });

      return {
        productId:       item.productId,
        productName:     item.productName,
        quantity:        item.quantity,
        unitPrice:       new Prisma.Decimal(unitPrice),
        itemTotal:       new Prisma.Decimal((unitPrice + extrasTotal) * item.quantity),
        notes:           item.notes ?? null,
        selectedOptions: sanitizedOptions as unknown as Prisma.InputJsonValue,
      };
    });

    const subtotal = pricedItems.reduce((sum, item) => sum + Number(item.itemTotal), 0);

    // Calcular costo de entrega — null cuando usa mapa (pendiente de confirmar)
    let deliveryCost: Prisma.Decimal | null = null;
    if (deliveryType === "DELIVERY" && deliveryZoneId) {
      const zone = tenant.deliveryZones.find(z => z.id === deliveryZoneId);
      if (!zone || !zone.isActive) {
        return NextResponse.json(
          { error: "Zona de entrega inválida." },
          { status: 400 }
        );
      }
      deliveryCost = new Prisma.Decimal(zone.cost);
    } else if (deliveryType === "PICKUP") {
      deliveryCost = new Prisma.Decimal(0);
    }

    const total = subtotal + (deliveryCost?.toNumber() ?? 0);

    // Crear orden en transacción
    const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newOrder = await tx.order.create({
        data: {
          tenantId:         tenant.id,
          orderNumber:      generateOrderNumber(),
          customerName,
          customerPhone,
          customerWhatsapp: customerWhatsapp ?? customerPhone,
          deliveryType,
          address,
          addressRef,
          housingType,
          lat,
          lng,
          deliveryZoneId:   deliveryZoneId ?? null,
          deliveryCost,
          paymentMethod,
          notes,
          subtotal:         new Prisma.Decimal(subtotal),
          total:            new Prisma.Decimal(total),
          status:           "PENDING",
        },
        select: { id: true, orderNumber: true, trackingToken: true },
      });

      await tx.orderItem.createMany({
        data: pricedItems.map(item => ({
          orderId:         newOrder.id,
          productId:       item.productId,
          productName:     item.productName,
          quantity:        item.quantity,
          unitPrice:       item.unitPrice,
          total:           item.itemTotal,
          notes:           item.notes,
          selectedOptions: item.selectedOptions,
        })),
      });

      return newOrder;
    });

    return NextResponse.json(
      { ok: true, orderNumber: order.orderNumber, trackingToken: order.trackingToken },
      { status: 201 }
    );
  } catch (error) {
    console.error("[orders/POST]", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
