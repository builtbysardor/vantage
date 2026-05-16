.DEFAULT_GOAL := help

# Support both docker compose (v2 plugin) and docker-compose (v1 standalone)
DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

.PHONY: help up down restart logs status clean build reload-prometheus

help:
	@echo "InfraWatch — available commands"
	@echo ""
	@echo "  make up                 Start all services in background"
	@echo "  make down               Stop all services"
	@echo "  make restart            Restart all services"
	@echo "  make build              Rebuild backend image (after code changes)"
	@echo "  make logs               Follow logs from all services"
	@echo "  make status             Show container status and health"
	@echo "  make clean              Stop and delete all volumes (data loss!)"
	@echo "  make reload-prometheus  Hot-reload Prometheus config without restart"
	@echo ""
	@echo "  Service URLs:"
	@echo "    Grafana       http://localhost:3000  (admin / infrawatch)"
	@echo "    Prometheus    http://localhost:9090"
	@echo "    Alertmanager  http://localhost:9093"
	@echo "    Backend API   http://localhost:8000/docs"
	@echo "    Node Exporter http://localhost:9100/metrics"
	@echo "    Loki          http://localhost:3100"
	@echo "    cAdvisor      http://localhost:8080"

up:
	$(DOCKER_COMPOSE) up -d

down:
	$(DOCKER_COMPOSE) down

restart:
	$(DOCKER_COMPOSE) restart

build:
	$(DOCKER_COMPOSE) build --no-cache backend

logs:
	$(DOCKER_COMPOSE) logs -f

status:
	$(DOCKER_COMPOSE) ps

clean:
	@echo "WARNING: This will delete all persistent data volumes."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(DOCKER_COMPOSE) down -v

reload-prometheus:
	curl -s -X POST http://localhost:9090/-/reload && echo "Prometheus config reloaded."
