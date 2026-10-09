# PERSONAL WEB OS 5.0
## Sovereign Digital Workspace — Ultra Master Product & Engineering Specification

> **Phiên bản:** 5.0.0  
> **Ngày cập nhật:** 09/10/2026  
> **Trạng thái:** Bản đặc tả mở rộng đề xuất — chưa phải tuyên bố rằng các tính năng đã được triển khai  
> **Định hướng:** Web-first, local-first, offline-capable, AI-ready, plugin-ready, privacy-conscious  
> **Tên gọi ngắn:** Personal Web OS / PWOS
> **Cách dùng tài liệu:** Phần I kế thừa kiến trúc nền 4.0; Phần II bổ sung hợp đồng sản phẩm/kỹ thuật 5.0 và thay thế roadmap cũ khi có xung đột.

---

# 0. Tầm nhìn sản phẩm

Personal Web OS không chỉ là một dashboard có hình nền đẹp. Mục tiêu là tạo ra một **không gian làm việc số cá nhân** kết hợp desktop ảo, hệ thống năng suất, kho tri thức, trợ lý AI, phòng tập trung và bộ công cụ phát triển phần mềm trong một môi trường thống nhất.

Người dùng có thể bật ứng dụng trong trình duyệt hoặc cài dưới dạng PWA; mở nhiều công cụ cùng lúc; chuyển qua lại giữa các dự án; ghi chú và liên kết kiến thức; hỏi AI dựa trên dữ liệu cá nhân; làm việc ngoại tuyến; xuất bản sao dữ liệu; và tùy chỉnh hệ thống bằng plugin mà không buộc phải phụ thuộc vào một dịch vụ đám mây trả phí.

## 0.1. Những nguyên tắc sản phẩm không được đánh đổi

1. **Local-first:** dữ liệu chính phải được lưu bền vững trên thiết bị trước khi phụ thuộc đồng bộ đám mây.
2. **Không giả lập thành công:** UI chỉ được báo đã lưu, đồng bộ, mã hóa, chạy lệnh hoặc gọi AI sau khi thao tác thực sự thành công.
3. **Không khóa người dùng vào nhà cung cấp:** có thể xuất dữ liệu theo định dạng mở; đổi nhà cung cấp AI không làm mất lịch sử và prompt.
4. **Privacy by default:** không gửi nội dung cá nhân, mã nguồn, ghi chú hoặc telemetry lên máy chủ nếu người dùng chưa chủ động bật tính năng tương ứng.
5. **AI có phạm vi quyền hạn:** đọc, đề xuất, tạo bản nháp và thực thi là các quyền riêng biệt; hành động phá hủy hoặc gửi dữ liệu ra ngoài phải được xác nhận.
6. **Progressive enhancement:** trình duyệt nào thiếu API đặc biệt vẫn phải dùng được phần lõi, chỉ tắt tính năng phụ thuộc API đó.
7. **Có thể khôi phục:** backup, import/export, lịch sử thay đổi và trạng thái lỗi là tính năng nền tảng, không phải việc làm sau cùng.
8. **Hiệu năng có ngân sách:** hiệu ứng hình ảnh không được làm hỏng khả năng làm việc trên máy tính phổ thông.
9. **Có thể kiểm chứng:** mỗi mô-đun phải có tiêu chí nghiệm thu và kiểm thử tự động.
10. **Không đánh đồng Web OS với hệ điều hành máy thật:** mọi thao tác hệ thống thật cần native companion hoặc API được trình duyệt cấp quyền rõ ràng.

## 0.2. Phân loại tính năng theo khả năng thực hiện

| Nhãn | Ý nghĩa | Ví dụ |
|---|---|---|
| **WEB-CORE** | Thực hiện được trong ứng dụng web tiêu chuẩn | cửa sổ ảo, Kanban, ghi chú, đồ thị tri thức, timer |
| **WEB-API** | Thực hiện nếu trình duyệt hỗ trợ và người dùng cấp quyền | chọn thư mục, xử lý tệp, pin thiết bị, WebGPU |
| **OPTIONAL-SERVICE** | Cần API hoặc dịch vụ bên ngoài, có thể phát sinh chi phí | AI API, đồng bộ đám mây, dữ liệu thời tiết/tỷ giá |
| **NATIVE-BRIDGE** | Cần ứng dụng desktop hoặc companion có quyền hệ điều hành | đặt wallpaper hệ thống, shell thật, ghim cửa sổ OS, đọc thống kê hệ thống đầy đủ |
| **FUTURE** | Ý tưởng dài hạn, chỉ triển khai sau khi lõi ổn định | marketplace plugin, đồng bộ nhiều thiết bị nâng cao |

Mọi màn hình phụ thuộc vào WEB-API, OPTIONAL-SERVICE hoặc NATIVE-BRIDGE phải thể hiện trạng thái khả dụng, lý do không khả dụng và lựa chọn thay thế; không được hiển thị nút giả.

---

# 1. Kiến trúc tổng thể

## 1.1. Mô hình phân lớp

```text
┌───────────────────────────────────────────────────────────────────┐
│                    PERSONAL WEB OS 4.0 SHELL                      │
│ Top Bar · Dock · Launcher · Notifications · Theme · Shortcuts     │
├───────────────────────────────────────────────────────────────────┤
│                     VIRTUAL DESKTOP RUNTIME                       │
│ Window Manager · Workspace Manager · Layout Engine · App Registry │
├───────────────────────────────────────────────────────────────────┤
│                         APPLICATIONS                              │
│ Tasks · Calendar · Notes · Graph · AI · Focus · Files · Dev Lab   │
├───────────────────────────────────────────────────────────────────┤
│                      DOMAIN / APPLICATION CORE                    │
│ Commands · Events · Search · Permissions · Validation · Policies  │
├───────────────────────────────────────────────────────────────────┤
│                         DATA SERVICES                             │
│ IndexedDB · OPFS Adapter · Search Index · Import/Export · Backup  │
├───────────────────────────────────────────────────────────────────┤
│                      OPTIONAL CONNECTORS                          │
│ AI Providers · Sync · Weather · Exchange Rates · Git APIs         │
├───────────────────────────────────────────────────────────────────┤
│                 OPTIONAL NATIVE COMPANION BRIDGE                  │
│ OS Wallpaper · Real Shell · System Metrics · Native Notifications │
└───────────────────────────────────────────────────────────────────┘
```

## 1.2. Stack kỹ thuật tham chiếu

Đây là stack đề xuất, không bắt buộc phải áp dụng nguyên xi nếu repository hiện tại đã có nền tảng tốt.

- **Frontend:** React + TypeScript; component nhỏ, có kiểu dữ liệu nghiêm ngặt.
- **Build:** Vite hoặc công cụ tương đương nhẹ, triển khai static được.
- **State:** trạng thái UI ngắn hạn tách khỏi dữ liệu domain; dùng store có selector để tránh render toàn ứng dụng.
- **Persistence:** IndexedDB làm kho dữ liệu chính; wrapper như Dexie có thể đơn giản hóa migration và truy vấn.
- **Large files:** OPFS hoặc file handles khi trình duyệt hỗ trợ; nếu không thì dùng import/export thủ công.
- **Search:** full-text index nội bộ; tìm kiếm gần đúng bằng chỉ mục được xây dựng lại từ nguồn dữ liệu.
- **SQL Lab:** PGlite hoặc SQLite/WASM trong worker như một mô-đun riêng; không dùng nó làm lý do để trộn mọi dữ liệu app vào một schema SQL không được quản lý.
- **Rendering:** CSS transforms cho cửa sổ; Canvas/WebGL cho hiệu ứng; WebGPU chỉ là đường tăng tốc tùy chọn.
- **Testing:** unit, component, integration, end-to-end, accessibility và kiểm thử import/export.
- **Deployment:** static hosting trước; backend chỉ thêm khi cần đồng bộ, tài khoản, chia sẻ hoặc proxy có kiểm soát.

## 1.3. Ranh giới mô-đun

```text
src/
  app/                 # bootstrap, routes, error boundaries
  shell/               # top bar, dock, launcher, notifications
  desktop/             # windows, snapping, workspaces, layout persistence
  modules/
    wallpaper/
    tasks/
    calendar/
    notes/
    knowledge-graph/
    ai-copilot/
    focus-studio/
    files/
    dev-lab/
    vault/
    analytics/
    automations/
    settings/
  domain/              # entities, validators, commands, domain events
  data/                # repositories, IndexedDB, migrations, backup
  search/              # indexing, query parser, result ranking
  providers/           # AI, weather, rates, native bridge adapters
  security/            # permission policy, secret handling, sanitization
  workers/             # indexing, parsing, code sandbox, graphics work
  plugins/             # manifests, permissions, extension host
  shared/              # UI primitives, icons, utilities
  tests/
```

Quy tắc: một mô-đun không được tự ý đọc/ghi IndexedDB ở nhiều nơi rải rác; nó phải đi qua repository hoặc use-case service. Thành phần UI không gọi trực tiếp API nhà cung cấp AI; nó gọi adapter thống nhất. Tác vụ phá hủy phải đi qua lớp permission policy và có thể audit.

## 1.4. Luồng dữ liệu chuẩn

1. UI gửi một command, ví dụ `CreateTask`.
2. Domain service kiểm tra đầu vào, quyền và quy tắc nghiệp vụ.
3. Repository ghi dữ liệu vào kho cục bộ.
4. Event nội bộ được phát sau khi giao dịch thành công.
5. Search index, dashboard và notification cập nhật từ event hoặc cơ chế đồng bộ chỉ mục.
6. Nếu người dùng bật cloud sync, hàng đợi đồng bộ đẩy thay đổi đi sau; thất bại mạng không được làm mất dữ liệu đã lưu cục bộ.
7. Mọi lỗi đều có mã lỗi ổn định, thông báo hữu ích và đường thử lại hoặc khôi phục.

---

# 2. Trụ cột I — Visual Atelier & Wallpaper Matrix 4.0

## 2.1. Nạp hình ảnh và video đa nguồn

- Upload kéo-thả: PNG, JPG/JPEG, WebP, AVIF; hỗ trợ video MP4/WebM tùy codec trình duyệt.
- Nạp nhiều tệp cùng lúc; xem tiến trình, dung lượng, lỗi từng tệp và nút thử lại.
- Dán URL trực tiếp; kiểm tra URL, loại nội dung và lỗi CORS. Nếu không được phép nhúng từ nguồn đó, hướng dẫn tải tệp lên thay vì giả vờ đã tải được.
- Preview trước khi áp dụng: tỷ lệ khung hình, kích thước, dung lượng, metadata cơ bản.
- Tạo thumbnail; ưu tiên lazy loading và giải phóng object URL khi không dùng nữa.
- Tùy chọn video nền: mute mặc định, loop, poster fallback, giảm chất lượng hoặc dừng tự động khi tab bị ẩn.
- Cảnh báo tệp video lớn và tùy chọn chuyển sang ảnh tĩnh để tiết kiệm pin.

## 2.2. Wallpaper Library Vault

Mỗi tài sản nền có metadata:

- ID, tên, nguồn, ngày thêm, loại tệp, kích thước, kích thước pixel.
- Tags, bộ sưu tập, màu chủ đạo, mục yêu thích và ghi chú cá nhân.
- Nguồn gốc/URL và trường ghi chú giấy phép do người dùng quản lý.
- Lịch sử áp dụng và preset hậu kỳ đã dùng.
- Phát hiện bản trùng dựa trên hash tùy chọn; không gửi hash lên dịch vụ ngoài nếu chưa bật.
- Import/export thư viện kèm manifest; nếu không đóng gói được video lớn, phải báo rõ tệp nào bị bỏ qua.

## 2.3. Bộ chỉnh sửa cảnh nền

- Overlay tối/sáng và màu phủ; blur; exposure/brightness; contrast; saturation; temperature; vignette; grain; scanlines.
- Chọn `cover`, `contain`, `center`, `tile`; điều chỉnh focal point bằng kéo thả.
- Chế độ đọc: tự điều chỉnh độ tối để dock và cửa sổ nổi dễ đọc.
- Màu nhấn tự rút từ wallpaper, nhưng người dùng được chọn lại thủ công.
- Preset: Aurora, Deep Space, Rainy Terminal, Minimal Paper, Midnight Glass, Warm Studio.
- Lưu preset cá nhân, nhân bản, đổi tên và xuất cấu hình JSON.

## 2.4. Engine hiệu ứng tương tác

Ít nhất 8 scene có thể bổ sung theo từng giai đoạn:

1. Matrix Digital Rain.
2. 3D Warp Starfield.
3. Rain on Glass.
4. Audio-reactive Particles.
5. Interactive Fluid Field.
6. Aurora Borealis.
7. Parallax Mountains.
8. Neural Network / Knowledge Constellation.

Mỗi scene có bảng cấu hình riêng: tốc độ, mật độ hạt, màu, cường độ, phản hồi chuột, giới hạn FPS. Có preset **Low Power**, **Balanced** và **Ultra**; hỗ trợ `prefers-reduced-motion`, dừng animation khi tab ẩn và fallback 2D nếu WebGL/WebGPU không sẵn sàng.

## 2.5. Chu kỳ thời gian và chế độ tiết kiệm

- Playlist theo ngày/đêm, giờ tùy chỉnh hoặc lịch làm việc.
- Xoay nền theo khoảng thời gian; có thể tắt trong phiên họp hoặc khi chạy Focus mode.
- Tự giảm hiệu ứng khi FPS tụt dưới ngưỡng đặt trước hoặc người dùng chọn tiết kiệm pin.
- Dừng xử lý nặng khi ứng dụng bị ẩn; không chạy vòng lặp vô ích.

## 2.6. Export và wallpaper hệ điều hành thật

- Xuất ảnh đã chỉnh sửa hoặc ảnh chụp scene canvas dưới dạng PNG/WebP.
- Scene động có thể xuất thành video chỉ khi có pipeline encoder tương thích; nếu không, chỉ xuất ảnh hoặc cung cấp hướng dẫn dùng native companion.
- **Web-only:** có thể tải tệp xuống nhưng không thể bảo đảm tự đặt thành wallpaper hệ điều hành chỉ bằng nút trong trang web.
- **Native companion tùy chọn:** nhận lệnh đặt wallpaper thông qua giao thức có whitelist và xác nhận; không mở một cổng shell tùy ý.

### Tiêu chí nghiệm thu

- Thay wallpaper không làm mất trạng thái cửa sổ hoặc task đang mở.
- Ảnh lỗi/URL không truy cập được có thông báo và rollback về nền trước.
- Scene chạy ổn ở chế độ Reduced Motion và Low Power.
- Không rò rỉ object URL hoặc listener sau khi đổi scene liên tục.

---

# 3. Trụ cột II — Virtual Desktop & Window Manager Runtime

## 3.1. Window manager đầy đủ

- Mở nhiều cửa sổ ứng dụng độc lập, có `windowId`, `appId`, `zIndex`, `position`, `size`, `minSize`, `maxSize` và trạng thái.
- Kéo cửa sổ bằng title bar; resize từ 8 điểm; giới hạn cửa sổ không biến mất hoàn toàn khỏi viewport.
- Minimize, maximize, restore, close, focus, raise-to-front và snap.
- Snap trái/phải 50%, góc 25%, phần ba màn hình và bố cục tùy chỉnh.
- Tab-group: gộp các cửa sổ cùng ngữ cảnh thành một nhóm; tháo tab thành cửa sổ riêng.
- Window overview: xem tất cả cửa sổ dưới dạng thumbnails để chuyển nhanh.
- Khôi phục bố cục sau reload; kiểm tra tọa độ cũ khi kích thước viewport thay đổi.
- Khả năng chuyển cửa sổ qua nhiều virtual workspace.
- Lưu session theo tên: “Coding”, “Research”, “School”, “Creator Studio”.
- Quản lý z-order bằng một window manager trung tâm, không để từng component tự đặt z-index tùy tiện.

## 3.2. Desktop và workspace

- Nhiều desktop ảo; mỗi desktop có wallpaper, widget, tập cửa sổ và mục tiêu riêng.
- Workspace Mode dạng dashboard; Desktop Mode dạng cửa sổ nổi; Focus Mode tối giản.
- Chuyển workspace bằng phím tắt hoặc gesture phù hợp thiết bị.
- Di chuyển cửa sổ sang workspace khác; mở app ở workspace hiện tại hoặc workspace đã ghim.
- Quick Layout: bố cục 1 cửa sổ lớn + sidebar, 2 cột, 3 cột, 2x2, nghiên cứu đa nguồn.
- Auto-arrange để chống cửa sổ chồng lộn xộn.
- Khôi phục cửa sổ sau crash với lựa chọn “Khôi phục phiên trước” thay vì tự mở tất cả một cách bất ngờ.

## 3.3. Dock, taskbar và app launcher

- Dock có ứng dụng ghim, ứng dụng đang mở, trạng thái đang chạy và thông báo số lượng.
- Kéo icon để sắp xếp; menu ngữ cảnh mở ứng dụng mới, chuyển workspace hoặc đóng mọi cửa sổ của app.
- App launcher có nhóm ứng dụng, tìm kiếm fuzzy, ứng dụng gần đây và ứng dụng yêu thích.
- Notification center lưu các thông báo nội bộ; thông báo có thể đánh dấu đã đọc hoặc snooze.
- Top bar hiển thị giờ, trạng thái lưu, mạng, chế độ nền, workspace, audio và truy cập nhanh cài đặt.

## 3.4. Desktop surface

- Icon kéo-thả, lưới căn chỉnh, sắp xếp theo tên/loại/ngày dùng gần nhất.
- Sticky notes, shortcut ứng dụng, link web, file đã ghim và task quan trọng.
- Context menu theo loại đối tượng; menu chỉ hiện các hành động khả dụng.
- Undo/redo cho việc di chuyển icon, đổi tên hoặc chỉnh layout.
- Widget có thể khóa vị trí hoặc chuyển sang lớp riêng để không chặn thao tác kéo cửa sổ.

## 3.5. Giới hạn pin-on-top và hệ điều hành

“Pin on top” trong Web OS chỉ có nghĩa **ưu tiên trên các cửa sổ ảo của PWOS**. Nó không giữ cửa sổ trình duyệt nổi trên mọi ứng dụng hệ điều hành. Muốn điều khiển cửa sổ OS thật cần native app và quyền riêng phù hợp.

### Tiêu chí nghiệm thu

- Có ít nhất 20 cửa sổ ảo mà thao tác kéo/chuyển focus vẫn đáp ứng mượt trên máy tham chiếu.
- Sau reload, vị trí và trạng thái của cửa sổ được khôi phục an toàn.
- Khi đổi kích thước cửa sổ trình duyệt, không cửa sổ nào bị mắc kẹt ngoài màn hình.
- Các thao tác bằng chuột có đường thao tác tương đương bằng bàn phím.

---

# 4. Trụ cột III — Omni Launcher, Command Palette & Navigation OS

## 4.1. Super Spotlight (`Ctrl/Cmd + K`)

- Tìm trong tasks, notes, snippets, files, journal, projects, settings, apps và lịch sử command.
- Fuzzy search không phân biệt hoa/thường; hỗ trợ tiếng Việt có dấu và tùy chọn không dấu.
- Bộ lọc theo loại nội dung, thời gian, tag, workspace và dự án.
- Hiển thị kết quả gần đây trước; xếp hạng dựa trên độ liên quan, lần sửa gần nhất và tần suất dùng.
- Xem trước nhanh bằng phím mũi tên; Enter mở; `Ctrl/Cmd + Enter` mở ở cửa sổ mới.
- Lưu truy vấn tìm kiếm và command yêu thích.

