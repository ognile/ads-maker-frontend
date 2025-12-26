import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, LogOut, Key } from 'lucide-react'
import { Button } from './ui/button'
import { useToast } from './ui/toast'

const API_BASE = '/api'

interface FBUser {
  id: string
  name: string
}

interface FBAdAccount {
  id: string
  name: string
  account_status: number
  currency: string
  business_name?: string
}

interface FBPage {
  id: string
  name: string
  category?: string
  access_token?: string
}

interface ConnectionStatus {
  connected: boolean
  user: FBUser | null
  ad_account_id: string | null
  page_id: string | null
}

async function getAuthStatus(): Promise<ConnectionStatus> {
  const res = await fetch(`${API_BASE}/fb/auth/status`)
  if (!res.ok) throw new Error('Failed to get auth status')
  return res.json()
}

async function getAdAccounts(): Promise<{ accounts: FBAdAccount[]; selected: string | null }> {
  const res = await fetch(`${API_BASE}/fb/ad-accounts`)
  if (!res.ok) throw new Error('Failed to get ad accounts')
  return res.json()
}

async function getPages(): Promise<{ pages: FBPage[]; selected: string | null }> {
  const res = await fetch(`${API_BASE}/fb/pages`)
  if (!res.ok) throw new Error('Failed to get pages')
  return res.json()
}

async function selectAccount(accountId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/fb/select-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_id: accountId }),
  })
  if (!res.ok) throw new Error('Failed to select account')
}

async function selectPage(pageId: string, pageToken?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/fb/select-page`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_id: pageId, page_token: pageToken }),
  })
  if (!res.ok) throw new Error('Failed to select page')
}

async function disconnect(): Promise<void> {
  const res = await fetch(`${API_BASE}/fb/auth/disconnect`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to disconnect')
}

async function setToken(token: string): Promise<{ user: FBUser }> {
  const res = await fetch(`${API_BASE}/fb/auth/set-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Failed to set token')
  }
  return res.json()
}

export function FacebookConnect() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [tokenInput, setTokenInput] = useState('')
  const [showTokenInput, setShowTokenInput] = useState(false)

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['fb-status'],
    queryFn: getAuthStatus,
  })

  const { data: accountsData } = useQuery({
    queryKey: ['fb-accounts'],
    queryFn: getAdAccounts,
    enabled: !!status?.connected,
  })

  const { data: pagesData } = useQuery({
    queryKey: ['fb-pages'],
    queryFn: getPages,
    enabled: !!status?.connected,
  })

  const setTokenMutation = useMutation({
    mutationFn: setToken,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fb-status'] })
      queryClient.invalidateQueries({ queryKey: ['fb-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['fb-pages'] })
      toast.success(`Connected as ${data.user.name}`)
      setTokenInput('')
      setShowTokenInput(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const selectAccountMutation = useMutation({
    mutationFn: selectAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['fb-status'] })
      toast.success('Ad account selected')
    },
    onError: () => toast.error('Failed to select account'),
  })

  const selectPageMutation = useMutation({
    mutationFn: ({ pageId, pageToken }: { pageId: string; pageToken?: string }) =>
      selectPage(pageId, pageToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-pages'] })
      queryClient.invalidateQueries({ queryKey: ['fb-status'] })
      toast.success('Page selected')
    },
    onError: () => toast.error('Failed to select page'),
  })

  const disconnectMutation = useMutation({
    mutationFn: disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-status'] })
      queryClient.invalidateQueries({ queryKey: ['fb-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['fb-pages'] })
      toast.success('Disconnected from Facebook')
    },
    onError: () => toast.error('Failed to disconnect'),
  })

  const handleSetToken = () => {
    if (tokenInput.trim()) {
      setTokenMutation.mutate(tokenInput.trim())
    }
  }

  if (statusLoading) {
    return (
      <div className="border border-[#E5E5E5] p-6">
        <p className="text-sm text-[#A3A3A3]">Loading...</p>
      </div>
    )
  }

  if (!status?.connected) {
    return (
      <div className="border border-[#E5E5E5] p-6 space-y-4">
        <div>
          <h3 className="font-medium">Facebook Ads</h3>
          <p className="text-sm text-[#737373] mt-1">
            Connect using a System User token from your Business Manager.
          </p>
        </div>

        {showTokenInput ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#737373] block mb-1">System User Access Token</label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your token here..."
                className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTokenInput(false)
                  setTokenInput('')
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSetToken}
                disabled={!tokenInput.trim() || setTokenMutation.isPending}
              >
                {setTokenMutation.isPending ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowTokenInput(true)}>
            <Key className="w-4 h-4 mr-2" />
            Enter Token
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="border border-[#E5E5E5] divide-y divide-[#E5E5E5]">
      {/* Connected User */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1877F2] text-white flex items-center justify-center text-sm font-medium">
            {status.user?.name?.[0] || 'F'}
          </div>
          <div>
            <p className="text-sm font-medium">{status.user?.name}</p>
            <p className="text-xs text-[#A3A3A3]">Connected</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
        >
          <LogOut className="w-4 h-4 mr-1" />
          Disconnect
        </Button>
      </div>

      {/* Ad Account Selection */}
      <div className="p-4 space-y-3">
        <h4 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
          Ad Account
        </h4>
        {accountsData?.accounts.length === 0 ? (
          <p className="text-sm text-[#A3A3A3]">No ad accounts found</p>
        ) : (
          <div className="space-y-2">
            {accountsData?.accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => selectAccountMutation.mutate(account.id)}
                disabled={selectAccountMutation.isPending}
                className={`w-full text-left p-3 border transition-colors ${
                  accountsData.selected === account.id
                    ? 'border-black bg-[#FAFAFA]'
                    : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-xs text-[#A3A3A3]">
                      {account.id} {account.business_name && `· ${account.business_name}`}
                    </p>
                  </div>
                  {accountsData.selected === account.id && (
                    <Check className="w-4 h-4" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Page Selection */}
      <div className="p-4 space-y-3">
        <h4 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
          Facebook Page
        </h4>
        {pagesData?.pages.length === 0 ? (
          <p className="text-sm text-[#A3A3A3]">No pages found</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pagesData?.pages.map((page) => (
              <button
                key={page.id}
                onClick={() => selectPageMutation.mutate({ pageId: page.id, pageToken: page.access_token })}
                disabled={selectPageMutation.isPending}
                className={`w-full text-left p-3 border transition-colors ${
                  pagesData.selected === page.id
                    ? 'border-black bg-[#FAFAFA]'
                    : 'border-[#E5E5E5] hover:border-[#D4D4D4]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{page.name}</p>
                    {page.category && (
                      <p className="text-xs text-[#A3A3A3]">{page.category}</p>
                    )}
                  </div>
                  {pagesData.selected === page.id && (
                    <Check className="w-4 h-4" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Summary */}
      {status.ad_account_id && status.page_id && (
        <div className="p-4 bg-[#FAFAFA]">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="w-4 h-4" />
            Ready to push ads
          </div>
        </div>
      )}
    </div>
  )
}
