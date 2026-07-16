"use client";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="app-shell">
          <div className="content">
            <section className="tool-header">
              <div>
                <span className="eyebrow">PRODUCT RELEASE SOP</span>
                <h1>页面暂时没有加载成功</h1>
                <p>我们已经拦住这次异常了。刷新一次通常可以恢复，如果还不行我会继续处理。</p>
              </div>
              <button className="primary-button" onClick={reset}>
                重新加载
              </button>
              {error.digest && <p className="quiet-note">Error digest: {error.digest}</p>}
            </section>
          </div>
        </main>
      </body>
    </html>
  );
}