## 4.2. Command registry

Mọi lệnh phải đăng ký schema, mô tả, quyền cần thiết và handler. Ví dụ:

```text
focus start --duration 50
wallpaper next
window tile-left
workspace switch Coding
task add "Viết API spec" --priority high
journal add "Ý tưởng mới"
search "Nginx reverse proxy"
calc 1500 * 25.4
```

- Có autocomplete, hướng dẫn lỗi cú pháp và preview tác động.
- `--dry-run` cho lệnh có ảnh hưởng lớn.
- Lịch sử lệnh có thể xóa riêng hoặc tắt lưu.
- Lệnh hệ thống phải đi qua registry; không biến chuỗi người dùng nhập thành `eval()` hoặc shell tùy ý.

## 4.3. Quick Actions và macro

- Một phím để mở ghi chú, task, timer, tìm kiếm hoặc capture URL hiện tại.
- Macro đơn giản gồm chuỗi command đã đăng ký, có điều kiện và thời gian chờ rõ ràng.
- Xem trước danh sách bước và quyền trước khi chạy macro.
- Có nút dừng khẩn cấp và log kết quả từng bước.

---

# 5. Trụ cột IV — Executive Productivity OS

## 5.1. Task management Pro

Mỗi task có:

- Tiêu đề, mô tả Markdown, trạng thái, người sở hữu (tương lai), project, tags, priority.
- Ngày bắt đầu, deadline, recurrence, thời lượng ước tính và thời lượng thực.
- Subtasks có tiến độ; dependency; blocking/blocked-by; checklist.
- File đính kèm hoặc link đến note/snippet/tài liệu liên quan.
- Activity log, comments cá nhân và nhật ký thay đổi.
- Nhắc lịch, snooze và trạng thái overdue.
- Mẫu task lặp lại theo ngày/tuần/tháng; quy tắc ngày cuối tháng phải xác định rõ.

## 5.2. Nhiều chế độ hiển thị

- Kanban có kéo thả và cập nhật trạng thái bằng bàn phím.
- List view với tùy chỉnh cột, sort, group và bulk edit.
- Calendar view theo ngày/tuần/tháng.
- Timeline/Gantt đơn giản cho task có start date, deadline và dependency.
- Eisenhower Matrix.
- My Day: việc quan trọng nhất trong ngày, việc đã hoàn thành và thời gian còn lại.
- Review view cho task bị bỏ quên, quá hạn hoặc chưa có deadline.
- Lọc nâng cao và lưu view cá nhân.

## 5.3. Ưu tiên và planning

- Priority P0–P3 hoặc Critical/High/Normal/Low.
- Quy tắc gợi ý ưu tiên dựa vào deadline, giá trị, effort và dependency; phải giải thích vì sao gợi ý như vậy.
- Daily planning: chọn tối đa N mục tiêu chính, chặn thời gian trên lịch và đặt mức tải việc tối đa.
- Weekly review: việc hoàn thành, việc trễ, dự án đình trệ, ước lượng sai và kế hoạch tuần tới.
- Chuyển ghi chú thành task không yêu cầu nhập lại tiêu đề/nội dung; giữ link về ghi chú gốc.
- Archive hoàn thành theo chính sách người dùng; không xóa dữ liệu ngay.

## 5.4. Time tracking

- Stopwatch theo task; pause/resume; chống ghi đúp nếu người dùng mở cùng task ở nhiều cửa sổ.
- Nhập time entry thủ công; ghi nguồn là manual hoặc timer.
- Báo cáo theo task, dự án, tag và tuần.
- So sánh estimate với actual, không dùng dữ liệu này để phán xét năng suất người dùng.
- Xuất CSV.

## 5.5. Cost & subscription intelligence

- Danh mục Domain, hosting, API, AI, SaaS, phần mềm, thiết bị và dịch vụ gia hạn.
- Chu kỳ tháng/năm/tùy chỉnh; tiền tệ gốc và tiền tệ báo cáo.
- Tỷ giá là dữ liệu từ provider hoặc do người dùng nhập; phải có timestamp và nguồn.
- Calendar các lần gia hạn; cảnh báo trước 30/7/3/1 ngày.
- Dashboard chi phí định kỳ, chi phí năm hóa, tăng/giảm so với tháng trước.
- Ghi chú thông tin hạ tầng không nhạy cảm; **không đặt mật khẩu, token hay private key vào ghi chú dịch vụ thường**.
- Export CSV/JSON.

## 5.6. Scratchpad & sticky notes

- Note nhỏ nổi trên desktop; pin, khóa chống sửa nhầm, đổi màu và đặt độ mờ.
- Tự lưu theo debounce, trạng thái “Đang lưu/Đã lưu/Không lưu được”.
- Quick capture bằng phím tắt; hỗ trợ paste text, URL và code.
- Chuyển thành task, daily note hoặc knowledge note.
- Undo, bản nháp và phục hồi nội dung sau reload.

---

# 6. Trụ cột V — Calendar, Habits & Life Dashboard

## 6.1. Calendar nội bộ

- Sự kiện có tiêu đề, giờ bắt đầu/kết thúc, múi giờ, mô tả, nhãn và liên kết dự án.
- All-day events, recurrence và ngoại lệ của chuỗi lặp.
- Time blocking cho task; hiển thị xung đột thời gian.
- Import/export iCalendar (.ics) ở giai đoạn phù hợp.
- Tùy chọn tích hợp lịch bên ngoài chỉ sau khi người dùng cấp quyền; không yêu cầu đăng nhập ngoài để dùng lịch nội bộ.

## 6.2. Habit tracker

- Tạo thói quen định kỳ: hàng ngày, theo ngày trong tuần, một số lần mỗi tuần.
- Chuỗi liên tục, tỷ lệ hoàn thành theo tuần/tháng và lịch heatmap.
- Cho phép đánh dấu “nghỉ có chủ đích” để tránh làm sai số streak.
- Ghi chú ngắn cho mỗi lần hoàn thành.
- Không tạo thông báo gây áp lực; cường độ nhắc nhở do người dùng kiểm soát.

## 6.3. Personal dashboard

- Today, Next up, overdue, quick capture, active project, timer và lịch.
- Dashboard tùy chỉnh theo widget; kéo-thả, resize và lưu theo workspace.
- Một widget có thể bị ẩn mà không xóa dữ liệu gốc.
- Tắt toàn bộ widget nặng trong Low Power mode.

---

# 7. Trụ cột VI — Second Brain, Notes & Neural Knowledge Graph

## 7.1. Note editor

- Markdown editor có preview, headings, code fences, bảng, checklist và backlinks.
- Autosave có debounce và kiểm tra optimistic update; lỗi ghi không được âm thầm mất dữ liệu.
- Templates: daily note, weekly review, project spec, bug report, architecture decision record (ADR), research note.
- Đính kèm ảnh/file và lưu reference ổn định.
- Version history theo mốc hoặc snapshot; khôi phục phiên bản cũ.
- Tìm và thay thế; đếm từ; outline; focus writing.
- Import/export Markdown và JSON; giữ metadata bằng frontmatter nếu được chọn.

## 7.2. Wiki links và backlinks

- `[[Tên ghi chú]]` với autocomplete và fuzzy matching.
- Hỗ trợ đặt alias cho link và phát hiện link bị hỏng.
- Backlinks: mọi ghi chú trỏ về trang hiện tại, kèm đoạn trích ngữ cảnh.
- Ghost nodes cho liên kết chưa có trang; tạo trang trực tiếp từ graph.
- Đổi tên note có tùy chọn cập nhật link; phải chạy trong transaction và có undo.

## 7.3. Knowledge graph

- Force-directed graph trên Canvas/WebGL; có chế độ giảm chuyển động.
- Kích thước node dựa trên degree, mức độ gần đây hoặc trọng số do người dùng chọn.
- Filter theo tags, workspace, ngày, loại entity và độ sâu liên kết.
- Zoom, pan, chọn node, đa chọn, kéo cố định node, tìm đường ngắn giữa hai khái niệm.
- Quick preview drawer; sửa note ở drawer nhưng có trạng thái lưu rõ ràng.
- Neighborhood mode để giảm lộn xộn; cluster tự động theo tag/project.
- Edge có loại: link thủ công, quan hệ task-project, hoặc quan hệ AI đề xuất. Quan hệ AI phải phân biệt rõ, không tự biến suy luận thành sự thật.

## 7.4. Daily journal & activity heatmap

- Daily note tự khởi tạo theo template nhưng không bắt buộc phải có nội dung.
- Heatmap 365 ngày, số từ, số phiên tập trung, task đã xong, streak.
- Mood tag tùy chọn và chỉ lưu cục bộ.
- Daily review: điều đã làm, điều học được, trở ngại, việc tiếp theo.
- Chuyển entry thành note dài hạn hoặc project decision.

## 7.5. Search và knowledge maintenance

- Full-text search nội bộ; highlight đoạn khớp.
- Truy vấn theo cú pháp lọc đơn giản: `tag:AI`, `type:note`, `after:2026-01-01`, `project:PWOS`.
- Phát hiện note trùng gần đúng, note mồ côi, link hỏng và thông tin lâu không cập nhật.
- Maintenance report chạy cục bộ, cho phép xem danh sách trước khi sửa.

---

# 8. Trụ cột VII — AI Executive Copilot & Personal AI Workbench

## 8.1. Provider registry đa mô hình

Tạo adapter thống nhất, tránh viết riêng logic từng provider trong UI.

- OpenAI-compatible APIs.
- Anthropic-compatible adapter nếu endpoint và điều khoản provider cho phép.
- Google Gemini API.
- Các nhà cung cấp OpenAI-compatible khác qua adapter cấu hình được.
- Ollama/local endpoint do người dùng cấu hình.
- Provider mock để test giao diện và luồng lỗi không cần tiêu tốn token.

Mỗi provider có trạng thái kết nối, model, context limit nếu biết, timeout, mức chi phí dự tính nếu provider có dữ liệu, và khả năng tool calling/JSON mode/streaming. Danh sách model phải là cấu hình cập nhật được, không hard-code tên model cũ thành mặc định lâu dài.

## 8.2. API keys và an toàn bí mật

- Ưu tiên lưu khóa trong session nếu người dùng không yêu cầu ghi nhớ.
- Nếu lưu lâu dài: mã hóa bằng Web Crypto, khóa dẫn xuất từ passphrase, salt ngẫu nhiên, nonce/IV mới cho mỗi lần mã hóa và version metadata.
- Cung cấp nút xóa khóa và xóa toàn bộ dữ liệu provider.
- Không ghi token vào console, crash report, URL, analytics hoặc export mặc định.
- Nếu gọi API trực tiếp từ trình duyệt, giải thích khóa có thể bị lộ khi thiết bị hoặc ứng dụng đang chạy bị xâm nhập; mã hóa at-rest không chống được XSS hoặc script độc hại đang thực thi cùng origin.
- Tùy chọn proxy backend chỉ khi người dùng tự cấu hình; không đặt một API key dùng chung trong client bundle.
- Dùng CSP nghiêm, sanitize output không tin cậy, kiểm tra dependency và không cho plugin tùy ý đọc secret.

## 8.3. Chat dock

- Multi-thread, đổi tên hội thoại, pin, archive, search lịch sử và export.
- Streaming output, stop generation, retry, edit prompt và regenerate.
- Hiển thị provider/model và trạng thái nguồn context.
- Copy, insert into note, convert to task, save as prompt.
- Mỗi cuộc trò chuyện có chế độ: General, Research, Coding, Planning, Summarize.
- Context budget UI cho biết nguồn nào được đưa vào; cho phép bỏ chọn từng nguồn trước khi gửi.

## 8.4. Ask My Second Brain — RAG cá nhân

Pipeline đề xuất:

1. Người dùng đặt câu hỏi.
2. Query parser nhận diện scope như task, note, snippets, journal.
3. Local retriever tìm kiếm từ khóa trước; embedding là tùy chọn nếu có model cục bộ hoặc dịch vụ được bật.
4. Xếp hạng đoạn liên quan và loại trùng.
5. Người dùng có thể xem danh sách nguồn trước khi gửi.
6. Prompt yêu cầu AI phân biệt trích dẫn, suy luận và điều chưa biết.
7. Câu trả lời hiển thị citations nội bộ có thể click để mở nguồn.
8. Nếu không tìm thấy nguồn tốt, AI phải nói rằng kho dữ liệu chưa hỗ trợ câu trả lời đó.

Tính năng: hỏi về task sắp đến hạn, tìm snippet, tổng hợp daily journal, so sánh note, tìm quyết định kiến trúc và tạo báo cáo tuần. Không cần gửi toàn bộ kho tri thức trong mỗi request.

## 8.5. AI actions và approval gate

Phân mức quyền:

- **Read:** đọc dữ liệu đã chọn.
- **Draft:** tạo bản nháp nhưng chưa ghi vào dữ liệu chính.
- **Write:** tạo/cập nhật note hoặc task trong phạm vi đã cho phép.
- **External:** gửi email/API, đăng bài hoặc gửi dữ liệu ra ngoài.
- **Destructive:** xóa hàng loạt, sửa cấu hình bảo mật hoặc thực thi lệnh có tác động lớn.

Read/Draft có thể được bật theo workspace. Write cần preview thay đổi và undo. External/Destructive phải có xác nhận cụ thể ngay trước hành động. AI không được tự mở rộng phạm vi quyền chỉ vì prompt yêu cầu.

## 8.6. Agent workflows

- Workflow editor gồm Trigger → Retrieve → AI step → Condition → Action → Result.
- Trigger: thủ công trước; các trigger theo lịch chỉ thêm sau khi có scheduler đáng tin cậy.
- Mỗi workflow có input/output schema, quyền, timeout, retry policy và giới hạn số bước.
- Step log ghi trạng thái, thời gian và lỗi; không ghi secret hoặc toàn bộ nội dung nhạy cảm vào log mặc định.
- Có Dry Run, Pause, Cancel và giới hạn số lần lặp để chống workflow vô hạn.
- Versioning và clone workflow; test bằng dữ liệu mẫu.

## 8.7. Prompt library & model evaluation

- Lưu prompt theo mục tiêu, input variables, model gợi ý và expected output schema.
- Version prompts; đánh giá bằng bộ test do người dùng tạo.
- So sánh output giữa nhiều provider với cùng một input.
- Ghi lại chi phí/latency chỉ khi provider trả dữ liệu hoặc có phép đo đáng tin cậy.
- Không tuyên bố model “mạnh nhất” chỉ dựa vào một câu trả lời; hỗ trợ benchmark theo tác vụ cá nhân.

---

# 9. Trụ cột VIII — Focus Studio, Audio Lab & Ambient Space

## 9.1. Multi-track sound mixer

- Các kênh mưa, gió, lửa, quán cà phê, tiếng quạt, white/pink/brown noise và ambient tổng hợp.
- Mỗi track có volume, pan, mute, solo và fade in/out.
- Master volume; giới hạn âm lượng tối đa tùy chọn.
- Presets như Rainy Coding, Quiet Library, Space Station, Morning Focus.
- Người dùng có thể import audio của họ và quản lý nguồn trong thư viện riêng.
- Không quảng cáo “luồng 24/7 miễn phí, không quảng cáo” nếu chưa xác minh giấy phép, tính ổn định và quyền phân phối của nguồn phát.

## 9.2. Pomodoro 2.0

- Focus / short break / long break tùy chỉnh từ 5–120 phút.
- Tự chuyển phiên tùy chọn; âm thanh cảnh báo; màn hình Zen.
- Liên kết phiên tập trung vào task/project.
- Pause, skip, extend, end early và ghi chú sau phiên.
- Phục hồi timer sau reload dựa trên timestamp; không phụ thuộc vào một setInterval chạy liên tục.
- Lịch sử phiên, tổng thời gian, xu hướng theo ngày/tuần.

## 9.3. Focus environment

- Ẩn dock, top bar, badge và animation gây phân tâm.
- Chặn notification nội bộ trong thời gian tập trung; cho phép whitelist.
- Đồng bộ wallpaper, ambient preset, timer và task hiện tại bằng một focus profile.
- Kết thúc phiên khôi phục giao diện trước đó.

## 9.4. Audio visualizer

- Waveform, spectrum bars, circular spectrum và particle field.
- Chỉ phân tích âm thanh mà người dùng đã cho phép; không bật micro mặc định.
- Fallback khi AudioContext bị browser suspend hoặc nguồn âm thanh không thể phân tích.
- Tất cả scene có giới hạn FPS và nút tắt.

---

# 10. Trụ cột IX — Virtual Files, Asset Library & Backup Center

## 10.1. File manager

- Virtual folder tree cho file metadata của PWOS, attachments và exports.
- Tạo thư mục, đổi tên, move, favorite, tag, trash và restore.
- Preview Markdown, text, JSON, code, ảnh và PDF bằng viewer phù hợp.
- Drag-and-drop giữa folder; hỗ trợ multiselect và bulk actions.
- Phân biệt rõ **tệp được quản lý trong kho nội bộ** với **tệp thật ở ổ đĩa máy**.
- Với File System Access API, yêu cầu người dùng chọn tệp/thư mục; quyền có thể không tồn tại hoặc bị thu hồi; luôn có fallback upload/download.
- Hỗ trợ kiểm tra hash và phát hiện tệp trùng tùy chọn.

## 10.2. Data persistence & quota

- Trang Storage Health hiển thị dung lượng ước tính, loại dữ liệu và dung lượng cache.
- Cảnh báo trước thao tác import lớn hoặc khi sắp vượt quota.
- Không lưu toàn bộ video 8K trong IndexedDB mặc định.
- Chính sách cache riêng cho thumbnail, preview và asset có thể tải lại.
- Có công cụ dọn cache nhưng tuyệt đối không gộp nó với thao tác xóa dữ liệu người dùng.

## 10.3. Backup Center

- Backup toàn bộ hoặc theo mô-đun.
- Định dạng JSON versioned cho dữ liệu; gói ZIP tùy chọn có manifest và file đính kèm.
- Backup có timestamp, app version, schema version, số bản ghi và checksum.
- Kiểm tra tính toàn vẹn trước khi import.
- Restore có preview: tạo mới, ghi đè, bỏ qua trùng lặp hoặc merge theo quy tắc.
- Tạo snapshot trước migration hoặc restore lớn.
- Export một mô-đun riêng: notes Markdown, tasks CSV, graph JSON, snippets JSON.
- Hiển thị rõ nếu tệp đính kèm bị loại khỏi bản export.

## 10.4. Sync nhiều thiết bị (giai đoạn tùy chọn)

- Local-first operation và hàng đợi thay đổi.
- Sync adapter độc lập với nhà cung cấp, có trạng thái pending/synced/conflict.
- Conflict resolution không được âm thầm ghi đè: giữ phiên bản, cho người dùng so sánh hoặc chọn chính sách.
- Tài khoản, backend, backup server và E2E encryption là các quyết định riêng; không giả định chỉ cần bật cloud là dữ liệu đã mã hóa đầu-cuối.
- Không bắt buộc đăng nhập để dùng bản local-only.

---

# 11. Trụ cột X — Developer Lab & Safe Tools

## 11.1. Công cụ tiện ích

