// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn print_receipt_html(html: String) -> Result<(), String> {
    use std::{fs, path::PathBuf, process::Command};

    let temp_dir = tauri::api::path::temp_dir();
    let path: PathBuf = temp_dir.join("souksoft-receipt.html");
    fs::write(&path, html).map_err(|err| format!("Failed to write receipt: {err}"))?;

    // Try lp first (common on Linux), then lpr.
    let lp_result = Command::new("lp")
        .arg("-t")
        .arg("SoukSoft Receipt")
        .arg(path.to_string_lossy().to_string())
        .output();

    let success = lp_result
        .as_ref()
        .map(|output| output.status.success())
        .unwrap_or(false);

    if success {
        return Ok(());
    }

    let lpr_result = Command::new("lpr")
        .arg(path.to_string_lossy().to_string())
        .output();

    if lpr_result
        .as_ref()
        .map(|output| output.status.success())
        .unwrap_or(false)
    {
        return Ok(());
    }

    // Surface the most informative error.
    let error_msg = lp_result
        .err()
        .map(|e| format!("lp error: {e}"))
        .or_else(|| {
            lpr_result
                .err()
                .map(|e| format!("lpr error: {e}"))
        })
        .unwrap_or_else(|| "No printer command found (lp/lpr)".to_string());

    Err(error_msg)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, print_receipt_html])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
