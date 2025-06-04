
# Drop Flow: Image Organization and Referencing Tool

## 1. Overview

Drop Flow is a web application designed to streamline the process of uploading, organizing, and associating images with specific references or keywords. It provides an intuitive interface for managing collections of images, allowing users to easily link them to predefined or dynamically created reference terms. This is particularly useful for projects requiring visual asset management, content tagging, or any workflow where images need to be categorized and tracked against a set of identifiers.

## 2. Key Features

Drop Flow offers a range of functionalities to enhance your image management workflow:

*   **Effortless Image Upload:**
    *   **Drag & Drop:** Simply drag image files from your computer directly onto the application window to upload them. A dynamic overlay provides a clear drop zone.
    *   **File Uploader Button:** A traditional "Upload Files" button is also available for selecting images through your system's file dialog.
*   **Flexible Reference Management:**
    *   **Manual Addition:** Quickly add new references (keywords, tags, project IDs, etc.) one by one or in bulk by typing them into a text area, separated by commas or spaces.
    *   **Load from Sessions:** Simulate loading predefined sets of references from "sessions" (mocked in the current version). This allows for quick setup with commonly used reference lists.
*   **Intuitive Image-Reference Association:**
    *   Select one or more images from the gallery.
    *   Click on a reference from the list to instantly associate all selected images with that reference.
    *   Easily unassociate an image from its reference directly from the image card.
*   **Dynamic Image Gallery:**
    *   **Grid View:** Uploaded images are displayed in a responsive grid layout.
    *   **Sorting:** Sort images by their last modified date (either newest or oldest first).
    *   **Filtering:**
        *   View all images.
        *   View only images that have been associated with a reference.
        *   View only images that are currently unassociated.
        *   Filter images by a specific reference by clicking on that reference in the list.
*   **Image Reordering:**
    *   When viewing images filtered by a specific reference, you can drag and drop the images to define a custom order for that particular set. This order is preserved for that reference.
*   **Advanced Selection:**
    *   **Single Click:** Select or deselect individual images.
    *   **Shift-Click Multi-Select:** Select a range of images by clicking the first image, then holding 'Shift' and clicking the last image in the desired range.
*   **Session Actions:**
    *   **Share:** Open a modal to "share" the current session. This includes options to:
        *   **Copy Link:** (Placeholder) Copies the current URL to the clipboard.
        *   **Send to Retouch Team:** (Placeholder) Simulates sending session details, optionally including an assignee and a specific retouch step.
    *   **Publish:** (Placeholder) A button to simulate a publishing action, enabled only when at least one image is associated with a reference.
*   **User-Friendly Interface:**
    *   **Collapsible Panels:** The references panel can be hidden or shown to maximize screen real estate for the image gallery. The reference input area is also collapsible.
    *   **Clear Visual Feedback:** Selected images are highlighted, associated references are displayed on image cards, and drag-and-drop actions provide visual cues.
    *   **Notifications:** Brief, non-intrusive notifications for actions like copying a link or sending to retouch.
    *   **Responsive Design:** The application adapts to different screen sizes for a consistent experience.

## 3. Technical Decisions & Project Structure

Drop Flow is built with modern web technologies, focusing on a clean, maintainable, and component-based architecture.

*   **Core Technologies:**
    *   **React:** A JavaScript library for building user interfaces. The application leverages React's component model, hooks, and declarative programming style.
    *   **TypeScript:** Superset of JavaScript that adds static typing, improving code quality, maintainability, and developer experience by catching errors early.
    *   **Tailwind CSS:** A utility-first CSS framework used for rapid UI development. It allows for styling directly within the HTML/JSX, promoting consistency and reducing the need for custom CSS.
*   **State Management:**
    *   **React Hooks:** Primary mechanism for state management (`useState`, `useCallback`, `useMemo`, `useEffect`). This keeps state local to components where possible, promoting encapsulation.
    *   Global-like state (e.g., `images`, `references`, `selectedImageIds`) is managed in the main `App.tsx` component and passed down to child components via props.
*   **Component Structure:**
    *   The application is broken down into reusable components located in the `components/` directory (e.g., `ImageGridItem.tsx`, `ReferenceItem.tsx`, `ShareModal.tsx`).
    *   `App.tsx` serves as the main orchestrator, holding primary state and logic.
*   **Data Handling (Client-Side):**
    *   All image data (including previews) and reference data are currently stored and managed entirely on the client-side within the React application's state.
    *   **Image Previews:** `FileReader` API is used to generate `dataUrl`s for image previews immediately after selection, without needing a server roundtrip.
    *   **No Backend/Database:** The current version operates without a backend. All data is ephemeral and will be lost on page refresh unless persisted (e.g., to `localStorage`, which is not yet implemented).
*   **File Structure:**
    *   `index.html`: The main entry point of the application.
    *   `index.tsx`: Mounts the React application to the DOM.
    *   `App.tsx`: The root React component containing most of the application logic and state.
    *   `components/`: Directory for reusable UI components.
    *   `types.ts`: Contains TypeScript interface definitions for shared data structures (e.g., `ImageFile`, `Reference`).
    *   `constants.tsx`: Defines SVG icons as React components and potentially other application-wide constants.
    *   `metadata.json`: Contains metadata for the application.
*   **Drag and Drop Implementation:**
    *   **Global File Drop:** Event listeners are attached to the `document.documentElement` to capture drag events for file uploads from anywhere on the page.
    *   **Image Reordering Drag & Drop:** HTML5 drag and drop API is used within `ImageGridItem.tsx` specifically for reordering images when filtered by a reference.
*   **Styling and UI:**
    *   **Tailwind CSS:** Provides a comprehensive set of utility classes for styling.
    *   **SVG Icons:** Icons are embedded directly as React components in `constants.tsx` for easy customization and optimized delivery.
*   **Build & Dependencies:**
    *   The `index.html` uses `esm.sh` as a CDN to import React and ReactDOM directly. This simplifies the development setup for quick prototyping by avoiding a complex build step (like Webpack or Parcel) for this current stage.
    *   There's no explicit `package.json` or build script defined in the provided files, indicating a lightweight setup.
*   **Accessibility (ARIA):**
    *   Efforts have been made to include ARIA (Accessible Rich Internet Applications) attributes on interactive elements (buttons, list items, modal dialogs) to improve accessibility for users relying on assistive technologies. Examples include `role`, `aria-label`, `aria-pressed`, `aria-modal`.

This structure aims for a balance between rapid development, maintainability, and a good user experience, given its current frontend-only nature.
