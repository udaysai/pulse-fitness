/**
 * Apple Health export parser — runs entirely in the browser.
 * Raw HealthKit samples never leave the device. We only upload daily aggregates.
 *
 * Supported aggregations per day:
 *  - steps         = SUM(HKQuantityTypeIdentifierStepCount)
 *  - active_kcal   = SUM(HKQuantityTypeIdentifierActiveEnergyBurned)
 *  - resting_hr    = LAST(HKQuantityTypeIdentifierRestingHeartRate) per day
 *  - hrv_ms        = MEAN(HKQuantityTypeIdentifierHeartRateVariabilitySDNN)
 *  - sleep_minutes = SUM(HKCategoryTypeIdentifierSleepAnalysis) where value == InBed/Asleep
 *  - vo2_max       = LAST(HKQuantityTypeIdentifierVO2Max)
 *  - weight_kg     = LAST(HKQuantityTypeIdentifierBodyMass)  (converted if needed)
 *  - body_fat_pct  = LAST(HKQuantityTypeIdentifierBodyFatPercentage) × 100
 */

export type DailyAggregate = {
  date: string; // YYYY-MM-DD
  steps?: number;
  active_kcal?: number;
  resting_hr?: number;
  hrv_ms?: number;
  sleep_minutes?: number;
  vo2_max?: number;
  weight_kg?: number;
  body_fat_pct?: number;
};

type SumOrLast = { sum: number; count: number; last: { date: string; value: number } | null };

type Accumulators = {
  steps: Map<string, number>;
  active_kcal: Map<string, number>;
  resting_hr: Map<string, { date: string; value: number }>;
  hrv: Map<string, SumOrLast>;
  sleep_minutes: Map<string, number>;
  vo2_max: Map<string, { date: string; value: number }>;
  body_mass_kg: Map<string, { date: string; value: number }>;
  body_fat_pct: Map<string, { date: string; value: number }>;
};

export type ParseProgress = {
  bytesProcessed: number;
  totalBytes: number;
  recordsParsed: number;
};

