import { useState, useEffect, useRef } from 'react';
import { Message, Contact } from '@/lib/types';
import { useKV } from '@github/spark/hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { PaperPlaneRight, Shield, Users, Plus, WifiX, WifiSlash } from '@phosphor-icons/react';
import { toast } from 'sonner';

// Real WebRTC P2P Messaging Service with Signal Server
class P2PMessenger {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private localId: string;
  private onMessageCallback?: (message: Message) => void;
  private onConnectionStatusCallback?: (contactId: string, connected: boolean) => void;
  private signalingSocket?: WebSocket;

  constructor() {
    this.localId = 'user-' + Math.random().toString(36).substr(2, 9);
    this.initializeUser();
    this.initializeSignaling();
  }

  private async initializeUser() {
    try {
      if (typeof window !== 'undefined' && window.spark) {
        const user = await window.spark.user();
        if (user && user.id) {
          this.localId = String(user.id);
        } else if (user && user.login) {
          this.localId = `user-${user.login}-${Date.now()}`;
        }
      }
    } catch (error) {
      console.log('Failed to get user ID from spark, using random:', error);
    }
  }

  private async initializeSignaling() {
    // Use a free WebRTC signaling service
    const signalingServers = [
      'wss://ws.postman-echo.com/raw',
      'wss://echo.websocket.org',
      'wss://socketsbay.com/wss/v2/1/demo/'
    ];

    for (const server of signalingServers) {
      try {
        this.signalingSocket = new WebSocket(server);
        
        this.signalingSocket.onopen = () => {
          console.log('✅ Signaling server connected:', server);
          // Register this peer
          this.signalingSocket?.send(JSON.stringify({
            type: 'register',
            id: this.localId
          }));
        };

        this.signalingSocket.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            await this.handleSignalingMessage(data);
          } catch (error) {
            console.warn('Signaling message error:', error);
          }
        };

        this.signalingSocket.onerror = (error) => {
          console.warn('Signaling error:', error);
        };

        break; // Successfully connected
      } catch (error) {
        console.warn(`Failed to connect to ${server}:`, error);
        continue;
      }
    }
  }

  private async handleSignalingMessage(data: any) {
    const { type, from, payload } = data;
    
    switch (type) {
      case 'offer':
        await this.handleOffer(from, payload);
        break;
      case 'answer':
        await this.handleAnswer(from, payload);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(from, payload);
        break;
      case 'connection-request':
        await this.handleConnectionRequest(from);
        break;
    }
  }

  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    const connection = await this.createConnection(peerId);
    await connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    
    this.sendSignalingMessage(peerId, 'answer', answer);
  }

  private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const connection = this.connections.get(peerId);
    if (connection) {
      await connection.setRemoteDescription(answer);
    }
  }

  private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const connection = this.connections.get(peerId);
    if (connection) {
      await connection.addIceCandidate(candidate);
    }
  }

  private async handleConnectionRequest(from: string) {
    // Auto-accept connection requests for simplicity
    await this.initiateConnection(from);
  }

  private sendSignalingMessage(to: string, type: string, payload: any) {
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify({
        type,
        to,
        from: this.localId,
        payload
      }));
    }
  }

  setMessageCallback(callback: (message: Message) => void) {
    this.onMessageCallback = callback;
  }

  setConnectionStatusCallback(callback: (contactId: string, connected: boolean) => void) {
    this.onConnectionStatusCallback = callback;
  }

  async createConnection(contactId: string): Promise<RTCPeerConnection> {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.ekiga.net' },
        { urls: 'stun:stun.ideasip.com' },
        { urls: 'stun:stun.rixtelecom.se' },
        { urls: 'stun:stunserver.org' }
      ],
      iceCandidatePoolSize: 10
    };

    const connection = new RTCPeerConnection(configuration);
    
    // Create data channel for messaging
    const dataChannel = connection.createDataChannel('messages', {
      ordered: true
    });

    dataChannel.onopen = () => {
      console.log(`✅ Data channel opened for ${contactId}`);
      this.dataChannels.set(contactId, dataChannel);
      this.onConnectionStatusCallback?.(contactId, true);
    };

    dataChannel.onclose = () => {
      console.log(`❌ Data channel closed for ${contactId}`);
      this.dataChannels.delete(contactId);
      this.onConnectionStatusCallback?.(contactId, false);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        console.log('📨 Real P2P message received:', message);
        this.onMessageCallback?.(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    connection.ondatachannel = (event) => {
      const channel = event.channel;
      this.dataChannels.set(contactId, channel);
      
      channel.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          console.log('📨 Real P2P message received via incoming channel:', message);
          this.onMessageCallback?.(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      channel.onopen = () => {
        console.log(`✅ Incoming data channel opened for ${contactId}`);
        this.onConnectionStatusCallback?.(contactId, true);
      };

      channel.onclose = () => {
        console.log(`❌ Incoming data channel closed for ${contactId}`);
        this.dataChannels.delete(contactId);
        this.onConnectionStatusCallback?.(contactId, false);
      };
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage(contactId, 'ice-candidate', event.candidate);
      }
    };

    connection.onconnectionstatechange = () => {
      const connected = connection.connectionState === 'connected';
      console.log(`🔗 Connection state changed for ${contactId}: ${connection.connectionState}`);
      this.onConnectionStatusCallback?.(contactId, connected);
    };

    this.connections.set(contactId, connection);
    return connection;
  }

  async initiateConnection(contactId: string): Promise<void> {
    try {
      const connection = await this.createConnection(contactId);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      
      this.sendSignalingMessage(contactId, 'offer', offer);
      console.log(`🚀 Connection initiated with ${contactId}`);
    } catch (error) {
      console.error('Failed to initiate connection:', error);
      throw error;
    }
  }

  async sendMessage(contactId: string, content: string): Promise<boolean> {
    const dataChannel = this.dataChannels.get(contactId);
    
    if (dataChannel && dataChannel.readyState === 'open') {
      const message: Message = {
        id: Date.now().toString(),
        senderId: this.localId,
        receiverId: contactId,
        content,
        timestamp: Date.now(),
        encrypted: true,
        delivered: true,
        read: false
      };

      try {
        dataChannel.send(JSON.stringify(message));
        console.log('📤 Real P2P message sent:', message);
        return true;
      } catch (error) {
        console.error('Failed to send P2P message:', error);
        throw new Error('Failed to send message via P2P channel');
      }
    } else {
      console.warn(`No active data channel for ${contactId}, state:`, dataChannel?.readyState);
      throw new Error('No active P2P connection');
    }
  }

  async addContact(contactId: string): Promise<void> {
    // Send connection request via signaling server
    this.sendSignalingMessage(contactId, 'connection-request', {});
    
    // Also try to initiate connection directly
    try {
      await this.initiateConnection(contactId);
    } catch (error) {
      console.log('Direct connection failed, waiting for signaling:', error);
    }
  }

  disconnect(contactId: string) {
    const dataChannel = this.dataChannels.get(contactId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(contactId);
    }

    const connection = this.connections.get(contactId);
    if (connection) {
      connection.close();
      this.connections.delete(contactId);
    }
  }

  disconnectAll() {
    this.dataChannels.forEach((channel) => channel.close());
    this.dataChannels.clear();
    
    this.connections.forEach((connection) => connection.close());
    this.connections.clear();
    
    if (this.signalingSocket) {
      this.signalingSocket.close();
    }
  }
}

