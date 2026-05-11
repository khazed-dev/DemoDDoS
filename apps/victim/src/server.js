const express = require("express");
const os = require("os");
const config = require("./config");
const { appendJsonLine } = require("./logger");
const { createMetricsStore } = require("./metrics");

const app = express();
const metrics = createMetricsStore();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function busyLoopForMs(durationMs) {
  const deadline = Date.now() + durationMs;
  let accumulator = 0;

  while (Date.now() < deadline) {
    for (let i = 0; i < 2000; i += 1) {
      accumulator += Math.sqrt((i + 1) * Math.random());
    }
  }

  return Number(accumulator.toFixed(2));
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
}

app.set("trust proxy", true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const startNs = process.hrtime.bigint();
  const startedAt = new Date().toISOString();
  const clientIp = getClientIp(req);

  metrics.inflightRequests += 1;
  metrics.totalRequests += 1;
  metrics.lastRequestAt = startedAt;

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    metrics.inflightRequests = Math.max(0, metrics.inflightRequests - 1);
    metrics.completedRequests += 1;

    if (durationMs >= 1000) {
      metrics.slowRequests += 1;
    }

    if (res.statusCode >= 500) {
      metrics.overloadResponses += 1;
    }

    const payload = {
      ts: startedAt,
      method: req.method,
      path: req.originalUrl,
      route: req.path,
      ip: clientIp,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      inflightAtFinish: metrics.inflightRequests,
      userAgent: req.headers["user-agent"] || "unknown"
    };

    appendJsonLine(config.metricsFile, payload);
    appendJsonLine(config.accessFile, payload);
  });

  next();
});

