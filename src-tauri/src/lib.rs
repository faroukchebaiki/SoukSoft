// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn print_receipt_html(html: String, paper_width: Option<u32>) -> Result<(), String> {
    use std::{fs, path::PathBuf, process::Command};

    let temp_dir = tauri::api::path::temp_dir();
    let path: PathBuf = temp_dir.join("souksoft-receipt.html");
    fs::write(&path, html).map_err(|err| format!("Failed to write receipt: {err}"))?;

    #[cfg(target_os = "windows")]
    {
        // Use PowerShell's Out-Printer to send the file directly.
        let ps_script = format!(
            "Get-Content -Path '{}' | Out-Printer",
            path.to_string_lossy().replace('\\', "\\\\")
        );
        let result = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-Command")
            .arg(ps_script)
            .output();

        if result
            .as_ref()
            .map(|output| output.status.success())
            .unwrap_or(false)
        {
            return Ok(());
        }

        let error_msg = result
            .err()
            .map(|e| format!("PowerShell print error: {e}"))
            .or_else(|| {
                result.as_ref().map(|output| {
                    String::from_utf8_lossy(&output.stderr).to_string()
                })
            })
            .unwrap_or_else(|| "PowerShell printing failed".to_string());

        return Err(error_msg);
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Try lp first (common on Linux), then lpr.
        let lp_result = Command::new("lp")
            .arg("-t")
            .arg(format!(
                "SoukSoft Receipt {}mm",
                paper_width.unwrap_or(80)
            ))
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
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, print_receipt_html])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
