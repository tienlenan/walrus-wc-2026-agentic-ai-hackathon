import { NewsDeskChat } from "./components/news-desk-chat";
import { ConnectBar } from "./components/connect-bar";

const SECTIONS = [
  { kicker: "Predictions Desk", blurb: "Đặt kèo từng trận. Gil ghi sổ — và không bao giờ quên." },
  { kicker: "Leaderboard", blurb: "Bảng xếp hạng độ chính xác. Realtime, và phũ phàng." },
  { kicker: "Before / After", blurb: "Gil ngày 1 vs Gil ngày 5. Bằng chứng trí nhớ thật." },
  { kicker: "Gil's Notebook", blurb: "Mọi thứ Gil nhớ về bạn — lưu trên Walrus, xác minh on-chain." },
];

export default function App() {
  const date = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="paper">
      <ConnectBar />
      <header className="masthead">
        <div className="eyebrow">Powered by Walrus · Mainnet · Trust the Tusk</div>
        <h1 className="nameplate">The Daily Walrus</h1>
        <div className="tagline">Memory Edition — FIFA World Cup 2026</div>
        <div className="dateline">
          <span>EST. 2026</span>
          <span>{date}</span>
          <span>No. 001 · ấn bản memory</span>
        </div>
      </header>

      <main className="lead-block">
        <div className="kicker">Độc quyền từ bàn bình luận</div>
        <h2 className="headline">"Tôi nhớ hết mấy kèo trật của ông."</h2>
        <p className="lede">
          <span className="dropcap">G</span>il — chú hải mã bình luận viên già đời — theo dõi từng dự
          đoán World Cup 2026 của bạn, lưu vĩnh viễn trên Walrus, rồi cà khịa bằng chính lịch sử của
          bạn. Càng dùng lâu, Gil càng biết rõ… và càng phũ. Hỏi thử lão xem.
        </p>
      </main>

      <NewsDeskChat />

      <section className="sections">
        {SECTIONS.map((s) => (
          <div className="section-card" key={s.kicker}>
            <div className="section-kicker">{s.kicker}</div>
            <p className="section-blurb">{s.blurb}</p>
            <div className="soon">Sắp ra mắt</div>
          </div>
        ))}
      </section>

      <footer className="footer">
        <span className="stamp">Stop Press</span>
        <span className="footer-text">
          Build: M2 · Mastra + Gemini + Walrus Memory + Supabase · trí nhớ đang lên sóng…
        </span>
      </footer>
    </div>
  );
}
