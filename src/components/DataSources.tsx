import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, RefreshCw, X } from 'lucide-react'
import { Button } from './ui/button'
import type { DataSource } from '../App'

interface DataSourcesProps {
  sources: DataSource[]
  onRefresh: () => void
}

import { API_BASE } from '../config'
import { authFetch } from '../auth'

type AddMode = 'file' | 'text'

export function DataSources({ sources, onRefresh }: DataSourcesProps) {
  const [addModal, setAddModal] = useState<{ open: boolean; mode: AddMode | null }>({
    open: false,
    mode: null,
  })
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [fileType, setFileType] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    if (!name.trim() || !content.trim()) return

    setIsSubmitting(true)
    try {
      const res = await authFetch(`${API_BASE}/data-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          source_type: addModal.mode === 'file' ? 'file' : 'text',
          file_type: fileType,
          content: content.trim(),
        }),
      })
      if (res.ok) {
        setAddModal({ open: false, mode: null })
        setName('')
        setContent('')
        setFileType(null)
        onRefresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await authFetch(`${API_BASE}/data-sources/${id}`, { method: 'DELETE' })
    if (res.ok) {
      onRefresh()
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Determine file type
    const ext = file.name.split('.').pop()?.toLowerCase()
    setFileType(ext || null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setContent(text)
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ''))  // Remove extension
      }
    }
    reader.readAsText(file)
  }

  const openFileModal = () => {
    setAddModal({ open: true, mode: 'file' })
    setName('')
    setContent('')
    setFileType(null)
  }

  const openTextModal = () => {
    setAddModal({ open: true, mode: 'text' })
    setName('')
    setContent('')
    setFileType(null)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[720px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Data Sources</h2>
          <button
            onClick={onRefresh}
            className="p-2 text-[#A3A3A3] hover:text-black transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Add Options - Just 2 buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={openFileModal}
            className="p-6 border border-[#E5E5E5] hover:border-[#D4D4D4] transition-colors text-center space-y-2"
          >
            <Upload className="w-6 h-6 mx-auto text-[#737373]" />
            <span className="text-sm font-medium block">Upload File</span>
            <span className="text-xs text-[#A3A3A3] block">CSV, TXT, PDF</span>
          </button>
          <button
            onClick={openTextModal}
            className="p-6 border border-[#E5E5E5] hover:border-[#D4D4D4] transition-colors text-center space-y-2"
          >
            <FileText className="w-6 h-6 mx-auto text-[#737373]" />
            <span className="text-sm font-medium block">Paste Text</span>
            <span className="text-xs text-[#A3A3A3] block">Reviews, notes, copy</span>
          </button>
        </div>

        {/* Naming hint */}
        <div className="text-xs text-[#A3A3A3] space-y-1">
          <p>Tip: Name your sources descriptively for auto-detection:</p>
          <p className="text-[#737373]">
            "metrics" = ad performance data | "reviews" = customer reviews | "survey" = survey data | "good copy" = style examples
          </p>
        </div>

        {/* Current Sources */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-[#737373] uppercase tracking-wide">
            Current Sources ({sources.length})
          </h3>

          {sources.length === 0 ? (
            <div className="border border-[#E5E5E5] p-8 text-center">
              <p className="text-sm text-[#A3A3A3]">No data sources yet</p>
              <p className="text-xs text-[#A3A3A3] mt-1">Upload files or paste text to start</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="border border-[#E5E5E5] p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-medium">{source.name}</span>
                    <span className="text-xs text-[#A3A3A3] ml-3">
                      {source.content.length.toLocaleString()} chars
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(source.id)}
                    className="p-1 text-[#A3A3A3] hover:text-black transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.txt,.pdf"
        className="hidden"
      />

      {/* Add Modal */}
      {addModal.open && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-lg m-4">
            <div className="flex items-center justify-between p-4 border-b border-[#E5E5E5]">
              <h3 className="font-medium">
                {addModal.mode === 'file' ? 'Upload File' : 'Paste Text'}
              </h3>
              <button
                onClick={() => setAddModal({ open: false, mode: null })}
                className="text-[#A3A3A3] hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., December Metrics, Customer Reviews, Good Copy Examples"
                  className="w-full h-9 px-3 border border-[#E5E5E5] text-sm focus:outline-none focus:border-black"
                />
                <p className="text-xs text-[#A3A3A3]">
                  Name helps auto-detect type: include "metrics", "reviews", "survey", or "good copy"
                </p>
              </div>

              {addModal.mode === 'file' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">File</label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {content ? 'Change File' : 'Choose File'}
                  </Button>
                  {content && (
                    <p className="text-xs text-[#737373]">
                      Loaded: {content.split('\n').length} lines
                      {fileType && ` (${fileType.toUpperCase()})`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your content here..."
                    className="w-full h-48 p-3 border border-[#E5E5E5] text-sm resize-none focus:outline-none focus:border-black"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAddModal({ open: false, mode: null })}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAdd}
                  disabled={!name.trim() || !content.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
