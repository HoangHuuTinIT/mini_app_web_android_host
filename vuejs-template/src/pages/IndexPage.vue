<script setup lang="ts">
import { onMounted, unref, ref, onUnmounted, reactive } from 'vue';
import { useRouter } from 'vue-router'; // Import router

import {
  viewport,
  themeParams,
  on,
  type ThemeParams,
  retrieveLaunchParams,
  backButton,
  mainButton,
  settingsButton,
  miniApp,
} from '@tma.js/sdk-vue';

import AppPage from '@/components/AppPage.vue';

const router = useRouter(); // Initialize router

// --- HELPER: Hàm lấy giá trị từ Signal hoặc Ref an toàn ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeUnwrap = (val: any) => {
  if (typeof val === 'function') {
    return val();
  }
  return unref(val);
};

// --- NATIVE BUTTONS LOGIC ---
const toggleMainBtn = () => {
    // @ts-ignore
    if (mainButton.isVisible()) {
      mainButton.hide();
    } else {
      mainButton.setParams({
        text: 'ACTION FROM VUE',
        bgColor: '#2481cc',
        textColor: '#ffffff',
        isVisible: true
      });
    }
};

const toggleBackBtn = () => {
   // @ts-ignore
   if (backButton.isVisible()) {
     backButton.hide();
   } else {
     backButton.show();
   }
};

const toggleSettingsBtn = () => {
   // @ts-ignore
   if (settingsButton.isVisible()) {
     settingsButton.hide();
   } else {
     settingsButton.show();
   }
};

// Listen to button clicks
on('main_button_pressed', () => {
    console.log("Main Button pressed");
    lastEventLog.value = `Main Button: ${new Date().toLocaleTimeString()}`;
    router.push({ name: 'order' }); // Navigate to order page
});

const lastEventLog = ref('');

on('back_button_pressed', () => {
    console.log("Back Button pressed");
    lastEventLog.value = `Back Button: ${new Date().toLocaleTimeString()}`;

    // Nếu có lịch sử duyệt thì Back, nếu không thì đóng App
    if (window.history.length > 1) {
       try {
          router.back();
       } catch (e) {
          lastEventLog.value = `Back Error: ${e}`;
       }
    } else {
       console.log("Root page - Closing App");
       lastEventLog.value = "Root page -> Closing App";
       miniApp.close();
    }
});

on('settings_button_pressed', () => {
  alert("Settings clicked!");
});

// --- DATA FORM ---
const formData = reactive({
  name: 'Vue User',
  age: '25',
  job: 'Developer'
});

// --- 1. XỬ LÝ DỮ LIỆU VIEWPORT ---
const vpHeight = ref(0);
const vpWidth = ref(0);
const vpExpanded = ref(false);
const vpStable = ref(false);

const updateViewportState = () => {
    const h = safeUnwrap(viewport.height);
    const w = safeUnwrap(viewport.width);
    const e = safeUnwrap(viewport.isExpanded);
    const s = safeUnwrap(viewport.isStable);

    if (h) vpHeight.value = h;
    if (w) vpWidth.value = w;
    if (e !== undefined) vpExpanded.value = !!e;
    if (s !== undefined) vpStable.value = !!s;
};

const cleanupViewportListener = on('viewport_changed', (payload) => {
    vpHeight.value = payload.height;
    vpWidth.value = payload.width;
    vpExpanded.value = payload.is_expanded;
    vpStable.value = payload.is_state_stable;
});

// --- 2. XỬ LÝ SAFE AREA ---
const safeArea = reactive({ top: 0, bottom: 0, left: 0, right: 0 });
const contentSafeArea = reactive({ top: 0, bottom: 0, left: 0, right: 0 });

const cleanupSafeAreaListener = on('safe_area_changed', (payload) => {
  Object.assign(safeArea, payload);
});

const cleanupContentSafeAreaListener = on('content_safe_area_changed', (payload) => {
  Object.assign(contentSafeArea, payload);
});

// --- 3. XỬ LÝ DỮ LIỆU THEME ---
const themeState = ref<ThemeParams>({});

const cleanupThemeListener = on('theme_changed', (payload) => {
  themeState.value = payload.theme_params;
});

// Load theme initial state
const updateThemeState = () => {
   const t = safeUnwrap(themeParams.state); // Truy cập state của signal
   if (t) themeState.value = t;
};

// --- NHẬN DATA TỪ ANDROID QUA EVENT (JSON) - Dành cho update real-time ---
const onAndroidData = (event: Event) => {
  const customEvent = event as CustomEvent;
  const data = customEvent.detail;
  console.log("Received Data from Android via Event:", data);

  if (data) {
    if (data.name) formData.name = data.name;
    if (data.age) formData.age = String(data.age);
    if (data.job) formData.job = data.job;
  }
};

// --- 4. HÀM GỬI DATA ---
const sendToAndroid = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proxy = (window as any).TelegramWebviewProxy;

  if (proxy) {
    const payload = {
      name: formData.name,
      age: formData.age,
      job: formData.job,
      action: 'Form Submit',
      timestamp: Date.now()
    };

    proxy.postEvent('send_data_back_to_android', JSON.stringify(payload));
  } else {
    alert("Không tìm thấy Android Bridge! Đang chạy trên Web thường?");
    console.log("Mock Send:", { ...formData });
  }
};

