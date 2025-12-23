import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const HomePage = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display antialiased text-text-main dark:text-text-main-dark transition-colors duration-200">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur supports-[backdrop-filter]:bg-surface-light/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-3xl">ophthalmology</span>
            </div>
            <span className="text-xl font-black tracking-tight text-primary dark:text-primary">AURA</span>
          </div>
          <nav className="hidden md:flex flex-1 justify-center gap-8">
            <a className="text-sm font-medium hover:text-primary transition-colors" href="#features">
              Giới thiệu
            </a>
            <a className="text-sm font-medium hover:text-primary transition-colors" href="#services">
              Dịch vụ
            </a>
            <a className="text-sm font-medium hover:text-primary transition-colors" href="#">
              Tin tức
            </a>
            <a className="text-sm font-medium hover:text-primary transition-colors" href="#contact">
              Liên hệ
            </a>
          </nav>
          <div className="flex gap-3">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="hidden sm:flex h-9 items-center justify-center rounded-lg px-4 text-sm font-semibold text-text-muted hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors"
                >
                  Đăng ký ngay
                </Link>
              </>
            ) : (
              <Link
                to="/dashboard"
                className="flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm hover:bg-primary-dark transition-colors"
              >
                Vào Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-12 md:py-20 lg:py-24 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
              <div className="flex flex-col gap-6 text-left">
                <div className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-300">
                  <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                  Công nghệ AI Tiên tiến 2.0
                </div>
                <h1 className="text-4xl font-black leading-tight tracking-tight text-text-main dark:text-white sm:text-5xl lg:text-6xl">
                  Hệ thống Sàng lọc <br />
                  <span className="text-primary">Mạch máu Võng mạc</span>
                </h1>
                <p className="text-lg text-text-muted dark:text-text-muted-dark max-w-xl">
                  AURA sử dụng trí tuệ nhân tạo để phân tích hình ảnh đáy mắt, hỗ trợ bác sĩ đưa ra quyết định lâm sàng chính xác và phát hiện sớm các nguy cơ bệnh lý.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  {!isAuthenticated ? (
                    <>
                      <Link
                        to="/register"
                        className="h-12 px-8 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                        Bắt đầu ngay
                      </Link>
                      <button className="h-12 px-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-surface-light dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-slate-800 text-text-main dark:text-white font-semibold transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">play_circle</span>
                        Xem demo
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/dashboard"
                      className="h-12 px-8 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                      Vào Dashboard
                    </Link>
                  )}
                </div>
              </div>
              <div className="relative lg:h-auto w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-800 group">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent mix-blend-overlay z-10"></div>
                <div
                  className="w-full h-full bg-center bg-cover transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDwfM5JIszE-aubQTNwoB2BDwLjHkcVFC0cAsNWrjrWChoCH5wJo2XlrTFFl8vcSjCNJ0mIeT3mtsQJdoyjJNPPUx5_Q4FocnkkOv_dQ1dYx_HAC299xnH03oqM0_X_N_nu0aDHaBSMS1BCE3FGp_vXsYR_x30oAYvtBBsSWHtqC5zQE6mBbXxjbxnAa7Sj7Ty1HfpO1nK4OyA4TxBN_l8FDMYqox_x95caNiObqAwJj3c3NUtJXZFt5jarS-Dc46s3hJncUONz_YI')",
                  }}
                ></div>
                {/* Floating Card Overlay */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-20 hidden sm:block">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                      <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main dark:text-white">Phân tích hoàn tất</p>
                      <p className="text-xs text-text-muted dark:text-text-muted-dark">Độ chính xác chẩn đoán đạt 98.5%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Access Portals Section */}
        <section id="services" className="py-16 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-text-main dark:text-white sm:text-3xl">
                Chọn cổng truy cập
              </h2>
              <p className="mt-4 text-text-muted dark:text-text-muted-dark">
                Hãy chọn vai trò phù hợp để đăng nhập vào hệ thống AURA
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Patient Card */}
              <Link
                to="/login"
                className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-background-light dark:bg-surface-dark p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-text-main dark:text-white group-hover:text-primary transition-colors">
                    Bệnh nhân
                  </h3>
                  <p className="text-sm text-text-muted dark:text-text-muted-dark">
                    Theo dõi hồ sơ sức khỏe mắt cá nhân, nhận kết quả sàng lọc và đặt lịch hẹn với bác sĩ chuyên khoa.
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-primary">
                  Truy cập ngay{' '}
                  <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </Link>

              {/* Doctor Card */}
              <Link
                to="/login"
                className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-background-light dark:bg-surface-dark p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">stethoscope</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-text-main dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Bác sĩ
                  </h3>
                  <p className="text-sm text-text-muted dark:text-text-muted-dark">
                    Công cụ hỗ trợ chẩn đoán nâng cao, quản lý danh sách bệnh nhân và xem báo cáo phân tích AI chi tiết.
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Vào trang bác sĩ{' '}
                  <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </Link>

              {/* Management Card */}
              <Link
                to="/login"
                className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-background-light dark:bg-surface-dark p-6 transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">domain</span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-text-main dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Quản trị Phòng khám
                  </h3>
                  <p className="text-sm text-text-muted dark:text-text-muted-dark">
                    Quản lý hệ thống nhân sự, thống kê hoạt động phòng khám và cấu hình thông số hệ thống AURA.
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
                  Quản lý hệ thống{' '}
                  <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
              <div className="flex flex-col gap-6 lg:w-1/3 lg:sticky lg:top-24">
                <h2 className="text-3xl font-black tracking-tight text-text-main dark:text-white sm:text-4xl">
                  Tại sao chọn <span className="text-primary">AURA</span>?
                </h2>
                <p className="text-base text-text-muted dark:text-text-muted-dark leading-relaxed">
                  Giải pháp công nghệ y tế tiên tiến mang lại lợi ích thiết thực cho cộng đồng và đội ngũ y bác sĩ, giúp nâng cao chất lượng chăm sóc sức khỏe thị lực.
                </p>
                <div className="hidden lg:block">
                  <button className="rounded-lg bg-slate-900 dark:bg-white px-5 py-3 text-sm font-bold text-white dark:text-slate-900 hover:opacity-90 transition-opacity">
                    Tìm hiểu thêm về công nghệ
                  </button>
                </div>
              </div>
              <div className="grid flex-1 gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {/* Feature 1 */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">visibility</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white">Phát hiện sớm</h3>
                    <p className="mt-2 text-sm text-text-muted dark:text-text-muted-dark leading-relaxed">
                      Nhận diện các dấu hiệu vi mô của bệnh lý mạch máu võng mạc trước khi triệu chứng lâm sàng xuất hiện, giúp can thiệp kịp thời.
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white">Hỗ trợ AI Chính xác</h3>
                    <p className="mt-2 text-sm text-text-muted dark:text-text-muted-dark leading-relaxed">
                      Thuật toán Deep Learning được huấn luyện trên hàng triệu dữ liệu hình ảnh, hỗ trợ bác sĩ đưa ra quyết định nhanh chóng với độ tin cậy cao.
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">cloud_sync</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white">Tiếp cận dễ dàng</h3>
                    <p className="mt-2 text-sm text-text-muted dark:text-text-muted-dark leading-relaxed">
                      Truy cập kết quả và hồ sơ sức khỏe trực tuyến an toàn, mọi lúc mọi nơi thông qua nền tảng đám mây bảo mật.
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined">security</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white">Bảo mật tuyệt đối</h3>
                    <p className="mt-2 text-sm text-text-muted dark:text-text-muted-dark leading-relaxed">
                      Dữ liệu bệnh nhân được mã hóa và bảo vệ theo các tiêu chuẩn y tế quốc tế nghiêm ngặt nhất.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contact" className="bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800 pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center rounded bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-sm">ophthalmology</span>
                </div>
                <span className="text-lg font-black text-text-main dark:text-white">AURA</span>
              </div>
              <p className="text-sm text-text-muted dark:text-text-muted-dark max-w-xs">
                Hệ thống tiên phong trong ứng dụng AI vào chẩn đoán hình ảnh y khoa, mang lại đôi mắt sáng khỏe cho cộng đồng.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-text-main dark:text-white mb-4">Liên kết</h4>
              <ul className="space-y-2 text-sm text-text-muted dark:text-text-muted-dark">
                <li>
                  <a className="hover:text-primary" href="#">
                    Về chúng tôi
                  </a>
                </li>
                <li>
                  <a className="hover:text-primary" href="#services">
                    Dịch vụ & Giải pháp
                  </a>
                </li>
                <li>
                  <a className="hover:text-primary" href="#">
                    Đội ngũ chuyên gia
                  </a>
                </li>
                <li>
                  <a className="hover:text-primary" href="#">
                    Tuyển dụng
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-text-main dark:text-white mb-4">Hỗ trợ</h4>
              <ul className="space-y-2 text-sm text-text-muted dark:text-text-muted-dark">
                <li>
                  <a className="hover:text-primary" href="#">
                    Trung tâm trợ giúp
                  </a>
                </li>
                <li>
                  <a className="hover:text-primary" href="#">
                    Điều khoản sử dụng
                  </a>
                </li>
                <li>
                  <a className="hover:text-primary" href="#">
                    Chính sách bảo mật
                  </a>
                </li>
                <li>
                  <a className="hover:text-primary" href="#contact">
                    Liên hệ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-text-main dark:text-white mb-4">Đăng ký nhận tin</h4>
              <div className="flex gap-2">
                <input
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none dark:bg-slate-800/50"
                  placeholder="Email của bạn"
                  type="email"
                />
                <button className="h-10 w-10 shrink-0 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors">
                  <span className="material-symbols-outlined text-xl">send</span>
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">© 2023 AURA Health Systems. All rights reserved.</p>
            <div className="flex gap-4 text-slate-400">
              <a className="hover:text-primary transition-colors" href="#">
                <span className="sr-only">Facebook</span>FB
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                <span className="sr-only">Twitter</span>TW
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                <span className="sr-only">LinkedIn</span>LI
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

