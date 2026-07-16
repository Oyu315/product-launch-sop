"use client";

import { useEffect, useState } from "react";

type WorkspaceComponent = typeof import("../components/SopToolWorkspace").default;

function LoadingShell() {
  return (
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
  );
}

export default function Page() {
  const [Workspace, setWorkspace] = useState<WorkspaceComponent | null>(null);

  useEffect(() => {
    let active = true;

    void import("../components/SopToolWorkspace").then((module) => {
      if (active) setWorkspace(() => module.default);
    });

    return () => {
      active = false;
    };
  }, []);

  return Workspace ? <Workspace /> : <LoadingShell />;
}
