#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#[tauri::command]
async fn save_export(name: String, content: String) -> Result<bool, String> {
    let file = rfd::AsyncFileDialog::new().set_file_name(&name).save_file().await;
    if let Some(file) = file {
        file.write(content.as_bytes()).await.map_err(|e| e.to_string())?;
        Ok(true)
    } else { Ok(false) }
}
#[tauri::command]
async fn load_backup() -> Result<Option<String>, String> {
    let file = rfd::AsyncFileDialog::new()
        .add_filter("Copia de seguridad JSON", &["json"])
        .pick_file()
        .await;
    if let Some(file) = file {
        let bytes = file.read().await;
        if bytes.len() > 2_000_000 {
            return Err("La copia es demasiado grande.".into());
        }
        String::from_utf8(bytes)
            .map(Some)
            .map_err(|_| "La copia no es un archivo de texto UTF-8 válido.".into())
    } else {
        Ok(None)
    }
}
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_export, load_backup])
        .run(tauri::generate_context!())
        .expect("No se pudo iniciar Vocabulario árabe");
}
