import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { getCredentialByCode } from "@/lib/db/credentials";
import { formatDate } from "@/lib/format";
import { env } from "@/lib/env";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";

const paramsSchema = z.object({ code: z.string().min(4).max(40) });

const INK = rgb(0x10 / 255, 0x1b / 255, 0x2e / 255);
const PAPER = rgb(0xf5 / 255, 0xf7 / 255, 0xfa / 255);
const GOLD = rgb(0xc0 / 255, 0x8a / 255, 0x2e / 255);
const SLATE = rgb(0x8f / 255, 0xa3 / 255, 0xbf / 255);

/**
 * Certificate PDF generated on demand from the credential record — no stored
 * files, no storage egress, always reflects current status. Public like the
 * verification page itself.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  if (!(await checkRateLimit(request, RATE_LIMITS.verifyLookup))) {
    return rateLimitedResponse();
  }

  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return Response.json({ error: "Invalid credential code." }, { status: 400 });
  }

  const credential = await getCredentialByCode(params.data.code).catch(
    () => null,
  );
  if (!credential) {
    return Response.json({ error: "No credential found." }, { status: 404 });
  }
  if (credential.status !== "active") {
    return Response.json(
      { error: `This credential is ${credential.status}; its certificate is not available.` },
      { status: 410 },
    );
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const courier = await doc.embedFont(StandardFonts.Courier);

  page.drawRectangle({ x: 0, y: 0, width, height, color: INK });
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: GOLD,
    borderWidth: 1.5,
  });

  const centerText = (
    text: string,
    y: number,
    size: number,
    font = helvetica,
    color = PAPER,
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
  };

  centerText("GN ACADEMY", height - 90, 16, helveticaBold, GOLD);
  centerText("PROFESSIONAL CREDENTIAL", height - 112, 9, helvetica, SLATE);

  centerText("This certifies that", height - 190, 12, helvetica, SLATE);
  centerText(credential.holder_name, height - 230, 32, helveticaBold, PAPER);
  centerText("has earned the credential", height - 270, 12, helvetica, SLATE);
  centerText(credential.title, height - 305, 24, helveticaBold, GOLD);

  centerText(
    `Issued ${formatDate(credential.issued_at)}`,
    height - 360,
    11,
    helvetica,
    SLATE,
  );
  centerText(credential.credential_code, height - 400, 18, courier, PAPER);
  centerText(
    `Verify at ${env.NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}/verify/${credential.credential_code}`,
    height - 425,
    10,
    helvetica,
    SLATE,
  );

  centerText(
    "This certificate is only as valid as its verification page. Check the code.",
    56,
    8,
    helvetica,
    SLATE,
  );

  const bytes = await doc.save();

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${credential.credential_code}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
