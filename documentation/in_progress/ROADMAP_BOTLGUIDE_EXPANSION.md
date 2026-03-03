# Roadmap: BotlGuide Expansion (AI Unification)
> **Vision:** "More than a Chatbot." BotlGuide is the unified brand for all AI-driven intelligence in BotlLab. Whether it's designing a label, fixing a recipe, or coaching a brew day — it's always BotlGuide.

---

## 1. Core Identity & Branding

### The Concept
BotlGuide is not a single feature, but a **suite of intelligence tools**. It replaces generic terms like "AI Generator" or "Smart Analysis" with a cohesive persona.

- **Name:** BotlGuide
- **Iconography:** Sparkles (`✨`) or a stylized bot/brain icon. Consistent use of a gradient (e.g., Purple/Blue) to denote AI actions vs. normal actions.
- **Tone of Voice:** Professional, encouraging, precise (German "Du"). "Der erfahrene Braumeister-Kollege, der dir über die Schulter schaut."

### The UX Pattern ("The Guide Interface")
To ensure consistency, we avoid scattered AI buttons. All BotlGuide interactions follow one of two patterns:
1.  **The Side-Coach (Contextual):** A side-sheet that offers help/analysis for the current screen (as defined in Session 3.0).
2.  **The Creator (Generative):** A distinct mode for creating content (Labels, Recipes), usually via a focused modal or dedicated view.

---

## 2. Feature Consolidation Matrix

We will migrate all existing and planned AI features under the BotlGuide umbrella.

| Feature Area | Current Status | New "BotlGuide" Identity | implementation |
|---|---|---|---|
| **Sessions** | Planned (Sessions 3.0) | **BotlGuide Coach:** "Dein Brau-Assistent." Monitors fermentation, explains steps, predicts FG. | See `ROADMAP_SESSIONS_3.0.md` |
| **Labels** | Existing (`/image-generation`) | **BotlGuide Artist:** "Der Etiketten-Designer." Generate prompts & images from beer attributes. | Rename UI, unify prompt generation logic. |
| **Recipes** | Existing (`/recipes/new`) | **BotlGuide Architect:** "Der Rezept-Entwickler." Suggests hops, scales recipes, checks style Guidelines (BJCP). | Refactor `RecipeAI` components. |
| **Marketing** | Existing (`generate-text`) | **BotlGuide Copywriter:** "Der Marketing-Profi." Writes names and descriptions. | Integrate into `BotlGuide` service. |
| **Inventory** | Future Idea | **BotlGuide Auditor:** "Der Lagerist." OCR for invoices, expiry predictions. | *Future expansion* |

---

## 3. Technical Architecture (The Unification)

Instead of disparate API routes, we build a unified `BotlGuideService` on the frontend and a consolidated backend handler.

### A. Backend: Unified Endpoint (`/api/botlguide`)
Merges `generate-text`, `generate-image` (prompting logic), and future analysis endpoints.

```typescript
// Proposed Request Structure
POST /api/botlguide
{
  capability: "coach" | "artist" | "architect" | "copywriter",
  context: {
    sessionId?: string,
    recipeId?: string,
    userPrompt?: string
  },
  action: "analyze_fermentation" | "generate_label_prompt" | "suggest_hops"
}
```

### B. Frontend: `useBotlGuide()` Hook
A single hook to access all capabilities, handling:
- **Premium Checks:** Centralized `canUseAI` verify.
- **Quota Management:** Unified tracking of "Credits" or "Usage".
- **Design:** Provides standard UI components (`BotlGuideTrigger`, `BotlGuideResponse`, `BotlGuideError`).

---

## 4. Implementation Stages

### Stage 1: The Foundation (Sessions 3.0)
*   Establish the `BotlGuide` side-sheet pattern in the Session View.
*   Implement the "Static-First" architecture.
*   **Deliverable:** The "Coach" capability is live.

### Stage 2: Brand Unification (UI/UX Sweep)
*   **Labels:** Rename the "AI Image Generator" to "BotlGuide Artist". changing the interface to feel like a creative brief conversation.
*   **Recipes:** Update the recipe creation flow. Instead of "Auto-Generate Recipe", use "Ask BotlGuide for a Draft".
*   **Marketing:** Group Name/Description generators under "BotlGuide Marketing Tools".

### Stage 3: The "Context Engine" (Deep Integration)
*   Train/Prompt the AI to know the user's *entire* inventory when suggesting recipes ("You have Citra left over, use that instead of Amarillo").
*   Allow BotlGuide Artist to read the recipe Style and Color (SRM) directly to suggest label colors automatically.

### Stage 4: Enterprise Features (SOPs & Team)
*   Allow Team Owners to upload custom PDFs (Manuals) to the BotlGuide knowledge base.
*   BotlGuide answers questions based on *internal* brewery docs ("Wie reinigen wir Tank 3?").

---

## 5. Monetization Strategy (Tier Alignment)

| Feature | Free | Brewer (Subscription) |
|---|---|---|
| **Coach** | Static content only | Full AI Analysis |
| **Artist** | 1 Demo / Month | Unlimited Prompts + X High-Res Images |
| **Architect** | Standard Templates | Custom AI Recipe Formulation |
| **Copywriter** | Blocked | Unlimited Name/Description Gen |

---
