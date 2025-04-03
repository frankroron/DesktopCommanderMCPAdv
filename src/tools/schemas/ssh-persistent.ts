import { z } from 'zod';

// SSH Connect Schema
export const sshConnectSchema = z.object({
  host: z.string().describe('The hostname or IP address of the remote server'),
  username: z.string().describe('The username for SSH authentication'),
  password: z.string().optional().describe('The password for SSH authentication'),
  privateKeyPath: z.string().optional().describe('Path to the private key file for SSH authentication'),
  passphrase: z.string().optional().describe('Passphrase for the private key if it is encrypted'),
  port: z.number().default(22).describe('The SSH port number (default: 22)'),
  idleTimeout: z.number().optional().describe('Optional timeout in milliseconds after which the session will be automatically closed if idle'),
}).refine(data => data.password || data.privateKeyPath, {
  message: 'Either password or privateKeyPath must be provided',
});

// SSH Run in Session Schema
export const sshRunInSessionSchema = z.object({
  sessionId: z.string().describe('The session identifier returned from ssh_connect'),
  command: z.string().describe('Command to execute on the remote server'),
  cwd: z.string().optional().describe('Working directory on the remote server'),
  timeout: z.number().optional().describe('Timeout for the command execution in milliseconds'),
});

// SSH Upload in Session Schema
export const sshUploadInSessionSchema = z.object({
  sessionId: z.string().describe('The session identifier returned from ssh_connect'),
  localPath: z.string().describe('Path to the local file to upload'),
  remotePath: z.string().describe('Path on the remote server where the file will be uploaded'),
});

// SSH Download in Session Schema
export const sshDownloadInSessionSchema = z.object({
  sessionId: z.string().describe('The session identifier returned from ssh_connect'),
  localPath: z.string().describe('Path on the local system where the file will be saved'),
  remotePath: z.string().describe('Path to the file on the remote server to download'),
});

// SSH Disconnect Schema
export const sshDisconnectSchema = z.object({
  sessionId: z.string().describe('The session identifier returned from ssh_connect'),
});

// SSH List Sessions Schema
export const sshListSessionsSchema = z.object({});
