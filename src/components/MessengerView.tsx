import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PaperPlaneTilt, Plus, Coins, Clock, CheckCircle, XCircle, Warning, User, CurrencyCircleDollar } from '@phosphor-icons/react';
import { WalletConnection } from '@/components/WalletConnection';
import { useKV } from '@github/spark/hooks';
import { cosmosService, MessengerMessage, PaymentTransaction } from '@/lib/cosmos';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  address: string;
  lastSeen: number;
}

export function MessengerView() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // Persistent data
  const [contacts, setContacts] = useKV<Contact[]>('blockchain-contacts', []);
  const [messages, setMessages] = useKV<MessengerMessage[]>('blockchain-messages', []);
  const [transactions, setTransactions] = useKV<PaymentTransaction[]>('blockchain-transactions', []);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedContact]);

  // Load messages when wallet connects or contact changes
  useEffect(() => {
    if (isWalletConnected && selectedContact) {
      loadMessages();
    }
  }, [isWalletConnected, selectedContact]);

  const handleWalletConnection = (connected: boolean, address?: string) => {
    setIsWalletConnected(connected);
    if (connected && address) {
      setUserAddress(address);
      toast.success('Wallet connected - blockchain messaging enabled');
    } else {
      setUserAddress('');
      setSelectedContact(null);
      toast.info('Wallet disconnected - blockchain features disabled');
    }
  };

  const loadMessages = async () => {
    if (!selectedContact || !isWalletConnected) return;
    
    setIsLoadingMessages(true);
    try {
      // Query blockchain for messages with this contact
      const blockchainMessages = await cosmosService.queryMessages(selectedContact.address);
      
      // Merge with local messages (for development/testing)
      const allMessages = [
        ...(messages || []).filter(m => 
          (m.sender === userAddress && m.recipient === selectedContact.address) ||
          (m.sender === selectedContact.address && m.recipient === userAddress)
        ),
        ...blockchainMessages
      ];
      
      // Sort by timestamp and remove duplicates
      const uniqueMessages = allMessages
        .filter((msg, index, self) => 
          index === self.findIndex(m => m.id === msg.id)
        )
        .sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(prevMessages => {
        const otherMessages = (prevMessages || []).filter(m => 
          !((m.sender === userAddress && m.recipient === selectedContact.address) ||
            (m.sender === selectedContact.address && m.recipient === userAddress))
        );
        return [...otherMessages, ...uniqueMessages];
      });
      
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages from blockchain');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !isWalletConnected) return;
    
    setIsSending(true);
    try {
      // Send message via Cosmos blockchain
      const blockchainMessage = await cosmosService.sendMessage(
        selectedContact.address,
        newMessage.trim(),
        paymentAmount || undefined
      );
      
      // Add to local state
      setMessages(prev => [...(prev || []), blockchainMessage]);
      
      // If payment was included, process it
      if (paymentAmount && parseFloat(paymentAmount) > 0) {
        try {
          const payment = await cosmosService.processPayment(
            selectedContact.address,
            paymentAmount,
            blockchainMessage.id
          );
          
          setTransactions(prev => [...(prev || []), payment]);
          toast.success(`Message sent with ${paymentAmount} PRIV payment`);
        } catch (paymentError) {
          console.error('Payment failed:', paymentError);
          toast.error('Message sent but payment failed');
        }
      } else {
        toast.success('Message sent via blockchain');
      }
      
      setNewMessage('');
      setPaymentAmount('');
      setShowPaymentDialog(false);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSending(false);
    }
  };

  const addContact = () => {
    if (!newContactName.trim() || !newContactAddress.trim()) {
      toast.error('Please enter both name and address');
      return;
    }

    // Validate Cosmos address format
    if (!newContactAddress.startsWith('privachain') || newContactAddress.length < 20) {
      toast.error('Invalid Cosmos address format');
      return;
    }

    const newContact: Contact = {
      id: Date.now().toString(),
      name: newContactName.trim(),
      address: newContactAddress.trim(),
      lastSeen: Date.now(),
    };

    setContacts(prev => [...(prev || []), newContact]);
    setNewContactName('');
    setNewContactAddress('');
    setShowAddContact(false);
    toast.success('Contact added');
  };

  const removeContact = (contactId: string) => {
    setContacts(prev => (prev || []).filter(c => c.id !== contactId));
    if (selectedContact?.id === contactId) {
      setSelectedContact(null);
    }
    toast.success('Contact removed');
  };

  const getFilteredMessages = () => {
    if (!selectedContact) return [];
    
    return (messages || []).filter(msg => 
      (msg.sender === userAddress && msg.recipient === selectedContact.address) ||
      (msg.sender === selectedContact.address && msg.recipient === userAddress)
    );
  };

  const getTransactionForMessage = (messageId: string) => {
    return (transactions || []).find(tx => tx.messageId === messageId);
  };

  if (!isWalletConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Warning className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Blockchain Wallet Required</h2>
            <p className="text-muted-foreground mb-6">
              Connect your Cosmos wallet to access secure blockchain messaging with smart contract integration.
            </p>
          </div>
          
          <WalletConnection onConnectionChange={handleWalletConnection} />
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Features include:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• On-chain message verification</li>
              <li>• Integrated micropayments</li>
              <li>• Smart contract routing</li>
              <li>• Cryptographic message proofs</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Wallet Status */}
        <div className="p-4 border-b border-border">
          <WalletConnection onConnectionChange={handleWalletConnection} />
        </div>

        {/* Contacts Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Blockchain Contacts</h3>
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
                    Add a new contact using their Cosmos wallet address
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
                      placeholder="privachain1..."
                      value={newContactAddress}
                      onChange={(e) => setNewContactAddress(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button onClick={addContact} className="w-full">
                    Add Contact
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Contacts List */}
        <ScrollArea className="flex-1">
          {(contacts || []).length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No contacts yet</p>
            </div>
          ) : (
            <div className="p-2">
              {(contacts || []).map((contact) => (
                <div
                  key={contact.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.name}</p>
                      <p className="text-sm text-muted-foreground mono truncate">
                        {contact.address.slice(0, 12)}...{contact.address.slice(-8)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeContact(contact.id);
                      }}
                      className="opacity-50 hover:opacity-100"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedContact.name}</h3>
                  <p className="text-sm text-muted-foreground mono">
                    {selectedContact.address}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Blockchain Secured
                  </Badge>
                  {isLoadingMessages && (
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1 animate-pulse" />
                      Loading...
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {getFilteredMessages().map((message) => {
                  const isOwn = message.sender === userAddress;
                  const transaction = getTransactionForMessage(message.id);
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                        <Card className={`p-3 ${
                          isOwn 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-card'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          
                          {transaction && (
                            <div className={`mt-2 pt-2 border-t ${
                              isOwn ? 'border-primary-foreground/20' : 'border-border'
                            }`}>
                              <div className="flex items-center gap-1 text-xs">
                                <CurrencyCircleDollar className="w-3 h-3" />
                                <span>{transaction.amount} PRIV</span>
                                {transaction.status === 'confirmed' && (
                                  <CheckCircle className="w-3 h-3 text-green-400" />
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div className={`mt-2 flex items-center gap-2 text-xs ${
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                            {message.transactionHash && (
                              <>
                                <span>•</span>
                                <span className="mono">
                                  {message.transactionHash.slice(0, 8)}...
                                </span>
                              </>
                            )}
                          </div>
                        </Card>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!showPaymentDialog) {
                        sendMessage();
                      }
                    }
                  }}
                  disabled={isSending}
                />
                
                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" disabled={!newMessage.trim()}>
                      <Coins className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send with Payment</DialogTitle>
                      <DialogDescription>
                        Include a PRIV payment with your message
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Input
                          type="number"
                          step="0.000001"
                          min="0"
                          placeholder="0.00 PRIV"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setShowPaymentDialog(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button onClick={sendMessage} disabled={isSending} className="flex-1">
                          {isSending ? 'Sending...' : 'Send with Payment'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button onClick={sendMessage} disabled={isSending || !newMessage.trim()}>
                  {isSending ? (
                    <Clock className="w-4 h-4 animate-pulse" />
                  ) : (
                    <PaperPlaneTilt className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Select a Contact</h3>
              <p className="text-muted-foreground">
                Choose a contact to start secure blockchain messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}