import { NodeSSH } from 'node-ssh';

interface SSHCommandSession {
  id: string;
  ssh: NodeSSH;
  stdout: string;
  stderr: string;
  lastOutput: string;
  isCompleted: boolean;
  exitCode: number | null;
  isBlocked: boolean;
  startTime: Date;
}

export interface SSHCommandExecutionResult {
  id: string;
  output: string;
  isBlocked: boolean;
  exitCode: number | null;
}

interface CompletedSSHCommand {
  id: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startTime: Date;
  endTime: Date;
}

/**
 * Manages SSH command execution sessions
 */
export class SSHCommandManager {
  private sessions: Map<string, SSHCommandSession> = new Map();
  private completedSessions: Map<string, CompletedSSHCommand> = new Map();
  private sessionCounter: number = 0;

  /**
   * Execute a command over SSH with streaming support for long-running commands
   * 
   * @param ssh - NodeSSH instance
   * @param command - Command to execute
   * @param cwd - Optional working directory
   * @param timeout - Short internal timeout to determine if command finishes quickly
   * @returns Promise resolving to command execution result
   */
  async executeCommand(
    ssh: NodeSSH,
    command: string,
    cwd?: string,
    timeout: number = 2000
  ): Promise<SSHCommandExecutionResult> {
    // Create a unique ID for this command session
    const sessionId = this.generateSessionId();
    
    // Initialize output collectors
    let stdout = '';
    let stderr = '';
    
    // Create the session object
    const session: SSHCommandSession = {
      id: sessionId,
      ssh,
      stdout: '',
      stderr: '',
      lastOutput: '',
      isCompleted: false,
      exitCode: null,
      isBlocked: false,
      startTime: new Date()
    };
    
    // Store the session
    this.sessions.set(sessionId, session);
    
    return new Promise((resolve) => {
      // Create an SSH command execution with event handlers
      const execOptions = {
        cwd: cwd || '.',
        onStdout: (chunk: Buffer) => {
          const text = chunk.toString();
          stdout += text;
          session.stdout += text;
          session.lastOutput += text;
        },
        onStderr: (chunk: Buffer) => {
          const text = chunk.toString();
          stderr += text;
          session.stderr += text;
          session.lastOutput += text;
        }
      };
      
      // Start the SSH command
      const execPromise = ssh.execCommand(command, execOptions);
      
      // Setup timeout to check if command finishes quickly
      const timeoutId = setTimeout(() => {
        // If we're still running after timeout, mark as blocked/streaming
        if (!session.isCompleted) {
          session.isBlocked = true;
          resolve({
            id: sessionId,
            output: stdout + stderr,
            isBlocked: true,
            exitCode: null
          });
        }
      }, timeout);
      
      // Handle command completion
      execPromise.then(result => {
        // Clear the timeout if it hasn't fired yet
        clearTimeout(timeoutId);
        
        // Update session status
        session.isCompleted = true;
        session.exitCode = result.code;
        
        // Add any final output not captured by event handlers
        if (result.stdout && !stdout.includes(result.stdout)) {
          stdout += result.stdout;
          session.stdout += result.stdout;
          session.lastOutput += result.stdout;
        }
        
        if (result.stderr && !stderr.includes(result.stderr)) {
          stderr += result.stderr;
          session.stderr += result.stderr;
          session.lastOutput += result.stderr;
        }
        
        // If the command completed before the timeout, resolve immediately
        if (!session.isBlocked) {
          resolve({
            id: sessionId,
            output: stdout + stderr,
            isBlocked: false,
            exitCode: result.code
          });
          
          // Store as completed session and remove from active sessions
          this.storeCompletedSession(sessionId);
        }
      }).catch(error => {
        // Clear the timeout if it hasn't fired yet
        clearTimeout(timeoutId);
        
        // Update session status with error
        session.isCompleted = true;
        session.exitCode = 1;
        
        const errorMessage = `Error executing SSH command: ${error.message}`;
        stderr += errorMessage;
        session.stderr += errorMessage;
        session.lastOutput += errorMessage;
        
        // If the command errored before the timeout, resolve immediately
        if (!session.isBlocked) {
          resolve({
            id: sessionId,
            output: stdout + stderr,
            isBlocked: false,
            exitCode: 1
          });
          
          // Store as completed session and remove from active sessions
          this.storeCompletedSession(sessionId);
        }
      });
    });
  }

