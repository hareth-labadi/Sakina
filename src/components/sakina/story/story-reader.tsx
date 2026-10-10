'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { JoinGate, type GateAction } from '@/components/sakina/account/join-gate';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/display';
import { LockIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';
import { Link, useRouter } from '@/i18n/navigation';
import { useSession } from '@/lib/session';
import { addReply as postReply, report, savedStories, setReaction, setRelate, storyPages } from '@/services';
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
  held: r.held,
  relateCount: r.relateCount,
  related: r.related ?? false,
  children: r.replies?.map(toView)
});

function findReply(list: ReplyView[], id: string): ReplyView | undefined {
  for (const r of list) {
    if (r.id === id) return r;
    const inner = r.children && findReply(r.children, id);
    if (inner) return inner;
  }
}

const findAuthor = (list: ReplyView[], id: string) => findReply(list, id)?.author;

/** Applies `fn` to the reply with this id, wherever it is in the tree. */
const updateReply = (list: ReplyView[], id: string, fn: (r: ReplyView) => ReplyView): ReplyView[] =>
  list.map((r) => (r.id === id ? fn(r) : { ...r, children: r.children && updateReply(r.children, id, fn) }));

/**
 * Body, reactions, actions and replies of one story, all through the API. Guests can read public
 * stories; every way of taking part opens the join gate instead.
 *
 * The page is rendered on the server as a guest. Once a member is signed in, the story is fetched
 * again in the browser: that brings members-only text, their own reactions, saved state, "I relate"
 * marks and their own held replies.
 */
export function StoryReader({ story: initial, communityHref }: { story: Story; communityHref: string }) {
  const t = useTranslations('story.page');
  const user = useSession();
  const nickname = user?.nickname;
  const router = useRouter();
  const { toast } = useToast();
  const [story, setStory] = useState(initial);
  // Whose member view has been fetched; until it matches the signed-in member, it's loading.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loadingAsMember = Boolean(nickname) && loadedFor !== nickname;
  const [gate, setGate] = useState<GateAction | null>(null);
  const [counts, setCounts] = useState(initial.reactions);
  const [mine, setMine] = useState<Reaction[]>(initial.viewer?.reactions ?? []);
  const [saved, setSaved] = useState(initial.viewer?.saved ?? false);
  const [replies, setReplies] = useState(() => initial.replies.map(toView));
  // undefined: closed; null: the story itself; string: a reply id.
  const [reporting, setReporting] = useState<string | null | undefined>(undefined);

  // Signed in (or signed in later): load the member's view of this story.
  useEffect(() => {
    if (!nickname) return;
    let live = true;
    storyPages
      .get(initial.id)
      .then((s) => {
        if (!live || !s) return;
        setStory(s);
        setCounts(s.reactions);
        setMine(s.viewer?.reactions ?? []);
        setSaved(s.viewer?.saved ?? false);
        setReplies(s.replies.map(toView));
      })
      .catch(() => undefined)
      .finally(() => live && setLoadedFor(nickname));
    return () => {
      live = false;
    };
  }, [nickname, initial.id]);

  if (story.locked && (!user || loadingAsMember)) {
    if (user)
      return (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      );
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
    guard('react', async () => {
      const on = !mine.includes(r);
      const before = { counts, mine };
      // Show it at once; the API's answer then sets the real numbers.
      setMine(on ? [...mine, r] : mine.filter((x) => x !== r));
      setCounts({ ...counts, [r]: Math.max(0, counts[r] + (on ? 1 : -1)) });
      try {
        const res = await setReaction(story.id, r, on);
        setCounts(res.reactions);
        setMine(res.mine);
      } catch {
        setCounts(before.counts);
        setMine(before.mine);
        toast(t('failed'));
      }
    });

  const toggleSave = () =>
    guard('save', async () => {
      const next = !saved;
      setSaved(next);
      const res = await savedStories.setSaved(story.id, next).catch(() => ({ ok: false }));
      if (!res.ok) {
        setSaved(!next);
        toast(t('failed'));
      }
    });

  const relate = async (id: string) => {
    const current = findReply(replies, id);
    if (!current) return;
    const on = !current.related;
    setReplies((list) => updateReply(list, id, (r) => ({ ...r, related: on, relateCount: Math.max(0, r.relateCount + (on ? 1 : -1)) })));
    try {
      const res = await setRelate(id, on);
      setReplies((list) => updateReply(list, id, (r) => ({ ...r, related: res.related, relateCount: res.relateCount })));
    } catch {
      setReplies((list) => updateReply(list, id, (r) => ({ ...r, related: !on, relateCount: Math.max(0, r.relateCount + (on ? -1 : 1)) })));
      toast(t('failed'));
    }
  };

  /** Throws when not posted, so the reply box keeps the text. */
  const addReply = async (parentId: string | null, text: string) => {
    if (!user) return;
    const res = await postReply(story.id, text, parentId ?? undefined).catch(() => null);
    if (!res?.ok) {
      toast(res?.error === 'post_limit' ? t('postLimit') : t('failed'));
      throw new Error('not posted');
    }
    const reply = toView(res.reply);
    setReplies((list) => (parentId ? updateReply(list, parentId, (r) => ({ ...r, children: [...(r.children ?? []), reply] })) : [...list, reply]));
    toast(reply.held ? t('replyHeld') : t('replied'));
  };

  const submitReport = async (r: { reason: Parameters<typeof report>[1]['reason']; note: string; block: boolean }) => {
    const target = reporting === null || reporting === undefined ? { storyId: story.id } : { replyId: reporting };
    const res = await report(target, r).catch(() => ({ ok: false, blocked: false }));
    setReporting(undefined);
    if (!res.ok) return toast(t('failed'));
    if (res.blocked) {
      toast(t('reportedBlocked', { nickname: blockable ?? '' }));
      // Their content is gone for this member now.
      if (reporting === null) router.push(communityHref);
      else if (blockable) setReplies((list) => list.filter((x) => x.author !== blockable).map((x) => ({ ...x, children: x.children?.filter((c) => c.author !== blockable) })));
      return;
    }
    toast(t('reported'));
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
          onRelate={(id) => void relate(id)}
          onReply={(pid, text) => addReply(pid, text)}
          onReport={(id) => setReporting(id)}
        />
      </section>

      <ReportDialog open={reporting !== undefined} onOpenChange={(o) => !o && setReporting(undefined)} offerBlock={blockable} onSubmit={submitReport} />
      <JoinGate open={gate !== null} onOpenChange={(o) => !o && setGate(null)} action={gate ?? 'generic'} />
    </div>
  );
}
