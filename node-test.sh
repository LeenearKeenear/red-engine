#!/bin/bash

 curl -X POST http://192.168.0.108:8080/-/import \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: s9Y5bjUBsDVcu4y4uwylmEhW" \
  -d '{
    "peer_url": "http://192.168.0.108:8081",
    "remote_path": "/test-auth",
    "filename": "synced-from-node2",
    "saveToStartup": false
  }'