  /**
   * Get new output from a running SSH command session
   * 
   * @param sessionId - The session ID
   * @returns New output or completion message
   */
  getNewOutput(sessionId: string): string | null {
    // Check active sessions
    const session = this.sessions.get(sessionId);
    if (session) {
      // If session just completed, move to completed sessions
      if (session.isCompleted && session.isBlocked) {
        this.storeCompletedSession(sessionId);
        
        // Return completion message
        const runtime = (new Date().getTime() - session.startTime.getTime()) / 1000;
        return `SSH Command completed with exit code ${session.exitCode}\nRuntime: ${runtime}s\nFinal output:\n${session.stdout}${session.stderr ? '\nErrors:\n' + session.stderr : ''}`;
      }
      
      // Return any new output and clear the buffer
      const output = session.lastOutput;
      session.lastOutput = '';
      return output || 'No new output available';
    }
    
    // Check completed sessions
    const completedSession = this.completedSessions.get(sessionId);
    if (completedSession) {
      // Format completion message
      const runtime = (completedSession.endTime.getTime() - completedSession.startTime.getTime()) / 1000;
      return `SSH Command completed with exit code ${completedSession.exitCode}\nRuntime: ${runtime}s\nFinal output:\n${completedSession.stdout}${completedSession.stderr ? '\nErrors:\n' + completedSession.stderr : ''}`;
    }
    
    return null;
  }

  /**
   * Force terminate a running SSH command
   * 
   * @param sessionId - The session ID
   * @returns True if successful, false if session not found
   */
  forceTerminate(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    
    try {
      // NodeSSH doesn't have a direct way to terminate commands,
      // but we can mark it as completed and store it
      session.isCompleted = true;
      session.exitCode = 130; // Standard exit code for SIGINT
      session.lastOutput += '\nCommand terminated by user.';
      
      // Store as completed and remove from active sessions
      this.storeCompletedSession(sessionId);
      
      return true;
    } catch (error) {
      console.error(`Failed to terminate SSH command ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * List all active SSH command sessions
   * 
   * @returns Array of active session information
   */
  listActiveSessions(): Array<{
    id: string;
    isBlocked: boolean;
    runtime: number;
  }> {
    const now = new Date();
    return Array.from(this.sessions.entries())
      .filter(([_, session]) => session.isBlocked && !session.isCompleted)
      .map(([id, session]) => ({
        id,
        isBlocked: session.isBlocked,
        runtime: now.getTime() - session.startTime.getTime()
      }));
  }

  /**
   * Generate a unique session ID
   * 
   * @returns A unique session ID
   * @private
   */
  private generateSessionId(): string {
    this.sessionCounter++;
    const timestamp = Date.now();
    return `ssh-cmd-${timestamp}-${this.sessionCounter}`;
  }

  /**
   * Store a session as completed and remove from active sessions
   * 
   * @param sessionId - The session ID to store as completed
   * @private
   */
  private storeCompletedSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Store in completed sessions
    this.completedSessions.set(sessionId, {
      id: sessionId,
      stdout: session.stdout,
      stderr: session.stderr,
      exitCode: session.exitCode,
      startTime: session.startTime,
      endTime: new Date()
    });
    
    // Remove from active sessions
    this.sessions.delete(sessionId);
    
    // Limit stored completed sessions
    if (this.completedSessions.size > 100) {
      const oldestKey = Array.from(this.completedSessions.keys())[0];
      this.completedSessions.delete(oldestKey);
    }
  }
}

// Export a singleton instance
export const sshCommandManager = new SSHCommandManager();
