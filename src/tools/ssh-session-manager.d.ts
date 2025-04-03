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
 * Class for managing persistent SSH sessions
 */
export class SSHSessionManager {
  /**
   * Creates a new SSH session and returns the session ID
   */
  createSession(config: SSHConnectionConfig, idleTimeout?: number): Promise<string>;
  
  /**
   * Executes a command in an existing SSH session
   */
  executeCommand(sessionId: string, command: string, cwd?: string, options?: any): Promise<{
    stdout: string;
    stderr: string;
    code: number | null;
  }>;
  
  /**
   * Uploads a file in an existing SSH session
   */
  uploadFile(sessionId: string, localPath: string, remotePath: string): Promise<void>;
  
  /**
   * Downloads a file in an existing SSH session
   */
  downloadFile(sessionId: string, localPath: string, remotePath: string): Promise<void>;
  
  /**
   * Closes an SSH session
   */
  closeSession(sessionId: string): Promise<void>;
  
  /**
   * Checks if a session exists
   */
  hasSession(sessionId: string): boolean;
  
  /**
   * Returns a list of active session IDs
   */
  getActiveSessions(): string[];
  
  /**
   * Closes all active sessions
   */
  closeAllSessions(): Promise<void>;
}

/**
 * Singleton instance of SSH session manager
 */
export const sshSessionManager: SSHSessionManager;
