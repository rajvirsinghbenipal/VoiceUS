// api/callback.js
import { URLSearchParams } from 'url';
import fetch from 'node-fetch'; // You'll need to install this if using Node.js < 18 or no package.json yet

export default async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    console.error("Missing authorization code.");
    return res.status(400).send('Missing authorization code.');
  }

  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI;

  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error("Server configuration error: Missing GitHub OAuth environment variables!");
    return res.status(500).send('Server configuration error. Please contact the administrator.');
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
        state: state,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub OAuth Error:', tokenData.error_description || tokenData.error);
      return res.status(400).send(`GitHub OAuth Error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!doctype html>
      <html>
      <head><title>Authentication complete</title></head>
      <body>
        <script>
          window.opener.postMessage({
            token: '${accessToken}',
            provider: 'github'
          }, window.opener.location.origin);
          window.close();
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('OAuth processing error:', error);
    res.status(500).send('Authentication failed due to server error.');
  }
};