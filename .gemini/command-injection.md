# Security Rule: Command Injection

## Vulnerability Description
Command injection vulnerabilities allow attackers to execute arbitrary operating system commands on the server. This can happen when an application passes unsanitized user input to a shell command.

## Prevention Rule
To prevent command injection vulnerabilities, **never** use `child_process.exec` with user-provided input. Instead, use `child_process.execFile`, which does not spawn a shell and is therefore not vulnerable to command injection.

When using `execFile`, provide the command and its arguments as an array of strings. This ensures that user input is treated as data, not as executable code.

**Example:**

**Insecure Code (using `exec`):**
```javascript
const { exec } = require('child_process');

// ...

const userInput = req.body.userInput;
exec(`ls -l ${userInput}`, (error, stdout, stderr) => {
  // ...
});
```

**Secure Code (using `execFile`):**
```javascript
const { execFile } = require('child_process');

// ...

const userInput = req.body.userInput;
execFile('ls', ['-l', userInput], (error, stdout, stderr) => {
  // ...
});
```

## Enforcement
- This rule is ALWAYS APPLIED and cannot be bypassed.
- All new code must be scanned for command injection vulnerabilities.
- Any use of `child_process.exec` must be reviewed and approved.
