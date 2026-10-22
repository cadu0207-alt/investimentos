import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A tela /raio-x lê o snapshot da Fase 0 (CSV + JSONs de conta e IR) em tempo de execução.
  outputFileTracingIncludes: {
    "/raio-x": ["./docs/fase0/**/*.{csv,json}"],
    "/fichas": ["./docs/fase0/**/*.{csv,json}"],
    "/alertas": ["./docs/fase0/**/*.{csv,json}"],
    "/comprar": ["./docs/fase0/**/*.{csv,json}"],
    "/importar": ["./docs/fase0/**/*.{csv,json}"],
  },
};

export default nextConfig;
