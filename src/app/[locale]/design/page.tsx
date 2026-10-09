import type { Metadata } from 'next';
import { toLocale } from '@/i18n/routing';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { CommunityCard } from '@/components/sakina/community-card';
import { CrisisHelp } from '@/components/sakina/crisis-help';
import { LanguageSwitch, ThemeSwitch } from '@/components/sakina/preferences';
import { StoryCard } from '@/components/sakina/story-card';
import { Button, IconButton } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Avatar, Badge, Card, EmptyState, ErrorState, LiveDot, LoadingState, Notice, Tag } from '@/components/ui/display';
import { ArrowIcon, BellIcon, BookmarkIcon, FlagIcon, HeartIcon, PlusIcon, SearchIcon, SendIcon } from '@/components/ui/icons';
import { CONDITIONS } from '@/data/conditions';
import { SAMPLE_STORIES } from '@/data/stories';
import { FormDemo, OverlayDemo, SelectionDemo } from './demos';
import { AccountDemo, ChatDemo, ComposerDemo, GeneralDemo, PanelsDemo, ReadingDemo } from './demos-widgets';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: 'design' });
  return { title: t('title') };
}

const BRAND = [
  { key: 'dawn', hex: '#8BB8E8', fg: '#0F1A2E' },
  { key: 'calm', hex: '#A8D5BA', fg: '#0F1A2E' },
  { key: 'lavender', hex: '#C8B6FF', fg: '#0F1A2E' },
  { key: 'sand', hex: '#F7F1E8', fg: '#0F1A2E' },
  { key: 'ink', hex: '#0F1A2E', fg: '#F7F1E8' },
  { key: 'terracotta', hex: '#B4553F', fg: '#FFFFFF' },
  { key: 'night', hex: '#080C18', fg: '#F7F1E8' }
] as const;

const TOKENS = ['bg', 'surface', 'surface-2', 'ink', 'ink-2', 'mute', 'line', 'primary', 'blue-soft', 'green-soft', 'lav-soft', 'sand-soft', 'warm-soft', 'warm-ink'] as const;

