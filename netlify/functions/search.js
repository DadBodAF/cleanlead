const https = require('https');

const SOURCE_QUERIES = {
  bcbid:    q => `site:bcbid.gov.bc.ca ${q}`,
  merx:     q => `site:merx.com ${q}`,
  gov:      q => `(site:.gov.bc.ca OR site:.ca/tenders OR site:.ca/rfp) ${q}`,
  chambers: q => `(chamber of commerce OR strata OR property management) "${q}" RFQ OR tender OR contract`,
  linkedin: q => `site:linkedin.com/jobs ${q} contract OR RFP`,
};

const SOURCE_COLORS = { bcbid:'#b8f542', merx:'#42d4f5', gov:'#f59542', chambers:'#c042f5', linkedin:'#f5c842' };

function googleSearch(query) {
  return new Promise((resolve, reject) => {
    const API_KEY = process.env.GOOGLE_API_KEY;
    const CX = process.env.GOOGLE_CX;
    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query)}&num=10`;
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const source = params.source || 'gov';
  const q = params.q || 'janitorial cleaning RFP BC Canada';

  try {
    const query = SOURCE_QUERIES[source] ? SOURCE_QUERIES[source](q) : q;
    const data = await googleSearch(query);

    if (data.error) {
      return { statusCode: 400, body: data.error.message };
    }

    const leads = (data.items || []).map(item => ({
      id: `${source}-${Buffer.from(item.link).toString('base64').slice(0,12)}`,
      source,
      title: item.title,
      snippet: item.snippet || '',
      url: item.link,
      displayUrl: item.displayLink,
      color: SOURCE_COLORS[source] || '#b8f542',
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leads),
    };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
