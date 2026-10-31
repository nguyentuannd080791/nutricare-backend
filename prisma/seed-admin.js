import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@nutricare.vn";
    const plainPassword = "admin123";
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            fullName: "Quản trị viên",
            isPremium: true,
        },
        create: {
            email,
            fullName: "Quản trị viên",
            passwordHash,
            gender: "nam",
            dob: new Date("1995-01-01T00:00:00Z"),
            isPremium: true,
        },
    });

    console.log(`Đã tạo/cập nhật tài khoản admin thành công:`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Mật khẩu: ${plainPassword}`);
    console.log(`- ID: ${user.id}`);
}

main()
    .catch((e) => {
        console.error("Lỗi khi tạo tài khoản admin:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
