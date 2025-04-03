/**
 * Establishes a persistent SSH connection to a remote server
 */
export function sshConnect(args: {
  host: string;
  username: string;
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
  port?: number;
  idleTimeout?: number;
}): Promise<{ sessionId: string }>;

/**
 * Executes a command using an established SSH session
 */
export function sshRunInSession(args: {
  sessionId: string;
  command: string;
  cwd?: string;
  timeout?: number;
}): Promise<{
  stdout: string;
  stderr: string;
  code: number | null;
}>;

/**
 * Uploads a file using an established SSH session
 */
export function sshUploadInSession(args: {
  sessionId: string;
  localPath: string;
  remotePath: string;
}): Promise<{ message: string }>;

/**
 * Downloads a file using an established SSH session
 */
export function sshDownloadInSession(args: {
  sessionId: string;
  localPath: string;
  remotePath: string;
}): Promise<{ message: string }>;

/**
 * Closes an established SSH session
 */
export function sshDisconnect(args: {
  sessionId: string;
}): Promise<{ message: string }>;

/**
 * Lists all active SSH sessions
 */
export function sshListSessions(): Promise<{ sessions: string[] }>;
