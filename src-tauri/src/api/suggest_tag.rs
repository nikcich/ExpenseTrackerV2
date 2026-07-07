use crate::model::response::Response;
use crate::service::model_manager;
use tauri::Emitter;

#[tauri::command]
pub async fn download_model() -> Result<Response, String> {
    match model_manager::ensure_model_downloaded(None).await {
        Ok(msg) => Ok(Response::ok("Model status".to_string(), msg)),
        Err(e) => Ok(Response::err("Download failed".to_string(), e)),
    }
}

#[tauri::command]
pub async fn force_redownload_model() -> Result<Response, String> {
    match model_manager::download_model_raw(None).await {
        Ok(msg) => Ok(Response::ok("Model re-downloaded".to_string(), msg)),
        Err(e) => Ok(Response::err("Download failed".to_string(), e)),
    }
}

#[tauri::command]
pub async fn ensure_model_ready(app_handle: tauri::AppHandle) -> Result<Response, String> {
    let handle = app_handle.clone();
    let on_progress: Option<model_manager::ProgressCallback> = Some(Box::new(move |pct, stage| {
        handle.emit("download_progress", serde_json::json!({
            "percent": pct,
            "stage": stage,
        })).ok();
    }));

    model_manager::ensure_model_downloaded(on_progress).await?;

    let handle = app_handle.clone();
    let on_testing: Option<model_manager::ProgressCallback> = Some(Box::new(move |pct, stage| {
        handle.emit("download_progress", serde_json::json!({
            "percent": pct,
            "stage": stage,
        })).ok();
    }));

    let mut last_error = String::new();
    let mut success = false;

    for attempt in 1..=5 {
        if let Some(ref cb) = on_testing {
            cb(attempt as f64 * 20.0, &format!("Testing inference ({}/5)", attempt));
        }

        match tokio::task::spawn_blocking(|| {
            model_manager::suggest_tag("Starbucks coffee")
        })
        .await
        .map_err(|e| format!("Task join error: {}", e))
        .and_then(|r| r.map_err(|e| format!("Inference error: {}", e)))
        {
            Ok(tag) if tag == "Food" => {
                success = true;
                break;
            }
            Ok(tag) => {
                last_error = format!("expected 'Food', got '{}'", tag);
            }
            Err(e) => {
                last_error = e;
            }
        }

        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }

    if !success {
        return Ok(Response::err(
            "Model verification failed".to_string(),
            last_error,
        ));
    }

    if let Some(ref cb) = on_testing {
        cb(100.0, "ready");
    }

    Ok(Response::ok("Model ready".to_string(), "Model verified and working"))
}

#[tauri::command]
pub async fn suggest_tag(
    description: String,
) -> Result<Response, String> {
    if !model_manager::is_model_downloaded() {
        return Ok(Response::err(
            "Model not ready".to_string(),
            "Model not downloaded. Call download_model first.".to_string(),
        ));
    }

    let result = tokio::task::spawn_blocking(move || {
        model_manager::suggest_tag(&description)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
    .map_err(|e| format!("Inference error: {}", e))?;

    Ok(Response::ok("Tag suggestion".to_string(), result))
}

#[tauri::command]
pub async fn suggest_tags_bulk(
    descriptions: Vec<String>,
) -> Result<Response, String> {
    if !model_manager::is_model_downloaded() {
        return Ok(Response::err(
            "Model not ready".to_string(),
            "Model not downloaded. Call download_model first.".to_string(),
        ));
    }

    let results = tokio::task::spawn_blocking(move || {
        let mut suggestions: Vec<(String, String)> = Vec::new();
        for desc in descriptions {
            if let Ok(tag) = model_manager::suggest_tag(&desc) {
                suggestions.push((desc, tag));
            }
        }
        suggestions
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    Ok(Response::ok("Bulk tag suggestions".to_string(), results))
}