- JSON Formatter/Validator/Minifier.
- YAML ↔ JSON converter.
- UUID v4/v7 generator.
- Regex tester với giới hạn input và timeout.
- SHA-256/SHA-512, Base64 encode/decode; MD5 chỉ ghi nhãn legacy, không dùng cho mục đích bảo mật.
- Unix timestamp converter với múi giờ do người dùng chọn; mặc định hiển thị Asia/Ho_Chi_Minh.
- JWT Inspector: giải mã header/payload và kiểm tra claim thời gian; cảnh báo **decode không đồng nghĩa verify chữ ký**.
- Text/Code Diff 2 cột và unified diff.
- Color converter HEX/RGB/HSL/OKLCH và palette generator.
- URL parser, query-string editor và percent-encoding.
- Cron expression explainer ở dạng đọc; không chạy job thật nếu chưa có scheduler.

## 11.2. HTTP Request Studio

- GET/POST/PUT/PATCH/DELETE, query params, headers, JSON/form body.
- Environment variables có secret marker; redact secret khỏi log.
- Collections, saved requests, history và response preview.
- Timeout, cancel request, response size cap và lỗi mạng rõ ràng.
- Cảnh báo CORS: trình duyệt có thể chặn request; không vượt qua CORS bằng thủ thuật proxy không an toàn.
- Cho phép export collection, nhưng secret không được export mặc định.
- Nếu triển khai proxy, cần allowlist/SSRF protection, giới hạn host, chặn địa chỉ nội bộ và giới hạn kích thước/phản hồi.

## 11.3. Safe JavaScript Runner

- Chạy snippet trong Worker/iframe sandbox có giới hạn; không cấp quyền DOM/app storage/network theo mặc định.
- Thời gian chạy tối đa, giới hạn output, nút Stop và reset môi trường.
- Chế độ không mạng mặc định; mạng chỉ mở nếu người dùng bật permission riêng.
- Không dùng `eval`/`new Function` trên main app để chạy nội dung không tin cậy.
- Hiển thị rõ đây không phải sandbox cấp hệ điều hành; không chạy được mọi npm package hay lệnh native.
- TypeScript cần bước transpile WASM/worker hoặc được đánh dấu là chưa hỗ trợ; không tuyên bố hỗ trợ chỉ vì ô nhập có ngôn ngữ TS.

## 11.4. SQL Studio

- Chọn database profile cục bộ; hiển thị loại engine và giới hạn hỗ trợ.
- Query editor có syntax highlight, lịch sử, saved queries và result grid.
- SELECT preview, sort, copy, export CSV/JSON.
- Query timeout, giới hạn số hàng và nút Cancel.
- Không để lệnh truy vấn làm hỏng store chính của PWOS; ưu tiên database lab tách biệt hoặc read-only adapter.
- Hỗ trợ import dữ liệu mẫu; cảnh báo nếu lệnh có tác dụng sửa/xóa.

## 11.5. Snippets Vault

- Ngôn ngữ, tags, description, nguồn, phiên bản và test sample.
- Syntax highlight, copy, compare version, favorite và tìm kiếm.
- AI giải thích, refactor hoặc tìm rủi ro chỉ trên đoạn code người dùng chọn.
- Trước khi gửi code ra provider AI, hiển thị đích nhận dữ liệu và cho phép che secret.
- Secret scanning cục bộ nhận diện chuỗi có vẻ giống API key/token; kết quả chỉ là cảnh báo, không phải bảo đảm phát hiện toàn bộ.

## 11.6. Terminal: hai chế độ rõ ràng

**Virtual CLI (WEB-CORE):** lệnh đã đăng ký như `task`, `journal`, `calc`, `theme`, `search`, `help`, `export`. Không phải shell hệ điều hành.

**Native Shell (NATIVE-BRIDGE, tùy chọn):** cần app desktop, cấp quyền hẹp, hiển thị lệnh và thư mục làm việc, không chạy command ẩn do AI tạo. Có allowlist, confirmation gate, timeout, output cap, cancel và audit log. Không bao giờ nối chuỗi đầu vào người dùng vào shell theo cách dễ tạo command injection.

---

# 12. Trụ cột XI — Security Vault & Privacy Control Center

## 12.1. Secret vault

- Lưu mục mật khẩu, API token, SSH key note hoặc secret có cấu trúc.
- Tạo mật khẩu ngẫu nhiên; độ dài và bộ ký tự cấu hình được.
- Tự khóa sau thời gian không hoạt động; khóa thủ công; ẩn/hiện từng trường.
- Cảnh báo khi copy secret và tùy chọn xóa clipboard sau một khoảng thời gian nếu môi trường cho phép.
- Không tuyên bố “an toàn tuyệt đối”. UI phải trình bày mô hình đe dọa và giới hạn của vault trên trình duyệt.

## 12.2. Mã hóa và khóa

- Dùng primitive mật mã chuẩn từ Web Crypto hoặc thư viện được kiểm chứng; không tự phát minh thuật toán.
- AES-GCM với nonce/IV không lặp lại cho mỗi lần mã hóa cùng khóa.
- Dùng salt ngẫu nhiên và KDF thích hợp; lựa chọn tham số theo benchmark thiết bị và khuyến nghị an toàn đang áp dụng. Không coi 100.000 vòng PBKDF2 là mặc định đủ cho mọi bối cảnh; hỗ trợ version hóa tham số và nâng cấp khi mở khóa.
- Khóa giải mã không được lưu ở dạng plaintext lâu dài.
- Kiểm tra dữ liệu đầu vào, version envelope và lỗi authentication khi decrypt.
- Có cơ chế đổi passphrase bằng cách re-wrap khóa hoặc mã hóa lại dữ liệu theo quy trình đã kiểm chứng.
- Cung cấp recovery/export có cảnh báo rằng mất passphrase có thể đồng nghĩa mất khả năng giải mã nếu không có bản khôi phục.

## 12.3. Threat model thực tế

Bảo vệ dự kiến:
- Ngăn người vô tình mở ứng dụng xem secret khi vault đang khóa.
- Ngăn lộ dữ liệu trong bản backup nếu backup được mã hóa đúng.
- Giảm rủi ro do log, export và thao tác UI bất cẩn.

Không thể tự bảo đảm chống:
- Malware/keylogger trên máy.
- XSS hoặc dependency độc hại đang chạy trong origin khi vault được mở.
- Máy đã bị chiếm quyền, extension trình duyệt độc hại hoặc người khác kiểm soát phiên đăng nhập.
- Người dùng quên passphrase khi không có recovery key.
- Cloud provider nhìn thấy metadata nếu kiến trúc sync không mã hóa đầu-cuối.

## 12.4. Privacy Center

- Quyền của mỗi provider và plugin.
- Dữ liệu nào được phép gửi ra ngoài; lịch sử request có thể redact.
- Xóa một cuộc trò chuyện, một provider, một mô-đun hoặc toàn bộ dữ liệu.
- Export personal data.
- Tắt analytics; telemetry mặc định off.
- Danh sách third-party domains được sử dụng.
- Xem và thu hồi quyền chọn thư mục/tệp khi API hỗ trợ.
- CSP, dependency scanning, HTML sanitization và link scheme validation là yêu cầu bắt buộc cho bản phát hành.

---

# 13. Trụ cột XII — Automation, Integrations & Event Hub

## 13.1. Event hub

Các sự kiện nội bộ có schema rõ ràng, ví dụ:

- `task.created`, `task.completed`, `task.overdue`
- `note.created`, `note.updated`
- `focus.session.completed`
- `backup.completed`, `sync.conflict`
- `provider.error`, `workflow.failed`

Không dùng tên sự kiện tùy tiện không có version hoặc payload contract. Sự kiện phải phát sau khi thay đổi dữ liệu đã commit.

## 13.2. Automation builder

- Trigger, condition, action và output.
- Điều kiện theo tag, deadline, project, nguồn event và khung thời gian.
- Hành động an toàn: tạo task, gắn tag, tạo daily note, tạo bản nháp báo cáo.
- Hành động ngoài: gọi webhook/email/posting chỉ khi người dùng đã cấu hình connector, quyền và xác nhận cần thiết.
- Rate limit, retry có backoff, idempotency key và chống chạy trùng.
- Lịch sử automation, trạng thái pause, dry run và nút kill switch.
- Phát hiện vòng lặp workflow có thể gọi lại chính nó.

## 13.3. Connector framework

Mỗi connector khai báo:

- ID, tên, version, nhà cung cấp và URL tài liệu.
- Quyền truy cập yêu cầu.
- Dữ liệu sẽ đọc/ghi.
- Cấu hình, secret references và nút disconnect.
- Chính sách timeout, rate limit và retry.
- Export/import cấu hình mà không export secret.

---

# 14. Trụ cột XIII — Analytics, Insights & System Health

## 14.1. Personal analytics cục bộ

- Task completion theo tuần/tháng.
- Focus minutes, thời lượng phiên và phân bố theo project.
- Estimate vs actual.
- Số ghi chú, từ đã viết, link tri thức mới.
- Chi phí định kỳ và ngày gia hạn gần nhất.
- Trend view với bộ lọc thời gian.

Không dùng một con số duy nhất để kết luận người dùng “năng suất” hay “lười”. Phân tích là công cụ tham khảo và phải có cách tắt.

## 14.2. System health panel

- Storage estimate nếu API có hỗ trợ.
- Kích thước cache và trạng thái indexing.
- FPS đo xấp xỉ bằng frame timing; không gọi đó là số FPS GPU hệ thống.
- Ping đến endpoint kiểm tra do người dùng chọn; không tuyên bố đang đo toàn bộ tốc độ Internet.
- Battery status chỉ khi browser hỗ trợ; nếu không, hiển thị “Không được trình duyệt cung cấp”.
- Provider health, lỗi gần đây, pending sync và backup gần nhất.
- Nút diagnostic export loại bỏ token, secret và dữ liệu cá nhân theo mặc định.

---

# 15. Trụ cột XIV — Plugin Platform & Personalization Engine

## 15.1. Plugin manifest

Mỗi plugin phải có manifest versioned:

```json
{
  "id": "example.plugin",
  "name": "Example Plugin",
  "version": "1.0.0",
  "apiVersion": "1",
  "description": "Mô tả ngắn gọn chức năng",
  "permissions": ["tasks.read"],
  "entry": "plugin.js"
}
```

Manifest trên chỉ là ví dụ schema khởi đầu, không phải định dạng cuối cùng.

## 15.2. Permission model

- Quyền tách nhỏ: `tasks.read`, `tasks.write`, `notes.read`, `notes.write`, `network.fetch`, `files.read`, `ai.invoke`, `notifications.create`.
- Plugin chỉ được nhận quyền đã được người dùng chấp thuận.
- Không chia sẻ API key với plugin.
- Plugin chạy trong sandbox/iframe/worker phù hợp; kiểm soát postMessage và origin.
- Plugin không được import module nội bộ tùy ý hoặc sửa DOM shell trực tiếp.
- Thu hồi quyền và gỡ plugin phải ngăn tác vụ nền còn sót lại.

## 15.3. SDK và extension points

- App tile, command, widget, theme, importer/exporter, AI tool và workflow action.
- API version hóa, type definitions, examples và test harness.
- Plugin có thể khai báo cấu hình UI và migrate dữ liệu của chính nó.
- Tất cả extension points phải có giới hạn tài nguyên và error boundary.

## 15.4. Plugin manager / marketplace tương lai

- Cài từ package có chữ ký/checksum; hiển thị source, phiên bản, quyền và lịch sử cập nhật.
- Không tự tải và chạy plugin chưa được người dùng chấp thuận.
- Kiểm tra cập nhật, rollback phiên bản và danh sách blocklist.
- Marketplace là mô-đun tương lai; bản đầu có thể chỉ cho phép plugin cá nhân.

---

# 16. Accessibility, Internationalization & Responsive Design

- Hỗ trợ bàn phím từ launcher đến cửa sổ, modal, graph và bảng dữ liệu.
- Focus ring rõ ràng, thứ tự tab hợp lý, escape đóng overlay.
- ARIA labels cho control không có text hiển thị; tên và trạng thái của icon button phải rõ.
- Contrast đạt mục tiêu WCAG AA cho giao diện cốt lõi.
- `prefers-reduced-motion`, theme high contrast và giảm blur/transparency.
- Tùy chọn kích thước chữ, density và scale giao diện.
- Tiếng Việt và tiếng Anh là các locale đầu tiên; không hard-code chuỗi giao diện trong component.
- Ngày, giờ, số và tiền tệ theo locale; timezone là cấu hình tường minh.
- Desktop-first nhưng có layout tablet/mobile: cửa sổ chuyển thành panel/tab, dock thích ứng, drag-drop có fallback click.
- Không bắt buộc người dùng kéo-thả để thực hiện hành động thiết yếu.

---

# 17. Offline-first, PWA & Native Companion

## 17.1. PWA

- App manifest, icon, theme colors, install prompt phù hợp trình duyệt.
- Service worker cache app shell và asset tĩnh.
- Offline page và chỉ báo Offline/Online rõ ràng.
- Update flow có thông báo khi có bản mới; không xóa cache hoặc buộc reload giữa thao tác ghi dữ liệu.
- Offline queue chỉ áp dụng cho tác vụ có thể lặp an toàn; request ngoài cần kiểm tra idempotency.

## 17.2. Ma trận offline

| Năng lực | Offline | Điều kiện |
|---|---|---|
| Mở desktop, đổi theme, cửa sổ ảo | Có | Asset đã cache |
| Tasks, notes, graph, journal | Có | Dữ liệu local còn nguyên |
| Dev tools thuần cục bộ | Có | Không phụ thuộc CDN/API |
| Wallpaper URL ngoài | Không bảo đảm | Cần URL/cache hoặc upload trước |
| AI cloud | Không | Cần kết nối/provider |
| AI local | Có thể | Có local model/server đang chạy |
| Weather/FX live | Không | Cần nguồn dữ liệu |
| Cloud sync | Không | Cần mạng và backend |
| Native shell / đặt wallpaper OS | Không trong web thuần | Cần native bridge |

## 17.3. Native companion (giai đoạn sau)

- Giao tiếp qua local IPC hoặc loopback service có xác thực, token ngẫu nhiên, origin allowlist và quyền tối thiểu.
- Whitelist từng capability, ví dụ set wallpaper hoặc mở folder đã chọn; không cung cấp API “run arbitrary command” chung.
- Hiển thị prompt xác nhận cho hành động có tác động ngoài PWOS.
- Companion có thể bị tắt mà web app vẫn dùng được.
- Tài liệu hóa nguy cơ local service bị website độc hại gọi; bắt buộc kiểm tra Origin/CSRF và có thiết kế xác thực rõ ràng.

---

# 18. Data model nền tảng

Các entity cần có ID ổn định, `createdAt`, `updatedAt`, `schemaVersion` hoặc cơ chế migration tương đương khi phù hợp.

| Entity | Trường trọng tâm |
|---|---|
| `Workspace` | id, name, themeId, layoutId, createdAt |
| `WindowState` | id, appId, workspaceId, x, y, width, height, state, zOrder |
| `AppPreference` | appId, key, value, updatedAt |
| `Task` | id, title, description, status, priority, dueAt, projectId, tags, estimateMinutes |
| `Subtask` | id, taskId, title, completedAt, order |
| `TimeEntry` | id, taskId, startedAt, endedAt, duration, source |
| `Project` | id, name, status, goal, color, archivedAt |
| `CalendarEvent` | id, title, startAt, endAt, timezone, recurrenceRule |
| `Habit` | id, name, scheduleRule, archivedAt |
| `HabitEntry` | id, habitId, localDate, status, note |
| `Note` | id, title, body, format, tags, projectId, archivedAt |
| `NoteLink` | sourceNoteId, targetNoteId, linkText, linkType |
| `Snippet` | id, title, language, code, tags, version |
| `Asset` | id, name, mimeType, size, source, storageRef, checksum |
| `WallpaperPreset` | id, assetId, filters, sceneId, sceneOptions |
| `FocusSession` | id, taskId, startedAt, endedAt, plannedMinutes, status |
| `ProviderConfig` | id, providerType, model, endpoint, keyReference, settings |
| `Conversation` | id, title, providerId, createdAt, archivedAt |
| `Message` | id, conversationId, role, content, sources, createdAt |
| `VaultItem` | id, encryptedPayload, cryptoVersion, createdAt, updatedAt |
| `Workflow` | id, name, graph, permissions, version, enabled |
| `WorkflowRun` | id, workflowId, status, startedAt, endedAt, errorCode |
| `BackupRecord` | id, createdAt, formatVersion, checksum, scope, result |
| `PluginInstall` | id, pluginId, version, permissions, enabled |
| `AuditEvent` | id, action, actor, targetType, targetId, timestamp, result |

Ghi chú thiết kế:

- Không lưu API key thô trong `ProviderConfig`; chỉ lưu reference đến secret store/session.
- Các trường `tags` và `sources` phải có schema validate, không phải JSON tự do không kiểm soát.
- Timestamp lưu dạng ISO UTC hoặc epoch nhất quán; ngày lịch địa phương phải lưu timezone/context phù hợp.
- Mọi migration phải có version, transaction nếu khả thi, backup trước thay đổi rủi ro và test fixture.

---

# 19. Search index, ranking & cross-app navigation

- Index dữ liệu sau khi commit; thất bại index không được làm thất bại thao tác ghi chính.
- Mỗi loại kết quả có adapter để tạo title, snippet, route/app và hành động.
- Ranking kết hợp match text, exact match, recency và boost do người dùng tùy chỉnh.
- Tokenize tiếng Việt theo cách chịu được dấu và biến thể không dấu; không được làm sai nội dung lưu gốc.
- Search index có thể xây dựng lại từ repository; có nút Rebuild Index.
- Có giới hạn kết quả, debounce và hủy truy vấn cũ khi người dùng gõ nhanh.
- Không index trường secret hoặc vault plaintext.
- Global search có filter và keyboard navigation; kết quả không phân quyền phải bị loại khỏi kết quả, không chỉ bị ẩn ở UI.

---

# 20. Error handling, observability & reliability

## 20.1. Quy ước trạng thái thao tác

Các thao tác lưu, import, backup, AI, sync và workflow phải có trạng thái rõ: `idle`, `running`, `success`, `partial`, `error`, `cancelled`.

## 20.2. Mã lỗi ổn định

Ví dụ: `STORAGE_QUOTA_EXCEEDED`, `IMPORT_VALIDATION_FAILED`, `PROVIDER_TIMEOUT`, `PROVIDER_AUTH_FAILED`, `SYNC_CONFLICT`, `PLUGIN_PERMISSION_DENIED`, `SANDBOX_TIMEOUT`.

- Thông báo người dùng nói rõ điều gì đã xảy ra, phần nào đã thành công, phần nào chưa.
- Có `Retry` nếu thao tác an toàn để chạy lại.
- Có diagnostics ID nhưng không gắn dữ liệu nhạy cảm vào ID.
- Error boundary theo từng ứng dụng để một widget hỏng không làm sập cả desktop.

## 20.3. Logging và telemetry

- Log kỹ thuật cục bộ có giới hạn dung lượng và chính sách xoay vòng.
- Redact token, passphrase, email riêng tư và nội dung note theo mặc định.
- Telemetry opt-in; không dùng telemetry để thu nội dung cá nhân.
- Diagnostic export phải có màn hình preview những gì sẽ được xuất.

---

# 21. Hiệu năng và ngân sách tài nguyên

Đây là mục tiêu nghiệm thu cần đo trên thiết bị tham chiếu, không phải lời hứa rằng mọi thiết bị đều đạt.

