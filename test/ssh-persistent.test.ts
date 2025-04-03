import { expect } from 'chai';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';
import { NodeSSH } from 'node-ssh';

// Import the SSH session manager and functions
import { sshSessionManager } from '../src/tools/ssh-session-manager';
import {
  sshConnect,
  sshRunInSession,
  sshUploadInSession,
  sshDownloadInSession,
  sshDisconnect,
  sshListSessions
} from '../src/tools/ssh-persistent';

describe('SSH Persistent Sessions', () => {
  // Stubs and mocks
  let connectStub: sinon.SinonStub;
  let execCommandStub: sinon.SinonStub;
  let putFileStub: sinon.SinonStub;
  let getFileStub: sinon.SinonStub;
  let disposeStub: sinon.SinonStub;
  
  // Set up stubs and mocks before each test
  beforeEach(() => {
    // Create stubs for SSH operations
    connectStub = sinon.stub(NodeSSH.prototype, 'connect').resolves();
    execCommandStub = sinon.stub(NodeSSH.prototype, 'execCommand').resolves({
      stdout: 'command output',
      stderr: '',
      code: 0
    });
    putFileStub = sinon.stub(NodeSSH.prototype, 'putFile').resolves();
    getFileStub = sinon.stub(NodeSSH.prototype, 'getFile').resolves();
    disposeStub = sinon.stub(NodeSSH.prototype, 'dispose');
  });
  
  // Clean up stubs and mocks after each test
  afterEach(() => {
    // Restore stubs
    connectStub.restore();
    execCommandStub.restore();
    putFileStub.restore();
    getFileStub.restore();
    disposeStub.restore();
    
    // Clean up sessions
    return sshSessionManager.closeAllSessions();
  });
  
  // Test SSH connect function
  describe('sshConnect', () => {
    it('should connect to an SSH server and return a session ID', async () => {
      const result = await sshConnect({
        host: 'example.com',
        username: 'testuser',
        password: 'testpassword'
      });
      
      expect(result).to.have.property('sessionId');
      expect(result.sessionId).to.be.a('string');
      expect(connectStub.calledOnce).to.be.true;
    });
    
    it('should support private key authentication', async () => {
      const result = await sshConnect({
        host: 'example.com',
        username: 'testuser',
        privateKeyPath: '/path/to/key',
        passphrase: 'keypassphrase'
      });
      
      expect(result).to.have.property('sessionId');
      expect(result.sessionId).to.be.a('string');
      expect(connectStub.calledOnce).to.be.true;
    });
    
    it('should throw an error if neither password nor privateKeyPath is provided', async () => {
      try {
        await sshConnect({
          host: 'example.com',
          username: 'testuser'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Either password or privateKeyPath must be provided');
      }
    });
  });
  
  // Test SSH run in session function
  describe('sshRunInSession', () => {
    let sessionId: string;
    
    beforeEach(async () => {
      // Create a session for testing
      const result = await sshConnect({
        host: 'example.com',
        username: 'testuser',
        password: 'testpassword'
      });
      
      sessionId = result.sessionId;
    });
    
    it('should execute a command in an existing session', async () => {
      const result = await sshRunInSession({
        sessionId,
        command: 'ls -la'
      });
      
      expect(result).to.have.property('stdout', 'command output');
      expect(result).to.have.property('stderr', '');
      expect(result).to.have.property('code', 0);
      expect(execCommandStub.calledOnce).to.be.true;
    });
    
    it('should throw an error for an invalid session ID', async () => {
      try {
        await sshRunInSession({
          sessionId: 'invalid-session-id',
          command: 'ls -la'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired SSH session');
      }
    });
  });
  
  // Test SSH file upload in session function
  describe('sshUploadInSession', () => {
    let sessionId: string;
    
    beforeEach(async () => {
      // Create a session for testing
      const result = await sshConnect({
        host: 'example.com',
        username: 'testuser',
        password: 'testpassword'
      });
      
      sessionId = result.sessionId;
    });
    
    it('should upload a file in an existing session', async () => {
      const result = await sshUploadInSession({
        sessionId,
        localPath: '/path/to/local/file',
        remotePath: '/path/to/remote/file'
      });
      
      expect(result).to.have.property('message');
      expect(result.message).to.include('uploaded successfully');
      expect(putFileStub.calledOnce).to.be.true;
    });
    
    it('should throw an error for an invalid session ID', async () => {
      try {
        await sshUploadInSession({
          sessionId: 'invalid-session-id',
          localPath: '/path/to/local/file',
          remotePath: '/path/to/remote/file'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired SSH session');
      }
    });
  });
  
  // Test SSH file download in session function
  describe('sshDownloadInSession', () => {
    let sessionId: string;
    
    beforeEach(async () => {
      // Create a session for testing
      const result = await sshConnect({
        host: 'example.com',
        username: 'testuser',
        password: 'testpassword'
      });
      
      sessionId = result.sessionId;
    });
    
    it('should download a file in an existing session', async () => {
      const result = await sshDownloadInSession({
        sessionId,
        localPath: '/path/to/local/file',
        remotePath: '/path/to/remote/file'
      });
      
      expect(result).to.have.property('message');
      expect(result.message).to.include('downloaded successfully');
      expect(getFileStub.calledOnce).to.be.true;
    });
    
    it('should throw an error for an invalid session ID', async () => {
      try {
        await sshDownloadInSession({
          sessionId: 'invalid-session-id',
          localPath: '/path/to/local/file',
          remotePath: '/path/to/remote/file'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired SSH session');
      }
    });
  });
  
  // Test SSH disconnect function
  describe('sshDisconnect', () => {
    let sessionId: string;
    
    beforeEach(async () => {
      // Create a session for testing
      const result = await sshConnect({
        host: 'example.com',
        username: 'testuser',
        password: 'testpassword'
      });
      
      sessionId = result.sessionId;
    });
    
    it('should close an existing session', async () => {
      const result = await sshDisconnect({
        sessionId
      });
      
      expect(result).to.have.property('message');
      expect(result.message).to.include('closed successfully');
      expect(disposeStub.calledOnce).to.be.true;
      
      // Verify the session is removed
      const sessions = await sshListSessions();
      expect(sessions.sessions).to.not.include(sessionId);
    });
    
    it('should throw an error for an invalid session ID', async () => {
      try {
        await sshDisconnect({
          sessionId: 'invalid-session-id'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid or expired SSH session');
      }
    });
  });
  
  // Test SSH list sessions function
  describe('sshListSessions', () => {
    it('should list all active sessions', async () => {
      // Create multiple sessions
      const session1 = await sshConnect({
        host: 'example1.com',
        username: 'user1',
        password: 'pass1'
      });
      
      const session2 = await sshConnect({
        host: 'example2.com',
        username: 'user2',
        password: 'pass2'
      });
      
      const result = await sshListSessions();
      
      expect(result).to.have.property('sessions');
      expect(result.sessions).to.be.an('array');
      expect(result.sessions).to.include(session1.sessionId);
      expect(result.sessions).to.include(session2.sessionId);
      expect(result.sessions.length).to.equal(2);
    });
    
    it('should return an empty array when no sessions exist', async () => {
      // Close all sessions
      await sshSessionManager.closeAllSessions();
      
      const result = await sshListSessions();
      
      expect(result).to.have.property('sessions');
      expect(result.sessions).to.be.an('array');
      expect(result.sessions.length).to.equal(0);
    });
  });
});
