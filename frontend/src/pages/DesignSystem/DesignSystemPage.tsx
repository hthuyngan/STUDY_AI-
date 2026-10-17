import '@/styles/components.css'
import { SUBJECTS } from '@/data/subjects'
import { DSPreview, DSSection } from './DSHelpers'
import './DesignSystem.css'

// ── Color swatch helper ──────────────────────────────────────
function ColorSwatch({ label, value, textColor = '#fff' }: { label: string; value: string; textColor?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '80px' }}>
      <div
        style={{
          width: '100%',
          height: '60px',
          borderRadius: 'var(--radius-md)',
          background: value,
          border: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '6px 8px',
        }}
      >
        <span style={{ fontSize: '10px', color: textColor, fontFamily: 'var(--font-mono)', opacity: 0.85 }}>
          {value}
        </span>
      </div>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'var(--font-medium)' }}>
        {label}
      </span>
    </div>
  )
}

// ── Spacing block helper ──────────────────────────────────────
function SpacingBlock({ label, size, px }: { label: string; size: string; px: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{
        width: size,
        height: size,
        background: 'var(--brand-400)',
        borderRadius: 'var(--radius-xs)',
        flexShrink: 0,
        minWidth: '4px',
      }} />
      <div>
        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          {label}
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          {px}
        </div>
      </div>
    </div>
  )
}

