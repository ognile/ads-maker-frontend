import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Paperclip,
  X,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from './ui/button'
import { ConfirmationCard } from './ConfirmationCard'
import { API_BASE } from '../config'
import { authFetch, useAuth } from '../auth'

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: any[]
  tool_results?: any[]
  attachments?: any[]
  created_at: string
}

interface Confirmation {
  id: string
  conversation_id: string
  action_type: string
  action_data: any
  status: string
  created_at: string
}

interface Attachment {
  file_name: string
  type: string
  data: string
  size: number
}

async function fetchConversations(): Promise<Conversation[]> {
  const res = await authFetch(`${API_BASE}/chat/conversations`)
  if (!res.ok) throw new Error('Failed to fetch conversations')
  return res.json()
}

async function createConversation(title?: string): Promise<Conversation> {
  const res = await authFetch(`${API_BASE}/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error('Failed to create conversation')
  return res.json()
}

async function deleteConversation(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/chat/conversations/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete conversation')
}

async function fetchMessages(conversationId: string): Promise<Message[]> {
  const res = await authFetch(`${API_BASE}/chat/conversations/${conversationId}/messages`)
  if (!res.ok) throw new Error('Failed to fetch messages')
  return res.json()
}

async function fetchConfirmations(conversationId: string): Promise<Confirmation[]> {
  const res = await authFetch(`${API_BASE}/chat/conversations/${conversationId}/confirmations`)
  if (!res.ok) throw new Error('Failed to fetch confirmations')
  return res.json()
}

async function uploadFile(conversationId: string, file: File): Promise<Attachment> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await authFetch(`${API_BASE}/chat/conversations/${conversationId}/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to upload file')
  return res.json()
}

export function Chat() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    enabled: isAuthenticated,
  })

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => selectedConversationId ? fetchMessages(selectedConversationId) : Promise.resolve([]),
    enabled: !!selectedConversationId,
    refetchInterval: isStreaming ? false : 5000, // Refresh every 5s when not streaming
  })

  // Fetch confirmations
  const { data: confirmations = [] } = useQuery({
    queryKey: ['confirmations', selectedConversationId],
    queryFn: () => selectedConversationId ? fetchConfirmations(selectedConversationId) : Promise.resolve([]),
    enabled: !!selectedConversationId,
    refetchInterval: 3000,
  })

  // Auto-select first conversation or create one
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id)
    }
  }, [conversations, selectedConversationId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent, pendingUserMessage])

  // Create conversation mutation
  const createMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setSelectedConversationId(newConv.id)
    },
  })

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (conversations.length > 1) {
        setSelectedConversationId(conversations.find(c => c.id !== selectedConversationId)?.id || null)
      } else {
        setSelectedConversationId(null)
      }
    },
  })

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !selectedConversationId) return

    for (const file of files) {
      try {
        const uploaded = await uploadFile(selectedConversationId, file)
        setAttachments(prev => [...prev, uploaded])
      } catch (error) {
        console.error('Failed to upload file:', error)
      }
    }

    e.target.value = '' // Reset input
  }

  // Send message with SSE streaming
  const sendMessage = useCallback(async () => {
    if (!message.trim() || !selectedConversationId || isStreaming) return

    const currentMessage = message
    const currentAttachments = attachments

    // Show user message instantly (optimistic update)
    setPendingUserMessage(currentMessage)
    setMessage('')
    setAttachments([])
    setIsStreaming(true)
    setStreamContent('')

    try {
      const response = await authFetch(`${API_BASE}/chat/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMessage,
          attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'content') {
                setStreamContent(prev => prev + data.content)
              } else if (data.type === 'done') {
                // Refresh messages
                queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] })
              } else if (data.type === 'error') {
                console.error('Stream error:', data.error)
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsStreaming(false)
      setStreamContent('')
      setPendingUserMessage(null)
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] })
    }
  }, [message, attachments, selectedConversationId, isStreaming, queryClient])

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-200 border-r border-[#E5E5E5] flex-shrink-0 overflow-hidden`}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-[#E5E5E5] flex items-center justify-between">
            <span className="text-sm font-medium">Conversations</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => createMutation.mutate(undefined)}
              disabled={createMutation.isPending}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="p-4 text-center text-sm text-[#A3A3A3]">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-[#A3A3A3]">
                No conversations yet.
                <br />
                <button
                  onClick={() => createMutation.mutate(undefined)}
                  className="text-black underline mt-2"
                >
                  Start one
                </button>
              </div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversationId(conv.id)}
                  className={`p-3 cursor-pointer border-b border-[#F5F5F5] hover:bg-[#FAFAFA] flex items-center justify-between group ${
                    selectedConversationId === conv.id ? 'bg-[#F5F5F5]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="w-4 h-4 text-[#A3A3A3] flex-shrink-0" />
                    <span className="text-sm truncate">{conv.title || 'New Chat'}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMutation.mutate(conv.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#A3A3A3] hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex-shrink-0 w-6 flex items-center justify-center border-r border-[#E5E5E5] text-[#A3A3A3] hover:text-black hover:bg-[#FAFAFA]"
      >
        <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversationId ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="text-center text-sm text-[#A3A3A3]">Loading messages...</div>
              ) : messages.length === 0 && !streamContent && !pendingUserMessage ? (
                <div className="text-center text-sm text-[#A3A3A3] mt-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet.</p>
                  <p className="mt-1">Try: "Create 3 ads for NUORA" or "Analyze my losing ads"</p>
                </div>
              ) : (
                <>
                  {messages.filter(msg => msg.content).map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 text-sm ${
                          msg.role === 'user'
                            ? 'bg-black text-white'
                            : 'bg-[#F5F5F5] text-black'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        ) : (
                          <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5 prose-strong:font-semibold prose-code:bg-black/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/10 prose-pre:p-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content || ''}
                            </ReactMarkdown>
                          </div>
                        )}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/20">
                            {msg.attachments.map((att: any, i: number) => (
                              <div key={i} className="flex items-center gap-1 text-xs opacity-70">
                                <Paperclip className="w-3 h-3" />
                                {att.file_name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pending user message (optimistic) */}
                  {pendingUserMessage && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] p-3 text-sm bg-black text-white">
                        <span className="whitespace-pre-wrap">{pendingUserMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Thinking animation (when waiting for response) */}
                  {isStreaming && !streamContent && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] p-3 text-sm bg-[#F5F5F5] text-black">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Streaming content */}
                  {streamContent && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] p-3 text-sm bg-[#F5F5F5] text-black">
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5 prose-strong:font-semibold prose-code:bg-black/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/10 prose-pre:p-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamContent}
                          </ReactMarkdown>
                        </div>
                        {isStreaming && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/10">
                            <Loader2 className="w-3 h-3 animate-spin text-black/50" />
                            <span className="text-xs text-black/50">Working...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pending confirmations */}
                  {confirmations.map(conf => (
                    <ConfirmationCard
                      key={conf.id}
                      confirmation={conf}
                      onConfirm={async () => {
                        await authFetch(`${API_BASE}/chat/confirmations/${conf.id}/confirm`, {
                          method: 'POST',
                        })
                        queryClient.invalidateQueries({ queryKey: ['confirmations', selectedConversationId] })
                        queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] })
                      }}
                      onCancel={async () => {
                        await authFetch(`${API_BASE}/chat/confirmations/${conf.id}/cancel`, {
                          method: 'POST',
                        })
                        queryClient.invalidateQueries({ queryKey: ['confirmations', selectedConversationId] })
                      }}
                    />
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-[#E5E5E5] p-4">
              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-2 py-1 bg-[#F5F5F5] text-sm"
                    >
                      {att.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                      <span className="truncate max-w-[150px]">{att.file_name}</span>
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                        className="text-[#A3A3A3] hover:text-black"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.csv,.txt,.md"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-[#A3A3A3] hover:text-black"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-3 py-2 border border-[#E5E5E5] focus:border-black focus:outline-none resize-none text-sm"
                  style={{
                    minHeight: '40px',
                    maxHeight: '120px',
                  }}
                  disabled={isStreaming}
                />

                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || isStreaming}
                  size="sm"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-[#A3A3A3]" />
              <p className="text-sm text-[#A3A3A3]">
                {conversations.length === 0
                  ? 'Create a conversation to get started'
                  : 'Select a conversation'}
              </p>
              {conversations.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => createMutation.mutate(undefined)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
