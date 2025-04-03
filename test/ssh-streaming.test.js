import { expect } from 'chai';
import { sshCommandManager } from '../src/tools/ssh-command-manager.js';
import { NodeSSH } from 'node-ssh';
import sinon from 'sinon';

describe('SSH Command Manager', function() {
  // Increase timeout for tests that simulate long-running commands
  this.timeout(5000);
  
  let sandbox;
  let mockSSH;
  let execCommandStub;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Create a mock SSH instance
    mockSSH = {
      execCommand: () => {},
      dispose: () => {}
    };
    
    // Create stub for execCommand
    execCommandStub = sandbox.stub(mockSSH, 'execCommand');
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  it('should identify a short-running command and return complete results', async () => {
    // Mock a quick command execution
    execCommandStub.resolves({
      stdout: 'Quick command output',
      stderr: '',
      code: 0
    });
    
    // Execute a command with a 100ms internal timeout
    const result = await sshCommandManager.executeCommand(
      mockSSH,
      'echo "quick"',
      '.',
      100
    );
    
    // Verify it was not marked as blocked
    expect(result.isBlocked).to.be.false;
    expect(result.output).to.include('Quick command output');
    expect(result.exitCode).to.equal(0);
  });
  
  it('should identify a long-running command and return streaming session', async () => {
    // Create a delayed promise to simulate long-running command
    execCommandStub.callsFake(() => {
      return new Promise((resolve) => {
        // Emit some output via the callbacks
        const stdoutHandler = execCommandStub.args[0][1].onStdout;
        stdoutHandler(Buffer.from('Initial output\n'));
        
        // Resolve after 200ms (longer than the timeout)
        setTimeout(() => {
          stdoutHandler(Buffer.from('Later output\n'));
          resolve({
            stdout: 'Complete output',
            stderr: '',
            code: 0
          });
        }, 200);
      });
    });
    
    // Execute a command with a 100ms internal timeout
    const result = await sshCommandManager.executeCommand(
      mockSSH,
      'sleep 1; echo "long"',
      '.',
      100
    );
    
    // Verify it was marked as blocked for streaming
    expect(result.isBlocked).to.be.true;
    expect(result.output).to.include('Initial output');
    expect(result.id).to.be.a('string');
    
    // Wait for command to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Get the new output
    const sessionId = result.id;
    const newOutput = sshCommandManager.getNewOutput(sessionId);
    
    // Verify we got the later output
    expect(newOutput).to.include('Later output');
    
    // It should also include completion information
    expect(newOutput).to.include('SSH Command completed');
    expect(newOutput).to.include('exit code 0');
  });
  
  it('should properly handle force termination of a command', async () => {
    // Create a long-running command that doesn't complete
    execCommandStub.callsFake(() => {
      return new Promise((resolve) => {
        // Emit some output via the callbacks
        const stdoutHandler = execCommandStub.args[0][1].onStdout;
        stdoutHandler(Buffer.from('Running...\n'));
        
        // This promise intentionally doesn't resolve to simulate a command that keeps running
      });
    });
    
    // Execute a command with a 100ms internal timeout
    const result = await sshCommandManager.executeCommand(
      mockSSH,
      'sleep 300',
      '.',
      100
    );
    
    // Verify it was marked as blocked for streaming
    expect(result.isBlocked).to.be.true;
    
    // Force terminate the command
    const terminateResult = sshCommandManager.forceTerminate(result.id);
    expect(terminateResult).to.be.true;
    
    // Get the output which should include termination message
    const output = sshCommandManager.getNewOutput(result.id);
    expect(output).to.include('Command terminated by user');
    expect(output).to.include('exit code 130');
  });
  
  it('should list active sessions correctly', async () => {
    // Create two delayed promises to simulate long-running commands
    const createDelayedCommand = () => {
      return execCommandStub.callsFake(() => {
        return new Promise((resolve) => {
          // This promise intentionally doesn't resolve to simulate a command that keeps running
        });
      });
    };
    
    // Setup two commands
    createDelayedCommand();
    
    // Execute first command
    const result1 = await sshCommandManager.executeCommand(
      mockSSH,
      'long_command_1',
      '.',
      100
    );
    
    // Reset and setup for second command
    execCommandStub.reset();
    createDelayedCommand();
    
    // Execute second command
    const result2 = await sshCommandManager.executeCommand(
      mockSSH,
      'long_command_2',
      '.',
      100
    );
    
    // List active sessions
    const activeSessions = sshCommandManager.listActiveSessions();
    
    // Verify we have both sessions
    expect(activeSessions).to.have.lengthOf(2);
    expect(activeSessions.map(s => s.id)).to.include(result1.id);
    expect(activeSessions.map(s => s.id)).to.include(result2.id);
    
    // Each session should have runtime information
    activeSessions.forEach(session => {
      expect(session).to.have.property('runtime');
      expect(session.runtime).to.be.greaterThan(0);
    });
  });
});