- App shell nhanh chóng xuất hiện trước khi tải các mô-đun nặng.
- Lazy-load các app không dùng; worker cho indexing/parsing/tác vụ tính toán.
- Ưu tiên virtualize danh sách dài; giới hạn số node render trực tiếp trên knowledge graph.
- Tránh re-render toàn bộ desktop khi một task thay đổi.
- Chặn animation ẩn, release canvas/context và media khi đóng ứng dụng.
- Throttle drag/resize theo animation frame.
- Giảm chất lượng particle dựa trên FPS và `prefers-reduced-motion`.
- Không tự tải model AI cục bộ cỡ lớn; mọi model download phải là lựa chọn rõ ràng có dung lượng hiển thị.
- Theo dõi bundle size và đặt ngân sách cho app shell; dependency lớn phải có lý do rõ ràng.

### Ngưỡng tham chiếu đề xuất

| Chỉ số | Mục tiêu phát triển |
|---|---|
| Thao tác task cơ bản ghi local | cảm nhận phản hồi ngay; trạng thái save rõ |
| Global search dữ liệu nhỏ/vừa | dưới 150 ms trên máy tham chiếu |
| Chuyển focus cửa sổ ảo | mượt, không phát sinh layout thrash rõ rệt |
| Startup app shell sau cache | mục tiêu dưới 2.5 giây trên máy tham chiếu |
| Lỗi console nghiêm trọng trong happy path | 0 |
| Mất dữ liệu qua reload sau báo “Đã lưu” | 0 trong bộ kiểm thử |

Các ngưỡng phải được kiểm chứng bằng benchmark và có thể điều chỉnh theo thiết bị thực tế.

---

# 22. Testing Strategy & Definition of Done

## 22.1. Unit tests

- Domain rules, recurrence, due date, timezone, task priority.
- Parser command, search filters, link parser và sanitizer.
- Crypto envelope versioning và xử lý lỗi decrypt bằng test vector chuẩn.
- Backup manifest, checksum, migration và duplicate handling.
- Permission checks cho plugin, AI tools và native bridge.

## 22.2. Integration tests

- Repository ↔ IndexedDB transactions.
- Save note → rebuild index → global search.
- Create task → dashboard update → backup/export → import/restore.
- Timer restore sau reload.
- AI provider adapter với mock timeout, auth error, malformed response và stream cancel.
- Workflow retry không tạo task trùng.

## 22.3. End-to-end tests

Các kịch bản bắt buộc:

1. Cài app, mở desktop và thêm cửa sổ.
2. Tạo task, chuyển trạng thái, reload, kiểm tra task còn đó.
3. Tạo note có wiki-link, mở backlinks và graph node.
4. Tạo backup, xóa dữ liệu thử nghiệm, restore và kiểm tra checksum.
5. Nhập URL wallpaper lỗi và xác minh hệ thống giữ nền cũ.
6. Bật Focus, kết thúc phiên, xác minh giao diện được khôi phục.
7. AI không có key phải đưa ra lỗi có hướng dẫn, không báo câu trả lời thành công giả.
8. Plugin bị từ chối permission không thể đọc dữ liệu tương ứng.
9. Code runner timeout phải dừng và không treo UI.
10. Import tệp lỗi không làm hỏng dữ liệu đã có.

## 22.4. Security and accessibility tests

- XSS payload trong note, title, URL, plugin manifest và AI output.
- `javascript:`/data URL validation trong link contexts.
- Secret redaction trong console/log/export.
- CSP policy validation và dependency audit.
- Keyboard-only navigation; focus order; modal escape; contrast/reduced motion.
- Permission denial, revocation và expired file handles.

## 22.5. Definition of Done cho một tính năng

Một tính năng chưa được coi là xong nếu thiếu bất kỳ điểm cần thiết nào:

- UI và empty state.
- Loading, success, partial success và error state.
- Persistence và migration nếu có dữ liệu mới.
- Keyboard/accessibility tương ứng.
- Unit/integration test cốt lõi.
- Export/backup behavior đã xác định nếu tính năng tạo dữ liệu.
- Quyền và privacy review nếu có network, secret, plugin hoặc AI.
- Tài liệu ngắn về giới hạn hỗ trợ.
- Không còn TODO giả dạng UI hoàn chỉnh.

---

# 23. Roadmap triển khai theo cổng chất lượng

Không nên triển khai toàn bộ 14 trụ cột cùng lúc. Mỗi phase chỉ được mở rộng sau khi phase trước đạt tiêu chí nghiệm thu.

## Phase 0 — Foundation & Product Contract

**Mục tiêu:** đặt nền móng để không phải viết lại kiến trúc về sau.

- Xác minh repository, framework, build command, test command và deployment.
- Định nghĩa entity, repository pattern, migration/versioning và error handling.
- Tạo app shell, theme tokens, command registry và app registry.
- Thiết lập IndexedDB, backup/export tối thiểu và sample data.
- CI: lint, typecheck, unit tests, build.
- Error boundary, CSP, dependency audit và basic keyboard navigation.

**Gate:** build và test chạy ổn; có thể tạo dữ liệu mẫu, reload vẫn giữ dữ liệu; export/import kiểm chứng được; không có secret hard-code.

## Phase 1 — Desktop Runtime & Visual Engine

- Virtual windows: drag, resize, focus, minimize/maximize/restore, snap.
- Dock, app launcher cơ bản, workspace switcher.
- Wallpaper library, upload, URL with validation, presets và canvas scenes ban đầu.
- Session layout persistence, reduced motion và low-power mode.
- Top bar, quick settings và widget cơ bản.

**Gate:** reload khôi phục session; app lỗi không làm sập desktop; scene cleanup sạch; mọi chức năng hệ điều hành thật đều được ghi rõ là chưa có hoặc cần native bridge.

## Phase 2 — Core Productivity

- Tasks, Kanban/List, tags, subtasks, deadline, recurrence cơ bản.
- Scratchpad, timer, Pomodoro, daily journal.
- Cost/subscription tracking.
- Search index và command palette liên kết với tasks/notes.
- Backup/restore nâng cao.

**Gate:** E2E tạo → sửa → reload → export → import đạt; recurrence và timezone có test; không mất dữ liệu khi import sai.

## Phase 3 — Second Brain & Files

- Markdown notes, backlinks, templates, graph view.
- Asset/file manager, preview và trash/restore.
- Search filter, note link maintenance, orphan/duplicate report.
- Version history và module-level export.

**Gate:** link không bị hỏng khi rename theo quy tắc; backup chứa đúng metadata; graph mượt ở corpus thử nghiệm được công bố.

## Phase 4 — AI Copilot & RAG

- Provider adapters; BYOK/local endpoint.
- Chat dock; streaming/cancel; error states.
- Local retrieval, source preview/citations và context scope picker.
- Prompt library, report generator và AI-created draft actions.
- Approval gates, redaction, secret handling và provider diagnostics.

**Gate:** không gửi dữ liệu khi chưa chọn provider/consent; nguồn RAG truy ngược được; timeout/cancel hoạt động; các write action có preview/undo.

## Phase 5 — Dev Lab & Workflow Automation

- Dev utilities, SQL Lab, HTTP tester, safe JS runner.
- Virtual CLI, snippets vault, event hub và workflow builder cơ bản.
- Retry/idempotency, run log và kill switch.
- Plugin API thử nghiệm với permission model tối thiểu.

**Gate:** sandbox timeout không treo UI; plugin không vượt quyền; automation không chạy trùng trong test retry.

## Phase 6 — Sync, Plugin Ecosystem & Native Companion

Chỉ thực hiện nếu có nhu cầu và ngân sách rõ ràng.

- Sync nhiều thiết bị, conflict resolution và tùy chọn mã hóa đầu-cuối.
- Plugin manager và package verification.
- Native companion cho những capability thật sự cần OS.
- Import/export từ các công cụ phổ biến, OAuth/connectors tùy chính sách provider.

**Gate:** threat model được review; backup trước migration; revoke token/permission hoạt động; companion không thực thi lệnh tùy ý.

---

# 24. Ưu tiên theo giá trị / độ rủi ro

| Ưu tiên | Nhóm | Lý do |
|---|---|---|
| P0 | Persistence, backup, error handling, app shell | Không có nền bền vững thì tính năng đẹp dễ gây mất dữ liệu |
| P0 | Window runtime, keyboard navigation, responsive fallback | Tạo cảm giác OS và khả năng dùng thực tế |
| P1 | Tasks, notes, search, command palette | Tạo vòng lặp sử dụng hằng ngày |
| P1 | Wallpaper, focus studio, dashboard | Khác biệt trải nghiệm nhưng phải có performance budget |
| P1 | Security/privacy foundation | Cần trước khi thêm API key, AI hoặc plugin |
| P2 | AI/RAG, Dev Lab, automation | Giá trị cao nhưng cần quyền, kiểm thử và xử lý lỗi tốt |
| P3 | Multi-device sync, marketplace, native bridge | Tăng độ phức tạp vận hành; chỉ mở rộng sau khi lõi ổn |

---

# 25. Các anti-pattern bị cấm

- Không tạo nút chỉ để trông có vẻ tính năng đã tồn tại.
- Không báo “đã đồng bộ”, “đã mã hóa” hay “đã lưu” khi thao tác chưa xác nhận thành công.
- Không tự động upload dữ liệu cá nhân chỉ để bật AI.
- Không lưu API key plain text trong localStorage hoặc source code.
- Không dùng `eval()` để thực hiện command hoặc snippet không tin cậy trong ứng dụng chính.
- Không giả vờ web app có quyền đặt wallpaper OS, đọc battery, pin cửa sổ OS hoặc chạy shell thật ở mọi trình duyệt.
- Không tải hàng loạt thư viện lớn khi chưa có kiểm tra dung lượng và nhu cầu.
- Không cho graph, wallpaper animation hoặc widget làm chặn input chính.
- Không thực hiện xóa dữ liệu hàng loạt mà thiếu preview, confirm, undo hoặc backup thích hợp.
- Không coi việc mã hóa bằng AES là đủ nếu key management, XSS, export và threat model còn bỏ ngỏ.
- Không buộc cloud login cho tính năng local-only.
- Không phát hành plugin tùy ý mà không có permission model.

---

# 26. Tiêu chí sản phẩm đủ tốt để phát hành v1

Phiên bản public đầu tiên nên tập trung vào một đường đi trọn vẹn thay vì số lượng tính năng trên quảng cáo.

- Người dùng mở được app và hiểu ngay desktop, dock và launcher.
- Mở/di chuyển/resize cửa sổ ổn định và khôi phục được layout.
- Thay wallpaper, chỉnh preset và bật/tắt hiệu ứng mà không làm treo UI.
- Tạo task, note, journal và search được trên dữ liệu đã lưu cục bộ.
- Offline vẫn mở được phần lõi khi asset đã cache.
- Backup/export/import có kiểm tra tính toàn vẹn và thông báo kết quả.
- Không mất dữ liệu sau reload trong test suite.
- AI là mô-đun tùy chọn với consent rõ, provider adapter và nguồn RAG có thể kiểm tra.
- Không có lỗ hổng nghiêm trọng chưa xử lý hoặc secret hard-code.
- Có tài liệu tính năng hiện có, giới hạn, cách backup và cách xóa dữ liệu.

---

# 27. Definition of product success

Đừng chỉ đo số lượng tính năng đã viết. Theo dõi chỉ số có ý nghĩa và thu thập privacy-conscious:

- **Reliability:** tỷ lệ thao tác lưu thành công; số lỗi mất dữ liệu; tỷ lệ restore thành công.
- **Usability:** thời gian thực hiện task thường gặp; tỷ lệ người dùng hoàn thành luồng đầu tiên.
- **Performance:** startup, search latency, frame drops và memory trend trên thiết bị kiểm thử.
- **Retention:** người dùng quay lại vì task/notes/focus thật sự hữu ích, không vì hiệu ứng mới lạ.
- **Privacy:** tỷ lệ provider/connector bật chủ động; số secret vô tình lọt vào log phải bằng 0.
- **Maintainability:** module có test, migration, permission declaration và tài liệu.

Nếu một tính năng có chi phí bảo trì cao nhưng ít người dùng, hãy làm nó thành plugin hoặc loại khỏi lõi thay vì làm core ngày càng phình to.

---

# 28. Tài liệu kỹ thuật tham chiếu

Các API trình duyệt thay đổi theo engine, phiên bản và chính sách bảo mật. Trước khi triển khai tính năng phụ thuộc API, kiểm tra compatibility matrix và tạo fallback.

- MDN — WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- MDN — File System Access API: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- MDN — Origin Private File System (OPFS): https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- MDN — Battery Status API: https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API
- MDN — Autoplay guide for media and Web Audio APIs: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- MDN — Making PWAs installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- MDN — Offline and background operation: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- MDN — Content Security Policy implementation: https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSP
- OWASP — Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

---

# Kết luận phần I — Nền tảng 4.0

**Personal Web OS 4.0** là blueprint để phát triển một môi trường làm việc cá nhân có thể mở rộng: đẹp ở lớp desktop, hữu ích ở lớp năng suất, sâu ở lớp tri thức, có năng lực AI nhưng kiểm soát được dữ liệu và quyền thực thi.

Điểm khác biệt không nằm ở việc gom thật nhiều icon vào một màn hình. Điểm khác biệt phải là: **mỗi mô-đun hoạt động thật, dữ liệu không dễ mất, tính năng được kiểm thử, giới hạn được nói rõ, và người dùng luôn kiểm soát được dữ liệu của mình.**

Bản này là đặc tả mục tiêu. Trước khi sửa code trong repository thực tế, cần kiểm kê kiến trúc đang có, ánh xạ tính năng hiện tại vào blueprint, xác định các khoảng trống, rồi triển khai theo từng phase với tiêu chí nghiệm thu cụ thể.

---

# PHẦN II — ULTRA EXPANSION SPECIFICATION 5.0

> **Lưu ý về phiên bản:** Phần I kế thừa nền tảng của blueprint 4.0. Phần II dưới đây mở rộng blueprint thành bản 5.0 ở cấp sản phẩm, UX, domain, runtime, dữ liệu và nghiệm thu. Nếu có khác biệt về roadmap hoặc ưu tiên giữa hai phần, **roadmap và các hợp đồng kỹ thuật trong Phần II được ưu tiên**. Những tính năng mang nhãn OPTIONAL/FUTURE không được coi là đã triển khai.

## 29. Mục tiêu nâng cấp 5.0: từ bộ công cụ thành Personal Operating Environment

Personal Web OS 5.0 (PWOS) cần mang lại cảm giác một môi trường làm việc thống nhất, không phải một trang web chứa hàng chục tiện ích rời rạc. Mọi mô-đun sử dụng chung hệ thống danh tính nội bộ, tìm kiếm, lệnh nhanh, lịch sử thao tác, quyền truy cập, lưu trữ, thông báo và hệ thống backup.

### 29.1. Các năng lực cấp hệ thống

1. **Universal Capture:** thu mọi ý tưởng, URL, tệp, đoạn văn, task hoặc lời nhắc vào một Inbox trước khi phân loại.
2. **Contextual Workspace:** mỗi workspace có ứng dụng, cửa sổ, dự án, bộ lọc, nguồn dữ liệu và cấu hình AI riêng.
3. **Personal Knowledge Fabric:** liên kết task, note, project, source, file, contact, decision, event và conversation thành một đồ thị thống nhất.
4. **AI Mission Control:** quản lý mục tiêu AI, kế hoạch, công cụ, quyền, ngân sách, tiến độ, bằng chứng và kết quả ở một nơi.
5. **Automation Fabric:** kích hoạt workflow từ sự kiện, lịch, thao tác người dùng hoặc điều kiện dữ liệu; có retry, timeout, idempotency và nhật ký.
6. **Local-first Data Plane:** thao tác cơ bản không phụ thuộc server; đồng bộ là một lớp có thể bật/tắt.
7. **Portable App Platform:** module nội bộ và plugin tuân theo hợp đồng app chung; có version, quyền và khả năng gỡ bỏ.
8. **Recoverable by Design:** mọi thao tác ghi quan trọng cần trạng thái xác nhận; dữ liệu quan trọng có undo, history hoặc backup tương ứng.
9. **Explainable Automation:** người dùng luôn biết automation/agent đang làm gì, vì sao, dữ liệu nào được dùng và bước nào cần phê duyệt.
10. **Progressive Capability:** giao diện tự phân biệt năng lực web tiêu chuẩn, quyền API, dịch vụ mạng và native companion; không giả lập năng lực không tồn tại.

### 29.2. Mô hình hồ sơ sử dụng (Operating Profiles)

Người dùng có thể khởi tạo hồ sơ theo mục tiêu, nhưng không tạo ra các bản sao dữ liệu độc lập nếu chưa chủ động yêu cầu.

| Profile | Workspace mặc định | Widget ưu tiên | AI context mặc định | Ràng buộc |
|---|---|---|---|---|
| Student | School, Revision | lịch học, deadline, streak | tài liệu học tập được chọn | không tự nộp bài hoặc gửi nội dung |
| Developer | Coding, Research | task, terminal ảo, snippets, Git | repo/tài liệu được người dùng chọn | không chạy shell thật trong web sandbox |
| Researcher | Research, Reading | web sources, graph, citation queue | nguồn đã lưu và ghi chú liên quan | phân biệt nguồn, suy luận và giả thuyết |
| Creator | Content Studio, Planning | content calendar, assets, drafts | brand voice, nguồn xác minh | không tự xuất bản nếu chưa cấp quyền |
| Personal | Life, Finance, Healthless | habits, calendar, subscription | dữ liệu cá nhân đã bật cho AI | mặc định không chia sẻ ra ngoài |
| Minimal | Focus | timer, task hiện tại | chỉ context cuộc hội thoại hiện tại | tắt hiệu ứng nền và analytics không thiết yếu |

### 29.3. Không biến thành một ứng dụng quá nặng

- Cài đặt theo module: module chưa dùng không được nạp bundle nặng ngay lúc bootstrap.
- Mỗi module khai báo `critical`, `optional` hoặc `experimental`.
- Tải code theo nhu cầu; dữ liệu của module không hoạt động không cần được truy vấn liên tục.
- Có chế độ `Lite`, `Balanced`, `Power User`; mọi profile chỉ thay đổi cấu hình giao diện và tài nguyên, không âm thầm thay đổi chính sách quyền.
- Không mặc định bật đồng thời WebGL background, audio visualizer, graph animation, semantic indexing và nhiều agent.

---

# 30. Universal Inbox & Capture Fabric

Universal Inbox là điểm nhập liệu chung của toàn hệ thống. Bất kỳ mô-đun nào cũng có thể tạo một Inbox item, nhưng chỉ người dùng hoặc một workflow được cấp quyền mới được biến item thành dữ liệu chính thức.

## 30.1. Loại capture

- Quick text: dòng chữ, ý tưởng, câu hỏi, việc cần nhớ.
- Task capture: tiêu đề, deadline tùy chọn, mức ưu tiên tùy chọn.
- URL capture: URL, title lấy được, trích đoạn người dùng chọn, thời điểm lưu.
- File capture: tệp được người dùng chọn, metadata, hash tùy chọn.
- Image capture: ảnh và chú thích; OCR chỉ chạy nếu module OCR được bật.
- Code capture: đoạn code, ngôn ngữ suy đoán, nguồn, checksum.
- Voice note: ghi âm sau khi xin quyền micro; speech-to-text là tùy chọn.
- AI answer capture: lưu câu trả lời, model/provider, prompt context được cho phép và nguồn tham chiếu.
- Browser selection capture: đoạn văn bôi đen từ extension/native companion nếu đã được cài và cấp quyền.
- Email/message capture: chỉ khi có connector được người dùng cấu hình; không quét tài khoản tự động mặc định.

