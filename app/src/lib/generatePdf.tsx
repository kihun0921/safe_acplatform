import path from "path";
import { renderToBuffer, Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type { WizardSection } from "./wizardExport";

// Noto Sans KR (SIL Open Font License — free to embed/redistribute), downloaded once
// from Google Fonts' static TTF endpoint. @react-pdf/renderer's default fonts
// (Helvetica 등) have no Hangul glyphs, so without this every 한글 character in the
// generated PDF would render as blank boxes.
let fontsRegistered = false;
function ensureFontsRegistered() {
  if (fontsRegistered) return;
  const fontsDir = path.join(process.cwd(), "src", "assets", "fonts");
  Font.register({
    family: "NotoSansKR",
    fonts: [
      { src: path.join(fontsDir, "NotoSansKR-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(fontsDir, "NotoSansKR-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  fontsRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "NotoSansKR", fontSize: 10 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  heading: { fontSize: 14, fontWeight: "bold", marginBottom: 14, borderBottom: "2pt solid #1e3a5f", paddingBottom: 6 },
  fieldRow: { flexDirection: "row", marginBottom: 6 },
  fieldLabel: { fontWeight: "bold", width: 140 },
  fieldValue: { flex: 1 },
  table: { marginTop: 12, border: "1pt solid #ccc" },
  tableRow: { flexDirection: "row", borderBottom: "1pt solid #ccc" },
  tableHeaderCell: { flex: 1, padding: 5, fontWeight: "bold", backgroundColor: "#f3f4f6", fontSize: 9 },
  tableCell: { flex: 1, padding: 5, fontSize: 9 },
});

export async function generateWizardPdf(title: string, sections: WizardSection[]): Promise<Buffer> {
  ensureFontsRegistered();

  const doc = (
    <Document>
      {sections.map((section, i) => (
        <Page key={section.id} size="A4" style={styles.page}>
          {i === 0 && <Text style={styles.title}>{title}</Text>}
          <Text style={styles.heading}>{section.heading}</Text>
          {section.fields.map((f, idx) => (
            <View key={idx} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <Text style={styles.fieldValue}>{f.value || "(미입력)"}</Text>
            </View>
          ))}
          {section.table && section.table.rows.length > 0 && (
            <View style={styles.table}>
              {section.table.headers.length > 0 && (
                <View style={styles.tableRow}>
                  {section.table.headers.map((h, idx) => (
                    <Text key={idx} style={styles.tableHeaderCell}>
                      {h}
                    </Text>
                  ))}
                </View>
              )}
              {section.table.rows.map((row, rIdx) => (
                <View key={rIdx} style={styles.tableRow}>
                  {row.map((cell, cIdx) => (
                    <Text key={cIdx} style={styles.tableCell}>
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}
        </Page>
      ))}
    </Document>
  );

  return renderToBuffer(doc);
}
