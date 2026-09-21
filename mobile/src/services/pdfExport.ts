import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getDb } from '../db/database';
import { recordReport } from '../db/repositories/reportsRepo';
import { t } from '../i18n';
import { RTL_LOCALES, SupportedLocale } from '../i18n';

interface ReportData {
  sample: any;
  photos: any[];
  measurements: any[];
  tests: any[];
  candidates: any[];
  valuations: any[];
  locations: any[];
}

async function collectReportData(sampleId: number): Promise<ReportData> {
  const db = await getDb();
  const [sampleRows, photos, measurements, tests, candidates, valuations, locations] = await Promise.all([
    db.getAllAsync(`SELECT * FROM samples WHERE id = ?`, [sampleId]),
    db.getAllAsync(`SELECT * FROM photos WHERE sample_id = ?`, [sampleId]),
    db.getAllAsync(`SELECT * FROM measurements WHERE sample_id = ? ORDER BY recorded_at DESC`, [sampleId]),
    db.getAllAsync(`SELECT * FROM tests WHERE sample_id = ? ORDER BY recorded_at DESC`, [sampleId]),
    db.getAllAsync(
      `SELECT c.* FROM candidates c JOIN analyses a ON a.id = c.analysis_id WHERE a.sample_id = ? ORDER BY c.rank`,
      [sampleId]
    ),
    db.getAllAsync(`SELECT * FROM valuations WHERE sample_id = ? ORDER BY created_at DESC`, [sampleId]),
    db.getAllAsync(`SELECT * FROM locations WHERE sample_id = ?`, [sampleId]),
  ]);
  return {
    sample: sampleRows[0],
    photos,
    measurements,
    tests,
    candidates,
    valuations,
    locations,
  };
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return t('common.not_available');
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderCandidateRow(c: any): string {
  const supporting = JSON.parse(c.supporting_evidence_json || '[]');
  const contradicting = JSON.parse(c.contradicting_evidence_json || '[]');
  return `
    <tr>
      <td>${escapeHtml(c.rank)}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.category)}</td>
      <td>${escapeHtml((c.confidence * 100).toFixed(0))}% — ${escapeHtml(c.confidence_label)}</td>
      <td>${supporting.map(escapeHtml).join('<br/>')}</td>
      <td>${contradicting.map(escapeHtml).join('<br/>')}</td>
    </tr>`;
}

function buildHtml(data: ReportData, locale: SupportedLocale): string {
  const isRtl = RTL_LOCALES.includes(locale);
  const dir = isRtl ? 'rtl' : 'ltr';
  const { sample, measurements, tests, candidates, valuations, locations } = data;
  const latestMeasurement = measurements[0];
  const location = locations[0];
  const latestValuation = valuations[0];

  return `
  <html dir="${dir}" lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Arial, sans-serif; color: #0B1E33; padding: 24px; }
      h1 { color: #0B1E33; border-bottom: 3px solid #3FB8AF; padding-bottom: 8px; }
      h2 { color: #123A5E; margin-top: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #D8E0E7; padding: 6px 8px; font-size: 12px; text-align: ${isRtl ? 'right' : 'left'}; }
      th { background: #0B1E33; color: white; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
      .badge-measured { background: #CFF3F0; color: #0B1E33; }
      .badge-reference { background: #E1E8ED; color: #4B5C6B; }
      .disclaimer { font-size: 11px; color: #6B7A8F; font-style: italic; margin-top: 4px; }
      .footer { margin-top: 40px; font-size: 10px; color: #6B7A8F; border-top: 1px solid #D8E0E7; padding-top: 8px; }
    </style>
  </head>
  <body>
    <h1>ROCK ARCHIVE PRO</h1>
    <p><strong>${escapeHtml(t('sample.id'))}:</strong> ${escapeHtml(sample?.sample_code)}</p>
    <p><strong>${escapeHtml(t('analysis.classification'))}:</strong> ${escapeHtml(sample?.classification || t('common.not_available'))}</p>
    <p><strong>Date:</strong> ${escapeHtml(sample?.created_at)}</p>

    <h2>${escapeHtml(t('analysis.candidates'))}</h2>
    <table>
      <tr><th>#</th><th>${escapeHtml(t('sample.id'))}</th><th>Category</th><th>${escapeHtml(t('analysis.confidence'))}</th>
        <th>${escapeHtml(t('analysis.supporting_evidence'))}</th><th>${escapeHtml(t('analysis.contradicting_evidence'))}</th></tr>
      ${candidates.map(renderCandidateRow).join('') || `<tr><td colspan="6">${escapeHtml(t('common.not_available'))}</td></tr>`}
    </table>
    <p class="disclaimer">${escapeHtml(t('analysis.disclaimer'))}</p>

    <h2>${escapeHtml(t('measurements.title'))} <span class="badge badge-measured">${escapeHtml(t('measurements.user_measured_badge'))}</span></h2>
    ${
      latestMeasurement
        ? `<table>
            <tr><th>${escapeHtml(t('measurements.weight_g'))}</th><td>${escapeHtml(latestMeasurement.weight_g)}</td></tr>
            <tr><th>${escapeHtml(t('measurements.length_mm'))}</th><td>${escapeHtml(latestMeasurement.length_mm)}</td></tr>
            <tr><th>${escapeHtml(t('measurements.width_mm'))}</th><td>${escapeHtml(latestMeasurement.width_mm)}</td></tr>
            <tr><th>${escapeHtml(t('measurements.height_mm'))}</th><td>${escapeHtml(latestMeasurement.height_mm)}</td></tr>
            <tr><th>${escapeHtml(t('measurements.volume_cm3'))}</th><td>${escapeHtml(latestMeasurement.volume_cm3)}</td></tr>
            <tr><th>${escapeHtml(t('measurements.density'))}</th><td>${escapeHtml(latestMeasurement.density_g_cm3)} g/cm³</td></tr>
          </table>`
        : `<p>${escapeHtml(t('common.not_available'))}</p>`
    }

    <h2>${escapeHtml(t('measurements.title'))} — ${escapeHtml(t('sample.timeline'))}</h2>
    <table>
      <tr><th>Test</th><th>Result</th><th>Source</th></tr>
      ${
        tests
          .map(
            (tst: any) =>
              `<tr><td>${escapeHtml(tst.test_type)}</td><td>${escapeHtml(tst.result_value)}</td><td>${escapeHtml(tst.source)}</td></tr>`
          )
          .join('') || `<tr><td colspan="3">${escapeHtml(t('common.not_available'))}</td></tr>`
      }
    </table>

    <h2>${escapeHtml(t('valuation.title'))}</h2>
    <p class="disclaimer">${escapeHtml(t('valuation.disclaimer'))}</p>
    ${
      latestValuation
        ? `<p>${escapeHtml(latestValuation.low_estimate)} - ${escapeHtml(latestValuation.high_estimate)} ${escapeHtml(latestValuation.currency)}</p>`
        : `<p>${escapeHtml(t('valuation.unavailable'))}</p>`
    }

    <h2>${escapeHtml(t('sample.location'))}</h2>
    <p>${location ? [location.city, location.region, location.country].filter(Boolean).map(escapeHtml).join(', ') : escapeHtml(t('common.not_available'))}</p>

    <h2>${escapeHtml(t('analysis.recommended_tests'))}</h2>
    <p>XRF, XRD, ICP-MS, ICP-OES, or SEM-EDS may be recommended depending on the material — see the in-app results screen for the specific tests suggested for this sample.</p>

    <div class="footer">
      <p><strong>Disclaimer:</strong> AI observations and reference database values are clearly distinguished from
      user-measured values throughout this report. This report does not constitute a certified laboratory analysis,
      a gemological certification, or a financial appraisal. Generated by ROCK ARCHIVE PRO.</p>
    </div>
  </body>
  </html>`;
}

export async function generateSamplePdf(sampleId: number, locale: SupportedLocale = 'fr'): Promise<string> {
  const data = await collectReportData(sampleId);
  const html = buildHtml(data, locale);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await recordReport(sampleId, 'pdf', uri);
  return uri;
}

export async function generateAndShareSamplePdf(sampleId: number, locale: SupportedLocale = 'fr'): Promise<void> {
  const uri = await generateSamplePdf(sampleId, locale);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'ROCK ARCHIVE PRO — Report' });
  }
}
