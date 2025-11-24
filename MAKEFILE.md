# Makefile Quick Reference

This Makefile provides convenient commands for development, testing, and running GitHub Actions locally.

## Prerequisites

### Required
- **Node.js** (v20.x or later)
- **npm** (comes with Node.js)

### Optional (for GitHub Actions local testing)
- **Docker Desktop** - Required for running act
- **act** - Tool for running GitHub Actions locally

### Installing act

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (with Chocolatey)
choco install act-cli
```

## Quick Start

```bash
# Check your environment
make doctor

# Install dependencies
make install

# Start development server
make dev

# Build production bundle
make build
```

## Available Commands

Run `make help` to see all available commands.

### Development

| Command | Description |
|---------|-------------|
| `make install` | Install npm dependencies |
| `make dev` | Start development server (port 5173) |
| `make build` | Build production bundle (runs typecheck first) |
| `make preview` | Preview production build (port 4173) |
| `make clean` | Remove all build artifacts and dependencies |

### Testing

| Command | Description |
|---------|-------------|
| `make test` | Run unit tests in watch mode |
| `make test:run` | Run unit tests once |
| `make test:coverage` | Generate test coverage reports |
| `make test:e2e` | Run Playwright E2E tests |
| `make test:all` | Run all tests (unit + E2E) |

### Validation

| Command | Description |
|---------|-------------|
| `make lint` | Run ESLint |
| `make typecheck` | Run TypeScript type checking |
| `make validate:json` | Validate recipe/ingredient JSON schemas |
| `make validate:translations` | Check translation file consistency |
| `make validate:all` | Run all validation checks |

### GitHub Actions (Local Execution with act)

| Command | Description |
|---------|-------------|
| `make act:test` | Run test.yml workflow locally |
| `make act:lighthouse` | Run lighthouse-localhost.yml locally |
| `make act:validate-recipe` | Run recipe validation workflow |
| `make act:security` | Run npm audit security scan |
| `make act:deploy-build` | Run deploy build job (no actual deployment) |
| `make act:list` | List all available workflows |
| `make act:all` | Run all suitable workflows in sequence |

**Note:** All `act:*` commands require Docker to be running.

### Utilities

| Command | Description |
|---------|-------------|
| `make doctor` | Check if required tools are installed |
| `make help` | Display help message with all commands |

## Common Workflows

### Before Committing Changes

```bash
# Run all validations
make validate:all

# Run all tests
make test:all

# Run GitHub Actions checks locally
make act:test
make act:lighthouse
```

### Working on Recipes

```bash
# Validate recipe JSON changes
make validate:json

# Run recipe validation workflow
make act:validate-recipe
```

### Checking Accessibility

```bash
# Build and run Lighthouse checks
make build
make act:lighthouse
```

### Fresh Start

```bash
# Clean everything and reinstall
make clean
make install
```

## Troubleshooting

### Docker Daemon Not Running

If you see:
```
Error: Docker daemon is not running. Please start Docker Desktop.
```

**Solution:** Start Docker Desktop application.

### act Not Installed

If you see:
```
Error: act is not installed. Install with: brew install act
```

**Solution:** Install act following the instructions in the [Prerequisites](#prerequisites) section.

### M-series Mac Issues with act

If you're on an Apple M-series Mac and encounter architecture issues:

The `.actrc` file is already configured with `--container-architecture linux/amd64` to handle this.

If you still have issues, you can manually override:
```bash
act -j test --container-architecture linux/amd64
```

### Port Already in Use

If port 5173 (dev) or 4173 (preview) is already in use:

```bash
# Find and kill the process
lsof -ti:5173 | xargs kill -9
lsof -ti:4173 | xargs kill -9
```

## Configuration Files

- **Makefile** - Main task runner
- **.actrc** - Configuration for act (GitHub Actions runner)
- **.gitignore** - Updated to exclude test artifacts and act cache

## Tips

1. **Run doctor first** - Use `make doctor` to verify your environment is properly set up
2. **Use tab completion** - Most shells support tab completion with Makefiles
3. **Check help frequently** - Run `make help` to see all available commands
4. **Pre-push validation** - Run `make act:all` before pushing to catch CI failures early
5. **Clean builds** - If you encounter weird issues, try `make clean && make install`

## Examples

### Development Workflow
```bash
# Start fresh
make clean
make install

# Start dev server
make dev

# In another terminal, run tests in watch mode
make test
```

### Pre-Push Validation
```bash
# Run all checks locally before pushing
make lint
make typecheck
make test:all
make act:lighthouse
```

### Recipe Contribution Workflow
```bash
# After adding/modifying recipes
make validate:json
make validate:translations
make act:validate-recipe
```

### CI/CD Simulation
```bash
# Simulate what will run on GitHub Actions
make act:test          # Run test suite
make act:lighthouse    # Run accessibility checks
make act:security      # Run security audit
```

## More Information

- [act Documentation](https://github.com/nektos/act)
- [GNU Make Manual](https://www.gnu.org/software/make/manual/)
- [Project README](./README.md)
- [Contributing Guide](./CONTRIBUTING.md)
