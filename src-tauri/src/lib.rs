// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn list_printers() -> Result<Vec<String>, String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    {
        // PowerShell (PS 3+). If it fails (e.g., old PS2), fall back to WMIC.
        let ps_result = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-Command")
            .arg("Get-Printer | Select-Object -ExpandProperty Name")
            .output();

        if let Ok(result) = &ps_result {
            if result.status.success() {
                let stdout = String::from_utf8_lossy(&result.stdout);
                let printers: Vec<String> = stdout
                    .lines()
                    .map(|line| line.trim())
                    .filter(|line| !line.is_empty())
                    .map(|line| line.to_string())
                    .collect();
                if !printers.is_empty() {
                    return Ok(printers);
                }
            }
        }

        // WMIC fallback (available on Win7+).
        let wmic_result = Command::new("wmic")
            .args(["printer", "list", "brief"])
            .output()
            .map_err(|err| format!("Failed to list printers: {err}"))?;

        if !wmic_result.status.success() {
            return Err(String::from_utf8_lossy(&wmic_result.stderr).to_string());
        }

        let stdout = String::from_utf8_lossy(&wmic_result.stdout);
        // Skip header line, take first column as Name.
        let printers: Vec<String> = stdout
            .lines()
            .skip(1)
            .filter_map(|line| line.split_whitespace().next())
            .map(|name| name.trim().to_string())
            .filter(|name| !name.is_empty())
            .collect();

        return Ok(printers);
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Use lpstat to list printers on Unix-like systems.
        let result = Command::new("lpstat")
            .arg("-a")
            .output()
            .map_err(|err| format!("Failed to list printers: {err}"))?;

        if !result.status.success() {
            return Err(String::from_utf8_lossy(&result.stderr).to_string());
        }

        let stdout = String::from_utf8_lossy(&result.stdout);
        let printers: Vec<String> = stdout
            .lines()
            .filter_map(|line| line.split_whitespace().next())
            .map(|name| name.to_string())
            .collect();

        Ok(printers)
    }
}

#[tauri::command]
async fn print_receipt_html(
    html: String,
    paper_width: Option<u32>,
    printer_name: Option<String>,
) -> Result<(), String> {
    use std::{fs, path::PathBuf, process::Command};

    let temp_dir = tauri::api::path::temp_dir();
    let path: PathBuf = temp_dir.join("souksoft-receipt.html");
    fs::write(&path, html).map_err(|err| format!("Failed to write receipt: {err}"))?;

    #[cfg(target_os = "windows")]
    {
        // Use PowerShell's Out-Printer to send the file directly.
        let printer_segment = printer_name
            .as_ref()
            .map(|name| format!(" -Name \"{}\"", name.replace('"', "\\\"")))
            .unwrap_or_default();
        let ps_script = format!(
            "Get-Content -Path '{}' | Out-Printer{}",
            path.to_string_lossy().replace('\\', "\\\\"),
            printer_segment
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

        // Fallback: legacy `print` command (Win7 compatible).
        // Note: `print` only accepts full paths and optional /D:printerName.
        let mut print_cmd = Command::new("print");
        if let Some(name) = printer_name.as_ref() {
            print_cmd.arg(format!("/D:{}", name));
        }
        print_cmd.arg(path.to_string_lossy().to_string());
        let legacy = print_cmd.output();

        if legacy
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
            .or_else(|| {
                legacy.err().map(|e| format!("print command error: {e}")).or_else(|| {
                    legacy.as_ref().map(|output| {
                        String::from_utf8_lossy(&output.stderr).to_string()
                    })
                })
            })
            .unwrap_or_else(|| "Printing failed (PowerShell and legacy print)".to_string());

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
            .args(
                printer_name
                    .as_ref()
                    .map(|name| vec!["-d".to_string(), name.clone()])
                    .unwrap_or_default(),
            )
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
            .args(
                printer_name
                    .as_ref()
                    .map(|name| vec!["-P".to_string(), name.clone()])
                    .unwrap_or_default(),
            )
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
        .invoke_handler(tauri::generate_handler![greet, list_printers, print_receipt_html])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
