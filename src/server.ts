import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  ExecuteCommandArgsSchema,
  ReadOutputArgsSchema,
  ForceTerminateArgsSchema,
  ListSessionsArgsSchema,
  KillProcessArgsSchema,
  BlockCommandArgsSchema,
  UnblockCommandArgsSchema,
  ReadFileArgsSchema,
  ReadMultipleFilesArgsSchema,
  WriteFileArgsSchema,
  CreateDirectoryArgsSchema,
  ListDirectoryArgsSchema,
  MoveFileArgsSchema,
  SearchFilesArgsSchema,
  GetFileInfoArgsSchema,
  EditBlockArgsSchema,
  SearchCodeArgsSchema,
  SshExecuteCommandArgsSchema,
  SshReadOutputArgsSchema,
  SshForceTerminateArgsSchema,
  SshListCommandSessionsArgsSchema,
  SshUploadFileArgsSchema,
  SshDownloadFileArgsSchema,
} from './tools/schemas.js';
import {
  sshConnectSchema,
  sshRunInSessionSchema,
  sshUploadInSessionSchema,
  sshDownloadInSessionSchema,
  sshDisconnectSchema,
  sshListSessionsSchema,
} from './tools/schemas/ssh-persistent.js';
import { 
  sshExecuteCommand, 
  sshReadOutput, 
  sshForceTerminate, 
  sshListCommandSessions,
  sshUploadFile, 
  sshDownloadFile 
} from './tools/ssh.js';
import { 
  sshConnect, 
  sshRunInSession, 
  sshUploadInSession, 
  sshDownloadInSession, 
  sshDisconnect, 
  sshListSessions 
} from './tools/ssh-persistent.js';

import { VERSION } from './version.js';
import { capture } from "./utils.js";

export const server = new Server(
  {
    name: "desktop-commander",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
      resources: {},  // Add empty resources capability
      prompts: {},    // Add empty prompts capability
    },
  },
);

// Add handler for resources/list method
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  // Return an empty list of resources
  return {
    resources: [],
  };
});

