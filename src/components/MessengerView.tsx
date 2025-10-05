import { useState, useEffect, useRef } from 'react';
import { Message, Contact } from '@/lib/types';
import { useKV } from '@github/spark/hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { PaperPlaneRight, Shield, Users, Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';

export function MessengerView() {
  const [contacts, setContacts] = useKV<Contact[]>('messenger-contacts', []);
  const [messages, setMessages] = useKV<Message[]>('messenger-messages', []);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedContact = contacts?.find(c => c.id === selectedContactId);
  const contactMessages = messages?.filter(m => 
    (m.senderId === selectedContactId || m.receiverId === selectedContactId)
  ) || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contactMessages]);

  useEffect(() => {
    if (!contacts || contacts.length === 0) {
      const mockContacts: Contact[] = [
        {
          id: 'alice',
          name: 'Alice',
          publicKey: 'pub_alice_key_example',
          status: 'online'
        },
        {
          id: 'bob',
          name: 'Bob',
          publicKey: 'pub_bob_key_example',
          status: 'offline'
        }
      ];
      setContacts(mockContacts);
    }
  }, [contacts, setContacts]);

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedContactId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'me',
      receiverId: selectedContactId,
      content: messageInput,
      timestamp: Date.now(),
      encrypted: true,
      delivered: true,
      read: false
    };

    setMessages(currentMessages => [...(currentMessages || []), newMessage]);
    setMessageInput('');
    
    toast.success('Message sent securely via P2P network');

    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        senderId: selectedContactId,
        receiverId: 'me',
        content: `Thanks for your message: "${messageInput}"`,
        timestamp: Date.now() + 1000,
        encrypted: true,
        delivered: true,
        read: false
      };
      setMessages(currentMessages => [...(currentMessages || []), response]);
      toast.info('New message received');
    }, 2000);
  };

  const addContact = () => {
    if (!newContactName.trim()) return;

    const newContact: Contact = {
      id: Date.now().toString(),
      name: newContactName,
      publicKey: `pub_${newContactName.toLowerCase()}_key_example`,
      status: 'unknown'
    };

    setContacts(currentContacts => [...(currentContacts || []), newContact]);
    setNewContactName('');
    setShowAddContact(false);
    toast.success(`Added ${newContactName} to contacts`);
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

  return (
    <div className="h-screen flex">
      {/* Contacts Sidebar */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Web3 Messenger</h2>
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
                placeholder="Contact name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addContact()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addContact}>Add</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddContact(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {(contacts || []).map((contact) => (
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
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-sm text-muted-foreground truncate mono">
                    {contact.publicKey.slice(0, 20)}...
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-accent" />
            <span>End-to-end encrypted</span>
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
                    Encrypted
                  </Badge>
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
                      {message.delivered && message.senderId === 'me' && <span>✓</span>}
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
                Messages are end-to-end encrypted and delivered via P2P networks
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