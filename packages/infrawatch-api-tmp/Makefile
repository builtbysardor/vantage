.DEFAULT_GOAL := help

DOCKER_COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

.PHONY: help up down restart logs status clean build build-all reload-prometheus \
        prod-up prod-down worker-logs beat-logs db-shell redis-shell k8s-apply k8s-delete

help:
	@echo "InfraWatch — available commands"
	@echo ""
	@echo "  Development:"
	@echo "    make up                 Start full stack (all phases)"
	@echo "    make down               Stop all services"
	@echo "    make restart            Restart all services"
	@echo "    make build              Rebuild backend image"
	@echo "    make build-all          Rebuild all custom images"
	@echo "    make logs               Follow all logs"
	@echo "    make status             Container health status"
	@echo "    make clean              Stop + delete all volumes (data loss!)"
	@echo ""
	@echo "  Debugging:"
	@echo "    make worker-logs        Follow Celery worker logs"
	@echo "    make beat-logs          Follow Celery beat logs"
	@echo "    make db-shell           Open PostgreSQL shell"
	@echo "    make redis-shell        Open Redis CLI"
	@echo "    make reload-prometheus  Hot-reload Prometheus config"
	@echo ""
	@echo "  Production:"
	@echo "    make prod-up            Start production stack (with Nginx)"
	@echo "    make prod-down          Stop production stack"
	@echo ""
	@echo "  Kubernetes:"
	@echo "    make k8s-apply          Apply all Kubernetes manifests"
	@echo "    make k8s-delete         Remove all Kubernetes resources"
	@echo ""
	@echo "  Service URLs:"
	@echo "    Live Dashboard  http://localhost:8000/dashboard"
	@echo "    Backend API     http://localhost:8000/docs"
	@echo "    WebSocket       ws://localhost:8000/ws/metrics"
	@echo "    Grafana         http://localhost:3000  (admin / infrawatch)"
	@echo "    Prometheus      http://localhost:9090"
	@echo "    Alertmanager    http://localhost:9093"
	@echo "    cAdvisor        http://localhost:8080"
	@echo "    Node Exporter   http://localhost:9100/metrics"

up:
	$(DOCKER_COMPOSE) up -d

down:
	$(DOCKER_COMPOSE) down

restart:
	$(DOCKER_COMPOSE) restart

build:
	$(DOCKER_COMPOSE) build --no-cache backend

build-all:
	$(DOCKER_COMPOSE) build --no-cache backend celery_worker celery_beat

logs:
	$(DOCKER_COMPOSE) logs -f

status:
	$(DOCKER_COMPOSE) ps

clean:
	@echo "WARNING: This will delete all persistent data volumes."
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	$(DOCKER_COMPOSE) down -v

worker-logs:
	$(DOCKER_COMPOSE) logs -f celery_worker

beat-logs:
	$(DOCKER_COMPOSE) logs -f celery_beat

db-shell:
	$(DOCKER_COMPOSE) exec postgres psql -U infrawatch -d infrawatch

redis-shell:
	$(DOCKER_COMPOSE) exec redis redis-cli

reload-prometheus:
	curl -s -X POST http://localhost:9090/-/reload && echo "Prometheus config reloaded."

prod-up:
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml up -d

prod-down:
	$(DOCKER_COMPOSE) -f docker-compose.yml -f docker-compose.prod.yml down

k8s-apply:
	kubectl apply -f k8s/namespace.yml
	kubectl apply -f k8s/postgres.yml
	kubectl apply -f k8s/redis.yml
	kubectl apply -f k8s/prometheus.yml
	kubectl apply -f k8s/backend.yml
	kubectl apply -f k8s/ingress.yml

k8s-delete:
	kubectl delete namespace infrawatch
