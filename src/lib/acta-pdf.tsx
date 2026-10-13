import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";

const ink = "#0b1f18";
const soft = "#3d544b";
const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: ink, lineHeight: 1.4 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: "#ffc21a" },
  brand: { fontSize: 22, lineHeight: 1.1, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  title: { fontSize: 11, color: soft },
  meta: { fontSize: 9, color: soft, textAlign: "right" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 16, gap: 8 },
  cell: { width: "48.5%", padding: 8, backgroundColor: "#f3f7f4", borderRadius: 4 },
  label: { fontSize: 8, color: soft, textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6 },
  row: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: "#d9e2dd" },
  mark: { width: 14, fontFamily: "Helvetica-Bold" },
  name: { flexGrow: 1, flexBasis: 0, paddingRight: 8 },
  when: { width: 150, textAlign: "right", color: soft, fontSize: 8.5 },
  statement: { marginTop: 18, fontSize: 10 },
  sigs: { flexDirection: "row", gap: 24, marginTop: 20 },
  sig: { flex: 1 },
  sigBox: { height: 70, borderBottomWidth: 1, borderBottomColor: ink, justifyContent: "flex-end" },
  sigImg: { height: 64, objectFit: "contain", objectPosition: "left" },
  sigName: { marginTop: 4, fontSize: 9 },
  sigLabel: { fontSize: 8, color: soft },
});

export type ActaData = {
  ref: string; name: string; client: string; town: string; kwp: number;
  signedAt: Date; signerName: string; signature: string; notes: string | null; collectedBy: string;
  checks: { label: string; doneAt: Date | null; doneBy: string | null; done: boolean }[];
};

function Acta({ d, t, lang }: { d: ActaData; t: Dict; lang: Locale }) {
  const k = t.acta;
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "long", timeZone: "America/Bogota" });
  const stamp = new Intl.DateTimeFormat(lang, { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" });
  return (
    <Document title={`${k.title} ${d.ref}`} author={t.brand}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.brand}>{t.brand}</Text>
            <Text style={s.title}>{k.title}</Text>
          </View>
          <View>
            <Text style={s.meta}>{k.ref}: {d.ref}</Text>
            <Text style={s.meta}>{k.date}: {date.format(d.signedAt)}</Text>
          </View>
        </View>
        <View style={s.grid}>
          <View style={s.cell}><Text style={s.label}>{k.client}</Text><Text style={s.value}>{d.client}</Text></View>
          <View style={s.cell}><Text style={s.label}>{k.place}</Text><Text style={s.value}>{d.town}</Text></View>
          <View style={s.cell}><Text style={s.label}>{k.project}</Text><Text style={s.value}>{d.name}</Text></View>
          <View style={s.cell}><Text style={s.label}>{k.system}</Text><Text style={s.value}>{d.kwp} kWp</Text></View>
        </View>

        <Text style={s.h2}>{k.checks}</Text>
        {d.checks.map((c, i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={s.mark}>{c.done ? "✓" : "–"}</Text>
            <Text style={s.name}>{c.label}</Text>
            <Text style={s.when}>{c.done && c.doneAt ? `${k.done} ${stamp.format(c.doneAt)}${c.doneBy ? ` ${k.by} ${c.doneBy}` : ""}` : ""}</Text>
          </View>
        ))}

        {d.notes && (<><Text style={s.h2}>{k.notes}</Text><Text>{d.notes}</Text></>)}

        <Text style={s.statement}>{k.statement}</Text>
        <View style={s.sigs} wrap={false}>
          <View style={s.sig}>
            <View style={s.sigBox}><Image src={d.signature} style={s.sigImg} /></View>
            <Text style={s.sigName}>{d.signerName}</Text>
            <Text style={s.sigLabel}>{k.receivedBy}</Text>
          </View>
          <View style={s.sig}>
            <View style={s.sigBox} />
            <Text style={s.sigName}>{d.collectedBy}</Text>
            <Text style={s.sigLabel}>{k.deliveredBy}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export const renderActa = (d: ActaData, t: Dict, lang: Locale): Promise<Buffer> => renderToBuffer(<Acta d={d} t={t} lang={lang} />);
export const actaFileName = (ref: string) => `acta-entrega-${ref.toLowerCase()}.pdf`;
