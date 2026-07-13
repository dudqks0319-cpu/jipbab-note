import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const roots = ["app", "components"];
const failures = [];
let interactiveTagCount = 0;

function collectTsxFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const filePath = path.join(directory, entry);
    return statSync(filePath).isDirectory()
      ? collectTsxFiles(filePath)
      : filePath.endsWith(".tsx")
        ? [filePath]
        : [];
  });
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

const tsxFiles = roots.flatMap(collectTsxFiles);

for (const filePath of tsxFiles) {
  const source = readFileSync(filePath, "utf8");
  const scanSource = source.replaceAll("=>", "⇒");
  const interactiveTags = scanSource.matchAll(/<(button|a|Link)\b[\s\S]*?>/g);

  for (const match of interactiveTags) {
    interactiveTagCount += 1;
    const openingTag = match[0];
    if (/\b(?:h|min-h)-(?:8|9|10)\b/.test(openingTag)) {
      failures.push(
        `${filePath}:${lineNumber(scanSource, match.index)} has an explicit touch target below 44px`,
      );
    }
    if (/\brounded-full\s+p-2\b|\bclassName="p-2\b/.test(openingTag)) {
      failures.push(
        `${filePath}:${lineNumber(scanSource, match.index)} uses icon padding without a 44px target`,
      );
    }
  }
}

const layout = readFileSync("app/layout.tsx", "utf8");
const shell = readFileSync("components/layout/AppShell.tsx", "utf8");
const styles = readFileSync("app/globals.css", "utf8");
const button = readFileSync("components/ui/Button.tsx", "utf8");
const fridgeIllustration = readFileSync("components/fridge/FridgeIllustration.tsx", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const starterAction = readFileSync("components/home/StarterActionCard.tsx", "utf8");
const confirmDialog = readFileSync("components/ui/ConfirmDialog.tsx", "utf8");

const contracts = [
  [
    "viewport zoom",
    !layout.includes("userScalable: false") && !layout.includes("maximumScale: 1"),
    "viewport must allow user zoom",
  ],
  [
    "skip link",
    shell.includes('href="#main-content"') && shell.includes("본문으로 건너뛰기"),
    "keyboard users need a visible-on-focus skip link",
  ],
  [
    "main landmark",
    shell.includes('id="main-content"') && shell.includes("tabIndex={-1}"),
    "the skip target must be a focusable main landmark",
  ],
  [
    "button target floor",
    /button\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;/.test(styles),
    "all native buttons need a 44px minimum target",
  ],
  [
    "form target floor",
    /input:not\(\[type='checkbox'\]\):not\(\[type='radio'\]\):not\(\[type='file'\]\):not\(\[type='hidden'\]\),[\s\S]*?min-height:\s*44px;/.test(
      styles,
    ),
    "mobile text controls need a 44px minimum target",
  ],
  [
    "reduced motion",
    styles.includes("@media (prefers-reduced-motion: reduce)") &&
      styles.includes("animation-duration: 0.01ms !important"),
    "motion-sensitive users need animation and transition suppression",
  ],
  [
    "shared small button",
    button.includes('sm: "h-11 px-3 text-sm"'),
    "the reusable small button must still be 44px high",
  ],
  [
    "above-fold image priority",
    fridgeIllustration.includes('loading="eager"') &&
      fridgeIllustration.includes('fetchPriority="high"') &&
      home.includes('src={HOME_FRIDGE_IMAGE}') &&
      home.includes('loading="eager"') &&
      starterAction.includes('src={FRIDGE_IMAGE_SRC}') &&
      starterAction.includes('loading="eager"'),
    "every above-fold fridge LCP image needs eager high-priority loading",
  ],
  [
    "accessible confirmation dialog",
    confirmDialog.includes('role="dialog"') &&
      confirmDialog.includes('aria-modal="true"') &&
      confirmDialog.includes("event.key === 'Escape'") &&
      confirmDialog.includes("event.key !== 'Tab'") &&
      confirmDialog.includes("cancelButtonRef.current?.focus()"),
    "app confirmations need dialog semantics, escape handling, focus trapping, and initial focus",
  ],
  [
    "no browser confirm",
    tsxFiles.every((filePath) => !readFileSync(filePath, "utf8").includes("window.confirm")),
    "user confirmations must use the accessible app dialog instead of the browser prompt",
  ],
];

for (const [label, condition, detail] of contracts) {
  if (!condition) failures.push(`${label}: ${detail}`);
}

console.log("Phase 6 mobile accessibility check");
console.log(`Interactive tags scanned: ${interactiveTagCount}`);
console.log(`Contracts checked: ${contracts.length}`);
console.log(`Failures: ${failures.length}`);

if (failures.length > 0) {
  console.log("\nFAIL");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("\nPASS");
console.log("- touch target, zoom, skip-link, landmark, and reduced-motion contracts passed");
