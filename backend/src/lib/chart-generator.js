// Bug #2 — Severity pie chart for the report export.
//
// Ported from the pwndoc-ng reference (backend/src/lib/chart-generator.js) and
// adapted to pwndoc_BK. The chart is emitted as raw DrawingML chart XML that is
// injected directly into the generated .docx ZIP (PizZip), so it does not depend
// on the `docx` library version.
//
// Usage from a Word template:
//   {@findings | pieChart:'Title':'000000':'FF0000':'FFA500':'FFFF00'}
//   (title, then Critical/High/Medium/Low colours as hex WITHOUT '#')
// Optional 6th argument selects the CVSS score used for counting:
//   'base' (default), 'temporal' or 'environmental'.
//
// barChart is intentionally NOT ported (out of scope — see CLAUDE.md §11).
//
// NOTE on state: `zip`, the counter and the accumulators are module-scoped, so
// `reset(zip, translate)` MUST be called at the start of every generateDoc and
// `inject()` after render / before zip.generate(). This mirrors pwndoc-ng and
// adds the per-generation reset the reference lacked, so charts never leak across
// consecutive exports (duplicate relationship ids / ghost charts).

var chartGenerator = {};

var zip = null;
var translate = function (s) { return s; };
var numberOfPieChart = 0;
var chartRelXml = "";
var chartContentTypeXml = "";
// Default severity colours (hex, no '#'), fed from settings.report.public.cvssColors
// so the chart matches the severity cell colours. Used only when the template tag
// does not pass explicit colours.
var defaultColors = {};

const encodeHTMLEntities = (s) =>
  String(s).replace(/[\u00A0-\u9999<>&]/g, (i) => "&#" + i.charCodeAt(0) + ";");

// Reset per-generation state. Call once at the start of each generateDoc.
chartGenerator.reset = function (zipInstance, translateFn, colors) {
  zip = zipInstance;
  translate = typeof translateFn === "function" ? translateFn : function (s) { return s; };
  numberOfPieChart = 0;
  chartRelXml = "";
  chartContentTypeXml = "";
  defaultColors = colors && typeof colors === "object" ? colors : {};
};

// Normalise a hex colour: drop leading '#', return undefined for empty values.
function normalizeHex(c) {
  if (!c || typeof c !== "string") return undefined;
  var v = c.replace("#", "").trim();
  return v.length ? v : undefined;
}

