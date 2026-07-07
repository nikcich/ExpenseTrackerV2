# Local Dev Setup — AI/ML Dependencies

The AI tagging feature uses `llama-cpp-2` Rust crate, which builds `llama.cpp`
from source via `llama-cpp-sys-2`. That crate uses `bindgen` to generate FFI
bindings, which requires `libclang`.

## Windows (winget)

```powershell
winget install LLVM
```

Then set the environment variable (permanently via System Properties → Environment
Variables, or per-session):

```powershell
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
```

LLVM is installed to `C:\Program Files\LLVM` by winget on 64-bit Windows.

Verify:

```powershell
clang --version
dir "$env:LIBCLANG_PATH\libclang.dll"
```

## macOS

Install Xcode Command Line Tools (provides `clang`, `libclang`, `ld64`):

```bash
xcode-select --install
```

`bindgen` locates libclang automatically on macOS via `xcrun --show-sdk-path`; no
manual `LIBCLANG_PATH` is needed.

If you hit linker errors about OpenMP, install `libomp` via Homebrew:

```bash
brew install libomp
```

## Verify Rust toolchain can build

```bash
cd src-tauri
cargo check -p expense_tracker_v2
```

The first build downloads and compiles `llama.cpp` from source — expect several
minutes.
