#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#[tauri::command]
async fn save_export(name: String, content: String) -> Result<bool, String> {
    let file = rfd::AsyncFileDialog::new().set_file_name(&name).save_file().await;
    if let Some(file) = file {
        file.write(content.as_bytes()).await.map_err(|e| e.to_string())?;
        Ok(true)
    } else { Ok(false) }
}
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_export])
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar Vocabulario árabe");
}
