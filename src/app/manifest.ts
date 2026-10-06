import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soul+",
    short_name: "Soul+",
    description: "Acompanhamento de alunos, tarefas e pontuações.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7f4",
    theme_color: "#126b63",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
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