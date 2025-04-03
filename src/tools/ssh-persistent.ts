import { sshSessionManager, SSHConnectionConfig } from './ssh-session-manager.js';

/**
 * Establishes a persistent SSH connection to a remote server
 * 
 * @param args - SSH connection parameters
 * @returns A promise resolving to the session identifier 
 */
export async function sshConnect(args: {
  host: string;
  username: string;
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
  port?: number;
  idleTimeout?: number;
}): Promise<{ sessionId: string }> {
  try {
    // Create connection configuration
    const config: SSHConnectionConfig = {
      host: args.host,
      username: args.username,
      port: args.port || 22,
    };

    // Set authentication method
    if (args.password) {
      config.password = args.password;
    } else if (args.privateKeyPath) {
      config.privateKeyPath = args.privateKeyPath;
      if (args.passphrase) {
        config.passphrase = args.passphrase;
      }
    } else {
      throw new Error('Either password or privateKeyPath must be provided');
    }

    // Create the session
    const sessionId = await sshSessionManager.createSession(config, args.idleTimeout);
    
    return { sessionId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SSH connection error: ${errorMessage}`);
  }
}

/**
 * Executes a command using an established SSH session
 * 
 * @param args - Session identifier and command execution parameters
 * @returns A promise resolving to the output of the command execution
 */
export async function sshRunInSession(args: {
  sessionId: string;
  command: string;
  cwd?: string;
  timeout?: number;
}): Promise<{
  stdout: string;
  stderr: string;
  code: number | null;
}> {
  try {
    const { sessionId, command, cwd } = args;
    
    // Check if the session exists
    if (!sshSessionManager.hasSession(sessionId)) {
      throw new Error(`Invalid or expired SSH session: ${sessionId}`);
    }
    
    // Execute the command
    const options = args.timeout ? { timeout: args.timeout } : undefined;
    const result = await sshSessionManager.executeCommand(sessionId, command, cwd, options);
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SSH command execution error: ${errorMessage}`);
  }
}

/**
 * Uploads a file using an established SSH session
 * 
 * @param args - Session identifier and file upload parameters
 * @returns A promise resolving to a success message
 */
export async function sshUploadInSession(args: {
  sessionId: string;
  localPath: string;
  remotePath: string;
}): Promise<{ message: string }> {
  try {
    const { sessionId, localPath, remotePath } = args;
    
    // Check if the session exists
    if (!sshSessionManager.hasSession(sessionId)) {
      throw new Error(`Invalid or expired SSH session: ${sessionId}`);
    }
    
    // Upload the file
    await sshSessionManager.uploadFile(sessionId, localPath, remotePath);
    
    return { message: `File uploaded successfully to ${remotePath}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SSH file upload error: ${errorMessage}`);
  }
}

/**
 * Downloads a file using an established SSH session
 * 
 * @param args - Session identifier and file download parameters
 * @returns A promise resolving to a success message
 */
export async function sshDownloadInSession(args: {
  sessionId: string;
  localPath: string;
  remotePath: string;
}): Promise<{ message: string }> {
  try {
    const { sessionId, localPath, remotePath } = args;
    
    // Check if the session exists
    if (!sshSessionManager.hasSession(sessionId)) {
      throw new Error(`Invalid or expired SSH session: ${sessionId}`);
    }
    
    // Download the file
    await sshSessionManager.downloadFile(sessionId, localPath, remotePath);
    
    return { message: `File downloaded successfully to ${localPath}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SSH file download error: ${errorMessage}`);
  }
}

/**
 * Closes an established SSH session
 * 
 * @param args - Session identifier
 * @returns A promise resolving to a success message
 */
export async function sshDisconnect(args: {
  sessionId: string;
}): Promise<{ message: string }> {
  try {
    const { sessionId } = args;
    
    // Check if the session exists
    if (!sshSessionManager.hasSession(sessionId)) {
      throw new Error(`Invalid or expired SSH session: ${sessionId}`);
    }
    
    // Close the session
    await sshSessionManager.closeSession(sessionId);
    
    return { message: `SSH session closed successfully` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SSH disconnect error: ${errorMessage}`);
  }
}

/**
 * Lists all active SSH sessions
 * 
 * @returns A promise resolving to an array of session identifiers
 */
export async function sshListSessions(): Promise<{ sessions: string[] }> {
  try {
    // Get all active sessions
    const sessions = sshSessionManager.getActiveSessions();
    
    return { sessions };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SSH session listing error: ${errorMessage}`);
  }
}
