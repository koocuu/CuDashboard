import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Console · 人生控制台",
    short_name: "Console",
    description: "个人人生控制台 + AI 画像分发系统",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FAF7F1",
    theme_color: "#FAF7F1",
    orientation: "portrait",
    lang: "zh-CN",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
