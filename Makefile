.PHONY: help install dev build preview clean test test\:run test\:coverage test\:e2e test\:all lint typecheck validate\:json validate\:translations validate\:all act\:test act\:lighthouse act\:validate-recipe act\:security act\:deploy-build act\:list act\:all doctor

# Default target - show help
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ Development

install: ## Install npm dependencies
	@echo "$(CYAN)Installing dependencies...$(NC)"
	npm install

dev: ## Start development server (port 5173)
	@echo "$(CYAN)Starting development server...$(NC)"
	npm run dev

build: typecheck ## Build production bundle
	@echo "$(CYAN)Building production bundle...$(NC)"
	npm run build

preview: ## Preview production build (port 4173)
	@echo "$(CYAN)Starting preview server...$(NC)"
	npm run preview

clean: ## Remove build artifacts and dependencies
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	rm -rf dist/ node_modules/ .lighthouseci/ playwright-report/ coverage/
	@echo "$(GREEN)Clean complete$(NC)"

##@ Testing

test: ## Run unit tests (watch mode)
	@echo "$(CYAN)Running unit tests in watch mode...$(NC)"
	npm run test

test\:run: ## Run unit tests (single run)
	@echo "$(CYAN)Running unit tests...$(NC)"
	npm run test:run

test\:coverage: ## Generate test coverage reports
	@echo "$(CYAN)Generating coverage reports...$(NC)"
	npm run test:coverage

test\:e2e: ## Run Playwright E2E tests
	@echo "$(CYAN)Running E2E tests...$(NC)"
	npm run test:e2e

test\:all: test\:run test\:e2e ## Run all tests (unit + E2E)
	@echo "$(GREEN)All tests completed$(NC)"

##@ Validation

lint: ## Run ESLint
	@echo "$(CYAN)Running ESLint...$(NC)"
	npm run lint

typecheck: ## Run TypeScript type checking
	@echo "$(CYAN)Running TypeScript type check...$(NC)"
	npx tsc --noEmit

validate\:json: ## Validate recipe/ingredient JSON schemas
	@echo "$(CYAN)Validating JSON files...$(NC)"
	npm run validate:json

validate\:translations: ## Validate translation file consistency
	@echo "$(CYAN)Validating translation files...$(NC)"
	npm run validate:translations

validate\:all: lint typecheck validate\:json validate\:translations ## Run all validation checks
	@echo "$(GREEN)All validations passed$(NC)"

##@ GitHub Actions (local with act)

act\:test: _check-docker ## Run test.yml workflow locally
	@echo "$(CYAN)Running test workflow with act...$(NC)"
	act -j test -W .github/workflows/test.yml

act\:lighthouse: _check-docker ## Run lighthouse-localhost.yml workflow locally
	@echo "$(CYAN)Running Lighthouse workflow with act...$(NC)"
	act -j lighthouse-localhost -W .github/workflows/lighthouse-localhost.yml

act\:validate-recipe: _check-docker ## Run validate-recipe-pr.yml workflow locally
	@echo "$(CYAN)Running recipe validation workflow with act...$(NC)"
	act pull_request -W .github/workflows/validate-recipe-pr.yml

act\:security: _check-docker ## Run security-scan.yml workflow locally (npm audit only)
	@echo "$(CYAN)Running security scan workflow with act...$(NC)"
	act -j npm-audit -W .github/workflows/security-scan.yml

act\:deploy-build: _check-docker ## Run deploy.yml build job only (no deployment)
	@echo "$(CYAN)Running deploy build job with act...$(NC)"
	act -j build -W .github/workflows/deploy.yml

act\:list: _check-act ## List all available act workflows
	@echo "$(CYAN)Available workflows:$(NC)"
	@act -l

act\:all: act\:test act\:validate-recipe act\:lighthouse ## Run all suitable workflows locally
	@echo "$(GREEN)All act workflows completed$(NC)"

##@ Utilities

doctor: ## Check if required tools are installed
	@echo "$(CYAN)Checking development environment...$(NC)"
	@command -v node >/dev/null 2>&1 && echo "$(GREEN)✓ Node.js: $$(node --version)$(NC)" || echo "$(RED)✗ Node.js not found$(NC)"
	@command -v npm >/dev/null 2>&1 && echo "$(GREEN)✓ npm: $$(npm --version)$(NC)" || echo "$(RED)✗ npm not found$(NC)"
	@command -v act >/dev/null 2>&1 && echo "$(GREEN)✓ act: $$(act --version | head -1)$(NC)" || echo "$(YELLOW)⚠ act not found (optional, for running GitHub Actions locally)$(NC)"
	@command -v docker >/dev/null 2>&1 && echo "$(GREEN)✓ Docker: $$(docker --version)$(NC)" || echo "$(YELLOW)⚠ Docker not found (optional, required for act)$(NC)"
	@docker info >/dev/null 2>&1 && echo "$(GREEN)✓ Docker daemon is running$(NC)" || echo "$(YELLOW)⚠ Docker daemon not running (required for act)$(NC)"

help: ## Display this help message
	@echo "$(CYAN)Foodie Development Makefile$(NC)"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_\:%-]+:.*?##/ { printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(CYAN)Examples:$(NC)"
	@echo "  make install          # Install dependencies"
	@echo "  make dev              # Start dev server"
	@echo "  make test:all         # Run all tests"
	@echo "  make validate:all     # Run all validations"
	@echo "  make act:lighthouse   # Run Lighthouse checks locally"
	@echo "  make doctor           # Check environment setup"
	@echo ""

##@ Internal Helpers

_check-act:
	@command -v act >/dev/null 2>&1 || (echo "$(RED)Error: act is not installed. Install with: brew install act$(NC)" && exit 1)

_check-docker: _check-act
	@docker info >/dev/null 2>&1 || (echo "$(RED)Error: Docker daemon is not running. Please start Docker Desktop.$(NC)" && exit 1)
