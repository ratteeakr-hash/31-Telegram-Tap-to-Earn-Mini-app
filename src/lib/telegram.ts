type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: {
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramLaunchData() {
  const webApp = window.Telegram?.WebApp;

  if (!webApp?.initData) {
    return {
      initData: "demo",
      startParam: undefined,
      isDemo: true
    };
  }

  webApp.ready();
  webApp.expand();

  return {
    initData: webApp.initData,
    startParam: webApp.initDataUnsafe?.start_param,
    isDemo: false
  };
}
