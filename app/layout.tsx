import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "product-launch-sop.sites.local";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "上架 SOP 工具 | 产品发布检查清单",
    description: "用于产品上架前后执行、提醒和平台配置维护的 SOP 工具。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "上架 SOP 工具 | 产品发布检查清单",
      description: "主 SOP 流程与平台配置模块合并管理，支持勾选提醒、模块编辑和步骤跳转。",
      images: [{ url: imageUrl, width: 1720, height: 940, alt: "上架 SOP 工具" }],
    },
    twitter: { card: "summary_large_image", images: [imageUrl] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
