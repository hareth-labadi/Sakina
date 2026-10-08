'use client';

import { useNow, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { JoinGate } from '@/components/sakina/account/join-gate';
import { LockoutNotice } from '@/components/sakina/account/lockout-notice';
import { NicknameField } from '@/components/sakina/account/nickname-field';
import { RecoveryCodeBox } from '@/components/sakina/account/recovery-code';
import { NotificationBell, UserMenu } from '@/components/sakina/account/user-widgets';
import { DmRequestDialog, MessageBubble, MessageComposer, MessageList, RoomHeader, TypingIndicator, type MessageView } from '@/components/sakina/chat/chat-widgets';
import { GuidedMinute } from '@/components/sakina/chat/guided-minute';
import { DraftStatus, HeldForReview, MoodPicker, PiiWarning, PromptChips, VeilPicker } from '@/components/sakina/composer/composer-widgets';
import { CrisisHelp } from '@/components/sakina/crisis-help';
import { AuditTable, AvailabilityGrid, QueueRow, RiskPill, type Availability, type QueueItemView } from '@/components/sakina/panel/panel-widgets';
import { ContentVeil } from '@/components/sakina/story/content-veil';
import { ReactionBar } from '@/components/sakina/story/reaction-bar';
import { ReplyComposer, ReplyThread, type ReplyView } from '@/components/sakina/story/reply-thread';
import { ReportDialog } from '@/components/sakina/story/report-dialog';
import { StoryActions } from '@/components/sakina/story/story-actions';
import { Button, IconButton } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/display';
import { Field, Textarea } from '@/components/ui/field';
import { ArrowIcon, MoreIcon } from '@/components/ui/icons';
import { LoadMore } from '@/components/ui/load-more';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { SearchInput } from '@/components/ui/search-input';
import { StatTile } from '@/components/ui/stat-tile';
import { Steps } from '@/components/ui/steps';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import type { Mood, PostType, Reaction, VeilTopic } from '@/types/domain';
import { detectPii } from '@/lib/safety';

/** Relative demo timestamps from the request's shared "now", so server and client render the same text. */
function useAgo() {
  const now = useNow();
  return (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
}

/* ---------- General ---------- */
export function GeneralDemo() {
  const t = useTranslations('design.w');
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [step, setStep] = useState(2);
  const [shown, setShown] = useState(2);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const tc = useTranslations('common');
  const rows = [
    { nick: 'amal_dawn', joined: '29/08/2026', active: true },
    { nick: 'sea_glass', joined: '09/08/2026', active: true },
    { nick: 'still_water', joined: '12/07/2026', active: false },
    { nick: 'نسمة_الفجر', joined: '01/10/2026', active: true }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Menu>
          <MenuTrigger asChild>
            <IconButton label={t('menuButton')}>
              <MoreIcon />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="start">
            <MenuItem>{t('menuView')}</MenuItem>
            <MenuItem tone="danger" onSelect={() => setConfirmOpen(true)}>{t('menuSuspend')}</MenuItem>
          </MenuContent>
        </Menu>
        <Tooltip content={t('tooltip')}>
          <Button variant="secondary" size="sm">{t('tooltipButton')}</Button>
        </Tooltip>
        <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>{t('openConfirm')}</Button>
      </div>
      <SearchInput label={t('search')} clearLabel={t('clear')} value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} />
      <div className="flex flex-wrap items-center gap-4">
        <Steps label={t('stepsLabel')} steps={[t('step1'), t('step2'), t('step3')]} current={step} />
        <IconButton label={t('nextStep')} onClick={() => setStep((s) => (s % 3) + 1)}>
          <ArrowIcon />
        </IconButton>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-4">
        <StatTile label={t('tileQueue')} value={3} tint="blue" />
        <StatTile label={t('tileHeld')} value={2} tint="lav" />
        <StatTile label={t('tileMembers')} value={<span className="font-mono">000</span>} note={t('placeholderData')} />
      </div>
      <Table caption={t('tableCaption')} minWidth={560}>
        <THead>
          <TR>
            <TH>{t('colNickname')}</TH>
            <TH>{t('colJoined')}</TH>
            <TH>{t('colStatus')}</TH>
          </TR>
        </THead>
        <TBody>
          {rows.slice(0, shown).map((r) => (
            <TR key={r.nick}>
              <TD><b dir="auto">{r.nick}</b></TD>
              <TD className="font-mono text-sm text-mute" dir="ltr">{r.joined}</TD>
              <TD><Badge tone={r.active ? 'win' : 'warm'}>{r.active ? t('active') : t('suspended')}</Badge></TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <LoadMore
        label={t('loadMore')}
        loadingLabel={t('loading')}
        doneLabel={t('allLoaded')}
        loading={loading}
        done={shown >= rows.length}
        onClick={() => { setLoading(true); setTimeout(() => { setShown((n) => n + 1); setLoading(false); }, 600); }}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('confirmTitle')}
        body={t('confirmBody')}
        confirmLabel={t('confirmOk')}
        cancelLabel={tc('cancel')}
        closeLabel={tc('close')}
        danger
        reason={{ label: t('confirmReason'), hint: t('confirmHint'), requiredError: t('confirmError') }}
        onConfirm={() => toast(t('confirmDone'))}
      />
    </div>
  );
}

/* ---------- Account ---------- */
export function AccountDemo() {
  const t = useTranslations('design.w');
  const [nick, setNick] = useState('sea_glass');
  const [saved, setSaved] = useState(false);
  const [gate, setGate] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const clearLock = useCallback(() => setLockUntil(null), []);

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-6">
      <div className="flex flex-col gap-5">
        <NicknameField value={nick} onChange={setNick} />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" onClick={() => setGate(true)}>{t('openGate')}</Button>
          <Button variant="secondary" size="sm" onClick={() => setLockUntil(Date.now() + 15 * 60_000)}>{t('showLockout')}</Button>
        </div>
        {lockUntil ? <LockoutNotice until={lockUntil} onExpired={clearLock} /> : null}
        <div className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-mute">{t('guestSignedIn')}</span>
          <div className="flex flex-wrap items-center gap-2.5">
            <NotificationBell unread={3} />
            <UserMenu user={{ nickname: 'amal_dawn', avatar: 2, role: 'member', unreadNotifications: 3 }} onSignOut={() => {}} />
          </div>
        </div>
      </div>
      <RecoveryCodeBox code="K7QM-4XPT-9HDA" saved={saved} onSavedChange={setSaved} />
      <JoinGate open={gate} onOpenChange={setGate} action="react" />
    </div>
  );
}

/* ---------- Reading ---------- */
export function ReadingDemo() {
  const ago = useAgo();
  const t = useTranslations('design.w');
  const { toast } = useToast();
  const [counts, setCounts] = useState<Record<Reaction, number>>({ relate: 24, strength: 11, helped: 7, thanks: 5 });
  const [mine, setMine] = useState<Reaction[]>(['relate']);
  const [saved, setSaved] = useState(false);
  const [report, setReport] = useState(false);
  const [replies, setReplies] = useState<ReplyView[]>([
    {
      id: 'c1', author: 'sea_glass', avatar: 1, text: 'Tuesday mornings. Same. Thank you for writing this.', createdAt: ago(100), relateCount: 3, related: false,
      children: [{ id: 'c2', author: 'quiet_river', avatar: 0, text: 'يساعدني أن أعرف ذلك. المشي غيّر الكثير بالنسبة لي.', createdAt: ago(90), relateCount: 1, related: false }]
    },
    { id: 'c3', author: 'Huda', avatar: 4, therapist: 'psychologist', text: "Naming the feeling is a real skill, and you built it. This is a support note, not clinical advice.", createdAt: ago(60), relateCount: 6, related: true },
    { id: 'c4', author: 'amal_dawn', avatar: 2, text: 'Some nights I feel this so strongly.', createdAt: ago(5), relateCount: 0, related: false, held: true }
  ]);

  const toggle = (r: Reaction) => {
    const on = mine.includes(r);
    setMine(on ? mine.filter((x) => x !== r) : [...mine, r]);
    setCounts({ ...counts, [r]: counts[r] + (on ? -1 : 1) });
  };
  const relate = (id: string) =>
    setReplies((list) => list.map(function upd(r): ReplyView {
      if (r.id === id) return { ...r, related: !r.related, relateCount: r.relateCount + (r.related ? -1 : 1) };
      return { ...r, children: r.children?.map(upd) };
    }));
  const addReply = (parentId: string | null, text: string) => {
    const reply: ReplyView = { id: `n${Date.now()}`, author: 'amal_dawn', avatar: 2, text, createdAt: new Date().toISOString(), relateCount: 0, related: false };
    setReplies((list) => (parentId ? list.map((r) => (r.id === parentId ? { ...r, children: [...(r.children ?? []), reply] } : r)) : [...list, reply]));
    toast(t('replied'));
  };

  return (
    <div className="flex flex-col gap-6">
      <ContentVeil topics={['loss']}>
        <p className="text-lg" dir="auto">Everyone kept saying she would want me to smile. I set her place at the table without thinking…</p>
      </ContentVeil>
      <ReactionBar counts={counts} mine={mine} onToggle={toggle} />
      <StoryActions saved={saved} onToggleSave={() => setSaved((s) => !s)} shareUrl="https://sakina.app/s/s1" onReport={() => setReport(true)} />
      <ReplyComposer onSubmit={(text) => addReply(null, text)} />
      <ReplyThread replies={replies} canInteract onRelate={relate} onReply={(pid, text) => addReply(pid, text)} onReport={() => setReport(true)} />
      <ReportDialog open={report} onOpenChange={setReport} offerBlock="sea_glass" onSubmit={() => toast(t('reported'))} />
    </div>
  );
}

/* ---------- Composer ---------- */
export function ComposerDemo() {
  const t = useTranslations('design.w');
  const [type] = useState<PostType>('checkin');
  const [mood, setMood] = useState<Mood | null>(null);
  const [text, setText] = useState('');
  const [veil, setVeil] = useState(false);
  const [topics, setTopics] = useState<VeilTopic[]>([]);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showPii, setShowPii] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const pii = detectPii(text);

  return (
    <div className="flex flex-col gap-6">
      <MoodPicker value={mood} onChange={setMood} />
      <PromptChips type={type} onUse={(p) => setText((x) => (x ? `${x.trimEnd()}\n\n` : '') + p + ' ')} />
      <Field label="…">
        <Textarea value={text} onChange={(e) => { setText(e.target.value); setSavedAt(new Date()); }} />
      </Field>
      <DraftStatus savedAt={savedAt} />
      <VeilPicker enabled={veil} onEnabledChange={setVeil} topics={topics} onTopicsChange={setTopics} />
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={() => setShowPii((v) => !v)}>{t('showPii')}</Button>
        <Button variant="secondary" size="sm" onClick={() => setShowHeld((v) => !v)}>{t('showHeld')}</Button>
      </div>
      {showPii ? <PiiWarning kinds={pii.length ? pii : ['phone', 'name']} onEdit={() => setShowPii(false)} onPostAnyway={() => setShowPii(false)} /> : null}
      {showHeld ? <HeldForReview /> : null}
    </div>
  );
}

/* ---------- Chat ---------- */
export function ChatDemo() {
  const t = useTranslations('design.w');
  const { toast } = useToast();
  const [muted, setMuted] = useState(false);
  const [minute, setMinute] = useState(false);
  const [dm, setDm] = useState<string | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  const tch = useTranslations('chat');
  const endMinute = useCallback(() => { setMinute(false); }, []);
  const [messages, setMessages] = useState<MessageView[]>([
    { id: 'm0', author: 'system', avatar: 0, text: 'Session started by Huda.', time: '20:30', system: true },
    { id: 'm1', author: 'Huda', avatar: 4, therapist: 'psychologist', text: "Welcome. We'll start with one slow breath together.", time: '20:31' },
    { id: 'm2', author: 'quiet_river', avatar: 0, text: 'أسجّل حضوري. يوم طويل، لكنني هنا.', time: '20:40' },
    { id: 'm3', author: 'amal_dawn', avatar: 2, text: 'Trying the four-six breathing now.', time: '20:44', mine: true },
    { id: 'm4', author: 'amal_dawn', avatar: 2, text: 'Some nights are too heavy.', time: '20:46', mine: true, held: true },
    { id: 'm5', author: 'system', avatar: 0, text: 'Only you can see your last message for now. A therapist will check in with you soon.', time: '20:46', system: true, care: true }
  ]);

  const send = (text: string) => {
    setMessages((m) => [...m, { id: `x${Date.now()}`, author: 'amal_dawn', avatar: 2, text, time: new Date().toTimeString().slice(0, 5), mine: true }]);
    setTyping('sea_glass');
    setTimeout(() => setTyping(null), 2500);
  };

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <RoomHeader
        kind="guided"
        title="Grounding when your mind races"
        community="Anxiety"
        live
        hostLine="Huda · Psychologist · Thursday 20:00"
        muted={muted}
        onGuidedMinute={() => setMinute(true)}
        onToggleMute={() => setMuted((m) => !m)}
        onReport={() => toast(t('reported'))}
        onLeave={() => {}}
      />
      {minute ? <GuidedMinute onDone={endMinute} /> : null}
      <MessageList label={tch('messages')}>
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            careAction={<CrisisHelp />}
            onReport={() => toast(t('reported'))}
            onRequestDm={() => setDm(m.author)}
            onBlock={() => {}}
          />
        ))}
      </MessageList>
      <TypingIndicator name={typing} />
      <MessageComposer onSend={send} />
      <DmRequestDialog nickname={dm ?? ''} open={dm !== null} onOpenChange={(o) => !o && setDm(null)} onSend={() => toast(t('dmSent'))} />
    </div>
  );
}

