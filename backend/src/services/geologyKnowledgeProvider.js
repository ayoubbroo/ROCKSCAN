// GeologyKnowledgeProvider: the single source of DATABASE REFERENCE properties.
// AI observations and user measurements are NEVER merged into this dataset —
// this file only ever returns the curated reference values with their cited source.

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'geology_reference.json');

class GeologyKnowledgeProvider {
  constructor() {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    this.materials = parsed.materials;
    this.meta = parsed._meta;
  }

  all() {
    return this.materials;
  }

  findByName(name) {
    if (!name) return null;
    const needle = name.trim().toLowerCase();
    return (
      this.materials.find(
        (m) =>
          m.scientific_name.toLowerCase() === needle ||
          (m.common_name || '').toLowerCase() === needle ||
          (m.synonyms || []).some((s) => s.toLowerCase() === needle)
      ) || null
    );
  }

  search({ query, category }) {
    let results = this.materials;
    if (category) {
      results = results.filter((m) => m.category.toLowerCase() === category.toLowerCase());
    }
    if (query) {
      const needle = query.trim().toLowerCase();
      results = results.filter((m) => {
        const haystack = [
          m.scientific_name,
          m.common_name,
          ...(m.synonyms || []),
          m.category,
          m.diagnostic_features,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      });
    }
    return results.map((m) => ({ ...m, source: 'DATABASE_REFERENCE' }));
  }
}

let singleton = null;
function getGeologyKnowledgeProvider() {
  if (!singleton) singleton = new GeologyKnowledgeProvider();
  return singleton;
}

module.exports = { GeologyKnowledgeProvider, getGeologyKnowledgeProvider };
