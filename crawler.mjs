import fetch from 'node-fetch';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs/promises';
import URLParse from 'url-parse';

const maxDepth = parseInt(process.argv[3]);
const baseUrl = process.argv[2];
const outputFormat = process.argv[4] || 'csv';
const maxConcurrency = 5;
const timeout = 10000; // 10 seconds timeout
const rateLimitDelay = 1000; // 1 second between requests

let urlCache = new Set();
let pageCache = new Map();
let results = [];

function suppressConsoleOutput(func) {
  const originalConsole = { ...console };
  Object.keys(console).forEach(key => {
    console[key] = () => {};
  });
  try {
    return func();
  } finally {
    Object.assign(console, originalConsole);
  }
}

async function logError(message, error) {
  const errorLogFile = 'error_log.txt';
  const errorMessage = `${new Date().toISOString()} - ${message}\n${error.stack || error}\n\n`;
  
  try {
    await fs.appendFile(errorLogFile, errorMessage);
    console.error(`Error: ${message} (Details logged to ${errorLogFile})`);
  } catch (logError) {
    console.error(`Failed to log error to file: ${logError.message}`);
    console.error(`Original error: ${message}`);
  }
}

async function fetchHTML(url) {
  if (pageCache.has(url)) {
    return pageCache.get(url);
  }

  await new Promise(resolve => setTimeout(resolve, rateLimitDelay));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await suppressConsoleOutput(() => 
      fetch(url, { signal: controller.signal })
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      return null;
    }

    const html = await response.text();
    pageCache.set(url, html);
    return html;
  } catch (error) {
    if (error.name === 'AbortError') {
      await logError(`Timeout fetching ${url}`, error);
    } else {
      await logError(`Error fetching ${url}`, error);
    }
    return null;
  }
}

function extractLinks(html, baseUrl) {
  return suppressConsoleOutput(() => {
    const dom = new JSDOM(html, {
      url: baseUrl,
      resources: "usable",
      runScripts: "outside-only",
      virtualConsole: new VirtualConsole(),
    });
    return Array.from(dom.window.document.querySelectorAll('a'))
      .map(a => a.href)
      .filter(href => href && href.startsWith('http'))
      .map(href => new URLParse(href, baseUrl).toString());
  });
}

function calculateRank(links, baseHostname) {
  const sameDomainLinks = links.filter(link => {
    try {
      return new URLParse(link).hostname === baseHostname;
    } catch (error) {
      return false;
    }
  });
  return links.length > 0 ? sameDomainLinks.length / links.length : 0;
}

async function crawl(url, depth = 0) {
  if (depth > maxDepth || urlCache.has(url)) {
    return;
  }

  urlCache.add(url);
  try {
    const html = await fetchHTML(url);

    if (html) {
      let links;
      try {
        links = suppressConsoleOutput(() => extractLinks(html, url));
      } catch (error) {
        await logError(`Error extracting links from ${url}`, error);
        links = [];
      }

      const baseHostname = new URLParse(url).hostname;
      const rank = calculateRank(links, baseHostname);

      results.push({ url, depth, rank });

      const crawlPromises = links.map(link => crawl(link, depth + 1));
      await Promise.all(crawlPromises.slice(0, maxConcurrency));
    }
  } catch (error) {
    await logError(`Error crawling ${url}`, error);
  }
}

async function startCrawling() {
  console.log(`Starting crawl at ${baseUrl} with max depth ${maxDepth}`);
  const startTime = Date.now();

  try {
    await crawl(new URLParse(baseUrl).toString());

    const header = outputFormat === 'csv' ? 'url,depth,rank\n' : 'url\tdepth\trank\n';
    const content = results
      .map(row => `${row.url}${outputFormat === 'csv' ? ',' : '\t'}${row.depth}${outputFormat === 'csv' ? ',' : '\t'}${row.rank}`)
      .join('\n');

    await fs.writeFile(`output.${outputFormat}`, header + content);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`Crawling completed in ${duration.toFixed(2)} seconds. Output saved to output.${outputFormat}`);
    console.log(`Total URLs crawled: ${results.length}`);
  } catch (error) {
    await logError('An error occurred during crawling', error);
  }
}

const args = process.argv.slice(2);
if (args.length < 2 || args.length > 3) {
  console.error('Usage: node crawler.mjs <root-url> <depth-limit> [output-format]');
  process.exit(1);
}

startCrawling();