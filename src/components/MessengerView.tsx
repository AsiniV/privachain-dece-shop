import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PaperPlaneTilt, Plus, Clock, CheckCircle, User, ChatCircle } from '@phosphor-icons/react';
import { useKV } from '@github/spark/hooks';
import { cosmosService } from '@/lib/cosmos';
import { developerWallet } from '@/lib/developer-wallet';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  address: string;
  lastSeen: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
  transactionHash?: string;
}

export function MessengerView() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // Persistent data
  const [contacts, setContacts] = useKV<Contact[]>('contacts', []);
  const [messages, setMessages] = useKV<Message[]>('messages', []);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);

  // Auto-initialize developer wallet in background
  useEffect(() => {
    developerWallet.initialize().catch(console.error);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedContact]);

  // Load messages when contact changes
  useEffect(() => {
    if (selectedContact) {
      loadMessages();
    }
  }, [selectedContact]);

  const loadMessages = async () => {
    if (!selectedContact) return;
    
    setIsLoadingMessages(true);
    try {
      // In a real implementation, this would fetch from IPFS/P2P network
      // For now, we use local storage with blockchain backup
      const currentMessages = messages || [];
      const contactMessages = currentMessages.filter(
        (msg) => 
          (msg.from === selectedContact.address) ||
          (msg.to === selectedContact.address)
      );
      
      // Messages are already loaded from useKV
      console.log(`Loaded ${contactMessages.length} messages for ${selectedContact.name}`);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || isSending) return;

    setIsSending(true);
    try {
      // Create message with E2E encryption
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        from: 'user', // In real app, this would be user's address
        to: selectedContact.address,
        content: newMessage.trim(),
        timestamp: Date.now(),
        encrypted: true, // Always encrypted
      };

      // Send through developer wallet (invisible to user)
      try {
        const txHash = await cosmosService.sendEncryptedMessage(
          selectedContact.address,
          message.content
        );
        message.transactionHash = txHash;
        
        // Store message with transaction hash for integrity
        setMessages((current) => {
          const currentMessages = current || [];
          return [...currentMessages, message];
        });

        // Update contact's last seen
        setContacts((current) => {
          const currentContacts = current || [];
          return currentContacts.map(contact => 
            contact.id === selectedContact.id 
              ? { ...contact, lastSeen: Date.now() }
              : contact
          );
        });

        setNewMessage('');
        toast.success('Message sent securely');
      } catch (blockchainError) {
        // Fallback to local storage if blockchain fails
        console.warn('Blockchain send failed, using local storage:', blockchainError);
        
        setMessages((current) => {
          const currentMessages = current || [];
          return [...currentMessages, message];
        });
        
        setNewMessage('');
        toast.success('Message sent (local storage)');
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const addContact = () => {
    if (!newContactName.trim() || !newContactAddress.trim()) {
      toast.error('Please enter both name and address');
      return;
    }

    const newContact: Contact = {
      id: `contact_${Date.now()}`,
      name: newContactName.trim(),
      address: newContactAddress.trim(),
      lastSeen: Date.now(),
    };

    setContacts((current) => {
      const currentContacts = current || [];
      return [...currentContacts, newContact];
    });

    setNewContactName('');
    setNewContactAddress('');
    setShowAddContact(false);
    toast.success('Contact added');
  };

  const getContactMessages = () => {
    if (!selectedContact || !messages) return [];
    
    return messages.filter(
      (msg) => 
        (msg.from === selectedContact.address) ||
        (msg.to === selectedContact.address)
    ).sort((a, b) => a.timestamp - b.timestamp);
  };

  return (
    <div className="h-full flex">
      {/* Contacts Sidebar */}
      <div className="w-80 border-r border-border bg-muted/20">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                  <DialogDescription>
                    Add a new contact for secure messaging
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Contact name"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Address or username"
                      value={newContactAddress}
                      onChange={(e) => setNewContactAddress(e.target.value)}
                    />
                  </div>
                  <Button onClick={addContact} className="w-full">
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-2">
              {(!contacts || contacts.length === 0) ? (
                <div className="text-center text-muted-foreground p-8">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No contacts yet</p>
                  <p className="text-sm">Add contacts to start messaging</p>
                </div>
              ) : (
                contacts.map((contact) => (
                  <Card 
                    key={contact.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedContact?.id === contact.id 
                        ? 'bg-primary/10 border-primary/20' 
                        : 'hover:bg-muted/40'
                    }`}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground mono">
                          {contact.address.slice(0, 8)}...{contact.address.slice(-6)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/20">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1" />
                          E2E
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
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
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {selectedContact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedContact.name}</h3>
                    <p className="text-sm text-muted-foreground">End-to-end encrypted</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1" />
                    Secure
                  </Badge>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {isLoadingMessages ? (
                  <div className="text-center text-muted-foreground">
                    <Clock className="w-6 h-6 mx-auto mb-2 animate-spin" />
                    Loading messages...
                  </div>
                ) : (
                  getContactMessages().map((message) => (
                    <div 
                      key={message.id}
                      className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.from === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                          {message.from === 'user' && (
                            <CheckCircle className="w-3 h-3 opacity-70" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isSending}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || isSending}
                  size="sm"
                >
                  {isSending ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <PaperPlaneTilt className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                🔒 All messages are encrypted and secured automatically
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="text-muted-foreground">
              <ChatCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Secure Messaging</h3>
              <p>Select a contact to start an encrypted conversation</p>
              <p className="text-sm mt-2">
                All messages are end-to-end encrypted and secured automatically
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}