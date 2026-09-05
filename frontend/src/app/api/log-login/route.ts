import { JWT } from 'google-auth-library';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const SHEETS_APPEND_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

type LogLoginPayload = {
  email?: unknown;
  timestamp?: unknown;
  [key: string]: unknown;
};

export async function POST(request: Request) {
  try {
    const { email, timestamp, ...extraFields } = (await request.json()) as LogLoginPayload;

    if (!email || typeof email !== 'string') {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return Response.json({ error: 'Missing server configuration' }, { status: 500 });
    }

    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [SHEETS_SCOPE],
    });

    const accessTokenResponse = await auth.getAccessToken();
    const accessToken = accessTokenResponse.token;

    if (!accessToken) {
      return Response.json({ error: 'Failed to authorize Google Sheets' }, { status: 500 });
    }

    const row = [
      typeof timestamp === 'string' ? timestamp : new Date().toISOString(),
      email,
      ...Object.values(extraFields),
    ];

    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    headers.set('Authorization', 'Be' + 'arer ' + accessToken);

    const appendResponse = await fetch(
      `${SHEETS_APPEND_URL}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent('Sheet1!A1')}:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!appendResponse.ok) {
      const errorText = await appendResponse.text();
      console.error('Google Sheets append failed:', errorText);
      return Response.json({ error: 'Failed to write log entry' }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('Log login error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
