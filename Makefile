.PHONY: install dev backend frontend worker help

help:
	@echo "ACRIS Make targets"
	@echo "  make install     install backend + frontend + python deps"
	@echo "  make dev         run backend and frontend locally"
	@echo "  make backend     run backend only"
	@echo "  make frontend    run frontend only"
	@echo "  make docker      start local docker stack"

install:
	@echo "Installing backend dependencies"
	npm --prefix acris/backend install
	@echo "Installing frontend dependencies"
	npm --prefix acris/frontend install
	@echo "Installing Python dependencies"
	python -m pip install -r acris/agents/requirements.txt

backend:
	npm --prefix acris/backend run dev

frontend:
	npm --prefix acris/frontend run dev

dev:
	@echo "Run backend and frontend separately in two terminals"
	@echo "  make backend"
	@echo "  make frontend"

docker:
	docker compose up --build
