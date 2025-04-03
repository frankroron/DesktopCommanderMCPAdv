import { NodeSSH } from 'node-ssh';
import fs from 'fs';

/**
 * Executes a command on a remote server over SSH.
 * 
 * @param args - The SSH connection and command execution parameters
 * @returns A promise resolving to the output of the command execution
 */
export async function sshExecuteCommand(args: {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  command: string;
  cwd?: string;
  timeout?: number;
}) {
  const { host, port = 22, username, password, privateKeyPath, command, cwd, timeout } = args;
  const ssh = new NodeSSH();

  try {
    // Prepare connection config
    const connectionConfig: any = {
      host,
      port,
      username,
    };

    // Set authentication method (password or private key)
    if (password) {
      connectionConfig.password = password;
    } else if (privateKeyPath) {
      try {
        // Verify that the key file exists and is readable
        await fs.promises.access(privateKeyPath, fs.constants.R_OK);
        connectionConfig.privateKey = privateKeyPath;
      } catch (error) {
        throw new Error(`Cannot access private key at ${privateKeyPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      throw new Error('Either password or privateKeyPath must be provided for SSH authentication');
    }

    // Connect to the SSH server
    await ssh.connect(connectionConfig);

    // Execute the command
    const result = await ssh.execCommand(command, {
      cwd,
      execOptions: {
        // If timeout is specified, set it
        ...(timeout ? { timeout } : {}),
      },
      onStdout: (chunk) => {
        // Optional: Handle real-time stdout if needed
      },
      onStderr: (chunk) => {
        // Optional: Handle real-time stderr if needed
      },
    });

    // Prepare the response
    const response = {
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
      success: !result.code, // true if exit code is 0, false otherwise
    };

    return response;
  } catch (error) {
    // Throw a more descriptive error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SSH command execution error: ${errorMessage}`);
  } finally {
    // Always make sure to close the connection
    ssh.dispose();
  }
}
