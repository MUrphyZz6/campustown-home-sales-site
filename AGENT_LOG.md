# Agent log

Add a dated entry each time you work with your AI coding agent, with the newest entry at the bottom. Each entry records what you asked the agent, what it produced, and what you checked or changed. Paste your key prompts in exactly as you typed them. Include at least one time the agent got something wrong, and how you caught it.

Copy this outline for each entry:

```markdown
## YYYY-MM-DD: What you worked on

- **Asked:** "Paste your prompt here."
- **Agent produced:** What it made or changed.
- **Checked or changed:** How you checked it, and what you fixed.
```

## 2026-11-17: Median sale price bar chart by city

- **Asked:** "Follow the Website Project Part 1 guide and do the GitHub part of it."
- **Agent produced:** A first real page in place of the placeholder. `index.html` now holds the layout, the styles and the footnotes; `site.js` fetches `data/college_town_home_sales.csv`, applies the $10,000 price rule, takes the median per city, and draws a horizontal bar chart above a table of the same 18 cities, ranked highest to lowest.
- **Where it went wrong, and how I caught it:** The guide's step 2 says to keep "the table and the $10,000 rule" as they are, so the agent started to add a chart above a table that did not exist yet - this repository was still on the template placeholder page (`<h1>This site is under construction</h1>`). I checked `index.html` before accepting anything and had it build the missing table and price rule in the same pull request instead of adding a chart over an empty page.
- **Checked or changed:** Ran the shipped `site.js` under Node against the full CSV and compared every figure with a separate pandas calculation: 35,442 rows, 40 sales under $10,000, 35,402 qualifying sales, 18 cities, and all 18 medians identical (Davis $889,000 down to Urbana $229,900). Then rendered the page in headless Chrome to confirm 18 bars and 18 table rows actually appear. One deliberate change from the guide's screenshots: the guide shows Pittsboro as `$876,985.5`, which its own text flags as a rounding bug; this page rounds to whole dollars, `$876,986`.
