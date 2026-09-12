# SciWrite Pro

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support%20My%20Work-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/kumarrsgisw)

SciWrite Pro is an AI-powered academic writing assistant designed to transform rough research drafts into polished, publication-ready scientific papers. Simply upload your draft, and let the AI rewrite, format, and cite your work based on your target journal style.

## 🚀 Features

*   **Seamless DOCX Ingestion**: Upload a Microsoft Word (`.docx`) file. The app locally parses the document, extracting the text, layout, and embedded figures/tables while compressing images to optimize processing.
*   **Scientific Rewriting**: Powered by Google's Gemini 3.1 Pro, it automatically rewrites the raw draft into a highly professional, academic tone, structuring it into standard sections (Abstract, Methods, Results, etc.).
*   **Custom Journal Styles**: Select specific target formats (like Nature, Science, IEEE, Standard Academic, or APA) to tailor the writing style.
*   **Genuine Citations**: Using real-time Google Search tool integration, the AI finds genuine, real-world journal papers to support the draft's claims, automatically inserting in-text citations and a complete References section.
*   **LaTeX Math Formatting**: Automatically detects and perfectly formats mathematical formulas and equations using KaTeX.
*   **Markdown Export**: Preview the rendered markdown side-by-side with the raw code, and export the final polished paper as a `.md` file with a single click.

## 🛠️ Tech Stack

*   **Frontend**: React 19, Vite, TypeScript
*   **Styling**: Tailwind CSS, shadcn/ui
*   **AI Integration**: `@google/genai` (Gemini 3.1 Pro with Search Grounding)
*   **Document Parsing**: `mammoth` (for parsing `.docx` files locally)
*   **Markdown & Math**: `react-markdown`, `remark-math`, `rehype-katex`

## ⚙️ Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   A Gemini API Key (get one from [Google AI Studio](https://aistudio.google.com/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sciwrite-pro.git
   cd sciwrite-pro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   * Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   * Open `.env` and add your Gemini API key:
     ```env
     GEMINI_API_KEY="your_api_key_here"
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to the local URL provided in the terminal (usually `http://localhost:3000`).

## ⚠️ Important Note on API Usage

This application leverages the **Gemini 3.1 Pro** model and uses the **Google Search tool** to fetch real-world citations. Ensure your API key has access to these features and monitor your usage limits in Google AI Studio.

## 📝 License

This project is licensed under the MIT License.
