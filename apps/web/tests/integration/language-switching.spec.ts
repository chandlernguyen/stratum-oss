import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  LOCALE_REGISTRY,
  normalizeLocale,
  type EnabledLocale,
} from '../../src/lib/locales';

type LocaleSmokeData = {
  code: EnabledLocale;
  optionLabel: string;
  landingMarker: string;
  signInLabel: string;
  expectedPath: string;
};

function readLocaleJson<T>(locale: EnabledLocale, namespace: string): T {
  const filePath = path.resolve(process.cwd(), 'public', 'locales', locale, `${namespace}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function getEnabledLocaleSmokeData(): LocaleSmokeData[] {
  return ENABLED_LOCALES.map((code) => {
    const landing = readLocaleJson<{
      hero?: { primaryButton?: string; secondaryLink?: string };
    }>(code, 'landing');

    const landingMarker = landing.hero?.primaryButton;
    const signInLabel = landing.hero?.secondaryLink;

    if (!landingMarker || !signInLabel) {
      throw new Error(`Missing smoke markers for locale ${code}`);
    }

    return {
      code,
      optionLabel: LOCALE_REGISTRY[code].nativeLabel,
      landingMarker,
      signInLabel,
      expectedPath: code === DEFAULT_LOCALE ? '/' : `/${code}`,
    };
  });
}

const enabledLocales = getEnabledLocaleSmokeData();

async function openLanguageSwitcher(page: Page) {
  const switcher = page.getByTestId('language-switcher').first();
  await expect(switcher).toBeVisible({ timeout: 5000 });
  await switcher.click();
  await expect(page.locator('[role="menu"]')).toBeVisible({ timeout: 5000 });
}

async function selectLocale(page: Page, optionLabel: string) {
  const localeOption = page.locator('[role="menuitem"]').filter({ hasText: optionLabel }).first();
  await expect(localeOption).toBeVisible({ timeout: 5000 });
  await localeOption.click();
}

async function expectLocalePersistence(page: Page, localeCode: EnabledLocale) {
  await expect
    .poll(async () => {
      const localeState = await page.evaluate(() => ({
        htmlLang: document.documentElement.lang,
        storedLocale: window.localStorage.getItem('stratum_locale'),
      }));

      return {
        htmlLang: localeState.htmlLang,
        storedLocale: normalizeLocale(localeState.storedLocale) ?? localeState.storedLocale,
      };
    })
    .toEqual({
      htmlLang: localeCode,
      storedLocale: localeCode,
    });
}

test.describe('Language Switching - Public Locale Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  for (const locale of enabledLocales) {
    test(`switches landing page to ${locale.code}`, async ({ page }) => {
      await openLanguageSwitcher(page);
      await selectLocale(page, locale.optionLabel);

      await expectLocalePersistence(page, locale.code);
      await expect(page).toHaveURL(new RegExp(`${locale.expectedPath === '/' ? '/$' : `${locale.expectedPath}(?:/)?$`}`));
      await expect(page.getByRole('button', { name: locale.landingMarker })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('button', { name: locale.signInLabel }).first()).toBeVisible({ timeout: 5000 });
    });
  }

  test('selected locale persists across navigation', async ({ page }) => {
    const nonDefaultLocale = enabledLocales.find((locale) => locale.code !== DEFAULT_LOCALE);
    expect(nonDefaultLocale).toBeDefined();

    await openLanguageSwitcher(page);
    await selectLocale(page, nonDefaultLocale!.optionLabel);

    await expectLocalePersistence(page, nonDefaultLocale!.code);
    await expect(page).toHaveURL(new RegExp(`${nonDefaultLocale!.expectedPath}/?$`));
    await page.goto(`${nonDefaultLocale!.expectedPath}/pricing`);
    await page.waitForLoadState('domcontentloaded');

    await expectLocalePersistence(page, nonDefaultLocale!.code);
    await expect(page).toHaveURL(new RegExp(`${nonDefaultLocale!.expectedPath}/pricing$`));
    await expect(page.getByRole('button', { name: nonDefaultLocale!.signInLabel }).first()).toBeVisible({ timeout: 5000 });
  });
});
