use crate::{current_config, mutate_config, resize_bubble, AppState};
use tauri::image::Image;
use tauri::menu::{CheckMenuItem, IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Emitter, Manager, Wry};

const TRAY_ID: &str = "main";

const SIZES: [(f64, &str); 3] = [
    (200.0, "Small (200px)"),
    (260.0, "Medium (260px)"),
    (320.0, "Large (320px)"),
];
const BORDER_WIDTHS: [(f64, &str); 4] = [
    (0.0, "None"),
    (2.0, "Thin (2px)"),
    (4.0, "Medium (4px)"),
    (6.0, "Thick (6px)"),
];
const BORDER_COLORS: [(&str, &str); 3] = [
    ("#ffffff", "White"),
    ("#000000", "Black"),
    ("#888888", "Gray"),
];
const SHAPES: [&str; 7] = [
    "circle",
    "rounded-square",
    "pill",
    "star",
    "heart",
    "squiggle",
    "outline",
];
const OPACITIES: [f64; 4] = [1.0, 0.8, 0.6, 0.4];
const ZOOMS: [f64; 4] = [1.0, 1.5, 2.0, 2.5];

fn approx(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-6
}

fn shape_label(s: &str) -> String {
    s.split('-')
        .map(|w| {
            let mut c = w.chars();
            c.next()
                .map(|f| f.to_uppercase().collect::<String>() + c.as_str())
                .unwrap_or_default()
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn check(app: &AppHandle, id: String, label: impl AsRef<str>, checked: bool) -> tauri::Result<CheckMenuItem<Wry>> {
    CheckMenuItem::with_id(app, id, label, true, checked, None::<&str>)
}

fn submenu(app: &AppHandle, label: &str, items: &[CheckMenuItem<Wry>]) -> tauri::Result<Submenu<Wry>> {
    let refs: Vec<&dyn IsMenuItem<Wry>> = items.iter().map(|i| i as &dyn IsMenuItem<Wry>).collect();
    Submenu::with_items(app, label, true, &refs)
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let config = current_config(app);
    let cameras = app.state::<AppState>().cameras.lock().unwrap().clone();

    let camera = if cameras.is_empty() {
        let none = MenuItem::with_id(app, "noop", "No cameras found", false, None::<&str>)?;
        Submenu::with_items(app, "Camera", true, &[&none])?
    } else {
        let items = cameras
            .iter()
            .map(|c| {
                let checked = config.camera_device_id.as_deref() == Some(c.device_id.as_str());
                check(app, format!("camera:{}", c.device_id), &c.label, checked)
            })
            .collect::<tauri::Result<Vec<_>>>()?;
        submenu(app, "Camera", &items)?
    };

    let sizes = SIZES
        .iter()
        .map(|(v, l)| check(app, format!("size:{v}"), l, approx(config.size, *v)))
        .collect::<tauri::Result<Vec<_>>>()?;

    let widths = BORDER_WIDTHS
        .iter()
        .map(|(v, l)| check(app, format!("border-width:{v}"), l, approx(config.border.width, *v)))
        .collect::<tauri::Result<Vec<_>>>()?;
    let colors = BORDER_COLORS
        .iter()
        .map(|(v, l)| check(app, format!("border-color:{v}"), l, config.border.color == *v))
        .collect::<tauri::Result<Vec<_>>>()?;
    let shadows = vec![
        check(app, "shadow:on".into(), "On", config.border.shadow_amount > 0.0)?,
        check(app, "shadow:off".into(), "Off", config.border.shadow_amount == 0.0)?,
    ];
    let border = Submenu::with_items(
        app,
        "Border",
        true,
        &[
            &submenu(app, "Style", &widths)?,
            &submenu(app, "Color", &colors)?,
            &submenu(app, "Shadow", &shadows)?,
        ],
    )?;

    let mirror = check(app, "mirror".into(), "Mirror", config.mirrored)?;
    let blur = check(app, "blur".into(), "Background Blur", config.blur_amount > 0.0)?;

    let shapes = SHAPES
        .iter()
        .map(|s| check(app, format!("shape:{s}"), shape_label(s), config.shape == *s))
        .collect::<tauri::Result<Vec<_>>>()?;
    let opacities = OPACITIES
        .iter()
        .map(|v| check(app, format!("opacity:{v}"), format!("{}%", (v * 100.0).round()), approx(config.opacity, *v)))
        .collect::<tauri::Result<Vec<_>>>()?;
    let zooms = ZOOMS
        .iter()
        .map(|v| check(app, format!("zoom:{v}"), format!("{v}×"), approx(config.zoom, *v)))
        .collect::<tauri::Result<Vec<_>>>()?;

    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    Menu::with_items(
        app,
        &[
            &camera,
            &submenu(app, "Size", &sizes)?,
            &submenu(app, "Zoom", &zooms)?,
            &border,
            &mirror,
            &blur,
            &submenu(app, "Shape", &shapes)?,
            &submenu(app, "Opacity", &opacities)?,
            &separator,
            &quit,
        ],
    )
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    let (kind, value) = id.split_once(':').unwrap_or((id, ""));
    let num = value.parse::<f64>().unwrap_or(0.0);
    match kind {
        "camera" => {
            let device_id = value.to_string();
            mutate_config(app, |c| c.camera_device_id = Some(device_id.clone()));
            let _ = app.emit_to("main", "set-camera", device_id);
        }
        "size" => resize_bubble(app, num),
        "zoom" => mutate_config(app, |c| c.zoom = num),
        "border-width" => mutate_config(app, |c| c.border.width = num),
        "border-color" => mutate_config(app, |c| c.border.color = value.to_string()),
        "shadow" => mutate_config(app, |c| c.border.shadow_amount = if value == "on" { 5.0 } else { 0.0 }),
        "mirror" => mutate_config(app, |c| c.mirrored = !c.mirrored),
        "blur" => mutate_config(app, |c| c.blur_amount = if c.blur_amount > 0.0 { 0.0 } else { 10.0 }),
        "shape" => mutate_config(app, |c| c.shape = value.to_string()),
        "opacity" => mutate_config(app, |c| c.opacity = num),
        "quit" => app.exit(0),
        _ => {}
    }
}

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    TrayIconBuilder::with_id(TRAY_ID)
        .icon(Image::from_bytes(include_bytes!("../icons/tray.png"))?)
        .icon_as_template(true)
        .tooltip("Talking Head")
        .menu(&build_menu(app)?)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .build(app)?;
    Ok(())
}

/// Rebuilds the menu so check marks follow config changes made anywhere.
pub fn refresh(app: &AppHandle) {
    let Some(tray) = app.tray_by_id(TRAY_ID) else { return };
    if let Ok(menu) = build_menu(app) {
        let _ = tray.set_menu(Some(menu));
    }
}
