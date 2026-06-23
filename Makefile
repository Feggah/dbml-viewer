# DBML Viewer - common tasks
.DEFAULT_GOAL := help

NPM ?= npm
# Trivy fails the build on findings at or above this severity.
TRIVY_SEVERITY ?= HIGH,CRITICAL

.PHONY: help install run build preview checks check lint typecheck audit trivy security clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	$(NPM) install

run: ## Start the dev server (http://localhost:5173)
	$(NPM) run dev

build: ## Production build to dist/
	$(NPM) run build

preview: ## Serve the production build locally
	$(NPM) run preview

# -------- checks (CI gate) --------

lint: ## Lint sources with ESLint
	$(NPM) run lint

typecheck: ## TypeScript type-check (no emit)
	$(NPM) run typecheck

audit: ## Audit shipped (production) dependencies for known vulnerabilities
	$(NPM) audit --omit=dev --audit-level=high

trivy: ## Filesystem vuln/secret/misconfig scan (Trivy)
	@if command -v trivy >/dev/null 2>&1; then \
		trivy fs --scanners vuln,secret,misconfig \
			--severity $(TRIVY_SEVERITY) --exit-code 1 --no-progress \
			--skip-dirs node_modules,dist .; \
	else \
		echo ">> trivy not installed locally - skipping the filesystem scan."; \
		echo ">> Install it from https://trivy.dev (CI runs it automatically)."; \
	fi

security: audit trivy ## Run all security checks (dependency audit + Trivy)

checks: lint typecheck security ## Run linters and security checks
check: checks ## Alias for `checks`

clean: ## Remove build output and installed dependencies
	rm -rf dist node_modules
