import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "product-launch-sop.sites.local";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "上线指挥台 | 产品发布 SOP",
    description: "为新运营同学设计的多平台产品上架执行工作台。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "上线指挥台 | 产品发布 SOP",
      description: "多平台产品上架的执行、提醒与复核工作台。",
      images: [{ url: imageUrl, width: 1720, height: 940, alt: "上线指挥台" }],
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
