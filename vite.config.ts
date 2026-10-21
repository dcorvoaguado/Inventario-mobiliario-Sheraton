import { defineConfig } from "vite";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const photoModule = "virtual:inventory-photos";
const resolvedPhotoModule = `\0${photoModule}`;

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "bundle-inventory-photos",
      resolveId(id) {
        if (id === photoModule) return resolvedPhotoModule;
      },
      load(id) {
        if (id !== resolvedPhotoModule) return;
        const directory = resolve("public/images/excel");
        const photos = Object.fromEntries(
          readdirSync(directory)
            .filter((name) => /^sheraton_reduced_\d+\.jpg$/.test(name))
            .map((name) => {
              const file = resolve(directory, name);
              this.addWatchFile(file);
              return [
                name,
                `data:image/jpeg;base64,${readFileSync(file).toString("base64")}`,
              ];
            }),
        );
        if (Object.keys(photos).length !== 63)
          throw Error("The complete set of 63 inventory photos is required.");
        return `export default ${JSON.stringify(photos)};`;
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id === resolvedPhotoModule) return "inventory-photos";
        },
      },
    },
  },
});
