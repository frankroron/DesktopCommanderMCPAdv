import { NodeSSH } from 'node-ssh';

export interface SSHCommandExecutionResult {
  id: string;
  output: string;
  isBlocked: boolean;
  exitCode: number | null;
}

export class SSHCommandManager {
  /**
   * Execute a command over SSH with streaming support for long-running commands
   */
  executeCommand(
    ssh: NodeSSH,
    command: string,
    cwd?: string,
    timeout?: number
  ): Promise<SSHCommandExecutionResult>;

  /**
   * Get new output from a running SSH command session
   */
  getNewOutput(sessionId: string): string | null;

  /**
   * Force terminate a running SSH command
   */
  forceTerminate(sessionId: string): boolean;

  /**
   * List all active SSH command sessions
   */
  listActiveSessions(): Array<{
    id: string;
    isBlocked: boolean;
    runtime: number;
  }>;
}

export const sshCommandManager: SSHCommandManager;
