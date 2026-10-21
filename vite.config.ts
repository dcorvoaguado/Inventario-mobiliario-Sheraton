import { defineConfig } from "vite";

// The same build must work at the GitHub Pages repository path and at a
// domain root, without depending on mutable Pages custom-domain settings.
export default defineConfig({ base: "./" });