## 30.2. Luồng xử lý Inbox

1. Tạo item tạm với `captureId`, nguồn, ngày giờ và trạng thái `inbox`.
2. Lưu dữ liệu gốc cục bộ trước khi chạy phân loại.
3. Có thể đề xuất loại nội dung, tags, project, deadline và liên kết liên quan.
4. Gợi ý của AI không tự trở thành dữ liệu có thẩm quyền nếu không có chính sách auto-apply được bật.
5. Người dùng chọn `Convert`, `Archive`, `Snooze`, `Delete` hoặc `Keep in Inbox`.
6. Khi convert, tạo entity đích và lưu quan hệ `derivedFrom` với Inbox item.
7. Nếu chuyển đổi thất bại, item gốc vẫn nguyên vẹn; không tạo hai entity trùng khi retry.

## 30.3. Chế độ xử lý hàng loạt

- Multi-select và gán tags, project, status, archive.
- Quy tắc tự động: URL chứa domain đã định nghĩa → tag; từ khóa rõ ràng → gợi ý loại; file có đuôi cụ thể → đề xuất module.
- Preview tác động trước khi áp dụng quy tắc cho nhiều item.
- `Undo batch` cho thao tác hàng loạt; log số item thành công/thất bại.
- Saved views: `Unprocessed`, `Today`, `From browser`, `AI suggestions`, `Files`, `Starred`.

## 30.4. Trạng thái và schema tối thiểu

`InboxItem`: `id`, `kind`, `title`, `rawPayloadRef`, `textPreview`, `sourceType`, `sourceUri`, `capturedAt`, `status`, `tags[]`, `projectId?`, `suggestions[]`, `derivedEntityRefs[]`, `createdAt`, `updatedAt`, `deletedAt?`.

`status` chỉ nhận một trong: `inbox`, `processing`, `converted`, `archived`, `snoozed`, `deleted`, `error`. Trạng thái `processing` phải có timeout/recovery; không được khóa item vĩnh viễn.

## 30.5. Tiêu chí nghiệm thu

- Tạo capture offline vẫn lưu thành công trong kho cục bộ.
- Chuyển item thành task hai lần do double-click không tạo hai task.
- AI phân loại lỗi không làm mất payload gốc.
- Người dùng có thể tìm lại item đã archive.
- Bulk action hiển thị kết quả chính xác theo từng item.

---

# 31. Project Cockpit, Goals, Decisions & Delivery Intelligence

Project Cockpit kết nối mục tiêu dài hạn với dự án, task, tài liệu, quyết định và chỉ số tiến độ.

## 31.1. Cấu trúc quản lý

`Goal → Area → Project → Milestone → Task → Subtask` là phân cấp gợi ý, không ép tất cả công việc phải dùng đủ mọi tầng. Một task có thể liên kết nhiều note/source, nhưng chỉ có một parent trực tiếp để tránh quan hệ cây mơ hồ.

Mỗi Project bao gồm:

- Overview và mô tả phạm vi.
- Outcome định nghĩa bằng kết quả có thể kiểm chứng.
- Status: `idea`, `planned`, `active`, `blocked`, `paused`, `completed`, `archived`.
- Milestones, timeline, task board, file, notes, source library.
- Decision log ghi quyết định, lý do, phương án bị từ chối và ngày đánh giá lại.
- Risk register: xác suất, tác động, biện pháp giảm thiểu, owner cá nhân.
- Change log và weekly review.
- Project health score có công thức minh bạch; không dùng một điểm AI bí ẩn.

## 31.2. Goal planning

- Goal có thời hạn, chỉ số đo, đơn vị, baseline và target.
- Hỗ trợ outcome goal và process goal.
- Milestone có điều kiện hoàn thành cụ thể.
- Một goal có thể liên kết nhiều project; tiến độ goal không đơn giản lấy trung bình % task.
- Dự báo trễ phải trình bày giả định: số việc còn lại, effort ước tính, thời gian rảnh dự kiến.
- Goal review theo tuần/tháng: điều gì đã thay đổi, dữ liệu nào ủng hộ, việc nào nên bỏ hoặc thu hẹp.

## 31.3. Decision Log / RFC

Mẫu bắt buộc:

- Context: vấn đề và ràng buộc.
- Options: ít nhất các phương án đã cân nhắc thực tế.
- Decision: chọn phương án nào.
- Rationale: tại sao phù hợp.
- Consequences: lợi ích, đánh đổi, rủi ro và chi phí bảo trì.
- Evidence: liên kết source/test/benchmark.
- Status: proposed, accepted, superseded, rejected.
- Revisit date: ngày xem xét lại nếu điều kiện thay đổi.

AI được phép soạn bản nháp decision log, nhưng người dùng quyết định trạng thái `accepted`.

## 31.4. Project health và cảnh báo

- Phát hiện task không có owner (nếu có nhóm), task bị block, milestone chưa có task, dự án không hoạt động lâu ngày.
- Cảnh báo dependency cycle.
- Không đánh dấu dự án `healthy` nếu thiếu deadline mà dự án được khai báo có deadline bắt buộc.
- Người dùng điều chỉnh trọng số health; hệ thống lưu phiên bản công thức.
- Có `Why this score?` giải thích thành phần điểm.

## 31.5. Acceptance

- Người dùng có thể từ goal đi xuống task và truy ngược mọi quan hệ.
- Xóa project phải cho lựa chọn archive hoặc xóa dữ liệu liên quan; thao tác xóa có preview.
- Đổi cấu trúc project không làm đứt backlinks hoặc liên kết file.
- Decision log luôn lưu được thời điểm và lịch sử thay đổi.

---

# 32. Web Research Desk & Evidence Library

Mô-đun nghiên cứu giúp lưu nguồn web và tổng hợp bằng chứng mà không đánh đồng kết quả tìm kiếm, nội dung nguồn, suy luận của AI và sự thật đã xác minh.

## 32.1. Source Library

Mỗi nguồn có `sourceId`, URL gốc, URL chuẩn hóa, tiêu đề, tác giả nếu có, domain, ngày xuất bản nếu xác định được, ngày capture, loại nguồn, ngôn ngữ, nội dung trích dẫn được phép lưu, ghi chú của người dùng, hash nội dung và trạng thái truy cập.

Các trạng thái nguồn: `captured`, `metadata-only`, `read`, `annotated`, `archived`, `unavailable`, `needs-review`.

Hỗ trợ:

- Lưu URL và metadata.
- Lưu đoạn trích do người dùng chọn.
- Annotation gắn vào đoạn văn, có vị trí nguồn khi khả thi.
- Snapshot cục bộ chỉ khi hợp pháp, được người dùng chủ động lưu và không vượt giới hạn nguồn.
- Gắn source vào task/project/note/decision.
- Cảnh báo URL hỏng hoặc nội dung thay đổi nếu có cơ chế kiểm tra được bật.
- Deduplicate URL canonical và hash; người dùng có thể giữ hai bản khác nhau nếu là phiên bản khác nhau.

## 32.2. Evidence Board

Một claim phải mang trạng thái riêng:

- `unreviewed`: mới được nêu ra.
- `supported`: có ít nhất một nguồn có liên quan.
- `corroborated`: có nhiều nguồn độc lập phù hợp.
- `disputed`: có nguồn mâu thuẫn.
- `refuted`: bằng chứng hiện có phản bác claim.
- `stale`: có thể đã lỗi thời.

Mỗi claim có nội dung, ngày kiểm tra, nguồn hỗ trợ, nguồn phản chứng, mức độ chắc chắn do người dùng đánh giá, giả định và ghi chú. Không được tự đổi từ `unreviewed` sang `corroborated` chỉ vì AI tự lặp lại cùng một nguồn.

## 32.3. Research workflow

1. Đặt câu hỏi nghiên cứu và phạm vi.
2. Thêm các nguồn ban đầu.
3. Trích xuất claim riêng biệt từ từng nguồn.
4. Gắn nguồn hỗ trợ/phản chứng cho từng claim.
5. Tách `fact`, `interpretation`, `hypothesis`, `opinion` và `unknown`.
6. Xem bảng mâu thuẫn và nguồn thiếu.
7. Tạo báo cáo với trích dẫn quay về nguồn gốc.
8. Xuất Markdown/JSON/CSV, giữ metadata nguồn.

## 32.4. AI tổng hợp có kiểm soát

- Mọi kết luận quan trọng phải truy ngược về `sourceId` và vị trí đoạn nếu nguồn có hỗ trợ.
- Khi không có bằng chứng, AI phải ghi `not established by saved sources` hoặc cách diễn đạt tương đương.
- Không được tạo citation giả hoặc làm URL trông có vẻ thật.
- Hiển thị ngày xuất bản khác với ngày sự kiện khi cả hai xác định được.
- Tóm tắt không thay thế bản gốc; click citation phải mở đúng nguồn.
- Cho phép chọn nguồn nào được đưa vào context; mặc định chỉ dùng nguồn trong research project đang mở.

## 32.5. Phạm vi trình duyệt

Ứng dụng web không thể tùy tiện đọc toàn bộ tab, cookie, lịch sử hoặc trang riêng tư của trình duyệt. Capture từ trang hiện tại cần input/URL người dùng cung cấp hoặc extension/native companion đã cài và cấp quyền cụ thể.

---

# 33. AI Mission Control — Multi-Agent Runtime

Đây là trung tâm điều phối AI, nhưng phải là runtime có trạng thái, policy và bằng chứng, không phải một vòng lặp gọi model không giới hạn.

## 33.1. Khái niệm nền tảng

- **Mission:** mục tiêu cấp cao do người dùng yêu cầu.
- **Plan:** các bước có dependency và điều kiện hoàn thành.
- **Run:** một lần thực thi plan với ID riêng.
- **Agent profile:** prompt hệ thống, nhiệm vụ, tool allowlist, giới hạn token/chi phí, chính sách retry.
- **Tool call:** yêu cầu gọi một công cụ đã đăng ký, có schema input/output.
- **Artifact:** đầu ra được tạo, ví dụ báo cáo, file, patch, bảng dữ liệu.
- **Evidence:** log, nguồn, test hoặc quan sát hỗ trợ kết quả.
- **Approval request:** điểm dừng chờ người dùng phê duyệt.
- **Checkpoint:** trạng thái có thể tiếp tục sau khi tạm dừng hoặc reload.

## 33.2. State machine bắt buộc

`draft → queued → planning → awaiting_approval → running → verifying → succeeded`

Các trạng thái kết thúc hoặc nhánh khác: `failed`, `cancelled`, `paused`, `needs_input`, `budget_exceeded`, `permission_denied`, `partially_succeeded`.

Quy tắc:

- Mỗi transition phải được kiểm tra; không cho phép nhảy trực tiếp từ `draft` sang `succeeded`.
- Mission `running` phải có `runId`, heartbeat hoặc dấu mốc tiến độ.
- `cancelled` phải ngăn phát sinh tool call mới sau thời điểm hủy được xác nhận, trừ công cụ không thể hủy đang chạy thì ghi rõ.
- Retry phải có idempotency key hoặc xác minh side effect trước khi thử lại.
- `budget_exceeded` phải dừng gọi model/công cụ không thiết yếu.
- Khi trang reload, mission không tự chạy lại side effect nếu trạng thái trước đó không xác định an toàn.

## 33.3. Vai trò agent mẫu

- Planner: phân rã mục tiêu và dependency; không được tự thực thi hành động ngoài quyền đọc.
- Researcher: tìm/đọc các nguồn trong allowlist; lưu citation/evidence.
- Builder: tạo nội dung hoặc patch trong sandbox riêng.
- Reviewer: kiểm tra kết quả dựa vào tiêu chí độc lập với agent Builder.
- Tester: thực thi bộ test được cho phép và ghi output.
- Librarian: đề xuất cập nhật knowledge base, không tự xóa nguồn gốc.
- Coordinator: quản lý trạng thái, ngân sách, retry và handoff.

Mỗi vai trò có thể dùng cùng một model; “nhiều agent” không đồng nghĩa với nhiều model hoặc khả năng cao hơn tự động. Chỉ bật song song khi công việc độc lập và tài nguyên cho phép.

## 33.4. Planning contract

Một plan step gồm:

`stepId`, `title`, `description`, `dependsOn[]`, `inputRefs[]`, `expectedOutput`, `toolsAllowed[]`, `riskLevel`, `budgetEstimate`, `timeoutMs`, `verification`, `retryPolicy`, `approvalPolicy`.

Plan phải được kiểm tra trước khi chạy:

- Không có dependency cycle.
- Mọi tool được đề cập tồn tại và được cấp quyền.
- Mọi bước có expected output và cách xác minh phù hợp.
- Bước có side effect phải mang risk level.
- Dự toán ngân sách không vượt giới hạn run.
- Nội dung untrusted từ nguồn web/tài liệu không được nâng thành system instruction.

## 33.5. Approval tiers

| Tier | Ví dụ | Mặc định |
|---|---|---|
| A0 — Read-only | tìm trong dữ liệu đã được cấp quyền, đọc note chọn trước | có thể tự chạy trong phạm vi session |
| A1 — Reversible write | tạo draft, tạo note tạm, tạo task mới | cho phép nếu người dùng bật policy; có undo |
| A2 — External side effect | gửi request, gửi message, publish, commit code từ connector | luôn cần xác nhận hiển thị rõ nội dung/đích đến |
| A3 — Destructive/high impact | xóa hàng loạt, xóa backup, thay đổi quyền, chuyển tiền hoặc thay đổi bảo mật | cấm tự động; xác nhận mạnh và phạm vi cụ thể |

Không có chế độ “AI được làm mọi thứ” mặc định. Quyền theo profile không thể rộng hơn quyền của người dùng hiện tại.

## 33.6. Tool registry

Mỗi tool phải khai báo: `toolId`, version, mô tả, JSON Schema input/output, permission scopes, network domains, side-effect class, timeout, retry semantics, data classification và test fixtures.

- Không cung cấp tool `execute_anything`.
- Không biến output của model thành shell, JavaScript eval hoặc SQL tự do mà không qua sandbox/policy tương ứng.
- URL, Markdown, tài liệu và nội dung trả về từ connector là input không đáng tin cho đến khi được kiểm tra.
- Tool output phải có `status`, `data`, `errorCode?`, `durationMs`, `traceId`.

## 33.7. Human approval UI

Thẻ phê duyệt hiển thị:

- AI định làm gì.
- Dữ liệu nào sẽ được đọc hoặc gửi.
- Tài khoản/đích đến/tool liên quan.
- Hành động có thể đảo ngược hay không.
- Diff hoặc preview trước/sau.
- Chi phí/tokens ước tính khi có dữ liệu.
- Nút `Approve once`, `Approve for this run`, `Reject`, `Edit request`.

Không được dùng một checkbox mơ hồ để xin quyền vĩnh viễn cho những hành động khác nhau.

## 33.8. Verification gate

- Kết quả code phải chạy test nếu môi trường test sẵn có; nếu không, báo rõ test nào chưa chạy.
- Kết quả nghiên cứu phải có source/evidence.
- File artifact phải tồn tại, có kích thước hợp lý và đọc lại được trước khi báo hoàn tất.
- Kết quả chuyển đổi dữ liệu phải so sánh số bản ghi đầu vào/đầu ra và báo phần bị loại.
- Reviewer phải dùng tiêu chí kiểm tra được, không chỉ hỏi một model khác “có ổn không?”.

## 33.9. Mission timeline và observability

Timeline hiển thị thời gian, agent, step, tool call, token/cost nếu có, checkpoint, approval, output và lỗi. Người dùng có thể lọc theo agent hoặc trạng thái, tải log về và ẩn payload nhạy cảm khi export.

---

# 34. Visual Workflow Canvas & Automation Engine

Workflow builder sử dụng node graph có kiểu dữ liệu. Canvas chỉ là giao diện; workflow khi lưu phải được biên dịch thành schema versioned, có thể validate và chạy độc lập khỏi vị trí node trên canvas.

## 34.1. Các node chuẩn

**Trigger:** manual, schedule, event, webhook (backend/companion), file-import-complete, task-deadline, inbox-created.

**Logic:** condition, switch, filter, map, merge, foreach giới hạn, delay có giới hạn, debounce, deduplicate, rate-limit.

**Data:** get-task, create-task, update-note, search-knowledge, add-tag, create-project, export-file.

**AI:** classify, summarize, extract-claims, draft-content, plan-steps. Các node AI cần model profile, context allowlist, output schema, token limit và fallback.

**Integration:** HTTP request theo domain allowlist, connector action có schema, notification.

**Control:** approval gate, retry block, timeout, stop, checkpoint.

## 34.2. Workflow data contract

Mỗi node có `nodeId`, `type`, `version`, `config`, `inputPorts`, `outputPorts`, `retryPolicy?`, `timeoutMs?`, `permissionScopes[]`.
Mỗi edge có `edgeId`, `sourceNodeId`, `sourcePort`, `targetNodeId`, `targetPort`, `mapping?`.

Workflow có `workflowId`, `name`, `version`, `trigger`, `nodes[]`, `edges[]`, `variablesSchema`, `permissions[]`, `concurrencyPolicy`, `errorPolicy`, `createdAt`, `updatedAt`, `status`.

## 34.3. Runtime semantics

- Validate type giữa các port trước khi publish workflow.
- Cấm chu trình vô hạn, trừ cấu trúc loop có `maxIterations` và điều kiện kết thúc hữu hạn.
- Mọi run có `workflowRunId` riêng và log input/output đã được redaction.
- Retry chỉ áp dụng khi lỗi được phân loại là retryable; không retry lỗi permission, validation hoặc sai dữ liệu.
- Workflow có side effect phải dùng idempotency key ở connector hỗ trợ; nếu không hỗ trợ cần bước kiểm tra hậu điều kiện.
- Có chế độ `dry-run` chỉ tính đường đi và preview payload, không gọi side-effect tool.
- `Stop run` chặn node tiếp theo, yêu cầu hủy các node đang chạy nếu connector hỗ trợ.
- Concurrency limit theo workflow và toàn hệ thống.

## 34.4. Mẫu workflow: Deadline → nhắc việc

1. Trigger kiểm tra task gần deadline theo lịch.
2. Lấy các task chưa hoàn tất và chưa bị snooze.
3. Loại task đã có reminder gần nhất trong khoảng cooldown.
4. Tạo preview danh sách sẽ thông báo.
5. Nếu chế độ `approval required`, chờ xác nhận.
6. Gửi notification nội bộ.
7. Lưu `lastReminderAt` và idempotency key.
8. Ghi kết quả thành công/thất bại từng task.

## 34.5. Versioning workflow

- Draft có thể chỉnh sửa; published version là bất biến.
- Run đang chạy giữ tham chiếu version lúc bắt đầu.
- Đổi node không ảnh hưởng run cũ.
- Rollback là tạo version mới từ snapshot cũ, không xóa audit history.

---

# 35. Local AI Runtime, Model Router & Cost Governance

Mô-đun AI phải hoạt động với nhiều cấp năng lực: API cloud do người dùng cung cấp, endpoint tương thích OpenAI, local runtime nếu đã cài, và chế độ không AI. Không model provider nào được coi là bắt buộc.

## 35.1. Model registry

Mỗi model profile gồm:

- `providerId`, `modelId`, tên hiển thị và endpoint mode.
- Context window nếu đã được provider công bố/được cấu hình.
- Hỗ trợ vision, tool calling, structured output, streaming, embeddings.
- Chi phí input/output nếu người dùng nhập hoặc có nguồn cấu hình đáng tin.
- Mức độ nhạy dữ liệu cho phép: public, personal, confidential, local-only.
- Timeout, retry, concurrency và fallback.
- Điểm đánh giá nội bộ theo task cụ thể; không có “điểm thông minh tuyệt đối”.