export async function parseAppleHealthExport(
  file: File,
  onProgress?: (p: ParseProgress) => void,
): Promise<{
  aggregates: DailyAggregate[];
  dateRange: { start: string; end: string };
  recordsParsed: number;
  fileHash: string;
}> {
  // 1. Compute file hash (idempotency)
  const fileHash = await sha256(file);

  // 2. Open zip + locate export.xml
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const xmlEntry = Object.values(zip.files).find((f) => f.name.endsWith("export.xml"));
  if (!xmlEntry) throw new Error("export.xml not found in the zip");
  const totalBytes = file.size;

  // 3. Stream-parse XML using sax
  const sax = (await import("sax")).default;
  const parser = sax.parser(true);

  const acc: Accumulators = {
    steps: new Map(),
    active_kcal: new Map(),
    resting_hr: new Map(),
    hrv: new Map(),
    sleep_minutes: new Map(),
    vo2_max: new Map(),
    body_mass_kg: new Map(),
    body_fat_pct: new Map(),
  };
  let recordsParsed = 0;
  let bytesProcessed = 0;
  let firstDate = "9999-12-31";
  let lastDate = "0000-01-01";

  parser.onopentag = (node) => {
    if (node.name !== "Record") return;
    const a = node.attributes as Record<string, string>;
    const type = a.type;
    if (!type) return;
    const day = a.startDate ? a.startDate.slice(0, 10) : null;
    if (!day) return;
    if (day < firstDate) firstDate = day;
    if (day > lastDate) lastDate = day;
    const val = a.value ? Number(a.value) : NaN;
    const unit = a.unit;
    recordsParsed++;

    switch (type) {
      case "HKQuantityTypeIdentifierStepCount":
        if (!isNaN(val)) acc.steps.set(day, (acc.steps.get(day) ?? 0) + val);
        break;
      case "HKQuantityTypeIdentifierActiveEnergyBurned":
        if (!isNaN(val)) acc.active_kcal.set(day, (acc.active_kcal.get(day) ?? 0) + val);
        break;
      case "HKQuantityTypeIdentifierRestingHeartRate":
        if (!isNaN(val)) acc.resting_hr.set(day, { date: a.endDate ?? a.startDate, value: val });
        break;
      case "HKQuantityTypeIdentifierHeartRateVariabilitySDNN":
        if (!isNaN(val)) {
          const cur = acc.hrv.get(day) ?? { sum: 0, count: 0, last: null };
          cur.sum += val;
          cur.count += 1;
          acc.hrv.set(day, cur);
        }
        break;
      case "HKCategoryTypeIdentifierSleepAnalysis": {
        // value is a string like 'HKCategoryValueSleepAnalysisAsleepCore'
        const isSleep =
          a.value &&
          (a.value.includes("Asleep") || a.value.includes("InBed"));
        if (!isSleep) break;
        const start = Date.parse(a.startDate ?? "");
        const end = Date.parse(a.endDate ?? "");
        if (isNaN(start) || isNaN(end)) break;
        const minutes = Math.max(0, (end - start) / 60000);
        // Bucket by end-date day (matches how Apple groups "last night")
        const sleepDay = (a.endDate ?? a.startDate).slice(0, 10);
        acc.sleep_minutes.set(sleepDay, (acc.sleep_minutes.get(sleepDay) ?? 0) + minutes);
        break;
      }
      case "HKQuantityTypeIdentifierVO2Max":
        if (!isNaN(val)) acc.vo2_max.set(day, { date: a.endDate ?? a.startDate, value: val });
        break;
      case "HKQuantityTypeIdentifierBodyMass":
        if (!isNaN(val)) {
          const kg = unit === "lb" ? val * 0.45359237 : val;
          acc.body_mass_kg.set(day, { date: a.endDate ?? a.startDate, value: kg });
        }
        break;
      case "HKQuantityTypeIdentifierBodyFatPercentage":
        if (!isNaN(val)) {
          // Apple stores as 0..1; convert to percentage
          const pct = val <= 1 ? val * 100 : val;
          acc.body_fat_pct.set(day, { date: a.endDate ?? a.startDate, value: pct });
        }
        break;
    }
  };

  return await new Promise((resolve, reject) => {
    parser.onerror = (e) => reject(e);
    parser.onend = () => {
      const allDays = new Set<string>([
        ...acc.steps.keys(),
        ...acc.active_kcal.keys(),
        ...acc.resting_hr.keys(),
        ...acc.hrv.keys(),
        ...acc.sleep_minutes.keys(),
        ...acc.vo2_max.keys(),
        ...acc.body_mass_kg.keys(),
        ...acc.body_fat_pct.keys(),
      ]);

      const aggregates: DailyAggregate[] = [...allDays].sort().map((d) => {
        const hrvBucket = acc.hrv.get(d);
        return {
          date: d,
          steps: roundOrU(acc.steps.get(d)),
          active_kcal: roundOrU(acc.active_kcal.get(d)),
          resting_hr: roundOrU(acc.resting_hr.get(d)?.value),
          hrv_ms: hrvBucket ? round1(hrvBucket.sum / hrvBucket.count) : undefined,
          sleep_minutes: roundOrU(acc.sleep_minutes.get(d)),
          vo2_max: round1(acc.vo2_max.get(d)?.value),
          weight_kg: round1(acc.body_mass_kg.get(d)?.value),
          body_fat_pct: round1(acc.body_fat_pct.get(d)?.value),
        };
      });

      resolve({
        aggregates,
        dateRange: { start: firstDate, end: lastDate },
        recordsParsed,
        fileHash,
      });
    };

    // Process XML in chunks: load as string then feed sax in slices so the UI stays responsive.
    (async () => {
      try {
        const xml = await xmlEntry.async("string");
        const CHUNK = 1024 * 256; // 256 KB
        for (let i = 0; i < xml.length; i += CHUNK) {
          parser.write(xml.slice(i, i + CHUNK));
          bytesProcessed = Math.min(i + CHUNK, totalBytes);
          onProgress?.({ bytesProcessed, totalBytes, recordsParsed });
          // Yield to the event loop every chunk so the UI can repaint
          await new Promise((r) => setTimeout(r, 0));
        }
        parser.close();
      } catch (e) {
        reject(e);
      }
    })();
  });
}

function round1(v: number | undefined): number | undefined {
  return v === undefined ? undefined : Math.round(v * 10) / 10;
}
function roundOrU(v: number | undefined): number | undefined {
  return v === undefined ? undefined : Math.round(v);
}

async function sha256(file: File): Promise<string> {
  // For very large files we hash a deterministic sample to stay fast.
  const limit = 8 * 1024 * 1024; // 8MB
  const buf = await file.slice(0, limit).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
