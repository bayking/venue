use std::sync::Mutex;
use tauri::{
    image::Image,
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition,
};

#[cfg(target_os = "macos")]
use cocoa::appkit::{NSApp, NSApplication, NSApplicationActivationPolicy};

struct AppState {
    tray: Mutex<Option<TrayIcon>>,
}

#[tauri::command]
fn set_tray_status(app: AppHandle, status: String) {
    let state = app.state::<AppState>();
    let guard = state.tray.lock().unwrap();
    if let Some(tray) = guard.as_ref() {
        let icon_bytes: &[u8] = match status.as_str() {
            "ready" => include_bytes!("../icons/status-green.png"),
            "error" => include_bytes!("../icons/status-red.png"),
            "building" => include_bytes!("../icons/status-yellow.png"),
            _ => include_bytes!("../icons/status-gray.png"),
        };

        if let Ok(icon) = Image::from_bytes(icon_bytes) {
            let _ = tray.set_icon(Some(icon));
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(AppState {
            tray: Mutex::new(None),
        })
        .setup(|app| {
            #[cfg(target_os = "macos")]
            unsafe {
                NSApp().setActivationPolicy_(NSApplicationActivationPolicy::NSApplicationActivationPolicyAccessory);
            }

            let tray = TrayIconBuilder::new()
                .icon(Image::from_bytes(include_bytes!("../icons/status-gray.png"))?)
                .icon_as_template(true)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        position,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let window_width = 340.0;
                                let x = position.x - (window_width / 2.0);
                                let y = position.y + 5.0;
                                let _ = window.set_position(PhysicalPosition::new(x as i32, y as i32));
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            let state = app.state::<AppState>();
            *state.tray.lock().unwrap() = Some(tray);

            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(false) = event {
                    let _ = window_clone.hide();
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_tray_status])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