## 35.2. Routing policy

- Chọn model theo loại tác vụ, độ nhạy dữ liệu, ngân sách, độ trễ và năng lực bắt buộc.
- Nếu context có confidential/local-only, chỉ model được chính sách cho phép mới được nhận dữ liệu.
- Ưu tiên model nhẹ cho phân loại ngắn, model phù hợp hơn cho tổng hợp dài; phải cho người dùng override.
- Fallback không được lặng lẽ chuyển dữ liệu local-only sang cloud.
- Có chế độ `Ask every time`, `Use selected model`, `Smart route`.

## 35.3. Budget guardrails

- Hạn mức mỗi lần gọi, mỗi run, mỗi ngày và theo provider nếu có thể đo.
- Ước lượng chi phí hiển thị trước khi chạy; số liệu ước lượng không được trình bày như hóa đơn chính xác.
- Dừng hoặc xin phép khi vượt ngưỡng token/chi phí.
- Lưu usage metadata, không bắt buộc giữ toàn bộ prompt nhạy cảm trong logs.
- Cho phép tắt lịch sử usage.

## 35.4. Evaluation Lab

- Bộ test prompt cố định theo use case.
- Expected output hoặc rubric có tiêu chí rõ.
- Chạy so sánh provider/model qua nhiều lần và lưu model version khi biết.
- Đánh giá: độ đúng, citation accuracy, schema validity, latency, token/cost, refusal/error rate.
- Chỉ so sánh các chỉ số có dữ liệu thực; đánh dấu kết quả thiếu mẫu.
- Regression test trước khi đổi model route mặc định.

## 35.5. Local model bridge

Web app không tự cài hay khởi động Ollama/local model trên máy người dùng. Người dùng cần cấu hình endpoint hoặc cài companion, sau đó kiểm tra kết nối bằng health check. Không hiển thị “offline/local” nếu request vẫn đi qua cloud proxy.

## 35.6. Prompt and context inspector

- Cho xem phần system rules, user request, retrieved items và token estimate theo mức độ không gây lộ bí mật nội bộ của provider.
- Cho phép loại nguồn/đoạn dữ liệu khỏi context.
- Hiển thị source ID và lý do một memory được truy xuất.
- Nút `Forget this memory` xóa hoặc ngắt liên kết theo chính sách lưu trữ.
- Chống prompt injection bằng cách phân loại dữ liệu retrieved là untrusted content; không biến thành quyền hoặc chỉ thị hệ thống.

---

# 36. Creator Studio & Content Production Pipeline

Creator Studio là pipeline sản xuất nội dung từ nghiên cứu đến bản nháp, duyệt và xuất bản; không phụ thuộc vào một nền tảng cụ thể.

## 36.1. Content objects

`ContentItem`: tiêu đề, loại nội dung, ngôn ngữ, audience, status, brief, body, sourceRefs, assetRefs, tags, campaignId, channelTargets, scheduledAt?, publishedAt?, revision, approvalState.

Các trạng thái: `idea`, `brief`, `researching`, `draft`, `editing`, `review`, `approved`, `scheduled`, `published`, `repurposed`, `archived`.

## 36.2. Pipeline

- Idea inbox → brief → research/source check → outline → draft → edit → fact-check → approval → schedule/export.
- Mỗi bước có checklist riêng; có thể cấu hình pipeline khác theo blog/video/social/email.
- Lưu revision để so sánh diff giữa các bản.
- Một content item có thể tạo biến thể cho nhiều kênh; từng biến thể giữ link đến nội dung gốc.
- Asset library hỗ trợ ảnh, âm thanh, footage, thumbnail, license note và nguồn gốc.
- Lịch biên tập dạng calendar, Kanban và timeline campaign.

## 36.3. AI writing controls

- Voice profile do người dùng định nghĩa: tone, audience, từ/cụm từ nên tránh, độ dài, cấu trúc.
- Brief và style guide là nguồn context riêng biệt, không được trộn lẫn với facts.
- Nút tạo outline, draft, rút gọn, mở rộng, chuyển định dạng, tạo tiêu đề/description/hashtag.
- Công cụ fact check tạo danh sách claim cần xác minh, không tuyên bố đã xác minh nếu chưa có nguồn.
- Hỗ trợ “diff giải thích”: AI chỉ ra phần nào thay đổi và lý do.
- Không tự đăng bài lên nền tảng; xuất bản cần connector có quyền và approval riêng.

## 36.4. Lịch và quản lý campaign

- Múi giờ rõ ràng, hỗ trợ lên lịch local time.
- Kiểm tra xung đột lịch và giới hạn số bài/ngày do người dùng đặt.
- Status lịch khác với trạng thái nội dung; item scheduled không mặc nhiên đã được nền tảng đăng.
- Nếu connector trả kết quả không rõ, đánh dấu `publish_unknown` và yêu cầu xác minh, không retry vô điều kiện để tránh đăng trùng.

## 36.5. Analytics

- Lưu chỉ số do người dùng nhập hoặc connector cung cấp; có nguồn và timestamp.
- Không so sánh CTR, watch time hoặc engagement giữa các kênh nếu định nghĩa không tương đương.
- Đánh dấu dữ liệu thiếu và khoảng thời gian đo.
- Hỗ trợ postmortem nội dung: giả thuyết, thay đổi đã thử, kết quả quan sát, điều học được.

---

# 37. Learning Lab & Personal Knowledge Training

Mô-đun học tập giúp biến tài liệu thành lịch ôn, bài tập, flashcards và tiến độ, nhưng không tự nhận là hệ thống chẩn đoán năng lực chính xác tuyệt đối.

## 37.1. Learning objects

- Course/subject, topic, learning objective, lesson note, source, question, answer, flashcard, exam session, mastery observation.
- Mỗi câu hỏi có độ khó do người dùng hoặc người biên soạn đánh giá; AI-generated questions phải có nhãn `AI draft`.
- Một kiến thức có thể liên kết nhiều môn hoặc project.

## 37.2. Spaced repetition

- Lịch nhắc ôn dựa trên khoảng cách thời gian và phản hồi nhớ/không nhớ.
- Lưu thuật toán và version; người dùng có thể chọn chế độ đơn giản hoặc nâng cao.
- Hỗ trợ `Again`, `Hard`, `Good`, `Easy`; tùy chọn trả lời đúng/sai cho dạng quiz.
- Không phạt người học khi bỏ lỡ ngày; tính lại lịch từ lần ôn thực tế.
- Cho xem lý do flashcard được lên lịch hôm nay.

## 37.3. Quiz Builder

- Trắc nghiệm đơn/đa lựa chọn, điền đáp án, trả lời ngắn, ghép cặp, bài toán có bước giải.
- Answer key và explanation riêng biệt.
- Chấm tự động chỉ cho dạng đáp án có quy tắc rõ; câu tự luận AI feedback là gợi ý, không coi là điểm chính thức.
- Chế độ thi thử có thời gian, trộn câu hỏi, lưu tiến độ khi rời trang.
- Có review sai và thống kê lỗi theo chủ đề.

## 37.4. Study Planner

- Nhập ngày thi, chủ đề, mức độ tự tin, thời gian học mỗi ngày.
- Gợi ý phân bổ buổi học theo ưu tiên và độ khó; người dùng có thể chỉnh.
- Dự báo hoàn thành phải dựa trên thời gian thực tế và giả định hiển thị.
- Điều chỉnh kế hoạch khi bỏ lỡ buổi học, không dồn khối lượng phi thực tế vào ngày kế tiếp.
- Tích hợp task/calendar nhưng không tạo bản sao vô chủ; task ôn tập phải liên kết learning item.

## 37.5. Learning analytics

- Thời lượng thực tế, số câu đã làm, tỷ lệ đúng theo dạng câu, chủ đề cần ôn.
- Cảnh báo khi số mẫu quá thấp.
- Tách tiến bộ quan sát được khỏi mức độ thành thạo ước lượng.
- Xuất ghi chú, flashcards và quiz theo Markdown/CSV/JSON.

---

# 38. Personal CRM & Relationship Memory

Đây là module tùy chọn, riêng tư; không tự thu thập liên hệ từ thiết bị hoặc mạng xã hội.

## 38.1. Contact record

- Tên hiển thị, alias, thông tin liên hệ do người dùng nhập, tags, organization, cách quen biết.
- Last interaction, next follow-up, notes, project links, interaction timeline.
- Mức độ nhạy cảm và tùy chọn loại khỏi AI context.
- Hạn chế trường dữ liệu cá nhân không cần thiết; không yêu cầu thu thập ngày sinh/địa chỉ nếu không có mục đích.

## 38.2. Relationship actions

- Nhắc follow-up theo chu kỳ do người dùng chọn.
- Ghi chú sau cuộc gặp và task cần thực hiện.
- Xem lại những tương tác gần đây và cam kết chưa hoàn thành.
- Nhóm theo đồng nghiệp, mentor, khách hàng, đối tác hoặc nhóm tùy chỉnh.
- Không tự gửi tin nhắn; draft message có trạng thái và phải xác nhận trước khi gửi qua connector.

## 38.3. Privacy controls

- Contact mặc định private.
- Export và xóa riêng từng contact.
- Không dùng contacts để huấn luyện model hoặc gửi qua provider trừ khi người dùng chủ động chọn context cho một lần gọi.
- Có thể đặt `never send to cloud AI` theo contact hoặc trường dữ liệu.

---

# 39. Import Center, Data Studio & Data Portability

Import Center xử lý di chuyển dữ liệu từ công cụ khác, còn Data Studio giúp hiểu, kiểm tra và xuất dữ liệu của chính PWOS.

## 39.1. Format ưu tiên

- PWOS portable bundle (manifest + JSON + asset folder).
- Markdown với frontmatter tùy chọn cho notes và journals.
- CSV cho bảng dữ liệu đơn giản.
- JSON Lines cho bộ dữ liệu lớn.
- ICS cho calendar interchange nếu module lịch hỗ trợ.
- ZIP có manifest và checksum cho bundle chứa nhiều tệp.

## 39.2. Import pipeline

1. Chọn file/nguồn; hiển thị loại và dung lượng.
2. Đọc manifest và kiểm tra MIME/format thực tế.
3. Parse vào staging area; không ghi đè ngay vào dữ liệu chính.
4. Báo số dòng/record đọc được, lỗi, trường chưa hỗ trợ và file đính kèm thiếu.
5. Cho mapping trường và chiến lược duplicate: skip, merge, create copy, replace có điều kiện.
6. Preview số lượng tạo/cập nhật/bỏ qua.
7. Người dùng xác nhận commit.
8. Ghi import report và cho rollback nếu transaction có thể khôi phục.

## 39.3. Export pipeline

- Người dùng chọn module, project, date range, fields và asset policy.
- Secret vault mặc định không xuất plaintext.
- Export tạo manifest gồm version, thời điểm, số record, checksum và cảnh báo phần dữ liệu không hỗ trợ.
- Mã hóa bundle là tùy chọn; nếu dùng, phải kiểm tra giải mã thử trước khi báo hoàn tất.
- Hỗ trợ export toàn bộ dữ liệu để tránh vendor lock-in.

## 39.4. Data Inspector

- Xem số entity, dung lượng ước tính, record thiếu liên kết, orphan file và schema version.
- Dry-run sửa lỗi quan hệ; không tự xóa dữ liệu chỉ vì không tìm thấy parent.
- Công cụ dedupe hiển thị bản ghi và trường khác nhau trước khi merge.
- Lịch sử import/export không lưu secret hoặc nội dung nhạy cảm dư thừa.

---

# 40. Notification Center, Scheduler & Reminder Reliability

## 40.1. Kênh thông báo

- In-app notifications luôn là kênh nền tảng.
- Browser push chỉ có sau khi user cấp quyền và có service worker/endpoint phù hợp.
- Email, chat hoặc webhook là connector tùy chọn.
- Không giả vờ gửi notification ra ngoài nếu chỉ tạo bản ghi nội bộ.

## 40.2. Reminder policy

- Reminder có entity target, due time, timezone, channel, status và dedupe key.
- Hỗ trợ snooze, dismiss, complete, open target và reschedule.
- Có quiet hours và per-project notification policy.
- Recurring reminder phải định nghĩa xử lý daylight saving/múi giờ nếu áp dụng.
- Khi quyền thông báo bị từ chối, vẫn hiển thị trong notification center.

## 40.3. Scheduler semantics

- Lịch ở frontend chỉ đảm bảo khi ứng dụng đang chạy hoặc có cơ chế browser hỗ trợ; web page đóng không đảm bảo timer nền hoạt động.
- Tác vụ cần chạy đúng giờ khi app đóng phải dựa vào backend/OS scheduler được cấu hình.
- Job ghi `scheduledFor`, `startedAt`, `finishedAt`, `lastHeartbeatAt`, `attempt`, `resultStatus`.
- Có timeout, retry policy, dead-letter state và nút replay có kiểm soát.
- Thời gian job lưu chuẩn UTC khi cần, đồng thời giữ timezone người dùng để hiển thị.

---

# 41. Browser Companion & Native Bridge Protocol

Browser extension và native companion là thành phần tùy chọn, được thiết kế như những adapter có quyền hạn giới hạn; không được biến PWOS thành một dịch vụ thực thi lệnh không kiểm soát.

## 41.1. Browser companion capabilities

Tùy quyền trình duyệt được cấp, extension có thể:

- Lưu URL/title của tab hiện tại.
- Capture đoạn text người dùng chọn.
- Mở PWOS tại một route cụ thể.
- Nhận lệnh đã đăng ký như tạo Inbox item hoặc mở workspace.
- Đồng bộ trạng thái đơn giản qua message schema versioned.

Extension không được mặc định đọc mọi nội dung trang, cookie, mật khẩu hoặc lịch sử duyệt web.

## 41.2. Native companion capabilities

Có thể cung cấp API riêng cho thao tác mà web không làm được: đặt wallpaper hệ điều hành, đọc metric đã được cho phép, mở ứng dụng cụ thể qua whitelist, tích hợp notification OS.

## 41.3. Security protocol

- Chỉ bind local interface khi cần; không mở endpoint ra mạng công cộng mặc định.
- Mọi request phải có authentication token ngẫu nhiên, nguồn được cho phép, version, request ID, timestamp/nonce chống replay và schema validation.
- Allowlist action cụ thể; không có endpoint thực thi shell tùy ý.
- Kiểm tra Origin/Host nhưng không coi riêng Origin là cơ chế xác thực duy nhất.
- Token có thể thu hồi và xoay vòng.
- Payload nhạy cảm không ghi ra log.
- Gói lệnh phá hủy hoặc ngoài allowlist bị từ chối, có mã lỗi rõ.
- Companion không được phơi API quản trị khi khóa màn hình hoặc người dùng chưa xác thực nếu hành động nhạy cảm.

## 41.4. Capability negotiation

Handshake trả `protocolVersion`, `companionVersion`, `capabilities[]`, `permissionsGranted[]`, `platform`, `health` và các giới hạn. PWOS chỉ hiện control tương ứng nếu capability được xác nhận; capability thiếu sẽ có fallback giải thích được.

---

# 42. Sync Engine & Conflict Resolution

Đồng bộ là một lớp độc lập. Bản local vẫn sử dụng được nếu tắt sync hoặc mất mạng.

## 42.1. Sync state

Mỗi entity cần metadata đồng bộ: `localVersion`, `remoteVersion?`, `dirtyState`, `lastSyncedAt?`, `syncError?`, `deletedAt?`, `deviceId`, `modifiedAt`.

Các trạng thái: `local-only`, `pending-upload`, `pending-download`, `syncing`, `synced`, `conflict`, `error`, `paused`.

## 42.2. Conflict strategy theo loại dữ liệu

- Notes: ưu tiên 3-way merge theo đoạn nếu khả thi; khi không an toàn, giữ cả hai phiên bản và tạo conflict record.
- Tasks: merge trường độc lập; trạng thái hoàn thành không được âm thầm bị thay bằng trạng thái cũ nếu policy chọn version mới hơn.
- Window layout/preferences: last-write-wins có thể chấp nhận được, nhưng phải theo timestamp/version có quy ước.
- Vault/secrets: không đồng bộ plaintext; chỉ dùng mô hình mã hóa end-to-end được thiết kế riêng hoặc để local-only.
- Binary asset: content hash giúp deduplicate; không ghi đè file cùng tên mà khác hash.
- Deletion: tombstone giữ đủ lâu để các thiết bị offline nhận biết xóa; tránh entity tự hồi sinh.

## 42.3. Encryption and identity

- TLS cho truyền tải.
- Nếu quảng bá end-to-end encryption, khóa phải được quản lý sao cho server không thể giải mã nội dung; không gọi mã hóa storage đơn thuần là E2EE.
- Phục hồi khóa phải có mô tả đánh đổi rõ ràng.
- Server không nhận key bí mật raw nếu thiết kế yêu cầu zero-knowledge.
- Người dùng có thể xem danh sách thiết bị được liên kết và thu hồi thiết bị.

## 42.4. Sync test cases

- Thiết bị A sửa note khi offline; thiết bị B sửa cùng note; reconnect phải tạo merge hoặc conflict rõ.
- Xóa entity trên A; B offline không được làm entity đó xuất hiện vĩnh viễn trở lại.
- Retry sau timeout không nhân đôi item.
- Sync bị dừng giữa asset upload phải tiếp tục được.
- Version schema cũ phải migrate hoặc từ chối an toàn, không âm thầm bỏ field.

---

# 43. Plugin SDK, App Contract & Extension Lifecycle

## 43.1. Plugin lifecycle

`discovered → inspected → permission_review → installed → enabled → running → disabled → uninstalled`.

Trường hợp lỗi: `blocked`, `incompatible`, `crashed`, `needs_update`. Không tự chuyển plugin bị crash thành enabled-running nếu chưa restart có kiểm tra.

## 43.2. Plugin manifest contract

Manifest chứa tối thiểu:

- `id`, `name`, `version`, `description`, `publisher`, `license`.
- `pwosApiVersion`, `entry`, `minHostVersion`.
- `permissions[]`, `networkDomains[]`, `storageQuota`, `resourceBudget`.
- `commands[]`, `eventsSubscribed[]`, `settingsSchema`, `migrations[]`.
- `integrity` hoặc chữ ký nếu hệ thống phát hành có cung cấp.
- `dataExportHandlers` và `uninstallPolicy`.

Không tin manifest chỉ vì tên publisher đẹp; phải validate, kiểm tra version và xin người dùng duyệt quyền.

## 43.3. Permission scopes ví dụ

- `workspace.read`, `workspace.write`
- `tasks.read`, `tasks.create`, `tasks.update`, `tasks.delete`
- `notes.read_selected`, `notes.write`
- `files.read_selected`, `files.create_export`
- `network.fetch_allowlisted`
- `ai.invoke`, `ai.context.selected_data`
- `notifications.create`
- `calendar.read_selected`, `calendar.write`
- `vault.use_selected_secret` (không có quyền dump vault)

Scope càng nhỏ càng tốt. Ví dụ plugin chỉ cần tạo task không được cấp `tasks.delete`.

## 43.4. Runtime isolation

