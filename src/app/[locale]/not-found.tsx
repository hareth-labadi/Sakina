import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { EmptyState } from '@/components/ui/display';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <Container className="py-20">
      <EmptyState
        title={t('title')}
        body={t('body')}
        action={
          <Link href="/" className={buttonVariants()}>
            {t('home')}
          </Link>
        }
      />
    </Container>
  );
}