// Add handler for prompts/list method
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  // Return an empty list of prompts
  return {
    prompts: [],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Terminal tools
      {
        name: "execute_command",
        description:
          "Execute a terminal command with timeout. Command will continue running in background if it doesn't complete within timeout.",
        inputSchema: zodToJsonSchema(ExecuteCommandArgsSchema),
      },
      {
        name: "read_output",
        description:
          "Read new output from a running terminal session.",
        inputSchema: zodToJsonSchema(ReadOutputArgsSchema),
      },
      {
        name: "force_terminate",
        description:
          "Force terminate a running terminal session.",
        inputSchema: zodToJsonSchema(ForceTerminateArgsSchema),
      },
      {
        name: "list_sessions",
        description:
          "List all active terminal sessions.",
        inputSchema: zodToJsonSchema(ListSessionsArgsSchema),
      },
      {
        name: "list_processes",
        description:
          "List all running processes. Returns process information including PID, " +
          "command name, CPU usage, and memory usage.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "kill_process",
        description:
          "Terminate a running process by PID. Use with caution as this will " +
          "forcefully terminate the specified process.",
        inputSchema: zodToJsonSchema(KillProcessArgsSchema),
      },
      {
        name: "block_command",
        description:
          "Add a command to the blacklist. Once blocked, the command cannot be executed until unblocked.",
        inputSchema: zodToJsonSchema(BlockCommandArgsSchema),
      },
      {
        name: "unblock_command",
        description:
          "Remove a command from the blacklist. Once unblocked, the command can be executed normally.",
        inputSchema: zodToJsonSchema(UnblockCommandArgsSchema),
      },
      {
        name: "list_blocked_commands",
        description:
          "List all currently blocked commands.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      // Filesystem tools
      {
        name: "read_file",
        description:
          "Read the complete contents of a file from the file system or a URL. " +
          "When reading from the file system, only works within allowed directories. " +
          "Can fetch content from URLs when isUrl parameter is set to true. " +
          "Handles text files normally and image files are returned as viewable images. " +
          "Recognized image types: PNG, JPEG, GIF, WebP.",
        inputSchema: zodToJsonSchema(ReadFileArgsSchema),
      },
      {
        name: "read_multiple_files",
        description:
          "Read the contents of multiple files simultaneously. " +
          "Each file's content is returned with its path as a reference. " +
          "Handles text files normally and renders images as viewable content. " +
          "Recognized image types: PNG, JPEG, GIF, WebP. " +
          "Failed reads for individual files won't stop the entire operation. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ReadMultipleFilesArgsSchema),
      },
      {
        name: "write_file",
        description:
          "Completely replace file contents. Best for large changes (>20% of file) or when edit_block fails. " +
          "Use with caution as it will overwrite existing files. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(WriteFileArgsSchema),
      },
      {
        name: "create_directory",
        description:
          "Create a new directory or ensure a directory exists. Can create multiple " +
          "nested directories in one operation. Only works within allowed directories.",
        inputSchema: zodToJsonSchema(CreateDirectoryArgsSchema),
      },
      {
        name: "list_directory",
        description:
          "Get a detailed listing of all files and directories in a specified path. " +
          "Results distinguish between files and directories with [FILE] and [DIR] prefixes. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(ListDirectoryArgsSchema),
      },
      {
        name: "move_file",
        description:
          "Move or rename files and directories. Can move files between directories " +
          "and rename them in a single operation. Both source and destination must be " +
          "within allowed directories.",
        inputSchema: zodToJsonSchema(MoveFileArgsSchema),
      },
      {
        name: "search_files",
        description:
          "Finds files by name using a case-insensitive substring matching. " +
          "Searches through all subdirectories from the starting path. " +
          "Has a default timeout of 30 seconds which can be customized using the timeoutMs parameter. " +
          "Only searches within allowed directories.",
        inputSchema: zodToJsonSchema(SearchFilesArgsSchema),
      },
      {
        name: "search_code",
        description:
          "Search for text/code patterns within file contents using ripgrep. " +
          "Fast and powerful search similar to VS Code search functionality. " +
          "Supports regular expressions, file pattern filtering, and context lines. " +
          "Has a default timeout of 30 seconds which can be customized. " +
          "Only searches within allowed directories.",
        inputSchema: zodToJsonSchema(SearchCodeArgsSchema),
      },
      {
        name: "get_file_info",
        description:
          "Retrieve detailed metadata about a file or directory including size, " +
          "creation time, last modified time, permissions, and type. " +
          "Only works within allowed directories.",
        inputSchema: zodToJsonSchema(GetFileInfoArgsSchema),
      },
      {
        name: "list_allowed_directories",
        description: 
          "Returns the list of directories that this server is allowed to access.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "edit_block",
        description:
            "Apply surgical text replacements to files. Best for small changes (<20% of file size). " +
            "Call repeatedly to change multiple blocks. Will verify changes after application. " +
            "Format:\nfilepath\n<<<<<<< SEARCH\ncontent to find\n=======\nnew content\n>>>>>>> REPLACE",
        inputSchema: zodToJsonSchema(EditBlockArgsSchema),
      },
      {
        name: "ssh_execute_command",
        description:
          "Execute a command on a remote server over SSH, providing connection details and the command. " +
          "For short commands, returns complete output immediately. For long-running commands, " +
          "transitions to background processing with streaming output. " +
          "Use either password or privateKeyPath for authentication.",
        inputSchema: zodToJsonSchema(SshExecuteCommandArgsSchema),
      },
      {
        name: "ssh_read_output",
        description:
          "Read new output from a running SSH command session. " +
          "Use the session ID returned from ssh_execute_command for long-running commands.",
        inputSchema: zodToJsonSchema(SshReadOutputArgsSchema),
      },
      {
        name: "ssh_force_terminate",
        description:
          "Force terminate a running SSH command session. " +
          "Use the session ID returned from ssh_execute_command for long-running commands.",
        inputSchema: zodToJsonSchema(SshForceTerminateArgsSchema),
      },
      {
        name: "ssh_list_command_sessions",
        description:
          "List all active SSH command sessions.",
        inputSchema: zodToJsonSchema(SshListCommandSessionsArgsSchema),
      },
      {
        name: "ssh_upload_file",
        description:
          "Upload a file to a remote server over SSH/SFTP. " +
          "Transfers a file from the local file system to a remote server. " +
          "Use either password or privateKeyPath for authentication.",
        inputSchema: zodToJsonSchema(SshUploadFileArgsSchema),
      },
      {
        name: "ssh_download_file",
        description:
          "Download a file from a remote server over SSH/SFTP. " +
          "Transfers a file from a remote server to the local file system. " +
          "Use either password or privateKeyPath for authentication.",
        inputSchema: zodToJsonSchema(SshDownloadFileArgsSchema),
      },
      {
        name: "ssh_connect",
        description:
          "Establishes a connection to a remote server over SSH and returns a session identifier. " +
          "The session can be reused for subsequent commands without re-authentication. " +
          "Use either password or privateKeyPath for authentication.",
        inputSchema: zodToJsonSchema(sshConnectSchema),
      },
      {
        name: "ssh_run_in_session",
        description:
          "Execute a command on a remote server using an established SSH session. " +
          "Requires a session identifier returned from ssh_connect.",
        inputSchema: zodToJsonSchema(sshRunInSessionSchema),
      },
      {
        name: "ssh_upload_in_session",
        description:
          "Upload a file to a remote server using an established SSH session. " +
          "Requires a session identifier returned from ssh_connect.",
        inputSchema: zodToJsonSchema(sshUploadInSessionSchema),
      },
      {
        name: "ssh_download_in_session",
        description:
          "Download a file from a remote server using an established SSH session. " +
          "Requires a session identifier returned from ssh_connect.",
        inputSchema: zodToJsonSchema(sshDownloadInSessionSchema),
      },
      {
        name: "ssh_disconnect",
        description:
          "Close an established SSH session. " +
          "Requires a session identifier returned from ssh_connect.",
        inputSchema: zodToJsonSchema(sshDisconnectSchema),
      },
      {
        name: "ssh_list_sessions",
        description:
          "List all active SSH sessions.",
        inputSchema: zodToJsonSchema(sshListSessionsSchema),
      },
    ],
  };
});

