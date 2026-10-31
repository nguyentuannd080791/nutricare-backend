import { PrismaClient } from "@prisma/client";

// Mot instance duy nhat dung chung toan app - tranh mo qua nhieu connection
// pool khi hot-reload trong dev.
export const prisma = new PrismaClient();
