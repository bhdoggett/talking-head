mod config;
mod tray;

use config::Config;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_global_shortcut::ShortcutState;

/// Extra room around the bubble so the border and drop shadow aren't clipped.
pub const SHADOW_PAD: f64 = 20.0;
const MIN_SIZE: f64 = 80.0;
const MAX_SIZE: f64 = 320.0;
const MENU_W: f64 = 400.0;
const MENU_EST_H: f64 = 380.0;
const TOGGLE_SHORTCUT: &str = "CommandOrControl+Shift+H";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Camera {
    pub device_id: String,
    pub label: String,
}

pub struct AppState {
    pub config: Mutex<Config>,
    pub cameras: Mutex<Vec<Camera>>,
}

pub fn current_config(app: &AppHandle) -> Config {
    app.state::<AppState>().config.lock().unwrap().clone()
}

/// Applies a change, persists it, and tells every window and the tray.
pub fn mutate_config(app: &AppHandle, f: impl FnOnce(&mut Config)) {
    let updated = {
        let state = app.state::<AppState>();
        let mut config = state.config.lock().unwrap();
        f(&mut config);
        config::save(&config);
        config.clone()
    };
    let _ = app.emit("config-changed", &updated);
    tray::refresh(app);
}

pub fn resize_bubble(app: &AppHandle, new_size: f64) {
    let Some(win) = app.get_webview_window("main") else { return };
    let clamped = new_size.clamp(MIN_SIZE, MAX_SIZE);
    let scale = win.scale_factor().unwrap_or(1.0);
    let Ok(pos) = win.outer_position() else { return };
    let pos = pos.to_logical::<f64>(scale);
    // Grow/shrink around the center so the bubble doesn't jump
    let delta = (current_config(app).size - clamped) / 2.0;
    let new_pos = LogicalPosition::new((pos.x + delta).round(), (pos.y + delta).round());
    let _ = win.set_size(LogicalSize::new(clamped + SHADOW_PAD, clamped + SHADOW_PAD));
    let _ = win.set_position(new_pos);
    mutate_config(app, |c| {
        c.size = clamped;
        c.position.x = new_pos.x;
        c.position.y = new_pos.y;
    });
}

fn toggle_main_visibility(app: &AppHandle) {
    let Some(win) = app.get_webview_window("main") else { return };
    if win.is_visible().unwrap_or(false) {
        let _ = win.hide();
    } else {
        let _ = win.show();
    }
}

#[tauri::command]
fn get_config(app: AppHandle) -> Config {
    current_config(&app)
}

#[tauri::command]
fn update_config(app: AppHandle, updates: Value) -> Result<(), String> {
    let merged = config::merge(&current_config(&app), updates)?;
    mutate_config(&app, |c| *c = merged);
    Ok(())
}

#[tauri::command]
fn set_size(app: AppHandle, size: f64) {
    resize_bubble(&app, size);
}

#[tauri::command]
fn set_cameras(app: AppHandle, cameras: Vec<Camera>) {
    *app.state::<AppState>().cameras.lock().unwrap() = cameras;
    tray::refresh(&app);
}

