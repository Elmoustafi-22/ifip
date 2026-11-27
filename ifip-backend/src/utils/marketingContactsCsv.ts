export interface CsvContact { name: string; email: string; row: number }
export interface CsvIssue { row: number; reason: string }

export function parseMarketingContactsCsv(csv: string) {
    const records: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    for (let index = 0; index < csv.length; index += 1) {
        const character = csv[index];
        if (quoted) {
            if (character === '"' && csv[index + 1] === '"') { field += '"'; index += 1; }
            else if (character === '"') quoted = false;
            else field += character;
        } else if (character === '"' && field.length === 0) quoted = true;
        else if (character === ',') { row.push(field); field = ''; }
        else if (character === '\n') { row.push(field.replace(/\r$/, '')); records.push(row); row = []; field = ''; }
        else field += character;
    }
    if (quoted) throw new Error('The CSV has a quoted field that was not closed.');
    if (field.length || row.length) { row.push(field.replace(/\r$/, '')); records.push(row); }
    const nonEmpty = records.filter((record) => record.some((value) => value.trim()));
    if (nonEmpty.length < 2) throw new Error('Add a header row and at least one contact.');
    if (nonEmpty.length - 1 > 10000) throw new Error('A CSV can contain at most 10,000 contacts.');
    const headers = nonEmpty[0].map((value) => value.trim().replace(/^\uFEFF/, '').toLowerCase().replace(/[\s_-]+/g, ''));
    const emailIndex = headers.indexOf('email');
    const nameIndex = headers.findIndex((value) => value === 'name' || value === 'fullname');
    if (emailIndex < 0) throw new Error('Include an email column in the header row.');
    const contacts: CsvContact[] = [];
    const issues: CsvIssue[] = [];
    const seen = new Set<string>();
    let duplicates = 0;
    nonEmpty.slice(1).forEach((record, index) => {
        const rowNumber = index + 2;
        const email = (record[emailIndex] ?? '').trim().toLowerCase();
        const name = nameIndex >= 0 ? (record[nameIndex] ?? '').trim().slice(0, 200) : '';
        if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            issues.push({ row: rowNumber, reason: 'Enter a valid email address.' }); return;
        }
        if (seen.has(email)) { duplicates += 1; return; }
        seen.add(email);
        contacts.push({ name, email, row: rowNumber });
    });
    return { contacts, issues, duplicates };
}
