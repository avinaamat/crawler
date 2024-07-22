# Web Crawler

## Overview
This is a simple web crawler that fetches and processes web pages up to a specified depth, calculating a rank based on same-domain links, and outputs the results in CSV or TSV format.

## Installation
1. Ensure you have Node.js installed (version 14 or higher recommended).
2. Clone this repository or download the source code.
3. Install dependencies:
    npm install
## Usage
### Running the Crawler
To run the crawler, use the following command:
node --no-warnings crawler.mjs <root-url> <depth-limit> [output-format]

- `<root-url>`: The starting URL for the crawler.
- `<depth-limit>`: The maximum depth to crawl.
- `<output-format>`: (Optional) The format of the output file, either 'csv' or 'tsv'. Defaults to 'csv'.

Example:
node --no-warnings crawler.mjs https://example.com 2 csv

## Docker
To run the crawler using Docker:

1. Build the Docker image:
docker build -t web-crawler .

2. Run the Docker container:
docker run -v $(pwd)/output:/app/output web-crawler <root-url> <depth-limit> [output-format]

Example:
docker run -v $(pwd)/output:/app/output web-crawler https://example.com 2 csv

## Output
The crawler will create an output file (either CSV or TSV) containing the following columns:
- url: The URL of the crawled page
- depth: The depth of the page in the crawl tree
- rank: The calculated rank based on the ratio of same-domain links

## Error Logging
Errors encountered during crawling are logged to `error_log.txt` in the same directory as the script.

## Limitations
- The crawler respects robots.txt files and implements rate limiting to avoid overwhelming target servers.
- Some websites may block or rate-limit requests from crawlers.
- The crawler is set to timeout after 10 seconds for each request to avoid hanging on slow responses.

## Dependencies
- node-fetch: For making HTTP requests.
- jsdom: For parsing and extracting links from HTML.
- url-parse: For URL parsing and manipulation.

## License
MIT
