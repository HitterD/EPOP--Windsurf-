'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RichEditor } from '@/components/ui/rich-editor'
import { useSendMail, useMailMessage } from '@/lib/api/hooks/use-mail'
import { useFiles } from '@/lib/api/hooks/use-files'
import { toast } from 'sonner'
import type { FileItem, CursorPaginatedResponse } from '@/types'

const schema = z.object({
  to: z.string().min(1, 'Recipient is required'),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
})

type FormValues = z.infer<typeof schema>

export default function MailComposePage() {
  const router = useRouter()
  const params = useSearchParams()
  const replyTo = params.get('replyTo') || undefined
  const forward = params.get('forward') || undefined
  const subjectPrefill = params.get('subject') || ''
  const bodyPrefill = params.get('body') || ''
  const attachmentsPrefill = params.get('attachments') || ''

  const { data: replyMsg } = useMailMessage(replyTo || forward)
  const { data: filesData } = useFiles()
  const fileItems = useMemo(() => {
    const pages = (filesData?.pages || []) as Array<CursorPaginatedResponse<FileItem>>
    return pages.flatMap((p) => p.items || [])
  }, [filesData])

  const [attachments, setAttachments] = useState<{ name: string; url: string; fileId?: string }[]>([])
  const [attName, setAttName] = useState('')
  const [attUrl, setAttUrl] = useState('')
  const [showFilePicker, setShowFilePicker] = useState(false)

  // Prefill attachments from query param (JSON string[] of URLs)
  useEffect(() => {
    if (!attachmentsPrefill) return
    try {
      const urls = JSON.parse(attachmentsPrefill) as string[]
      if (Array.isArray(urls) && urls.length > 0) {
        setAttachments((prev) => {
          const existing = new Set(prev.map((a) => a.url))
          const toAdd = urls.filter((u) => u && !existing.has(u)).map((u) => ({ name: u, url: u }))
          return [...prev, ...toAdd]
        })
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const defaultValues = useMemo<FormValues>(() => {
    if (replyTo && replyMsg) {
      return {
        to: replyMsg.from,
        cc: '',
        bcc: '',
        subject: replyMsg.subject.startsWith('Re:') ? replyMsg.subject : `Re: ${replyMsg.subject}`,
        body: `\n\nOn ${new Date(replyMsg.createdAt).toLocaleString()}, ${replyMsg.from} wrote:\n${stripHtml(replyMsg.body)}`,
      }
    }
    if (forward && replyMsg) {
      return {
        to: '',
        cc: '',
        bcc: '',
        subject: replyMsg.subject.startsWith('Fwd:') ? replyMsg.subject : `Fwd: ${replyMsg.subject}`,
        body: `\n\n---------- Forwarded message ----------\nFrom: ${replyMsg.from}\nDate: ${new Date(replyMsg.createdAt).toLocaleString()}\nSubject: ${replyMsg.subject}\n\n${stripHtml(replyMsg.body)}`,
      }
    }
    return { to: '', cc: '', bcc: '', subject: subjectPrefill, body: bodyPrefill }
  }, [replyTo, forward, replyMsg, subjectPrefill, bodyPrefill])

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })
  const sendMail = useSendMail()

  const onSubmit = (values: FormValues) => {
    const payload = {
      to: splitList(values.to),
      ...(values.cc ? { cc: splitList(values.cc) } : {}),
      ...(values.bcc ? { bcc: splitList(values.bcc) } : {}),
      subject: values.subject,
      body: values.body,
      ...(attachments.length ? { attachments: attachments.map((a) => a.url) } : {}),
    }
    sendMail.mutate(payload, {
      onSuccess: () => {
        toast.success('Message sent')
        router.push('/mail/sent')
      },
      onError: (e) => toast.error((e as Error).message),
    })
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-4 text-2xl font-semibold">Compose</h1>
      <Card>
        <CardContent className="space-y-4 p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">To</label>
              <Input placeholder="email@example.com, other@example.com" {...form.register('to')} />
              {form.formState.errors.to && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.to.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">CC</label>
                <Input placeholder="comma separated" {...form.register('cc')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">BCC</label>
                <Input placeholder="comma separated" {...form.register('bcc')} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Subject</label>
              <Input placeholder="Subject" {...form.register('subject')} />
              {form.formState.errors.subject && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.subject.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Body</label>
              <RichEditor
                value={form.watch('body')}
                onChange={(html) => form.setValue('body', html, { shouldDirty: true })}
                placeholder="Write your message..."
              />
              {form.formState.errors.body && (
                <p className="mt-1 text-xs text-destructive">{form.formState.errors.body.message}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendMail.isPending}>
                {sendMail.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </form>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Attachments</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input placeholder="Name (optional)" value={attName} onChange={(e) => setAttName(e.target.value)} />
              <Input placeholder="URL" value={attUrl} onChange={(e) => setAttUrl(e.target.value)} />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!attUrl.trim()) return
                  setAttachments((prev) => [...prev, { name: attName.trim(), url: attUrl.trim() }])
                  setAttName('')
                  setAttUrl('')
                }}
              >
                Add
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowFilePicker((s) => !s)}>
                {showFilePicker ? 'Hide Files' : 'Browse Files'}
              </Button>
            </div>
            {attachments.length > 0 && (
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {attachments.map((a, idx) => (
                  <li key={`${a.url}-${idx}`} className="flex items-center justify-between">
                    <span className="truncate">
                      {a.name || a.url}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {showFilePicker && (
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-medium">Your Files</div>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {fileItems.map((f: FileItem) => (
                    <div key={f.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium" title={f.name}>{f.name}</div>
                        <div className="text-muted-foreground">{Math.round(f.size / 1024)} KB</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setAttachments((prev) => [
                            ...prev,
                            { name: f.name, url: f.url, fileId: f.id },
                          ])
                        }}
                      >
                        Attach
                      </Button>
                    </div>
                  ))}
                  {fileItems.length === 0 && (
                    <div className="col-span-full text-sm text-muted-foreground">No files uploaded yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function stripHtml(html: string): string {
  if (!html) return ''
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
}