app.get("/", (req, res) => {
  const html = `<!doctype html>
  <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${config.publicName}</title>
      <style>
        :root {
          color-scheme: light;
          --bg: #f6f8fc;
          --bg-soft: #eef4ff;
          --panel: rgba(255, 255, 255, 0.78);
          --panel-strong: #ffffff;
          --text: #10213d;
          --muted: #5f6f8d;
          --line: rgba(143, 167, 203, 0.32);
          --primary: #0f6fff;
          --primary-deep: #0c4fc0;
          --accent: #29c3a7;
          --shadow: 0 24px 60px rgba(26, 63, 125, 0.14);
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body {
          margin: 0;
          font-family: "Space Grotesk", "Segoe UI", sans-serif;
          color: var(--text);
          background:
            radial-gradient(circle at top left, rgba(79, 141, 255, 0.16), transparent 34%),
            radial-gradient(circle at top right, rgba(41, 195, 167, 0.16), transparent 28%),
            linear-gradient(180deg, #f9fbff 0%, var(--bg) 58%, #eef3fb 100%);
        }
        a { color: inherit; text-decoration: none; }
        main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 24px 0 72px; }
        .shell {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.52);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
          border-radius: 32px;
        }
        .shell::before,
        .shell::after {
          content: "";
          position: absolute;
          border-radius: 999px;
          filter: blur(8px);
          opacity: 0.72;
        }
        .shell::before {
          width: 220px;
          height: 220px;
          background: rgba(79, 141, 255, 0.18);
          top: -80px;
          right: -30px;
        }
        .shell::after {
          width: 180px;
          height: 180px;
          background: rgba(41, 195, 167, 0.16);
          bottom: 120px;
          left: -60px;
        }
        .nav,
        .hero,
        .section,
        .footer {
          position: relative;
          z-index: 1;
          padding-left: 40px;
          padding-right: 40px;
        }
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding-top: 28px;
          padding-bottom: 24px;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .brand-mark {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(135deg, var(--primary), #5e8cff);
          box-shadow: 0 14px 34px rgba(15, 111, 255, 0.28);
        }
        .nav-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 16px;
          color: var(--muted);
          font-size: 0.96rem;
        }
        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
          gap: 28px;
          align-items: center;
          padding-top: 28px;
          padding-bottom: 40px;
        }
        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(15, 111, 255, 0.1);
          color: var(--primary-deep);
          font-size: 0.94rem;
          font-weight: 600;
        }
        h1 {
          margin: 20px 0 16px;
          font-size: clamp(2.7rem, 5vw, 4.8rem);
          line-height: 1.03;
          letter-spacing: -0.04em;
        }
        .hero p {
          margin: 0 0 22px;
          max-width: 640px;
          color: var(--muted);
          font-size: 1.05rem;
          line-height: 1.75;
        }
        .cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 24px;
        }
        .button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 22px;
          border-radius: 999px;
          border: 1px solid transparent;
          font-weight: 700;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .button:hover { transform: translateY(-1px); }
        .button.primary {
          color: white;
          background: linear-gradient(135deg, var(--primary), #4a8dff);
          box-shadow: 0 16px 32px rgba(15, 111, 255, 0.22);
        }
        .button.secondary {
          background: rgba(255, 255, 255, 0.84);
          border-color: rgba(15, 111, 255, 0.16);
          color: var(--primary-deep);
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .stat-card,
        .card,
        .roadmap-card,
        .lab-card {
          border: 1px solid var(--line);
          background: var(--panel);
          border-radius: 24px;
          box-shadow: 0 18px 42px rgba(31, 66, 128, 0.08);
          backdrop-filter: blur(18px);
        }
        .stat-card {
          padding: 18px 18px 20px;
        }
        .stat-value {
          font-size: 1.65rem;
          font-weight: 700;
          letter-spacing: -0.03em;
        }
        .stat-label {
          margin-top: 8px;
          color: var(--muted);
          line-height: 1.5;
          font-size: 0.94rem;
        }
        .hero-side {
          padding: 24px;
        }
        .hero-side h2 {
          margin: 0;
          font-size: 1.35rem;
        }
        .hero-side p {
          margin-top: 12px;
          margin-bottom: 20px;
          font-size: 0.98rem;
        }
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 22px;
        }
        .tag {
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(15, 111, 255, 0.08);
          color: var(--primary-deep);
          font-size: 0.9rem;
          font-weight: 600;
        }
        .meta-grid {
          display: grid;
          gap: 12px;
        }
        .meta-item {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 0;
          border-top: 1px solid rgba(143, 167, 203, 0.22);
        }
        .meta-item:first-child { border-top: 0; padding-top: 0; }
        .meta-label {
          font-size: 0.9rem;
          color: var(--muted);
        }
        .meta-value {
          font-weight: 700;
          text-align: right;
        }
        .section {
          padding-top: 12px;
          padding-bottom: 14px;
        }
        .section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
        }
        .section-head h2 {
          margin: 0 0 8px;
          font-size: clamp(1.8rem, 3vw, 2.4rem);
          letter-spacing: -0.04em;
        }
        .section-head p {
          margin: 0;
          color: var(--muted);
          max-width: 620px;
          line-height: 1.7;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .card {
          padding: 24px;
        }
        .card-kicker {
          display: inline-flex;
          margin-bottom: 14px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(41, 195, 167, 0.12);
          color: #128d78;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .card h3,
        .roadmap-card h3,
        .lab-card h3 {
          margin: 0 0 12px;
          font-size: 1.22rem;
        }
        .card p,
        .roadmap-card p,
        .lab-card p,
        .footnote {
          margin: 0;
          color: var(--muted);
          line-height: 1.72;
        }
        .roadmap {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .roadmap-card {
          padding: 24px;
        }
        .roadmap-step {
          display: inline-flex;
          width: 38px;
          height: 38px;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          margin-bottom: 16px;
          background: rgba(15, 111, 255, 0.1);
          color: var(--primary-deep);
          font-weight: 800;
        }
        .labs {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 16px;
        }
        .lab-card {
          padding: 26px;
        }
        .lab-list {
          margin: 18px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 12px;
        }
        .lab-list li {
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(15, 111, 255, 0.05);
          color: var(--text);
        }
        .resource-links {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }
        .resource-links a {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(143, 167, 203, 0.24);
        }
        .footer {
          padding-top: 18px;
          padding-bottom: 34px;
        }
        .footer-inner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-top: 24px;
          border-top: 1px solid rgba(143, 167, 203, 0.22);
        }
        .route-links {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: var(--muted);
          font-size: 0.92rem;
        }
        .route-links code {
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(15, 111, 255, 0.08);
          color: var(--primary-deep);
        }
        @media (max-width: 960px) {
          .hero,
          .labs,
          .grid-3,
          .roadmap,
          .stats {
            grid-template-columns: 1fr;
          }
          .section-head,
          .nav,
          .footer-inner {
            align-items: flex-start;
          }
        }
        @media (max-width: 720px) {
          .nav,
          .hero,
          .section,
          .footer {
            padding-left: 22px;
            padding-right: 22px;
          }
          main { width: min(100% - 16px, 1120px); padding-top: 8px; padding-bottom: 32px; }
          .shell { border-radius: 24px; }
          h1 { font-size: 2.5rem; }
          .hero p { font-size: 1rem; }
        }
      </style>
    </head>
    <body>
      <main>
        <div class="shell">
          <header class="nav">
            <div class="brand">
              <span class="brand-mark">S</span>
              <span>${config.publicName}</span>
            </div>
            <nav class="nav-links">
              <a href="#courses">Khoa hoc</a>
              <a href="#roadmap">Lo trinh</a>
              <a href="#labs">Cyber Lab</a>
              <a href="/dashboard">Dashboard</a>
            </nav>
          </header>

          <section class="hero">
            <div>
              <span class="eyebrow">Hoc vien dao tao an toan thong tin thuc chien</span>
              <h1>Hoc bao mat web theo cach de hieu, dung quy trinh va san sang di lam.</h1>
              <p>
                ${config.publicName} la landing page mo phong cho mot trung tam hoc cyber security
                voi lo trinh sang ro, bai lab thuc hanh va dashboard danh cho giang vien theo doi
                suc khoe he thong trong cac buoi demo.
              </p>
              <div class="cta-row">
                <a class="button primary" href="#roadmap">Xem lo trinh hoc</a>
                <a class="button secondary" href="#labs">Mo phong cyber lab</a>
              </div>
              <div class="stats">
                <div class="stat-card">
                  <div class="stat-value">12+ hoc phan</div>
                  <div class="stat-label">Tu nen tang mang, Linux, web security den blue-team co ban.</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">Lab theo tinh huong</div>
                  <div class="stat-label">Hoc vien duoc thuc hanh voi log, monitoring va phan tich luu luong.</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">Mentor sat sao</div>
                  <div class="stat-label">Review bai, giai thich tung buoc va huong dan cach trinh bay bao cao.</div>
                </div>
              </div>
            </div>

            <aside class="hero-side stat-card">
              <h2>Khoi hoc pho bien</h2>
              <p>Thiet ke de sinh vien CNTT, intern SOC va nguoi moi vao nganh co the theo kip tuan dau tien.</p>
              <div class="tag-list">
                <span class="tag">Web Security</span>
                <span class="tag">SOC Basics</span>
                <span class="tag">Traffic Analysis</span>
                <span class="tag">Incident Drill</span>
              </div>
              <div class="meta-grid">
                <div class="meta-item">
                  <div>
                    <div class="meta-label">Lich hoc</div>
                    <div class="meta-value">2 buoi / tuan</div>
                  </div>
                  <div class="meta-value">Online + Lab</div>
                </div>
                <div class="meta-item">
                  <div>
                    <div class="meta-label">Du an cuoi khoa</div>
                    <div class="meta-value">Bao cao va defense demo</div>
                  </div>
                  <div class="meta-value">4 tuan</div>
                </div>
                <div class="meta-item">
                  <div>
                    <div class="meta-label">Ho tro hoc vien</div>
                    <div class="meta-value">Tai lieu, checklist, office hour</div>
                  </div>
                  <div class="meta-value">1:1</div>
                </div>
              </div>
            </aside>
          </section>

          <section class="section" id="courses">
            <div class="section-head">
              <div>
                <h2>Chuong trinh hoc trong tam</h2>
                <p>Tap trung vao kien thuc co the ung dung ngay trong mon hoc, do an va cac buoi demo ve phong thu he thong.</p>
              </div>
            </div>
            <div class="grid-3">
              <article class="card">
                <span class="card-kicker">Foundation</span>
                <h3>Nen tang mang va he thong</h3>
                <p>On lai TCP/IP, HTTP, reverse proxy, Linux log va cach doc luu luong de hieu hanh vi bat thuong.</p>
              </article>
              <article class="card">
                <span class="card-kicker">Defense</span>
                <h3>Giam sat va phat hien som</h3>
                <p>Xay dashboard, nhin chi so suc khoe app, so lan loi, do tre va diem bat dau cua mot su kien tang tai.</p>
              </article>
              <article class="card">
                <span class="card-kicker">Practice</span>
                <h3>Lab mo phong tan cong hop phap</h3>
                <p>Thuc hanh tren moi truong lab da kiem soat de hieu cach he thong suy giam va cach kich hoat lop phong thu.</p>
              </article>
            </div>
          </section>

          <section class="section" id="roadmap">
            <div class="section-head">
              <div>
                <h2>Lo trinh hoc 3 chang</h2>
                <p>Tung chang duoc sap xep de nguoi hoc di tu phan tich can ban den quan sat du lieu va thao tac phong thu trong moi truong demo.</p>
              </div>
            </div>
            <div class="roadmap">
              <article class="roadmap-card">
                <div class="roadmap-step">01</div>
                <h3>Hieu he thong</h3>
                <p>Nam luong request, vai tro cua app, proxy, log va cach xac dinh mot endpoint quan trong.</p>
              </article>
              <article class="roadmap-card">
                <div class="roadmap-step">02</div>
                <h3>Do va doc chi so</h3>
                <p>Theo doi response time, inflight request, 5xx, slow request va cach dien giai dashboard de ra quyet dinh.</p>
              </article>
              <article class="roadmap-card">
                <div class="roadmap-step">03</div>
                <h3>Kich hoat phong thu</h3>
                <p>Ap dung cac bien phap rate-limit, emergency mode va so sanh ket qua truoc sau bang du lieu thuc te.</p>
              </article>
            </div>
          </section>

          <section class="section" id="labs">
            <div class="section-head">
              <div>
                <h2>Khu vuc cyber lab</h2>
                <p>Day la phan duoc gioi thieu nhu mot khu thuc hanh noi bo cho giang vien va tro giang trong buoi hoc mo phong.</p>
              </div>
            </div>
            <div class="labs">
              <article class="lab-card">
                <h3>Nhung gi hoc vien se trai nghiem</h3>
                <p class="footnote">Moi buoi lab deu co muc tieu ro rang, thong so can theo doi va mau bao cao de sinh vien khong bi "ngop" khi vao log va dashboard.</p>
                <ul class="lab-list">
                  <li>Quan sat he thong o trang thai binh thuong va ghi lai baseline.</li>
                  <li>Mo phong tai tang dan de nhin thay response cham, queue tang va loi 503 xuat hien.</li>
                  <li>Ap dung lop phong thu va doi chieu du lieu tren dashboard de danh gia hieu qua.</li>
                </ul>
              </article>
              <article class="lab-card">
                <h3>Tai nguyen noi bo</h3>
                <p class="footnote">Cac lien ket nay giup giang vien va tro giang chuyen nhanh den cong cu demo.</p>
                <div class="resource-links">
                  <a href="/dashboard"><span>Dashboard giam sat</span><strong>Mo trang</strong></a>
                  <a href="/health"><span>Trang thai he thong</span><strong>JSON</strong></a>
                  <a href="/api/report"><span>Thu nghiem report mau</span><strong>API</strong></a>
                </div>
              </article>
            </div>
          </section>

          <footer class="footer">
            <div class="footer-inner">
              <p class="footnote">${config.publicName} mo phong giao dien landing page cho website hoc bao mat, phu hop de trinh bay trong demo hoac do an mon hoc.</p>
              <div class="route-links">
                <span><code>/health</code></span>
                <span><code>/heavy</code></span>
                <span><code>/api/report</code></span>
                <a href="/dashboard"><code>/dashboard</code></a>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </body>
  </html>`;

  res.status(200).send(html);
});

