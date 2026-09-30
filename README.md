# Git Commit Server

A Node.js Express server that provides a web interface and REST API for creating git commits with user-provided commit messages.

## Features

- 🌐 **Web Interface**: Modern, responsive UI for git operations
- 🔧 **REST API**: Programmatic access to git operations
- 📝 **Custom Commit Messages**: Create commits with user-provided messages
- 📊 **Git Status**: Check repository status and recent commits
- 🚀 **Easy Setup**: Simple installation and configuration

## Installation

1. **Clone or download this project**
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

## Usage

### Web Interface

Visit `http://localhost:3000` to access the web interface where you can:

- Check if the current directory is a git repository
- Initialize a new git repository
- View git status and recent commits
- Add changes to staging area
- Create commits with custom messages

### REST API Endpoints

#### GET `/api/check-git`
Check if the current directory is a git repository.

**Response:**
```json
{
  "success": true,
  "isGitRepo": true,
  "message": "This is a git repository"
}
```

#### POST `/api/init`
Initialize a new git repository.

**Response:**
```json
{
  "success": true,
  "message": "Git repository initialized",
  "output": "Initialized empty Git repository..."
}
```

#### GET `/api/status`
Get the current git status.

**Response:**
```json
{
  "success": true,
  "changes": "M  server.js\n?? newfile.txt",
  "status": "On branch main\nChanges not staged for commit..."
}
```

#### POST `/api/add`
Append a timestamped line to `test.txt` (so there is always something to stage), then stage all changes.

**Response:**
```json
{
  "success": true,
  "message": "All changes added to staging area",
  "output": ""
}
```

#### POST `/api/commit`
Create a commit with a user-provided message.

**Request Body:**
```json
{
  "message": "Your commit message here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Commit created successfully",
  "output": "[main abc1234] Your commit message here\n 2 files changed, 10 insertions(+)",
  "commitMessage": "Your commit message here"
}
```

#### GET `/api/log`
Get the 10 most recent commits.

**Response:**
```json
{
  "success": true,
  "commits": [
    "abc1234 Your commit message here",
    "def5678 Previous commit message",
    "..."
  ]
}
```

#### GET `/api/version`
Get the app version from the `VERSION` file.

**Response:**
```json
{
  "version": "1.7"
}
```

#### GET `/api/build-info`
Get build and runtime info (namespace, hostname, Node.js version, uptime, version). Returns `404` unless the `show-build-info` feature flag is on.

## Example Usage with curl

```bash
# Check if git repository
curl http://localhost:3000/api/check-git

# Initialize git repository
curl -X POST http://localhost:3000/api/init

# Get git status
curl http://localhost:3000/api/status

# Add all changes
curl -X POST http://localhost:3000/api/add

# Create a commit
curl -X POST http://localhost:3000/api/commit \
  -H "Content-Type: application/json" \
  -d '{"message": "Add new feature"}'

# Get recent commits
curl http://localhost:3000/api/log
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Missing or invalid commit message
- `500 Internal Server Error`: Git command failed or other server errors

Error responses include details about what went wrong:

```json
{
  "success": false,
  "error": "Failed to create commit",
  "details": "nothing to commit, working tree clean"
}
```

## Security Considerations

- The server executes git commands in the current working directory
- Commit messages are passed to git as a single argument (`execFile`), never through a shell, to prevent command injection
- The server should only be run in trusted environments
- Consider adding authentication for production use

## Requirements

- Node.js 22 or higher (CI tests on Node 22 and 24)
- Git installed and available in PATH
- A git repository (or ability to initialize one)

## Development

The project includes:
- `server.js`: Main Express server
- `public/index.html`: Web interface
- `package.json`: Dependencies and scripts
- `README.md`: This documentation

For development, use `npm run dev` to start the server with automatic restart on file changes. Run the tests with `npm test`.

Environment variables:
- `PORT`: port to listen on (default `3000`)
- `ROX_SDK_KEY`: CloudBees feature flag SDK key; when unset, flags keep their default values

## License

MIT License 