onMounted(async () => {
  updateViewportState();
  updateThemeState();

  // --- NHẬN DATA TỪ URL (Start Param) ---
  try {
    const launchParams = retrieveLaunchParams();
    if (launchParams.tgWebAppStartParam) {
      // Dữ liệu từ Android thường được mã hóa Base64 để an toàn trên URL
      const decodedString = atob(launchParams.tgWebAppStartParam);
      const startData = JSON.parse(decodedString);

      console.log("Received Start Param:", startData);

      if (startData) {
        if (startData.name) formData.name = startData.name;
        if (startData.age) formData.age = String(startData.age);
        if (startData.job) formData.job = startData.job;
      }
    }
  } catch (e) {
    console.warn("Failed to retrieve or parse start param:", e);
  }

  // --- NHẬN DATA TỪ ANDROID QUA EVENT (JSON) - Dành cho update real-time ---
  window.addEventListener('android_receive_data', onAndroidData);

  if (!viewport.isMounted()) {
    try {
      await viewport.mount();
    } catch (e) {
      console.error("Mount viewport error", e);
    }
  }

  // Mount other components
  if (!mainButton.isMounted()) mainButton.mount();
  if (!backButton.isMounted()) backButton.mount();
  if (!settingsButton.isMounted()) settingsButton.mount();

  updateViewportState();
});

onUnmounted(() => {
    window.removeEventListener('android_receive_data', onAndroidData);

    if (cleanupViewportListener) cleanupViewportListener();
    if (cleanupSafeAreaListener) cleanupSafeAreaListener();
    if (cleanupContentSafeAreaListener) cleanupContentSafeAreaListener();
    if (cleanupThemeListener) cleanupThemeListener();
});
</script>

<template>
  <AppPage title="Event Tester" :back="false">
    <div class="container">

      <!-- FORM INPUT -->
      <div class="section">
        <h3>� Gửi Dữ Liệu Về Android</h3>
        <div class="form-group">
          <label>Tên:</label>
          <input v-model="formData.name" type="text" />
        </div>
        <div class="form-group">
          <label>Tuổi:</label>
          <input v-model="formData.age" type="number" />
        </div>
        <div class="form-group">
          <label>Nghề nghiệp:</label>
          <input v-model="formData.job" type="text" />
        </div>
        <button class="btn-primary" @click="sendToAndroid" :style="{ backgroundColor: themeState.button_color || '#31b545', color: themeState.button_text_color || '#fff' }">
          Gửi & Đóng App
        </button>
      </div>

      <!-- VIEWPORT -->
      <div class="section">
        <h3>📱 Viewport</h3>
        <div class="grid">
          <div class="item">W: {{ vpWidth }}</div>
          <div class="item">H: {{ vpHeight }}</div>
          <div class="item">Expanded: {{ vpExpanded }}</div>
          <div class="item">Stable: {{ vpStable }}</div>
        </div>
      </div>

      <!-- SAFE AREA -->
      <div class="section">
        <h3>🛡️ Safe Area</h3>
        <p><b>Screen:</b> T:{{ safeArea.top }} R:{{ safeArea.right }} B:{{ safeArea.bottom }} L:{{ safeArea.left }}</p>
        <p><b>Content:</b> T:{{ contentSafeArea.top }} R:{{ contentSafeArea.right }} B:{{ contentSafeArea.bottom }} L:{{ contentSafeArea.left }}</p>
      </div>

      <!-- NATIVE CONTROLS TEST -->
      <div class="section">
        <h3>🎮 Native Controls</h3>
        <div class="grid">
          <button @click="toggleMainBtn">Toggle Main Button</button>
          <button @click="toggleBackBtn">Toggle Back Button</button>
          <button @click="toggleSettingsBtn">Toggle Settings</button>
        </div>
      </div>

      <!-- THEME -->
      <div class="section" :style="{ backgroundColor: themeState.secondary_bg_color || '#f0f0f0' }">
        <h3 :style="{ color: themeState.text_color }">🎨 Theme Params</h3>
        <div class="theme-grid">
          <div class="color-box" v-for="(val, key) in themeState" :key="key">
            <span class="color-sample" :style="{ background: val }"></span>
            <span class="color-name" :style="{ color: themeState.subtitle_text_color }">{{ key }}</span>
            <code :style="{ color: themeState.hint_color }">{{ val }}</code>
          </div>
        </div>
      </div>

    </div>
  </AppPage>
</template>

<style scoped>
.container { padding: 15px; display: flex; flex-direction: column; gap: 20px; }
.section {
  background: white; padding: 15px; border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
h3 { margin-top: 0; margin-bottom: 10px; font-size: 1.1em; opacity: 0.8; }

.form-group { margin-bottom: 10px; }
.form-group label { display: block; font-size: 0.9em; margin-bottom: 4px; color: #555; }
.form-group input {
  width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;
  font-size: 16px;
}

.btn-primary {
  width: 100%; padding: 12px; border: none; border-radius: 8px;
  font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 5px;
}
.btn-primary:active { opacity: 0.8; }

.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.item { background: #f9f9f9; padding: 8px; border-radius: 6px; font-size: 0.9em; }

.theme-grid { display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 0.85em; }
.color-box { display: flex; align-items: center; gap: 10px; }
.color-sample { width: 24px; height: 24px; border-radius: 4px; border: 1px solid #eee; flex-shrink: 0; }
.color-name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
</style>