// docxtemplater filter body. Registered as `pieChart` in report-filters.js.
chartGenerator.pieChartFilter = function (
  input,
  title,
  colorCrit,
  colorHigh,
  colorMed,
  colorLow,
  scoreType
) {
  if (!input) return input;
  // Safety: reset() not called (e.g. filter used outside generateDoc) → emit nothing.
  if (!zip) return "";

  if (!title) title = "";
  // Precedence: explicit tag colour → settings cvssColors → hardcoded fallback.
  colorCrit = normalizeHex(colorCrit) || normalizeHex(defaultColors.crit) || "000000";
  colorHigh = normalizeHex(colorHigh) || normalizeHex(defaultColors.high) || "FF0000";
  colorMed = normalizeHex(colorMed) || normalizeHex(defaultColors.med) || "FFA500";
  colorLow = normalizeHex(colorLow) || normalizeHex(defaultColors.low) || "FFFF00";

  var scoreAttribute;
  switch (scoreType) {
    case "temporal":
      scoreAttribute = "temporalSeverity";
      break;
    case "environmental":
      scoreAttribute = "environmentalSeverity";
      break;
    case "base":
    default:
      // Default to base severity to match the pwndoc-ng reference tag.
      scoreAttribute = "baseSeverity";
  }

  var countCritical = 0;
  var countHigh = 0;
  var countMedium = 0;
  var countLow = 0;
  for (var i = 0; i < input.length; i++) {
    var sev = input[i] && input[i].cvss ? input[i].cvss[scoreAttribute] : undefined;
    if (sev === "Critical") countCritical += 1;
    else if (sev === "High") countHigh += 1;
    else if (sev === "Medium") countMedium += 1;
    else if (sev === "Low") countLow += 1;
  }

  var pieChartXML = chartGenerator.generatePieChart(
    title,
    colorCrit,
    colorHigh,
    colorMed,
    colorLow,
    countCritical,
    countHigh,
    countMedium,
    countLow,
    translate
  );

  numberOfPieChart += 1;

  // Relationship (word/_rels/document.xml.rels) linking the drawing to the chart part.
  chartRelXml +=
    `<Relationship Id="rId-pwndoc-pie-${numberOfPieChart}" ` +
    `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" ` +
    `Target="charts/pieChart-${numberOfPieChart}-pwndoc.xml"/>`;

  // Content type override for the chart part.
  chartContentTypeXml +=
    `<Override PartName="/word/charts/pieChart-${numberOfPieChart}-pwndoc.xml" ` +
    `ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;

  // Write the chart part into the ZIP.
  zip.file(`word/charts/pieChart-${numberOfPieChart}-pwndoc.xml`, pieChartXML);

  // Inline drawing run referencing the chart by relationship id.
  return `<w:p>
    <w:r>
        <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
                <wp:extent cx="5486400" cy="3200400"/>
                <wp:effectExtent l="0" t="0" r="0" b="0"/>
                <wp:docPr id="${1836246480 + numberOfPieChart}" name="Piechart Severity ${numberOfPieChart}"/>
                <wp:cNvGraphicFramePr/>
                <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
                        <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
                                 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
                                 r:id="rId-pwndoc-pie-${numberOfPieChart}"/>
                    </a:graphicData>
                </a:graphic>
            </wp:inline>
        </w:drawing>
    </w:r>
</w:p>`;
};

// Inject accumulated relationships + content types into the ZIP. Call after render,
// before zip.generate(). No-op when no chart was produced.
chartGenerator.inject = function () {
  if (!zip || numberOfPieChart === 0) return;

  const relsPath = "word/_rels/document.xml.rels";
  let relsXml = zip.files[relsPath].asText();
  relsXml = relsXml.replace("</Relationships>", `${chartRelXml}</Relationships>`);
  zip.file(relsPath, relsXml);

  // Optional chart style/colors parts (kept for parity with pwndoc-ng; harmless).
  zip.file(
    "word/charts/pieChart-style-pwndoc.xml",
    `<c:chartStyle xmlns:c="http://schemas.microsoft.com/office/drawing/2012/chartStyle"/>`
  );
  zip.file(
    "word/charts/pieChart-colors-pwndoc.xml",
    `<c:chartColors xmlns:c="http://schemas.microsoft.com/office/drawing/2012/chartColor"/>`
  );

  const contentTypesPath = "[Content_Types].xml";
  let contentTypesXml = zip.files[contentTypesPath].asText();
  contentTypesXml = contentTypesXml.replace(
    "</Types>",
    `${chartContentTypeXml}</Types>`
  );
  zip.file(contentTypesPath, contentTypesXml);
};

// Returns raw DrawingML chartSpace XML for a severity pie chart.
chartGenerator.generatePieChart = function (
  title,
  colorCrit,
  colorHigh,
  colorMed,
  colorLow,
  countCritical,
  countHigh,
  countMedium,
  countLow,
  translateFn
) {
  var t = typeof translateFn === "function" ? translateFn : function (s) { return s; };
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
                    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <c:chart>
        <c:title>
            <c:tx>
                <c:rich>
                <a:bodyPr/>
                <a:lstStyle/>
                <a:p>
                    <a:pPr>
                    <a:defRPr sz="1600"/>
                    </a:pPr>
                    <a:r>
                    <a:rPr sz="1600"/>
                    <a:t>${encodeHTMLEntities(title)}</a:t>
                    </a:r>
                </a:p>
                </c:rich>
            </c:tx>
            <c:layout/>
            <c:overlay val="0"/>
            </c:title>
            <c:plotArea>
            <c:layout>
            <c:manualLayout>
                <c:layoutTarget val="inner"/>
                <c:xMode val="edge"/>
                <c:yMode val="edge"/>
                <c:w val="0.8"/>
                <c:h val="0.8"/>
            </c:manualLayout>
        </c:layout>
            <c:pieChart>
                <c:ser>
                <c:idx val="0"/>
                <c:order val="0"/>
                <c:tx>
                    <c:strRef>
                    <c:strCache>
                        <c:ptCount val="4"/>
                        <c:pt idx="0">
                        <c:v>${encodeHTMLEntities(t("Critical"))}</c:v>
                        </c:pt>
                        <c:pt idx="1">
                        <c:v>${encodeHTMLEntities(t("High"))}</c:v>
                        </c:pt>
                        <c:pt idx="2">
                        <c:v>${encodeHTMLEntities(t("Medium"))}</c:v>
                        </c:pt>
                        <c:pt idx="3">
                        <c:v>${encodeHTMLEntities(t("Low"))}</c:v>
                        </c:pt>
                    </c:strCache>
                    </c:strRef>
                </c:tx>
                <c:val>
                    <c:numLit>
                    <c:formatCode>General</c:formatCode>
                    <c:ptCount val="4"/>
                    <c:pt idx="0">
                        <c:v>${countCritical}</c:v>
                    </c:pt>
                    <c:pt idx="1">
                        <c:v>${countHigh}</c:v>
                    </c:pt>
                    <c:pt idx="2">
                        <c:v>${countMedium}</c:v>
                    </c:pt>
                    <c:pt idx="3">
                        <c:v>${countLow}</c:v>
                    </c:pt>
                    </c:numLit>
                </c:val>
                <c:cat>
                <c:strRef>
                <c:strCache>
                    <c:ptCount val="4"/>
                    <c:pt idx="0">
                    <c:v>${encodeHTMLEntities(t("Critical"))}</c:v>
                    </c:pt>
                    <c:pt idx="1">
                    <c:v>${encodeHTMLEntities(t("High"))}</c:v>
                    </c:pt>
                    <c:pt idx="2">
                    <c:v>${encodeHTMLEntities(t("Medium"))}</c:v>
                    </c:pt>
                    <c:pt idx="3">
                    <c:v>${encodeHTMLEntities(t("Low"))}</c:v>
                    </c:pt>
                </c:strCache>
                </c:strRef>
            </c:cat>
                 <c:dPt>
                <c:idx val="0"/>
                <c:spPr>
                    <a:solidFill>
                        <a:srgbClr val="${encodeHTMLEntities(colorCrit)}"/>
                    </a:solidFill>
                </c:spPr>
            </c:dPt>
            <c:dPt>
                <c:idx val="1"/>
                <c:spPr>
                    <a:solidFill>
                        <a:srgbClr val="${encodeHTMLEntities(colorHigh)}"/>
                    </a:solidFill>
                </c:spPr>
            </c:dPt>
            <c:dPt>
                <c:idx val="2"/>
                <c:spPr>
                    <a:solidFill>
                        <a:srgbClr val="${encodeHTMLEntities(colorMed)}"/>
                    </a:solidFill>
                </c:spPr>
            </c:dPt>
            <c:dPt>
                <c:idx val="3"/>
                <c:spPr>
                    <a:solidFill>
                        <a:srgbClr val="${encodeHTMLEntities(colorLow)}"/>
                    </a:solidFill>
                </c:spPr>
            </c:dPt>
                </c:ser>
                <c:dLbls>
                <c:showLegendKey val="0"/>
                <c:showVal val="1"/>
                <c:showCatName val="0"/>
                <c:showSerName val="0"/>
                <c:showPercent val="0"/>
                <c:showBubbleSize val="0"/>
                <c:showLeaderLines val="0"/>
                <c:txPr>
            <a:bodyPr/>
            <a:lstStyle/>
            <a:p>
                <a:pPr>
                    <a:defRPr sz="1500" b="1">
                        <a:solidFill>
                            <a:srgbClr val="FFFFFF"/>
                        </a:solidFill>
                    </a:defRPr>
                </a:pPr>
            </a:p>
        </c:txPr>
                </c:dLbls>
            </c:pieChart>
            </c:plotArea>
            <c:legend>
            <c:legendPos val="r"/>
            <c:overlay val="0"/>
            <c:spPr>
                <a:noFill/>
                <a:ln>
                <a:noFill/>
                </a:ln>
                <a:effectLst/>
            </c:spPr>
            <c:txPr>
                <a:bodyPr rot="0" spcFirstLastPara="1" vertOverflow="ellipsis" vert="horz" wrap="square" anchor="ctr" anchorCtr="1"/>
                <a:lstStyle/>
                <a:p>
                <a:pPr>
                    <a:defRPr sz="1500" b="0" i="0" u="none" strike="noStrike" kern="1200" baseline="0">
                    <a:solidFill>
                        <a:schemeClr val="tx1">
                        <a:lumMod val="65000"/>
                        <a:lumOff val="35000"/>
                        </a:schemeClr>
                    </a:solidFill>
                    <a:latin typeface="+mn-lt"/>
                    <a:ea typeface="+mn-ea"/>
                    <a:cs typeface="+mn-cs"/>
                    </a:defRPr>
                </a:pPr>
                <a:endParaRPr lang="en-US"/>
                </a:p>
            </c:txPr>
            </c:legend>
            <c:plotVisOnly val="1"/>
            <c:dispBlanksAs val="gap"/>
            <c:showDLblsOverMax val="0"/>
        </c:chart>
        <c:spPr>
            <a:noFill/>
            <a:ln>
            <a:noFill/>
            </a:ln>
            <a:effectLst/>
        </c:spPr>
        </c:chartSpace>
        `;
};

module.exports = chartGenerator;
