import { useMemo, useState } from 'react';
import { ArrowLeft, MessageSquare, Paperclip, Search, Sparkles, UserX, Users } from 'lucide-react';
import type { LinkedInDataset, RowRecord } from '../types/linkedin';
import { createPatternMatcher } from '../lib/wildcard';
import { ResponsiveDataTable } from './ResponsiveDataTable';

interface MessagesViewProps {
  dataset: LinkedInDataset;
}

export function MessagesView({ dataset }: MessagesViewProps) {
  const messages = dataset.tables.messages ?? [];
  const connections = dataset.tables.connections ?? [];

  const [tab, setTab] = useState<'threads' | 'top_contacts' | 'unconnected'>('threads');
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('ALL');
  const [onlyAttachments, setOnlyAttachments] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const folders = useMemo(() => {
    const set = new Set<string>();
    messages.forEach((m) => {
      if (m.FOLDER) set.add(m.FOLDER);
    });
    return ['ALL', ...Array.from(set)];
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const matcher = createPatternMatcher(search);
    return messages.filter((m) => {
      if (folderFilter !== 'ALL' && m.FOLDER !== folderFilter) return false;
      if (onlyAttachments && !(m.ATTACHMENTS ?? '').trim()) return false;
      if (search.trim()) {
        const hay = `${m['CONVERSATION TITLE'] ?? ''} ${m.FROM ?? ''} ${m.TO ?? ''} ${m.SUBJECT ?? ''} ${m.CONTENT ?? ''}`;
        if (!matcher(hay)) return false;
      }
      return true;
    });
  }, [messages, search, folderFilter, onlyAttachments]);

  const conversations = useMemo(() => {
    const map = new Map<
      string,
      { id: string; title: string; count: number; lastDate: string; preview: string; messages: RowRecord[] }
    >();
    filteredMessages.forEach((m) => {
      const id = m['CONVERSATION ID'] || m['CONVERSATION TITLE'] || 'unknown';
      const existing = map.get(id);
      if (!existing) {
        map.set(id, {
          id,
          title: m['CONVERSATION TITLE'] || m.FROM || 'Conversation',
          count: 1,
          lastDate: m.DATE ?? '',
          preview: (m.CONTENT ?? '').slice(0, 90),
          messages: [m],
        });
      } else {
        existing.count += 1;
        existing.messages.push(m);
        if ((m.DATE ?? '') > existing.lastDate) {
          existing.lastDate = m.DATE ?? '';
          existing.preview = (m.CONTENT ?? '').slice(0, 90);
        }
      }
    });

    const list = Array.from(map.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
    list.forEach((c) => c.messages.sort((a, b) => (a.DATE ?? '').localeCompare(b.DATE ?? '')));
    return list;
  }, [filteredMessages]);

  const activeConversation = useMemo(() => {
    if (!selectedConvId) return conversations[0] ?? null;
    return conversations.find((c) => c.id === selectedConvId) ?? conversations[0] ?? null;
  }, [conversations, selectedConvId]);

  // Top messaging contacts
  const topContacts = useMemo(() => {
    const map = new Map<string, { Contact: string; 'Profile URL': string; Messages: number; 'Last Message': string }>();
    messages.forEach((m) => {
      const sender = m.FROM ?? '';
      const url = m['SENDER PROFILE URL'] ?? '';
      if (!sender || sender.toLowerCase() === 'you') return;
      const prev = map.get(sender);
      const date = (m.DATE ?? '').slice(0, 10);
      if (!prev) {
        map.set(sender, { Contact: sender, 'Profile URL': url, Messages: 1, 'Last Message': date });
      } else {
        prev.Messages += 1;
        if (date > prev['Last Message']) prev['Last Message'] = date;
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.Messages - a.Messages)
      .map((r) => ({
        Contact: r.Contact,
        'Profile URL': r['Profile URL'],
        Messages: String(r.Messages),
        'Last Message': r['Last Message'],
      }));
  }, [messages]);

  // Unconnected contacts
  const unconnectedContacts = useMemo(() => {
    const connUrls = new Set(connections.map((c) => (c.URL ?? '').trim().toLowerCase()).filter(Boolean));
    const connNames = new Set(
      connections.map((c) => `${c['First Name'] ?? ''} ${c['Last Name'] ?? ''}`.trim().toLowerCase()).filter(Boolean)
    );
    return topContacts.filter((tc) => {
      const url = tc['Profile URL'].trim().toLowerCase();
      const name = tc.Contact.trim().toLowerCase();
      return (!url || !connUrls.has(url)) && !connNames.has(name);
    });
  }, [topContacts, connections]);

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('threads')}
          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
            tab === 'threads'
              ? 'border border-cyan-300 bg-cyan-50 text-cyan-800 shadow-xs'
              : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> Conversations ({conversations.length.toLocaleString()})
        </button>
        <button
          type="button"
          onClick={() => setTab('top_contacts')}
          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
            tab === 'top_contacts'
              ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs'
              : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Top Contacts ({topContacts.length.toLocaleString()})
        </button>
        <button
          type="button"
          onClick={() => setTab('unconnected')}
          className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
            tab === 'unconnected'
              ? 'border border-amber-300 bg-amber-50 text-amber-800 shadow-xs'
              : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-slate-300'
          }`}
        >
          <UserX className="h-3.5 w-3.5" /> Unconnected Contacts ({unconnectedContacts.length.toLocaleString()})
        </button>
      </div>

      {tab === 'threads' && (
        <>
          {/* Search & Presets */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search messages with wildcards (e.g. *referral*, coffee, *hiring* -spam)..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-cyan-500 focus:outline-none"
              >
                {folders.map((f) => (
                  <option key={f} value={f}>
                    Folder: {f}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setOnlyAttachments((v) => !v)}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  onlyAttachments
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <Paperclip className="h-3.5 w-3.5" /> Attachments
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Sparkles className="h-3 w-3 text-emerald-600" /> Presets:
              </span>
              {[
                { label: 'Referrals', q: '*referral*' },
                { label: 'Coffee / Catch up', q: 'coffee' },
                { label: 'Interviews', q: '*interview*' },
                { label: 'Hiring / Roles', q: '*hiring*' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setSearch(p.q)}
                  className="rounded-lg border border-slate-200 bg-slate-100/80 px-2.5 py-1 text-slate-700 hover:border-cyan-400 hover:text-cyan-800"
                >
                  {p.label}
                </button>
              ))}
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="font-medium text-rose-600 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Split-pane Thread Viewer */}
          {conversations.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-sm text-slate-500">
              No messages match your search.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              {/* Thread List */}
              <div
                className={`glass-card max-h-[560px] overflow-y-auto rounded-2xl p-2 lg:col-span-5 ${
                  selectedConvId ? 'hidden lg:block' : 'block'
                }`}
              >
                {conversations.slice(0, 120).map((conv) => {
                  const isActive = activeConversation?.id === conv.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => setSelectedConvId(conv.id)}
                      className={`w-full rounded-xl p-3 text-left transition ${
                        isActive ? 'border border-cyan-300 bg-cyan-50/90' : 'hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-slate-900">{conv.title}</span>
                        <span className="shrink-0 text-[10px] text-slate-500">{conv.lastDate.slice(0, 10)}</span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-slate-600">{conv.preview || 'No preview'}</p>
                      <span className="mt-1 inline-block text-[10px] font-medium text-emerald-700">
                        {conv.count} {conv.count === 1 ? 'message' : 'messages'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Thread Detail */}
              <div
                className={`glass-card flex max-h-[560px] flex-col rounded-2xl lg:col-span-7 ${
                  selectedConvId ? 'block' : 'hidden lg:flex'
                }`}
              >
                {activeConversation && (
                  <>
                    <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedConvId(null)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">{activeConversation.title}</h3>
                        <p className="text-[11px] text-slate-500">{activeConversation.messages.length} messages</p>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto p-4">
                      {activeConversation.messages.map((m, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/90 p-3">
                          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-emerald-700">{m.FROM || 'Unknown'}</span>
                            <span className="text-slate-400">{m.DATE}</span>
                          </div>
                          {m.SUBJECT && (
                            <p className="mb-1 text-xs font-medium text-cyan-700">Subject: {m.SUBJECT}</p>
                          )}
                          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
                            {m.CONTENT}
                          </p>
                          {m.ATTACHMENTS && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">
                              <Paperclip className="h-3 w-3" /> {m.ATTACHMENTS}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'top_contacts' && (
        <ResponsiveDataTable rows={topContacts} exportName="linkedout_top_contacts" />
      )}

      {tab === 'unconnected' && (
        <ResponsiveDataTable
          rows={unconnectedContacts}
          exportName="linkedout_unconnected_contacts"
          emptyMessage="Every message contact is already in your Connections."
        />
      )}
    </div>
  );
}
