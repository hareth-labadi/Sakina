'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { JoinGate, type GateAction } from '@/components/sakina/account/join-gate';
import { Button, buttonVariants } from '@/components/ui/button';
import { LockIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { Link, useRouter } from '@/i18n/navigation';
import { useSession } from '@/lib/session';
import { savedStories } from '@/services';
import type { Reaction, Reply, Story } from '@/types/domain';
import { ContentVeil } from './content-veil';
import { ReactionBar } from './reaction-bar';
import { ReplyComposer, ReplyThread, type ReplyView } from './reply-thread';
import { ReportDialog } from './report-dialog';
import { StoryActions } from './story-actions';

const toView = (r: Reply): ReplyView => ({
  id: r.id,
  author: r.authorNickname,
  avatar: r.authorAvatar,
  text: r.text,
  createdAt: r.createdAt,
  therapist: r.therapist,
  relateCount: r.relateCount,
  related: false,
  children: r.replies?.map(toView)
});

function findAuthor(list: ReplyView[], id: string): string | undefined {
  for (const r of list) {
    if (r.id === id) return r.author;
    const inner = r.children && findAuthor(r.children, id);
    if (inner) return inner;
  }
}

/**
 * Body, reactions, actions and replies of one story. Guests can read public stories;
 * every way of taking part opens the join gate instead. Reactions and replies are local only (mock).
 */
export function StoryReader({ story, communityHref }: { story: Story; communityHref: string }) {
  const t = useTranslations('story.page');
  const user = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [gate, setGate] = useState<GateAction | null>(null);
  const [counts, setCounts] = useState(story.reactions);
  const [mine, setMine] = useState<Reaction[]>([]);
  const [saved, setSaved] = useState(false);
  const [replies, setReplies] = useState(() => story.replies.map(toView));
  // undefined: closed; null: the story itself; string: a reply id.
  const [reporting, setReporting] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    if (user) savedStories.isSaved(user.nickname, story.id).then((s) => live && setSaved(s));
    else setSaved(false);
    return () => {
      live = false;
    };
  }, [user, story.id]);

  if (!user && story.visibility === 'members') {
    return (
      <section className="flex flex-col items-start gap-4 rounded-card bg-lav-soft p-7 sm:p-9">
        <LockIcon size={32} className="text-lav-ink" />
        <h2 className="text-2xl">{t('lockedTitle')}</h2>
        <p>{t('lockedBody')}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className={buttonVariants()}>
            {t('join')}
          </Link>
          <Link href="/signin" className={buttonVariants({ variant: 'secondary' })}>
            {t('signIn')}
          </Link>
        </div>
      </section>
    );
  }

  const reportedAuthor = reporting === undefined ? undefined : reporting === null ? story.authorNickname : findAuthor(replies, reporting);
  const blockable = reportedAuthor && reportedAuthor !== user?.nickname ? reportedAuthor : undefined;

  const guard = (action: GateAction, run: () => void) => (user ? run() : setGate(action));

  const toggleReaction = (r: Reaction) =>
    guard('react', () => {
      const on = mine.includes(r);
      setMine(on ? mine.filter((x) => x !== r) : [...mine, r]);
      setCounts({ ...counts, [r]: counts[r] + (on ? -1 : 1) });
    });

  const toggleSave = () =>
    guard('save', async () => {
      const next = !saved;
      setSaved(next);
      const res = await savedStories.setSaved(user!.nickname, story.id, next);
      if (!res.ok) {
        setSaved(!next);
        toast(t('failed'));
      }
    });

  const relate = (id: string) =>
    setReplies((list) =>
      list.map(function upd(r): ReplyView {
        if (r.id === id) return { ...r, related: !r.related, relateCount: r.relateCount + (r.related ? -1 : 1) };
        return { ...r, children: r.children?.map(upd) };
      })
    );

  const addReply = (parentId: string | null, text: string) => {
    if (!user) return;
    const reply: ReplyView = { id: `n${Date.now()}`, author: user.nickname, avatar: user.avatar, text, createdAt: new Date().toISOString(), relateCount: 0, related: false };
    setReplies((list) => (parentId ? list.map((r) => (r.id === parentId ? { ...r, children: [...(r.children ?? []), reply] } : r)) : [...list, reply]));
    toast(t('replied'));
  };

  return (
    <div className="flex flex-col gap-8">
      <ContentVeil topics={story.veil} onDecline={() => router.push(communityHref)}>
        <div dir="auto" className="flex max-w-[68ch] flex-col gap-4 text-lg leading-relaxed whitespace-pre-line">
          {story.body.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </ContentVeil>

      <ReactionBar counts={counts} mine={mine} onToggle={toggleReaction} />
      <StoryActions
        saved={saved}
        onToggleSave={toggleSave}
        shareUrl={typeof window === 'undefined' ? '' : window.location.href}
        onReport={() => guard('report', () => setReporting(null))}
      />

      <section aria-labelledby="h-replies" className="flex flex-col gap-5">
        <h2 id="h-replies" className="text-[clamp(1.5rem,2.6vw,2rem)]">
          {t('repliesTitle', { count: replies.reduce((n, r) => n + 1 + (r.children?.length ?? 0), 0) })}
        </h2>
        {user ? (
          <ReplyComposer onSubmit={(text) => addReply(null, text)} />
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setGate('reply')}>
              {t('joinToReply')}
            </Button>
          </div>
        )}
        <ReplyThread
          replies={replies}
          canInteract={Boolean(user)}
          onRelate={relate}
          onReply={(pid, text) => addReply(pid, text)}
          onReport={(id) => setReporting(id)}
        />
      </section>

      <ReportDialog
        open={reporting !== undefined}
        onOpenChange={(o) => !o && setReporting(undefined)}
        offerBlock={blockable}
        onSubmit={() => {
          setReporting(undefined);
          toast(t('reported'));
        }}
      />
      <JoinGate open={gate !== null} onOpenChange={(o) => !o && setGate(null)} action={gate ?? 'generic'} />
    </div>
  );
}
