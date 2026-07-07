use directories::ProjectDirs;
use futures_util::StreamExt;
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel, Special};
use llama_cpp_2::sampling::LlamaSampler;
use once_cell::sync::OnceCell;
use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;

pub type ProgressCallback = Box<dyn Fn(f64, &str) + Send>;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TaggedExample {
    pub description: String,
    pub tag: String,
}

static BACKEND: OnceCell<LlamaBackend> = OnceCell::new();
static MODEL: OnceCell<Mutex<Option<LlamaModel>>> = OnceCell::new();
static MODEL_DIR: OnceCell<PathBuf> = OnceCell::new();
static LAST_INFERENCE: Mutex<Option<Instant>> = Mutex::new(None);
static DOWNLOAD_LOCK: OnceCell<tokio::sync::Mutex<()>> = OnceCell::new();

const MODEL_URL: &str =
    "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf";
const MODEL_FILENAME: &str = "qwen2.5-1.5b-instruct-q4_k_m.gguf";
const MODEL_VERSION: &str = "v2";
// Expected size: ~900 MB. Use 700 MB as minimum threshold.
const MIN_EXPECTED_SIZE: u64 = 700_000_000;

const TAGS: &[&str] = &[
    "Food", "Utilities", "Rent/Mortgage", "Transportation", "Entertainment",
    "Health/Med", "Shopping", "Debt", "Gifts", "Misc.", "Motorcycle", "Work",
    "Gas", "One Off", "Insurance", "Credit Repayment", "Vacation/Travel",
    "Income", "Savings",
];

fn get_project_dirs() -> PathBuf {
    if let Some(dir) = ProjectDirs::from("com", "expense-tracker", "expense_tracker_v2") {
        dir.data_dir().to_path_buf()
    } else {
        std::env::current_dir().unwrap_or_default().join(".model_data")
    }
}

fn get_model_dir() -> PathBuf {
    MODEL_DIR
        .get_or_init(|| {
            let base = get_project_dirs();
            let dir = base.join("models").join(MODEL_VERSION);
            std::fs::create_dir_all(&dir).ok();
            dir
        })
        .clone()
}

fn get_model_path() -> PathBuf {
    let path = get_model_dir().join(MODEL_FILENAME);
    println!("[model_manager] model path: {}", path.display());
    path
}

pub fn is_model_downloaded() -> bool {
    let path = get_model_path();
    path.exists() && std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0) >= MIN_EXPECTED_SIZE
}

fn verify_model_loadable(path: &std::path::Path) -> bool {
    let backend = match init_backend() {
        Ok(b) => b,
        Err(_) => return false,
    };
    LlamaModel::load_from_file(
        backend,
        path.to_str().unwrap_or(""),
        &LlamaModelParams::default(),
    )
    .is_ok()
}

pub async fn ensure_model_downloaded(on_progress: Option<ProgressCallback>) -> Result<String, String> {
    if is_model_downloaded() {
        if let Some(ref cb) = on_progress {
            cb(100.0, "ready");
        }
        return Ok("Model already downloaded".to_string());
    }
    download_model_raw(on_progress).await
}

pub async fn download_model_raw(on_progress: Option<ProgressCallback>) -> Result<String, String> {
    let _lock = DOWNLOAD_LOCK
        .get_or_init(|| tokio::sync::Mutex::new(()))
        .lock()
        .await;

    let model_path = get_model_path();

    if model_path.exists() {
        std::fs::remove_file(&model_path).map_err(|e| format!("Failed to remove existing model: {}", e))?;
    }

    let tmp_path = model_path.with_extension("gguf.part");

    let client = reqwest::Client::new();
    let response = client
        .get(MODEL_URL)
        .send()
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut last_reported: i32 = -1;

    let file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    let mut writer = tokio::io::BufWriter::new(file);

    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Download error: {}", e))?;
        downloaded += chunk.len() as u64;

        tokio::io::AsyncWriteExt::write_all(&mut writer, &chunk)
            .await
            .map_err(|e| format!("Write error: {}", e))?;

        if total_size > 0 {
            let pct_whole = (downloaded as f64 / total_size as f64 * 100.0) as i32;
            let pct = downloaded as f64 / total_size as f64 * 100.0;
            if pct_whole > last_reported {
                last_reported = pct_whole;
                if let Some(ref cb) = on_progress {
                    cb(pct, "downloading");
                }
            }
            println!(
                "Downloading model: {:.1}% ({:.1} MB / {:.1} MB)",
                pct,
                downloaded as f64 / 1_000_000.0,
                total_size as f64 / 1_000_000.0
            );
        }
    }

    writer
        .into_inner()
        .sync_all()
        .await
        .map_err(|e| format!("Sync error: {}", e))?;

    tokio::fs::rename(&tmp_path, &model_path)
        .await
        .map_err(|e| format!("Failed to finalize model file: {}", e))?;

    if let Some(ref cb) = on_progress {
        cb(99.0, "verifying");
    }

    let model_path_clone = model_path.clone();
    let verified = tokio::task::spawn_blocking(move || verify_model_loadable(&model_path_clone))
        .await
        .unwrap_or(false);

    if !verified {
        std::fs::remove_file(&model_path).ok();
        if let Some(ref cb) = on_progress {
            cb(0.0, "failed");
        }
        return Err("Downloaded model file is corrupted. Please try again.".to_string());
    }

    if let Some(ref cb) = on_progress {
        cb(100.0, "ready");
    }

    Ok(format!("Downloaded model ({:.1} MB)", downloaded as f64 / 1_000_000.0))
}

