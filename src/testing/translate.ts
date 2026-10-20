import { Provider } from '@angular/core';
import { TranslateLoader, TranslationObject, provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

/** Translations a spec can rely on, whatever the real es-VE file says. */
export const TEST_TRANSLATIONS: TranslationObject = {
  app: { name: 'Fauna Viva' },
  home: { title: 'Bienvenido', subtitle: 'Subtítulo', status: 'En construcción' },
  notFound: { title: 'No encontrada', back: 'Inicio' },
};

export const provideTestTranslate = (): Provider[] => [
  provideTranslateService({
    loader: provideTranslateLoader((): TranslateLoader => ({ getTranslation: () => of(TEST_TRANSLATIONS) })),
    lang: 'es-VE',
    fallbackLang: 'es-VE',
  }),
];
