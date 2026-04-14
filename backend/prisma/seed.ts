import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo12345", 12);

  await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {},
    create: {
      email: "admin@demo.local",
      passwordHash,
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "user@demo.local" },
    update: {},
    create: {
      email: "user@demo.local",
      passwordHash,
      role: "user",
    },
  });

  const catElectronics = await prisma.category.upsert({
    where: { name: "Electronics" },
    update: {},
    create: { name: "Electronics", description: "Devices and accessories" },
  });
  const catOffice = await prisma.category.upsert({
    where: { name: "Office" },
    update: {},
    create: { name: "Office", description: "Supplies" },
  });

  const zoneA = await prisma.warehouseZone.upsert({
    where: { code: "A" },
    update: {},
    create: {
      code: "A",
      name: "Fast-moving / pick front",
      description: "High-frequency SKU and outbound staging",
      sortOrder: 0,
    },
  });
  const zoneB = await prisma.warehouseZone.upsert({
    where: { code: "B" },
    update: {},
    create: {
      code: "B",
      name: "Bulk / overflow",
      description: "Pallet storage and slower movers",
      sortOrder: 1,
    },
  });

  const items = [
    {
      sku: "SKU-KEYB-01",
      name: "Mechanical keyboard",
      categoryId: catElectronics.id,
      zoneId: zoneA.id,
      binCode: "A-12-03",
      reorderLevel: 5,
      currentQuantity: 12,
      unitCost: 79.99,
    },
    {
      sku: "SKU-MOUSE-02",
      name: "Wireless mouse",
      categoryId: catElectronics.id,
      zoneId: zoneA.id,
      binCode: "A-12-04",
      reorderLevel: 10,
      currentQuantity: 3,
      unitCost: 24.5,
    },
    {
      sku: "SKU-PAPER-03",
      name: "A4 paper (500)",
      categoryId: catOffice.id,
      zoneId: zoneB.id,
      binCode: "B-01-22",
      reorderLevel: 20,
      currentQuantity: 8,
      unitCost: 6.25,
    },
  ];

  for (const it of items) {
    const existing = await prisma.item.findUnique({ where: { sku: it.sku } });
    if (existing) continue;
    await prisma.item.create({
      data: {
        sku: it.sku,
        name: it.name,
        categoryId: it.categoryId,
        zoneId: it.zoneId,
        binCode: it.binCode,
        unit: "pcs",
        reorderLevel: it.reorderLevel,
        currentQuantity: it.currentQuantity,
        unitCost: it.unitCost,
        movements: {
          create: { delta: it.currentQuantity, reason: "seed" },
        },
      },
    });
  }

  const mouse = await prisma.item.findUnique({ where: { sku: "SKU-MOUSE-02" } });
  if (mouse) {
    await prisma.iotEvent.createMany({
      data: [
        {
          itemId: mouse.id,
          source: "rfid",
          eventType: "gate_pass",
          message: "Dock RFID reader #2 — inbound",
          metadata: { reader: "dock-2" },
        },
        {
          itemId: mouse.id,
          source: "sensor",
          eventType: "bin_weight",
          message: "Shelf load cell delta",
          quantityDelta: -1,
          metadata: { shelf: "A-12-04" },
        },
      ],
    });
  }

  console.log("Seed OK — admin@demo.local / user@demo.local password: demo12345");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
