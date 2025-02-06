import { bootstrap } from 'global-agent';
import xml2js from 'xml2js';
import axios from 'axios';
import qs from 'qs';
import { srvRouter } from './server.js';
import { processItems, parseParamsFinal, fuzzyMatch } from './utils.js';
import db from './db.cjs';

bootstrap();
const parser = new xml2js.Parser();
const builder = new xml2js.Builder({xmldec: {version: '1.0', encoding: 'UTF-8'}});

const torznabRoute = async (req, res) => {
  try {
    const {rss_url, params} = parseParamsFinal(req.originalUrl)
    
    // Handle capabilities request
    if (params.t === 'caps') {
      const capsXml = {
        caps: {
          server: {
            $: {
              version: "1.0",
              title: "RSSarr",
              strapline: "RSS to Torznab Proxy",
              url: req.protocol + "://" + req.get('host')
            }
          },
          limits: {
            $: {
              max: "100", 
              default: "50"
            }
          },
          registration: {
            $: {
              available: "no",
              open: "no"
            }
          },
          searching: {
            search: { $: { available: "yes", supportedParams: "q" } },
            "tv-search": { $: { available: "yes", supportedParams: "q,season,ep" } },
            "movie-search": { $: { available: "no" } }
          },
          categories: {
            category: [
              {
                $: { id: "5000", name: "TV" },
                subcat: [
                  { $: { id: "5030", name: "TV/HD" } }
                ]
              }
            ]
          }
        }
      };
      res.set("Content-Type", "text/xml");
      return res.send(builder.buildObject(capsXml));
    }

    const { data: xmlStr } = await axios.get(
      `https://${rss_url}`
    );
    
    const result = await parser.parseStringPromise(xmlStr);
    console.log(result)

    const host = rss_url.split('/')[0];
    const isMikan = host.includes('mikan');

    // pre-compile
    const database = db.get("patterns").value();
    const rules = database.map(({ pattern, ...rest }) => ({
      pattern: new RegExp(`^${pattern}$`),
      ...rest,
    }));

    
    // Process items using shared logic
    const items = await processItems(
      result.rss.channel[0].item,
      rules, // Rules will be handled in processItems
      req,
      isMikan
    );


    // Filter items based on query parameters
    const filteredItems = items
      .filter(item => {
        const { t, q, cat, imdbid, season, ep } = params;
        const title = item.title[0];
        const category = item.category?.toString() || '5030';
        
        // // Search type filtering
        // if (t === 'tvsearch' && !title.includes('season')) return false;
        // if (t === 'movie' && !title.includes('movie')) return false;
        
        // Text search
        if (q && !fuzzyMatch(q, title)) return false;
        
        // Category filtering
        if (cat) {
          const categories = cat.split(',').map(c => c.trim());
          if (!categories.includes(category)) return false;
        }
        
        // IMDb ID matching
        if (imdbid && !item.guid?.includes(imdbid)) return false;
        
        // Season/Episode filtering
        if (season) {
          const itemSeason = title.match(/S(\d{2})/i)?.[1] || '';
          if (parseInt(season) !== parseInt(itemSeason)) return false;
        }
        if (ep) {
          const itemEp = title.match(/E(\d{2})/i)?.[1] || '';
          if (parseInt(ep) !== parseInt(itemEp)) return false;
        }
        
        return true;
      })
      // Pagination
      .slice(parseInt(req.query.offset) || 0, 
            (parseInt(req.query.limit) || 100) + (parseInt(req.query.offset) || 0));


    // Build Torznab-compatible XML
    const torznabFeed = {
      rss: {
        $: {
          version: "2.0",
          "xmlns:torznab": "http://torznab.com/schemas/2015/feed"
        },
        channel: {
          title: "Torznab Feed",
          link: req.protocol + "://" + req.get('host') + req.originalUrl,
          description: "Torznab-compatible feed",
          item: filteredItems.map(item => ({
            title: item.title,
            guid: item.guid,
            link: item.link,
            pubDate: item.pubDate,
            category: 5000,
            enclosure: {
              $: {
                url: item.enclosure[0].$.url,
                type: item.enclosure[0].$.type,
                length: item.enclosure[0].$.length
              }
            },
            "torznab:attr": [
              { $: { name: "seeders", value: "100" } },
              { $: { name: "peers", value: "50" } }
            ]
          }))
        }
      }
    };

    res.set("Content-Type", "text/xml");
    res.send(builder.buildObject(torznabFeed));
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal Server Error");
  }
};

srvRouter.get("/Torznab/*", torznabRoute);