/* ---------- Panels ---------- */
export function PanelsDemo() {
  const ago = useAgo();
  const t = useTranslations('design.w');
  const [avail, setAvail] = useState<Availability>({ sat: ['aft'], mon: ['eve'], thu: ['eve'] });
  const queue: QueueItemView[] = [
    { id: 'q1', risk: 'high', kind: 'chat', status: 'open', community: 'Loneliness', author: 'night_owl', excerpt: 'I keep thinking everyone would be better off without me.', createdAt: ago(12) },
    { id: 'q2', risk: 'medium', kind: 'post', status: 'checking', community: 'Bipolar', author: 'paper_moon', excerpt: "I haven't slept in three nights and I feel like I could do anything.", createdAt: ago(25) },
    { id: 'q3', risk: 'low', kind: 'report', status: 'resolved', community: 'Panic attacks', author: 'night_owl', excerpt: 'You should just ask your doctor to double your dose.', createdAt: ago(200) }
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2.5">
        <RiskPill level="high" />
        <RiskPill level="medium" />
        <RiskPill level="low" />
      </div>
      <ul className="flex flex-col gap-3">
        {queue.map((q) => (
          <QueueRow key={q.id} item={q} href="/design" />
        ))}
      </ul>
      <AvailabilityGrid value={avail} onChange={setAvail} />
      <AuditTable
        caption={t('auditCaption')}
        entries={[
          { id: 'a1', at: ago(5), actor: 'system', actorType: 'system', action: t('auditHold'), detail: 'Loneliness · night_owl' },
          { id: 'a2', at: ago(1440), actor: 'admin.amina', actorType: 'admin', action: t('auditSuspend'), detail: 'still_water · 7d' },
          { id: 'a3', at: ago(2880), actor: 'admin.amina', actorType: 'admin', action: t('auditVerify'), detail: 'Karim · psychiatrist' }
        ]}
      />
    </div>
  );
}
