import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };
// In dev, drop a cached client from before the last `prisma db push` so new models show up without a restart
export const db = g.prisma && "banter" in g.prisma ? g.prisma : new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = db;
