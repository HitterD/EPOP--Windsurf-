/**
 * Initialize OpenTelemetry tracing if environment is configured.
 * Lazy-requires OTEL packages to avoid hard dependency when disabled.
 */
export function initTracing() {
  try {
    const enabled = (process.env.OTEL_ENABLED || '').toLowerCase() === 'true'
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || ''
    if (!enabled && !endpoint) {
      return { shutdown: async () => {} }
    }

    // Lazy requires
    const api = require('@opentelemetry/api') as any
    const { NodeSDK } = require('@opentelemetry/sdk-node') as any
    const { Resource } = require('@opentelemetry/resources') as any
    const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions') as any
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http') as any
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node') as any

    api.diag.setLogger(new api.DiagConsoleLogger(), api.DiagLogLevel.ERROR)

    const serviceName = process.env.OTEL_SERVICE_NAME || 'epop-backend'
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    })

    const traceExporter = new OTLPTraceExporter({
      url: endpoint ? endpoint.replace(/\/$/, '') + '/v1/traces' : undefined,
      headers: {},
    })

    const sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [getNodeAutoInstrumentations()],
    })

    sdk.start().catch(() => undefined)

    const shutdown = async () => {
      try { await sdk.shutdown() } catch {}
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)

    return { shutdown }
  } catch {
    return { shutdown: async () => {} }
  }
}
