import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';

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

/**
 * Uploads a file to a remote server over SSH/SFTP.
 * 
 * @param args - The SSH connection and file transfer parameters
 * @returns A promise resolving to the result of the file upload
 */
export async function sshUploadFile(args: {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  localPath: string;
  remotePath: string;
  timeout?: number;
}) {
  const { host, port = 22, username, password, privateKeyPath, localPath, remotePath, timeout } = args;
  const ssh = new NodeSSH();

  try {
    // Verify that the local file exists and is readable
    try {
      await fs.promises.access(localPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Cannot access local file at ${localPath}: ${error instanceof Error ? error.message : String(error)}`);
    }

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

    // Upload the file
    await ssh.putFile(localPath, remotePath);

    // Prepare the response
    const response = {
      success: true,
      message: `File successfully uploaded from ${localPath} to ${remotePath}`,
    };

    return response;
  } catch (error) {
    // Throw a more descriptive error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SSH file upload error: ${errorMessage}`);
  } finally {
    // Always make sure to close the connection
    ssh.dispose();
  }
}

/**
 * Downloads a file from a remote server over SSH/SFTP.
 * 
 * @param args - The SSH connection and file transfer parameters
 * @returns A promise resolving to the result of the file download
 */
export async function sshDownloadFile(args: {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
  remotePath: string;
  localPath: string;
  timeout?: number;
}) {
  const { host, port = 22, username, password, privateKeyPath, remotePath, localPath, timeout } = args;
  const ssh = new NodeSSH();

  try {
    // Verify that the local directory exists and is writable
    const localDir = path.dirname(localPath);
    try {
      await fs.promises.access(localDir, fs.constants.W_OK);
    } catch (error) {
      // Try to create the directory if it doesn't exist
      try {
        await fs.promises.mkdir(localDir, { recursive: true });
      } catch (mkdirError) {
        throw new Error(`Cannot access or create local directory at ${localDir}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

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

    // Download the file
    await ssh.getFile(localPath, remotePath);

    // Prepare the response
    const response = {
      success: true,
      message: `File successfully downloaded from ${remotePath} to ${localPath}`,
    };

    return response;
  } catch (error) {
    // Throw a more descriptive error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`SSH file download error: ${errorMessage}`);
  } finally {
    // Always make sure to close the connection
    ssh.dispose();
  }
}