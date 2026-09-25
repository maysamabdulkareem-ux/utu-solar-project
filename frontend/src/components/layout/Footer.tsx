import { Logo } from '../Logo';
import { Icon, type IconName } from '../icons/Icon';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';

const GROUPS: { title: TranslationKey; links: TranslationKey[]; hrefs: string[] }[] = [
  {
    title: 'ft.platform',
    links: ['ft.l1', 'ft.l2', 'ft.l3', 'ft.l4', 'ft.l5'],
    hrefs: ['#top', '#companies', '#projects', '#calculator', '#how-it-works'],
  },
  { title: 'ft.forCompanies', links: ['ft.c1', 'ft.c2', 'ft.c3'], hrefs: ['#top', '#top', '#top'] },
  { title: 'ft.support', links: ['ft.s1', 'ft.s2', 'ft.s3'], hrefs: ['#top', '#top', '#top'] },
];

const SOCIAL: { name: string; icon: IconName }[] = [
  { name: 'Facebook', icon: 'facebook' },
  { name: 'Instagram', icon: 'instagram' },
  { name: 'LinkedIn', icon: 'linkedin' },
  { name: 'X', icon: 'x-social' },
];

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="on-dark bg-bg-inverse">
      <div className="container-page py-16 lg:py-20">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          <div className="max-w-sm">
            <Logo onDark />
            <p className="mt-4 text-body-sm text-content-on-dark-muted">{t('ft.tagline')}</p>
            <ul className="mt-5 flex gap-2.5">
              {SOCIAL.map((s) => (
                <li key={s.name}>
                  <a
                    href="#top"
                    aria-label={t('ft.social', { n: s.name })}
                    className="grid h-10 w-10 place-items-center rounded-md bg-bg-panel-raised text-content-on-dark-muted transition-colors hover:text-content-on-dark"
                  >
                    <Icon name={s.icon} size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3 lg:gap-14">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="eyebrow text-solar-300">{t(group.title)}</h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {group.links.map((link, i) => (
                    <li key={link}>
                      <a
                        href={group.hrefs[i]}
                        className="text-body-sm text-content-on-dark-muted transition-colors hover:text-content-on-dark"
                      >
                        {t(link)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <hr className="my-8 border-line-on-dark" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-label-sm text-content-on-dark-muted">{t('ft.copy')}</p>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="#top"
              className="text-label-sm text-content-on-dark-muted hover:text-content-on-dark"
            >
              {t('ft.privacy')}
            </a>
            <a
              href="#top"
              className="text-label-sm text-content-on-dark-muted hover:text-content-on-dark"
            >
              {t('ft.terms')}
            </a>
            {/* Second switch, for anyone who reached the bottom without seeing the header. */}
            <LanguageToggle className="min-h-9 px-3 py-1.5 text-xs" />
          </div>
        </div>
      </div>
    </footer>
  );
}