fn build_prompt(description: &str, examples: &[TaggedExample]) -> String {
    let tags_str = TAGS.join(", ");
    let mut prompt = format!(
        "Classify this transaction into one of these categories: {}.\n",
        tags_str
    );

    if !examples.is_empty() {
        prompt.push_str("\nHere are some examples of how similar transactions have been categorized:\n");
        for ex in examples {
            prompt.push_str(&format!("Transaction: {}\nCategory: {}\n\n", ex.description, ex.tag));
        }
        prompt.push_str("Now classify the following transaction:\n");
    }

    prompt.push_str(&format!(
        "Transaction: {}\nCategory (return ONLY the category name, nothing else):",
        description
    ));

    prompt
}

fn init_backend() -> Result<&'static LlamaBackend, String> {
    BACKEND.get_or_try_init(|| {
        LlamaBackend::init().map_err(|e| format!("Failed to init backend: {}", e))
    })
}

fn run_inference(description: &str, examples: &[TaggedExample]) -> Result<String, String> {
    let backend = init_backend()?;

    let model_path = get_model_path();
    if !model_path.exists() {
        return Err("Model not downloaded. Call download_model() first.".to_string());
    }

    let model_cell = MODEL.get_or_init(|| Mutex::new(None));
    let mut model_guard = model_cell.lock().unwrap();

    if model_guard.is_none() {
        match LlamaModel::load_from_file(
            backend,
            model_path.to_str().ok_or("Invalid model path")?,
            &LlamaModelParams::default(),
        ) {
            Ok(m) => *model_guard = Some(m),
            Err(e) => {
                // Corrupted model file — clean up so re-download will work
                std::fs::remove_file(&model_path).ok();
                return Err(format!("Model file corrupted. Re-download required. ({})", e));
            }
        }
    }

    let model = model_guard.as_ref().unwrap();

    let prompt = build_prompt(description, examples);

    println!("[suggest_tag] examples: {} | prompt length: {} chars", examples.len(), prompt.len());

    let tokens = model
        .str_to_token(&prompt, AddBos::Always)
        .map_err(|e| format!("Tokenization failed: {}", e))?;

    let n_tokens = tokens.len() as u32;
    let n_ctx_val = std::cmp::max(n_tokens + 128, 512);
    let n_ctx = NonZeroU32::new(n_ctx_val).ok_or("Invalid context size")?;
    let n_batch: u32 = 2048;
    let mut ctx = model
        .new_context(
            backend,
            LlamaContextParams::default()
                .with_n_ctx(Some(n_ctx))
                .with_n_batch(n_batch),
        )
        .map_err(|e| format!("Failed to create context: {}", e))?;

    // Process prompt in batches of n_batch to avoid allocating a huge compute graph
    for (i, chunk) in tokens.chunks(n_batch as usize).enumerate() {
        let mut batch = LlamaBatch::new(chunk.len(), 1);
        let start = i * n_batch as usize;
        for (j, &token) in chunk.iter().enumerate() {
            let pos = (start + j) as i32;
            let is_last = (start + j) == tokens.len() - 1;
            batch
                .add(token, pos, &[0], is_last)
                .map_err(|e| format!("Batch add failed at token {}: {}", start + j, e))?;
        }
        ctx.decode(&mut batch)
            .map_err(|e| format!("Decode failed at batch {}: {}", i, e))?;
    }

    let mut sampler = LlamaSampler::chain_simple([
        LlamaSampler::top_k(40),
        LlamaSampler::top_p(0.9, 1),
        LlamaSampler::temp(0.1),
        LlamaSampler::dist(42),
    ]);

    let mut output = String::new();
    let max_tokens = 32;
    let mut pos = tokens.len() as i32;

    for _ in 0..max_tokens {
        let new_token_id = sampler.sample(&ctx, -1);

        let token_str = model
            .token_to_str(new_token_id, Special::Plaintext)
            .map_err(|e| format!("Token to string failed: {}", e))?;

        if token_str.trim().is_empty() || token_str.contains('\n') {
            break;
        }
        output.push_str(&token_str);

        let mut next_batch = LlamaBatch::new(1, 1);
        next_batch
            .add(new_token_id, pos, &[0], true)
            .map_err(|e| format!("Next batch add failed: {}", e))?;

        sampler.accept(new_token_id);
        ctx.decode(&mut next_batch)
            .map_err(|e| format!("Next decode failed: {}", e))?;

        pos += 1;
    }

    let output = output.trim().to_string();

    let matched = TAGS
        .iter()
        .find(|tag| output.to_lowercase().contains(&tag.to_lowercase()));

    match matched {
        Some(tag) => Ok(tag.to_string()),
        None => Err(format!(
            "Could not classify '{}' into known tags. Model output: '{}'",
            description, output
        )),
    }
}

pub fn suggest_tag(description: &str, examples: &[TaggedExample]) -> Result<String, String> {
    {
        let mut last = LAST_INFERENCE.lock().unwrap();
        *last = Some(Instant::now());
    }

    run_inference(description, examples)
}
