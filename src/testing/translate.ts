import { Provider } from '@angular/core';
import { TranslateLoader, TranslationObject, provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

/** Translations a spec can rely on, whatever the real es-VE file says. */
export const TEST_TRANSLATIONS: TranslationObject = {
  app: { name: 'Fauna Viva' },
  home: { title: 'Bienvenido', subtitle: 'Subtítulo', status: 'En construcción' },
  auth: {
    "fields": {
      "email": "Correo electrónico",
      "password": "Contraseña",
      "firstName": "Nombre",
      "lastName": "Apellido",
      "alias": "Nombre de usuario",
      "code": "Código de 6 dígitos"
    },
    "login": {
      "title": "Iniciar sesión",
      "submit": "Entrar",
      "noAccount": "¿Eres apoderado y aún no tienes cuenta?",
      "createAccount": "Crear mi cuenta",
      "errors": {
        "required": "Escribe tu correo y tu contraseña.",
        "invalid": "Correo o contraseña incorrectos.",
        "tooMany": "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
        "unavailable": "No pudimos validar tu acceso. Inténtalo de nuevo en unos minutos."
      }
    },
    "register": {
      "title": "Crear mi cuenta",
      "submit": "Crear cuenta",
      "haveAccount": "¿Ya tienes cuenta?",
      "login": "Iniciar sesión",
      "errors": {
        "incomplete": "Completa todos los datos: el usuario con al menos 3 caracteres y la contraseña con al menos 8.",
        "exists": "Ya existe una cuenta con ese usuario o correo.",
        "invalid": "Revisa los datos: alguno no es válido.",
        "tooMany": "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
        "unavailable": "No pudimos completar el registro. Inténtalo de nuevo en unos minutos.",
        "badCode": "El código no es válido o venció. Revisa los 6 dígitos o pide uno nuevo."
      }
    },
    "verify": {
      "instructions": "Te enviamos un código de 6 dígitos por correo. Escríbelo aquí para confirmar tu cuenta.",
      "submit": "Confirmar correo",
      "resend": "Enviarme otro código",
      "resent": "Te enviamos un código nuevo.",
      "done": "Tu correo quedó confirmado. Ya puedes iniciar sesión.",
      "goToLogin": "Ir a iniciar sesión"
    }
  },
  session: { logout: 'Cerrar sesión', greeting: 'Hola, {{name}}' },
  notFound: { title: 'No encontrada', back: 'Inicio' },
};

export const provideTestTranslate = (): Provider[] => [
  provideTranslateService({
    loader: provideTranslateLoader((): TranslateLoader => ({ getTranslation: () => of(TEST_TRANSLATIONS) })),
    lang: 'es-VE',
    fallbackLang: 'es-VE',
  }),
];
