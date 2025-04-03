import { NodeSSH } from 'node-ssh';

/**
 * Interface for SSH connection configuration
 */
export interface SSHConnectionConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
}

/**
 * Manages persistent SSH sessions for reusing connections
 */
class SSHSessionManager {
  private sessions: Map<string, NodeSSH> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  // Default timeout for auto-disconnecting idle sessions (30 minutes)
  private readonly DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000;

  /**
   * Creates a new SSH session and returns the session ID
   * 
   * @param config - SSH connection configuration
   * @param idleTimeout - Optional timeout in ms to automatically close idle connections
   * @returns A promise that resolves to the session ID
   */
  async createSession(config: SSHConnectionConfig, idleTimeout?: number): Promise<string> {
    try {
      const ssh = new NodeSSH();
      
      // Create connection configuration
      const connectionConfig: any = {
        host: config.host,
        username: config.username,
        port: config.port || 22,
      };

      // Set authentication method
      if (config.password) {
        connectionConfig.password = config.password;
      } else if (config.privateKeyPath) {
        connectionConfig.privateKey = config.privateKeyPath;
        if (config.passphrase) {
          connectionConfig.passphrase = config.passphrase;
        }
      } else {
        throw new Error('Either password or privateKeyPath must be provided');
      }

      // Connect to the server
      await ssh.connect(connectionConfig);
      
      // Generate a unique session ID
      const sessionId = this.generateSessionId(config);
      
      // Store the session
      this.sessions.set(sessionId, ssh);
      
      // Set up auto-disconnect timeout
      this.setupIdleTimeout(sessionId, idleTimeout || this.DEFAULT_IDLE_TIMEOUT);
      
      return sessionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create SSH session: ${errorMessage}`);
    }
  }

  /**
   * Executes a command in an existing SSH session
   * 
   * @param sessionId - The session ID
   * @param command - The command to execute
   * @param cwd - Optional working directory
   * @param options - Optional execution options
   * @returns A promise that resolves to the command execution result
   */
  async executeCommand(sessionId: string, command: string, cwd?: string, options?: any): Promise<{
    stdout: string;
    stderr: string;
    code: number | null;
  }> {
    try {
      // Get the session
      const ssh = this.getSession(sessionId);
      
      // Reset the idle timeout
      this.resetIdleTimeout(sessionId);
      
      // Execute the command
      const execOptions = {
        cwd: cwd || '.',
        ...(options || {})
      };
      
      const result = await ssh.execCommand(command, execOptions);
      
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to execute command in SSH session: ${errorMessage}`);
    }
  }

  /**
   * Uploads a file in an existing SSH session
   * 
   * @param sessionId - The session ID
   * @param localPath - The local file path
   * @param remotePath - The remote file path
   * @returns A promise that resolves when the file is uploaded
   */
  async uploadFile(sessionId: string, localPath: string, remotePath: string): Promise<void> {
    try {
      // Get the session
      const ssh = this.getSession(sessionId);
      
      // Reset the idle timeout
      this.resetIdleTimeout(sessionId);
      
      // Upload the file
      await ssh.putFile(localPath, remotePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload file in SSH session: ${errorMessage}`);
    }
  }

  /**
   * Downloads a file in an existing SSH session
   * 
   * @param sessionId - The session ID
   * @param localPath - The local file path
   * @param remotePath - The remote file path
   * @returns A promise that resolves when the file is downloaded
   */
  async downloadFile(sessionId: string, localPath: string, remotePath: string): Promise<void> {
    try {
      // Get the session
      const ssh = this.getSession(sessionId);
      
      // Reset the idle timeout
      this.resetIdleTimeout(sessionId);
      
      // Download the file
      await ssh.getFile(localPath, remotePath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to download file in SSH session: ${errorMessage}`);
    }
  }

  /**
   * Closes an SSH session
   * 
   * @param sessionId - The session ID
   * @returns A promise that resolves when the session is closed
   */
  async closeSession(sessionId: string): Promise<void> {
    try {
      // Get the session
      const ssh = this.getSession(sessionId);
      
      // Clear any timeout
      this.clearIdleTimeout(sessionId);
      
      // Dispose of the session
      ssh.dispose();
      
      // Remove the session from the map
      this.sessions.delete(sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to close SSH session: ${errorMessage}`);
    }
  }

  /**
   * Checks if a session exists
   * 
   * @param sessionId - The session ID
   * @returns True if the session exists, false otherwise
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Returns a list of active session IDs
   * 
   * @returns Array of session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Closes all active sessions
   * 
   * @returns A promise that resolves when all sessions are closed
   */
  async closeAllSessions(): Promise<void> {
    try {
      const sessionIds = this.getActiveSessions();
      
      await Promise.all(sessionIds.map(sessionId => this.closeSession(sessionId)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to close all SSH sessions: ${errorMessage}`);
    }
  }

  /**
   * Gets a session by ID
   * 
   * @param sessionId - The session ID
   * @returns The SSH session
   * @private
   */
  private getSession(sessionId: string): NodeSSH {
    const ssh = this.sessions.get(sessionId);
    
    if (!ssh) {
      throw new Error(`SSH session not found: ${sessionId}`);
    }
    
    return ssh;
  }

  /**
   * Generates a unique session ID based on connection config
   * 
   * @param config - SSH connection configuration
   * @returns A unique session ID
   * @private
   */
  private generateSessionId(config: SSHConnectionConfig): string {
    const base = `${config.username}@${config.host}:${config.port || 22}`;
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    
    return `${base}-${timestamp}-${random}`;
  }

  /**
   * Sets up an idle timeout for a session
   * 
   * @param sessionId - The session ID
   * @param timeout - The timeout in milliseconds
   * @private
   */
  private setupIdleTimeout(sessionId: string, timeout: number): void {
    // Clear any existing timeout
    this.clearIdleTimeout(sessionId);
    
    // Set a new timeout
    const timeoutId = setTimeout(() => {
      // Close the session if it still exists
      if (this.hasSession(sessionId)) {
        this.closeSession(sessionId).catch(error => {
          console.error(`Error auto-closing SSH session ${sessionId}:`, error);
        });
      }
    }, timeout);
    
    // Store the timeout ID
    this.sessionTimeouts.set(sessionId, timeoutId);
  }

  /**
   * Resets the idle timeout for a session
   * 
   * @param sessionId - The session ID
   * @private
   */
  private resetIdleTimeout(sessionId: string): void {
    const timeoutId = this.sessionTimeouts.get(sessionId);
    
    if (timeoutId) {
      // Get the current timeout duration
      const timeoutDuration = this.DEFAULT_IDLE_TIMEOUT;
      
      // Clear the existing timeout
      clearTimeout(timeoutId);
      
      // Set up a new timeout
      this.setupIdleTimeout(sessionId, timeoutDuration);
    }
  }

  /**
   * Clears the idle timeout for a session
   * 
   * @param sessionId - The session ID
   * @private
   */
  private clearIdleTimeout(sessionId: string): void {
    const timeoutId = this.sessionTimeouts.get(sessionId);
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.sessionTimeouts.delete(sessionId);
    }
  }
}

// Export a singleton instance
export const sshSessionManager = new SSHSessionManager();