// ── Progress bar component ───────────────────────────────────
function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${value}%`, background: color }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────
export default function DesignSystemPage() {
  return (
    <div className="ds-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="ds-header">
        <div className="ds-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="ds-logo">
              <span>🎓</span>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                AI Tutor Design System
              </h1>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Tokens · Components · Typography · Layout
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge badge-primary">v1.0</span>
            <span className="badge badge-success">Stable</span>
          </div>
        </div>
      </header>

      {/* ── Sidebar nav ─────────────────────────────────────── */}
      <div className="ds-layout">
        <nav className="ds-sidenav" aria-label="Design system navigation">
          {[
            { href: '#colors', label: '🎨 Colors' },
            { href: '#typography', label: '📝 Typography' },
            { href: '#spacing', label: '📏 Spacing' },
            { href: '#shadows', label: '🌑 Shadows & Radius' },
            { href: '#buttons', label: '🔘 Buttons' },
            { href: '#badges', label: '🏷️ Badges' },
            { href: '#cards', label: '🃏 Cards' },
            { href: '#inputs', label: '✏️ Inputs' },
            { href: '#progress', label: '📊 Progress' },
            { href: '#avatars', label: '👤 Avatars' },
            { href: '#subjects', label: '📚 Subjects' },
            { href: '#states', label: '💡 States' },
            { href: '#animations', label: '✨ Animations' },
          ].map((item) => (
            <a key={item.href} href={item.href} className="ds-sidenav-item">
              {item.label}
            </a>
          ))}
        </nav>

        {/* ── Content ─────────────────────────────────────────── */}
        <main className="ds-content">

          {/* ─── COLORS ───────────────────────────────────────── */}
          <section id="colors">
            <DSSection title="🎨 Color Palette" description="Hệ thống màu sắc — Brand, Semantic, Neutral">

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Brand */}
                <div>
                  <h3 className="ds-sub-title">Brand Blue</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.75rem' }}>
                    {[
                      { label: '50',  val: 'var(--brand-50)',  text: '#1e40af' },
                      { label: '100', val: 'var(--brand-100)', text: '#1e40af' },
                      { label: '200', val: 'var(--brand-200)', text: '#1e40af' },
                      { label: '300', val: 'var(--brand-300)', text: '#1e40af' },
                      { label: '400', val: 'var(--brand-400)', text: '#fff' },
                      { label: '500', val: 'var(--brand-500)', text: '#fff' },
                      { label: '600', val: 'var(--brand-600)', text: '#fff' },
                      { label: '700', val: 'var(--brand-700)', text: '#fff' },
                      { label: '800', val: 'var(--brand-800)', text: '#fff' },
                      { label: '900', val: 'var(--brand-900)', text: '#fff' },
                    ].map((c) => (
                      <ColorSwatch key={c.label} label={c.label} value={c.val} textColor={c.text} />
                    ))}
                  </div>
                </div>

                {/* Semantic */}
                <div>
                  <h3 className="ds-sub-title">Semantic Colors</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                    <ColorSwatch label="Primary" value="var(--color-primary)" />
                    <ColorSwatch label="Success" value="var(--color-success)" />
                    <ColorSwatch label="Warning" value="var(--color-warning)" />
                    <ColorSwatch label="Danger"  value="var(--color-danger)" />
                    <ColorSwatch label="Info"    value="var(--color-info)" />
                  </div>
                </div>

                {/* Semantic backgrounds */}
                <div>
                  <h3 className="ds-sub-title">Semantic Backgrounds</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                    <ColorSwatch label="Primary BG" value="var(--color-primary-bg)" textColor="#1d4ed8" />
                    <ColorSwatch label="Success BG" value="var(--color-success-bg)" textColor="#16a34a" />
                    <ColorSwatch label="Warning BG" value="var(--color-warning-bg)" textColor="#d97706" />
                    <ColorSwatch label="Danger BG"  value="var(--color-danger-bg)"  textColor="#dc2626" />
                    <ColorSwatch label="Info BG"    value="var(--color-info-bg)"    textColor="#0891b2" />
                  </div>
                </div>

                {/* Neutral */}
                <div>
                  <h3 className="ds-sub-title">Neutral Gray Scale</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.75rem' }}>
                    {[
                      { label: '0',   val: 'var(--neutral-0)',   text: '#334155' },
                      { label: '50',  val: 'var(--neutral-50)',  text: '#334155' },
                      { label: '100', val: 'var(--neutral-100)', text: '#334155' },
                      { label: '200', val: 'var(--neutral-200)', text: '#475569' },
                      { label: '300', val: 'var(--neutral-300)', text: '#475569' },
                      { label: '400', val: 'var(--neutral-400)', text: '#fff' },
                      { label: '500', val: 'var(--neutral-500)', text: '#fff' },
                      { label: '600', val: 'var(--neutral-600)', text: '#fff' },
                      { label: '700', val: 'var(--neutral-700)', text: '#fff' },
                      { label: '800', val: 'var(--neutral-800)', text: '#fff' },
                      { label: '900', val: 'var(--neutral-900)', text: '#fff' },
                      { label: '950', val: 'var(--neutral-950)', text: '#fff' },
                    ].map((c) => (
                      <ColorSwatch key={c.label} label={c.label} value={c.val} textColor={c.text} />
                    ))}
                  </div>
                </div>

                {/* Surface */}
                <div>
                  <h3 className="ds-sub-title">Surface & Text Tokens</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '0.75rem', fontWeight: 'var(--font-semibold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Surfaces</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {[
                          { label: '--surface-page',    val: 'surface-page' },
                          { label: '--surface-card',    val: 'surface-card' },
                          { label: '--surface-sunken',  val: 'surface-sunken' },
                          { label: '--surface-raised',  val: 'surface-raised' },
                        ].map((s) => (
                          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '24px', background: `var(--${s.val})`, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xs)' }} />
                            <code style={{ fontSize: 'var(--text-xs)' }}>{s.label}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '0.75rem', fontWeight: 'var(--font-semibold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Text Roles</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {[
                          { label: '--text-primary',   className: 'text-primary',   sample: 'Tiêu đề và nội dung chính' },
                          { label: '--text-secondary',  className: 'text-secondary', sample: 'Mô tả và nhãn phụ' },
                          { label: '--text-tertiary',   className: 'text-tertiary',  sample: 'Placeholder và hint' },
                          { label: '--text-disabled',   style: 'color: var(--text-disabled)', sample: 'Trạng thái disabled' },
                        ].map((t) => (
                          <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span className={t.className} style={t.style ? { color: 'var(--text-disabled)', fontSize: 'var(--text-sm)' } : { fontSize: 'var(--text-sm)' }}>{t.sample}</span>
                            <code style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{t.label}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </DSSection>
          </section>

          {/* ─── TYPOGRAPHY ───────────────────────────────────── */}
          <section id="typography">
            <DSSection title="📝 Typography" description="Inter font — scale từ 12px đến 36px">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: '--text-3xl  36px  Bold',    size: 'var(--text-3xl)',  weight: 'var(--font-bold)',     sample: 'Tiêu đề trang Dashboard' },
                  { label: '--text-2xl  24px  Semibold', size: 'var(--text-2xl)', weight: 'var(--font-semibold)', sample: 'Tiêu đề phần / Section heading' },
                  { label: '--text-xl   20px  Semibold', size: 'var(--text-xl)',  weight: 'var(--font-semibold)', sample: 'Tiêu đề card và widget' },
                  { label: '--text-lg   18px  Medium',   size: 'var(--text-lg)',  weight: 'var(--font-medium)',   sample: 'Label quan trọng, intro text' },
                  { label: '--text-base 16px  Normal',   size: 'var(--text-base)',weight: 'var(--font-normal)',   sample: 'Body text và nội dung chính' },
                  { label: '--text-sm   14px  Normal',   size: 'var(--text-sm)',  weight: 'var(--font-normal)',   sample: 'Label ô nhập, mô tả ngắn, nav item' },
                  { label: '--text-xs   12px  Medium',   size: 'var(--text-xs)',  weight: 'var(--font-medium)',   sample: 'Badge, hint, caption, meta info' },
                ].map((t) => (
                  <div key={t.label} style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: t.size, fontWeight: t.weight, color: 'var(--text-primary)', lineHeight: 1.25, flexShrink: 0, minWidth: '0', flex: '1' }}>
                      {t.sample}
                    </div>
                    <code style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {t.label}
                    </code>
                  </div>
                ))}
                <div style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <code style={{ fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                    JetBrains Mono — const data = &#123; type: 'mock' &#125;
                  </code>
                  <code style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>--font-mono</code>
                </div>
              </div>
            </DSSection>
          </section>

          {/* ─── SPACING ──────────────────────────────────────── */}
          <section id="spacing">
            <DSSection title="📏 Spacing Scale" description="8px grid — --space-1 đến --space-20">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                {[
                  { label: '--space-1',  size: '4px',  px: '4px' },
                  { label: '--space-2',  size: '8px',  px: '8px' },
                  { label: '--space-3',  size: '12px', px: '12px' },
                  { label: '--space-4',  size: '16px', px: '16px' },
                  { label: '--space-5',  size: '20px', px: '20px' },
                  { label: '--space-6',  size: '24px', px: '24px' },
                  { label: '--space-8',  size: '32px', px: '32px' },
                  { label: '--space-10', size: '40px', px: '40px' },
                  { label: '--space-12', size: '48px', px: '48px' },
                  { label: '--space-16', size: '64px', px: '64px' },
                ].map((s) => (
                  <SpacingBlock key={s.label} label={s.label} size={s.size} px={s.px} />
                ))}
              </div>
            </DSSection>
          </section>

          {/* ─── SHADOWS & RADIUS ─────────────────────────────── */}
          <section id="shadows">
            <DSSection title="🌑 Shadows & Border Radius">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* Shadows */}
                <div>
                  <h3 className="ds-sub-title">Shadows</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { label: '--shadow-xs', shadow: 'var(--shadow-xs)' },
                      { label: '--shadow-sm', shadow: 'var(--shadow-sm)' },
                      { label: '--shadow-md', shadow: 'var(--shadow-md)' },
                      { label: '--shadow-lg', shadow: 'var(--shadow-lg)' },
                      { label: '--shadow-xl', shadow: 'var(--shadow-xl)' },
                    ].map((s) => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '64px', height: '40px', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', boxShadow: s.shadow, flexShrink: 0 }} />
                        <code style={{ fontSize: 'var(--text-xs)' }}>{s.label}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Radius */}
                <div>
                  <h3 className="ds-sub-title">Border Radius</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      { label: '--radius-xs   4px',  val: 'var(--radius-xs)'   },
                      { label: '--radius-sm   6px',  val: 'var(--radius-sm)'   },
                      { label: '--radius-md   8px',  val: 'var(--radius-md)'   },
                      { label: '--radius-lg   12px', val: 'var(--radius-lg)'   },
                      { label: '--radius-xl   16px', val: 'var(--radius-xl)'   },
                      { label: '--radius-2xl  20px', val: 'var(--radius-2xl)'  },
                      { label: '--radius-full ∞',    val: 'var(--radius-full)' },
                    ].map((r) => (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '48px', height: '32px', background: 'var(--color-primary-bg)', border: '1px solid var(--border-default)', borderRadius: r.val, flexShrink: 0 }} />
                        <code style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.label}</code>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </DSSection>
          </section>

          {/* ─── BUTTONS ──────────────────────────────────────── */}
          <section id="buttons">
            <DSSection title="🔘 Buttons" description="4 variants × 3 sizes + icon button">

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <DSPreview label="Variants">
                  <button className="btn btn-primary">Học ngay</button>
                  <button className="btn btn-secondary">Xem chi tiết</button>
                  <button className="btn btn-ghost">Hủy</button>
                  <button className="btn btn-danger">Xóa</button>
                </DSPreview>

                <DSPreview label="Sizes">
                  <button className="btn btn-primary btn-sm">Nhỏ (SM)</button>
                  <button className="btn btn-primary">Vừa (MD)</button>
                  <button className="btn btn-primary btn-lg">Lớn (LG)</button>
                </DSPreview>

                <DSPreview label="Disabled states">
                  <button className="btn btn-primary" disabled>Học ngay</button>
                  <button className="btn btn-secondary" disabled>Xem chi tiết</button>
                  <button className="btn btn-ghost" disabled>Hủy</button>
                </DSPreview>

                <DSPreview label="Icon buttons">
                  <button className="btn btn-primary btn-icon btn-sm" aria-label="Thêm">＋</button>
                  <button className="btn btn-secondary btn-icon" aria-label="Cài đặt">⚙️</button>
                  <button className="btn btn-ghost btn-icon" aria-label="Thông báo">🔔</button>
                </DSPreview>

              </div>
            </DSSection>
          </section>

          {/* ─── BADGES ───────────────────────────────────────── */}
          <section id="badges">
            <DSSection title="🏷️ Badges" description="6 variants cho semantic states">
              <DSPreview label="All badge variants">
                <span className="badge badge-default">Mặc định</span>
                <span className="badge badge-primary">Đang học</span>
                <span className="badge badge-success">Hoàn thành</span>
                <span className="badge badge-warning">Cần ôn tập</span>
                <span className="badge badge-danger">Khó</span>
                <span className="badge badge-info">Mới</span>
              </DSPreview>

              <div style={{ marginTop: '1rem' }}>
                <DSPreview label="Lesson status badges">
                  <span className="badge badge-success">✅ Đã học</span>
                  <span className="badge badge-primary">▶️ Đang học</span>
                  <span className="badge badge-default">📋 Sẵn sàng</span>
                  <span className="badge badge-default" style={{ opacity: 0.5 }}>🔒 Chưa mở</span>
                </DSPreview>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <DSPreview label="Difficulty badges">
                  <span className="badge badge-success">Dễ</span>
                  <span className="badge badge-warning">Trung bình</span>
                  <span className="badge badge-danger">Khó</span>
                </DSPreview>
              </div>
            </DSSection>
          </section>

          {/* ─── CARDS ────────────────────────────────────────── */}
          <section id="cards">
            <DSSection title="🃏 Cards" description="3 sizes + hoverable variant">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>

                <div className="card card-sm">
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Tiến độ hôm nay</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>35 phút</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', marginTop: '0.25rem' }}>↑ +12% vs hôm qua</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>card-sm</div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Streak hiện tại</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-warning)' }}>🔥 7 ngày</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Kỷ lục: 14 ngày</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>card (default)</div>
                </div>

                <div className="card card-lg">
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>Điểm trung bình</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>7.9 / 10</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Toán, Lý, Hóa, Anh...</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>card-lg</div>
                </div>

              </div>

              <div style={{ marginTop: '1rem' }}>
                <div className="card card-hoverable" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '2rem' }}>📐</div>
                  <div>
                    <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Hàm số bậc hai – Đồ thị parabol</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Vẽ đồ thị, xác định trục đối xứng và đỉnh parabol</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span className="badge badge-danger">Khó</span>
                  </div>
                </div>
              </div>
            </DSSection>
          </section>

          {/* ─── INPUTS ───────────────────────────────────────── */}
          <section id="inputs">
            <DSSection title="✏️ Form Inputs" description="States: default, focus, error, disabled">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', maxWidth: '600px' }}>
                <div>
                  <label className="label" htmlFor="demo-default">Tìm kiếm bài học</label>
                  <input id="demo-default" className="input" type="text" placeholder="Nhập tên bài học..." />
                </div>
                <div>
                  <label className="label" htmlFor="demo-error">Mật khẩu <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <input id="demo-error" className="input input-error" type="password" placeholder="Nhập mật khẩu" />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginTop: '0.25rem' }}>Mật khẩu phải có ít nhất 8 ký tự</p>
                </div>
                <div>
                  <label className="label" htmlFor="demo-disabled">Tên đăng nhập</label>
                  <input id="demo-disabled" className="input" type="text" value="minh.anh.nguyen" disabled readOnly />
                </div>
                <div>
                  <label className="label" htmlFor="demo-select">Chọn môn học</label>
                  <select id="demo-select" className="input" style={{ cursor: 'pointer' }}>
                    <option>Toán học 10</option>
                    <option>Ngữ văn 10</option>
                    <option>Tiếng Anh 10</option>
                  </select>
                </div>
              </div>
            </DSSection>
          </section>

          {/* ─── PROGRESS ─────────────────────────────────────── */}
          <section id="progress">
            <DSSection title="📊 Progress Bars" description="Sizes + subject-colored variants">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Mục tiêu ngày (progress-bar)</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>58%</span>
                  </div>
                  <ProgressBar value={58} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>progress-bar-sm</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>74%</span>
                  </div>
                  <div className="progress-bar progress-bar-sm">
                    <div className="progress-bar-fill" style={{ width: '74%', background: 'var(--subject-english-color)' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>progress-bar-lg</span>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>45%</span>
                  </div>
                  <div className="progress-bar progress-bar-lg">
                    <div className="progress-bar-fill" style={{ width: '45%', background: 'var(--subject-physics-color)' }} />
                  </div>
                </div>

                {/* Subject progress list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {[
                    { label: 'Toán học 10',    val: 68, color: 'var(--subject-math-color)' },
                    { label: 'Ngữ văn 10',     val: 52, color: 'var(--subject-literature-color)' },
                    { label: 'Tiếng Anh 10',   val: 74, color: 'var(--subject-english-color)' },
                    { label: 'Vật lý 10',      val: 45, color: 'var(--subject-physics-color)' },
                    { label: 'Hóa học 10',     val: 61, color: 'var(--subject-chemistry-color)' },
                    { label: 'Sinh học 10',    val: 57, color: 'var(--subject-biology-color)' },
                  ].map((s) => (
                    <div key={s.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{s.label}</span>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{s.val}%</span>
                      </div>
                      <ProgressBar value={s.val} color={s.color} />
                    </div>
                  ))}
                </div>

              </div>
            </DSSection>
          </section>

          {/* ─── AVATARS ──────────────────────────────────────── */}
          <section id="avatars">
            <DSSection title="👤 Avatars" description="5 sizes + image / initials fallback">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <DSPreview label="Avatar sizes — image">
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" className="avatar avatar-xs"  alt="Nguyễn Minh Anh" />
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" className="avatar avatar-sm"  alt="Nguyễn Minh Anh" />
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" className="avatar avatar-md"  alt="Nguyễn Minh Anh" />
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" className="avatar avatar-lg"  alt="Nguyễn Minh Anh" />
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" className="avatar avatar-xl"  alt="Nguyễn Minh Anh" />
                  <img src="https://randomuser.me/api/portraits/women/44.jpg" className="avatar avatar-2xl" alt="Nguyễn Minh Anh" />
                </DSPreview>

                <DSPreview label="Avatar initials fallback">
                  <span className="avatar avatar-sm"  aria-label="Nguyễn Minh Anh">NM</span>
                  <span className="avatar avatar-md"  aria-label="Trần Quốc Bảo" style={{ background: 'var(--subject-math-color)' }}>TQ</span>
                  <span className="avatar avatar-lg"  aria-label="Lê Hoàng Minh" style={{ background: 'var(--subject-chemistry-color)' }}>LH</span>
                  <span className="avatar avatar-xl"  aria-label="Phạm Thị Mai"  style={{ background: 'var(--subject-literature-color)' }}>PT</span>
                </DSPreview>

              </div>
            </DSSection>
          </section>

          {/* ─── SUBJECTS ─────────────────────────────────────── */}
          <section id="subjects">
            <DSSection title="📚 Subject Colors" description="Mỗi môn học có token màu riêng">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {SUBJECTS.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      background: `var(--subject-${sub.id}-bg)`,
                      border: `1px solid var(--subject-${sub.id}-color)`,
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-4)',
                      opacity: 0.9,
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{sub.icon}</div>
                    <div style={{ fontWeight: 'var(--font-semibold)', color: `var(--subject-${sub.id}-color)`, fontSize: 'var(--text-sm)' }}>
                      {sub.name}
                    </div>
                    <code style={{ fontSize: '10px', color: `var(--subject-${sub.id}-color)`, opacity: 0.7, display: 'block', marginTop: '0.25rem' }}>
                      --subject-{sub.id}-color
                    </code>
                  </div>
                ))}
              </div>
            </DSSection>
          </section>

          {/* ─── STATES ───────────────────────────────────────── */}
          <section id="states">
            <DSSection title="💡 UI States" description="Empty state, loading skeleton, chips">

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <DSPreview label="Empty state">
                  <div className="empty-state" style={{ width: '100%' }}>
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-title">Chưa có bài tập nào</div>
                    <div className="empty-state-desc">Bắt đầu học một bài mới để bài tập xuất hiện ở đây.</div>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}>Bắt đầu học</button>
                  </div>
                </DSPreview>

                <DSPreview label="Loading skeleton">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-full)', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="skeleton" style={{ height: '14px', width: '60%' }} />
                        <div className="skeleton" style={{ height: '12px', width: '40%' }} />
                      </div>
                    </div>
                    <div className="skeleton" style={{ height: '80px', width: '100%' }} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div className="skeleton" style={{ height: '32px', flex: 1 }} />
                      <div className="skeleton" style={{ height: '32px', flex: 1 }} />
                      <div className="skeleton" style={{ height: '32px', flex: 1 }} />
                    </div>
                  </div>
                </DSPreview>

                <DSPreview label="Chip / Filter tags">
                  <span className="chip chip-active">Tất cả</span>
                  <span className="chip">Toán</span>
                  <span className="chip">Ngữ văn</span>
                  <span className="chip">Tiếng Anh</span>
                  <span className="chip">Vật lý</span>
                </DSPreview>

                <DSPreview label="Stat cards">
                  {[
                    { label: 'Streak hiện tại',   value: '🔥 7 ngày',  desc: 'Kỷ lục: 14 ngày'    },
                    { label: 'Đã học hôm nay',     value: '35 phút',   desc: 'Mục tiêu: 60 phút'   },
                    { label: 'Bài học hoàn thành', value: '22 bài',    desc: 'Tuần này: 8 bài'     },
                  ].map((s) => (
                    <div key={s.label} className="stat-card" style={{ minWidth: '160px' }}>
                      <div className="stat-card-label">{s.label}</div>
                      <div className="stat-card-value" style={{ fontSize: 'var(--text-xl)' }}>{s.value}</div>
                      <div className="stat-card-desc">{s.desc}</div>
                    </div>
                  ))}
                </DSPreview>

              </div>
            </DSSection>
          </section>

          {/* ─── ANIMATIONS ───────────────────────────────────── */}
          <section id="animations">
            <DSSection title="✨ Animations & Transitions" description="Micro-animations nhẹ cho UX tốt">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div className="card animate-fadeIn" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⬆️</div>
                    <code style={{ fontSize: 'var(--text-xs)' }}>animate-fadeIn</code>
                  </div>
                  <div className="card animate-slideIn" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>➡️</div>
                    <code style={{ fontSize: 'var(--text-xs)' }}>animate-slideIn</code>
                  </div>
                  <div className="card" style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                    <div className="animate-spin" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'inline-block' }}>⟳</div>
                    <br />
                    <code style={{ fontSize: 'var(--text-xs)' }}>animate-spin</code>
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <strong>Transition tokens:</strong>
                  &nbsp;&nbsp;<code>--duration-fast: 100ms</code>
                  &nbsp;&nbsp;<code>--duration-base: 150ms</code>
                  &nbsp;&nbsp;<code>--duration-slow: 300ms</code>
                  &nbsp;&nbsp;<code>--ease-default</code>
                  &nbsp;&nbsp;<code>--ease-bounce</code>
                </div>
              </div>
            </DSSection>
          </section>

        </main>
      </div>
    </div>
  )
}
