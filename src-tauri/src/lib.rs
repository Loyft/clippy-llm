mod config;

use clap::{error::ErrorKind, Parser};
use config::AppConfig;
use std::sync::Mutex;
use tauri::{
 menu::{Menu, MenuItem},
 tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
 Emitter, Manager, PhysicalPosition, State, WebviewWindow, WindowEvent,
};

/// Padding from the right and bottom edges of the monitor work area.
const EDGE_MARGIN_PX: i32 = 28;

fn position_bottom_right(window: &WebviewWindow) {
 let monitor = window
 .current_monitor()
 .ok()
 .flatten()
 .or_else(|| window.primary_monitor().ok().flatten());

 let Some(monitor) = monitor else {
 return;
 };

 let Ok(win_size) = window.outer_size() else {
 return;
 };

 // Prefer work area so we clear the Dock / menu bar on macOS.
 let area = monitor.work_area();
 let x = area.position.x + area.size.width as i32 - win_size.width as i32 - EDGE_MARGIN_PX;
 let y = area.position.y + area.size.height as i32 - win_size.height as i32 - EDGE_MARGIN_PX;

 let _ = window.set_position(PhysicalPosition::new(x.max(area.position.x), y.max(area.position.y)));
}

#[derive(Parser, Debug, Clone)]
#[command(name = "clippy", about = "Clippy desktop companion powered by a local LLM")]
struct Cli {
 /// Ollama model name
 #[arg(long)]
 model: Option<String>,

 /// Ollama base URL
 #[arg(long)]
 ollama: Option<String>,
}

fn parse_cli() -> Cli {
 // Filter macOS process-serial-number args injected for GUI apps.
 let args: Vec<std::ffi::OsString> = std::env::args_os()
 .filter(|a| {
 let s = a.to_string_lossy();
 !s.starts_with("-psn_")
 })
 .collect();

 match Cli::try_parse_from(args) {
 Ok(cli) => cli,
 Err(e) => {
 if matches!(
 e.kind(),
 ErrorKind::DisplayHelp | ErrorKind::DisplayVersion
 ) {
 e.exit();
 }
 // Ignore unexpected launcher args; fall back to config/defaults.
 Cli {
 model: None,
 ollama: None,
 }
 }
 }
}

struct ConfigState(Mutex<AppConfig>);

#[tauri::command]
fn get_config(state: State<'_, ConfigState>) -> AppConfig {
 state.0.lock().expect("config lock").clone()
}

#[tauri::command]
fn set_proactive(state: State<'_, ConfigState>, enabled: bool) -> AppConfig {
 let mut cfg = state.0.lock().expect("config lock");
 cfg.proactive = enabled;
 cfg.clone()
}

#[tauri::command]
fn set_companion(state: State<'_, ConfigState>, companion: String) -> Result<AppConfig, String> {
 let normalized = match companion.trim().to_ascii_lowercase().as_str() {
 "clippy" => "Clippy",
 "merlin" => "Merlin",
 "links" => "Links",
 "rover" => "Rover",
 "genius" => "Genius",
 "genie" => "Genie",
 "peedy" => "Peedy",
 "rocky" => "Rocky",
 "f1" => "F1",
 "cat" => "Cat",
 _ => return Err(format!("Unknown companion: {companion}")),
 };
 config::write_companion(normalized)?;
 let mut cfg = state.0.lock().expect("config lock");
 cfg.companion = normalized.to_string();
 Ok(cfg.clone())
}

#[tauri::command]
fn get_config_path() -> String {
 config::config_path().display().to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
 let cli = parse_cli();
 config::ensure_default_config_file();
 let app_config = config::resolve(cli.model, cli.ollama);

 tauri::Builder::default()
 .plugin(tauri_plugin_opener::init())
 .manage(ConfigState(Mutex::new(app_config)))
 .invoke_handler(tauri::generate_handler![
 get_config,
 set_proactive,
 set_companion,
 get_config_path
 ])
 .setup(|app| {
 let quit = MenuItem::with_id(app, "quit", "Quit Clippy", true, None::<&str>)?;
 let hide = MenuItem::with_id(app, "hide", "Hide / Show", true, None::<&str>)?;
 let mute = MenuItem::with_id(app, "mute", "Mute proactive tips", true, None::<&str>)?;
 let menu = Menu::with_items(app, &[&hide, &mute, &quit])?;

 let _tray = TrayIconBuilder::new()
 .icon(app.default_window_icon().unwrap().clone())
 .menu(&menu)
 .tooltip("Clippy")
 .on_menu_event(|app, event| match event.id.as_ref() {
 "quit" => {
 app.exit(0);
 }
 "hide" => {
 if let Some(window) = app.get_webview_window("main") {
 if window.is_visible().unwrap_or(true) {
 let _ = window.hide();
 } else {
 let _ = window.show();
 let _ = window.set_focus();
 }
 }
 }
 "mute" => {
 if let Some(state) = app.try_state::<ConfigState>() {
 let mut cfg = state.0.lock().expect("config lock");
 cfg.proactive = !cfg.proactive;
 let enabled = cfg.proactive;
 drop(cfg);
 let _ = app.emit("proactive-changed", enabled);
 }
 }
 _ => {}
 })
 .on_tray_icon_event(|tray, event| {
 if let TrayIconEvent::Click {
 button: MouseButton::Left,
 button_state: MouseButtonState::Up,
 ..
 } = event
 {
 let app = tray.app_handle();
 if let Some(window) = app.get_webview_window("main") {
 let _ = window.show();
 let _ = window.set_focus();
 }
 }
 })
 .build(app)?;

 if let Some(window) = app.get_webview_window("main") {
 let _ = window.set_ignore_cursor_events(false);
 position_bottom_right(&window);
 let _ = window.show();
 }

 Ok(())
 })
 .on_window_event(|window, event| {
 if let WindowEvent::CloseRequested { api, .. } = event {
 // Hide instead of quit - tray keeps Clippy alive
 api.prevent_close();
 let _ = window.hide();
 }
 })
 .run(tauri::generate_context!())
 .expect("error while running Clippy");
}
