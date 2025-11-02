import { google } from "googleapis";

export async function GET() {
  try {
    const email = process.env.GOOGLE_CLIENT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const spreadsheetId = process.env.SHEET_ID;
    const range = process.env.SHEET_PLAYERS_RANGE || "Gracze!A2:C";

    if (!email || !key || !spreadsheetId) {
      return Response.json({ players: [] }, { status: 200 });
    }

    const auth = new google.auth.JWT(
      email,
      undefined,
      (key || "").replace(/\\n/g, "\n").replace(/\n/g, "\n").replace(/\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    );
    const sheets = google.sheets({ version: "v4", auth });
    const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = data.values || [];

    const players = rows
      .map((r) => ({
        name: r[0]?.toString().trim() || null,
        email: r[1]?.toString().trim() || null,
        external_id: r[2]?.toString().trim() || null,
      }))
      .filter((p) => p.name);

    return Response.json({ players }, { status: 200 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
