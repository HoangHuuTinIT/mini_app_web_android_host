import { emitEvent, isTMA, mockTelegramEnv } from '@tma.js/sdk-vue';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isAndroidHost = !!(window as any).TelegramWebviewProxy;

// QUAN TRỌNG: Đã sửa dòng này thành 'true' để luôn chạy giả lập
// Kể cả khi build lên GitHub Pages vẫn sẽ có thông tin user giả.
if (true) {
  // Kiểm tra xem có phải đang chạy trong Telegram thật không.
  // Nếu không phải (đang chạy trên web/android webview) VÀ KHÔNG PHẢI Android Host tự code, thì mới kích hoạt Mock.
  if (!isAndroidHost && !await isTMA('complete')) {
    const themeParams = {
      accent_text_color: '#6ab2f2',
      bg_color: '#17212b',
      button_color: '#5288c1',
      button_text_color: '#ffffff',
      destructive_text_color: '#ec3942',
      header_bg_color: '#17212b',
      hint_color: '#708499',
      link_color: '#6ab3f3',
      secondary_bg_color: '#232e3c',
      section_bg_color: '#17212b',
      section_header_text_color: '#6ab3f3',
      subtitle_text_color: '#708499',
      text_color: '#f5f5f5',
    } as const;
    const noInsets = { left: 0, top: 0, bottom: 0, right: 0 } as const;

    mockTelegramEnv({
      onEvent(e) {
        // Here you can write your own handlers for all known Telegram Mini Apps methods:
        // https://docs.telegram-mini-apps.com/platform/methods
        if (e.name === 'web_app_request_theme') {
          return emitEvent('theme_changed', { theme_params: themeParams });
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
          return emitEvent('content_safe_area_changed', noInsets);
        }
        if (e.name === 'web_app_request_safe_area') {
          return emitEvent('safe_area_changed', noInsets);
        }
      },
      launchParams: new URLSearchParams([
        // Discover more launch parameters:
        // https://docs.telegram-mini-apps.com/platform/launch-parameters#parameters-list
        ['tgWebAppThemeParams', JSON.stringify(themeParams)],

        // --- DỮ LIỆU USER GIẢ LẬP ---
        // Bạn có thể sửa tên, id user hiển thị trên App tại đây:
        ['tgWebAppData', new URLSearchParams([
          ['auth_date', (new Date().getTime() / 1000 | 0).toString()],
          ['hash', 'some-hash'],
          ['signature', 'some-signature'],
          ['user', JSON.stringify({
            id: 999999,
            first_name: 'Super',
            last_name: 'App User',
            username: 'demo_user'
          })],
        ]).toString()],
        ['tgWebAppVersion', '8.4'],
        ['tgWebAppPlatform', 'android'], // Giả lập là đang chạy trên Android
      ]),
    });

    console.info(
      '⚠️ Environment is mocked for production build.',
    );
  }
}
