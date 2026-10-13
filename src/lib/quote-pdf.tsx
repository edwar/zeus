import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Dict } from "@/i18n";
import type { Locale } from "@/i18n/config";
import { fill, money } from "@/lib/format";
import type { QuoteDoc } from "@/lib/quote-doc";

const ink = "#0b1f18";
const soft = "#3d544b";
const line = "#d9e2dd";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: ink, lineHeight: 1.35 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: "#ffc21a" },
  brand: { fontSize: 22, lineHeight: 1.1, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  title: { fontSize: 11, color: soft, marginTop: 2 },
  meta: { fontSize: 9, color: soft, textAlign: "right" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 16, gap: 8 },
  cell: { width: "48.5%", padding: 8, backgroundColor: "#f3f7f4", borderRadius: 4 },
  label: { fontSize: 8, color: soft, textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 20, marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: line, paddingVertical: 5 },
  th: { fontSize: 8, color: soft, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  name: { flexGrow: 1, flexBasis: 0, paddingRight: 8 },
  qty: { width: 36, textAlign: "right" },
  unit: { width: 84, textAlign: "right" },
  sub: { width: 92, textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  totalBox: { backgroundColor: "#ffc21a", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 4, flexDirection: "row", gap: 16, alignItems: "center" },
  totalValue: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  note: { marginTop: 18, fontSize: 8.5, color: soft },
  foot: { position: "absolute", left: 40, right: 40, bottom: 24, fontSize: 8, color: soft, flexDirection: "row", justifyContent: "space-between" },
});

function QuotePdf({ doc, t, lang, validUntil }: { doc: QuoteDoc; t: Dict; lang: Locale; validUntil: Date | null }) {
  const c = t.quoteLink;
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "long" });
  const m = (n: number) => money(lang, n, doc.currency);
  return (
    <Document title={`${c.eyebrow} ${doc.ref}`} author={t.brand}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.brand}>{t.brand}</Text>
            <Text style={s.title}>{c.eyebrow}</Text>
          </View>
          <View>
            <Text style={s.meta}>{c.ref}: {doc.ref}</Text>
            <Text style={s.meta}>{c.date}: {date.format(doc.createdAt)}</Text>
            {validUntil && <Text style={s.meta}>{c.validUntil}: {date.format(validUntil)}</Text>}
          </View>
        </View>

        <View style={s.grid}>
          <View style={s.cell}><Text style={s.label}>{c.client}</Text><Text style={s.value}>{doc.name}{doc.city ? ` · ${doc.city}` : ""}</Text></View>
          <View style={s.cell}><Text style={s.label}>{c.system}</Text><Text style={s.value}>{c.systems[doc.systemType]}</Text></View>
          <View style={s.cell}><Text style={s.label}>{c.kwp}</Text><Text style={s.value}>{doc.kwp} kWp</Text></View>
          <View style={s.cell}><Text style={s.label}>{c.modality}</Text><Text style={s.value}>{c.modalities[doc.fulfillment]}</Text></View>
        </View>

        <Text style={s.h2}>{c.kit}</Text>
        <View style={s.row} fixed>
          <Text style={[s.th, s.name]}>{c.product}</Text>
          <Text style={[s.th, s.qty]}>{c.qty}</Text>
          <Text style={[s.th, s.unit]}>{c.unit}</Text>
          <Text style={[s.th, s.sub]}>{c.subtotal}</Text>
        </View>
        {doc.items.map((i, k) => (
          <View key={k} style={s.row} wrap={false}>
            <Text style={s.name}>{i.name}</Text>
            <Text style={s.qty}>{i.qty}</Text>
            <Text style={s.unit}>{m(i.unitPrice)}</Text>
            <Text style={s.sub}>{m(i.unitPrice * i.qty)}</Text>
          </View>
        ))}
        <View style={s.total} wrap={false}>
          <View style={s.totalBox}><Text>{c.total}</Text><Text style={s.totalValue}>{m(doc.total)}</Text></View>
        </View>

        {doc.financing && (
          <View wrap={false}>
            <Text style={s.h2}>{c.financing.title}</Text>
            <View style={s.grid}>
              <View style={s.cell}><Text style={s.label}>{c.financing.monthly}</Text><Text style={s.value}>{m(doc.financing.monthly)}</Text></View>
              <View style={s.cell}><Text style={s.label}>{c.financing.down}</Text><Text style={s.value}>{doc.financing.downPct} % · {m(doc.financing.down)}</Text></View>
              <View style={s.cell}><Text style={s.label}>{c.financing.term}</Text><Text style={s.value}>{doc.financing.termMonths} {c.financing.months}</Text></View>
            </View>
            <Text style={s.note}>{c.financing.note}</Text>
          </View>
        )}

        <Text style={s.note}>{c.note}</Text>
        <View style={s.foot} fixed>
          <Text>{t.brand} · {doc.ref}</Text>
          <Text render={({ pageNumber, totalPages }) => fill("{n} / {total}", { n: pageNumber, total: totalPages })} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(opts: { doc: QuoteDoc; t: Dict; lang: Locale; validUntil: Date | null }): Promise<Buffer> {
  return renderToBuffer(<QuotePdf {...opts} />);
}

/** Nombre de archivo seguro para la cabecera Content-Disposition. */
export const pdfFileName = (ref: string) => `cotizacion-${ref.toLowerCase()}.pdf`;
