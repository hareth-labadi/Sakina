'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Checkbox, RadioCard, Switch } from '@/components/ui/choice';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { PasswordInput, PasswordStrength } from '@/components/ui/password-input';
import { Segmented } from '@/components/ui/segmented';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';

export function FormDemo() {
  const t = useTranslations('design.forms');
  const tp = useTranslations('password');
  const [nick, setNick] = useState('sea_glass');
  const [pw, setPw] = useState('');
  const [rec, setRec] = useState<'code' | 'email'>('code');
  const [adult, setAdult] = useState(false);
  const [dm, setDm] = useState(true);
  const taken = nick.trim().toLowerCase() === 'sea_glass';

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-6">
      <div className="flex flex-col gap-6">
        <Field label={t('nickname')} hint={t('nicknameHint')} error={taken ? t('nicknameTaken') : undefined}>
          <Input value={nick} onChange={(e) => setNick(e.target.value)} autoComplete="username" spellCheck={false} />
        </Field>
        <Field label={t('password')} hint={tp('hint')}>
          <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" showLabel={tp('show')} hideLabel={tp('hide')} />
        </Field>
        <PasswordStrength value={pw} labels={[tp('empty'), tp('weak'), tp('okay'), tp('strong')]} />
        <Field label={t('country')} labelAside={t('optional')}>
          <Select defaultValue="">
            <option value="">{t('preferNot')}</option>
            <option value="DZ">{t('algeria')}</option>
          </Select>
        </Field>
      </div>
      <div className="flex flex-col gap-6">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-[1.0625rem] font-semibold">{t('recovery')}</legend>
          <RadioCard name="rec" title={t('recCode')} description={t('recCodeHint')} checked={rec === 'code'} onChange={() => setRec('code')} />
          <RadioCard name="rec" title={t('recEmail')} description={t('recEmailHint')} checked={rec === 'email'} onChange={() => setRec('email')} />
        </fieldset>
        <Checkbox label={t('adult')} checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        <Switch label={t('allowDm')} hint={t('allowDmHint')} checked={dm} onCheckedChange={setDm} />
        <Field label={t('words')}>
          <Textarea placeholder={t('wordsPh')} />
        </Field>
      </div>
    </div>
  );
}

export function SelectionDemo() {
  const t = useTranslations('design.selection');
  const tt = useTranslations('story.types');
  const [type, setType] = useState<'story' | 'checkin' | 'win'>('story');
  const [moods, setMoods] = useState<string[]>(['okay']);
  const moodKeys = ['heavy', 'low', 'okay', 'steady', 'light'] as const;
  const toggle = (m: string) => setMoods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  return (
    <div className="flex flex-col gap-6">
      <Segmented label={t('postType')} value={type} onValueChange={setType} options={(['story', 'checkin', 'win'] as const).map((v) => ({ value: v, label: tt(v) }))} />
      <ChipGroup role="group" aria-label={t('moods')}>
        {moodKeys.map((m) => (
          <Chip key={m} pressed={moods.includes(m)} onClick={() => toggle(m)}>
            {t(`mood.${m}`)}
          </Chip>
        ))}
      </ChipGroup>
      <ChipGroup>
        <Chip tint="blue">{t('tintBlue')}</Chip>
        <Chip tint="green">{t('tintGreen')}</Chip>
        <Chip tint="lav">{t('tintLav')}</Chip>
        <Chip tint="sand">{t('tintSand')}</Chip>
      </ChipGroup>
      <Tabs defaultValue="stories">
        <TabsList aria-label={t('tabsLabel')}>
          <TabsTrigger value="stories">{t('tabStories')}</TabsTrigger>
          <TabsTrigger value="disc">{t('tabDisc')}</TabsTrigger>
          <TabsTrigger value="live">{t('tabLive')}</TabsTrigger>
        </TabsList>
        <TabsContent value="stories">{t('panelStories')}</TabsContent>
        <TabsContent value="disc">{t('panelDisc')}</TabsContent>
        <TabsContent value="live">{t('panelLive')}</TabsContent>
      </Tabs>
    </div>
  );
}

export function OverlayDemo() {
  const t = useTranslations('design.overlays');
  const tc = useTranslations('common');
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">{t('openDialog')}</Button>
        </DialogTrigger>
        <DialogContent title={t('dialogTitle')} description={t('dialogBody')} closeLabel={tc('close')}>
          <div className="flex flex-wrap gap-3">
            <DialogClose asChild>
              <Button variant="danger">{t('confirm')}</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="secondary">{tc('cancel')}</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      <Button variant="secondary" onClick={() => toast(t('toastText'))}>
        {t('showToast')}
      </Button>
    </div>
  );
}
