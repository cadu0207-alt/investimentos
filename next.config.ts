import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A tela /raio-x lê o snapshot da Fase 0 (CSV + JSON) em tempo de execução.
  outputFileTracingIncludes: {
    "/raio-x": ["./docs/fase0/**/*.{csv,json}"],
  },
};

export default nextConfig;
