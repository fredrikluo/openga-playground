DEV = docker compose -f docker-compose.yml -f docker-compose.dev.yml
PROD = docker compose -f docker-compose.yml -f docker-compose.prod.yml

.PHONY: dev prod setup down clean logs

dev: ## Start development environment with hot reload
	$(DEV) up

prod: ## Start production environment
	$(PROD) up --build

setup: ## Upload OpenFGA authorization model
	./setup-openfga.sh

down: ## Stop all services
	$(DEV) down 2>/dev/null; $(PROD) down 2>/dev/null; true

clean: ## Stop all services and delete all data
	$(DEV) down -v 2>/dev/null; $(PROD) down -v 2>/dev/null; true
	rm -rf data/

logs: ## Tail logs from all services
	$(DEV) logs -f 2>/dev/null || $(PROD) logs -f

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
