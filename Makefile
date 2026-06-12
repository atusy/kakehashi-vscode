VERSION := $(shell bun -p "require('./package.json').version")
VSIX := kakehashi-$(VERSION).vsix

.PHONY: check package release

check:
	bun run typecheck
	bun run test

package: check
	bunx @vscode/vsce package

# Requires VSCE_PAT (VS Code Marketplace) and OVSX_PAT (Open VSX).
release: package
	@test -n "$$VSCE_PAT" || { echo "VSCE_PAT is not set" >&2; exit 1; }
	@test -n "$$OVSX_PAT" || { echo "OVSX_PAT is not set" >&2; exit 1; }
	bunx @vscode/vsce publish --packagePath $(VSIX)
	bunx ovsx publish $(VSIX)
