import type { I18nMessageBundle } from '../types';

/**
 * Copy owned by the signed-in account chip every authenticated header renders.
 *
 * The chip is shared by the public navbar, the console shell (which reuses the
 * navbar), and the dark admin header, so its copy lives in its own bundle
 * instead of growing the shared common catalog.
 */
export const sharedAccountMessages: I18nMessageBundle = {
  en: {
    "commons.account.menu": "Account menu",
    "commons.account.signedInAs": "Signed in as",
    "commons.account.signOut": "Sign out",
    "commons.account.signingOut": "Signing out...",
    "commons.account.console": "Console",
    "commons.account.overview": "Account",
    "commons.account.settings": "Settings",
  },
  zh: {
    "commons.account.menu": "账户菜单",
    "commons.account.signedInAs": "已登录为",
    "commons.account.signOut": "退出登录",
    "commons.account.signingOut": "正在退出…",
    "commons.account.console": "控制台",
    "commons.account.overview": "账户",
    "commons.account.settings": "设置",
  },
  de: {
    "commons.account.menu": "Kontomenü",
    "commons.account.signedInAs": "Angemeldet als",
    "commons.account.signOut": "Abmelden",
    "commons.account.signingOut": "Wird abgemeldet…",
    "commons.account.console": "Konsole",
    "commons.account.overview": "Konto",
    "commons.account.settings": "Einstellungen",
  },
  fr: {
    "commons.account.menu": "Menu du compte",
    "commons.account.signedInAs": "Connecté en tant que",
    "commons.account.signOut": "Se déconnecter",
    "commons.account.signingOut": "Déconnexion…",
    "commons.account.console": "Console",
    "commons.account.overview": "Compte",
    "commons.account.settings": "Paramètres",
  },
  ja: {
    "commons.account.menu": "アカウントメニュー",
    "commons.account.signedInAs": "サインイン中",
    "commons.account.signOut": "サインアウト",
    "commons.account.signingOut": "サインアウトしています…",
    "commons.account.console": "コンソール",
    "commons.account.overview": "アカウント",
    "commons.account.settings": "設定",
  },
  ko: {
    "commons.account.menu": "계정 메뉴",
    "commons.account.signedInAs": "로그인 계정",
    "commons.account.signOut": "로그아웃",
    "commons.account.signingOut": "로그아웃 중…",
    "commons.account.console": "콘솔",
    "commons.account.overview": "계정",
    "commons.account.settings": "설정",
  },
  ru: {
    "commons.account.menu": "Меню аккаунта",
    "commons.account.signedInAs": "Вы вошли как",
    "commons.account.signOut": "Выйти",
    "commons.account.signingOut": "Выход…",
    "commons.account.console": "Консоль",
    "commons.account.overview": "Аккаунт",
    "commons.account.settings": "Настройки",
  },
};
