import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Circle, LogOut } from 'lucide-react'
import { Button } from './components/ui/button'
import { useToast } from './components/ui/toast'
import { ConceptList } from './components/ConceptList'
import { ConceptDetail } from './components/ConceptDetail'
import { WorkLogDrawer } from './components/WorkLogDrawer'
import { SwipeFile } from './components/SwipeFile'
import { Products } from './components/Products'
import { Settings } from './components/Settings'
import { Library } from './components/Library'
import { Campaigns } from './components/Campaigns'
import { Analytics } from './components/Analytics'
import { Learnings } from './components/Learnings'
import { Chat } from './components/Chat'
import { ImageStudio } from './components/ImageStudio'
import { useAuth, Login, authFetch } from './auth'

export interface DataSource {
  id: string
  name: string
  type: 'document' | 'sheet' | 'url'
  content: string
  created_at: string
}

export interface Pattern {
  id: string
  source: string
  pattern: string
  mentions: number
  emotional_valence: string
  example_quotes: string[]
}

export interface Hypothesis {
  id: string
  pattern_id: string
  hypothesis: string
  reasoning: string
  confidence: number
}

export interface ChangelogEntry {
  original: string
  revised: string
  reason: string
}

export interface AdConcept {
  id: string
  batch_number: string
  status: 'researching' | 'generating' | 'reviewing' | 'ready' | 'approved' | 'rejected'
  patterns_used: Pattern[]
  hypothesis: Hypothesis
  original_primary_text?: string
  primary_texts: string[]
  revision_changelog?: ChangelogEntry[]
  headlines: string[]
  images: string[]
  principle_check: {
    passed: boolean
    score?: number
    issues?: Array<{ rule: string; problem: string; fix: string }>
    strengths?: string[]
    ai_slop_detected?: string[]
    overall?: string
    notes?: string[]
  }
  user_notes?: string
  rating?: number
  drive_folder_id?: string
  created_at: string
}

export interface WorkLogEntry {
  id: string
  timestamp: string
  type: 'info' | 'research' | 'pattern' | 'hypothesis' | 'generation' | 'review' | 'ready' | 'error'
  message: string
  details?: string
}

export interface Product {
  id: string
  name: string
  landing_page_url?: string
  mechanism?: string
  ingredients?: string
  created_at: string
  updated_at: string
}

import { API_BASE } from './config'

async function fetchAdConcepts(): Promise<AdConcept[]> {
  const res = await authFetch(`${API_BASE}/concepts`)
  if (!res.ok) throw new Error('Failed to fetch concepts')
  return res.json()
}

async function fetchWorkLog(): Promise<WorkLogEntry[]> {
  const res = await authFetch(`${API_BASE}/work-log`)
  if (!res.ok) throw new Error('Failed to fetch work log')
  return res.json()
}

async function fetchProducts(): Promise<Product[]> {
  const res = await authFetch(`${API_BASE}/products`)
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

async function startWorking(productId: string | null, ideas?: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/start-working`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, ideas }),
  })
  if (!res.ok) throw new Error('Failed to start')
}

async function stopWorking(): Promise<void> {
  const res = await authFetch(`${API_BASE}/stop-working`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to stop')
}

async function approveConcept(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/concepts/${id}/approve`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to approve')
}

async function rejectConcept(id: string, feedback: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/concepts/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback }),
  })
  if (!res.ok) throw new Error('Failed to reject')
}

async function addNotes(id: string, notes: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/concepts/${id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) throw new Error('Failed to save notes')
}

