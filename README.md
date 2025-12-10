# Expense Tracker V2

![Logo](./src/assets/logo.png)

Expense Tracker V2 is a desktop application for personal finance management, built with a Rust backend using Tauri and a React frontend. It provides robust tools for importing, visualizing, and managing your financial data locally and securely.

## Features

- **Cross-Platform:** Runs on Windows, macOS, and Linux thanks to the Tauri framework.
- **CSV Import:** Easily import your transaction history from CSV files. The app includes predefined formats for providers like Wells Fargo, American Express, and Capital One, and can validate files against these formats.
- **Interactive Data Visualization:**
  - **Grouped Bar Charts:** View aggregated expenses, income, and savings grouped by day, month, or year.
  - **Stacked Bar Charts:** Analyze spending distribution across different tags and categories.
  - **Line Charts:** Track cumulative totals year-to-date.
  - **Summary Chart:** See a quick overview of total income vs. expenses for a selected period.
- **Dynamic Data Exploration:**
  - An interactive brush scrubber allows for intuitive date range selection and filtering across all views.
  - A date-picker modal provides precise range control.
- **Comprehensive Expense Management:**
  - A searchable and sortable data table displays all transactions.
  - Full CRUD (Create, Read, Update, Delete) functionality for expenses.
  - Batch operations for tagging, modifying, or deleting multiple entries at once.
- **Customizable Tagging:** Categorize your expenses with a flexible tagging system. A dedicated settings page allows you to toggle which tags are visible in the charts.
- **Secure & Local:** All data is stored locally on your machine using `tauri-plugin-store`, ensuring your financial information remains private.
- **Multi-window Support:** Open multiple instances of the application to compare different views simultaneously.

## Tech Stack

- **Backend:** Rust, Tauri
- **Frontend:** React, TypeScript, Vite
- **UI & Styling:** Chakra UI, Sass (`scss`)
- **State Management:** RxJS, Custom React Hooks
- **Charting:** Plotly.js, D3.js
- **Routing:** React Router

## Project Structure

The repository is a monorepo containing both the frontend and backend code:

- `src/`: The React/TypeScript frontend application. This includes all pages, components, charts, hooks, and state management logic.
- `src-tauri/`: The Rust backend. This handles core application logic, including:
  - Data persistence via `tauri-plugin-store`.
  - CSV file parsing and validation.
  - A command-based API exposed to the frontend.
  - Window and application lifecycle management.

## Getting Started

### Prerequisites

- **Rust:** Install via [rustup](https://rustup.rs/).
- **Node.js:** Install Node.js and `npm`.
- **Tauri CLI:** Install the command-line interface for Tauri.
  ```shell
  cargo install tauri-cli
  ```

### Installation & Setup

1.  Clone the repository:

    ```shell
    git clone https://github.com/nikcich/ExpenseTrackerV2.git
    cd ExpenseTrackerV2
    ```

2.  Install the frontend dependencies:

    ```shell
    npm install
    ```

3.  Build the Rust backend for the first time:
    ```shell
    cd src-tauri
    cargo build
    cd ..
    ```

## Usage

### Development

To run the application in development mode with hot-reloading for both the frontend and backend:

```shell
npm run tauri dev
```

### Building for Production

To build a distributable, production-ready executable for your platform:

```shell
npm run tauri build
```
