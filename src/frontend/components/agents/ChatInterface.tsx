import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Avatar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Menu,
  MenuItem
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { formatDate } from '../../utils/formatters';
import { api } from '../../utils/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  agentId?: string;
  agentName?: string;
  timestamp: Date;
  metadata?: any;
}

interface Agent {
  agent_id: string;
  name: string;
  description: string;
  capabilities: string[];
  is_active: boolean;
}

interface ChatInterfaceProps {
  userId: string;
  onAgentAction?: (action: string, data: any) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ userId, onAgentAction }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch agents on component mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await api.get('/api/v1/agents/agents');
        setAgents(response.data);
        if (response.data.length > 0) {
          setSelectedAgent(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching agents:', error);
      }
    };

    fetchAgents();
  }, []);

  // Create a new session if none exists
  useEffect(() => {
    const createSession = async () => {
      if (!sessionId) {
        try {
          const response = await api.post('/api/v1/agents/sessions');
          setSessionId(response.data.session_id);
          
          // Add welcome message
          if (selectedAgent) {
            setMessages([
              {
                id: 'welcome',
                text: `Hello! I'm ${selectedAgent.name}. How can I help you with your subscription today?`,
                sender: 'agent',
                agentId: selectedAgent.agent_id,
                agentName: selectedAgent.name,
                timestamp: new Date()
              }
            ]);
          }
        } catch (error) {
          console.error('Error creating session:', error);
        }
      }
    };

    createSession();
  }, [sessionId, selectedAgent]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || !sessionId || !selectedAgent) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/api/v1/agents/messages', {
        text: input,
        session_id: sessionId,
        agent_id: selectedAgent.agent_id
      });

      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        text: response.data.text,
        sender: 'agent',
        agentId: response.data.agent_id,
        agentName: selectedAgent.name,
        timestamp: new Date(),
        metadata: response.data.metadata
      };

      setMessages(prev => [...prev, agentMessage]);

      // Check if there's an action result that needs to be handled
      if (response.data.metadata?.action_result?.handled && onAgentAction) {
        onAgentAction('message_action', response.data.metadata.action_result);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          text: 'Sorry, there was an error processing your message. Please try again.',
          sender: 'agent',
          agentId: selectedAgent.agent_id,
          agentName: selectedAgent.name,
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    handleMenuClose();
  };

  const handleClearChat = async () => {
    // Create a new session
    try {
      const response = await api.post('/api/v1/agents/sessions');
      setSessionId(response.data.session_id);
      
      // Reset messages with welcome message
      if (selectedAgent) {
        setMessages([
          {
            id: 'welcome',
            text: `Hello! I'm ${selectedAgent.name}. How can I help you with your subscription today?`,
            sender: 'agent',
            agentId: selectedAgent.agent_id,
            agentName: selectedAgent.name,
            timestamp: new Date()
          }
        ]);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating new session:', error);
    }
    
    handleMenuClose();
  };

  return (
    <Paper elevation={3} sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, backgroundColor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SmartToyIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            {selectedAgent ? selectedAgent.name : 'AI Assistant'}
          </Typography>
        </Box>
        <IconButton color="inherit" onClick={handleMenuOpen}>
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleClearChat}>Clear Chat</MenuItem>
          <Divider />
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
            Select Agent
          </Typography>
          {agents.map(agent => (
            <MenuItem 
              key={agent.agent_id} 
              onClick={() => handleAgentSelect(agent)}
              selected={selectedAgent?.agent_id === agent.agent_id}
            >
              {agent.name}
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, backgroundColor: 'grey.50' }}>
        <List>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              sx={{
                flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                mb: 2
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: message.sender === 'user' ? 'primary.main' : 'secondary.main' }}>
                  {message.sender === 'user' ? <PersonIcon /> : <SmartToyIcon />}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="subtitle2">
                    {message.sender === 'user' ? 'You' : message.agentName || 'Assistant'}
                  </Typography>
                }
                secondary={
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      backgroundColor: message.sender === 'user' ? 'primary.light' : 'white',
                      color: message.sender === 'user' ? 'white' : 'text.primary',
                      maxWidth: '80%',
                      borderRadius: 2
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.text}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                      {formatDate(message.timestamp)}
                    </Typography>
                  </Paper>
                }
                sx={{ 
                  textAlign: message.sender === 'user' ? 'right' : 'left',
                  mr: message.sender === 'user' ? 1 : 0,
                  ml: message.sender === 'user' ? 0 : 1
                }}
              />
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, backgroundColor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || !sessionId || !selectedAgent}
            multiline
            maxRows={4}
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={loading || !input.trim() || !sessionId || !selectedAgent}
          >
            Send
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}; 