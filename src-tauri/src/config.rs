use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

pub const DEFAULT_MODEL: &str = "llama3.2";
pub const DEFAULT_OLLAMA: &str = "http://127.0.0.1:11434";
pub const DEFAULT_COMPANION: &str = "Clippy";
pub const DEFAULT_SYSTEM_PROMPT: &str = "You are Clippy, the classic Microsoft Office assistant from the late 1990s. You are helpful, slightly overeager, and cheerfully enthusiastic. Keep answers short - a few sentences at most - so they fit in a speech bubble. Address the user warmly. Never mention that you are an AI language model; you are Clippy, a paperclip who wants to help.";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
 pub model: String,
 pub ollama_url: String,
 pub system_prompt: String,
 pub proactive: bool,
 pub companion: String,
}

impl Default for AppConfig {
 fn default() -> Self {
 Self {
 model: DEFAULT_MODEL.to_string(),
 ollama_url: DEFAULT_OLLAMA.to_string(),
 system_prompt: DEFAULT_SYSTEM_PROMPT.to_string(),
 proactive: true,
 companion: DEFAULT_COMPANION.to_string(),
 }
 }
}

#[derive(Debug, Deserialize, Default)]
struct FileConfig {
 model: Option<String>,
 ollama_url: Option<String>,
 system_prompt: Option<String>,
 proactive: Option<bool>,
 companion: Option<String>,
}

pub fn config_dir() -> PathBuf {
 dirs::home_dir()
 .unwrap_or_else(|| PathBuf::from("."))
 .join(".config")
 .join("clippy-llm")
}

pub fn config_path() -> PathBuf {
 config_dir().join("config.toml")
}

fn load_file_config() -> FileConfig {
 let path = config_path();
 let Ok(contents) = fs::read_to_string(&path) else {
 return FileConfig::default();
 };
 toml::from_str(&contents).unwrap_or_default()
}

fn normalize_companion(value: &str) -> String {
 match value.trim().to_ascii_lowercase().as_str() {
 "clippy" => "Clippy".to_string(),
 "merlin" => "Merlin".to_string(),
 "links" => "Links".to_string(),
 "rover" => "Rover".to_string(),
 "genius" => "Genius".to_string(),
 "genie" => "Genie".to_string(),
 "peedy" => "Peedy".to_string(),
 "rocky" => "Rocky".to_string(),
 "f1" => "F1".to_string(),
 "cat" => "Cat".to_string(),
 _ => "Clippy".to_string(),
 }
}

/// Merge: defaults <- config file <- CLI overrides
pub fn resolve(cli_model: Option<String>, cli_ollama: Option<String>) -> AppConfig {
 let file = load_file_config();
 let mut cfg = AppConfig::default();

 if let Some(m) = file.model {
 cfg.model = m;
 }
 if let Some(u) = file.ollama_url {
 cfg.ollama_url = u;
 }
 if let Some(p) = file.system_prompt {
 cfg.system_prompt = p;
 }
 if let Some(b) = file.proactive {
 cfg.proactive = b;
 }
 if let Some(c) = file.companion {
 cfg.companion = normalize_companion(&c);
 }

 if let Some(m) = cli_model {
 cfg.model = m;
 }
 if let Some(u) = cli_ollama {
 cfg.ollama_url = u;
 }

 cfg
}

pub fn write_companion(companion: &str) -> Result<(), String> {
 let companion = normalize_companion(companion);
 let path = config_path();
 let mut file = load_file_config();
 file.companion = Some(companion.clone());

 // Preserve existing keys; rewrite a small TOML document.
 let model = file
 .model
 .unwrap_or_else(|| DEFAULT_MODEL.to_string());
 let ollama_url = file
 .ollama_url
 .unwrap_or_else(|| DEFAULT_OLLAMA.to_string());
 let proactive = file.proactive.unwrap_or(true);
 let system_prompt = file.system_prompt;

 let mut out = format!(
 "# Clippy LLM configuration\n\
 # CLI flags (--model, --ollama) override these values.\n\n\
 model = \"{model}\"\n\
 ollama_url = \"{ollama_url}\"\n\
 proactive = {proactive}\n\
 companion = \"{companion}\"\n"
 );
 if let Some(prompt) = system_prompt {
 let escaped = prompt.replace('\\', "\\\\").replace('"', "\\\"");
 out.push_str(&format!("\nsystem_prompt = \"{escaped}\"\n"));
 } else {
 out.push_str(
 "\n# Optional: customize personality for all companions\n# system_prompt = \"...\"\n",
 );
 }

 fs::create_dir_all(config_dir()).map_err(|e| e.to_string())?;
 fs::write(path, out).map_err(|e| e.to_string())?;
 Ok(())
}

pub fn ensure_default_config_file() {
 let dir = config_dir();
 let path = config_path();
 if path.exists() {
 return;
 }
 let _ = fs::create_dir_all(&dir);
 let template = r#"# Clippy LLM configuration
# CLI flags (--model, --ollama) override these values.

model = "llama3.2"
ollama_url = "http://127.0.0.1:11434"
proactive = true
companion = "Clippy"

# Optional: customize personality for all companions
# system_prompt = "You are Clippy..."
# companion = "Clippy" | "Merlin" | "Links" | "Rover" | "Genius" | "Genie" | "Peedy" | "Rocky" | "F1" | "Cat"
"#;
 let _ = fs::write(path, template);
}