- Ưu tiên sandboxed iframe/worker tùy API yêu cầu.
- Không cho plugin truy cập trực tiếp store nội bộ hoặc object global toàn hệ thống.
- Giao tiếp qua host API typed, có validation và permission check ở host.
- Timeout cho command; giới hạn số event/giây và dung lượng storage.
- Ghi log crash; có nút disable plugin không cần khởi động lại toàn hệ thống.
- Không chạy code plugin từ URL từ xa mới tải về mà bỏ qua version/hash/consent.

## 43.5. Plugin install/update

- Hiển thị nhà phát hành, version, quyền, network domains, kích thước và thay đổi quyền so với version trước.
- Nếu update yêu cầu permission mới, phải xin duyệt lại.
- Có rollback version nếu gói cũ tương thích và còn được giữ.
- Gỡ plugin phải cho biết dữ liệu plugin sẽ bị xóa, giữ lại hay export.
- Gói plugin lỗi không được làm app shell sập.

---

# 44. Unified Search 2.0 & Knowledge Retrieval

## 44.1. Search pipeline

1. Parse query và filter.
2. Tìm trong index lexical.
3. Nếu bật semantic search và có embedding model, truy vấn vector index.
4. Gộp candidate, loại trùng và xếp hạng.
5. Apply permission filter trước khi render result.
6. Hiển thị đoạn trích, loại dữ liệu, ngày, project và lý do phù hợp.

Không được để semantic search trả dữ liệu người dùng không có quyền xem.

## 44.2. Ranking

Score có thể kết hợp lexical relevance, semantic similarity, recency, user pin/favorite và entity type preference. Trọng số phải có cấu hình hoặc có thể kiểm tra qua test fixture; không tuyên bố chính xác nếu chưa benchmark.

## 44.3. Vietnamese support

- Tìm có dấu và không dấu.
- Tùy chọn phân biệt từ đầy đủ hay substring.
- Chuẩn hóa Unicode nhất quán.
- Không loại dấu trong kho dữ liệu gốc; chỉ phục vụ index phụ.
- Kiểm tra các từ dễ nhập sai và tên riêng trước khi fuzzy-match đề xuất sửa.

## 44.4. Search commands

- Filter theo `type:task`, `project:ForgeStudio`, `tag:urgent`, `after:2026-01-01`, `before:2026-12-31`.
- `in:current-workspace`, `status:open`, `has:attachment`, `source:browser`.
- Lưu search view; cho thấy query parsed để người dùng nhận ra filter sai.
- Chọn kết quả có thể mở nội dung hiện tại, side panel hoặc window mới.

## 44.5. Search privacy

Index cục bộ không được gửi tự động lên cloud. Nếu có remote search, phải thể hiện phạm vi dữ liệu gửi đi. Secret vault và các entity đặt local-only phải bị loại khỏi index AI mặc định.

---

# 45. Personal Data Governance & Privacy Dashboard

## 45.1. Data classifications

- `public`: có thể chia sẻ theo thiết lập hiện hành.
- `personal`: dữ liệu cá nhân thông thường.
- `confidential`: dữ liệu riêng tư cao, project/client/private notes.
- `secret`: credential và khóa; chỉ Secret Vault xử lý.
- `local-only`: tuyệt đối không gửi qua mạng theo policy của người dùng.

Mỗi entity có thể kế thừa classification từ project nhưng được tăng mức hạn chế. Không tự giảm classification khi di chuyển entity.

## 45.2. Data Flow Inspector

Trước khi gọi AI/connector, có thể xem:

- Provider hoặc destination.
- Loại entity/context được gửi.
- Tổng số mục/đoạn và file đính kèm.
- Các trường bị loại/redact.
- Chính sách áp dụng và lý do một mục không được gửi.

## 45.3. Retention and deletion

- Giữ lịch sử theo chính sách người dùng chọn.
- Xóa mềm cho entity thông thường; xóa secret cần xử lý riêng.
- Xóa cứng phải có confirmation và không được hứa xóa khỏi backup chưa được cập nhật.
- Nếu dùng cloud provider, phân biệt xóa bản local, bản server và dữ liệu lưu trong hệ thống bên ngoài.
- Export personal data và xóa tài khoản/cloud state phải có quy trình riêng.

## 45.4. Privacy audit

Log audit cần sự kiện, thời gian, module, action, permission scope và kết quả; tránh lưu giá trị bí mật hoặc toàn văn nội dung nhạy cảm. Người dùng có thể xem, lọc và export audit log; log có thể bị giới hạn dung lượng theo policy.

---

# 46. UX Contract — Màn hình, luồng và trạng thái

## 46.1. Global shell

- Top Bar: app menu, breadcrumb/workspace, command palette, quick capture, sync state, network/local mode, notifications, profile/settings.
- Dock: pinned apps, active windows, launch indicator, status badge; keyboard focus rõ.
- Launcher: search-first, nhóm app, recently used, favorites và trạng thái plugin.
- Window overview: thumbnail/label; hỗ trợ đóng hoặc chuyển focus bằng bàn phím.
- Command palette: lệnh, tìm kiếm, navigation, quick math và action preview.
- Right inspector: metadata, backlinks, tags, permissions hoặc history tùy entity.

## 46.2. Mandatory UI states

Mỗi màn hình dữ liệu phải có:

- Loading/skeleton khi đang truy vấn.
- Empty state hướng dẫn thao tác đầu tiên.
- Error state có mã lỗi hoặc thao tác thử lại phù hợp.
- Offline state và hành vi được hỗ trợ.
- Permission denied state khi thiếu quyền.
- Saving/saved/unsaved/conflict state.
- Stale data indicator nếu có thể hiển thị dữ liệu cũ.
- Destructive confirmation cho thao tác xóa hoặc ghi đè.

## 46.3. Form behavior

- Validation ở client để phản hồi nhanh và validate lại ở data boundary.
- Hiển thị lỗi cạnh trường tương ứng; không chỉ đổi viền đỏ.
- Khi save thất bại, giữ input và không reset form.
- Dirty form khi đóng cửa sổ phải hỏi save/discard/cancel nếu mất dữ liệu.
- Error không được xóa các trường hợp lệ đã nhập.

## 46.4. Undo, redo và history

- Undo áp dụng với thao tác có inverse xác định: move, tag, edit field, archive, tạo entity.
- Với side effect ngoài hệ thống, chỉ hiển thị “undo” nếu connector có API bù trừ thực sự; nếu không, cung cấp hướng dẫn khắc phục.
- History ghi diff trường đã thay đổi và timestamp.
- History không được lưu plaintext secret.

## 46.5. Design system

Tokens gồm color, surface, text, border, elevation, spacing, radius, typography, motion duration và focus ring. Component không hardcode màu cho từng feature khi đã có semantic token.

- Theme: dark/light/system/custom.
- Contrast mode và reduced transparency.
- Motion policy: full/reduced/off.
- Density: comfortable/compact.
- Typography scaling.
- Themes chỉ đổi presentation; không đổi quyền, dữ liệu hoặc hành vi bảo mật.

## 46.6. Responsive behavior

- Desktop: windowed runtime đầy đủ.
- Tablet: workspace-first, điều khiển cửa sổ có hit-target lớn.
- Mobile: navigation/tab stack; không ép cửa sổ desktop nhỏ vào màn hình hẹp.
- Chế độ split view chỉ dùng khi viewport phù hợp.
- Hành động thường dùng không phụ thuộc hover.

---

# 47. Mở rộng Data Model — Entity Catalog 5.0

Mô hình này là logical domain model; cách lưu thực tế có thể dùng IndexedDB, SQL/WASM hoặc backend theo adapter. ID nên ổn định và không phụ thuộc thứ tự bản ghi.

## 47.1. Entity bổ sung

| Entity | Mục đích | Quan hệ quan trọng |
|---|---|---|
| `Goal` | kết quả dài hạn | Areas, Projects, Metrics |
| `Area` | vùng trách nhiệm | Goals, Projects |
| `Project` | phạm vi công việc | Goals, Milestones, Tasks, Notes, Sources |
| `Milestone` | mốc kết quả | Project, Tasks |
| `DecisionRecord` | lịch sử quyết định | Project, SourceRefs, Artifacts |
| `InboxItem` | đầu vào chưa xử lý | Derived entities, attachments |
| `SourceRecord` | nguồn nghiên cứu | Claims, Annotations, Projects |
| `Claim` | mệnh đề cần xác minh | Supporting Sources, Contradictions |
| `Annotation` | ghi chú theo đoạn nguồn | SourceRecord, Note |
| `Mission` | mục tiêu AI | Runs, AgentProfile, Artifacts |
| `MissionRun` | phiên chạy | Steps, Logs, Checkpoints |
| `AgentProfile` | vai trò agent | Tool permissions, ModelProfile |
| `ToolDefinition` | công cụ có schema | Permissions, ToolRuns |
| `ApprovalRequest` | yêu cầu duyệt | MissionRun, PayloadPreview |
| `WorkflowDefinition` | workflow versioned | Nodes, Edges, Runs |
| `WorkflowRun` | phiên thực thi workflow | NodeRuns, Logs |
| `ContentItem` | nội dung sản xuất | Campaign, Assets, Sources |
| `ContentRevision` | phiên bản nội dung | ContentItem, Diff |
| `LearningItem` | chủ đề/bài học/câu hỏi | Course, Topic, SourceRefs |
| `ReviewEvent` | sự kiện ôn tập | LearningItem, Schedule |
| `Contact` | danh bạ cá nhân | Interaction, FollowUp |
| `IntegrationConnection` | connector đã cấu hình | CredentialRef, Permissions |
| `DeviceRecord` | thiết bị đồng bộ | SyncState |
| `ConflictRecord` | xung đột sync | EntityRef, Versions |
| `AuditEvent` | sự kiện bảo mật/thay đổi | Actor, Module, Result |
| `ImportJob` | lần import | StagingRecords, Report |
| `ExportJob` | lần export | BundleManifest, Report |

## 47.2. Common metadata

Entity có thể dùng `id`, `schemaVersion`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `tags[]`, `classification`, `sourceRefs[]`, `deletedAt?`, `syncMetadata?`. Không bắt mọi bảng phải có mọi trường nếu module không cần; ưu tiên schema nhỏ, rõ.

## 47.3. ID, dates and ordering

- ID dùng UUID/ULID hoặc cơ chế ổn định tương đương; không dùng array index làm ID.
- Lưu thời gian theo ISO 8601/UTC cho sự kiện toàn hệ thống; lưu timezone gốc khi lịch lặp cần thiết.
- Ngày deadline không có giờ phải là date-only, không tự biến thành midnight UTC.
- Ordering thủ công nên dùng order key có thể cập nhật độc lập; kiểm thử reorder nhiều thiết bị.

## 47.4. Referential integrity

- Delete parent phải có policy rõ: restrict, cascade, archive child hoặc detach.
- Mọi `entityRef` phải có `entityType` và `entityId`.
- Migration phải phát hiện broken refs, không xóa âm thầm.
- Orphan content được chuyển vào recovery area hoặc báo cáo cho người dùng.

## 47.5. Schema migration

Mỗi migration có ID, fromVersion, toVersion, preconditions, transformation, postconditions và rollback strategy nếu có thể. Chạy migration trong transaction hoặc qua staging/copy-on-write cho dữ liệu lớn. Backup trước migration quan trọng; sau migration phải verify số lượng entity và kiểm tra invariant.

---

# 48. Command Registry — Catalog mở rộng

Danh mục sau là đề xuất. Chỉ các command đã thực sự đăng ký trong runtime mới được hiển thị; command không khả dụng phải báo module hoặc permission còn thiếu.

## 48.1. Navigation / window

```text
help
app list
app open <appId>
app open <appId> --new-window
window list
window focus <windowId>
window minimize <windowId>
window maximize <windowId>
window tile-left <windowId>
window tile-right <windowId>
window overview
workspace list
workspace create <name>
workspace switch <name>
workspace save-session <name>
workspace restore-session <name>
layout apply <layoutId>
```

## 48.2. Capture / search / notes

```text
capture text "..."
capture url <url>
capture file --picker
inbox list --status inbox
inbox process <itemId>
inbox archive <itemId>
search "query"
search "query" type:note project:<projectId>
note new --title "..."
note open <noteId>
note link <noteIdA> <noteIdB>
note backlinks <noteId>
source add <url>
source list --project <projectId>
claim list --status disputed
```

## 48.3. Task / project / planning

```text
task add "..." --priority high
task list --today
task complete <taskId>
task snooze <taskId> --until <date-time>
task start-tracking <taskId>
task stop-tracking <taskId>
project create "..."
project open <projectId>
project health <projectId>
goal create "..."
review daily
review weekly
calendar today
calendar next-week
```

## 48.4. Focus / environment

```text
focus start --duration 25
focus start --duration 50 --preset deep-work
focus pause
focus resume
focus stop
sound preset list
sound preset apply <presetId>
wallpaper next
wallpaper mode low-power
theme set dark
```

## 48.5. AI / Mission / workflow

```text
ai models
ai model use <profileId>
ai budget show
ai evaluate <suiteId>
mission create "..."
mission plan <missionId>
mission approve <missionId> --step <stepId>
mission pause <missionId>
mission resume <missionId>
mission cancel <missionId>
mission inspect <missionId>
workflow list
workflow validate <workflowId>
workflow dry-run <workflowId>
workflow run <workflowId>
workflow stop <workflowRunId>
```

## 48.6. Data / settings / security

```text
backup create
backup list
backup verify <backupId>
export select
import inspect <file>
import dry-run <jobId>
import commit <jobId>
data inspect
privacy flows
privacy audit --last 7d
vault lock
vault status
plugin list
plugin inspect <pluginId>
plugin disable <pluginId>
settings open <section>
```

## 48.7. Parsing and execution requirements

- Hỗ trợ autocomplete và help per command.
- Parse theo schema, không nối chuỗi thành eval/shell.
- Escape quote và Unicode đúng.
- `--dry-run` được support với command có side effect khi có ý nghĩa.
- Thông báo permission denial phải nêu scope cụ thể.
- Command history có chế độ private và nút clear.

---

# 49. Event Taxonomy — Event Hub mở rộng

Event name dùng namespace rõ ràng. Payload chứa entity IDs và metadata tối thiểu; không chứa full secret hoặc dữ liệu nhạy cảm nếu không cần.

## 49.1. Event groups

**App/runtime:** `app.started`, `app.opened`, `app.closed`, `window.focused`, `window.layout_changed`, `workspace.switched`.

**Capture/data:** `inbox.item_created`, `inbox.item_converted`, `entity.created`, `entity.updated`, `entity.archived`, `entity.deleted`, `data.import_completed`, `data.export_completed`, `backup.created`, `backup.verified`.

**Tasks/projects:** `task.created`, `task.completed`, `task.overdue`, `task.blocked`, `project.status_changed`, `milestone.completed`, `goal.review_due`.

**Knowledge:** `note.updated`, `source.captured`, `claim.created`, `claim.status_changed`, `knowledge.index_rebuilt`.

**AI:** `mission.created`, `mission.started`, `mission.step_completed`, `mission.awaiting_approval`, `mission.failed`, `tool.call_started`, `tool.call_completed`, `ai.budget_warning`.

**Workflow:** `workflow.published`, `workflow.run_started`, `workflow.run_completed`, `workflow.run_failed`, `workflow.retry_scheduled`.

**Sync/security:** `sync.started`, `sync.conflict_detected`, `sync.completed`, `permission.granted`, `permission.revoked`, `vault.locked`, `plugin.crashed`, `privacy.policy_changed`.

## 49.2. Event envelope

Mọi event dùng envelope tương thích:

```json
{
  "eventId": "evt_<unique-id>",
  "eventName": "task.completed",
  "eventVersion": 1,
  "occurredAt": "2026-10-09T10:30:00Z",
  "actor": { "type": "user", "id": "local-user" },
  "entity": { "type": "task", "id": "task-id" },
  "correlationId": "run-or-command-id",
  "payload": { "status": "done" },
  "classification": "personal"
}
```

## 49.3. Event delivery

- Event consumer phải khai báo version và schema.
- Consumer lỗi không làm rollback một thao tác đã lưu bền vững trừ khi event là một phần transaction bắt buộc.
- Có retry, dead letter và giới hạn concurrency.
- Event replay phải phân biệt replay mô phỏng và re-execute side effect.
- Workflow chạy từ event phải có idempotency key.

---

# 50. API & Integration Contract (Optional Backend)

Web-only có thể không cần backend riêng cho dữ liệu cá nhân. Nếu bật backend, thiết kế API theo resource và version rõ ràng.

## 50.1. API conventions

- Prefix version, ví dụ `/api/v1/`.
- JSON request/response có schema.
- Error shape ổn định: `code`, `message`, `details?`, `traceId`, `retryable`.
- Pagination bằng cursor cho collection lớn.
- Idempotency key cho create/action có side effect.
- Rate limit và quota được trả minh bạch.
- Authz kiểm tra phía server; frontend hide button không thay thế authorization.
- API không trả secret ra client sau lúc cấu hình trừ khi flow đó thật sự cần.

## 50.2. Endpoint groups tham chiếu

```text
GET    /api/v1/health
GET    /api/v1/me
GET    /api/v1/sync/changes?cursor=...
POST   /api/v1/sync/push
POST   /api/v1/sync/pull
POST   /api/v1/integrations/{id}/test
POST   /api/v1/ai/execute
GET    /api/v1/ai/usage
POST   /api/v1/workflows/{id}/runs
GET    /api/v1/workflow-runs/{runId}
POST   /api/v1/workflow-runs/{runId}/cancel
POST   /api/v1/export-jobs
GET    /api/v1/export-jobs/{jobId}
```

Các endpoint là hợp đồng minh họa, chưa phải endpoint đã tồn tại.

## 50.3. Connector standard

Connector khai báo provider, auth method, requested scopes, supported actions, rate limit, retry guidance, data fields sent, retention note và health check. Credential được lưu trong secret store phù hợp; không nhúng API key vào frontend bundle hoặc source control.

## 50.4. Rate limit and abuse control

- Tách quota user, connector và endpoint.
- Exponential backoff có jitter cho lỗi retryable.
- Không retry 401/403 như lỗi mạng.
- `429` tôn trọng thời gian retry nếu nguồn cung cấp.
- Webhook phải xác minh signature khi provider hỗ trợ và chặn replay.

---

# 51. Expanded Security Architecture & Threat Register

## 51.1. Threats phải kiểm thử

1. XSS trong note/Markdown/plugin content.
2. Prompt injection trong web page, file import, note hoặc tool output.
3. Rò API key qua logs, localStorage không phù hợp, URL, error stack hoặc export.
4. Plugin vượt quyền qua object tham chiếu hoặc global state.
5. CSRF/SSRF ở backend connector hoặc local bridge.
6. Prototype pollution/unsafe deserialization từ import file.
7. Malicious ZIP, path traversal và file type spoofing.
8. Replay request đến native companion.
9. AI gọi tool lặp gây side effect hoặc vượt ngân sách.
10. Sync conflict làm mất dữ liệu hoặc hồi sinh dữ liệu đã xóa.
11. SQL tool đọc nhầm database ứng dụng hoặc chạy lệnh ngoài sandbox.
12. Denial of service qua workflow loop, graph cực lớn hoặc file quá nặng.
13. Phơi bày dữ liệu qua index tìm kiếm không tôn trọng classification.
14. Clipboard exfiltration và URL chứa secret.
15. Backup/export bị tạo ra nhưng không giải mã được.

## 51.2. Mitigations