app.get("/health", (req, res) => {
  const degraded = metrics.inflightRequests >= config.overloadInflight;
  res.status(200).json({
    status: "OK",
    mode: degraded ? "DEGRADED" : "UP",
    uptimeSeconds: Math.round(process.uptime()),
    hostname: os.hostname(),
    inflightRequests: metrics.inflightRequests,
    totalRequests: metrics.totalRequests,
    completedRequests: metrics.completedRequests,
    slowRequests: metrics.slowRequests,
    overloadResponses: metrics.overloadResponses,
    timestamp: new Date().toISOString()
  });
});

app.get("/heavy", (req, res) => {
  if (metrics.inflightRequests > config.overloadInflight * 1.5) {
    return res.status(503).json({
      status: "OVERLOADED",
      message: "Victim app rejected the request because the inflight queue is too large.",
      inflightRequests: metrics.inflightRequests
    });
  }

  const requestedMs = Number(req.query.workMs || req.query.ms || config.heavyDefaultMs);
  const workMs = clamp(Number.isFinite(requestedMs) ? requestedMs : config.heavyDefaultMs, 20, config.heavyMaxMs);
  const checksum = busyLoopForMs(workMs);

  return res.status(200).json({
    status: "OK",
    endpoint: "/heavy",
    workMs,
    checksum,
    inflightRequests: metrics.inflightRequests,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/report", async (req, res) => {
  const extraDelay = clamp(Number(req.query.delayMs || 0) || 0, 0, 3000);
  const delayMs = config.reportDelayMs + extraDelay;

  if (metrics.inflightRequests >= config.overloadInflight) {
    return res.status(503).json({
      status: "OVERLOADED",
      message: "Background reporting is temporarily unavailable while the victim app is overloaded.",
      retryAfterMs: 2000
    });
  }

  await wait(delayMs);

  return res.status(200).json({
    status: "OK",
    message: "Synthetic report generated.",
    delayMs,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    status: "NOT_FOUND",
    message: "Route not found on victim app."
  });
});

app.use((error, req, res, next) => {
  console.error("[victim-app] Unhandled error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    status: "ERROR",
    message: "Victim app internal error."
  });
});

app.listen(config.port, () => {
  console.log(`[victim-app] listening on port ${config.port}`);
});
