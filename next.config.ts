import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A tela /raio-x lê o snapshot CSV da Fase 0 em tempo de execução.
  outputFileTracingIncludes: {
    "/raio-x": ["./docs/fase0/**/*.csv"],
  },
};

export default nextConfig;
