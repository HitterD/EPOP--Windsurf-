# Grafana Alerting (Self-Hosted)

This guide covers provisioning Grafana alert rules and email notifications using a self-hosted SMTP server (e.g., MailHog for dev/staging).

## Provisioning Structure

- `docker/grafana/provisioning/datasources/` – Prometheus & Loki datasources
- `docker/grafana/provisioning/alerting/` –
  - `contact-points.yml` – SMTP contact point
  - `notification-policies.yml` – Routing policies
  - `rules.yml` – Alert rules (API error rate, p95 latency, pod restarts)

Grafana is mounted with:

```
./docker/grafana/provisioning:/etc/grafana/provisioning:ro
```

## Environment Variables

Update `docker-compose.monitoring.yml` service `grafana`:

- `GF_SMTP_ENABLED=true`
- `GF_SMTP_HOST=mailhog:1025`
- `GF_SMTP_FROM_ADDRESS=alerts@epop.local`
- `GF_ALERT_EMAIL_TO=team@epop.local`
- `GF_SERVER_ROOT_URL=http://localhost:3001`

MailHog is provided in `docker-compose.yml` (`1025`, `8025`).

## Alert Rules (Prometheus)

- **API Error Rate > 5% (5m)**
  - Query: `sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))`
  - For: `5m`
  - Labels: `severity=critical`, `service=api`

- **API p95 Latency > 1s (5m)**
  - Query uses `http_request_duration_seconds_bucket` and `histogram_quantile(0.95, ...)`
  - For: `5m`
  - Labels: `severity=warning`, `service=api`

- **Pod Restarts**
  - Query: `increase(kube_pod_container_status_restarts_total[10m])`
  - For: `5m`
  - Labels: `severity=warning`, `service=platform`

## Validate (Dev/Staging)

1. `docker compose -f docker-compose.monitoring.yml up -d`
2. Access Grafana at `http://localhost:3001` (admin/admin)
3. Set `GF_ALERT_EMAIL_TO` (or edit contact point) and save
4. Trigger test alert: temporarily set a lower threshold or use Grafana's "Test rule" feature
5. Check MailHog UI at `http://localhost:8025` for email

## SOP Eskalasi (Ringkas)

- **Critical:** API error rate > 5% for 5m → Email oncall
- **Warning:** p95 latency > 1s for 5m → Email team channel
- **Platform:** Pod restarts increasing → Email infra

## Notes

- For Kubernetes, import kube-state-metrics to feed `kube_pod_container_status_restarts_total`
- Optionally add Slack contact point for production
- Keep alert rules in git to review changes in PRs
