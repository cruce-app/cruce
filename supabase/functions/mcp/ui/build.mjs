// Empaqueta las tres pantallas del MCP de Cruce, cada una en un solo HTML (JS y CSS adentro, sin nada de otros
// dominios), y escribe ../ui_bundle.ts con los tres como texto. La función lo importa: así no lee archivos al
// desplegarse. ui_bundle.ts se versiona y la CI revisa que, al volver a correr este build, no cambie.
import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const PAGINAS = ["cruces.html", "movimientos.html", "anotar.html"];
const raiz = fileURLToPath(new URL(".", import.meta.url));
const salida = fileURLToPath(new URL("./dist/", import.meta.url));
const destino = fileURLToPath(new URL("../ui_bundle.ts", import.meta.url));

await rm(salida, { recursive: true, force: true });

// Una pasada por página: vite-plugin-singlefile mete todo en el HTML de una sola entrada.
for (const pagina of PAGINAS) {
  await build({
    root: raiz,
    configFile: false,
    logLevel: "warn",
    plugins: [viteSingleFile({ removeViteModuleLoader: true })],
    build: {
      outDir: salida,
      emptyOutDir: false,
      rollupOptions: { input: fileURLToPath(new URL(pagina, import.meta.url)) },
    },
  });
}

const paginas = await Promise.all(
  PAGINAS.map(async (pagina) => [pagina, await readFile(new URL(pagina, `file://${salida}`), "utf8")]),
);
const cuerpo = paginas.map(([pagina, html]) => `  ${JSON.stringify(pagina)}: ${JSON.stringify(html)},`).join("\n");
const archivo = `// Generado por supabase/functions/mcp/ui (npm run build). No lo edites a mano.
// Las pantallas de MCP Apps empaquetadas, una por archivo HTML. Las herramientas declaran su pantalla solo si está aquí.
export const PANTALLAS: Record<string, string> = {
${cuerpo}
};
`;
await writeFile(destino, archivo);
for (const [pagina, html] of paginas) {
  console.log(`${pagina}: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
}
