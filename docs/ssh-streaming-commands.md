# Streaming Output for Long-Running SSH Commands

This document provides an overview of the streaming output functionality for SSH commands in Desktop Commander MCP.

## Purpose

The streaming output feature for SSH commands allows Claude to execute commands on remote servers and get immediate results for short commands, while providing a streaming output mechanism for long-running commands. This ensures quick results for simple operations and efficient monitoring of progress for time-consuming tasks.

## Behavior

The `ssh_execute_command` tool automatically detects whether a command completes quickly or runs for an extended period:

1. **Short-Running Commands:** If a command completes within a short internal timeout (default: 2 seconds), the tool returns the complete output, including exit code and success status, in a single response.

2. **Long-Running Commands:** If a command exceeds the internal timeout, it transitions to background processing and returns:
   - A unique session ID for the command
   - Any initial output captured before the timeout
   - A notification that the command is running in the background

In the second scenario, Claude can use follow-up tools to interact with the running command.

## Available Functions

### ssh_execute_command

Executes a command on a remote server over SSH with automatic detection for short vs. long-running commands.

**Parameters:**
- `host` (string, required): Remote server hostname or IP address
- `username` (string, required): SSH username
- `password` (string, optional): SSH password
- `privateKeyPath` (string, optional): Path to private key file
- `command` (string, required): Command to execute
- `port` (number, optional, default: 22): SSH port
- `cwd` (string, optional): Working directory on remote server
- `timeout` (number, optional): Overall command timeout
- `internalTimeout` (number, optional, default: 2000): Timeout in milliseconds to determine if a command is short or long-running

**Note:** Either `password` or `privateKeyPath` must be provided.

**Returns for Short-Running Commands:**
```json
{
  "stdout": "command output",
  "stderr": "error output if any",
  "code": 0,
  "success": true
}
```

**Returns for Long-Running Commands:**
```json
{
  "id": "ssh-cmd-timestamp-counter",
  "initialOutput": "initial command output",
  "isStreaming": true,
  "code": null,
  "success": null
}
```

### ssh_read_output

Reads new output from a running SSH command session.

**Parameters:**
- `id` (string, required): Command session ID returned from ssh_execute_command

**Returns:**
```json
{
  "output": "new output or completion message",
  "found": true
}
```

### ssh_force_terminate

Forcefully terminates a running SSH command session.

**Parameters:**
- `id` (string, required): Command session ID returned from ssh_execute_command

**Returns:**
```json
{
  "success": true,
  "message": "Successfully terminated SSH command session ..."
}
```

### ssh_list_command_sessions

Lists all active SSH command sessions.

**Parameters:** None

**Returns:**
```json
{
  "sessions": [
    {
      "id": "ssh-cmd-timestamp-counter1",
      "runtimeSeconds": 10
    },
    {
      "id": "ssh-cmd-timestamp-counter2",
      "runtimeSeconds": 25
    }
  ]
}
```

## Usage Example

Here's an example of how to use these functions together:

```javascript
// Execute a command that might take a long time
const result = await tools.ssh_execute_command({
  host: 'example.com',
  username: 'user',
  password: 'password',
  command: 'find / -name "*.log"'
});

// Check if command is running in background
if (result.isStreaming) {
  // Get session ID
  const sessionId = result.id;
  
  // Periodically check for new output
  const output1 = await tools.ssh_read_output({
    id: sessionId
  });
  
  console.log(output1.output);
  
  // Check again later
  const output2 = await tools.ssh_read_output({
    id: sessionId
  });
  
  console.log(output2.output);
  
  // If needed, terminate the command
  await tools.ssh_force_terminate({
    id: sessionId
  });
} else {
  // Command completed quickly, output is already available
  console.log(result.stdout);
}
```

## Implementation Details

- SSH commands are executed through a dedicated SSH Command Manager that tracks command execution sessions.
- The internal timeout mechanism reliably differentiates between short and long-running commands.
- For long-running commands, output is buffered and can be retrieved incrementally.
- SSH connections for terminated commands are properly cleaned up to avoid resource leaks.
- Command completion status (exit code, runtime) is tracked and reported when the command finishes.

## Automatic Session Cleanup

Sessions for completed commands are automatically cleaned up. The system maintains a record of recently completed commands (up to 100) to provide completion information if requested after a command has finished.
