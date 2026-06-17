const esbuild = require("esbuild");
const { gzipSync } = require("zlib");
const { readFileSync, statSync } = require("fs");

// Each budget is ~15-20% above the sizes measured at commit 67d9297.
const BUDGETS = {
  "dist/index.esm.js": 1400,
  "dist/index.js":     1600,
  "dist/core.esm.js":   500,
  "dist/core.js":       800,
};

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
    const budget = BUDGETS[file];
    const ok = gz <= budget;
    const marker = ok ? "OK " : "OVER";
    console.log(`  ${marker}  ${file.padEnd(22)} raw ${raw.length} B   gzip ${gz} B   budget ${budget} B`);
    return { file, gz, budget, ok };
  };
  console.log("built:");
  const results = targets.flatMap((t) => [report(`${t.out}.esm.js`), report(`${t.out}.js`)]);

  const over = results.filter((r) => !r.ok);
  if (over.length) {
    console.error(`\nBUDGET FAIL: ${over.length} bundle(s) over budget:`);
    over.forEach((r) => console.error(`  ${r.file}: ${r.gz} B > ${r.budget} B (+${r.gz - r.budget} B)`));
    console.error(
      "\nTo proceed: either reduce bundle size, or consciously bump the budget in build.js with a one-line rationale comment in the same diff."
    );
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
