import type { Metadata } from "next";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "上架 SOP 工具 | 产品发布检查清单",
    description: "用于产品上架前后执行、提醒和平台配置文档维护的 SOP 工具。",
    openGraph: {
      title: "上架 SOP 工具 | 产品发布检查清单",
      description: "主 SOP 流程与平台配置文档合并管理，支持勾选提醒、图文链接编辑和步骤跳转。",
    },
    twitter: { card: "summary" },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
