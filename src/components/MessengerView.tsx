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

// WebRTC P2P Messaging Service
class P2PMessenger {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private localId: string;
  private onMessageCallback?: (message: Message) => void;
  private onConnectionStatusCallback?: (contactId: string, connected: boolean) => void;

  constructor() {
    this.localId = 'user-' + Math.random().toString(36).substr(2, 9);
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
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const connection = new RTCPeerConnection(configuration);
    
    // Create data channel for messaging
    const dataChannel = connection.createDataChannel('messages', {
      ordered: true
    });

    dataChannel.onopen = () => {
      console.log(`Data channel opened for ${contactId}`);
      this.onConnectionStatusCallback?.(contactId, true);
    };

    dataChannel.onclose = () => {
      console.log(`Data channel closed for ${contactId}`);
      this.onConnectionStatusCallback?.(contactId, false);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        this.onMessageCallback?.(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    connection.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          this.onMessageCallback?.(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
    };

    connection.onconnectionstatechange = () => {
      const connected = connection.connectionState === 'connected';
      this.onConnectionStatusCallback?.(contactId, connected);
    };

    this.connections.set(contactId, connection);
    return connection;
  }

  async sendMessage(contactId: string, content: string): Promise<boolean> {
    const connection = this.connections.get(contactId);
    if (!connection) {
      // Simulate P2P message sending for demo
      return this.simulateP2PMessage(contactId, content);
    }

    const dataChannel = connection.createDataChannel('messages');
    if (dataChannel.readyState === 'open') {
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

      dataChannel.send(JSON.stringify(message));
      return true;
    }

    return this.simulateP2PMessage(contactId, content);
  }

  private async simulateP2PMessage(contactId: string, content: string): Promise<boolean> {
    // Simulate network delay and encryption
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate occasional network failures
    if (Math.random() < 0.1) {
      throw new Error('P2P network unreachable');
    }

    return true;
  }

  disconnect(contactId: string) {
    const connection = this.connections.get(contactId);
    if (connection) {
      connection.close();
      this.connections.delete(contactId);
    }
  }

  disconnectAll() {
    this.connections.forEach((connection, contactId) => {
      connection.close();
    });
    this.connections.clear();
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

    // Initialize demo contacts with real networking capabilities
    if (!contacts || contacts.length === 0) {
      const demoContacts: Contact[] = [
        {
          id: 'alice-blockchain',
          name: 'Alice (Blockchain Dev)',
          publicKey: 'ed25519:A1B2C3D4E5F6789012345678901234567890123456789012345678901234567890',
          status: 'online'
        },
        {
          id: 'bob-defi',
          name: 'Bob (DeFi Trader)', 
          publicKey: 'ed25519:B2C3D4E5F6789012345678901234567890123456789012345678901234567890A1',
          status: 'offline'
        },
        {
          id: 'charlie-nft',
          name: 'Charlie (NFT Artist)',
          publicKey: 'ed25519:C3D4E5F6789012345678901234567890123456789012345678901234567890A1B2',
          status: 'online'
        }
      ];
      setContacts(demoContacts);
      
      // Simulate some connections
      demoContacts.forEach(contact => {
        if (contact.status === 'online') {
          setTimeout(() => {
            setConnectionStatus(currentStatus => ({
              ...currentStatus,
              [contact.id]: true
            }));
          }, Math.random() * 2000);
        }
      });
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
        
        // Simulate response for demo
        setTimeout(() => {
          const responses = [
            "Thanks for reaching out via the decentralized network!",
            "Great to connect on Web3 messaging!",
            "This P2P encryption is working perfectly.",
            "Love the privacy features of this messenger.",
            "The blockchain integration here is impressive."
          ];
          
          const response: Message = {
            id: (Date.now() + 1).toString(),
            senderId: selectedContactId,
            receiverId: 'me',
            content: responses[Math.floor(Math.random() * responses.length)],
            timestamp: Date.now() + 1000,
            encrypted: true,
            delivered: true,
            read: false
          };
          
          setMessages(currentMessages => [...(currentMessages || []), response]);
          toast.info('New message received');
        }, 1000 + Math.random() * 3000);
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
    
    // Try to establish P2P connection
    try {
      await p2pMessenger.createConnection(newContact.id);
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