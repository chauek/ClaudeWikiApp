# Design System Specification: Editorial Productivity

## 1. Overview & Creative North Star

### The Creative North Star: "The Digital Obsidian"
This design system is predicated on the philosophy of **Subtractive Elegance**. In the realm of Personal Knowledge Management (PKM) and high-velocity task management, the interface must never compete with the user's thoughts. Instead of a "tool" that sits on top of the screen, the system acts as a deep, expansive void where information is illuminated by intent.

We break away from "standard" SaaS UI by embracing **Atmospheric Depth**. By moving away from rigid borders and high-contrast separators, we create an environment that feels like an editorial workspace—think high-end architecture journals or premium dark-mode IDEs. The layout utilizes intentional asymmetry and tonal layering to guide the eye without the "prison bars" of traditional grid lines.

---

## 2. Colors: Tonal Atmosphere

The palette is rooted in deep, obsidian blacks and charcoal grays. This is not a flat UI; it is a layered experience where color denotes functional hierarchy.

### Core Palette (Material Convention)
*   **Background / Surface Dim:** `#0e0e0e` — The foundational void.
*   **Surface Container Low:** `#131313` — For secondary sidebars or grouping.
*   **Surface Container High:** `#1f2020` — For interactive cards and primary list items.
*   **Primary Accent:** `#c3c0ff` (on_primary: `#2b15c6`) — Used for focus and momentum.
*   **Secondary Accent:** `#f59e0a` — Used for high-priority status and categorization.
*   **Tertiary Accent:** `#9bffce` — Used for "Completed" states or creative nodes.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are strictly prohibited for sectioning. Structural definition must be achieved through **background color shifts**. 
*   *Correct:* A `surface-container-high` card resting on a `surface` background.
*   *Incorrect:* A black card with a `#333` border.

### The "Glass & Gradient" Rule
To add a signature "editorial" soul, floating elements (Modals, Command Palettes, Popovers) should utilize **Glassmorphism**:
*   **Fill:** `surface_variant` at 60% opacity.
*   **Backdrop Blur:** 20px - 40px.
*   **Signature Gradient:** For main CTAs, use a linear gradient from `primary` to `primary_container` at a 135-degree angle to provide a subtle, non-flat metallic sheen.

---

### 3. Typography: Editorial Authority

We use a dual-font strategy to balance high-end aesthetic with extreme readability.

*   **Display & Headlines (Manrope):** A modern, geometric sans-serif with a wide stance. Used to establish authority in titles. 
    *   *Scale:* `headline-lg` (2rem) for page headers; `display-sm` (2.25rem) for empty state focus points.
*   **Body & UI (Inter):** The workhorse for productivity. Its high x-height ensures legibility in dense task lists.
    *   *Scale:* `body-md` (0.875rem) is the standard for list items and notes.

**Typographic Hierarchy Note:** Use `on_surface_variant` (`#acabab`) for secondary metadata (like "16 items" or timestamps) to create a visual recession, ensuring the primary content remains the focal point.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "heavy" for a productivity tool. We use **Tonal Layering** to create a sense of height.

*   **The Layering Principle:** 
    *   Level 0: `background` (#0e0e0e)
    *   Level 1: `surface-container-low` (#131313) - The Workspace.
    *   Level 2: `surface-container-high` (#1f2020) - The Active Task/Card.
*   **Ambient Shadows:** For floating elements only (e.g., a dragged task), use a shadow with a 32px blur, 0% spread, and the color `on_surface` at 6% opacity. This mimics natural light rather than digital "glow."
*   **The "Ghost Border":** In high-density areas where color shifts aren't enough, use the `outline_variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Precision Primitives

### Expandable Folders & Lists
*   **Visual Style:** Forbid divider lines. Separate list items using `0.5rem` of vertical white space or a hover state that shifts the background to `surface_container_highest`.
*   **Indentation:** Folders use a `1.5rem` left-padding for nested items. The "chevron" must be the `on_surface_variant` color, rotating 90 degrees on toggle.

### Cards (Task/Project Preview)
*   **Radius:** `lg` (0.5rem).
*   **Nesting:** Place `secondary_container` chips inside cards for status.
*   **Interaction:** On hover, the card should scale to 101% and shift from `surface-container-high` to `surface_bright`.

### Input Fields
*   **State:** The "Active" state is marked by a 1px `primary` bottom-border only, or a `surface_tint` focus ring with a 2px offset.
*   **Placeholder:** Use `on_surface_variant` at 50% opacity.

### Buttons
*   **Primary:** `primary` background with `on_primary` text. No border.
*   **Secondary:** `surface_container_highest` background.
*   **Ghost:** Transparent background, `primary` text. Use for low-emphasis actions in sidebars.

---

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a structural tool. A `2rem` gap is a better separator than a line.
*   **DO** use the `secondary` (orange) and `tertiary` (green) tokens sparingly for status "pills" to draw the eye to blockers or completions.
*   **DO** use `surface-container-lowest` (#000000) for the sidebar to create a "locked" anchor for the layout.

### Don't
*   **DON'T** use pure white (#FFFFFF) for text. Always use `on_surface` (#e7e5e5) to reduce eye strain in dark mode.
*   **DON'T** stack more than three levels of surface containers. It breaks the "Physicality" of the UI.
*   **DON'T** use high-contrast borders. If the user feels like they are looking at a "table," the editorial feel is lost.