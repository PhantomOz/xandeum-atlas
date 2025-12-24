"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center text-sm text-slate-200">
      Hydrating the OpenAPI explorer…
    </div>
  ),
});

interface SwaggerExplorerProps {
  apiUrl: string;
}

export function SwaggerExplorer({ apiUrl }: SwaggerExplorerProps) {
  return (
    <div className="swagger-docs-container rounded-[32px] border border-white/10 bg-slate-950/60 p-2 shadow-[0_35px_120px_rgba(2,6,23,0.55)]">
      <SwaggerUI
        url={apiUrl}
        docExpansion="list"
        defaultModelsExpandDepth={-1}
        defaultModelExpandDepth={-1}
        deepLinking
        filter
        tryItOutEnabled
        persistAuthorization
        displayOperationId
      />
      <style jsx global>{`
        .swagger-docs-container .swagger-ui,
        .swagger-docs-container .swagger-ui .info,
        .swagger-docs-container .swagger-ui .scheme-container {
          background: transparent;
        }
        .swagger-docs-container .swagger-ui,
        .swagger-docs-container .swagger-ui * {
          font-family: var(--font-mono), var(--font-grotesk), "Space Grotesk", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        }
        .swagger-docs-container .swagger-ui .topbar {
          display: none;
        }
        .swagger-docs-container .swagger-ui .scheme-container {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 12px 16px;
        }
        .swagger-docs-container .opblock-summary-method {
          border-radius: 999px;
        }
        .swagger-docs-container .opblock-tag {
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.35em;
          color: rgb(110 231 183);
        }
        .swagger-docs-container .opblock {
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.7);
        }
        .swagger-docs-container .opblock .opblock-section-header {
          background: transparent;
        }
        .swagger-docs-container .response-col_status {
          color: rgb(16 185 129);
        }
        .swagger-docs-container .model-box {
          background: rgba(2, 6, 23, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .swagger-docs-container .btn.execute {
          background: rgb(16 185 129);
          border: none;
          text-transform: uppercase;
          letter-spacing: 0.25em;
        }
      `}</style>
    </div>
  );
}
