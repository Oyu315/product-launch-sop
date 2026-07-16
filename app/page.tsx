import dynamic from "next/dynamic";

const SopToolClient = dynamic(() => import("./SopToolClient"), {
  ssr: false,
  loading: () => (
    <main className="app-shell">
      <div className="content">
        <section className="tool-header">
          <div>
            <span className="eyebrow">PRODUCT RELEASE SOP</span>
            <h1>正在加载编辑页</h1>
            <p>请稍候，工具面板正在初始化。</p>
          </div>
        </section>
      </div>
    </main>
  ),
});

export default function Page() {
  return <SopToolClient />;
}
