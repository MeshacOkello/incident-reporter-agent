#!/bin/bash
# Trigger a test incident via webhook
# Usage: ./scripts/trigger-test-alert.sh [API_URL]

API_URL="${1:-http://localhost:3001}"
curl -X POST "$API_URL/api/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "cloudwatch",
    "service": "api",
    "message": "High error rate detected - test alert",
    "metricName": "ErrorCount",
    "region": "us-east-1"
  }'
echo ""
