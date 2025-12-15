# Project: Shopping Guide Business Card Generator

## Overview
This project is a React-based web application designed to generate professional business cards for "Shopping Guides" (specifically for Ctrip/Trip.com as indicated by the text "携程官方推荐导购"). Users can input their personal information, upload an avatar and QR code, and preview the generated card in real-time.

## Tech Stack
- **Framework**: React + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Inline Styles (for card rendering)
- **UI Components**: Shadcn UI (Radix UI based)
- **State Management**: Jotai (using atoms and atomWithStorage for persistence)
- **Image Generation**: @resvg/resvg-wasm (likely used for exporting the card as an image)

## Project Structure
- `src/App.tsx`: Main entry point, sets up the layout with `Form` and `Playground`.
- `src/components/Form.tsx`: Handles user input for card details.
- `src/components/Playground.tsx`: Renders the visual representation of the business card.
- `src/store/index.ts`: Defines Jotai atoms for state management (name, avatar, highlight, achievements, etc.).
- `src/resvg.ts`: Initializes the WASM module for SVG rendering.

## Key Features
- **Real-time Preview**: Changes in the form are immediately reflected in the card preview.
- **Image Upload**: Support for uploading Avatar and QR Code images.
- **Data Persistence**: Uses `atomWithStorage` to save form data in local storage.
- **Customizable Fields**:
  - Name
  - Highlight Quote
  - Job Achievements
  - Travel Experience
  - Service Experience
