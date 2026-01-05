import {
  setDebug,
  themeParams,
  initData,
  viewport,
  init as initSDK,
  mockTelegramEnv,
  type ThemeParams, // Nhớ import type này
  retrieveLaunchParams,
  emitEvent,
  miniApp,
  backButton,
  isTMA,
} from '@tma.js/sdk-vue';

export async function init(options: {
  debug: boolean;
  eruda: boolean;
  mockForMacOS: boolean;
}): Promise<void> {
  setDebug(options.debug);
  initSDK();

  if (options.eruda) {
    import('eruda').then(({ default: eruda }) => {
      eruda.init();
      eruda.position({ x: window.innerWidth - 50, y: 0 });
    });
  }

  // --- LOGIC SỬA ĐỔI ---

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAndroidHost = !!(window as any).TelegramWebviewProxy;

  // FIX 1: Bỏ 'simple', gọi isTMA() không tham số, bọc try-catch
  let isRealTelegram = false;
  try {
    isRealTelegram = await isTMA();
  } catch (e) {
    console.warn("isTMA check failed, falling back to mock:", e);
  }

  if (!isAndroidHost && !isRealTelegram) {
    console.log("Running in Mock Mode (Browser Localhost or Failed Launch Params)");

    // FIX 2: Ép kiểu "as ThemeParams" để TypeScript hiểu đây là mã màu hợp lệ (#xxxxxx)
    const themeParamsMock = {
      accent_text_color: '#6ab2f2',
      bg_color: '#ffffff',
      button_color: '#5288c1',
      button_text_color: '#ffffff',
      destructive_text_color: '#ec3942',
      header_bg_color: '#ffffff',
      hint_color: '#708499',
      link_color: '#6ab3f3',
      secondary_bg_color: '#f4f4f5',
      section_bg_color: '#ffffff',
      section_header_text_color: '#6ab3f3',
      subtitle_text_color: '#708499',
      text_color: '#222222',
      bottom_bar_bg_color: '#ffffff', // Thêm trường này cho đủ bộ nếu cần
    } as ThemeParams; // <--- ÉP KIỂU TẠI ĐÂY

    mockTelegramEnv({
      onEvent(e) {
        if (e.name === 'web_app_request_theme') {
          return emitEvent('theme_changed', { theme_params: themeParamsMock });
        }
        if (e.name === 'web_app_request_viewport') {
          return emitEvent('viewport_changed', {
            height: window.innerHeight,
            width: window.innerWidth,
            is_expanded: true,
            is_state_stable: true,
          });
        }
        if (e.name === 'web_app_request_content_safe_area') {
          return emitEvent('content_safe_area_changed', { left: 0, top: 0, bottom: 0, right: 0 });
        }
        if (e.name === 'web_app_request_safe_area') {
          return emitEvent('safe_area_changed', { left: 0, top: 0, bottom: 0, right: 0 });
        }
      },
      launchParams: new URLSearchParams([
        ['tgWebAppThemeParams', JSON.stringify(themeParamsMock)],
        ['tgWebAppData', new URLSearchParams([
          ['user', JSON.stringify({
            id: 999999,
            first_name: 'Dev',
            last_name: 'Browser',
            username: 'localhost_user',
            language_code: 'en',
            is_premium: true,
            allows_write_to_pm: true,
          })],
          ['hash', 'fake-hash'],
          ['auth_date', (Date.now() / 1000).toString()],
          ['signature', 'fake-signature']
        ]).toString()],
        ['tgWebAppVersion', '7.10'],
        ['tgWebAppPlatform', 'android'], // Set to android for consistency
      ]),
    });
  } else {
    console.log("Running in Real Mode (Android Host or Telegram App)");
  }

  // --- CÁC PHẦN CÒN LẠI GIỮ NGUYÊN ---
  if (options.mockForMacOS) {
    let firstThemeSent = false;
    mockTelegramEnv({
      onEvent(event, next) {
        if (event.name === 'web_app_request_theme') {
          let tp: ThemeParams = {};
          if (firstThemeSent) {
            tp = themeParams.state() || {};
          } else {
            firstThemeSent = true;
            try {
              tp ||= retrieveLaunchParams().tgWebAppThemeParams;
            } catch { /* ignore */ }
          }
          return emitEvent('theme_changed', { theme_params: tp });
        }
        if (event.name === 'web_app_request_safe_area') {
          return emitEvent('safe_area_changed', { left: 0, top: 0, right: 0, bottom: 0 });
        }
        next();
      },
    });
  }

  backButton.mount.ifAvailable();
  initData.restore();

  if (miniApp.mount.isAvailable()) {
    themeParams.mount();
    miniApp.mount();
    themeParams.bindCssVars();
  }

  if (viewport.mount.isAvailable()) {
    viewport.mount().then(() => {
      viewport.bindCssVars();
    });
  }
}
