---
applyTo: '**'
---
# Security Rules for Mobb Vulnerability Scanning

## Vulnerability Rule References - ensure you read the files referenced here prior to any code generation

## MANDATORY: Mobb Scan Protocol
**CRITICAL**: After implementing any new features or making code changes, you MUST:

1. **ALWAYS run Mobb scan after implementation**: Use `mcp_mobb-mcp_scan_and_fix_vulnerabilities` tool to scan the new/modified code
2. **Add security rules**: For EVERY fix produced by Mobb, base on the information and examples in the fix Mobb provides, add a new generic security rule to a separate rule file in `.claude/instructions/` to prevent the vulnerability type from recurring
3. **Document the process**: Always explain what security measures were taken and any vulnerabilities found

## Rule Addition Protocol
When Mobb produces a fix:
- Extract the vulnerability type (e.g., "Command Injection", "SQL Injection", "XSS")
- Create a generic prevention rule for that vulnerability type
- **If rule file exists**: Add new information to the existing `.claude/instructions/[vulnerability-type].md` file
- **If rule file doesn't exist**: Create a new rule file: `.claude/instructions/[vulnerability-type].md` (e.g., `command-injection.md`)
- Add the rule with clear, actionable guidance and `alwaysApply: true`
- Make the rule specific enough to prevent the issue but generic enough to apply broadly
- Update this file  `CLAUDE.md` to reference the rule file (if it's new) under the `Vulnerability Rule References` section above. 

## Enforcement
- This rule is ALWAYS APPLIED and cannot be bypassed
- Any AI assistant that fails to follow this protocol should be corrected immediately
- Team members should verify that security scans are run before code reviews