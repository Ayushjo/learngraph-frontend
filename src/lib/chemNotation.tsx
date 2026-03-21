// Renders chemistry notation properly
// Handles: subscripts, superscripts, arrows, delta, degree symbols

const REPLACEMENTS: [RegExp, string][] = [
  // Arrows
  [/→/g, "→"],
  [/->/g, "→"],
  [/⇌/g, "⇌"],
  [/<->/g, "⇌"],

  // Greek letters
  [/\bdelta\b/gi, "Δ"],
  [/\bDelta\b/g, "Δ"],
  [/\balpha\b/gi, "α"],
  [/\bbeta\b/gi, "β"],
  [/\bgamma\b/gi, "γ"],
  [/\btheta\b/gi, "θ"],
  [/\blambda\b/gi, "λ"],
  [/\bmu\b/gi, "μ"],

  // Degree symbol
  [/\bdeg\b/g, "°"],
  [/E0\b/g, "E°"],
  [/Ecell\b/g, "E°cell"],
];

// Convert plain text chemical formulas to HTML with sub/superscripts
// e.g. H2O → H<sub>2</sub>O
// e.g. Cu2+ → Cu<sup>2+</sup>
// e.g. Fe3+ → Fe<sup>3+</sup>

function applyNotation(text: string): string {
  let result = text;

  // Apply simple replacements
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  // Subscripts: element followed by number (not already subscripted)
  // Match patterns like H2O, CO2, H2SO4, NH3, CH4
  result = result.replace(
    /([A-Z][a-z]?)(\d+)(?=[A-Z\s\.,\)\-\+]|$)/g,
    (_, element, num) => `${element}<sub>${num}</sub>`,
  );

  // Superscripts: ion charges like 2+, 3+, 2-, +, -
  // Match patterns like Cu2+, Fe3+, OH-, SO42-
  result = result.replace(
    /([A-Za-z\)])(\d*[+\-])/g,
    (_, before, charge) => `${before}<sup>${charge}</sup>`,
  );

  return result;
}

interface ChemTextProps {
  text: string;
  style?: React.CSSProperties;
  className?: string;
}

export function ChemText({ text, style, className }: ChemTextProps) {
  const html = applyNotation(text);
  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function ChemPassage({
  text,
  style,
}: {
  text: string;
  style?: React.CSSProperties;
}) {
  // Split into paragraphs and render each
  const paragraphs = text.split("\n").filter((p) => p.trim());

  if (paragraphs.length <= 1) {
    return (
      <p
        style={style}
        dangerouslySetInnerHTML={{ __html: applyNotation(text) }}
      />
    );
  }

  return (
    <div style={style}>
      {paragraphs.map((para, i) => (
        <p
          key={i}
          style={{ marginBottom: i < paragraphs.length - 1 ? "1em" : 0 }}
          dangerouslySetInnerHTML={{ __html: applyNotation(para) }}
        />
      ))}
    </div>
  );
}
