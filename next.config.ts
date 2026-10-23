import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Telas que leem arquivos do repositório em tempo de execução: snapshot da Fase 0 (CSV + JSON) e dossiês (docs/analises).
  outputFileTracingIncludes: {
    "/raio-x": ["./docs/fase0/**/*.{csv,json}"],
    "/fichas": ["./docs/fase0/**/*.{csv,json}", "./docs/analises/*.md"],
    "/analises": ["./docs/analises/*.md"],
    "/analises/[slug]": ["./docs/analises/*.md"],
    "/alertas": ["./docs/fase0/**/*.{csv,json}"],
    "/comprar": ["./docs/fase0/**/*.{csv,json}"],
    "/importar": ["./docs/fase0/**/*.{csv,json}"],
  },
};

export default nextConfig;