- Escape/render Markdown an toàn; không render HTML thô mặc định.
- CSP và dependency audit; hạn chế dynamic code execution.
- Validate schema tại mọi boundary.
- Tách credential khỏi entity dữ liệu thông thường.
- Network allowlist cho tools/plugins/companion.
- Timeout, budget, concurrency limit và cancel token.
- Sandboxed worker/process cho code execution; không dùng eval trong app shell.
- Zip extraction path checks, file size limits, MIME sniffing và hash verification.
- Permission checks ở host/backend, không chỉ UI.
- Security review cho mọi scope mới và connector mới.

## 51.3. Security incident workflow

1. Ghi nhận `incidentId`, timestamp và phạm vi bị ảnh hưởng.
2. Disable integration/plugin/permission liên quan.
3. Thu thập log đã redacted, không copy bí mật vào ticket.
4. Đánh giá dữ liệu đã gửi ra ngoài và token cần thu hồi.
5. Hướng dẫn rotation credential khi cần.
6. Patch, test regression, phát hành changelog.
7. Khôi phục từ backup đã kiểm tra.
8. Tạo postmortem gồm nguyên nhân gốc, phát hiện, ảnh hưởng và hành động phòng ngừa.

Không được hứa hệ thống “an toàn tuyệt đối”. Mục tiêu là giảm rủi ro, giới hạn phạm vi ảnh hưởng và có khả năng phát hiện/khôi phục.

---

# 52. Performance Engineering — Budget theo module

Ngân sách dưới đây là mục tiêu khởi điểm để đo trên thiết bị tham chiếu, không phải đảm bảo chung cho mọi máy.

| Khu vực | Mục tiêu tham chiếu | Cách đo |
|---|---|---|
| Initial shell | tải nhanh, không kéo cả app catalog | bundle analyzer, Lighthouse/profile |
| Command palette | phản hồi tương tác cảm nhận tức thì | mark open-to-results latency |
| Local save | UI báo saved sau durable commit | persistence integration test |
| Window drag | chuyển động ổn định trên máy tham chiếu | frame-time profiler |
| Search lexical | p95 mục tiêu dưới ngưỡng cấu hình cho 10k entity | synthetic dataset benchmark |
| Knowledge graph | không dựng mọi node khi dataset lớn | node/edge cap, virtualization |
| AI streaming | hiển thị first token khi provider hỗ trợ | provider trace |
| Large import | không block UI thread | Worker/memory profiler |
| Audio visualizer | có chế độ giảm FPS/tắt | visibility/reduced motion test |

## 52.1. Adaptive quality manager

- `Low Power`: dừng shader phức tạp, cap animation, giảm FPS, không tự embedding/index toàn bộ.
- `Balanced`: hiệu ứng trung bình và indexing theo batch.
- `Performance`: giữ độ mượt UI, defer các tác vụ nền.
- `Manual`: người dùng cấu hình từng mô-đun.

Tự động hạ chất lượng chỉ thay đổi hiệu ứng và background jobs, không tắt chức năng lưu dữ liệu hoặc bỏ qua kiểm tra bảo mật.

## 52.2. Memory and lifecycle

- Hủy event listener, timer, object URL và worker khi module unmount.
- Không giữ toàn bộ file lớn trong JS heap nếu dùng stream/chunk được.
- Có giới hạn graph node và content preview.
- Dừng animation/visualization ở tab ẩn.
- Xử lý quota exceeded với lựa chọn giải phóng cache/export dữ liệu; không tự xóa tài liệu gốc.

---

# 53. Test Strategy — Feature Contract Matrix

Mọi module phải bao phủ luồng thành công, lỗi, offline, permission, recovery và accessibility phù hợp.

## 53.1. Ma trận tối thiểu

| Module | Happy path | Failure path | Recovery | Security | Accessibility |
|---|---|---|---|---|---|
| Window manager | move/resize/snap | viewport resize | restore session | không lộ dữ liệu cửa sổ chéo quyền | keyboard move/focus |
| Inbox | capture/convert | parser lỗi | retry không trùng | payload untrusted | labels/announcements |
| Tasks | create/move/complete | save conflict | undo/restore | project scope | keyboard reorder |
| Knowledge | wiki link/backlink | dangling ref | repair link | private note filter | graph alternative list |
| AI Mission | plan/run/verify | timeout/budget | checkpoint resume | tool approval | status live region |
| Workflow | validate/run | node failure | retry/resume | permission per node | canvas keyboard equivalent |
| Import/export | valid bundle | malformed archive | staging rollback | zip traversal test | clear error summary |
| Sync | push/pull | conflict/network loss | resume from cursor | E2E encryption tests if claimed | conflict review accessible |
| Plugin | install/enable | crash/incompatible | disable/rollback | sandbox/permission tests | settings keyboard access |
| Vault | unlock/use/lock | wrong passphrase | backup recovery | secret leakage scan | focus-safe dialog |

## 53.2. Property/invariant tests

- IDs không trùng.
- Task complete không tự làm mất checklist.
- Xóa mềm có thể khôi phục trong thời hạn policy.
- Backlinks đồng bộ với wiki links sau create/update/delete.
- Workflow graph hợp lệ không có vòng lặp ngoài cấu trúc được kiểm soát.
- Không có tool call khi permission bị revoke.
- `local-only` entity không xuất hiện trong outbound payload.
- Import bất kỳ file lỗi nào cũng không làm biến đổi dữ liệu chính nếu chưa commit.
- Export/import round-trip bảo toàn các trường được hỗ trợ.
- Retry side-effect không nhân đôi entity nếu connector hỗ trợ idempotency.

## 53.3. Fault injection

Mô phỏng mất mạng trước/sau request, quota full, tab bị reload, process bị dừng, provider 429/500, tool timeout, file hỏng, migration bị ngắt và đồng hồ hệ thống thay đổi. Cần ghi rõ test nào chỉ mô phỏng trong môi trường dev.

---

# 54. Roadmap 5.0 — 12 Workstreams với Quality Gates

Roadmap này thay thế roadmap ba chặng trong tài liệu 3.5 và lộ trình sáu phase ở bản nền 4.0. Không triển khai tất cả module cùng lúc; mỗi workstream có đầu ra, phụ thuộc và cổng nghiệm thu riêng.

## WS0 — Repository audit & product contract

**Đầu ra:** inventory code hiện tại, kiến trúc đang dùng, dependency map, route map, component map, dữ liệu hiện có, test baseline, risk list.

**Không được làm:** viết lại toàn bộ stack trước khi biết phần nào đã ổn; xóa dữ liệu hoặc component mà chưa có migration plan.

**Gate:** có build/test baseline; có danh sách module giữ lại/thay; tính năng chưa triển khai được gắn status rõ.

## WS1 — Core runtime & data foundation

**Đầu ra:** app registry, module loader, persistence adapter, schema versioning, event envelope, command registry, global error boundary.

**Gate:** lưu lại sau reload; migration tests; import/export bản nhỏ; lỗi persistence không hiện “saved”.

## WS2 — Shell, desktop, window manager

**Đầu ra:** top bar, dock, launcher, window operations, workspaces, session restore, keyboard navigation.

**Gate:** nhiều cửa sổ đồng thời; không out-of-bounds; test keyboard; mobile fallback rõ.

## WS3 — Visual Atelier & Focus

**Đầu ra:** wallpaper library, filters, scene presets, audio mixer, focus timer, adaptive quality.

**Gate:** reduced motion, tab hidden, low-power mode, không memory leak sau đổi cảnh lặp.

## WS4 — Inbox, tasks, calendar, projects

**Đầu ra:** universal capture, task lifecycle, multi-view, reminders, project cockpit, goals, decision log.

**Gate:** offline create; recurring task semantics; no duplicate conversion; backup/restore tests.

## WS5 — Knowledge fabric & research desk

**Đầu ra:** notes, backlinks, graph, unified search, source library, claim/evidence board.

**Gate:** link integrity; citation targets correct; access filter applied to search; graph cap.

## WS6 — AI provider/router & mission control

**Đầu ra:** provider registry, context inspector, budgets, tool registry, mission state machine, approvals, verification gate.

**Gate:** permission-denied tool never runs; cancellation stops future tools; budget limit; source/evidence record.

## WS7 — Workflow engine

**Đầu ra:** graph editor, validator/compiler, versioned workflow, run timeline, retry/timeout/approval.

**Gate:** invalid cycle rejected; idempotency test; run version immutable; dry-run no side effect.

## WS8 — Developer Lab & safe execution

**Đầu ra:** JSON/diff/regex/hash/JWT tools, HTTP tester, SQL sandbox, JS sandbox, snippets.

**Gate:** hostile input fixtures; sandbox limits; no credential in browser logs; SQL isolation.

## WS9 — Creator Studio & Learning Lab

**Đầu ra:** content pipeline, source fact-check, assets, content calendar, flashcards, quiz, study planner.

**Gate:** AI claims labeled; external publishing approval; round-trip export; learning schedule invariants.

## WS10 — Backup, sync, privacy and security

**Đầu ra:** portable bundle, import staging, backup verify, data-flow inspector, conflict center, device list.

**Gate:** restore from real exported backup; concurrent edit conflict; local-only invariant; credential rotation scenario.

## WS11 — Plugin ecosystem & release hardening

**Đầu ra:** SDK v1, permission manager, sandbox, compatibility checks, signing/integrity strategy, crash management, docs.

**Gate:** malicious plugin fixtures blocked; permission escalation prompts; upgrade/rollback; app shell remains stable on plugin crash.

## WS12 — Optional backend/native integrations

**Đầu ra:** sync backend, push scheduler, browser companion, native bridge only if required by validated use cases.

**Gate:** threat review, auth/authorization tests, revocation, rate limits, protocol compatibility.

---

# 55. Feature Acceptance Templates

## 55.1. Template cho một feature

```markdown
### Feature ID: PWOS-<MODULE>-<NUMBER>
- User problem:
- Primary user:
- Preconditions:
- Entry points:
- Main flow:
- Alternate flows:
- Empty/loading/offline/error/conflict states:
- Data read:
- Data written:
- Events emitted:
- Commands exposed:
- Permissions required:
- Network/data flow:
- Undo/recovery behavior:
- Accessibility:
- Performance budget:
- Unit tests:
- Integration tests:
- E2E tests:
- Acceptance criteria:
- Explicit non-goals:
```

## 55.2. Acceptance criteria format

Mỗi tiêu chí nên quan sát và tự động hóa được khi khả thi. Ví dụ:

- **Given** Inbox item tồn tại ở trạng thái `inbox`, **when** người dùng chọn Convert to Task và xác nhận, **then** đúng một task được tạo, Inbox item có tham chiếu đến task và thao tác có thể truy vết.
- **Given** một mission chỉ được cấp quyền đọc, **when** planner yêu cầu `tasks.delete`, **then** runtime từ chối tool call và lưu `permission_denied` mà không thực thi side effect.
- **Given** người dùng import ZIP hỏng, **when** validate thất bại, **then** dữ liệu chính không thay đổi và import report chứa lỗi có thể hiểu được.

## 55.3. Definition of Done cấp module

- Mô tả hành vi và non-goals.
- Typed schema và validation.
- Loading/empty/error/offline states.
- Permission/data flow review.
- Unit/integration/E2E tests phù hợp.
- Keyboard/focus/accessibility checks.
- Performance profiling với dữ liệu đại diện.
- Export/backup impact review.
- Migration/rollback strategy khi schema đổi.
- Documentation và changelog.

---

# 56. Risk Register & Decision Gates

| Risk | Dấu hiệu | Biện pháp | Gate để tiếp tục |
|---|---|---|---|
| Scope phình quá nhanh | module dở dang, không có tests | ưu tiên core và module theo nhu cầu | WS có tiêu chí rõ |
| App nặng | initial bundle lớn, nhiều render | lazy loading, selector, resource budgets | bundle report trong CI |
| Lưu trữ không đáng tin | báo saved nhưng reload mất dữ liệu | commit state, durable adapter, recovery | persistence integration suite |
| AI hành động sai | tool không có approval hoặc retry mù | permission tier, idempotency, verification | adversarial tool tests |
| RAG dẫn sai | claim không trỏ về nguồn | source IDs, evidence board, citation checks | citation regression set |
| Plugin không an toàn | plugin truy cập store trực tiếp | sandbox, host API, scopes | malicious plugin test |
| Offline/sync conflict | ghi đè không báo | conflict center, tombstones | multi-device simulation |
| Bảo mật quá tự tin | tuyên bố AES = an toàn tuyệt đối | threat model, review độc lập | security sign-off |
| Web giả quyền native | nút “đặt wallpaper” không làm được | feature negotiation/native bridge | capability test trên nền hỗ trợ |
| Cloud cost tăng | agent loop hoặc embedding liên tục | budget caps, rate caps, opt-in | budget breach test |
| Import độc hại | path traversal/giải nén tràn bộ nhớ | staging, limits, parser hardening | malicious archive suite |
| UI không dùng được trên mobile | cửa sổ bị cắt, hover-only | responsive workspace mode | viewport matrix |

---

# 57. Release Channels & Version Governance

## 57.1. Channels

- `experimental`: tính năng có thể đổi schema/API; phải tắt mặc định nếu có rủi ro dữ liệu.
- `preview`: dùng được để thử nhưng còn hạn chế đã ghi rõ.
- `stable`: có migration, test, accessibility và recovery đã qua gate.
- `deprecated`: có đường di trú và ngày dự kiến xóa.

## 57.2. Semantic versioning nội bộ

- MAJOR: thay đổi contract không tương thích, migration lớn hoặc breaking API.
- MINOR: feature mới tương thích.
- PATCH: bug/security fix tương thích.
- Plugin API version quản lý riêng với version ứng dụng.

## 57.3. Release checklist

- Build clean từ môi trường mới.
- Không có secret trong bundle/source map/log.
- Unit/integration/E2E suite chạy và báo trạng thái trung thực.
- Kiểm tra backup/restore với dữ liệu đại diện.
- Migration được chạy thử trên bản copy dữ liệu.
- Có changelog, known issues, rollback plan.
- Không gắn nhãn feature `stable` nếu tiêu chí acceptance còn thiếu.

---

# 58. Bộ mặc định khuyến nghị cho bản triển khai đầu tiên

Để sản phẩm mạnh nhưng không sụp vì độ phức tạp, cấu hình mặc định nên là:

- Static/PWA trước; backend chỉ bật khi cần sync/account/scheduler.
- IndexedDB cho dữ liệu ứng dụng; adapter riêng cho asset lớn.
- Local-first capture và task/notes; AI hoàn toàn optional.
- Chỉ một AI mission run mặc định; concurrency có thể tăng khi đo hiệu năng.
- Approval required cho external side effects.
- Plugin disabled-by-default cho plugin không thuộc core.
- No remote telemetry by default.
- Secret vault local-only trừ khi có thiết kế sync mã hóa riêng đã kiểm thử.
- Graph/search indexing chạy nền, có thể tạm dừng.
- Low Power mode có thể dùng trên máy RAM thấp.
- Backup/export được làm trước các tính năng sync phức tạp.
- Mọi feature native có fallback rõ ràng.

---

# 59. Danh sách tính năng cấp cao bổ sung để đưa vào backlog

Đây là backlog có thể bật theo nhu cầu, không phải yêu cầu phải triển khai ngay:

### 59.1. Desktop & personalization

- Multi-monitor layout profile (trong giới hạn viewport mà trình duyệt cung cấp).
- Workspace snapshots và compare layout.
- Widget marketplace nội bộ có permission.
- Desktop icon groups và vùng bố cục.
- Theme editor có export/import tokens.
- Ambient scene composer với preset do người dùng tạo.
- Scheduled focus profile và auto-silence thông báo nội bộ.

### 59.2. Knowledge & research

- Knowledge graph theo project, topic, source hoặc thời gian.
- Duplicate-note detection có preview, không tự merge.
- Orphan-note review queue.
- Claim contradiction map.
- Citation completeness checker.
- Source freshness review.
- Saved research query và reading queue.
- Note templates, literature review template, RFC template và lab notebook.

### 59.3. Productivity

- Task dependencies và critical path cơ bản.
- Workload cap cho từng ngày.
- Reusable project templates.
- Meeting notes và action-item extraction có xác nhận.
- Weekly review wizard.
- Deadline risk report.
- Subscription renewal reminder và cost forecast do người dùng xác nhận.
- Personal time audit có opt-in, không giám sát ngầm.

### 59.4. AI & automation

- Multi-agent handoff và role-specific context.
- Mission templates theo loại công việc.
- Replay trace trong chế độ mô phỏng.
- Evaluations cho prompt/model routing.
- Tool call diff và policy explainability.
- Human-in-the-loop queue.
- Workflow template library.
- Quota dashboard theo provider/project/mission.
- Fail-safe stop và global AI kill switch.

### 59.5. Creator & learning

- Content pillar management.
- Campaign calendar và asset rights record.
- Hook/title variants và version comparison.
- Translation pipeline giữ glossary.
- Reading goals và study session log.
- Formula/definition cards.
- Error notebook cho bài tập.
- Exam readiness estimate có confidence/sample size.

### 59.6. Developer & operations

- HTTP request collections và environment variables được che mặc định.
- OpenAPI viewer/import.
- JSON Schema validator.
- Markdown link checker.
- Git diff viewer (chỉ qua connector được cấp quyền).
- Local logs viewer cho app/companion đã cấu hình.
- Feature flags và diagnostics export.
- Backup health reminder.

---

# 60. Final Product Contract — Không đánh đổi

Personal Web OS 5.0 chỉ có thể được xem là sản phẩm hoàn chỉnh khi các nguyên tắc sau được duy trì xuyên suốt:

1. **Tính năng thật, trạng thái thật:** không placeholder giả làm thao tác đã thành công.
2. **Dữ liệu thuộc về người dùng:** có export, backup, phục hồi và mô tả rõ dữ liệu không được xuất.
3. **AI theo quyền được cấp:** không tự biến gợi ý thành hành động có tác động bên ngoài.
4. **Nguồn gốc truy vết được:** câu trả lời research và thao tác automation có trace/evidence tương ứng.
5. **Lỗi không làm mất dữ liệu:** lỗi provider, plugin hoặc module không được kéo sập cả shell.
6. **Không phụ thuộc cloud để dùng lõi:** capture, notes, tasks và cấu hình cơ bản vẫn hoạt động theo capability của ứng dụng.
7. **Bảo mật có giới hạn rõ:** công bố threat model và giới hạn; không hứa “tuyệt đối”.
8. **Hiệu năng có đo:** mọi tuyên bố mượt/nhanh phải dựa trên benchmark tái lập.
9. **Mở rộng có hợp đồng:** plugin, command, event, workflow và connector có schema/version/permission.
10. **Roadmap qua cổng chất lượng:** chỉ mở phase tiếp theo khi phase hiện tại đã qua acceptance và recovery tests.

## Kết luận

Blueprint 5.0 biến Personal Web OS thành một nền tảng có thể phát triển theo module: một desktop ảo cá nhân, hệ điều hành năng suất, kho tri thức có bằng chứng, AI Mission Control, workflow engine, Content Studio, Learning Lab, Developer Lab, dữ liệu local-first và một nền tảng plugin có kiểm soát. Độ mạnh của sản phẩm không đến từ số lượng nút bấm, mà đến từ khả năng các module phối hợp với nhau mà vẫn giữ được dữ liệu, quyền riêng tư, khả năng khôi phục và trạng thái minh bạch.

**Trạng thái tài liệu:** đặc tả mục tiêu để triển khai và kiểm thử; không khẳng định mã nguồn hiện tại đã có các năng lực nêu trên. Trước khi thay đổi repository, phải thực hiện WS0 — audit code hiện có và lập bản đồ những gì đã chạy, đang dở, bị lỗi, còn thiếu.
