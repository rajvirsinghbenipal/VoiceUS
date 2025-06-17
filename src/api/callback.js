// api/callback.js
import { URLSearchParams } from 'url';
import fetch from 'node-fetch'; // You might need to install 'node-fetch' if not already available

export default async (req, res) => {
  const { code } = req.query; // Get the authorization code from GitHub's redirect

  if (!code) {
    return res.status(400).send('No authorization code provided.');
  }

  // Get your GitHub OAuth App credentials from Vercel Environment Variables
  const client_id = process.env.GITHUB_OAUTH_CLIENT_ID;
  const client_secret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const redirect_uri = `https://${req.headers.host}/api/callback`; // Construct the exact callback URL

  try {
    const params = new URLSearchParams({
      client_id,
      client_secret,
      code,
      redirect_uri,
    });

    // Exchange the authorization code for an access token
    const response = await fetch(`https://github.com/login/oauth/access_token?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (data.error) {
      console.error('GitHub OAuth Error:', data.error_description || data.error);
      return res.status(500).send(`GitHub OAuth Error: ${data.error_description || data.error}`);
    }

    const accessToken = data.access_token;

    // Send the access token back to Decap CMS in the parent window.
    // This script will run in the popup window opened by Decap CMS.
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorizing...</title>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              token: '${accessToken}',
              provider: 'github'
            }, window.location.origin);
            window.close();
          } else {
            document.write('Authentication successful! You can close this window.');
          }
        </script>
      </head>
      <body>
        Authorizing...
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Authentication process failed:', error);
    res.status(500).send('Authentication process failed.');
  }
};