export default async function DesignPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations('design');

  return (
    <Container className="flex flex-col gap-10 py-10">
      <header className="flex flex-col gap-4">
        <Tag>{t('tag')}</Tag>
        <h1 className="text-[clamp(2.5rem,5vw,4rem)]">
          {t('titleA')} <span className="text-gradient">{t('titleB')}</span>
        </h1>
        <p className="max-w-190 text-lead text-ink-2">{t('sub')}</p>
        <div className="flex flex-wrap gap-3">
          <LanguageSwitch />
          <ThemeSwitch />
        </div>
      </header>

      <Block n="01" title={t('sections.color')}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
          {BRAND.map((b) => (
            <div key={b.key} className="flex h-36 flex-col justify-end gap-0.5 rounded-tile border border-line p-4" style={{ background: b.hex, color: b.fg }}>
              <b>{t(`brand.${b.key}`)}</b>
              <span className="font-mono text-sm" dir="ltr">{b.hex}</span>
            </div>
          ))}
        </div>
        <p className="text-caption text-mute">{t('tokensNote')}</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {TOKENS.map((k) => (
            <div key={k} className="flex items-center gap-3">
              <span className="size-11 shrink-0 rounded-[14px] border border-line" style={{ background: `var(--${k})` }} />
              <code className="font-mono text-sm" dir="ltr">--{k}</code>
            </div>
          ))}
        </div>
        <Notice tone="info">{t('colorRule')}</Notice>
      </Block>

      <Block n="02" title={t('sections.type')}>
        <p className="text-[clamp(2.75rem,6vw,5rem)] font-display leading-[var(--leading-head)] font-[var(--weight-head)] tracking-[var(--tracking-head)]">
          Aa <span className="text-gradient">{t('typeHero')}</span>
        </p>
        <dl className="flex flex-col gap-4 border-t border-line pt-5">
          <TypeRow label="Display 56"><h2 className="text-[3.5rem]">{t('sample')}</h2></TypeRow>
          <TypeRow label="H2 38"><h3 className="text-[2.375rem]">{t('sample')}</h3></TypeRow>
          <TypeRow label="H3 24"><h4 className="text-2xl">{t('sample')}</h4></TypeRow>
          <TypeRow label="Lead 21"><p className="text-lead text-ink-2">{t('sample')}</p></TypeRow>
          <TypeRow label="Body 18"><p className="text-body text-ink-2">{t('sample')}</p></TypeRow>
          <TypeRow label="Caption 15"><p className="text-caption text-mute">{t('sample')}</p></TypeRow>
          <TypeRow label="Label"><Tag>{t('tag')}</Tag></TypeRow>
        </dl>
        <p className="text-caption text-mute">{t('typeNote')}</p>
      </Block>

      <Block n="03" title={t('sections.buttons')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t('buttons.primary')}</Button>
          <Button variant="secondary">{t('buttons.secondary')}</Button>
          <Button variant="ghost">{t('buttons.ghost')}</Button>
          <Button variant="soft">{t('buttons.soft')}</Button>
          <Button variant="crisis"><HeartIcon size={18} />{t('buttons.crisis')}</Button>
          <Button variant="danger">{t('buttons.danger')}</Button>
          <Button disabled>{t('buttons.disabled')}</Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Button size="lg">{t('buttons.large')}</Button>
          <Button>{t('buttons.medium')}</Button>
          <Button size="sm">{t('buttons.small')}</Button>
          <Button variant="secondary">{t('buttons.withIcon')}<ArrowIcon size={18} /></Button>
          <IconButton label={t('icons.bell')}><BellIcon /></IconButton>
          <IconButton label={t('icons.search')}><SearchIcon /></IconButton>
          <IconButton label={t('icons.save')}><BookmarkIcon /></IconButton>
          <IconButton label={t('icons.report')}><FlagIcon /></IconButton>
          <IconButton label={t('icons.add')}><PlusIcon /></IconButton>
          <IconButton label={t('icons.send')}><SendIcon /></IconButton>
        </div>
        <p className="text-caption text-mute">{t('buttonsNote')}</p>
      </Block>

      <Block n="04" title={t('sections.forms')}>
        <FormDemo />
      </Block>

      <Block n="05" title={t('sections.selection')}>
        <SelectionDemo />
      </Block>

      <Block n="06" title={t('sections.display')}>
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="story">{t('badges.story')}</Badge>
          <Badge tone="checkin">{t('badges.checkin')}</Badge>
          <Badge tone="win">{t('badges.win')}</Badge>
          <Badge tone="therapist">{t('badges.therapist')}</Badge>
          <Badge tone="live"><LiveDot />{t('badges.live')}</Badge>
          <Badge tone="pending">{t('badges.pending')}</Badge>
          <Badge tone="warm">{t('badges.held')}</Badge>
          <Badge>{t('badges.neutral')}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Avatar key={i} index={i} size={i === 0 ? 'lg' : 'md'} />
          ))}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-4">
          <Card><h3 className="text-xl">{t('cards.surface')}</h3><p className="text-ink-2">{t('cards.body')}</p></Card>
          <Card tint="blue"><h3 className="text-xl">{t('cards.blue')}</h3><p>{t('cards.body')}</p></Card>
          <Card tint="green"><h3 className="text-xl">{t('cards.green')}</h3><p>{t('cards.body')}</p></Card>
          <Card tint="lav"><h3 className="text-xl">{t('cards.lav')}</h3><p>{t('cards.body')}</p></Card>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4">
          <Notice tone="info" title={t('notices.infoTitle')}>{t('notices.infoBody')}</Notice>
          <Notice tone="calm" title={t('notices.calmTitle')}>{t('notices.calmBody')}</Notice>
          <Notice tone="warn" title={t('notices.warnTitle')}>{t('notices.warnBody')}</Notice>
        </div>
      </Block>

      <Block n="07" title={t('sections.states')}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-5">
          <EmptyState title={t('states.emptyTitle')} body={t('states.emptyBody')} action={<Button>{t('states.emptyAction')}</Button>} />
          <ErrorState title={t('states.errorTitle')} body={t('states.errorBody')} action={<Button variant="secondary">{t('states.retry')}</Button>} />
        </div>
        <LoadingState caption={t('states.loading')} count={2} />
      </Block>

      <Block n="08" title={t('sections.overlays')}>
        <OverlayDemo />
        <div><CrisisHelp size="md" /></div>
        <p className="text-caption text-mute">{t('crisisNote')}</p>
      </Block>

      <Block n="09" title={t('sections.product')}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
          {SAMPLE_STORIES.map((s) => (
            <StoryCard key={s.id} story={s} community={CONDITIONS.find((c) => c.id === s.communityId)} />
          ))}
          {CONDITIONS.slice(0, 2).map((c) => (
            <CommunityCard key={c.id} community={c} storyCount={1} />
          ))}
        </div>
        <p className="text-caption text-mute">{t('productNote')}</p>
      </Block>

      <Block n="10" title={t('sections.general')}>
        <GeneralDemo />
      </Block>

      <Block n="11" title={t('sections.account')}>
        <AccountDemo />
      </Block>

      <Block n="12" title={t('sections.reading')}>
        <ReadingDemo />
      </Block>

      <Block n="13" title={t('sections.composer')}>
        <ComposerDemo />
      </Block>

      <Block n="14" title={t('sections.chat')}>
        <ChatDemo />
      </Block>

      <Block n="15" title={t('sections.panels')}>
        <PanelsDemo />
      </Block>
    </Container>
  );
}

function Block({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`ds-${n}`} className="flex flex-col gap-5 rounded-hero border border-line bg-surface p-5 sm:p-7">
      <h2 id={`ds-${n}`} className="flex items-center gap-3 text-[1.75rem]">
        <span className="font-mono text-base text-mute" dir="ltr">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function TypeRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
      <dt className="w-32 shrink-0 font-mono text-sm text-mute" dir="ltr">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
