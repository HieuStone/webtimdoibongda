# Cấu Trúc Cơ Sở Dữ Liệu (Database Schema) - Tìm Đối Đá Bóng

Dự án sử dụng cơ sở dữ liệu quan hệ (PostgreSQL / MySQL) được thiết kế đặc thù để tương thích tốt với Eloquent ORM của Laravel.

Dưới đây là thiết kế các bảng (tables) cốt lõi phục vụ hệ thống và tính năng chính:

## 1. Người dùng & Đội bóng

### `users` (Danh sách Cầu thủ & Tài khoản)
Lưu thông tin đăng nhập và thông tin cầu thủ cá nhân.
* `id` (bigIncrements) - PK
* `name` (string) - Tên hiển thị
* `email` (string) - Unique email
* `phone` (string) - Số điện thoại liên hệ cáp kèo (Có thể unique)
* `password` (string)
* `avatar` (string) - Ảnh đại diện (nullable)
* `height` (integer) - Chiều cao (cm) (nullable)
* `weight` (integer) - Cân nặng (kg) (nullable)
* `preferred_position` (string) - Vị trí sở trường (VD: GK, CB, CM, ST...) (nullable)
* `strong_foot` (enum: 'left', 'right', 'both') (nullable)
* `role` (enum: 'admin', 'player') - Phân quyền hệ thống
* `created_at`, `updated_at`

### `teams` (Thông tin Đội bóng)
Thông tin về đội bóng phủi.
* `id` (bigIncrements) - PK
* `manager_id` (bigInteger) - FK -> `users.id` (Chủ đội/Đội trưởng)
* `name` (string) - Tên đội bóng
* `short_name` (string) - Tên viết tắt FC (VD: MU, ARS)
* `logo` (string) - URL logo (nullable)
* `area_id` (integer) - FK -> `areas.id` (Khu vực hoạt động chính)
* `home_stadium_id` (bigInteger) - Sân nhà quen thuộc (nullable)
* `skill_level` (integer) - Đánh giá trình độ chung: 1: Yếu (Nhặt lá đá bơ), 2: TB Yếu, 3: TB, 4: Khá, 5: Bán chuyên
* `created_at`, `updated_at`

### `team_user` (Cầu thủ thuộc Đội - Nhiều nhiều)
Bảng trung gian thể hiện một cầu thủ có thể tham gia nhiều đội bóng và ngược lại.
* `id` (bigIncrements) - PK
* `team_id` (bigInteger) - FK -> `teams.id`
* `user_id` (bigInteger) - FK -> `users.id`
* `status` (enum: 'pending', 'approved') - Trạng thái duyệt vào đội
* `joined_at` (timestamp)
* `created_at`, `updated_at`

## 2. Hệ thống Tìm Đối & Kèo Đấu

### `matches` (Trận đấu đang tìm đối / Trận đấu đã xếp)
Khi một đội tạo kèo kiếm đối, sẽ có 1 row được tạo ở bảng này. 
* `id` (bigIncrements) - PK
* `creator_team_id` (bigInteger) - FK -> `teams.id` (Đội tạo kèo)
* `opponent_team_id` (bigInteger) - FK -> `teams.id` (Đội nhận kèo, có thể Null nếu đang chờ)
* `stadium_name` (string) - Tên sân (Do chưa tích hợp book sân nên tạm lưu dạng text)
* `area_id` (integer) - FK -> `areas.id` (Kèo này đá ở quận/huyện nào)
* `match_time` (datetime) - Thời gian dự kiến bóng lăn
* `match_type` (integer) - Loại sân: 5, 7, 11
* `skill_requirement` (integer) - Cần tìm đối cứng cựa hay yếu (Để lọc)
* `payment_type` (enum: '50-50', 'giao-huu', '100', 'lose-pay-all') - Campuchia/Giao hữu/Bao tiền sân/Thua trả tiền
* `status` (enum: 'finding', 'waiting_approval', 'matched', 'completed', 'cancelled')
* `note` (text) - Ghi chú thêm (VD: Ae đá giao lưu mồ hôi, cần màu áo xanh...)
* `created_at`, `updated_at`

### `match_requests` (Danh sách Đội xin nhận kèo)
Nếu kèo đang hot, sẽ có nhiều đội cùng bấm "Nhận Kèo". Đội tạo kèo sẽ duyệt 1 trong số này.
* `id` (bigIncrements) - PK
* `match_id` (bigInteger) - FK -> `matches.id`
* `requesting_team_id` (bigInteger) - FK -> `teams.id` (Đội muốn đá cùng)
* `message` (text) - Tin nhắn gửi kèm (Ví dụ: Mình đồng hạng, nhận kèo mình nhé!)
* `status` (enum: 'pending', 'accepted', 'rejected')
* `created_at`, `updated_at`

## 3. Hệ sinh thái Đánh Giá & Mở Rộng

### `match_ratings` (Chấm điểm uy tín sau trận đấu)
Hệ thống Rating giúp cộng đồng fairplay và né các đội hay "bom kèo".
* `id` (bigIncrements) - PK
* `match_id` (bigInteger) - FK -> `matches.id`
* `reviewer_team_id` (bigInteger) - FK -> `teams.id` (Bên chấm)
* `target_team_id` (bigInteger) - FK -> `teams.id` (Bên bị chấm)
* `fairplay_rating` (integer) - 1 đến 5 sao
* `is_skill_matched` (boolean) - Trình độ có khớp như đã miêu tả không? (Yes/No)
* `is_bom_keo` (boolean) - Cảnh báo đỏ: Có bùng kèo không?
* `comment` (text) - Bình luận chi tiết
* `created_at`, `updated_at`

### `mercenaries` (Lính đánh thuê)
Cho các anh em đá lẻ tìm team đá ké.
* `id` (bigIncrements) - PK
* `user_id` (bigInteger) - FK -> `users.id`
* `available_date` (date) - Hôm nào rảnh
* `time_frame` (string) - Giờ nào rảnh (Ví dụ: 19:00 - 20:30)
* `area_id` (integer) - FK -> `areas.id` (Khu vực muốn đá)
* `note` (text) - Ghi chú cá nhân
* `status` (enum: 'available', 'hired', 'expired')
* `created_at`, `updated_at`

### `areas` (Tỉnh / Thành phố / Quận / Huyện)
Hỗ trợ chia cấp phục vụ tìm kiếm theo vị trí.
* `id` (integer) - PK
* `name` (string)
* `parent_id` (integer) - FK -> `areas.id` (Là Thành phố thì parent_id = null, là Xã/Phường thì parent_id trỏ về id Hà Nội chẳng hạn)
* `type` (enum: 'city', 'district')