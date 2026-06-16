const esbuild = require("esbuild");
const { gzipSync } = require("zlib");
const { readFileSync, statSync } = require("fs");

const shared = {
  bundle: true,
  external: ["react"],
  minify: true,
  jsx: "automatic",
  loader: { ".js": "jsx", ".jsx": "jsx" },
};

const targets = [
  { entry: "src/index.jsx", out: "dist/index" },
  { entry: "src/core.jsx",  out: "dist/core"  },
];

async function run() {
  await Promise.all(
    targets.flatMap((t) => [
      esbuild.build({ ...shared, entryPoints: [t.entry], format: "esm", outfile: `${t.out}.esm.js` }),
      esbuild.build({ ...shared, entryPoints: [t.entry], format: "cjs", outfile: `${t.out}.js` }),
    ])
  );

  const report = (file) => {
    const raw = readFileSync(file);
    const gz = gzipSync(raw).length;
    console.log(`  ${file.padEnd(28)} raw ${raw.length} B   gzip ${gz} B`);
  };
  console.log("built:");
  targets.forEach((t) => {
    report(`${t.out}.esm.js`);
    report(`${t.out}.js`);
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
