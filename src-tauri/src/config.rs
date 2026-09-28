use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

impl Default for Position {
    fn default() -> Self {
        // Negative means "not placed yet" — the bubble goes to the bottom-right corner
        Self { x: -1.0, y: -1.0 }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Border {
    pub width: f64,
    pub color: String,
    pub shadow_amount: f64,
}

impl Default for Border {
    fn default() -> Self {
        Self {
            width: 2.0,
            color: "#ffffff".into(),
            shadow_amount: 5.0,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Config {
    pub position: Position,
    pub size: f64,
    pub camera_device_id: Option<String>,
    pub border: Border,
    pub mirrored: bool,
    pub blur_amount: f64,
    pub opacity: f64,
    pub zoom: f64,
    pub shape: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            position: Position::default(),
            size: 150.0,
            camera_device_id: None,
            border: Border::default(),
            mirrored: true,
            blur_amount: 0.0,
            opacity: 1.0,
            zoom: 1.0,
            shape: "circle".into(),
        }
    }
}

// Same location the Electron build used, so existing settings carry over
fn config_path() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".talking-head").join("config.json"))
}

fn migrate(parsed: &mut Value) {
    let Some(obj) = parsed.as_object_mut() else { return };
    // Migrate: backgroundBlur boolean → blurAmount number
    if !obj.contains_key("blurAmount") {
        if let Some(on) = obj.get("backgroundBlur").and_then(Value::as_bool) {
            obj.insert("blurAmount".into(), Value::from(if on { 10 } else { 0 }));
        }
    }
    // Migrate: border.shadow boolean → border.shadowAmount number
    if let Some(border) = obj.get_mut("border").and_then(Value::as_object_mut) {
        if !border.contains_key("shadowAmount") {
            if let Some(on) = border.get("shadow").and_then(Value::as_bool) {
                border.insert("shadowAmount".into(), Value::from(if on { 5 } else { 0 }));
            }
        }
    }
}

pub fn load() -> Config {
    let Some(path) = config_path() else { return Config::default() };
    let Ok(raw) = fs::read_to_string(path) else { return Config::default() };
    let Ok(mut parsed) = serde_json::from_str::<Value>(&raw) else { return Config::default() };
    migrate(&mut parsed);
    serde_json::from_value(parsed).unwrap_or_default()
}

pub fn save(config: &Config) {
    let Some(path) = config_path() else { return };
    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }
    if let Ok(json) = serde_json::to_string_pretty(config) {
        let _ = fs::write(path, json);
    }
}

/// Shallow-merges top-level keys from `updates`, like Object.assign in the renderer.
pub fn merge(config: &Config, updates: Value) -> Result<Config, String> {
    let mut current = serde_json::to_value(config).map_err(|e| e.to_string())?;
    if let (Some(target), Value::Object(source)) = (current.as_object_mut(), updates) {
        for (k, v) in source {
            target.insert(k, v);
        }
    }
    serde_json::from_value(current).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn migrates_legacy_boolean_fields() {
        let mut v = json!({ "backgroundBlur": true, "border": { "width": 4, "color": "#000000", "shadow": false } });
        migrate(&mut v);
        let c: Config = serde_json::from_value(v).unwrap();
        assert_eq!(c.blur_amount, 10.0);
        assert_eq!(c.border.shadow_amount, 0.0);
        assert_eq!(c.border.width, 4.0);
    }

    #[test]
    fn fills_missing_fields_with_defaults() {
        let c: Config = serde_json::from_value(json!({ "size": 200 })).unwrap();
        assert_eq!(c.size, 200.0);
        assert_eq!(c.zoom, 1.0);
        assert_eq!(c.shape, "circle");
    }

    #[test]
    fn merge_replaces_top_level_keys_only() {
        let base = Config::default();
        let merged = merge(&base, json!({ "zoom": 2.5, "border": { "shadowAmount": 3 } })).unwrap();
        assert_eq!(merged.zoom, 2.5);
        // Nested objects are replaced wholesale, like Object.assign; missing nested keys fall back to defaults
        assert_eq!(merged.border.shadow_amount, 3.0);
        assert_eq!(merged.border.color, "#ffffff");
    }

    #[test]
    fn merge_rejects_wrong_types() {
        assert!(merge(&Config::default(), json!({ "zoom": "big" })).is_err());
    }
}
