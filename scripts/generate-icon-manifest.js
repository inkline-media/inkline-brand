const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Fetch FontAwesome's official icon metadata from their public GitHub repo.
 * This contains search terms, aliases, labels, and categories for every icon —
 * the same data that powers fontawesome.com search. No API key needed.
 */
function fetchFAMetadata() {
  const url = 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/metadata/icons.json';
  return new Promise((resolve, reject) => {
    console.log('Fetching FontAwesome metadata from GitHub...');
    https.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`  Loaded metadata for ${Object.keys(parsed).length} icons`);
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const collections = [
  { name: 'solid',   dir: 'icons/fontawesome-classic-solid',   prefix: 'fas' },
  { name: 'regular', dir: 'icons/fontawesome-classic-regular', prefix: 'far' },
  { name: 'light',   dir: 'icons/fontawesome-classic-light',   prefix: 'fal' },
  { name: 'thin',    dir: 'icons/fontawesome-classic-thin',    prefix: 'fat' },
  { name: 'brands',  dir: 'icons/fontawesome-classic-brands',  prefix: 'fab' }
];

async function main() {
  // Fetch official FA metadata (search terms + aliases)
  let faMeta = {};
  try {
    faMeta = await fetchFAMetadata();
  } catch (err) {
    console.warn('  Warning: Could not fetch FA metadata, falling back to filename-only tags');
    console.warn(' ', err.message);
  }

  const manifest = [];

  for (const col of collections) {
    const dir = path.join(__dirname, '..', col.dir);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));
    for (const file of files) {
      const name = file.replace('.svg', '');

      // Start with filename-derived terms
      const fileTerms = name.split('-').filter(t => t.length > 0);

      // Merge in official FA metadata if available
      const meta = faMeta[name];
      const searchTerms = meta?.search?.terms || [];
      const label = meta?.label ? meta.label.toLowerCase().split(/\s+/) : [];
      const aliasNames = meta?.aliases?.names || [];

      // Combine all tags, deduplicated
      const allTags = [...new Set([
        ...fileTerms,
        ...searchTerms.map(t => t.toLowerCase()),
        ...label,
        ...aliasNames
      ])];

      manifest.push({
        n: name,
        c: col.name,
        f: `${col.dir}/${file}`,
        t: allTags
      });
    }
    console.log(`Processed ${files.length} icons from ${col.name}`);
  }

  const outPath = path.join(__dirname, '..', 'assets', 'js', 'icon-manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest));
  const stats = fs.statSync(outPath);
  console.log(`\nTotal: ${manifest.length} icons indexed (${(stats.size / 1024).toFixed(0)}KB)`);

  // Show some examples of enriched tags
  const examples = ['house', 'magnifying-glass', 'cart-shopping', 'envelope'];
  console.log('\nSample enriched tags:');
  for (const ex of examples) {
    const entry = manifest.find(m => m.n === ex && m.c === 'solid');
    if (entry) {
      console.log(`  ${ex}: [${entry.t.join(', ')}]`);
    }
  }
}

main();