async function setRating(id: string, rating: number): Promise<void> {
  const res = await authFetch(`${API_BASE}/concepts/${id}/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  })
  if (!res.ok) throw new Error('Failed to save rating')
}

async function deleteConcept(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/concepts/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete concept')
}

type ViewType = 'chat' | 'work' | 'library' | 'campaigns' | 'analytics' | 'learnings' | 'swipes' | 'studio' | 'products' | 'settings'
const validViews: ViewType[] = ['chat', 'work', 'library', 'campaigns', 'analytics', 'learnings', 'swipes', 'studio', 'products', 'settings']

// Read initial view from URL hash or localStorage
const getInitialView = (): ViewType => {
  const hash = window.location.hash.slice(1)
  if (hash && validViews.includes(hash as ViewType)) {
    return hash as ViewType
  }
  const stored = localStorage.getItem('currentView')
  if (stored && validViews.includes(stored as ViewType)) {
    return stored as ViewType
  }
  return 'chat'
}

function App() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { isAuthenticated, isLoading: isAuthLoading, user, logout } = useAuth()

  const [view, setViewState] = useState<ViewType>(getInitialView)

  // Wrapper to persist view changes
  const setView = (newView: typeof view) => {
    setViewState(newView)
    window.location.hash = newView
    localStorage.setItem('currentView', newView)
  }

  // Handle browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      const validViews = ['chat', 'work', 'library', 'campaigns', 'analytics', 'learnings', 'swipes', 'products', 'settings']
      if (hash && validViews.includes(hash)) {
        setViewState(hash as typeof view)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  const [isWorking, setIsWorking] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null)
  const [workLogExpanded, setWorkLogExpanded] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: isAuthenticated,
  })

  const { data: concepts = [], isLoading: isLoadingConcepts } = useQuery({
    queryKey: ['concepts'],
    queryFn: fetchAdConcepts,
    refetchInterval: isWorking ? 2000 : false,
    enabled: isAuthenticated,
  })

  const { data: workLog = [] } = useQuery({
    queryKey: ['workLog'],
    queryFn: fetchWorkLog,
    refetchInterval: isWorking ? 1000 : false,
    enabled: isAuthenticated,
  })

  // Auto-select first product if none selected
  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id)
    }
  }, [products, selectedProductId])

  const startMutation = useMutation({
    mutationFn: ({ productId, ideas }: { productId: string | null; ideas?: string }) => startWorking(productId, ideas),
    onSuccess: () => {
      setIsWorking(true)
      queryClient.invalidateQueries({ queryKey: ['workLog'] })
    },
  })

  const handleCreateConcept = (ideas?: string) => {
    startMutation.mutate({ productId: selectedProductId, ideas })
  }

  const stopMutation = useMutation({
    mutationFn: stopWorking,
    onSuccess: () => {
      setIsWorking(false)
    },
  })

  const approveMutation = useMutation({
    mutationFn: approveConcept,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] })
      toast.success('Concept approved')
    },
    onError: () => {
      toast.error('Failed to approve concept')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) => rejectConcept(id, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] })
      toast.info('Concept rejected with feedback')
    },
    onError: () => {
      toast.error('Failed to reject concept')
    },
  })

  const notesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => addNotes(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] })
      toast.success('Notes saved')
    },
    onError: () => {
      toast.error('Failed to save notes')
    },
  })

  const ratingMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => setRating(id, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteConcept,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concepts'] })
      setSelectedConceptId(null)
      toast.success('Concept deleted')
    },
    onError: () => {
      toast.error('Failed to delete concept')
    },
  })

  const selectedConcept = concepts.find(c => c.id === selectedConceptId) || null
  const latestLog = workLog[workLog.length - 1]

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input or textarea
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

    // Only work in work view
    if (view !== 'work') return

    // j/k to navigate concepts
    if (e.key === 'j' || e.key === 'k') {
      e.preventDefault()
      const currentIndex = concepts.findIndex(c => c.id === selectedConceptId)
      const newIndex = e.key === 'j'
        ? Math.min(currentIndex + 1, concepts.length - 1)
        : Math.max(currentIndex - 1, 0)
      if (concepts[newIndex]) {
        setSelectedConceptId(concepts[newIndex].id)
      }
    }

    // 1-5 to rate
    if (['1', '2', '3', '4', '5'].includes(e.key) && selectedConceptId) {
      e.preventDefault()
      ratingMutation.mutate({ id: selectedConceptId, rating: parseInt(e.key) })
    }

    // cmd+enter to approve
    if (e.key === 'Enter' && e.metaKey && selectedConcept?.status === 'ready') {
      e.preventDefault()
      approveMutation.mutate(selectedConceptId!)
    }
  }, [view, concepts, selectedConceptId, selectedConcept, ratingMutation, approveMutation])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Auto-select first ready concept if none selected
  useEffect(() => {
    if (!selectedConceptId && concepts.length > 0) {
      const readyConcept = concepts.find(c => c.status === 'ready')
      if (readyConcept) {
        setSelectedConceptId(readyConcept.id)
      } else if (concepts[0]) {
        setSelectedConceptId(concepts[0].id)
      }
    }
  }, [concepts, selectedConceptId])

  // Handle FB OAuth callback - check for errors and clear URL
  useEffect(() => {
    if (window.location.pathname === '/fb-callback') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('error')) {
        console.log('FB OAuth cancelled:', params.get('error_description'))
      }
      window.history.replaceState({}, '', '/')
    }
  }, [])

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-sm text-[#737373]">Loading...</div>
      </div>
    )
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div className="h-screen flex flex-col bg-white noise">
      {/* Header - 48px, minimal */}
      <header className="h-12 border-b border-[#E5E5E5] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight">AI Ad Maker</span>
          <div className="flex gap-1">
            <button
              onClick={() => setView('chat')}
              className={`px-3 py-1 text-sm ${view === 'chat' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setView('work')}
              className={`px-3 py-1 text-sm ${view === 'work' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Work
            </button>
            <button
              onClick={() => setView('library')}
              className={`px-3 py-1 text-sm ${view === 'library' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Library
            </button>
            <button
              onClick={() => setView('campaigns')}
              className={`px-3 py-1 text-sm ${view === 'campaigns' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`px-3 py-1 text-sm ${view === 'analytics' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Analytics
            </button>
            <button
              onClick={() => setView('learnings')}
              className={`px-3 py-1 text-sm ${view === 'learnings' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Learnings
            </button>
            <button
              onClick={() => setView('swipes')}
              className={`px-3 py-1 text-sm ${view === 'swipes' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Swipe File
            </button>
            <button
              onClick={() => setView('studio')}
              className={`px-3 py-1 text-sm ${view === 'studio' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Studio
            </button>
            <button
              onClick={() => setView('products')}
              className={`px-3 py-1 text-sm ${view === 'products' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Products
            </button>
            <button
              onClick={() => setView('settings')}
              className={`px-3 py-1 text-sm ${view === 'settings' ? 'text-black' : 'text-[#A3A3A3] hover:text-[#737373]'}`}
            >
              Settings
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {products.length > 0 && (
            <select
              value={selectedProductId || ''}
              onChange={(e) => setSelectedProductId(e.target.value || null)}
              className="h-8 px-2 text-sm border border-[#E5E5E5] bg-white focus:outline-none focus:border-black"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {isWorking && (
            <div className="flex items-center gap-2 text-sm">
              <Circle className="w-2 h-2 fill-black animate-pulse" />
              <span className="text-[#737373]">Working...</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
              >
                Stop
              </Button>
            </div>
          )}

          {/* User menu */}
          <div className="flex items-center gap-2 pl-3 border-l border-[#E5E5E5]">
            <span className="text-xs text-[#737373]">{user?.email}</span>
            <button
              onClick={logout}
              className="p-1.5 text-[#A3A3A3] hover:text-black"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {view === 'chat' ? (
        <Chat />
      ) : view === 'settings' ? (
        <Settings />
      ) : view === 'campaigns' ? (
        <Campaigns />
      ) : view === 'analytics' ? (
        <Analytics />
      ) : view === 'learnings' ? (
        <Learnings />
      ) : view === 'products' ? (
        <Products
          products={products}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
        />
      ) : view === 'library' ? (
        <Library
          concepts={concepts}
          onSelectConcept={(id) => {
            setSelectedConceptId(id)
            setView('work')
          }}
          onSetRating={(id, rating) => ratingMutation.mutate({ id, rating })}
          onDownload={(ids) => {
            // Download functionality - for now just log
            console.log('Download concepts:', ids)
          }}
        />
      ) : view === 'work' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Concept List - 220px */}
            <div className="w-[220px] border-r border-[#E5E5E5] flex-shrink-0">
              <ConceptList
                concepts={concepts}
                selectedId={selectedConceptId}
                onSelect={setSelectedConceptId}
                isLoading={isLoadingConcepts}
                isWorking={isWorking}
                onCreateConcept={handleCreateConcept}
              />
            </div>

            {/* Right: Detail View */}
            <div className="flex-1 overflow-hidden">
              <ConceptDetail
                concept={selectedConcept}
                product={products.find(p => p.id === selectedProductId) || null}
                onApprove={(id) => approveMutation.mutate(id)}
                onReject={(id, feedback) => rejectMutation.mutate({ id, feedback })}
                onAddNotes={(id, notes) => notesMutation.mutate({ id, notes })}
                onSetRating={(id, rating) => ratingMutation.mutate({ id, rating })}
                onDelete={(id) => deleteMutation.mutate(id)}
                isApproving={approveMutation.isPending}
                isDeleting={deleteMutation.isPending}
              />
            </div>
          </div>

          {/* Work Log Drawer */}
          <WorkLogDrawer
            entries={workLog}
            expanded={workLogExpanded}
            onToggle={() => setWorkLogExpanded(!workLogExpanded)}
            latestMessage={latestLog?.message}
          />
        </div>
      ) : view === 'swipes' ? (
        <SwipeFile />
      ) : view === 'studio' ? (
        <ImageStudio />
      ) : null}
    </div>
  )
}

export default App
