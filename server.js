const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const child_process = require('node:child_process');
const fs = require('fs').promises;
const { readFileSync } = require('fs');
const os = require('os');
const Rox = require('rox-node');

// Security scan trigger - Git commit application with web interface
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// VERSION is the single source of truth for the app version; read once at
// startup so /api/version doesn't hit the filesystem on every request.
const APP_VERSION = readFileSync(path.join(__dirname, 'VERSION'), 'utf8').trim();

// Feature flags (CloudBees Unify / rox-node). The flag stays at its local
// default (false) until initFeatureFlags() resolves, so evaluation is always
// safe to call even before setup finishes or when no SDK key is configured
// (e.g. local dev, tests).
//
// The container key must exactly match the flag name configured in CB
// Unify ("show-build-info") -- rox-node auto-creates a *new* flag under
// whatever key you register, it doesn't fuzzy-match, so a mismatch here
// silently evaluates a different (always-default) flag.
const flags = {
  'show-build-info': new Rox.Flag(false),
};
Rox.register('', flags);

// Skipped when ROX_SDK_KEY is unset so local runs and tests never depend on
// network access; the flag simply stays at its default in that case.
async function initFeatureFlags() {
  if (!process.env.ROX_SDK_KEY) {
    console.warn('ROX_SDK_KEY not set; feature flags will use their default values');
    return;
  }
  try {
    await Rox.setup(process.env.ROX_SDK_KEY);
  } catch (error) {
    console.warn('Failed to initialize feature flags:', error.message);
  }
}

// Routes

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get the deployed app version
app.get('/api/version', (req, res) => {
  res.json({ version: APP_VERSION });
});

// Build/runtime info panel, gated by the show-build-info flag (GS-7).
// Returns 404 when off so the frontend can treat "not found" as "hidden"
// without needing to know about the flag itself.
app.get('/api/build-info', (req, res) => {
  if (!flags['show-build-info'].isEnabled()) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  res.json({
    success: true,
    namespace: process.env.POD_NAMESPACE || 'local',
    hostname: os.hostname(),
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    version: APP_VERSION,
  });
});

// Get git status
app.get('/api/status', async (req, res) => {
  try {
    exec('git status --porcelain', (error1, stdout1, stderr1) => {
      if (error1) {
        return res.status(500).json({
          success: false,
          error: 'Failed to get git status',
          details: error1.message || stderr1
        });
      }
      
      exec('git status', (error2, stdout2, stderr2) => {
        if (error2) {
          return res.status(500).json({
            success: false,
            error: 'Failed to get git status',
            details: error2.message || stderr2
          });
        }
        
        res.json({
          success: true,
          changes: stdout1,
          status: stdout2
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get git status',
      details: error.message
    });
  }
});

// Add all changes to staging
app.post('/api/add', async (req, res) => {
  try {
    // First, add a new line to test.txt to ensure there are changes to stage
    const timestamp = new Date().toISOString();
    const newLine = `Test line added at: ${timestamp}\n`;
    
    try {
      await fs.appendFile('test.txt', newLine);
    } catch (fileError) {
      console.warn('Could not append to test.txt:', fileError.message);
      // Continue with git add even if file write fails
    }
    
    exec('git add .', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to add changes',
          details: error.message || stderr
        });
      }
      
      res.json({
        success: true,
        message: 'All changes added to staging area (including new test line)',
        output: stdout
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add changes',
      details: error.message
    });
  }
});

// Create a commit with user-provided message (GS-2). The message is passed to
// git as an argument via execFile, never interpolated into a shell command.
app.post('/api/commit', (req, res) => {
  const { message } = req.body || {};

  if (typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Commit message is required',
      details: 'Provide a non-empty "message" string in the request body'
    });
  }

  child_process.execFile('git', ['commit', '-m', message], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create commit',
        details: stderr || stdout || error.message
      });
    }

    child_process.execFile('git', ['rev-parse', 'HEAD'], (hashError, hashStdout) => {
      res.json({
        success: true,
        message: 'Commit created successfully',
        output: stdout,
        commitMessage: message,
        commitHash: hashError ? null : hashStdout.trim()
      });
    });
  });
});

// Get recent commits 
app.get('/api/log', async (req, res) => {
  try {
    exec('git log --oneline -10', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to get commit log',
          details: error.message || stderr
        });
      }
      
      res.json({
        success: true,
        commits: stdout.split('\n').filter(line => line.trim() !== '')
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get commit log',
      details: error.message
    });
  }
});

// Check if directory is a git repository 
app.get('/api/check-git', async (req, res) => {
  try {
    exec('git rev-parse --git-dir', (error, stdout, stderr) => {
      if (error) {
        return res.json({
          success: false,
          isGitRepo: false,
          message: 'This is not a git repository'
        });
      }
      
      res.json({
        success: true,
        isGitRepo: true,
        message: 'This is a git repository'
      });
    });
  } catch (error) {
    res.json({
      success: false,
      isGitRepo: false,
      message: 'This is not a git repository'
    });
  }
});

// Initialize git repository
app.post('/api/init', async (req, res) => {
  try {
    exec('git init', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to initialize git repository',
          details: error.message || stderr
        });
      }
      
      res.json({
        success: true,
        message: 'Git repository initialized',
        output: stdout
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to initialize git repository',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server when run directly (not when imported by tests)
if (require.main === module) {
  initFeatureFlags().finally(() => {
    app.listen(PORT, () => {
      console.log(`Git commit server running on http://localhost:${String(PORT).replace(/\n|\r/g, '')}`);
      console.log('Available endpoints:');
      console.log('  GET  /                 - Web interface');
      console.log('  GET  /api/status       - Get git status');
      console.log('  GET  /api/log          - Get recent commits');
      console.log('  GET  /api/check-git    - Check if git repo');
      console.log('  POST /api/init         - Initialize git repo');
      console.log('  POST /api/add          - Add all changes');
      console.log('  POST /api/commit       - Create commit');
      console.log('  GET  /api/build-info   - Build/runtime info (flag-gated)');
    });
  });
}

module.exports = app;
