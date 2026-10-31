# nutricare-node-poc

**Bản thực hành Node.js tạm thời.** Kiến trúc chuẩn của dự án NutriCare vẫn
là **Java Spring Boot + FastAPI** (xem `Decisions_And_Principles` /
`Overview` trong project files). Repo này chỉ dùng để triển khai nhanh lên
VPS free, thử nghiệm với người dùng thật, trước khi port sang Spring Boot.

Backend là **nơi duy nhất** giữ nghiệp vụ (`src/domain/`), gọi AI (`src/prompts/`,
`src/services/aiGateway.js`) và quyết định giới hạn gói Free/Premium; app Expo chỉ là
client mỏng. Lịch sử thay đổi: các file `CHANGELOG_*.md`.

## Chạy thử local

```bash
npm install
cp .env.example .env        # điền JWT_SECRET, để trống ANTHROPIC_API_KEY để chạy chế độ mock
npx prisma generate
docker compose up -d db     # chỉ chạy Postgres
npx prisma migrate dev      # áp dụng toàn bộ migration (gồm partial unique index)
npm run prisma:seed         # nạp catalog món ăn + thực phẩm NIN (chỉ lần đầu)
npm run dev
```

Server lắng nghe trên `0.0.0.0:3000` và in ra cả địa chỉ LAN, ví dụ
`http://192.168.1.10:3000/api` — điện thoại chạy Expo Go trong cùng Wi-Fi gọi
được (xem `nutricare-expo/README.md`). Nếu có Windows Firewall, cho phép Node
trên mạng Private. Kiểm tra nhanh: `GET http://<IP>:3000/api/health`.

Không có `ANTHROPIC_API_KEY` → `/plan/diversify` và `/scan/analyze` tự động trả
kết quả mock (xác định, không tốn phí AI), đủ để test toàn bộ luồng.

## Deploy lên Oracle Cloud Free Tier

```bash
git clone <repo> && cd nutricare-node-poc
cp .env.example .env   # sửa DATABASE_URL trỏ service "db", điền JWT_SECRET thật
docker compose up -d --build
```

Sau đó trỏ domain (kể cả domain free như DuckDNS) vào IP VPS, dùng Caddy
hoặc Nginx + Let's Encrypt để có HTTPS — bắt buộc vì iOS/Android production
build chặn HTTP thường (cleartext).

## Ràng buộc "1 target / 1 thực đơn active mỗi user"

Prisma schema không khai báo được `UNIQUE (user_id) WHERE is_active = true`, nên hai
partial unique index nằm trong migration raw SQL `20260921130000_frontend_integration`
(`prisma migrate dev` sẽ áp dụng). Nếu DB test cũ đang có 2 bản ghi active của cùng
1 user, migration báo lỗi — đặt `is_active = false` cho bản ghi thừa rồi migrate lại.

## Endpoint

Mọi path bắt đầu bằng `/api`. Lỗi luôn có dạng `{ "error": "thông báo tiếng Việt" }`.

| Method | Path | Auth | Ghi chú |
|---|---|---|---|
| GET | `/health` | — | |
| POST | `/auth/register` `{email,password,fullName}`, `/auth/login` | — | trả `{token, user}` |
| GET / PATCH | `/me` | ✓ | PATCH `{fullName?, gender?, dob?}`; `user` gồm bộ đếm lượt + `limits` |
| GET / POST | `/bmi-records` | ✓ | POST `{weightKg}`; lần đầu (onboarding) thêm `{heightCm, goalId, activityId, durationMonths?, targetChangeKg?}`. **Chiều cao chỉ nhận ở lần đầu, sau đó cố định** (client gửi lại sẽ bị bỏ qua). Server tự quyết định có tạo lại mục tiêu không (2 trục thời gian + % cân nặng, giữ nguyên độ lệch calo đã chọn) và chạy Feedback Loop cho Premium |
| GET | `/nutrition-targets`, `/nutrition-targets/active` | ✓ | lịch sử / mục tiêu đang áp dụng |
| POST | `/nutrition-targets/preview` `{goalId,activityId,durationMonths?,targetChangeKg?}` | ✓ | xem trước, chưa lưu. `giam_can`/`tang_can` bắt buộc `durationMonths` + `targetChangeKg` (kg muốn giảm/tăng, 1–30); trả thêm `targetWeightKg`, `dailyKcalDelta`; 400 nếu vượt tốc độ/BMI/sàn calo an toàn (`WEIGHT_CHANGE_RULES`) |
| POST | `/nutrition-targets` `{goalId,activityId,durationMonths,targetChangeKg?}` | ✓ | đổi mục tiêu thủ công (cùng luật kiểm tra như preview) |
| GET / POST / PUT / DELETE | `/health-conditions` | ✓ | `{name,type}`; server suy ra luật lọc món từ tên, trả `tagLabels` + `recognized` |
| GET | `/plan/history` | ✓ | mọi thực đơn (mới nhất trước) |
| POST | `/plan/generate` `{days}` | ✓ | **thuật toán trên bể món ăn** — luôn là ground truth; tự đọc calo từ mục tiêu đang active |
| POST | `/plan/swap` `{planId,dayIndex,mealSlot,chooseDishId}` | ✓ | chỉ đổi trong 3 ứng viên cố định lúc tạo plan; món cũ trở thành ứng viên để đổi ngược lại |
| POST | `/plan/diversify` `{planId}` | ✓ + giới hạn Free | AI đề xuất hoán đổi món → trả **đề xuất**, chưa lưu |
| POST | `/plan/diversify/apply` `{planId,selections}` | ✓ | server dựng lại thực đơn từ `dishId` (kiểm tra với bể món đã lọc), không tin dữ liệu nào khác từ client |
| POST | `/scan/analyze` `{imageBase64,mealSlot?}` | ✓ + giới hạn Free | AI chỉ nhận diện; kcal/macro + `conflicts` tính lại ở server |
| GET | `/dishes`, `/dishes/:id`, `/dishes/groups` | — (token tuỳ chọn) | có token thì mỗi món kèm `conflicts` theo bệnh nền của user |
| GET | `/raw-foods`, `/raw-foods/:id`, `/raw-foods/groups` | — | 847 thực phẩm tự nhiên (NIN) — app chưa dùng |
| POST | `/premium/mock-upgrade`, `/premium/mock-cancel` | ✓ | mock paywall, chỉ đổi cờ trong DB |

Kiến trúc route: router công khai (`auth`, `dishes`, `raw-foods`) đặt **trước**
`requireAuth`; mọi router còn lại đặt sau (xem `src/routes/index.js`).
