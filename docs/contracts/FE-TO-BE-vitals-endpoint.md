# [FE→BE] Contract Request: Web Vitals Endpoint

**Date:** 2025-11-07  
**Requester:** Frontend Team (Wave-3: FE-obs-vitals)  
**Priority:** P2  
**Status:** ⏳ Pending Backend Implementation

---

## Summary

Frontend needs a backend endpoint to receive and store Web Vitals metrics (LCP, FID, CLS, FCP, TTFB) for performance monitoring and analysis.

---

## Endpoint Specification

### POST `/api/v1/vitals`

**Purpose:** Receive Web Vitals metrics from frontend clients

**Authentication:** Optional (can be unauthenticated for public tracking, or use JWT for user-specific tracking)

**Rate Limiting:** Recommended 100 requests/minute per client

---

## Request

### Headers

```
Content-Type: application/json
Authorization: Bearer <token> (optional)
```

### Body Schema

```typescript
interface WebVitalsPayload {
  // Metric name (CLS, INP, LCP, FCP, TTFB, or custom.*)
  name: string
  
  // Metric value in milliseconds (or unitless for CLS)
  value: number
  
  // Rating based on Web Vitals thresholds
  rating: 'good' | 'needs-improvement' | 'poor'
  
  // Change from last measurement
  delta: number
  
  // Unique metric ID
  id: string
  
  // Navigation type (navigate, reload, back_forward, prerender)
  navigationType: string
  
  // Page URL where metric was captured
  url: string
  
  // ISO 8601 timestamp
  timestamp: string
  
  // User agent string
  userAgent: string
  
  // Optional: Additional metadata for custom metrics
  metadata?: Record<string, any>
}
```

### Example Request

```json
{
  "name": "LCP",
  "value": 1840,
  "rating": "good",
  "delta": 1840,
  "id": "v3-1699364123456-1234567890",
  "navigationType": "navigate",
  "url": "https://epop.com/chat/123",
  "timestamp": "2025-11-07T10:30:00.000Z",
  "userAgent": "Mozilla/5.0..."
}
```

---

## Response

### Success Response (202 Accepted)

```json
{
  "status": "accepted",
  "message": "Metric recorded"
}
```

**Note:** Use 202 (Accepted) instead of 200 to indicate async processing

### Error Responses

#### 400 Bad Request

```json
{
  "error": "Invalid payload",
  "details": ["name is required", "value must be a number"]
}
```

#### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## Backend Implementation Notes

### Database Schema

Suggested table: `web_vitals`

```sql
CREATE TABLE web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  metric_name VARCHAR(50) NOT NULL,
  metric_value NUMERIC NOT NULL,
  rating VARCHAR(20) NOT NULL,
  delta NUMERIC,
  metric_id VARCHAR(255),
  navigation_type VARCHAR(50),
  url TEXT NOT NULL,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  INDEX idx_web_vitals_metric_name (metric_name),
  INDEX idx_web_vitals_user_id (user_id),
  INDEX idx_web_vitals_created_at (created_at),
  INDEX idx_web_vitals_rating (rating)
);
```

### Processing

1. **Validation:** Validate payload schema
2. **Enrichment:** Extract user_id from JWT (if authenticated), generate session_id
3. **Storage:** Insert into database (can be async/queued)
4. **Aggregation:** Optional - aggregate metrics hourly/daily for dashboards

### Aggregation Query Examples

```sql
-- Average LCP by page
SELECT 
  url,
  AVG(metric_value) as avg_lcp,
  COUNT(*) as samples
FROM web_vitals
WHERE metric_name = 'LCP'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY url
ORDER BY avg_lcp DESC;

-- Performance over time
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  metric_name,
  AVG(metric_value) as avg_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as p75
FROM web_vitals
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, metric_name
ORDER BY hour DESC;

-- Rating distribution
SELECT 
  metric_name,
  rating,
  COUNT(*) as count
FROM web_vitals
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY metric_name, rating;
```

---

## Frontend Implementation

Already implemented in:
- `lib/monitoring/web-vitals.ts` - Web Vitals collection
- `components/monitoring/web-vitals-reporter.tsx` - React component
- `app/layout.tsx` - Initialization (needs to be added)

### Usage

```tsx
import { WebVitalsReporter } from '@/components/monitoring/web-vitals-reporter'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitalsReporter />
        {children}
      </body>
    </html>
  )
}
```

---

## Grafana Dashboard

Once data is collected, create a Grafana dashboard with:

1. **Overview Panel:** Average LCP, INP, CLS
2. **Performance Trends:** Line chart of metrics over time
3. **Page Performance:** Table of slowest pages
4. **Rating Distribution:** Pie chart of good/needs-improvement/poor
5. **User Agent Analysis:** Performance by browser/device

---

## Acceptance Criteria

- [ ] Endpoint `/api/v1/vitals` accepts POST requests
- [ ] Payload validation implemented
- [ ] Data stored in database
- [ ] Rate limiting configured
- [ ] Optional: Aggregation queries for dashboard
- [ ] Optional: Grafana dashboard configured

---

## Alternative: Use Existing Analytics Endpoint

If a general analytics endpoint already exists (e.g., `/api/v1/analytics/track`), Web Vitals can be sent there with a specific event type:

```json
{
  "event": "web_vitals",
  "properties": {
    "metric": "LCP",
    "value": 1840,
    "rating": "good",
    ...
  }
}
```

---

## Testing

```bash
# Test endpoint (when implemented)
curl -X POST http://localhost:4000/api/v1/vitals \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LCP",
    "value": 1840,
    "rating": "good",
    "delta": 1840,
    "id": "test-123",
    "navigationType": "navigate",
    "url": "http://localhost:3000/test",
    "timestamp": "2025-11-07T10:00:00.000Z",
    "userAgent": "Mozilla/5.0"
  }'
```

---

**Next Steps:**
1. Backend team implements endpoint
2. Frontend team tests integration
3. Set up Grafana dashboard for monitoring