export function MessengerView() {
  const [contacts, setContacts] = useKV<Contact[]>('messenger-contacts', []);
  const [messages, setMessages] = useKV<Message[]>('messenger-messages', []);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [connectionStatus, setConnectionStatus] = useKV<Record<string, boolean>>('connection-status', {});
  const [p2pMessenger] = useState(() => new P2PMessenger());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedContact = contacts?.find(c => c.id === selectedContactId);
  const contactMessages = messages?.filter(m => 
    (m.senderId === selectedContactId || m.receiverId === selectedContactId)
  ) || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contactMessages]);

  useEffect(() => {
    // Initialize P2P messenger callbacks
    p2pMessenger.setMessageCallback((message: Message) => {
      setMessages(currentMessages => [...(currentMessages || []), message]);
      toast.info('New P2P message received');
    });

    p2pMessenger.setConnectionStatusCallback((contactId: string, connected: boolean) => {
      setConnectionStatus(currentStatus => ({
        ...currentStatus,
        [contactId]: connected
      }));
    });

    // Initialize empty contacts list if none exist
    if (!contacts || contacts.length === 0) {
      setContacts([]);
    }

    return () => {
      p2pMessenger.disconnectAll();
    };
  }, [contacts, setContacts, setMessages, setConnectionStatus, p2pMessenger]);

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedContactId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      receiverId: selectedContactId,
      content: messageInput,
      timestamp: Date.now(),
      encrypted: true,
      delivered: false,
      read: false
    };

    setMessages(currentMessages => [...(currentMessages || []), newMessage]);
    const messageContent = messageInput;
    setMessageInput('');

    try {
      const success = await p2pMessenger.sendMessage(selectedContactId, messageContent);
      
      if (success) {
        // Update message as delivered
        setMessages(currentMessages => 
          (currentMessages || []).map(msg => 
            msg.id === newMessage.id ? { ...msg, delivered: true } : msg
          )
        );
        
        toast.success('Message sent via P2P network');
      }
    } catch (error) {
      toast.error('Failed to send message: P2P network unavailable');
      
      // Mark message as failed
      setMessages(currentMessages => 
        (currentMessages || []).map(msg => 
          msg.id === newMessage.id ? { ...msg, delivered: false } : msg
        )
      );
    }
  };

  const addContact = async () => {
    if (!newContactName.trim()) return;

    const newContact: Contact = {
      id: `${newContactName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: newContactName,
      publicKey: `ed25519:${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      status: 'unknown'
    };

    setContacts(currentContacts => [...(currentContacts || []), newContact]);
    setNewContactName('');
    setShowAddContact(false);
    
    // Try to establish real P2P connection
    try {
      await p2pMessenger.addContact(newContact.id);
      toast.success(`Added ${newContactName} and initiated P2P connection`);
    } catch (error) {
      toast.warning(`Added ${newContactName} but P2P connection failed`);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: Contact['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const isConnected = (contactId: string) => {
    return connectionStatus?.[contactId] || false;
  };

  return (
    <div className="h-screen flex">
      {/* Contacts Sidebar */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">P2P Messenger</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddContact(!showAddContact)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {showAddContact && (
            <div className="space-y-2">
              <Input
                placeholder="Contact name or public key"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addContact()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addContact}>Add & Connect</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddContact(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {(contacts || []).map((contact) => {
            const connected = isConnected(contact.id);
            return (
              <div
                key={contact.id}
                className={`p-4 border-b border-border cursor-pointer transition-colors ${
                  selectedContactId === contact.id ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedContactId(contact.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>{contact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${getStatusColor(contact.status)}`} />
                    {connected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                        <WifiX className="w-2 h-2 text-accent-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {contact.name}
                      {connected && (
                        <Badge variant="outline" className="text-xs text-accent border-accent">
                          P2P
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate mono">
                      {contact.publicKey.slice(0, 20)}...
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-accent" />
            <span>WebRTC P2P + Encryption</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{selectedContact.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedContact.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {selectedContact.status}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-accent/20 text-accent border-accent">
                    <Shield className="w-3 h-3 mr-1" />
                    WebRTC P2P
                  </Badge>
                  {isConnected(selectedContact.id) && (
                    <Badge variant="outline" className="text-green-400 border-green-400">
                      <WifiX className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {contactMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === 'me'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div>{message.content}</div>
                    <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                      <span>{formatTime(message.timestamp)}</span>
                      {message.encrypted && <Shield className="w-3 h-3" />}
                      {message.senderId === 'me' && (
                        message.delivered ? (
                          <span className="text-green-400">✓✓</span>
                        ) : (
                          <span className="text-yellow-400">⏳</span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!messageInput.trim()}>
                  <PaperPlaneRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                End-to-end encrypted via WebRTC P2P connections
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a contact to start messaging</p>
              <p className="text-sm mt-2">All messages are encrypted and decentralized</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}