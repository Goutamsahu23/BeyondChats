import Groq from 'groq-sdk';

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// parse llm output
function parseDelimitedOutput(text) {
  if (!text) {
    throw new Error('Empty LLM response');
  }

  const cleaned = text.trim();

  let title = '';
  let content = '';


  const titleBlockMatch = cleaned.match(
    /===TITLE===([\s\S]*?)===CONTENT===/i
  );


  const inlineTitleMatch = cleaned.match(
    /^===([\s\S]*?)===\s*===CONTENT===/i
  );

  if (titleBlockMatch) {
    title = titleBlockMatch[1].trim();
  } else if (inlineTitleMatch) {
    title = inlineTitleMatch[1].trim();
  }


  const contentMatch = cleaned.match(/===CONTENT===([\s\S]*)/i);
  if (contentMatch) {
    content = contentMatch[1]
      .replace(/===END===/gi, '')
      .trim();
  }

  if ((!title || !content) && /^===.+===/m.test(cleaned)) {
    const firstLineMatch = cleaned.match(/^===(.+?)===\s*$/m);
    if (firstLineMatch) {
      title = title || firstLineMatch[1].trim();

      const idx = cleaned.indexOf(firstLineMatch[0]) + firstLineMatch[0].length;
      const afterTitle = cleaned.slice(idx).replace(/===END===/gi, '').trim();

      if (!content && afterTitle) {
        content = afterTitle;
      }
    }
  }



  if (!title || !content) {
    const lines = cleaned.split(/\r?\n/);

    // Find first non-empty line
    const firstNonEmptyIndex = lines.findIndex(
      (l) => l.trim().length > 0
    );

    if (firstNonEmptyIndex !== -1) {
      const firstLine = lines[firstNonEmptyIndex].trim();


      if (
        !title &&
        (firstLine.length <= 120 ||
          firstLine.startsWith('#') ||
          /^[A-Z].+/.test(firstLine))
      ) {
        title = firstLine.replace(/^#+\s*/, '').trim();
      }

      if (!content) {
        const rest = lines.slice(firstNonEmptyIndex + 1).join('\n');
        content = rest.trim();
      }
    }
  }



  if (!title) {
    title = 'Untitled Article';
  }

  if (!content) {
    // As a last resort, use the whole cleaned text as content
    content = cleaned;
  }

  return { title, content };
}




export async function rewriteArticle({
  originalTitle,
  originalContent,
  referenceArticles
}) {
  if (!originalContent?.trim()) {
    throw new Error('Original article content is empty');
  }

  const referencesText = referenceArticles
    .map(
      (ref, i) =>
        `Reference ${i + 1} (${ref.url}):\n${ref.content.slice(0, 3000)}`
    )
    .join('\n\n');

  const prompt = `
You are an expert content editor and SEO writer.

TASK:
Rewrite the original article using the reference articles ONLY as inspiration
for structure, formatting, and depth.

RULES:
- Do NOT copy sentences
- Maintain originality
- Improve structure and clarity
- Use markdown formatting
- Add a References section

ORIGINAL ARTICLE:
Title: ${originalTitle}

Content:
${originalContent.slice(0, 4000)}

REFERENCE ARTICLES:
${referencesText}

OUTPUT FORMAT:

===TITLE===
Improved article title
===CONTENT===
Rewritten article content in markdown
===END===
`;

  const response = await client.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0
  });

  const raw = response?.choices?.[0]?.message?.content;

  if (!raw) {
    throw new Error('Empty LLM response');
  }

  try {
    return parseDelimitedOutput(raw);
  } catch (err) {
    console.error('\n RAW LLM RESPONSE (DEBUG):\n');
    console.error(raw);
    console.error('\n PARSE ERROR:', err.message);
    throw err;
  }
}
