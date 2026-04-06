# ComicLife

**ComicLife** is a sophisticated web application that transforms personal diary entries into visually stunning AI-generated comic strips. Built with a focus on high-end aesthetics and seamless user experience, it blends rich text storytelling with generative art.

---

## 🚀 Tech Stack

### Frontend & Core
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI Library:** [React 18](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)

### Content & Interactive Tools
- **Rich Text Editor:** [TipTap](https://tiptap.dev/) (Headless framework for building text editors)
- **Drag & Drop:** [@dnd-kit](https://dnd-kit.com/) (For rearranging comic panels)
- **Image Processing:** [Sharp](https://sharp.pixelplumbing.com/)

### Backend & Services
- **Database / Auth:** [Supabase](https://supabase.com/)
- **AI Generation:** 
  - [OpenAI](https://openai.com/) (Story parsing and prompt engineering)
  - [Replicate](https://replicate.com/) (Stable Diffusion / Image generation)
- **Music Integration:** Spotify API (For attaching tracks to memories)

---

## 🎨 Design & Styling

ComicLife features a unique "Editorial/Neo-Noir" aesthetic characterized by high-contrast typography and a warm, paper-like color palette.

### Color Palette
- **Cream (`#E8E4D8`):** Main background, providing a paper-like feel.
- **Ink (`#0E0E0E`):** Primary text and border color.
- **Off-white (`#F5F2E8`):** Card backgrounds and secondary surfaces.
- **Yellow (`#D4E84A`):** Brand accent for highlights and calls to action.
- **Muted (`#6B6860`):** Secondary text and labels.

### Typography
- **Barlow Condensed:** Used for bold, impactful headings.
- **DM Sans:** Primary body font for readability.
- **Space Mono:** Used for technical labels, word counts, and metadata.

### UI Characteristics
- **Borders:** Clean 1px ink borders for a structured, comic-grid look.
- **Shadows:** Subtle, tight shadows to emphasize card elevation.
- **Custom Elements:** "SpinBadge" interactive elements and "Paper-texture" backgrounds in the editor.

---

## 🗺️ Page Architecture

| Page | Route | Description |
| :--- | :--- | :--- |
| **Landing** | `/` | Features the Hero section, Style Gallery, and "How it Works" breakdown. |
| **Dashboard** | `/dashboard` | User's personal library of generated comics and past memories. |
| **Editor** | `/diary/new` | The core workspace where users write diaries and trigger AI comic generation. |
| **Reader** | `/read/[id]` | An immersive view for reading and sharing individual comic stories. |
| **Avatar** | `/avatar` | Profile customization and personalized AI character setup. |

---

## ✨ Key Features

- **Diary to Comic:** Intelligent parsing of text to extract key moments and convert them into visual panel prompts.
- **AI Style Picker:** Choose from various artistic styles (Painterly, Sketch, Noir, etc.) to influence the generated art.
- **Immersive Editor:** A TipTap-powered editor with a custom "lined paper" UI and real-time word counting.
- **Music Sync:** Integration with Spotify to attach specific tracks that capture the mood of the entry.
- **Interactive Grids:** Rearrange generated panels using a smooth drag-and-drop interface.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ 
- npm / yarn / pnpm

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `REPLICATE_API_TOKEN`
4. Run the development server:
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

- `/app`: Next.js 14 App Router pages and layouts.
- `/components`: Reusable UI elements, categorized by feature (diary, comic, landing, layout).
- `/lib`: Utility functions and service configurations.
- `/store`: Zustand state definitions (Comic generation state, Session data).
- `/public`: Static assets, images, and textures.
- `/types`: TypeScript interface and type definitions.