import * as handlers from './handlers/index.js';
import { ServerResult } from './types.js';

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<ServerResult> => {
  try {
    const { name, arguments: args } = request.params;
    capture('server_call_tool');
    // Add a single dynamic capture for the specific tool
    capture('server_' + name);
    
    // Using a more structured approach with dedicated handlers
    switch (name) {
      // Terminal tools
      case "execute_command":
        return handlers.handleExecuteCommand(args);
        
      case "read_output":
        return handlers.handleReadOutput(args);
        
      case "force_terminate":
        return handlers.handleForceTerminate(args);
        
      case "list_sessions":
        return handlers.handleListSessions();
        
      // Process tools
      case "list_processes":
        return handlers.handleListProcesses();
        
      case "kill_process":
        return handlers.handleKillProcess(args);
        
      // Command management tools
      case "block_command":
        return handlers.handleBlockCommand(args);
        
      case "unblock_command":
        return handlers.handleUnblockCommand(args);
        
      case "list_blocked_commands":
        return handlers.handleListBlockedCommands();
        
      // Filesystem tools
      case "read_file":
        return handlers.handleReadFile(args);
        
      case "read_multiple_files":
        return handlers.handleReadMultipleFiles(args);
        
      case "write_file":
        return handlers.handleWriteFile(args);
        
      case "create_directory":
        return handlers.handleCreateDirectory(args);
        
      case "list_directory":
        return handlers.handleListDirectory(args);
        
      case "move_file":
        return handlers.handleMoveFile(args);
        
      case "search_files":
        return handlers.handleSearchFiles(args);
        
      case "search_code":
        return handlers.handleSearchCode(args);
        
      case "get_file_info":
        return handlers.handleGetFileInfo(args);
        
      case "list_allowed_directories":
        return handlers.handleListAllowedDirectories();
        
      case "edit_block":
        return handlers.handleEditBlock(args);
      case "ssh_execute_command": {
        capture('server_ssh_execute_command');
        try {
          const parsed = SshExecuteCommandArgsSchema.parse(args);
          const result = await sshExecuteCommand(parsed);
          
          // Type guard to narrow down the result type
          if ('isStreaming' in result && result.isStreaming) {
            // We know this is a streaming result type with these properties
            const streamingResult = result as { 
              id: string; 
              initialOutput: string; 
              isStreaming: boolean;
              code: null;
              success: null;
            };
            
            // Format streaming response for long-running commands
            let responseText = `SSH Command Execution (STREAMING): ${parsed.command}\n`;
            responseText += `Host: ${parsed.host}:${parsed.port} as ${parsed.username}\n`;
            responseText += `Session ID: ${streamingResult.id}\n\n`;
            responseText += `Initial Output:\n${streamingResult.initialOutput || '(no output yet)'}\n\n`;
            responseText += `Command is running in the background. Use ssh_read_output with Session ID to get more output.\n`;
            responseText += `Use ssh_force_terminate with Session ID to stop the command if needed.`;
            
            return {
              content: [{ type: "text", text: responseText }],
            };
          } else {
            // We know this is a completed result type with these properties
            const completedResult = result as {
              stdout: string;
              stderr: string;
              code: number;
              success: boolean;
            };
            
            // Format immediate response for completed commands
            let responseText = `SSH Command Execution (COMPLETED): ${parsed.command}\n`;
            responseText += `Host: ${parsed.host}:${parsed.port} as ${parsed.username}\n`;
            responseText += `Exit Code: ${completedResult.code}\n`;
            responseText += `Success: ${completedResult.success ? 'Yes' : 'No'}\n\n`;
            
            // Add output
            responseText += `===== OUTPUT =====\n${completedResult.stdout || '(no output)'}\n`;
            
            // Add stderr if separate and exists
            if (completedResult.stderr) {
              responseText += `\n===== STDERR =====\n${completedResult.stderr}\n`;
            }
            
            return {
              content: [{ type: "text", text: responseText }],
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }

      case "ssh_read_output": {
        capture('server_ssh_read_output');
        try {
          const parsed = SshReadOutputArgsSchema.parse(args);
          const result = await sshReadOutput(parsed.id);
          
          let responseText = result.found 
            ? `SSH Command Output for Session ${parsed.id}:\n\n${result.output}`
            : `Error: ${result.output}`;
          
          return {
            content: [{ type: "text", text: responseText }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH Read Output Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "ssh_force_terminate": {
        capture('server_ssh_force_terminate');
        try {
          const parsed = SshForceTerminateArgsSchema.parse(args);
          const result = await sshForceTerminate(parsed.id);
          
          return {
            content: [{ type: "text", text: result.message }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH Force Terminate Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "ssh_list_command_sessions": {
        capture('server_ssh_list_command_sessions');
        try {
          const result = await sshListCommandSessions();
          
          let responseText = "Active SSH Command Sessions:\n";
          if (result.sessions.length === 0) {
            responseText += "No active SSH command sessions.";
          } else {
            result.sessions.forEach(session => {
              responseText += `- Session ID: ${session.id}, Runtime: ${session.runtimeSeconds}s\n`;
            });
          }
          
          return {
            content: [{ type: "text", text: responseText }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH List Command Sessions Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "ssh_upload_file": {
        capture('server_ssh_upload_file');
        try {
          const parsed = SshUploadFileArgsSchema.parse(args);
          const result = await sshUploadFile(parsed);
          
          // Format the response in a user-friendly way
          let responseText = `SSH File Upload\n`;
          responseText += `Host: ${parsed.host}:${parsed.port} as ${parsed.username}\n`;
          responseText += `Local Path: ${parsed.localPath}\n`;
          responseText += `Remote Path: ${parsed.remotePath}\n`;
          responseText += `Result: ${result.success ? 'Success' : 'Failed'}\n`;
          responseText += `Message: ${result.message}\n`;
          
          return {
            content: [{ type: "text", text: responseText }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH Upload Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "ssh_download_file": {
        capture('server_ssh_download_file');
        try {
          const parsed = SshDownloadFileArgsSchema.parse(args);
          const result = await sshDownloadFile(parsed);
          
          // Format the response in a user-friendly way
          let responseText = `SSH File Download\n`;
          responseText += `Host: ${parsed.host}:${parsed.port} as ${parsed.username}\n`;
          responseText += `Remote Path: ${parsed.remotePath}\n`;
          responseText += `Local Path: ${parsed.localPath}\n`;
          responseText += `Result: ${result.success ? 'Success' : 'Failed'}\n`;
          responseText += `Message: ${result.message}\n`;
          
          return {
            content: [{ type: "text", text: responseText }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH Download Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      // Persistent SSH Session tools
      case "ssh_connect": {
        capture('server_ssh_connect');
        try {
          const parsed = sshConnectSchema.parse(args);
          const result = await sshConnect(parsed);
          
          return {
            content: [{ 
              type: "text", 
              text: `SSH Connection Established\nSession ID: ${result.sessionId}\n\nUse this session ID for subsequent SSH operations.` 
            }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH Connection Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "ssh_run_in_session": {
        capture('server_ssh_run_in_session');
        try {
          const parsed = sshRunInSessionSchema.parse(args);
          const result = await sshRunInSession(parsed);
          
          // Format the response in a user-friendly way
          let responseText = `SSH Command Execution in Session: ${parsed.sessionId}\n`;
          responseText += `Command: ${parsed.command}\n`;
          responseText += `Exit Code: ${result.code}\n\n`;
          
          // Add stdout if it exists
          if (result.stdout) {
            responseText += `===== STDOUT =====\n${result.stdout}\n`;
          }
          
          // Add stderr if it exists
          if (result.stderr) {
            responseText += `\n===== STDERR =====\n${result.stderr}\n`;
          }
          
          return {
            content: [{ type: "text", text: responseText }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH Command Execution Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "ssh_upload_in_session": {
        capture('server_ssh_upload_in_session');
        try {
          const parsed = sshUploadInSessionSchema.parse(args);
          const result = await sshUploadInSession(parsed);
          
          return {
            content: [{ type: "text", text: result.message }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH File Upload Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "ssh_download_in_session": {
        capture('server_ssh_download_in_session');
        try {
          const parsed = sshDownloadInSessionSchema.parse(args);
          const result = await sshDownloadInSession(parsed);
          
          return {
            content: [{ type: "text", text: result.message }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH File Download Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "ssh_disconnect": {
        capture('server_ssh_disconnect');
        try {
          const parsed = sshDisconnectSchema.parse(args);
          const result = await sshDisconnect(parsed);
          
          return {
            content: [{ type: "text", text: result.message }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH Disconnect Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
      
      case "ssh_list_sessions": {
        capture('server_ssh_list_sessions');
        try {
          const result = await sshListSessions();
          
          let responseText = "Active SSH Sessions:\n";
          if (result.sessions.length === 0) {
            responseText += "No active SSH sessions.";
          } else {
            result.sessions.forEach(sessionId => {
              responseText += `- ${sessionId}\n`;
            });
          }
          
          return {
            content: [{ type: "text", text: responseText }],
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text", text: `SSH List Sessions Error: ${errorMessage}` }],
            isError: true,
          };
        }
      }
        
      default:
        capture('server_unknown_tool', { name });
        return {
          content: [{ type: "text", text: `Error: Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    capture('server_request_error', {
        error: errorMessage
    });
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});