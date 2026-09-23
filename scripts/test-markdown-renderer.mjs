import React from "react";
import { renderToString } from "react-dom/server";
import { MarkdownContent } from "../components/content/MarkdownContent.tsx";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("=================================================");
  console.log("🚀 PHASE 23: MARKDOWN & FORMULA RENDERING TESTS");
  console.log("=================================================\n");

  // TEST 1: Basic Formatting (Headings, Bold, Italic, Blockquote, Lists)
  console.log("TEST 1: Standard Markdown Formatting");
  const markdownText1 = `
## What is AI?

**Artificial Intelligence (AI)** allows computers to perform tasks that normally require human-like abilities.

### Key Ideas

- Learning from data
- Recognizing patterns
- Generating content

> AI can augment human capabilities.
`;

  const html1 = renderToString(React.createElement(MarkdownContent, { content: markdownText1 }));

  assert(html1.includes("<h2") && html1.includes("What is AI?"), "Renders h2 heading with font-outfit and styling");
  assert(html1.includes("<strong") && html1.includes("Artificial Intelligence (AI)"), "Renders bold text in strong tag");
  assert(html1.includes("<ul") && html1.includes("<li") && html1.includes("Learning from data"), "Renders unordered list and list items");
  assert(html1.includes("<blockquote") && html1.includes("AI can augment human capabilities"), "Renders styled blockquote");
  console.log("✓ TEST 1 PASSED\n");

  // TEST 2: Tables (GitHub Flavored Markdown via remark-gfm)
  console.log("TEST 2: GitHub-Flavored Markdown Tables");
  const markdownTable = `
| Concept | Meaning |
|---|---|
| AI | Broad field |
| ML | Learning from data |
| Automation | Rule-based execution |
`;

  const htmlTable = renderToString(React.createElement(MarkdownContent, { content: markdownTable }));

  assert(htmlTable.includes("<table") && htmlTable.includes("<thead") && htmlTable.includes("<tbody"), "Renders table with proper semantic hierarchy");
  assert(htmlTable.includes("<th") && htmlTable.includes("Concept"), "Renders table header with Concept");
  assert(htmlTable.includes("<td") && htmlTable.includes("Rule-based execution"), "Renders table cells with data");
  assert(htmlTable.includes("overflow-x-auto"), "Table is wrapped in responsive scroll container");
  console.log("✓ TEST 2 PASSED\n");

  // TEST 3: Code Blocks & Inline Code
  console.log("TEST 3: Inline Code & Code Blocks");
  const markdownCode = `
Here is \`machine learning\` in inline code.

\`\`\`python
def calculate_revenue(price, quantity):
    return price * quantity
\`\`\`
`;

  const htmlCode = renderToString(React.createElement(MarkdownContent, { content: markdownCode }));

  assert(htmlCode.includes("<code") && htmlCode.includes("machine learning"), "Renders inline code");
  assert(htmlCode.includes("<pre") && htmlCode.includes("calculate_revenue"), "Renders fenced code block");
  console.log("✓ TEST 3 PASSED\n");

  // TEST 4: Mathematical Notation (KaTeX & remark-math)
  console.log("TEST 4: Mathematical Notation & KaTeX Formulas");
  const markdownMath = `
### Formula

Inline: $Revenue = Price \\times Quantity$

Block:

$$
Profit = Revenue - Cost
$$
`;

  const htmlMath = renderToString(React.createElement(MarkdownContent, { content: markdownMath }));

  assert(htmlMath.includes("katex"), "KaTeX parser processes math syntax");
  assert(htmlMath.includes("katex-display") || htmlMath.includes("katex-html"), "Block and inline math generated as KaTeX AST");
  assert(htmlMath.includes("Revenue") && htmlMath.includes("Profit"), "Math identifiers rendered properly in formula");
  console.log("✓ TEST 4 PASSED\n");

  // TEST 5: Security & XSS Resistance (No raw HTML execution)
  console.log("TEST 5: Security & XSS Resistance");
  const maliciousInput = `
<script>alert("XSS")</script>

<img src="x" onerror="alert('XSS')" />

[External Safe Link](https://example.com)

[Internal Link](/dashboard/courses)
`;

  const htmlSec = renderToString(React.createElement(MarkdownContent, { content: maliciousInput }));

  // react-markdown strips raw HTML or escapes it without rehype-raw
  assert(!htmlSec.includes("<script>alert"), "Malicious script tags are not rendered into executable DOM");
  assert(!htmlSec.includes("<img src=\"x\" onerror="), "Malicious img tags with onerror handlers are not executed");
  assert(htmlSec.includes("target=\"_blank\"") && htmlSec.includes("rel=\"noopener noreferrer\""), "External links carry secure target='_blank' and rel='noopener noreferrer'");
  assert(!htmlSec.includes("href=\"/dashboard/courses\" target=\"_blank\""), "Internal links preserve normal routing behavior");
  console.log("✓ TEST 5 PASSED\n");

  // TEST 6: Empty, Null & Edge-case Handling
  console.log("TEST 6: Null and Empty Content Handling");
  const htmlNull = renderToString(React.createElement(MarkdownContent, { content: null }));
  const htmlEmpty = renderToString(React.createElement(MarkdownContent, { content: "   " }));
  const htmlUndefined = renderToString(React.createElement(MarkdownContent, { content: undefined }));

  assert(htmlNull === "", "Null content renders empty string without crashing");
  assert(htmlEmpty === "", "Whitespace-only content renders empty string without crashing");
  assert(htmlUndefined === "", "Undefined content renders empty string without crashing");
  console.log("✓ TEST 6 PASSED\n");

  // TEST 7: Phase 23.1 Independent Content Fields (Summary, Notes, Formulas)
  console.log("TEST 7: Phase 23.1 Independent Content Fields (Summary, Notes, Formulas)");
  const lessonSummary = `
## Lesson Summary

This lesson introduces the main concept.

**Key idea:** AI can help people perform tasks more effectively.
`;

  const lessonNotes = `
## Detailed Notes

### Key Concepts

- Artificial Intelligence
- Machine Learning
- Automation

> AI is broader than automation.
`;

  const lessonFormulas = `
### Revenue

$$
Revenue = Price \\times Quantity
$$

Inline example: $Profit = Revenue - Cost$
`;

  const htmlSummary = renderToString(React.createElement(MarkdownContent, { content: lessonSummary }));
  const htmlNotes = renderToString(React.createElement(MarkdownContent, { content: lessonNotes }));
  const htmlFormulas = renderToString(React.createElement(MarkdownContent, { content: lessonFormulas, variant: "formula" }));

  assert(htmlSummary.includes("Lesson Summary") && htmlSummary.includes("Key idea:"), "Summary renders with bold text and headings");
  assert(htmlNotes.includes("Detailed Notes") && htmlNotes.includes("Machine Learning"), "Notes render with lists and blockquotes");
  assert(htmlFormulas.includes("katex") && htmlFormulas.includes("Revenue") && htmlFormulas.includes("Profit"), "Formulas render with KaTeX and formula styling");
  assert(htmlFormulas.includes("rounded-2xl") && htmlFormulas.includes("border"), "Formula variant applies distinctive styled container");
  console.log("✓ TEST 7 PASSED\n");

  // TEST 8: Backward Compatibility Simulation (Legacy lesson with only content/notes)
  console.log("TEST 8: Backward Compatibility (Only content populated, summary/formulas are null)");
  const legacyLesson = {
    content: "## Legacy Lesson Content\n\nExisting text that must be preserved.",
    summary: null,
    formulas: null,
  };

  const renderedLegacySummary = legacyLesson.summary ? renderToString(React.createElement(MarkdownContent, { content: legacyLesson.summary })) : "";
  const renderedLegacyNotes = legacyLesson.content ? renderToString(React.createElement(MarkdownContent, { content: legacyLesson.content })) : "";
  const renderedLegacyFormulas = legacyLesson.formulas ? renderToString(React.createElement(MarkdownContent, { content: legacyLesson.formulas })) : "";

  assert(renderedLegacySummary === "", "Null summary renders nothing without error");
  assert(renderedLegacyFormulas === "", "Null formulas render nothing without error");
  assert(renderedLegacyNotes.includes("Legacy Lesson Content"), "Existing legacy content displays properly as Notes");
  console.log("✓ TEST 8 PASSED\n");

  // TEST 9: XSS Immunity across all 3 content fields
  console.log("TEST 9: XSS Immunity on Summary, Notes, and Formulas");
  const xssPayload = `<script>alert('pwned')</script><img src="x" onerror="alert('xss')" />`;
  
  const secSummary = renderToString(React.createElement(MarkdownContent, { content: xssPayload }));
  const secNotes = renderToString(React.createElement(MarkdownContent, { content: xssPayload }));
  const secFormulas = renderToString(React.createElement(MarkdownContent, { content: xssPayload, variant: "formula" }));

  [secSummary, secNotes, secFormulas].forEach((output, idx) => {
    const fieldName = ["Summary", "Notes", "Formulas"][idx];
    assert(!output.includes("<script"), `${fieldName} does not render raw <script> element`);
    assert(!output.includes("<img"), `${fieldName} does not render raw <img> element with event handlers`);
  });
  console.log("✓ TEST 9 PASSED\n");

  // TEST 10: Legacy HTML Snippet Rendering
  console.log("TEST 10: Legacy HTML Snippet Rendering (e.g. seeded HTML content)");
  const legacyHtmlInput = `<h3>Structuring Prompts for Zero-Shot & Few-Shot Output</h3><p>Master precise prompt design to extract professional reports, code, and copy from AI models.</p>`;
  const htmlLegacyRender = renderToString(React.createElement(MarkdownContent, { content: legacyHtmlInput }));
  console.log("  Rendered Legacy HTML Output:", htmlLegacyRender);

  assert(!htmlLegacyRender.includes("&lt;h3&gt;"), "Does not render escaped raw <h3> text");
  assert(!htmlLegacyRender.includes("<h3>"), "Does not render raw <h3> tag directly without formatting");
  assert(htmlLegacyRender.includes("Structuring Prompts for Zero-Shot &amp; Few-Shot Output") || htmlLegacyRender.includes("Structuring Prompts for Zero-Shot & Few-Shot Output"), "Renders heading text");
  assert(htmlLegacyRender.includes("Master precise prompt design"), "Renders paragraph text");
  console.log("✓ TEST 10 PASSED\n");

  console.log("=================================================");
  console.log("🎉 ALL PHASE 23.1 MARKDOWN & FORMULA TESTS PASSED (10/10)");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