#[tauri::command]
fn toggle_menu(app: AppHandle) -> Result<(), String> {
    if let Some(menu) = app.get_webview_window("menu") {
        return menu.close().map_err(|e| e.to_string());
    }
    let main = app.get_webview_window("main").ok_or("no main window")?;
    let scale = main.scale_factor().map_err(|e| e.to_string())?;
    let pos = main.outer_position().map_err(|e| e.to_string())?.to_logical::<f64>(scale);
    let size = main.outer_size().map_err(|e| e.to_string())?.to_logical::<f64>(scale);

    let monitor = main
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| main.primary_monitor().ok().flatten())
        .ok_or("no monitor")?;
    let area = monitor.work_area();
    let area_pos = area.position.to_logical::<f64>(scale);
    let area_size = area.size.to_logical::<f64>(scale);

    // Right of bubble, clamped so the window never overflows the screen edge
    let x = (pos.x + size.width - 2.0).min(area_pos.x + area_size.width - MENU_W);
    // Align to bubble top; shift up if not enough space below
    let y = (pos.y + 10.0)
        .min(area_pos.y + area_size.height - MENU_EST_H)
        .max(area_pos.y + 10.0);

    let menu = WebviewWindowBuilder::new(&app, "menu", WebviewUrl::App("index.html".into()))
        .title("Talking Head Menu")
        .inner_size(MENU_W, MENU_EST_H)
        .position(x, y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .resizable(false)
        .shadow(false)
        .skip_taskbar(true)
        .visible_on_all_workspaces(true)
        .focused(true)
        .build()
        .map_err(|e| e.to_string())?;

    // Close when focus leaves, after a short grace period so opening doesn't immediately close it
    let opened = Instant::now();
    let handle = menu.clone();
    menu.on_window_event(move |event| {
        if let WindowEvent::Focused(false) = event {
            if opened.elapsed() > Duration::from_millis(500) {
                let _ = handle.close();
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn resize_menu(app: AppHandle, width: f64, height: f64) {
    if let Some(menu) = app.get_webview_window("menu") {
        let _ = menu.set_size(LogicalSize::new(width, height));
    }
}

#[tauri::command]
fn close_menu(app: AppHandle) {
    if let Some(menu) = app.get_webview_window("menu") {
        let _ = menu.close();
    }
}

fn create_main_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let config = current_config(app);
    let size = config.size;

    let (x, y) = if config.position.x >= 0.0 && config.position.y >= 0.0 {
        (config.position.x, config.position.y)
    } else {
        match app.primary_monitor().ok().flatten() {
            Some(m) => {
                let scale = m.scale_factor();
                let area = m.work_area();
                let p = area.position.to_logical::<f64>(scale);
                let s = area.size.to_logical::<f64>(scale);
                (p.x + s.width - size - 20.0, p.y + s.height - size - 20.0)
            }
            None => (100.0, 100.0),
        }
    };

    let win = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Talking Head")
        .inner_size(size + SHADOW_PAD, size + SHADOW_PAD)
        .position(x, y)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .resizable(false)
        .shadow(false)
        .skip_taskbar(true)
        .visible_on_all_workspaces(true)
        .accept_first_mouse(true)
        .focused(false)
        .build()?;

    let _ = win.set_ignore_cursor_events(true);

    // Persist position after native drags
    let app_handle = app.clone();
    let win_handle = win.clone();
    win.on_window_event(move |event| {
        if let WindowEvent::Moved(pos) = event {
            let scale = win_handle.scale_factor().unwrap_or(1.0);
            let p = pos.to_logical::<f64>(scale);
            let state = app_handle.state::<AppState>();
            let mut config = state.config.lock().unwrap();
            config.position.x = p.x;
            config.position.y = p.y;
            config::save(&config);
        }
    });

    Ok(win)
}

/// Electron could ignore clicks while still forwarding mouse-move events to the page;
/// Tauri can't, so we poll the cursor and only accept input while it's over the bubble.
fn spawn_click_through_poller(app: AppHandle) {
    std::thread::spawn(move || {
        let mut ignoring = true;
        loop {
            std::thread::sleep(Duration::from_millis(40));
            let Some(win) = app.get_webview_window("main") else { continue };
            if !win.is_visible().unwrap_or(false) {
                continue;
            }
            let (Ok(cursor), Ok(pos), Ok(size)) =
                (app.cursor_position(), win.outer_position(), win.outer_size())
            else {
                continue;
            };
            let inside = cursor.x >= pos.x as f64
                && cursor.x < pos.x as f64 + size.width as f64
                && cursor.y >= pos.y as f64
                && cursor.y < pos.y as f64 + size.height as f64;
            if inside == ignoring {
                ignoring = !inside;
                let _ = win.set_ignore_cursor_events(ignoring);
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts([TOGGLE_SHORTCUT])
                .expect("valid shortcut")
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        toggle_main_visibility(app);
                    }
                })
                .build(),
        )
        .manage(AppState {
            config: Mutex::new(config::load()),
            cameras: Mutex::new(Vec::new()),
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            update_config,
            set_size,
            set_cameras,
            toggle_menu,
            resize_menu,
            close_menu,
        ])
        .setup(|app| {
            // No Dock icon — tray only, like the Electron build
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let handle = app.handle().clone();
            create_main_window(&handle)?;
            tray::create(&handle)?;
            spawn_click_through_poller(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Talking Head");
}
