# Persistent SSH Sessions

This document provides an overview of the persistent SSH session functionality added to Desktop Commander MCP.

## Purpose

The persistent SSH sessions feature allows Claude to establish an SSH connection to a remote server once and run multiple commands within that same session. This improves efficiency and reduces overhead for multi-step remote tasks by avoiding the need to re-authenticate for each command.

## Available Functions

### ssh_connect

Establishes a persistent SSH connection to a remote server and returns a session identifier.

**Parameters:**
- `host` (string, required): The hostname or IP address of the remote server
- `username` (string, required): The username for SSH authentication
- `password` (string, optional): The password for SSH authentication
- `privateKeyPath` (string, optional): Path to the private key file for SSH authentication
- `passphrase` (string, optional): Passphrase for the private key if it is encrypted
- `port` (number, optional, default: 22): The SSH port number
- `idleTimeout` (number, optional): Timeout in milliseconds after which the session will be automatically closed if idle

**Note:** Either `password` or `privateKeyPath` must be provided.

**Returns:**
```json
{
  "sessionId": "username@host:port-timestamp-random"
}
```

### ssh_run_in_session

Executes a command using an established SSH session.

**Parameters:**
- `sessionId` (string, required): The session identifier returned from ssh_connect
- `command` (string, required): Command to execute on the remote server
- `cwd` (string, optional): Working directory on the remote server
- `timeout` (number, optional): Timeout for the command execution in milliseconds

**Returns:**
```json
{
  "stdout": "command output",
  "stderr": "error output if any",
  "code": 0
}
```

### ssh_upload_in_session

Uploads a file using an established SSH session.

**Parameters:**
- `sessionId` (string, required): The session identifier returned from ssh_connect
- `localPath` (string, required): Path to the local file to upload
- `remotePath` (string, required): Path on the remote server where the file will be uploaded

**Returns:**
```json
{
  "message": "File uploaded successfully to /path/to/remote/file"
}
```

### ssh_download_in_session

Downloads a file using an established SSH session.

**Parameters:**
- `sessionId` (string, required): The session identifier returned from ssh_connect
- `localPath` (string, required): Path on the local system where the file will be saved
- `remotePath` (string, required): Path to the file on the remote server to download

**Returns:**
```json
{
  "message": "File downloaded successfully to /path/to/local/file"
}
```

### ssh_disconnect

Closes an established SSH session.

**Parameters:**
- `sessionId` (string, required): The session identifier returned from ssh_connect

**Returns:**
```json
{
  "message": "SSH session closed successfully"
}
```

### ssh_list_sessions

Lists all active SSH sessions.

**Parameters:** None

**Returns:**
```json
{
  "sessions": [
    "username@host:port-timestamp-random1",
    "username@host:port-timestamp-random2"
  ]
}
```

## Usage Example

Here's an example of how to use these functions together:

```javascript
// Establish a connection
const connectResult = await tools.ssh_connect({
  host: 'example.com',
  username: 'user',
  password: 'password'
});

// Get the session ID
const sessionId = connectResult.sessionId;

// Run multiple commands in the same session
const lsResult = await tools.ssh_run_in_session({
  sessionId,
  command: 'ls -la'
});

const upTimeResult = await tools.ssh_run_in_session({
  sessionId,
  command: 'uptime'
});

// Upload a file
await tools.ssh_upload_in_session({
  sessionId,
  localPath: '/path/to/local/file',
  remotePath: '/path/to/remote/file'
});

// Execute a command using the uploaded file
await tools.ssh_run_in_session({
  sessionId,
  command: 'cat /path/to/remote/file'
});

// When finished, close the session
await tools.ssh_disconnect({
  sessionId
});
```

## Error Handling

All functions include appropriate error handling for scenarios such as:
- Invalid session IDs
- Disconnected sessions
- Connection failures
- Command execution failures
- File transfer errors

In case of an error, the functions will throw an exception with a descriptive message.

## Auto-Disconnection

Sessions are automatically closed after a period of inactivity (default: 30 minutes). This helps prevent resource leaks from unused but still active connections. The idle timeout can be configured when creating a session with the `idleTimeout` parameter.

## Security Considerations

- SSH credentials should be handled with care and not exposed in logs or error messages
- Private key paths should be validated to ensure they exist and have appropriate permissions
- Commands executed through SSH should be validated to prevent command injection
- Sessions should be explicitly disconnected when no longer needed
